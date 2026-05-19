\section*{Result Set Column Names and Data Types}

The column names for the result of a set operation are taken from the column names of the first query block. Example:
```
mysql> CREATE TABLE t1 (x INT, y INT);
Query OK, 0 rows affected (0.04 sec)
mysql> INSERT INTO t1 VALUES ROW(4,-2), ROW(5,9);
Query OK, 2 rows affected (0.00 sec)
Records: 2 Duplicates: 0 Warnings: 0
mysql> CREATE TABLE t2 (a INT, b INT);
Query OK, 0 rows affected (0.04 sec)
mysql> INSERT INTO t2 VALUES ROW(1,2), ROW(3,4);
Query OK, 2 rows affected (0.01 sec)
Records: 2 Duplicates: 0 Warnings: 0
mysql> TABLE t1 UNION TABLE t2;
+------+-------+
| x | y |
+------+------+
| 4 | -2 |
```

```
| 1 1 2 1
+------+------+
4 rows in set (0.00 sec)
mysql> TABLE t2 UNION TABLE t1;
+------+------+
| a | b |
+------+------+
| 1 | 2 |
| 3 | 4 |
+------+------+
4 rows in set (0.00 sec)
```


This is true for UNION, EXCEPT, and INTERSECT queries.
Selected columns listed in corresponding positions of each query block should have the same data type. For example, the first column selected by the first statement should have the same type as the first column selected by the other statements. If the data types of corresponding result columns do not match, the types and lengths of the columns in the result take into account the values retrieved by all of the query blocks. For example, the column length in the result set is not constrained to the length of the value from the first statement, as shown here:
```
mysql> SELECT REPEAT('a',1) UNION SELECT REPEAT('b',20);
+------------------------+
| REPEAT('a',1) |
+-----------------------+
| a
| bbbbbbbbbbbbbbbbbbbbb |
+-----------------------+
```


\section*{Set Operations with TABLE and VALUES Statements}

You can also use a TABLE statement or VALUES statement wherever you can employ the equivalent SELECT statement. Assume that tables t1 and t2 are created and populated as shown here:
```
CREATE TABLE t1 (x INT, y INT);
INSERT INTO t1 VALUES ROW(4,-2),ROW(5,9);
CREATE TABLE t2 (a INT, b INT);
INSERT INTO t2 VALUES ROW(1,2),ROW(3,4);
```


The preceding being the case, and disregarding the column names in the output of the queries beginning with VALUES, all of the following UNION queries yield the same result:
```
SELECT * FROM t1 UNION SELECT * FROM t2;
TABLE t1 UNION SELECT * FROM t2;
VALUES ROW(4,-2), ROW(5,9) UNION SELECT * FROM t2;
SELECT * FROM t1 UNION TABLE t2;
TABLE t1 UNION TABLE t2;
VALUES ROW(4,-2), ROW(5,9) UNION TABLE t2;
SELECT * FROM t1 UNION VALUES ROW(4,-2),ROW(5,9);
TABLE t1 UNION VALUES ROW(4,-2),ROW(5,9);
VALUES ROW(4,-2), ROW(5,9) UNION VALUES ROW(4,-2),ROW(5,9);
```


To force the column names to be the same, wrap the query block on the left-hand side in a SELECT statement, and use aliases, like this:
```
mysql> SELECT * FROM (TABLE t2) AS t(x,y) UNION TABLE t1;
+------+-------+
| x | y |
+------+------+
| 1 | 2 |
|rr 3 |r 4 |
| 5 | 9 |
```

```
+------+------+
4 rows in set (0.00 sec)
```


\section*{Set Operations using DISTINCT and ALL}

By default, duplicate rows are removed from results of set operations. The optional DISTINCT keyword has the same effect but makes it explicit. With the optional ALL keyword, duplicate-row removal does not occur and the result includes all matching rows from all queries in the union.

You can mix ALL and DISTINCT in the same query. Mixed types are treated such that a set operation using DISTINCT overrides any such operation using ALL to its left. A DISTINCT set can be produced explicitly by using DISTINCT with UNION, INTERSECT, or EXCEPT, or implicitly by using the set operations with no following DISTINCT or ALL keyword.

Set operations work the same way when one or more TABLE statements, VALUES statements, or both, are used to generate the set.

\section*{Set Operations with ORDER BY and LIMIT}

To apply an ORDER BY or LIMIT clause to an individual query block used as part of a union, intersection, or other set operation, parenthesize the query block, placing the clause inside the parentheses, like this:
```
(SELECT a FROM t1 WHERE a=10 AND b=1 ORDER BY a LIMIT 10)
UNION
(SELECT a FROM t2 WHERE a=11 AND b=2 ORDER BY a LIMIT 10);
(TABLE t1 ORDER BY x LIMIT 10)
INTERSECT
(TABLE t2 ORDER BY a LIMIT 10);
```


Use of ORDER BY for individual query blocks or statements implies nothing about the order in which the rows appear in the final result because the rows produced by a set operation are by default unordered. Therefore, ORDER BY in this context typically is used in conjunction with LIMIT, to determine the subset of the selected rows to retrieve, even though it does not necessarily affect the order of those rows in the final result. If ORDER BY appears without LIMIT within a query block, it is optimized away because it has no effect in any case.

To use an ORDER BY or LIMIT clause to sort or limit the entire result of a set operation, place the ORDER BY or LIMIT after the last statement:
```
SELECT a FROM t1
EXCEPT
SELECT a FROM t2 WHERE a=11 AND b=2
ORDER BY a LIMIT 10;
TABLE t1
UNION
TABLE t2
ORDER BY a LIMIT 10;
```


If one or more individual statements make use of ORDER BY, LIMIT, or both, and, in addition, you wish to apply an ORDER BY, LIMIT, or both to the entire result, then each such individual statement must be enclosed in parentheses.
```
(SELECT a FROM t1 WHERE a=10 AND b=1)
EXCEPT
(SELECT a FROM t2 WHERE a=11 AND b=2)
ORDER BY a LIMIT 10;
(TABLE t1 ORDER BY a LIMIT 10)
UNION
TABLE t2
ORDER BY a LIMIT 10;
```


A statement with no ORDER BY or LIMIT clause does need to be parenthesized; replacing TABLE t2 with (TABLE t2) in the second statement of the two just shown does not alter the result of the UNION.

You can also use ORDER BY and LIMIT with VALUES statements in set operations, as shown in this example using the mysql client:
```
mysql> VALUES ROW(4,-2), ROW(5,9), ROW(-1,3)
    -> UNION
    -> VALUES ROW(1,2), ROW(3,4), ROW(-1,3)
    -> ORDER BY column_0 DESC LIMIT 3;
+----------+----------+
| column_0 | column_1 |
+----------+----------+
| 5 | 9 |
| 4 -2 |
| 3 | 4 |
+----------+----------+
3 rows in set (0.00 sec)
```

(You should keep in mind that neither TABLE statements nor VALUES statements accept a WHERE clause.)

This kind of ORDER BY cannot use column references that include a table name (that is, names in tbl_name.col_name format). Instead, provide a column alias in the first query block, and refer to the alias in the ORDER BY clause. (You can also refer to the column in the ORDER BY clause using its column position, but such use of column positions is deprecated, and thus subject to eventual removal in a future MySQL release.)

If a column to be sorted is aliased, the ORDER BY clause must refer to the alias, not the column name. The first of the following statements is permitted, but the second fails with an Unknown column 'a' in 'order clause' error:
```
(SELECT a AS b FROM t) UNION (SELECT ...) ORDER BY b;
(SELECT a AS b FROM t) UNION (SELECT ...) ORDER BY a;
```


To cause rows in a UNION result to consist of the sets of rows retrieved by each query block one after the other, select an additional column in each query block to use as a sort column and add an ORDER BY clause that sorts on that column following the last query block:
```
(SELECT 1 AS sort_col, col1a, col1b, ... FROM t1)
UNION
(SELECT 2, col2a, col2b, ... FROM t2) ORDER BY sort_col;
```


To maintain sort order within individual results, add a secondary column to the ORDER BY clause:
```
(SELECT 1 AS sort_col, col1a, col1b, ... FROM t1)
UNION
(SELECT 2, col2a, col2b, ... FROM t2) ORDER BY sort_col, col1a;
```


Use of an additional column also enables you to determine which query block each row comes from. Extra columns can provide other identifying information as well, such as a string that indicates a table name.

\section*{Limitations of Set Operations}

Set operations in MySQL are subject to some limitations, which are described in the next few paragraphs.

Set operations including SELECT statements have the following limitations:
- HIGH_PRIORITY in the first SELECT has no effect. HIGH_PRIORITY in any subsequent SELECT produces a syntax error.
- Only the last SELECT statement can use an INTO clause. However, the entire UNION result is written to the INTO output destination.

These two UNION variants containing INTO are deprecated; you should expect support for them to be removed in a future version of MySQL:
- In the trailing query block of a query expression, use of INTO before FROM produces a warning. Example:
```
... UNION SELECT * INTO OUTFILE 'file_name' FROM table_name;
```

- In a parenthesized trailing block of a query expression, use of INTO (regardless of its position relative to FROM) produces a warning. Example:
```
... UNION (SELECT * INTO OUTFILE 'file_name' FROM table_name);
```


Those variants are deprecated because they are confusing, as if they collect information from the named table rather than the entire query expression (the UNION).

Set operations with an aggregate function in an ORDER BY clause are rejected with ER_AGGREGATE_ORDER_FOR_UNION. Although the error name might suggest that this is exclusive to UNION queries, the preceding is also true for EXCEPT and INTERSECT queries, as shown here:
```
mysql> TABLE t1 INTERSECT TABLE t2 ORDER BY MAX(x);
ERROR 3028 (HY000): Expression #1 of ORDER BY contains aggregate function and applies to a UNION, EXCEP
```


A locking clause (such as FOR UPDATE or LOCK IN SHARE MODE) applies to the query block it follows. This means that, in a SELECT statement used with set operations, a locking clause can be used only if the query block and locking clause are enclosed in parentheses.

\subsection*{15.2.15 Subqueries}

A subquery is a SELECT statement within another statement.
All subquery forms and operations that the SQL standard requires are supported, as well as a few features that are MySQL-specific.

Here is an example of a subquery:
SELECT * FROM t1 WHERE column1 = (SELECT column1 FROM t2);
In this example, SELECT * FROM t1 . . . is the outer query (or outer statement), and (SELECT column1 FROM t2) is the subquery. We say that the subquery is nested within the outer query, and in fact it is possible to nest subqueries within other subqueries, to a considerable depth. A subquery must always appear within parentheses.

The main advantages of subqueries are:
- They allow queries that are structured so that it is possible to isolate each part of a statement.
- They provide alternative ways to perform operations that would otherwise require complex joins and unions.
- Many people find subqueries more readable than complex joins or unions. Indeed, it was the innovation of subqueries that gave people the original idea of calling the early SQL "Structured Query Language."

Here is an example statement that shows the major points about subquery syntax as specified by the SQL standard and supported in MySQL:
```
DELETE FROM t1
WHERE s11 > ANY
    (SELECT COUNT(*) /* no hint */ FROM t2
    WHERE NOT EXISTS
        (SELECT * FROM t3
            WHERE ROW(5*t2.s1,77)=
            (SELECT 50,11*s1 FROM t4 UNION SELECT 50,77 FROM
```

```
(SELECT * FROM t5) AS t5)));
```


A subquery can return a scalar (a single value), a single row, a single column, or a table (one or more rows of one or more columns). These are called scalar, column, row, and table subqueries. Subqueries that return a particular kind of result often can be used only in certain contexts, as described in the following sections.

There are few restrictions on the type of statements in which subqueries can be used. A subquery can contain many of the keywords or clauses that an ordinary SELECT can contain: DISTINCT, GROUP BY, ORDER BY, LIMIT, joins, index hints, UNION constructs, comments, functions, and so on.

TABLE and VALUES statements can be used in subqueries. Subqueries using VALUES are generally more verbose versions of subqueries that can be rewritten more compactly using set notation, or with SELECT or TABLE syntax; assuming that table ts is created using the statement CREATE TABLE ts VALUES $\operatorname{ROW}(2), \operatorname{ROW}(4), \operatorname{ROW}(6)$, the statements shown here are all equivalent:
```
SELECT * FROM tt
    WHERE b > ANY (VALUES ROW(2), ROW(4), ROW(6));
SELECT * FROM tt
    WHERE b > ANY (SELECT * FROM ts);
SELECT * FROM tt
    WHERE b > ANY (TABLE ts);
```


Examples of TABLE subqueries are shown in the sections that follow.
A subquery's outer statement can be any one of: SELECT, INSERT, UPDATE, DELETE, SET, or DO.
For information about how the optimizer handles subqueries, see Section 10.2.2, "Optimizing Subqueries, Derived Tables, View References, and Common Table Expressions". For a discussion of restrictions on subquery use, including performance issues for certain forms of subquery syntax, see Section 15.2.15.12, "Restrictions on Subqueries".

\subsection*{15.2.15.1 The Subquery as Scalar Operand}

In its simplest form, a subquery is a scalar subquery that returns a single value. A scalar subquery is a simple operand, and you can use it almost anywhere a single column value or literal is legal, and you can expect it to have those characteristics that all operands have: a data type, a length, an indication that it can be NULL, and so on. For example:
```
CREATE TABLE t1 (s1 INT, s2 CHAR(5) NOT NULL);
INSERT INTO t1 VALUES(100, 'abcde');
SELECT (SELECT s2 FROM t1);
```


The subquery in this SELECT returns a single value ( ' abcde ' ) that has a data type of CHAR, a length of 5 , a character set and collation equal to the defaults in effect at CREATE TABLE time, and an indication that the value in the column can be NULL. Nullability of the value selected by a scalar subquery is not copied because if the subquery result is empty, the result is NULL. For the subquery just shown, if t1 were empty, the result would be NULL even though s2 is NOT NULL.

There are a few contexts in which a scalar subquery cannot be used. If a statement permits only a literal value, you cannot use a subquery. For example, LIMIT requires literal integer arguments, and LOAD DATA requires a literal string file name. You cannot use subqueries to supply these values.

When you see examples in the following sections that contain the rather spartan construct (SELECT column1 FROM t1), imagine that your own code contains much more diverse and complex constructions.

Suppose that we make two tables:
```
CREATE TABLE t1 (s1 INT);
INSERT INTO t1 VALUES (1);
```


CREATE TABLE t2 (s1 INT);
INSERT INTO t2 VALUES (2);
Then perform a SELECT:
```
SELECT (SELECT s1 FROM t2) FROM t1;
```


The result is 2 because there is a row in t2 containing a column s1 that has a value of 2 .
The preceding query can also be written like this, using TABLE:
```
SELECT (TABLE t2) FROM t1;
```


A scalar subquery can be part of an expression, but remember the parentheses, even if the subquery is an operand that provides an argument for a function. For example:
```
SELECT UPPER((SELECT s1 FROM t1)) FROM t2;
```


The same result can be obtained using SELECT UPPER((TABLE t1)) FROM t2.

\subsection*{15.2.15.2 Comparisons Using Subqueries}

The most common use of a subquery is in the form:
```
non_subquery_operand comparison_operator (subquery)
```


Where comparison_operator is one of these operators:
```
= > < >= <= <> != <=>
```


For example:
... WHERE 'a' = (SELECT column1 FROM t1)
MySQL also permits this construct:
```
non_subquery_operand LIKE (subquery)
```


At one time the only legal place for a subquery was on the right side of a comparison, and you might still find some old DBMSs that insist on this.

Here is an example of a common-form subquery comparison that you cannot do with a join. It finds all the rows in table t1 for which the column1 value is equal to a maximum value in table t2:
```
SELECT * FROM t1
    WHERE column1 = (SELECT MAX(column2) FROM t2);
```


Here is another example, which again is impossible with a join because it involves aggregating for one of the tables. It finds all rows in table t1 containing a value that occurs twice in a given column:
```
SELECT * FROM t1 AS t
    WHERE 2 = (SELECT COUNT(*) FROM t1 WHERE t1.id = t.id);
```


For a comparison of the subquery to a scalar, the subquery must return a scalar. For a comparison of the subquery to a row constructor, the subquery must be a row subquery that returns a row with the same number of values as the row constructor. See Section 15.2.15.5, "Row Subqueries".

\subsection*{15.2.15.3 Subqueries with ANY, IN, or SOME}

\section*{Syntax:}
```
operand comparison_operator ANY (subquery)
operand IN (subquery)
operand comparison_operator SOME (subquery)
```


Where comparison_operator is one of these operators:

The ANY keyword, which must follow a comparison operator, means "return TRUE if the comparison is TRUE for ANY of the values in the column that the subquery returns." For example:
```
SELECT s1 FROM t1 WHERE s1 > ANY (SELECT s1 FROM t2);
```


Suppose that there is a row in table t1 containing (10). The expression is TRUE if table t2 contains $(21,14,7)$ because there is a value 7 in t2 that is less than 10. The expression is FALSE if table t2 contains $(20,10)$, or if table t2 is empty. The expression is unknown (that is, NULL) if table t2 contains (NULL, NULL, NULL).

When used with a subquery, the word IN is an alias for = ANY. Thus, these two statements are the same:
```
SELECT s1 FROM t1 WHERE s1 = ANY (SELECT s1 FROM t2);
SELECT s1 FROM t1 WHERE s1 IN (SELECT s1 FROM t2);
```


IN and = ANY are not synonyms when used with an expression list. IN can take an expression list, but $=$ ANY cannot. See Section 14.4.2, "Comparison Functions and Operators".

NOT IN is not an alias for <> ANY, but for <> ALL. See Section 15.2.15.4, "Subqueries with ALL".
The word SOME is an alias for ANY. Thus, these two statements are the same:
```
SELECT s1 FROM t1 WHERE s1 <> ANY (SELECT s1 FROM t2);
SELECT s1 FROM t1 WHERE s1 <> SOME (SELECT s1 FROM t2);
```


Use of the word SOME is rare, but this example shows why it might be useful. To most people, the English phrase "a is not equal to any b" means "there is no $b$ which is equal to $a$," but that is not what is meant by the SQL syntax. The syntax means "there is some b to which a is not equal." Using <> SOME instead helps ensure that everyone understands the true meaning of the query.

You can use TABLE in a scalar IN, ANY, or SOME subquery provided the table contains only a single column. If t2 has only one column, the statements shown previously in this section can be written as shown here, in each case substituting TABLE t2 for SELECT s1 FROM t2:
```
SELECT s1 FROM t1 WHERE s1 > ANY (TABLE t2);
SELECT s1 FROM t1 WHERE s1 = ANY (TABLE t2);
SELECT s1 FROM t1 WHERE s1 IN (TABLE t2);
SELECT s1 FROM t1 WHERE s1 <> ANY (TABLE t2);
SELECT s1 FROM t1 WHERE s1 <> SOME (TABLE t2);
```


\subsection*{15.2.15.4 Subqueries with ALL}

Syntax:
```
operand comparison_operator ALL (subquery)
```


The word ALL, which must follow a comparison operator, means "return TRUE if the comparison is TRUE for ALL of the values in the column that the subquery returns." For example:

SELECT s1 FROM t1 WHERE s1 > ALL (SELECT s1 FROM t2);
Suppose that there is a row in table t1 containing (10). The expression is TRUE if table t2 contains $(-5,0,+5)$ because 10 is greater than all three values in t 2 . The expression is FALSE if table t 2 contains $(12,6$, NULL, -100 ) because there is a single value 12 in table t2 that is greater than 10. The expression is unknown (that is, NULL) if table t2 contains ( 0 , NULL, 1 ).

Finally, the expression is TRUE if table t2 is empty. So, the following expression is TRUE when table t2 is empty:
```
SELECT * FROM t1 WHERE 1 > ALL (SELECT s1 FROM t2);
```


But this expression is NULL when table t 2 is empty:
```
SELECT * FROM t1 WHERE 1 > (SELECT s1 FROM t2);
```


In addition, the following expression is NULL when table t 2 is empty:
```
SELECT * FROM t1 WHERE 1 > ALL (SELECT MAX(s1) FROM t2);
```


In general, tables containing NULL values and empty tables are "edge cases." When writing subqueries, always consider whether you have taken those two possibilities into account.

NOT IN is an alias for <> ALL. Thus, these two statements are the same:
```
SELECT s1 FROM t1 WHERE s1 <> ALL (SELECT s1 FROM t2);
SELECT s1 FROM t1 WHERE s1 NOT IN (SELECT s1 FROM t2);
```


As with IN, ANY, and SOME, you can use TABLE with ALL and NOT IN provided that the following two conditions are met:
- The table in the subquery contains only one column
- The subquery does not depend on a column expression

For example, assuming that table t2 consists of a single column, the last two statements shown previously can be written using TABLE t2 like this:
```
SELECT s1 FROM t1 WHERE s1 <> ALL (TABLE t2);
SELECT s1 FROM t1 WHERE s1 NOT IN (TABLE t2);
```


A query such as SELECT * FROM t1 WHERE 1 > ALL (SELECT MAX(s1) FROM t2); cannot be written using TABLE t2 because the subquery depends on a column expression.

\subsection*{15.2.15.5 Row Subqueries}

Scalar or column subqueries return a single value or a column of values. A row subquery is a subquery variant that returns a single row and can thus return more than one column value. Legal operators for row subquery comparisons are:
```
= > < >= <= <> != <=>
```


Here are two examples:
```
SELECT * FROM t1
    WHERE (col1,col2) = (SELECT col3, col4 FROM t2 WHERE id = 10);
SELECT * FROM t1
    WHERE ROW(col1,col2) = (SELECT col3, col4 FROM t2 WHERE id = 10);
```


For both queries, if the table t 2 contains a single row with $\mathrm{id}=10$, the subquery returns a single row. If this row has col3 and col4 values equal to the col1 and col2 values of any rows in t1, the WHERE expression is TRUE and each query returns those t1 rows. If the t2 row col3 and col4 values are not equal the col1 and col2 values of any t1 row, the expression is FALSE and the query returns an empty result set. The expression is unknown (that is, NULL) if the subquery produces no rows. An error occurs if the subquery produces multiple rows because a row subquery can return at most one row.

For information about how each operator works for row comparisons, see Section 14.4.2, "Comparison Functions and Operators".

The expressions $(1,2)$ and $\operatorname{ROW}(1,2)$ are sometimes called row constructors. The two are equivalent. The row constructor and the row returned by the subquery must contain the same number of values.

A row constructor is used for comparisons with subqueries that return two or more columns. When a subquery returns a single column, this is regarded as a scalar value and not as a row, so a row constructor cannot be used with a subquery that does not return at least two columns. Thus, the following query fails with a syntax error:
```
SELECT * FROM t1 WHERE ROW(1) = (SELECT column1 FROM t2)
```


Row constructors are legal in other contexts. For example, the following two statements are semantically equivalent (and are handled in the same way by the optimizer):
```
SELECT * FROM t1 WHERE (column1,column2) = (1,1);
SELECT * FROM t1 WHERE column1 = 1 AND column2 = 1;
```


The following query answers the request, "find all rows in table t1 that also exist in table t2":
```
SELECT column1,column2,column3
    FROM t1
    WHERE (column1,column2,column3) IN
        (SELECT column1,column2,column3 FROM t2);
```


For more information about the optimizer and row constructors, see Section 10.2.1.22, "Row Constructor Expression Optimization"

\subsection*{15.2.15.6 Subqueries with EXISTS or NOT EXISTS}

If a subquery returns any rows at all, EXISTS subquery is TRUE, and NOT EXISTS subquery is FALSE. For example:
```
SELECT column1 FROM t1 WHERE EXISTS (SELECT * FROM t2);
```


Traditionally, an EXISTS subquery starts with SELECT *, but it could begin with SELECT 5 or SELECT column1 or anything at all. MySQL ignores the SELECT list in such a subquery, so it makes no difference.

For the preceding example, if t2 contains any rows, even rows with nothing but NULL values, the EXISTS condition is TRUE. This is actually an unlikely example because a [NOT] EXISTS subquery almost always contains correlations. Here are some more realistic examples:
- What kind of store is present in one or more cities?
```
SELECT DISTINCT store_type FROM stores
    WHERE EXISTS (SELECT * FROM cities_stores
        WHERE cities_stores.store_type = stores.store_type);
```

- What kind of store is present in no cities?
```
SELECT DISTINCT store_type FROM stores
    WHERE NOT EXISTS (SELECT * FROM cities_stores
            WHERE cities_stores.store_type = stores.store_type);
```

- What kind of store is present in all cities?
```
SELECT DISTINCT store_type FROM stores
    WHERE NOT EXISTS (
        SELECT * FROM cities WHERE NOT EXISTS (
            SELECT * FROM cities_stores
                WHERE cities_stores.city = cities.city
                AND cities_stores.store_type = stores.store_type));
```


The last example is a double-nested NOT EXISTS query. That is, it has a NOT EXISTS clause within a NOT EXISTS clause. Formally, it answers the question "does a city exist with a store that is not in Stores"? But it is easier to say that a nested NOT EXISTS answers the question "is $x$ TRUE for all $y$ ?"

You can also use NOT EXISTS or NOT EXISTS with TABLE in the subquery, like this:
```
SELECT column1 FROM t1 WHERE EXISTS (TABLE t2);
```


The results are the same as when using SELECT * with no WHERE clause in the subquery.

\subsection*{15.2.15.7 Correlated Subqueries}

A correlated subquery is a subquery that contains a reference to a table that also appears in the outer query. For example:
```
SELECT * FROM t1
    WHERE column1 = ANY (SELECT column1 FROM t2
        WHERE t2.column2 = t1.column2);
```


Notice that the subquery contains a reference to a column of t1, even though the subquery's FROM clause does not mention a table t1. So, MySQL looks outside the subquery, and finds t1 in the outer query.

Suppose that table t1 contains a row where column1 $=5$ and column2 $=6$; meanwhile, table t2 contains a row where column1 $=5$ and column2 $=7$. The simple expression ... WHERE column1 = ANY (SELECT column1 FROM t2) would be TRUE, but in this example, the WHERE clause within the subquery is FALSE (because $(5,6)$ is not equal to $(5,7)$ ), so the expression as a whole is FALSE.

Scoping rule: MySQL evaluates from inside to outside. For example:
```
SELECT column1 FROM t1 AS x
    WHERE x.column1 = (SELECT column1 FROM t2 AS x
        WHERE x.column1 = (SELECT column1 FROM t3
            WHERE x.column2 = t3.column1));
```


In this statement, x . column2 must be a column in table t 2 because SELECT column1 FROM t2 AS $\mathrm{x} \ldots$ renames t 2 . It is not a column in table t 1 because SELECT column1 FROM $\mathrm{t} 1 \ldots$ is an outer query that is farther out.

The optimizer can transform a correlated scalar subquery to a derived table when the subquery_to_derived flag of the optimizer_switch variable is enabled. Consider the query shown here:
```
SELECT * FROM t1
    WHERE ( SELECT a FROM t2
            WHERE t2.a=t1.a ) > 0;
```


To avoid materializing several times for a given derived table, we can instead materialize-once -a derived table which adds a grouping on the join column from the table referenced in the inner query (t2.a) and then an outer join on the lifted predicate (t1.a = derived.a) in order to select the correct group to match up with the outer row. (If the subquery already has an explicit grouping, the extra grouping is added to the end of the grouping list.) The query previously shown can thus be rewritten like this:
```
SELECT t1.* FROM t1
    LEFT OUTER JOIN
        (SELECT a, COUNT(*) AS ct FROM t2 GROUP BY a) AS derived
    ON t1.a = derived.a
        AND
        REJECT_IF(
            (ct > 1),
            "ERROR 1242 (21000): Subquery returns more than 1 row"
            )
    WHERE derived.a > 0;
```


In the rewritten query, REJECT_IF( ) represents an internal function which tests a given condition (here, the comparison ct > 1) and raises a given error (in this case, ER_SUBQUERY_NO_1_ROW) if the condition is true. This reflects the cardinality check that the optimizer performs as part of evaluating the JOIN or WHERE clause, prior to evaluating any lifted predicate, which is done only if the subquery does not return more than one row.

This type of transformation can be performed, provided the following conditions are met:
- The subquery can be part of a SELECT list, WHERE condition, or HAVING condition, but cannot be part of a JOIN condition, and cannot contain a LIMIT or OFFSET clause. In addition, the subquery cannot contain any set operations such as UNION.
- The WHERE clause may contain one or more predicates, combined with AND. If the WHERE clause contains an OR clause, it cannot be transformed. At least one of the WHERE clause predicates must be eligible for transformation, and none of them may reject transformation.
- To be eligible for transformation, a WHERE clause predicate must be an equality predicate; other comparison predicates are not eligible for transformation. The predicate must employ the equality operator = for making the comparison; the null-safe <=> operator is not supported in this context.

In MySQL 8.4.0 and later, operands of the predicate can be column values, constants, or expressions including these, including deterministic functions called with column values as arguments.
- A WHERE clause predicate that contains only inner references is not eligible for transformation, since it can be evaluated before the grouping. A WHERE clause predicate that contains only outer references is eligible for transformation, even though it can be lifted up to the outer query block. This is made possible by adding a cardinality check without grouping in the derived table.
- To be eligible, a WHERE clause predicate must have one operand that contains only inner references and one operand that contains only outer references. If the predicate is not eligible due to this rule, transformation of the query is rejected.
- A correlated column can be present only in the subquery's WHERE clause (and not in the SELECT list, a JOIN or ORDER BY clause, a GROUP BY list, or a HAVING clause). Nor can there be any correlated column inside a derived table in the subquery's FROM list.
- A correlated column can not be contained in an aggregate function's list of arguments.
- A correlated column must be resolved in the query block directly containing the subquery being considered for transformation.
- A correlated column cannot be present in a nested scalar subquery in the WHERE clause.
- The subquery cannot contain any window functions, and must not contain any aggregate function which aggregates in a query block outer to the subquery. A COUNT( ) aggregate function, if contained in the SELECT list element of the subquery, must be at the topmost level, and cannot be part of an expression.

See also Section 15.2.15.8, "Derived Tables".

\subsection*{15.2.15.8 Derived Tables}

This section discusses general characteristics of derived tables. For information about lateral derived tables preceded by the LATERAL keyword, see Section 15.2.15.9, "Lateral Derived Tables".

A derived table is an expression that generates a table within the scope of a query FROM clause. For example, a subquery in a SELECT statement FROM clause is a derived table:

SELECT ... FROM (subquery) [AS] tbl_name ...
The JSON_TABLE( ) function generates a table and provides another way to create a derived table:
SELECT * FROM JSON_TABLE(arg_list) [AS] tbl_name ...
The [AS] tbl_name clause is mandatory because every table in a FROM clause must have a name. Any columns in the derived table must have unique names. Alternatively, tbl_name may be followed by a parenthesized list of names for the derived table columns:

SELECT ... FROM (subquery) [AS] tbl_name (col_list) ...
The number of column names must be the same as the number of table columns.
For the sake of illustration, assume that you have this table:
CREATE TABLE t1 (s1 INT, s2 CHAR(5), s3 FLOAT);
Here is how to use a subquery in the FROM clause, using the example table:
```
INSERT INTO t1 VALUES (1,'1',1.0);
INSERT INTO t1 VALUES (2,'2',2.0);
SELECT sb1,sb2,sb3
    FROM (SELECT s1 AS sb1, s2 AS sb2, s3*2 AS sb3 FROM t1) AS sb
    WHERE sb1 > 1;
```


