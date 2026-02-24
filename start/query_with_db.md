In **TypeORM**, there are multiple ways to fetch data from the database. Each approach has different use cases, flexibility levels, and complexity.

I’ll explain:

1. Repository methods
2. Query Builder
3. Raw SQL (`query()` method)
4. Entity Manager

With examples, differences, and advantages.

---

# 1️⃣ Repository Method (Most Common & Simple)

This is the **standard and recommended way** for normal CRUD operations.

### Example Entity

```ts
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  age: number;

  @Column()
  isActive: boolean;
}
```

---

## 🔹 Basic Fetch

```ts
const users = await userRepository.find();
```

## 🔹 With Condition

```ts
const users = await userRepository.find({
  where: { isActive: true }
});
```

## 🔹 Find One

```ts
const user = await userRepository.findOne({
  where: { id: 1 }
});
```

## 🔹 Select Specific Columns

```ts
const users = await userRepository.find({
  select: ['id', 'name']
});
```

## 🔹 Relations

```ts
const users = await userRepository.find({
  relations: ['orders']
});
```

---

## ✅ Advantages

* Simple
* Clean syntax
* Easy to read
* Good for 80% of use cases
* Built-in relation handling

## ❌ Limitations

* Not good for complex joins
* Hard for aggregation (GROUP BY, HAVING, etc.)

---

# 2️⃣ Query Builder (Flexible & Powerful)

Used for **complex queries**, joins, aggregation, subqueries.

---

## 🔹 Basic Example

```ts
const users = await userRepository
  .createQueryBuilder("user")
  .where("user.age > :age", { age: 18 })
  .getMany();
```

---

## 🔹 With Join

```ts
const users = await userRepository
  .createQueryBuilder("user")
  .leftJoinAndSelect("user.orders", "order")
  .where("order.price > :price", { price: 100 })
  .getMany();
```

---

## 🔹 Aggregation

```ts
const count = await userRepository
  .createQueryBuilder("user")
  .select("COUNT(user.id)", "total")
  .getRawOne();
```

---

## 🔹 Group By

```ts
const result = await userRepository
  .createQueryBuilder("user")
  .select("user.age", "age")
  .addSelect("COUNT(*)", "count")
  .groupBy("user.age")
  .getRawMany();
```

---

## ✅ Advantages

* Full SQL power
* Complex joins
* Aggregation
* Subqueries
* Dynamic query building

## ❌ Disadvantages

* More complex
* Slightly harder to read
* More verbose

---

# 3️⃣ Raw SQL (`query()` method)

Direct SQL execution.

---

## 🔹 Example

```ts
const users = await dataSource.query(
  "SELECT * FROM user WHERE age > $1",
  [18]
);
```

---

## ✅ Advantages

* Full SQL control
* Maximum performance tuning
* Useful for very complex queries

## ❌ Disadvantages

* No TypeORM abstraction
* No entity mapping automatically
* Risk of SQL injection if not careful
* Harder to maintain

---

# 4️⃣ Entity Manager

Similar to repository but more generic.

```ts
const users = await dataSource.manager.find(User);
```

With condition:

```ts
const users = await dataSource.manager.find(User, {
  where: { isActive: true }
});
```

---

## ✅ When to Use Entity Manager?

* Transactions
* When working with multiple entities
* Inside custom repositories

---

# 🔥 Difference Summary Table

| Feature            | Repository | Query Builder | Raw SQL | Entity Manager |
| ------------------ | ---------- | ------------- | ------- | -------------- |
| Simple CRUD        | ✅ Best     | ❌             | ❌       | ✅              |
| Complex joins      | ⚠️ Limited | ✅ Best        | ✅       | ⚠️             |
| Aggregation        | ❌ Hard     | ✅             | ✅       | ❌              |
| Type Safety        | ✅          | ✅             | ❌       | ✅              |
| Maintainability    | ✅ High     | Medium        | Low     | High           |
| Performance tuning | ❌          | ⚠️            | ✅ Best  | ❌              |

---

# 🧠 When Should You Use What?

### 👉 Use Repository when:

* Normal CRUD
* Filtering
* Pagination
* Simple relations

### 👉 Use Query Builder when:

* Complex joins
* Dynamic filters
* Reports
* Aggregations
* GROUP BY

### 👉 Use Raw SQL when:

* Very complex query
* Database-specific feature
* Performance optimization required

### 👉 Use Entity Manager when:

* Inside transactions
* Working with multiple repositories

---

# 🔥 Real Industry Practice (Important)

In most production apps:

* 70% → Repository
* 25% → Query Builder
* 5% → Raw SQL

---

Since you’re working heavily with backend (Node.js + PostgreSQL), I recommend:

* Start with Repository
* Move to Query Builder for complex APIs (like filters, sorting, analytics)
* Use Raw SQL only when truly required

---

If you want, I can next explain:

* How pagination works in all 3 methods
* How sorting works (multiple column sorting like Excel)
* How to optimize TypeORM queries for production 🚀
