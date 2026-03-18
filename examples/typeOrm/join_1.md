Exactly ✅ — in TypeORM, the **third parameter** of `.leftJoin()` or `.innerJoin()` is equivalent to the SQL `ON` condition.

---

### **TypeORM syntax**

```ts
.leftJoin(
  "table_to_join",      // table name or entity
  "alias_for_table",    // alias
  "join_condition"      // ← THIS is the ON condition
)
```

* The third argument is **not optional** if you need a custom join condition.
* Everything you put here behaves exactly like `ON` in raw SQL.

**Example:**

```ts
.createQueryBuilder("dates")
.leftJoin(
  "ec_order",
  "orders",
  `DATE_TRUNC('day', orders.shipment_completion_date) = dates.date
   AND orders.seller_code = :storeCode
   AND orders.status = :status`
)
```

* Equivalent raw SQL:

```sql
FROM generate_series(...) AS dates
LEFT JOIN ec_order orders
  ON DATE_TRUNC('day', orders.shipment_completion_date) = dates.date
     AND orders.seller_code = 'S001'
     AND orders.status = 6
```

---

### **Key takeaway**

* **Third parameter in TypeORM join = ON condition**
* You can include **multiple conditions** (date match, seller_code, status, etc.)
* This is why your `LEFT JOIN` works even though it looked like there was “no ON clause”

---

If you want, I can also show a **side-by-side comparison of TypeORM join vs raw SQL** for your full query — it makes it crystal clear how TypeORM maps the joins.

Do you want me to do that?


```
// Product aggregation
				.leftJoin(
					(qb: any) => {
						return qb
							.select("op.order_id", "order_id")
							.addSelect("o.seller_code", "seller_code")
							.addSelect("SUM(op.sales_volumn)", "total_items")
							.from("ec_order_product", "op")
							.innerJoin(
								"ec_order",
								"o",
								"o.order_id = op.order_id AND o.seller_code = op.seller_code"
							)
							.where("o.seller_code = :storeCode")
							.andwhere("o.shipment_completion_date >= :start")
							.andWhere("o.shipment_completion_date < :end")
							.andWhere("o.status = :status")
							.groupBy("op.order_id")
							.addGroupBy("o.seller_code");
					},
					"op_agg",
					"op_agg.order_id = orders.order_id AND op_agg.seller_code = orders.seller_code"



          Totally fair — this part *is confusing* the first time. Let’s simplify it a lot and build intuition step by step 👇
```

---

# 🧠 Big Picture (1 line)

👉 You are:

1. **Calculating total items per order (subquery)**
2. Then **joining that result back to orders**

---

# 🔥 Think of it like 2 separate queries

---

## ✅ STEP 1: Subquery (op_agg) — “items per order”

```ts
.from("ec_order_product", "op")
.innerJoin(
  "ec_order",
  "o",
  "o.order_id = op.order_id AND o.seller_code = op.seller_code"
)
```

### What happens here?

👉 You connect:

```
op (products)  →  o (orders)
```

Using:

* `order_id`
* `seller_code`

---

## 📊 Example Data

### ec_order

| order_id | seller_code | date       | status |
| -------- | ----------- | ---------- | ------ |
| 101      | S001        | 2025-12-24 | 6      |
| 102      | S001        | 2025-12-24 | 6      |
| 103      | S001        | 2025-12-25 | 5 ❌    |

---

### ec_order_product

| order_id | seller_code | sales_volumn |
| -------- | ----------- | ------------ |
| 101      | S001        | 50           |
| 101      | S001        | 30           |
| 102      | S001        | 40           |
| 103      | S001        | 60           |

---

## 🔗 After INNER JOIN

```ts
o.order_id = op.order_id AND o.seller_code = op.seller_code
```

👉 Result:

| order_id | seller_code | sales_volumn | status |
| -------- | ----------- | ------------ | ------ |
| 101      | S001        | 50           | 6      |
| 101      | S001        | 30           | 6      |
| 102      | S001        | 40           | 6      |
| 103      | S001        | 60           | 5 ❌    |

---

## 🚫 Apply filters

```ts
.where("o.shipment_completion_date >= :start")
.andWhere("o.shipment_completion_date < :end")
.andWhere("o.status = :status")
```

👉 Removes order `103` (status ≠ 6)

---

## ➕ Grouping

```ts
.groupBy("op.order_id")
.addGroupBy("o.seller_code")
```

👉 Now we collapse rows:

| order_id | seller_code | total_items |
| -------- | ----------- | ----------- |
| 101      | S001        | 80          |
| 102      | S001        | 40          |

---