Result:
```
+------+------+------+
| sb1 | sb2 | sb3 |
+------+------+------+
| 2 | 2 | 4 |
+------+------+------+
```


Here is another example: Suppose that you want to know the average of a set of sums for a grouped table. This does not work:
```
SELECT AVG(SUM(column1)) FROM t1 GROUP BY column1;
```


However, this query provides the desired information:
```
SELECT AVG(sum_column1)
    FROM (SELECT SUM(column1) AS sum_column1
        FROM t1 GROUP BY column1) AS t1;
```


Notice that the column name used within the subquery (sum_column1) is recognized in the outer query.

The column names for a derived table come from its select list:
```
mysql> SELECT * FROM (SELECT 1, 2, 3, 4) AS dt;
+---+---+---+---+
| 1 | 2 | 3 | 4 |
+---+---+---+---+
| 1 | 2 | 3 | 4 |
+---+---+---+---+
```


To provide column names explicitly, follow the derived table name with a parenthesized list of column names:
```
mysql> SELECT * FROM (SELECT 1, 2, 3, 4) AS dt (a, b, c, d);
+---+---+---+---+
| a | b | c | d |
+---+---+---+---+
| 1 | 2 | 3 | 4 |
+---+---+---+---+
```


A derived table can return a scalar, column, row, or table.
Derived tables are subject to these restrictions:
- A derived table cannot contain references to other tables of the same SELECT (use a LATERAL derived table for that; see Section 15.2.15.9, "Lateral Derived Tables").

The optimizer determines information about derived tables in such a way that EXPLAIN does not need to materialize them. See Section 10.2.2.4, "Optimizing Derived Tables, View References, and Common Table Expressions with Merging or Materialization".

It is possible under certain circumstances that using EXPLAIN SELECT modifies table data. This can occur if the outer query accesses any tables and an inner query invokes a stored function that changes one or more rows of a table. Suppose that there are two tables t1 and t2 in database d1, and a stored function f1 that modifies t2, created as shown here:
```
CREATE DATABASE d1;
USE d1;
CREATE TABLE t1 (c1 INT);
CREATE TABLE t2 (c1 INT);
CREATE FUNCTION f1(p1 INT) RETURNS INT
    BEGIN
        INSERT INTO t2 VALUES (p1);
        RETURN p1;
    END;
```


Referencing the function directly in an EXPLAIN SELECT has no effect on t2, as shown here:
```
mysql> SELECT * FROM t2;
Empty set (0.02 sec)
mysql> EXPLAIN SELECT f1(5)\G
*************************** 1. r ow ***************************************
                    id: 1
    select_type: SIMPLE
                table: NULL
        partitions: NULL
                    type: NULL
possible_keys: NULL
                            key: NULL
                key_len: NULL
                            ref: NULL
                        rows: NULL
            filtered: NULL
                    Extra: No tables used
1 row in set (0.01 sec)
mysql> SELECT * FROM t2;
Empty set (0.01 sec)
```


This is because the SELECT statement did not reference any tables, as can be seen in the table and Extra columns of the output. This is also true of the following nested SELECT:
```
mysql> EXPLAIN SELECT NOW() AS a1, (SELECT f1(5)) AS a2\G
************************** 1. rOW ******************************
                    id: 1
    select_type: PRIMARY
                table: NULL
                    type: NULL
possible_keys: NULL
                        key: NULL
            key_len: NULL
                        ref: NULL
                    rows: NULL
        filtered: NULL
                Extra: No tables used
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS;
+-------+-------+-------------------------------------------
| Level | Code | Message |
+-------+-------+--------------------------------------------
| Note | 1249 | Select 2 was reduced during optimization |
+-------+-------+-------------------------------------------
1 row in set (0.00 sec)
mysql> SELECT * FROM t2;
Empty set (0.00 sec)
```


However, if the outer SELECT references any tables, the optimizer executes the statement in the subquery as well, with the result that t 2 is modified:
```
mysql> EXPLAIN SELECT * FROM t1 AS a1, (SELECT f1(5)) AS a2\G
************************** 1. rOW ******************************
                    id: 1
    select_type: PRIMARY
                table: <derived2>
        partitions: NULL
                    type: system
possible_keys: NULL
                        key: NULL
            key_len: NULL
                        ref: NULL
                    rows: 1
            filtered: 100.00
                Extra: NULL
************************** 2. row *****************************************
                        id: 1
    select_type: PRIMARY
                table: a1
        partitions: NULL
                        type: ALL
possible_keys: NULL
                            key: NULL
                key_len: NULL
                            ref: NULL
                        rows: 1
            filtered: 100.00
                    Extra: NULL
************************** 3. row *****************************************
                            id: 2
    select_type: DERIVED
                    table: NULL
        partitions: NULL
                        type: NULL
possible_keys: NULL
                            key: NULL
                key_len: NULL
                            ref: NULL
                        rows: NULL
            filtered: NULL
                    Extra: No tables used
3 rows in set (0.00 sec)
mysql> SELECT * FROM t2;
+------+
| c1 |
+------+
| 5 |
+------+
1 row in set (0.00 sec)
```


The derived table optimization can also be employed with many correlated (scalar) subqueries. For more information and examples, see Section 15.2.15.7, "Correlated Subqueries".

\subsection*{15.2.15.9 Lateral Derived Tables}

A derived table cannot normally refer to (depend on) columns of preceding tables in the same FROM clause. A derived table may be defined as a lateral derived table to specify that such references are permitted.

Nonlateral derived tables are specified using the syntax discussed in Section 15.2.15.8, "Derived Tables". The syntax for a lateral derived table is the same as for a nonlateral derived table except that the keyword LATERAL is specified before the derived table specification. The LATERAL keyword must precede each table to be used as a lateral derived table.

Lateral derived tables are subject to these restrictions:
- A lateral derived table can occur only in a FROM clause, either in a list of tables separated with commas or in a join specification (JOIN, INNER JOIN, CROSS JOIN, LEFT [OUTER] JOIN, or RIGHT [OUTER] JOIN).
- If a lateral derived table is in the right operand of a join clause and contains a reference to the left operand, the join operation must be an INNER JOIN, CROSS JOIN, or LEFT [OUTER] JOIN.

If the table is in the left operand and contains a reference to the right operand, the join operation must be an INNER JOIN, CROSS JOIN, or RIGHT [OUTER] JOIN.
- If a lateral derived table references an aggregate function, the function's aggregation query cannot be the one that owns the FROM clause in which the lateral derived table occurs.
- In accordance with the SQL standard, MySQL always treats a join with a table function such as JSON_TABLE() as though LATERAL had been used. Since the LATERAL keyword is implicit, it is not allowed before JSON_TABLE( ); this is also according to the SQL standard.

The following discussion shows how lateral derived tables make possible certain SQL operations that cannot be done with nonlateral derived tables or that require less-efficient workarounds.

Suppose that we want to solve this problem: Given a table of people in a sales force (where each row describes a member of the sales force), and a table of all sales (where each row describes a sale: salesperson, customer, amount, date), determine the size and customer of the largest sale for each salesperson. This problem can be approached two ways.

First approach to solving the problem: For each salesperson, calculate the maximum sale size, and also find the customer who provided this maximum. In MySQL, that can be done like this:
```
SELECT
    salesperson.name,
    -- find maximum sale size for this salesperson
    (SELECT MAX(amount) AS amount
        FROM all_sales
        WHERE all_sales.salesperson_id = salesperson.id)
    AS amount,
    -- find customer for this maximum size
    (SELECT customer_name
        FROM all_sales
        WHERE all_sales.salesperson_id = salesperson.id
        AND all_sales.amount =
            -- find maximum size, again
            (SELECT MAX(amount) AS amount
                FROM all_sales
                WHERE all_sales.salesperson_id = salesperson.id))
    AS customer_name
FROM
    salesperson;
```


That query is inefficient because it calculates the maximum size twice per salesperson (once in the first subquery and once in the second).

We can try to achieve an efficiency gain by calculating the maximum once per salesperson and "caching" it in a derived table, as shown by this modified query:
```
SELECT
    salesperson.name,
    max_sale.amount,
    max_sale_customer.customer_name
FROM
    salesperson,
    -- calculate maximum size, cache it in transient derived table max_sale
    (SELECT MAX(amount) AS amount
        FROM all_sales
        WHERE all_sales.salesperson_id = salesperson.id)
    AS max_sale,
    -- find customer, reusing cached maximum size
    (SELECT customer_name
        FROM all_sales
        WHERE all_sales.salesperson_id = salesperson.id
        AND all_sales.amount =
            -- the cached maximum size
```

```
    max_sale.amount)
AS max_sale_customer;
```


However, the query is illegal in SQL-92 because derived tables cannot depend on other tables in the same FROM clause. Derived tables must be constant over the query's duration, not contain references to columns of other FROM clause tables. As written, the query produces this error:

ERROR 1054 (42S22): Unknown column 'salesperson.id' in 'where clause'
In SQL:1999, the query becomes legal if the derived tables are preceded by the LATERAL keyword (which means "this derived table depends on previous tables on its left side"):
```
SELECT
    salesperson.name,
    max_sale.amount,
    max_sale_customer.customer_name
FROM
    salesperson,
    -- calculate maximum size, cache it in transient derived table max_sale
    LATERAL
    (SELECT MAX(amount) AS amount
        FROM all_sales
        WHERE all_sales.salesperson_id = salesperson.id)
    AS max_sale,
    -- find customer, reusing cached maximum size
    LATERAL
    (SELECT customer_name
        FROM all_sales
        WHERE all_sales.salesperson_id = salesperson.id
        AND all_sales.amount =
            -- the cached maximum size
            max_sale.amount)
    AS max_sale_customer;
```


A lateral derived table need not be constant and is brought up to date each time a new row from a preceding table on which it depends is processed by the top query.

Second approach to solving the problem: A different solution could be used if a subquery in the SELECT list could return multiple columns:
```
SELECT
    salesperson.name,
    -- find maximum size and customer at same time
    (SELECT amount, customer_name
        FROM all_sales
        WHERE all_sales.salesperson_id = salesperson.id
        ORDER BY amount DESC LIMIT 1)
FROM
    salesperson;
```


That is efficient but illegal. It does not work because such subqueries can return only a single column:
```
ERROR 1241 (21000): Operand should contain 1 column(s)
```


One attempt at rewriting the query is to select multiple columns from a derived table:
```
SELECT
    salesperson.name,
    max_sale.amount,
    max_sale.customer_name
FROM
    salesperson,
    -- find maximum size and customer at same time
    (SELECT amount, customer_name
        FROM all_sales
        WHERE all_sales.salesperson_id = salesperson.id
        ORDER BY amount DESC LIMIT 1)
    AS max_sale;
```


However, that also does not work. The derived table is dependent on the salesperson table and thus fails without LATERAL:

ERROR 1054 (42S22): Unknown column 'salesperson.id' in 'where clause'
Adding the LATERAL keyword makes the query legal:
```
SELECT
    salesperson.name,
    max_sale.amount,
    max_sale.customer_name
FROM
    salesperson,
    -- find maximum size and customer at same time
    LATERAL
    (SELECT amount, customer_name
        FROM all_sales
        WHERE all_sales.salesperson_id = salesperson.id
        ORDER BY amount DESC LIMIT 1)
    AS max_sale;
```


In short, LATERAL is the efficient solution to all drawbacks in the two approaches just discussed.

\subsection*{15.2.15.10 Subquery Errors}

There are some errors that apply only to subqueries. This section describes them.
- Unsupported subquery syntax:
```
ERROR 1235 (ER_NOT_SUPPORTED_YET)
SQLSTATE = 42000
Message = "This version of MySQL doesn't yet support
'LIMIT & IN/ALL/ANY/SOME subquery'"
```


This means that MySQL does not support statements like the following:
```
SELECT * FROM t1 WHERE s1 IN (SELECT s2 FROM t2 ORDER BY s1 LIMIT 1)
```

- Incorrect number of columns from subquery:
```
ERROR 1241 (ER_OPERAND_COL)
SQLSTATE = 21000
Message = "Operand should contain 1 column(s)"
```


This error occurs in cases like this:
```
SELECT (SELECT column1, column2 FROM t2) FROM t1;
```


You may use a subquery that returns multiple columns, if the purpose is row comparison. In other contexts, the subquery must be a scalar operand. See Section 15.2.15.5, "Row Subqueries".
- Incorrect number of rows from subquery:
```
ERROR 1242 (ER_SUBSELECT_NO_1_ROW)
SQLSTATE = 21000
Message = "Subquery returns more than 1 row"
```


This error occurs for statements where the subquery must return at most one row but returns multiple rows. Consider the following example:
```
SELECT * FROM t1 WHERE column1 = (SELECT column1 FROM t2);
```


If SELECT column1 FROM t2 returns just one row, the previous query works. If the subquery returns more than one row, error 1242 occurs. In that case, the query should be rewritten as:
```
SELECT * FROM t1 WHERE column1 = ANY (SELECT column1 FROM t2);
```

- Incorrectly used table in subquery:
```
Error 1093 (ER_UPDATE_TABLE_USED)
SQLSTATE = HY000
Message = "You can't specify target table 'x'
for update in FROM clause"
```


This error occurs in cases such as the following, which attempts to modify a table and select from the same table in the subquery:
```
UPDATE t1 SET column2 = (SELECT MAX(column1) FROM t1);
```


You can use a common table expression or derived table to work around this. See Section 15.2.15.12, "Restrictions on Subqueries".

All of the errors described in this section also apply when using TABLE in subqueries.
For transactional storage engines, the failure of a subquery causes the entire statement to fail. For nontransactional storage engines, data modifications made before the error was encountered are preserved.

\subsection*{15.2.15.11 Optimizing Subqueries}

Development is ongoing, so no optimization tip is reliable for the long term. The following list provides some interesting tricks that you might want to play with. See also Section 10.2.2, "Optimizing Subqueries, Derived Tables, View References, and Common Table Expressions".
- Move clauses from outside to inside the subquery. For example, use this query:
```
SELECT * FROM t1
    WHERE s1 IN (SELECT s1 FROM t1 UNION ALL SELECT s1 FROM t2);
```


Instead of this query:
```
SELECT * FROM t1
    WHERE s1 IN (SELECT s1 FROM t1) OR s1 IN (SELECT s1 FROM t2);
```


For another example, use this query:
```
SELECT (SELECT column1 + 5 FROM t1) FROM t2;
```


Instead of this query:
```
SELECT (SELECT column1 FROM t1) + 5 FROM t2;
```


\subsection*{15.2.15.12 Restrictions on Subqueries}
- In general, you cannot modify a table and select from the same table in a subquery. For example, this limitation applies to statements of the following forms:
```
DELETE FROM t WHERE ... (SELECT ... FROM t ...);
UPDATE t ... WHERE col = (SELECT ... FROM t ...);
{INSERT|REPLACE} INTO t (SELECT ... FROM t ...);
```


Exception: The preceding prohibition does not apply if for the modified table you are using a derived table and that derived table is materialized rather than merged into the outer query. (See Section 10.2.2.4, "Optimizing Derived Tables, View References, and Common Table Expressions with Merging or Materialization".) Example:
```
UPDATE t ... WHERE col = (SELECT * FROM (SELECT ... FROM t...) AS dt ...);
```


Here the result from the derived table is materialized as a temporary table, so the relevant rows in $t$ have already been selected by the time the update to $t$ takes place.

In general, you may be able to influence the optimizer to materialize a derived table by adding a NO_MERGE optimizer hint. See Section 10.9.3, "Optimizer Hints".
- Row comparison operations are only partially supported:
- For expr [NOT] IN subquery, expr can be an $n$-tuple (specified using row constructor syntax) and the subquery can return rows of $n$-tuples. The permitted syntax is therefore more specifically expressed as row_constructor [NOT] IN table_subquery
- For expr op \{ALL|ANY|SOME\} subquery, expr must be a scalar value and the subquery must be a column subquery; it cannot return multiple-column rows.

In other words, for a subquery that returns rows of $n$-tuples, this is supported:
```
(expr_1, ..., expr_n) [NOT] IN table_subquery
```


But this is not supported:
```
(expr_1, ..., expr_n) op {ALL|ANY|SOME} subquery
```


The reason for supporting row comparisons for IN but not for the others is that IN is implemented by rewriting it as a sequence of = comparisons and AND operations. This approach cannot be used for ALL, ANY, or SOME.
- MySQL does not support LIMIT in subqueries for certain subquery operators:
```
mysql> SELECT * FROM t1
    WHERE s1 IN (SELECT s2 FROM t2 ORDER BY s1 LIMIT 1);
ERROR 1235 (42000): This version of MySQL doesn't yet support
    'LIMIT & IN/ALL/ANY/SOME subquery'
```


See Section 15.2.15.10, "Subquery Errors".
- MySQL permits a subquery to refer to a stored function that has data-modifying side effects such as inserting rows into a table. For example, if $f()$ inserts rows, the following query can modify data:
```
SELECT ... WHERE x IN (SELECT f() ...);
```


This behavior is an extension to the SQL standard. In MySQL, it can produce nondeterministic results because $f()$ might be executed a different number of times for different executions of a given query depending on how the optimizer chooses to handle it.

For statement-based or mixed-format replication, one implication of this indeterminism is that such a query can produce different results on the source and its replicas.

\subsection*{15.2.16 TABLE Statement}

TABLE is a DML statement which returns rows and columns of the named table.
```
TABLE table_name
    [ORDER BY column_name]
    [LIMIT number [OFFSET number]]
    [INTO OUTFILE 'file_name'
        [{FIELDS | COLUMNS}
            [TERMINATED BY 'string']
            [[OPTIONALLY] ENCLOSED BY 'char']
            [ESCAPED BY 'char']
        ]
        [LINES
            [STARTING BY 'string']
            [TERMINATED BY 'string']
        ]
    | INTO DUMPFILE 'file_name'
    | INTO var_name [, var_name] ...]
```


The TABLE statement in some ways acts like SELECT. Given the existence of a table named t , the following two statements produce identical output:

\section*{TABLE t;}
```
SELECT * FROM t;
```


You can order and limit the number of rows produced by TABLE using ORDER BY and LIMIT clauses, respectively. These function identically to the same clauses when used with SELECT (including an optional OFFSET clause with LIMIT), as you can see here:
```
mysql> TABLE t;
+----+----+
| a | b |
+----+----+
| 1 | 2 |
| 6 | 7 |
| 9 | 5 |
| 10 | -4 |
| 11 | -1 |
| 13 | 3 |
| 14 | 6 |
+----+----+
rows in set (0.00 sec)
mysql> TABLE t ORDER BY b;
+----+----+
| a | b |
+----+----+
| 10 | -4 |
| 11 | -1 |
| 1 | 2 |
| 13 | 3 |
| 9 | 5 |
| 14 | 6 |
| 6 | 7 |
+----+----+
7rows in set (0.00 sec)
mysql> TABLE t LIMIT 3;
+---+---+
| a | b |
+---+---+
| 1 | 2 |
| 6 |7 |
| 9 | 5 |
+---+---+
3 rows in set (0.00 sec)
mysql> TABLE t ORDER BY b LIMIT 3;
+----+----+
| a | b |
+----+----+
| 10 | -4 |
| 11 | -1 |
| 1 | 2 |
+----+----+
3 rows in set (0.00 sec)
mysql> TABLE t ORDER BY b LIMIT 3 OFFSET 2;
+----+----+
| a | b |
+----+----+
| 1 | 2 |
| 13 | 3 |
| 9 | 5 |
+----+----+
3 rows in set (0.00 sec)
```


TABLE differs from SELECT in two key respects:
- TABLE always displays all columns of the table.

Exception: The output of TABLE does not include invisible columns. See Section 15.1.20.10, "Invisible Columns".
- TABLE does not allow for any arbitrary filtering of rows; that is, TABLE does not support any WHERE clause.

For limiting which table columns are returned, filtering rows beyond what can be accomplished using ORDER BY and LIMIT, or both, use SELECT.

TABLE can be used with temporary tables.
TABLE can also be used in place of SELECT in a number of other constructs, including those listed here:
- With set operators such as UNION, as shown here:
```
mysql> TABLE t1;
+---+----+
| a | b |
+---+----+
| 2 | 10 |
| 5 | 3 |
|7 | 8 |
+---+----+
3 rows in set (0.00 sec)
mysql> TABLE t2;
+---+---+
| a | b |
+---+---+
| 1 | 2 |
| 3 | 4 |
|6 |7 |
+---+---+
3 rows in set (0.00 sec)
mysql> TABLE t1 UNION TABLE t2;
+---+----+
| a | b |
+---+----+
| 2 | 10 |
| 5 | 3 |
| 7 | 8 |
| 1 | 2 |
| 3 | 4 |
| 6 | 7 |
+---+----+
6 rows in set (0.00 sec)
```


The UNION just shown is equivalent to the following statement:
```
mysql> SELECT * FROM t1 UNION SELECT * FROM t2;
+---+----+
| a | b |
+---+----+
| 2 | 10 |
|5 | 3 |
| 7 | 8 |
| 1 | 2 |
| 3 | 4 |
| 6 | 7 |
+---+----+
6 rows in set (0.00 sec)
```


TABLE can also be used together in set operations with SELECT statements, VALUES statements, or both. See Section 15.2.18, "UNION Clause", Section 15.2.4, "EXCEPT Clause", and Section 15.2.8, "INTERSECT Clause", for more information and examples. See also Section 15.2.14, "Set Operations with UNION, INTERSECT, and EXCEPT".
- With INTO to populate user variables, and with INTO OUTFILE or INTO DUMPFILE to write table data to a file. See Section 15.2.13.1, "SELECT ... INTO Statement", for more specific information and examples.
- In many cases where you can employ subqueries. Given any table t1 with a column named a, and a second table t2 having a single column, statements such as the following are possible:
```
SELECT * FROM t1 WHERE a IN (TABLE t2);
```


Assuming that the single column of table t1 is named x , the preceding is equivalent to each of the statements shown here (and produces exactly the same result in either case):
```
SELECT * FROM t1 WHERE a IN (SELECT x FROM t2);
SELECT * FROM t1 WHERE a IN (SELECT * FROM t2);
```


See Section 15.2.15, "Subqueries", for more information.
- With INSERT and REPLACE statements, where you would otherwise use SELECT *. See Section 15.2.7.1, "INSERT ... SELECT Statement", for more information and examples.
- TABLE can also be used in many cases in place of the SELECT in CREATE TABLE . . . SELECT or CREATE VIEW . . . SELECT. See the descriptions of these statements for more information and examples.

\subsection*{15.2.17 UPDATE Statement}

UPDATE is a DML statement that modifies rows in a table.
An UPDATE statement can start with a WITH clause to define common table expressions accessible within the UPDATE. See Section 15.2.20, "WITH (Common Table Expressions)".

Single-table syntax:
```
UPDATE [LOW_PRIORITY] [IGNORE] table_reference
    SET assignment_list
    [WHERE where_condition]
    [ORDER BY ...]
    [LIMIT row_count]
value:
    {expr | DEFAULT}
assignment:
    col_name = value
assignment_list:
    assignment [, assignment] ...
```


Multiple-table syntax:
```
UPDATE [LOW_PRIORITY] [IGNORE] table_references
    SET assignment_list
    [WHERE where_condition]
```


For the single-table syntax, the UPDATE statement updates columns of existing rows in the named table with new values. The SET clause indicates which columns to modify and the values they should be given. Each value can be given as an expression, or the keyword DEFAULT to set a column explicitly to its default value. The WHERE clause, if given, specifies the conditions that identify which rows to update. With no WHERE clause, all rows are updated. If the ORDER BY clause is specified, the rows are updated in the order that is specified. The LIMIT clause places a limit on the number of rows that can be updated.

For the multiple-table syntax, UPDATE updates rows in each table named in table_references that satisfy the conditions. Each matching row is updated once, even if it matches the conditions multiple times. For multiple-table syntax, ORDER BY and LIMIT cannot be used.

For partitioned tables, both the single-single and multiple-table forms of this statement support the use of a PARTITION clause as part of a table reference. This option takes a list of one or more partitions
or subpartitions (or both). Only the partitions (or subpartitions) listed are checked for matches, and a row that is not in any of these partitions or subpartitions is not updated, whether it satisfies the where_condition or not.

\section*{Note}

Unlike the case when using PARTITION with an INSERT or REPLACE statement, an otherwise valid UPDATE ... PARTITION statement is considered successful even if no rows in the listed partitions (or subpartitions) match the where_condition.

For more information and examples, see Section 26.5, "Partition Selection".
where_condition is an expression that evaluates to true for each row to be updated. For expression syntax, see Section 11.5, "Expressions".
table_references and where_condition are specified as described in Section 15.2.13, "SELECT Statement".

You need the UPDATE privilege only for columns referenced in an UPDATE that are actually updated. You need only the SELECT privilege for any columns that are read but not modified.

The UPDATE statement supports the following modifiers:
- With the LOW_PRIORITY modifier, execution of the UPDATE is delayed until no other clients are reading from the table. This affects only storage engines that use only table-level locking (such as MyISAM, MEMORY, and MERGE).
- With the IGNORE modifier, the update statement does not abort even if errors occur during the update. Rows for which duplicate-key conflicts occur on a unique key value are not updated. Rows updated to values that would cause data conversion errors are updated to the closest valid values instead. For more information, see The Effect of IGNORE on Statement Execution.

