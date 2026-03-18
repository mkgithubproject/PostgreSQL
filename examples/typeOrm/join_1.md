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
