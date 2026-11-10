use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::Sha256;
use std::collections::{BTreeMap, BTreeSet};

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum PayStatus {
    Pending,
    PaidPendingDelivery,
    Delivered,
    PartiallyRefunded,
    Refunded,
    Failed,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    pub sku: String,
    pub amount_cents: i64,
    pub currency: String,
    pub status: PayStatus,
    pub captured_cents: i64,
    pub refunded_cents: i64,
    pub entitlement_qty: i64,
    pub delivered: bool,
    pub fail_next_delivery: bool,
    pub events: BTreeSet<String>,
    pub sandbox: bool,
    #[serde(default)]
    pub page_return: String,
    #[serde(default)]
    pub verified_via: String,
}

#[derive(Clone, Debug)]
pub struct PayEvent {
    pub event_id: String,
    pub order_id: String,
    pub amount_cents: i64,
    pub currency: String,
    pub status: String,
    pub sig: String,
}

pub fn catalog() -> Value {
    json!([{
        "sku": "connector-automation-sandbox",
        "title": "連接器自動化（沙箱） Connector automation sandbox",
        "amount_cents": 100,
        "currency": "CNY",
        "price_status": "sandbox_not_approved_for_production",
        "auto_renew": false,
        "locks_local_files": false,
        "route": "base_payment",
        "credential_class": "sandbox",
        "live_credentials": "separate_and_not_present",
        "entitlement": "time_package_not_auto_renewal",
        "page_return_is_final": false,
        "authoritative": ["signed_notification", "signed_query"],
        "activity_rules": "unverified",
        "activity_rules_url": "https://render.alipay.com/p/yuyan/180022670000190962/index.html#/activity-rules",
        "weavefox_required": false,
        "partner_suite": "public_partner_route_not_this_local_sku",
        "direct_own_app_suite": "targeted_approval_not_universally_open",
        "entry_form": "desktop_app"
    }])
}

pub fn sign(
    secret: &[u8],
    event_id: &str,
    order_id: &str,
    amount: i64,
    currency: &str,
    status: &str,
) -> String {
    let msg = format!("{event_id}|{order_id}|{amount}|{currency}|{status}");
    let mut mac = HmacSha256::new_from_slice(secret).expect("hmac key");
    mac.update(msg.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

pub fn new_order(id: &str, sku: &str) -> Result<Order, String> {
    if sku != "connector-automation-sandbox" {
        return Err("unknown sku".into());
    }
    Ok(Order {
        id: id.to_string(),
        sku: sku.to_string(),
        amount_cents: 100,
        currency: "CNY".into(),
        status: PayStatus::Pending,
        captured_cents: 0,
        refunded_cents: 0,
        entitlement_qty: 0,
        delivered: false,
        fail_next_delivery: false,
        events: BTreeSet::new(),
        sandbox: true,
        page_return: String::new(),
        verified_via: String::new(),
    })
}

pub fn note_page_return(order: &mut Order, claimed: &str) -> &'static str {
    order.page_return = claimed.to_string();
    "page_return_not_final"
}

pub fn apply_event(
    order: &mut Order,
    event: &PayEvent,
    secret: &[u8],
) -> Result<&'static str, String> {
    apply_signed(order, event, secret, "signed_notification")
}

pub fn apply_query(
    order: &mut Order,
    event: &PayEvent,
    secret: &[u8],
) -> Result<&'static str, String> {
    apply_signed(order, event, secret, "signed_query")
}