UPDATE IGNORE statements, including those having an ORDER BY clause, are flagged as unsafe for statement-based replication. (This is because the order in which the rows are updated determines which rows are ignored.) Such statements produce a warning in the error log when using statementbased mode and are written to the binary log using the row-based format when using MIXED mode. (Bug \#11758262, Bug \#50439) See Section 19.2.1.3, "Determination of Safe and Unsafe Statements in Binary Logging", for more information.

If you access a column from the table to be updated in an expression, UPDATE uses the current value of the column. For example, the following statement sets col1 to one more than its current value:

UPDATE t1 SET col1 = col1 + 1;
The second assignment in the following statement sets col2 to the current (updated) col1 value, not the original col1 value. The result is that col1 and col2 have the same value. This behavior differs from standard SQL.

UPDATE t1 SET col1 = col1 + 1, col2 = col1;
Single-table UPDATE assignments are generally evaluated from left to right. For multiple-table updates, there is no guarantee that assignments are carried out in any particular order.

If you set a column to the value it currently has, MySQL notices this and does not update it.
If you update a column that has been declared NOT NULL by setting to NULL, an error occurs if strict SQL mode is enabled; otherwise, the column is set to the implicit default value for the column data type and the warning count is incremented. The implicit default value is 0 for numeric types, the empty string ( ' ' ) for string types, and the "zero" value for date and time types. See Section 13.6, "Data Type Default Values".

If a generated column is updated explicitly, the only permitted value is DEFAULT. For information about generated columns, see Section 15.1.20.8, "CREATE TABLE and Generated Columns".

UPDATE returns the number of rows that were actually changed. The mysql_info() C API function returns the number of rows that were matched and updated and the number of warnings that occurred during the UPDATE.

You can use LIMIT row_count to restrict the scope of the UPDATE. A LIMIT clause is a rowsmatched restriction. The statement stops as soon as it has found row_count rows that satisfy the WHERE clause, whether or not they actually were changed.

If an UPDATE statement includes an ORDER BY clause, the rows are updated in the order specified by the clause. This can be useful in certain situations that might otherwise result in an error. Suppose that a table $t$ contains a column id that has a unique index. The following statement could fail with a duplicate-key error, depending on the order in which rows are updated:

UPDATE t SET id = id + 1;
For example, if the table contains 1 and 2 in the id column and 1 is updated to 2 before 2 is updated to 3 , an error occurs. To avoid this problem, add an ORDER BY clause to cause the rows with larger id values to be updated before those with smaller values:

UPDATE t SET id = id + 1 ORDER BY id DESC;
You can also perform UPDATE operations covering multiple tables. However, you cannot use ORDER BY or LIMIT with a multiple-table UPDATE. The table_references clause lists the tables involved in the join. Its syntax is described in Section 15.2.13.2, "JOIN Clause". Here is an example:

UPDATE items,month SET items.price=month.price
WHERE items.id=month.id;
The preceding example shows an inner join that uses the comma operator, but multiple-table UPDATE statements can use any type of join permitted in SELECT statements, such as LEFT JOIN.

If you use a multiple-table UPDATE statement involving InnoDB tables for which there are foreign key constraints, the MySQL optimizer might process tables in an order that differs from that of their parent/ child relationship. In this case, the statement fails and rolls back. Instead, update a single table and rely on the ON UPDATE capabilities that InnoDB provides to cause the other tables to be modified accordingly. See Section 15.1.20.5, "FOREIGN KEY Constraints".

You cannot update a table and select directly from the same table in a subquery. You can work around this by using a multi-table update in which one of the tables is derived from the table that you actually wish to update, and referring to the derived table using an alias. Suppose you wish to update a table named items which is defined using the statement shown here:
```
CREATE TABLE items (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    wholesale DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    retail DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    quantity BIGINT NOT NULL DEFAULT 0
);
```


To reduce the retail price of any items for which the markup is $30 \%$ or greater and of which you have fewer than one hundred in stock, you might try to use an UPDATE statement such as the one following, which uses a subquery in the WHERE clause. As shown here, this statement does not work:
```
mysql> UPDATE items
    > SET retail = retail * 0.9
    > WHERE id IN
    > (SELECT id FROM items
    > WHERE retail / wholesale >= 1.3 AND quantity > 100);
ERROR 1093 (HY000): You can't specify target table 'items' for update in FROM clause
```


Instead, you can employ a multi-table update in which the subquery is moved into the list of tables to be updated, using an alias to reference it in the outermost WHERE clause, like this:
```
UPDATE items,
    (SELECT id FROM items
    WHERE id IN
        (SELECT id FROM items
        WHERE retail / wholesale >= 1.3 AND quantity < 100))
    AS discounted
SET items.retail = items.retail * 0.9
WHERE items.id = discounted.id;
```


Because the optimizer tries by default to merge the derived table discounted into the outermost query block, this works only if you force materialization of the derived table. You can do this by setting the derived_merge flag of the optimizer_switch system variable to off before running the update, or by using the NO_MERGE optimizer hint, as shown here:
```
UPDATE /*+ NO_MERGE(discounted) */ items,
        (SELECT id FROM items
            WHERE retail / wholesale >= 1.3 AND quantity < 100)
            AS discounted
    SET items.retail = items.retail * 0.9
    WHERE items.id = discounted.id;
```


The advantage of using the optimizer hint in such a case is that it applies only within the query block where it is used, so that it is not necessary to change the value of optimizer_switch again after executing the UPDATE.

Another possibility is to rewrite the subquery so that it does not use IN or EXISTS, like this:
```
UPDATE items,
        (SELECT id, retail / wholesale AS markup, quantity FROM items)
        AS discounted
    SET items.retail = items.retail * 0.9
    WHERE discounted.markup >= 1.3
    AND discounted.quantity < 100
    AND items.id = discounted.id;
```


In this case, the subquery is materialized by default rather than merged, so it is not necessary to disable merging of the derived table.

\subsection*{15.2.18 UNION Clause}
```
query_expression_body UNION [ALL | DISTINCT] query_block
    [UNION [ALL | DISTINCT] query_expression_body]
    [...]
query_expression_body:
    See Section 15.2.14, "Set Operations with UNION, INTERSECT, and EXCEPT"
```


UNION combines the result from multiple query blocks into a single result set. This example uses SELECT statements:
```
mysql> SELECT 1, 2;
+---+---+
| 1 | 2 |
+---+---+
| 1 | 2 |
+---+---+
mysql> SELECT 'a', 'b';
+---+---+
| a | b |
+---+---+
| a | b |
+---+---+
mysql> SELECT 1, 2 UNION SELECT 'a', 'b';
+---+---+
| 1 | 2 |
```

```
+---+---+
| 1 | 2 |
| a | b |
+---+---+
```


\subsection*{15.2.19 VALUES Statement}

VALUES is a DML statement which returns a set of one or more rows as a table. In other words, it is a table value constructor which also functions as a standalone SQL statement.
```
VALUES row_constructor_list [ORDER BY column_designator] [LIMIT number]
row_constructor_list:
    ROW(value_list)[, ROW(value_list)][, ...]
value_list:
    value[, value][, ...]
column_designator:
    column_index
```


The VALUES statement consists of the VALUES keyword followed by a list of one or more row constructors, separated by commas. A row constructor consists of the ROW ( ) row constructor clause with a value list of one or more scalar values enclosed in the parentheses. A value can be a literal of any MySQL data type or an expression that resolves to a scalar value.

ROW ( ) cannot be empty (but each of the supplied scalar values can be NULL). Each ROW ( ) in the same VALUES statement must have the same number of values in its value list.

The DEFAULT keyword is not supported by VALUES and causes a syntax error, except when it is used to supply values in an INSERT statement.

The output of VALUES is a table:
```
mysql> VALUES ROW(1,-2,3), ROW(5,7,9), ROW(4,6,8);
+----------+----------+----------+
| column_0 | column_1 | column_2 |
+----------+----------+----------+
| 1 -2 | 3 |
| 5 | 7 | 9 |
| 4 6 | 8 |
+----------+----------+----------+
3 rows in set (0.00 sec)
```


The columns of the table output from VALUES have the implicitly named columns column_0, column_1, column_2, and so on, always beginning with 0 . This fact can be used to order the rows by column using an optional ORDER BY clause in the same way that this clause works with a SELECT statement, as shown here:
```
mysql> VALUES ROW(1,-2,3), ROW(5,7,9), ROW(4,6,8) ORDER BY column_1;
+----------+----------+----------+
| column_0 | column_1 | column_2 |
+----------+-----------+----------+
| 1 | 3 |
| 6 | 8 |
| 5 | 7 | 9 |
+-----------+----------+----------+
3 rows in set (0.00 sec)
```


VALUES statement also supports a LIMIT clause for limiting the number of rows in the output.
The VALUES statement is permissive regarding data types of column values; you can mix types within the same column, as shown here:
```
mysql> VALUES ROW("q", 42, '2019-12-18'),
    -> ROW(23, "abc", 98.6),
    -> ROW(27.0002, "Mary Smith", '{"a": 10, "b": 25}');
+-----------+-------------+--------------------
```

```
| column_0 | column_1 | column_2 |
| q | 42 | 2019-12-18
|23 | abc | 98.6 |
| 27.0002 | Mary Smith | {"a": 10, "b": 25} |
+-----------+-------------+---------------------+
3 rows in set (0.00 sec)
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2714.jpg?height=117&width=113&top_left_y=516&top_left_x=296)

\section*{Important}

VALUES with one or more instances of ROW ( ) acts as a table value constructor; although it can be used to supply values in an INSERT or REPLACE statement, do not confuse it with the VALUES keyword that is also used for this purpose. You should also not confuse it with the VALUES( ) function that refers to column values in INSERT ... ON DUPLICATE KEY UPDATE.

You should also bear in mind that ROW ( ) is a row value constructor (see Section 15.2.15.5, "Row Subqueries"), whereas VALUES ROW ( ) is a table value constructor; the two cannot be used interchangeably.

VALUES can be used in many cases where you could employ SELECT, including those listed here:
- With UNION, as shown here:
```
mysql> SELECT 1,2 UNION SELECT 10,15;
+----+----+
| 1 | 2 |
+----+----+
| 1 | 2 |
| 10 | 15 |
+----+----+
2 rows in set (0.00 sec)
mysql> VALUES ROW(1,2) UNION VALUES ROW(10,15);
+----------+-----------+
| column_0 | column_1 |
+-----------+----------+
| 10 | 15 |
+----------+----------+
2 rows in set (0.00 sec)
```


You can union together constructed tables having more than one row, like this:
```
mysql> VALUES ROW(1,2), ROW(3,4), ROW(5,6)
    > UNION VALUES ROW(10,15),ROW(20,25);
+-----------+----------+
| column_0 | column_1 |
+-----------+----------+
| 3 |
| 5 | 6 |
| 10 | 25 |
+-----------+----------+
 rows in set (0.00 sec)
```


You can also (and it is usually preferable to) omit UNION altogether in such cases and use a single VALUES statement, like this:
```
mysql> VALUES ROW(1,2), ROW(3,4), ROW(5,6), ROW(10,15), ROW(20,25);
+-----------+----------+
| column_0 | column_1 |
+-----------+-----------+
| 1 | 2
| 3 | 4 |
| 5 | 6 |
| 20 | 25 |
```

```
+------------+-----------+
```


VALUES can also be used in unions with SELECT statements, TABLE statements, or both.
The constructed tables in the UNION must contain the same number of columns, just as if you were using SELECT. See Section 15.2.18, "UNION Clause", for further examples.

You can use EXCEPT and INTERSECT with VALUES in much the same way as UNION, as shown here:
```
mysql> VALUES ROW(1,2), ROW(3,4), ROW(5,6)
    -> INTERSECT
    -> VALUES ROW(10,15), ROW(20,25), ROW(3,4);
+-----------+----------+
| column_0 | column_1 |
+----------+----------+
| 3 | 4 |
+----------+----------+
1 row in set (0.00 sec)
mysql> VALUES ROW(1,2), ROW(3,4), ROW(5,6)
    -> EXCEPT
    -> VALUES ROW(10,15), ROW(20,25), ROW(3,4);
+----------+----------+
| column_0 | column_1 |
+-----------+----------+
| 5 1 6 |
+----------+----------+
2 rows in set (0.00 sec)
```


See Section 15.2.4, "EXCEPT Clause", and Section 15.2.8, "INTERSECT Clause", for more information.
- In joins. See Section 15.2.13.2, "JOIN Clause", for more information and examples.
- In place of VALUES( ) in an INSERT or REPLACE statement, in which case its semantics differ slightly from what is described here. See Section 15.2.7, "INSERT Statement", for details.
- In place of the source table in CREATE TABLE ... SELECT and CREATE VIEW ... SELECT. See the descriptions of these statements for more information and examples.

\subsection*{15.2.20 WITH (Common Table Expressions)}

A common table expression (CTE) is a named temporary result set that exists within the scope of a single statement and that can be referred to later within that statement, possibly multiple times. The following discussion describes how to write statements that use CTEs.
- Common Table Expressions
- Recursive Common Table Expressions
- Limiting Common Table Expression Recursion
- Recursive Common Table Expression Examples
- Common Table Expressions Compared to Similar Constructs

For information about CTE optimization, see Section 10.2.2.4, "Optimizing Derived Tables, View References, and Common Table Expressions with Merging or Materialization".

\section*{Common Table Expressions}

To specify common table expressions, use a WITH clause that has one or more comma-separated subclauses. Each subclause provides a subquery that produces a result set, and associates a name
with the subquery. The following example defines CTEs named cte1 and cte2 in the WITH clause, and refers to them in the top-level SELECT that follows the WITH clause:
```
WITH
    cte1 AS (SELECT a, b FROM table1),
    cte2 AS (SELECT c, d FROM table2)
SELECT b, d FROM cte1 JOIN cte2
WHERE cte1.a = cte2.c;
```


In the statement containing the WITH clause, each CTE name can be referenced to access the corresponding CTE result set.

A CTE name can be referenced in other CTEs, enabling CTEs to be defined based on other CTEs.
A CTE can refer to itself to define a recursive CTE. Common applications of recursive CTEs include series generation and traversal of hierarchical or tree-structured data.

Common table expressions are an optional part of the syntax for DML statements. They are defined using a WITH clause:
```
with_clause:
    WITH [RECURSIVE]
        cte_name [(col_name [, col_name] ...)] AS (subquery)
        [, cte_name [(col_name [, col_name] ...)] AS (subquery)] ...
```

cte_name names a single common table expression and can be used as a table reference in the statement containing the WITH clause.

The subquery part of AS (subquery) is called the "subquery of the CTE" and is what produces the CTE result set. The parentheses following AS are required.

A common table expression is recursive if its subquery refers to its own name. The RECURSIVE keyword must be included if any CTE in the WITH clause is recursive. For more information, see Recursive Common Table Expressions.

Determination of column names for a given CTE occurs as follows:
- If a parenthesized list of names follows the CTE name, those names are the column names:
```
WITH cte (col1, col2) AS
l
    SELECT 1, 2
    UNION ALL
    SELECT 3, 4
)
SELECT col1, col2 FROM cte;
```


The number of names in the list must be the same as the number of columns in the result set.
- Otherwise, the column names come from the select list of the first SELECT within the AS (subquery) part:
```
WITH cte AS
(
    SELECT 1 AS col1, 2 AS col2
    UNION ALL
    SELECT 3, 4
)
SELECT col1, col2 FROM cte;
```


A WITH clause is permitted in these contexts:
- At the beginning of SELECT, UPDATE, and DELETE statements.
```
WITH ... SELECT ...
WITH ... UPDATE ...
```

```
WITH ... DELETE ...
```

- At the beginning of subqueries (including derived table subqueries):
```
SELECT ... WHERE id IN (WITH ... SELECT ...) ...
SELECT * FROM (WITH ... SELECT ...) AS dt ...
```

- Immediately preceding SELECT for statements that include a SELECT statement:
```
INSERT ... WITH ... SELECT ...
REPLACE ... WITH ... SELECT ...
CREATE TABLE ... WITH ... SELECT ...
CREATE VIEW ... WITH ... SELECT ...
DECLARE CURSOR ... WITH ... SELECT ...
EXPLAIN ... WITH ... SELECT ...
```


Only one WITH clause is permitted at the same level. WITH followed by WITH at the same level is not permitted, so this is illegal:
```
WITH cte1 AS (...) WITH cte2 AS (...) SELECT ...
```


To make the statement legal, use a single WITH clause that separates the subclauses by a comma:
```
WITH cte1 AS (...), cte2 AS (...) SELECT ...
```


However, a statement can contain multiple WITH clauses if they occur at different levels:
```
WITH cte1 AS (SELECT 1)
SELECT * FROM (WITH cte2 AS (SELECT 2) SELECT * FROM cte2 JOIN cte1) AS dt;
```


A WITH clause can define one or more common table expressions, but each CTE name must be unique to the clause. This is illegal:
```
WITH cte1 AS (...), cte1 AS (...) SELECT ...
```


To make the statement legal, define the CTEs with unique names:
```
WITH cte1 AS (...), cte2 AS (...) SELECT ...
```


A CTE can refer to itself or to other CTEs:
- A self-referencing CTE is recursive.
- A CTE can refer to CTEs defined earlier in the same WITH clause, but not those defined later.

This constraint rules out mutually-recursive CTEs, where cte1 references cte2 and cte2 references cte1. One of those references must be to a CTE defined later, which is not permitted.
- A CTE in a given query block can refer to CTEs defined in query blocks at a more outer level, but not CTEs defined in query blocks at a more inner level.

For resolving references to objects with the same names, derived tables hide CTEs; and CTEs hide base tables, TEMPORARY tables, and views. Name resolution occurs by searching for objects in the same query block, then proceeding to outer blocks in turn while no object with the name is found.

For additional syntax considerations specific to recursive CTEs, see Recursive Common Table Expressions.

\section*{Recursive Common Table Expressions}

A recursive common table expression is one having a subquery that refers to its own name. For example:
```
WITH RECURSIVE cte (n) AS
(
    SELECT 1
```

```
    UNION ALL
    SELECT n + 1 FROM cte WHERE n < 5
)
SELECT * FROM cte;
```


When executed, the statement produces this result, a single column containing a simple linear sequence:
```
+------+
| n
+------+
| 1 |
| 2 |
| 3 |
| 4 |
| 5 |
+------+
```


A recursive CTE has this structure:
- The WITH clause must begin with WITH RECURSIVE if any CTE in the WITH clause refers to itself. (If no CTE refers to itself, RECURSIVE is permitted but not required.)

If you forget RECURSIVE for a recursive CTE, this error is a likely result:
```
ERROR 1146 (42S02): Table 'cte_name' doesn't exist
```

- The recursive CTE subquery has two parts, separated by UNION ALL or UNION [DISTINCT]:
```
SELECT ... -- return initial row set
UNION ALL
SELECT ... -- return additional row sets
```


The first SELECT produces the initial row or rows for the CTE and does not refer to the CTE name. The second SELECT produces additional rows and recurses by referring to the CTE name in its FROM clause. Recursion ends when this part produces no new rows. Thus, a recursive CTE consists of a nonrecursive SELECT part followed by a recursive SELECT part.

Each SELECT part can itself be a union of multiple SELECT statements.
- The types of the CTE result columns are inferred from the column types of the nonrecursive SELECT part only, and the columns are all nullable. For type determination, the recursive SELECT part is ignored.
- If the nonrecursive and recursive parts are separated by UNION DISTINCT, duplicate rows are eliminated. This is useful for queries that perform transitive closures, to avoid infinite loops.
- Each iteration of the recursive part operates only on the rows produced by the previous iteration. If the recursive part has multiple query blocks, iterations of each query block are scheduled in unspecified order, and each query block operates on rows that have been produced either by its previous iteration or by other query blocks since that previous iteration's end.

The recursive CTE subquery shown earlier has this nonrecursive part that retrieves a single row to produce the initial row set:

\section*{SELECT 1}

The CTE subquery also has this recursive part:
```
SELECT n + 1 FROM cte WHERE n < 5
```


At each iteration, that SELECT produces a row with a new value one greater than the value of $n$ from the previous row set. The first iteration operates on the initial row set (1) and produces 1+1=2; the second iteration operates on the first iteration's row set (2) and produces $2+1=3$; and so forth. This continues until recursion ends, which occurs when n is no longer less than 5.

If the recursive part of a CTE produces wider values for a column than the nonrecursive part, it may be necessary to widen the column in the nonrecursive part to avoid data truncation. Consider this statement:
```
WITH RECURSIVE cte AS
(
    SELECT 1 AS n, 'abc' AS str
    UNION ALL
    SELECT n + 1, CONCAT(str, str) FROM cte WHERE n < 3
)
SELECT * FROM cte;
```


In nonstrict SQL mode, the statement produces this output:
```
+------+------+
| n | str |
+------+------+
| 1 | abc |
| 2 | abc |
| 3 | abc |
+------+-------+
```


The str column values are all ' $a b c$ ' because the nonrecursive SELECT determines the column widths. Consequently, the wider str values produced by the recursive SELECT are truncated.

In strict SQL mode, the statement produces an error:
```
ERROR 1406 (22001): Data too long for column 'str' at row 1
```


To address this issue, so that the statement does not produce truncation or errors, use CAST( ) in the nonrecursive SELECT to make the str column wider:
```
WITH RECURSIVE cte AS
(
    SELECT 1 AS n, CAST('abc' AS CHAR(20)) AS str
    UNION ALL
    SELECT n + 1, CONCAT(str, str) FROM cte WHERE n < 3
)
SELECT * FROM cte;
```


Now the statement produces this result, without truncation:
```
+-------+---------------+
| n | str |
+-------+--------------+
| 1 | abc |
| 2 | abcabc
| 3 | abcabcabcabc
+-------+--------------+
```


Columns are accessed by name, not position, which means that columns in the recursive part can access columns in the nonrecursive part that have a different position, as this CTE illustrates:
```
WITH RECURSIVE cte AS
(
    SELECT 1 AS n, 1 AS p, -1 AS q
    UNION ALL
    SELECT \textrm{n + 1, q * 2, p * 2 FROM cte WHERE n < 5}
)
SELECT * FROM cte;
```


Because $p$ in one row is derived from $q$ in the previous row, and vice versa, the positive and negative values swap positions in each successive row of the output:
```
+------+------+------+
| n | p | q |
+------+------+------+
| 1 | 1 | -1 |
```

```
| 3 | 4 | -4 }[\begin{array}{r}{4}\\{}\\{5}\\{+-----+------+------+}
```


Some syntax constraints apply within recursive CTE subqueries:
- The recursive SELECT part must not contain these constructs:
- Aggregate functions such as SUM()
- Window functions
- GROUP BY
- ORDER BY
- DISTINCT

The recursive SELECT part of a recursive CTE can also use a LIMIT clause, along with an optional OFFSET clause. The effect on the result set is the same as when using LIMIT in the outermost SELECT, but is also more efficient, since using it with the recursive SELECT stops the generation of rows as soon as the requested number of them has been produced.

The prohibition on DISTINCT applies only to UNION members; UNION DISTINCT is permitted.
- The recursive SELECT part must reference the CTE only once and only in its FROM clause, not in any subquery. It can reference tables other than the CTE and join them with the CTE. If used in a join like this, the CTE must not be on the right side of a LEFT JOIN.

These constraints come from the SQL standard, other than the MySQL-specific exclusions mentioned previously.

For recursive CTEs, EXPLAIN output rows for recursive SELECT parts display Recursive in the Extra column.

Cost estimates displayed by EXPLAIN represent cost per iteration, which might differ considerably from total cost. The optimizer cannot predict the number of iterations because it cannot predict at what point the WHERE clause becomes false.

CTE actual cost may also be affected by result set size. A CTE that produces many rows may require an internal temporary table large enough to be converted from in-memory to on-disk format and may suffer a performance penalty. If so, increasing the permitted in-memory temporary table size may improve performance; see Section 10.4.4, "Internal Temporary Table Use in MySQL".

\section*{Limiting Common Table Expression Recursion}

It is important for recursive CTEs that the recursive SELECT part include a condition to terminate recursion. As a development technique to guard against a runaway recursive CTE, you can force termination by placing a limit on execution time:
- The cte_max_recursion_depth system variable enforces a limit on the number of recursion levels for CTEs. The server terminates execution of any CTE that recurses more levels than the value of this variable.
- The max_execution_time system variable enforces an execution timeout for SELECT statements executed within the current session.
- The MAX_EXECUTION_TIME optimizer hint enforces a per-query execution timeout for the SELECT statement in which it appears.

Suppose that a recursive CTE is mistakenly written with no recursion execution termination condition:
```
WITH RECURSIVE cte (n) AS
(
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM cte
)
SELECT * FROM cte;
```


By default, cte_max_recursion_depth has a value of 1000, causing the CTE to terminate when it recurses past 1000 levels. Applications can change the session value to adjust for their requirements:
```
SET SESSION cte_max_recursion_depth = 10; -- permit only shallow recursion
SET SESSION cte_max_recursion_depth = 1000000; -- permit deeper recursion
```


You can also set the global cte_max_recursion_depth value to affect all sessions that begin subsequently.

For queries that execute and thus recurse slowly or in contexts for which there is reason to set the cte_max_recursion_depth value very high, another way to guard against deep recursion is to set a per-session timeout. To do so, execute a statement like this prior to executing the CTE statement:
```
SET max_execution_time = 1000; -- impose one second timeout
```


Alternatively, include an optimizer hint within the CTE statement itself:
```
WITH RECURSIVE cte (n) AS
(
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM cte
)
SELECT /*+ SET_VAR(cte_max_recursion_depth = 1M) */ * FROM cte;
WITH RECURSIVE cte (n) AS
(
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM cte
)
SELECT /*+ MAX_EXECUTION_TIME(1000) */ * FROM cte;
```


You can also use LIMIT within the recursive query to impose a maximum number of rows to be returned to the outermost SELECT, for example:
```
WITH RECURSIVE cte (n) AS
(
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM cte LIMIT 10000
)
SELECT * FROM cte;
```


You can do this in addition to or instead of setting a time limit. Thus, the following CTE terminates after returning ten thousand rows or running for one second (1000 milliseconds), whichever occurs first:
```
WITH RECURSIVE cte (n) AS
(
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM cte LIMIT 10000
)
SELECT /*+ MAX_EXECUTION_TIME(1000) */ * FROM cte;
```


If a recursive query without an execution time limit enters an infinite loop, you can terminate it from another session using KILL QUERY. Within the session itself, the client program used to run the query might provide a way to kill the query. For example, in mysql, typing Control+C interrupts the current statement.

\section*{Recursive Common Table Expression Examples}

As mentioned previously, recursive common table expressions (CTEs) are frequently used for series generation and traversing hierarchical or tree-structured data. This section shows some simple examples of these techniques.
- Fibonacci Series Generation
- Date Series Generation
- Hierarchical Data Traversal

\section*{Fibonacci Series Generation}

A Fibonacci series begins with the two numbers 0 and 1 (or 1 and 1 ) and each number after that is the sum of the previous two numbers. A recursive common table expression can generate a Fibonacci series if each row produced by the recursive SELECT has access to the two previous numbers from the series. The following CTE generates a 10 -number series using 0 and 1 as the first two numbers:
```
WITH RECURSIVE fibonacci (n, fib_n, next_fib_n) AS
(
    SELECT 1, 0, 1
    UNION ALL
    SELECT n + 1, next_fib_n, fib_n + next_fib_n
        FROM fibonacci WHERE n < 10
)
SELECT * FROM fibonacci;
```


The CTE produces this result:
```
+-------+-------+------------+
| n | fib_n | next_fib_n |
+-------+-------+------------+
r 1 r 0 1 1 1 2 3 3 + 3 + 3 \
```


How the CTE works:
- $n$ is a display column to indicate that the row contains the $n$-th Fibonacci number. For example, the 8th Fibonacci number is 13.
- The fib_n column displays Fibonacci number n.
- The next_fib_n column displays the next Fibonacci number after number n. This column provides the next series value to the next row, so that row can produce the sum of the two previous series values in its fib_n column.
- Recursion ends when n reaches 10 . This is an arbitrary choice, to limit the output to a small set of rows.

The preceding output shows the entire CTE result. To select just part of it, add an appropriate WHERE clause to the top-level SELECT. For example, to select the 8th Fibonacci number, do this:
```
mysql> WITH RECURSIVE fibonacci ...
    ...
    SELECT fib_n FROM fibonacci WHERE n = 8;
+-------+
```

```
| fib_n |
+-------+
| 13 |
+-------+
```


\section*{Date Series Generation}

A common table expression can generate a series of successive dates, which is useful for generating summaries that include a row for all dates in the series, including dates not represented in the summarized data.

Suppose that a table of sales numbers contains these rows:
```
mysql> SELECT * FROM sales ORDER BY date, price;
+-------------+--------+
| date | price |
+-------------+--------+
| 2017-01-03 | 100.00 |
| 2017-01-03 | 200.00 |
| 2017-01-06 | 50.00
| 2017-01-08 | 10.00 |
| 2017-01-08 | 20.00 |
| 2017-01-08 | 150.00 |
| 2017-01-10 | 5.00 |
+-------------+--------+
```


This query summarizes the sales per day:
```
mysql> SELECT date, SUM(price) AS sum_price
        FROM sales
        GROUP BY date
        ORDER BY date;
+-------------+-----------+
| date | sum_price |
+-------------+-----------+
| 2017-01-03 | 300.00 |
| 2017-01-06 | 50.00 |
| 2017-01-08 | 180.00 |
+-------------+-----------+
```


However, that result contains "holes" for dates not represented in the range of dates spanned by the table. A result that represents all dates in the range can be produced using a recursive CTE to generate that set of dates, joined with a LEFT JOIN to the sales data.

Here is the CTE to generate the date range series:
```
WITH RECURSIVE dates (date) AS
(
    SELECT MIN(date) FROM sales
    UNION ALL
    SELECT date + INTERVAL 1 DAY FROM dates
    WHERE date + INTERVAL 1 DAY <= (SELECT MAX(date) FROM sales)
)
SELECT * FROM dates;
```


The CTE produces this result:
```
+-------------+
| date |
+-------------+
| 2017-01-03 |
| 2017-01-04 |
| 2017-01-05 |
| 2017-01-06 |
| 2017-01-07 |
| 2017-01-08 |
| 2017-01-09 |
| 2017-01-10 |
+-------------+
```


How the CTE works:
- The nonrecursive SELECT produces the lowest date in the date range spanned by the sales table.
- Each row produced by the recursive SELECT adds one day to the date produced by the previous row.
- Recursion ends after the dates reach the highest date in the date range spanned by the sales table.

Joining the CTE with a LEFT JOIN against the sales table produces the sales summary with a row for each date in the range:
```
WITH RECURSIVE dates (date) AS
(
    SELECT MIN(date) FROM sales
    UNION ALL
    SELECT date + INTERVAL 1 DAY FROM dates
    WHERE date + INTERVAL 1 DAY <= (SELECT MAX(date) FROM sales)
)
SELECT dates.date, COALESCE(SUM(price), 0) AS sum_price
FROM dates LEFT JOIN sales ON dates.date = sales.date
GROUP BY dates.date
ORDER BY dates.date;
```


The output looks like this:
```
+-------------+-----------+
| date | sum_price |
+-------------+-----------+
| 2017-01-03 | 300.00 |
|2017-01-04 \ 0.00 0.00 
| 2017-01-06 | 50.00 |
| 2017-01-07 | 0.00 |
| 2017-01-08 | 180.00 |
| 2017-01-09 | 017-01-10 | 5.00 |
+-------------+-----------+
```


Some points to note:
- Are the queries inefficient, particularly the one with the MAX() subquery executed for each row in the recursive SELECT? EXPLAIN shows that the subquery containing MAX( ) is evaluated only once and the result is cached.
- The use of COALESCE() avoids displaying NULL in the sum_price column on days for which no sales data occur in the sales table.

\section*{Hierarchical Data Traversal}

Recursive common table expressions are useful for traversing data that forms a hierarchy. Consider these statements that create a small data set that shows, for each employee in a company, the employee name and ID number, and the ID of the employee's manager. The top-level employee (the CEO), has a manager ID of NULL (no manager).
```
CREATE TABLE employees (
    id INT PRIMARY KEY NOT NULL,
    name VARCHAR(100) NOT NULL,
    manager_id INT NULL,
    INDEX (manager_id),
FOREIGN KEY (manager_id) REFERENCES employees (id)
);
INSERT INTO employees VALUES
(333, "Yasmina", NULL), # Yasmina is the CEO (manager_id is NULL)
(198, "John", 333), # John has ID 198 and reports to 333 (Yasmina)
(692, "Tarek", 333),
(29, "Pedro", 198),
(4610, "Sarah", 29),
(72, "Pierre", 29),
```

```
(123, "Adil", 692);
```


The resulting data set looks like this:
```
mysql> SELECT * FROM employees ORDER BY id;
+------+---------+------------+
| id | name | manager_id |
+------+---------+------------+
| 29 | Pedro | 198 |
| 72 | Pierre | 29 |
| 123 | Adil | 692 |
| 198 | John | 333 |
| 333 | Yasmina | NULL |
| 4610 | Sarah | 29 |
+------+---------+------------+
```


To produce the organizational chart with the management chain for each employee (that is, the path from CEO to employee), use a recursive CTE:
```
WITH RECURSIVE employee_paths (id, name, path) AS
(
    SELECT id, name, CAST(id AS CHAR(200))
        FROM employees
        WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, CONCAT(ep.path, ',', e.id)
        FROM employee_paths AS ep JOIN employees AS e
            ON ep.id = e.manager_id
)
SELECT * FROM employee_paths ORDER BY path;
```


The CTE produces this output:
```
+-------+---------+-----------------+
| id | name | path |
+-------+----------+-----------------+
| 333 | Yasmina | 333
| 198 | John | 333,198
| 29 | Pedro | 333,198,29
| 4610 | Sarah | 333,198,29,4610 |
| 72 | Pierre | 333,198,29,72
| 692 | Tarek | 333,692
| 123 | Adil | 333,692,123
+-------+---------+-----------------+
```


How the CTE works:
- The nonrecursive SELECT produces the row for the CEO (the row with a NULL manager ID).

The path column is widened to CHAR(200) to ensure that there is room for the longer path values produced by the recursive SELECT.
- Each row produced by the recursive SELECT finds all employees who report directly to an employee produced by a previous row. For each such employee, the row includes the employee ID and name, and the employee management chain. The chain is the manager's chain, with the employee ID added to the end.
- Recursion ends when employees have no others who report to them.

To find the path for a specific employee or employees, add a WHERE clause to the top-level SELECT. For example, to display the results for Tarek and Sarah, modify that SELECT like this:
```
mysql> WITH RECURSIVE ...
    ...
    SELECT * FROM employees_extended
    WHERE id IN (692, 4610)
    ORDER BY path;
+------+-------+-----------------+
```

```
| id | name | path |
+------+--------+-----------------+
| 4610 | Sarah | 333,198,29,4610
| 692 | Tarek | 333,692 |
+------+--------+-----------------+
```


\section*{Common Table Expressions Compared to Similar Constructs}

Common table expressions (CTEs) are similar to derived tables in some ways:
- Both constructs are named.
- Both constructs exist for the scope of a single statement.

Because of these similarities, CTEs and derived tables often can be used interchangeably. As a trivial example, these statements are equivalent:
```
WITH cte AS (SELECT 1) SELECT * FROM cte;
SELECT * FROM (SELECT 1) AS dt;
```


However, CTEs have some advantages over derived tables:
- A derived table can be referenced only a single time within a query. A CTE can be referenced multiple times. To use multiple instances of a derived table result, you must derive the result multiple times.
- A CTE can be self-referencing (recursive).
- One CTE can refer to another.
- A CTE may be easier to read when its definition appears at the beginning of the statement rather than embedded within it.

CTEs are similar to tables created with CREATE [TEMPORARY] TABLE but need not be defined or dropped explicitly. For a CTE, you need no privileges to create tables.

\subsection*{15.3 Transactional and Locking Statements}

MySQL supports local transactions (within a given client session) through statements such as SET autocommit, START TRANSACTION, COMMIT, and ROLLBACK. See Section 15.3.1, "START TRANSACTION, COMMIT, and ROLLBACK Statements". XA transaction support enables MySQL to participate in distributed transactions as well. See Section 15.3.8, "XA Transactions".

\subsection*{15.3.1 START TRANSACTION, COMMIT, and ROLLBACK Statements}
```
START TRANSACTION
        [transaction_characteristic [, transaction_characteristic] ...]
transaction_characteristic: {
        WITH CONSISTENT SNAPSHOT
    | READ WRITE
    | READ ONLY
}
BEGIN [WORK]
COMMIT [WORK] [AND [NO] CHAIN] [[NO] RELEASE]
ROLLBACK [WORK] [AND [NO] CHAIN] [[NO] RELEASE]
SET autocommit = {0 | 1}
```


These statements provide control over use of transactions:
- START TRANSACTION or BEGIN start a new transaction.
- COMMIT commits the current transaction, making its changes permanent.
- ROLLBACK rolls back the current transaction, canceling its changes.
- SET autocommit disables or enables the default autocommit mode for the current session.

By default, MySQL runs with autocommit mode enabled. This means that, when not otherwise inside a transaction, each statement is atomic, as if it were surrounded by START TRANSACTION and COMMIT. You cannot use ROLLBACK to undo the effect; however, if an error occurs during statement execution, the statement is rolled back.

To disable autocommit mode implicitly for a single series of statements, use the START TRANSACTION statement:
```
START TRANSACTION;
SELECT @A:=SUM(salary) FROM table1 WHERE type=1;
UPDATE table2 SET summary=@A WHERE type=1;
COMMIT;
```


With START TRANSACTION, autocommit remains disabled until you end the transaction with COMMIT or ROLLBACK. The autocommit mode then reverts to its previous state.

START TRANSACTION permits several modifiers that control transaction characteristics. To specify multiple modifiers, separate them by commas.
- The WITH CONSISTENT SNAPSHOT modifier starts a consistent read for storage engines that are capable of it. This applies only to InnoDB. The effect is the same as issuing a START TRANSACTION followed by a SELECT from any InnoDB table. See Section 17.7.2.3, "Consistent Nonlocking Reads". The WITH CONSISTENT SNAPSHOT modifier does not change the current transaction isolation level, so it provides a consistent snapshot only if the current isolation level is one that permits a consistent read. The only isolation level that permits a consistent read is REPEATABLE READ. For all other isolation levels, the WITH CONSISTENT SNAPSHOT clause is ignored. A warning is generated when the WITH CONSISTENT SNAPSHOT clause is ignored.
- The READ WRITE and READ ONLY modifiers set the transaction access mode. They permit or prohibit changes to tables used in the transaction. The READ ONLY restriction prevents the transaction from modifying or locking both transactional and nontransactional tables that are visible to other transactions; the transaction can still modify or lock temporary tables.

MySQL enables extra optimizations for queries on InnoDB tables when the transaction is known to be read-only. Specifying READ ONLY ensures these optimizations are applied in cases where the read-only status cannot be determined automatically. See Section 10.5.3, "Optimizing InnoDB ReadOnly Transactions" for more information.

If no access mode is specified, the default mode applies. Unless the default has been changed, it is read/write. It is not permitted to specify both READ WRITE and READ ONLY in the same statement.

In read-only mode, it remains possible to change tables created with the TEMPORARY keyword using DML statements. Changes made with DDL statements are not permitted, just as with permanent tables.

For additional information about transaction access mode, including ways to change the default mode, see Section 15.3.7, "SET TRANSACTION Statement".

If the read_only system variable is enabled, explicitly starting a transaction with START TRANSACTION READ WRITE requires the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2727.jpg?height=115&width=104&top_left_y=2398&top_left_x=365)

\section*{Important}

Many APIs used for writing MySQL client applications (such as JDBC) provide their own methods for starting transactions that can (and sometimes should) be used instead of sending a START TRANSACTION statement from the client. See Chapter 31, Connectors and APIs, or the documentation for your API, for more information.

To disable autocommit mode explicitly, use the following statement:
SET autocommit=0;
After disabling autocommit mode by setting the autocommit variable to zero, changes to transactionsafe tables (such as those for InnoDB or NDB) are not made permanent immediately. You must use COMMIT to store your changes to disk or ROLLBACK to ignore the changes.
autocommit is a session variable and must be set for each session. To disable autocommit mode for each new connection, see the description of the autocommit system variable at Section 7.1.8, "Server System Variables".

BEGIN and BEGIN WORK are supported as aliases of START TRANSACTION for initiating a transaction. START TRANSACTION is standard SQL syntax, is the recommended way to start an ad-hoc transaction, and permits modifiers that BEGIN does not.

The BEGIN statement differs from the use of the BEGIN keyword that starts a BEGIN . . . END compound statement. The latter does not begin a transaction. See Section 15.6.1, "BEGIN ... END Compound Statement".

\section*{Note}

Within all stored programs (stored procedures and functions, triggers, and events), the parser treats BEGIN [WORK] as the beginning of a BEGIN . . . END block. Begin a transaction in this context with START TRANSACTION instead.

The optional WORK keyword is supported for COMMIT and ROLLBACK, as are the CHAIN and RELEASE clauses. CHAIN and RELEASE can be used for additional control over transaction completion. The value of the completion_type system variable determines the default completion behavior. See Section 7.1.8, "Server System Variables".

The AND CHAIN clause causes a new transaction to begin as soon as the current one ends, and the new transaction has the same isolation level as the just-terminated transaction. The new transaction also uses the same access mode (READ WRITE or READ ONLY) as the just-terminated transaction. The RELEASE clause causes the server to disconnect the current client session after terminating the current transaction. Including the NO keyword suppresses CHAIN or RELEASE completion, which can be useful if the completion_type system variable is set to cause chaining or release completion by default.

Beginning a transaction causes any pending transaction to be committed. See Section 15.3.3, "Statements That Cause an Implicit Commit", for more information.

Beginning a transaction also causes table locks acquired with LOCK TABLES to be released, as though you had executed UNLOCK TABLES. Beginning a transaction does not release a global read lock acquired with FLUSH TABLES WITH READ LOCK.

For best results, transactions should be performed using only tables managed by a single transactionsafe storage engine. Otherwise, the following problems can occur:
- If you use tables from more than one transaction-safe storage engine (such as InnoDB), and the transaction isolation level is not SERIALIZABLE, it is possible that when one transaction commits, another ongoing transaction that uses the same tables sees only some of the changes made by the first transaction. That is, the atomicity of transactions is not guaranteed with mixed engines and inconsistencies can result. (If mixed-engine transactions are infrequent, you can use SET TRANSACTION ISOLATION LEVEL to set the isolation level to SERIALIZABLE on a per-transaction basis as necessary.)
- If you use tables that are not transaction-safe within a transaction, changes to those tables are stored at once, regardless of the status of autocommit mode.
- If you issue a ROLLBACK statement after updating a nontransactional table within a transaction, an ER_WARNING_NOT_COMPLETE_ROLLBACK warning occurs. Changes to transaction-safe tables are rolled back, but not changes to nontransaction-safe tables.

Each transaction is stored in the binary log in one chunk, upon COMMIT. Transactions that are rolled back are not logged. (Exception: Modifications to nontransactional tables cannot be rolled back. If a transaction that is rolled back includes modifications to nontransactional tables, the entire transaction is logged with a ROLLBACK statement at the end to ensure that modifications to the nontransactional tables are replicated.) See Section 7.4.4, "The Binary Log".

You can change the isolation level or access mode for transactions with the SET TRANSACTION statement. See Section 15.3.7, "SET TRANSACTION Statement".

Rolling back can be a slow operation that may occur implicitly without the user having explicitly asked for it (for example, when an error occurs). Because of this, SHOW PROCESSLIST displays Rolling back in the State column for the session, not only for explicit rollbacks performed with the ROLLBACK statement but also for implicit rollbacks.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2729.jpg?height=127&width=99&top_left_y=977&top_left_x=370)

Note
In MySQL 8.4, BEGIN, COMMIT, and ROLLBACK are not affected by --replicate-do-db or - -replicate-ignore-db rules.

When InnoDB performs a complete rollback of a transaction, all locks set by the transaction are released. If a single SQL statement within a transaction rolls back as a result of an error, such as a duplicate key error, locks set by the statement are preserved while the transaction remains active. This happens because InnoDB stores row locks in a format such that it cannot know afterward which lock was set by which statement.

If a SELECT statement within a transaction calls a stored function, and a statement within the stored function fails, that statement rolls back. If ROLLBACK is executed for the transaction subsequently, the entire transaction rolls back.

\subsection*{15.3.2 Statements That Cannot Be Rolled Back}

Some statements cannot be rolled back. In general, these include data definition language (DDL) statements, such as those that create or drop databases, those that create, drop, or alter tables or stored routines.

You should design your transactions not to include such statements. If you issue a statement early in a transaction that cannot be rolled back, and then another statement later fails, the full effect of the transaction cannot be rolled back in such cases by issuing a ROLLBACK statement.

\subsection*{15.3.3 Statements That Cause an Implicit Commit}

The statements listed in this section (and any synonyms for them) implicitly end any transaction active in the current session, as if you had done a COMMIT before executing the statement.

Most of these statements also cause an implicit commit after executing. The intent is to handle each such statement in its own special transaction. Transaction-control and locking statements are exceptions: If an implicit commit occurs before execution, another does not occur after.
- Data definition language (DDL) statements that define or modify database objects. ALTER EVENT, ALTER FUNCTION, ALTER PROCEDURE, ALTER SERVER, ALTER TABLE, ALTER TABLESPACE, ALTER VIEW, CREATE DATABASE, CREATE EVENT, CREATE FUNCTION, CREATE INDEX, CREATE PROCEDURE, CREATE ROLE, CREATE SERVER, CREATE SPATIAL REFERENCE SYSTEM, CREATE TABLE, CREATE TABLESPACE, CREATE TRIGGER, CREATE VIEW, DROP DATABASE, DROP EVENT, DROP FUNCTION, DROP INDEX, DROP PROCEDURE, DROP ROLE, DROP SERVER, DROP SPATIAL REFERENCE SYSTEM, DROP TABLE, DROP TABLESPACE, DROP

TRIGGER, DROP VIEW, INSTALL PLUGIN, RENAME TABLE, TRUNCATE TABLE, UNINSTALL PLUGIN.

CREATE TABLE and DROP TABLE statements do not commit a transaction if the TEMPORARY keyword is used. (This does not apply to other operations on temporary tables such as ALTER TABLE and CREATE INDEX, which do cause a commit.) However, although no implicit commit occurs, neither can the statement be rolled back, which means that the use of such statements causes transactional atomicity to be violated. For example, if you use CREATE TEMPORARY TABLE and then roll back the transaction, the table remains in existence.

The CREATE TABLE statement in InnoDB is processed as a single transaction. This means that a ROLLBACK from the user does not undo CREATE TABLE statements the user made during that transaction.

CREATE TABLE ... SELECT causes an implicit commit before and after the statement is executed when you are creating nontemporary tables. (No commit occurs for CREATE TEMPORARY TABLE ... SELECT.)
- Statements that implicitly use or modify tables in the mysql database. ALTER USER, CREATE USER, DROP USER, GRANT, RENAME USER, REVOKE, SET PASSWORD.
- Transaction-control and locking statements. BEGIN, LOCK TABLES, SET autocommit $=1$ (if the value is not already 1), START TRANSACTION, UNLOCK TABLES.

UNLOCK TABLES commits a transaction only if any tables currently have been locked with LOCK TABLES to acquire nontransactional table locks. A commit does not occur for UNLOCK TABLES following FLUSH TABLES WITH READ LOCK because the latter statement does not acquire tablelevel locks.

Transactions cannot be nested. This is a consequence of the implicit commit performed for any current transaction when you issue a START TRANSACTION statement or one of its synonyms.

Statements that cause an implicit commit cannot be used in an XA transaction while the transaction is in an ACTIVE state.

The BEGIN statement differs from the use of the BEGIN keyword that starts a BEGIN . . . END compound statement. The latter does not cause an implicit commit. See Section 15.6.1, "BEGIN ... END Compound Statement".
- Data loading statements. LOAD DATA. LOAD DATA causes an implicit commit only for tables using the NDB storage engine.
- Administrative statements. ANALYZE TABLE, CACHE INDEX, CHECK TABLE, FLUSH, LOAD INDEX INTO CACHE, OPTIMIZE TABLE, REPAIR TABLE, RESET (but not RESET PERSIST).
- Replication control statements. START REPLICA, STOP REPLICA, RESET REPLICA, CHANGE REPLICATION SOURCE TO.

\subsection*{15.3.4 SAVEPOINT, ROLLBACK TO SAVEPOINT, and RELEASE SAVEPOINT Statements}

SAVEPOINT identifier ROLLBACK [WORK] TO [SAVEPOINT] identifier RELEASE SAVEPOINT identifier

InnoDB supports the SQL statements SAVEPOINT, ROLLBACK TO SAVEPOINT, RELEASE SAVEPOINT and the optional WORK keyword for ROLLBACK.

The SAVEPOINT statement sets a named transaction savepoint with a name of identifier. If the current transaction has a savepoint with the same name, the old savepoint is deleted and a new one is set.

The ROLLBACK TO SAVEPOINT statement rolls back a transaction to the named savepoint without terminating the transaction. Modifications that the current transaction made to rows after the savepoint was set are undone in the rollback, but InnoDB does not release the row locks that were stored in memory after the savepoint. (For a new inserted row, the lock information is carried by the transaction ID stored in the row; the lock is not separately stored in memory. In this case, the row lock is released in the undo.) Savepoints that were set at a later time than the named savepoint are deleted.

If the ROLLBACK TO SAVEPOINT statement returns the following error, it means that no savepoint with the specified name exists:

ERROR 1305 (42000): SAVEPOINT identifier does not exist
The RELEASE SAVEPOINT statement removes the named savepoint from the set of savepoints of the current transaction. No commit or rollback occurs. It is an error if the savepoint does not exist.

All savepoints of the current transaction are deleted if you execute a COMMIT, or a ROLLBACK that does not name a savepoint.

A new savepoint level is created when a stored function is invoked or a trigger is activated. The savepoints on previous levels become unavailable and thus do not conflict with savepoints on the new level. When the function or trigger terminates, any savepoints it created are released and the previous savepoint level is restored.

\subsection*{15.3.5 LOCK INSTANCE FOR BACKUP and UNLOCK INSTANCE Statements}

LOCK INSTANCE FOR BACKUP
UNLOCK INSTANCE
LOCK INSTANCE FOR BACKUP acquires an instance-level backup lock that permits DML during an online backup while preventing operations that could result in an inconsistent snapshot.

Executing the LOCK INSTANCE FOR BACKUP statement requires the BACKUP_ADMIN privilege. The BACKUP_ADMIN privilege is automatically granted to users with the RELOAD privilege when performing an in-place upgrade to MySQL 8.4 from an earlier version.

Multiple sessions can hold a backup lock simultaneously.
UNLOCK INSTANCE releases a backup lock held by the current session. A backup lock held by a session is also released if the session is terminated.

LOCK INSTANCE FOR BACKUP prevents files from being created, renamed, or removed. REPAIR TABLE TRUNCATE TABLE, OPTIMIZE TABLE, and account management statements are blocked. See Section 15.7.1, "Account Management Statements". Operations that modify InnoDB files that are not recorded in the InnoDB redo log are also blocked.

LOCK INSTANCE FOR BACKUP permits DDL operations that only affect user-created temporary tables. In effect, files that belong to user-created temporary tables can be created, renamed, or removed while a backup lock is held. Creation of binary log files is also permitted.

PURGE BINARY LOGS cannot be issued while a LOCK INSTANCE FOR BACKUP statement is in effect for the instance, because it contravenes the rules of the backup lock by removing files from the server.

A backup lock acquired by LOCK INSTANCE FOR BACKUP is independent of transactional locks and locks taken by FLUSH TABLES tbl_name [, tbl_name] ... WITH READ LOCK, and the following sequences of statements are permitted:
```
LOCK INSTANCE FOR BACKUP;
FLUSH TABLES tbl_name [, tbl_name] ... WITH READ LOCK;
UNLOCK TABLES;
UNLOCK INSTANCE;
FLUSH TABLES tbl_name [, tbl_name] ... WITH READ LOCK;
```

```
LOCK INSTANCE FOR BACKUP;
UNLOCK INSTANCE;
UNLOCK TABLES;
```


The lock_wait_timeout setting defines the amount of time that a LOCK INSTANCE FOR BACKUP statement waits to acquire a lock before giving up.

\subsection*{15.3.6 LOCK TABLES and UNLOCK TABLES Statements}
```
LOCK {TABLE | TABLES}
        tbl_name [[AS] alias] lock_type
        [, tbl_name [[AS] alias] lock_type] ...
lock_type: {
        READ [LOCAL]
    | WRITE
}
UNLOCK {TABLE | TABLES}
```


MySQL enables client sessions to acquire table locks explicitly for the purpose of cooperating with other sessions for access to tables, or to prevent other sessions from modifying tables during periods when a session requires exclusive access to them. A session can acquire or release locks only for itself. One session cannot acquire locks for another session or release locks held by another session.

Locks may be used to emulate transactions or to get more speed when updating tables. This is explained in more detail in Table-Locking Restrictions and Conditions.

LOCK TABLES explicitly acquires table locks for the current client session. Table locks can be acquired for base tables or views. You must have the LOCK TABLES privilege, and the SELECT privilege for each object to be locked.

For view locking, LOCK TABLES adds all base tables used in the view to the set of tables to be locked and locks them automatically. For tables underlying any view being locked, LOCK TABLES checks that the view definer (for SQL SECURITY DEFINER views) or invoker (for all views) has the proper privileges on the tables.

If you lock a table explicitly with LOCK TABLES, any tables used in triggers are also locked implicitly, as described in LOCK TABLES and Triggers.

If you lock a table explicitly with LOCK TABLES, any tables related by a foreign key constraint are opened and locked implicitly. For foreign key checks, a shared read-only lock (LOCK TABLES READ) is taken on related tables. For cascading updates, a shared-nothing write lock (LOCK TABLES WRITE) is taken on related tables that are involved in the operation.

UNLOCK TABLES explicitly releases any table locks held by the current session. LOCK TABLES implicitly releases any table locks held by the current session before acquiring new locks.

Another use for UNLOCK TABLES is to release the global read lock acquired with the FLUSH TABLES WITH READ LOCK statement, which enables you to lock all tables in all databases. See Section 15.7.8.3, "FLUSH Statement". (This is a very convenient way to get backups if you have a file system such as Veritas that can take snapshots in time.)

LOCK TABLE is a synonym for LOCK TABLES; UNLOCK TABLE is a synonym for UNLOCK TABLES.
A table lock protects only against inappropriate reads or writes by other sessions. A session holding a WRITE lock can perform table-level operations such as DROP TABLE or TRUNCATE TABLE. For sessions holding a READ lock, DROP TABLE and TRUNCATE TABLE operations are not permitted.

The following discussion applies only to non-TEMPORARY tables. LOCK TABLES is permitted (but ignored) for a TEMPORARY table. The table can be accessed freely by the session within which it was created, regardless of what other locking may be in effect. No lock is necessary because no other session can see the table.
- Table Lock Acquisition
- Table Lock Release
- Interaction of Table Locking and Transactions
- LOCK TABLES and Triggers
- Table-Locking Restrictions and Conditions

\section*{Table Lock Acquisition}

To acquire table locks within the current session, use the LOCK TABLES statement, which acquires metadata locks (see Section 10.11.4, "Metadata Locking").

The following lock types are available:
READ [LOCAL] lock:
- The session that holds the lock can read the table (but not write it).
- Multiple sessions can acquire a READ lock for the table at the same time.
- Other sessions can read the table without explicitly acquiring a READ lock.
- The LOCAL modifier enables nonconflicting INSERT statements (concurrent inserts) by other sessions to execute while the lock is held. (See Section 10.11.3, "Concurrent Inserts".) However, READ LOCAL cannot be used if you are going to manipulate the database using processes external to the server while you hold the lock. For InnodB tables, READ LOCAL is the same as READ.

WRITE lock:
- The session that holds the lock can read and write the table.
- Only the session that holds the lock can access the table. No other session can access it until the lock is released.
- Lock requests for the table by other sessions block while the WRITE lock is held.

WRITE locks normally have higher priority than READ locks to ensure that updates are processed as soon as possible. This means that if one session obtains a READ lock and then another session requests a WRITE lock, subsequent READ lock requests wait until the session that requested the WRITE lock has obtained the lock and released it. (An exception to this policy can occur for small values of the max_write_lock_count system variable; see Section 10.11.4, "Metadata Locking".)

If the LOCK TABLES statement must wait due to locks held by other sessions on any of the tables, it blocks until all locks can be acquired.

A session that requires locks must acquire all the locks that it needs in a single LOCK TABLES statement. While the locks thus obtained are held, the session can access only the locked tables. For example, in the following sequence of statements, an error occurs for the attempt to access t2 because it was not locked in the LOCK TABLES statement:
```
mysql> LOCK TABLES t1 READ;
mysql> SELECT COUNT(*) FROM t1;
+----------+
| COUNT(*) |
+-----------+
| 3 |
+-----------+
mysql> SELECT COUNT(*) FROM t2;
ERROR 1100 (HY000): Table 't2' was not locked with LOCK TABLES
```


Tables in the INFORMATION_SCHEMA database are an exception. They can be accessed without being locked explicitly even while a session holds table locks obtained with LOCK TABLES.

You cannot refer to a locked table multiple times in a single query using the same name. Use aliases instead, and obtain a separate lock for the table and each alias:
```
mysql> LOCK TABLE t WRITE, t AS t1 READ;
mysql> INSERT INTO t SELECT * FROM t;
ERROR 1100: Table 't' was not locked with LOCK TABLES
mysql> INSERT INTO t SELECT * FROM t AS t1;
```


The error occurs for the first INSERT because there are two references to the same name for a locked table. The second INSERT succeeds because the references to the table use different names.

If your statements refer to a table by means of an alias, you must lock the table using that same alias. It does not work to lock the table without specifying the alias:
```
mysql> LOCK TABLE t READ;
mysql> SELECT * FROM t AS myalias;
ERROR 1100: Table 'myalias' was not locked with LOCK TABLES
```


Conversely, if you lock a table using an alias, you must refer to it in your statements using that alias:
```
mysql> LOCK TABLE t AS myalias READ;
mysql> SELECT * FROM t;
ERROR 1100: Table 't' was not locked with LOCK TABLES
mysql> SELECT * FROM t AS myalias;
```


\section*{Table Lock Release}

When the table locks held by a session are released, they are all released at the same time. A session can release its locks explicitly, or locks may be released implicitly under certain conditions.
- A session can release its locks explicitly with UNLOCK TABLES.
- If a session issues a LOCK TABLES statement to acquire a lock while already holding locks, its existing locks are released implicitly before the new locks are granted.
- If a session begins a transaction (for example, with START TRANSACTION), an implicit UNLOCK TABLES is performed, which causes existing locks to be released. (For additional information about the interaction between table locking and transactions, see Interaction of Table Locking and Transactions.)

If the connection for a client session terminates, whether normally or abnormally, the server implicitly releases all table locks held by the session (transactional and nontransactional). If the client reconnects, the locks are no longer in effect. In addition, if the client had an active transaction, the server rolls back the transaction upon disconnect, and if reconnect occurs, the new session begins with autocommit enabled. For this reason, clients may wish to disable auto-reconnect. With auto-reconnect in effect, the client is not notified if reconnect occurs but any table locks or current transaction are lost. With auto-reconnect disabled, if the connection drops, an error occurs for the next statement issued. The client can detect the error and take appropriate action such as reacquiring the locks or redoing the transaction. See Automatic Reconnection Control.

\section*{Note}

If you use ALTER TABLE on a locked table, it may become unlocked. For example, if you attempt a second ALTER TABLE operation, the result may be an error Table 'tbl_name' was not locked with LOCK TABLES. To handle this, lock the table again prior to the second alteration. See also Section B.3.6.1, "Problems with ALTER TABLE".

\section*{Interaction of Table Locking and Transactions}

LOCK TABLES and UNLOCK TABLES interact with the use of transactions as follows:
- LOCK TABLES is not transaction-safe and implicitly commits any active transaction before attempting to lock the tables.
- UNLOCK TABLES implicitly commits any active transaction, but only if LOCK TABLES has been used to acquire table locks. For example, in the following set of statements, UNLOCK TABLES releases the global read lock but does not commit the transaction because no table locks are in effect:
```
FLUSH TABLES WITH READ LOCK;
START TRANSACTION;
SELECT ... ;
UNLOCK TABLES;
```

- Beginning a transaction (for example, with START TRANSACTION) implicitly commits any current transaction and releases existing table locks.
- FLUSH TABLES WITH READ LOCK acquires a global read lock and not table locks, so it is not subject to the same behavior as LOCK TABLES and UNLOCK TABLES with respect to table locking and implicit commits. For example, START TRANSACTION does not release the global read lock. See Section 15.7.8.3, "FLUSH Statement".
- Other statements that implicitly cause transactions to be committed do not release existing table locks. For a list of such statements, see Section 15.3.3, "Statements That Cause an Implicit Commit".
- The correct way to use LOCK TABLES and UNLOCK TABLES with transactional tables, such as InnoDB tables, is to begin a transaction with SET autocommit $=0$ (not START TRANSACTION) followed by LOCK TABLES, and to not call UNLOCK TABLES until you commit the transaction explicitly. For example, if you need to write to table t1 and read from table t2, you can do this:
```
SET autocommit=0;
LOCK TABLES t1 WRITE, t2 READ, ...;
... do something with tables t1 and t2 here ...
COMMIT;
UNLOCK TABLES;
```


When you call LOCK TABLES, InnoDB internally takes its own table lock, and MySQL takes its own table lock. InnoDB releases its internal table lock at the next commit, but for MySQL to release its table lock, you have to call UNLOCK TABLES. You should not have autocommit $=1$, because then InnoDB releases its internal table lock immediately after the call of LOCK TABLES, and deadlocks can very easily happen. InnoDB does not acquire the internal table lock at all if autocommit $=1$, to help old applications avoid unnecessary deadlocks.
- ROLLBACK does not release table locks.

\section*{LOCK TABLES and Triggers}

If you lock a table explicitly with LOCK TABLES, any tables used in triggers are also locked implicitly:
- The locks are taken as the same time as those acquired explicitly with the LOCK TABLES statement.
- The lock on a table used in a trigger depends on whether the table is used only for reading. If so, a read lock suffices. Otherwise, a write lock is used.
- If a table is locked explicitly for reading with LOCK TABLES, but needs to be locked for writing because it might be modified within a trigger, a write lock is taken rather than a read lock. (That is, an implicit write lock needed due to the table's appearance within a trigger causes an explicit read lock request for the table to be converted to a write lock request.)

Suppose that you lock two tables, t1 and t2, using this statement:
```
LOCK TABLES t1 WRITE, t2 READ;
```


If t1 or t2 have any triggers, tables used within the triggers are also locked. Suppose that t1 has a trigger defined like this:
```
CREATE TRIGGER t1_a_ins AFTER INSERT ON t1 FOR EACH ROW
BEGIN
    UPDATE t4 SET count = count+1
        WHERE id = NEW.id AND EXISTS (SELECT a FROM t3);
```

```
    INSERT INTO t2 VALUES(1, 2);
END;
```


The result of the LOCK TABLES statement is that t1 and t2 are locked because they appear in the statement, and t3 and t4 are locked because they are used within the trigger:
- t1 is locked for writing per the WRITE lock request.
- t2 is locked for writing, even though the request is for a READ lock. This occurs because t2 is inserted into within the trigger, so the READ request is converted to a WRITE request.
- t 3 is locked for reading because it is only read from within the trigger.
- t4 is locked for writing because it might be updated within the trigger.

\section*{Table-Locking Restrictions and Conditions}

You can safely use KILL to terminate a session that is waiting for a table lock. See Section 15.7.8.4, "KILL Statement".

LOCK TABLES and UNLOCK TABLES cannot be used within stored programs.
Tables in the performance_schema database cannot be locked with LOCK TABLES, except the setup_xxx tables.

The scope of a lock generated by LOCK TABLES is a single MySQL server. It is not compatible with NDB Cluster, which has no way of enforcing an SQL-level lock across multiple instances of mysqld. You can enforce locking in an API application instead. See Section 25.2.7.10, "Limitations Relating to Multiple NDB Cluster Nodes", for more information.

The following statements are prohibited while a LOCK TABLES statement is in effect: CREATE TABLE, CREATE TABLE ... LIKE, CREATE VIEW, DROP VIEW, and DDL statements on stored functions and procedures and events.

For some operations, system tables in the mysql database must be accessed. For example, the HELP statement requires the contents of the server-side help tables, and CONVERT_TZ( ) might need to read the time zone tables. The server implicitly locks the system tables for reading as necessary so that you need not lock them explicitly. These tables are treated as just described:
```
mysql.help_category
mysql.help_keyword
mysql.help_relation
mysql.help_topic
mysql.time_zone
mysql.time_zone_leap_second
mysql.time_zone_name
mysql.time_zone_transition
mysql.time_zone_transition_type
```


If you want to explicitly place a WRITE lock on any of those tables with a LOCK TABLES statement, the table must be the only one locked; no other table can be locked with the same statement.

Normally, you do not need to lock tables, because all single UPDATE statements are atomic; no other session can interfere with any other currently executing SQL statement. However, there are a few cases when locking tables may provide an advantage:
- If you are going to run many operations on a set of MyISAM tables, it is much faster to lock the tables you are going to use. Locking MyISAM tables speeds up inserting, updating, or deleting on them because MySQL does not flush the key cache for the locked tables until UNLOCK TABLES is called. Normally, the key cache is flushed after each SQL statement.

The downside to locking the tables is that no session can update a READ-locked table (including the one holding the lock) and no session can access a WRITE-locked table other than the one holding the lock.
- If you are using tables for a nontransactional storage engine, you must use LOCK TABLES if you want to ensure that no other session modifies the tables between a SELECT and an UPDATE. The example shown here requires LOCK TABLES to execute safely:
```
LOCK TABLES trans READ, customer WRITE;
SELECT SUM(value) FROM trans WHERE customer_id=some_id;
UPDATE customer
    SET total_value=sum_from_previous_statement
    WHERE customer_id=some_id;
UNLOCK TABLES;
```


Without LOCK TABLES, it is possible that another session might insert a new row in the trans table between execution of the SELECT and UPDATE statements.

You can avoid using LOCK TABLES in many cases by using relative updates (UPDATE customer SET value=value+new_value) or the LAST_INSERT_ID() function.

You can also avoid locking tables in some cases by using the user-level advisory lock functions GET_LOCK( ) and RELEASE_LOCK( ). These locks are saved in a hash table in the server and implemented with pthread_mutex_lock( ) and pthread_mutex_unlock( ) for high speed. See Section 14.14, "Locking Functions".

See Section 10.11.1, "Internal Locking Methods", for more information on locking policy.

\subsection*{15.3.7 SET TRANSACTION Statement}
```
SET [GLOBAL | SESSION] TRANSACTION
    transaction_characteristic [, transaction_characteristic] ...
transaction_characteristic: {
    ISOLATION LEVEL level
    access_mode
}
level: {
        REPEATABLE READ
    | READ COMMITTED
    | READ UNCOMMITTED
    | SERIALIZABLE
}
access_mode: {
        READ WRITE
    | READ ONLY
}
```


This statement specifies transaction characteristics. It takes a list of one or more characteristic values separated by commas. Each characteristic value sets the transaction isolation level or access mode. The isolation level is used for operations on InnoDB tables. The access mode specifies whether transactions operate in read/write or read-only mode.

In addition, SET TRANSACTION can include an optional GLOBAL or SESSION keyword to indicate the scope of the statement.
- Transaction Isolation Levels
- Transaction Access Mode
- Transaction Characteristic Scope

\section*{Transaction Isolation Levels}

To set the transaction isolation level, use an ISOLATION LEVEL level clause. It is not permitted to specify multiple ISOLATION LEVEL clauses in the same SET TRANSACTION statement.

The default isolation level is REPEATABLE READ. Other permitted values are READ COMMITTED, READ UNCOMMITTED, and SERIALIZABLE. For information about these isolation levels, see Section 17.7.2.1, "Transaction Isolation Levels".

\section*{Transaction Access Mode}

To set the transaction access mode, use a READ WRITE or READ ONLY clause. It is not permitted to specify multiple access-mode clauses in the same SET TRANSACTION statement.

By default, a transaction takes place in read/write mode, with both reads and writes permitted to tables used in the transaction. This mode may be specified explicitly using SET TRANSACTION with an access mode of READ WRITE.

If the transaction access mode is set to READ ONLY, changes to tables are prohibited. This may enable storage engines to make performance improvements that are possible when writes are not permitted.

In read-only mode, it remains possible to change tables created with the TEMPORARY keyword using DML statements. Changes made with DDL statements are not permitted, just as with permanent tables.

The READ WRITE and READ ONLY access modes also may be specified for an individual transaction using the START TRANSACTION statement.

\section*{Transaction Characteristic Scope}

You can set transaction characteristics globally, for the current session, or for the next transaction only:
- With the GLOBAL keyword:
- The statement applies globally for all subsequent sessions.
- Existing sessions are unaffected.
- With the SESSION keyword:
- The statement applies to all subsequent transactions performed within the current session.
- The statement is permitted within transactions, but does not affect the current ongoing transaction.
- If executed between transactions, the statement overrides any preceding statement that sets the next-transaction value of the named characteristics.
- Without any SESSION or GLOBAL keyword:
- The statement applies only to the next single transaction performed within the session.
- Subsequent transactions revert to using the session value of the named characteristics.
- The statement is not permitted within transactions:
```
mysql> START TRANSACTION;
Query OK, 0 rows affected (0.02 sec)
mysql> SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
ERROR 1568 (25001): Transaction characteristics can't be changed
while a transaction is in progress
```


A change to global transaction characteristics requires the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege). Any session is free to change its session characteristics (even in the middle of a transaction), or the characteristics for its next transaction (prior to the start of that transaction).

To set the global isolation level at server startup, use the --transaction-isolation=level option on the command line or in an option file. Values of level for this option use dashes rather than
spaces, so the permissible values are READ-UNCOMMITTED, READ-COMMITTED, REPEATABLE-READ, or SERIALIZABLE.

Similarly, to set the global transaction access mode at server startup, use the --transaction-read-only option. The default is 0FF (read/write mode) but the value can be set to 0N for a mode of read only.

For example, to set the isolation level to REPEATABLE READ and the access mode to READ WRITE, use these lines in the [mysqld] section of an option file:
```
[mysqld]
transaction-isolation = REPEATABLE-READ
transaction-read-only = OFF
```


At runtime, characteristics at the global, session, and next-transaction scope levels can be set indirectly using the SET TRANSACTION statement, as described previously. They can also be set directly using the SET statement to assign values to the transaction_isolation and transaction_read_only system variables:
- SET TRANSACTION permits optional GLOBAL and SESSION keywords for setting transaction characteristics at different scope levels.
- The SET statement for assigning values to the transaction_isolation and transaction_read_only system variables has syntaxes for setting these variables at different scope levels.

The following tables show the characteristic scope level set by each SET TRANSACTION and variableassignment syntax.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 15.9 SET TRANSACTION Syntax for Transaction Characteristics}
\begin{tabular}{|l|l|}
\hline Syntax & Affected Characteristic Scope \\
\hline SET GLOBAL TRANSACTION transaction_characteristic & Global \\
\hline SET SESSION TRANSACTION transaction_characteristic & Session \\
\hline SET TRANSACTION transaction_characteristic & Next transaction only \\
\hline
\end{tabular}
\end{table}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 15.10 SET Syntax for Transaction Characteristics}
\begin{tabular}{|l|l|}
\hline Syntax & Affected Characteristic Scope \\
\hline SET GLOBAL var_name = value & Global \\
\hline SET @@GLOBAL.var_name = value & Global \\
\hline SET PERSIST var_name = value & Global \\
\hline SET @@PERSIST.var_name = value & Global \\
\hline SET PERSIST_ONLY var_name = value & No runtime effect \\
\hline SET @@PERSIST_ONLY.var_name = value & No runtime effect \\
\hline SET SESSION var_name = value & Session \\
\hline SET @@SESSION.var_name = value & Session \\
\hline SET var_name = value & Session \\
\hline SET @@var_name = value & Next transaction only \\
\hline
\end{tabular}
\end{table}

It is possible to check the global and session values of transaction characteristics at runtime:
```
SELECT @@GLOBAL.transaction_isolation, @@GLOBAL.transaction_read_only;
SELECT @@SESSION.transaction_isolation, @@SESSION.transaction_read_only;
```


\subsection*{15.3.8 XA Transactions}

Support for XA transactions is available for the InnoDB storage engine. The MySQL XA implementation is based on the X/Open CAE document Distributed Transaction Processing: The XA Specification. This document is published by The Open Group and available at http:// www.opengroup.org/public/pubs/catalog/c193.htm. Limitations of the current XA implementation are described in Section 15.3.8.3, "Restrictions on XA Transactions".

On the client side, there are no special requirements. The XA interface to a MySQL server consists of SQL statements that begin with the XA keyword. MySQL client programs must be able to send SQL statements and to understand the semantics of the XA statement interface. They do not need be linked against a recent client library. Older client libraries also work.

Among the MySQL Connectors, MySQL Connector/J 5.0.0 and higher supports XA directly, by means of a class interface that handles the XA SQL statement interface for you.

XA supports distributed transactions, that is, the ability to permit multiple separate transactional resources to participate in a global transaction. Transactional resources often are RDBMSs but may be other kinds of resources.

A global transaction involves several actions that are transactional in themselves, but that all must either complete successfully as a group, or all be rolled back as a group. In essence, this extends ACID properties "up a level" so that multiple ACID transactions can be executed in concert as components of a global operation that also has ACID properties. (As with nondistributed transactions, SERIALIZABLE may be preferred if your applications are sensitive to read phenomena. REPEATABLE READ may not be sufficient for distributed transactions.)

Some examples of distributed transactions:
- An application may act as an integration tool that combines a messaging service with an RDBMS. The application makes sure that transactions dealing with message sending, retrieval, and processing that also involve a transactional database all happen in a global transaction. You can think of this as "transactional email."
- An application performs actions that involve different database servers, such as a MySQL server and an Oracle server (or multiple MySQL servers), where actions that involve multiple servers must happen as part of a global transaction, rather than as separate transactions local to each server.
- A bank keeps account information in an RDBMS and distributes and receives money through automated teller machines (ATMs). It is necessary to ensure that ATM actions are correctly reflected in the accounts, but this cannot be done with the RDBMS alone. A global transaction manager integrates the ATM and database resources to ensure overall consistency of financial transactions.

Applications that use global transactions involve one or more Resource Managers and a Transaction Manager:
- A Resource Manager (RM) provides access to transactional resources. A database server is one kind of resource manager. It must be possible to either commit or roll back transactions managed by the RM.
- A Transaction Manager (TM) coordinates the transactions that are part of a global transaction. It communicates with the RMs that handle each of these transactions. The individual transactions within a global transaction are "branches" of the global transaction. Global transactions and their branches are identified by a naming scheme described later.

The MySQL implementation of XA enables a MySQL server to act as a Resource Manager that handles XA transactions within a global transaction. A client program that connects to the MySQL server acts as the Transaction Manager.

To carry out a global transaction, it is necessary to know which components are involved, and bring each component to a point when it can be committed or rolled back. Depending on what each
component reports about its ability to succeed, they must all commit or roll back as an atomic group. That is, either all components must commit, or all components must roll back. To manage a global transaction, it is necessary to take into account that any component or the connecting network might fail.

The process for executing a global transaction uses two-phase commit (2PC). This takes place after the actions performed by the branches of the global transaction have been executed.
1. In the first phase, all branches are prepared. That is, they are told by the TM to get ready to commit. Typically, this means each RM that manages a branch records the actions for the branch in stable storage. The branches indicate whether they are able to do this, and these results are used for the second phase.
2. In the second phase, the TM tells the RMs whether to commit or roll back. If all branches indicated when they were prepared that they were able to commit, all branches are told to commit. If any branch indicated when it was prepared that it was not able to commit, all branches are told to roll back.

In some cases, a global transaction might use one-phase commit (1PC). For example, when a Transaction Manager finds that a global transaction consists of only one transactional resource (that is, a single branch), that resource can be told to prepare and commit at the same time.

\subsection*{15.3.8.1 XA Transaction SQL Statements}

To perform XA transactions in MySQL, use the following statements:
```
XA {START|BEGIN} xid [JOIN|RESUME]
XA END xid [SUSPEND [FOR MIGRATE]]
XA PREPARE xid
XA COMMIT xid [ONE PHASE]
XA ROLLBACK xid
XA RECOVER [CONVERT XID]
```


For XA START, the JOIN and RESUME clauses are recognized but have no effect.
For XA END the SUSPEND [FOR MIGRATE] clause is recognized but has no effect.
Each XA statement begins with the XA keyword, and most of them require an xid value. An xid is an XA transaction identifier. It indicates which transaction the statement applies to. xid values are supplied by the client, or generated by the MySQL server. An xid value has from one to three parts:
```
xid: gtrid [, bqual [, formatID ]]
```

$g t r i d$ is a global transaction identifier, bqual is a branch qualifier, and formatID is a number that identifies the format used by the gtrid and bqual values. As indicated by the syntax, bqual and formatID are optional. The default bqual value is ' ' if not given. The default formatID value is 1 if not given.
gtrid and bqual must be string literals, each up to 64 bytes (not characters) long. gtrid and bqual can be specified in several ways. You can use a quoted string ( ' ab ' ), hex string ( $\mathrm{X}^{\prime} 6162$ ' , 0x6162), or bit value ( $\mathrm{b}^{\prime} n n n n^{\prime}$ ).
formatID is an unsigned integer.
The gtrid and bqual values are interpreted in bytes by the MySQL server's underlying XA support routines. However, while an SQL statement containing an XA statement is being parsed, the server works with some specific character set. To be safe, write gtrid and bqual as hex strings.
xid values typically are generated by the Transaction Manager. Values generated by one TM must be different from values generated by other TMs. A given TM must be able to recognize its own xid values in a list of values returned by the XA RECOVER statement.

XA START xid starts an XA transaction with the given xid value. Each XA transaction must have a unique xid value, so the value must not currently be used by another XA transaction. Uniqueness is assessed using the gtrid and bqual values. All following XA statements for the XA transaction must be specified using the same xid value as that given in the XA START statement. If you use any of those statements but specify an xid value that does not correspond to some existing XA transaction, an error occurs.

XA START, XA BEGIN, XA END, XA COMMIT, and XA ROLLBACK statements are not filtered by the default database when the server is running with --replicate-do-db or--replicate-ignoredb .

One or more XA transactions can be part of the same global transaction. All XA transactions within a given global transaction must use the same $g$ trid value in the xid value. For this reason, gtrid values must be globally unique so that there is no ambiguity about which global transaction a given XA transaction is part of. The bqual part of the xid value must be different for each XA transaction within a global transaction. (The requirement that bqual values be different is a limitation of the current MySQL XA implementation. It is not part of the XA specification.)

The XA RECOVER statement returns information for those XA transactions on the MySQL server that are in the PREPARED state. (See Section 15.3.8.2, "XA Transaction States".) The output includes a row for each such XA transaction on the server, regardless of which client started it.

XA RECOVER requires the XA_RECOVER_ADMIN privilege. This privilege requirement prevents users from discovering the XID values for outstanding prepared XA transactions other than their own. It does not affect normal commit or rollback of an XA transaction because the user who started it knows its XID.

XA RECOVER output rows look like this (for an example xid value consisting of the parts ' abc ', 'def', and 7):
```
mysql> XA RECOVER;
+-----------+---------------+--------------+--------+
| formatID | gtrid_length | bqual_length | data |
+-----------+---------------+--------------+--------+
| 7 | 3 | 3 | abcdef |
+-----------+---------------+--------------+--------+
```


The output columns have the following meanings:
- formatID is the formatID part of the transaction xid
- gtrid_length is the length in bytes of the gtrid part of the xid
- bqual_length is the length in bytes of the bqual part of the xid
- data is the concatenation of the gtrid and bqual parts of the xid

XID values may contain nonprintable characters. XA RECOVER permits an optional CONVERT XID clause so that clients can request XID values in hexadecimal.

\subsection*{15.3.8.2 XA Transaction States}

An XA transaction progresses through the following states:
1. Use XA START to start an XA transaction and put it in the ACTIVE state.
2. For an ACTIVE XA transaction, issue the SQL statements that make up the transaction, and then issue an XA END statement. XA END puts the transaction in the IDLE state.
3. For an IDLE XA transaction, you can issue either an XA PREPARE statement or an XA COMMIT ... ONE PHASE statement:
- XA PREPARE puts the transaction in the PREPARED state. An XA RECOVER statement at this point includes the transaction's xid value in its output, because XA RECOVER lists all XA transactions that are in the PREPARED state.
- XA COMMIT ... ONE PHASE prepares and commits the transaction. The xid value is not listed by XA RECOVER because the transaction terminates.
4. For a PREPARED XA transaction, you can issue an XA COMMIT statement to commit and terminate the transaction, or XA ROLLBACK to roll back and terminate the transaction.

Here is a simple XA transaction that inserts a row into a table as part of a global transaction:
```
mysql> XA START 'xatest';
Query OK, 0 rows affected (0.00 sec)
mysql> INSERT INTO mytable (i) VALUES(10);
Query OK, 1 row affected (0.04 sec)
mysql> XA END 'xatest';
Query OK, 0 rows affected (0.00 sec)
mysql> XA PREPARE 'xatest';
Query OK, 0 rows affected (0.00 sec)
mysql> XA COMMIT 'xatest';
Query OK, 0 rows affected (0.00 sec)
```


MySQL 8.4 supports detached XA transactions, enabled by the xa_detach_on_prepare system variable (ON by default). Detached transactions are disconnected from the current session following execution of XA PREPARE (and can be committed or rolled back by another connection). This means that the current session is free to start a new local transaction or XA transaction without having to wait for the prepared XA transaction to be committed or rolled back.

When XA transactions are detached, a connection has no special knowledge of any XA transaction that it has prepared. If the current session tries to commit or roll back a given XA transaction (even one which it prepared) after another connection has already done so, the attempt is rejected with an invalid XID error (ER_XAER_NOTA) since the requested xid no longer exists.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2743.jpg?height=124&width=99&top_left_y=1784&top_left_x=370)

Note
Detached XA transactions cannot use temporary tables.

When detached XA transactions are disabled (xa_detach_on_prepare set to 0FF), an XA transaction remains connected until it is committed or rolled back by the originating connection. Disabling detached XA transactions is not recommended for a MySQL server instance used in group replication; see Server Instance Configuration, for more information.

If an XA transaction is in the ACTIVE state, you cannot issue any statements that cause an implicit commit. That would violate the XA contract because you could not roll back the XA transaction. Trying to execute such a statement raises the following error:
```
ERROR 1399 (XAE07): XAER_RMFAIL: The command cannot be executed
when global transaction is in the ACTIVE state
```


Statements to which the preceding remark applies are listed at Section 15.3.3, "Statements That Cause an Implicit Commit".

\subsection*{15.3.8.3 Restrictions on XA Transactions}

XA transaction support is limited to the InnoDB storage engine.

For "external XA," a MySQL server acts as a Resource Manager and client programs act as Transaction Managers. For "Internal XA", storage engines within a MySQL server act as RMs, and the server itself acts as a TM. Internal XA support is limited by the capabilities of individual storage engines. Internal XA is required for handling XA transactions that involve more than one storage engine. The implementation of internal XA requires that a storage engine support two-phase commit at the table handler level, and currently this is true only for InnodB.

For XA START, the JOIN and RESUME clauses are recognized but have no effect.
For XA END the SUSPEND [FOR MIGRATE] clause is recognized but has no effect.
The requirement that the bqual part of the xid value be different for each XA transaction within a global transaction is a limitation of the current MySQL XA implementation. It is not part of the XA specification.

An XA transaction is written to the binary log in two parts. When XA PREPARE is issued, the first part of the transaction up to XA PREPARE is written using an initial GTID. A XA_prepare_log_event is used to identify such transactions in the binary log. When XA COMMIT or XA ROLLBACK is issued, a second part of the transaction containing only the XA COMMIT or XA ROLLBACK statement is written using a second GTID. Note that the initial part of the transaction, identified by XA_prepare_log_event, is not necessarily followed by its XA COMMIT or XA ROLLBACK, which can cause interleaved binary logging of any two XA transactions. The two parts of the XA transaction can even appear in different binary log files. This means that an XA transaction in PREPARED state is now persistent until an explicit XA COMMIT or XA ROLLBACK statement is issued, ensuring that XA transactions are compatible with replication.

On a replica, immediately after the XA transaction is prepared, it is detached from the replication applier thread, and can be committed or rolled back by any thread on the replica. This means that the same XA transaction can appear in the events_transactions_current table with different states on different threads. The events_transactions_current table displays the current status of the most recent monitored transaction event on the thread, and does not update this status when the thread is idle. So the XA transaction can still be displayed in the PREPARED state for the original applier thread, after it has been processed by another thread. To positively identify XA transactions that are still in the PREPARED state and need to be recovered, use the XA RECOVER statement rather than the Performance Schema transaction tables.

The following restrictions exist for using XA transactions:
- The use of replication filters or binary log filters in combination with XA transactions is not supported. Filtering of tables could cause an XA transaction to be empty on a replica, and empty XA transactions are not supported. Also, with the replica's connection metadata repository and applier metadata repository stored in InnoDB tables (the default), the internal state of the data engine transaction is changed following a filtered XA transaction, and can become inconsistent with the replication transaction context state.

The error ER_XA_REPLICATION_FILTERS is logged whenever an XA transaction is impacted by a replication filter, whether or not the transaction was empty as a result. If the transaction is not empty, the replica is able to continue running, but you should take steps to discontinue the use of replication filters with XA transactions in order to avoid potential issues. If the transaction is empty, the replica stops. In that event, the replica might be in an undetermined state in which the consistency of the replication process might be compromised. In particular, the gtid_executed set on a replica of the replica might be inconsistent with that on the source. To resolve this situation, isolate the source and stop all replication, then check GTID consistency across the replication topology. Undo the XA transaction that generated the error message, then restart replication.
- XA transactions are considered unsafe for statement-based replication. If two XA transactions committed in parallel on the source are being prepared on the replica in the inverse order, locking dependencies can occur that cannot be safely resolved, and it is possible for replication to fail with deadlock on the replica. This situation can occur for a single-threaded or multithreaded replica. When binlog_format=STATEMENT is set, a warning is issued for DML statements inside XA
transactions. When binlog_format=MIXED or binlog_format=ROW is set, DML statements inside XA transactions are logged using row-based replication, and the potential issue is not present.
- You should be aware that, when the same transaction XID is used to execute XA transactions sequentially and a break occurs during the processing of XA COMMIT ... ONE PHASE, it may no longer be possible to synchronize the state between the binary log and the storage engine. This can occur if the series of events just described takes place after this transaction has been prepared in the storage engine, while the XA COMMIT statement is still executing. This is a known issue.

\subsection*{15.4 Replication Statements}

Replication can be controlled through the SQL interface using the statements described in this section. Statements are split into a group which controls source servers, a group which controls replica servers, and a group which can be applied to any replication servers.

\subsection*{15.4.1 SQL Statements for Controlling Source Servers}

This section discusses statements for managing replication source servers. Section 15.4.2, "SQL Statements for Controlling Replica Servers", discusses statements for managing replica servers.

In addition to the statements described here, the following SHOW statements are used with source servers in replication. For information about these statements, see Section 15.7.7, "SHOW Statements".
- SHOW BINARY LOGS
- SHOW BINLOG EVENTS
- SHOW BINARY LOG STATUS (replaces SHOW MASTER STATUS, which is no longer supported)
- SHOW REPLICAS

\subsection*{15.4.1.1 PURGE BINARY LOGS Statement}
```
PURGE BINARY LOGS {
        TO 'log_name'
    | BEFORE datetime_expr
}
```


The binary log is a set of files that contain information about data modifications made by the MySQL server. The log consists of a set of binary log files, plus an index file (see Section 7.4.4, "The Binary Log").

The PURGE BINARY LOGS statement deletes all the binary log files listed in the log index file prior to the specified log file name or date. Deleted log files also are removed from the list recorded in the index file, so that the given log file becomes the first in the list.

PURGE BINARY LOGS requires the BINLOG_ADMIN privilege. This statement has no effect if the server was not started with the --log-bin option to enable binary logging.

Examples:
```
PURGE BINARY LOGS TO 'mysql-bin.010';
PURGE BINARY LOGS BEFORE '2019-04-02 22:46:26';
```


The BEFORE variant's datetime_expr argument should evaluate to a DATETIME value (a value in ${ }^{\prime}$ YYYY-MM-DD hh:mm:ss' format).

PURGE BINARY LOGS is safe to run while replicas are replicating. You need not stop them. If you have an active replica that currently is reading one of the log files you are trying to delete, this statement does not delete the log file that is in use or any log files later than that one, but it deletes any earlier
log files. A warning message is issued in this situation. However, if a replica is not connected and you happen to purge one of the log files it has yet to read, the replica cannot replicate after it reconnects.

PURGE BINARY LOGS cannot be issued while a LOCK INSTANCE FOR BACKUP statement is in effect for the instance, because it contravenes the rules of the backup lock by removing files from the server.

To safely purge binary log files, follow this procedure:
1. On each replica, use SHOW REPLICA STATUS to check which log file it is reading.
2. Obtain a listing of the binary log files on the source with SHOW BINARY LOGS.
3. Determine the earliest log file among all the replicas. This is the target file. If all the replicas are up to date, this is the last log file on the list.
4. Make a backup of all the log files you are about to delete. (This step is optional, but always advisable.)
5. Purge all log files up to but not including the target file.

PURGE BINARY LOGS TO and PURGE BINARY LOGS BEFORE both fail with an error when binary log files listed in the .index file had been removed from the system by some other means (such as using rm on Linux). (Bug \#18199, Bug \#18453) To handle such errors, edit the .index file (which is a simple text file) manually to ensure that it lists only the binary log files that are actually present, then run again the PURGE BINARY LOGS statement that failed.

Binary log files are automatically removed after the server's binary log expiration period. Removal of the files can take place at startup and when the binary log is flushed. The default binary log expiration period is 30 days. You can specify an alternative expiration period using the binlog_expire_logs_seconds system variable. If you are using replication, you should specify an expiration period that is no lower than the maximum amount of time your replicas might lag behind the source.

\subsection*{15.4.1.2 RESET BINARY LOGS AND GTIDS Statement}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2746.jpg?height=127&width=99&top_left_y=1635&top_left_x=306)

\section*{Note}

This statement takes the place of the old RESET MASTER statement, which is no longer supported.

RESET BINARY LOGS AND GTIDS [TO binary_log_file_index_number]

\section*{Warning}

Use this statement with caution to ensure you do not lose any wanted binary log file data and GTID execution history.

RESET BINARY LOGS AND GTIDS requires the RELOAD privilege.
For a server where binary logging is enabled (log_bin is ON), RESET BINARY LOGS AND GTIDS deletes all existing binary log files and resets the binary log index file, resetting the server to its state before binary logging was started. A new empty binary log file is created so that binary logging can be restarted.

For a server where GTIDs are in use (gtid_mode is ON), issuing RESET BINARY LOGS AND GTIDS resets the GTID execution history. The value of the gtid_purged system variable is set to an empty string ( ' ' ), the global value (but not the session value) of the gtid_executed system variable is set to an empty string, and the mysql.gtid_executed table is cleared (see mysql.gtid_executed Table). If the GTID-enabled server has binary logging enabled, RESET BINARY LOGS AND GTIDS also resets the binary log as described above. Note that RESET BINARY LOGS AND GTIDS is the method to reset the GTID execution history even if the GTID-enabled server is a replica where binary logging
is disabled; RESET REPLICA has no effect on the GTID execution history. For more information on resetting the GTID execution history, see Resetting the GTID Execution History.

Issuing RESET BINARY LOGS AND GTIDS without the optional TO clause deletes all binary log files listed in the index file, resets the binary log index file to be empty, and creates a new binary log file starting at 1 . Use the optional T0 clause to start the binary log file index from a number other than 1 after the reset.

Check that you are using a reasonable value for the index number. If you enter an incorrect value, you can correct this by issuing another RESET BINARY LOGS AND GTIDS statement with or without the T0 clause. If you do not correct a value that is out of range, the server cannot be restarted.

The following example demonstrates TO clause usage:
```
RESET BINARY LOGS AND GTIDS TO 1234;
SHOW BINARY LOGS;
+--------------------+-----------+-----------+
| Log_name | File_size | Encrypted
+--------------------+-----------+-----------+
| source-bin.001234 | 154 | No |
+--------------------+-----------+-----------+
```


\section*{Important}

The effects of RESET BINARY LOGS AND GTIDS without the TO clause differ from those of PURGE BINARY LOGS in 2 key ways:
1. RESET BINARY LOGS AND GTIDS removes all binary log files that are listed in the index file, leaving only a single, empty binary log file with a numeric suffix of. 000001 , whereas the numbering is not reset by PURGE BINARY LOGS.
2. RESET BINARY LOGS AND GTIDS is not intended to be used while any replicas are running. The behavior of RESET BINARY LOGS AND GTIDS when used while replicas are running is undefined (and thus unsupported), whereas PURGE BINARY LOGS may be safely used while replicas are running.

See also Section 15.4.1.1, "PURGE BINARY LOGS Statement".
RESET BINARY LOGS AND GTIDS without the TO clause can prove useful when you first set up a source and replica, so that you can verify the setup as follows:
1. Start the source and replica, and start replication (see Section 19.1.2, "Setting Up Binary Log File Position Based Replication").
2. Execute a few test queries on the source.
3. Check that the queries were replicated to the replica.
4. When replication is running correctly, issue STOP REPLICA followed by RESET REPLICA (both on the replica), then verify that no unwanted data from the test queries exists on the replica. Following this, issue RESET BINARY LOGS AND GTIDS (also on the replica) to remove binary logs and and associated transaction IDs.
5. Remove the unwanted data from the source, then issue RESET BINARY LOGS AND GTIDS to purge any binary log entries and identifiers associated with it.

After verifying the setup, resetting the source and replica and ensuring that no unwanted data or binary log files generated by testing remain on the source or replica, you can start the replica and begin replicating.

\subsection*{15.4.1.3 SET sql_log_bin Statement}

SET sql_log_bin = \{OFF|ON\}
The sql_log_bin variable controls whether logging to the binary log is enabled for the current session (assuming that the binary log itself is enabled). The default value is ON. To disable or enable binary logging for the current session, set the session sql_log_bin variable to OFF or ON.

Set this variable to OFF for a session to temporarily disable binary logging while making changes to the source that you do not want replicated to the replica.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".

It is not possible to set the session value of sql_log_bin within a transaction or subquery.
Setting this variable to OFF prevents new GTIDs from being assigned to transactions in the binary log. If you are using GTIDs for replication, this means that even when binary logging is later enabled again, the GTIDs written into the log from this point do not account for any transactions that occurred in the meantime, so in effect those transactions are lost.
mysqldump adds a SET @@SESSION.sql_log_bin=0 statement to a dump file from a server where GTIDs are in use, which disables binary logging while the dump file is being reloaded. The statement prevents new GTIDs from being generated and assigned to the transactions in the dump file as they are executed, so that the original GTIDs for the transactions are used.

\subsection*{15.4.2 SQL Statements for Controlling Replica Servers}

This section discusses statements for managing replica servers. Section 15.4.1, "SQL Statements for Controlling Source Servers", discusses statements for managing source servers.

In addition to the statements described here, SHOW REPLICA STATUS and SHOW RELAYLOG EVENTS are also used with replicas. For information about these statements, see Section 15.7.7.35, "SHOW REPLICA STATUS Statement", and Section 15.7.7.34, "SHOW RELAYLOG EVENTS Statement".

\subsection*{15.4.2.1 CHANGE REPLICATION FILTER Statement}
```
CHANGE REPLICATION FILTER filter[, filter]
    [, ...] [FOR CHANNEL channel]
filter: {
        REPLICATE_DO_DB = (db_list)
    | REPLICATE_IGNORE_DB = (db_list)
    | REPLICATE_DO_TABLE = (tbl_list)
    | REPLICATE_IGNORE_TABLE = (tbl_list)
    | REPLICATE_WILD_DO_TABLE = (wild_tbl_list)
    | REPLICATE_WILD_IGNORE_TABLE = (wild_tbl_list)
    | REPLICATE_REWRITE_DB = (db_pair_list)
}
db_list:
        db_name[, db_name][, ...]
tbl_list:
        db_name.table_name[, db_name.table_name][, ...]
wild_tbl_list:
        'db_pattern.table_pattern'[, 'db_pattern.table_pattern'][, ...]
db_pair_list:
        (db_pair)[, (db_pair)][, ...]
db_pair:
        from_db, to_db
```


CHANGE REPLICATION FILTER sets one or more replication filtering rules on the replica in the same way as starting the replica mysqld with replication filtering options such as --replicate-do-db or --replicate-wild-ignore-table. Filters set using this statement differ from those set using the server options in two key respects:
1. The statement does not require restarting the server to take effect, only that the replication SQL thread be stopped using STOP REPLICA SQL_THREAD first (and restarted with START REPLICA SQL_THREAD afterwards).
2. The effects of the statement are not persistent; any filters set using CHANGE REPLICATION FILTER are lost following a restart of the replica mysqld.

CHANGE REPLICATION FILTER requires the REPLICATION_SLAVE_ADMIN privilege (or the deprecated SUPER privilege).

Use the FOR CHANNEL channel clause to make a replication filter specific to a replication channel, for example on a multi-source replica. Filters applied without a specific FOR CHANNEL clause are considered global filters, meaning that they are applied to all replication channels.

\section*{Note}

Global replication filters cannot be set on a MySQL server instance that is configured for Group Replication, because filtering transactions on some servers would make the group unable to reach agreement on a consistent state. Channel specific replication filters can be set on replication channels that are not directly involved with Group Replication, such as where a group member also acts as a replica to a source that is outside the group. They cannot be set on the group_replication_applier or group_replication_recovery channels.

The following list shows the CHANGE REPLICATION FILTER options and how they relate to replicate - * server options:
- REPLICATE_DO_DB: Include updates based on database name. Equivalent to - -replicate-dodb.
- REPLICATE_IGNORE_DB: Exclude updates based on database name. Equivalent to - -replicate-ignore-db.
- REPLICATE_DO_TABLE: Include updates based on table name. Equivalent to - -replicate-dotable.
- REPLICATE_IGNORE_TABLE: Exclude updates based on table name. Equivalent to - -replicate-ignore-table.
- REPLICATE_WILD_DO_TABLE: Include updates based on wildcard pattern matching table name. Equivalent to --replicate-wild-do-table.
- REPLICATE_WILD_IGNORE_TABLE: Exclude updates based on wildcard pattern matching table name. Equivalent to --replicate-wild-ignore-table.
- REPLICATE_REWRITE_DB: Perform updates on replica after substituting new name on replica for specified database on source. Equivalent to --replicate-rewrite-db.

The precise effects of REPLICATE_DO_DB and REPLICATE_IGNORE_DB filters are dependent on whether statement-based or row-based replication is in effect. See Section 19.2.5, "How Servers Evaluate Replication Filtering Rules", for more information.

Multiple replication filtering rules can be created in a single CHANGE REPLICATION FILTER statement by separating the rules with commas, as shown here:
```
REPLICATE_DO_DB = (d1), REPLICATE_IGNORE_DB = (d2);
```


Issuing the statement just shown is equivalent to starting the replica mysqld with the options - -replicate-do-db=d1--replicate-ignore-db=d2.

On a multi-source replica, which uses multiple replication channels to process transaction from different sources, use the FOR CHANNEL channel clause to set a replication filter on a replication channel:
```
CHANGE REPLICATION FILTER REPLICATE_DO_DB = (d1) FOR CHANNEL channel_1;
```


This enables you to create a channel specific replication filter to filter out selected data from a source. When a FOR CHANNEL clause is provided, the replication filter statement acts on that replication channel, removing any existing replication filter which has the same filter type as the specified replication filters, and replacing them with the specified filter. Filter types not explicitly listed in the statement are not modified. If issued against a replication channel which is not configured, the statement fails with an ER_SLAVE_CONFIGURATION error. If issued against Group Replication channels, the statement fails with an ER_SLAVE_CHANNEL_OPERATION_NOT_ALLOWED error.

On a replica with multiple replication channels configured, issuing CHANGE REPLICATION FILTER with no FOR CHANNEL clause configures the replication filter for every configured replication channel, and for the global replication filters. For every filter type, if the filter type is listed in the statement, then any existing filter rules of that type are replaced by the filter rules specified in the most recently issued statement, otherwise the old value of the filter type is retained. For more information see Section 19.2.5.4, "Replication Channel Based Filters".

If the same filtering rule is specified multiple times, only the last such rule is actually used. For example, the two statements shown here have exactly the same effect, because the first REPLICATE_DO_DB rule in the first statement is ignored:
```
CHANGE REPLICATION FILTER
    REPLICATE_DO_DB = (db1, db2), REPLICATE_DO_DB = (db3, db4);
CHANGE REPLICATION FILTER
    REPLICATE_DO_DB = (db3, db4);
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2750.jpg?height=103&width=110&top_left_y=1599&top_left_x=299)

