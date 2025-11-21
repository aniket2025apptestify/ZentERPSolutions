# 📦 Inventory & Stock Management - User Guide

## Overview

The Inventory & Stock Management system allows you to:
- Track inventory items and stock levels
- Issue materials to production jobs
- Record wastage and scrap
- Reserve stock for purchase orders
- Monitor low stock alerts
- View complete stock transaction history

---

## 🚀 Getting Started

### Accessing Inventory

1. **Login** to the system with appropriate role:
   - **DIRECTOR**: Full access
   - **STOREKEEPER**: Full inventory management
   - **PRODUCTION**: Can issue materials and view stock
   - **PROCUREMENT**: Can view inventory and reserve stock

2. **Navigate** to Inventory from the sidebar:
   - Click **"Inventory"** → Opens Stock Dashboard

---

## 📋 Main Features

### 1. Stock Dashboard (`/inventory/stock`)

**What you'll see:**
- **KPIs**: Total SKUs, Low Stock Items count
- **Item List**: All inventory items with current stock levels
- **Quick Actions**: Issue Material, View Ledger buttons

**How to use:**
1. **Search Items**: Use the search box to find items by name or code
2. **Filter by Category**: Select a category from the dropdown
3. **Low Stock Filter**: Check "Low Stock Only" to see items below reorder level
4. **View Item Details**: Click "View" on any item
5. **Adjust Stock**: Click "Adjust" to manually correct stock levels

**Stock Status Indicators:**
- 🟢 **Normal**: Stock is above reorder level
- 🟡 **Warning**: Stock is close to reorder level
- 🔴 **Low Stock**: Stock is at or below reorder level

---

### 2. Create Inventory Item

**Path**: Click "+ New Item" button on Stock Dashboard

**Steps:**
1. Fill in required fields:
   - **Item Name***: e.g., "Aluminium Profile 50x20"
   - **Item Code**: Optional (auto-generated if left empty)
   - **Category**: e.g., "Raw Material", "Hardware"
   - **Unit***: e.g., "meter", "pcs", "kg", "sqm"
   - **Opening Quantity**: Starting stock (default: 0)
   - **Reorder Level**: Alert when stock falls below this
   - **Last Purchase Rate**: For cost tracking

2. Click **"Create Item"**

**Example:**
```
Item Name: Aluminium Profile 50x20
Item Code: AL-5020
Category: Raw Material
Unit: meter
Opening Quantity: 100
Reorder Level: 10
Last Purchase Rate: 12.50
```

---

### 3. View Item Details

**Path**: Click "View" on any item in the Stock Dashboard

**What you'll see:**
- Item information (name, code, category, unit)
- **Available Quantity**: Current stock available
- **Reserved Quantity**: Stock reserved for orders/jobs
- **Reorder Level**: Alert threshold
- **Recent Transactions**: Last 20 stock movements

**Actions available:**
- **Edit**: Update item details
- **Adjust Stock**: Manual stock correction
- **View Full Ledger**: See all transactions

---

### 4. Adjust Stock (Manual Correction)

**When to use:**
- Physical stock count differs from system
- Stock shrinkage or damage
- Stock found/discovered
- Correction of errors

**Steps:**
1. Go to Item Details page
2. Click **"Adjust Stock"** button
3. Select adjustment type:
   - **Adjustment**: General correction
   - **Stock In**: Adding stock
   - **Stock Out**: Removing stock
4. Enter **Quantity** (use negative for decrease, positive for increase)
5. Add **Remarks**: Reason for adjustment
6. Click **"Adjust"**

**Example:**
```
Type: Adjustment
Quantity: -5
Remarks: Physical count found 5 units missing
```

---

### 5. Issue Material to Production

**Path**: Click "Issue Material" button on Stock Dashboard, or navigate to `/inventory/issue`

**When to use:**
- Production job needs materials
- Materials are being consumed in manufacturing

