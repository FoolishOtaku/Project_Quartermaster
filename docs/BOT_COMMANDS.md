# Bot Commands (v0.2.0)

All commands require you to be a **registered, active** user. Write actions are
role-gated. Send `/cancel` at any time to stop a multi-step flow.

## General

| Command | Access   | Description                          |
| ------- | -------- | ------------------------------------ |
| `/start`| Everyone | Welcome message.                     |
| `/help` | Everyone | Full command list.                   |
| `/me`   | Registered | Your account details and role.     |

## Inventory

| Command                  | Access            | Description                                  |
| ------------------------ | ----------------- | -------------------------------------------- |
| `/search_item <keyword>` | Registered        | Search by name, code, category, or location. |
| `/view_item <code>`      | Registered        | Show full detail for one item.               |
| `/add_item`              | Admin, Assistant  | Guided flow to create an item.               |
| `/update_item [code]`    | Admin, Assistant  | Guided flow to update one field.             |
| `/archive_item [code]`   | Admin             | Confirm, then soft-delete (archive).         |

---

## Examples

### Search

```txt
You:  /search_item hdmi
Bot:  Found 1 item(s) for "hdmi":

      1. HDMI Cable
         Code: ASE-CABL-001
         Available: 8 / 8
         Location: Cable Box
         Condition: Good
```

### View

```txt
You:  /view_item ASE-CABL-001
Bot:  Item Detail

      Code: ASE-CABL-001
      Name: HDMI Cable
      Category: Cable
      Tracking Type: Bulk Stock
      Quantity: 8 pcs
      Available: 8
      Minimum Stock: 3
      Location: Cable Box
      Condition: Good
      Availability: Available
      Owner / Source: Lab Purchase
```

### Add (guided)

```txt
You:  /add_item
Bot:  Add a new item.

      Step 1 — Item name?
You:  HDMI Cable
Bot:  Step 2 — Category? Type the name.
      Categories: AIO Computer, Cable, ...
You:  Cable
Bot:  Step 3 — Tracking type? (Bulk Stock / Consumable)
You:  Bulk Stock
Bot:  Step 4 — Quantity? (whole number)
You:  8
Bot:  Step 5 — Unit? (e.g. pcs, set, box) or "-" to skip
You:  pcs
Bot:  Step 6 — Minimum stock? (whole number) or "-" to skip
You:  3
Bot:  Step 7 — Location? Type the name or "-" to skip.
      Locations: ASE Lab Room, Cable Box, ...
You:  Cable Box
Bot:  Step 8 — Storage detail? ... or "-" to skip
You:  HDMI section
Bot:  Step 9 — Condition? (New / Good / Fair / Needs Repair / Broken) or "-" for Good
You:  Good
Bot:  Step 10 — Owner / source? (Lab Purchase / ...) or "-" for Unknown
You:  Lab Purchase
Bot:  Step 11 — Notes? or "-" to skip
You:  Bought for ASE event
Bot:  Please confirm the new item:
      ...
      Confirm? (yes / no)
You:  yes
Bot:  ✅ Item created successfully.
      Item Detail
      Code: ASE-CABL-001
      ...
```

### Update (guided)

```txt
You:  /update_item ASE-CABL-001
Bot:  Item Detail ...
      Which field do you want to update?
      1. Name
      2. Quantity
      3. Minimum Stock
      4. Unit
      5. Location
      6. Storage Detail
      7. Condition
      8. Availability
      9. Owner / Source
      10. Notes
You:  2
Bot:  Enter the new value for Quantity:
You:  10
Bot:  ✅ Item updated.
      ...
```

### Archive

```txt
You:  /archive_item ASE-CABL-001
Bot:  Archive "HDMI Cable" (ASE-CABL-001)?
      Type YES to confirm, or anything else to cancel.
You:  YES
Bot:  ✅ Archived "HDMI Cable" (ASE-CABL-001).
```

---

## Item codes

Codes are generated automatically as `ASE-<PREFIX>-<NNN>`, where `<PREFIX>` is
derived from the category name (up to 4 letters) and `<NNN>` is the next free
sequence for that prefix. Examples: `ASE-CABL-001`, `ASE-MONI-002`.