\section*{Caution}

This behavior differs from that of the - - replicate - * filter options where specifying the same option multiple times causes the creation of multiple filter rules.

Names of tables and database not containing any special characters need not be quoted. Values used with REPLICATION_WILD_TABLE and REPLICATION_WILD_IGNORE_TABLE are string expressions, possibly containing (special) wildcard characters, and so must be quoted. This is shown in the following example statements:
```
CHANGE REPLICATION FILTER
    REPLICATE_WILD_DO_TABLE = ('db1.old%');
CHANGE REPLICATION FILTER
    REPLICATE_WILD_IGNORE_TABLE = ('db1.new%', 'db2.new%');
```


Values used with REPLICATE_REWRITE_DB represent pairs of database names; each such value must be enclosed in parentheses. The following statement rewrites statements occurring on database db 1 on the source to database db 2 on the replica:

CHANGE REPLICATION FILTER REPLICATE_REWRITE_DB = ((db1, db2));
The statement just shown contains two sets of parentheses, one enclosing the pair of database names, and the other enclosing the entire list. This is perhaps more easily seen in the following example, which creates two rewrite-db rules, one rewriting database dbA to dbB , and one rewriting database dbC to dbD:
```
REPLICATE_REWRITE_DB = ((dbA, dbB), (dbC, dbD));
```


