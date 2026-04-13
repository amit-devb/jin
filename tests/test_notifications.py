import os
from unittest.mock import patch, MagicMock

from jin.notifications import WebhookNotificationClient

def test_webhook_enabled_and_disabled():
    client1 = WebhookNotificationClient("https://hooks.slack.com/services/T0000/B0000/XXXX")
    assert client1.is_enabled() is True

    client2 = WebhookNotificationClient("")
    assert client2.is_enabled() is False


@patch("jin.notifications.urllib.request.urlopen")
def test_webhook_send_alert(mock_urlopen):
    client = WebhookNotificationClient("https://hooks.slack.com/mock")
    
    # Below 15% without JIN_WEBHOOK_ALL should be ignored
    issue_low = {
        "kpi_field": "revenue",
        "expected_value": 100,
        "actual_value": 110,
        "pct_change": 10.0
    }
    
    assert client.send_incident_alert("/api/test", issue_low) is False
    mock_urlopen.assert_not_called()

    # Above 15% should be sent
    issue_high = {
        "kpi_field": "latency",
        "expected_value": 100,
        "actual_value": 130,
        "pct_change": 30.0
    }
    assert client.send_incident_alert("/api/test", issue_high) is True
    mock_urlopen.assert_called_once()
    
    called_request = mock_urlopen.call_args[0][0]
    called_body = called_request.data.decode("utf-8")
    assert "/api/test" in called_body
    assert "latency" in called_body
    assert "30.00%" in called_body

@patch("jin.notifications.urllib.request.urlopen")
@patch.dict(os.environ, {"JIN_WEBHOOK_ALL": "1"})
def test_webhook_send_alert_all(mock_urlopen):
    client = WebhookNotificationClient("https://hooks.slack.com/mock")
    
    # Below 15%, but global WEBHOOK_ALL=1 is set
    issue_low = {
        "kpi_field": "revenue",
        "expected_value": 100,
        "actual_value": 110,
        "pct_change": 10.0
    }
    
    assert client.send_incident_alert("/api/test", issue_low) is True
    mock_urlopen.assert_called_once()

    called_request = mock_urlopen.call_args[0][0]
    called_body = called_request.data.decode("utf-8")
    assert "10.00%" in called_body