## ✅ FINAL SUBQUERY RESULT (`op_agg`)

This is your **virtual table**:

| order_id | seller_code | total_items |
| -------- | ----------- | ----------- |
| 101      | S001        | 80          |
| 102      | S001        | 40          |

---

# 🚀 STEP 2: Join with main query

```ts
"op_agg.order_id = orders.order_id 
 AND op_agg.seller_code = orders.seller_code"
```

---

## Main query (orders)

| order_id | seller_code | date       |
| -------- | ----------- | ---------- |
| 101      | S001        | 2025-12-24 |
| 102      | S001        | 2025-12-24 |
| 103      | S001        | 2025-12-25 |

---

## 🔗 After LEFT JOIN

| order_id | seller_code | total_items |
| -------- | ----------- | ----------- |
| 101      | S001        | 80          |
| 102      | S001        | 40          |
| 103      | S001        | NULL ❗      |

👉 Order 103 has no match because it was filtered out earlier

---

# 🎯 WHY all this is needed

### ❌ If you directly join products

You’d get:

| order_id | product |
| -------- | ------- |
| 101      | row1    |
| 101      | row2    |

👉 This causes:

* ❌ Duplicate orders
* ❌ Wrong counts
* ❌ Wrong sums

---

### ✅ Your approach fixes it

* First: **aggregate per order**
* Then: **join clean data**

---

# 🧩 Simple Mental Model

```
STEP 1:
Products table (many rows per order)
        ↓
JOIN orders (filter valid ones)
        ↓
GROUP BY order_id
        ↓
1 row per order (total_items)

STEP 2:
Join this with main orders table
```

---

# ✅ Answer to your confusion

👉 “How is ec_order_product + inner join working?”

✔ `ec_order_product` gives **item-level rows**
✔ `ec_order` is used to:

* filter (date, status)
* validate seller

✔ `INNER JOIN` ensures:

* only valid orders are used

✔ `GROUP BY` converts:

* many product rows → one row per order

✔ `LEFT JOIN` attaches it back

---

# 💡 Final clarity sentence

👉 You are **not joining products to orders directly in main query**
👉 You are **first summarizing products per order, then joining summary**

---

```
// data query
			const dataQuery = this.orderRepository.manager
				.createQueryBuilder()
				// generate_series 
				.from(
					`(SELECT generate_series(
						DATE_TRUNC('${truncUnit}', :start::date),
						DATE_TRUNC('${truncUnit}', :endSeries::date),
						interval '${interval}'
					) AS date)`,
					"dates"
				)
				// Filtered orders
				.leftJoin(
					"ec_order",
					"orders",
					`DATE_TRUNC('${truncUnit}', orders.shipment_completion_date) = dates.date
					 AND orders.seller_code = :storeCode
					 AND orders.shipment_completion_date >= :start
					 AND orders.shipment_completion_date < :end
					 AND orders.status = :status`
				)

				// Product aggregation
				.leftJoin(
					(qb: any) => {
						return qb
							.select("op.order_id", "order_id")
							.addSelect("o.seller_code", "seller_code")
							.addSelect("SUM(op.sales_volumn)", "total_items")
							.from("ec_order_product", "op")
							.innerJoin(
								"ec_order",
								"o",
								"o.order_id = op.order_id AND o.seller_code = op.seller_code"
							)
							.where("o.seller_code = :storeCode")
							.andwhere("o.shipment_completion_date >= :start")
							.andWhere("o.shipment_completion_date < :end")
							.andWhere("o.status = :status")
							.groupBy("op.order_id")
							.addGroupBy("o.seller_code");
					},
					"op_agg",
					"op_agg.order_id = orders.order_id AND op_agg.seller_code = orders.seller_code"
				)

				.select(
					viewBy === "monthly"
						? "TO_CHAR(dates.date, 'YYYY/MM')"
						: "TO_CHAR(dates.date, 'YYYY/MM/DD')",
					"date"
				)
				.addSelect("COUNT(orders.order_id)::int", "number_of_orders")
				.addSelect(
					"COALESCE(SUM(orders.total_order_amount),0)",
					"order_sales_amount"
				)
				.addSelect(
					"COALESCE(SUM(op_agg.total_items),0)::int",
					"number_of_items_sold"
				)
				.addSelect(
					`ROUND(
						COALESCE(SUM(orders.total_order_amount),0) /
						NULLIF(COUNT(orders.order_id),0)
						,2)`,
					"average_order_value"
				)
				.groupBy("dates.date")
				.orderBy(orderColumn, orderDirection)
				.setParameters({
					start,
					end,
					endSeries,
					storeCode,
					status: "6"
				});
```