The CHANGE REPLICATION FILTER statement replaces replication filtering rules only for the filter types and replication channels affected by the statement, and leaves other rules and channels unchanged. If you want to unset all filters of a given type, set the filter's value to an explicitly empty list, as shown in this example, which removes all existing REPLICATE_DO_DB and REPLICATE_IGNORE_DB rules:
```
CHANGE REPLICATION FILTER
    REPLICATE_DO_DB = (), REPLICATE_IGNORE_DB = ();
```


Setting a filter to empty in this way removes all existing rules, does not create any new ones, and does not restore any rules set at mysqld startup using - - replicate - * options on the command line or in the configuration file.

The RESET REPLICA ALL statement removes channel specific replication filters that were set on channels deleted by the statement. When the deleted channel or channels are recreated, any global replication filters specified for the replica are copied to them, and no channel specific replication filters are applied.

For more information, see Section 19.2.5, "How Servers Evaluate Replication Filtering Rules".

\subsection*{15.4.2.2 CHANGE REPLICATION SOURCE TO Statement}
```
CHANGE REPLICATION SOURCE TO option [, option] ... [ channel_option ]
option: {
        SOURCE_BIND = 'interface_name'
    | SOURCE_HOST = 'host_name'
    | SOURCE_USER = 'user_name'
    | SOURCE_PASSWORD = 'password'
    | SOURCE_PORT = port_num
    | PRIVILEGE_CHECKS_USER = {NULL | 'account'}
    | REQUIRE_ROW_FORMAT = {0|1}
    | REQUIRE_TABLE_PRIMARY_KEY_CHECK = {STREAM | ON | OFF | GENERATE}
    | ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS = {OFF | LOCAL | uuid}
    | SOURCE_LOG_FILE = 'source_log_name'
    | SOURCE_LOG_POS = source_log_pos
    | SOURCE_AUTO_POSITION = {0|1}
    | RELAY_LOG_FILE = 'relay_log_name'
    | RELAY_LOG_POS = relay_log_pos
    | SOURCE_HEARTBEAT_PERIOD = interval
    | SOURCE_CONNECT_RETRY = interval
    | SOURCE_RETRY_COUNT = count
    | SOURCE_CONNECTION_AUTO_FAILOVER = {0|1}
    | SOURCE_DELAY = interval
    | SOURCE_COMPRESSION_ALGORITHMS = 'algorithm[,algorithm][,algorithm]'
    | SOURCE_ZSTD_COMPRESSION_LEVEL = level
    | SOURCE_SSL = {0|1}
    | SOURCE_SSL_CA = 'ca_file_name'
    | SOURCE_SSL_CAPATH = 'ca_directory_name'
    | SOURCE_SSL_CERT = 'cert_file_name'
    | SOURCE_SSL_CRL = 'crl_file_name'
    | SOURCE_SSL_CRLPATH = 'crl_directory_name'
    | SOURCE_SSL_KEY = 'key_file_name'
    | SOURCE_SSL_CIPHER = 'cipher_list'
    | SOURCE_SSL_VERIFY_SERVER_CERT = {0|1}
    | SOURCE_TLS_VERSION = 'protocol_list'
    | SOURCE_TLS_CIPHERSUITES = 'ciphersuite_list'
    | SOURCE_PUBLIC_KEY_PATH = 'key_file_name'
    | GET_SOURCE_PUBLIC_KEY = {0|1}
    | NETWORK_NAMESPACE = 'namespace'
    | IGNORE_SERVER_IDS = (server_id_list),
    | GTID_ONLY = {0|1}
}
channel_option:
        FOR CHANNEL channel
```