**Steps:**
1. Fill in job information:
   - **Production Job ID***: Enter the job card number
   - **Project ID**: Optional (select from dropdown)
   - **Issued By***: Your name/user ID
   - **Issue Date & Time**: Defaults to now

2. **Add Items to Issue:**
   - Click **"+ Add Item"** for each material
   - Select **Item** from dropdown
   - Enter **Quantity** required
   - Enter **Wastage** (if any material will be scrapped)
   - Add **Remarks** (optional)

3. **Review Available Stock:**
   - System shows available quantity for each item
   - Will prevent issue if insufficient stock

4. Click **"Issue Material"**

**Example:**
```
Job ID: JC-2024-001
Issued By: John Doe
Items:
  - Aluminium Profile 50x20: 10 meters, Wastage: 0.5 meters
  - Screws M6: 2 pcs, Wastage: 0
```

**What happens:**
- Stock is deducted from inventory
- Stock transaction is recorded
- Material issue record is created
- Production job's material consumption is updated
- Project cost is updated (if applicable)
- Wastage is recorded (if any)

---

### 6. Reserve Stock

**When to use:**
- Material Request (MR) is approved
- Purchase Order is created
- You want to reserve stock for a specific job/order

**How to reserve:**
- Currently done via API endpoint `/api/inventory/reserve`
- Can be integrated into MR/PO approval workflow

**What it does:**
- Increases `reservedQty` on the item
- Prevents stock from being issued to other jobs
- Stock remains in warehouse but is "committed"

---

### 7. Stock Ledger (Transaction History)

**Path**: Click "View Ledger" on Stock Dashboard, or navigate to `/inventory/ledger`

**What you'll see:**
- Complete history of all stock movements
- Date, Item, Type (IN/OUT/ADJUSTMENT), Reference, Quantity, Balance

**Filters:**
- **Item**: Filter by specific item
- **Date Range**: From/To dates
- **Type**: IN, OUT, ADJUSTMENT, TRANSFER

**Transaction Types:**
- **IN**: Stock received (from GRN, adjustment, etc.)
- **OUT**: Stock issued (to production, adjustment, etc.)
- **ADJUSTMENT**: Manual corrections
- **TRANSFER**: Stock moved between locations (future feature)

---

### 8. Wastage Report

**Path**: Navigate to `/inventory/wastage`

**What you'll see:**
- **Summary by Item**: Total wastage per item
- **Detailed Records**: All wastage entries with dates, reasons, jobs

**Filters:**
- **Date Range**: From/To dates
- **Item ID**: Specific item
- **Job ID**: Specific production job

**Use cases:**
- Track material waste in production
- Identify items with high wastage
- Cost analysis and improvement opportunities

---

### 9. Low Stock Alerts

**How it works:**
- System checks items where `availableQty <= reorderLevel`
- Alerts are generated automatically
- Can be checked manually via `/api/inventory/check-low-stock`

**To set up alerts:**
1. Edit an inventory item
2. Set **Reorder Level** (e.g., 10 units)
3. Save the item
4. System will alert when stock falls to or below this level

**Viewing alerts:**
- Low stock items are highlighted in red on Stock Dashboard
- Use "Low Stock Only" filter to see all low stock items

---

## 🔄 Integration with Other Modules

### Procurement → Inventory

**GRN (Goods Receipt Note):**
- When GRN is created, stock is **automatically added** to inventory
- Stock transaction is created with type "IN"
- Reference type: "GRN"
- `lastPurchaseRate` is updated from PO

**Flow:**
```
Purchase Order → GRN Created → Stock Added to Inventory
```

### Production → Inventory

**Material Issue:**
- When materials are issued to a production job:
  - Stock is deducted from inventory
  - Material consumption is tracked on the job
  - Project actual cost is updated
  - Wastage is recorded separately

**Flow:**
```
Production Job → Issue Material → Stock Deducted → Wastage Recorded
```

### Projects → Inventory

**Cost Tracking:**
- Material issues update project `actualCost`
- Cost = Quantity × Last Purchase Rate
- Visible in Project Detail page under "Costing" tab

