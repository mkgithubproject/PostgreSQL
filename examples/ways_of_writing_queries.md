In **TypeORM with PostgreSQL**, there are **multiple ways to write queries**. Each method is used for different complexity levels. In backend development (like your **Node.js + TypeScript API**), developers usually use **5–6 main approaches**.

I'll explain **all major ways with examples and when to use them**.

---

# 1️⃣ Repository Methods (Simplest Way)

This is the **most common CRUD method**. You don't write SQL; TypeORM generates it.

### Example

```ts
const orders = await orderRepository.find({
  where: {
    seller_code: "m00000"
  }
});
```

### Generated SQL (behind the scenes)

```sql
SELECT * FROM ec_orders
WHERE seller_code = 'm00000';
```

### More Example

```ts
const order = await orderRepository.findOne({
  where: { order_id: 10 }
});
```

### Common Repository Methods

| Method      | Purpose           |
| ----------- | ----------------- |
| `find()`    | get multiple rows |
| `findOne()` | get single row    |
| `save()`    | insert/update     |
| `delete()`  | delete            |
| `update()`  | update rows       |
| `count()`   | count rows        |

### Advantages

✔ Very simple
✔ Clean code
✔ Good for CRUD APIs

### Limitations

❌ Hard to write complex queries
❌ No subqueries or advanced SQL

---

# 2️⃣ QueryBuilder (Most Powerful in TypeORM)

This is used for **complex queries** like:

* joins
* aggregations
* group by
* subqueries
* dynamic filtering

Example:

```ts
const orders = await orderRepository
  .createQueryBuilder("orders")
  .where("orders.seller_code = :seller", { seller: "m00000" })
  .getMany();
```

Generated SQL:

```sql
SELECT * FROM ec_orders orders
WHERE orders.seller_code = 'm00000';
```

### Example with JOIN

```ts
const orders = await orderRepository
  .createQueryBuilder("orders")
  .leftJoinAndSelect("orders.products", "products")
  .where("orders.seller_code = :seller", { seller: "m00000" })
  .getMany();
```

### Example with Aggregation

```ts
const summary = await orderRepository
  .createQueryBuilder("orders")
  .select("COUNT(*)", "totalOrders")
  .addSelect("SUM(orders.total_order_amount)", "totalSales")
  .getRawOne();
```

### Advantages

✔ Very flexible
✔ Supports complex SQL
✔ Safe parameter binding

### Disadvantages

❌ Slightly longer code

---

# 3️⃣ Raw SQL Query

You can write **pure PostgreSQL queries**.

Example:

```ts
const result = await orderRepository.query(`
  SELECT COUNT(order_id)
  FROM ec_orders
  WHERE seller_code = $1
`, ["m00000"]);
```

### Advantages

✔ Full PostgreSQL power
✔ Best for complex reports

### Disadvantages

❌ No TypeORM abstraction
❌ Harder to maintain

---

# 4️⃣ EntityManager

The **TypeORM EntityManager** allows queries **without using a specific repository**.

Example:

```ts
const orders = await this.entityManager.find(Order, {
  where: { seller_code: "m00000" }
});
```

### Raw Query with EntityManager

```ts
const result = await this.entityManager.query(
  `SELECT * FROM ec_orders WHERE seller_code = $1`,
  ["m00000"]
);
```

### When Used

* Generic database services
* Transactions
* When multiple entities are involved

---

# 5️⃣ QueryRunner (Low-Level Control)

The **TypeORM QueryRunner** is used when you need **manual database control**.

Mostly used for:

* transactions
* migrations
* manual connection handling

Example:

```ts
const queryRunner = dataSource.createQueryRunner();

await queryRunner.connect();

const orders = await queryRunner.query(
  `SELECT * FROM ec_orders WHERE seller_code = $1`,
  ["m00000"]
);

await queryRunner.release();
```

### Transaction Example

```ts
await queryRunner.startTransaction();

try {

  await queryRunner.manager.save(order);

  await queryRunner.commitTransaction();

} catch (err) {

  await queryRunner.rollbackTransaction();

}
```

### Advantages

✔ Full control
✔ Manual transactions

### Disadvantages

❌ More complex

---

# 6️⃣ Custom Repository (Advanced Architecture)

You can create **custom repository classes**.

Example:

```ts
export class OrderRepository extends Repository<Order> {

  async getSellerOrders(sellerCode: string) {

    return this.createQueryBuilder("orders")
      .where("orders.seller_code = :seller", { seller: sellerCode })
      .getMany();

  }

}
```

Usage:

```ts
const orders = await orderRepository.getSellerOrders("m00000");
```

### Advantages

✔ Clean architecture
✔ Reusable queries

---

# 📊 Summary

| Method            | Complexity | Use Case               |
| ----------------- | ---------- | ---------------------- |
| Repository        | ⭐          | Simple CRUD            |
| QueryBuilder      | ⭐⭐⭐⭐       | Complex queries        |
| Raw SQL           | ⭐⭐⭐⭐       | Reports / advanced SQL |
| EntityManager     | ⭐⭐         | Generic DB operations  |
| QueryRunner       | ⭐⭐⭐⭐⭐      | Transactions           |
| Custom Repository | ⭐⭐⭐        | Clean architecture     |

---

# 🧠 Industry Usage

In **real production backend systems**:

* **70%** → QueryBuilder
* **20%** → Repository methods
* **5%** → Raw SQL
* **5%** → QueryRunner / EntityManager

---

✅ Since you are building **report APIs (like your summary API)**, the **best choice is QueryBuilder**.

---

If you want, I can also show you:

**🔥 10 advanced TypeORM query patterns senior backend developers use (JOIN, GROUP BY, subqueries, pagination, window functions).**