```
server_id_list:
    [server_id [, server_id] ... ]
```


CHANGE REPLICATION SOURCE TO changes the parameters that the replica server uses for connecting to the source and reading data from the source. It also updates the contents of the replication metadata repositories (see Section 19.2.4, "Relay Log and Replication Metadata Repositories").

CHANGE REPLICATION SOURCE TO requires the REPLICATION_SLAVE_ADMIN privilege (or the deprecated SUPER privilege).

Options that you do not specify on a CHANGE REPLICATION SOURCE TO statement retain their value, except as indicated in the following discussion. In most cases, there is therefore no need to specify options that do not change.

Values used for SOURCE_HOST and other CHANGE REPLICATION SOURCE TO options are checked for linefeed ( $\backslash n$ or 0 x 0 A ) characters. The presence of such characters in these values causes the statement to fail with an error.

The optional FOR CHANNEL channel clause lets you name which replication channel the statement applies to. Providing a FOR CHANNEL channel clause applies the CHANGE REPLICATION SOURCE T0 statement to a specific replication channel, and is used to add a new channel or modify an existing channel. For example, to add a new channel called channel2:

CHANGE REPLICATION SOURCE TO SOURCE_HOST=host1, SOURCE_PORT=3002 FOR CHANNEL 'channel2';
If no clause is named and no extra channels exist, a CHANGE REPLICATION SOURCE TO statement applies to the default channel, whose name is the empty string ("''). When you have set up multiple replication channels, every CHANGE REPLICATION SOURCE TO statement must name a channel using the FOR CHANNEL channel clause. See Section 19.2.2, "Replication Channels" for more information.

For some of the options of the CHANGE REPLICATION SOURCE TO statement, you must issue a STOP REPLICA statement prior to issuing a CHANGE REPLICATION SOURCE TO statement (and a START REPLICA statement afterwards). Sometimes, you only need to stop the replication SQL (applier) thread or the replication I/O (receiver) thread, not both:
- When the applier thread is stopped, you can execute CHANGE REPLICATION SOURCE TO using any combination that is otherwise allowed of RELAY_LOG_FILE, RELAY_LOG_POS, and SOURCE_DELAY options, even if the replication receiver thread is running. No other options may be used with this statement when the receiver thread is running.
- When the receiver thread is stopped, you can execute CHANGE REPLICATION SOURCE TO using any of the options for this statement (in any allowed combination) except RELAY_LOG_FILE, RELAY_LOG_POS, SOURCE_DELAY, or SOURCE_AUTO_POSITION = 1 even when the applier thread is running.
- Both the receiver thread and the applier thread must be stopped before issuing a CHANGE REPLICATION SOURCE TO statement that employs SOURCE_AUTO_POSITION $=1$, GTID_ONLY $=1$, or ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS.

You can check the current state of the replication applier thread and replication receiver thread using SHOW REPLICA STATUS. Note that the Group Replication applier channel (group_replication_applier) has no receiver thread, only an applier thread.

CHANGE REPLICATION SOURCE TO statements have a number of side-effects and interactions that you should be aware of beforehand:
- CHANGE REPLICATION SOURCE TO causes an implicit commit of an ongoing transaction. See Section 15.3.3, "Statements That Cause an Implicit Commit".
- CHANGE REPLICATION SOURCE TO causes the previous values for SOURCE_HOST, SOURCE_PORT, SOURCE_LOG_FILE, and SOURCE_LOG_POS to be written to the error log, along with other information about the replica's state prior to execution.
- If you are using statement-based replication and temporary tables, it is possible for a CHANGE REPLICATION SOURCE TO statement following a STOP REPLICA statement to leave behind temporary tables on the replica. A warning (ER_WARN_OPEN_TEMP_TABLES_MUST_BE_ZERO) is issued whenever this occurs. You can avoid this in such cases by making sure that the value of the Replica_open_temp_tables system status variable is equal to 0 prior to executing such a CHANGE REPLICATION SOURCE TO statement.
- When using a multithreaded replica (replica_parallel_workers $>0$ ), stopping the replica can cause gaps in the sequence of transactions that have been executed from the relay log, regardless of whether the replica was stopped intentionally or otherwise. In MySQL 8.4, these can be resolved using GTID auto-positioning.

The following options are available for CHANGE REPLICATION SOURCE TO statements:
- ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS = \{OFF | LOCAL | uuid\}

Makes the replication channel assign a GTID to replicated transactions that do not have one, enabling replication from a source that does not use GTID-based replication, to a replica that does. For a multi-source replica, you can have a mix of channels that use ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS, and channels that do not. The default is OFF, meaning that the feature is not used.

LOCAL assigns a GTID including the replica's own UUID (the server_uuid setting). uuid assigns a GTID including the specified UUID, such as the server_uuid setting for the replication source server. Using a nonlocal UUID lets you differentiate between transactions that originated on the replica and transactions that originated on the source, and for a multi-source replica, between transactions that originated on different sources. The UUID you choose only has significance for the replica's own use. If any of the transactions sent by the source do have a GTID already, that GTID is retained.

Channels specific to Group Replication cannot use
ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS, but an asynchronous replication channel for another source on a server instance that is a Group Replication group member can do so. In that case, do not specify the Group Replication group name as the UUID for creating the GTIDs.

To set ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS to LOCAL or uuid, the replica must have gtid_mode=0N set, and this cannot be changed afterwards. This option is for use with a source that has binary log file position based replication, so SOURCE_AUTO_POSITION=1 cannot be set for the channel. Both the replication SQL thread and the replication I/O (receiver) thread must be stopped before setting this option.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2753.jpg?height=115&width=108&top_left_y=2012&top_left_x=397)

\section*{Important}

A replica set up with ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS on any channel cannot be promoted to replace the replication source server in the event that a failover is required, and a backup taken from the replica cannot be used to restore the replication source server. The same restriction applies to replacing or restoring other replicas that use ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS on any channel.

For further restrictions and information, see Section 19.1.3.6, "Replication From a Source Without GTIDs to a Replica With GTIDs".
- GET_SOURCE_PUBLIC_KEY = \{0|1\}

Enables RSA key pair-based password exchange by requesting the public key from the source. The option is disabled by default.

This option applies to replicas that authenticate with the caching_sha2_password authentication plugin. For connections by accounts that authenticate using this plugin, the source does not send the public key unless requested, so it must be requested or specified in the client. If SOURCE_PUBLIC_KEY_PATH is given and specifies a valid public key file, it takes precedence over GET_SOURCE_PUBLIC_KEY. If you are using a replication user account that authenticates with the caching_sha2_password plugin (the default), and you are not using a secure connection, you must specify either this option or the SOURCE_PUBLIC_KEY_PATH option to provide the RSA public key to the replica.
- GTID_ONLY = \{0|1\}

Stops the replication channel persisting file names and file positions in the replication metadata repositories. GTID_ONLY is disabled by default for asynchronous replication channels, but is enabled by default for Group Replication channels, for which it cannot be disabled.

For replication channels with this setting, in-memory file positions are still tracked, and file positions can still be observed for debugging purposes in error messages and through interfaces such as SHOW REPLICA STATUS statements (where they are shown as being invalid if they are out of date). However, the writes and reads required to persist and check the file positions are avoided in situations where GTID-based replication does not actually require them, including the transaction queuing and application process.

This option can be used only if both the replication SQL (applier) thread and replication I/O (receiver) thread are stopped. To set GTID_ONLY $=1$ for a replication channel, GTIDs must be in use on the server (gtid_mode = 0N), and row-based binary logging must be in use on the source (statement-based replication is not supported). The options REQUIRE_ROW_FORMAT $=1$ and SOURCE_AUTO_POSITION $=1 \mathrm{must}$ be set for the replication channel.

When GTID_ONLY $=1$ is set, the replica uses replica_parallel_workers=1 if that system variable is set to zero for the server, so it is always technically a multi-threaded applier. This is because a multi-threaded applier uses saved positions rather than the replication metadata repositories to locate the start of a transaction that it needs to reapply.

If you disable GTID_ONLY after setting it, the existing relay logs are deleted and the existing known binary log file positions are persisted, even if they are stale. The file positions for the binary log and relay log in the replication metadata repositories might be invalid, and a warning is returned if this is the case. Provided that SOURCE_AUTO_POSITION is still enabled, GTID auto-positioning is used to provide the correct positioning.

If you also disable SOURCE_AUTO_POSITION, the file positions for the binary log and relay log in the replication metadata repositories are used for positioning if they are valid. If they are marked as invalid, you must provide a valid binary log file name and position (SOURCE_LOG_FILE and SOURCE_LOG_POS). If you also provide a relay log file name and position (RELAY_LOG_FILE and RELAY_LOG_POS), the relay logs are preserved and the applier position is set to the stated position. GTID auto-skip ensures that any transactions already applied are skipped even if the eventual applier position is not correct.
- IGNORE_SERVER_IDS = (server_id_list)

Makes the replica ignore events originating from the specified servers. The option takes a commaseparated list of 0 or more server IDs. Log rotation and deletion events from the servers are not ignored, and are recorded in the relay log.

In circular replication, the originating server normally acts as the terminator of its own events, so that they are not applied more than once. Thus, this option is useful in circular replication when one of the servers in the circle is removed. Suppose that you have a circular replication setup with 4 servers, having server IDs 1, 2, 3, and 4, and server 3 fails. When bridging the gap by starting replication from server 2 to server 4, you can include IGNORE_SERVER_IDS = (3) in the CHANGE REPLICATION SOURCE TO statement that you issue on server 4 to tell it to use server 2 as its source instead of
server 3. Doing so causes it to ignore and not to propagate any statements that originated with the server that is no longer in use.

If IGNORE_SERVER_IDS contains the server's own ID and the server was started with the - -replicate-same-server-id option enabled, an error results.

The source metadata repository and the output of SHOW REPLICA STATUS provide the list of servers that are currently ignored. For more information, see Section 19.2.4.2, "Replication Metadata Repositories", and Section 15.7.7.35, "SHOW REPLICA STATUS Statement".

If a CHANGE REPLICATION SOURCE TO statement is issued without IGNORE_SERVER_IDS, any existing list is preserved. To clear the list of ignored servers, it is necessary to use the option with an empty list, like this:

CHANGE REPLICATION SOURCE TO IGNORE_SERVER_IDS = ();
RESET REPLICA ALL also clears IGNORE_SERVER_IDS.
When global transaction identifiers (GTIDs) are used for replication, transactions that have already been applied are automatically ignored. Because of this, IGNORE_SERVER_IDS is not compatible with gtid_mode=ON. If gtid_mode is ON, CHANGE REPLICATION SOURCE TO with a non-empty IGNORE_SERVER_IDS list is rejected with an error. Likewise, if any existing replication channel was created with a list of server IDs to be ignored, SET gtid_mode=ON is also rejected. Before starting GTID-based replication, check for and clear any ignored server ID lists on the servers involved; you can do this by checking the output from SHOW REPLICA STATUS. In such cases, you can clear the list by issuing CHANGE REPLICATION SOURCE TO with an empty list of server IDs as shown previously.
- NETWORK_NAMESPACE = 'namespace'

The network namespace to use for TCP/IP connections to the replication source server or, if the MySQL communication stack is in use, for Group Replication's group communication connections. The maximum length of the string value is 64 characters. If this option is omitted, connections from the replica use the default (global) namespace. On platforms that do not implement network namespace support, failure occurs when the replica attempts to connect to the source. For information about network namespaces, see Section 7.1.14, "Network Namespace Support".
- PRIVILEGE_CHECKS_USER = \{NULL | 'account'\}

Names a user account that supplies a security context for the specified channel. NULL, which is the default, means no security context is used.

The user name and host name for the user account must follow the syntax described in Section 8.2.4, "Specifying Account Names", and the user must not be an anonymous user (with a blank user name) or the CURRENT_USER. The account must have the REPLICATION_APPLIER privilege, plus the required privileges to execute the transactions replicated on the channel. For details of the privileges required by the account, see Section 19.3.3, "Replication Privilege Checks". When you restart the replication channel, the privilege checks are applied from that point on. If you do not specify a channel and no other channels exist, the statement is applied to the default channel.

The use of row-based binary logging is strongly recommended when PRIVILEGE_CHECKS_USER is set, and you can set REQUIRE_ROW_FORMAT to enforce this. For example, to start privilege checks on the channel channel_1 on a running replica, issue the following statements:
```
STOP REPLICA FOR CHANNEL 'channel_1';
CHANGE REPLICATION SOURCE TO
    PRIVILEGE_CHECKS_USER = 'user'@'host',
    REQUIRE_ROW_FORMAT = 1,
    FOR CHANNEL 'channel_1';
START REPLICA FOR CHANNEL 'channel_1';
```

- RELAY_LOG_FILE = 'relay_log_file',RELAY_LOG_POS = 'relay_log_pos'

The relay log file name, and the location in that file, at which the replication SQL thread begins reading from the replica's relay log the next time the thread starts. RELAY_LOG_FILE can use either an absolute or relative path, and uses the same base name as SOURCE_LOG_FILE. The maximum length of the string value is 511 characters.

A CHANGE REPLICATION SOURCE TO statement using RELAY_LOG_FILE, RELAY_LOG_POS, or both options can be executed on a running replica when the replication SQL (applier) thread is stopped. Relay logs are preserved if at least one of the replication applier thread and the replication I/O (receiver) thread is running. If both threads are stopped, all relay log files are deleted unless at least one of RELAY_LOG_FILE or RELAY_LOG_POS is specified. For the Group Replication applier channel (group_replication_applier), which only has an applier thread and no receiver thread, this is the case if the applier thread is stopped, but with that channel you cannot use the RELAY_LOG_FILE and RELAY_LOG_POS options.
- REQUIRE_ROW_FORMAT = \{0|1\}

Permits only row-based replication events to be processed by the replication channel. This option prevents the replication applier from taking actions such as creating temporary tables and executing LOAD DATA INFILE requests, which increases the security of the channel. The REQUIRE_ROW_FORMAT option is disabled by default for asynchronous replication channels, but it is enabled by default for Group Replication channels, and it cannot be disabled for them. For more information, see Section 19.3.3, "Replication Privilege Checks".
- REQUIRE_TABLE_PRIMARY_KEY_CHECK = \{STREAM | ON | OFF | GENERATE\}

This option lets a replica set its own policy for primary key checks, as follows:
- ON: The replica sets sql_require_primary_key = ON; any replicated CREATE TABLE or ALTER TABLE statement must result in a table that contains a primary key.
- OFF: The replica sets sql_require_primary_key = OFF; no replicated CREATE TABLE or ALTER TABLE statement is checked for the presence of a primary key.
- STREAM: The replica uses whatever value of sql_require_primary_key is replicated from the source for each transaction. This is the default value, and the default behavior.
- GENERATE: Causes the replica to generate an invisible primary key for any InnoDB table that, as replicated, lacks a primary key. See Section 15.1.20.11, "Generated Invisible Primary Keys", for more information.

GENERATE is not compatible with Group Replication; you can use ON, OFF, or STREAM.
A divergence based on the presence of a generated invisible primary key solely on a source or replica table is supported by MySQL Replication as long as the source supports GIPKs and the replica uses MySQL version 8.0.32 or later. If you use GIPKs on a replica with the source using an earlier version of MySQL, such divergences in schema, other than the extra GIPK on the replica, are not supported and may result in replication errors.

For multisource replication, setting REQUIRE_TABLE_PRIMARY_KEY_CHECK to ON or OFF lets the replica normalize behavior across replication channels for different sources, and to keep a consistent setting for sql_require_primary_key. Using ON safeguards against the accidental loss of primary keys when multiple sources update the same set of tables. Using OFF lets sources that can manipulate primary keys to work alongside sources that cannot.

In the case of multiple replicas, when REQUIRE_TABLE_PRIMARY_KEY_CHECK is set to GENERATE, the generated invisible primary key added by a given replica is independent of any such key added on any other replica. This means that, if generated invisible primary keys are in use, the values in the
generated primary key columns on different replicas are not guaranteed to be the same. This may be an issue when failing over to such a replica.

When PRIVILEGE_CHECKS_USER is NULL (the default), the user account does not need administration level privileges to set restricted session variables. Setting this option to a value other than NULL means that, when REQUIRE_TABLE_PRIMARY_KEY_CHECK is ON, OFF, or GENERATE, the user account does not require session administration level privileges to set restricted session variables such as sql_require_primary_key, avoiding the need to grant the account such privileges. For more information, see Section 19.3.3, "Replication Privilege Checks".
- SOURCE_AUTO_POSITION = \{0|1\}

Makes the replica attempt to connect to the source using the auto-positioning feature of GTID-based replication, rather than a binary log file based position. This option is used to start a replica using GTID-based replication. The default is 0 , meaning that GTID auto-positioning and GTID-based replication are not used. This option can be used with CHANGE REPLICATION SOURCE TO only if both the replication SQL (applier) thread and replication I/O (receiver) thread are stopped.

Both the replica and the source must have GTIDs enabled (GTID_MODE=ON, ON_PERMISSIVE, or OFF_PERMISSIVE on the replica, and GTID_MODE=ON on the source). SOURCE_LOG_FILE, SOURCE_LOG_POS, RELAY_LOG_FILE, and RELAY_LOG_POS cannot be specified together with SOURCE_AUTO_POSITION = 1. If multi-source replication is enabled on the replica, you need to set the SOURCE_AUTO_POSITION = 1 option for each applicable replication channel.

With SOURCE_AUTO_POSITION = 1 set, in the initial connection handshake, the replica sends a GTID set containing the transactions that it has already received, committed, or both. The source responds by sending all transactions recorded in its binary log whose GTID is not included in the GTID set sent by the replica. This exchange ensures that the source only sends the transactions with a GTID that the replica has not already recorded or committed. If the replica receives transactions from more than one source, as in the case of a diamond topology, the auto-skip function ensures that the transactions are not applied twice. For details of how the GTID set sent by the replica is computed, see Section 19.1.3.3, "GTID Auto-Positioning".

If any of the transactions that should be sent by the source have been purged from the source's binary log, or added to the set of GTIDs in the gtid_purged system variable by another method, the source sends the error ER_SOURCE_HAS_PURGED_REQUIRED_GTIDS to the replica, and replication does not start. The GTIDs of the missing purged transactions are identified and listed in the source's error log in the warning message ER_FOUND_MISSING_GTIDS. Also, if during the exchange of transactions it is found that the replica has recorded or committed transactions with the source's UUID in the GTID, but the source itself has not committed them, the source sends the error ER_REPLICA_HAS_MORE_GTIDS_THAN_SOURCE to the replica and replication does not start. For information on how to handle these situations, see Section 19.1.3.3, "GTID Auto-Positioning".

You can see whether replication is running with GTID auto-positioning enabled by checking the Performance Schema replication_connection_status table or the output of SHOW REPLICA STATUS. Disabling the SOURCE_AUTO_POSITION option again makes the replica revert to file-based replication.
- SOURCE_BIND = 'interface_name'

Determines which of the replica's network interfaces is chosen for connecting to the source, for use on replicas that have multiple network interfaces. Specify the IP address of the network interface. The maximum length of the string value is 255 characters.

The IP address configured with this option, if any, can be seen in the Source_Bind column of the output from SHOW REPLICA STATUS. In the source metadata repository table mysql.slave_master_info, the value can be seen as the Source_bind column. The ability to bind a replica to a specific network interface is also supported by NDB Cluster.
- SOURCE_COMPRESSION_ALGORITHMS = 'algorithm[,algorithm][,algorithm]'

Specifies one, two, or three of the permitted compression algorithms for connections to the replication source server, separated by commas. The maximum length of the string value is 99 characters. The default value is uncompressed.

The available algorithms are zlib, zstd, and uncompressed, the same as for the protocol_compression_algorithms system variable. The algorithms can be specified in any order, but it is not an order of preference - the algorithm negotiation process attempts to use zlib, then zstd, then uncompressed, if they are specified.

The value of SOURCE_COMPRESSION_ALGORITHMS applies only if the replica_compressed_protocol system variable is disabled. If replica_compressed_protocol is enabled, it takes precedence over SOURCE_COMPRESSION_ALGORITHMS and connections to the source use zlib compression if both source and replica support that algorithm. For more information, see Section 6.2.8, "Connection Compression Control".

Binary log transaction compression is activated by the binlog_transaction_compression system variable, and can also be used to save bandwidth. If you do this in combination with connection compression, connection compression has less opportunity to act on the data, but can still compress headers and those events and transaction payloads that are uncompressed. For more information on binary log transaction compression, see Section 7.4.4.5, "Binary Log Transaction Compression".
- SOURCE_CONNECT_RETRY = interval

Specifies the interval in seconds between the reconnection attempts that the replica makes after the connection to the source times out. The default interval is 60.

The number of attempts is limited by the SOURCE_RETRY_COUNT option. If both the default settings are used, the replica waits 60 seconds between reconnection attempts (SOURCE_CONNECT_RETRY=60), and keeps attempting to reconnect at this rate for 10 minutes (SOURCE_RETRY_COUNT=10). These values are recorded in the source metadata repository and shown in the replication_connection_configuration Performance Schema table.
- SOURCE_CONNECTION_AUTO_FAILOVER = \{0|1\}

Activates the asynchronous connection failover mechanism for a replication channel if one or more alternative replication source servers are available (so when there are multiple MySQL servers or groups of servers that share the replicated data). The default is 0 , meaning that the mechanism is not activated. For full information and instructions to set up this feature, see Section 19.4.9.2, "Asynchronous Connection Failover for Replicas".

The asynchronous connection failover mechanism takes over after the reconnection attempts controlled by SOURCE_CONNECT_RETRY and SOURCE_RETRY_COUNT are exhausted. It reconnects the replica to an alternative source chosen from a specified source list, which you can manage using the functions asynchronous_connection_failover_add_source() and asynchronous_connection_failover_delete_source(). To add and remove managed groups of servers, use asynchronous_connection_failover_add_managed() and asynchronous_connection_failover_delete_managed( ) instead. For more information, see Section 19.4.9, "Switching Sources and Replicas with Asynchronous Connection Failover".

