import { generateEditMessage, privateAuditLogFunctions } from "./audit-log";
import { dataScope, deviceScope, userScope } from "./audit-log.mock.json";

describe("Auditlog Scopes", () => {
  test("Scope: Data", () => {
    const result = privateAuditLogFunctions._getValuesFromData(dataScope as any, { receiver002: "#LOG.RECEIVER#", shipper001: "#LOG.SHIPPER#", carrier_name: "#LOG.CARRIER#" });

    expect(result.length).toBe(3);
    expect(result[0]).toStrictEqual(["#LOG.CARRIER#", "Carrier 2", "Carrier 3"]);
    expect(result[1]).toStrictEqual(["carrier_address", "California", "Raleighn 01"]);
    expect(result[2]).toStrictEqual(["carrier_type", "#LOG.RECEIVER#", "#LOG.SHIPPER#"]);
  });
  test("Scope: User", () => {
    const result = privateAuditLogFunctions._getValuesFromUser(userScope as any, { "tags.access": "#LOG.ACCESS#", orgadmin: "#LOG.ORGADMIN#", sadmin: "#LOG.SADMIN#" });

    expect(result.length).toBe(1);
    expect(result[0]).toStrictEqual(["#LOG.ACCESS#", "#LOG.SADMIN#", "#LOG.ORGADMIN#"]);
  });
  test("Scope: Device", () => {
    const result = privateAuditLogFunctions._getValuesFromDevice(deviceScope as any, { "param.ship_scac": "#LOG.SCAC#", null: "N/A" });

    expect(result.length).toBe(3);
    expect(result[0]).toStrictEqual(["#LOG.SCAC#", "N/A", "00"]);
  });
});

describe("Auditlog generateEditMessage", () => {
  test("Scope: Data", () => {
    const result = generateEditMessage(dataScope as any, { receiver002: "#LOG.RECEIVER#", shipper001: "#LOG.SHIPPER#", carrier_name: "#LOG.CARRIER#" });

    expect(result).toBeTruthy();
    expect(result).toBe("#LOG.CARRIER#: Carrier 2 #LOG.TO# Carrier 3; carrier_address: California #LOG.TO# Raleighn 01; carrier_type: #LOG.RECEIVER# #LOG.TO# #LOG.SHIPPER#");
  });
  test("Scope: User", () => {
    const result = generateEditMessage(userScope as any, { "tags.access": "#LOG.ACCESS#", orgadmin: "#LOG.ORGADMIN#", sadmin: "#LOG.SADMIN#" });

    expect(result).toBeTruthy();
    expect(result).toBe("#LOG.ACCESS#: #LOG.SADMIN# #LOG.TO# #LOG.ORGADMIN#");
  });
  test("Scope: Device", () => {
    const result = generateEditMessage(deviceScope as any, { "param.ship_scac": "#LOG.SCAC#", null: "N/A" });

    expect(result).toBeTruthy();
    expect(result).toBe("#LOG.SCAC#: N/A #LOG.TO# 00; name: oldname #LOG.TO# test; tags.shipper:  #LOG.TO# 102012");
  });
});
