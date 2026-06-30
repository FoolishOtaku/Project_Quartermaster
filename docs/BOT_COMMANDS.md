# Bot Commands (v0.4.0)

All commands require you to be a **registered, active** user. Write actions are
role-gated. Most choices are made by **tapping inline buttons**; you can also
type the value as a fallback. Tap **❌ Cancel** (or send `/cancel`) to stop a
multi-step flow, and **⏭ Skip** to leave an optional field blank.

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

## Individual-asset units

Pick **Individual Asset** as the tracking type in `/add_item` to create an asset
that is tracked unit-by-unit (e.g. monitors, PCs). Then add physical units:

| Command                    | Access            | Description                                   |
| -------------------------- | ----------------- | --------------------------------------------- |
| `/view_unit <unitCode>`    | Registered        | Show one physical unit.                       |
| `/add_unit <itemCode>`     | Admin, Assistant  | Add a unit to an individual-asset item.       |
| `/update_unit <unitCode>`  | Admin, Assistant  | Update a unit's condition/availability/etc.   |
| `/archive_unit <unitCode>` | Admin             | Confirm, then soft-delete a unit.             |

Unit codes are generated as `<itemCode>-U<NN>` (e.g. `ASE-MON-001-U01`). The
parent item's available/total counts are kept in sync as units are added,
updated, or archived.

## Borrowing

Borrow/return are available to everyone except the VIEWER role. `/who_has` and
`/my_borrowed` are open to any registered user.

| Command               | Access                                  | Description                                    |
| --------------------- | --------------------------------------- | ---------------------------------------------- |
| `/borrow_item [code]` | Admin, Coordinator, Assistant, Trusted  | Borrow a quantity, or a specific unit.         |
| `/return_item`        | Admin, Coordinator, Assistant, Trusted  | Return one of your active borrows.             |
| `/who_has <code>`     | Registered                              | See who currently holds an item.               |
| `/my_borrowed`        | Registered                              | See what you currently have borrowed.          |

```txt
You:  /borrow_item ASE-CABL-001
Bot:  How many to borrow? (1–8)        You: 1
Bot:  Purpose? ...                     You: Event setup
Bot:  Expected return date? ...        (tap) ⏭ Skip
Bot:  Please confirm ...               [ ✅ Confirm ]
You:  (tap) ✅ Confirm
Bot:  ✅ Borrow recorded. Item: HDMI Cable, Quantity: 1, Status: Borrowed

You:  /borrow_item ASE-MON-001
Bot:  "LG Monitor" — choose a unit to borrow:
      [ ASE-MON-001-U01 ]
You:  (tap) ASE-MON-001-U01
Bot:  Purpose? → due date → Confirm → ✅ Borrow recorded.

You:  /return_item
Bot:  Which item are you returning?     (tap a borrow)
Bot:  (for a unit) What condition is it in?  [ Good ] [ Damaged ] ...
You:  (tap) Good
Bot:  ✅ Return recorded. Status: RETURNED
```

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

### Add (button-driven)

```txt
You:  /add_item
Bot:  🆕 New item — Step 1 of 11
      What is the item name?
      [ ❌ Cancel ]
You:  HDMI Cable
Bot:  Step 2 of 11 — Choose a category:
      [ AIO Computer ] [ Cable ]
      [ Monitor ]      [ Network ]   ...
      [ ❌ Cancel ]
You:  (tap) Cable
Bot:  Step 3 of 11 — Choose a tracking type:
      [ 📦 Bulk Stock ] [ 🧴 Consumable ]
You:  (tap) Bulk Stock
Bot:  Step 4 of 11 — How many? Enter a whole number.
You:  8
Bot:  Step 5 of 11 — Unit? Type it, or tap Skip.
      [ ⏭ Skip ] [ ❌ Cancel ]
You:  pcs
Bot:  Step 6 of 11 — Minimum stock? ...        [ ⏭ Skip ] [ ❌ Cancel ]
You:  3
Bot:  Step 7 of 11 — Where is it stored?
      [ ASE Lab Room ] [ Cable Box ] ...
      [ ⏭ Skip (Unknown) ] [ ❌ Cancel ]
You:  (tap) Cable Box
Bot:  Step 8 of 11 — Storage detail? ...        [ ⏭ Skip ] [ ❌ Cancel ]
You:  HDMI section
Bot:  Step 9 of 11 — What condition is it in?
      [ New ] [ Good ] [ Fair ] [ Needs Repair ] [ Broken ]
You:  (tap) Good
Bot:  Step 10 of 11 — Owner / source?
      [ Lab Purchase ] [ University Asset ] ...
You:  (tap) Lab Purchase
Bot:  Step 11 of 11 — Any notes? Type them, or tap Skip.
You:  Bought for ASE event
Bot:  Please review the new item:
      ...
      [ ✅ Confirm ] [ ❌ Cancel ]
You:  (tap) ✅ Confirm
Bot:  ✅ Item created successfully.
      Item Detail
      Code: ASE-CABL-001
      ...
```