\section*{Important}
1. You can only set SOURCE_CONNECTION_AUTO_FAILOVER $=1$ when GTID auto-positioning is in use (SOURCE_AUTO_POSITION = 1).
2. When you set SOURCE_CONNECTION_AUTO_FAILOVER = 1, set SOURCE_RETRY_COUNT and SOURCE_CONNECT_RETRY to minimal numbers that just allow a few retry attempts with the same source, in
failure is caused by a transient network outage. Otherwise the asynchronous connection failover mechanism cannot be activated promptly. Suitable values are SOURCE_RETRY_COUNT=3 and SOURCE_CONNECT_RETRY=10, which make the replica retry the connection 3 times with 10-second intervals between.
3. When you set SOURCE_CONNECTION_AUTO_FAILOVER $=1$, the replication metadata repositories must contain the credentials for a replication user account that can be used to connect to all the servers on the source list for the replication channel. The account must also have SELECT permissions on the Performance Schema tables. These credentials can be set using the CHANGE REPLICATION SOURCE TO statement with the SOURCE_USER and SOURCE_PASSWORD options. For more information, see Section 19.4.9, "Switching Sources and Replicas with Asynchronous Connection Failover".
4. When you set SOURCE_CONNECTION_AUTO_FAILOVER = 1, asynchronous connection failover for replicas is automatically activated if this replication channel is on a Group Replication primary in a group in single-primary mode. With this function active, if the primary that is replicating goes offline or into an error state, the new primary starts replication on the same channel when it is elected. If you want to use the function, this replication channel must also be set up on all the secondary servers in the replication group, and on any new joining members. (If the servers are provisioned using MySQL's clone functionality, this all happens automatically.) If you do not want to use the function, disable it by using the group_replication_disable_member_action() function to disable the Group Replication member action mysql_start_failover_channels_if_primary, which is enabled by default. For more information, see Section 19.4.9.2, "Asynchronous Connection Failover for Replicas".
- SOURCE_DELAY = interval

Specifies how many seconds behind the source the replica must lag. An event received from the source is not executed until at least interval seconds later than its execution on the source. interval must be a nonnegative integer in the range from 0 to $2^{31}-1$. The default is 0 . For more information, see Section 19.4.11, "Delayed Replication".

A CHANGE REPLICATION SOURCE TO statement using the SOURCE_DELAY option can be executed on a running replica when the replication SQL thread is stopped.
- SOURCE_HEARTBEAT_PERIOD = interval

Controls the heartbeat interval, which stops the connection timeout occurring in the absence of data if the connection is still good. A heartbeat signal is sent to the replica after that number of seconds, and the waiting period is reset whenever the source's binary log is updated with an event. Heartbeats are therefore sent by the source only if there are no unsent events in the binary log file for a period longer than this.

The heartbeat interval interval is a decimal value having the range 0 to 4294967 seconds and a resolution in milliseconds; the smallest nonzero value is 0.001 . Setting interval to 0 disables heartbeats altogether. The heartbeat interval defaults to half the value of the replica_net_timeout system variable. It is recorded in the source metadata repository and shown in the replication_connection_configuration Performance Schema table.

The replica_net_timeout system variable specifies the number of seconds that the replica waits for either more data or a heartbeat signal from the source, before the replica considers the connection broken, aborts the read, and tries to reconnect. The default value is 60 seconds
(one minute). Note that a change to the value or default setting of replica_net_timeout does not automatically change the heartbeat interval, whether that has been set explicitly or is using a previously calculated default. A warning is issued if you set the global value of replica_net_timeout to a value less than that of the current heartbeat interval. If replica_net_timeout is changed, you must also issue CHANGE REPLICATION SOURCE TO to adjust the heartbeat interval to an appropriate value so that the heartbeat signal occurs before the connection timeout. If you do not do this, the heartbeat signal has no effect, and if no data is received from the source, the replica can make repeated reconnection attempts, creating zombie dump threads.
- SOURCE_HOST = 'host_name'

The host name or IP address of the replication source server. The replica uses this to connect to the source. The maximum length of the string value is 255 characters.

If you specify SOURCE_HOST or SOURCE_PORT, the replica assumes that the source server is different from before (even if the option value is the same as its current value.) In this case, the old values for the source's binary log file name and position are considered no longer applicable, so if you do not specify SOURCE_LOG_FILE and SOURCE_LOG_POS in the statement, SOURCE_LOG_FILE= ' ' and SOURCE_LOG_POS=4 are silently appended to it.

Setting SOURCE_HOST= ' ' (that is, setting its value explicitly to an empty string) is not the same as not setting SOURCE_HOST at all. Trying to set SOURCE_HOST to an empty string fails with an error.
- SOURCE_LOG_FILE = 'source_log_name',SOURCE_LOG_POS = source_log_pos

The binary log file name, and the location in that file, at which the replication I/O (receiver) thread begins reading from the source's binary log the next time the thread starts. Specify these options if you are using binary log file position based replication.

SOURCE_LOG_FILE must include the numeric suffix of a specific binary log file that is available on the source server, for example, SOURCE_LOG_FILE='binlog.000145'. The maximum length of the string value is 511 characters.

SOURCE_LOG_POS is the numeric position for the replica to start reading in that file.
SOURCE_LOG_POS=4 represents the start of the events in a binary log file.
If you specify either of SOURCE_LOG_FILE or SOURCE_LOG_POS, you cannot specify SOURCE_AUTO_POSITION $=1$, which is for GTID-based replication.

If neither of SOURCE_LOG_FILE or SOURCE_LOG_POS is specified, the replica uses the last coordinates of the replication SQL thread before CHANGE REPLICATION SOURCE TO was issued. This ensures that there is no discontinuity in replication, even if the replication SQL (applier) thread was late compared to the replication I/O (receiver) thread.
- SOURCE_PASSWORD = 'password'

The password for the replication user account to use for connecting to the replication source server. The maximum length of the string value is 32 characters. If you specify SOURCE_PASSWORD, SOURCE_USER is also required.

The password used for a replication user account in a CHANGE REPLICATION SOURCE TO statement is limited to 32 characters in length. Trying to use a password of more than 32 characters causes CHANGE REPLICATION SOURCE TO to fail.

The password is masked in MySQL Server's logs, Performance Schema tables, and SHOW PROCESSLIST statements.
- SOURCE_PORT = port_num

The TCP/IP port number that the replica uses to connect to the replication source server.

\section*{Note}

Replication cannot use Unix socket files. You must be able to connect to the replication source server using TCP/IP.

If you specify SOURCE_HOST or SOURCE_PORT, the replica assumes that the source server is different from before (even if the option value is the same as its current value.) In this case, the old values for the source's binary log file name and position are considered no longer applicable, so if you do not specify SOURCE_LOG_FILE and SOURCE_LOG_POS in the statement, SOURCE_LOG_FILE=' ' and SOURCE_LOG_POS=4 are silently appended to it.
- SOURCE_PUBLIC_KEY_PATH = 'key_file_name'

Enables RSA key pair-based password exchange by providing the path name to a file containing a replica-side copy of the public key required by the source. The file must be in PEM format. The maximum length of the string value is 511 characters.

This option applies to replicas that authenticate with the sha256_password (deprecated) or caching_sha2_password authentication plugin. (For sha256_password, SOURCE_PUBLIC_KEY_PATH can be used only if MySQL was built using OpenSSL.) If you are using a replication user account that authenticates with the caching_sha2_password plugin (the default), and you are not using a secure connection, you must specify either this option or the GET_SOURCE_PUBLIC_KEY=1 option to provide the RSA public key to the replica.
- SOURCE_RETRY_COUNT = count

Sets the maximum number of reconnection attempts that the replica makes after the connection to the source times out, as determined by the replica_net_timeout system variable. If the replica does need to reconnect, the first retry occurs immediately after the timeout. The default is 10 attempts.

The interval between the attempts is specified by the SOURCE_CONNECT_RETRY option. If both the default settings are used, the replica waits 60 seconds between reconnection attempts (SOURCE_CONNECT_RETRY=60), and keeps attempting to reconnect at this rate for 10 minutes (SOURCE_RETRY_COUNT=10). A setting of 0 for SOURCE_RETRY_COUNT means that there is no limit on the number of reconnection attempts, so the replica keeps trying to reconnect indefinitely.

The values for SOURCE_CONNECT_RETRY and SOURCE_RETRY_COUNT are recorded in the source metadata repository and shown in the replication_connection_configuration Performance Schema table. SOURCE_RETRY_COUNT supersedes the --master-retry-count server startup option.
- SOURCE_SSL = \{0|1\}

Specify whether the replica encrypts the replication connection. The default is 0 , meaning that the replica does not encrypt the replication connection. If you set SOURCE_SSL=1, you can configure the encryption using the SOURCE_SSL_ $x x x$ and SOURCE_TLS_ $x x x$ options.

Setting SOURCE_SSL=1 for a replication connection and then setting no further SOURCE_SSL_ $x x x$ options corresponds to setting--ssl-mode=REQUIRED for the client, as described in Command Options for Encrypted Connections. With SOURCE_SSL=1, the connection attempt only succeeds if an encrypted connection can be established. A replication connection does not fall back to an unencrypted connection, so there is no setting corresponding to the --ssl-mode=PREFERRED setting for replication. If SOURCE_SSL=0 is set, this corresponds to--ssl-mode=DISABLED.

\section*{lant}

Important
To help prevent sophisticated man-in-the-middle attacks, it is important for the replica to verify the server's identity. You can specify additional SOURCE_SSL_ $x x x$ options to correspond to the settings --ssl-
> mode=VERIFY_CA and --ssl-mode=VERIFY_IDENTITY, which are a better choice than the default setting to help prevent this type of attack. With these settings, the replica checks that the server's certificate is valid, and checks that the host name the replica is using matches the identity in the server's certificate. To implement one of these levels of verification, you must first ensure that the CA certificate for the server is reliably available to the replica, otherwise availability issues will result. For this reason, they are not the default setting.
- SOURCE_SSL_xxx, SOURCE_TLS_xxx

Specify how the replica uses encryption and ciphers to secure the replication connection. These options can be changed even on replicas that are compiled without SSL support. They are saved to the source metadata repository, but are ignored if the replica does not have SSL support enabled. The maximum length of the value for the string-valued SOURCE_SSL_ $x x x$ and SOURCE_TLS_ $x x x$ options is 511 characters, with the exception of SOURCE_TLS_CIPHERSUITES, for which it is 4000 characters.

The SOURCE_SSL_ $x x x$ and SOURCE_TLS_ $x x x$ options perform the same functions as the - -ssl- $x x x$ and --tls- $x x x$ client options described in Command Options for Encrypted Connections. The correspondence between the two sets of options, and the use of the SOURCE_SSL_ $x x x$ and SOURCE_TLS_ $x x x$ options to set up a secure connection, is explained in Section 19.3.1, "Setting Up Replication to Use Encrypted Connections".
- SOURCE_USER = 'user_name'

The user name for the replication user account to use for connecting to the replication source server. The maximum length of the string value is 96 characters.

For Group Replication, this account must exist on every member of the replication group. It is used for distributed recovery if the XCom communication stack is in use for the group, and also used for group communication connections if the MySQL communication stack is in use for the group. With the MySQL communication stack, the account must have the GROUP_REPLICATION_STREAM permission.

It is possible to set an empty user name by specifying SOURCE_USER= ' ', but the replication channel cannot be started with an empty user name. It is valid to set an empty SOURCE_USER user name and use the channel afterwards if you always provide user credentials using the START REPLICA statement or START GROUP_REPLICATION statement that starts the replication channel. This approach means that the replication channel always needs operator intervention to restart, but the user credentials are not recorded in the replication metadata repositories.

\section*{Important}

To connect to the source using a replication user account that authenticates with the caching_sha2_password plugin, you must either set up a secure connection as described in Section 19.3.1, "Setting Up Replication to Use Encrypted Connections", or enable the unencrypted connection to support password exchange using an RSA key pair. The caching_sha2_password authentication plugin is the default for new users (see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication"). If the user account that you create or use for replication uses this authentication plugin, and you are not using a secure connection, you must enable RSA key pair-based password exchange for a successful connection. You can do this using either the SOURCE_PUBLIC_KEY_PATH option or the GET_SOURCE_PUBLIC_KEY=1 option for this statement.
- SOURCE_ZSTD_COMPRESSION_LEVEL = level

The compression level to use for connections to the replication source server that use the zstd compression algorithm. The permitted levels are from 1 to 22, with larger values indicating increasing levels of compression. The default level is 3 .

The compression level setting has no effect on connections that do not use zstd compression. For more information, see Section 6.2.8, "Connection Compression Control".

\section*{Examples}

CHANGE REPLICATION SOURCE TO is useful for setting up a replica when you have the snapshot of the source and have recorded the source's binary log coordinates corresponding to the time of the snapshot. After loading the snapshot into the replica to synchronize it with the source, you can run CHANGE REPLICATION SOURCE TO SOURCE_LOG_FILE='log_name', SOURCE_LOG_POS=log_pos on the replica to specify the coordinates at which the replica should begin reading the source's binary log. The following example changes the source server the replica uses and establishes the source's binary log coordinates from which the replica begins reading:
```
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST='source2.example.com',
    SOURCE_USER='replication',
    SOURCE_PASSWORD='password',
    SOURCE_PORT=3306,
    SOURCE_LOG_FILE='source2-bin.001',
    SOURCE_LOG_POS=4,
    SOURCE_CONNECT_RETRY=10;
```


For the procedure to switch an existing replica to a new source during failover, see Section 19.4.8, "Switching Sources During Failover".

When GTIDs are in use on the source and the replica, specify GTID auto-positioning instead of giving the binary log file position, as in the following example. For full instructions to configure and start GTIDbased replication on new or stopped servers, online servers, or additional replicas, see Section 19.1.3, "Replication with Global Transaction Identifiers".
```
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST='source3.example.com',
    SOURCE_USER='replication',
    SOURCE_PASSWORD='password',
    SOURCE_PORT=3306,
    SOURCE_AUTO_POSITION = 1,
    FOR CHANNEL "source_3";
```


In this example, multi-source replication is in use, and the CHANGE REPLICATION SOURCE TO statement is applied to the replication channel "source_3" that connects the replica to the specified host. For guidance on setting up multi-source replication, see Section 19.1.5, "MySQL Multi-Source Replication".

The next example shows how to make the replica apply transactions from relay log files that you want to repeat. To do this, the source need not be reachable. You can use CHANGE REPLICATION SOURCE TO to locate the relay log position where you want the replica to start reapplying transactions, and then start the SQL thread:
```
CHANGE REPLICATION SOURCE TO
    RELAY_LOG_FILE='replica-relay-bin.006',
    RELAY_LOG_POS=4025;
START REPLICA SQL_THREAD;
```


CHANGE REPLICATION SOURCE TO can also be used to skip over transactions in the binary log that are causing replication to stop. The appropriate method to do this depends on whether GTIDs are in use or not. For instructions to skip transactions using CHANGE REPLICATION SOURCE TO or another method, see Section 19.1.7.3, "Skipping Transactions".

\subsection*{15.4.2.3 RESET REPLICA Statement}
```
RESET REPLICA [ALL] [channel_option]
channel_option:
    FOR CHANNEL channel
```


RESET REPLICA makes the replica forget its position in the source's binary log.
This statement is meant to be used for a clean start; it clears the replication metadata repositories, deletes all the relay log files, and starts a new relay log file. It also resets to 0 the replication delay specified with the SOURCE_DELAY option of the CHANGE REPLICATION SOURCE TO statement.

I
For a server where GTIDs are in use (gtid_mode is ON), issuing RESET REPLICA has no effect on the GTID execution history. The statement does not change the values of gtid_executed or gtid_purged, or the mysql.gtid_executed table. If you need to reset the GTID execution history, use RESET BINARY LOGS AND GTIDS, even if the GTID-enabled server is a replica where binary logging is disabled.

RESET REPLICA requires the RELOAD privilege.
To use RESET REPLICA, the replication SQL thread and replication I/O (receiver) thread must be stopped, so on a running replica use STOP REPLICA before issuing RESET REPLICA. To use RESET REPLICA on a Group Replication group member, the member status must be OFFLINE, meaning that the plugin is loaded but the member does not currently belong to any group. A group member can be taken offline by using a STOP GROUP REPLICATION statement.

The optional FOR CHANNEL channel clause enables you to name which replication channel the statement applies to. Providing a FOR CHANNEL channel clause applies the RESET REPLICA statement to a specific replication channel. Combining a FOR CHANNEL channel clause with the ALL option deletes the specified channel. If no channel is named and no extra channels exist, the statement applies to the default channel. Issuing a RESET REPLICA ALL statement without a FOR CHANNEL channel clause when multiple replication channels exist deletes all replication channels and recreates only the default channel. See Section 19.2.2, "Replication Channels" for more information.

RESET REPLICA does not change any replication connection parameters, which include the source's host name and port, the replication user account and its password, the PRIVILEGE_CHECKS_USER account, the REQUIRE_ROW_FORMAT option, the REQUIRE_TABLE_PRIMARY_KEY_CHECK option, and the ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS option. If you want to change any of the replication connection parameters, you can do this using a CHANGE REPLICATION SOURCE TO statement after the server starts. If you want to remove all of the replication connection parameters, use RESET REPLICA ALL. RESET REPLICA ALL also clears the IGNORE_SERVER_IDS list set by CHANGE REPLICATION SOURCE TO. When you have used RESET REPLICA ALL, if you want to use the instance as a replica again, you need to issue a CHANGE REPLICATION SOURCE TO statement after the server start to specify new connection parameters.

You can set the GTID_ONLY option on the CHANGE REPLICATION SOURCE TO statement to stop a replication channel from persisting file names and file positions in the replication metadata repositories. When you issue RESET REPLICA, the replication metadata repositories are synchronized. RESET REPLICA ALL deletes rather than updates the repositories, so they are synchronized implicitly.

In the event of an unexpected server exit or deliberate restart after issuing RESET REPLICA but before issuing START REPLICA, replication connection parameters are preserved in the crash-safe InnoDB tables mysql.slave_master_info and mysql.slave_relay_log_info as part of the RESET REPLICA operation. They are also retained in memory. In the event of an unexpected server exit or deliberate restart after issuing RESET REPLICA but before issuing START REPLICA, the replication connection parameters are retrieved from the tables and reapplied to the channel. This applies for both the connection and applier metadata repositories.

RESET REPLICA does not change any replication filter settings (such as --replicate-ignoretable) for channels affected by the statement. However, RESET REPLICA ALL removes the replication filters that were set on the channels deleted by the statement. When the deleted channel or channels are recreated, any global replication filters specified for the replica are copied to them, and no channel specific replication filters are applied. For more information see Section 19.2.5.4, "Replication Channel Based Filters".

RESET REPLICA causes an implicit commit of an ongoing transaction. See Section 15.3.3, "Statements That Cause an Implicit Commit".

If the replication SQL thread was in the middle of replicating temporary tables when it was stopped, and RESET REPLICA is issued, these replicated temporary tables are deleted on the replica.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2765.jpg?height=454&width=35&top_left_y=753&top_left_x=598)

\section*{Note}

When used on an NDB Cluster replica SQL node, RESET REPLICA clears the mysql.ndb_apply_status table. You should keep in mind when using this statement that ndb_apply_status uses the NDB storage engine and so is shared by all SQL nodes attached to the cluster.

You can override this behavior by issuing SET GLOBAL @@ndb_clear_apply_status=OFF prior to executing RESET REPLICA, which keeps the replica from purging the ndb_apply_status table in such cases.

\subsection*{15.4.2.4 START REPLICA Statement}
```
START REPLICA [thread_types] [until_option] [connection_options] [channel_option]
thread_types:
    [thread_type [, thread_type] ... ]
thread_type:
    IO_THREAD | SQL_THREAD
until_option:
    UNTIL { {SQL_BEFORE_GTIDS | SQL_AFTER_GTIDS} = gtid_set
        | SOURCE_LOG_FILE = 'log_name', SOURCE_LOG_POS = log_pos
        | RELAY_LOG_FILE = 'log_name', RELAY_LOG_POS = log_pos
        | SQL_AFTER_MTS_GAPS }
connection_options:
    [USER='user_name'] [PASSWORD='user_pass'] [DEFAULT_AUTH='plugin_name'] [PLUGIN_DIR='plugin_dir']
channel_option:
    FOR CHANNEL channel
gtid_set:
    uuid_set [, uuid_set] ...
    | ''
uuid_set:
    uuid:interval[:interval]...
uuid:
    hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh
h:
    [0-9,A-F]
interval:
    n[-n]
    (n >= 1)
```


START REPLICA starts the replication threads, either together or separately.

START REPLICA requires the REPLICATION_SLAVE_ADMIN privilege (or the deprecated SUPER privilege). START REPLICA causes an implicit commit of an ongoing transaction. See Section 15.3.3, "Statements That Cause an Implicit Commit".

For the thread type options, you can specify IO_THREAD, SQL_THREAD, both of these, or neither of them. Only the threads that are started are affected by the statement.
- START REPLICA with no thread type options starts all of the replication threads, and so does START REPLICA with both of the thread type options.
- IO_THREAD starts the replication receiver thread, which reads events from the source server and stores them in the relay log.
- SQL_THREAD starts the replication applier thread, which reads events from the relay log and executes them. A multithreaded replica (with replica_parallel_workers $>0$ ) applies transactions using a coordinator thread and multiple applier threads, and SQL_THREAD starts all of these.

\section*{Important}

START REPLICA sends an acknowledgment to the user after all the replication threads have started. However, the replication receiver thread might not yet have connected to the source successfully, or an applier thread might stop when applying an event right after starting. START REPLICA does not continue to monitor the threads after they are started, so it does not warn you if they subsequently stop or cannot connect. You must check the replica's error log for error messages generated by the replication threads, or check that they are running satisfactorily with SHOW REPLICA STATUS. A successful START REPLICA statement causes SHOW REPLICA STATUS to show Replica_SQL_Running=Yes, but it might or might not show Replica_IO_Running=Yes, because Replica_IO_Running=Yes is only shown if the receiver thread is both running and connected. For more information, see Section 19.1.7.1, "Checking Replication Status".

The optional FOR CHANNEL channel clause enables you to name which replication channel the statement applies to. Providing a FOR CHANNEL channel clause applies the START REPLICA statement to a specific replication channel. If no clause is named and no extra channels exist, the statement applies to the default channel. If a START REPLICA statement does not have a channel defined when using multiple channels, this statement starts the specified threads for all channels. See Section 19.2.2, "Replication Channels" for more information.

The replication channels for Group Replication (group_replication_applier and group_replication_recovery) are managed automatically by the server instance. START REPLICA cannot be used at all with the group_replication_recovery channel, and should only be used with the group_replication_applier channel when Group Replication is not running. The group_replication_applier channel only has an applier thread and has no receiver thread, so it can be started if required by using the SQL_THREAD option without the IO_THREAD option.

START REPLICA supports pluggable user-password authentication (see Section 8.2.17, "Pluggable Authentication") with the USER, PASSWORD, DEFAULT_AUTH and PLUGIN_DIR options, as described in the following list. When you use these options, you must start the receiver thread (IO_THREAD option) or all the replication threads; you cannot start the replication applier thread (SQL_THREAD option) alone.

USER

PASSWORD
DEFAULT_AUTH

The user name for the account. You must set this if PASSWORD is used. The option cannot be set to an empty or null string.

The password for the named user account.
The name of the authentication plugin. The default is MySQL native authentication.

\section*{Important}

The password that you set using START REPLICA is masked when it is written to MySQL Server's logs, Performance Schema tables, and SHOW PROCESSLIST statements. However, it is sent in plain text over the connection to the replica server instance. To protect the password in transit, use SSL/TLS encryption, an SSH tunnel, or another method of protecting the connection from unauthorized viewing, for the connection between the replica server instance and the client that you use to issue START REPLICA.

The UNTIL clause makes the replica start replication, then process transactions up to the point that you specify in the UNTIL clause, then stop again. The UNTIL clause can be used to make a replica proceed until just before the point where you want to skip a transaction that is unwanted, and then skip the transaction as described in Section 19.1.7.3, "Skipping Transactions". To identify a transaction, you can use mysqlbinlog with the source's binary log or the replica's relay log, or use a SHOW BINLOG EVENTS statement.

You can also use the UNTIL clause for debugging replication by processing transactions one at a time or in sections. If you are using the UNTIL clause to do this, start the replica with --skip-replicastart to prevent the SQL thread from running when the replica server starts. Remove the option or system variable setting after the procedure is complete, so that it is not forgotten in the event of an unexpected server restart.

The SHOW REPLICA STATUS statement includes output fields that display the current values of the UNTIL condition. The UNTIL condition lasts for as long as the affected threads are still running, and is removed when they stop.

The UNTIL clause operates on the replication applier thread (SQL_THREAD option). You can use the SQL_THREAD option or let the replica default to starting both threads. If you use the IO_THREAD option alone, the UNTIL clause is ignored because the applier thread is not started.

The point that you specify in the UNTIL clause can be any one (and only one) of the following options:

\section*{SOURCE_LOG_FILE and SOURCE_LOG_POS}

These options make the replication applier process transactions up to a position in its relay log, identified by the file name and file position of the corresponding point in the binary log on the source server. The applier thread finds the nearest transaction boundary at or after the specified position, finishes applying the transaction, and stops there. For compressed transaction payloads, specify the end position of the compressed Transaction_payload_event.

These options can still be used when the GTID_ONLY option was set on the CHANGE REPLICATION SOURCE TO statement to stop the replication channel from persisting file names and file positions in the replication metadata repositories. The file names and file positions are tracked in memory.

These options make the replication applier process transactions up to a position in the replica's relay log, identified by the relay log file name and a position in that file. The applier thread finds the nearest transaction boundary at or after the specified position, finishes applying the transaction, and stops there. For compressed transaction payloads, specify the end position of the compressed Transaction_payload_event.

These options can still be used when the GTID_ONLY option was set on the CHANGE REPLICATION SOURCE TO statement to stop the replication channel from persisting file names and file positions

\begin{tabular}{|l|l|}
\hline & in the replication metadata repositories. The file names and file positions are tracked in memory. \\
\hline SQL_BEFORE_GTIDS & This option makes the replication applier start processing transactions and stop when it encounters any transaction that is in the specified GTID set. The encountered transaction from the GTID set is not applied, and nor are any of the other transactions in the GTID set. The option takes a GTID set containing one or more global transaction identifiers as an argument (see GTID Sets). Transactions in a GTID set do not necessarily appear in the replication stream in the order of their GTIDs, so the transaction before which the applier stops is not necessarily the earliest. \\
\hline SQL_AFTER_GTIDS & This option makes the replication applier start processing transactions and stop when it has processed all of the transactions in a specified GTID set. The option takes a GTID set containing one or more global transaction identifiers as an argument (see GTID Sets). \\
\hline & With SQL_AFTER_GTIDS, the replication threads stop after they have processed all transactions in the GTID set. Transactions are processed in the order received, so it is possible that these include transactions which are not part of the GTID set, but which are received (and processed) before all transactions in the set have been committed. For example, executing START REPLICA UNTIL SQL_AFTER_GTIDS = 3E11FA47-71CA-11E1-9E33-C80AA9429562:11-56 causes the replica to obtain (and process) all transactions from the source until all of the transactions having the sequence numbers 11 through 56 have been processed, and then to stop without processing any additional transactions after that point has been reached. \\
\hline & In older versions of MySQL, this option could not be used with replica_parallel_workers > 1. In MySQL 8.4, this is no longer an issue, and SQL_AFTER_GTIDS can be used without causing the replica to fall back into single-threaded mode. \\
\hline SQL_AFTER_MTS_GAPS & \begin{tabular}{l}
For a multithreaded replica only (with replica_parallel_workers > 0), this option makes the replica process transactions up to the point where there are no more gaps in the sequence of transactions executed from the relay log. When using a multithreaded replica, there is a chance of gaps occurring in the following situations: \\
- The coordinator thread is stopped. \\
- An error occurs in the applier threads. \\
- mysqld shuts down unexpectedly.
\end{tabular} \\
\hline & When a replication channel has gaps, the replica's database is in a state that might never have existed on the source. The replica tracks the gaps internally and disallows CHANGE REPLICATION SOURCE TO statements that would remove the gap information if they executed. \\
\hline & All replicas are multithreaded by default. When replica_preserve_commit_order=ON on the replica (the default), gaps should not occur except in the specific situations listed in the description for this variable. If \\
\hline
\end{tabular}
replica_preserve_commit_order is OFF, the commit order of transactions is not preserved, so the chance of gaps occurring is much larger.

If GTIDs are not in use and you need to change a failed multithreaded replica to single-threaded mode, you can issue the following series of statements, in the order shown:
```
START REPLICA UNTIL SQL_AFTER_MTS_GAPS;
SET @@GLOBAL.replica_parallel_workers = 0;
START REPLICA SQL_THREAD;
```


\subsection*{15.4.2.5 STOP REPLICA Statement}
```
STOP REPLICA [thread_types] [channel_option]
thread_types:
    [thread_type [, thread_type] ... ]
thread_type: IO_THREAD | SQL_THREAD
channel_option:
    FOR CHANNEL channel
```


Stops the replication threads.
STOP REPLICA requires the REPLICATION_SLAVE_ADMIN privilege (or the deprecated SUPER privilege). Recommended best practice is to execute STOP REPLICA on the replica before stopping the replica server (see Section 7.1.19, "The Server Shutdown Process", for more information).

Like START REPLICA, this statement may be used with the IO_THREAD and SQL_THREAD options to name the replication thread or threads to be stopped. Note that the Group Replication applier channel (group_replication_applier) has no replication I/O (receiver) thread, only a replication SQL (applier) thread. Using the SQL_THREAD option therefore stops this channel completely.

STOP REPLICA causes an implicit commit of an ongoing transaction. See Section 15.3.3, "Statements That Cause an Implicit Commit".
gtid_next must be set to AUTOMATIC before issuing this statement.
You can control how long STOP REPLICA waits before timing out by setting the system variable rpl_stop_replica_timeout. This can be used to avoid deadlocks between STOP REPLICA and other SQL statements using different client connections to the replica. When the timeout value is reached, the issuing client returns an error message and stops waiting, but the STOP REPLICA instruction remains in effect. Once the replication threads are no longer busy, the STOP REPLICA statement is executed and the replica stops.

Some CHANGE REPLICATION SOURCE TO statements are allowed while the replica is running, depending on the states of the replication threads. However, using STOP REPLICA prior to executing a CHANGE REPLICATION SOURCE TO statement in such cases is still supported. See Section 15.4.2.2, "CHANGE REPLICATION SOURCE TO Statement", and Section 19.4.8, "Switching Sources During Failover", for more information.

The optional FOR CHANNEL channel clause enables you to name which replication channel the statement applies to. Providing a FOR CHANNEL channel clause applies the STOP REPLICA statement to a specific replication channel. If no channel is named and no extra channels exist, the statement applies to the default channel. If a STOP REPLICA statement does not name a channel when using multiple channels, this statement stops the specified threads for all channels. See Section 19.2.2, "Replication Channels" for more information.

The replication channels for Group Replication (group_replication_applier and group_replication_recovery) are managed automatically by the server instance. STOP REPLICA cannot be used at all with the group_replication_recovery channel, and should only
be used with the group_replication_applier channel when Group Replication is not running. The group_replication_applier channel only has an applier thread and has no receiver thread, so it can be stopped if required by using the SQL_THREAD option without the IO_THREAD option.

When the replica is multithreaded (replica_parallel_workers is a nonzero value), any gaps in the sequence of transactions executed from the relay log are closed as part of stopping the worker threads. If the replica is stopped unexpectedly (for example due to an error in a worker thread, or another thread issuing KILL) while a STOP REPLICA statement is executing, the sequence of executed transactions from the relay log may become inconsistent. See Section 19.5.1.34, "Replication and Transaction Inconsistencies", for more information.

When the source is using the row-based binary logging format, you should execute STOP REPLICA or STOP REPLICA SQL_THREAD on the replica prior to shutting down the replica server if you are replicating any tables that use a nontransactional storage engine. If the current replication event group has modified one or more nontransactional tables, STOP REPLICA waits for up to 60 seconds for the event group to complete, unless you issue a KILL QUERY or KILL CONNECTION statement for the replication SQL thread. If the event group remains incomplete after the timeout, an error message is logged.

When the source is using the statement-based binary logging format, changing the source while it has open temporary tables is potentially unsafe. This is one of the reasons why statement-based replication of temporary tables is not recommended. You can find out whether there are any temporary tables on the replica by checking the value of Replica_open_temp_tables. When using statement-based replication, this value should be 0 before executing CHANGE REPLICATION SOURCE TO. If there are any temporary tables open on the replica, issuing a CHANGE REPLICATION SOURCE TO statement after issuing a STOP REPLICA causes an ER_WARN_OPEN_TEMP_TABLES_MUST_BE_ZERO warning.

\subsection*{15.4.3 SQL Statements for Controlling Group Replication}

This section provides information about the statements used for controlling group replication.

\subsection*{15.4.3.1 START GROUP_REPLICATION Statement}
```
START GROUP_REPLICATION
    [USER='user_name']
    [, PASSWORD='user_pass']
    [, DEFAULT_AUTH='plugin_name']
```


Starts group replication. This statement requires the GROUP_REPLICATION_ADMIN privilege (or the deprecated SUPER privilege). If super_read_only=ON is set and the member should join as a primary, super_read_only is set to 0FF once Group Replication successfully starts.

A server that participates in a group in single-primary mode should use skip_replica_start=ON. Otherwise, the server is not allowed to join a group as a secondary.

You can specify user credentials for distributed recovery in the START GROUP_REPLICATION statement using the USER, PASSWORD, and DEFAULT_AUTH options, as follows:
- USER: The replication user for distributed recovery. For instructions to set up this account, see Section 20.2.1.3, "User Credentials For Distributed Recovery". You cannot specify an empty or null string, or omit the USER option if PASSWORD is specified.
- PASSWORD: The password for the replication user account. The password cannot be encrypted, but it is masked in the query log.
- DEFAULT_AUTH: The name of the authentication plugin used for the replication user account. If you do not specify this option, MySQL native authentication (the mysql_native_password plugin) is assumed. This option acts as a hint to the server, and the donor for distributed recovery overrides it if a different plugin is associated with the user account on that server. The authentication plugin used by default when you create user accounts in MySQL 8 is the caching SHA-2 authentication plugin (caching_sha2_password). See Section 8.2.17, "Pluggable Authentication" for more information on authentication plugins.

These credentials are used for distributed recovery on the group_replication_recovery channel. When you specify user credentials on START GROUP_REPLICATION, the credentials are saved in memory only, and are removed by a STOP GROUP_REPLICATION statement or server shutdown. You must issue a START GROUP_REPLICATION statement to provide the credentials again. This method is therefore not compatible with starting Group Replication automatically on server start, as specified by the group_replication_start_on_boot system variable.

User credentials specified on START GROUP_REPLICATION take precedence over any user credentials set for the group_replication_recovery channel using a CHANGE REPLICATION SOURCE TO. Note that user credentials set using these statements are stored in the replication metadata repositories, and are used when START GROUP_REPLICATION is specified without user credentials, including automatic starts if the group_replication_start_on_boot system variable is set to ON. To gain the security benefits of specifying user credentials on START GROUP_REPLICATION, ensure that group_replication_start_on_boot is set to OFF (the default is ON), and clear any user credentials previously set for the group_replication_recovery channel, following the instructions in Section 20.6.3, "Securing Distributed Recovery Connections".

While a member is rejoining a replication group, its status can be displayed as OFFLINE or ERROR before the group completes the compatibility checks and accepts it as a member. When the member is catching up with the group's transactions, its status is RECOVERING.

\subsection*{15.4.3.2 STOP GROUP_REPLICATION Statement}

\section*{STOP GROUP_REPLICATION}

Stops Group Replication. This statement requires the GROUP_REPLICATION_ADMIN privilege (or the deprecated SUPER privilege). As soon as you issue STOP GROUP_REPLICATION the member is set to super_read_only=0N, which ensures that no writes can be made to the member while Group Replication stops. Any other asynchronous replication channels running on the member are also stopped. Any user credentials that you specified in the START GROUP_REPLICATION statement when starting Group Replication on this member are removed from memory, and must be supplied when you start Group Replication again.

\section*{Warning}

Use this statement with extreme caution because it removes the server instance from the group, meaning it is no longer protected by Group Replication's consistency guarantee mechanisms. To be completely safe, ensure that your applications can no longer connect to the instance before issuing this statement to avoid any chance of stale reads.

The STOP GROUP_REPLICATION statement stops asynchronous replication channels on the group member, but it does not implicitly commit transactions that are in progress on them like STOP REPLICA does. This is because on a Group Replication group member, an additional transaction committed during the shutdown operation would leave the member inconsistent with the group and cause an issue with rejoining. To avoid failed commits for transactions that are in progress while stopping Group Replication, the STOP GROUP_REPLICATION statement cannot be issued while a GTID is assigned as the value of the gtid_next system variable.

The group_replication_components_stop_timeout system variable specifies the time for which Group Replication waits for each of its modules to complete ongoing processes after this statement is issued. The timeout is used to resolve situations in which Group Replication components cannot be stopped normally, which can happen if the member is expelled from the group while it is in an error state, or while a process such as MySQL Enterprise Backup is holding a global lock on tables on the member. In such situations, the member cannot stop the applier thread or complete the distributed recovery process to rejoin. STOP GROUP_REPLICATION does not complete until either the situation is resolved (for example, by the lock being released), or the component timeout expires and the modules are shut down regardless of their status. The default value is 300 seconds; this means that Group Replication components are stopped after 5 minutes if the situation is not resolved before that time, allowing the member to be restarted and rejoin.

\subsection*{15.5 Prepared Statements}

MySQL 8.4 provides support for server-side prepared statements. This support takes advantage of the efficient client/server binary protocol. Using prepared statements with placeholders for parameter values has the following benefits:
- Less overhead for parsing the statement each time it is executed. Typically, database applications process large volumes of almost-identical statements, with only changes to literal or variable values in clauses such as WHERE for queries and deletes, SET for updates, and VALUES for inserts.
- Protection against SQL injection attacks. The parameter values can contain unescaped SQL quote and delimiter characters.

The following sections provide an overview of the characteristics of prepared statements:
- Prepared Statements in Application Programs
- Prepared Statements in SQL Scripts
- PREPARE, EXECUTE, and DEALLOCATE PREPARE Statements
- SQL Syntax Permitted in Prepared Statements

\section*{Prepared Statements in Application Programs}

You can use server-side prepared statements through client programming interfaces, including the MySQL C API client library for C programs, MySQL Connector/J for Java programs, and MySQL Connector/NET for programs using .NET technologies. For example, the C API provides a set of function calls that make up its prepared statement API. See C API Prepared Statement Interface. Other language interfaces can provide support for prepared statements that use the binary protocol by linking in the C client library, one example being the mysqli extension, available in PHP 5.0 and later.

\section*{Prepared Statements in SQL Scripts}

An alternative SQL interface to prepared statements is available. This interface is not as efficient as using the binary protocol through a prepared statement API, but requires no programming because it is available directly at the SQL level:
- You can use it when no programming interface is available to you.
- You can use it from any program that can send SQL statements to the server to be executed, such as the mysql client program.
- You can use it even if the client is using an old version of the client library.

SQL syntax for prepared statements is intended to be used for situations such as these:
- To test how prepared statements work in your application before coding it.
- To use prepared statements when you do not have access to a programming API that supports them.
- To interactively troubleshoot application issues with prepared statements.
- To create a test case that reproduces a problem with prepared statements, so that you can file a bug report.

\section*{PREPARE, EXECUTE, and DEALLOCATE PREPARE Statements}

SQL syntax for prepared statements is based on three SQL statements:
- PREPARE prepares a statement for execution (see Section 15.5.1, "PREPARE Statement").
- EXECUTE executes a prepared statement (see Section 15.5.2, "EXECUTE Statement").
- DEALLOCATE PREPARE releases a prepared statement (see Section 15.5.3, "DEALLOCATE PREPARE Statement").

The following examples show two equivalent ways of preparing a statement that computes the hypotenuse of a triangle given the lengths of the two sides.

The first example shows how to create a prepared statement by using a string literal to supply the text of the statement:
```
mysql> PREPARE stmt1 FROM 'SELECT SQRT(POW(?,2) + POW(?,2)) AS hypotenuse';
mysql> SET @a = 3;
mysql> SET @b = 4;
mysql> EXECUTE stmt1 USING @a, @b;
+-------------+
| hypotenuse |
+-------------+
| 5 |
+-------------+
mysql> DEALLOCATE PREPARE stmt1;
```


The second example is similar, but supplies the text of the statement as a user variable:
```
mysql> SET @s = 'SELECT SQRT(POW(?,2) + POW(?,2)) AS hypotenuse';
mysql> PREPARE stmt2 FROM @s;
mysql> SET @a = 6;
mysql> SET @b = 8;
mysql> EXECUTE stmt2 USING @a, @b;
+-------------+
| hypotenuse |
+-------------+
| 10 |
+-------------+
mysql> DEALLOCATE PREPARE stmt2;
```


Here is an additional example that demonstrates how to choose the table on which to perform a query at runtime, by storing the name of the table as a user variable:
```
mysql> USE test;
mysql> CREATE TABLE t1 (a INT NOT NULL);
mysql> INSERT INTO t1 VALUES (4), (8), (11), (32), (80);
mysql> SET @table = 't1';
mysql> SET @s = CONCAT('SELECT * FROM ', @table);
mysql> PREPARE stmt3 FROM @s;
mysql> EXECUTE stmt3;
+----+
| a |
+----+
| 4 |
| 8 |
| 11 |
| 32 |
| 80 |
+----+
mysql> DEALLOCATE PREPARE stmt3;
```


A prepared statement is specific to the session in which it was created. If you terminate a session without deallocating a previously prepared statement, the server deallocates it automatically.

A prepared statement is also global to the session. If you create a prepared statement within a stored routine, it is not deallocated when the stored routine ends.

To guard against too many prepared statements being created simultaneously, set the max_prepared_stmt_count system variable. To prevent the use of prepared statements, set the value to 0 .

\section*{SQL Syntax Permitted in Prepared Statements}

The following SQL statements can be used as prepared statements:
```
ALTER {INSTANCE | TABLE | USER}
ANALYZE
CALL
CHANGE {REPLICATION SOURCE TO | REPLICATION FILTER}
CHECKSUM
COMMIT
{CREATE | DROP} INDEX
{CREATE | DROP | RENAME} DATABASE
{CREATE | DROP | RENAME} TABLE
{CREATE | DROP | RENAME} USER
DEALLOCATE PREPARE
DROP VIEW
DELETE
DO
EXECUTE
FLUSH
GRANT {ROLE}
INSERT
INSTALL PLUGIN
KILL
OPTIMIZE
PREPARE
REPAIR TABLE
REPLACE
REPLICA {START | STOP}
RESET
REVOKE {ALL | ROLE}
SELECT
SET ROLE
SHOW {BINLOG EVENTS | BINARY LOGS | BINARY LOG STATUS | CHARACTER SETS | COLLATIONS | DATABASES | ENGINES
    ERRORS | EVENTS | FIELDS | FUNCTION CODE | FUNCTION STATUS | GRANTS | KEYS | OPEN TABLES |
    PLUGINS | PRIVILEGES | PROCEDURE CODE | PROCEDURE STATUS | PROCESSLIST | PROFILE | PROFILES |
    RELAYLOG EVENTS | REPLICAS | REPLICA STATUS | STATUS | PROCEDURE STATUS | TABLE STATUS | TABLES |
    TRIGGERS | VARIABLES | WARNINGS}
SHOW CREATE { DATABASE | EVENT | FUNCTION | PROCEDURE | TABLE | TRIGGER | USER | VIEW}
TRUNCATE
UNINSTALL PLUGIN
UPDATE
```


\begin{figure}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2774.jpg?height=127&width=99&top_left_y=1708&top_left_x=306}
\captionsetup{labelformat=empty}
\caption{Note}
\end{figure}

