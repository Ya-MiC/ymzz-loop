fn pdf_escape(text: &str) -> String {
    text.replace('\\', "\\\\").replace('(', "\\(").replace(')', "\\)")
}

fn build_pdf(stream: &str, image: bool) -> Vec<u8> {
    let mut objects: Vec<Vec<u8>> = Vec::new();
    objects.push(b"<< /Type /Catalog /Pages 2 0 R >>".to_vec());
    objects.push(b"<< /Type /Pages /Count 1 /Kids [3 0 R] >>".to_vec());
    if image {
        objects.push(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>".to_vec());
    } else {
        objects.push(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>".to_vec());
    }
    let stream_obj = format!("<< /Length {} >>\nstream\n{}\nendstream", stream.len(), stream);
    objects.push(stream_obj.into_bytes());
    if image {
        objects.push(b"<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8 /Length 1 >>\nstream\n \nendstream".to_vec());
    } else {
        objects.push(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>".to_vec());
    }
    let mut out = b"%PDF-1.4\n".to_vec();
    let mut offsets = Vec::new();
    for (i, obj) in objects.iter().enumerate() {
        offsets.push(out.len());
        out.extend(format!("{} 0 obj\n", i + 1).into_bytes());
        out.extend(obj);
        out.extend(b"\nendobj\n");
    }
    let xref_at = out.len();
    out.extend(format!("xref\n0 {}\n", objects.len() + 1).into_bytes());
    out.extend(b"0000000000 65535 f \n");
    for off in offsets {
        out.extend(format!("{off:010} 00000 n \n").into_bytes());
    }
    out.extend(format!("trailer << /Size {} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF\n", objects.len() + 1).into_bytes());
    out
}

pub fn digital_pdf(text: &str) -> Vec<u8> {
    let stream = format!("BT /F1 18 Tf 40 80 Td ({}) Tj ET", pdf_escape(text));
    build_pdf(&stream, false)
}

pub fn scanned_pdf() -> Vec<u8> {
    build_pdf("q 100 0 0 40 40 cm /Im1 Do Q", true)
}

#[derive(Clone, Debug)]
pub struct PdfText {
    pub text: String,
    pub has_text_layer: bool,
    pub source: &'static str,
}

pub fn extract_text_layer(bytes: &[u8]) -> PdfText {
    let raw = String::from_utf8_lossy(bytes);
    let mut text = String::new();
    let mut rest = raw.as_ref();
    while let Some(idx) = rest.find("stream\n") {
        rest = &rest[idx + "stream\n".len()..];
        let end = rest.find("\nendstream").unwrap_or(rest.len());
        let stream = &rest[..end];
        text.push_str(&strings_before_tj(stream));
        rest = &rest[end..];
    }
    let has = !text.trim().is_empty();
    PdfText { text, has_text_layer: has, source: "pdf_text_layer" }
}

fn strings_before_tj(stream: &str) -> String {
    let mut out = String::new();
    let bytes = stream.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'(' {
            let (s, next) = read_literal(bytes, i);
            let tail = stream[next..].trim_start();
            if tail.starts_with("Tj") || tail.starts_with("TJ") || tail.starts_with(')') {
                out.push_str(&s);
            }
            i = next;
            continue;
        }
        i += 1;
    }
    out
}

fn read_literal(bytes: &[u8], open: usize) -> (String, usize) {
    let mut out = String::new();
    let mut i = open + 1;
    while i < bytes.len() {
        match bytes[i] {
            b'\\' if i + 1 < bytes.len() => {
                out.push(bytes[i + 1] as char);
                i += 2;
            }
            b')' => return (out, i + 1),
            c => {
                out.push(c as char);
                i += 1;
            }
        }
    }
    (out, i)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn digital_roundtrip_contains_ground_truth() {
        let pdf = digital_pdf("USD 123.45 synthetic");
        let got = extract_text_layer(&pdf);
        assert!(got.has_text_layer);
        assert!(got.text.contains("USD 123.45"));
        assert_eq!(got.source, "pdf_text_layer");
    }

    #[test]
    fn scanned_pdf_has_no_text_layer() {
        let pdf = scanned_pdf();
        let got = extract_text_layer(&pdf);
        assert!(!got.has_text_layer, "scan bytes unexpectedly had text {}", got.text);
        assert!(got.text.trim().is_empty());
    }
}