fn apply_signed(
    order: &mut Order,
    event: &PayEvent,
    secret: &[u8],
    via: &str,
) -> Result<&'static str, String> {
    let expect = sign(
        secret,
        &event.event_id,
        &event.order_id,
        event.amount_cents,
        &event.currency,
        &event.status,
    );
    if !constant_eq(expect.as_bytes(), event.sig.as_bytes()) {
        return Err("bad signature".into());
    }
    if event.order_id != order.id {
        return Err("order mismatch".into());
    }
    if event.currency != order.currency {
        return Err("currency mismatch".into());
    }
    if order.events.contains(&event.event_id) {
        return Ok("duplicate_ignored");
    }
    order.verified_via = via.to_string();
    match event.status.as_str() {
        "pending" => {
            order.events.insert(event.event_id.clone());
            if order.status != PayStatus::Pending {
                return Ok("stale_ignored");
            }
            Ok("pending")
        }
        "paid" => {
            if event.amount_cents != order.amount_cents {
                return Err("amount mismatch".into());
            }
            order.events.insert(event.event_id.clone());
            if matches!(
                order.status,
                PayStatus::Delivered
                    | PayStatus::PartiallyRefunded
                    | PayStatus::Refunded
                    | PayStatus::PaidPendingDelivery
            ) {
                return Ok("already_paid");
            }
            if order.status == PayStatus::Failed {
                return Err("refusing to revive a failed order".into());
            }
            order.status = PayStatus::PaidPendingDelivery;
            order.captured_cents = event.amount_cents;
            Ok("paid_pending_delivery")
        }
        "failed" => {
            order.events.insert(event.event_id.clone());
            if order.status != PayStatus::Pending {
                return Ok("stale_ignored");
            }
            order.status = PayStatus::Failed;
            Ok("failed")
        }
        other => Err(format!("unknown payment status {other}")),
    }
}

pub fn deliver(order: &mut Order) -> Result<&'static str, String> {
    if order.delivered {
        return Ok("already_delivered");
    }
    if order.status != PayStatus::PaidPendingDelivery {
        return Err("not paid".into());
    }
    if order.fail_next_delivery {
        order.fail_next_delivery = false;
        return Err("delivery failed; payment kept, retry is safe".into());
    }
    order.delivered = true;
    order.entitlement_qty = 1;
    order.status = PayStatus::Delivered;
    Ok("delivered")
}

pub fn refund(order: &mut Order, amount: i64) -> Result<&'static str, String> {
    if amount <= 0 {
        return Err("refund amount must be positive".into());
    }
    if !matches!(
        order.status,
        PayStatus::PaidPendingDelivery | PayStatus::Delivered | PayStatus::PartiallyRefunded
    ) {
        return Err("order is not refundable".into());
    }
    let remaining = order.captured_cents - order.refunded_cents;
    if amount > remaining {
        return Err("refund exceeds remaining capture".into());
    }
    order.refunded_cents += amount;
    if order.refunded_cents == order.captured_cents {
        order.status = PayStatus::Refunded;
        order.entitlement_qty = 0;
        order.delivered = false;
        Ok("refunded")
    } else {
        order.status = PayStatus::PartiallyRefunded;
        // Partial refund must not wipe the remaining entitlement.
        if order.entitlement_qty == 0 && order.delivered {
            order.entitlement_qty = 1;
        }
        Ok("partially_refunded")
    }
}

pub fn reconcile(orders: &BTreeMap<String, Order>) -> Value {
    let mut captured = 0i64;
    let mut refunded = 0i64;
    let mut entitlements = 0i64;
    let mut rows = Vec::new();
    for (id, order) in orders {
        captured += order.captured_cents;
        refunded += order.refunded_cents;
        entitlements += order.entitlement_qty;
        rows.push(json!({
            "id": id,
            "status": format!("{:?}", order.status),
            "captured_cents": order.captured_cents,
            "refunded_cents": order.refunded_cents,
            "entitlement_qty": order.entitlement_qty,
            "sandbox": order.sandbox,
        }));
    }
    json!({
        "mode": "sandbox",
        "production": "blocked_owner_input",
        "captured_cents": captured,
        "refunded_cents": refunded,
        "net_cents": captured - refunded,
        "entitlement_qty": entitlements,
        "orders": rows,
    })
}

pub fn production_blocked() -> Value {
    json!({
        "ok": false,
        "error": "blocked_owner_input",
        "missing": ["merchant eligibility", "SKU approval", "price approval", "refund policy", "production secret"],
        "sandbox_is_not_a_paid_entry": true,
        "activity_rules": "unverified",
        "weavefox_required": false,
        "page_return_is_final": false
    })
}