CREATE TABLE ... START TRANSACTION is not supported in prepared statements.

Other statements are not supported.
For compliance with the SQL standard, which states that diagnostics statements are not preparable, MySQL does not support the following as prepared statements:
- SHOW COUNT(*) WARNINGS
- SHOW COUNT(*) ERRORS
- Statements containing any reference to the warning_count or error_count system variable.

Generally, statements not permitted in SQL prepared statements are also not permitted in stored programs. Exceptions are noted in Section 27.8, "Restrictions on Stored Programs".

Metadata changes to tables or views referred to by prepared statements are detected and cause automatic repreparation of the statement when it is next executed. For more information, see Section 10.10.3, "Caching of Prepared Statements and Stored Programs".

Placeholders can be used for the arguments of the LIMIT clause when using prepared statements. See Section 15.2.13, "SELECT Statement".

In prepared CALL statements used with PREPARE and EXECUTE, placeholder support for OUT and INOUT parameters is available beginning with MySQL 8.4. See Section 15.2.1, "CALL Statement", for an example and a workaround for earlier versions. Placeholders can be used for IN parameters regardless of version.

SQL syntax for prepared statements cannot be used in nested fashion. That is, a statement passed to PREPARE cannot itself be a PREPARE, EXECUTE, or DEALLOCATE PREPARE statement.

SQL syntax for prepared statements is distinct from using prepared statement API calls. For example, you cannot use the mysql_stmt_prepare() C API function to prepare a PREPARE, EXECUTE, or DEALLOCATE PREPARE statement.

SQL syntax for prepared statements can be used within stored procedures, but not in stored functions or triggers. However, a cursor cannot be used for a dynamic statement that is prepared and executed with PREPARE and EXECUTE. The statement for a cursor is checked at cursor creation time, so the statement cannot be dynamic.

SQL syntax for prepared statements does not support multi-statements (that is, multiple statements within a single string separated by ; characters).

To write C programs that use the CALL SQL statement to execute stored procedures that contain prepared statements, the CLIENT_MULTI_RESULTS flag must be enabled. This is because each CALL returns a result to indicate the call status, in addition to any result sets that might be returned by statements executed within the procedure.

CLIENT_MULTI_RESULTS can be enabled when you call mysql_real_connect (), either explicitly by passing the CLIENT_MULTI_RESULTS flag itself, or implicitly by passing CLIENT_MULTI_STATEMENTS (which also enables CLIENT_MULTI_RESULTS). For additional information, see Section 15.2.1, "CALL Statement".

\subsection*{15.5.1 PREPARE Statement}

PREPARE stmt_name FROM preparable_stmt
The PREPARE statement prepares a SQL statement and assigns it a name, stmt_name, by which to refer to the statement later. The prepared statement is executed with EXECUTE and released with DEALLOCATE PREPARE. For examples, see Section 15.5, "Prepared Statements".

Statement names are not case-sensitive. preparable_stmt is either a string literal or a user variable that contains the text of the SQL statement. The text must represent a single statement, not multiple statements. Within the statement, ? characters can be used as parameter markers to indicate where data values are to be bound to the query later when you execute it. The ? characters should not be enclosed within quotation marks, even if you intend to bind them to string values. Parameter markers can be used only where data values should appear, not for SQL keywords, identifiers, and so forth.

If a prepared statement with the given name already exists, it is deallocated implicitly before the new statement is prepared. This means that if the new statement contains an error and cannot be prepared, an error is returned and no statement with the given name exists.

The scope of a prepared statement is the session within which it is created, which as several implications:
- A prepared statement created in one session is not available to other sessions.
- When a session ends, whether normally or abnormally, its prepared statements no longer exist. If auto-reconnect is enabled, the client is not notified that the connection was lost. For this reason, clients may wish to disable auto-reconnect. See Automatic Reconnection Control.
- A prepared statement created within a stored program continues to exist after the program finishes executing and can be executed outside the program later.
- A statement prepared in stored program context cannot refer to stored procedure or function parameters or local variables because they go out of scope when the program ends and would be unavailable were the statement to be executed later outside the program. As a workaround, refer instead to user-defined variables, which also have session scope; see Section 11.4, "User-Defined Variables".

The type of a parameter used in a prepared statement is determined when the statement is first prepared; it retains this type whenever EXECUTE is invoked for this prepared statement (unless the statement is reprepared, as explained later in this section). Rules for determining a parameter's type are listed here:
- A parameter which is an operand of a binary arithmetic operator has the same data type as the other operand.
- If both operands of a binary arithmetic operator are parameters, the type of the parameters is decided by the context of the operator.
- If a parameter is the operand of a unary arithmetic operator, the parameter's type is decided by the context of the operator.
- If an arithmetic operator has no type-determining context, the derived type for any parameters involved is DOUBLE PRECISION. This can happen, for example, when the parameter is a top-level node in a SELECT list, or when it is part of a comparison operator.
- A parameter which is an operand of a character string operator has the same derived type as the aggregated type of the other operands. If all operands of the operator are parameters, the derived type is VARCHAR; its collation is determined by the value of collation_connection.
- A parameter which is an operand of a temporal operator has type DATETIME if the operator returns a DATETIME, TIME if the operator returns a TIME, and DATE if the operator returns a DATE.
- A parameter which is an operand of a binary comparison operator has the same derived type as the other operand of the comparison.
- A parameter that is an operand of a ternary comparison operator such as BETWEEN has the same derived type as the aggregated type of the other operands.
- If all operands of a comparison operator are parameters, the derived type for each of them is VARCHAR, with collation determined by the value of collation_connection.
- A parameter that is an output operand of any of CASE, COALESCE, IF, IFNULL, or NULLIF has the same derived type as the aggregated type of the operator's other output operands.
- If all output operands of any of CASE, COALESCE, IF, IFNULL, or NULLIF are parameters, or they are all NULL, the type of the parameter is decided by the context of the operator.
- If the parameter is an operand of any of CASE, COALESCE( ), IF, or IFNULL, and has no typedetermining context, the derived type for each of the parameters involved is VARCHAR, and its collation is determined by the value of collation_connection.
- A parameter which is the operand of a CAST( ) has the same type as specified by the CAST( ).
- If a parameter is an immediate member of a SELECT list that is not part of an INSERT statement, the derived type of the parameter is VARCHAR, and its collation is determined by the value of collation_connection.
- If a parameter is an immediate member of a SELECT list that is part of an INSERT statement, the derived type of the parameter is the type of the corresponding column into which the parameter is inserted.
- If a parameter is used as source for an assignment in a SET clause of an UPDATE statement or in the ON DUPLICATE KEY UPDATE clause of an INSERT statement, the derived type of the parameter is
the type of the corresponding column which is updated by the SET or ON DUPLICATE KEY UPDATE clause.
- If a parameter is an argument of a function, the derived type depends on the function's return type.

For some combinations of actual type and derived type, an automatic repreparation of the statement is triggered, to ensure closer compatibility with previous versions of MySQL. Repreparation does not occur if any of the following conditions are true:
- NULL is used as the actual parameter value.
- A parameter is an operand of a CAST( ). (Instead, a cast to the derived type is attempted, and an exception raised if the cast fails.)
- A parameter is a string. (In this case, an implicit CAST(? AS derived_type) is performed.)
- The derived type and actual type of the parameter are both INTEGER and have the same sign.
- The parameter's derived type is DECIMAL and its actual type is either DECIMAL or INTEGER.
- The derived type is DOUBLE and the actual type is any numeric type.
- Both the derived type and the actual type are string types.
- If the derived type is temporal and the actual type is temporal. Exceptions: The derived type is TIME and the actual type is not TIME; the derived type is DATE and the actual type is not DATE.
- The derived type is temporal and the actual type is numeric.

For cases other than those just listed, the statement is reprepared and the actual parameter types are used instead of the derived parameter types.

These rules also apply to a user variable referenced in a prepared statement.
Using a different data type for a given parameter or user variable within a prepared statement for executions of the statement subsequent to the first execution causes the statement to be reprepared. This is less efficient; it may also lead to the parameter's (or variable's) actual type to vary, and thus for results to be inconsistent, with subsequent executions of the prepared statement. For these reasons, it is advisable to use the same data type for a given parameter when re-executing a prepared statement.

\subsection*{15.5.2 EXECUTE Statement}
```
EXECUTE stmt_name
    [USING @var_name [, @var_name] ...]
```


After preparing a statement with PREPARE, you execute it with an EXECUTE statement that refers to the prepared statement name. If the prepared statement contains any parameter markers, you must supply a USING clause that lists user variables containing the values to be bound to the parameters. Parameter values can be supplied only by user variables, and the USING clause must name exactly as many variables as the number of parameter markers in the statement.

You can execute a given prepared statement multiple times, passing different variables to it or setting the variables to different values before each execution.

For examples, see Section 15.5, "Prepared Statements".

\subsection*{15.5.3 DEALLOCATE PREPARE Statement}
\{DEALLOCATE | DROP\} PREPARE stmt_name
To deallocate a prepared statement produced with PREPARE, use a DEALLOCATE PREPARE statement that refers to the prepared statement name. Attempting to execute a prepared statement after deallocating it results in an error. If too many prepared statements are created and not deallocated by
either the DEALLOCATE PREPARE statement or the end of the session, you might encounter the upper limit enforced by the max_prepared_stmt_count system variable.

For examples, see Section 15.5, "Prepared Statements".

\subsection*{15.6 Compound Statement Syntax}

This section describes the syntax for the BEGIN . . . END compound statement and other statements that can be used in the body of stored programs: Stored procedures and functions, triggers, and events. These objects are defined in terms of SQL code that is stored on the server for later invocation (see Chapter 27, Stored Objects).

A compound statement is a block that can contain other blocks; declarations for variables, condition handlers, and cursors; and flow control constructs such as loops and conditional tests.

\subsection*{15.6.1 BEGIN ... END Compound Statement}
```
[begin_label:] BEGIN
    [statement_list]
END [end_label]
```


BEGIN . . . END syntax is used for writing compound statements, which can appear within stored programs (stored procedures and functions, triggers, and events). A compound statement can contain multiple statements, enclosed by the BEGIN and END keywords. statement_list represents a list of one or more statements, each terminated by a semicolon (;) statement delimiter. The statement_list itself is optional, so the empty compound statement (BEGIN END) is legal.

BEGIN ... END blocks can be nested.
Use of multiple statements requires that a client is able to send statement strings containing the ; statement delimiter. In the mysql command-line client, this is handled with the delimiter command. Changing the ; end-of-statement delimiter (for example, to //) permit ; to be used in a program body. For an example, see Section 27.1, "Defining Stored Programs".

A BEGIN . . . END block can be labeled. See Section 15.6.2, "Statement Labels".
The optional [NOT] ATOMIC clause is not supported. This means that no transactional savepoint is set at the start of the instruction block and the BEGIN clause used in this context has no effect on the current transaction.

\section*{Note}

Within all stored programs, the parser treats BEGIN [WORK] as the beginning of a BEGIN ... END block. To begin a transaction in this context, use START TRANSACTION instead.

\subsection*{15.6.2 Statement Labels}
```
[begin_label:] BEGIN
    [statement_list]
END [end_label]
[begin_label:] LOOP
    statement_list
END LOOP [end_label]
[begin_label:] REPEAT
    statement_list
UNTIL search_condition
END REPEAT [end_label]
[begin_label:] WHILE search_condition DO
    statement_list
END WHILE [end_label]
```


Labels are permitted for BEGIN . . . END blocks and for the LOOP, REPEAT, and WHILE statements. Label use for those statements follows these rules:
- begin_label must be followed by a colon.
- begin_label can be given without end_label. If end_label is present, it must be the same as begin_label.
- end_label cannot be given without begin_label.
- Labels at the same nesting level must be distinct.
- Labels can be up to 16 characters long.

To refer to a label within the labeled construct, use an ITERATE or LEAVE statement. The following example uses those statements to continue iterating or terminate the loop:
```
CREATE PROCEDURE doiterate(p1 INT)
BEGIN
    label1: LOOP
        SET p1 = p1 + 1;
        IF p1 < 10 THEN ITERATE label1; END IF;
        LEAVE label1;
    END LOOP label1;
END;
```


The scope of a block label does not include the code for handlers declared within the block. For details, see Section 15.6.7.2, "DECLARE ... HANDLER Statement".

\subsection*{15.6.3 DECLARE Statement}

The DECLARE statement is used to define various items local to a program:
- Local variables. See Section 15.6.4, "Variables in Stored Programs".
- Conditions and handlers. See Section 15.6.7, "Condition Handling".
- Cursors. See Section 15.6.6, "Cursors".

DECLARE is permitted only inside a BEGIN ... END compound statement and must be at its start, before any other statements.

Declarations must follow a certain order. Cursor declarations must appear before handler declarations. Variable and condition declarations must appear before cursor or handler declarations.

\subsection*{15.6.4 Variables in Stored Programs}

System variables and user-defined variables can be used in stored programs, just as they can be used outside stored-program context. In addition, stored programs can use DECLARE to define local variables, and stored routines (procedures and functions) can be declared to take parameters that communicate values between the routine and its caller.
- To declare local variables, use the DECLARE statement, as described in Section 15.6.4.1, "Local Variable DECLARE Statement".
- Variables can be set directly with the SET statement. See Section 15.7.6.1, "SET Syntax for Variable Assignment".
- Results from queries can be retrieved into local variables using SELECT ... INTO var_list or by opening a cursor and using FETCH ... INTO var_list. See Section 15.2.13.1, "SELECT ... INTO Statement", and Section 15.6.6, "Cursors".

For information about the scope of local variables and how MySQL resolves ambiguous names, see Section 15.6.4.2, "Local Variable Scope and Resolution".

It is not permitted to assign the value DEFAULT to stored procedure or function parameters or stored program local variables (for example with a SET var_name = DEFAULT statement). In MySQL 8.4, this results in a syntax error.

\subsection*{15.6.4.1 Local Variable DECLARE Statement}

DECLARE var_name [, var_name] ... type [DEFAULT value]
This statement declares local variables within stored programs. To provide a default value for a variable, include a DEFAULT clause. The value can be specified as an expression; it need not be a constant. If the DEFAULT clause is missing, the initial value is NULL.

Local variables are treated like stored routine parameters with respect to data type and overflow checking. See Section 15.1.17, "CREATE PROCEDURE and CREATE FUNCTION Statements".

Variable declarations must appear before cursor or handler declarations.
Local variable names are not case-sensitive. Permissible characters and quoting rules are the same as for other identifiers, as described in Section 11.2, "Schema Object Names".

The scope of a local variable is the BEGIN . . . END block within which it is declared. The variable can be referred to in blocks nested within the declaring block, except those blocks that declare a variable with the same name.

For examples of variable declarations, see Section 15.6.4.2, "Local Variable Scope and Resolution".

\subsection*{15.6.4.2 Local Variable Scope and Resolution}

The scope of a local variable is the BEGIN . . . END block within which it is declared. The variable can be referred to in blocks nested within the declaring block, except those blocks that declare a variable with the same name.

Because local variables are in scope only during stored program execution, references to them are not permitted in prepared statements created within a stored program. Prepared statement scope is the current session, not the stored program, so the statement could be executed after the program ends, at which point the variables would no longer be in scope. For example, SELECT . . . INTO local_var cannot be used as a prepared statement. This restriction also applies to stored procedure and function parameters. See Section 15.5.1, "PREPARE Statement".

A local variable should not have the same name as a table column. If an SQL statement, such as a SELECT . . . INTO statement, contains a reference to a column and a declared local variable with the same name, MySQL currently interprets the reference as the name of a variable. Consider the following procedure definition:
```
CREATE PROCEDURE sp1 (x VARCHAR(5))
BEGIN
    DECLARE xname VARCHAR(5) DEFAULT 'bob';
    DECLARE newname VARCHAR(5);
    DECLARE xid INT;
    SELECT xname, id INTO newname, xid
        FROM table1 WHERE xname = xname;
    SELECT newname;
END;
```


MySQL interprets xname in the SELECT statement as a reference to the xname variable rather than the xname column. Consequently, when the procedure sp1( )is called, the newname variable returns the value 'bob ' regardless of the value of the table1.xname column.

Similarly, the cursor definition in the following procedure contains a SELECT statement that refers to xname. MySQL interprets this as a reference to the variable of that name rather than a column reference.
```
CREATE PROCEDURE sp2 (x VARCHAR(5))
```

```
BEGIN
    DECLARE xname VARCHAR(5) DEFAULT 'bob';
    DECLARE newname VARCHAR(5);
    DECLARE xid INT;
    DECLARE done TINYINT DEFAULT 0;
    DECLARE cur1 CURSOR FOR SELECT xname, id FROM table1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
    OPEN cur1;
    read_loop: LOOP
        FETCH FROM cur1 INTO newname, xid;
        IF done THEN LEAVE read_loop; END IF;
        SELECT newname;
    END LOOP;
    CLOSE cur1;
END;
```


See also Section 27.8, "Restrictions on Stored Programs".

\subsection*{15.6.5 Flow Control Statements}

MySQL supports the IF, CASE, ITERATE, LEAVE LOOP, WHILE, and REPEAT constructs for flow control within stored programs. It also supports RETURN within stored functions.

Many of these constructs contain other statements, as indicated by the grammar specifications in the following sections. Such constructs may be nested. For example, an IF statement might contain a WHILE loop, which itself contains a CASE statement.

MySQL does not support FOR loops.

\subsection*{15.6.5.1 CASE Statement}
```
CASE case_value
    WHEN when_value THEN statement_list
    [WHEN when_value THEN statement_list] ...
    [ELSE statement_list]
END CASE
```


Or:
```
CASE
    WHEN search_condition THEN statement_list
    [WHEN search_condition THEN statement_list] ...
    [ELSE statement_list]
END CASE
```


The CASE statement for stored programs implements a complex conditional construct.

\section*{Note}

There is also a CASE operator, which differs from the CASE statement described here. See Section 14.5, "Flow Control Functions". The CASE statement cannot have an ELSE NULL clause, and it is terminated with END CASE instead of END.

For the first syntax, case_value is an expression. This value is compared to the when_value expression in each WHEN clause until one of them is equal. When an equal when_value is found, the corresponding THEN clause statement_list executes. If no when_value is equal, the ELSE clause statement_list executes, if there is one.

This syntax cannot be used to test for equality with NULL because NULL = NULL is false. See Section 5.3.4.6, "Working with NULL Values".

For the second syntax, each WHEN clause search_condition expression is evaluated until one is true, at which point its corresponding THEN clause statement_list executes. If no search_condition is equal, the ELSE clause statement_list executes, if there is one.

If no when_value or search_condition matches the value tested and the CASE statement contains no ELSE clause, a Case not found for CASE statement error results.

Each statement_list consists of one or more SQL statements; an empty statement_list is not permitted.

To handle situations where no value is matched by any WHEN clause, use an ELSE containing an empty BEGIN . . . END block, as shown in this example. (The indentation used here in the ELSE clause is for purposes of clarity only, and is not otherwise significant.)
```
DELIMITER |
CREATE PROCEDURE p()
    BEGIN
        DECLARE v INT DEFAULT 1;
        CASE v
            WHEN 2 THEN SELECT v;
            WHEN 3 THEN SELECT 0;
            ELSE
                BEGIN
                END;
        END CASE;
    END;
    |
```


\subsection*{15.6.5.2 IF Statement}
```
IF search_condition THEN statement_list
    [ELSEIF search_condition THEN statement_list] ...
    [ELSE statement_list]
END IF
```


The IF statement for stored programs implements a basic conditional construct.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2782.jpg?height=125&width=99&top_left_y=1507&top_left_x=306)

\section*{Note}

There is also an IF( ) function, which differs from the IF statement described here. See Section 14.5, "Flow Control Functions". The IF statement can have THEN, ELSE, and ELSEIF clauses, and it is terminated with END IF.

If a given search_condition evaluates to true, the corresponding THEN or ELSEIF clause statement_list executes. If no search_condition matches, the ELSE clause statement_list executes.

Each statement_list consists of one or more SQL statements; an empty statement_list is not permitted.

An IF . . . END IF block, like all other flow-control blocks used within stored programs, must be terminated with a semicolon, as shown in this example:
```
DELIMITER //
CREATE FUNCTION SimpleCompare(n INT, m INT)
    RETURNS VARCHAR(20)
    BEGIN
        DECLARE s VARCHAR(20);
        IF n > m THEN SET s = '>';
        ELSEIF n = m THEN SET s = '=';
        ELSE SET s = '<';
        END IF;
        SET s = CONCAT(n, ' ', s, ' ', m);
        RETURN s;
```

```
END //
DELIMITER ;
```


As with other flow-control constructs, IF ... END IF blocks may be nested within other flow-control constructs, including other IF statements. Each IF must be terminated by its own END IF followed by a semicolon. You can use indentation to make nested flow-control blocks more easily readable by humans (although this is not required by MySQL), as shown here:
```
DELIMITER //
CREATE FUNCTION VerboseCompare (n INT, m INT)
    RETURNS VARCHAR(50)
    BEGIN
        DECLARE s VARCHAR(50);
        IF n = m THEN SET s = 'equals';
        ELSE
            IF n > m THEN SET s = 'greater';
            ELSE SET s = 'less';
            END IF;
            SET s = CONCAT('is ', s, ' than');
        END IF;
        SET s = CONCAT(n, ' ', s, ' ', m, '.');
        RETURN s;
    END //
DELIMITER ;
```


In this example, the inner IF is evaluated only if n is not equal to m .

\subsection*{15.6.5.3 ITERATE Statement}

