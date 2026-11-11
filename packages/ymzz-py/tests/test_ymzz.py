import unittest
from ymzz import archive_name_rejected, suggested_nickname, validate_phone


class StewardTests(unittest.TestCase):
    def test_nickname_and_phone(self):
        self.assertEqual(suggested_nickname("+82 10-1234-5678"), "用戶5678")
        self.assertEqual(suggested_nickname(""), "用戶")
        self.assertFalse(validate_phone("12ab345678")["ok"])
        self.assertTrue(validate_phone("")["skipped"])

    def test_archive_names(self):
        self.assertTrue(archive_name_rejected("../secret"))
        self.assertTrue(archive_name_rejected("/etc/passwd"))
        self.assertFalse(archive_name_rejected("models/det.pdmodel"))


if __name__ == "__main__":
    unittest.main()