fn constant_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut d = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        d |= x ^ y;
    }
    d == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paid() -> (Order, Vec<u8>) {
        let secret = b"sandbox-local-not-a-merchant-key".to_vec();
        let mut order = new_order("ord_1", "connector-automation-sandbox").unwrap();
        let sig = sign(&secret, "evt_1", "ord_1", 100, "CNY", "paid");
        apply_event(
            &mut order,
            &PayEvent {
                event_id: "evt_1".into(),
                order_id: "ord_1".into(),
                amount_cents: 100,
                currency: "CNY".into(),
                status: "paid".into(),
                sig,
            },
            &secret,
        )
        .unwrap();
        (order, secret)
    }

    #[test]
    fn lifecycle_is_idempotent_and_partial_refund_keeps_entitlement() {
        let (mut order, secret) = paid();
        assert_eq!(order.status, PayStatus::PaidPendingDelivery);
        let sig = sign(&secret, "evt_1", "ord_1", 100, "CNY", "paid");
        assert_eq!(
            apply_event(
                &mut order,
                &PayEvent {
                    event_id: "evt_1".into(),
                    order_id: "ord_1".into(),
                    amount_cents: 100,
                    currency: "CNY".into(),
                    status: "paid".into(),
                    sig,
                },
                &secret
            )
            .unwrap(),
            "duplicate_ignored"
        );
        order.fail_next_delivery = true;
        assert!(deliver(&mut order).is_err());
        assert!(!order.delivered);
        assert_eq!(deliver(&mut order).unwrap(), "delivered");
        assert_eq!(deliver(&mut order).unwrap(), "already_delivered");
        assert_eq!(refund(&mut order, 40).unwrap(), "partially_refunded");
        assert_eq!(order.entitlement_qty, 1);
        assert_eq!(refund(&mut order, 60).unwrap(), "refunded");
        assert_eq!(order.entitlement_qty, 0);
        assert!(refund(&mut order, 1).is_err());
    }

    #[test]
    fn bad_amount_bad_sig_and_stale_pending_do_not_move_state() {
        let secret = b"sandbox-local-not-a-merchant-key";
        let mut order = new_order("ord_2", "connector-automation-sandbox").unwrap();
        let bad = apply_event(
            &mut order,
            &PayEvent {
                event_id: "e".into(),
                order_id: "ord_2".into(),
                amount_cents: 1,
                currency: "CNY".into(),
                status: "paid".into(),
                sig: sign(secret, "e", "ord_2", 1, "CNY", "paid"),
            },
            secret,
        );
        assert!(bad.unwrap_err().contains("amount"));
        assert_eq!(order.status, PayStatus::Pending);
        let (mut order, secret) = paid();
        let sig = sign(&secret, "old", "ord_1", 100, "CNY", "pending");
        assert_eq!(
            apply_event(
                &mut order,
                &PayEvent {
                    event_id: "old".into(),
                    order_id: "ord_1".into(),
                    amount_cents: 100,
                    currency: "CNY".into(),
                    status: "pending".into(),
                    sig,
                },
                &secret
            )
            .unwrap(),
            "stale_ignored"
        );
        assert_eq!(order.status, PayStatus::PaidPendingDelivery);
        assert!(production_blocked()["sandbox_is_not_a_paid_entry"]
            .as_bool()
            .unwrap());
        assert_eq!(production_blocked()["activity_rules"], "unverified");
    }

    #[test]
    fn page_return_does_not_mark_paid_until_a_signed_query() {
        let secret = b"sandbox-local-not-a-merchant-key";
        let mut order = new_order("ord_3", "connector-automation-sandbox").unwrap();
        assert_eq!(
            note_page_return(&mut order, "paid"),
            "page_return_not_final"
        );
        assert_eq!(order.status, PayStatus::Pending);
        assert!(order.verified_via.is_empty());
        let sig = sign(secret, "qry_1", "ord_3", 0, "CNY", "pending");
        assert_eq!(
            apply_query(
                &mut order,
                &PayEvent {
                    event_id: "qry_1".into(),
                    order_id: "ord_3".into(),
                    amount_cents: 0,
                    currency: "CNY".into(),
                    status: "pending".into(),
                    sig,
                },
                secret
            )
            .unwrap(),
            "pending"
        );
        assert_eq!(order.status, PayStatus::Pending);
        assert_eq!(order.verified_via, "signed_query");
        assert_eq!(order.page_return, "paid");
    }
}
