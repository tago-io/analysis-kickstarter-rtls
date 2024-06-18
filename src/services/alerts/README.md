# Alert Settings
```json
{
  "variable": "alert_settings",
  "value": "5f5a8f3351d4db99c40dedf9", // Connector ID
  "group": "5f5a8f3351d4db99c40dedf9", // Connector ID
  "metadata": {
    "alertList": [
      { 
        "id": "door-open-alert", // ID must be unique by alert, that will be presented to the user (will be splited at the first "-" and will show the first element of resulted from the split) 
        "variable": "door_open", // Variable for the action
        "type": "checkbox",  // Type of the alert, that will be presented to the user
        "label": "Time Open",  // Label for the alert on the user screen
        "value": false,  // Default value
        "min": 0,  // Min value for the alert -> a door can't be open for more than -1 minutes.
        "max": 99999,  // Max value for the alert -> maximum time a door can be open. 
      },
      {
        "id": "test-status",
        "variable": "test",
        "type": "dropdown",
        "label": "Select one option",
        "values": ["Value 1", "Value 2"],
        "selected": "", // Default value
      },
      { "id": "temperature-status", "variable": "test", "type": "number", "label": "Temperature >", "value": 20 },
    ],
  },
}
```

TagoIO actions accept the following coditions:
- `>` greater than
- `>=` greater than or equal to
- `<` less than
- `<=` less than or equal to
- `=` equal to
- `!` not equal to
- `*` any value

## Unique IDs 
Unique IDs are hardcoded ids used within the application:
- door-open-alert: Door Open Alert


# Alert Data
This service is responsible for managing the alert settings for the user.

```json
{
  "id": "xxxx",
  "variable": "alert",
  "value": "DEVICE_ID",
  "group": "ALERT_ID",
  "metadata": {
    "triggers": [{ "id": "xxx", "type": "number", "value":"xxx" , "values": "xxx", "condition": ">" }],
    "notificationType": {"email": true, "push": true, "sms": true},
    "recipients": [{ "value": "group1", "label": "Group 1" },],
    "lastAlert": "DATE",
    "status": "xxx",
    "alertActivation": true, // if the alert is active or not
    "recurringAlarm": false, // if the alert is recurring or not
    "name": "xxx",
    "ack_date": "DATE_ALERT_WAS_ACKNOWLEDGED",
  },
}
```
