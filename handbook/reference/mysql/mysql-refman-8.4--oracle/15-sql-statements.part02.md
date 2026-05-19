\section*{Locking}

MySQL extends metadata locks, as necessary, to tables that are related by a foreign key constraint. Extending metadata locks prevents conflicting DML and DDL operations from executing concurrently on related tables. This feature also enables updates to foreign key metadata when a parent table is modified. In earlier MySQL releases, foreign key metadata, which is owned by the child table, could not be updated safely.

If a table is locked explicitly with LOCK TABLES, any tables related by a foreign key constraint are opened and locked implicitly. For foreign key checks, a shared read-only lock (LOCK TABLES READ) is taken on related tables. For cascading updates, a shared-nothing write lock (LOCK TABLES WRITE) is taken on related tables that are involved in the operation.

\section*{Foreign Key Definitions and Metadata}

To view a foreign key definition, use SHOW CREATE TABLE:
```
mysql> SHOW CREATE TABLE child\G
************************** 1. row
        Table: child
Create Table: CREATE TABLE ˋchildˋ (
    ˋidˋ int DEFAULT NULL,
    ˋparent_idˋ int DEFAULT NULL,
    KEY ˋpar_indˋ (ˋparent_idˋ),
    CONSTRAINT ˋchild_ibfk_1ˋ FOREIGN KEY (ˋparent_idˋ)
    REFERENCES ˋparentˋ (ˋidˋ) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```


You can obtain information about foreign keys from the Information Schema KEY_COLUMN_USAGE table. An example of a query against this table is shown here:
```
mysql> SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_SCHEMA IS NOT NULL;
+---------------+-------------+-------------+-----------------
| TABLE_SCHEMA | TABLE_NAME | COLUMN_NAME | CONSTRAINT_NAME |
+---------------+-------------+-------------+-----------------
| test | child | parent_id | child_ibfk_1 |
+---------------+-------------+-------------+-----------------
```


You can obtain information specific to InnoDB foreign keys from the INNODB_FOREIGN and INNODB_FOREIGN_COLS tables. Example queries are show here:
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FOREIGN \G
************************** 1. row ******************************
            ID: test/child_ibfk_1
FOR_NAME: test/child
REF_NAME: test/parent
    N_COLS: 1
        TYPE: 1
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FOREIGN_COLS \G
*************************** 1. row ***************************************
                ID: test/child_ibfk_1
FOR_COL_NAME: parent_id
REF_COL_NAME: id
```

```
POS: 0
```


\section*{Foreign Key Errors}

In the event of a foreign key error involving InnoDB tables (usually Error 150 in the MySQL Server), information about the latest foreign key error can be obtained by checking SHOW ENGINE INNODB STATUS output.
```
mysql> SHOW ENGINE INNODB STATUS\G
...
-------------------------
LATEST FOREIGN KEY ERROR
--------------------------
2018-04-12 14:57:24 0x7f97a9c91700 Transaction:
TRANSACTION 7717, ACTIVE 0 sec inserting
mysql tables in use 1, locked 1
4 lock struct(s), heap size 1136, 3 row lock(s), undo log entries 3
MySQL thread id 8, OS thread handle 140289365317376, query id 14 localhost root update
INSERT INTO child VALUES (NULL, 1), (NULL, 2), (NULL, 3), (NULL, 4), (NULL, 5), (NULL, 6)
Foreign key constraint fails for table ˋtestˋ.ˋchildˋ:
,
    CONSTRAINT ˋchild_ibfk_1ˋ FOREIGN KEY (ˋparent_idˋ) REFERENCES ˋparentˋ (ˋidˋ) ON DELETE
    CASCADE ON UPDATE CASCADE
Trying to add in child table, in index par_ind tuple:
DATA TUPLE: 2 fields;
    0: len 4; hex 80000003; asc ;;
    1: len 4; hex 80000003; asc ;;
But in parent table ˋtestˋ.ˋparentˋ, in index PRIMARY,
the closest match we can find is record:
PHYSICAL RECORD: n_fields 3; compact format; info bits 0
    0: len 4; hex 80000004; asc ;;
    1: len 6; hex 000000001e19; asc ;;
    2: len 7; hex 81000001110137; asc 7;;
...
```


\section*{Warning}

If a user has table-level privileges for all parent tables, ER_NO_REFERENCED_ROW_2 and ER_ROW_IS_REFERENCED_2 error messages for foreign key operations expose information about parent tables. If a user does not have table-level privileges for all parent tables, more generic error messages are displayed instead (ER_NO_REFERENCED_ROW and ER_ROW_IS_REFERENCED).

An exception is that, for stored programs defined to execute with DEFINER privileges, the user against which privileges are assessed is the user in the program DEFINER clause, not the invoking user. If that user has table-level parent table privileges, parent table information is still displayed. In this case, it is the responsibility of the stored program creator to hide the information by including appropriate condition handlers.

\subsection*{15.1.20.6 CHECK Constraints}

CREATE TABLE permits the core features of table and column CHECK constraints, for all storage engines. CREATE TABLE permits the following CHECK constraint syntax, for both table constraints and column constraints:
[CONSTRAINT [symbol]] CHECK (expr) [[NOT] ENFORCED]
The optional symbol specifies a name for the constraint. If omitted, MySQL generates a name from the table name, a literal _chk_, and an ordinal number $(1,2,3, \ldots)$. Constraint names have a maximum length of 64 characters. They are case-sensitive, but not accent-sensitive.
expr specifies the constraint condition as a boolean expression that must evaluate to TRUE or UNKNOWN (for NULL values) for each row of the table. If the condition evaluates to FALSE, it fails and
a constraint violation occurs. The effect of a violation depends on the statement being executed, as described later in this section.

The optional enforcement clause indicates whether the constraint is enforced:
- If omitted or specified as ENFORCED, the constraint is created and enforced.
- If specified as NOT ENFORCED, the constraint is created but not enforced.

A CHECK constraint is specified as either a table constraint or column constraint:
- A table constraint does not appear within a column definition and can refer to any table column or columns. Forward references are permitted to columns appearing later in the table definition.
- A column constraint appears within a column definition and can refer only to that column.

Consider this table definition:
```
CREATE TABLE t1
(
    CHECK (c1 <> c2),
    c1 INT CHECK (c1 > 10),
    c2 INT CONSTRAINT c2_positive CHECK (c2 > 0),
    c3 INT CHECK (c3 < 100),
    CONSTRAINT c1_nonzero CHECK (c1 <> 0),
    CHECK (c1 > c3)
);
```


The definition includes table constraints and column constraints, in named and unnamed formats:
- The first constraint is a table constraint: It occurs outside any column definition, so it can (and does) refer to multiple table columns. This constraint contains forward references to columns not defined yet. No constraint name is specified, so MySQL generates a name.
- The next three constraints are column constraints: Each occurs within a column definition, and thus can refer only to the column being defined. One of the constraints is named explicitly. MySQL generates a name for each of the other two.
- The last two constraints are table constraints. One of them is named explicitly. MySQL generates a name for the other one.

As mentioned, MySQL generates a name for any CHECK constraint specified without one. To see the names generated for the preceding table definition, use SHOW CREATE TABLE:
```
mysql> SHOW CREATE TABLE t1\G
*************************** 1. row ****************************************
        Table: t1