Every selection step accepts a typed answer too (e.g. typing `Cable` instead of
tapping it), so the flow keeps working even if buttons are unavailable.

### Update (button field picker)

```txt
You:  /update_item ASE-CABL-001
Bot:  Item Detail ...
      Which field do you want to update?
      [ Name ]       [ Quantity ]
      [ Minimum Stock ] [ Unit ]
      [ Location ]   [ Storage Detail ]
      [ Condition ]  [ Availability ]
      [ Owner / Source ] [ Notes ]
      [ ❌ Cancel ]
You:  (tap) Quantity
Bot:  Enter the new value for Quantity (whole number):
      [ ❌ Cancel ]
You:  10
Bot:  ✅ Item updated.
      ...
```

### Archive

```txt
You:  /archive_item ASE-CABL-001
Bot:  Archive "HDMI Cable" (ASE-CABL-001)?
      [ ✅ Yes, archive ] [ ❌ Cancel ]
You:  (tap) ✅ Yes, archive
Bot:  ✅ Archived "HDMI Cable" (ASE-CABL-001).
```

---

## Item codes

Codes are generated automatically as `ASE-<PREFIX>-<NNN>`, where `<PREFIX>` is
derived from the category name (up to 4 letters) and `<NNN>` is the next free
sequence for that prefix. Examples: `ASE-CABL-001`, `ASE-MONI-002`.


## Individual asset + units (example)

```txt
You:  /add_item
Bot:  🆕 New item — What is the item name?
You:  LG 24 inch Monitor
Bot:  Choose a category:          (tap) Monitor
Bot:  Choose a tracking type:
      [ 📦 Bulk Stock ] [ 🧴 Consumable ]
      [ 🖥 Individual Asset ]
You:  (tap) 🖥 Individual Asset
Bot:  Brand / model? ...          You: LG 24MP
Bot:  Where is it stored? ...     (tap) ASE Lab Room
Bot:  Storage detail? ...         (tap) ⏭ Skip
Bot:  What condition is it in?    (tap) Good
Bot:  Owner / source?             (tap) Lab Purchase
Bot:  Any notes? ...              (tap) ⏭ Skip
Bot:  Please review ...           [ ✅ Confirm ]
You:  (tap) ✅ Confirm
Bot:  ✅ Item created successfully.  Code: ASE-MON-001

You:  /add_unit ASE-MON-001
Bot:  Serial number? ...          You: SN-12345
Bot:  Condition of this unit?     (tap) Good
Bot:  Where is this unit stored?  (tap) ASE Lab Room
Bot:  Storage detail? ...         (tap) ⏭ Skip
Bot:  Any notes? ...              (tap) ⏭ Skip
Bot:  ✅ Unit added.
      Unit Code: ASE-MON-001-U01
      Item: LG 24 inch Monitor (ASE-MON-001)
      Condition: Good, Availability: Available

You:  /view_item ASE-MON-001
Bot:  Item Detail ...
      Units: 1 available / 1 total
      Units (1):
      • ASE-MON-001-U01 — Good, Available @ ASE Lab Room
```