---

## 📊 Common Workflows

### Workflow 1: New Item Setup

1. Create inventory item with opening stock
2. Set reorder level
3. Item appears in Stock Dashboard
4. Ready for use in production

### Workflow 2: Receive Goods (GRN)

1. Create Purchase Order
2. Receive goods → Create GRN
3. Stock automatically added to inventory
4. Available for production use

### Workflow 3: Issue Materials for Production

1. Production job is created
2. Go to Material Issue page
3. Select job and add items
4. Enter quantities and wastage
5. Issue materials
6. Stock deducted, job updated

### Workflow 4: Stock Adjustment

1. Physical stock count performed
2. Compare with system stock
3. Use Adjust Stock feature
4. Enter difference with reason
5. Stock corrected in system

### Workflow 5: Monitor Low Stock

1. Set reorder levels on items
2. System monitors automatically
3. View low stock items on dashboard
4. Create Material Request for restocking
5. Create Purchase Order
6. Receive goods via GRN

---

## 🎯 Best Practices

1. **Set Reorder Levels**: Always set reorder levels for critical items
2. **Regular Stock Checks**: Perform physical counts regularly
3. **Record Wastage**: Always record wastage when issuing materials
4. **Use Remarks**: Add remarks to transactions for audit trail
5. **Monitor Alerts**: Check low stock alerts regularly
6. **Accurate Quantities**: Double-check quantities before issuing
7. **Batch Tracking**: Use batch numbers if tracking is required

---

## ❓ Troubleshooting

### "Insufficient Stock" Error

**Problem**: Cannot issue material - insufficient stock

**Solutions:**
- Check available quantity (Available - Reserved)
- Create GRN to add stock
- Unreserve stock if reservation is no longer needed
- Check if item is correct

### Stock Doesn't Match Physical Count

**Problem**: System stock differs from warehouse

**Solution:**
- Use "Adjust Stock" feature
- Enter the difference
- Add remark explaining the adjustment
- Review recent transactions for errors

### Item Not Showing in Dropdown

**Problem**: Item not available when issuing materials

**Solutions:**
- Check if item exists in inventory
- Verify item belongs to your tenant
- Check if item is marked as system item
- Create the item if it doesn't exist

---

## 📱 Quick Reference

### Navigation Paths

- **Stock Dashboard**: `/inventory/stock`
- **Create Item**: `/inventory/items/create`
- **Item Detail**: `/inventory/items/:id`
- **Issue Material**: `/inventory/issue`
- **Stock Ledger**: `/inventory/ledger`
- **Wastage Report**: `/inventory/wastage`

### Key Terms

- **Available Qty**: Stock available for use (Total - Reserved)
- **Reserved Qty**: Stock committed to orders/jobs
- **Reorder Level**: Minimum stock level before alert
- **Wastage**: Material lost/scrapped during production
- **GRN**: Goods Receipt Note (stock received)
- **Material Issue**: Stock issued to production job

---

## 🔐 Permissions by Role

| Feature | DIRECTOR | STOREKEEPER | PRODUCTION | PROCUREMENT |
|---------|----------|-------------|------------|-------------|
| View Stock | ✅ | ✅ | ✅ | ✅ |
| Create Items | ✅ | ✅ | ❌ | ❌ |
| Edit Items | ✅ | ✅ | ❌ | ❌ |
| Issue Materials | ✅ | ✅ | ✅ | ❌ |
| Adjust Stock | ✅ | ✅ | ❌ | ❌ |
| View Ledger | ✅ | ✅ | ✅ | ✅ |
| View Wastage | ✅ | ✅ | ✅ | ✅ |
| Reserve Stock | ✅ | ✅ | ❌ | ✅ |

---

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review error messages carefully
3. Verify your role has required permissions
4. Check that data is entered correctly
5. Contact system administrator if problem persists

---

**Last Updated**: December 2024
**Version**: 1.0