Create Table: CREATE TABLE ˋt1ˋ (
    ˋc1ˋ int(11) DEFAULT NULL,
    ˋc2ˋ int(11) DEFAULT NULL,
    ˋc3ˋ int(11) DEFAULT NULL,
    CONSTRAINT ˋc1_nonzeroˋ CHECK ((ˋc1ˋ <> 0)),
    CONSTRAINT ˋc2_positiveˋ CHECK ((ˋc2ˋ > 0)),
    CONSTRAINT ˋt1_chk_1ˋ CHECK ((ˋc1ˋ <> ˋc2ˋ)),
    CONSTRAINT ˋt1_chk_2ˋ CHECK ((ˋc1ˋ > 10)),
    CONSTRAINT ˋt1_chk_3ˋ CHECK ((ˋc3ˋ < 100)),
    CONSTRAINT ˋt1_chk_4ˋ CHECK ((ˋc1ˋ > ˋc3ˋ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```


The SQL standard specifies that all types of constraints (primary key, unique index, foreign key, check) belong to the same namespace. In MySQL, each constraint type has its own namespace per schema (database). Consequently, CHECK constraint names must be unique per schema; no two tables in the same schema can share a CHECK constraint name. (Exception: A TEMPORARY table hides a non-TEMPORARY table of the same name, so it can have the same CHECK constraint names as well.)

Beginning generated constraint names with the table name helps ensure schema uniqueness because table names also must be unique within the schema.

CHECK condition expressions must adhere to the following rules. An error occurs if an expression contains disallowed constructs.
- Nongenerated and generated columns are permitted, except columns with the AUTO_INCREMENT attribute and columns in other tables.
- Literals, deterministic built-in functions, and operators are permitted. A function is deterministic if, given the same data in tables, multiple invocations produce the same result, independently of the connected user. Examples of functions that are nondeterministic and fail this definition: CONNECTION_ID( ), CURRENT_USER( ), NOW( ).
- Stored functions and loadable functions are not permitted.
- Stored procedure and function parameters are not permitted.
- Variables (system variables, user-defined variables, and stored program local variables) are not permitted.
- Subqueries are not permitted.

Foreign key referential actions (ON UPDATE, ON DELETE) are prohibited on columns used in CHECK constraints. Likewise, CHECK constraints are prohibited on columns used in foreign key referential actions.

CHECK constraints are evaluated for INSERT, UPDATE, REPLACE, LOAD DATA, and LOAD XML statements and an error occurs if a constraint evaluates to FALSE. If an error occurs, handling of changes already applied differs for transactional and nontransactional storage engines, and also depends on whether strict SQL mode is in effect, as described in Strict SQL Mode.

CHECK constraints are evaluated for INSERT IGNORE, UPDATE IGNORE, LOAD DATA ... IGNORE, and LOAD XML ... IGNORE statements and a warning occurs if a constraint evaluates to FALSE. The insert or update for any offending row is skipped.

If the constraint expression evaluates to a data type that differs from the declared column type, implicit coercion to the declared type occurs according to the usual MySQL type-conversion rules. See Section 14.3, "Type Conversion in Expression Evaluation". If type conversion fails or results in a loss of precision, an error occurs.

> Note
> Constraint expression evaluation uses the SQL mode in effect at evaluation time. If any component of the expression depends on the SQL mode, different results may occur for different uses of the table unless the SQL mode is the same during all uses.

The Information Schema CHECK_CONSTRAINTS table provides information about CHECK constraints defined on tables. See Section 28.3.5, "The INFORMATION_SCHEMA CHECK_CONSTRAINTS Table".

\subsection*{15.1.20.7 Silent Column Specification Changes}

In some cases, MySQL silently changes column specifications from those given in a CREATE TABLE or ALTER TABLE statement. These might be changes to a data type, to attributes associated with a data type, or to an index specification.

All changes are subject to the internal row-size limit of 65,535 bytes, which may cause some attempts at data type changes to fail. See Section 10.4.7, "Limits on Table Column Count and Row Size".
- Columns that are part of a PRIMARY KEY are made NOT NULL even if not declared that way.
- Trailing spaces are automatically deleted from ENUM and SET member values when the table is created.
- MySQL maps certain data types used by other SQL database vendors to MySQL types. See Section 13.9, "Using Data Types from Other Database Engines".
- If you include a USING clause to specify an index type that is not permitted for a given storage engine, but there is another index type available that the engine can use without affecting query results, the engine uses the available type.
- If strict SQL mode is not enabled, a VARCHAR column with a length specification greater than 65535 is converted to TEXT, and a VARBINARY column with a length specification greater than 65535 is converted to BLOB. Otherwise, an error occurs in either of these cases.
- Specifying the CHARACTER SET binary attribute for a character data type causes the column to be created as the corresponding binary data type: CHAR becomes BINARY, VARCHAR becomes VARBINARY, and TEXT becomes BLOB. For the ENUM and SET data types, this does not occur; they are created as declared. Suppose that you specify a table using this definition:
```
CREATE TABLE t
l
    c1 VARCHAR(10) CHARACTER SET binary,
    c2 TEXT CHARACTER SET binary,
    c3 ENUM('a','b','c') CHARACTER SET binary
);
```


The resulting table has this definition:
```
CREATE TABLE t
(
    c1 VARBINARY(10),
    c2 BLOB,
    c3 ENUM('a','b','c') CHARACTER SET binary
);
```


To see whether MySQL used a data type other than the one you specified, issue a DESCRIBE or SHOW CREATE TABLE statement after creating or altering the table.

Certain other data type changes can occur if you compress a table using myisampack. See Section 18.2.3.3, "Compressed Table Characteristics".

\subsection*{15.1.20.8 CREATE TABLE and Generated Columns}

CREATE TABLE supports the specification of generated columns. Values of a generated column are computed from an expression included in the column definition.

Generated columns are also supported by the NDB storage engine.
The following simple example shows a table that stores the lengths of the sides of right triangles in the sidea and sideb columns, and computes the length of the hypotenuse in sidec (the square root of the sums of the squares of the other sides):
```
CREATE TABLE triangle (
    sidea DOUBLE,
    sideb DOUBLE,
    sidec DOUBLE AS (SQRT(sidea * sidea + sideb * sideb))
);
INSERT INTO triangle (sidea, sideb) VALUES(1,1),(3,4),(6,8);
```


Selecting from the table yields this result:
```
mysql> SELECT * FROM triangle;
+--------+-------+--------------------+
| sidea | sideb | sidec |
+--------+-------+--------------------+
| 1 | 1 | 1.4142135623730951 |
| 3 | 5 |
| 6 | 8 | 10 |
+--------+-------+--------------------+
```


Any application that uses the triangle table has access to the hypotenuse values without having to specify the expression that calculates them.

Generated column definitions have this syntax:
```
col_name data_type [GENERATED ALWAYS] AS (expr)
    [VIRTUAL | STORED] [NOT NULL | NULL]
    [UNIQUE [KEY]] [[PRIMARY] KEY]
    [COMMENT 'string']
```


AS (expr) indicates that the column is generated and defines the expression used to compute column values. AS may be preceded by GENERATED ALWAYS to make the generated nature of the column more explicit. Constructs that are permitted or prohibited in the expression are discussed later.

The VIRTUAL or STORED keyword indicates how column values are stored, which has implications for column use:
- VIRTUAL: Column values are not stored, but are evaluated when rows are read, immediately after any BEFORE triggers. A virtual column takes no storage.

InnoDB supports secondary indexes on virtual columns. See Section 15.1.20.9, "Secondary Indexes and Generated Columns".
- STORED: Column values are evaluated and stored when rows are inserted or updated. A stored column does require storage space and can be indexed.

The default is VIRTUAL if neither keyword is specified.
It is permitted to mix VIRTUAL and STORED columns within a table.
Other attributes may be given to indicate whether the column is indexed or can be NULL, or provide a comment.

Generated column expressions must adhere to the following rules. An error occurs if an expression contains disallowed constructs.
- Literals, deterministic built-in functions, and operators are permitted. A function is deterministic if, given the same data in tables, multiple invocations produce the same result, independently of the connected user. Examples of functions that are nondeterministic and fail this definition: CONNECTION_ID( ), CURRENT_USER( ), NOW( ).
- Stored functions and loadable functions are not permitted.
- Stored procedure and function parameters are not permitted.
- Variables (system variables, user-defined variables, and stored program local variables) are not permitted.
- Subqueries are not permitted.
- A generated column definition can refer to other generated columns, but only those occurring earlier in the table definition. A generated column definition can refer to any base (nongenerated) column in the table whether its definition occurs earlier or later.
- The AUTO_INCREMENT attribute cannot be used in a generated column definition.
- An AUTO_INCREMENT column cannot be used as a base column in a generated column definition.
- If expression evaluation causes truncation or provides incorrect input to a function, the CREATE TABLE statement terminates with an error and the DDL operation is rejected.

If the expression evaluates to a data type that differs from the declared column type, implicit coercion to the declared type occurs according to the usual MySQL type-conversion rules. See Section 14.3, "Type Conversion in Expression Evaluation".

If a generated column uses the TIMESTAMP data type, the setting for explicit_defaults_for_timestamp is ignored. In such cases, if this variable is disabled then NULL is not converted to CURRENT_TIMESTAMP. If the column is also declared as NOT NULL, attempting to insert NULL is explicitly rejected with ER_BAD_NULL_ERROR.

\section*{Note}

Expression evaluation uses the SQL mode in effect at evaluation time. If any component of the expression depends on the SQL mode, different results may occur for different uses of the table unless the SQL mode is the same during all uses.

For CREATE TABLE ... LIKE, the destination table preserves generated column information from the original table.

For CREATE TABLE . . . SELECT, the destination table does not preserve information about whether columns in the selected-from table are generated columns. The SELECT part of the statement cannot assign values to generated columns in the destination table.

Partitioning by generated columns is permitted. See Table Partitioning.
A foreign key constraint on a stored generated column cannot use CASCADE, SET NULL, or SET DEFAULT as ON UPDATE referential actions, nor can it use SET NULL or SET DEFAULT as ON DELETE referential actions.

A foreign key constraint on the base column of a stored generated column cannot use CASCADE, SET NULL, or SET DEFAULT as ON UPDATE or ON DELETE referential actions.

A foreign key constraint cannot reference a virtual generated column.
Triggers cannot use NEW.col_name or use OLD.col_name to refer to generated columns.
For INSERT, REPLACE, and UPDATE, if a generated column is inserted into, replaced, or updated explicitly, the only permitted value is DEFAULT.

A generated column in a view is considered updatable because it is possible to assign to it. However, if such a column is updated explicitly, the only permitted value is DEFAULT.

Generated columns have several use cases, such as these:
- Virtual generated columns can be used as a way to simplify and unify queries. A complicated condition can be defined as a generated column and referred to from multiple queries on the table to ensure that all of them use exactly the same condition.
- Stored generated columns can be used as a materialized cache for complicated conditions that are costly to calculate on the fly.
- Generated columns can simulate functional indexes: Use a generated column to define a functional expression and index it. This can be useful for working with columns of types that cannot be indexed directly, such as JSON columns; see Indexing a Generated Column to Provide a JSON Column Index, for a detailed example.

For stored generated columns, the disadvantage of this approach is that values are stored twice; once as the value of the generated column and once in the index.
- If a generated column is indexed, the optimizer recognizes query expressions that match the column definition and uses indexes from the column as appropriate during query execution, even if a query does not refer to the column directly by name. For details, see Section 10.3.11, "Optimizer Use of Generated Column Indexes".

\section*{Example:}

Suppose that a table t1 contains first_name and last_name columns and that applications frequently construct the full name using an expression like this:
```
SELECT CONCAT(first_name,' ',last_name) AS full_name FROM t1;
```


One way to avoid writing out the expression is to create a view v1 on t1, which simplifies applications by enabling them to select full_name directly without using an expression:
```
CREATE VIEW v1 AS
SELECT *, CONCAT(first_name,' ',last_name) AS full_name FROM t1;
SELECT full_name FROM v1;
```


A generated column also enables applications to select full_name directly without the need to define a view:
```
CREATE TABLE t1 (
    first_name VARCHAR(10),
    last_name VARCHAR(10),
    full_name VARCHAR(255) AS (CONCAT(first_name,' ',last_name))
);
SELECT full_name FROM t1;
```


\subsection*{15.1.20.9 Secondary Indexes and Generated Columns}

InnoDB supports secondary indexes on virtual generated columns. Other index types are not supported. A secondary index defined on a virtual column is sometimes referred to as a "virtual index".

A secondary index may be created on one or more virtual columns or on a combination of virtual columns and regular columns or stored generated columns. Secondary indexes that include virtual columns may be defined as UNIQUE.

When a secondary index is created on a virtual generated column, generated column values are materialized in the records of the index. If the index is a covering index (one that includes all the columns retrieved by a query), generated column values are retrieved from materialized values in the index structure instead of computed "on the fly".

There are additional write costs to consider when using a secondary index on a virtual column due to computation performed when materializing virtual column values in secondary index records during INSERT and UPDATE operations. Even with additional write costs, secondary indexes on virtual columns may be preferable to generated stored columns, which are materialized in the clustered index, resulting in larger tables that require more disk space and memory. If a secondary index is not defined on a virtual column, there are additional costs for reads, as virtual column values must be computed each time the column's row is examined.

Values of an indexed virtual column are MVCC-logged to avoid unnecessary recomputation of generated column values during rollback or during a purge operation. The data length of logged values is limited by the index key limit of 767 bytes for COMPACT and REDUNDANT row formats, and 3072 bytes for DYNAMIC and COMPRESSED row formats.

Adding or dropping a secondary index on a virtual column is an in-place operation.

\section*{Indexing a Generated Column to Provide a JSON Column Index}

As noted elsewhere, JSON columns cannot be indexed directly. To create an index that references such a column indirectly, you can define a generated column that extracts the information that should be indexed, then create an index on the generated column, as shown in this example:
```
mysql> CREATE TABLE jemp (
    -> c JSON,
    -> g INT GENERATED ALWAYS AS (c->"$.id"),
    -> INDEX i (g)
    -> );
Query OK, 0 rows affected (0.28 sec)
```

```
mysql> INSERT INTO jemp (c) VALUES
        > ('{"id": "1", "name": "Fred"}'), ('{"id": "2", "name": "Wilma"}'),
        > ('{"id": "3", "name": "Barney"}'), ('{"id": "4", "name": "Betty"}');
Query OK, 4 rows affected (0.04 sec)
Records: 4 Duplicates: 0 Warnings: 0
mysql> SELECT c->>"$.name" AS name
        > FROM jemp WHERE g > 2;
+--------+
| name |
+--------+
| Barney |
| Betty |
+--------+
2 rows in set (0.00 sec)
mysql> EXPLAIN SELECT c->>"$.name" AS name
        > FROM jemp WHERE g > 2\G
************************** 1. row *****************************************
                id: 1
    select_type: SIMPLE
            table: jemp
    partitions: NULL
                type: range
possible_keys: i
                    key: i
            key_len: 5
                        ref: NULL
                    rows: 2
        filtered: 100.00
                Extra: Using where
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
************************* 1. rOW ******************************
    Level: Note
        Code: 1003
Message: /* select#1 */ select json_unquote(json_extract(ˋtestˋ.ˋjempˋ.ˋcˋ,'$.name'))
AS ˋnameˋ from ˋtestˋ.ˋjempˋ where (ˋtestˋ.ˋjempˋ.ˋgˋ > 2)
1 row in set (0.00 sec)
```

(We have wrapped the output from the last statement in this example to fit the viewing area.)
When you use EXPLAIN on a SELECT or other SQL statement containing one or more expressions that use the -> or ->> operator, these expressions are translated into their equivalents using JSON_EXTRACT( ) and (if needed) JSON_UNQUOTE( ) instead, as shown here in the output from SHOW WARNINGS immediately following this EXPLAIN statement:
```
mysql> EXPLAIN SELECT c->>"$.name"
            > FROM jemp WHERE g > 2 ORDER BY c->"$.name"\G
************************** 1. rOW ******************************
                        id: 1
    select_type: SIMPLE
                    table: jemp
        partitions: NULL
                        type: range
possible_keys: i
                        key: i
                key_len: 5
                            ref: NULL
                        rows: 2
            filtered: 100.00
                    Extra: Using where; Using filesort
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
    *********************** 1. row ********************************
    Level: Note
        Code: 1003
Message: /* select#1 */ select json_unquote(json_extract(ˋtestˋ.ˋjempˋ.ˋcˋ,'$.name')) AS
```

```
ˋc->>"$.name"ˋ from ˋtestˋ.ˋjempˋ where (ˋtestˋ.ˋjempˋ.ˋgˋ > 2) order by
json_extract(ˋtestˋ.ˋjempˋ.ˋcˋ,'$.name')
1 row in set (0.00 sec)
```


See the descriptions of the -> and ->> operators, as well as those of the JSON_EXTRACT ( ) and JSON_UNQUOTE( ) functions, for additional information and examples.

This technique also can be used to provide indexes that indirectly reference columns of other types that cannot be indexed directly, such as GEOMETRY columns.

It is also possible to create an index on a JSON column using the JSON_VALUE( ) function with an expression that can be used to optimize queries employing the expression. See the description of that function for more information and examples.

\section*{JSON columns and indirect indexing in NDB Cluster}

It is also possible to use indirect indexing of JSON columns in MySQL NDB Cluster, subject to the following conditions:
1. NDB handles a JSON column value internally as a BLOB. This means that any NDB table having one or more JSON columns must have a primary key, else it cannot be recorded in the binary log.
2. The NDB storage engine does not support indexing of virtual columns. Since the default for generated columns is VIRTUAL, you must specify explicitly the generated column to which to apply the indirect index as STORED.

The CREATE TABLE statement used to create the table jempn shown here is a version of the jemp table shown previously, with modifications making it compatible with NDB:
```
CREATE TABLE jempn (
    a BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    c JSON DEFAULT NULL,
    g INT GENERATED ALWAYS AS (c->"$.id") STORED,
    INDEX i (g)
) ENGINE=NDB;
```


We can populate this table using the following INSERT statement:
```
INSERT INTO jempn (c) VALUES
    ('{"id": "1", "name": "Fred"}'),
    ('{"id": "2", "name": "Wilma"}'),
    ('{"id": "3", "name": "Barney"}'),
    ('{"id": "4", "name": "Betty"}');
```


Now NDB can use index i, as shown here:
```
mysql> EXPLAIN SELECT c->>"$.name" AS name
        -> FROM jempn WHERE g > 2\G
*************************** 1. row ****************************************
                    id: 1
    select_type: SIMPLE
                table: jempn
        partitions: p0,p1,p2,p3
                    type: range
possible_keys: i
                            key: i
                key_len: 5
                            ref: NULL
                        rows: 3
            filtered: 100.00
                    Extra: Using pushed condition (ˋtestˋ.ˋjempnˋ.ˋgˋ > 2)
1 row in set, 1 warning (0.01 sec)
mysql> SHOW WARNINGS\G
************************** 1. row ******************************
    Level: Note
        Code: 1003
Message: /* select#1 */ select
```

```
json_unquote(json_extract(ˋtestˋ.ˋjempnˋ.ˋcˋ,'$.name')) AS ˋnameˋ from
    testˋ.ˋjempnˋ where (ˋtestˋ.ˋjempnˋ.ˋgˋ > 2)
1 row in set (0.00 sec)
```


You should keep in mind that a stored generated column, as well as any index on such a column, uses DataMemory.

\subsection*{15.1.20.10 Invisible Columns}

MySQL 8.4 supports invisible columns. An invisible column is normally hidden to queries, but can be accessed if explicitly referenced.

As an illustration of when invisible columns may be useful, suppose that an application uses SELECT * queries to access a table, and must continue to work without modification even if the table is altered to add a new column that the application does not expect to be there. In a SELECT * query, the * evaluates to all table columns, except those that are invisible, so the solution is to add the new column as an invisible column. The column remains "hidden" from SELECT * queries, and the application continues to work as previously. A newer version of the application can refer to the invisible column if necessary by explicitly referencing it.

The following sections detail how MySQL treats invisible columns.
- DDL Statements and Invisible Columns
- DML Statements and Invisible Columns
- Invisible Column Metadata
- The Binary Log and Invisible Columns

\section*{DDL Statements and Invisible Columns}

Columns are visible by default. To explicitly specify visibility for a new column, use a VISIBLE or INVISIBLE keyword as part of the column definition for CREATE TABLE or ALTER TABLE:
```
CREATE TABLE t1 (
    i INT,
    j DATE INVISIBLE
) ENGINE = InnoDB;
ALTER TABLE t1 ADD COLUMN k INT INVISIBLE;
```


To alter the visibility of an existing column, use a VISIBLE or INVISIBLE keyword with one of the ALTER TABLE column-modification clauses:
```
ALTER TABLE t1 CHANGE COLUMN j j DATE VISIBLE;
ALTER TABLE t1 MODIFY COLUMN j DATE INVISIBLE;
ALTER TABLE t1 ALTER COLUMN j SET VISIBLE;
```


A table must have at least one visible column. Attempting to make all columns invisible produces an error.

Invisible columns support the usual column attributes: NULL, NOT NULL, AUTO_INCREMENT, and so forth.

Generated columns can be invisible.
Index definitions can name invisible columns, including definitions for PRIMARY KEY and UNIQUE indexes. Although a table must have at least one visible column, an index definition need not have any visible columns.

An invisible column dropped from a table is dropped in the usual way from any index definition that names the column.

Foreign key constraints can be defined on invisible columns, and foreign key constraints can reference invisible columns.

CHECK constraints can be defined on invisible columns. For new or modified rows, violation of a CHECK constraint on an invisible column produces an error.

CREATE TABLE ... LIKE includes invisible columns, and they are invisible in the new table.
CREATE TABLE ... SELECT does not include invisible columns, unless they are explicitly referenced in the SELECT part. However, even if explicitly referenced, a column that is invisible in the existing table is visible in the new table:
```
mysql> CREATE TABLE t1 (col1 INT, col2 INT INVISIBLE);
mysql> CREATE TABLE t2 AS SELECT col1, col2 FROM t1;
mysql> SHOW CREATE TABLE t2\G
************************** 1. row ****************************************
        Table: t2
Create Table: CREATE TABLE ˋt2ˋ (
    ˋcol1ˋ int DEFAULT NULL,
    ˋcol2ˋ int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```


If invisibility should be preserved, provide a definition for the invisible column in the CREATE TABLE part of the CREATE TABLE ... SELECT statement:
```
mysql> CREATE TABLE t1 (col1 INT, col2 INT INVISIBLE);
mysql> CREATE TABLE t2 (col2 INT INVISIBLE) AS SELECT col1, col2 FROM t1;
mysql> SHOW CREATE TABLE t2\G
*************************** 1. rOW ***************************************
        Table: t2
Create Table: CREATE TABLE ˋt2ˋ (
    ˋcol1ˋ int DEFAULT NULL,
    ˋcol2ˋ int DEFAULT NULL /*!80023 INVISIBLE */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```


Views can refer to invisible columns by explicitly referencing them in the SELECT statement that defines the view. Changing a column's visibility subsequent to defining a view that references the column does not change view behavior.

\section*{DML Statements and Invisible Columns}

For SELECT statements, an invisible column is not part of the result set unless explicitly referenced in the select list. In a select list, the * and tbl_name.* shorthands do not include invisible columns. Natural joins do not include invisible columns.

Consider the following statement sequence:
```
mysql> CREATE TABLE t1 (col1 INT, col2 INT INVISIBLE);
mysql> INSERT INTO t1 (col1, col2) VALUES(1, 2), (3, 4);
mysql> SELECT * FROM t1;
+------+
| col1 |
+------+
| 1 |
| 3 |
+------+
mysql> SELECT col1, col2 FROM t1;
+------+-------+
| col1 | col2 |
+------+-------+
| 1 | 2 |
| 3 | 4 |
+------+-------+
```


The first SELECT does not reference the invisible column col2 in the select list (because * does not include invisible columns), so col2 does not appear in the statement result. The second SELECT explicitly references col2, so the column appears in the result.

The statement TABLE t1 produces the same output as the first SELECT statement. Since there is no way to specify columns in a TABLE statement, TABLE never displays invisible columns.

For statements that create new rows, an invisible column is assigned its implicit default value unless explicitly referenced and assigned a value. For information about implicit defaults, see Implicit Default Handling.

For INSERT (and REPLACE, for non-replaced rows), implicit default assignment occurs with a missing column list, an empty column list, or a nonempty column list that does not include the invisible column:
```
CREATE TABLE t1 (col1 INT, col2 INT INVISIBLE);
INSERT INTO t1 VALUES(...);
INSERT INTO t1 () VALUES(...);
INSERT INTO t1 (col1) VALUES(...);
```


For the first two INSERT statements, the VALUES( ) list must provide a value for each visible column and no invisible column. For the third INSERT statement, the VALUES( ) list must provide the same number of values as the number of named columns; the same is true when you use VALUES ROW ( ) rather than VALUES( ).

For LOAD DATA and LOAD XML, implicit default assignment occurs with a missing column list or a nonempty column list that does not include the invisible column. Input rows should not include a value for the invisible column.

To assign a value other than the implicit default for the preceding statements, explicitly name the invisible column in the column list and provide a value for it.

INSERT INTO ... SELECT * and REPLACE INTO ... SELECT * do not include invisible columns because * does not include invisible columns. Implicit default assignment occurs as described previously.

For statements that insert or ignore new rows, or that replace or modify existing rows, based on values in a PRIMARY KEY or UNIQUE index, MySQL treats invisible columns the same as visible columns: Invisible columns participate in key value comparisons. Specifically, if a new row has the same value as an existing row for a unique key value, these behaviors occur whether the index columns are visible or invisible:
- With the IGNORE modifier, INSERT, LOAD DATA, and LOAD XML ignore the new row.
- REPLACE replaces the existing row with the new row. With the REPLACE modifier, LOAD DATA and LOAD XML do the same.
- INSERT ... ON DUPLICATE KEY UPDATE updates the existing row.

To update invisible columns for UPDATE statements, name them and assign a value, just as for visible columns.

\section*{Invisible Column Metadata}

Information about whether a column is visible or invisible is available from the EXTRA column of the Information Schema COLUMNS table or SHOW COLUMNS output. For example:
```
mysql> SELECT TABLE_NAME, COLUMN_NAME, EXTRA
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'test' AND TABLE_NAME = 't1';
+-------------+--------------+-----------+
| TABLE_NAME | COLUMN_NAME | EXTRA |
+-------------+--------------+-----------+
| t1 | i |
| t1 | j |
| t1 | k | INVISIBLE |
+-------------+--------------+----------+
```


Columns are visible by default, so in that case, EXTRA displays no visibility information. For invisible columns, EXTRA displays INVISIBLE.

SHOW CREATE TABLE displays invisible columns in the table definition, with the INVISIBLE keyword in a version-specific comment:
```
mysql> SHOW CREATE TABLE t1\G
************************** 1. row
        Table: t1
Create Table: CREATE TABLE ˋt1ˋ (
    ˋˋˋ int DEFAULT NULL,
    ˋjˋ int DEFAULT NULL,
    ˋkˋ int DEFAULT NULL /*!80023 INVISIBLE */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```

mysqldump uses SHOW CREATE TABLE, so they include invisible columns in dumped table definitions. They also include invisible column values in dumped data.

Reloading a dump file into an older version of MySQL that does not support invisible columns causes the version-specific comment to be ignored, which creates any invisible columns as visible.

\section*{The Binary Log and Invisible Columns}

MySQL treats invisible columns as follows with respect to events in the binary log:
- Table-creation events include the INVISIBLE attribute for invisible columns.
- Invisible columns are treated like visible columns in row events. They are included if needed according to the binlog_row_image system variable setting.
- When row events are applied, invisible columns are treated like visible columns in row events.
- Invisible columns are treated like visible columns when computing writesets. In particular, writesets include indexes defined on invisible columns.
- The mysqlbinlog command includes visibility in column metadata.

\subsection*{15.1.20.11 Generated Invisible Primary Keys}

MySQL 8.4 supports generated invisible primary keys for any InnoDB table that is created without an explicit primary key. When the sql_generate_invisible_primary_key server system variable is set to ON, the MySQL server automatically adds a generated invisible primary key (GIPK) to any such table. This setting has no effect on tables created using any other storage engine than InnoDB.

By default, the value of sql_generate_invisible_primary_key is OFF, meaning that the automatic addition of GIPKs is disabled. To illustrate how this affects table creation, we begin by creating two identical tables, neither having a primary key, the only difference being that the first (table auto_0) is created with sql_generate_invisible_primary_key set to 0FF, and the second (auto_1) after setting it to 0N, as shown here:
```
mysql> SELECT @@sql_generate_invisible_primary_key;
+----------------------------------------+
| @@sql_generate_invisible_primary_key |
+---------------------------------------+
| 0 |
+----------------------------------------+
1 row in set (0.00 sec)
mysql> CREATE TABLE auto_0 (c1 VARCHAR(50), c2 INT);
Query OK, 0 rows affected (0.02 sec)
mysql> SET sql_generate_invisible_primary_key=ON;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @@sql_generate_invisible_primary_key;
+---------------------------------------+
| @@sql_generate_invisible_primary_key |
+----------------------------------------+
| 1 |
+----------------------------------------+
```

```
1 row in set (0.00 sec)
mysql> CREATE TABLE auto_1 (c1 VARCHAR(50), c2 INT);
Query OK, 0 rows affected (0.04 sec)
```


Compare the output of these SHOW CREATE TABLE statements to see the difference in how the tables were actually created:
```
mysql> SHOW CREATE TABLE auto_0\G
*************************** 1. rOW *****************************************
        Table: auto_0
Create Table: CREATE TABLE ˋauto_0ˋ (
    ˋc1ˋ varchar(50) DEFAULT NULL,
    ˋc2ˋ int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.00 sec)
mysql> SHOW CREATE TABLE auto_1\G
*************************** 1. r OW ****************************
        Table: auto_1
Create Table: CREATE TABLE ˋauto_1ˋ (
    ˋmy_row_idˋ bigint unsigned NOT NULL AUTO_INCREMENT /*!80023 INVISIBLE */,
    ˋc1ˋ varchar(50) DEFAULT NULL,
    ˋc2ˋ int DEFAULT NULL,
    PRIMARY KEY (ˋmy_row_idˋ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.00 sec)
```


Since auto_1 had no primary key specified by the CREATE TABLE statement used to create it, setting sql_generate_invisible_primary_key = ON causes MySQL to add both the invisible column my_row_id to this table and a primary key on that column. Since sql_generate_invisible_primary_key was OFF at the time that auto_0 was created, no such additions were performed on that table.

When a primary key is added to a table by the server, the column and key name is always my_row_id. For this reason, when enabling generated invisible primary keys in this way, you cannot create a table having a column named my_row_id unless the table creation statement also specifies an explicit primary key. (You are not required to name the column or key my_row_id in such cases.)
my_row_id is an invisible column, which means it is not shown in the output of SELECT * or TABLE; the column must be selected explicitly by name. See Section 15.1.20.10, "Invisible Columns".

When GIPKs are enabled, a generated primary key cannot be altered other than to switch it between VISIBLE and INVISIBLE. To make the generated invisible primary key on auto_1 visible, execute this ALTER TABLE statement:
```
mysql> ALTER TABLE auto_1 ALTER COLUMN my_row_id SET VISIBLE;
Query OK, 0 rows affected (0.02 sec)
Records: 0 Duplicates: 0 Warnings: 0
mysql> SHOW CREATE TABLE auto_1\G
*************************** 1. r OW ****************************
        Table: auto_1
Create Table: CREATE TABLE ˋauto_1ˋ (
    ˋmy_row_idˋ bigint unsigned NOT NULL AUTO_INCREMENT,
    ˋc1ˋ varchar(50) DEFAULT NULL,
    ˋc2ˋ int DEFAULT NULL,
    PRIMARY KEY (ˋmy_row_idˋ)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.01 sec)
```


To make this generated primary key invisible again, issue ALTER TABLE auto_1 ALTER COLUMN my_row_id SET INVISIBLE.

A generated invisible primary key is always invisible by default.
Whenever GIPKs are enabled, you cannot drop a generated primary key if either of the following 2 conditions would result:
- The table is left with no primary key.
- The primary key is dropped, but not the primary key column.

The effects of sql_generate_invisible_primary_key apply to tables using the InnoDB storage engine only. You can use an ALTER TABLE statement to change the storage engine used by a table that has a generated invisible primary key; in this case, the primary key and column remain in place, but the table and key no longer receive any special treatment.

By default, GIPKs are shown in the output of SHOW CREATE TABLE, SHOW COLUMNS, and SHOW INDEX, and are visible in the Information Schema COLUMNS and STATISTICS tables. You can cause generated invisible primary keys to be hidden instead in such cases by setting the show_gipk_in_create_table_and_information_schema system variable to OFF. By default, this variable is 0 N , as shown here:
```
mysql> SELECT @@show_gipk_in_create_table_and_information_schema;
+------------------------------------------------------
| @@show_gipk_in_create_table_and_information_schema |
+-------------------------------------------------------
| 1 |
+-------------------------------------------------------
1 row in set (0.00 sec)
```


As can be seen from the following query against the COLUMNS table, my_row_id is visible among the columns of auto_1:
```
mysql> SELECT COLUMN_NAME, ORDINAL_POSITION, DATA_TYPE, COLUMN_KEY
    -> FROM INFORMATION_SCHEMA.COLUMNS
    -> WHERE TABLE_NAME = "auto_1";
+--------------+-------------------+-----------+------------+
| COLUMN_NAME | ORDINAL_POSITION | DATA_TYPE | COLUMN_KEY |
+--------------+------------------+-----------+------------+
| my_row_id | 1 | bigint | PRI
| c1 | 2 | varchar
| c2 | 3 | int
+--------------+------------------+----------+-----------+
3 rows in set (0.01 sec)
```


After show_gipk_in_create_table_and_information_schema is set to OFF, my_row_id can no longer be seen in the COLUMNS table, as shown here:
```
mysql> SET show_gipk_in_create_table_and_information_schema = OFF;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @@show_gipk_in_create_table_and_information_schema;
+-------------------------------------------------------
| @@show_gipk_in_create_table_and_information_schema |
+-------------------------------------------------------
| 0 |
+-------------------------------------------------------
1 row in set (0.00 sec)
mysql> SELECT COLUMN_NAME, ORDINAL_POSITION, DATA_TYPE, COLUMN_KEY
    -> FROM INFORMATION_SCHEMA.COLUMNS
    -> WHERE TABLE_NAME = "auto_1";
+--------------+-------------------+-----------+------------+
| COLUMN_NAME | ORDINAL_POSITION | DATA_TYPE | COLUMN_KEY |
+--------------+-------------------+-----------+------------+
| c1 | 2 | varchar
| c2 | 3 | int | | |
2 rows in set (0.00 sec)
```


The setting for sql_generate_invisible_primary_key is not replicated, and is ignored by replication applier threads. This means that the setting of this variable on the source has no effect on the replica. You can cause the replica to add a GIPK for tables replicated without primary keys on a given replication channel using REQUIRE_TABLE_PRIMARY_KEY_CHECK = GENERATE as part of a CHANGE REPLICATION SOURCE TO statement.

GIPKs work with row-based replication of CREATE TABLE ... SELECT; the information written to the binary log for this statement in such cases includes the GIPK definition, and thus is replicated correctly. Statement-based replication of CREATE TABLE ... SELECT is not supported with sql_generate_invisible_primary_key = ON.

When creating or importing backups of installations where GIPKs are in use, it is possible to exclude generated invisible primary key columns and values. The --skip-generated-invisible-primary-key option for mysqldump causes GIPK information to be excluded in the program's output.

\subsection*{15.1.20.12 Setting NDB Comment Options}
- NDB_COLUMN Options
- NDB_TABLE Options

It is possible to set a number of options specific to NDB Cluster in the table comment or column comments of an NDB table. Table-level options for controlling read from any replica and partition balance can be embedded in a table comment using NDB_TABLE.

NDB_COLUMN can be used in a column comment to set the size of the blob parts table column used for storing parts of blob values by NDB to its maximum. This works for BLOB, MEDIUMBLOB, LONGBLOB, TEXT, MEDIUMTEXT, LONGTEXT, and JSON columns. A column comment can also be used to control the inline size of a blob column. NDB_COLUMN comments do not support TINYBLOB or TINYTEXT columns, since these have an inline part (only) of fixed size, and no separate parts to store elsewhere.

NDB_TABLE can be used in a table comment to set options relating to partition balance and whether the table is fully replicated, among others.

The remainder of this section describes these options and their use.

\section*{NDB_COLUMN Options}

In NDB Cluster, a column comment in a CREATE TABLE or ALTER TABLE statement can also be used to specify an NDB_COLUMN option. NDB supports two column comment options BLOB_INLINE_SIZE and MAX_BLOB_PART_SIZE. Syntax for these options is shown here:
```
COMMENT 'NDB_COLUMN=speclist'
speclist := spec[,spec]
spec :=
        BLOB_INLINE_SIZE=value
    | MAX_BLOB_PART_SIZE[={0|1}]
```


BLOB_INLINE_SIZE specifies the number of bytes to be stored inline by the column; its expected value is an integer in the range 1-29980, inclusive. Setting a value greater than 29980 raises an error; setting a value less than 1 is allowed, but causes the default inline size for the column type to be used.

You should be aware that the maximum value for this option is actually the maximum number of bytes that can be stored in one row of an NDB table; every column in the row contributes to this total.

You should also keep in mind, especially when working with TEXT columns, that the value set by MAX_BLOB_PART_SIZE or BLOB_INLINE_SIZE represents column size in bytes. It does not indicate the number of characters, which varies according to the character set and collation used by the column.

To see the effects of this option, first create a table with two BLOB columns, one (b1) with no extra options, and another (b2) with a setting for BLOB_INLINE_SIZE, as shown here:
```
mysql> CREATE TABLE t1 (
    -> a INT NOT NULL PRIMARY KEY,
    -> b1 BLOB,
    -> b2 BLOB COMMENT 'NDB_COLUMN=BLOB_INLINE_SIZE=8000'
    -> ) ENGINE NDB;
```

```
Query OK, 0 rows affected (0.32 sec)
```


You can see the BLOB_INLINE_SIZE settings for the BLOB columns by querying the ndbinfo.blobs table, like this:
```
mysql> SELECT
    -> column_name AS 'Column Name',
    -> inline_size AS 'Inline Size',
    -> part_size AS 'Blob Part Size'
    -> FROM ndbinfo.blobs
    -> WHERE table_name = 't1';
+--------------+--------------+----------------+
| Column Name | Inline Size | Blob Part Size |
+--------------+-------------+----------------+
\begin{array} { l l l l } { \text { b1 \| b2 \|} } & { 2 5 6 } & { 2 0 0 0 } \\ { } & { 8 0 0 0 } & { 2 0 0 0 } \end{array}
+--------------+-------------+----------------+
2 rows in set (0.01 sec)
```


You can also check the output from the ndb_desc utility, as shown here, with the relevant lines displayed using emphasized text:
```
$> ndb_desc -d test t1
-- t --
Version: 1
Fragment type: HashMapPartition
K Value: 6
Min load factor: 78
Max load factor: 80
Temporary table: no
Number of attributes: 3
Number of primary keys: 1
Length of frm data: 945
Max Rows: 0
Row Checksum: 1
Row GCI: 1
SingleUserMode: 0
ForceVarPart: 1
PartitionCount: 2
FragmentCount: 2
PartitionBalance: FOR_RP_BY_LDM
ExtraRowGciBits: 0
ExtraRowAuthorBits: 0
TableStatus: Retrieved
Table options: readbackup
HashMap: DEFAULT-HASHMAP-3840-2
-- Attributes --
a Int PRIMARY KEY DISTRIBUTION KEY AT=FIXED ST=MEMORY
b1 Blob(256,2000,0) NULL AT=MEDIUM_VAR ST=MEMORY BV=2 BT=NDB$BLOB_64_1
b2 Blob(8000,2000,0) NULL AT=MEDIUM_VAR ST=MEMORY BV=2 BT=NDB$BLOB_64_2
-- Indexes --
PRIMARY KEY(a) - UniqueHashIndex
PRIMARY(a) - OrderedIndex
```


BLOB_INLINE_SIZE has no effect on TINYBLOB columns. In NDB 8.4.4 and later, it is disallowed with TINYBLOB, and causes a warning if used.

For MAX_BLOB_PART_SIZE, the = sign and the value following it are optional. Using any value other than 0 or 1 results in a syntax error.

The effect of using MAX_BLOB_PART_SIZE in a column comment is to set the blob part size of a TEXT or BLOB column to the maximum number of bytes supported for this by NDB (13948). This option can be applied to any blob column type supported by MySQL except TINYBLOB or TINYTEXT (BLOB, MEDIUMBLOB, LONGBLOB, TEXT, MEDIUMTEXT, LONGTEXT). Unlike BLOB_INLINE_SIZE, MAX_BLOB_PART_SIZE has no effect on JSON columns.

To see the effects of this option, we first run the following SQL statement in the mysql client to create a table with two BLOB columns, one (c1) with no extra options, and another (c2) with MAX_BLOB_PART_SIZE:
```
mysql> CREATE TABLE test.t2 (
    -> p INT PRIMARY KEY,
    -> c1 BLOB,
    -> c2 BLOB COMMENT 'NDB_COLUMN=MAX_BLOB_PART_SIZE'
    -> ) ENGINE NDB;
Query OK, 0 rows affected (0.32 sec)
```


From the system shell，run the ndb＿desc utility to obtain information about the table just created，as shown in this example：
```
$> ndb_desc -d test t2
-- t --
Version: 1
Fragment type: HashMapPartition
K Value: 6
Min load factor: 78
Max load factor: 80
Temporary table: no
Number of attributes: 3
Number of primary keys: 1
Length of frm data: 324
Row Checksum: 1
Row GCI: 1
SingleUserMode: 0
ForceVarPart: 1
FragmentCount: 2
ExtraRowGciBits: 0
ExtraRowAuthorBits: 0
TableStatus: Retrieved
HashMap: DEFAULT-HASHMAP-3840-2
-- Attributes --
p Int PRIMARY KEY DISTRIBUTION KEY AT=FIXED ST=MEMORY
c1 Blob(256,2000,0) NULL AT=MEDIUM_VAR ST=MEMORY BV=2 BT=NDB$BLOB_22_1
c2 Blob(256,13948,0) NULL AT=MEDIUM_VAR ST=MEMORY BV=2 BT=NDB$BLOB_22_2
-- Indexes --
PRIMARY KEY(p) - UniqueHashIndex
PRIMARY(p) - OrderedIndex
```


Column information in the output is listed under Attributes；for columns c1 and c2 it is displayed here in emphasized text．For c1，the blob part size is 2000，the default value；for c2，it is 13948，as set by MAX＿BLOB＿PART＿SIZE．

You can also query the ndbinfo．blobs table to see this，as shown here：
```
mysql> SELECT
    -> column_name AS 'Column Name',
    -> inline_size AS 'Inline Size',
    -> part_size AS 'Blob Part Size'
    -> FROM ndbinfo.blobs
    -> WHERE table_name = 't2';
+--------------+--------------+----------------+
| Column Name | Inline Size | Blob Part Size |
+--------------+--------------+----------------
\begin{array} { l l l } { \text { c1 \| 2000 \|} } \\ { \text { c2 者 家者 \|} } \end{array}
+--------------+-------------+----------------+
2 rows in set (0.00 sec)
```


You can change the blob part size for a given blob column of an NDB table using an ALTER TABLE statement such as this one，and verifying the changes afterwards using SHOW CREATE TABLE：
```
mysql> ALTER TABLE test.t2
    -> DROP COLUMN c1,
    -> ADD COLUMN c1 BLOB COMMENT 'NDB_COLUMN=MAX_BLOB_PART_SIZE',
    -> CHANGE COLUMN c2 c2 BLOB AFTER c1;
Query OK, 0 rows affected (0.47 sec)
Records: 0 Duplicates: 0 Warnings: 0
mysql> SHOW CREATE TABLE test.t2\G
*************************** 1. rOW *****************************
        Table: t
```

```
Create Table: CREATE TABLE ˋt2ˋ (
    ˋpˋ int(11) NOT NULL,
    ˋc1ˋ blob COMMENT 'NDB_COLUMN=MAX_BLOB_PART_SIZE',
    ˋc2ˋ blob,
    PRIMARY KEY (ˋpˋ)
) ENGINE=ndbcluster DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.00 sec)
mysql> EXIT
Bye
```


The output of ndb_desc shows that the blob part sizes of the columns have been changed as expected:
```
$> ndb_desc -d test t2
-- t --
Version: 16777220
Fragment type: HashMapPartition
K Value: 6
Min load factor: 78
Max load factor: 80
Temporary table: no
Number of attributes: 3
Number of primary keys: 1
Length of frm data: 324
Row Checksum: 1
Row GCI: 1
SingleUserMode: 0
ForceVarPart: 1
FragmentCount: 2
ExtraRowGciBits: 0
ExtraRowAuthorBits: 0
TableStatus: Retrieved
HashMap: DEFAULT-HASHMAP-3840-2
-- Attributes --
p Int PRIMARY KEY DISTRIBUTION KEY AT=FIXED ST=MEMORY
c1 Blob(256,13948,0) NULL AT=MEDIUM_VAR ST=MEMORY BV=2 BT=NDB$BLOB_26_1
c2 Blob(256,2000,0) NULL AT=MEDIUM_VAR ST=MEMORY BV=2 BT=NDB$BLOB_26_2
-- Indexes --
PRIMARY KEY(p) - UniqueHashIndex
PRIMARY(p) - OrderedIndex
```


You can also see the change by running the query against ndbinfo.blobs again:
```
mysql> SELECT
    -> column_name AS 'Column Name',
    -> inline_size AS 'Inline Size',
    -> part_size AS 'Blob Part Size'
    -> FROM ndbinfo.blobs
    -> WHERE table_name = 't2';
+--------------+--------------+----------------+
| Column Name | Inline Size | Blob Part Size |
+--------------+-------------+----------------+
| c1 | | 256 | 256 | 13948 |
2 rows in set (0.00 sec)
```


It is possible to set both BLOB_INLINE_SIZE and MAX_BLOB_PART_SIZE for a blob column, as shown in this CREATE TABLE statement:
```
mysql> CREATE TABLE test.t3 (
    -> p INT NOT NULL PRIMARY KEY,
    -> c1 JSON,
    -> c2 JSON COMMENT 'NDB_COLUMN=BLOB_INLINE_SIZE=5000,MAX_BLOB_PART_SIZE'
    -> ) ENGINE NDB;
Query OK, 0 rows affected (0.28 sec)
```


Querying the blobs table shows us that the statement worked as expected:
```
mysql> SELECT
```

```
    -> column_name AS 'Column Name',
    -> inline_size AS 'Inline Size',
    -> part_size AS 'Blob Part Size'
    -> FROM ndbinfo.blobs
    -> WHERE table_name = 't3';
+--------------+-------------+---------------+
| Column Name | Inline Size | Blob Part Size |
+--------------+--------------+----------------+
| c1 | 4000 | 8100 |
| c2 |5000 | 8100 |
+--------------+-------------+---------------+
2 rows in set (0.00 sec)
```


You can also verify that the statement worked by checking the output of ndb_desc.
Changing a column's blob part size must be done using a copying ALTER TABLE; this operation cannot be performed online (see Section 25.6.12, "Online Operations with ALTER TABLE in NDB Cluster").

For more information about how NDB stores columns of blob types, see String Type Storage Requirements.

\section*{NDB_TABLE Options}

For an NDB Cluster table, the table comment in a CREATE TABLE or ALTER TABLE statement can also be used to specify an NDB_TABLE option, which consists of one or more name-value pairs, separated by commas if need be, following the string NDB_TABLE=. Complete syntax for names and values syntax is shown here:
```
COMMENT="NDB_TABLE=ndb_table_option[,ndb_table_option[,...]]"
ndb_table_option: {
        NOLOGGING={1 | 0}
    | READ_BACKUP={1 | 0}
    | PARTITION_BALANCE={FOR_RP_BY_NODE | FOR_RA_BY_NODE | FOR_RP_BY_LDM
            | FOR_RA_BY_LDM | FOR_RA_BY_LDM_X_2
            | FOR_RA_BY_LDM_X_3 | FOR_RA_BY_LDM_X_4}
    | FULLY_REPLICATED={1 | 0}
}
```


Spaces are not permitted within the quoted string. The string is case-insensitive.
The four NDB table options that can be set as part of a comment in this way are described in more detail in the next few paragraphs.

NOLOGGING: By default, NDB tables are logged, and checkpointed. This makes them durable to whole cluster failures. Using NOLOGGING when creating or altering a table means that this table is not redo logged or included in local checkpoints. In this case, the table is still replicated across the data nodes for high availability, and updated using transactions, but changes made to it are not recorded in the data node's redo logs, and its content is not checkpointed to disk; when recovering from a cluster failure, the cluster retains the table definition, but none of its rows-that is, the table is empty.

Using such nonlogging tables reduces the data node's demands on disk I/O and storage, as well as CPU for checkpointing CPU. This may be suitable for short-lived data which is frequently updated, and where the loss of all data in the unlikely event of a total cluster failure is acceptable.

It is also possible to use the ndb_table_no_logging system variable to cause any NDB tables created or altered while this variable is in effect to behave as though it had been created with the NOLOGGING comment. Unlike when using the comment directly, there is nothing in this case in the output of SHOW CREATE TABLE to indicate that it is a nonlogging table. Using the table comment approach is recommended since it offers per-table control of the feature, and this aspect of the table schema is embedded in the table creation statement where it can be found easily by SQL-based tools.

READ_BACKUP: Setting this option to 1 has the same effect as though ndb_read_backup were enabled; enables reading from any replica. Doing so greatly improves the performance of reads from
the table at a relatively small cost to write performance. 1 is the default for READ_BACKUP, and the default for ndb_read_backup is ON (previously, read from any replica was disabled by default).

You can set READ_BACKUP for an existing table online, using an ALTER TABLE statement similar to one of those shown here:
```
ALTER TABLE ... ALGORITHM=INPLACE, COMMENT="NDB_TABLE=READ_BACKUP=1";
ALTER TABLE ... ALGORITHM=INPLACE, COMMENT="NDB_TABLE=READ_BACKUP=0";
```


For more information about the ALGORITHM option for ALTER TABLE, see Section 25.6.12, "Online Operations with ALTER TABLE in NDB Cluster".

PARTITION_BALANCE: Provides additional control over assignment and placement of partitions. The following four schemes are supported:
1. FOR_RP_BY_NODE: One partition per node.

Only one LDM on each node stores a primary partition. Each partition is stored in the same LDM (same ID) on all nodes.
2. FOR_RA_BY_NODE: One partition per node group.

Each node stores a single partition, which can be either a primary replica or a backup replica. Each partition is stored in the same LDM on all nodes.
3. FOR_RP_BY_LDM: One partition for each LDM on each node; the default.

This is the setting used if READ_BACKUP is set to 1 .
4. FOR_RA_BY_LDM: One partition per LDM in each node group.

These partitions can be primary or backup partitions.
5. FOR_RA_BY_LDM_X_2: Two partitions per LDM in each node group.

These partitions can be primary or backup partitions.
6. FOR_RA_BY_LDM_X_3: Three partitions per LDM in each node group.

These partitions can be primary or backup partitions.
7. FOR_RA_BY_LDM_X_4: Four partitions per LDM in each node group.

These partitions can be primary or backup partitions.
PARTITION_BALANCE is the preferred interface for setting the number of partitions per table. Using MAX_ROWS to force the number of partitions is deprecated but continues to be supported for backward compatibility; it is subject to removal in a future release of MySQL NDB Cluster. (Bug \#81759, Bug \#23544301)

FULLY_REPLICATED controls whether the table is fully replicated, that is, whether each data node has a complete copy of the table. To enable full replication of the table, use FULLY_REPLICATED=1.

This setting can also be controlled using the ndb_fully_replicated system variable. Setting it to ON enables the option by default for all new NDB tables; the default is OFF. The ndb_data_node_neighbour system variable is also used for fully replicated tables, to ensure that when a fully replicated table is accessed, we access the data node which is local to this MySQL Server.

An example of a CREATE TABLE statement using such a comment when creating an NDB table is shown here:
```
mysql> CREATE TABLE t1 (
```

```
    > c1 INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    > c2 VARCHAR(100),
    > c3 VARCHAR(100) )
    > ENGINE=NDB
    >
COMMENT="NDB_TABLE=READ_BACKUP=0,PARTITION_BALANCE=FOR_RP_BY_NODE";
```


The comment is displayed as part of the output of SHOW CREATE TABLE. The text of the comment is also available from querying the MySQL Information Schema TABLES table, as in this example:
```
mysql> SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_COMMENT
    > FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME="t1"\G
*************************** 1. row *****************************
    TABLE_NAME: t1
    TABLE_SCHEMA: test
TABLE_COMMENT: NDB_TABLE=READ_BACKUP=0,PARTITION_BALANCE=FOR_RP_BY_NODE
1 row in set (0.01 sec)
```


This comment syntax is also supported with ALTER TABLE statements for NDB tables, as shown here:
```
mysql> ALTER TABLE t1 COMMENT="NDB_TABLE=PARTITION_BALANCE=FOR_RA_BY_NODE";
Query OK, 0 rows affected (0.40 sec)
Records: 0 Duplicates: 0 Warnings: 0
```


The TABLE_COMMENT column displays the comment that is required to re-create the table as it is following the ALTER TABLE statement, like this:
```
mysql> SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_COMMENT
    -> FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME="t1"\G
************************** 1. row *****************************************
    TABLE_NAME: t1
TABLE_SCHEMA: test
TABLE_COMMENT: NDB_TABLE=READ_BACKUP=0,PARTITION_BALANCE=FOR_RP_BY_NODE
1 row in set (0.01 sec)
mysql> SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_COMMENT
        > FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME="t1";
+------------+---------------+-------------------------------------------------
| TABLE_NAME | TABLE_SCHEMA | TABLE_COMMENT |
+-------------+---------------+------------------------------------------------
| t1 | c | NDB_TABLE=PARTITION_BALANCE=FOR_RA_BY_NODE
| t1 | d |
2 rows in set (0.01 sec)
```


Keep in mind that a table comment used with ALTER TABLE replaces any existing comment which the table might have.
```
mysql> ALTER TABLE t1 COMMENT="NDB_TABLE=PARTITION_BALANCE=FOR_RA_BY_NODE";
Query OK, 0 rows affected (0.40 sec)
Records: 0 Duplicates: 0 Warnings: 0
mysql> SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_COMMENT
    > FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME="t1";
+-------------+---------------+-------------------------------------------------
| TABLE_NAME | TABLE_SCHEMA | TABLE_COMMENT |
| t1 | | | | | NDB_TABLE=PARTITION_BALANCE=FOR_RA_BY_NODE |
+------------+--------------+--------------------------------------------------
2 rows in set (0.01 sec)
```


You can also see the value of the PARTITION_BALANCE option in the output of ndb_desc. ndb_desc also shows whether the READ_BACKUP and FULLY_REPLICATED options are set for the table. See the description of this program for more information.

\subsection*{15.1.21 CREATE TABLESPACE Statement}

CREATE [UNDO] TABLESPACE tablespace_name
```
InnoDB and NDB:
    [ADD DATAFILE 'file_name']
    [AUTOEXTEND_SIZE [=] value]
InnoDB only:
    [FILE_BLOCK_SIZE = value]
    [ENCRYPTION [=] {'Y' | 'N'}]
NDB only:
    USE LOGFILE GROUP logfile_group
    [EXTENT_SIZE [=] extent_size]
    [INITIAL_SIZE [=] initial_size]
    [MAX_SIZE [=] max_size]
    [NODEGROUP [=] nodegroup_id]
    [WAIT]
    [COMMENT [=] 'string']
InnoDB and NDB:
    [ENGINE [=] engine_name]
Reserved for future use:
    [ENGINE_ATTRIBUTE [=] 'string']
```


This statement is used to create a tablespace. The precise syntax and semantics depend on the storage engine used. In standard MySQL releases, this is always an InnoDB tablespace. MySQL NDB Cluster also supports tablespaces using the NDB storage engine.
- Considerations for InnoDB
- Considerations for NDB Cluster
- Options
- Notes
- InnoDB Examples
- NDB Example

\section*{Considerations for InnoDB}

CREATE TABLESPACE syntax is used to create general tablespaces or undo tablespaces. The UNDO keyword must be specified to create an undo tablespace.

A general tablespace is a shared tablespace. It can hold multiple tables, and supports all table row formats. General tablespaces can be created in a location relative to or independent of the data directory.

After creating an InnoDB general tablespace, use CREATE TABLE tbl_name ... TABLESPACE [=] tablespace_name or ALTER TABLE tbl_name TABLESPACE [=] tablespace_name to add tables to the tablespace. For more information, see Section 17.6.3.3, "General Tablespaces".

Undo tablespaces contain undo logs. Undo tablespaces can be created in a chosen location by specifying a fully qualified data file path. For more information, see Section 17.6.3.4, "Undo Tablespaces".

\section*{Considerations for NDB Cluster}

This statement is used to create a tablespace, which can contain one or more data files, providing storage space for NDB Cluster Disk Data tables (see Section 25.6.11, "NDB Cluster Disk Data Tables"). One data file is created and added to the tablespace using this statement. Additional data files may be added to the tablespace by using the ALTER TABLESPACE statement (see Section 15.1.10, "ALTER TABLESPACE Statement").

\section*{Note}

All NDB Cluster Disk Data objects share the same namespace. This means that each Disk Data object must be uniquely named (and not merely each Disk Data object of a given type). For example, you cannot have a tablespace and a log file group with the same name, or a tablespace and a data file with the same name.

A log file group of one or more UNDO log files must be assigned to the tablespace to be created with the USE LOGFILE GROUP clause. logfile_group must be an existing log file group created with CREATE LOGFILE GROUP (see Section 15.1.16, "CREATE LOGFILE GROUP Statement"). Multiple tablespaces may use the same log file group for UNDO logging.

When setting EXTENT_SIZE or INITIAL_SIZE, you may optionally follow the number with a oneletter abbreviation for an order of magnitude, similar to those used in my.cnf. Generally, this is one of the letters M (for megabytes) or G (for gigabytes).

INITIAL_SIZE and EXTENT_SIZE are subject to rounding as follows:
- EXTENT_SIZE is rounded up to the nearest whole multiple of 32 K .
- INITIAL_SIZE is rounded down to the nearest whole multiple of 32 K ; this result is rounded up to the nearest whole multiple of EXTENT_SIZE (after any rounding).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2606.jpg?height=117&width=99&top_left_y=1192&top_left_x=306)

\section*{Note}

NDB reserves 4\% of a tablespace for data node restart operations. This reserved space cannot be used for data storage.

The rounding just described is done explicitly, and a warning is issued by the MySQL Server when any such rounding is performed. The rounded values are also used by the NDB kernel for calculating INFORMATION_SCHEMA. FILES column values and other purposes. However, to avoid an unexpected result, we suggest that you always use whole multiples of 32 K in specifying these options.

When CREATE TABLESPACE is used with ENGINE [=] NDB, a tablespace and associated data file are created on each Cluster data node. You can verify that the data files were created and obtain information about them by querying the Information Schema FILES table. (See the example later in this section.)
(See Section 28.3.15, "The INFORMATION_SCHEMA FILES Table".)

\section*{Options}
- ADD DATAFILE: Defines the name of a tablespace data file. This option is always required when creating an NDB tablespace; for InnoDB, it is required only when creating an undo tablespace. The file_name, including any specified path, must be quoted with single or double quotation marks. File names (not counting the file extension) and directory names must be at least one byte in length. Zero length file names and directory names are not supported.

Because there are considerable differences in how InnoDB and NDB treat data files, the two storage engines are covered separately in the discussion that follows.

InnoDB data files. An InnoDB tablespace supports only a single data file, whose name must include an .ibd extension.

To place an InnoDB general tablespace data file in a location outside of the data directory, include a fully qualified path or a path relative to the data directory. Only a fully qualified path is permitted for undo tablespaces. If you do not specify a path, a general tablespace is created in the data directory. An undo tablespace created without specifying a path is created in the directory defined by the innodb_undo_directory variable. If innodb_undo_directory is not set, undo tablespaces are created in the data directory.

To avoid conflicts with implicitly created file-per-table tablespaces, creating an InnoDB general tablespace in a subdirectory under the data directory is not supported. When creating a general tablespace or undo tablespace outside of the data directory, the directory must exist and must be known to InnoDB prior to creating the tablespace. To make a directory known to InnoDB, add it to the innodb_directories value or to one of the variables whose values are appended to the value of innodb_directories. innodb_directories is a read-only variable. Configuring it requires restarting the server.

If the ADD DATAFILE clause is not specified when creating an InnoDB tablespace, a tablespace data file with a unique file name is created implicitly. The unique file name is a 128 bit UUID formatted into five groups of hexadecimal numbers separated by dashes (aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee). A file extension is added if required by the storage engine. An . ibd file extension is added for InnoDB general tablespace data files. In a replication environment, the data file name created on the replication source server is not the same as the data file name created on the replica.

The ADD DATAFILE clause does not permit circular directory references when creating an InnoDB tablespace. For example, the circular directory reference (/ . ./) in the following statement is not permitted:
```
CREATE TABLESPACE ts1 ADD DATAFILE ts1.ibd 'any_directory/../ts1.ibd';
```


An exception to this restriction exists on Linux, where a circular directory reference is permitted if the preceding directory is a symbolic link. For example, the data file path in the example above is permitted if any_directory is a symbolic link. (It is still permitted for data file paths to begin with '. . /'.)

NDB data files. An NDB tablespace supports multiple data files which can have any legal file names; more data files can be added to an NDB Cluster tablespace following its creation by using an ALTER TABLESPACE statement.

An NDB tablespace data file is created by default in the data node file system directory-that is, the directory named ndb_nodeid_fs/TS under the data node's data directory (DataDir), where nodeid is the data node's NodeId. To place the data file in a location other than the default, include an absolute directory path or a path relative to the default location. If the directory specified does not exist, NDB attempts to create it; the system user account under which the data node process is running must have the appropriate permissions to do so.

> Note
> When determining the path used for a data file, NDB does not expand the ~ (tilde) character.

When multiple data nodes are run on the same physical host, the following considerations apply:
- You cannot specify an absolute path when creating a data file.
- It is not possible to create tablespace data files outside the data node file system directory, unless each data node has a separate data directory.
- If each data node has its own data directory, data files can be created anywhere within this directory.
- If each data node has its own data directory, it may also be possible to create a data file outside the node's data directory using a relative path, as long as this path resolves to a unique location on the host file system for each data node running on that host.
- FILE_BLOCK_SIZE: This option-which is specific to InnoDB general tablespaces, and is ignored by NDB-defines the block size for the tablespace data file. Values can be specified in bytes or kilobytes. For example, an 8 kilobyte file block size can be specified as 8192 or 8 K . If
you do not specify this option, FILE_BLOCK_SIZE defaults to the innodb_page_size value. FILE_BLOCK_SIZE is required when you intend to use the tablespace for storing compressed InnoDB tables (ROW_FORMAT=COMPRESSED). In this case, you must define the tablespace FILE_BLOCK_SIZE when creating the tablespace.

If FILE_BLOCK_SIZE is equal the innodb_page_size value, the tablespace can contain only tables having an uncompressed row format (COMPACT, REDUNDANT, and DYNAMIC). Tables with a COMPRESSED row format have a different physical page size than uncompressed tables. Therefore, compressed tables cannot coexist in the same tablespace as uncompressed tables.

For a general tablespace to contain compressed tables, FILE_BLOCK_SIZE must be specified, and the FILE_BLOCK_SIZE value must be a valid compressed page size in relation to the innodb_page_size value. Also, the physical page size of the compressed table (KEY_BLOCK_SIZE) must be equal to FILE_BLOCK_SIZE/1024. For example, if innodb_page_size=16K, and FILE_BLOCK_SIZE=8K, the KEY_BLOCK_SIZE of the table must be 8 . For more information, see Section 17.6.3.3, "General Tablespaces".
- USE LOGFILE GROUP: Required for NDB, this is the name of a log file group previously created using CREATE LOGFILE GROUP. Not supported for InnoDB, where it fails with an error.
- EXTENT_SIZE: This option is specific to NDB, and is not supported by InnoDB, where it fails with an error. EXTENT_SIZE sets the size, in bytes, of the extents used by any files belonging to the tablespace. The default value is 1 M . The minimum size is 32 K , and theoretical maximum is 2 G , although the practical maximum size depends on a number of factors. In most cases, changing the extent size does not have any measurable effect on performance, and the default value is recommended for all but the most unusual situations.

An extent is a unit of disk space allocation. One extent is filled with as much data as that extent can contain before another extent is used. In theory, up to $65,535(64 \mathrm{~K})$ extents may used per data file; however, the recommended maximum is $32,768(32 \mathrm{~K})$. The recommended maximum size for a single data file is 32 G -that is, 32 K extents $\times 1 \mathrm{MB}$ per extent. In addition, once an extent is allocated to a given partition, it cannot be used to store data from a different partition; an extent cannot store data from more than one partition. This means, for example that a tablespace having a single datafile whose INITIAL_SIZE (described in the following item) is 256 MB and whose EXTENT_SIZE is 128 M has just two extents, and so can be used to store data from at most two different disk data table partitions.

You can see how many extents remain free in a given data file by querying the Information Schema FILES table, and so derive an estimate for how much space remains free in the file. For further discussion and examples, see Section 28.3.15, "The INFORMATION_SCHEMA FILES Table".
- INITIAL_SIZE: This option is specific to NDB, and is not supported by InnoDB, where it fails with an error.

The INITIAL_SIZE parameter sets the total size in bytes of the data file that was specific using ADD DATATFILE. Once this file has been created, its size cannot be changed; however, you can add more data files to the tablespace using ALTER TABLESPACE ... ADD DATAFILE.

INITIAL_SIZE is optional; its default value is 134217728 ( 128 MB ).
On 32-bit systems, the maximum supported value for INITIAL_SIZE is 4294967296 ( 4 GB ).
- AUTOEXTEND_SIZE: Defines the amount by which InnoDB extends the size of the tablespace when it becomes full. The setting must be a multiple of 4 MB . The default setting is 0 , which causes the tablespace to be extended according to the implicit default behavior. For more information, see Section 17.6.3.9, "Tablespace AUTOEXTEND_SIZE Configuration".

Has no effect in any release of MySQL NDB Cluster, regardless of the storage engine used.
- MAX_SIZE: Currently ignored by MySQL; reserved for possible future use. Has no effect in any release of MySQL or MySQL NDB Cluster, regardless of the storage engine used.
- NODEGROUP: Currently ignored by MySQL; reserved for possible future use. Has no effect in any release of MySQL or MySQL NDB Cluster, regardless of the storage engine used.
- WAIT: Currently ignored by MySQL; reserved for possible future use. Has no effect in any release of MySQL or MySQL NDB Cluster, regardless of the storage engine used.
- COMMENT: Currently ignored by MySQL; reserved for possible future use. Has no effect in any release of MySQL or MySQL NDB Cluster, regardless of the storage engine used.
- The ENCRYPTION clause enables or disables page-level data encryption for an InnoDB general tablespace.

If the ENCRYPTION clause is not specified, the default_table_encryption setting controls whether encryption is enabled. The ENCRYPTION clause overrides the default_table_encryption setting. However, if the table_encryption_privilege_check variable is enabled, the TABLE_ENCRYPTION_ADMIN privilege is required to use an ENCRYPTION clause setting that differs from the default_table_encryption setting.

A keyring plugin must be installed and configured before an encryption-enabled tablespace can be created.

When a general tablespace is encrypted, all tables residing in the tablespace are encrypted. Likewise, a table created in an encrypted tablespace is encrypted.

For more information, see Section 17.13, "InnoDB Data-at-Rest Encryption"
- ENGINE: Defines the storage engine which uses the tablespace, where engine_name is the name of the storage engine. Currently, only the InnoDB storage engine is supported by standard MySQL 8.4 releases. MySQL NDB Cluster supports both NDB and InnoDB tablespaces. The value of the default_storage_engine system variable is used for ENGINE if the option is not specified.
- The ENGINE_ATTRIBUTE option is used to specify tablespace attributes for primary storage engines. The option is reserved for future use.

The value assigned to this option must be a string literal containing a valid JSON document or an empty string ("). Invalid JSON is rejected.

CREATE TABLESPACE ts1 ENGINE_ATTRIBUTE='\{"key":"value"\}';
ENGINE_ATTRIBUTE values can be repeated without error. In this case, the last specified value is used.

ENGINE_ATTRIBUTE values are not checked by the server, nor are they cleared when the table's storage engine is changed.

\section*{Notes}
- For the rules covering the naming of MySQL tablespaces, see Section 11.2, "Schema Object Names". In addition to these rules, the slash character ("/") is not permitted, nor can you use names beginning with innodb_, as this prefix is reserved for system use.
- Creation of temporary general tablespaces is not supported.
- General tablespaces do not support temporary tables.
- The TABLESPACE option may be used with CREATE TABLE or ALTER TABLE to assign an InnoDB table partition or subpartition to a file-per-table tablespace. All partitions must belong to the same storage engine. Assigning table partitions to shared InnoDB tablespaces is not supported. Shared tablespaces include the InnoDB system tablespace and general tablespaces.
- General tablespaces support the addition of tables of any row format using CREATE TABLE ... TABLESPACE. innodb_file_per_table does not need to be enabled.
- innodb_strict_mode is not applicable to general tablespaces. Tablespace management rules are strictly enforced independently of innodb_strict_mode. If CREATE TABLESPACE parameters are incorrect or incompatible, the operation fails regardless of the innodb_strict_mode setting. When a table is added to a general tablespace using CREATE TABLE ... TABLESPACE or ALTER TABLE ... TABLESPACE, innodb_strict_mode is ignored but the statement is evaluated as if innodb_strict_mode is enabled.
- Use DROP TABLESPACE to remove a tablespace. All tables must be dropped from a tablespace using DROP TABLE prior to dropping the tablespace. Before dropping an NDB Cluster tablespace you must also remove all its data files using one or more ALTER TABLESPACE ... DROP DATATFILE statements. See Section 25.6.11.1, "NDB Cluster Disk Data Objects".
- All parts of an InnoDB table added to an InnoDB general tablespace reside in the general tablespace, including indexes and BLOB pages.

For an NDB table assigned to a tablespace, only those columns which are not indexed are stored on disk, and actually use the tablespace data files. Indexes and indexed columns for all NDB tables are always kept in memory.
- Similar to the system tablespace, truncating or dropping tables stored in a general tablespace creates free space internally in the general tablespace .ibd data file which can only be used for new InnoDB data. Space is not released back to the operating system as it is for file-per-table tablespaces.
- A general tablespace is not associated with any database or schema.
- ALTER TABLE ... DISCARD TABLESPACE and ALTER TABLE ...IMPORT TABLESPACE are not supported for tables that belong to a general tablespace.
- The server uses tablespace-level metadata locking for DDL that references general tablespaces. By comparison, the server uses table-level metadata locking for DDL that references file-per-table tablespaces.
- A generated or existing tablespace cannot be changed to a general tablespace.
- There is no conflict between general tablespace names and file-per-table tablespace names. The "/" character, which is present in file-per-table tablespace names, is not permitted in general tablespace names.
- mysqldump does not dump InnoDB CREATE TABLESPACE statements.

\section*{InnoDB Examples}

This example demonstrates creating a general tablespace and adding three uncompressed tables of different row formats.
```
mysql> CREATE TABLESPACE ˋts1ˋ ADD DATAFILE 'ts1.ibd' ENGINE=INNODB;
mysql> CREATE TABLE t1 (c1 INT PRIMARY KEY) TABLESPACE ts1 ROW_FORMAT=REDUNDANT;
mysql> CREATE TABLE t2 (c1 INT PRIMARY KEY) TABLESPACE ts1 ROW_FORMAT=COMPACT;
mysql> CREATE TABLE t3 (c1 INT PRIMARY KEY) TABLESPACE ts1 ROW_FORMAT=DYNAMIC;
```


This example demonstrates creating a general tablespace and adding a compressed table. The example assumes a default innodb_page_size value of 16K. The FILE_BLOCK_SIZE of 8192 requires that the compressed table have a KEY_BLOCK_SIZE of 8.
```
mysql> CREATE TABLESPACE ˋts2ˋ ADD DATAFILE 'ts2.ibd' FILE_BLOCK_SIZE = 8192 ENGINE=InnoDB;
mysql> CREATE TABLE t4 (c1 INT PRIMARY KEY) TABLESPACE ts2 ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
```


This example demonstrates creating a general tablespace without specifying the ADD DATAFILE clause, which is optional:
```
mysql> CREATE TABLESPACE ˋts3ˋ ENGINE=INNODB;
```


This example demonstrates creating an undo tablespace:
```
mysql> CREATE UNDO TABLESPACE undo_003 ADD DATAFILE 'undo_003.ibu';
```


\section*{NDB Example}

Suppose that you wish to create an NDB Cluster Disk Data tablespace named myts using a datafile named mydata-1.dat. An NDB tablespace always requires the use of a log file group consisting of one or more undo log files. For this example, we first create a log file group named mylg that contains one undo long file named myundo-1. dat, using the CREATE LOGFILE GROUP statement shown here:
```
mysql> CREATE LOGFILE GROUP myg1
    -> ADD UNDOFILE 'myundo-1.dat'
    -> ENGINE=NDB;
Query OK, 0 rows affected (3.29 sec)
```


Now you can create the tablespace previously described using the following statement:
```
mysql> CREATE TABLESPACE myts
    -> ADD DATAFILE 'mydata-1.dat'
    -> USE LOGFILE GROUP mylg
    -> ENGINE=NDB;
Query OK, 0 rows affected (2.98 sec)
```


You can now create a Disk Data table using a CREATE TABLE statement with the TABLESPACE and STORAGE DISK options, similar to what is shown here:
```
mysql> CREATE TABLE mytable (
    -> id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    -> lname VARCHAR(50) NOT NULL,
    -> fname VARCHAR(50) NOT NULL,
    -> dob DATE NOT NULL,
    -> joined DATE NOT NULL,
    -> INDEX(last_name, first_name)
    -> )
    -> TABLESPACE myts STORAGE DISK
    -> ENGINE=NDB;
Query OK, 0 rows affected (1.41 sec)
```


It is important to note that only the dob and joined columns from mytable are actually stored on disk, due to the fact that the id, lname, and fname columns are all indexed.

As mentioned previously, when CREATE TABLESPACE is used with ENGINE [=] NDB, a tablespace and its associated data file are created on each NDB Cluster data node. You can verify that the data files were created and obtain information about them by querying the Information Schema FILES table, as shown here:
```
mysql> SELECT FILE_NAME, FILE_TYPE, LOGFILE_GROUP_NAME, STATUS, EXTRA
    -> FROM INFORMATION_SCHEMA.FILES
    -> WHERE TABLESPACE_NAME = 'myts';
+---------------+------------+-------------------+--------+-----------------
| file_name | file_type | logfile_group_name | status | extra |
+---------------+-------------+--------------------+--------+----------------
| mydata-1.dat | DATAFILE | mylg | NORMAL | CLUSTER_NODE=5 |
| mydata-1.dat | DATAFILE | mylg | NORMAL | CLUSTER_NODE=6
| NULL | TABLESPACE | mylg | NORMAL | NULL |
+---------------+-------------+--------------------+--------+-----------------
3 rows in set (0.01 sec)
```


For additional information and examples, see Section 25.6.11.1, "NDB Cluster Disk Data Objects".

\subsection*{15.1.22 CREATE TRIGGER Statement}

\section*{CREATE}
```
    [DEFINER = user]
    TRIGGER [IF NOT EXISTS] trigger_name
    trigger_time trigger_event
    ON tbl_name FOR EACH ROW
    [trigger_order]
    trigger_body
trigger_time: { BEFORE | AFTER }
trigger_event: { INSERT | UPDATE | DELETE }
trigger_order: { FOLLOWS | PRECEDES } other_trigger_name
```


This statement creates a new trigger. A trigger is a named database object that is associated with a table, and that activates when a particular event occurs for the table. The trigger becomes associated with the table named tbl_name, which must refer to a permanent table. You cannot associate a trigger with a TEMPORARY table or a view.

Trigger names exist in the schema namespace, meaning that all triggers must have unique names within a schema. Triggers in different schemas can have the same name.

IF NOT EXISTS prevents an error from occurring if a trigger having the same name, on the same table, exists in the same schema.

This section describes CREATE TRIGGER syntax. For additional discussion, see Section 27.3.1, "Trigger Syntax and Examples".

CREATE TRIGGER requires the TRIGGER privilege for the table associated with the trigger. If the DEFINER clause is present, the privileges required depend on the user value, as discussed in Section 27.6, "Stored Object Access Control". If binary logging is enabled, CREATE TRIGGER might require the SUPER privilege, as discussed in Section 27.7, "Stored Program Binary Logging".

The DEFINER clause determines the security context to be used when checking access privileges at trigger activation time, as described later in this section.
trigger_time is the trigger action time. It can be BEFORE or AFTER to indicate that the trigger activates before or after each row to be modified.

Basic column value checks occur prior to trigger activation, so you cannot use BEFORE triggers to convert values inappropriate for the column type to valid values.
trigger_event indicates the kind of operation that activates the trigger. These trigger_event values are permitted:
- INSERT: The trigger activates whenever a new row is inserted into the table (for example, through INSERT, LOAD DATA, and REPLACE statements).
- UPDATE: The trigger activates whenever a row is modified (for example, through UPDATE statements).
- DELETE: The trigger activates whenever a row is deleted from the table (for example, through DELETE and REPLACE statements). DROP TABLE and TRUNCATE TABLE statements on the table do not activate this trigger, because they do not use DELETE. Dropping a partition does not activate DELETE triggers, either.

The trigger_event does not represent a literal type of SQL statement that activates the trigger so much as it represents a type of table operation. For example, an INSERT trigger activates not only for INSERT statements but also LOAD DATA statements because both statements insert rows into a table.

A potentially confusing example of this is the INSERT INTO ... ON DUPLICATE KEY UPDATE . . . syntax: a BEFORE INSERT trigger activates for every row, followed by either an AFTER INSERT trigger or both the BEFORE UPDATE and AFTER UPDATE triggers, depending on whether there was a duplicate key for the row.

\section*{Note}

Cascaded foreign key actions do not activate triggers.

It is possible to define multiple triggers for a given table that have the same trigger event and action time. For example, you can have two BEFORE UPDATE triggers for a table. By default, triggers that have the same trigger event and action time activate in the order they were created. To affect trigger order, specify a trigger_order clause that indicates FOLLOWS or PRECEDES and the name of an existing trigger that also has the same trigger event and action time. With FOLLOWS, the new trigger activates after the existing trigger. With PRECEDES, the new trigger activates before the existing trigger.
trigger_body is the statement to execute when the trigger activates. To execute multiple statements, use the BEGIN ... END compound statement construct. This also enables you to use the same statements that are permitted within stored routines. See Section 15.6.1, "BEGIN ... END Compound Statement". Some statements are not permitted in triggers; see Section 27.8, "Restrictions on Stored Programs".

Within the trigger body, you can refer to columns in the subject table (the table associated with the trigger) by using the aliases OLD and NEW. OLD.col_name refers to a column of an existing row before it is updated or deleted. NEW.col_name refers to the column of a new row to be inserted or an existing row after it is updated.

Triggers cannot use NEW.col_name or use OLD.col_name to refer to generated columns. For information about generated columns, see Section 15.1.20.8, "CREATE TABLE and Generated Columns".

MySQL stores the sql_mode system variable setting in effect when a trigger is created, and always executes the trigger body with this setting in force, regardless of the current server SQL mode when the trigger begins executing.

The DEFINER clause specifies the MySQL account to be used when checking access privileges at trigger activation time. If the DEFINER clause is present, the user value should be a MySQL account specified as 'user_name'@'host_name', CURRENT_USER, or CURRENT_USER( ). The permitted user values depend on the privileges you hold, as discussed in Section 27.6, "Stored Object Access Control". Also see that section for additional information about trigger security.

If the DEFINER clause is omitted, the default definer is the user who executes the CREATE TRIGGER statement. This is the same as specifying DEFINER = CURRENT_USER explicitly.

MySQL takes the DEFINER user into account when checking trigger privileges as follows:
- At CREATE TRIGGER time, the user who issues the statement must have the TRIGGER privilege.
- At trigger activation time, privileges are checked against the DEFINER user. This user must have these privileges:
- The TRIGGER privilege for the subject table.
- The SELECT privilege for the subject table if references to table columns occur using OLD.col_name or NEW.col_name in the trigger body.
- The UPDATE privilege for the subject table if table columns are targets of SET NEW.col_name = value assignments in the trigger body.
- Whatever other privileges normally are required for the statements executed by the trigger.

Within a trigger body, the CURRENT_USER function returns the account used to check privileges at trigger activation time. This is the DEFINER user, not the user whose actions caused the trigger to be activated. For information about user auditing within triggers, see Section 8.2.23, "SQL-Based Account Activity Auditing".

If you use LOCK TABLES to lock a table that has triggers, the tables used within the trigger are also locked, as described in LOCK TABLES and Triggers.

For additional discussion of trigger use, see Section 27.3.1, "Trigger Syntax and Examples".

\subsection*{15.1.23 CREATE VIEW Statement}
```
CREATE
    [OR REPLACE]
    [ALGORITHM = {UNDEFINED | MERGE | TEMPTABLE}]
    [DEFINER = user]
    [SQL SECURITY { DEFINER | INVOKER }]
    VIEW view_name [(column_list)]
    AS select_statement
    [WITH [CASCADED | LOCAL] CHECK OPTION]
```


The CREATE VIEW statement creates a new view, or replaces an existing view if the OR REPLACE clause is given. If the view does not exist, CREATE OR REPLACE VIEW is the same as CREATE VIEW. If the view does exist, CREATE OR REPLACE VIEW replaces it.

For information about restrictions on view use, see Section 27.9, "Restrictions on Views".
The select_statement is a SELECT statement that provides the definition of the view. (Selecting from the view selects, in effect, using the SELECT statement.) The select_statement can select from base tables or from other views. The SELECT statement can use a VALUES statement as its source, or can be replaced with a TABLE statement, as with CREATE TABLE ... SELECT.

The view definition is "frozen" at creation time and is not affected by subsequent changes to the definitions of the underlying tables. For example, if a view is defined as SELECT * on a table, new columns added to the table later do not become part of the view, and columns dropped from the table result in an error when selecting from the view.

The ALGORITHM clause affects how MySQL processes the view. The DEFINER and SQL SECURITY clauses specify the security context to be used when checking access privileges at view invocation time. The WITH CHECK OPTION clause can be given to constrain inserts or updates to rows in tables referenced by the view. These clauses are described later in this section.

The CREATE VIEW statement requires the CREATE VIEW privilege for the view, and some privilege for each column selected by the SELECT statement. For columns used elsewhere in the SELECT statement, you must have the SELECT privilege. If the OR REPLACE clause is present, you must also have the DROP privilege for the view. If the DEFINER clause is present, the privileges required depend on the user value, as discussed in Section 27.6, "Stored Object Access Control".

When a view is referenced, privilege checking occurs as described later in this section.
A view belongs to a database. By default, a new view is created in the default database. To create the view explicitly in a given database, use $d b \_n a m e$.view_name syntax to qualify the view name with the database name:
```
CREATE VIEW test.v AS SELECT * FROM t;
```


Unqualified table or view names in the SELECT statement are also interpreted with respect to the default database. A view can refer to tables or views in other databases by qualifying the table or view name with the appropriate database name.

Within a database, base tables and views share the same namespace, so a base table and a view cannot have the same name.

Columns retrieved by the SELECT statement can be simple references to table columns, or expressions that use functions, constant values, operators, and so forth.

A view must have unique column names with no duplicates, just like a base table. By default, the names of the columns retrieved by the SELECT statement are used for the view column names.

To define explicit names for the view columns, specify the optional column_list clause as a list of comma-separated identifiers. The number of names in column_list must be the same as the number of columns retrieved by the SELECT statement.

A view can be created from many kinds of SELECT statements. It can refer to base tables or other views. It can use joins, UNION, and subqueries. The SELECT need not even refer to any tables:
```
CREATE VIEW v_today (today) AS SELECT CURRENT_DATE;
```


The following example defines a view that selects two columns from another table as well as an expression calculated from those columns:
```
mysql> CREATE TABLE t (qty INT, price INT);
mysql> INSERT INTO t VALUES(3, 50);
mysql> CREATE VIEW v AS SELECT qty, price, qty*price AS value FROM t;
mysql> SELECT * FROM v;
+------+--------+-------+
| qty | price | value |
+------+--------+-------+
| 3 | 50 | 150 |
+------+--------+-------+
```


A view definition is subject to the following restrictions:
- The SELECT statement cannot refer to system variables or user-defined variables.
- Within a stored program, the SELECT statement cannot refer to program parameters or local variables.
- The SELECT statement cannot refer to prepared statement parameters.
- Any table or view referred to in the definition must exist. If, after the view has been created, a table or view that the definition refers to is dropped, use of the view results in an error. To check a view definition for problems of this kind, use the CHECK TABLE statement.
- The definition cannot refer to a TEMPORARY table, and you cannot create a TEMPORARY view.
- You cannot associate a trigger with a view.
- Aliases for column names in the SELECT statement are checked against the maximum column length of 64 characters (not the maximum alias length of 256 characters).

ORDER BY is permitted in a view definition, but it is ignored if you select from a view using a statement that has its own ORDER BY.

For other options or clauses in the definition, they are added to the options or clauses of the statement that references the view, but the effect is undefined. For example, if a view definition includes a LIMIT clause, and you select from the view using a statement that has its own LIMIT clause, it is undefined which limit applies. This same principle applies to options such as ALL, DISTINCT, or SQL_SMALL_RESULT that follow the SELECT keyword, and to clauses such as INTO, FOR UPDATE, FOR SHARE, LOCK IN SHARE MODE, and PROCEDURE.

The results obtained from a view may be affected if you change the query processing environment by changing system variables:
```
mysql> CREATE VIEW v (mycol) AS SELECT 'abc';
Query OK, 0 rows affected (0.01 sec)
mysql> SET sql_mode = '';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT "mycol" FROM v;
+--------+
| mycol |
+--------+
| mycol |
```

```
+-------+
1 row in set (0.01 sec)
mysql> SET sql_mode = 'ANSI_QUOTES';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT "mycol" FROM v;
+--------+
| mycol |
+--------+
| abc |
+--------+
1 row in set (0.00 sec)
```


The DEFINER and SQL SECURITY clauses determine which MySQL account to use when checking access privileges for the view when a statement is executed that references the view. The valid SQL SECURITY characteristic values are DEFINER (the default) and INVOKER. These indicate that the required privileges must be held by the user who defined or invoked the view, respectively.

If the DEFINER clause is present, the user value should be a MySQL account specified as 'user_name'@'host_name', CURRENT_USER, or CURRENT_USER( ). The permitted user values depend on the privileges you hold, as discussed in Section 27.6, "Stored Object Access Control". Also see that section for additional information about view security.

If the DEFINER clause is omitted, the default definer is the user who executes the CREATE VIEW statement. This is the same as specifying DEFINER = CURRENT_USER explicitly.

Within a view definition, the CURRENT_USER function returns the view's DEFINER value by default. For views defined with the SQL SECURITY INVOKER characteristic, CURRENT_USER returns the account for the view's invoker. For information about user auditing within views, see Section 8.2.23, "SQLBased Account Activity Auditing".

Within a stored routine that is defined with the SQL SECURITY DEFINER characteristic, CURRENT_USER returns the routine's DEFINER value. This also affects a view defined within such a routine, if the view definition contains a DEFINER value of CURRENT_USER.

MySQL checks view privileges like this:
- At view definition time, the view creator must have the privileges needed to use the top-level objects accessed by the view. For example, if the view definition refers to table columns, the creator must have some privilege for each column in the select list of the definition, and the SELECT privilege for each column used elsewhere in the definition. If the definition refers to a stored function, only the privileges needed to invoke the function can be checked. The privileges required at function invocation time can be checked only as it executes: For different invocations, different execution paths within the function might be taken.
- The user who references a view must have appropriate privileges to access it (SELECT to select from it, INSERT to insert into it, and so forth.)
- When a view has been referenced, privileges for objects accessed by the view are checked against the privileges held by the view DEFINER account or invoker, depending on whether the SQL SECURITY characteristic is DEFINER or INVOKER, respectively.
- If reference to a view causes execution of a stored function, privilege checking for statements executed within the function depend on whether the function SQL SECURITY characteristic is DEFINER or INVOKER. If the security characteristic is DEFINER, the function runs with the privileges of the DEFINER account. If the characteristic is INVOKER, the function runs with the privileges determined by the view's SQL SECURITY characteristic.

Example: A view might depend on a stored function, and that function might invoke other stored routines. For example, the following view invokes a stored function $f()$ :
```
CREATE VIEW v AS SELECT * FROM t WHERE t.id = f(t.name);
```


Suppose that $f()$ contains a statement such as this:
```
IF name IS NULL then
    CALL p1();
ELSE
    CALL p2();
END IF;
```


The privileges required for executing statements within $f()$ need to be checked when $f()$ executes. This might mean that privileges are needed for p 1 () or p 2() , depending on the execution path within $f()$. Those privileges must be checked at runtime, and the user who must possess the privileges is determined by the SQL SECURITY values of the view v and the function f() .

The DEFINER and SQL SECURITY clauses for views are extensions to standard SQL. In standard SQL, views are handled using the rules for SQL SECURITY DEFINER. The standard says that the definer of the view, which is the same as the owner of the view's schema, gets applicable privileges on the view (for example, SELECT) and may grant them. MySQL has no concept of a schema "owner", so MySQL adds a clause to identify the definer. The DEFINER clause is an extension where the intent is to have what the standard has; that is, a permanent record of who defined the view. This is why the default DEFINER value is the account of the view creator.

The optional ALGORITHM clause is a MySQL extension to standard SQL. It affects how MySQL processes the view. ALGORITHM takes three values: MERGE, TEMPTABLE, or UNDEFINED. For more information, see Section 27.5.2, "View Processing Algorithms", as well as Section 10.2.2.4, "Optimizing Derived Tables, View References, and Common Table Expressions with Merging or Materialization".

Some views are updatable. That is, you can use them in statements such as UPDATE, DELETE, or INSERT to update the contents of the underlying table. For a view to be updatable, there must be a one-to-one relationship between the rows in the view and the rows in the underlying table. There are also certain other constructs that make a view nonupdatable.

A generated column in a view is considered updatable because it is possible to assign to it. However, if such a column is updated explicitly, the only permitted value is DEFAULT. For information about generated columns, see Section 15.1.20.8, "CREATE TABLE and Generated Columns".

The WITH CHECK OPTION clause can be given for an updatable view to prevent inserts or updates to rows except those for which the WHERE clause in the select_statement is true.

In a WITH CHECK OPTION clause for an updatable view, the LOCAL and CASCADED keywords determine the scope of check testing when the view is defined in terms of another view. The LOCAL keyword restricts the CHECK OPTION only to the view being defined. CASCADED causes the checks for underlying views to be evaluated as well. When neither keyword is given, the default is CASCADED.

For more information about updatable views and the WITH CHECK OPTION clause, see Section 27.5.3, "Updatable and Insertable Views", and Section 27.5.4, "The View WITH CHECK OPTION Clause".

\subsection*{15.1.24 DROP DATABASE Statement}

DROP \{DATABASE | SCHEMA\} [IF EXISTS] db_name
DROP DATABASE drops all tables in the database and deletes the database. Be very careful with this statement! To use DROP DATABASE, you need the DROP privilege on the database. DROP SCHEMA is a synonym for DROP DATABASE.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2617.jpg?height=102&width=104&top_left_y=2416&top_left_x=365)

\section*{Important}

When a database is dropped, privileges granted specifically for the database are not automatically dropped. They must be dropped manually. See Section 15.7.1.6, "GRANT Statement".

\footnotetext{
IF EXISTS is used to prevent an error from occurring if the database does not exist.
}

If the default database is dropped, the default database is unset (the DATABASE( ) function returns NULL).

If you use DROP DATABASE on a symbolically linked database, both the link and the original database are deleted.

DROP DATABASE returns the number of tables that were removed.
The DROP DATABASE statement removes from the given database directory those files and directories that MySQL itself may create during normal operation. This includes all files with the extensions shown in the following list:
- . BAK
- . DAT
- . HSH
- .MRG
- .MYD
- .MYI
- .cfg
- . db
- .ibd
- . ndb

If other files or directories remain in the database directory after MySQL removes those just listed, the database directory cannot be removed. In this case, you must remove any remaining files or directories manually and issue the DROP DATABASE statement again.

Dropping a database does not remove any TEMPORARY tables that were created in that database. TEMPORARY tables are automatically removed when the session that created them ends. See Section 15.1.20.2, "CREATE TEMPORARY TABLE Statement".

You can also drop databases with mysqladmin. See Section 6.5.2, "mysqladmin - A MySQL Server Administration Program".

\subsection*{15.1.25 DROP EVENT Statement}

DROP EVENT [IF EXISTS] event_name
This statement drops the event named event_name. The event immediately ceases being active, and is deleted completely from the server.

If the event does not exist, the error ERROR 1517 (HY000): Unknown event 'event_name' results. You can override this and cause the statement to generate a warning for nonexistent events instead using IF EXISTS.

This statement requires the EVENT privilege for the schema to which the event to be dropped belongs.

\subsection*{15.1.26 DROP FUNCTION Statement}

The DROP FUNCTION statement is used to drop stored functions and loadable functions:
- For information about dropping stored functions, see Section 15.1.29, "DROP PROCEDURE and DROP FUNCTION Statements".
- For information about dropping loadable functions, see Section 15.7.4.2, "DROP FUNCTION Statement for Loadable Functions".

\subsection*{15.1.27 DROP INDEX Statement}
```
DROP INDEX index_name ON tbl_name
    [algorithm_option | lock_option] ...
algorithm_option:
    ALGORITHM [=] {DEFAULT | INPLACE | COPY}
lock_option:
    LOCK [=] {DEFAULT | NONE | SHARED | EXCLUSIVE}
```


DROP INDEX drops the index named index_name from the table tbl_name. This statement is mapped to an ALTER TABLE statement to drop the index. See Section 15.1.9, "ALTER TABLE Statement".

To drop a primary key, the index name is always PRIMARY, which must be specified as a quoted identifier because PRIMARY is a reserved word:
```
DROP INDEX ˋPRIMARYˋ ON t;
```


Indexes on variable-width columns of NDB tables are dropped online; that is, without any table copying. The table is not locked against access from other NDB Cluster API nodes, although it is locked against other operations on the same API node for the duration of the operation. This is done automatically by the server whenever it determines that it is possible to do so; you do not have to use any special SQL syntax or server options to cause it to happen.

ALGORITHM and LOCK clauses may be given to influence the table copying method and level of concurrency for reading and writing the table while its indexes are being modified. They have the same meaning as for the ALTER TABLE statement. For more information, see Section 15.1.9, "ALTER TABLE Statement"

MySQL NDB Cluster supports online operations using the same ALGORITHM=INPLACE syntax supported in the standard MySQL Server. See Section 25.6.12, "Online Operations with ALTER TABLE in NDB Cluster", for more information.

\subsection*{15.1.28 DROP LOGFILE GROUP Statement}
```
DROP LOGFILE GROUP logfile_group
    ENGINE [=] engine_name
```


This statement drops the log file group named logfile_group. The log file group must already exist or an error results. (For information on creating log file groups, see Section 15.1.16, "CREATE LOGFILE GROUP Statement".)
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2619.jpg?height=115&width=106&top_left_y=2106&top_left_x=365)

\section*{Important}

Before dropping a log file group, you must drop all tablespaces that use that log file group for UNDO logging.

The required ENGINE clause provides the name of the storage engine used by the log file group to be dropped. The only permitted values for engine_name are NDB and NDBCLUSTER.

DROP LOGFILE GROUP is useful only with Disk Data storage for NDB Cluster. See Section 25.6.11, "NDB Cluster Disk Data Tables".

\subsection*{15.1.29 DROP PROCEDURE and DROP FUNCTION Statements}

These statements are used to drop a stored routine (a stored procedure or function). That is, the specified routine is removed from the server. (DROP FUNCTION is also used to drop loadable functions; see Section 15.7.4.2, "DROP FUNCTION Statement for Loadable Functions".)

To drop a stored routine, you must have the ALTER ROUTINE privilege for it. (If the automatic_sp_privileges system variable is enabled, that privilege and EXECUTE are granted automatically to the routine creator when the routine is created and dropped from the creator when the routine is dropped. See Section 27.2.2, "Stored Routines and MySQL Privileges".)

In addition, if the definer of the routine has the SYSTEM_USER privilege, the user dropping it must also have this privilege.

The IF EXISTS clause is a MySQL extension. It prevents an error from occurring if the procedure or function does not exist. A warning is produced that can be viewed with SHOW WARNINGS.

DROP FUNCTION is also used to drop loadable functions (see Section 15.7.4.2, "DROP FUNCTION Statement for Loadable Functions").

\subsection*{15.1.30 DROP SERVER Statement}

DROP SERVER [ IF EXISTS ] server_name
Drops the server definition for the server named server_name. The corresponding row in the mysql. servers table is deleted. This statement requires the SUPER privilege.

Dropping a server for a table does not affect any FEDERATED tables that used this connection information when they were created. See Section 15.1.18, "CREATE SERVER Statement".

DROP SERVER causes an implicit commit. See Section 15.3.3, "Statements That Cause an Implicit Commit".

DROP SERVER is not written to the binary log, regardless of the logging format that is in use.

\subsection*{15.1.31 DROP SPATIAL REFERENCE SYSTEM Statement}
```
DROP SPATIAL REFERENCE SYSTEM
    [IF EXISTS]
    srid
srid: 32-bit unsigned integer
```


This statement removes a spatial reference system (SRS) definition from the data dictionary. It requires the SUPER privilege.

Example:
DROP SPATIAL REFERENCE SYSTEM 4120;
If no SRS definition with the SRID value exists, an error occurs unless IF EXISTS is specified. In that case, a warning occurs rather than an error.

If the SRID value is used by some column in an existing table, an error occurs. For example:
```
mysql> DROP SPATIAL REFERENCE SYSTEM 4326;
ERROR 3716 (SR005): Can't modify SRID 4326. There is at
least one column depending on it.
```


To identify which column or columns use the SRID, use this query:
```
SELECT * FROM INFORMATION_SCHEMA.ST_GEOMETRY_COLUMNS WHERE SRS_ID=4326;
```


SRID values must be in the range of 32-bit unsigned integers, with these restrictions:
- SRID 0 is a valid SRID but cannot be used with DROP SPATIAL REFERENCE SYSTEM.
- If the value is in a reserved SRID range, a warning occurs. Reserved ranges are [0,32767] (reserved by EPSG), [60,000,000, 69,999,999] (reserved by EPSG), and [2,000,000,000, 2,147,483,647] (reserved by MySQL). EPSG stands for the European Petroleum Survey Group.
- Users should not drop SRSs with SRIDs in the reserved ranges. If system-installed SRSs are dropped, the SRS definitions may be recreated for MySQL upgrades.

\subsection*{15.1.32 DROP TABLE Statement}
```
DROP [TEMPORARY] TABLE [IF EXISTS]
    tbl_name [, tbl_name] ...
    [RESTRICT | CASCADE]
```


DROP TABLE removes one or more tables. You must have the DROP privilege for each table.
Be careful with this statement! For each table, it removes the table definition and all table data. If the table is partitioned, the statement removes the table definition, all its partitions, all data stored in those partitions, and all partition definitions associated with the dropped table.

Dropping a table also drops any triggers for the table.
DROP TABLE causes an implicit commit, except when used with the TEMPORARY keyword. See Section 15.3.3, "Statements That Cause an Implicit Commit".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2621.jpg?height=99&width=104&top_left_y=1197&top_left_x=365)

\section*{Important}

When a table is dropped, privileges granted specifically for the table are not automatically dropped. They must be dropped manually. See Section 15.7.1.6, "GRANT Statement".

If any tables named in the argument list do not exist, DROP TABLE behavior depends on whether the IF EXISTS clause is given:
- Without IF EXISTS, the statement fails with an error indicating which nonexisting tables it was unable to drop, and no changes are made.
- With IF EXISTS, no error occurs for nonexisting tables. The statement drops all named tables that do exist, and generates a NOTE diagnostic for each nonexistent table. These notes can be displayed with SHOW WARNINGS. See Section 15.7.7.42, "SHOW WARNINGS Statement".

IF EXISTS can also be useful for dropping tables in unusual circumstances under which there is an entry in the data dictionary but no table managed by the storage engine. (For example, if an abnormal server exit occurs after removal of the table from the storage engine but before removal of the data dictionary entry.)

The TEMPORARY keyword has the following effects:
- The statement drops only TEMPORARY tables.
- The statement does not cause an implicit commit.
- No access rights are checked. A TEMPORARY table is visible only with the session that created it, so no check is necessary.

Including the TEMPORARY keyword is a good way to prevent accidentally dropping non-TEMPORARY tables.

The RESTRICT and CASCADE keywords do nothing. They are permitted to make porting easier from other database systems.

DROP TABLE is not supported with all innodb_force_recovery settings. See Section 17.20.3, "Forcing InnoDB Recovery".

\subsection*{15.1.33 DROP TABLESPACE Statement}

DROP [UNDO] TABLESPACE tablespace_name
This statement drops a tablespace that was previously created using CREATE TABLESPACE. It is supported by the NDB and InnoDB storage engines.

The UNDO keyword must be specified to drop an undo tablespace. Only undo tablespaces created using CREATE UNDO TABLESPACE syntax can be dropped. An undo tablespace must be in an empty state before it can be dropped. For more information, see Section 17.6.3.4, "Undo Tablespaces".
tablespace_name is a case-sensitive identifier in MySQL.
For an InnoDB general tablespace, all tables must be dropped from the tablespace prior to a DROP TABLESPACE operation. If the tablespace is not empty, DROP TABLESPACE returns an error.

An NDB tablespace to be dropped must not contain any data files; in other words, before you can drop an NDB tablespace, you must first drop each of its data files using ALTER TABLESPACE ... DROP DATAFILE.

\section*{Notes}
- A general InnoDB tablespace is not deleted automatically when the last table in the tablespace is dropped. The tablespace must be dropped explicitly using DROP TABLESPACE tablespace_name.
- A DROP DATABASE operation can drop tables that belong to a general tablespace but it cannot drop the tablespace, even if the operation drops all tables that belong to the tablespace. The tablespace must be dropped explicitly using DROP TABLESPACE tablespace_name.
- Similar to the system tablespace, truncating or dropping tables stored in a general tablespace creates free space internally in the general tablespace .ibd data file which can only be used for new InnoDB data. Space is not released back to the operating system as it is for file-per-table tablespaces.

\section*{InnoDB Examples}

This example demonstrates how to drop an InnoDB general tablespace. The general tablespace ts1 is created with a single table. Before dropping the tablespace, the table must be dropped.
```
mysql> CREATE TABLESPACE ˋts1ˋ ADD DATAFILE 'ts1.ibd' Engine=InnoDB;
mysql> CREATE TABLE t1 (c1 INT PRIMARY KEY) TABLESPACE ts1 Engine=InnoDB;
mysql> DROP TABLE t1;
mysql> DROP TABLESPACE ts1;
```


This example demonstrates dropping an undo tablespace. An undo tablespace must be in an empty state before it can be dropped. For more information, see Section 17.6.3.4, "Undo Tablespaces".
```
mysql> DROP UNDO TABLESPACE undo_003;
```


\section*{NDB Example}

This example shows how to drop an NDB tablespace myts having a data file named mydata-1.dat after first creating the tablespace, and assumes the existence of a log file group named mylg (see Section 15.1.16, "CREATE LOGFILE GROUP Statement").
```
mysql> CREATE TABLESPACE myts
    -> ADD DATAFILE 'mydata-1.dat'
    -> USE LOGFILE GROUP mylg
    -> ENGINE=NDB;
```


You must remove all data files from the tablespace using ALTER TABLESPACE, as shown here, before it can be dropped:
```
mysql> ALTER TABLESPACE myts
    -> DROP DATAFILE 'mydata-1.dat';
mysql> DROP TABLESPACE myts;
```


\subsection*{15.1.34 DROP TRIGGER Statement}

DROP TRIGGER [IF EXISTS] [schema_name.]trigger_name
This statement drops a trigger. The schema (database) name is optional. If the schema is omitted, the trigger is dropped from the default schema. DROP TRIGGER requires the TRIGGER privilege for the table associated with the trigger.

Use IF EXISTS to prevent an error from occurring for a trigger that does not exist. A NOTE is generated for a nonexistent trigger when using IF EXISTS. See Section 15.7.7.42, "SHOW WARNINGS Statement".

Triggers for a table are also dropped if you drop the table.

\subsection*{15.1.35 DROP VIEW Statement}
```
DROP VIEW [IF EXISTS]
    view_name [, view_name] ...
    [RESTRICT | CASCADE]
```


DROP VIEW removes one or more views. You must have the DROP privilege for each view.
If any views named in the argument list do not exist, the statement fails with an error indicating by name which nonexisting views it was unable to drop, and no changes are made.

\section*{Note}

In MySQL 8.3 and earlier, DROP VIEW returns an error if any views named in the argument list do not exist, but also drops all views in the list that do exist. Due to the change in behavior in MySQL 8.4, a partially completed DROP VIEW operation on a MySQL 8.3 replication source server fails when replicated on a MySQL 8.4 replica. To avoid this failure scenario, use IF EXISTS syntax in DROP VIEW statements to prevent an error from occurring for views that do not exist. For more information, see Section 15.1.1, "Atomic Data Definition Statement Support".

The IF EXISTS clause prevents an error from occurring for views that don't exist. When this clause is given, a NOTE is generated for each nonexistent view. See Section 15.7.7.42, "SHOW WARNINGS Statement".

RESTRICT and CASCADE, if given, are parsed and ignored.

\subsection*{15.1.36 RENAME TABLE Statement}
```
RENAME TABLE
    tbl_name TO new_tbl_name
    [, tbl_name2 TO new_tbl_name2] ...
```


RENAME TABLE renames one or more tables. You must have ALTER and DROP privileges for the original table, and CREATE and INSERT privileges for the new table.

For example, to rename a table named old_table to new_table, use this statement:
```
RENAME TABLE old_table TO new_table;
```


That statement is equivalent to the following ALTER TABLE statement:

ALTER TABLE old_table RENAME new_table;
RENAME TABLE, unlike ALTER TABLE, can rename multiple tables within a single statement:
```
RENAME TABLE old_table1 TO new_table1,
    old_table2 TO new_table2,
    old_table3 TO new_table3;
```


Renaming operations are performed left to right. Thus, to swap two table names, do this (assuming that a table with the intermediary name tmp_table does not already exist):
```
RENAME TABLE old_table TO tmp_table,
    new_table TO old_table,
    tmp_table TO new_table;
```


Metadata locks on tables are acquired in name order, which in some cases can make a difference in operation outcome when multiple transactions execute concurrently. See Section 10.11.4, "Metadata Locking".

You can rename tables locked with a LOCK TABLES statement, provided that they are locked with a WRITE lock or are the product of renaming WRITE-locked tables from earlier steps in a multiple-table rename operation. For example, this is permitted:
```
LOCK TABLE old_table1 WRITE;
RENAME TABLE old_table1 TO new_table1,
    new_table1 TO new_table2;
```


This is not permitted:
```
LOCK TABLE old_table1 READ;
RENAME TABLE old_table1 TO new_table1,
    new_table1 TO new_table2;
```


With the transaction table locking conditions satisfied, the rename operation is done atomically; no other session can access any of the tables while the rename is in progress.

If any errors occur during a RENAME TABLE, the statement fails and no changes are made.
You can use RENAME TABLE to move a table from one database to another:
RENAME TABLE current_db.tbl_name TO other_db.tbl_name;

Using this method to move all tables from one database to a different one in effect renames the database (an operation for which MySQL has no single statement), except that the original database continues to exist, albeit with no tables.

Like RENAME TABLE, ALTER TABLE ... RENAME can also be used to move a table to a different database. Regardless of the statement used, if the rename operation would move the table to a database located on a different file system, the success of the outcome is platform specific and depends on the underlying operating system calls used to move table files.

If a table has triggers, attempts to rename the table into a different database fail with a Trigger in wrong schema (ER_TRG_IN_WRONG_SCHEMA) error.

An unencrypted table can be moved to an encryption-enabled database and vice versa. However, if the table_encryption_privilege_check variable is enabled, the TABLE_ENCRYPTION_ADMIN privilege is required if the table encryption setting differs from the default database encryption.

To rename TEMPORARY tables, RENAME TABLE does not work. Use ALTER TABLE instead.
RENAME TABLE works for views, except that views cannot be renamed into a different database.
Any privileges granted specifically for a renamed table or view are not migrated to the new name. They must be changed manually.

RENAME TABLE tbl_name TO new_tbl_name changes internally generated foreign key constraint names and user-defined foreign key constraint names that begin with the string "tbl_name_ibfk_" to reflect the new table name. InnoDB interprets foreign key constraint names that begin with the string "tbl_name_ibfk_" as internally generated names.

Foreign key constraint names that point to the renamed table are automatically updated unless there is a conflict, in which case the statement fails with an error. A conflict occurs if the renamed constraint name already exists. In such cases, you must drop and re-create the foreign keys for them to function properly.

RENAME TABLE tbl_name TO new_tbl_name changes internally generated and user-defined CHECK constraint names that begin with the string "tbl_name_chk_" to reflect the new table name. MySQL interprets CHECK constraint names that begin with the string "tbl_name_chk_" as internally generated names. Example:
```
mysql> SHOW CREATE TABLE t1\G
************************** 1. row ****************************************
        Table: t1
Create Table: CREATE TABLE ˋt1ˋ (
    ˋi1ˋ int(11) DEFAULT NULL,
    ˋi2ˋ int(11) DEFAULT NULL,
    CONSTRAINT ˋt1_chk_1ˋ CHECK ((ˋi1ˋ > 0)),
    CONSTRAINT ˋt1_chk_2ˋ CHECK ((ˋi2ˋ < 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.02 sec)
mysql> RENAME TABLE t1 TO t3;
Query OK, 0 rows affected (0.03 sec)
mysql> SHOW CREATE TABLE t3\G
************************** 1. row ******************************
        Table: t3
Create Table: CREATE TABLE ˋt3ˋ (
    ˋi1ˋ int(11) DEFAULT NULL,
    ˋi2ˋ int(11) DEFAULT NULL,
    CONSTRAINT ˋt3_chk_1ˋ CHECK ((ˋi1ˋ > 0)),
    CONSTRAINT ˋt3_chk_2ˋ CHECK ((ˋi2ˋ < 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.01 sec)
```


\subsection*{15.1.37 TRUNCATE TABLE Statement}

TRUNCATE [TABLE] tbl_name
TRUNCATE TABLE empties a table completely. It requires the DROP privilege. Logically, TRUNCATE TABLE is similar to a DELETE statement that deletes all rows, or a sequence of DROP TABLE and CREATE TABLE statements.

To achieve high performance, TRUNCATE TABLE bypasses the DML method of deleting data. Thus, it does not cause ON DELETE triggers to fire, it cannot be performed for InnoDB tables with parent-child foreign key relationships, and it cannot be rolled back like a DML operation. However, TRUNCATE TABLE operations on tables that use a storage engine which supports atomic DDL are either fully committed or rolled back if the server halts during their operation. For more information, see Section 15.1.1, "Atomic Data Definition Statement Support".

Although TRUNCATE TABLE is similar to DELETE, it is classified as a DDL statement rather than a DML statement. It differs from DELETE in the following ways:
- Truncate operations drop and re-create the table, which is much faster than deleting rows one by one, particularly for large tables.
- Truncate operations cause an implicit commit, and so cannot be rolled back. See Section 15.3.3, "Statements That Cause an Implicit Commit".
- Truncation operations cannot be performed if the session holds an active table lock.
- TRUNCATE TABLE fails for an InnoDB table or NDB table if there are any FOREIGN KEY constraints from other tables that reference the table. Foreign key constraints between columns of the same table are permitted.
- Truncation operations do not return a meaningful value for the number of deleted rows. The usual result is "O rows affected," which should be interpreted as "no information."
- As long as the table definition is valid, the table can be re-created as an empty table with TRUNCATE TABLE, even if the data or index files have become corrupted.
- Any AUTO_INCREMENT value is reset to its start value. This is true even for MyISAM and InnoDB, which normally do not reuse sequence values.
- When used with partitioned tables, TRUNCATE TABLE preserves the partitioning; that is, the data and index files are dropped and re-created, while the partition definitions are unaffected.
- The TRUNCATE TABLE statement does not invoke ON DELETE triggers.
- Truncating a corrupted InnoDB table is supported.

TRUNCATE TABLE is treated for purposes of binary logging and replication as DDL rather than DML, and is always logged as a statement.

TRUNCATE TABLE for a table closes all handlers for the table that were opened with HANDLER OPEN.
TRUNCATE TABLE can be used with Performance Schema summary tables, but the effect is to reset the summary columns to 0 or NULL, not to remove rows. See Section 29.12.20, "Performance Schema Summary Tables".

Truncating an InnoDB table that resides in a file-per-table tablespace drops the existing tablespace and creates a new one. If the tablespace was created with an earlier version and resides in an unknown directory, InnoDB creates the new tablespace in the default location and writes the following warning to the error log: The DATA DIRECTORY location must be in a known directory. The DATA DIRECTORY location will be ignored and the file will be put into the default datadir location. Known directories are those defined by the datadir, innodb_data_home_dir, and innodb_directories variables. To have TRUNCATE TABLE create the tablespace in its current location, add the directory to the innodb_directories setting before running TRUNCATE TABLE.

\subsection*{15.2 Data Manipulation Statements}

\subsection*{15.2.1 CALL Statement}

CALL sp_name([parameter[,...]])
CALL sp_name[()]
The CALL statement invokes a stored procedure that was defined previously with CREATE PROCEDURE.

Stored procedures that take no arguments can be invoked without parentheses. That is, CALL $p()$ and CALL p are equivalent.

CALL can pass back values to its caller using parameters that are declared as OUT or INOUT parameters. When the procedure returns, a client program can also obtain the number of rows affected for the final statement executed within the routine: At the SQL level, call the ROW_COUNT( ) function; from the C API, call the mysql_affected_rows() function.

For information about the effect of unhandled conditions on procedure parameters, see Section 15.6.7.8, "Condition Handling and OUT or INOUT Parameters".

To get back a value from a procedure using an OUT or INOUT parameter, pass the parameter by means of a user variable, and then check the value of the variable after the procedure returns. (If you
are calling the procedure from within another stored procedure or function, you can also pass a routine parameter or local routine variable as an IN or INOUT parameter.) For an INOUT parameter, initialize its value before passing it to the procedure. The following procedure has an OUT parameter that the procedure sets to the current server version, and an INOUT value that the procedure increments by one from its current value:
```
DELIMITER //
CREATE PROCEDURE p (OUT ver_param VARCHAR(25), INOUT incr_param INT)
BEGIN
    # Set value of OUT parameter
    SELECT VERSION() INTO ver_param;
    # Increment value of INOUT parameter
    SET incr_param = incr_param + 1;
END //
DELIMITER ;
```


Before calling the procedure, initialize the variable to be passed as the INOUT parameter. After calling the procedure, you can see that the values of the two variables are set or modified:
```
mysql> SET @increment = 10;
mysql> CALL p(@version, @increment);
mysql> SELECT @version, @increment;
+----------+------------+
| @version | @increment |
+-----------+-------------+
| 8.4.9 | 11 |
+-----------+------------+
```


In prepared CALL statements used with PREPARE and EXECUTE, placeholders can be used for IN parameters, OUT, and INOUT parameters. These types of parameters can be used as follows:
```
mysql> SET @increment = 10;
mysql> PREPARE s FROM 'CALL p(?, ?)';
mysql> EXECUTE s USING @version, @increment;
mysql> SELECT @version, @increment;
+----------+------------+
| @version | @increment |
+-----------+------------+
| 8.4.9 | 11 |
+-----------+------------+
```


To write C programs that use the CALL SQL statement to execute stored procedures that produce result sets, the CLIENT_MULTI_RESULTS flag must be enabled. This is because each CALL returns a result to indicate the call status, in addition to any result sets that might be returned by statements executed within the procedure. CLIENT_MULTI_RESULTS must also be enabled if CALL is used to execute any stored procedure that contains prepared statements. It cannot be determined when such a procedure is loaded whether those statements produce result sets, so it is necessary to assume that they do so.

CLIENT_MULTI_RESULTS can be enabled when you call mysql_real_connect (), either explicitly by passing the CLIENT_MULTI_RESULTS flag itself, or implicitly by passing CLIENT_MULTI_STATEMENTS (which also enables CLIENT_MULTI_RESULTS). CLIENT_MULTI_RESULTS is enabled by default.

To process the result of a CALL statement executed using mysql_query() or mysql_real_query(), use a loop that calls mysql_next_result( ) to determine whether there are more results. For an example, see Multiple Statement Execution Support.

C programs can use the prepared-statement interface to execute CALL statements and access OUT and INOUT parameters. This is done by processing the result of a CALL statement using a loop that calls mysql_stmt_next_result( ) to determine whether there are more results. For an example, see Prepared CALL Statement Support. Languages that provide a MySQL interface can use prepared CALL statements to directly retrieve OUT and INOUT procedure parameters.

Metadata changes to objects referred to by stored programs are detected and cause automatic reparsing of the affected statements when the program is next executed. For more information, see Section 10.10.3, "Caching of Prepared Statements and Stored Programs".

\subsection*{15.2.2 DELETE Statement}

DELETE is a DML statement that removes rows from a table.
A DELETE statement can start with a WITH clause to define common table expressions accessible within the DELETE. See Section 15.2.20, "WITH (Common Table Expressions)".

\section*{Single-Table Syntax}
```
DELETE [LOW_PRIORITY] [QUICK] [IGNORE] FROM tbl_name [[AS] tbl_alias]
    [PARTITION (partition_name [, partition_name] ...)]
    [WHERE where_condition]
    [ORDER BY ...]
    [LIMIT row_count]
```


The DELETE statement deletes rows from tbl_name and returns the number of deleted rows. To check the number of deleted rows, call the ROW_COUNT( ) function described in Section 14.15, "Information Functions".

\section*{Main Clauses}

The conditions in the optional WHERE clause identify which rows to delete. With no WHERE clause, all rows are deleted.
where_condition is an expression that evaluates to true for each row to be deleted. It is specified as described in Section 15.2.13, "SELECT Statement".

If the ORDER BY clause is specified, the rows are deleted in the order that is specified. The LIMIT clause places a limit on the number of rows that can be deleted. These clauses apply to single-table deletes, but not multi-table deletes.

\section*{Multiple-Table Syntax}
```
DELETE [LOW_PRIORITY] [QUICK] [IGNORE]
    tbl_name[.*] [, tbl_name[.*]] ...
    FROM table_references
    [WHERE where_condition]
DELETE [LOW_PRIORITY] [QUICK] [IGNORE]
    FROM tbl_name[.*] [, tbl_name[.*]] ...
    USING table_references
    [WHERE where_condition]
```


\section*{Privileges}

You need the DELETE privilege on a table to delete rows from it. You need only the SELECT privilege for any columns that are only read, such as those named in the WHERE clause.

\section*{Performance}

When you do not need to know the number of deleted rows, the TRUNCATE TABLE statement is a faster way to empty a table than a DELETE statement with no WHERE clause. Unlike DELETE, TRUNCATE TABLE cannot be used within a transaction or if you have a lock on the table. See Section 15.1.37, "TRUNCATE TABLE Statement" and Section 15.3.6, "LOCK TABLES and UNLOCK TABLES Statements".

The speed of delete operations may also be affected by factors discussed in Section 10.2.5.3, "Optimizing DELETE Statements".

To ensure that a given DELETE statement does not take too much time, the MySQL-specific LIMIT row_count clause for DELETE specifies the maximum number of rows to be deleted. If the number of rows to delete is larger than the limit, repeat the DELETE statement until the number of affected rows is less than the LIMIT value.

\section*{Subqueries}

You cannot delete from a table and select from the same table in a subquery.

\section*{Partitioned Table Support}

DELETE supports explicit partition selection using the PARTITION clause, which takes a list of the comma-separated names of one or more partitions or subpartitions (or both) from which to select rows to be dropped. Partitions not included in the list are ignored. Given a partitioned table t with a partition named p0, executing the statement DELETE FROM $t$ PARTITION ( $p 0$ ) has the same effect on the table as executing ALTER TABLE t TRUNCATE PARTITION ( p 0 ); in both cases, all rows in partition p0 are dropped.

PARTITION can be used along with a WHERE condition, in which case the condition is tested only on rows in the listed partitions. For example, DELETE FROM t PARTITION (p0) WHERE $\mathrm{c}<5$ deletes rows only from partition p 0 for which the condition $\mathrm{c}<5$ is true; rows in any other partitions are not checked and thus not affected by the DELETE.

The PARTITION clause can also be used in multiple-table DELETE statements. You can use up to one such option per table named in the FROM option.

For more information and examples, see Section 26.5, "Partition Selection".

\section*{Auto-Increment Columns}

If you delete the row containing the maximum value for an AUTO_INCREMENT column, the value is not reused for a MyISAM or InnoDB table. If you delete all rows in the table with DELETE FROM tbl_name (without a WHERE clause) in autocommit mode, the sequence starts over for all storage engines except InnoDB and MyISAM. There are some exceptions to this behavior for InnoDB tables, as discussed in Section 17.6.1.6, "AUTO_INCREMENT Handling in InnoDB".

For MyISAM tables, you can specify an AUTO_INCREMENT secondary column in a multiple-column key. In this case, reuse of values deleted from the top of the sequence occurs even for MyISAM tables. See Section 5.6.9, "Using AUTO_INCREMENT".

\section*{Modifiers}

The DELETE statement supports the following modifiers:
- If you specify the LOW_PRIORITY modifier, the server delays execution of the DELETE until no other clients are reading from the table. This affects only storage engines that use only table-level locking (such as MyISAM, MEMORY, and MERGE).
- For MyISAM tables, if you use the QUICK modifier, the storage engine does not merge index leaves during delete, which may speed up some kinds of delete operations.
- The IGNORE modifier causes MySQL to ignore ignorable errors during the process of deleting rows. (Errors encountered during the parsing stage are processed in the usual manner.) Errors that are ignored due to the use of IGNORE are returned as warnings. For more information, see The Effect of IGNORE on Statement Execution.

\section*{Order of Deletion}

If the DELETE statement includes an ORDER BY clause, rows are deleted in the order specified by the clause. This is useful primarily in conjunction with LIMIT. For example, the following statement finds
rows matching the WHERE clause, sorts them by timestamp_column, and deletes the first (oldest) one:

DELETE FROM somelog WHERE user = 'jcole'
ORDER BY timestamp_column LIMIT 1;
ORDER BY also helps to delete rows in an order required to avoid referential integrity violations.

\section*{InnoDB Tables}

If you are deleting many rows from a large table, you may exceed the lock table size for an InnoDB table. To avoid this problem, or simply to minimize the time that the table remains locked, the following strategy (which does not use DELETE at all) might be helpful:
1. Select the rows not to be deleted into an empty table that has the same structure as the original table:
```
INSERT INTO t_copy SELECT * FROM t WHERE ... ;
```

2. Use RENAME TABLE to atomically move the original table out of the way and rename the copy to the original name:
```
RENAME TABLE t TO t_old, t_copy TO t;
```

3. Drop the original table:

DROP TABLE t_old;
No other sessions can access the tables involved while RENAME TABLE executes, so the rename operation is not subject to concurrency problems. See Section 15.1.36, "RENAME TABLE Statement".

\section*{MyISAM Tables}

In MyISAM tables, deleted rows are maintained in a linked list and subsequent INSERT operations reuse old row positions. To reclaim unused space and reduce file sizes, use the OPTIMIZE TABLE statement or the myisamchk utility to reorganize tables. OPTIMIZE TABLE is easier to use, but myisamchk is faster. See Section 15.7.3.4, "OPTIMIZE TABLE Statement", and Section 6.6.4, "myisamchk - MyISAM Table-Maintenance Utility".

The QUICK modifier affects whether index leaves are merged for delete operations. DELETE QUICK is most useful for applications where index values for deleted rows are replaced by similar index values from rows inserted later. In this case, the holes left by deleted values are reused.

DELETE QUICK is not useful when deleted values lead to underfilled index blocks spanning a range of index values for which new inserts occur again. In this case, use of QUICK can lead to wasted space in the index that remains unreclaimed. Here is an example of such a scenario:
1. Create a table that contains an indexed AUTO_INCREMENT column.
2. Insert many rows into the table. Each insert results in an index value that is added to the high end of the index.
3. Delete a block of rows at the low end of the column range using DELETE QUICK.

In this scenario, the index blocks associated with the deleted index values become underfilled but are not merged with other index blocks due to the use of QUICK. They remain underfilled when new inserts occur, because new rows do not have index values in the deleted range. Furthermore, they remain underfilled even if you later use DELETE without QUICK, unless some of the deleted index values happen to lie in index blocks within or adjacent to the underfilled blocks. To reclaim unused index space under these circumstances, use OPTIMIZE TABLE.

If you are going to delete many rows from a table, it might be faster to use DELETE QUICK followed by OPTIMIZE TABLE. This rebuilds the index rather than performing many index block merge operations.

\section*{Multi-Table Deletes}

You can specify multiple tables in a DELETE statement to delete rows from one or more tables depending on the condition in the WHERE clause. You cannot use ORDER BY or LIMIT in a multipletable DELETE. The table_references clause lists the tables involved in the join, as described in Section 15.2.13.2, "JOIN Clause".

For the first multiple-table syntax, only matching rows from the tables listed before the FROM clause are deleted. For the second multiple-table syntax, only matching rows from the tables listed in the FROM clause (before the USING clause) are deleted. The effect is that you can delete rows from many tables at the same time and have additional tables that are used only for searching:
```
DELETE t1, t2 FROM t1 INNER JOIN t2 INNER JOIN t3
WHERE t1.id=t2.id AND t2.id=t3.id;
```


Or:
DELETE FROM t1, t2 USING t1 INNER JOIN t2 INNER JOIN t3
WHERE t1.id=t2.id AND t2.id=t3.id;
These statements use all three tables when searching for rows to delete, but delete matching rows only from tables t1 and t2.

The preceding examples use INNER JOIN, but multiple-table DELETE statements can use other types of join permitted in SELECT statements, such as LEFT JOIN. For example, to delete rows that exist in t1 that have no match in t2, use a LEFT JOIN:

DELETE t1 FROM t1 LEFT JOIN t2 ON t1.id=t2.id WHERE t2.id IS NULL;
The syntax permits . * after each tbl_name for compatibility with Access.
If you use a multiple-table DELETE statement involving InnoDB tables for which there are foreign key constraints, the MySQL optimizer might process tables in an order that differs from that of their parent/ child relationship. In this case, the statement fails and rolls back. Instead, you should delete from a single table and rely on the ON DELETE capabilities that InnoDB provides to cause the other tables to be modified accordingly.

\section*{Note}

If you declare an alias for a table, you must use the alias when referring to the table:

DELETE t1 FROM test AS t1, test2 WHERE ...
Table aliases in a multiple-table DELETE should be declared only in the table_references part of the statement. Elsewhere, alias references are permitted but not alias declarations.

Correct:
```
DELETE a1, a2 FROM t1 AS a1 INNER JOIN t2 AS a2
WHERE a1.id=a2.id;
DELETE FROM a1, a2 USING t1 AS a1 INNER JOIN t2 AS a2
WHERE a1.id=a2.id;
```


Incorrect:
```
DELETE t1 AS a1, t2 AS a2 FROM t1 INNER JOIN t2
WHERE a1.id=a2.id;
DELETE FROM t1 AS a1, t2 AS a2 USING t1 INNER JOIN t2
WHERE a1.id=a2.id;
```


Table aliases are also supported for single-table DELETE statements.

\subsection*{15.2.3 DO Statement}

DO expr [, expr] ...
D0 executes the expressions but does not return any results. In most respects, DO is shorthand for SELECT expr, . . ., but has the advantage that it is slightly faster when you do not care about the result.

DO is useful primarily with functions that have side effects, such as RELEASE_LOCK( ).
Example: This SELECT statement pauses, but also produces a result set:
```
mysql> SELECT SLEEP(5);
+----------+
| SLEEP(5) |
+----------+
| 0 |
+----------+
1 row in set (5.02 sec)
```


D0, on the other hand, pauses without producing a result set.:
```
mysql> DO SLEEP(5);
Query OK, 0 rows affected (4.99 sec)
```


This could be useful, for example in a stored function or trigger, which prohibit statements that produce result sets.

DO only executes expressions. It cannot be used in all cases where SELECT can be used. For example, DO id FROM t1 is invalid because it references a table.

\subsection*{15.2.4 EXCEPT Clause}
```
query_expression_body EXCEPT [ALL | DISTINCT] query_expression_body
    [EXCEPT [ALL | DISTINCT] query_expression_body]
    [...]
query_expression_body:
    See Section 15.2.14, "Set Operations with UNION, INTERSECT, and EXCEPT"
```


EXCEPT limits the result from the first query block to those rows which are (also) not found in the second. As with UNION and INTERSECT, either query block can make use of any of SELECT, TABLE, or VALUES. An example using the tables a, b, and c defined in Section 15.2.8, "INTERSECT Clause", is shown here:
```
mysql> TABLE a EXCEPT TABLE b;
+------+-------+
| m | n |
+------+------+
| 2 | 3 |
+------+------+
1 row in set (0.00 sec)
mysql> TABLE a EXCEPT TABLE c;
+------+------+
| m | n |
+------+------+
| 1 | 2 |
| 2 | 3 |
+------+------+
2 rows in set (0.00 sec)
mysql> TABLE b EXCEPT TABLE c;
+------+-------+
| m | n |
+------+------+
| 1 | 2 |
```

```
+------+------+
1 row in set (0.00 sec)
```


As with UNION and INTERSECT, if neither DISTINCT nor ALL is specified, the default is DISTINCT.
DISTINCT removes duplicates found on either side of the relation, as shown here:
```
mysql> TABLE c EXCEPT DISTINCT TABLE a;
+------+------+
| m | n |
+------+------+
| 1 | 3 |
+------+------+
1 row in set (0.00 sec)
mysql> TABLE c EXCEPT ALL TABLE a;
+------+-------+
| m | n |
+------+------+
| 1 | 3 |
| 1 | 3 |
+------+------+
2 rows in set (0.00 sec)
```

(The first statement has the same effect as TABLE C EXCEPT TABLE a.)
Unlike UNION or INTERSECT, EXCEPT is not commutative-that is, the result depends on the order of the operands, as shown here:
```
mysql> TABLE a EXCEPT TABLE c;
+------+------+
| m | n |
+------+------+
| 1 | 2 |
+------+------+
2 rows in set (0.00 sec)
mysql> TABLE c EXCEPT TABLE a;
+------+-------+
| m | n |
+------+------+
| 1 | 3 |
+------+------+
1 row in set (0.00 sec)
```


As with UNION, the result sets to be compared must have the same number of columns. Result set column types are also determined as for UNION.

\subsection*{15.2.5 HANDLER Statement}
```
HANDLER tbl_name OPEN [ [AS] alias]
HANDLER tbl_name READ index_name { = | <= | >= | < | > } (value1,value2,...)
    [ WHERE where_condition ] [LIMIT ... ]
HANDLER tbl_name READ index_name { FIRST | NEXT | PREV | LAST }
    [ WHERE where_condition ] [LIMIT ... ]
HANDLER tbl_name READ { FIRST | NEXT }
    [ WHERE where_condition ] [LIMIT ... ]
HANDLER tbl_name CLOSE
```


The HANDLER statement provides direct access to table storage engine interfaces. It is available for InnoDB and MyISAM tables.

The HANDLER . . . OPEN statement opens a table, making it accessible using subsequent HANDLER . . . READ statements. This table object is not shared by other sessions and is not closed until the session calls HANDLER . . . CLOSE or the session terminates.

If you open the table using an alias, further references to the open table with other HANDLER statements must use the alias rather than the table name. If you do not use an alias, but open the table using a table name qualified by the database name, further references must use the unqualified table name. For example, for a table opened using mydb. mytable, further references must use mytable.

The first HANDLER . . . READ syntax fetches a row where the index specified satisfies the given values and the WHERE condition is met. If you have a multiple-column index, specify the index column values as a comma-separated list. Either specify values for all the columns in the index, or specify values for a leftmost prefix of the index columns. Suppose that an index my_idx includes three columns named col_a, col_b, and col_c, in that order. The HANDLER statement can specify values for all three columns in the index, or for the columns in a leftmost prefix. For example:
```
HANDLER ... READ my_idx = (col_a_val,col_b_val,col_c_val) ...
HANDLER ... READ my_idx = (col_a_val,col_b_val) ...
HANDLER ... READ my_idx = (col_a_val) ...
```


To employ the HANDLER interface to refer to a table's PRIMARY KEY, use the quoted identifier ˋPRIMARYˋ:

HANDLER tbl_name READ ˋPRIMARYˋ ...
The second HANDLER . . . READ syntax fetches a row from the table in index order that matches the WHERE condition.

The third HANDLER . . . READ syntax fetches a row from the table in natural row order that matches the WHERE condition. It is faster than HANDLER tbl_name READ index_name when a full table scan is desired. Natural row order is the order in which rows are stored in a MyISAM table data file. This statement works for InnoDB tables as well, but there is no such concept because there is no separate data file.

Without a LIMIT clause, all forms of HANDLER . . . READ fetch a single row if one is available. To return a specific number of rows, include a LIMIT clause. It has the same syntax as for the SELECT statement. See Section 15.2.13, "SELECT Statement".

HANDLER ... CLOSE closes a table that was opened with HANDLER ... OPEN.
There are several reasons to use the HANDLER interface instead of normal SELECT statements:
- HANDLER is faster than SELECT:
- A designated storage engine handler object is allocated for the HANDLER . . . OPEN. The object is reused for subsequent HANDLER statements for that table; it need not be reinitialized for each one.
- There is less parsing involved.
- There is no optimizer or query-checking overhead.
- The handler interface does not have to provide a consistent look of the data (for example, dirty reads are permitted), so the storage engine can use optimizations that SELECT does not normally permit.
- HANDLER makes it easier to port to MySQL applications that use a low-level ISAM-like interface.
- HANDLER enables you to traverse a database in a manner that is difficult (or even impossible) to accomplish with SELECT. The HANDLER interface is a more natural way to look at data when working with applications that provide an interactive user interface to the database.

HANDLER is a somewhat low-level statement. For example, it does not provide consistency. That is, HANDLER . . . OPEN does not take a snapshot of the table, and does not lock the table. This means that after a HANDLER ... OPEN statement is issued, table data can be modified (by the current session or other sessions) and these modifications might be only partially visible to HANDLER . . . NEXT or HANDLER . . . PREV scans.

An open handler can be closed and marked for reopen, in which case the handler loses its position in the table. This occurs when both of the following circumstances are true:
- Any session executes FLUSH TABLES or DDL statements on the handler's table.
- The session in which the handler is open executes non-HANDLER statements that use tables.

TRUNCATE TABLE for a table closes all handlers for the table that were opened with HANDLER OPEN.
If a table is flushed with FLUSH TABLES tbl_name WITH READ LOCK was opened with HANDLER, the handler is implicitly flushed and loses its position.

\subsection*{15.2.6 IMPORT TABLE Statement}

IMPORT TABLE FROM sdi_file [, sdi_file] ...
The IMPORT TABLE statement imports MyISAM tables based on information contained in . sdi (serialized dictionary information) metadata files. IMPORT TABLE requires the FILE privilege to read the . sdi and table content files, and the CREATE privilege for the table to be created.

Tables can be exported from one server using mysqldump to write a file of SQL statements and imported into another server using mysql to process the dump file. IMPORT TABLE provides a faster alternative using the "raw" table files.

Prior to import, the files that provide the table content must be placed in the appropriate schema directory for the import server, and the . sdi file must be located in a directory accessible to the server. For example, the .sdi file can be placed in the directory named by the secure_file_priv system variable, or (if secure_file_priv is empty) in a directory under the server data directory.

The following example describes how to export MyISAM tables named employees and managers from the hr schema of one server and import them into the hr schema of another server. The example uses these assumptions (to perform a similar operation on your own system, modify the path names as appropriate):
- For the export server, export_basedir represents its base directory, and its data directory is export_basedir/data.
- For the import server, import_basedir represents its base directory, and its data directory is import_basedir/data.
- Table files are exported from the export server into the / tmp/export directory and this directory is secure (not accessible to other users).
- The import server uses /tmp/mysql-files as the directory named by its secure_file_priv system variable.

To export tables from the export server, use this procedure:
1. Ensure a consistent snapshot by executing this statement to lock the tables so that they cannot be modified during export:
```
mysql> FLUSH TABLES hr.employees, hr.managers WITH READ LOCK;
```


While the lock is in effect, the tables can still be used, but only for read access.
2. At the file system level, copy the .sdi and table content files from the hr schema directory to the secure export directory:
- The .sdi file is located in the hr schema directory, but might not have exactly the same basename as the table name. For example, the .sdi files for the employees and managers tables might be named employees_125.sdi and managers_238.sdi.
- For a MyISAM table, the content files are its . MYD data file and . MYI index file.

Given those file names, the copy commands look like this:
```
$> cd export_basedir/data/hr
$> cp employees_125.sdi /tmp/export
$> cp managers_238.sdi /tmp/export
$> cp employees.{MYD,MYI} /tmp/export
$> cp managers.{MYD,MYI} /tmp/export
```

3. Unlock the tables:
```
mysql> UNLOCK TABLES;
```


To import tables into the import server, use this procedure:
1. The import schema must exist. If necessary, execute this statement to create it:
```
mysql> CREATE SCHEMA hr;
```

2. At the file system level, copy the .sdi files to the import server secure_file_priv directory, / tmp/mysql-files. Also, copy the table content files to the hr schema directory:
```
$> cd /tmp/export
$> cp employees_125.sdi /tmp/mysql-files
$> cp managers_238.sdi /tmp/mysql-files
$> cp employees.{MYD,MYI} import_basedir/data/hr
$> cp managers.{MYD,MYI} import_basedir/data/hr
```

3. Import the tables by executing an IMPORT TABLE statement that names the . sdi files:
```
mysql> IMPORT TABLE FROM
    '/tmp/mysql-files/employees.sdi',
    '/tmp/mysql-files/managers.sdi';
```


The . sdi file need not be placed in the import server directory named by the secure_file_priv system variable if that variable is empty; it can be in any directory accessible to the server, including the schema directory for the imported table. If the . sdi file is placed in that directory, however, it may be rewritten; the import operation creates a new. sdi file for the table, which overwrites the old. sdi file if the operation uses the same file name for the new file.

Each sdi_file value must be a string literal that names the . sdi file for a table or is a pattern that matches . sdi files. If the string is a pattern, any leading directory path and the . sdi file name suffix must be given literally. Pattern characters are permitted only in the base name part of the file name:
- ? matches any single character
- * matches any sequence of characters, including no characters

Using a pattern, the previous IMPORT TABLE statement could have been written like this (assuming that the /tmp/mysql-files directory contains no other . sdi files matching the pattern):
```
IMPORT TABLE FROM '/tmp/mysql-files/*.sdi';
```


To interpret the location of . sdi file path names, the server uses the same rules for IMPORT TABLE as the server-side rules for LOAD DATA (that is, the non-LOCAL rules). See Section 15.2.9, "LOAD DATA Statement", paying particular attention to the rules used to interpret relative path names.

IMPORT TABLE fails if the . sdi or table files cannot be located. After importing a table, the server attempts to open it and reports as warnings any problems detected. To attempt a repair to correct any reported issues, use REPAIR TABLE.

IMPORT TABLE is not written to the binary log.

\section*{Restrictions and Limitations}

IMPORT TABLE applies only to non-TEMPORARY MyISAM tables. It does not apply to tables created with a transactional storage engine, tables created with CREATE TEMPORARY TABLE, or views.

An . sdi file used in an import operation must be generated on a server with the same data dictionary version and sdi version as the import server. The version information of the generating server is found in the . sdi file:
```
{
    "mysqld_version_id":80019,
    "dd_version":80017,
    "sdi_version":80016,
    ...
}
```


To determine the data dictionary and sdi version of the import server, you can check the . sdi file of a recently created table on the import server.

The table data and index files must be placed in the schema directory for the import server prior to the import operation, unless the table as defined on the export server uses the DATA DIRECTORY or INDEX DIRECTORY table options. In that case, modify the import procedure using one of these alternatives before executing the IMPORT TABLE statement:
- Put the data and index files into the same directory on the import server host as on the export server host, and create symlinks in the import server schema directory to those files.
- Put the data and index files into an import server host directory different from that on the export server host, and create symlinks in the import server schema directory to those files. In addition, modify the . sdi file to reflect the different file locations.
- Put the data and index files into the schema directory on the import server host, and modify the .sdi file to remove the data and index directory table options.

Any collation IDs stored in the . sdi file must refer to the same collations on the export and import servers.

Trigger information for a table is not serialized into the table . sdi file, so triggers are not restored by the import operation.

Some edits to an .sdi file are permissible prior to executing the IMPORT TABLE statement, whereas others are problematic or may even cause the import operation to fail:
- Changing the data directory and index directory table options is required if the locations of the data and index files differ between the export and import servers.
- Changing the schema name is required to import the table into a different schema on the import server than on the export server.
- Changing schema and table names may be required to accommodate differences between file system case-sensitivity semantics on the export and import servers or differences in lower_case_table_names settings. Changing the table names in the . sdi file may require renaming the table files as well.
- In some cases, changes to column definitions are permitted. Changing data types is likely to cause problems.

\subsection*{15.2.7 INSERT Statement}
```
INSERT [LOW_PRIORITY | DELAYED | HIGH_PRIORITY] [IGNORE]
    [INTO] tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    [(col_name [, col_name] ...)]
```

```
    { {VALUES | VALUE} (value_list) [, (value_list)] ... }
    [AS row_alias[(col_alias [, col_alias] ...)]]
    [ON DUPLICATE KEY UPDATE assignment_list]
INSERT [LOW_PRIORITY | DELAYED | HIGH_PRIORITY] [IGNORE]
    [INTO] tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    SET assignment_list
    [AS row_alias[(col_alias [, col_alias] ...)]]
    [ON DUPLICATE KEY UPDATE assignment_list]
INSERT [LOW_PRIORITY | HIGH_PRIORITY] [IGNORE]
    [INTO] tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    [(col_name [, col_name] ...)]
    { SELECT ...
        | TABLE table_name
        | VALUES row_constructor_list
    }
    [ON DUPLICATE KEY UPDATE assignment_list]
value:
    {expr | DEFAULT}
value_list:
    value [, value] ...
row_constructor_list:
    ROW(value_list)[, ROW(value_list)][, ...]
assignment:
    col_name =
            value
        | [row_alias.]col_name
        | [tbl_name.]col_name
        | [row_alias.]col_alias
assignment_list:
    assignment [, assignment] ...
```


INSERT inserts new rows into an existing table. The INSERT ... VALUES, INSERT ... VALUES ROW ( ), and INSERT ... SET forms of the statement insert rows based on explicitly specified values. The INSERT . . . SELECT form inserts rows selected from another table or tables. You can also use INSERT ... TABLE to insert rows from a single table. INSERT with an ON DUPLICATE KEY UPDATE clause enables existing rows to be updated if a row to be inserted would cause a duplicate value in a UNIQUE index or PRIMARY KEY. A row alias with one or more optional column aliases can be used with ON DUPLICATE KEY UPDATE to refer to the row to be inserted.

For additional information about INSERT ... SELECT and INSERT ... ON DUPLICATE KEY UPDATE, see Section 15.2.7.1, "INSERT ... SELECT Statement", and Section 15.2.7.2, "INSERT ... ON DUPLICATE KEY UPDATE Statement".

In MySQL 8.4, the DELAYED keyword is accepted but ignored by the server. For the reasons for this, see Section 15.2.7.3, "INSERT DELAYED Statement",

Inserting into a table requires the INSERT privilege for the table. If the ON DUPLICATE KEY UPDATE clause is used and a duplicate key causes an UPDATE to be performed instead, the statement requires the UPDATE privilege for the columns to be updated. For columns that are read but not modified you need only the SELECT privilege (such as for a column referenced only on the right hand side of an col_name=expr assignment in an ON DUPLICATE KEY UPDATE clause).

When inserting into a partitioned table, you can control which partitions and subpartitions accept new rows. The PARTITION clause takes a list of the comma-separated names of one or more partitions or subpartitions (or both) of the table. If any of the rows to be inserted by a given INSERT statement do not match one of the partitions listed, the INSERT statement fails with the error Found a row not matching the given partition set. For more information and examples, see Section 26.5, "Partition Selection".
tbl_name is the table into which rows should be inserted. Specify the columns for which the statement provides values as follows:
- Provide a parenthesized list of comma-separated column names following the table name. In this case, a value for each named column must be provided by the VALUES list, VALUES ROW( ) list, or SELECT statement. For the INSERT TABLE form, the number of columns in the source table must match the number of columns to be inserted.
- If you do not specify a list of column names for INSERT . . . VALUES or INSERT . . . SELECT, values for every column in the table must be provided by the VALUES list, SELECT statement, or TABLE statement. If you do not know the order of the columns in the table, use DESCRIBE tbl_name to find out.
- A SET clause indicates columns explicitly by name, together with the value to assign each one.

Column values can be given in several ways:
- If strict SQL mode is not enabled, any column not explicitly given a value is set to its default (explicit or implicit) value. For example, if you specify a column list that does not name all the columns in the table, unnamed columns are set to their default values. Default value assignment is described in Section 13.6, "Data Type Default Values".

If strict SQL mode is enabled, an INSERT statement generates an error if it does not specify an explicit value for every column that has no default value. See Section 7.1.11, "Server SQL Modes".
- If both the column list and the VALUES list are empty, INSERT creates a row with each column set to its default value:

INSERT INTO tbl_name () VALUES();
If strict mode is not enabled, MySQL uses the implicit default value for any column that has no explicitly defined default. If strict mode is enabled, an error occurs if any column has no default value.
- Use the keyword DEFAULT to set a column explicitly to its default value. This makes it easier to write INSERT statements that assign values to all but a few columns, because it enables you to avoid writing an incomplete VALUES list that does not include a value for each column in the table. Otherwise, you must provide the list of column names corresponding to each value in the VALUES list.
- If a generated column is inserted into explicitly, the only permitted value is DEFAULT. For information about generated columns, see Section 15.1.20.8, "CREATE TABLE and Generated Columns".
- In expressions, you can use DEFAULT(col_name) to produce the default value for column col_name.
- Type conversion of an expression expr that provides a column value might occur if the expression data type does not match the column data type. Conversion of a given value can result in different inserted values depending on the column type. For example, inserting the string '1999.0e-2 ' into an INT, FLOAT, DECIMAL (10, 6), or YEAR column inserts the value 1999, 19.9921, 19.992100, or 1999, respectively. The value stored in the INT and YEAR columns is 1999 because the string-tonumber conversion looks only at as much of the initial part of the string as may be considered a valid integer or year. For the FLOAT and DECIMAL columns, the string-to-number conversion considers the entire string a valid numeric value.
- An expression expr can refer to any column that was set earlier in a value list. For example, you can do this because the value for col2 refers to col1, which has previously been assigned:

INSERT INTO tbl_name (col1,col2) VALUES(15,col1*2);
But the following is not legal, because the value for col1 refers to col2, which is assigned after col1:

INSERT INTO tbl_name (col1,col2) VALUES(col2*2,15);

An exception occurs for columns that contain AUTO_INCREMENT values. Because AUTO_INCREMENT values are generated after other value assignments, any reference to an AUTO_INCREMENT column in the assignment returns a 0.

INSERT statements that use VALUES syntax can insert multiple rows. To do this, include multiple lists of comma-separated column values, with lists enclosed within parentheses and separated by commas. Example:
```
INSERT INTO tbl_name (a,b,c)
    VALUES(1,2,3), (4,5,6), (7,8,9);
```


Each values list must contain exactly as many values as are to be inserted per row. The following statement is invalid because it contains one list of nine values, rather than three lists of three values each:
```
INSERT INTO tbl_name (a,b,c) VALUES(1,2,3,4,5,6,7,8,9);
```


VALUE is a synonym for VALUES in this context. Neither implies anything about the number of values lists, nor about the number of values per list. Either may be used whether there is a single values list or multiple lists, and regardless of the number of values per list.

INSERT statements using VALUES ROW ( ) syntax can also insert multiple rows. In this case, each value list must be contained within a ROW ( ) (row constructor), like this:
```
INSERT INTO tbl_name (a,b,c)
    VALUES ROW(1,2,3), ROW(4,5,6), ROW(7,8,9);
```


The affected-rows value for an INSERT can be obtained using the ROW_COUNT( ) SQL function or the mysql_affected_rows() C API function. See Section 14.15, "Information Functions", and mysql_affected_rows().

If you use INSERT ... VALUES or INSERT ... VALUES ROW ( ) with multiple value lists, or INSERT ... SELECT or INSERT ... TABLE, the statement returns an information string in this format:

Records: N1 Duplicates: N2 Warnings: N3

If you are using the C API, the information string can be obtained by invoking the mysql_info() function. See mysql_info().

Records indicates the number of rows processed by the statement. (This is not necessarily the number of rows actually inserted because Duplicates can be nonzero.) Duplicates indicates the number of rows that could not be inserted because they would duplicate some existing unique index value. Warnings indicates the number of attempts to insert column values that were problematic in some way. Warnings can occur under any of the following conditions:
- Inserting NULL into a column that has been declared NOT NULL. For multiple-row INSERT statements or INSERT INTO ... SELECT statements, the column is set to the implicit default value for the column data type. This is 0 for numeric types, the empty string ( $' ~ '$ ) for string types, and the "zero" value for date and time types. INSERT INTO ... SELECT statements are handled the same way as multiple-row inserts because the server does not examine the result set from the SELECT to see whether it returns a single row. (For a single-row INSERT, no warning occurs when NULL is inserted into a NOT NULL column. Instead, the statement fails with an error.)
- Setting a numeric column to a value that lies outside the column range. The value is clipped to the closest endpoint of the range.
- Assigning a value such as ' 10.34 a' to a numeric column. The trailing nonnumeric text is stripped off and the remaining numeric part is inserted. If the string value has no leading numeric part, the column is set to 0 .
- Inserting a string into a string column (CHAR, VARCHAR, TEXT, or BLOB) that exceeds the column maximum length. The value is truncated to the column maximum length.
- Inserting a value into a date or time column that is illegal for the data type. The column is set to the appropriate zero value for the type.
- For INSERT examples involving AUTO_INCREMENT column values, see Section 5.6.9, "Using AUTO_INCREMENT".

If INSERT inserts a row into a table that has an AUTO_INCREMENT column, you can find the value used for that column by using the LAST_INSERT_ID( ) SQL function or the mysql_insert_id() C API function.

> Note
> These two functions do not always behave identically. The behavior of INSERT statements with respect to AUTO_INCREMENT columns is discussed further in Section 14.15, "Information Functions", and mysql_insert_id().

The INSERT statement supports the following modifiers:
- If you use the LOW_PRIORITY modifier, execution of the INSERT is delayed until no other clients are reading from the table. This includes other clients that began reading while existing clients are reading, and while the INSERT LOW_PRIORITY statement is waiting. It is possible, therefore, for a client that issues an INSERT LOW_PRIORITY statement to wait for a very long time.

LOW_PRIORITY affects only storage engines that use only table-level locking (such as MyISAM, MEMORY, and MERGE).

\section*{Note \\ LOW_PRIORITY should normally not be used with MyISAM tables because doing so disables concurrent inserts. See Section 10.11.3, "Concurrent Inserts".}
- If you specify HIGH_PRIORITY, it overrides the effect of the --low-priority-updates option if the server was started with that option. It also causes concurrent inserts not to be used. See Section 10.11.3, "Concurrent Inserts".

HIGH_PRIORITY affects only storage engines that use only table-level locking (such as MyISAM, MEMORY, and MERGE).
- If you use the IGNORE modifier, ignorable errors that occur while executing the INSERT statement are ignored. For example, without IGNORE, a row that duplicates an existing UNIQUE index or PRIMARY KEY value in the table causes a duplicate-key error and the statement is aborted. With IGNORE, the row is discarded and no error occurs. Ignored errors generate warnings instead.

IGNORE has a similar effect on inserts into partitioned tables where no partition matching a given value is found. Without IGNORE, such INSERT statements are aborted with an error. When INSERT IGNORE is used, the insert operation fails silently for rows containing the unmatched value, but inserts rows that are matched. For an example, see Section 26.2.2, "LIST Partitioning".

Data conversions that would trigger errors abort the statement if IGNORE is not specified. With IGNORE, invalid values are adjusted to the closest values and inserted; warnings are produced but the statement does not abort. You can determine with the mysql_info( ) C API function how many rows were actually inserted into the table.

For more information, see The Effect of IGNORE on Statement Execution.
You can use REPLACE instead of INSERT to overwrite old rows. REPLACE is the counterpart to INSERT IGNORE in the treatment of new rows that contain unique key values that duplicate
old rows: The new rows replace the old rows rather than being discarded. See Section 15.2.12, "REPLACE Statement".
- If you specify ON DUPLICATE KEY UPDATE, and a row is inserted that would cause a duplicate value in a UNIQUE index or PRIMARY KEY, an UPDATE of the old row occurs. The affected-rows value per row is 1 if the row is inserted as a new row, 2 if an existing row is updated, and 0 if an existing row is set to its current values. If you specify the CLIENT_FOUND_ROWS flag to the mysql_real_connect() C API function when connecting to mysqld, the affected-rows value is 1 (not 0 ) if an existing row is set to its current values. See Section 15.2.7.2, "INSERT ... ON DUPLICATE KEY UPDATE Statement".
- INSERT DELAYED was deprecated in MySQL 5.6, and is scheduled for eventual removal. In MySQL 8.4, the DELAYED modifier is accepted but ignored. Use INSERT (without DELAYED) instead. See Section 15.2.7.3, "INSERT DELAYED Statement".

\subsection*{15.2.7.1 INSERT ... SELECT Statement}
```
INSERT [LOW_PRIORITY | HIGH_PRIORITY] [IGNORE]
    [INTO] tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    [(col_name [, col_name] ...)]
    { SELECT ...
        | TABLE table_name
        | VALUES row_constructor_list
    }
    [ON DUPLICATE KEY UPDATE assignment_list]
value:
    {expr | DEFAULT}
value_list:
    value [, value] ...
row_constructor_list:
    ROW(value_list)[, ROW(value_list)][, ...]
assignment:
    col_name =
            value
        | [row_alias.]col_name
        | [tbl_name.]col_name
        | [row_alias.]col_alias
assignment_list:
    assignment [, assignment] ...
```


With INSERT . . . SELECT, you can quickly insert many rows into a table from the result of a SELECT statement, which can select from one or many tables. For example:
```
INSERT INTO tbl_temp2 (fld_id)
    SELECT tbl_temp1.fld_order_id
    FROM tbl_temp1 WHERE tbl_temp1.fld_order_id > 100;
```


TABLE statement in place of SELECT, as shown here:
INSERT INTO ta TABLE tb;
TABLE tb is equivalent to SELECT * FROM tb. It can be useful when inserting all columns from the source table into the target table, and no filtering with WHERE is required. In addition, the rows from TABLE can be ordered by one or more columns using ORDER BY, and the number of rows inserted can be limited using a LIMIT clause. For more information, see Section 15.2.16, "TABLE Statement".

The following conditions hold for INSERT ... SELECT statements, and, except where noted, for INSERT ... TABLE as well:
- Specify IGNORE to ignore rows that would cause duplicate-key violations.
- The target table of the INSERT statement may appear in the FROM clause of the SELECT part of the query, or as the table named by TABLE. However, you cannot insert into a table and select from the same table in a subquery.

When selecting from and inserting into the same table, MySQL creates an internal temporary table to hold the rows from the SELECT and then inserts those rows into the target table. However, you cannot use INSERT INTO $t \ldots$... SELECT ... FROM $t$ when $t$ is a TEMPORARY table, because TEMPORARY tables cannot be referred to twice in the same statement. For the same reason, you cannot use INSERT INTO $t \ldots$... TABLE $t$ when $t$ is a temporary table. See Section 10.4.4, "Internal Temporary Table Use in MySQL", and Section B.3.6.2, "TEMPORARY Table Problems".
- AUTO_INCREMENT columns work as usual.
- To ensure that the binary log can be used to re-create the original tables, MySQL does not permit concurrent inserts for INSERT ... SELECT or INSERT ... TABLE statements (see Section 10.11.3, "Concurrent Inserts").
- To avoid ambiguous column reference problems when the SELECT and the INSERT refer to the same table, provide a unique alias for each table used in the SELECT part, and qualify column names in that part with the appropriate alias.

The TABLE statement does not support aliases.
You can explicitly select which partitions or subpartitions (or both) of the source or target table (or both) are to be used with a PARTITION clause following the name of the table. When PARTITION is used with the name of the source table in the SELECT portion of the statement, rows are selected only from the partitions or subpartitions named in its partition list. When PARTITION is used with the name of the target table for the INSERT portion of the statement, it must be possible to insert all rows selected into the partitions or subpartitions named in the partition list following the option. Otherwise, the INSERT ... SELECT statement fails. For more information and examples, see Section 26.5, "Partition Selection".

TABLE does not support a PARTITION clause.
For INSERT . . . SELECT statements, see Section 15.2.7.2, "INSERT ... ON DUPLICATE KEY UPDATE Statement" for conditions under which the SELECT columns can be referred to in an ON DUPLICATE KEY UPDATE clause. This also works for INSERT ... TABLE.

The order in which a SELECT or TABLE statement with no ORDER BY clause returns rows is nondeterministic. This means that, when using replication, there is no guarantee that such a SELECT returns rows in the same order on the source and the replica, which can lead to inconsistencies between them. To prevent this from occurring, always write INSERT ... SELECT or INSERT ... TABLE statements that are to be replicated using an ORDER BY clause that produces the same row order on the source and the replica. See also Section 19.5.1.18, "Replication and LIMIT".

Due to this issue, INSERT ... SELECT ON DUPLICATE KEY UPDATE and INSERT IGNORE ... SELECT statements are flagged as unsafe for statement-based replication. Such statements produce a warning in the error log when using statement-based mode and are written to the binary log using the row-based format when using MIXED mode. (Bug \#11758262, Bug \#50439)

See also Section 19.2.1.1, "Advantages and Disadvantages of Statement-Based and Row-Based Replication".

\subsection*{15.2.7.2 INSERT ... ON DUPLICATE KEY UPDATE Statement}

If you specify an ON DUPLICATE KEY UPDATE clause and a row to be inserted would cause a duplicate value in a UNIQUE index or PRIMARY KEY, an UPDATE of the old row occurs. For example, if column a is declared as UNIQUE and contains the value 1, the following two statements have similar effect:
```
INSERT INTO t1 (a,b,c) VALUES (1,2,3)
```

```
ON DUPLICATE KEY UPDATE c=c+1;
UPDATE t1 SET c=c+1 WHERE a=1;
```


The effects are not quite identical: For an InnoDB table where a is an auto-increment column, the INSERT statement increases the auto-increment value but the UPDATE does not.

If column $b$ is also unique, the INSERT is equivalent to this UPDATE statement instead:
```
UPDATE t1 SET c=c+1 WHERE a=1 OR b=2 LIMIT 1;
```


If $a=10 R b=2$ matches several rows, only one row is updated. In general, you should try to avoid using an ON DUPLICATE KEY UPDATE clause on tables with multiple unique indexes.

With ON DUPLICATE KEY UPDATE, the affected-rows value per row is 1 if the row is inserted as a new row, 2 if an existing row is updated, and 0 if an existing row is set to its current values. If you specify the CLIENT_FOUND_ROWS flag to the mysql_real_connect ( ) C API function when connecting to mysqld, the affected-rows value is 1 (not 0 ) if an existing row is set to its current values.

If a table contains an AUTO_INCREMENT column and INSERT ... ON DUPLICATE KEY UPDATE inserts or updates a row, the LAST_INSERT_ID( ) function returns the AUTO_INCREMENT value.

The ON DUPLICATE KEY UPDATE clause can contain multiple column assignments, separated by commas.

It is possible to use IGNORE with ON DUPLICATE KEY UPDATE in an INSERT statement, but this may not behave as you expect when inserting multiple rows into a table that has multiple unique keys. This becomes apparent when an updated value is itself a duplicate key value. Consider the table $t$, created and populated by the statements shown here:
```
mysql> CREATE TABLE t (a SERIAL, b BIGINT NOT NULL, UNIQUE KEY (b));;
Query OK, 0 rows affected (0.03 sec)
mysql> INSERT INTO t VALUES ROW(1,1), ROW(2,2);
Query OK, 2 rows affected (0.01 sec)
Records: 2 Duplicates: 0 Warnings: 0
mysql> TABLE t;
+---+---+
| a | b |
+---+---+
| 1 | 1 |
| 2 | 2 |
+---+---+
2 rows in set (0.00 sec)
```


Now we attempt to insert two rows, one of which contains a duplicate key value, using ON DUPLICATE KEY UPDATE, where the UPDATE clause itself results in a duplicate key value:
```
mysql> INSERT INTO t VALUES ROW(2,3), ROW(3,3) ON DUPLICATE KEY UPDATE a=a+1, b=b-1;
ERROR 1062 (23000): Duplicate entry '1' for key 't.b'
mysql> TABLE t;
+---+---+
| a | b |
+---+---+
| 1 | 1 |
| 2 | 2 |
+---+---+
2 rows in set (0.00 sec)
```


The first row contains a duplicate value for one of the table's unique keys (column a), but b=b+1 in the UPDATE clause results in a unique key violation for column b; the statement is immediately rejected with an error, and no rows are updated. Let us repeat the statement, this time adding the IGNORE keyword, like this:
```
mysql> INSERT IGNORE INTO t VALUES ROW(2,3), ROW(3,3)
    -> ON DUPLICATE KEY UPDATE a=a+1, b=b-1;
```

```
Query OK, 1 row affected, 1 warning (0.00 sec)
Records: 2 Duplicates: 1 Warnings: 1
```


This time, the previous error is demoted to a warning, as shown here:
```
mysql> SHOW WARNINGS;
+---------+-------+------------------------------------
| Level | Code | Message |
+---------+-------+----------------------------------+
| Warning | 1062 | Duplicate entry '1' for key 't.b' |
+---------+-------+------------------------------------
1 row in set (0.00 sec)
```


Because the statement was not rejected, execution continues. This means that the second row is inserted into $t$, as we can see here:
```
mysql> TABLE t;
+---+---+
| a | b |
+---+---+
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
+---+---+
3 rows in set (0.00 sec)
```


In assignment value expressions in the ON DUPLICATE KEY UPDATE clause, you can use the VALUES(col_name) function to refer to column values from the INSERT portion of the INSERT ... ON DUPLICATE KEY UPDATE statement. In other words, VALUES(col_name) in the ON DUPLICATE KEY UPDATE clause refers to the value of col_name that would be inserted, had no duplicate-key conflict occurred. This function is especially useful in multiple-row inserts. The VALUES( ) function is meaningful only as an introducer for INSERT statement value lists, or in the ON DUPLICATE KEY UPDATE clause of an INSERT statement, and returns NULL otherwise. For example:
```
INSERT INTO t1 (a,b,c) VALUES (1,2,3),(4,5,6)
    ON DUPLICATE KEY UPDATE c=VALUES(a)+VALUES(b);
```


That statement is identical to the following two statements:
```
INSERT INTO t1 (a,b,c) VALUES (1,2,3)
    ON DUPLICATE KEY UPDATE c=3;
INSERT INTO t1 (a,b,c) VALUES (4,5,6)
    ON DUPLICATE KEY UPDATE c=9;
```


\section*{Note}

The use of VALUES( ) to refer to the new row and columns is deprecated, and subject to removal in a future version of MySQL. Instead, use row and column aliases, as described in the next few paragraphs of this section.

It is possible to use an alias for the row, with, optionally, one or more of its columns to be inserted, following the VALUES or SET clause, and preceded by the AS keyword. Using the row alias new, the statement shown previously using VALUES( ) to access the new column values can be written in the form shown here:
```
INSERT INTO t1 (a,b,c) VALUES (1,2,3),(4,5,6) AS new
    ON DUPLICATE KEY UPDATE c = new.a+new.b;
```


If, in addition, you use the column aliases $\mathrm{m}, \mathrm{n}$, and p , you can omit the row alias in the assignment clause and write the same statement like this:
```
INSERT INTO t1 (a,b,c) VALUES (1,2,3),(4,5,6) AS new(m,n,p)
    ON DUPLICATE KEY UPDATE c = m+n;
```


When using column aliases in this fashion, you must still use a row alias following the VALUES clause, even if you do not make direct use of it in the assignment clause.

An INSERT ... SELECT ... ON DUPLICATE KEY UPDATE statement that uses VALUES() in the UPDATE clause, like this one, throws a warning:
```
INSERT INTO t1
    SELECT c, c+d FROM t2
    ON DUPLICATE KEY UPDATE b = VALUES(b);
```


You can eliminate such warnings by using a subquery instead, like this:
```
INSERT INTO t1
    SELECT * FROM (SELECT c, c+d AS e FROM t2) AS dt
    ON DUPLICATE KEY UPDATE b = e;
```


You can also use row and column aliases with a SET clause, as mentioned previously. Employing SET instead of VALUES in the two INSERT ... ON DUPLICATE KEY UPDATE statements just shown can be done as shown here:
```
INSERT INTO t1 SET a=1,b=2,c=3 AS new
    ON DUPLICATE KEY UPDATE c = new.a+new.b;
INSERT INTO t1 SET a=1,b=2,c=3 AS new(m,n,p)
    ON DUPLICATE KEY UPDATE c = m+n;
```


The row alias must not be the same as the name of the table. If column aliases are not used, or if they are the same as the column names, they must be distinguished using the row alias in the ON DUPLICATE KEY UPDATE clause. Column aliases must be unique with regard to the row alias to which they apply (that is, no column aliases referring to columns of the same row may be the same).

For INSERT ... SELECT statements, these rules apply regarding acceptable forms of SELECT query expressions that you can refer to in an ON DUPLICATE KEY UPDATE clause:
- References to columns from queries on a single table, which may be a derived table.
- References to columns from queries on a join over multiple tables.
- References to columns from DISTINCT queries.
- References to columns in other tables, as long as the SELECT does not use GROUP BY. One side effect is that you must qualify references to nonunique column names.

References to columns from a UNION are not supported. To work around this restriction, rewrite the UNION as a derived table so that its rows can be treated as a single-table result set. For example, this statement produces an error:
```
INSERT INTO t1 (a, b)
    SELECT c, d FROM t2
    UNION
    SELECT e, f FROM t3
ON DUPLICATE KEY UPDATE b = b + c;
```


Instead, use an equivalent statement that rewrites the UNION as a derived table:
```
INSERT INTO t1 (a, b)
SELECT * FROM
    (SELECT c, d FROM t2
        UNION
        SELECT e, f FROM t3) AS dt
ON DUPLICATE KEY UPDATE b = b + c;
```


The technique of rewriting a query as a derived table also enables references to columns from GROUP BY queries.

Because the results of INSERT . . . SELECT statements depend on the ordering of rows from the SELECT and this order cannot always be guaranteed, it is possible when logging INSERT . . . SELECT ON DUPLICATE KEY UPDATE statements for the source and the replica to diverge. Thus, INSERT ... SELECT ON DUPLICATE KEY UPDATE statements are flagged as unsafe
for statement-based replication. Such statements produce a warning in the error log when using statement-based mode and are written to the binary log using the row-based format when using MIXED mode. An INSERT ... ON DUPLICATE KEY UPDATE statement against a table having more than one unique or primary key is also marked as unsafe. (Bug \#11765650, Bug \#58637)

See also Section 19.2.1.1, "Advantages and Disadvantages of Statement-Based and Row-Based Replication".

\subsection*{15.2.7.3 INSERT DELAYED Statement}

\section*{INSERT DELAYED ...}

The DELAYED option for the INSERT statement is a MySQL extension to standard SQL. In previous versions of MySQL, it can be used for certain kinds of tables (such as MyISAM), such that when a client uses INSERT DELAYED, it gets an okay from the server at once, and the row is queued to be inserted when the table is not in use by any other thread.

DELAYED inserts and replaces were deprecated in MySQL 5.6. In MySQL 8.4, DELAYED is not supported. The server recognizes but ignores the DELAYED keyword, handles the insert as a nondelayed insert, and generates an ER_WARN_LEGACY_SYNTAX_CONVERTED warning: INSERT DELAYED is no longer supported. The statement was converted to INSERT. The DELAYED keyword is scheduled for removal in a future release.

\subsection*{15.2.8 INTERSECT Clause}
```
query_expression_body INTERSECT [ALL | DISTINCT] query_expression_body
    [INTERSECT [ALL | DISTINCT] query_expression_body]
    [...]
query_expression_body:
    See Section 15.2.14, "Set Operations with UNION, INTERSECT, and EXCEPT"
```


INTERSECT limits the result from multiple query blocks to those rows which are common to all.

Example:
```
mysql> TABLE a;
+------+-------+
| m | n |
+------+------+
| 1 | 2 |
| 2 | 3 |
| 3 | 4 |
+------+-------+
3 rows in set (0.00 sec)
mysql> TABLE b;
+------+-------+
| m | n |
+------+-------+
| 1 | 2 |
| 1 | 3 |
| 3 | 4 |
+------+-------+
3 rows in set (0.00 sec)
mysql> TABLE c;
+------+-------+
|m |n |
+------+-------+
| 1 | 3 |
| 1 | 3 |
| 3 | 4 |
+------+------+
3 rows in set (0.00 sec)
mysql> TABLE a INTERSECT TABLE b;
+------+-------+
```

```
| m | n |
| 1 | 2 |
| 3 | 4 |
+------+------+
2 rows in set (0.00 sec)
mysql> TABLE a INTERSECT TABLE c;
+------+-------+
| m | n |
+------+-------+
| 3 | 4 |
+------+------+
1 row in set (0.00 sec)
```


As with UNION and EXCEPT, if neither DISTINCT nor ALL is specified, the default is DISTINCT.
DISTINCT can remove duplicates from either side of the intersection, as shown here:
```
mysql> TABLE c INTERSECT DISTINCT TABLE c;
+------+-------+
| m | n |
+------+-------+
| 1 1 3 |
+------+------+
2 rows in set (0.00 sec)
mysql> TABLE c INTERSECT ALL TABLE c;
+------+-------+
+------+-------+
| 1 1 3 
| 3 | 4 |
+------+-------+
3 rows in set (0.00 sec)
```

(TABLE c INTERSECT TABLE c is the equivalent of the first of the two statements just shown.)
As with UNION, the operands must have the same number of columns. Result set column types are also determined as for UNION.

INTERSECT has greater precedence than and is evaluated before UNION and EXCEPT, so that the two statements shown here are equivalent:
```
TABLE r EXCEPT TABLE s INTERSECT TABLE t;
TABLE r EXCEPT (TABLE s INTERSECT TABLE t);
```


For INTERSECT ALL, the maximum supported number of duplicates of any unique row in the left hand table is 4294967295.

\subsection*{15.2.9 LOAD DATA Statement}
```
LOAD DATA
    [LOW_PRIORITY | CONCURRENT] [LOCAL]
    INFILE 'file_name'
    [REPLACE | IGNORE]
    INTO TABLE tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    [CHARACTER SET charset_name]
    [{FIELDS | COLUMNS}
        [TERMINATED BY 'string']
        [[OPTIONALLY] ENCLOSED BY 'char']
        [ESCAPED BY 'char']
    ]
    [LINES
        [STARTING BY 'string']
```

```
    [TERMINATED BY 'string']
]
[IGNORE number {LINES | ROWS}]
[(col_name_or_user_var
    [, col_name_or_user_var] ...)]
[SET col_name={expr | DEFAULT}
    [, col_name={expr | DEFAULT}] ...]
```


The LOAD DATA statement reads rows from a text file into a table at a very high speed. The file can be read from the server host or the client host, depending on whether the LOCAL modifier is given. LOCAL also affects data interpretation and error handling.

LOAD DATA is the complement of SELECT ... INTO OUTFILE. (See Section 15.2.13.1, "SELECT ... INTO Statement".) To write data from a table to a file, use SELECT ... INTO OUTFILE. To read the file back into a table, use LOAD DATA. The syntax of the FIELDS and LINES clauses is the same for both statements.

The mysqlimport utility provides another way to load data files; it operates by sending a LOAD DATA statement to the server. See Section 6.5.5, "mysqlimport - A Data Import Program".

For information about the efficiency of INSERT versus LOAD DATA and speeding up LOAD DATA, see Section 10.2.5.1, "Optimizing INSERT Statements".
- Non-LOCAL Versus LOCAL Operation
- Input File Character Set
- Input File Location
- Security Requirements
- Duplicate-Key and Error Handling
- Index Handling
- Field and Line Handling
- Column List Specification
- Input Preprocessing
- Column Value Assignment
- Partitioned Table Support
- Concurrency Considerations
- Statement Result Information
- Replication Considerations
- Miscellaneous Topics

\section*{Non-LOCAL Versus LOCAL Operation}

The LOCAL modifier affects these aspects of LOAD DATA, compared to non-LOCAL operation:
- It changes the expected location of the input file; see Input File Location.
- It changes the statement security requirements; see Security Requirements.
- Unless REPLACE is also specified, LOCAL has the same effect as the IGNORE modifier on the interpretation of input file contents and error handling; see Duplicate-Key and Error Handling, and Column Value Assignment.

LOCAL works only if the server and your client both have been configured to permit it. For example, if mysqld was started with the local_infile system variable disabled, LOCAL produces an error. See Section 8.1.6, "Security Considerations for LOAD DATA LOCAL".

\section*{Input File Character Set}

The file name must be given as a literal string. On Windows, specify backslashes in path names as forward slashes or doubled backslashes. The server interprets the file name using the character set indicated by the character_set_filesystem system variable.

By default, the server interprets the file contents using the character set indicated by the character_set_database system variable. If the file contents use a character set different from this default, it is a good idea to specify that character set by using the CHARACTER SET clause. A character set of binary specifies "no conversion."

SET NAMES and the setting of character_set_client do not affect interpretation of file contents.
LOAD DATA interprets all fields in the file as having the same character set, regardless of the data types of the columns into which field values are loaded. For proper interpretation of the file, you must ensure that it was written with the correct character set. For example, if you write a data file with mysqldump -T or by issuing a SELECT ... INTO OUTFILE statement in mysql, be sure to use a --default-character-set option to write output in the character set to be used when the file is loaded with LOAD DATA.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2650.jpg?height=115&width=99&top_left_y=1194&top_left_x=306)

\section*{Note}

It is not possible to load data files that use the ucs2, utf16, utf16le, or utf32 character set.

\section*{Input File Location}

These rules determine the LOAD DATA input file location:
- If LOCAL is not specified, the file must be located on the server host. The server reads the file directly, locating it as follows:
- If the file name is an absolute path name, the server uses it as given.
- If the file name is a relative path name with leading components, the server looks for the file relative to its data directory.
- If the file name has no leading components, the server looks for the file in the database directory of the default database.
- If LOCAL is specified, the file must be located on the client host. The client program reads the file, locating it as follows:
- If the file name is an absolute path name, the client program uses it as given.
- If the file name is a relative path name, the client program looks for the file relative to its invocation directory.

When LOCAL is used, the client program reads the file and sends its contents to the server. The server creates a copy of the file in the directory where it stores temporary files. See Section B.3.3.5, "Where MySQL Stores Temporary Files". Lack of sufficient space for the copy in this directory can cause the LOAD DATA LOCAL statement to fail.

The non-LOCAL rules mean that the server reads a file named as ./myfile.txt relative to its data directory, whereas it reads a file named as myfile.txt from the database directory of the default database. For example, if the following LOAD DATA statement is executed while db1 is the default database, the server reads the file data.txt from the database directory for db1, even though the statement explicitly loads the file into a table in the db2 database:

\section*{Note}

The server also uses the non-LOCAL rules to locate. sdi files for the IMPORT TABLE statement.

\section*{Security Requirements}

For a non-LOCAL load operation, the server reads a text file located on the server host, so these security requirements must be satisfied:
- You must have the FILE privilege. See Section 8.2.2, "Privileges Provided by MySQL".
- The operation is subject to the secure_file_priv system variable setting:
- If the variable value is a nonempty directory name, the file must be located in that directory.
- If the variable value is empty (which is insecure), the file need only be readable by the server.

For a LOCAL load operation, the client program reads a text file located on the client host. Because the file contents are sent over the connection by the client to the server, using LOCAL is a bit slower than when the server accesses the file directly. On the other hand, you do not need the FILE privilege, and the file can be located in any directory the client program can access.

\section*{Duplicate-Key and Error Handling}

The REPLACE and IGNORE modifiers control handling of new (input) rows that duplicate existing table rows on unique key values (PRIMARY KEY or UNIQUE index values):
- With REPLACE, new rows that have the same value as a unique key value in an existing row replace the existing row. See Section 15.2.12, "REPLACE Statement".
- With IGNORE, new rows that duplicate an existing row on a unique key value are discarded. For more information, see The Effect of IGNORE on Statement Execution.

The LOCAL modifier has the same effect as IGNORE. This occurs because the server has no way to stop transmission of the file in the middle of the operation.

If none of REPLACE, IGNORE, or LOCAL is specified, an error occurs when a duplicate key value is found, and the rest of the text file is ignored.

In addition to affecting duplicate-key handling as just described, IGNORE and LOCAL also affect error handling:
- When neither IGNORE nor LOCAL is specified, data-interpretation errors terminate the operation.
- When IGNORE-or LOCAL without REPLACE-is specified, data interpretation errors become warnings and the load operation continues, even if the SQL mode is restrictive. For examples, see Column Value Assignment.

\section*{Index Handling}

To ignore foreign key constraints during the load operation, execute a SET foreign_key_checks = 0 statement before executing LOAD DATA.

If you use LOAD DATA on an empty MyISAM table, all nonunique indexes are created in a separate batch (as for REPAIR TABLE). Normally, this makes LOAD DATA much faster when you have many indexes. In some extreme cases, you can create the indexes even faster by turning them off with ALTER TABLE ... DISABLE KEYS before loading the file into the table and re-creating the indexes with ALTER TABLE ... ENABLE KEYS after loading the file. See Section 10.2.5.1, "Optimizing INSERT Statements".

\section*{Field and Line Handling}

For both the LOAD DATA and SELECT ... INTO OUTFILE statements, the syntax of the FIELDS and LINES clauses is the same. Both clauses are optional, but FIELDS must precede LINES if both are specified.

If you specify a FIELDS clause, each of its subclauses (TERMINATED BY, [OPTIONALLY] ENCLOSED BY, and ESCAPED BY) is also optional, except that you must specify at least one of them. Arguments to these clauses are permitted to contain only ASCII characters.

If you specify no FIELDS or LINES clause, the defaults are the same as if you had written this:
```
FIELDS TERMINATED BY '\t' ENCLOSED BY '' ESCAPED BY '\\'
LINES TERMINATED BY '\n' STARTING BY ''
```


Backslash is the MySQL escape character within strings in SQL statements. Thus, to specify a literal backslash, you must specify two backslashes for the value to be interpreted as a single backslash. The escape sequences ' \t ' and ' \n' specify tab and newline characters, respectively.

In other words, the defaults cause LOAD DATA to act as follows when reading input:
- Look for line boundaries at newlines.
- Do not skip any line prefix.
- Break lines into fields at tabs.
- Do not expect fields to be enclosed within any quoting characters.
- Interpret characters preceded by the escape character \ as escape sequences. For example, $\backslash \mathrm{t}, \backslash \mathrm{n}$, and $\backslash \backslash$ signify tab, newline, and backslash, respectively. See the discussion of FIELDS ESCAPED BY later for the full list of escape sequences.

Conversely, the defaults cause SELECT ... INTO OUTFILE to act as follows when writing output:
- Write tabs between fields.
- Do not enclose fields within any quoting characters.
- Use \to escape instances of tab, newline, or \that occur within field values.
- Write newlines at the ends of lines.

\section*{Note}

For a text file generated on a Windows system, proper file reading might require LINES TERMINATED BY ' \r \n' because Windows programs typically use two characters as a line terminator. Some programs, such as WordPad, might use \r as a line terminator when writing files. To read such files, use LINES TERMINATED BY ' \r'.

If all the input lines have a common prefix that you want to ignore, you can use LINES STARTING BY 'prefix_string' to skip the prefix and anything before it. If a line does not include the prefix, the entire line is skipped. Suppose that you issue the following statement:
```
LOAD DATA INFILE '/tmp/test.txt' INTO TABLE test
    FIELDS TERMINATED BY ',' LINES STARTING BY 'xxx';
```


If the data file looks like this:
```
xxx"abc",1
something xxx"def",2
"ghi",3
```


The resulting rows are ("abc", 1 ) and ("def", 2 ). The third row in the file is skipped because it does not contain the prefix.

The IGNORE number LINES clause can be used to ignore lines at the start of the file. For example, you can use IGNORE 1 LINES to skip an initial header line containing column names:

LOAD DATA INFILE '/tmp/test.txt' INTO TABLE test IGNORE 1 LINES;
When you use SELECT ... INTO OUTFILE in tandem with LOAD DATA to write data from a database into a file and then read the file back into the database later, the field- and line-handling options for both statements must match. Otherwise, LOAD DATA does not interpret the contents of the file properly. Suppose that you use SELECT ... INTO OUTFILE to write a file with fields delimited by commas:
```
SELECT * INTO OUTFILE 'data.txt'
    FIELDS TERMINATED BY ','
    FROM table2;
```


To read the comma-delimited file, the correct statement is:
```
LOAD DATA INFILE 'data.txt' INTO TABLE table2
    FIELDS TERMINATED BY ',';
```


If instead you tried to read the file with the statement shown following, it would not work because it instructs LOAD DATA to look for tabs between fields:
```
LOAD DATA INFILE 'data.txt' INTO TABLE table2
    FIELDS TERMINATED BY '\t';
```


The likely result is that each input line would be interpreted as a single field.
LOAD DATA can be used to read files obtained from external sources. For example, many programs can export data in comma-separated values (CSV) format, such that lines have fields separated by commas and enclosed within double quotation marks, with an initial line of column names. If the lines in such a file are terminated by carriage return/newline pairs, the statement shown here illustrates the field- and line-handling options you would use to load the file:
```
LOAD DATA INFILE 'data.txt' INTO TABLE tbl_name
    FIELDS TERMINATED BY ',' ENCLOSED BY '"'
    LINES TERMINATED BY '\r\n'
    IGNORE 1 LINES;
```


If the input values are not necessarily enclosed within quotation marks, use OPTIONALLY before the ENCLOSED BY option.

Any of the field- or line-handling options can specify an empty string ( ' ' ). If not empty, the FIELDS [OPTIONALLY] ENCLOSED BY and FIELDS ESCAPED BY values must be a single character. The FIELDS TERMINATED BY, LINES STARTING BY, and LINES TERMINATED BY values can be more than one character. For example, to write lines that are terminated by carriage return/linefeed pairs, or to read a file containing such lines, specify a LINES TERMINATED BY ' $\backslash r \backslash n$ ' clause.

To read a file containing jokes that are separated by lines consisting of \%\%, you can do this
```
CREATE TABLE jokes
    (a INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    joke TEXT NOT NULL);
LOAD DATA INFILE '/tmp/jokes.txt' INTO TABLE jokes
    FIELDS TERMINATED BY ''
    LINES TERMINATED BY '\n%%\n' (joke);
```


FIELDS [OPTIONALLY] ENCLOSED BY controls quoting of fields. For output (SELECT ... INTO OUTFILE), if you omit the word OPTIONALLY, all fields are enclosed by the ENCLOSED BY character. An example of such output (using a comma as the field delimiter) is shown here:
```
"1","a string","100.20"
"2","a string containing a , comma","102.20"
"3","a string containing a \" quote","102.20"
"4","a string containing a \", quote and comma","102.20"
```


If you specify OPTIONALLY, the ENCLOSED BY character is used only to enclose values from columns that have a string data type (such as CHAR, BINARY, TEXT, or ENUM):
```
1,"a string",100.20
2,"a string containing a , comma",102.20
3,"a string containing a \" quote",102.20
4,"a string containing a \", quote and comma",102.20
```


Occurrences of the ENCLOSED BY character within a field value are escaped by prefixing them with the ESCAPED BY character. Also, if you specify an empty ESCAPED BY value, it is possible to inadvertently generate output that cannot be read properly by LOAD DATA. For example, the preceding output just shown would appear as follows if the escape character is empty. Observe that the second field in the fourth line contains a comma following the quote, which (erroneously) appears to terminate the field:
```
1,"a string",100.20
2,"a string containing a , comma",102.20
3,"a string containing a " quote",102.20
4,"a string containing a ", quote and comma",102.20
```


For input, the ENCLOSED BY character, if present, is stripped from the ends of field values. (This is true regardless of whether OPTIONALLY is specified; OPTIONALLY has no effect on input interpretation.) Occurrences of the ENCLOSED BY character preceded by the ESCAPED BY character are interpreted as part of the current field value.

If the field begins with the ENCLOSED BY character, instances of that character are recognized as terminating a field value only if followed by the field or line TERMINATED BY sequence. To avoid ambiguity, occurrences of the ENCLOSED BY character within a field value can be doubled and are interpreted as a single instance of the character. For example, if ENCLOSED BY ' ' ' ' is specified, quotation marks are handled as shown here:
```
"The ""BIG"" boss" -> The "BIG" boss
The "BIG" boss -> The "BIG" boss
The ""BIG"" boss -> The ""BIG"" boss
```


\section*{FIELDS ESCAPED BY controls how to read or write special characters:}
- For input, if the FIELDS ESCAPED BY character is not empty, occurrences of that character are stripped and the following character is taken literally as part of a field value. Some two-character sequences that are exceptions, where the first character is the escape character. These sequences are shown in the following table (using \for the escape character). The rules for NULL handling are described later in this section.

\begin{tabular}{|l|l|}
\hline Character & Escape Sequence \\
\hline \0 & An ASCII NUL ( X ' 00 ' ) character \\
\hline \b & A backspace character \\
\hline \n & A newline (linefeed) character \\
\hline \r & A carriage return character \\
\hline \t & A tab character. \\
\hline \Z & ASCII 26 (Control+Z) \\
\hline \N & NULL \\
\hline
\end{tabular}

For more information about \-escape syntax, see Section 11.1.1, "String Literals".
If the FIELDS ESCAPED BY character is empty, escape-sequence interpretation does not occur.
- For output, if the FIELDS ESCAPED BY character is not empty, it is used to prefix the following characters on output:
- The FIELDS ESCAPED BY character.
- The FIELDS [OPTIONALLY] ENCLOSED BY character.
- The first character of the FIELDS TERMINATED BY and LINES TERMINATED BY values, if the ENCLOSED BY character is empty or unspecified.
- ASCII 0 (what is actually written following the escape character is ASCII 0 , not a zero-valued byte).

If the FIELDS ESCAPED BY character is empty, no characters are escaped and NULL is output as NULL, not \N. It is probably not a good idea to specify an empty escape character, particularly if field values in your data contain any of the characters in the list just given.

In certain cases, field- and line-handling options interact:
- If LINES TERMINATED BY is an empty string and FIELDS TERMINATED BY is nonempty, lines are also terminated with FIELDS TERMINATED BY.
- If the FIELDS TERMINATED BY and FIELDS ENCLOSED BY values are both empty (' ' ), a fixedrow (nondelimited) format is used. With fixed-row format, no delimiters are used between fields (but you can still have a line terminator). Instead, column values are read and written using a field width wide enough to hold all values in the field. For TINYINT, SMALLINT, MEDIUMINT, INT, and BIGINT, the field widths are $4,6,8,11$, and 20 , respectively, no matter what the declared display width is.

LINES TERMINATED BY is still used to separate lines. If a line does not contain all fields, the rest of the columns are set to their default values. If you do not have a line terminator, you should set this to ' ' . In this case, the text file must contain all fields for each row.

Fixed-row format also affects handling of NULL values, as described later.

\section*{Note}

Fixed-size format does not work if you are using a multibyte character set.

Handling of NULL values varies according to the FIELDS and LINES options in use:
- For the default FIELDS and LINES values, NULL is written as a field value of \N for output, and a field value of \N is read as NULL for input (assuming that the ESCAPED BY character is \\).
- If FIELDS ENCLOSED BY is not empty, a field containing the literal word NULL as its value is read as a NULL value. This differs from the word NULL enclosed within FIELDS ENCLOSED BY characters, which is read as the string 'NULL'.
- If FIELDS ESCAPED BY is empty, NULL is written as the word NULL.
- With fixed-row format (which is used when FIELDS TERMINATED BY and FIELDS ENCLOSED BY are both empty), NULL is written as an empty string. This causes both NULL values and empty strings in the table to be indistinguishable when written to the file because both are written as empty strings. If you need to be able to tell the two apart when reading the file back in, you should not use fixed-row format.

An attempt to load NULL into a NOT NULL column produces either a warning or an error according to the rules described in Column Value Assignment.

Some cases are not supported by LOAD DATA:
- Fixed-size rows (FIELDS TERMINATED BY and FIELDS ENCLOSED BY both empty) and BLOB or TEXT columns.
- If you specify one separator that is the same as or a prefix of another, LOAD DATA cannot interpret the input properly. For example, the following FIELDS clause would cause problems:
```
FIELDS TERMINATED BY '"' ENCLOSED BY '"'
```

- If FIELDS ESCAPED BY is empty, a field value that contains an occurrence of FIELDS ENCLOSED BY or LINES TERMINATED BY followed by the FIELDS TERMINATED BY value causes LOAD DATA to stop reading a field or line too early. This happens because LOAD DATA cannot properly determine where the field or line value ends.

\section*{Column List Specification}

The following example loads all columns of the persondata table:
LOAD DATA INFILE 'persondata.txt' INTO TABLE persondata;
By default, when no column list is provided at the end of the LOAD DATA statement, input lines are expected to contain a field for each table column. If you want to load only some of a table's columns, specify a column list:

LOAD DATA INFILE 'persondata.txt' INTO TABLE persondata
(col_name_or_user_var [, col_name_or_user_var] ...);
You must also specify a column list if the order of the fields in the input file differs from the order of the columns in the table. Otherwise, MySQL cannot tell how to match input fields with table columns.

\section*{Input Preprocessing}

Each instance of col_name_or_user_var in LOAD DATA syntax is either a column name or a user variable. With user variables, the SET clause enables you to perform preprocessing transformations on their values before assigning the result to columns.

User variables in the SET clause can be used in several ways. The following example uses the first input column directly for the value of t1. column1, and assigns the second input column to a user variable that is subjected to a division operation before being used for the value of t1.column2:
```
LOAD DATA INFILE 'file.txt'
    INTO TABLE t1
    (column1, @var1)
    SET column2 = @var1/100;
```


The SET clause can be used to supply values not derived from the input file. The following statement sets column3 to the current date and time:
```
LOAD DATA INFILE 'file.txt'
    INTO TABLE t1
    (column1, column2)
    SET column3 = CURRENT_TIMESTAMP;
```


You can also discard an input value by assigning it to a user variable and not assigning the variable to any table column:
```
LOAD DATA INFILE 'file.txt'
    INTO TABLE t1
    (column1, @dummy, column2, @dummy, column3);
```


Use of the column/variable list and SET clause is subject to the following restrictions:
- Assignments in the SET clause should have only column names on the left hand side of assignment operators.
- You can use subqueries in the right hand side of SET assignments. A subquery that returns a value to be assigned to a column may be a scalar subquery only. Also, you cannot use a subquery to select from the table that is being loaded.
- Lines ignored by an IGNORE number LINES clause are not processed for the column/variable list or SET clause.
- User variables cannot be used when loading data with fixed-row format because user variables do not have a display width.

\section*{Column Value Assignment}

To process an input line, LOAD DATA splits it into fields and uses the values according to the column/ variable list and the SET clause, if they are present. Then the resulting row is inserted into the table. If there are BEFORE INSERT or AFTER INSERT triggers for the table, they are activated before or after inserting the row, respectively.

Interpretation of field values and assignment to table columns depends on these factors:
- The SQL mode (the value of the sql_mode system variable). The mode can be nonrestrictive, or restrictive in various ways. For example, strict SQL mode can be enabled, or the mode can include values such as NO_ZERO_DATE or NO_ZERO_IN_DATE.
- Presence or absence of the IGNORE and LOCAL modifiers.

Those factors combine to produce restrictive or nonrestrictive data interpretation by LOAD DATA:
- Data interpretation is restrictive if the SQL mode is restrictive and neither the IGNORE nor the LOCAL modifier is specified. Errors terminate the load operation.
- Data interpretation is nonrestrictive if the SQL mode is nonrestrictive or the IGNORE or LOCAL modifier is specified. (In particular, either modifier if specified overrides a restrictive SQL mode when the REPLACE modifier is omitted.) Errors become warnings and the load operation continues.

Restrictive data interpretation uses these rules:
- Too many or too few fields results an error.
- Assigning NULL (that is, \N) to a non-NULL column results in an error.
- A value that is out of range for the column data type results in an error.
- Invalid values produce errors. For example, a value such as ' x ' for a numeric column results in an error, not conversion to 0 .

By contrast, nonrestrictive data interpretation uses these rules:
- If an input line has too many fields, the extra fields are ignored and the number of warnings is incremented.
- If an input line has too few fields, the columns for which input fields are missing are assigned their default values. Default value assignment is described in Section 13.6, "Data Type Default Values".
- Assigning NULL (that is, \N) to a non-NULL column results in assignment of the implicit default value for the column data type. Implicit default values are described in Section 13.6, "Data Type Default Values".
- Invalid values produce warnings rather than errors, and are converted to the "closest" valid value for the column data type. Examples:
- A value such as ' $x$ ' for a numeric column results in conversion to 0 .
- An out-of-range numeric or temporal value is clipped to the closest endpoint of the range for the column data type.
- An invalid value for a DATETIME, DATE, or TIME column is inserted as the implicit default value, regardless of the SQL mode NO_ZERO_DATE setting. The implicit default is the appropriate "zero" value for the type ('0000-00-00 00:00:00', '0000-00-00', or '00:00:00'). See Section 13.2, "Date and Time Data Types".
- LOAD DATA interprets an empty field value differently from a missing field:
- For string types, the column is set to the empty string.
- For numeric types, the column is set to 0 .
- For date and time types, the column is set to the appropriate "zero" value for the type. See Section 13.2, "Date and Time Data Types".

These are the same values that result if you assign an empty string explicitly to a string, numeric, or date or time type explicitly in an INSERT or UPDATE statement.

TIMESTAMP columns are set to the current date and time only if there is a NULL value for the column (that is, \N) and the column is not declared to permit NULL values, or if the TIMESTAMP column default value is the current timestamp and it is omitted from the field list when a field list is specified.

LOAD DATA regards all input as strings, so you cannot use numeric values for ENUM or SET columns the way you can with INSERT statements. All ENUM and SET values must be specified as strings.

BIT values cannot be loaded directly using binary notation (for example, b '011010 ' ). To work around this, use the SET clause to strip off the leading b ' and trailing ' and perform a base-2 to base-10 conversion so that MySQL loads the values into the BIT column properly:
```
$> cat /tmp/bit_test.txt
b'10'
b'1111111'
$> mysql test
mysql> LOAD DATA INFILE '/tmp/bit_test.txt'
    INTO TABLE bit_test (@var1)
    SET b = CAST(CONV(MID(@var1, 3, LENGTH(@var1)-3), 2, 10) AS UNSIGNED);
Query OK, 2 rows affected (0.00 sec)
Records: 2 Deleted: 0 Skipped: 0 Warnings: 0
mysql> SELECT BIN(b+0) FROM bit_test;
+----------+
| BIN(b+0) |
+----------+
| 10 |
| 1111111 |
+----------+
2 rows in set (0.00 sec)
```


For BIT values in 0b binary notation (for example, 0b011010), use this SET clause instead to strip off the leading 0b:
```
SET b = CAST(CONV(MID(@var1, 3, LENGTH(@var1)-2), 2, 10) AS UNSIGNED)
```


\section*{Partitioned Table Support}

LOAD DATA supports explicit partition selection using the PARTITION clause with a list of one or more comma-separated names of partitions, subpartitions, or both. When this clause is used, if any rows from the file cannot be inserted into any of the partitions or subpartitions named in the list, the statement fails with the error Found a row not matching the given partition set. For more information and examples, see Section 26.5, "Partition Selection".

\section*{Concurrency Considerations}

With the LOW_PRIORITY modifier, execution of the LOAD DATA statement is delayed until no other clients are reading from the table. This affects only storage engines that use only table-level locking (such as MyISAM, MEMORY, and MERGE).

With the CONCURRENT modifier and a MyISAM table that satisfies the condition for concurrent inserts (that is, it contains no free blocks in the middle), other threads can retrieve data from the table while

LOAD DATA is executing. This modifier affects the performance of LOAD DATA a bit, even if no other thread is using the table at the same time.

\section*{Statement Result Information}

When the LOAD DATA statement finishes, it returns an information string in the following format:
Records: 1 Deleted: 0 Skipped: 0 Warnings: 0
Warnings occur under the same circumstances as when values are inserted using the INSERT statement (see Section 15.2.7, "INSERT Statement"), except that LOAD DATA also generates warnings when there are too few or too many fields in the input row.

You can use SHOW WARNINGS to get a list of the first max_error_count warnings as information about what went wrong. See Section 15.7.7.42, "SHOW WARNINGS Statement".

If you are using the C API, you can get information about the statement by calling the mysql_info() function. See mysql_info().

\section*{Replication Considerations}

LOAD DATA is considered unsafe for statement-based replication. If you use LOAD DATA with binlog_format=STATEMENT, each replica on which the changes are to be applied creates a temporary file containing the data. This temporary file is not encrypted, even if binary log encryption is active on the source, If encryption is required, use row-based or mixed binary logging format instead, for which replicas do not create the temporary file. For more information on the interaction between LOAD DATA and replication, see Section 19.5.1.19, "Replication and LOAD DATA".

\section*{Miscellaneous Topics}

On Unix, if you need LOAD DATA to read from a pipe, you can use the following technique (the example loads a listing of the / directory into the table db1 . t1):
```
mkfifo /mysql/data/db1/ls.dat
chmod 666 /mysql/data/db1/ls.dat
find / -ls > /mysql/data/db1/ls.dat &
mysql -e "LOAD DATA INFILE 'ls.dat' INTO TABLE t1" db1
```


Here you must run the command that generates the data to be loaded and the mysql commands either on separate terminals, or run the data generation process in the background (as shown in the preceding example). If you do not do this, the pipe blocks until data is read by the mysql process.

\subsection*{15.2.10 LOAD XML Statement}
```
LOAD XML
    [LOW_PRIORITY | CONCURRENT] [LOCAL]
    INFILE 'file_name'
    [REPLACE | IGNORE]
    INTO TABLE [db_name.]tbl_name
    [CHARACTER SET charset_name]
    [ROWS IDENTIFIED BY '<tagname>']
    [IGNORE number {LINES | ROWS}]
    [(field_name_or_user_var
        [, field_name_or_user_var] ...)]
    [SET col_name={expr | DEFAULT}
        [, col_name={expr | DEFAULT}] ...]
```


The LOAD XML statement reads data from an XML file into a table. The file_name must be given as a literal string. The tagname in the optional ROWS IDENTIFIED BY clause must also be given as a literal string, and must be surrounded by angle brackets (< and >).

LOAD XML acts as the complement of running the mysql client in XML output mode (that is, starting the client with the --xml option). To write data from a table to an XML file, you can invoke the mysql client with the --xml and -e options from the system shell, as shown here:
\$> mysql --xml -e 'SELECT * FROM mydb.mytable' > file.xml
To read the file back into a table, use LOAD XML. By default, the <row> element is considered to be the equivalent of a database table row; this can be changed using the ROWS IDENTIFIED BY clause.

This statement supports three different XML formats:
- Column names as attributes and column values as attribute values:
```
<row column1="value1" column2="value2" .../>
```

- Column names as tags and column values as the content of these tags:
```
<row>
    <column1>value1</column1>
    <column2>value2</column2>
</row>
```

- Column names are the name attributes of <field> tags, and values are the contents of these tags:
```
<row>
    <field name='column1'>value1</field>
    <field name='column2'>value2</field>
</row>
```


This is the format used by other MySQL tools, such as mysqldump.
All three formats can be used in the same XML file; the import routine automatically detects the format for each row and interprets it correctly. Tags are matched based on the tag or attribute name and the column name.

The following clauses work essentially the same way for LOAD XML as they do for LOAD DATA:
- LOW_PRIORITY or CONCURRENT
- LOCAL
- REPLACE or IGNORE
- CHARACTER SET
- SET

See Section 15.2.9, "LOAD DATA Statement", for more information about these clauses.
(field_name_or_user_var, . . . ) is a list of one or more comma-separated XML fields or user variables. The name of a user variable used for this purpose must match the name of a field from the XML file, prefixed with @. You can use field names to select only desired fields. User variables can be employed to store the corresponding field values for subsequent re-use.

The IGNORE number LINES or IGNORE number ROWS clause causes the first number rows in the XML file to be skipped. It is analogous to the LOAD DATA statement's IGNORE ... LINES clause.

Suppose that we have a table named person, created as shown here:
```
USE test;
CREATE TABLE person (
    person_id INT NOT NULL PRIMARY KEY,
    fname VARCHAR(40) NULL,
    lname VARCHAR(40) NULL,
    created TIMESTAMP
);
```


Suppose further that this table is initially empty.

Now suppose that we have a simple XML file person.xml, whose contents are as shown here:
```
<list>
    <person person_id="1" fname="Kapek" lname="Sainnouine"/>
    <person person_id="2" fname="Sajon" lname="Rondela"/>
    <person person_id="3"><fname>Likame</fname><lname>Örrtmons</lname></person>
    <person person_id="4"><fname>Slar</fname><lname>Manlanth</lname></person>
    <person><field name="person_id">5</field><field name="fname">Stoma</field>
        <field name="lname">Milu</field></person>
    <person><field name="person_id">6</field><field name="fname">Nirtam</field>
        <field name="lname">Sklöd</field></person>
    <person person_id="7"><fname>Sungam</fname><lname>Dulbåd</lname></person>
    <person person_id="8" fname="Sraref" lname="Encmelt"/>
</list>
```


Each of the permissible XML formats discussed previously is represented in this example file.
To import the data in person . xml into the person table, you can use this statement:
```
mysql> LOAD XML LOCAL INFILE 'person.xml'
    -> INTO TABLE person
    -> ROWS IDENTIFIED BY '<person>';
Query OK, 8 rows affected (0.00 sec)
Records: 8 Deleted: 0 Skipped: 0 Warnings: 0
```


Here, we assume that person.xml is located in the MySQL data directory. If the file cannot be found, the following error results:
```
ERROR 2 (HY000): File '/person.xml' not found (Errcode: 2)
```


The ROWS IDENTIFIED BY '<person>' clause means that each <person> element in the XML file is considered equivalent to a row in the table into which the data is to be imported. In this case, this is the person table in the test database.

As can be seen by the response from the server, 8 rows were imported into the test . person table. This can be verified by a simple SELECT statement:
```
mysql> SELECT * FROM person;
+------------+--------+------------+---------------------+
| person_id | fname | lname | created |
+------------+--------+------------+--------------------+
| 1 | Kapek | Sainnouine | 2007-07-13 16:18:47 |
| 2 | Sajon | Rondela | 2007-07-13 16:18:47 |
| 3 | Likame | Örrtmons | 2007-07-13 16:18:47 |
| 4 | Slar | Manlanth | 2007-07-13 16:18:47
| 5 | Stoma | Nilu
| 6 | Nirtam | Sklöd | 2007-07-13 16:18:47 |
| 7 | Sungam | Dulbåd | 2007-07-13 16:18:47 |
| 8 | Sreraf | Encmelt | 2007-07-13 16:18:47 |
+------------+--------+------------+--------------------+
8 rows in set (0.00 sec)
```


This shows, as stated earlier in this section, that any or all of the 3 permitted XML formats may appear in a single file and be read using LOAD XML.

The inverse of the import operation just shown-that is, dumping MySQL table data into an XML filecan be accomplished using the mysql client from the system shell, as shown here:
```
$> mysql --xml -e "SELECT * FROM test.person" > person-dump.xml
$> cat person-dump.xml
<?xml version="1.0"?>
<resultset statement="SELECT * FROM test.person" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <row>
<field name="person_id">1</field>
<field name="fname">Kapek</field>
<field name="lname">Sainnouine</field>
```

```
    </row>
    <row>
<field name="person_id">2</field>
<field name="fname">Sajon</field>
<field name="lname">Rondela</field>
    </row>
    <row>
<field name="person_id">3</field>
<field name="fname">Likema</field>
<field name="lname">Örrtmons</field>
    </row>
    <row>
<field name="person_id">4</field>
<field name="fname">Slar</field>
<field name="lname">Manlanth</field>
    </row>
    <row>
<field name="person_id">5</field>
<field name="fname">Stoma</field>
<field name="lname">Nilu</field>
    </row>
    <row>
<field name="person_id">6</field>
<field name="fname">Nirtam</field>
<field name="lname">Sklöd</field>
    </row>
    <row>
<field name="person_id">7</field>
<field name="fname">Sungam</field>
<field name="lname">Dulbåd</field>
    </row>
    <row>
<field name="person_id">8</field>
<field name="fname">Sreraf</field>
<field name="lname">Encmelt</field>
    </row>
</resultset>
```


Note
The --xml option causes the mysql client to use XML formatting for its output; the -e option causes the client to execute the SQL statement immediately following the option. See Section 6.5.1, "mysql - The MySQL Command-Line Client".

You can verify that the dump is valid by creating a copy of the person table and importing the dump file into the new table, like this:
```
mysql> USE test;
mysql> CREATE TABLE person2 LIKE person;
Query OK, 0 rows affected (0.00 sec)
mysql> LOAD XML LOCAL INFILE 'person-dump.xml'
    -> INTO TABLE person2;
Query OK, 8 rows affected (0.01 sec)
Records: 8 Deleted: 0 Skipped: 0 Warnings: 0
mysql> SELECT * FROM person2;
+ \textbf{---------+--------+------------+--------------------+
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2663.jpg?height=191&width=958&top_left_y=246&top_left_x=351)
```
8 rows in set (0.00 sec)
```


There is no requirement that every field in the XML file be matched with a column in the corresponding table. Fields which have no corresponding columns are skipped. You can see this by first emptying the person2 table and dropping the created column, then using the same LOAD XML statement we just employed previously, like this:
```
mysql> TRUNCATE person2;
Query OK, 8 rows affected (0.26 sec)
mysql> ALTER TABLE person2 DROP COLUMN created;
Query OK, 0 rows affected (0.52 sec)
Records: 0 Duplicates: 0 Warnings: 0
mysql> SHOW CREATE TABLE person2\G
************************** 1. row ******************************
            Table: person2
Create Table: CREATE TABLE ˋperson2ˋ (
    person_idˋ int NOT NULL,
    ˋfnameˋ varchar(40) DEFAULT NULL,
    ˋlnameˋ varchar(40) DEFAULT NULL,
    PRIMARY KEY (ˋperson_idˋ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.00 sec)
mysql> LOAD XML LOCAL INFILE 'person-dump.xml'
        -> INTO TABLE person2;
Query OK, 8 rows affected (0.01 sec)
Records: 8 Deleted: 0 Skipped: 0 Warnings: 0
mysql> SELECT * FROM person2;
+------------+--------+------------+
| person_id | fname | lname |
+------------+--------+------------+
| 1 | Kapek | Sainnouine |
| 2 | Sajon | Rondela
| 3 | Likema | Örrtmons
| 4 | Slar | Manlanth
| 5 | Stoma | Nilu
| 6 | Nirtam | Sklöd
| 7 | Sungam | Dulbåd
| 8 | Sreraf | Encmelt
+------------+--------+------------+
8 rows in set (0.00 sec)
```


The order in which the fields are given within each row of the XML file does not affect the operation of LOAD XML; the field order can vary from row to row, and is not required to be in the same order as the corresponding columns in the table.

As mentioned previously, you can use a (field_name_or_user_var, . . . ) list of one or more XML fields (to select desired fields only) or user variables (to store the corresponding field values for later use). User variables can be especially useful when you want to insert data from an XML file into table columns whose names do not match those of the XML fields. To see how this works, we first create a table named individual whose structure matches that of the person table, but whose columns are named differently:
```
mysql> CREATE TABLE individual (
    -> individual_id INT NOT NULL PRIMARY KEY,
    -> name1 VARCHAR(40) NULL,
    -> name2 VARCHAR(40) NULL,
    -> made TIMESTAMP
    -> );
Query OK, 0 rows affected (0.42 sec)
```


In this case, you cannot simply load the XML file directly into the table, because the field and column names do not match:
```
mysql> LOAD XML INFILE '../bin/person-dump.xml' INTO TABLE test.individual;
ERROR 1263 (22004): Column set to default value; NULL supplied to NOT NULL column 'individual_id' at row 1
```


This happens because the MySQL server looks for field names matching the column names of the target table. You can work around this problem by selecting the field values into user variables, then setting the target table's columns equal to the values of those variables using SET. You can perform both of these operations in a single statement, as shown here:
```
mysql> LOAD XML INFILE '../bin/person-dump.xml'
    -> INTO TABLE test.individual (@person_id, @fname, @lname, @created)
    -> SET individual_id=@person_id, name1=@fname, name2=@lname, made=@created;
Query OK, 8 rows affected (0.05 sec)
Records: 8 Deleted: 0 Skipped: 0 Warnings: 0
mysql> SELECT * FROM individual;
+----------------+---------+------------+---------------------
| individual_id | name1 | name2 | made |
+---------------+--------+------------+---------------------+
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2664.jpg?height=278&width=1025&top_left_y=995&top_left_x=287)
```
+----------------+--------+------------+----------------------
8 rows in set (0.00 sec)
```


The names of the user variables must match those of the corresponding fields from the XML file, with the addition of the required @ prefix to indicate that they are variables. The user variables need not be listed or assigned in the same order as the corresponding fields.

Using a ROWS IDENTIFIED BY '<tagname>' clause, it is possible to import data from the same XML file into database tables with different definitions. For this example, suppose that you have a file named address.xml which contains the following XML:
```
<?xml version="1.0"?>
<list>
    <person person_id="1">
        <fname>Robert</fname>
        <lname>Jones</lname>
        <address address_id="1" street="Mill Creek Road" zip="45365" city="Sidney"/>
        <address address_id="2" street="Main Street" zip="28681" city="Taylorsville"/>
    </person>
    <person person_id="2">
        <fname>Mary</fname>
        <lname>Smith</lname>
        <address address_id="3" street="River Road" zip="80239" city="Denver"/>
        <!-- <address address_id="4" street="North Street" zip="37920" city="Knoxville"/> -->
    </person>
</list>
```


You can again use the test. person table as defined previously in this section, after clearing all the existing records from the table and then showing its structure as shown here:
```
mysql< TRUNCATE person;
Query OK, 0 rows affected (0.04 sec)
mysql< SHOW CREATE TABLE person\G
************************** 1. row ******************************
        Table: person
Create Table: CREATE TABLE ˋpersonˋ (
```

```
    person_idˋ int(11) NOT NULL,
    fnameˋ varchar(40) DEFAULT NULL,
    lnameˋ varchar(40) DEFAULT NULL,
    ˋcreatedˋ timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ˋperson_idˋ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.00 sec)
```


Now create an address table in the test database using the following CREATE TABLE statement:
```
CREATE TABLE address (
    address_id INT NOT NULL PRIMARY KEY,
    person_id INT NULL,
    street VARCHAR(40) NULL,
    zip INT NULL,
    city VARCHAR(40) NULL,
    created TIMESTAMP
);
```


To import the data from the XML file into the person table, execute the following LOAD XML statement, which specifies that rows are to be specified by the <person> element, as shown here;
```
mysql> LOAD XML LOCAL INFILE 'address.xml'
    -> INTO TABLE person
    -> ROWS IDENTIFIED BY '<person>';
Query OK, 2 rows affected (0.00 sec)
Records: 2 Deleted: 0 Skipped: 0 Warnings: 0
```


You can verify that the records were imported using a SELECT statement:
```
mysql> SELECT * FROM person;
+-----------+--------+-------+--------------------+
| person_id | fname | lname | created |
+-----------+--------+-------+---------------------+
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2665.jpg?height=62&width=872&top_left_y=1416&top_left_x=351)
```
+-----------+--------+-------+---------------------+
2 rows in set (0.00 sec)
```


Since the <address> elements in the XML file have no corresponding columns in the person table, they are skipped.

To import the data from the <address> elements into the address table, use the LOAD XML statement shown here:
```
mysql> LOAD XML LOCAL INFILE 'address.xml'
    -> INTO TABLE address
    -> ROWS IDENTIFIED BY '<address>';
Query OK, 3 rows affected (0.00 sec)
Records: 3 Deleted: 0 Skipped: 0 Warnings: 0
```


You can see that the data was imported using a SELECT statement such as this one:
```
mysql> SELECT * FROM address;
+-------------+-----------+-----------------+-------+-------------+---------------------
| address_id | person_id | street | zip | city | created |
+------------+-----------+-----------------+-------+-------------+---------------------
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2665.jpg?height=111&width=1488&top_left_y=2222&top_left_x=351)
```
+-------------+-----------+-----------------+-------+-------------+---------------------
3 rows in set (0.00 sec)
```


The data from the <address> element that is enclosed in XML comments is not imported. However, since there is a person_id column in the address table, the value of the person_id attribute from the parent <person> element for each <address> is imported into the address table.

Security Considerations. As with the LOAD DATA statement, the transfer of the XML file from the client host to the server host is initiated by the MySQL server. In theory, a patched server could be built
that would tell the client program to transfer a file of the server's choosing rather than the file named by the client in the LOAD XML statement. Such a server could access any file on the client host to which the client user has read access.

In a Web environment, clients usually connect to MySQL from a Web server. A user that can run any command against the MySQL server can use LOAD XML LOCAL to read any files to which the Web server process has read access. In this environment, the client with respect to the MySQL server is actually the Web server, not the remote program being run by the user who connects to the Web server.

You can disable loading of XML files from clients by starting the server with --local-infile=0 or --local-infile=0FF. This option can also be used when starting the mysql client to disable LOAD XML for the duration of the client session.

To prevent a client from loading XML files from the server, do not grant the FILE privilege to the corresponding MySQL user account, or revoke this privilege if the client user account already has it.

\section*{Important}

Revoking the FILE privilege (or not granting it in the first place) keeps the user only from executing the LOAD XML statement (as well as the LOAD_FILE() function; it does not prevent the user from executing LOAD XML LOCAL. To disallow this statement, you must start the server or the client with --localinfile=0FF.

In other words, the FILE privilege affects only whether the client can read files on the server; it has no bearing on whether the client can read files on the local file system.

\subsection*{15.2.11 Parenthesized Query Expressions}
```
parenthesized_query_expression:
    ( query_expression [order_by_clause] [limit_clause] )
        [order_by_clause]
        [limit_clause]
        [into_clause]
query_expression:
    query_block [set_op query_block [set_op query_block ...]]
        [order_by_clause]
        [limit_clause]
        [into_clause]
query_block:
    SELECT ... | TABLE | VALUES
order_by_clause:
    ORDER BY as for SELECT
limit_clause:
    LIMIT as for SELECT
into_clause:
    INTO as for SELECT
set_op:
    UNION | INTERSECT | EXCEPT
```


MySQL 8.4 supports parenthesized query expressions according to the preceding syntax. At its simplest, a parenthesized query expression contains a single SELECT or other statement returning a result set and no following optional clauses:
```
(SELECT 1);
(SELECT * FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'mysql');
```

```
TABLE t;
VALUES ROW(2, 3, 4), ROW(1, -2, 3);
```


A parenthesized query expression can also contain queries linked by one or more set operations such as UNION, and end with any or all of the optional clauses:
```
mysql> (SELECT 1 AS result UNION SELECT 2);
+--------+
| result |
+--------+
| 1 |
| 2 |
+--------+
mysql> (SELECT 1 AS result UNION SELECT 2) LIMIT 1;
+--------+
| result |
+--------+
| 1 |
+--------+
mysql> (SELECT 1 AS result UNION SELECT 2) LIMIT 1 OFFSET 1;
+--------+
| result |
+--------+
| 2 |
+--------+
mysql> (SELECT 1 AS result UNION SELECT 2)
    ORDER BY result DESC LIMIT 1;
+--------+
| result |
+--------+
| 2 |
+--------+
mysql> (SELECT 1 AS result UNION SELECT 2)
    ORDER BY result DESC LIMIT 1 OFFSET 1;
+--------+
| result |
+--------+
| 1 |
+--------+
mysql> (SELECT 1 AS result UNION SELECT 3 UNION SELECT 2)
    ORDER BY result LIMIT 1 OFFSET 1 INTO @var;
mysql> SELECT @var;
+------+
| @var |
+------+
| 2 |
+------+
```


INTERSECT acts before UNION and EXCEPT, so that the following two statements are equivalent:
```
SELECT a FROM t1 EXCEPT SELECT b FROM t2 INTERSECT SELECT c FROM t3;
SELECT a FROM t1 EXCEPT (SELECT b FROM t2 INTERSECT SELECT c FROM t3);
```


Parenthesized query expressions are also used as query expressions, so a query expression, usually composed of query blocks, may also consist of parenthesized query expressions:
(TABLE t1 ORDER BY a) UNION (TABLE t2 ORDER BY b) ORDER BY $z$;
Query blocks may have trailing ORDER BY and LIMIT clauses, which are applied before the outer set operation, ORDER BY, and LIMIT.

You cannot have a query block with a trailing ORDER BY or LIMIT without wrapping it in parentheses but parentheses may be used for enforcement in various ways:
- To enforce LIMIT on each query block:
```
(SELECT 1 LIMIT 1) UNION (VALUES ROW(2) LIMIT 1);
```

```
(VALUES ROW(1), ROW(2) LIMIT 2) EXCEPT (SELECT 2 LIMIT 1);
```

- To enforce LIMIT on both query blocks and the entire query expression:
```
(SELECT 1 LIMIT 1) UNION (SELECT 2 LIMIT 1) LIMIT 1;
```

- To enforce LIMIT on the entire query expression (with no parentheses):
```
VALUES ROW(1), ROW(2) INTERSECT VALUES ROW(2), ROW(1) LIMIT 1;
```

- Hybrid enforcement: LIMIT on the first query block and on the entire query expression:
```
(SELECT 1 LIMIT 1) UNION SELECT 2 LIMIT 1;
```


The syntax described in this section is subject to certain restrictions:
- A trailing INTO clause for a query expression is not permitted if there is another INTO clause inside parentheses.
- An ORDER BY or LIMIT within a parenthesized query expression which is also applied in the outer query is handled in accordance with the SQL standard.

Nested parenthesized query expressions are permitted. The maximum level of nesting supported is 63 ; this is after any simplifications or merges have been performed by the parser.

An example of such a statement is shown here:
```
mysql> (SELECT 'a' UNION SELECT 'b' LIMIT 2) LIMIT 3;
+---+
| a |
+---+
| a |
| b |
+---+
2 rows in set (0.00 sec)
```


You should be aware that, when collapsing parenthesized expression bodies, MySQL follows SQL standard semantics, so that a higher outer limit cannot override an inner lower one. For example, (SELECT ... LIMIT 5) LIMIT 10 can return no more than five rows.

\subsection*{15.2.12 REPLACE Statement}
```
REPLACE [LOW_PRIORITY | DELAYED]
    [INTO] tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    [(col_name [, col_name] ...)]
    { {VALUES | VALUE} (value_list) [, (value_list)] ...
        |
        VALUES row_constructor_list
    }
REPLACE [LOW_PRIORITY | DELAYED]
    [INTO] tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    SET assignment_list
REPLACE [LOW_PRIORITY | DELAYED]
    [INTO] tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    [(col_name [, col_name] ...)]
    {SELECT ... | TABLE table_name}
value:
    {expr | DEFAULT}
value_list:
    value [, value] ...
```

```
row_constructor_list:
    ROW(value_list)[, ROW(value_list)][, ...]
assignment:
    col_name = value
assignment_list:
    assignment [, assignment] ...
```


REPLACE works exactly like INSERT, except that if an old row in the table has the same value as a new row for a PRIMARY KEY or a UNIQUE index, the old row is deleted before the new row is inserted. See Section 15.2.7, "INSERT Statement".

REPLACE is a MySQL extension to the SQL standard. It either inserts, or deletes and inserts. For another MySQL extension to standard SQL-that either inserts or updates-see Section 15.2.7.2, "INSERT ... ON DUPLICATE KEY UPDATE Statement".

DELAYED inserts and replaces were deprecated in MySQL 5.6. In MySQL 8.4, DELAYED is not supported. The server recognizes but ignores the DELAYED keyword, handles the replace as a nondelayed replace, and generates an ER_WARN_LEGACY_SYNTAX_CONVERTED warning: REPLACE DELAYED is no longer supported. The statement was converted to REPLACE. The DELAYED keyword is scheduled for removal in a future release. release.

Values for all columns are taken from the values specified in the REPLACE statement. Any missing columns are set to their default values, just as happens for INSERT. You cannot refer to values from the current row and use them in the new row. If you use an assignment such as SET col_name $=$ col_name +1 , the reference to the column name on the right hand side is treated as DEFAULT(col_name), so the assignment is equivalent to SET col_name = DEFAULT(col_name) +1 .

You can specify the column values that REPLACE attempts to insert using VALUES ROW ( ).
To use REPLACE, you must have both the INSERT and DELETE privileges for the table.
If a generated column is replaced explicitly, the only permitted value is DEFAULT. For information about generated columns, see Section 15.1.20.8, "CREATE TABLE and Generated Columns".

REPLACE supports explicit partition selection using the PARTITION clause with a list of commaseparated names of partitions, subpartitions, or both. As with INSERT, if it is not possible to insert the new row into any of these partitions or subpartitions, the REPLACE statement fails with the error Found a row not matching the given partition set. For more information and examples, see Section 26.5, "Partition Selection".

The REPLACE statement returns a count to indicate the number of rows affected. This is the sum of the rows deleted and inserted. If the count is 1 for a single-row REPLACE, a row was inserted and no rows were deleted. If the count is greater than 1 , one or more old rows were deleted before the new row was inserted. It is possible for a single row to replace more than one old row if the table contains multiple unique indexes and the new row duplicates values for different old rows in different unique indexes.

The affected-rows count makes it easy to determine whether REPLACE only added a row or whether it also replaced any rows: Check whether the count is 1 (added) or greater (replaced).

If you are using the C API, the affected-rows count can be obtained using the mysql_affected_rows() function.

You cannot replace into a table and select from the same table in a subquery.
MySQL uses the following algorithm for REPLACE (and LOAD DATA ... REPLACE):
1. Try to insert the new row into the table
2. While the insertion fails because a duplicate-key error occurs for a primary key or unique index:
a. Delete from the table the conflicting row that has the duplicate key value
b. Try again to insert the new row into the table

It is possible that in the case of a duplicate-key error, a storage engine may perform the REPLACE as an update rather than a delete plus insert, but the semantics are the same. There are no user-visible effects other than a possible difference in how the storage engine increments Handler_xxx status variables.

Because the results of REPLACE ... SELECT statements depend on the ordering of rows from the SELECT and this order cannot always be guaranteed, it is possible when logging these statements for the source and the replica to diverge. For this reason, REPLACE ... SELECT statements are flagged as unsafe for statement-based replication. such statements produce a warning in the error log when using statement-based mode and are written to the binary log using the row-based format when using MIXED mode. See also Section 19.2.1.1, "Advantages and Disadvantages of Statement-Based and Row-Based Replication".

MySQL 8.4 supports TABLE as well as SELECT with REPLACE, just as it does with INSERT. See Section 15.2.7.1, "INSERT ... SELECT Statement", for more information and examples.

When modifying an existing table that is not partitioned to accommodate partitioning, or, when modifying the partitioning of an already partitioned table, you may consider altering the table's primary key (see Section 26.6.1, "Partitioning Keys, Primary Keys, and Unique Keys"). You should be aware that, if you do this, the results of REPLACE statements may be affected, just as they would be if you modified the primary key of a nonpartitioned table. Consider the table created by the following CREATE TABLE statement:
```
CREATE TABLE test (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    data VARCHAR(64) DEFAULT NULL,
    ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```


When we create this table and run the statements shown in the mysql client, the result is as follows:
```
mysql> REPLACE INTO test VALUES (1, 'Old', '2014-08-20 18:47:00');
Query OK, 1 row affected (0.04 sec)
mysql> REPLACE INTO test VALUES (1, 'New', '2014-08-20 18:47:42');
Query OK, 2 rows affected (0.04 sec)
mysql> SELECT * FROM test;
+----+-------+---------------------+
| id | data | ts |
+----+-------+---------------------+
| 1 | New | 2014-08-20 18:47:42 |
+----+-------+---------------------+
1 row in set (0.00 sec)
```


Now we create a second table almost identical to the first, except that the primary key now covers 2 columns, as shown here (emphasized text):
```
CREATE TABLE test2 (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    data VARCHAR(64) DEFAULT NULL,
```

```
    ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id, ts)
);
```


When we run on test2 the same two REPLACE statements as we did on the original test table, we obtain a different result:
```
mysql> REPLACE INTO test2 VALUES (1, 'Old', '2014-08-20 18:47:00');
Query OK, 1 row affected (0.05 sec)
mysql> REPLACE INTO test2 VALUES (1, 'New', '2014-08-20 18:47:42');
Query OK, 1 row affected (0.06 sec)
mysql> SELECT * FROM test2;
+----+-------+---------------------+
| id | data | ts |
+----+-------+---------------------+
| 1 | Old | 2014-08-20 18:47:00 |
| 1 | New | 2014-08-20 18:47:42 |
+----+-------+---------------------+
2 rows in set (0.00 sec)
```


This is due to the fact that, when run on test2, both the id and ts column values must match those of an existing row for the row to be replaced; otherwise, a row is inserted.

15.2.13 SELECT Statement
```
SELECT
    [ALL | DISTINCT | DISTINCTROW ]
    [HIGH_PRIORITY]
    [STRAIGHT_JOIN]
    [SQL_SMALL_RESULT] [SQL_BIG_RESULT] [SQL_BUFFER_RESULT]
    [SQL_NO_CACHE] [SQL_CALC_FOUND_ROWS]
    select_expr [, select_expr] ...
    [into_option]
    [FROM table_references
        [PARTITION partition_list]]
    [WHERE where_condition]
    [GROUP BY [ {col_name | expr | position}, ... [WITH ROLLUP]
                | ROLLUP ({col_name | expr | position}, ...)] ]
    [HAVING where_condition]
    [WINDOW window_name AS (window_spec)
            [, window_name AS (window_spec)] ...]
    [ORDER BY {col_name | expr | position}
        [ASC | DESC], ... [WITH ROLLUP]]
    [LIMIT {[offset,] row_count | row_count OFFSET offset}]
    [into_option]
    [FOR {UPDATE | SHARE}
            [OF tbl_name [, tbl_name] ...]
            [NOWAIT | SKIP LOCKED]
        | LOCK IN SHARE MODE]
    [into_option]
into_option: {
    INTO OUTFILE 'file_name'
        [CHARACTER SET charset_name]
        export_options
    INTO DUMPFILE 'file_name'
    INTO var_name [, var_name] ...
}
export_options:
    [{FIELDS | COLUMNS}
        [TERMINATED BY 'string']
        [[OPTIONALLY] ENCLOSED BY 'char']
        [ESCAPED BY 'char']
    ]
    [LINES
        [STARTING BY 'string']
        [TERMINATED BY 'string']
    ]
```


SELECT is used to retrieve rows selected from one or more tables, and can include UNION operations and subqueries. INTERSECT and EXCEPT operations are also supported. The UNION, INTERSECT, and EXCEPT operators are described in more detail later in this section. See also Section 15.2.15, "Subqueries".

A SELECT statement can start with a WITH clause to define common table expressions accessible within the SELECT. See Section 15.2.20, "WITH (Common Table Expressions)".

The most commonly used clauses of SELECT statements are these:
- Each select_expr indicates a column that you want to retrieve. There must be at least one select_expr.
- table_references indicates the table or tables from which to retrieve rows. Its syntax is described in Section 15.2.13.2, "JOIN Clause".
- SELECT supports explicit partition selection using the PARTITION clause with a list of partitions or subpartitions (or both) following the name of the table in a table_reference (see Section 15.2.13.2, "JOIN Clause"). In this case, rows are selected only from the partitions listed, and any other partitions of the table are ignored. For more information and examples, see Section 26.5, "Partition Selection".
- The WHERE clause, if given, indicates the condition or conditions that rows must satisfy to be selected. where_condition is an expression that evaluates to true for each row to be selected. The statement selects all rows if there is no WHERE clause.

In the WHERE expression, you can use any of the functions and operators that MySQL supports, except for aggregate (group) functions. See Section 11.5, "Expressions", and Chapter 14, Functions and Operators.

SELECT can also be used to retrieve rows computed without reference to any table.
For example:
```
mysql> SELECT 1 + 1;
    -> 2
```


You are permitted to specify DUAL as a dummy table name in situations where no tables are referenced:
```
mysql> SELECT 1 + 1 FROM DUAL;
    -> 2
```


DUAL is purely for the convenience of people who require that all SELECT statements should have FROM and possibly other clauses. MySQL may ignore the clauses. MySQL does not require FROM DUAL if no tables are referenced.

In general, clauses used must be given in exactly the order shown in the syntax description. For example, a HAVING clause must come after any GROUP BY clause and before any ORDER BY clause. The INTO clause, if present, can appear in any position indicated by the syntax description, but within a given statement can appear only once, not in multiple positions. For more information about INTO, see Section 15.2.13.1, "SELECT ... INTO Statement".

The list of select_expr terms comprises the select list that indicates which columns to retrieve. Terms specify a column or expression or can use *-shorthand:
- A select list consisting only of a single unqualified * can be used as shorthand to select all columns from all tables:
```
SELECT * FROM t1 INNER JOIN t2 ...
```

- tbl_name . * can be used as a qualified shorthand to select all columns from the named table:
```
SELECT t1.*, t2.* FROM t1 INNER JOIN t2 ...
```

- If a table has invisible columns, * and tbl_name . * do not include them. To be included, invisible columns must be referenced explicitly.
- Use of an unqualified * with other items in the select list may produce a parse error. For example:
```
SELECT id, * FROM t1
```


To avoid this problem, use a qualified tbl_name . * reference:
```
SELECT id, t1.* FROM t1
```


Use qualified tbl_name . * references for each table in the select list:
```
SELECT AVG(score), t1.* FROM t1 ...
```


The following list provides additional information about other SELECT clauses:
- A select_expr can be given an alias using AS alias_name. The alias is used as the expression's column name and can be used in GROUP BY, ORDER BY, or HAVING clauses. For example:
```
SELECT CONCAT(last_name,',',first_name) AS full_name
    FROM mytable ORDER BY full_name;
```


The AS keyword is optional when aliasing a select_expr with an identifier. The preceding example could have been written like this:
```
SELECT CONCAT(last_name,', ',first_name) full_name
    FROM mytable ORDER BY full_name;
```


However, because the AS is optional, a subtle problem can occur if you forget the comma between two select_expr expressions: MySQL interprets the second as an alias name. For example, in the following statement, columnb is treated as an alias name:
```
SELECT columna columnb FROM mytable;
```


For this reason, it is good practice to be in the habit of using AS explicitly when specifying column aliases.

It is not permissible to refer to a column alias in a WHERE clause, because the column value might not yet be determined when the WHERE clause is executed. See Section B.3.4.4, "Problems with Column Aliases".
- The FROM table_references clause indicates the table or tables from which to retrieve rows. If you name more than one table, you are performing a join. For information on join syntax, see Section 15.2.13.2, "JOIN Clause". For each table specified, you can optionally specify an alias.
```
tbl_name [[AS] alias] [index_hint]
```


The use of index hints provides the optimizer with information about how to choose indexes during query processing. For a description of the syntax for specifying these hints, see Section 10.9.4, "Index Hints".

You can use SET max_seeks_for_key=value as an alternative way to force MySQL to prefer key scans instead of table scans. See Section 7.1.8, "Server System Variables".
- You can refer to a table within the default database as tbl_name, or as db_name.tbl_name to specify a database explicitly. You can refer to a column as col_name, tbl_name.col_name, or db_name.tbl_name.col_name. You need not specify a tbl_name or db_name.tbl_name prefix for a column reference unless the reference would be ambiguous. See Section 11.2.2, "Identifier Qualifiers", for examples of ambiguity that require the more explicit column reference forms.
- A table reference can be aliased using tbl_name AS alias_name or tbl_name alias_name. These statements are equivalent:
```
SELECT t1.name, t2.salary FROM employee AS t1, info AS t2
    WHERE t1.name = t2.name;
SELECT t1.name, t2.salary FROM employee t1, info t2
    WHERE t1.name = t2.name;
```

- Columns selected for output can be referred to in ORDER BY and GROUP BY clauses using column names, column aliases, or column positions. Column positions are integers and begin with 1:
```
SELECT college, region, seed FROM tournament
    ORDER BY region, seed;
SELECT college, region AS r, seed AS s FROM tournament
    ORDER BY r, s;
SELECT college, region, seed FROM tournament
    ORDER BY 2, 3;
```


To sort in reverse order, add the DESC (descending) keyword to the name of the column in the ORDER BY clause that you are sorting by. The default is ascending order; this can be specified explicitly using the ASC keyword.

If ORDER BY occurs within a parenthesized query expression and also is applied in the outer query, the results are undefined and may change in a future version of MySQL.

Use of column positions is deprecated because the syntax has been removed from the SQL standard.
- When you use ORDER BY or GROUP BY to sort a column in a SELECT, the server sorts values using only the initial number of bytes indicated by the max_sort_length system variable.
- MySQL extends the use of GROUP BY to permit selecting fields that are not mentioned in the GROUP BY clause. If you are not getting the results that you expect from your query, please read the description of GROUP BY found in Section 14.19, "Aggregate Functions".
- The HAVING clause, like the WHERE clause, specifies selection conditions. The WHERE clause specifies conditions on columns in the select list, but cannot refer to aggregate functions. The HAVING clause specifies conditions on groups, typically formed by the GROUP BY clause. The query result includes only groups satisfying the HAVING conditions. (If no GROUP BY is present, all rows implicitly form a single aggregate group.)

The HAVING clause is applied nearly last, just before items are sent to the client, with no optimization. (LIMIT is applied after HAVING.)

The SQL standard requires that HAVING must reference only columns in the GROUP BY clause or columns used in aggregate functions. However, MySQL supports an extension to this behavior, and permits HAVING to refer to columns in the SELECT list and columns in outer subqueries as well.

If the HAVING clause refers to a column that is ambiguous, a warning occurs. In the following statement, col2 is ambiguous because it is used as both an alias and a column name:
```
SELECT COUNT(col1) AS col2 FROM t GROUP BY col2 HAVING col2 = 2;
```


Preference is given to standard SQL behavior, so if a HAVING column name is used both in GROUP BY and as an aliased column in the select column list, preference is given to the column in the GROUP BY column.
- Do not use HAVING for items that should be in the WHERE clause. For example, do not write the following:
```
SELECT col_name FROM tbl_name HAVING col_name > 0;
```


Write this instead:
```
SELECT col_name FROM tbl_name WHERE col_name > 0;
```

- The HAVING clause can refer to aggregate functions, which the WHERE clause cannot:
```
SELECT user, MAX(salary) FROM users
    GROUP BY user HAVING MAX(salary) > 10;
```

(This did not work in some older versions of MySQL.)
- MySQL permits duplicate column names. That is, there can be more than one select_expr with the same name. This is an extension to standard SQL. Because MySQL also permits GROUP BY and HAVING to refer to select_expr values, this can result in an ambiguity:
```
SELECT 12 AS a, a FROM t GROUP BY a;
```


In that statement, both columns have the name a. To ensure that the correct column is used for grouping, use different names for each select_expr.
- The WINDOW clause, if present, defines named windows that can be referred to by window functions. For details, see Section 14.20.4, "Named Windows".
- MySQL resolves unqualified column or alias references in ORDER BY clauses by searching in the select_expr values, then in the columns of the tables in the FROM clause. For GROUP BY or HAVING clauses, it searches the FROM clause before searching in the select_expr values. (For GROUP BY and HAVING, this differs from the pre-MySQL 5.0 behavior that used the same rules as for ORDER BY.)
- The LIMIT clause can be used to constrain the number of rows returned by the SELECT statement. LIMIT takes one or two numeric arguments, which must both be nonnegative integer constants, with these exceptions:
- Within prepared statements, LIMIT parameters can be specified using ? placeholder markers.
- Within stored programs, LIMIT parameters can be specified using integer-valued routine parameters or local variables.

With two arguments, the first argument specifies the offset of the first row to return, and the second specifies the maximum number of rows to return. The offset of the initial row is 0 (not 1 ):
```
SELECT * FROM tbl LIMIT 5,10; # Retrieve rows 6-15
```


To retrieve all rows from a certain offset up to the end of the result set, you can use some large number for the second parameter. This statement retrieves all rows from the 96th row to the last:
```
SELECT * FROM tbl LIMIT 95,18446744073709551615;
```


With one argument, the value specifies the number of rows to return from the beginning of the result set:
```
SELECT * FROM tbl LIMIT 5; # Retrieve first 5 rows
```


In other words, LIMIT row_count is equivalent to LIMIT 0, row_count.
For prepared statements, you can use placeholders. The following statements return one row from the tbl table:
```
SET @a=1;
PREPARE STMT FROM 'SELECT * FROM tbl LIMIT ?';
EXECUTE STMT USING @a;
```


The following statements return the second to sixth rows from the tbl table:
```
SET @skip=1; SET @numrows=5;
PREPARE STMT FROM 'SELECT * FROM tbl LIMIT ?, ?';
EXECUTE STMT USING @skip, @numrows;
```


For compatibility with PostgreSQL, MySQL also supports the LIMIT row_count OFFSET offset syntax.

If LIMIT occurs within a parenthesized query expression and also is applied in the outer query, the results are undefined and may change in a future version of MySQL.
- The SELECT . . . INTO form of SELECT enables the query result to be written to a file or stored in variables. For more information, see Section 15.2.13.1, "SELECT ... INTO Statement".
- If you use FOR UPDATE with a storage engine that uses page or row locks, rows examined by the query are write-locked until the end of the current transaction.

You cannot use FOR UPDATE as part of the SELECT in a statement such as CREATE TABLE new_table SELECT ... FROM old_table .... (If you attempt to do so, the statement is rejected with the error Can't update table 'old_table' while 'new_table' is being created.)

FOR SHARE and LOCK IN SHARE MODE set shared locks that permit other transactions to read the examined rows but not to update or delete them. FOR SHARE and LOCK IN SHARE MODE are equivalent. However, FOR SHARE, like FOR UPDATE, supports NOWAIT, SKIP LOCKED, and OF tbl_name options. FOR SHARE is a replacement for LOCK IN SHARE MODE, but LOCK IN SHARE MODE remains available for backward compatibility.

NOWAIT causes a FOR UPDATE or FOR SHARE query to execute immediately, returning an error if a row lock cannot be obtained due to a lock held by another transaction.

SKIP LOCKED causes a FOR UPDATE or FOR SHARE query to execute immediately, excluding rows from the result set that are locked by another transaction.

NOWAIT and SKIP LOCKED options are unsafe for statement-based replication.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2676.jpg?height=124&width=99&top_left_y=1672&top_left_x=342)

\section*{Note}

Queries that skip locked rows return an inconsistent view of the data. SKIP LOCKED is therefore not suitable for general transactional work. However, it may be used to avoid lock contention when multiple sessions access the same queue-like table.

OF tbl_name applies FOR UPDATE and FOR SHARE queries to named tables. For example:
SELECT * FROM t1, t2 FOR SHARE OF t1 FOR UPDATE OF t2;
All tables referenced by the query block are locked when 0F tbl_name is omitted. Consequently, using a locking clause without 0F tbl_name in combination with another locking clause returns an error. Specifying the same table in multiple locking clauses returns an error. If an alias is specified as the table name in the SELECT statement, a locking clause may only use the alias. If the SELECT statement does not specify an alias explicitly, the locking clause may only specify the actual table name.

For more information about FOR UPDATE and FOR SHARE, see Section 17.7.2.4, "Locking Reads". For additional information about NOWAIT and SKIP LOCKED options, see Locking Read Concurrency with NOWAIT and SKIP LOCKED.

Following the SELECT keyword, you can use a number of modifiers that affect the operation of the statement. HIGH_PRIORITY, STRAIGHT_JOIN, and modifiers beginning with SQL_ are MySQL extensions to standard SQL.
- The ALL and DISTINCT modifiers specify whether duplicate rows should be returned. ALL (the default) specifies that all matching rows should be returned, including duplicates. DISTINCT specifies removal of duplicate rows from the result set. It is an error to specify both modifiers. DISTINCTROW is a synonym for DISTINCT.

DISTINCT can be used with a query that also uses WITH ROLLUP.
- HIGH_PRIORITY gives the SELECT higher priority than a statement that updates a table. You should use this only for queries that are very fast and must be done at once. A SELECT HIGH_PRIORITY query that is issued while the table is locked for reading runs even if there is an update statement waiting for the table to be free. This affects only storage engines that use only table-level locking (such as MyISAM, MEMORY, and MERGE).

HIGH_PRIORITY cannot be used with SELECT statements that are part of a UNION.
- STRAIGHT_JOIN forces the optimizer to join the tables in the order in which they are listed in the FROM clause. You can use this to speed up a query if the optimizer joins the tables in nonoptimal order. STRAIGHT_JOIN also can be used in the table_references list. See Section 15.2.13.2, "JOIN Clause".

STRAIGHT_JOIN does not apply to any table that the optimizer treats as a const or system table. Such a table produces a single row, is read during the optimization phase of query execution, and references to its columns are replaced with the appropriate column values before query execution proceeds. These tables appear first in the query plan displayed by EXPLAIN. See Section 10.8.1, "Optimizing Queries with EXPLAIN". This exception may not apply to const or system tables that are used on the NULL-complemented side of an outer join (that is, the right-side table of a LEFT JOIN or the left-side table of a RIGHT JOIN.
- SQL_BIG_RESULT or SQL_SMALL_RESULT can be used with GROUP BY or DISTINCT to tell the optimizer that the result set has many rows or is small, respectively. For SQL_BIG_RESULT, MySQL directly uses disk-based temporary tables if they are created, and prefers sorting to using a temporary table with a key on the GROUP BY elements. For SQL_SMALL_RESULT, MySQL uses in-memory temporary tables to store the resulting table instead of using sorting. This should not normally be needed.
- SQL_BUFFER_RESULT forces the result to be put into a temporary table. This helps MySQL free the table locks early and helps in cases where it takes a long time to send the result set to the client. This modifier can be used only for top-level SELECT statements, not for subqueries or following UNION.
- SQL_CALC_FOUND_ROWS tells MySQL to calculate how many rows there would be in the result set, disregarding any LIMIT clause. The number of rows can then be retrieved with SELECT FOUND_ROWS( ). See Section 14.15, "Information Functions".

> Note
> The SQL_CALC_FOUND_ROWS query modifier and accompanying FOUND_ROWS( ) function are deprecated; expect them to be removed in a future version of MySQL. See the description of FOUND_ROWS( ) for information about an alternative strategy.
- The SQL_CACHE and SQL_NO_CACHE modifiers were used with the query cache prior to MySQL 8.4. The query cache was removed in MySQL 8.4. The SQL_CACHE modifier was removed as well. SQL_NO_CACHE is deprecated, and has no effect; expect it to be removed in a future MySQL release.

\subsection*{15.2.13.1 SELECT ... INTO Statement}

The SELECT ... INTO form of SELECT enables a query result to be stored in variables or written to a file:
- SELECT ... INTO var_list selects column values and stores them into variables.
- SELECT ... INTO OUTFILE writes the selected rows to a file. Column and line terminators can be specified to produce a specific output format.
- SELECT ... INTO DUMPFILE writes a single row to a file without any formatting.

A given SELECT statement can contain at most one INTO clause, although as shown by the SELECT syntax description (see Section 15.2.13, "SELECT Statement"), the INTO can appear in different positions:
- Before FROM. Example:
```
SELECT * INTO @myvar FROM t1;
```

- Before a trailing locking clause. Example:
```
SELECT * FROM t1 INTO @myvar FOR UPDATE;
```

- At the end of the SELECT. Example:
```
SELECT * FROM t1 FOR UPDATE INTO @myvar;
```


The INTO position at the end of the statement is the preferred position. The position before a locking clause is deprecated; expect support for it to be removed in a future version of MySQL. In other words, INTO after FROM but not at the end of the SELECT produces a warning.

An INTO clause should not be used in a nested SELECT because such a SELECT must return its result to the outer context. There are also constraints on the use of INTO within UNION statements; see Section 15.2.18, "UNION Clause".

For the INTO var_list variant:
- var_list names a list of one or more variables, each of which can be a user-defined variable, stored procedure or function parameter, or stored program local variable. (Within a prepared SELECT ... INTO var_list statement, only user-defined variables are permitted; see Section 15.6.4.2, "Local Variable Scope and Resolution".)
- The selected values are assigned to the variables. The number of variables must match the number of columns. The query should return a single row. If the query returns no rows, a warning with error code 1329 occurs (No data), and the variable values remain unchanged. If the query returns multiple rows, error 1172 occurs (Result consisted of more than one row). If it is possible that the statement may retrieve multiple rows, you can use LIMIT 1 to limit the result set to a single row.
```
SELECT id, data INTO @x, @y FROM test.t1 LIMIT 1;
```


INTO var_list can also be used with a TABLE statement, subject to these restrictions:
- The number of variables must match the number of columns in the table.
- If the table contains more than one row, you must use LIMIT 1 to limit the result set to a single row. LIMIT 1 must precede the INTO keyword.

An example of such a statement is shown here:
```
TABLE employees ORDER BY lname DESC LIMIT 1
    INTO @id, @fname, @lname, @hired, @separated, @job_code, @store_id;
```


You can also select values from a VALUES statement that generates a single row into a set of user variables. In this case, you must employ a table alias, and you must assign each value from the value list to a variable. Each of the two statements shown here is equivalent to SET $@ \mathrm{x}=2$, $@ \mathrm{y}=4$, $@ \mathrm{z}=8$ :
```
SELECT * FROM (VALUES ROW(2,4,8)) AS t INTO @x,@y,@z;
```

```
SELECT * FROM (VALUES ROW(2,4,8)) AS t(a,b,c) INTO @x,@y,@z;
```


User variable names are not case-sensitive. See Section 11.4, "User-Defined Variables".
The SELECT ... INTO OUTFILE 'file_name' form of SELECT writes the selected rows to a file. The file is created on the server host, so you must have the FILE privilege to use this syntax. file_name cannot be an existing file, which among other things prevents files such as /etc/passwd and database tables from being modified. The character_set_filesystem system variable controls the interpretation of the file name.

The SELECT . . . INTO OUTFILE statement is intended to enable dumping a table to a text file on the server host. To create the resulting file on some other host, SELECT ... INTO OUTFILE normally is unsuitable because there is no way to write a path to the file relative to the server host file system, unless the location of the file on the remote host can be accessed using a network-mapped path on the server host file system.

Alternatively, if the MySQL client software is installed on the remote host, you can use a client command such as mysql -e "SELECT ..." > file_name to generate the file on that host.

SELECT ... INTO OUTFILE is the complement of LOAD DATA. Column values are written converted to the character set specified in the CHARACTER SET clause. If no such clause is present, values are dumped using the binary character set. In effect, there is no character set conversion. If a result set contains columns in several character sets, so is the output data file, and it may not be possible to reload the file correctly.

The syntax for the export_options part of the statement consists of the same FIELDS and LINES clauses that are used with the LOAD DATA statement. For more detailed information about the FIELDS and LINES clauses, including their default values and permissible values, see Section 15.2.9, "LOAD DATA Statement".

FIELDS ESCAPED BY controls how to write special characters. If the FIELDS ESCAPED BY character is not empty, it is used when necessary to avoid ambiguity as a prefix that precedes following characters on output:
- The FIELDS ESCAPED BY character
- The FIELDS [OPTIONALLY] ENCLOSED BY character
- The first character of the FIELDS TERMINATED BY and LINES TERMINATED BY values
- ASCII NUL (the zero-valued byte; what is actually written following the escape character is ASCII 0 , not a zero-valued byte)

The FIELDS TERMINATED BY, ENCLOSED BY, ESCAPED BY, OR LINES TERMINATED BY characters must be escaped so that you can read the file back in reliably. ASCII NUL is escaped to make it easier to view with some pagers.

The resulting file need not conform to SQL syntax, so nothing else need be escaped.
If the FIELDS ESCAPED BY character is empty, no characters are escaped and NULL is output as NULL, not \N. It is probably not a good idea to specify an empty escape character, particularly if field values in your data contain any of the characters in the list just given.

INTO OUTFILE can also be used with a TABLE statement when you want to dump all columns of a table into a text file. In this case, the ordering and number of rows can be controlled using ORDER BY and LIMIT; these clauses must precede INTO OUTFILE. TABLE ... INTO OUTFILE supports the same export_options as does SELECT ... INTO OUTFILE, and it is subject to the same restrictions on writing to the file system. An example of such a statement is shown here:
```
TABLE employees ORDER BY lname LIMIT 1000
    INTO OUTFILE '/tmp/employee_data_1.txt'
    FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"', ESCAPED BY '\'
    LINES TERMINATED BY '\n';
```


You can also use SELECT ... INTO OUTFILE with a VALUES statement to write values directly into a file. An example is shown here:
```
SELECT * FROM (VALUES ROW(1,2,3),ROW(4,5,6),ROW(7,8,9)) AS t
    INTO OUTFILE '/tmp/select-values.txt';
```


You must use a table alias; column aliases are also supported, and can optionally be used to write values only from desired columns. You can also use any or all of the export options supported by SELECT ... INTO OUTFILE to format the output to the file.

Here is an example that produces a file in the comma-separated values (CSV) format used by many programs:
```
SELECT a,b,a+b INTO OUTFILE '/tmp/result.txt'
    FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
    LINES TERMINATED BY '\n'
    FROM test_table;
```


If you use INTO DUMPFILE instead of INTO OUTFILE, MySQL writes only one row into the file, without any column or line termination and without performing any escape processing. This is useful for selecting a BLOB value and storing it in a file.

TABLE also supports INTO DUMPFILE. If the table contains more than one row, you must also use LIMIT 1 to limit the output to a single row. INTO DUMPFILE can also be used with SELECT * FROM (VALUES ROW()[, ...]) AS table_alias [LIMIT 1]. See Section 15.2.19, "VALUES Statement".

\section*{Note}

Any file created by INTO OUTFILE or INTO DUMPFILE is owned by the operating system user under whose account mysqld runs. (You should never run mysqld as root for this and other reasons.) The umask for file creation is 0640; you must have sufficient access privileges to manipulate the file contents.

If the secure_file_priv system variable is set to a nonempty directory name, the file to be written must be located in that directory.

In the context of SELECT . . . INTO statements that occur as part of events executed by the Event Scheduler, diagnostics messages (not only errors, but also warnings) are written to the error log, and, on Windows, to the application event log. For additional information, see Section 27.4.5, "Event Scheduler Status".

Support is provided for periodic synchronization of output files written to by SELECT INTO OUTFILE and SELECT INTO DUMPFILE, enabled by setting the select_into_disk_sync server system variable introduced in that version. Output buffer size and optional delay can be set using, respectively, select_into_buffer_size and select_into_disk_sync_delay. For more information, see the descriptions of these system variables.

\subsection*{15.2.13.2 JOIN Clause}

MySQL supports the following JOIN syntax for the table_references part of SELECT statements and multiple-table DELETE and UPDATE statements:
```
table_references:
        escaped_table_reference [, escaped_table_reference] ...
escaped_table_reference: {
        table_reference
    | { OJ table_reference }
}
table_reference: {
        table_factor
    | joined_table
}
```

```
table_factor: {
        tbl_name [PARTITION (partition_names)]
                [[AS] alias] [index_hint_list]
    | [LATERAL] table_subquery [AS] alias [(col_list)]
    | ( table_references )
}
joined_table: {
        table_reference {[INNER | CROSS] JOIN | STRAIGHT_JOIN} table_factor [join_specification]
    | table_reference {LEFT|RIGHT} [OUTER] JOIN table_reference join_specification
    | table_reference NATURAL [INNER | {LEFT|RIGHT} [OUTER]] JOIN table_factor
}
join_specification: {
        ON search_condition
    | USING (join_column_list)
}
join_column_list:
        column_name[, column_name] ...
index_hint_list:
        index_hint[ index_hint] ...
index_hint: {
        USE {INDEX|KEY}
            [FOR {JOIN|ORDER BY|GROUP BY}] ([index_list])
    | {IGNORE|FORCE} {INDEX|KEY}
            [FOR {JOIN|ORDER BY|GROUP BY}] (index_list)
}
index_list:
        index_name [, index_name] ...
```


A table reference is also known as a join expression.
A table reference (when it refers to a partitioned table) may contain a PARTITION clause, including a list of comma-separated partitions, subpartitions, or both. This option follows the name of the table and precedes any alias declaration. The effect of this option is that rows are selected only from the listed partitions or subpartitions. Any partitions or subpartitions not named in the list are ignored. For more information and examples, see Section 26.5, "Partition Selection".

The syntax of table_factor is extended in MySQL in comparison with standard SQL. The standard accepts only table_reference, not a list of them inside a pair of parentheses.

This is a conservative extension if each comma in a list of table_reference items is considered as equivalent to an inner join. For example:
```
SELECT * FROM t1 LEFT JOIN (t2, t3, t4)
    ON (t2.a = t1.a AND t3.b = t1.b AND t4.c = t1.c)
```

is equivalent to:
```
SELECT * FROM t1 LEFT JOIN (t2 CROSS JOIN t3 CROSS JOIN t4)
    ON (t2.a = t1.a AND t3.b = t1.b AND t4.c = t1.c)
```


In MySQL, JOIN, CROSS JOIN, and INNER JOIN are syntactic equivalents (they can replace each other). In standard SQL, they are not equivalent. INNER JOIN is used with an ON clause, CROSS JOIN is used otherwise.

In general, parentheses can be ignored in join expressions containing only inner join operations. MySQL also supports nested joins. See Section 10.2.1.8, "Nested Join Optimization".

Index hints can be specified to affect how the MySQL optimizer makes use of indexes. For more information, see Section 10.9.4, "Index Hints". Optimizer hints and the optimizer_switch system variable are other ways to influence optimizer use of indexes. See Section 10.9.3, "Optimizer Hints", and Section 10.9.2, "Switchable Optimizations".

The following list describes general factors to take into account when writing joins:
- A table reference can be aliased using tbl_name AS alias_name or tbl_name alias_name:
```
SELECT t1.name, t2.salary
    FROM employee AS t1 INNER JOIN info AS t2 ON t1.name = t2.name;
SELECT t1.name, t2.salary
    FROM employee t1 INNER JOIN info t2 ON t1.name = t2.name;
```

- A table_subquery is also known as a derived table or subquery in the FROM clause. See Section 15.2.15.8, "Derived Tables". Such subqueries must include an alias to give the subquery result a table name, and may optionally include a list of table column names in parentheses. A trivial example follows:
```
SELECT * FROM (SELECT 1, 2, 3) AS t1;
```

- The maximum number of tables that can be referenced in a single join is 61 . This includes a join handled by merging derived tables and views in the FROM clause into the outer query block (see Section 10.2.2.4, "Optimizing Derived Tables, View References, and Common Table Expressions with Merging or Materialization").
- INNER JOIN and , (comma) are semantically equivalent in the absence of a join condition: both produce a Cartesian product between the specified tables (that is, each and every row in the first table is joined to each and every row in the second table).

However, the precedence of the comma operator is less than that of INNER JOIN, CROSS JOIN, LEFT JOIN, and so on. If you mix comma joins with the other join types when there is a join condition, an error of the form Unknown column 'col_name' in 'on clause' may occur. Information about dealing with this problem is given later in this section.
- The search_condition used with 0 N is any conditional expression of the form that can be used in a WHERE clause. Generally, the ON clause serves for conditions that specify how to join tables, and the WHERE clause restricts which rows to include in the result set.
- If there is no matching row for the right table in the ON or USING part in a LEFT JOIN, a row with all columns set to NULL is used for the right table. You can use this fact to find rows in a table that have no counterpart in another table:
```
SELECT left_tbl.*
    FROM left_tbl LEFT JOIN right_tbl ON left_tbl.id = right_tbl.id
    WHERE right_tbl.id IS NULL;
```


This example finds all rows in left_tbl with an id value that is not present in right_tbl (that is, all rows in left_tbl with no corresponding row in right_tbl). See Section 10.2.1.9, "Outer Join Optimization".
- The USING(join_column_list) clause names a list of columns that must exist in both tables. If tables $a$ and $b$ both contain columns $c 1, c 2$, and $c 3$, the following join compares corresponding columns from the two tables:
```
a LEFT JOIN b USING (c1, c2, c3)
```

- The NATURAL [LEFT] JOIN of two tables is defined to be semantically equivalent to an INNER JOIN or a LEFT JOIN with a USING clause that names all columns that exist in both tables.
- RIGHT JOIN works analogously to LEFT JOIN. To keep code portable across databases, it is recommended that you use LEFT JOIN instead of RIGHT JOIN.
- The $\{\mathrm{OJ} \ldots$. . . syntax shown in the join syntax description exists only for compatibility with ODBC. The curly braces in the syntax should be written literally; they are not metasyntax as used elsewhere in syntax descriptions.
```
SELECT left_tbl.*
```

```
FROM { OJ left_tbl LEFT OUTER JOIN right_tbl
    ON left_tbl.id = right_tbl.id }
WHERE right_tbl.id IS NULL;
```


You can use other types of joins within \{ OJ ... \}, such as INNER JOIN or RIGHT OUTER JOIN. This helps with compatibility with some third-party applications, but is not official ODBC syntax.
- STRAIGHT_JOIN is similar to JOIN, except that the left table is always read before the right table. This can be used for those (few) cases for which the join optimizer processes the tables in a suboptimal order.

Some join examples:
```
SELECT * FROM table1, table2;
SELECT * FROM table1 INNER JOIN table2 ON table1.id = table2.id;
SELECT * FROM table1 LEFT JOIN table2 ON table1.id = table2.id;
SELECT * FROM table1 LEFT JOIN table2 USING (id);
SELECT * FROM table1 LEFT JOIN table2 ON table1.id = table2.id
    LEFT JOIN table3 ON table2.id = table3.id;
```


Natural joins and joins with USING, including outer join variants, are processed according to the SQL:2003 standard:
- Redundant columns of a NATURAL join do not appear. Consider this set of statements:
```
CREATE TABLE t1 (i INT, j INT);
CREATE TABLE t2 (k INT, j INT);
INSERT INTO t1 VALUES(1, 1);
INSERT INTO t2 VALUES(1, 1);
SELECT * FROM t1 NATURAL JOIN t2;
SELECT * FROM t1 JOIN t2 USING (j);
```


In the first SELECT statement, column j appears in both tables and thus becomes a join column, so, according to standard SQL, it should appear only once in the output, not twice. Similarly, in the second SELECT statement, column $j$ is named in the USING clause and should appear only once in the output, not twice.

Thus, the statements produce this output:
```
+------+-------+------+
| j | i | k |
+------+-------+------+
| 1 | 1 | 1 |
+------+-------+------+
+------+-------+------+
| j | i | k |
+------+-------+------+
| 1 | 1 | 1 |
+------+-------+------+
```


Redundant column elimination and column ordering occurs according to standard SQL, producing this display order:
- First, coalesced common columns of the two joined tables, in the order in which they occur in the first table
- Second, columns unique to the first table, in order in which they occur in that table
- Third, columns unique to the second table, in order in which they occur in that table

The single result column that replaces two common columns is defined using the coalesce operation. That is, for two t1. a and t2. a the resulting single join column a is defined as a = COALESCE(t1.a, t2.a), where:

COALESCE $(x, y)=$ (CASE WHEN $x$ IS NOT NULL THEN $x$ ELSE y END)
If the join operation is any other join, the result columns of the join consist of the concatenation of all columns of the joined tables.

A consequence of the definition of coalesced columns is that, for outer joins, the coalesced column contains the value of the non-NULL column if one of the two columns is always NULL. If neither or both columns are NULL, both common columns have the same value, so it doesn't matter which one is chosen as the value of the coalesced column. A simple way to interpret this is to consider that a coalesced column of an outer join is represented by the common column of the inner table of a JOIN. Suppose that the tables t1(a, b) and t2(a, c) have the following contents:
```

\begin{tabular}{ll} 
t1 & t2 \\
\hdashline 1 & x \\
2 & y
\end{tabular}
```


Then, for this join, column a contains the values of t1. a:
```
mysql> SELECT * FROM t1 NATURAL LEFT JOIN t2;
+------+------+------+
| a | b | c |
+------+------+------+
| 1 | x | NULL |
+------+-------+------+
```


By contrast, for this join, column a contains the values of t2.a.
```
mysql> SELECT * FROM t1 NATURAL RIGHT JOIN t2;
+------+-------+------+
| a | c | b |
+------+------+------+
| 2 | z | y |
| 3 | w | NULL |
+------+------+------+
```


Compare those results to the otherwise equivalent queries with JOIN ... ON:
```
mysql> SELECT * FROM t1 LEFT JOIN t2 ON (t1.a = t2.a);
+-------+------+------+------+
| a | b | a | c |
+-------+------+------+------+
\begin{array} { | l | l | l | r | l | l | } { } & { 1 } & { x } & { \text { NULL | NULL |} } \\ { } & { 2 } & { y } & { 2 } & { z } & { } \end{array}
+------+------+------+------+
```

mysql> SELECT * FROM t1 RIGHT JOIN t2 ON (t1.a = t2.a);
+-------+------+------+------+
| a | b | a | c |
+------+------+------+------+

\begin{tabular}{|r|r|r|r|}
2 & y & 2 & z \\
$\mid$ & NULL & NULL & 3 \\
\hline
\end{tabular}
- A USING clause can be rewritten as an ON clause that compares corresponding columns. However, although USING and ON are similar, they are not quite the same. Consider the following two queries:
```
a LEFT JOIN b USING (c1, c2, c3)
```

```
a LEFT JOIN b ON a.c1 = b.c1 AND a.c2 = b.c2 AND a.c3 = b.c3
```


With respect to determining which rows satisfy the join condition, both joins are semantically identical.

With respect to determining which columns to display for SELECT * expansion, the two joins are not semantically identical. The USING join selects the coalesced value of corresponding columns, whereas the ON join selects all columns from all tables. For the USING join, SELECT* selects these values:
```
COALESCE(a.c1, b.c1), COALESCE(a.c2, b.c2), COALESCE(a.c3, b.c3)
```


For the ON join, SELECT* selects these values:
```
a.c1, a.c2, a.c3, b.c1, b.c2, b.c3
```


With an inner join, COALESCE(a.c1, b.c1) is the same as either a.c1 or b.c1 because both columns have the same value. With an outer join (such as LEFT JOIN), one of the two columns can be NULL. That column is omitted from the result.
- An ON clause can refer only to its operands.

Example:
```
CREATE TABLE t1 (i1 INT);
CREATE TABLE t2 (i2 INT);
CREATE TABLE t3 (i3 INT);
SELECT * FROM t1 JOIN t2 ON (i1 = i3) JOIN t3;
```


The statement fails with an Unknown column 'i3' in 'on clause' error because i3 is a column in t3, which is not an operand of the ON clause. To enable the join to be processed, rewrite the statement as follows:
```
SELECT * FROM t1 JOIN t2 JOIN t3 ON (i1 = i3);
```

- JOIN has higher precedence than the comma operator (,), so the join expression t1, t2 JOIN t3 is interpreted as (t1, (t2 JOIN t3)), not as ((t1, t2) JOIN t3). This affects statements that use an ON clause because that clause can refer only to columns in the operands of the join, and the precedence affects interpretation of what those operands are.

Example:
```
CREATE TABLE t1 (i1 INT, j1 INT);
CREATE TABLE t2 (i2 INT, j2 INT);
CREATE TABLE t3 (i3 INT, j3 INT);
INSERT INTO t1 VALUES(1, 1);
INSERT INTO t2 VALUES(1, 1);
INSERT INTO t3 VALUES(1, 1);
SELECT * FROM t1, t2 JOIN t3 ON (t1.i1 = t3.i3);
```


The JOIN takes precedence over the comma operator, so the operands for the ON clause are t2 and t3. Because t1. i1 is not a column in either of the operands, the result is an Unknown column 't1.i1' in 'on clause' error.

To enable the join to be processed, use either of these strategies:
- Group the first two tables explicitly with parentheses so that the operands for the ON clause are (t1, t2) and t3:
```
SELECT * FROM (t1, t2) JOIN t3 ON (t1.i1 = t3.i3);
```

- Avoid the use of the comma operator and use JOIN instead:
```
SELECT * FROM t1 JOIN t2 JOIN t3 ON (t1.i1 = t3.i3);
```


The same precedence interpretation also applies to statements that mix the comma operator with INNER JOIN, CROSS JOIN, LEFT JOIN, and RIGHT JOIN, all of which have higher precedence than the comma operator.
- A MySQL extension compared to the SQL:2003 standard is that MySQL permits you to qualify the common (coalesced) columns of NATURAL or USING joins, whereas the standard disallows that.

\subsection*{15.2.14 Set Operations with UNION, INTERSECT, and EXCEPT}
- Result Set Column Names and Data Types
- Set Operations with TABLE and VALUES Statements
- Set Operations using DISTINCT and ALL
- Set Operations with ORDER BY and LIMIT
- Limitations of Set Operations

SQL set operations combine the results of multiple query blocks into a single result. A query block, sometimes also known as a simple table, is any SQL statement that returns a result set, such as SELECT. MySQL 8.4 also supports TABLE and VALUES statements. See the individual descriptions of these statements elsewhere in this chapter for additional information.

The SQL standard defines the following three set operations:
- UNION: Combine all results from two query blocks into a single result, omitting any duplicates.
- INTERSECT: Combine only those rows which the results of two query blocks have in common, omitting any duplicates.
- EXCEPT: For two query blocks $A$ and $B$, return all results from $A$ which are not also present in $B$, omitting any duplicates.
(Some database systems, such as Oracle, use MINUS for the name of this operator. This is not supported in MySQL.)

MySQL supports UNION, INTERSECT, and EXCEPT.
Each of these set operators supports an ALL modifier. When the ALL keyword follows a set operator, this causes duplicates to be included in the result. See the following sections covering the individual operators for more information and examples.

All three set operators also support a DISTINCT keyword, which suppresses duplicates in the result. Since this is the default behavior for set operators, it is usually not necessary to specify DISTINCT explicitly.

In general, query blocks and set operations can be combined in any number and order. A greatly simplified representation is shown here:
```
query_block [set_op query_block] [set_op query_block] ...
query_block:
    SELECT | TABLE | VALUES
set_op:
    UNION | INTERSECT | EXCEPT
```


This can be represented more accurately, and in greater detail, like this:
```
query_expression:
    [with_clause] /* WITH clause */
    query_expression_body
    [order_by_clause] [limit_clause] [into_clause]
query_expression_body:
        query_term
    | query_expression_body UNION [ALL | DISTINCT] query_term
    | query_expression_body EXCEPT [ALL | DISTINCT] query_term
query_term:
        query_primary
    | query_term INTERSECT [ALL | DISTINCT] query_primary
query_primary:
        query_block
    | '(' query_expression_body [order_by_clause] [limit_clause] [into_clause] ')'
query_block: /* also known as a simple table */
        query_specification /* SELECT statement */
    | table_value_constructor /* VALUES statement */
    | explicit_table /* TABLE statement */
```


You should be aware that INTERSECT is evaluated before UNION or EXCEPT. This means that, for example, TABLE $x$ UNION TABLE y INTERSECT TABLE $z$ is always evaluated as TABLE $x$ UNION (TABLE y INTERSECT TABLE z). See Section 15.2.8, "INTERSECT Clause", for more information.

In addition, you should keep in mind that, while the UNION and INTERSECT set operators are commutative (ordering is not significant), EXCEPT is not (order of operands affects the outcome). In other words, all of the following statements are true:
- TABLE $x$ UNION TABLE $y$ and TABLE $y$ UNION TABLE $x$ produce the same result, although the ordering of the rows may differ. You can force them to be the same using ORDER BY; see Set Operations with ORDER BY and LIMIT.
- TABLE $x$ INTERSECT TABLE $y$ and TABLE y INTERSECT TABLE $x$ return the same result.
- TABLE $x$ EXCEPT TABLE $y$ and TABLE y EXCEPT TABLE $x$ do not yield the same result. See Section 15.2.4, "EXCEPT Clause", for an example.

More information and examples can be found in the sections that follow.

