\section*{Index Prefixes}

With col_name( $N$ ) syntax in an index specification for a string column, you can create an index that uses only the first $N$ characters of the column. Indexing only a prefix of column values in this way can make the index file much smaller. When you index a BLOB or TEXT column, you must specify a prefix length for the index. For example:

CREATE TABLE test (blob_col BLOB, INDEX(blob_col(10)));

Prefixes can be up to 767 bytes long for InnoDB tables that use the REDUNDANT or COMPACT row format. The prefix length limit is 3072 bytes for InnoDB tables that use the DYNAMIC or COMPRESSED row format. For MyISAM tables, the prefix length limit is 1000 bytes.

\section*{Note \\ Prefix limits are measured in bytes, whereas the prefix length in CREATE TABLE, ALTER TABLE, and CREATE INDEX statements is interpreted as number of characters for nonbinary string types (CHAR, VARCHAR, TEXT) and number of bytes for binary string types (BINARY, VARBINARY, BLOB). Take this into account when specifying a prefix length for a nonbinary string column that uses a multibyte character set.}

If a search term exceeds the index prefix length, the index is used to exclude non-matching rows, and the remaining rows are examined for possible matches.

For additional information about index prefixes, see Section 15.1.15, "CREATE INDEX Statement".

\section*{FULLTEXT Indexes}

FULLTEXT indexes are used for full-text searches. Only the InnoDB and MyISAM storage engines support FULLTEXT indexes and only for CHAR, VARCHAR, and TEXT columns. Indexing always takes place over the entire column and column prefix indexing is not supported. For details, see Section 14.9, "Full-Text Search Functions".

Optimizations are applied to certain kinds of FULLTEXT queries against single InnoDB tables. Queries with these characteristics are particularly efficient:
- FULLTEXT queries that only return the document ID, or the document ID and the search rank.
- FULLTEXT queries that sort the matching rows in descending order of score and apply a LIMIT clause to take the top N matching rows. For this optimization to apply, there must be no WHERE clauses and only a single ORDER BY clause in descending order.
- FULLTEXT queries that retrieve only the COUNT ( * ) value of rows matching a search term, with no additional WHERE clauses. Code the WHERE clause as WHERE MATCH(text) AGAINST ('other_text'), without any > 0 comparison operator.

For queries that contain full-text expressions, MySQL evaluates those expressions during the optimization phase of query execution. The optimizer does not just look at full-text expressions and make estimates, it actually evaluates them in the process of developing an execution plan.

An implication of this behavior is that EXPLAIN for full-text queries is typically slower than for non-fulltext queries for which no expression evaluation occurs during the optimization phase.

EXPLAIN for full-text queries may show Select tables optimized away in the Extra column due to matching occurring during optimization; in this case, no table access need occur during later execution.

\section*{Spatial Indexes}

You can create indexes on spatial data types. MyISAM and InnoDB support R-tree indexes on spatial types. Other storage engines use B-trees for indexing spatial types (except for ARCHIVE, which does not support spatial type indexing).

\section*{Indexes in the MEMORY Storage Engine}

The MEMORY storage engine uses HASH indexes by default, but also supports BTREE indexes.

\subsection*{10.3.6 Multiple-Column Indexes}

MySQL can create composite indexes (that is, indexes on multiple columns). An index may consist of up to 16 columns. For certain data types, you can index a prefix of the column (see Section 10.3.5, "Column Indexes").

MySQL can use multiple-column indexes for queries that test all the columns in the index, or queries that test just the first column, the first two columns, the first three columns, and so on. If you specify the columns in the right order in the index definition, a single composite index can speed up several kinds of queries on the same table.

A multiple-column index can be considered a sorted array, the rows of which contain values that are created by concatenating the values of the indexed columns.

\section*{Note}

As an alternative to a composite index, you can introduce a column that is "hashed" based on information from other columns. If this column is short, reasonably unique, and indexed, it might be faster than a "wide" index on many columns. In MySQL, it is very easy to use this extra column:
```
SELECT * FROM tbl_name
    WHERE hash_col=MD5(CONCAT(val1,val2))
    AND col1=val1 AND col2=val2;
```


Suppose that a table has the following specification:
```
CREATE TABLE test (
    id INT NOT NULL,
    last_name CHAR(30) NOT NULL,
    first_name CHAR(30) NOT NULL,
    PRIMARY KEY (id),
    INDEX name (last_name,first_name)
);
```


The name index is an index over the last_name and first_name columns. The index can be used for lookups in queries that specify values in a known range for combinations of last_name and first_name values. It can also be used for queries that specify just a last_name value because that column is a leftmost prefix of the index (as described later in this section). Therefore, the name index is used for lookups in the following queries:
```
SELECT * FROM test WHERE last_name='Jones';
SELECT * FROM test
    WHERE last_name='Jones' AND first_name='John';
SELECT * FROM test
    WHERE last_name='Jones'
    AND (first_name='John' OR first_name='Jon');
SELECT * FROM test
    WHERE last_name='Jones'
    AND first_name >='M' AND first_name < 'N';
```


However, the name index is not used for lookups in the following queries:
```
SELECT * FROM test WHERE first_name='John';
SELECT * FROM test
    WHERE last_name='Jones' OR first_name='John';
```


Suppose that you issue the following SELECT statement:
```
SELECT * FROM tbl_name
    WHERE col1=val1 AND col2=val2;
```


If a multiple-column index exists on col1 and col2, the appropriate rows can be fetched directly. If separate single-column indexes exist on col1 and col2, the optimizer attempts to use the Index

Merge optimization (see Section 10.2.1.3, "Index Merge Optimization"), or attempts to find the most restrictive index by deciding which index excludes more rows and using that index to fetch the rows.

If the table has a multiple-column index, any leftmost prefix of the index can be used by the optimizer to look up rows. For example, if you have a three-column index on (col1, col2, col3), you have indexed search capabilities on (col1), (col1, col2), and (col1, col2, col3).

MySQL cannot use the index to perform lookups if the columns do not form a leftmost prefix of the index. Suppose that you have the SELECT statements shown here:
```
SELECT * FROM tbl_name WHERE col1=val1;
SELECT * FROM tbl_name WHERE col1=val1 AND col2=val2;
SELECT * FROM tbl_name WHERE col2=val2;
SELECT * FROM tbl_name WHERE col2=val2 AND col3=val3;
```


If an index exists on (col1, col2, col3), only the first two queries use the index. The third and fourth queries do involve indexed columns, but do not use an index to perform lookups because (col2) and (col2, col3) are not leftmost prefixes of (col1, col2, col3).

\subsection*{10.3.7 Verifying Index Usage}

Always check whether all your queries really use the indexes that you have created in the tables. Use the EXPLAIN statement, as described in Section 10.8.1, "Optimizing Queries with EXPLAIN".

\subsection*{10.3.8 InnoDB and MyISAM Index Statistics Collection}

Storage engines collect statistics about tables for use by the optimizer. Table statistics are based on value groups, where a value group is a set of rows with the same key prefix value. For optimizer purposes, an important statistic is the average value group size.

MySQL uses the average value group size in the following ways:
- To estimate how many rows must be read for each ref access
- To estimate how many rows a partial join produces, that is, the number of rows produced by an operation of the form
```
(...) JOIN tbl_name ON tbl_name.key = expr
```


As the average value group size for an index increases, the index is less useful for those two purposes because the average number of rows per lookup increases: For the index to be good for optimization purposes, it is best that each index value target a small number of rows in the table. When a given index value yields a large number of rows, the index is less useful and MySQL is less likely to use it.

The average value group size is related to table cardinality, which is the number of value groups. The SHOW INDEX statement displays a cardinality value based on $N / S$, where $N$ is the number of rows in the table and $S$ is the average value group size. That ratio yields an approximate number of value groups in the table.

For a join based on the <=> comparison operator, NULL is not treated differently from any other value: NULL ⟶ NULL, just as $N$ ⇔ $N$ for any other $N$.

However, for a join based on the = operator, NULL is different from non-NULL values: expr1 = expr2 is not true when expr1 or expr2 (or both) are NULL. This affects ref accesses for comparisons of the form tbl_name.key = expr: MySQL does not access the table if the current value of expr is NULL, because the comparison cannot be true.

For = comparisons, it does not matter how many NULL values are in the table. For optimization purposes, the relevant value is the average size of the non-NULL value groups. However, MySQL does not currently enable that average size to be collected or used.

For InnoDB and MyISAM tables, you have some control over collection of table statistics by means of the innodb_stats_method and myisam_stats_method system variables, respectively. These variables have three possible values, which differ as follows:
- When the variable is set to nulls_equal, all NULL values are treated as identical (that is, they all form a single value group).

If the NULL value group size is much higher than the average non-NULL value group size, this method skews the average value group size upward. This makes index appear to the optimizer to be less useful than it really is for joins that look for non-NULL values. Consequently, the nulls_equal method may cause the optimizer not to use the index for ref accesses when it should.
- When the variable is set to nulls_unequal, NULL values are not considered the same. Instead, each NULL value forms a separate value group of size 1 .

If you have many NULL values, this method skews the average value group size downward. If the average non-NULL value group size is large, counting NULL values each as a group of size 1 causes the optimizer to overestimate the value of the index for joins that look for non-NULL values. Consequently, the nulls_unequal method may cause the optimizer to use this index for ref lookups when other methods may be better.
- When the variable is set to nulls_ignored, NULL values are ignored.

If you tend to use many joins that use <=> rather than =, NULL values are not special in comparisons and one NULL is equal to another. In this case, nulls_equal is the appropriate statistics method.

The innodb_stats_method system variable has a global value; the myisam_stats_method system variable has both global and session values. Setting the global value affects statistics collection for tables from the corresponding storage engine. Setting the session value affects statistics collection only for the current client connection. This means that you can force a table's statistics to be regenerated with a given method without affecting other clients by setting the session value of myisam_stats_method.

To regenerate MyISAM table statistics, you can use any of the following methods:
- Execute myisamchk --stats_method=method_name --analyze
- Change the table to cause its statistics to go out of date (for example, insert a row and then delete it), and then set myisam_stats_method and issue an ANALYZE TABLE statement

Some caveats regarding the use of innodb_stats_method and myisam_stats_method:
- You can force table statistics to be collected explicitly, as just described. However, MySQL may also collect statistics automatically. For example, if during the course of executing statements for a table, some of those statements modify the table, MySQL may collect statistics. (This may occur for bulk inserts or deletes, or some ALTER TABLE statements, for example.) If this happens, the statistics are collected using whatever value innodb_stats_method or myisam_stats_method has at the time. Thus, if you collect statistics using one method, but the system variable is set to the other method when a table's statistics are collected automatically later, the other method is used.
- There is no way to tell which method was used to generate statistics for a given table.
- These variables apply only to InnoDB and MyISAM tables. Other storage engines have only one method for collecting table statistics. Usually it is closer to the nulls_equal method.

\subsection*{10.3.9 Comparison of B-Tree and Hash Indexes}

Understanding the B-tree and hash data structures can help predict how different queries perform on different storage engines that use these data structures in their indexes, particularly for the MEMORY storage engine that lets you choose B-tree or hash indexes.
- B-Tree Index Characteristics
- Hash Index Characteristics

\section*{B-Tree Index Characteristics}

A B-tree index can be used for column comparisons in expressions that use the $=,>,>=,<,<=$, or BETWEEN operators. The index also can be used for LIKE comparisons if the argument to LIKE is a constant string that does not start with a wildcard character. For example, the following SELECT statements use indexes:
```
SELECT * FROM tbl_name WHERE key_col LIKE 'Patrick%';
SELECT * FROM tbl_name WHERE key_col LIKE 'Pat%_ck%';
```


In the first statement, only rows with 'Patrick' <= key_col < 'Patricl' are considered. In the second statement, only rows with 'Pat' <= key_col < 'Pau' are considered.

The following SELECT statements do not use indexes:
```
SELECT * FROM tbl_name WHERE key_col LIKE '%Patrick%';
SELECT * FROM tbl_name WHERE key_col LIKE other_col;
```


In the first statement, the LIKE value begins with a wildcard character. In the second statement, the LIKE value is not a constant.

If you use ... LIKE '\%string\%' and string is longer than three characters, MySQL uses the Turbo Boyer-Moore algorithm to initialize the pattern for the string and then uses this pattern to perform the search more quickly.

A search using col_name IS NULL employs indexes if col_name is indexed.
Any index that does not span all AND levels in the WHERE clause is not used to optimize the query. In other words, to be able to use an index, a prefix of the index must be used in every AND group.

The following WHERE clauses use indexes:
```
... WHERE index_part1=1 AND index_part2=2 AND other_column=3
    /* index = 1 OR index = 2 */
... WHERE index=1 OR A=10 AND index=2
    /* optimized like "index_part1='hello'" */
... WHERE index_part1='hello' AND index_part3=5
    /* Can use index on index1 but not on index2 or index3 */
... WHERE index1=1 AND index2=2 OR index1=3 AND index3=3;
```


These WHERE clauses do not use indexes:
```
    /* index_part1 is not used */
... WHERE index_part2=1 AND index_part3=2
    /* Index is not used in both parts of the WHERE clause */
... WHERE index=1 OR A=10
    /* No index spans all rows */
... WHERE index_part1=1 OR index_part2=10
```


Sometimes MySQL does not use an index, even if one is available. One circumstance under which this occurs is when the optimizer estimates that using the index would require MySQL to access a very large percentage of the rows in the table. (In this case, a table scan is likely to be much faster because it requires fewer seeks.) However, if such a query uses LIMIT to retrieve only some of the rows, MySQL uses an index anyway, because it can much more quickly find the few rows to return in the result.

\section*{Hash Index Characteristics}

Hash indexes have somewhat different characteristics from those just discussed:
- They are used only for equality comparisons that use the $=$ or <=> operators (but are very fast). They are not used for comparison operators such as < that find a range of values. Systems that rely on this type of single-value lookup are known as "key-value stores"; to use MySQL for such applications, use hash indexes wherever possible.
- The optimizer cannot use a hash index to speed up ORDER BY operations. (This type of index cannot be used to search for the next entry in order.)
- MySQL cannot determine approximately how many rows there are between two values (this is used by the range optimizer to decide which index to use). This may affect some queries if you change a MyISAM or InnoDB table to a hash-indexed MEMORY table.
- Only whole keys can be used to search for a row. (With a B-tree index, any leftmost prefix of the key can be used to find rows.)

\subsection*{10.3.10 Use of Index Extensions}

InnoDB automatically extends each secondary index by appending the primary key columns to it. Consider this table definition:
```
CREATE TABLE t1 (
    i1 INT NOT NULL DEFAULT 0,
    i2 INT NOT NULL DEFAULT 0,
    d DATE DEFAULT NULL,
    PRIMARY KEY (i1, i2),
    INDEX k_d (d)
) ENGINE = InnoDB;
```


This table defines the primary key on columns (i1, i2). It also defines a secondary index k_d on column (d), but internally InnoDB extends this index and treats it as columns (d, i1, i2).

The optimizer takes into account the primary key columns of the extended secondary index when determining how and whether to use that index. This can result in more efficient query execution plans and better performance.

The optimizer can use extended secondary indexes for ref, range, and index_merge index access, for Loose Index Scan access, for join and sorting optimization, and for MIN( )/MAX( ) optimization.

The following example shows how execution plans are affected by whether the optimizer uses extended secondary indexes. Suppose that t1 is populated with these rows:
```
INSERT INTO t1 VALUES
(1, 1, '1998-01-01'), (1, 2, '1999-01-01'),
(1, 3, '2000-01-01'), (1, 4, '2001-01-01'),
(1, 5, '2002-01-01'), (2, 1, '1998-01-01'),
(2, 2, '1999-01-01'), (2, 3, '2000-01-01'),
(2, 4, '2001-01-01'), (2, 5, '2002-01-01'),
(3, 1, '1998-01-01'), (3, 2, '1999-01-01'),
(3, 3, '2000-01-01'), (3, 4, '2001-01-01'),
(3, 5, '2002-01-01'), (4, 1, '1998-01-01'),
(4, 2, '1999-01-01'), (4, 3, '2000-01-01'),
(4, 4, '2001-01-01'), (4, 5, '2002-01-01'),
(5, 1, '1998-01-01'), (5, 2, '1999-01-01'),
(5, 3, '2000-01-01'), (5, 4, '2001-01-01'),
(5, 5, '2002-01-01');
```


Now consider this query:
```
EXPLAIN SELECT COUNT(*) FROM t1 WHERE i1 = 3 AND d = '2000-01-01'
```


The execution plan depends on whether the extended index is used.

When the optimizer does not consider index extensions, it treats the index $\mathrm{k} \_\mathrm{d}$ as only (d). EXPLAIN for the query produces this result:
```
mysql> EXPLAIN SELECT COUNT(*) FROM t1 WHERE i1 = 3 AND d = '2000-01-01'\G
************************** 1. row ******************************
                    id: 1
    select_type: SIMPLE
            table: t1
                type: ref
possible_keys: PRIMARY,k_d
                    key: k_d
        key_len: 4
                    ref: const
                rows: 5
            Extra: Using where; Using index
```


When the optimizer takes index extensions into account, it treats k_d as (d, i1, i2). In this case, it can use the leftmost index prefix ( d , i1) to produce a better execution plan:
```
mysql> EXPLAIN SELECT COUNT(*) FROM t1 WHERE i1 = 3 AND d = '2000-01-01'\G
*************************** 1. row ******************************
                    id: 1
    select_type: SIMPLE
            table: t1
                type: ref
possible_keys: PRIMARY,k_d
                    key: k_d
        key_len: 8
                    ref: const,const
                rows: 1
            Extra: Using index
```


In both cases, key indicates that the optimizer uses secondary index k_d but the EXPLAIN output shows these improvements from using the extended index:
- key_len goes from 4 bytes to 8 bytes, indicating that key lookups use columns d and i1, not just d.
- The ref value changes from const to const, const because the key lookup uses two key parts, not one.
- The rows count decreases from 5 to 1 , indicating that InnoDB should need to examine fewer rows to produce the result.
- The Extra value changes from Using where; Using index to Using index. This means that rows can be read using only the index, without consulting columns in the data row.

Differences in optimizer behavior for use of extended indexes can also be seen with SHOW STATUS:
```
FLUSH TABLE t1;
FLUSH STATUS;
SELECT COUNT(*) FROM t1 WHERE i1 = 3 AND d = '2000-01-01';
SHOW STATUS LIKE 'handler_read%'
```


The preceding statements include FLUSH TABLES and FLUSH STATUS to flush the table cache and clear the status counters.

Without index extensions, SHOW STATUS produces this result:
```
+------------------------+-------+
| Variable_name | Value |
+-------------------------+-------+
| Handler_read_first | 0
| Handler_read_key | 1
| Handler_read_last | 0
| Handler_read_next | 5
| Handler_read_prev | 0
| Handler_read_rnd | 0
| Handler_read_rnd_next | 0
```

+------------------------+-------+

With index extensions, SHOW STATUS produces this result. The Handler_read_next value decreases from 5 to 1 , indicating more efficient use of the index:
```
+-------------------------+-------+
| Variable_name | Value |
+-------------------------+-------+
| Handler_read_first | 0 |
| Handler_read_key | 1
| Handler_read_last | 0
| Handler_read_next | 1
| Handler_read_prev | 0
| Handler_read_rnd | 0
| Handler_read_rnd_next | 0
+------------------------+-------+
```


The use_index_extensions flag of the optimizer_switch system variable permits control over whether the optimizer takes the primary key columns into account when determining how to use an InnoDB table's secondary indexes. By default, use_index_extensions is enabled. To check whether disabling use of index extensions can improve performance, use this statement:

SET optimizer_switch = 'use_index_extensions=off';
Use of index extensions by the optimizer is subject to the usual limits on the number of key parts in an index (16) and the maximum key length (3072 bytes).

\subsection*{10.3.11 Optimizer Use of Generated Column Indexes}

MySQL supports indexes on generated columns. For example:
CREATE TABLE t1 (f1 INT, gc INT AS (f1 + 1) STORED, INDEX (gc));
The generated column, gc, is defined as the expression f1 f 1. The column is also indexed and the optimizer can take that index into account during execution plan construction. In the following query, the WHERE clause refers to gc and the optimizer considers whether the index on that column yields a more efficient plan:

SELECT * FROM t1 WHERE gc > 9;
The optimizer can use indexes on generated columns to generate execution plans, even in the absence of direct references in queries to those columns by name. This occurs if the WHERE, ORDER BY, or GROUP BY clause refers to an expression that matches the definition of some indexed generated column. The following query does not refer directly to gc but does use an expression that matches the definition of gc:

SELECT * FROM t1 WHERE f1 $+1>9$;
The optimizer recognizes that the expression f1 +1 matches the definition of gc and that gc is indexed, so it considers that index during execution plan construction. You can see this using EXPLAIN:
```
mysql> EXPLAIN SELECT * FROM t1 WHERE f1 + 1 > 9\G
************************** 1. row ******************************
                id: 1
    select_type: SIMPLE
            table: t1
        partitions: NULL
                type: range
possible_keys: gc
                    key: gc
            key_len: 5
                    ref: NULL
                    rows: 1
        filtered: 100.00
```


\section*{Extra: Using index condition}

In effect, the optimizer has replaced the expression $\mathrm{f} 1+1$ with the name of the generated column that matches the expression. That is also apparent in the rewritten query available in the extended EXPLAIN information displayed by SHOW WARNINGS:
```
mysql> SHOW WARNINGS\G
************************** 1. row
    Level: Note
        Code: 1003
Message: /* select#1 */ select ˋtestˋ.ˋt1ˋ.ˋf1ˋ AS ˋf1ˋ,ˋtestˋ.ˋt1ˋ.ˋgcˋ
            AS ˋgcˋ from ˋtestˋ.ˋt1ˋ where (ˋtestˋ. ˋt1ˋ.ˋgcˋ > 9)
```


The following restrictions and conditions apply to the optimizer's use of generated column indexes:
- For a query expression to match a generated column definition, the expression must be identical and it must have the same result type. For example, if the generated column expression is $f 1+1$, the optimizer does not recognize a match if the query uses $1+f 1$, or if $f 1+1$ (an integer expression) is compared with a string.
- The optimization applies to these operators: $=,<,<=,>,>=$, BETWEEN, and IN().

For operators other than BETWEEN and IN( ), either operand can be replaced by a matching generated column. For BETWEEN and IN ( ), only the first argument can be replaced by a matching generated column, and the other arguments must have the same result type. BETWEEN and IN ( ) are not yet supported for comparisons involving JSON values.
- The generated column must be defined as an expression that contains at least a function call or one of the operators mentioned in the preceding item. The expression cannot consist of a simple reference to another column. For example, gc INT AS (f1) STORED consists only of a column reference, so indexes on gc are not considered.
- For comparisons of strings to indexed generated columns that compute a value from a JSON function that returns a quoted string, JSON_UNQUOTE( ) is needed in the column definition to remove the extra quotes from the function value. (For direct comparison of a string to the function result, the JSON comparator handles quote removal, but this does not occur for index lookups.) For example, instead of writing a column definition like this:
```
doc_name TEXT AS (JSON_EXTRACT(jdoc, '$.name')) STORED
```


Write it like this:
```
doc_name TEXT AS (JSON_UNQUOTE(JSON_EXTRACT(jdoc, '$.name'))) STORED
```


With the latter definition, the optimizer can detect a match for both of these comparisons:
```
... WHERE JSON_EXTRACT(jdoc, '$.name') = 'some_string' ...
... WHERE JSON_UNQUOTE(JSON_EXTRACT(jdoc, '$.name')) = 'some_string' ...
```


Without JSON_UNQUOTE( ) in the column definition, the optimizer detects a match only for the first of those comparisons.
- If the optimizer picks the wrong index, an index hint can be used to disable it and force the optimizer to make a different choice.

\subsection*{10.3.12 Invisible Indexes}

MySQL supports invisible indexes; that is, indexes that are not used by the optimizer. The feature applies to indexes other than primary keys (either explicit or implicit).

Indexes are visible by default. To control visibility explicitly for a new index, use a VISIBLE or INVISIBLE keyword as part of the index definition for CREATE TABLE, CREATE INDEX, or ALTER TABLE:
```
CREATE TABLE t1 (
    i INT,
    j INT,
    k INT,
    INDEX i_idx (i) INVISIBLE
) ENGINE = InnoDB;
CREATE INDEX j_idx ON t1 (j) INVISIBLE;
ALTER TABLE t1 ADD INDEX k_idx (k) INVISIBLE;
```


To alter the visibility of an existing index, use a VISIBLE or INVISIBLE keyword with the ALTER TABLE ... ALTER INDEX operation:
```
ALTER TABLE t1 ALTER INDEX i_idx INVISIBLE;
ALTER TABLE t1 ALTER INDEX i_idx VISIBLE;
```


Information about whether an index is visible or invisible is available from the Information Schema STATISTICS table or SHOW INDEX output. For example:
```
mysql> SELECT INDEX_NAME, IS_VISIBLE
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = 'db1' AND TABLE_NAME = 't1';
+-------------+------------+
| INDEX_NAME | IS_VISIBLE |
+-------------+-------------+
| i_idx | YES
| j_idx | NO
| k_idx | NO
+-------------+------------+
```


Invisible indexes make it possible to test the effect of removing an index on query performance, without making a destructive change that must be undone should the index turn out to be required. Dropping and re-adding an index can be expensive for a large table, whereas making it invisible and visible are fast, in-place operations.

If an index made invisible actually is needed or used by the optimizer, there are several ways to notice the effect of its absence on queries for the table:
- Errors occur for queries that include index hints that refer to the invisible index.
- Performance Schema data shows an increase in workload for affected queries.
- Queries have different EXPLAIN execution plans.
- Queries appear in the slow query log that did not appear there previously.

The use_invisible_indexes flag of the optimizer_switch system variable controls whether the optimizer uses invisible indexes for query execution plan construction. If the flag is off (the default), the optimizer ignores invisible indexes (the same behavior as prior to the introduction of this flag). If the flag is on, invisible indexes remain invisible but the optimizer takes them into account for execution plan construction.

Using the SET_VAR optimizer hint to update the value of optimizer_switch temporarily, you can enable invisible indexes for the duration of a single query only, like this:
```
mysql> EXPLAIN SELECT /*+ SET_VAR(optimizer_switch = 'use_invisible_indexes=on') */
        > i, j FROM t1 WHERE j >= 50\G
************************** 1. row *****************************************
                id: 1
    select_type: SIMPLE
            table: t1
    partitions: NULL
                type: range
possible_keys: j_idx
                key: j_idx
        key_len: 5
```

```
                    ref: NULL
                rows: 2
        filtered: 100.00
                Extra: Using index condition
mysql> EXPLAIN SELECT i, j FROM t1 WHERE j >= 50\G
************************** 1. row ******************************
                        id: 1
    select_type: SIMPLE
                table: t1
        partitions: NULL
                    type: ALL
possible_keys: NULL
                        key: NULL
            key_len: NULL
                        ref: NULL
                    rows: 5
        filtered: 33.33
                Extra: Using where
```


Index visibility does not affect index maintenance. For example, an index continues to be updated per changes to table rows, and a unique index prevents insertion of duplicates into a column, regardless of whether the index is visible or invisible.

A table with no explicit primary key may still have an effective implicit primary key if it has any UNIQUE indexes on NOT NULL columns. In this case, the first such index places the same constraint on table rows as an explicit primary key and that index cannot be made invisible. Consider the following table definition:
```
CREATE TABLE t2 (
    i INT NOT NULL,
    j INT NOT NULL,
    UNIQUE j_idx (j)
) ENGINE = InnoDB;
```


The definition includes no explicit primary key, but the index on NOT NULL column j places the same constraint on rows as a primary key and cannot be made invisible:
```
mysql> ALTER TABLE t2 ALTER INDEX j_idx INVISIBLE;
ERROR 3522 (HY000): A primary key index cannot be invisible.
```


Now suppose that an explicit primary key is added to the table:
```
ALTER TABLE t2 ADD PRIMARY KEY (i);
```


The explicit primary key cannot be made invisible. In addition, the unique index on j no longer acts as an implicit primary key and as a result can be made invisible:
```
mysql> ALTER TABLE t2 ALTER INDEX j_idx INVISIBLE;
Query OK, 0 rows affected (0.03 sec)
```


\subsection*{10.3.13 Descending Indexes}

MySQL supports descending indexes: DESC in an index definition is no longer ignored but causes storage of key values in descending order. Previously, indexes could be scanned in reverse order but at a performance penalty. A descending index can be scanned in forward order, which is more efficient. Descending indexes also make it possible for the optimizer to use multiple-column indexes when the most efficient scan order mixes ascending order for some columns and descending order for others.

Consider the following table definition, which contains two columns and four two-column index definitions for the various combinations of ascending and descending indexes on the columns:
```
CREATE TABLE t (
    c1 INT, c2 INT,
    INDEX idx1 (c1 ASC, c2 ASC),
```

```
    INDEX idx2 (c1 ASC, c2 DESC),
    INDEX idx3 (c1 DESC, c2 ASC),
    INDEX idx4 (c1 DESC, c2 DESC)
);
```


The table definition results in four distinct indexes. The optimizer can perform a forward index scan for each of the ORDER BY clauses and need not use a filesort operation:
```
ORDER BY c1 ASC, c2 ASC -- optimizer can use idx1
ORDER BY c1 DESC, c2 DESC -- optimizer can use idx4
ORDER BY c1 ASC, c2 DESC -- optimizer can use idx2
ORDER BY c1 DESC, c2 ASC -- optimizer can use idx3
```


Use of descending indexes is subject to these conditions:
- Descending indexes are supported only for the InnoDB storage engine, with these limitations:
- Change buffering is not supported for a secondary index if the index contains a descending index key column or if the primary key includes a descending index column.
- The InnoDB SQL parser does not use descending indexes. For InnoDB full-text search, this means that the index required on the FTS_DOC_ID column of the indexed table cannot be defined as a descending index. For more information, see Section 17.6.2.4, "InnoDB Full-Text Indexes".
- Descending indexes are supported for all data types for which ascending indexes are available.
- Descending indexes are supported for ordinary (nongenerated) and generated columns (both VIRTUAL and STORED).
- DISTINCT can use any index containing matching columns, including descending key parts.
- Indexes that have descending key parts are not used for MIN( )/MAX( ) optimization of queries that invoke aggregate functions but do not have a GROUP BY clause.
- Descending indexes are supported for BTREE but not HASH indexes. Descending indexes are not supported for FULLTEXT or SPATIAL indexes.

Explicitly specified ASC and DESC designators for HASH, FULLTEXT, and SPATIAL indexes results in an error.

You can see in the Extra column of the output of EXPLAIN that the optimizer is able to use a descending index, as shown here:
```
mysql> CREATE TABLE t1 (
        -> a INT,
        -> b INT,
        -> INDEX a_desc_b_asc (a DESC, b ASC)
        -> );
mysql> EXPLAIN SELECT * FROM t1 ORDER BY a ASC\G
*************************** 1. row ***************************************
                    id: 1
    select_type: SIMPLE
                table: t1
        partitions: NULL
                    type: index
possible_keys: NULL
                        key: a_desc_b_asc
                key_len: 10
                            ref: NULL
                        rows: 1
            filtered: 100.00
                    Extra: Backward index scan; Using index
```


In EXPLAIN FORMAT=TREE output, use of a descending index is indicated by the addition of (reverse) following the name of the index, like this:
```
mysql> EXPLAIN FORMAT=TREE SELECT * FROM t1 ORDER BY a ASC\G
*************************** 1. row *****************************
EXPLAIN: -> Index scan on t1 using a_desc_b_asc (reverse) (cost=0.35 rows=1)
```


See also EXPLAIN Extra Information.

\subsection*{10.3.14 Indexed Lookups from TIMESTAMP Columns}

Temporal values are stored in TIMESTAMP columns as UTC values, and values inserted into and retrieved from TIMESTAMP columns are converted between the session time zone and UTC. (This is the same type of conversion performed by the CONVERT_TZ( ) function. If the session time zone is UTC, there is effectively no time zone conversion.)

Due to conventions for local time zone changes such as Daylight Saving Time (DST), conversions between UTC and non-UTC time zones are not one-to-one in both directions. UTC values that are distinct may not be distinct in another time zone. The following example shows distinct UTC values that become identical in a non-UTC time zone:
```
mysql> CREATE TABLE tstable (ts TIMESTAMP);
mysql> SET time_zone = 'UTC'; -- insert UTC values
mysql> INSERT INTO tstable VALUES
    ('2018-10-28 00:30:00'),
    ('2018-10-28 01:30:00');
mysql> SELECT ts FROM tstable;
+----------------------+
| ts |
+-----------------------+
| 2018-10-28 00:30:00 |
| 2018-10-28 01:30:00 |
+-----------------------+
mysql> SET time_zone = 'MET'; -- retrieve non-UTC values
mysql> SELECT ts FROM tstable;
+-----------------------+
| ts |
+-----------------------+
| 2018-10-28 02:30:00 |
| 2018-10-28 02:30:00 |
+-----------------------+
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1751.jpg?height=127&width=99&top_left_y=1667&top_left_x=370)

\section*{Note}

To use named time zones such as 'MET' or 'Europe/Amsterdam', the time zone tables must be properly set up. For instructions, see Section 7.1.15, "MySQL Server Time Zone Support".

You can see that the two distinct UTC values are the same when converted to the 'MET ' time zone. This phenomenon can lead to different results for a given TIMESTAMP column query, depending on whether the optimizer uses an index to execute the query.

Suppose that a query selects values from the table shown earlier using a WHERE clause to search the ts column for a single specific value such as a user-provided timestamp literal:
```
SELECT ts FROM tstable
WHERE ts = 'literal';
```


Suppose further that the query executes under these conditions:
- The session time zone is not UTC and has a DST shift. For example:
```
SET time_zone = 'MET';
```

- Unique UTC values stored in the TIMESTAMP column are not unique in the session time zone due to DST shifts. (The example shown earlier illustrates how this can occur.)
- The query specifies a search value that is within the hour of entry into DST in the session time zone.

Under those conditions, the comparison in the WHERE clause occurs in different ways for nonindexed and indexed lookups and leads to different results:
- If there is no index or the optimizer cannot use it, comparisons occur in the session time zone. The optimizer performs a table scan in which it retrieves each ts column value, converts it from UTC to the session time zone, and compares it to the search value (also interpreted in the session time zone):
```
mysql> SELECT ts FROM tstable
    WHERE ts = '2018-10-28 02:30:00';
+-----------------------+
| ts |
+-----------------------+
| 2018-10-28 02:30:00 |
| 2018-10-28 02:30:00 |
+-----------------------+
```


Because the stored ts values are converted to the session time zone, it is possible for the query to return two timestamp values that are distinct as UTC values but equal in the session time zone: One value that occurs before the DST shift when clocks are changed, and one value that was occurs after the DST shift.
- If there is a usable index, comparisons occur in UTC. The optimizer performs an index scan, first converting the search value from the session time zone to UTC, then comparing the result to the UTC index entries:
```
mysql> ALTER TABLE tstable ADD INDEX (ts);
mysql> SELECT ts FROM tstable
    WHERE ts = '2018-10-28 02:30:00';
+-----------------------+
| ts |
+-----------------------+
| 2018-10-28 02:30:00 |
+-----------------------+
```


In this case, the (converted) search value is matched only to index entries, and because the index entries for the distinct stored UTC values are also distinct, the search value can match only one of them.

Due to different optimizer operation for nonindexed and indexed lookups, the query produces different results in each case. The result from the nonindexed lookup returns all values that match in the session time zone. The indexed lookup cannot do so:
- It is performed within the storage engine, which knows only about UTC values.
- For the two distinct session time zone values that map to the same UTC value, the indexed lookup matches only the corresponding UTC index entry and returns only a single row.

In the preceding discussion, the data set stored in tstable happens to consist of distinct UTC values. In such cases, all index-using queries of the form shown match at most one index entry.

If the index is not UNIQUE, it is possible for the table (and the index) to store multiple instances of a given UTC value. For example, the ts column might contain multiple instances of the UTC value ${ }^{\prime} 2018-10-2800: 30: 00$ '. In this case, the index-using query would return each of them (converted to the MET value '2018-10 - 28 02:30:00' in the result set). It remains true that index-using queries match the converted search value to a single value in the UTC index entries, rather than matching multiple UTC values that convert to the search value in the session time zone.

If it is important to return all ts values that match in the session time zone, the workaround is to suppress use of the index with an IGNORE INDEX hint:
```
mysql> SELECT ts FROM tstable
    IGNORE INDEX (ts)
    WHERE ts = '2018-10-28 02:30:00';
+----------------------+
```

```
| ts |
+-----------------------+
| 2018-10-28 02:30:00 |
| 2018-10-28 02:30:00 |
+-----------------------+
```


The same lack of one-to-one mapping for time zone conversions in both directions occurs in other contexts as well, such as conversions performed with the FROM_UNIXTIME( ) and UNIX_TIMESTAMP( ) functions. See Section 14.7, "Date and Time Functions".

\subsection*{10.4 Optimizing Database Structure}

In your role as a database designer, look for the most efficient way to organize your schemas, tables, and columns. As when tuning application code, you minimize I/O, keep related items together, and plan ahead so that performance stays high as the data volume increases. Starting with an efficient database design makes it easier for team members to write high-performing application code, and makes the database likely to endure as applications evolve and are rewritten.

\subsection*{10.4.1 Optimizing Data Size}

Design your tables to minimize their space on the disk. This can result in huge improvements by reducing the amount of data written to and read from disk. Smaller tables normally require less main memory while their contents are being actively processed during query execution. Any space reduction for table data also results in smaller indexes that can be processed faster.

MySQL supports many different storage engines (table types) and row formats. For each table, you can decide which storage and indexing method to use. Choosing the proper table format for your application can give you a big performance gain. See Chapter 17, The InnoDB Storage Engine, and Chapter 18, Alternative Storage Engines.

You can get better performance for a table and minimize storage space by using the techniques listed here:
- Table Columns
- Row Format
- Indexes
- Joins
- Normalization

\section*{Table Columns}
- Use the most efficient (smallest) data types possible. MySQL has many specialized types that save disk space and memory. For example, use the smaller integer types if possible to get smaller tables. MEDIUMINT is often a better choice than INT because a MEDIUMINT column uses 25\% less space.
- Declare columns to be NOT NULL if possible. It makes SQL operations faster, by enabling better use of indexes and eliminating overhead for testing whether each value is NULL. You also save some storage space, one bit per column. If you really need NULL values in your tables, use them. Just avoid the default setting that allows NULL values in every column.

\section*{Row Format}
- InnoDB tables are created using the DYNAMIC row format by default. To use a row format other than DYNAMIC, configure innodb_default_row_format, or specify the ROW_FORMAT option explicitly in a CREATE TABLE or ALTER TABLE statement.

The compact family of row formats, which includes COMPACT, DYNAMIC, and COMPRESSED, decreases row storage space at the cost of increasing CPU use for some operations. If your
workload is a typical one that is limited by cache hit rates and disk speed it is likely to be faster. If it is a rare case that is limited by CPU speed, it might be slower.

The compact family of row formats also optimizes CHAR column storage when using a variable-length character set such as utf 8 mb 3 or utf 8 mb 4 . With ROW_FORMAT=REDUNDANT, CHAR $(N)$ occupies $N \times$ the maximum byte length of the character set. Many languages can be written primarily using single-byte utf8mb3or utf8mb4 characters, so a fixed storage length often wastes space. With the compact family of rows formats, InnoDB allocates a variable amount of storage in the range of $N$ to $N \times$ the maximum byte length of the character set for these columns by stripping trailing spaces. The minimum storage length is $N$ bytes to facilitate in-place updates in typical cases. For more information, see Section 17.10, "InnoDB Row Formats".
- To minimize space even further by storing table data in compressed form, specify ROW_FORMAT=COMPRESSED when creating InnoDB tables, or run the myisampack command on an existing MyISAM table. (InnoDB compressed tables are readable and writable, while MyISAM compressed tables are read-only.)
- For MyISAM tables, if you do not have any variable-length columns (VARCHAR, TEXT, or BLOB columns), a fixed-size row format is used. This is faster but may waste some space. See Section 18.2.3, "MyISAM Table Storage Formats". You can hint that you want to have fixed length rows even if you have VARCHAR columns with the CREATE TABLE option ROW_FORMAT=FIXED.

\section*{Indexes}
- The primary index of a table should be as short as possible. This makes identification of each row easy and efficient. For InnoDB tables, the primary key columns are duplicated in each secondary index entry, so a short primary key saves considerable space if you have many secondary indexes.
- Create only the indexes that you need to improve query performance. Indexes are good for retrieval, but slow down insert and update operations. If you access a table mostly by searching on a combination of columns, create a single composite index on them rather than a separate index for each column. The first part of the index should be the column most used. If you always use many columns when selecting from the table, the first column in the index should be the one with the most duplicates, to obtain better compression of the index.
- If it is very likely that a long string column has a unique prefix on the first number of characters, it is better to index only this prefix, using MySQL's support for creating an index on the leftmost part of the column (see Section 15.1.15, "CREATE INDEX Statement"). Shorter indexes are faster, not only because they require less disk space, but because they also give you more hits in the index cache, and thus fewer disk seeks. See Section 7.1.1, "Configuring the Server".

\section*{Joins}
- In some circumstances, it can be beneficial to split into two a table that is scanned very often. This is especially true if it is a dynamic-format table and it is possible to use a smaller static format table that can be used to find the relevant rows when scanning the table.
- Declare columns with identical information in different tables with identical data types, to speed up joins based on the corresponding columns.
- Keep column names simple, so that you can use the same name across different tables and simplify join queries. For example, in a table named customer, use a column name of name instead of customer_name. To make your names portable to other SQL servers, consider keeping them shorter than 18 characters.

\section*{Normalization}
- Normally, try to keep all data nonredundant (observing what is referred to in database theory as third normal form). Instead of repeating lengthy values such as names and addresses, assign them unique IDs, repeat these IDs as needed across multiple smaller tables, and join the tables in queries by referencing the IDs in the join clause.
- If speed is more important than disk space and the maintenance costs of keeping multiple copies of data, for example in a business intelligence scenario where you analyze all the data from large tables, you can relax the normalization rules, duplicating information or creating summary tables to gain more speed.

\subsection*{10.4.2 Optimizing MySQL Data Types}

\subsection*{10.4.2.1 Optimizing for Numeric Data}
- For unique IDs or other values that can be represented as either strings or numbers, prefer numeric columns to string columns. Since large numeric values can be stored in fewer bytes than the corresponding strings, it is faster and takes less memory to transfer and compare them.
- If you are using numeric data, it is faster in many cases to access information from a database (using a live connection) than to access a text file. Information in the database is likely to be stored in a more compact format than in the text file, so accessing it involves fewer disk accesses. You also save code in your application because you can avoid parsing the text file to find line and column boundaries.

\subsection*{10.4.2.2 Optimizing for Character and String Types}

For character and string columns, follow these guidelines:
- Use binary collation order for fast comparison and sort operations, when you do not need languagespecific collation features. You can use the BINARY operator to use binary collation within a particular query.
- When comparing values from different columns, declare those columns with the same character set and collation wherever possible, to avoid string conversions while running the query.
- For column values less than 8 KB in size, use binary VARCHAR instead of BLOB. The GROUP BY and ORDER BY clauses can generate temporary tables, and these temporary tables can use the MEMORY storage engine if the original table does not contain any BLOB columns.
- If a table contains string columns such as name and address, but many queries do not retrieve those columns, consider splitting the string columns into a separate table and using join queries with a foreign key when necessary. When MySQL retrieves any value from a row, it reads a data block containing all the columns of that row (and possibly other adjacent rows). Keeping each row small, with only the most frequently used columns, allows more rows to fit in each data block. Such compact tables reduce disk I/O and memory usage for common queries.
- When you use a randomly generated value as a primary key in an InnoDB table, prefix it with an ascending value such as the current date and time if possible. When consecutive primary values are physically stored near each other, InnoDB can insert and retrieve them faster.
- See Section 10.4.2.1, "Optimizing for Numeric Data" for reasons why a numeric column is usually preferable to an equivalent string column.

\subsection*{10.4.2.3 Optimizing for BLOB Types}
- When storing a large blob containing textual data, consider compressing it first. Do not use this technique when the entire table is compressed by InnoDB or MyISAM.
- For a table with several columns, to reduce memory requirements for queries that do not use the BLOB column, consider splitting the BLOB column into a separate table and referencing it with a join query when needed.
- Since the performance requirements to retrieve and display a BLOB value might be very different from other data types, you could put the BLOB-specific table on a different storage device or even a
separate database instance. For example, to retrieve a BLOB might require a large sequential disk read that is better suited to a traditional hard drive than to an SSD device.
- See Section 10.4.2.2, "Optimizing for Character and String Types" for reasons why a binary VARCHAR column is sometimes preferable to an equivalent BLOB column.
- Rather than testing for equality against a very long text string, you can store a hash of the column value in a separate column, index that column, and test the hashed value in queries. (Use the MD5 ( ) or CRC32( ) function to produce the hash value.) Since hash functions can produce duplicate results for different inputs, you still include a clause AND blob_column = long_string_value in the query to guard against false matches; the performance benefit comes from the smaller, easily scanned index for the hashed values.

\subsection*{10.4.3 Optimizing for Many Tables}

Some techniques for keeping individual queries fast involve splitting data across many tables. When the number of tables runs into the thousands or even millions, the overhead of dealing with all these tables becomes a new performance consideration.

\subsection*{10.4.3.1 How MySQL Opens and Closes Tables}

When you execute a mysqladmin status command, you should see something like this:
Uptime: 426 Running threads: 1 Questions: 11082
Reloads: 1 Open tables: 12
The Open tables value of 12 can be somewhat puzzling if you have fewer than 12 tables.
MySQL is multithreaded, so there may be many clients issuing queries for a given table simultaneously. To minimize the problem with multiple client sessions having different states on the same table, the table is opened independently by each concurrent session. This uses additional memory but normally increases performance. With MyISAM tables, one extra file descriptor is required for the data file for each client that has the table open. (By contrast, the index file descriptor is shared between all sessions.)

The table_open_cache and max_connections system variables affect the maximum number of files the server keeps open. If you increase one or both of these values, you may run up against a limit imposed by your operating system on the per-process number of open file descriptors. Many operating systems permit you to increase the open-files limit, although the method varies widely from system to system. Consult your operating system documentation to determine whether it is possible to increase the limit and how to do so.
table_open_cache is related to max_connections. For example, for 200 concurrent running connections, specify a table cache size of at least 200 * $N$, where $N$ is the maximum number of tables per join in any of the queries which you execute. You must also reserve some extra file descriptors for temporary tables and files.

Make sure that your operating system can handle the number of open file descriptors implied by the table_open_cache setting. If table_open_cache is set too high, MySQL may run out of file descriptors and exhibit symptoms such as refusing connections or failing to perform queries.

Also take into account that the MyISAM storage engine needs two file descriptors for each unique open table. To increase the number of file descriptors available to MySQL, set the open_files_limit system variable. See Section B.3.2.16, "File Not Foud and Similar Errors".

The cache of open tables is kept at a level of table_open_cache entries. The server autosizes the cache size at startup. To set the size explicitly, set the table_open_cache system variable at startup. MySQL may temporarily open more tables than this to execute queries, as described later in this section.

MySQL closes an unused table and removes it from the table cache under the following circumstances:
- When the cache is full and a thread tries to open a table that is not in the cache.
- When the cache contains more than table_open_cache entries and a table in the cache is no longer being used by any threads.
- When a table-flushing operation occurs. This happens when someone issues a FLUSH TABLES statement or executes a mysqladmin flush-tables or mysqladmin refresh command.

When the table cache fills up, the server uses the following procedure to locate a cache entry to use:
- Tables not currently in use are released, beginning with the table least recently used.
- If a new table must be opened, but the cache is full and no tables can be released, the cache is temporarily extended as necessary. When the cache is in a temporarily extended state and a table goes from a used to unused state, the table is closed and released from the cache.

A MyISAM table is opened for each concurrent access. This means the table needs to be opened twice if two threads access the same table or if a thread accesses the table twice in the same query (for example, by joining the table to itself). Each concurrent open requires an entry in the table cache. The first open of any MyISAM table takes two file descriptors: one for the data file and one for the index file. Each additional use of the table takes only one file descriptor for the data file. The index file descriptor is shared among all threads.

If you are opening a table with the HANDLER tbl_name OPEN statement, a dedicated table object is allocated for the thread. This table object is not shared by other threads and is not closed until the thread calls HANDLER tbl_name CLOSE or the thread terminates. When this happens, the table is put back in the table cache (if the cache is not full). See Section 15.2.5, "HANDLER Statement".

To determine whether your table cache is too small, check the Opened_tables status variable, which indicates the number of table-opening operations since the server started:
```
mysql> SHOW GLOBAL STATUS LIKE 'Opened_tables';
+----------------+-------+
| Variable_name | Value |
+----------------+-------+
| Opened_tables | 2741 |
+----------------+-------+
```


If the value is very large or increases rapidly, even when you have not issued many FLUSH TABLES statements, increase the table_open_cache value at server startup.

\subsection*{10.4.3.2 Disadvantages of Creating Many Tables in the Same Database}

If you have many MyISAM tables in the same database directory, open, close, and create operations are slow. If you execute SELECT statements on many different tables, there is a little overhead when the table cache is full, because for every table that has to be opened, another must be closed. You can reduce this overhead by increasing the number of entries permitted in the table cache.

\subsection*{10.4.4 Internal Temporary Table Use in MySQL}

In some cases, the server creates internal temporary tables while processing statements. Users have no direct control over when this occurs.

The server creates temporary tables under conditions such as these:
- Evaluation of UNION statements, with some exceptions described later.
- Evaluation of some views, such those that use the TEMPTABLE algorithm, UNION, or aggregation.
- Evaluation of derived tables (see Section 15.2.15.8, "Derived Tables").
- Evaluation of common table expressions (see Section 15.2.20, "WITH (Common Table Expressions)").
- Tables created for subquery or semijoin materialization (see Section 10.2.2, "Optimizing Subqueries, Derived Tables, View References, and Common Table Expressions").
- Evaluation of statements that contain an ORDER BY clause and a different GROUP BY clause, or for which the ORDER BY or GROUP BY contains columns from tables other than the first table in the join queue.
- Evaluation of DISTINCT combined with ORDER BY may require a temporary table.
- For queries that use the SQL_SMALL_RESULT modifier, MySQL uses an in-memory temporary table, unless the query also contains elements (described later) that require on-disk storage.
- To evaluate INSERT ... SELECT statements that select from and insert into the same table, MySQL creates an internal temporary table to hold the rows from the SELECT, then inserts those rows into the target table. See Section 15.2.7.1, "INSERT ... SELECT Statement".
- Evaluation of multiple-table UPDATE statements.
- Evaluation of GROUP_CONCAT( ) or COUNT(DISTINCT) expressions.
- Evaluation of window functions (see Section 14.20 , "Window Functions") uses temporary tables as necessary.

To determine whether a statement requires a temporary table, use EXPLAIN and check the Extra column to see whether it says Using temporary (see Section 10.8.1, "Optimizing Queries with EXPLAIN"). EXPLAIN does not necessarily say Using temporary for derived or materialized temporary tables. For statements that use window functions, EXPLAIN with FORMAT=JSON always provides information about the windowing steps. If the windowing functions use temporary tables, it is indicated for each step.

Some query conditions prevent the use of an in-memory temporary table, in which case the server uses an on-disk table instead:
- Presence of a BLOB or TEXT column in the table. The TempTable storage engine, which is the default storage engine for in-memory internal temporary tables in MySQL 8.4, supports binary large object types. See Internal Temporary Table Storage Engine.
- Presence of any string column with a maximum length larger than 512 (bytes for binary strings, characters for nonbinary strings) in the SELECT list, if UNION or UNION ALL is used.
- The SHOW COLUMNS and DESCRIBE statements use BLOB as the type for some columns, thus the temporary table used for the results is an on-disk table.

The server does not use a temporary table for UNION statements that meet certain qualifications. Instead, it retains from temporary table creation only the data structures necessary to perform result column typecasting. The table is not fully instantiated and no rows are written to or read from it; rows are sent directly to the client. The result is reduced memory and disk requirements, and smaller delay before the first row is sent to the client because the server need not wait until the last query block is executed. EXPLAIN and optimizer trace output reflects this execution strategy: The UNION RESULT query block is not present because that block corresponds to the part that reads from the temporary table.

These conditions qualify a UNION for evaluation without a temporary table:
- The union is UNION ALL, not UNION or UNION DISTINCT.
- There is no global ORDER BY clause.
- The union is not the top-level query block of an \{INSERT\} | REPLACE \} . . . SELECT . . . statement.

\section*{Internal Temporary Table Storage Engine}

An internal temporary table can be held in memory and processed by the TempTable or MEMORY storage engine, or stored on disk by the InnoDB storage engine.

\section*{Storage Engine for In-Memory Internal Temporary Tables}

The internal_tmp_mem_storage_engine variable defines the storage engine used for in-memory internal temporary tables. Permitted values are TempTable (the default) and MEMORY.

\section*{Note \\ Configuring a session setting for internal_tmp_mem_storage_engine requires the SESSION_VARIABLES_ADMIN or SYSTEM_VARIABLES_ADMIN privilege.}

The TempTable storage engine provides efficient storage for VARCHAR and VARBINARY columns, and other binary large object types.

The following variables control TempTable storage engine limits and behavior:
- tmp_table_size: Defines the maximum size of any individual in-memory internal temporary table created using the TempTable storage engine. When the limit determined by tmp_table_size is reached, MySQL automatically converts the in-memory internal temporary table to an InnoDB ondisk internal temporary table. The default value is 16777216 bytes ( 16 MiB ).

The tmp_table_size limit is intended to prevent individual queries from consuming an inordinate amount of global TempTable resources, which can affect the performance of concurrent queries that require such resources. Global TempTable resources are controlled by temptable_max_ram and temptable_max_mmap.

If tmp_table_size is less than temptable_max_ram, it is not possible for an in-memory temporary table to use more than tmp_table_size. If tmp_table_size is greater than the sum of temptable_max_ram and temptable_max_mmap, an in-memory temporary table cannot use more than the sum of the temptable_max_ram and temptable_max_mmap limits.
- temptable_max_ram: Defines the maximum amount of RAM that can be used by the TempTable storage engine before it starts allocating space from memory-mapped files or before MySQL starts using InnoDB on-disk internal temporary tables, depending on your configuration. If not set explicitly, the value of temptable_max_ram is $3 \%$ of the total memory available on the server, with a minimum of 1 GB and a maximum of 4 GB .

> Note
> temptable_max_ram does not account for the thread-local memory block allocated to each thread that uses the TempTable storage engine. The size of the thread-local memory block depends on the size of the thread's first memory allocation request. If the request is less than 1 MB , which it is in most cases, the thread-local memory block size is 1 MB . If the request is greater than 1 MB , the thread-local memory block is approximately the same size as the initial memory request. The thread-local memory block is held in threadlocal storage until thread exit.
- temptable_use_mmap: Controls whether the TempTable storage engine allocates space from memory-mapped files or MySQL uses InnoDB on-disk internal temporary tables when the limit determined by temptable_max_ram is exceeded. The default value is OFF.

\section*{Note}
temptable_use_mmap is deprecated; expect support for it to be removed in a future version of MySQL. Setting temptable_max_mmap=0 is equivalent to setting temptable_use_mmap=0FF.
- temptable_max_mmap: Sets the maximum amount of memory the TempTable storage engine is permitted to allocate from memory-mapped files before MySQL starts using InnoDB on-disk internal temporary tables. The default value is 0 (disabled). The limit is intended to address the risk of memory mapped files using too much space in the temporary directory (tmpdir). temptable_max_mmap $=0$ disables allocation from memory-mapped files, effectively disabling their use, regardless of the value of temptable_use_mmap.

Use of memory-mapped files by the TempTable storage engine is governed by these rules:
- Temporary files are created in the directory defined by the tmpdir variable.
- Temporary files are deleted immediately after they are created and opened, and therefore do not remain visible in the tmpdir directory. The space occupied by temporary files is held by the operating system while temporary files are open. The space is reclaimed when temporary files are closed by the TempTable storage engine, or when the mysqld process is shut down.
- Data is never moved between RAM and temporary files, within RAM, or between temporary files.
- New data is stored in RAM if space becomes available within the limit defined by temptable_max_ram. Otherwise, new data is stored in temporary files.
- If space becomes available in RAM after some of the data for a table is written to temporary files, it is possible for the remaining table data to be stored in RAM.

When using the MEMORY storage engine for in-memory temporary tables (internal_tmp_mem_storage_engine=MEMORY), MySQL automatically converts an in-memory temporary table to an on-disk table if it becomes too large. The maximum size of an in-memory temporary table is defined by the tmp_table_size or max_heap_table_size value, whichever is smaller. This differs from MEMORY tables explicitly created with CREATE TABLE. For such tables, only the max_heap_table_size variable determines how large a table can grow, and there is no conversion to on-disk format.

\section*{Storage Engine for On-Disk Internal Temporary Tables}

MySQL 8.4 uses only the InnoDB storage engine for on-disk internal temporary tables. (The MYISAM storage engine is no longer supported for this purpose.)

InnoDB on-disk internal temporary tables are created in session temporary tablespaces that reside in the data directory by default. For more information, see Section 17.6.3.5, "Temporary Tablespaces".

\section*{Internal Temporary Table Storage Format}

When in-memory internal temporary tables are managed by the TempTable storage engine, rows that include VARCHAR columns, VARBINARY columns, and other binary large object type columns are represented in memory by an array of cells, with each cell containing a NULL flag, the data length, and a data pointer. Column values are placed in consecutive order after the array, in a single region of memory, without padding. Each cell in the array uses 16 bytes of storage. The same storage format applies when the TempTable storage engine allocates space from memory-mapped files.

When in-memory internal temporary tables are managed by the MEMORY storage engine, fixed-length row format is used. VARCHAR and VARBINARY column values are padded to the maximum column length, in effect storing them as CHAR and BINARY columns.

Internal temporary tables on disk are always managed by InnoDB.
When using the MEMORY storage engine, statements can initially create an in-memory internal temporary table and then convert it to an on-disk table if the table becomes too large. In such cases, better performance might be achieved by skipping the conversion and creating the internal temporary table on disk to begin with. The big_tables variable can be used to force disk storage of internal temporary tables.

\section*{Monitoring Internal Temporary Table Creation}

When an internal temporary table is created in memory or on disk, the server increments the Created_tmp_tables value. When an internal temporary table is created on disk, the server increments the Created_tmp_disk_tables value. If too many internal temporary tables are created on disk, consider adjusting the engine-specific limits described in Internal Temporary Table Storage Engine.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1761.jpg?height=115&width=99&top_left_y=575&top_left_x=370)

The memory/temptable/physical_ram and memory/temptable/physical_disk Performance Schema instruments can be used to monitor TempTable space allocation from memory and disk. memory/temptable/physical_ram reports the amount of allocated RAM. memory/temptable/ physical_disk reports the amount of space allocated from disk when memory-mapped files are used as the TempTable overflow mechanism. If the physical_disk instrument reports a value other than 0 and memory-mapped files are used as the TempTable overflow mechanism, a TempTable memory limit was reached at some point. Data can be queried in Performance Schema memory summary tables such as memory_summary_global_by_event_name. See Section 29.12.20.10, "Memory Summary Tables".

\subsection*{10.4.5 Limits on Number of Databases and Tables}

MySQL has no limit on the number of databases. The underlying file system may have a limit on the number of directories.

MySQL has no limit on the number of tables. The underlying file system may have a limit on the number of files that represent tables. Individual storage engines may impose engine-specific constraints. InnoDB permits up to 4 billion tables.

\subsection*{10.4.6 Limits on Table Size}

The effective maximum table size for MySQL databases is usually determined by operating system constraints on file sizes, not by MySQL internal limits. For up-to-date information operating system file size limits, refer to the documentation specific to your operating system.

Windows users, please note that FAT and VFAT (FAT32) are not considered suitable for production use with MySQL. Use NTFS instead.

If you encounter a full-table error, there are several reasons why it might have occurred:
- The disk might be full.
- You are using InnoDB tables and have run out of room in an InnoDB tablespace file. The maximum tablespace size is also the maximum size for a table. For tablespace size limits, see Section 17.21, "InnoDB Limits".

Generally, partitioning of tables into multiple tablespace files is recommended for tables larger than 1 TB in size.
- You have hit an operating system file size limit. For example, you are using MyISAM tables on an operating system that supports files only up to 2 GB in size and you have hit this limit for the data file or index file.
- You are using a MyISAM table and the space required for the table exceeds what is permitted by the internal pointer size. MyISAM permits data and index files to grow up to 256TB by default, but this limit can be changed up to the maximum permissible size of $65,536 \mathrm{~TB}$ ( $256^{7}-1$ bytes).

If you need a MyISAM table that is larger than the default limit and your operating system supports large files, the CREATE TABLE statement supports AVG_ROW_LENGTH and MAX_ROWS options. See Section 15.1.20, "CREATE TABLE Statement". The server uses these options to determine how large a table to permit.

If the pointer size is too small for an existing table, you can change the options with ALTER TABLE to increase a table's maximum permissible size. See Section 15.1.9, "ALTER TABLE Statement".

ALTER TABLE tbl_name MAX_ROWS=1000000000 AVG_ROW_LENGTH=nnn;
You have to specify AVG_ROW_LENGTH only for tables with BLOB or TEXT columns; in this case, MySQL cannot optimize the space required based only on the number of rows.

To change the default size limit for MyISAM tables, set the myisam_data_pointer_size, which sets the number of bytes used for internal row pointers. The value is used to set the pointer size for new tables if you do not specify the MAX_ROWS option. The value of myisam_data_pointer_size can be from 2 to 7 . For example, for tables that use the dynamic storage format, a value of 4 permits tables up to 4 GB ; a value of 6 permits tables up to 256 TB . Tables that use the fixed storage format have a larger maximum data length. For storage format characteristics, see Section 18.2.3, "MyISAM Table Storage Formats".

You can check the maximum data and index sizes by using this statement:
SHOW TABLE STATUS FROM db_name LIKE 'tbl_name';
You also can use myisamchk -dv /path/to/table-index-file. See Section 15.7.7, "SHOW Statements", or Section 6.6.4, "myisamchk - MyISAM Table-Maintenance Utility".

Other ways to work around file-size limits for MyISAM tables are as follows:
- If your large table is read only, you can use myisampack to compress it. myisampack usually compresses a table by at least $50 \%$, so you can have, in effect, much bigger tables. myisampack also can merge multiple tables into a single table. See Section 6.6.6, "myisampack - Generate Compressed, Read-Only MyISAM Tables".
- MySQL includes a MERGE library that enables you to handle a collection of MyISAM tables that have identical structure as a single MERGE table. See Section 18.7, "The MERGE Storage Engine".
- You are using the MEMORY (HEAP) storage engine; in this case you need to increase the value of the max_heap_table_size system variable. See Section 7.1.8, "Server System Variables".

\subsection*{10.4.7 Limits on Table Column Count and Row Size}

This section describes limits on the number of columns in tables and the size of individual rows.
- Column Count Limits
- Row Size Limits

\section*{Column Count Limits}

MySQL has hard limit of 4096 columns per table, but the effective maximum may be less for a given table. The exact column limit depends on several factors:
- The maximum row size for a table constrains the number (and possibly size) of columns because the total length of all columns cannot exceed this size. See Row Size Limits.
- The storage requirements of individual columns constrain the number of columns that fit within a given maximum row size. Storage requirements for some data types depend on factors such as storage engine, storage format, and character set. See Section 13.7, "Data Type Storage Requirements".
- Storage engines may impose additional restrictions that limit table column count. For example, InnoDB has a limit of 1017 columns per table. See Section 17.21, "InnoDB Limits". For information about other storage engines, see Chapter 18, Alternative Storage Engines.
- Functional key parts (see Section 15.1.15, "CREATE INDEX Statement") are implemented as hidden virtual generated stored columns, so each functional key part in a table index counts against the table total column limit.

\section*{Row Size Limits}

The maximum row size for a given table is determined by several factors:
- The internal representation of a MySQL table has a maximum row size limit of 65,535 bytes, even if the storage engine is capable of supporting larger rows. BLOB and TEXT columns only contribute 9 to 12 bytes toward the row size limit because their contents are stored separately from the rest of the row.
- The maximum row size for an InnoDB table, which applies to data stored locally within a database page, is slightly less than half a page for $4 \mathrm{~KB}, 8 \mathrm{~KB}, 16 \mathrm{~KB}$, and 32 KB innodb_page_size settings. For example, the maximum row size is slightly less than 8 KB for the default 16 KB InnoDB page size. For 64 KB pages, the maximum row size is slightly less than 16 KB . See Section 17.21, "InnoDB Limits".

If a row containing variable-length columns exceeds the InnoDB maximum row size, InnoDB selects variable-length columns for external off-page storage until the row fits within the InnoDB row size limit. The amount of data stored locally for variable-length columns that are stored off-page differs by row format. For more information, see Section 17.10, "InnoDB Row Formats".
- Different storage formats use different amounts of page header and trailer data, which affects the amount of storage available for rows.
- For information about InnoDB row formats, see Section 17.10, "InnoDB Row Formats".
- For information about MyISAM storage formats, see Section 18.2.3, "MyISAM Table Storage Formats".

\section*{Row Size Limit Examples}
- The MySQL maximum row size limit of 65,535 bytes is demonstrated in the following InnoDB and MyISAM examples. The limit is enforced regardless of storage engine, even though the storage engine may be capable of supporting larger rows.
```
mysql> CREATE TABLE t (a VARCHAR(10000), b VARCHAR(10000),
    c VARCHAR(10000), d VARCHAR(10000), e VARCHAR(10000),
    f VARCHAR(10000), g VARCHAR(6000)) ENGINE=InnoDB CHARACTER SET latin1;
ERROR 1118 (42000): Row size too large. The maximum row size for the used
table type, not counting BLOBs, is 65535. This includes storage overhead,
check the manual. You have to change some columns to TEXT or BLOBs
```

```
mysql> CREATE TABLE t (a VARCHAR(10000), b VARCHAR(10000),
    c VARCHAR(10000), d VARCHAR(10000), e VARCHAR(10000),
    f VARCHAR(10000), g VARCHAR(6000)) ENGINE=MyISAM CHARACTER SET latin1;
ERROR 1118 (42000): Row size too large. The maximum row size for the used
table type, not counting BLOBs, is 65535. This includes storage overhead,
check the manual. You have to change some columns to TEXT or BLOBs
```


In the following MyISAM example, changing a column to TEXT avoids the 65,535-byte row size limit and permits the operation to succeed because BLOB and TEXT columns only contribute 9 to 12 bytes toward the row size.
```
mysql> CREATE TABLE t (a VARCHAR(10000), b VARCHAR(10000),
    c VARCHAR(10000), d VARCHAR(10000), e VARCHAR(10000),
    f VARCHAR(10000), g TEXT(6000)) ENGINE=MyISAM CHARACTER SET latin1;
Query OK, 0 rows affected (0.02 sec)
```


The operation succeeds for an InnoDB table because changing a column to TEXT avoids the MySQL 65,535-byte row size limit, and InnoDB off-page storage of variable-length columns avoids the InnoDB row size limit.
```
mysql> CREATE TABLE t (a VARCHAR(10000), b VARCHAR(10000),
    c VARCHAR(10000), d VARCHAR(10000), e VARCHAR(10000),
    f VARCHAR(10000), g TEXT(6000)) ENGINE=InnoDB CHARACTER SET latin1;
Query OK, 0 rows affected (0.02 sec)
```

- Storage for variable-length columns includes length bytes, which are counted toward the row size. For example, a VARCHAR(255) CHARACTER SET utf8mb3 column takes two bytes to store the length of the value, so each value can take up to 767 bytes.

The statement to create table t1 succeeds because the columns require $32,765+2$ bytes and $32,766+2$ bytes, which falls within the maximum row size of 65,535 bytes:
```
mysql> CREATE TABLE t1
    (c1 VARCHAR(32765) NOT NULL, c2 VARCHAR(32766) NOT NULL)
    ENGINE = InnoDB CHARACTER SET latin1;
Query OK, 0 rows affected (0.02 sec)
```


The statement to create table t2 fails because, although the column length is within the maximum length of 65,535 bytes, two additional bytes are required to record the length, which causes the row size to exceed 65,535 bytes:
```
mysql> CREATE TABLE t2
    (c1 VARCHAR(65535) NOT NULL)
    ENGINE = InnoDB CHARACTER SET latin1;
ERROR 1118 (42000): Row size too large. The maximum row size for the used
table type, not counting BLOBs, is 65535. This includes storage overhead,
check the manual. You have to change some columns to TEXT or BLOBs
```


Reducing the column length to 65,533 or less permits the statement to succeed.
```
mysql> CREATE TABLE t2
    (c1 VARCHAR(65533) NOT NULL)
    ENGINE = InnoDB CHARACTER SET latin1;
Query OK, 0 rows affected (0.01 sec)
```

- For MyISAM tables, NULL columns require additional space in the row to record whether their values are NULL. Each NULL column takes one bit extra, rounded up to the nearest byte.

The statement to create table t3 fails because MyISAM requires space for NULL columns in addition to the space required for variable-length column length bytes, causing the row size to exceed 65,535 bytes:
```
mysql> CREATE TABLE t3
    (c1 VARCHAR(32765) NULL, c2 VARCHAR(32766) NULL)
    ENGINE = MyISAM CHARACTER SET latin1;
ERROR 1118 (42000): Row size too large. The maximum row size for the used
table type, not counting BLOBs, is 65535. This includes storage overhead,
check the manual. You have to change some columns to TEXT or BLOBs
```


For information about InnoDB NULL column storage, see Section 17.10, "InnoDB Row Formats".
- InnoDB restricts row size (for data stored locally within the database page) to slightly less than half a database page for $4 \mathrm{~KB}, 8 \mathrm{~KB}, 16 \mathrm{~KB}$, and 32 KB innodb_page_size settings, and to slightly less than 16 KB for 64 KB pages.

The statement to create table t4 fails because the defined columns exceed the row size limit for a 16 KB InnoDB page.
```
mysql> CREATE TABLE t4 (
    c1 CHAR(255),c2 CHAR(255),c3 CHAR(255),
    c4 CHAR(255), c5 CHAR(255), c6 CHAR(255),
    c7 CHAR(255),c8 CHAR(255),c9 CHAR(255),
```

```
    c10 CHAR(255),c11 CHAR(255),c12 CHAR(255),
    c13 CHAR(255),c14 CHAR(255),c15 CHAR(255),
    c16 CHAR(255),c17 CHAR(255),c18 CHAR(255),
    c19 CHAR(255), c20 CHAR(255),c21 CHAR(255),
    c22 CHAR(255),c23 CHAR(255),c24 CHAR(255),
    c25 CHAR(255),c26 CHAR(255),c27 CHAR(255),
    c28 CHAR(255),c29 CHAR(255),c30 CHAR(255),
    c31 CHAR(255),c32 CHAR(255),c33 CHAR(255)
    ) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET latin1;
ERROR 1118 (42000): Row size too large (> 8126). Changing some columns to TEXT or BLOB may help.
In current row format, BLOB prefix of 0 bytes is stored inline.
```


\subsection*{10.5 Optimizing for InnoDB Tables}

InnoDB is the storage engine that MySQL customers typically use in production databases where reliability and concurrency are important. InnoDB is the default storage engine in MySQL. This section explains how to optimize database operations for InnoDB tables.

\subsection*{10.5.1 Optimizing Storage Layout for InnoDB Tables}
- Once your data reaches a stable size, or a growing table has increased by tens or some hundreds of megabytes, consider using the OPTIMIZE TABLE statement to reorganize the table and compact any wasted space. The reorganized tables require less disk I/O to perform full table scans. This is a straightforward technique that can improve performance when other techniques such as improving index usage or tuning application code are not practical.

OPTIMIZE TABLE copies the data part of the table and rebuilds the indexes. The benefits come from improved packing of data within indexes, and reduced fragmentation within the tablespaces and on disk. The benefits vary depending on the data in each table. You may find that there are significant gains for some and not for others, or that the gains decrease over time until you next optimize the table. This operation can be slow if the table is large or if the indexes being rebuilt do not fit into the buffer pool. The first run after adding a lot of data to a table is often much slower than later runs.
- In InnoDB, having a long PRIMARY KEY (either a single column with a lengthy value, or several columns that form a long composite value) wastes a lot of disk space. The primary key value for a row is duplicated in all the secondary index records that point to the same row. (See Section 17.6.2.1, "Clustered and Secondary Indexes".) Create an AUTO_INCREMENT column as the primary key if your primary key is long, or index a prefix of a long VARCHAR column instead of the entire column.
- Use the VARCHAR data type instead of CHAR to store variable-length strings or for columns with many NULL values. A CHAR $(N)$ column always takes $N$ characters to store data, even if the string is shorter or its value is NULL. Smaller tables fit better in the buffer pool and reduce disk I/O.

When using COMPACT row format and variable-length character sets, such as utf8mb4 or sjis, CHAR ( $N$ ) columns occupy a variable amount of space, but still at least $N$ bytes.
- For tables that are big, or contain lots of repetitive text or numeric data, consider using COMPRESSED row format. Less disk I/O is required to bring data into the buffer pool, or to perform full table scans. Before making a permanent decision, measure the amount of compression you can achieve by using COMPRESSED versus COMPACT row format.

\subsection*{10.5.2 Optimizing InnoDB Transaction Management}

To optimize InnoDB transaction processing, find the ideal balance between the performance overhead of transactional features and the workload of your server. For example, an application might encounter performance issues if it commits thousands of times per second, and different performance issues if it commits only every $2-3$ hours.
- The default MySQL setting AUTOCOMMIT=1 can impose performance limitations on a busy database server. Where practical, wrap several related data change operations into a single transaction,
by issuing SET AUTOCOMMIT=0 or a START TRANSACTION statement, followed by a COMMIT statement after making all the changes.

InnoDB must flush the log to disk at each transaction commit if that transaction made modifications to the database. When each change is followed by a commit (as with the default autocommit setting), the I/O throughput of the storage device puts a cap on the number of potential operations per second.
- Alternatively, for transactions that consist only of a single SELECT statement, turning on AUTOCOMMIT helps InnoDB to recognize read-only transactions and optimize them. See Section 10.5.3, "Optimizing InnoDB Read-Only Transactions" for requirements.
- Avoid performing rollbacks after inserting, updating, or deleting huge numbers of rows. If a big transaction is slowing down server performance, rolling it back can make the problem worse, potentially taking several times as long to perform as the original data change operations. Killing the database process does not help, because the rollback starts again on server startup.

To minimize the chance of this issue occurring:
- Increase the size of the buffer pool so that all the data change changes can be cached rather than immediately written to disk.
- Set innodb_change_buffering=all so that update and delete operations are buffered in addition to inserts.
- Consider issuing COMMIT statements periodically during the big data change operation, possibly breaking a single delete or update into multiple statements that operate on smaller numbers of rows.

To get rid of a runaway rollback once it occurs, increase the buffer pool so that the rollback becomes CPU-bound and runs fast, or kill the server and restart with innodb_force_recovery=3, as explained in Section 17.18.2, "InnoDB Recovery".
- If you can afford the loss of some of the latest committed transactions if an unexpected exit occurs, you can set the innodb_flush_log_at_trx_commit parameter to 0 . InnoDB tries to flush the log once per second anyway, although the flush is not guaranteed.
- When rows are modified or deleted, the rows and associated undo logs are not physically removed immediately, or even immediately after the transaction commits. The old data is preserved until transactions that started earlier or concurrently are finished, so that those transactions can access the previous state of modified or deleted rows. Thus, a long-running transaction can prevent InnoDB from purging data that was changed by a different transaction.
- When rows are modified or deleted within a long-running transaction, other transactions using the READ COMMITTED and REPEATABLE READ isolation levels have to do more work to reconstruct the older data if they read those same rows.
- When a long-running transaction modifies a table, queries against that table from other transactions do not make use of the covering index technique. Queries that normally could retrieve all the result columns from a secondary index, instead look up the appropriate values from the table data.

If secondary index pages are found to have a PAGE_MAX_TRX_ID that is too new, or if records in the secondary index are delete-marked, InnoDB may need to look up records using a clustered index.

\subsection*{10.5.3 Optimizing InnoDB Read-Only Transactions}

InnoDB can avoid the overhead associated with setting up the transaction ID (TRX_ID field) for transactions that are known to be read-only. A transaction ID is only needed for a transaction that might perform write operations or locking reads such as SELECT ... FOR UPDATE. Eliminating unnecessary transaction IDs reduces the size of internal data structures that are consulted each time a query or data change statement constructs a read view.

InnoDB detects read-only transactions when:
- The transaction is started with the START TRANSACTION READ ONLY statement. In this case, attempting to make changes to the database (for InnoDB, MyISAM, or other types of tables) causes an error, and the transaction continues in read-only state:

ERROR 1792 (25006): Cannot execute statement in a READ ONLY transaction.
You can still make changes to session-specific temporary tables in a read-only transaction, or issue locking queries for them, because those changes and locks are not visible to any other transaction.
- The autocommit setting is turned on, so that the transaction is guaranteed to be a single statement, and the single statement making up the transaction is a "non-locking" SELECT statement. That is, a SELECT that does not use a FOR UPDATE or LOCK IN SHARED MODE clause.
- The transaction is started without the READ ONLY option, but no updates or statements that explicitly lock rows have been executed yet. Until updates or explicit locks are required, a transaction stays in read-only mode.

Thus, for a read-intensive application such as a report generator, you can tune a sequence of InnoDB queries by grouping them inside START TRANSACTION READ ONLY and COMMIT, or by turning on the autocommit setting before running the SELECT statements, or simply by avoiding any data change statements interspersed with the queries.

For information about START TRANSACTION and autocommit, see Section 15.3.1, "START TRANSACTION, COMMIT, and ROLLBACK Statements".

Note
Transactions that qualify as auto-commit, non-locking, and read-only (AC-NLRO) are kept out of certain internal InnoDB data structures and are therefore not listed in SHOW ENGINE INNODB STATUS output.

\subsection*{10.5.4 Optimizing InnoDB Redo Logging}

Consider the following guidelines for optimizing redo logging:
- Increase the size of your redo log files. When InnoDB has written redo log files full, it must write the modified contents of the buffer pool to disk in a checkpoint. Small redo log files cause many unnecessary disk writes.

The redo log file size is determined by innodb_redo_log_capacity. InnoDB tries to maintain 32 redo log files of the same size, with each file equal to $1 / 32$ * innodb_redo_log_capacity. Therefore, changing the innodb_redo_log_capacity setting changes the size of the redo log files.

For information about modifying your redo log file configuration, see Section 17.6.5, "Redo Log".
- Consider increasing the size of the log buffer. A large log buffer enables large transactions to run without a need to write the log to disk before the transactions commit. Thus, if you have transactions that update, insert, or delete many rows, making the log buffer larger saves disk I/O. Log buffer size is configured using the innodb_log_buffer_size configuration option, which can be dynamically configured.
- Configure the innodb_log_write_ahead_size configuration option to avoid "read-on-write". This option defines the write-ahead block size for the redo log. Set innodb_log_write_ahead_size to match the operating system or file system cache block size. Read-on-write occurs when redo log blocks are not entirely cached to the operating system or file system due to a mismatch between write-ahead block size for the redo log and operating system or file system cache block size.

Valid values for innodb_log_write_ahead_size are multiples of the InnoDB log file block size $\left(2^{\mathrm{n}}\right)$. The minimum value is the InnoDB log file block size (512). Write-ahead does not occur
when the minimum value is specified. The maximum value is equal to the innodb_page_size value. If you specify a value for innodb_log_write_ahead_size that is larger than the innodb_page_size value, the innodb_log_write_ahead_size setting is truncated to the innodb_page_size value.

Setting the innodb_log_write_ahead_size value too low in relation to the operating system or file system cache block size results in read-on-write. Setting the value too high may have a slight impact on fsync performance for log file writes due to several blocks being written at once.
- MySQL provides dedicated log writer threads for writing redo log records from the log buffer to the system buffers and flushing the system buffers to the redo log files. You can enable or disable log writer threads using the innodb_log_writer_threads variable. Dedicated log writer threads can improve performance on high-concurrency systems, but for low-concurrency systems, disabling dedicated log writer threads provides better performance.
- Optimize the use of spin delay by user threads waiting for flushed redo. Spin delay helps reduce latency. During periods of low concurrency, reducing latency may be less of a priority, and avoiding the use of spin delay during these periods may reduce energy consumption. During periods of high concurrency, you may want to avoid expending processing power on spin delay so that it can be used for other work. The following system variables permit setting high and low watermark values that define boundaries for the use of spin delay.
- innodb_log_wait_for_flush_spin_hwm: Defines the maximum average log flush time beyond which user threads no longer spin while waiting for flushed redo. The default value is 400 microseconds.
- innodb_log_spin_cpu_abs_lwm: Defines the minimum amount of CPU usage below which user threads no longer spin while waiting for flushed redo. The value is expressed as a sum of CPU core usage. For example, The default value of 80 is $80 \%$ of a single CPU core. On a system with a multi-core processor, a value of 150 represents 100\% usage of one CPU core plus 50\% usage of a second CPU core.
- innodb_log_spin_cpu_pct_hwm: Defines the maximum amount of CPU usage above which user threads no longer spin while waiting for flushed redo. The value is expressed as a percentage of the combined total processing power of all CPU cores. The default value is $50 \%$. For example, 100\% usage of two CPU cores is 50\% of the combined CPU processing power on a server with four CPU cores.

The innodb_log_spin_cpu_pct_hwm configuration option respects processor affinity. For example, if a server has 48 cores but the mysqld process is pinned to only four CPU cores, the other 44 CPU cores are ignored.

\subsection*{10.5.5 Bulk Data Loading for InnoDB Tables}

These performance tips supplement the general guidelines for fast inserts in Section 10.2.5.1, "Optimizing INSERT Statements".
- When importing data into InnoDB, turn off autocommit mode, because it performs a log flush to disk for every insert. To disable autocommit during your import operation, surround it with SET autocommit and COMMIT statements:
```
SET autocommit=0;
... SQL import statements ...
COMMIT;
```


The mysqldump option --opt creates dump files that are fast to import into an InnoDB table, even without wrapping them with the SET autocommit and COMMIT statements.
- If you have UNIQUE constraints on secondary keys, you can speed up table imports by temporarily turning off the uniqueness checks during the import session:
```
SET unique_checks=0;
... SQL import statements ...
SET unique_checks=1;
```


For big tables, this saves a lot of disk I/O because InnoDB can use its change buffer to write secondary index records in a batch. Be certain that the data contains no duplicate keys.
- If you have FOREIGN KEY constraints in your tables, you can speed up table imports by turning off the foreign key checks for the duration of the import session:
```
SET foreign_key_checks=0;
... SQL import statements ...
SET foreign_key_checks=1;
```


For big tables, this can save a lot of disk I/O.
- Use the multiple-row INSERT syntax to reduce communication overhead between the client and the server if you need to insert many rows:
```
INSERT INTO yourtable VALUES (1,2), (5,5), ...;
```


This tip is valid for inserts into any table, not just InnoDB tables.
- When doing bulk inserts into tables with auto-increment columns, set innodb_autoinc_lock_mode to 2 (interleaved) instead of 1 (consecutive). See Section 17.6.1.6, "AUTO_INCREMENT Handling in InnoDB" for details.
- When performing bulk inserts, it is faster to insert rows in PRIMARY KEY order. InnoDB tables use a clustered index, which makes it relatively fast to use data in the order of the PRIMARY KEY. Performing bulk inserts in PRIMARY KEY order is particularly important for tables that do not fit entirely within the buffer pool.
- For optimal performance when loading data into an InnoDB FULLTEXT index, follow this set of steps:
1. Define a column FTS_DOC_ID at table creation time, of type BIGINT UNSIGNED NOT NULL, with a unique index named FTS_DOC_ID_INDEX. For example:
```
CREATE TABLE t1 (
    FTS_DOC_ID BIGINT unsigned NOT NULL AUTO_INCREMENT,
    title varchar(255) NOT NULL DEFAULT '',
    text mediumtext NOT NULL,
PRIMARY KEY (ˋFTS_DOC_IDˋ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE UNIQUE INDEX FTS_DOC_ID_INDEX on t1(FTS_DOC_ID);
```

2. Load the data into the table.
3. Create the FULLTEXT index after the data is loaded.

> Note
> When adding FTS_DOC_ID column at table creation time, ensure that the FTS_DOC_ID column is updated when the FULLTEXT indexed column is updated, as the FTS_DOC_ID must increase monotonically with each INSERT or UPDATE. If you choose not to add the FTS_DOC_ID at table creation time and have InnoDB manage DOC IDs for you, InnoDB adds the FTS_DOC_ID as a hidden column with the next CREATE FULLTEXT INDEX call. This approach, however, requires a table rebuild which can impact performance.
- If loading data into a new MySQL instance, consider disabling redo logging using ALTER INSTANCE \{ENABLE|DISABLE\} INNODB REDO_LOG syntax. Disabling redo logging helps speed up data loading by avoiding redo log writes. For more information, see Disabling Redo Logging.

\section*{Warning}

This feature is intended only for loading data into a new MySQL instance. Do not disable redo logging on a production system. It is permitted to shutdown and restart the server while redo logging is disabled, but an unexpected server stoppage while redo logging is disabled can cause data loss and instance corruption.
- Use MySQL Shell to import data. MySQL Shell's parallel table import utility util.importTable() provides rapid data import to a MySQL relational table for large data files. MySQL Shell's dump loading utility util. loadDump( ) also offers parallel load capabilities. See MySQL Shell Utilities.

\subsection*{10.5.6 Optimizing InnoDB Queries}

To tune queries for InnoDB tables, create an appropriate set of indexes on each table. See Section 10.3.1, "How MySQL Uses Indexes" for details. Follow these guidelines for InnoDB indexes:
- Because each InnoDB table has a primary key (whether you request one or not), specify a set of primary key columns for each table, columns that are used in the most important and time-critical queries.
- Do not specify too many or too long columns in the primary key, because these column values are duplicated in each secondary index. When an index contains unnecessary data, the I/O to read this data and memory to cache it reduce the performance and scalability of the server.
- Do not create a separate secondary index for each column, because each query can only make use of one index. Indexes on rarely tested columns or columns with only a few different values might not be helpful for any queries. If you have many queries for the same table, testing different combinations of columns, try to create a small number of concatenated indexes rather than a large number of single-column indexes. If an index contains all the columns needed for the result set (known as a covering index), the query might be able to avoid reading the table data at all.
- If an indexed column cannot contain any NULL values, declare it as NOT NULL when you create the table. The optimizer can better determine which index is most effective to use for a query, when it knows whether each column contains NULL values.
- You can optimize single-query transactions for InnoDB tables, using the technique in Section 10.5.3, "Optimizing InnoDB Read-Only Transactions".

\subsection*{10.5.7 Optimizing InnoDB DDL Operations}
- Many DDL operations on tables and indexes (CREATE, ALTER, and DROP statements) can be performed online. See Section 17.12, "InnoDB and Online DDL" for details.
- Online DDL support for adding secondary indexes means that you can generally speed up the process of creating and loading a table and associated indexes by creating the table without secondary indexes, then adding secondary indexes after the data is loaded.
- Use TRUNCATE TABLE to empty a table, not DELETE FROM tbl_name. Foreign key constraints can make a TRUNCATE statement work like a regular DELETE statement, in which case a sequence of commands like DROP TABLE and CREATE TABLE might be fastest.
- Because the primary key is integral to the storage layout of each InnoDB table, and changing the definition of the primary key involves reorganizing the whole table, always set up the primary key as part of the CREATE TABLE statement, and plan ahead so that you do not need to ALTER or DROP the primary key afterward.

\subsection*{10.5.8 Optimizing InnoDB Disk I/O}

If you follow best practices for database design and tuning techniques for SQL operations, but your database is still slow due to heavy disk I/O activity, consider these disk I/O optimizations. If the Unix top tool or the Windows Task Manager shows that the CPU usage percentage with your workload is less than 70\%, your workload is probably disk-bound.
- Increase buffer pool size

When table data is cached in the InnoDB buffer pool, it can be accessed repeatedly by queries without requiring any disk I/O. Specify the size of the buffer pool with the innodb_buffer_pool_size option. This memory area is important enough that it is typically recommended that innodb_buffer_pool_size is configured to 50 to 75 percent of system memory. For more information see, Section 10.12.3.1, "How MySQL Uses Memory".
- Adjust the flush method

In some versions of GNU/Linux and Unix, flushing files to disk with the Unix fsync ( ) call and similar methods is surprisingly slow. If database write performance is an issue, conduct benchmarks with the innodb_flush_method parameter set to O_DSYNC.
- Configure a threshold for operating system flushes

By default, when InnoDB creates a new data file, such as a new log file or tablespace file, the file is fully written to the operating system cache before it is flushed to disk, which can cause a large amount of disk write activity to occur at once. To force smaller, periodic flushes of data from the operating system cache, you can use the innodb_fsync_threshold variable to define a threshold value, in bytes. When the byte threshold is reached, the contents of the operating system cache are flushed to disk. The default value of 0 forces the default behavior, which is to flush data to disk only after a file is fully written to the cache.

Specifying a threshold to force smaller, periodic flushes may be beneficial in cases where multiple MySQL instances use the same storage devices. For example, creating a new MySQL instance and its associated data files could cause large surges of disk write activity, impeding the performance of other MySQL instances that use the same storage devices. Configuring a threshold helps avoid such surges in write activity.
- Use fdatasync() instead of fsync()

On platforms that support fdatasync() system calls, the innodb_use_fdatasync variable permits using fdatasync() instead of fsync() for operating system flushes. An fdatasync() system call does not flush changes to file metadata unless required for subsequent data retrieval, providing a potential performance benefit.

A subset of innodb_flush_method settings such as fsync, 0_DSYNC, and 0_DIRECT use fsync() system calls. The innodb_use_fdatasync variable is applicable when using those settings.
- Use a noop or deadline I/O scheduler with native AIO on Linux

InnoDB uses the asynchronous I/O subsystem (native AIO) on Linux to perform read-ahead and write requests for data file pages. This behavior is controlled by the innodb_use_native_aio configuration option, which is enabled by default. With native AIO, the type of I/O scheduler has greater influence on I/O performance. Generally, noop and deadline I/O schedulers are recommended. Conduct benchmarks to determine which I/O scheduler provides the best results for your workload and environment. For more information, see Section 17.8.6, "Using Asynchronous I/O on Linux".
- Use direct I/O on Solaris 10 for x86_64 architecture

When using the InnoDB storage engine on Solaris 10 for $\times 86 \_64$ architecture (AMD Opteron), use direct I/O for InnoDB-related files to avoid degradation of InnoDB performance. To use direct I/O for an entire UFS file system used for storing InnoDB-related files, mount it with the
forcedirectio option; see mount_ufs(1M). (The default on Solaris 10/x86_64 is not to use this option.) To apply direct I/O only to InnoDB file operations rather than the whole file system, set innodb_flush_method = 0_DIRECT. With this setting, InnoDB calls directio() instead of fcntl() for I/O to data files (not for I/O to log files).
- Use raw storage for data and log files with Solaris 2.6 or later

When using the InnoDB storage engine with a large innodb_buffer_pool_size value on any release of Solaris 2.6 and up and any platform (sparc/x86/x64/amd64), conduct benchmarks with InnoDB data files and log files on raw devices or on a separate direct I/O UFS file system, using the forcedirectio mount option as described previously. (It is necessary to use the mount option rather than setting innodb_flush_method if you want direct I/O for the log files.) Users of the Veritas file system VxFS should use the convosync=direct mount option.

Do not place other MySQL data files, such as those for MyISAM tables, on a direct I/O file system. Executables or libraries must not be placed on a direct I/O file system.
- Use additional storage devices

Additional storage devices could be used to set up a RAID configuration. For related information, see Section 10.12.1, "Optimizing Disk I/O".

Alternatively, InnoDB tablespace data files and log files can be placed on different physical disks. For more information, refer to the following sections:
- Section 17.8.1, "InnoDB Startup Configuration"
- Section 17.6.1.2, "Creating Tables Externally"
- Creating a General Tablespace
- Section 17.6.1.4, "Moving or Copying InnoDB Tables"
- Consider non-rotational storage

Non-rotational storage generally provides better performance for random I/O operations; and rotational storage for sequential I/O operations. When distributing data and log files across rotational and non-rotational storage devices, consider the type of I/O operations that are predominantly performed on each file.

Random I/O-oriented files typically include file-per-table and general tablespace data files, undo tablespace files, and temporary tablespace files. Sequential I/O-oriented files include InnoDB system tablespace files, doublewrite files, and log files such as binary log files and redo log files.

Review settings for the following configuration options when using non-rotational storage:
- innodb_checksum_algorithm

The crc32 option uses a faster checksum algorithm and is recommended for fast storage systems.
- innodb_flush_neighbors

Optimizes I/O for rotational storage devices. Disable it for non-rotational storage or a mix of rotational and non-rotational storage. It is disabled by default.
- innodb_idle_flush_pct

Permits placing a limit on page flushing during idle periods, which can help extend the life of nonrotational storage devices.
- innodb_io_capacity

The default setting of 10000 is generally sufficient.
- innodb_io_capacity_max

The default value of (2 * innodb_io_capacity) is intended for most workloads.
- innodb_log_compressed_pages

If redo logs are on non-rotational storage, consider disabling this option to reduce logging. See Disable logging of compressed pages.
- innodb_log_file_size (deprecated)

If redo logs are on non-rotational storage, configure this option to maximize caching and write combining.
- innodb_redo_log_capacity

If redo logs are on non-rotational storage, configure this option to maximize caching and write combining.
- innodb_page_size

Consider using a page size that matches the internal sector size of the disk. Early-generation SSD devices often have a 4 KB sector size. Some newer devices have a 16 KB sector size. The default InnoDB page size is 16 KB . Keeping the page size close to the storage device block size minimizes the amount of unchanged data that is rewritten to disk.
- binlog_row_image

If binary logs are on non-rotational storage and all tables have primary keys, consider setting this option to minimal to reduce logging.

Ensure that TRIM support is enabled for your operating system. It is typically enabled by default.
- Increase I/O capacity to avoid backlogs

If throughput drops periodically because of InnoDB checkpoint operations, consider increasing the value of the innodb_io_capacity configuration option. Higher values cause more frequent flushing, avoiding the backlog of work that can cause dips in throughput.
- Lower I/O capacity if flushing does not fall behind

If the system is not falling behind with InnoDB flushing operations, consider lowering the value of the innodb_io_capacity configuration option. Typically, you keep this option value as low as practical, but not so low that it causes periodic drops in throughput as mentioned in the preceding bullet. In a typical scenario where you could lower the option value, you might see a combination like this in the output from SHOW ENGINE INNODB STATUS:
- History list length low, below a few thousand.
- Insert buffer merges close to rows inserted.
- Modified pages in buffer pool consistently well below innodb_max_dirty_pages_pct of the buffer pool. (Measure at a time when the server is not doing bulk inserts; it is normal during bulk inserts for the modified pages percentage to rise significantly.)
- Log sequence number - Last checkpoint is at less than $7 / 8$ or ideally less than $6 / 8$ of the total size of the InnoDB log files.
- Store system tablespace files on Fusion-io devices

You can take advantage of a doublewrite buffer-related I/O optimization by storing the files that contain the doublewrite storage area on Fusion-io devices that support atomic writes. (The doublewrite buffer storage area resides in doublewrite files. See Section 17.6.4, "Doublewrite Buffer".) When doublewrite storage area files are placed on Fusion-io devices that support atomic writes, the doublewrite buffer is automatically disabled and Fusion-io atomic writes are used for all data files. This feature is only supported on Fusion-io hardware and is only enabled for Fusionio NVMFS on Linux. To take full advantage of this feature, an innodb_flush_method setting of O_DIRECT is recommended.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1774.jpg?height=122&width=99&top_left_y=612&top_left_x=342)

\section*{Note}

Because the doublewrite buffer setting is global, the doublewrite buffer is also disabled for data files that do not reside on Fusion-io hardware.
- Disable logging of compressed pages

When using the InnoDB table compression feature, images of re-compressed pages are written to the redo log when changes are made to compressed data. This behavior is controlled by innodb_log_compressed_pages, which is enabled by default to prevent corruption that can occur if a different version of the zlib compression algorithm is used during recovery. If you are certain that the zlib version is not subject to change, disable innodb_log_compressed_pages to reduce redo log generation for workloads that modify compressed data.

\subsection*{10.5.9 Optimizing InnoDB Configuration Variables}

Different settings work best for servers with light, predictable loads, versus servers that are running near full capacity all the time, or that experience spikes of high activity.

Because the InnoDB storage engine performs many of its optimizations automatically, many performance-tuning tasks involve monitoring to ensure that the database is performing well, and changing configuration options when performance drops. See Section 17.16, "InnoDB Integration with MySQL Performance Schema" for information about detailed InnoDB performance monitoring.

The main configuration steps you can perform include:
- Controlling the types of data change operations for which InnoDB buffers the changed data, to avoid frequent small disk writes. See Configuring Change Buffering. Enabling change buffering can give better performance on IO-bound workloads, but can cause issues during recovery, bulk load, or during buffer pool resizing. Having it disabled (default as of MySQL 8.4) helps ensure stability even if it may lower performance.
- Turning the adaptive hash indexing feature on and off using the innodb_adaptive_hash_index option. See Section 17.5.3, "Adaptive Hash Index" for more information. You might change this setting during periods of unusual activity, then restore it to its original setting.
- Setting a limit on the number of concurrent threads that InnoDB processes, if context switching is a bottleneck. See Section 17.8.4, "Configuring Thread Concurrency for InnoDB".
- Controlling the amount of prefetching that InnoDB does with its read-ahead operations. When the system has unused I/O capacity, more read-ahead can improve the performance of queries. Too much read-ahead can cause periodic drops in performance on a heavily loaded system. See Section 17.8.3.4, "Configuring InnoDB Buffer Pool Prefetching (Read-Ahead)".
- Increasing the number of background threads for read or write operations, if you have a high-end I/O subsystem that is not fully utilized by the default values. See Section 17.8.5, "Configuring the Number of Background InnoDB I/O Threads".
- Controlling how much I/O InnoDB performs in the background. See Section 17.8.7, "Configuring InnoDB I/O Capacity". You might scale back this setting if you observe periodic drops in performance.
- Controlling the algorithm that determines when InnoDB performs certain types of background writes. See Section 17.8.3.5, "Configuring Buffer Pool Flushing". The algorithm works for some types of workloads but not others, so you might disable this feature if you observe periodic drops in performance.
- Taking advantage of multicore processors and their cache memory configuration, to minimize delays in context switching. See Section 17.8.8, "Configuring Spin Lock Polling".
- Preventing one-time operations such as table scans from interfering with the frequently accessed data stored in the InnoDB buffer cache. See Section 17.8.3.3, "Making the Buffer Pool Scan Resistant".
- Adjusting log files to a size that makes sense for reliability and crash recovery. InnoDB log files have often been kept small to avoid long startup times after a crash. Optimizations introduced in MySQL 5.5 speed up certain steps of the crash recovery process. In particular, scanning the redo log and applying the redo log are faster due to improved algorithms for memory management. If you have kept your log files artificially small to avoid long startup times, you can now consider increasing log file size to reduce the I/O that occurs due recycling of redo log records.
- Configuring the size and number of instances for the InnoDB buffer pool, especially important for systems with multi-gigabyte buffer pools. See Section 17.8.3.2, "Configuring Multiple Buffer Pool Instances".
- Increasing the maximum number of concurrent transactions, which dramatically improves scalability for the busiest databases. See Section 17.6.6, "Undo Logs".
- Moving purge operations (a type of garbage collection) into a background thread. See Section 17.8.9, "Purge Configuration". To effectively measure the results of this setting, tune the other I/O-related and thread-related configuration settings first.
- Reducing the amount of switching that InnoDB does between concurrent threads, so that SQL operations on a busy server do not queue up and form a "traffic jam". Set a value for the innodb_thread_concurrency option, up to approximately 32 for a high-powered modern system. Increase the value for the innodb_concurrency_tickets option, typically to 5000 or so. This combination of options sets a cap on the number of threads that InnoDB processes at any one time, and allows each thread to do substantial work before being swapped out, so that the number of waiting threads stays low and operations can complete without excessive context switching.

\subsection*{10.5.10 Optimizing InnoDB for Systems with Many Tables}
- If you have configured non-persistent optimizer statistics (a non-default configuration), InnoDB computes index cardinality values for a table the first time that table is accessed after startup, instead of storing such values in the table. This step can take significant time on systems that partition the data into many tables. Since this overhead only applies to the initial table open operation, to "warm up" a table for later use, access it immediately after startup by issuing a statement such as SELECT 1 FROM tbl_name LIMIT 1.

Optimizer statistics are persisted to disk by default, enabled by the innodb_stats_persistent configuration option. For information about persistent optimizer statistics, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters".

\subsection*{10.6 Optimizing for MyISAM Tables}

The MyISAM storage engine performs best with read-mostly data or with low-concurrency operations, because table locks limit the ability to perform simultaneous updates. In MySQL, InnoDB is the default storage engine rather than MyISAM.

\subsection*{10.6.1 Optimizing MyISAM Queries}

Some general tips for speeding up queries on MyISAM tables:
- To help MySQL better optimize queries, use ANALYZE TABLE or run myisamchk --analyze on a table after it has been loaded with data. This updates a value for each index part that indicates the average number of rows that have the same value. (For unique indexes, this is always 1.) MySQL uses this to decide which index to choose when you join two tables based on a nonconstant expression. You can check the result from the table analysis by using SHOW INDEX FROM tbl_name and examining the Cardinality value. myisamchk --description --verbose shows index distribution information.
- To sort an index and data according to an index, use myisamchk --sort-index --sortrecords=1 (assuming that you want to sort on index 1). This is a good way to make queries faster if you have a unique index from which you want to read all rows in order according to the index. The first time you sort a large table this way, it may take a long time.
- Try to avoid complex SELECT queries on MyISAM tables that are updated frequently, to avoid problems with table locking that occur due to contention between readers and writers.
- MyISAM supports concurrent inserts: If a table has no free blocks in the middle of the data file, you can INSERT new rows into it at the same time that other threads are reading from the table. If it is important to be able to do this, consider using the table in ways that avoid deleting rows. Another possibility is to run OPTIMIZE TABLE to defragment the table after you have deleted a lot of rows from it. This behavior is altered by setting the concurrent_insert variable. You can force new rows to be appended (and therefore permit concurrent inserts), even in tables that have deleted rows. See Section 10.11.3, "Concurrent Inserts".
- For MyISAM tables that change frequently, try to avoid all variable-length columns (VARCHAR, BLOB, and TEXT). The table uses dynamic row format if it includes even a single variable-length column. See Chapter 18, Alternative Storage Engines.
- It is normally not useful to split a table into different tables just because the rows become large. In accessing a row, the biggest performance hit is the disk seek needed to find the first byte of the row. After finding the data, most modern disks can read the entire row fast enough for most applications. The only cases where splitting up a table makes an appreciable difference is if it is a MyISAM table using dynamic row format that you can change to a fixed row size, or if you very often need to scan the table but do not need most of the columns. See Chapter 18, Alternative Storage Engines.
- Use ALTER TABLE ... ORDER BY expr1, expr2, ... if you usually retrieve rows in expr1, expr2, ... order. By using this option after extensive changes to the table, you may be able to get higher performance.
- If you often need to calculate results such as counts based on information from a lot of rows, it may be preferable to introduce a new table and update the counter in real time. An update of the following form is very fast:
```
UPDATE tbl_name SET count_col=count_col+1 WHERE key_col=constant;
```


This is very important when you use MySQL storage engines such as MyISAM that has only tablelevel locking (multiple readers with single writers). This also gives better performance with most database systems, because the row locking manager in this case has less to do.
- Use OPTIMIZE TABLE periodically to avoid fragmentation with dynamic-format MyISAM tables. See Section 18.2.3, "MyISAM Table Storage Formats".
- Declaring a MyISAM table with the DELAY_KEY_WRITE=1 table option makes index updates faster because they are not flushed to disk until the table is closed. The downside is that if something kills the server while such a table is open, you must ensure that the table is okay by running the server with the myisam_recover_options system variable set, or by running myisamchk before restarting the server. (However, even in this case, you should not lose anything by using DELAY_KEY_WRITE, because the key information can always be generated from the data rows.)
- Strings are automatically prefix- and end-space compressed in MyISAM indexes. See Section 15.1.15, "CREATE INDEX Statement".
- You can increase performance by caching queries or answers in your application and then executing many inserts or updates together. Locking the table during this operation ensures that the index cache is only flushed once after all updates.

\subsection*{10.6.2 Bulk Data Loading for MyISAM Tables}

These performance tips supplement the general guidelines for fast inserts in Section 10.2.5.1, "Optimizing INSERT Statements".
- For a MyISAM table, you can use concurrent inserts to add rows at the same time that SELECT statements are running, if there are no deleted rows in middle of the data file. See Section 10.11.3, "Concurrent Inserts".
- With some extra work, it is possible to make LOAD DATA run even faster for a MyISAM table when the table has many indexes. Use the following procedure:
1. Execute a FLUSH TABLES statement or a mysqladmin flush-tables command.
2. Use myisamchk --keys-used=0 -rq /path/to/db/tbl_name to remove all use of indexes for the table.
3. Insert data into the table with LOAD DATA. This does not update any indexes and therefore is very fast.
4. If you intend only to read from the table in the future, use myisampack to compress it. See Section 18.2.3.3, "Compressed Table Characteristics".
5. Re-create the indexes with myisamchk -rq /path/to/db/tbl_name. This creates the index tree in memory before writing it to disk, which is much faster than updating the index during LOAD DATA because it avoids lots of disk seeks. The resulting index tree is also perfectly balanced.
6. Execute a FLUSH TABLES statement or a mysqladmin flush-tables command.

LOAD DATA performs the preceding optimization automatically if the MyISAM table into which you insert data is empty. The main difference between automatic optimization and using the procedure explicitly is that you can let myisamchk allocate much more temporary memory for the index creation than you might want the server to allocate for index re-creation when it executes the LOAD DATA statement.

You can also disable or enable the nonunique indexes for a MyISAM table by using the following statements rather than myisamchk. If you use these statements, you can skip the FLUSH TABLES operations:
```
ALTER TABLE tbl_name DISABLE KEYS;
ALTER TABLE tbl_name ENABLE KEYS;
```

- To speed up INSERT operations that are performed with multiple statements for nontransactional tables, lock your tables:
```
LOCK TABLES a WRITE;
INSERT INTO a VALUES (1,23),(2,34),(4,33);
INSERT INTO a VALUES (8,26),(6,29);
...
UNLOCK TABLES;
```


This benefits performance because the index buffer is flushed to disk only once, after all INSERT statements have completed. Normally, there would be as many index buffer flushes as there are INSERT statements. Explicit locking statements are not needed if you can insert all rows with a single INSERT.

Locking also lowers the total time for multiple-connection tests, although the maximum wait time for individual connections might go up because they wait for locks. Suppose that five clients attempt to perform inserts simultaneously as follows:
- Connection 1 does 1000 inserts
- Connections 2, 3, and 4 do 1 insert
- Connection 5 does 1000 inserts

If you do not use locking, connections 2,3 , and 4 finish before 1 and 5 . If you use locking, connections 2, 3, and 4 probably do not finish before 1 or 5, but the total time should be about $40 \%$ faster.

INSERT, UPDATE, and DELETE operations are very fast in MySQL, but you can obtain better overall performance by adding locks around everything that does more than about five successive inserts or updates. If you do very many successive inserts, you could do a LOCK TABLES followed by an UNLOCK TABLES once in a while (each 1,000 rows or so) to permit other threads to access table. This would still result in a nice performance gain.

INSERT is still much slower for loading data than LOAD DATA, even when using the strategies just outlined.
- To increase performance for MyISAM tables, for both LOAD DATA and INSERT, enlarge the key cache by increasing the key_buffer_size system variable. See Section 7.1.1, "Configuring the Server".

\subsection*{10.6.3 Optimizing REPAIR TABLE Statements}

REPAIR TABLE for MyISAM tables is similar to using myisamchk for repair operations, and some of the same performance optimizations apply:
- myisamchk has variables that control memory allocation. You may be able to its improve performance by setting these variables, as described in Section 6.6.4.6, "myisamchk Memory Usage".
- For REPAIR TABLE, the same principle applies, but because the repair is done by the server, you set server system variables instead of myisamchk variables. Also, in addition to setting memoryallocation variables, increasing the myisam_max_sort_file_size system variable increases the likelihood that the repair uses the faster filesort method and avoids the slower repair by key cache method. Set the variable to the maximum file size for your system, after checking to be sure that there is enough free space to hold a copy of the table files. The free space must be available in the file system containing the original table files.

Suppose that a myisamchk table-repair operation is done using the following options to set its memory-allocation variables:
```
--key_buffer_size=128M --myisam_sort_buffer_size=256M
--read_buffer_size=64M --write_buffer_size=64M
```


Some of those myisamchk variables correspond to server system variables:

\begin{tabular}{|l|l|}
\hline myisamchk Variable & System Variable \\
\hline key_buffer_size & key_buffer_size \\
\hline myisam_sort_buffer_size & myisam_sort_buffer_size \\
\hline read_buffer_size & read_buffer_size \\
\hline write_buffer_size & none \\
\hline
\end{tabular}

Each of the server system variables can be set at runtime, and some of them (myisam_sort_buffer_size, read_buffer_size) have a session value in addition to a global value. Setting a session value limits the effect of the change to your current session and does not affect other users. Changing a global-only variable (key_buffer_size, myisam_max_sort_file_size) affects other users as well. For key_buffer_size, you must take into account that the buffer is shared with those users. For example, if you set the myisamchk key_buffer_size variable to 128 MB , you could set the corresponding key_buffer_size system variable larger than that (if it is not already set larger), to permit key buffer use by activity in other sessions. However, changing the global key buffer size invalidates the buffer, causing increased disk I/O and slowdown for other sessions. An alternative that avoids this problem is to use a separate key cache, assign to it the indexes from the table to be repaired, and deallocate it when the repair is complete. See Section 10.10.2.2, "Multiple Key Caches".

Based on the preceding remarks, a REPAIR TABLE operation can be done as follows to use settings similar to the myisamchk command. Here a separate 128 MB key buffer is allocated and the file system is assumed to permit a file size of at least 100 GB .
```
SET SESSION myisam_sort_buffer_size = 256*1024*1024;
SET SESSION read_buffer_size = 64*1024*1024;
SET GLOBAL myisam_max_sort_file_size = 100*1024*1024*1024;
SET GLOBAL repair_cache.key_buffer_size = 128*1024*1024;
CACHE INDEX tbl_name IN repair_cache;
LOAD INDEX INTO CACHE tbl_name;
REPAIR TABLE tbl_name ;
SET GLOBAL repair_cache.key_buffer_size = 0;
```


If you intend to change a global variable but want to do so only for the duration of a REPAIR TABLE operation to minimally affect other users, save its value in a user variable and restore it afterward. For example:
```
SET @old_myisam_sort_buffer_size = @@GLOBAL.myisam_max_sort_file_size;
SET GLOBAL myisam_max_sort_file_size = 100*1024*1024*1024;
REPAIR TABLE tbl_name ;
SET GLOBAL myisam_max_sort_file_size = @old_myisam_max_sort_file_size;
```


The system variables that affect REPAIR TABLE can be set globally at server startup if you want the values to be in effect by default. For example, add these lines to the server my.cnf file:
```
[mysqld]
myisam_sort_buffer_size=256M
key_buffer_size=1G
myisam_max_sort_file_size=100G
```


These settings do not include read_buffer_size. Setting read_buffer_size globally to a large value does so for all sessions and can cause performance to suffer due to excessive memory allocation for a server with many simultaneous sessions.

\subsection*{10.7 Optimizing for MEMORY Tables}

Consider using MEMORY tables for noncritical data that is accessed often, and is read-only or rarely updated. Benchmark your application against equivalent InnoDB or MyISAM tables under a realistic workload, to confirm that any additional performance is worth the risk of losing data, or the overhead of copying data from a disk-based table at application start.

For best performance with MEMORY tables, examine the kinds of queries against each table, and specify the type to use for each associated index, either a B-tree index or a hash index. On the CREATE INDEX statement, use the clause USING BTREE or USING HASH. B-tree indexes are fast for queries that do greater-than or less-than comparisons through operators such as > or BETWEEN. Hash indexes are only fast for queries that look up single values through the = operator, or a restricted set of values through the IN operator. For why USING BTREE is often a better choice than the default USING HASH, see Section 10.2.1.23, "Avoiding Full Table Scans". For implementation details of the different types of MEMORY indexes, see Section 10.3.9, "Comparison of B-Tree and Hash Indexes".

\subsection*{10.8 Understanding the Query Execution Plan}

Depending on the details of your tables, columns, indexes, and the conditions in your WHERE clause, the MySQL optimizer considers many techniques to efficiently perform the lookups involved in an SQL query. A query on a huge table can be performed without reading all the rows; a join involving several tables can be performed without comparing every combination of rows. The set of operations that the optimizer chooses to perform the most efficient query is called the "query execution plan", also known as the EXPLAIN plan. Your goals are to recognize the aspects of the EXPLAIN plan that indicate a query is optimized well, and to learn the SQL syntax and indexing techniques to improve the plan if you see some inefficient operations.

\subsection*{10.8.1 Optimizing Queries with EXPLAIN}

The EXPLAIN statement provides information about how MySQL executes statements:
- EXPLAIN works with SELECT, DELETE, INSERT, REPLACE, and UPDATE statements.
- When EXPLAIN is used with an explainable statement, MySQL displays information from the optimizer about the statement execution plan. That is, MySQL explains how it would process the statement, including information about how tables are joined and in which order. For information about using EXPLAIN to obtain execution plan information, see Section 10.8.2, "EXPLAIN Output Format".
- When EXPLAIN is used with FOR CONNECTION connection_id rather than an explainable statement, it displays the execution plan for the statement executing in the named connection. See Section 10.8.4, "Obtaining Execution Plan Information for a Named Connection".
- For SELECT statements, EXPLAIN produces additional execution plan information that can be displayed using SHOW WARNINGS. See Section 10.8.3, "Extended EXPLAIN Output Format".
- EXPLAIN is useful for examining queries involving partitioned tables. See Section 26.3.5, "Obtaining Information About Partitions".
- The FORMAT option can be used to select the output format. TRADITIONAL presents the output in tabular format. This is the default if no FORMAT option is present. JSON format displays the information in JSON format.

With the help of EXPLAIN, you can see where you should add indexes to tables so that the statement executes faster by using indexes to find rows. You can also use EXPLAIN to check whether the optimizer joins the tables in an optimal order. To give a hint to the optimizer to use a join order corresponding to the order in which the tables are named in a SELECT statement, begin the statement with SELECT STRAIGHT_JOIN rather than just SELECT. (See Section 15.2.13, "SELECT Statement".) However, STRAIGHT_JOIN may prevent indexes from being used because it disables semijoin transformations. See Optimizing IN and EXISTS Subquery Predicates with Semijoin Transformations.

The optimizer trace may sometimes provide information complementary to that of EXPLAIN. However, the optimizer trace format and content are subject to change between versions. For details, see Section 10.15, "Tracing the Optimizer".

If you have a problem with indexes not being used when you believe that they should be, run ANALYZE TABLE to update table statistics, such as cardinality of keys, that can affect the choices the optimizer makes. See Section 15.7.3.1, "ANALYZE TABLE Statement".

> Note
> EXPLAIN can also be used to obtain information about the columns in a table. EXPLAIN tbl_name is synonymous with DESCRIBE tbl_name and SHOW COLUMNS FROM tbl_name. For more information, see Section 15.8.1, "DESCRIBE Statement", and Section 15.7.7.6, "SHOW COLUMNS Statement".

\subsection*{10.8.2 EXPLAIN Output Format}

The EXPLAIN statement provides information about how MySQL executes statements. EXPLAIN works with SELECT, DELETE, INSERT, REPLACE, and UPDATE statements.

EXPLAIN returns a row of information for each table used in the SELECT statement. It lists the tables in the output in the order that MySQL would read them while processing the statement. This means that MySQL reads a row from the first table, then finds a matching row in the second table, and then in the third table, and so on. When all tables are processed, MySQL outputs the selected columns and backtracks through the table list until a table is found for which there are more matching rows. The next row is read from this table and the process continues with the next table.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1781.jpg?height=227&width=294&top_left_y=758&top_left_x=342)

> Note
> MySQL Workbench has a Visual Explain capability that provides a visual representation of EXPLAIN output. See Tutorial: Using Explain to Improve Query Performance.
- EXPLAIN Output Columns
- EXPLAIN Join Types
- EXPLAIN Extra Information
- EXPLAIN Output Interpretation

\section*{EXPLAIN Output Columns}

This section describes the output columns produced by EXPLAIN. Later sections provide additional information about the type and Extra columns.

Each output row from EXPLAIN provides information about one table. Each row contains the values summarized in Table 10.1, "EXPLAIN Output Columns", and described in more detail following the table. Column names are shown in the table's first column; the second column provides the equivalent property name shown in the output when FORMAT=JSON is used.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 10.1 EXPLAIN Output Columns}
\begin{tabular}{|l|l|l|}
\hline Column & JSON Name & Meaning \\
\hline id & select_id & The SELECT identifier \\
\hline select_type & None & The SELECT type \\
\hline table & table_name & The table for the output row \\
\hline partitions & partitions & The matching partitions \\
\hline type & access_type & The join type \\
\hline possible_keys & possible_keys & The possible indexes to choose \\
\hline key & key & The index actually chosen \\
\hline key_len & key_length & The length of the chosen key \\
\hline ref & ref & The columns compared to the index \\
\hline rows & rows & Estimate of rows to be examined \\
\hline filtered & filtered & Percentage of rows filtered by table condition \\
\hline Extra & None & Additional information \\
\hline
\end{tabular}
\end{table}

\section*{Note}

JSON properties which are NULL are not displayed in JSON-formatted EXPLAIN output.
- id (JSON name: select_id)

The SELECT identifier. This is the sequential number of the SELECT within the query. The value can be NULL if the row refers to the union result of other rows. In this case, the table column shows a value like <union $M$, $N$ > to indicate that the row refers to the union of the rows with id values of $M$ and $N$.
- select_type (JSON name: none)

The type of SELECT, which can be any of those shown in the following table. A JSON-formatted EXPLAIN exposes the SELECT type as a property of a query_block, unless it is SIMPLE or PRIMARY. The JSON names (where applicable) are also shown in the table.

\begin{tabular}{|l|l|l|}
\hline select_type Value & JSON Name & Meaning \\
\hline SIMPLE & None & Simple SELECT (not using UNION or subqueries) \\
\hline PRIMARY & None & Outermost SELECT \\
\hline UNION & None & Second or later SELECT statement in a UNION \\
\hline DEPENDENT UNION & dependent (true) & Second or later SELECT statement in a UNION, dependent on outer query \\
\hline UNION RESULT & union_result & Result of a UNION. \\
\hline SUBQUERY & None & First SELECT in subquery \\
\hline DEPENDENT SUBQUERY & dependent (true) & First SELECT in subquery, dependent on outer query \\
\hline DERIVED & None & Derived table \\
\hline DEPENDENT DERIVED & dependent (true) & Derived table dependent on another table \\
\hline MATERIALIZED & materialized_from_subquer & Materialized subquery \\
\hline UNCACHEABLE SUBQUERY & cacheable (false) & A subquery for which the result cannot be cached and must be re-evaluated for each row of the outer query \\
\hline UNCACHEABLE UNION & cacheable (false) & The second or later select in a UNION that belongs to an uncacheable subquery (see UNCACHEABLE SUBQUERY) \\
\hline
\end{tabular}

DEPENDENT typically signifies the use of a correlated subquery. See Section 15.2.15.7, "Correlated Subqueries".

DEPENDENT SUBQUERY evaluation differs from UNCACHEABLE SUBQUERY evaluation. For DEPENDENT SUBQUERY, the subquery is re-evaluated only once for each set of different values of the variables from its outer context. For UNCACHEABLE SUBQUERY, the subquery is re-evaluated for each row of the outer context.

When you specify FORMAT=JSON with EXPLAIN, the output has no single property directly equivalent to select_type; the query_block property corresponds to a given SELECT. Properties equivalent to most of the SELECT subquery types just shown are available (an example being
materialized_from_subquery for MATERIALIZED), and are displayed when appropriate. There are no JSON equivalents for SIMPLE or PRIMARY.

The select_type value for non-SELECT statements displays the statement type for affected tables. For example, select_type is DELETE for DELETE statements.
- table (JSON name: table_name)

The name of the table to which the row of output refers. This can also be one of the following values:
- <union $M$, $N$ >: The row refers to the union of the rows with id values of $M$ and $N$.
- <derived $N$ >: The row refers to the derived table result for the row with an id value of $N$. A derived table may result, for example, from a subquery in the FROM clause.
- <subquery $N>$ : The row refers to the result of a materialized subquery for the row with an id value of $N$. See Section 10.2.2.2, "Optimizing Subqueries with Materialization".
- partitions (JSON name: partitions)

The partitions from which records would be matched by the query. The value is NULL for nonpartitioned tables. See Section 26.3.5, "Obtaining Information About Partitions".
- type (JSON name: access_type)

The join type. For descriptions of the different types, see EXPLAIN Join Types.
- possible_keys (JSON name: possible_keys)

The possible_keys column indicates the indexes from which MySQL can choose to find the rows in this table. Note that this column is totally independent of the order of the tables as displayed in the output from EXPLAIN. That means that some of the keys in possible_keys might not be usable in practice with the generated table order.

If this column is NULL (or undefined in JSON-formatted output), there are no relevant indexes. In this case, you may be able to improve the performance of your query by examining the WHERE clause to check whether it refers to some column or columns that would be suitable for indexing. If so, create an appropriate index and check the query with EXPLAIN again. See Section 15.1.9, "ALTER TABLE Statement".

To see what indexes a table has, use SHOW INDEX FROM tbl_name.
- key (JSON name: key)

The key column indicates the key (index) that MySQL actually decided to use. If MySQL decides to use one of the possible_keys indexes to look up rows, that index is listed as the key value.

It is possible that key may name an index that is not present in the possible_keys value. This can happen if none of the possible_keys indexes are suitable for looking up rows, but all the columns selected by the query are columns of some other index. That is, the named index covers
the selected columns, so although it is not used to determine which rows to retrieve, an index scan is more efficient than a data row scan.

For InnoDB, a secondary index might cover the selected columns even if the query also selects the primary key because InnoDB stores the primary key value with each secondary index. If key is NULL, MySQL found no index to use for executing the query more efficiently.

To force MySQL to use or ignore an index listed in the possible_keys column, use FORCE INDEX, USE INDEX, or IGNORE INDEX in your query. See Section 10.9.4, "Index Hints".

For MyISAM tables, running ANALYZE TABLE helps the optimizer choose better indexes. For MyISAM tables, myisamchk - - analyze does the same. See Section 15.7.3.1, "ANALYZE TABLE Statement", and Section 9.6, "MyISAM Table Maintenance and Crash Recovery".
- key_len (JSON name: key_length)

The key_len column indicates the length of the key that MySQL decided to use. The value of key_len enables you to determine how many parts of a multiple-part key MySQL actually uses. If the key column says NULL, the key_len column also says NULL.

Due to the key storage format, the key length is one greater for a column that can be NULL than for a NOT NULL column.
- ref (JSON name: ref)

The ref column shows which columns or constants are compared to the index named in the key column to select rows from the table.

If the value is func, the value used is the result of some function. To see which function, use SHOW WARNINGS following EXPLAIN to see the extended EXPLAIN output. The function might actually be an operator such as an arithmetic operator.
- rows (JSON name: rows)

The rows column indicates the number of rows MySQL believes it must examine to execute the query.

For InnoDB tables, this number is an estimate, and may not always be exact.
- filtered (JSON name: filtered)

The filtered column indicates an estimated percentage of table rows that are filtered by the table condition. The maximum value is 100 , which means no filtering of rows occurred. Values decreasing from 100 indicate increasing amounts of filtering. rows shows the estimated number of rows examined and rows × filtered shows the number of rows that are joined with the following table. For example, if rows is 1000 and filtered is $50.00(50 \%)$, the number of rows to be joined with the following table is $1000 \times 50 \%=500$.
- Extra (JSON name: none)

This column contains additional information about how MySQL resolves the query. For descriptions of the different values, see EXPLAIN Extra Information.

There is no single JSON property corresponding to the Extra column; however, values that can occur in this column are exposed as JSON properties, or as the text of the message property.

\section*{EXPLAIN Join Types}

The type column of EXPLAIN output describes how tables are joined. In JSON-formatted output, these are found as values of the access_type property. The following list describes the join types, ordered from the best type to the worst:
- system

The table has only one row (= system table). This is a special case of the const join type.
- const

The table has at most one matching row, which is read at the start of the query. Because there is only one row, values from the column in this row can be regarded as constants by the rest of the optimizer. const tables are very fast because they are read only once.
const is used when you compare all parts of a PRIMARY KEY or UNIQUE index to constant values. In the following queries, tbl_name can be used as a const table:
```
SELECT * FROM tbl_name WHERE primary_key=1;
SELECT * FROM tbl_name
    WHERE primary_key_part1=1 AND primary_key_part2=2;
```

- eq_ref

One row is read from this table for each combination of rows from the previous tables. Other than the system and const types, this is the best possible join type. It is used when all parts of an index are used by the join and the index is a PRIMARY KEY or UNIQUE NOT NULL index.
eq_ref can be used for indexed columns that are compared using the = operator. The comparison value can be a constant or an expression that uses columns from tables that are read before this table. In the following examples, MySQL can use an eq_ref join to process ref_table:
```
SELECT * FROM ref_table,other_table
    WHERE ref_table.key_column=other_table.column;
SELECT * FROM ref_table,other_table
    WHERE ref_table.key_column_part1=other_table.column
    AND ref_table.key_column_part2=1;
```

- ref

All rows with matching index values are read from this table for each combination of rows from the previous tables. ref is used if the join uses only a leftmost prefix of the key or if the key is not a PRIMARY KEY or UNIQUE index (in other words, if the join cannot select a single row based on the key value). If the key that is used matches only a few rows, this is a good join type.
ref can be used for indexed columns that are compared using the = or <=> operator. In the following examples, MySQL can use a ref join to process ref_table:
```
SELECT * FROM ref_table WHERE key_column=expr;
SELECT * FROM ref_table,other_table
    WHERE ref_table.key_column=other_table.column;
SELECT * FROM ref_table,other_table
    WHERE ref_table.key_column_part1=other_table.column
    AND ref_table.key_column_part2=1;
```

- fulltext

The join is performed using a FULLTEXT index.
- ref_or_null

This join type is like ref, but with the addition that MySQL does an extra search for rows that contain NULL values. This join type optimization is used most often in resolving subqueries. In the following examples, MySQL can use a ref_or_null join to process ref_table:
```
WHERE key_column=expr OR key_column IS NULL;
```


See Section 10.2.1.15, "IS NULL Optimization".
- index_merge

This join type indicates that the Index Merge optimization is used. In this case, the key column in the output row contains a list of indexes used, and key_len contains a list of the longest key parts for the indexes used. For more information, see Section 10.2.1.3, "Index Merge Optimization".
- unique_subquery

This type replaces eq_ref for some IN subqueries of the following form:
```
value IN (SELECT primary_key FROM single_table WHERE some_expr)
```

unique_subquery is just an index lookup function that replaces the subquery completely for better efficiency.
- index_subquery

This join type is similar to unique_subquery. It replaces IN subqueries, but it works for nonunique indexes in subqueries of the following form:
```
value IN (SELECT key_column FROM single_table WHERE some_expr)
```

- range

Only rows that are in a given range are retrieved, using an index to select the rows. The key column in the output row indicates which index is used. The key_len contains the longest key part that was used. The ref column is NULL for this type.
range can be used when a key column is compared to a constant using any of the $=,<>,>,>=,<$, <=, IS NULL, <=>, BETWEEN, LIKE, or IN() operators:
```
SELECT * FROM tbl_name
    WHERE key_column = 10;
SELECT * FROM tbl_name
    WHERE key_column BETWEEN 10 and 20;
SELECT * FROM tbl_name
    WHERE key_column IN (10,20,30);
SELECT * FROM tbl_name
    WHERE key_part1 = 10 AND key_part2 IN (10,20,30);
```

- index

The index join type is the same as ALL, except that the index tree is scanned. This occurs two ways:
- If the index is a covering index for the queries and can be used to satisfy all data required from the table, only the index tree is scanned. In this case, the Extra column says Using index. An index-only scan usually is faster than ALL because the size of the index usually is smaller than the table data.
- A full table scan is performed using reads from the index to look up data rows in index order. Uses index does not appear in the Extra column.

MySQL can use this join type when the query uses only columns that are part of a single index.
- ALL

A full table scan is done for each combination of rows from the previous tables. This is normally not good if the table is the first table not marked const, and usually very bad in all other cases. Normally, you can avoid ALL by adding indexes that enable row retrieval from the table based on constant values or column values from earlier tables.

\section*{EXPLAIN Extra Information}

The Extra column of EXPLAIN output contains additional information about how MySQL resolves the query. The following list explains the values that can appear in this column. Each item also indicates for JSON-formatted output which property displays the Extra value. For some of these, there is a specific property. The others display as the text of the message property.

If you want to make your queries as fast as possible, look out for Extra column values of Using filesort and Using temporary, or, in JSON-formatted EXPLAIN output, for using_filesort and using_temporary_table properties equal to true.
- Backward index scan (JSON: backward_index_scan)

The optimizer is able to use a descending index on an InnoDB table. Shown together with Using index. For more information, see Section 10.3.13, "Descending Indexes".
- Child of 'table' pushed join@1(JSON: message text)

This table is referenced as the child of table in a join that can be pushed down to the NDB kernel. Applies only in NDB Cluster, when pushed-down joins are enabled. See the description of the ndb_join_pushdown server system variable for more information and examples.
- const row not found (JSON property: const_row_not_found)

For a query such as SELECT ... FROM tbl_name, the table was empty.
- Deleting all rows (JSON property: message)

For DELETE, some storage engines (such as MyISAM) support a handler method that removes all table rows in a simple and fast way. This Extra value is displayed if the engine uses this optimization.
- Distinct (JSON property: distinct)

MySQL is looking for distinct values, so it stops searching for more rows for the current row combination after it has found the first matching row.
- FirstMatch(tbl_name) (JSON property: first_match)

The semijoin FirstMatch join shortcutting strategy is used for tbl_name.
- Full scan on NULL key (JSON property: message)

This occurs for subquery optimization as a fallback strategy when the optimizer cannot use an indexlookup access method.
- Impossible HAVING (JSON property: message)

The HAVING clause is always false and cannot select any rows.
- Impossible WHERE (JSON property: message)

The WHERE clause is always false and cannot select any rows.
- Impossible WHERE noticed after reading const tables (JSON property: message) MySQL has read all const (and system) tables and notice that the WHERE clause is always false.
- LooseScan ( $m$. . $n$ ) (JSON property: message)

The semijoin LooseScan strategy is used. $m$ and $n$ are key part numbers.
- No matching min/max row (JSON property: message)

No row satisfies the condition for a query such as SELECT MIN (...) FROM ... WHERE condition.
- no matching row in const table (JSON property: message)

For a query with a join, there was an empty table or a table with no rows satisfying a unique index condition.
- No matching rows after partition pruning (JSON property: message)

For DELETE or UPDATE, the optimizer found nothing to delete or update after partition pruning. It is similar in meaning to Impossible WHERE for SELECT statements.
- No tables used (JSON property: message)

The query has no FROM clause, or has a FROM DUAL clause.
For INSERT or REPLACE statements, EXPLAIN displays this value when there is no SELECT part. For example, it appears for EXPLAIN INSERT INTO $t \operatorname{VALUES(10)}$ because that is equivalent to EXPLAIN INSERT INTO t SELECT 10 FROM DUAL.
- Not exists (JSON property: message)

MySQL was able to do a LEFT JOIN optimization on the query and does not examine more rows in this table for the previous row combination after it finds one row that matches the LEFT JOIN criteria. Here is an example of the type of query that can be optimized this way:
```
SELECT * FROM t1 LEFT JOIN t2 ON t1.id=t2.id
    WHERE t2.id IS NULL;
```


Assume that t2.id is defined as NOT NULL. In this case, MySQL scans t1 and looks up the rows in t2 using the values of t1. id. If MySQL finds a matching row in t2, it knows that t2. id can never be NULL, and does not scan through the rest of the rows in t2 that have the same id value. In other words, for each row in t1, MySQL needs to do only a single lookup in t2, regardless of how many rows actually match in t2.

This can also indicate that a WHERE condition of the form NOT IN (subquery) or NOT EXISTS (subquery) has been transformed internally into an antijoin. This removes the subquery and brings its tables into the plan for the topmost query, providing improved cost planning. By merging semijoins and antijoins, the optimizer can reorder tables in the execution plan more freely, in some cases resulting in a faster plan.

You can see when an antijoin transformation is performed for a given query by checking the Message column from SHOW WARNINGS following execution of EXPLAIN, or in the output of EXPLAIN FORMAT=TREE.

\section*{Note \\ An antijoin is the complement of a semijoin table_a JOIN table_b ON condition. The antijoin returns all rows from table_a for which there is no row in table_b which matches condition.}
- Plan isn't ready yet (JSON property: none)

This value occurs with EXPLAIN FOR CONNECTION when the optimizer has not finished creating the execution plan for the statement executing in the named connection. If execution plan output
comprises multiple lines, any or all of them could have this Extra value, depending on the progress of the optimizer in determining the full execution plan.
- Range checked for each record (index map: N) (JSON property: message)

MySQL found no good index to use, but found that some of indexes might be used after column values from preceding tables are known. For each row combination in the preceding tables, MySQL checks whether it is possible to use a range or index_merge access method to retrieve rows. This is not very fast, but is faster than performing a join with no index at all. The applicability criteria are as described in Section 10.2.1.2, "Range Optimization", and Section 10.2.1.3, "Index Merge Optimization", with the exception that all column values for the preceding table are known and considered to be constants.

Indexes are numbered beginning with 1, in the same order as shown by SHOW INDEX for the table. The index map value $N$ is a bitmask value that indicates which indexes are candidates. For example, a value of $0 \times 19$ (binary 11001) means that indexes 1, 4, and 5 are considered.
- Recursive (JSON property: recursive)

This indicates that the row applies to the recursive SELECT part of a recursive common table expression. See Section 15.2.20, "WITH (Common Table Expressions)".
- Rematerialize (JSON property: rematerialize)

Rematerialize ( $\mathrm{X}, \ldots$ ) is displayed in the EXPLAIN row for table T , where X is any lateral derived table whose rematerialization is triggered when a new row of T is read. For example:
```
SELECT
    ...
FROM
    t,
    LATERAL (derived table that refers to t) AS dt
...
```


The content of the derived table is rematerialized to bring it up to date each time a new row of $t$ is processed by the top query.
- Scanned $N$ databases (JSON property: message)

This indicates how many directory scans the server performs when processing a query for INFORMATION_SCHEMA tables, as described in Section 10.2.3, "Optimizing INFORMATION_SCHEMA Queries". The value of $N$ can be 0,1 , or all.
- Select tables optimized away (JSON property: message)

The optimizer determined 1) that at most one row should be returned, and 2) that to produce this row, a deterministic set of rows must be read. When the rows to be read can be read during the optimization phase (for example, by reading index rows), there is no need to read any tables during query execution.

The first condition is fulfilled when the query is implicitly grouped (contains an aggregate function but no GROUP BY clause). The second condition is fulfilled when one row lookup is performed per index used. The number of indexes read determines the number of rows to read.

Consider the following implicitly grouped query:
```
SELECT MIN(c1), MIN(c2) FROM t1;
```


Suppose that MIN(c1) can be retrieved by reading one index row and MIN(c2) can be retrieved by reading one row from a different index. That is, for each column c1 and c2, there exists an index
where the column is the first column of the index. In this case, one row is returned, produced by reading two deterministic rows.

This Extra value does not occur if the rows to read are not deterministic. Consider this query:
SELECT MIN(c2) FROM t1 WHERE c1 <= 10;
Suppose that (c1, c2) is a covering index. Using this index, all rows with c1 <= 10 must be scanned to find the minimum c2 value. By contrast, consider this query:

SELECT MIN(c2) FROM t1 WHERE c1 = 10;
In this case, the first index row with c1 $=10$ contains the minimum c2 value. Only one row must be read to produce the returned row.

For storage engines that maintain an exact row count per table (such as MyISAM, but not InnoDB), this Extra value can occur for COUNT ( *) queries for which the WHERE clause is missing or always true and there is no GROUP BY clause. (This is an instance of an implicitly grouped query where the storage engine influences whether a deterministic number of rows can be read.)
- Skip_open_table, Open_frm_only, Open_full_table (JSON property: message)

These values indicate file-opening optimizations that apply to queries for INFORMATION_SCHEMA tables.
- Skip_open_table: Table files do not need to be opened. The information is already available from the data dictionary.
- Open_frm_only: Only the data dictionary need be read for table information.
- Open_full_table: Unoptimized information lookup. Table information must be read from the data dictionary and by reading table files.
- Start temporary, End temporary (JSON property: message)

This indicates temporary table use for the semijoin Duplicate Weedout strategy.
- unique row not found (JSON property: message)

For a query such as SELECT ... FROM tbl_name, no rows satisfy the condition for a UNIQUE index or PRIMARY KEY on the table.
- Using filesort (JSON property: using_filesort)

MySQL must do an extra pass to find out how to retrieve the rows in sorted order. The sort is done by going through all rows according to the join type and storing the sort key and pointer to the row for all rows that match the WHERE clause. The keys then are sorted and the rows are retrieved in sorted order. See Section 10.2.1.16, "ORDER BY Optimization".
- Using index (JSON property: using_index)

The column information is retrieved from the table using only information in the index tree without having to do an additional seek to read the actual row. This strategy can be used when the query uses only columns that are part of a single index.

For InnoDB tables that have a user-defined clustered index, that index can be used even when Using index is absent from the Extra column. This is the case if type is index and key is PRIMARY.

Information about any covering indexes used is shown for EXPLAIN FORMAT=TRADITIONAL and EXPLAIN FORMAT=JSON. It is also shown for EXPLAIN FORMAT=TREE.
- Using index condition(JSON property: using_index_condition)

Tables are read by accessing index tuples and testing them first to determine whether to read full table rows. In this way, index information is used to defer ("push down") reading full table rows unless it is necessary. See Section 10.2.1.6, "Index Condition Pushdown Optimization".
- Using index for group-by (JSON property: using_index_for_group_by)

Similar to the Using index table access method, Using index for group-by indicates that MySQL found an index that can be used to retrieve all columns of a GROUP BY or DISTINCT query without any extra disk access to the actual table. Additionally, the index is used in the most efficient way so that for each group, only a few index entries are read. For details, see Section 10.2.1.17, "GROUP BY Optimization".
- Using index for skip scan (JSON property: using_index_for_skip_scan)

Indicates that the Skip Scan access method is used. See Skip Scan Range Access Method.
- Using join buffer (Block Nested Loop), Using join buffer (Batched Key Access), Using join buffer (hash join) (JSON property: using_join_buffer)

Tables from earlier joins are read in portions into the join buffer, and then their rows are used from the buffer to perform the join with the current table. (Block Nested Loop) indicates use of the Block Nested-Loop algorithm, (Batched Key Access) indicates use of the Batched Key Access algorithm, and (hash join) indicates use of a hash join. That is, the keys from the table on the preceding line of the EXPLAIN output are buffered, and the matching rows are fetched in batches from the table represented by the line in which Using join buffer appears.

In JSON-formatted output, the value of using_join_buffer is always one of Block Nested Loop, Batched Key Access, or hash join.

For more information about hash joins, see Section 10.2.1.4, "Hash Join Optimization".
See Batched Key Access Joins, for information about the Batched Key Access algorithm.
- Using MRR (JSON property: message)

Tables are read using the Multi-Range Read optimization strategy. See Section 10.2.1.11, "MultiRange Read Optimization".
- Using sort_union(...), Using union(...), Using intersect(...)(JSON property: message)

These indicate the particular algorithm showing how index scans are merged for the index_merge join type. See Section 10.2.1.3, "Index Merge Optimization".
- Using temporary (JSON property: using_temporary_table)

To resolve the query, MySQL needs to create a temporary table to hold the result. This typically happens if the query contains GROUP BY and ORDER BY clauses that list columns differently.
- Using where (JSON property: attached_condition)

A WHERE clause is used to restrict which rows to match against the next table or send to the client. Unless you specifically intend to fetch or examine all rows from the table, you may have something wrong in your query if the Extra value is not Using where and the table join type is ALL or index.

Using where has no direct counterpart in JSON-formatted output; the attached_condition property contains any WHERE condition used.
- Using where with pushed condition (JSON property: message)

This item applies to NDB tables only. It means that NDB Cluster is using the Condition Pushdown optimization to improve the efficiency of a direct comparison between a nonindexed column and a constant. In such cases, the condition is "pushed down" to the cluster's data nodes and is evaluated on all data nodes simultaneously. This eliminates the need to send nonmatching rows over the network, and can speed up such queries by a factor of 5 to 10 times over cases where Condition Pushdown could be but is not used. For more information, see Section 10.2.1.5, "Engine Condition Pushdown Optimization".
- Zero limit (JSON property: message)

The query had a LIMIT 0 clause and cannot select any rows.

\section*{EXPLAIN Output Interpretation}

You can get a good indication of how good a join is by taking the product of the values in the rows column of the EXPLAIN output. This should tell you roughly how many rows MySQL must examine to execute the query. If you restrict queries with the max_join_size system variable, this row product also is used to determine which multiple-table SELECT statements to execute and which to abort. See Section 7.1.1, "Configuring the Server".

The following example shows how a multiple-table join can be optimized progressively based on the information provided by EXPLAIN.

Suppose that you have the SELECT statement shown here and that you plan to examine it using EXPLAIN:
```
EXPLAIN SELECT tt.TicketNumber, tt.TimeIn,
            tt.ProjectReference, tt.EstimatedShipDate,
            tt.ActualShipDate, tt.ClientID,
            tt.ServiceCodes, tt.RepetitiveID,
            tt.CurrentProcess, tt.CurrentDPPerson,
            tt.RecordVolume, tt.DPPrinted, et.COUNTRY,
            et_1.COUNTRY, do.CUSTNAME
    FROM tt, et, et AS et_1, do
    WHERE tt.SubmitTime IS NULL
        AND tt.ActualPC = et.EMPLOYID
        AND tt.AssignedPC = et_1.EMPLOYID
        AND tt.ClientID = do.CUSTNMBR;
```


For this example, make the following assumptions:
- The columns being compared have been declared as follows.

\begin{tabular}{|l|l|l|}
\hline Table & Column & Data Type \\
\hline tt & ActualPC & CHAR(10) \\
\hline tt & AssignedPC & CHAR(10) \\
\hline tt & ClientID & CHAR(10) \\
\hline et & EMPLOYID & CHAR(15) \\
\hline do & CUSTNMBR & CHAR(15) \\
\hline
\end{tabular}
- The tables have the following indexes.

\begin{tabular}{|l|l|}
\hline Table & Index \\
\hline tt & ActualPC \\
\hline tt & AssignedPC \\
\hline tt & ClientID \\
\hline et & EMPLOYID (primary key) \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Table & Index \\
\hline do & CUSTNMBR (primary key) \\
\hline
\end{tabular}
- The tt .ActualPC values are not evenly distributed.

Initially, before any optimizations have been performed, the EXPLAIN statement produces the following information:
```
table type possible_keys key key_len ref rows Extra
et ALL PRIMARY NULL NULL NULL 74
do ALL PRIMARY NULL NULL NULL 2135
et_1 ALL PRIMARY NULL NULL NULL 74
tt ALL AssignedPC, NULL NULL NULL 3872
    ClientID,
    ActualPC
    Range checked for each record (index map: 0x23)
```


Because type is ALL for each table, this output indicates that MySQL is generating a Cartesian product of all the tables; that is, every combination of rows. This takes quite a long time, because the product of the number of rows in each table must be examined. For the case at hand, this product is 74 $\times 2135 \times 74 \times 3872=45,268,558,720$ rows. If the tables were bigger, you can only imagine how long it would take.

One problem here is that MySQL can use indexes on columns more efficiently if they are declared as the same type and size. In this context, VARCHAR and CHAR are considered the same if they are declared as the same size. tt.ActualPC is declared as CHAR(10) and et.EMPLOYID is CHAR(15), so there is a length mismatch.

To fix this disparity between column lengths, use ALTER TABLE to lengthen ActualPC from 10 characters to 15 characters:
```
mysql> ALTER TABLE tt MODIFY ActualPC VARCHAR(15);
```


Now tt.ActualPC and et.EMPLOYID are both VARCHAR(15). Executing the EXPLAIN statement again produces this result:
```
\begin{array} { l l l l l l } { \text { table type} } & { \text { possible_keys key key_len ref } } & { \text { rows } } & { \text { Extra } } \\ { \text { tt } } & { \text { ALL } } & { \text { AssignedPC, NULL } } & { \text { NULL NULL } } & { 3 8 7 2 } & { \text { Using} } \end{array}

ClientID, where
do ALL ActualPC $\begin{aligned} & \text { PRIMARY NULL NULL NULL } \\ & \text { 2135 }\end{aligned}$
```

```
Range checked for each record (index map: 0x1)
```

```
et_1 ALL PRIMARY NULL NULL NULL 74
    Range checked for each record (index map: 0x1)
et eq_ref PRIMARY PRIMARY 15 tt.ActualPC 1
```


This is not perfect, but is much better: The product of the rows values is less by a factor of 74 . This version executes in a couple of seconds.

A second alteration can be made to eliminate the column length mismatches for the tt . AssignedPC = et_1.EMPLOYID and tt.ClientID = do.CUSTNMBR comparisons:
```
mysql> ALTER TABLE tt MODIFY AssignedPC VARCHAR(15),
    MODIFY ClientID VARCHAR(15);
```


After that modification, EXPLAIN produces the output shown here:

\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline table & type & possible_keys & key & key_len & ref & rows & Extra \\
\hline et & ALL & PRIMARY & NULL & NULL & NULL & 74 & \\
\hline tt & ref & AssignedPC, ClientID, ActualPC & ActualPC & 15 & et.EMPLOYID & 52 & Using where \\
\hline et_1 & eq_ref & PRIMARY & PRIMARY & 15 & tt.AssignedPC & 1 & \\
\hline do & eq_ref & PRIMARY & PRIMARY & 15 & tt.ClientID & 1 & \\
\hline
\end{tabular}

At this point, the query is optimized almost as well as possible. The remaining problem is that, by default, MySQL assumes that values in the tt .ActualPC column are evenly distributed, and that is not the case for the tt table. Fortunately, it is easy to tell MySQL to analyze the key distribution:
```
mysql> ANALYZE TABLE tt;
```


With the additional index information, the join is perfect and EXPLAIN produces this result:
```
table type possible_keys key key_len ref rows Extra

tt ALL \begin{tabular}{l} 
AssignedPC NULL NULL NULL \\
ClientID,
\end{tabular} 3872 Using
    ActualPC
et eq_ref PRIMARY PRIMARY 15 tt.ActualPC 1
et_1 eq_ref PRIMARY PRIMARY 15 tt.AssignedPC 1
do eq_ref PRIMARY PRIMARY 15 tt.ClientID 1
```


The rows column in the output from EXPLAIN is an educated guess from the MySQL join optimizer. Check whether the numbers are even close to the truth by comparing the rows product with the actual number of rows that the query returns. If the numbers are quite different, you might get better performance by using STRAIGHT_JOIN in your SELECT statement and trying to list the tables in a different order in the FROM clause. (However, STRAIGHT_JOIN may prevent indexes from being used because it disables semijoin transformations. See Optimizing IN and EXISTS Subquery Predicates with Semijoin Transformations.)

It is possible in some cases to execute statements that modify data when EXPLAIN SELECT is used with a subquery; for more information, see Section 15.2.15.8, "Derived Tables".

\subsection*{10.8.3 Extended EXPLAIN Output Format}

The EXPLAIN statement produces extra ("extended") information that is not part of EXPLAIN output but can be viewed by issuing a SHOW WARNINGS statement following EXPLAIN. Extended information is available for SELECT, DELETE, INSERT, REPLACE, and UPDATE statements.

The Message value in SHOW WARNINGS output displays how the optimizer qualifies table and column names in the SELECT statement, what the SELECT looks like after the application of rewriting and optimization rules, and possibly other notes about the optimization process.

The extended information displayable with a SHOW WARNINGS statement following EXPLAIN is produced only for SELECT statements. SHOW WARNINGS displays an empty result for other explainable statements (DELETE, INSERT, REPLACE, and UPDATE).

Here is an example of extended EXPLAIN output:
```
mysql> EXPLAIN
            SELECT t1.a, t1.a IN (SELECT t2.a FROM t2) FROM t1\G
************************** 1. row ******************************
                    id: 1
    select_type: PRIMARY
                table: t1
                    type: index
possible_keys: NULL
                    key: PRIMARY
            key_len: 4
                    ref: NULL
                rows: 4
        filtered: 100.00
                Extra: Using index
************************** 2. row *****************************************
                        id: 2
    select_type: SUBQUERY
            table: t2
                type: index
possible_keys: a
                    key: a
        key_len: 5
                ref: NULL
```

```
            rows: 3
        filtered: 100.00
            Extra: Using index
2 rows in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
************************* 1. row *******************************
    Level: Note
        Code: 1003
Message: /* select#1 */ select ˋtestˋ.ˋt1ˋ.ˋaˋ AS ˋaˋ,
            <in_optimizer>(ˋtestˋ.ˋt1ˋ.ˋaˋ,ˋtestˋ.ˋt1ˋ.ˋaˋ in
            ( <materialize> (/* select#2 */ select ˋtestˋ.ˋt2ˋ.ˋaˋ
            from ˋtestˋ.ˋt2ˋ where 1 having 1 ),
            <primary_index_lookup>(ˋtestˋ.ˋt1ˋ.ˋaˋ in
            <temporary table> on <auto_key>
            where ((ˋtestˋ.ˋt1ˋ.ˋaˋ = ˋmaterialized-subqueryˋ.ˋaˋ))))) AS ˋt1.a
            IN (SELECT t2.a FROM t2)ˋ from ˋtestˋ.ˋt1ˋ
1 row in set (0.00 sec)
```


Because the statement displayed by SHOW WARNINGS may contain special markers to provide information about query rewriting or optimizer actions, the statement is not necessarily valid SQL and is not intended to be executed. The output may also include rows with Message values that provide additional non-SQL explanatory notes about actions taken by the optimizer.

The following list describes special markers that can appear in the extended output displayed by SHOW WARNINGS:
- <auto_key>

An automatically generated key for a temporary table.
- <cache>(expr)

The expression (such as a scalar subquery) is executed once and the resulting value is saved in memory for later use. For results consisting of multiple values, a temporary table may be created and <temporary table> is shown instead.
- <exists>(query fragment)

The subquery predicate is converted to an EXISTS predicate and the subquery is transformed so that it can be used together with the EXISTS predicate.
- <in_optimizer>(query fragment)

This is an internal optimizer object with no user significance.
- <index_lookup>(query fragment)

The query fragment is processed using an index lookup to find qualifying rows.
- <if>(condition, expr1, expr2)

If the condition is true, evaluate to expr1, otherwise expr2.
- <is_not_null_test>(expr)

A test to verify that the expression does not evaluate to NULL.
- <materialize>(query fragment)

Subquery materialization is used.
- ˋmaterialized-subqueryˋ.col_name

A reference to the column col_name in an internal temporary table materialized to hold the result from evaluating a subquery.
- <primary_index_lookup>(query fragment)

The query fragment is processed using a primary key lookup to find qualifying rows.
- <ref_null_helper>(expr)

This is an internal optimizer object with no user significance.
- /* select\#N */ select_stmt

The SELECT is associated with the row in non-extended EXPLAIN output that has an id value of $N$.
- outer_tables semi join (inner_tables)

A semijoin operation. inner_tables shows the tables that were not pulled out. See Optimizing IN and EXISTS Subquery Predicates with Semijoin Transformations.
- <temporary table>

This represents an internal temporary table created to cache an intermediate result.
When some tables are of const or system type, expressions involving columns from these tables are evaluated early by the optimizer and are not part of the displayed statement. However, with FORMAT=JSON, some const table accesses are displayed as a ref access that uses a const value.

\subsection*{10.8.4 Obtaining Execution Plan Information for a Named Connection}

To obtain the execution plan for an explainable statement executing in a named connection, use this statement:

EXPLAIN [options] FOR CONNECTION connection_id;
EXPLAIN FOR CONNECTION returns the EXPLAIN information that is currently being used to execute a query in a given connection. Because of changes to data (and supporting statistics) it may produce a different result from running EXPLAIN on the equivalent query text. This difference in behavior can be useful in diagnosing more transient performance problems. For example, if you are running a statement in one session that is taking a long time to complete, using EXPLAIN FOR CONNECTION in another session may yield useful information about the cause of the delay.
connection_id is the connection identifier, as obtained from the INFORMATION_SCHEMA PROCESSLIST table or the SHOW PROCESSLIST statement. If you have the PROCESS privilege, you can specify the identifier for any connection. Otherwise, you can specify the identifier only for your own connections. In all cases, you must have sufficient privileges to explain the query on the specified connection.

If the named connection is not executing a statement, the result is empty. Otherwise, EXPLAIN FOR CONNECTION applies only if the statement being executed in the named connection is explainable. This includes SELECT, DELETE, INSERT, REPLACE, and UPDATE. (However, EXPLAIN FOR CONNECTION does not work for prepared statements, even prepared statements of those types.)

If the named connection is executing an explainable statement, the output is what you would obtain by using EXPLAIN on the statement itself.

If the named connection is executing a statement that is not explainable, an error occurs. For example, you cannot name the connection identifier for your current session because EXPLAIN is not explainable:
```
mysql> SELECT CONNECTION_ID();
+------------------+
| CONNECTION_ID() |
+------------------+
| 373 |
+-----------------+
```

```
1 row in set (0.00 sec)
mysql> EXPLAIN FOR CONNECTION 373;
ERROR 1889 (HY000): EXPLAIN FOR CONNECTION command is supported
only for SELECT/UPDATE/INSERT/DELETE/REPLACE
```


The Com_explain_other status variable indicates the number of EXPLAIN FOR CONNECTION statements executed.

\subsection*{10.8.5 Estimating Query Performance}

In most cases, you can estimate query performance by counting disk seeks. For small tables, you can usually find a row in one disk seek (because the index is probably cached). For bigger tables, you can estimate that, using B-tree indexes, you need this many seeks to find a row: $\log$ (row_count) / log(index_block_length / 3 * 2 / (index_length + data_pointer_length)) + 1.

In MySQL, an index block is usually 1,024 bytes and the data pointer is usually four bytes. For a 500,000-row table with a key value length of three bytes (the size of MEDIUMINT), the formula indicates $\log (500,000) / \log (1024 / 3 * 2 /(3+4))+1=4$ seeks.

This index would require storage of about $500,000 * 7 * 3 / 2=5.2 \mathrm{MB}$ (assuming a typical index buffer fill ratio of $2 / 3$ ), so you probably have much of the index in memory and so need only one or two calls to read data to find the row.

For writes, however, you need four seek requests to find where to place a new index value and normally two seeks to update the index and write the row.

The preceding discussion does not mean that your application performance slowly degenerates by log $N$. As long as everything is cached by the OS or the MySQL server, things become only marginally slower as the table gets bigger. After the data gets too big to be cached, things start to go much slower until your applications are bound only by disk seeks (which increase by $\log N$ ). To avoid this, increase the key cache size as the data grows. For MyISAM tables, the key cache size is controlled by the key_buffer_size system variable. See Section 7.1.1, "Configuring the Server".

\subsection*{10.9 Controlling the Query Optimizer}

MySQL provides optimizer control through system variables that affect how query plans are evaluated, switchable optimizations, optimizer and index hints, and the optimizer cost model.

The server maintains histogram statistics about column values in the column_statistics data dictionary table (see Section 10.9.6, "Optimizer Statistics"). Like other data dictionary tables, this table is not directly accessible by users. Instead, you can obtain histogram information by querying INFORMATION_SCHEMA. COLUMN_STATISTICS, which is implemented as a view on the data dictionary table. You can also perform histogram management using the ANALYZE TABLE statement.

\subsection*{10.9.1 Controlling Query Plan Evaluation}

The task of the query optimizer is to find an optimal plan for executing an SQL query. Because the difference in performance between "good" and "bad" plans can be orders of magnitude (that is, seconds versus hours or even days), most query optimizers, including that of MySQL, perform a more or less exhaustive search for an optimal plan among all possible query evaluation plans. For join queries, the number of possible plans investigated by the MySQL optimizer grows exponentially with the number of tables referenced in a query. For small numbers of tables (typically less than 7 to 10) this is not a problem. However, when larger queries are submitted, the time spent in query optimization may easily become the major bottleneck in the server's performance.

A more flexible method for query optimization enables the user to control how exhaustive the optimizer is in its search for an optimal query evaluation plan. The general idea is that the fewer plans that are investigated by the optimizer, the less time it spends in compiling a query. On the other hand, because the optimizer skips some plans, it may miss finding an optimal plan.

The behavior of the optimizer with respect to the number of plans it evaluates can be controlled using two system variables:
- The optimizer_prune_level variable tells the optimizer to skip certain plans based on estimates of the number of rows accessed for each table. Our experience shows that this kind of "educated guess" rarely misses optimal plans, and may dramatically reduce query compilation times. That is why this option is on (optimizer_prune_level=1) by default. However, if you believe that the optimizer missed a better query plan, this option can be switched off (optimizer_prune_level=0) with the risk that query compilation may take much longer. Note that, even with the use of this heuristic, the optimizer still explores a roughly exponential number of plans.
- The optimizer_search_depth variable tells how far into the "future" of each incomplete plan the optimizer should look to evaluate whether it should be expanded further. Smaller values of optimizer_search_depth may result in orders of magnitude smaller query compilation times. For example, queries with 12,13 , or more tables may easily require hours and even days to compile if optimizer_search_depth is close to the number of tables in the query. At the same time, if compiled with optimizer_search_depth equal to 3 or 4 , the optimizer may compile in less than a minute for the same query. If you are unsure of what a reasonable value is for optimizer_search_depth, this variable can be set to 0 to tell the optimizer to determine the value automatically.

\subsection*{10.9.2 Switchable Optimizations}

The optimizer_switch system variable enables control over optimizer behavior. Its value is a set of flags, each of which has a value of on or off to indicate whether the corresponding optimizer behavior is enabled or disabled. This variable has global and session values and can be changed at runtime. The global default can be set at server startup.

To see the current set of optimizer flags, select the variable value:
```
mysql> SELECT @@optimizer_switch\G
*************************** 1. rOW ****************************************
@@optimizer_switch: index_merge=on,index_merge_union=on,
    index_merge_sort_union=on,index_merge_intersection=on,
    engine_condition_pushdown=on,index_condition_pushdown=on,
    mrr=on,mrr_cost_based=on,block_nested_loop=on,
    batched_key_access=off,materialization=on,semijoin=on,
    loosescan=on,firstmatch=on,duplicateweedout=on,
    subquery_materialization_cost_based=on,
    use_index_extensions=on,condition_fanout_filter=on,
    derived_merge=on,use_invisible_indexes=off,skip_scan=on,
    hash_join=on,subquery_to_derived=off,
    prefer_ordering_index=on, hypergraph_optimizer=off,
    derived_condition_pushdown=on, hash_set_operations=on
1 row in set (0.00 sec)
```


To change the value of optimizer_switch, assign a value consisting of a comma-separated list of one or more commands:

SET [GLOBAL|SESSION] optimizer_switch='command[,command]...';
Each command value should have one of the forms shown in the following table.

\begin{tabular}{|l|l|}
\hline Command Syntax & Meaning \\
\hline default & Reset every optimization to its default value \\
\hline opt_name=default & Set the named optimization to its default value \\
\hline opt_name=off & Disable the named optimization \\
\hline opt_name=on & Enable the named optimization \\
\hline
\end{tabular}

The order of the commands in the value does not matter, although the default command is executed first if present. Setting an opt_name flag to default sets it to whichever of on or off is its default
value. Specifying any given opt_name more than once in the value is not permitted and causes an error. Any errors in the value cause the assignment to fail with an error, leaving the value of optimizer_switch unchanged.

The following list describes the permissible opt_name flag names, grouped by optimization strategy:
- Batched Key Access Flags
- batched_key_access (default off)

Controls use of BKA join algorithm.
For batched_key_access to have any effect when set to on, the mrr flag must also be on. Currently, the cost estimation for MRR is too pessimistic. Hence, it is also necessary for mrr_cost_based to be off for BKA to be used.

For more information, see Section 10.2.1.12, "Block Nested-Loop and Batched Key Access Joins".
- Block Nested-Loop Flags
- block_nested_loop (default on)

Controls use of hash joins, as do the BNL and NO_BNL optimizer hints.
For more information, see Section 10.2.1.12, "Block Nested-Loop and Batched Key Access Joins".
- Condition Filtering Flags
- condition_fanout_filter (default on)

Controls use of condition filtering.
For more information, see Section 10.2.1.13, "Condition Filtering".
- Derived Condition Pushdown Flags
- derived_condition_pushdown (default on)

Controls derived condition pushdown.
For more information, see Section 10.2.2.5, "Derived Condition Pushdown Optimization"
- Derived Table Merging Flags
- derived_merge (default on)

Controls merging of derived tables and views into outer query block.
The derived_merge flag controls whether the optimizer attempts to merge derived tables, view references, and common table expressions into the outer query block, assuming that no other rule prevents merging; for example, an ALGORITHM directive for a view takes precedence over the derived_merge setting. By default, the flag is on to enable merging.

For more information, see Section 10.2.2.4, "Optimizing Derived Tables, View References, and Common Table Expressions with Merging or Materialization".
- Engine Condition Pushdown Flags
- engine_condition_pushdown (default on)

Controls engine condition pushdown.
For more information, see Section 10.2.1.5, "Engine Condition Pushdown Optimization".
- Hash Join Flags
- hash_join (default on)

Has no effect in MySQL 8.4. Use the block_nested_loop flag, instead.
For more information, see Section 10.2.1.4, "Hash Join Optimization".
- Index Condition Pushdown Flags
- index_condition_pushdown (default on)

Controls index condition pushdown.
For more information, see Section 10.2.1.6, "Index Condition Pushdown Optimization".
- Index Extensions Flags
- use_index_extensions (default on)

Controls use of index extensions.
For more information, see Section 10.3.10, "Use of Index Extensions".
- Index Merge Flags
- index_merge (default on)

Controls all Index Merge optimizations.
- index_merge_intersection (default on)

Controls the Index Merge Intersection Access optimization.
- index_merge_sort_union (default on)

Controls the Index Merge Sort-Union Access optimization.
- index_merge_union (default on)

Controls the Index Merge Union Access optimization.
For more information, see Section 10.2.1.3, "Index Merge Optimization".
- Index Visibility Flags
- use_invisible_indexes (default off)

Controls use of invisible indexes.
For more information, see Section 10.3.12, "Invisible Indexes".
- Limit Optimization Flags
- prefer_ordering_index (default on)

Controls whether, in the case of a query having an ORDER BY or GROUP BY with a LIMIT clause, the optimizer tries to use an ordered index instead of an unordered index, a filesort, or some other optimization. This optimization is performed by default whenever the optimizer determines that using it would allow for faster execution of the query.

Because the algorithm that makes this determination cannot handle every conceivable case (due in part to the assumption that the distribution of data is always more or less uniform), there are
cases in which this optimization may not be desirable. This optimization can be disabled by setting the prefer_ordering_index flag to off.

For more information and examples, see Section 10.2.1.19, "LIMIT Query Optimization".
- Multi-Range Read Flags
- mrr (default on)

Controls the Multi-Range Read strategy.
- mrr_cost_based (default on)

Controls use of cost-based MRR if mrr=on.
For more information, see Section 10.2.1.11, "Multi-Range Read Optimization".
- Semijoin Flags
- duplicateweedout (default on)

Controls the semijoin Duplicate Weedout strategy.
- firstmatch (default on)

Controls the semijoin FirstMatch strategy.
- loosescan (default on)

Controls the semijoin LooseScan strategy (not to be confused with Loose Index Scan for GROUP BY ).
- semijoin (default on)

Controls all semijoin strategies.
This also applies to the antijoin optimization.
The semijoin, firstmatch, loosescan, and duplicateweedout flags enable control over semijoin strategies. The semijoin flag controls whether semijoins are used. If it is set to on, the firstmatch and loosescan flags enable finer control over the permitted semijoin strategies.

If the duplicateweedout semijoin strategy is disabled, it is not used unless all other applicable strategies are also disabled.

If semijoin and materialization are both on, semijoins also use materialization where applicable. These flags are on by default.

For more information, see Optimizing IN and EXISTS Subquery Predicates with Semijoin Transformations.
- Set Operations Flags
- hash_set_operations (default on)

Enables the hash table optimization for set operations involving EXCEPT and INTERSECT); enabled by default. Otherwise, temporary table based de-duplication is used, as in previous versions of MySQL.

The amount of memory used for hashing by this optimization can be controlled using the set_operations_buffer_size system variable; increasing this generally results in faster execution times for statements using these operations.
- Skip Scan Flags
- skip_scan (default on)

Controls use of Skip Scan access method.
For more information, see Skip Scan Range Access Method.
- Subquery Materialization Flags
- materialization (default on)

Controls materialization (including semijoin materialization).
- subquery_materialization_cost_based (default on)

Use cost-based materialization choice.
The materialization flag controls whether subquery materialization is used. If semijoin and materialization are both on, semijoins also use materialization where applicable. These flags are on by default.

The subquery_materialization_cost_based flag enables control over the choice between subquery materialization and IN-to-EXISTS subquery transformation. If the flag is on (the default), the optimizer performs a cost-based choice between subquery materialization and IN-to-EXISTS subquery transformation if either method could be used. If the flag is off, the optimizer chooses subquery materialization over IN-to-EXISTS subquery transformation.

For more information, see Section 10.2.2, "Optimizing Subqueries, Derived Tables, View References, and Common Table Expressions".
- Subquery Transformation Flags
- subquery_to_derived (default off)

The optimizer is able in many cases to transform a scalar subquery in a SELECT, WHERE, JOIN, or HAVING clause into a left outer join on a derived table. (Depending on the nullability of the derived table, this can sometimes be simplified further to an inner join.) This can be done for a subquery which meets the following conditions:
- The subquery does not make use of any nondeterministic functions, such as RAND ( ).
- The subquery is not an ANY or ALL subquery which can be rewritten to use MIN( ) or MAX( ).
- The parent query does not set a user variable, since rewriting it may affect the order of execution, which could lead to unexpected results if the variable is accessed more than once in the same query.
- The subquery should not be correlated, that is, it should not reference a column from a table in the outer query, or contain an aggregate that is evaluated in the outer query.

This optimization can also be applied to a table subquery which is the argument to IN, NOT IN, EXISTS, or NOT EXISTS, that does not contain a GROUP BY.

The default value for this flag is off, since, in most cases, enabling this optimization does not produce any noticeable improvement in performance (and in many cases can even make queries run more slowly), but you can enable the optimization by setting the subquery_to_derived flag to on. It is primarily intended for use in testing.

Example, using a scalar subquery:
d
```
mysql> CREATE TABLE t1(a INT);
mysql> CREATE TABLE t2(a INT);
mysql> INSERT INTO t1 VALUES ROW(1), ROW(2), ROW(3), ROW(4);
mysql> INSERT INTO t2 VALUES ROW(1), ROW(2);
mysql> SELECT * FROM t1
        -> WHERE t1.a > (SELECT COUNT(a) FROM t2);
+------+
| a
+------+
        3 |
| 4 |
+------+
mysql> SELECT @@optimizer_switch LIKE '%subquery_to_derived=off%';
+--------------------------------------------------------
| @@optimizer_switch LIKE '%subquery_to_derived=off%' |
+-------------------------------------------------------+
| 1
+--------------------------------------------------------
mysql> EXPLAIN SELECT * FROM t1 WHERE t1.a > (SELECT COUNT(a) FROM t2)\G
************************** 1. row ******************************
                    id: 1
    select_type: PRIMARY
                table: t1
        partitions: NULL
                        type: ALL
possible_keys: NULL
                            key: NULL
                key_len: NULL
                            ref: NULL
                        rows: 4
            filtered: 33.33
                    Extra: Using where
************************** 2. row *****************************************
                            id: 2
    select_type: SUBQUERY
                    table: t2
        partitions: NULL
                        type: ALL
possible_keys: NULL
                            key: NULL
                key_len: NULL
                            ref: NULL
                        rows: 2
            filtered: 100.00
                    Extra: NULL
mysql> SET @@optimizer_switch='subquery_to_derived=on';
mysql> SELECT @@optimizer_switch LIKE '%subquery_to_derived=off%';
+--------------------------------------------------------
| @@optimizer_switch LIKE '%subquery_to_derived=off%' |
+-------------------------------------------------------
    | 0
+-------------------------------------------------------
mysql> SELECT @@optimizer_switch LIKE '%subquery_to_derived=on%';
+--------------------------------------------------------
| @@optimizer_switch LIKE '%subquery_to_derived=on%' |
+-------------------------------------------------------
| 1 |
+-------------------------------------------------------
mysql> EXPLAIN SELECT * FROM t1 WHERE t1.a > (SELECT COUNT(a) FROM t2)\G
*************************** 1. row *****************************
                    id: 1
```

```
    select_type: PRIMARY
                table: <derived2>
        partitions: NULL
                        type: ALL
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
                    table: t1
        partitions: NULL
                        type: ALL
possible_keys: NULL
                        key: NULL
                key_len: NULL
                            ref: NULL
                        rows: 4
            filtered: 33.33
                    Extra: Using where; Using join buffer (hash join)
************************** 3. row ******************************
                            id: 2
    select_type: DERIVED
                    table: t2
        partitions: NULL
                        type: ALL
possible_keys: NULL
                        key: NULL
                key_len: NULL
                            ref: NULL
                        rows: 2
            filtered: 100.00
                    Extra: NULL
```


As can be seen from executing SHOW WARNINGS immediately following the second EXPLAIN statement, with the optimization enabled, the query SELECT * FROM t1 WHERE t1.a > (SELECT COUNT(a) FROM t2) is rewritten in a form similar to what is shown here:
```
SELECT t1.a FROM t1
        JOIN ( SELECT COUNT(t2.a) AS c FROM t2 ) AS d
                WHERE t1.a > d.c;
```


Example, using a query with IN (subquery):
```
mysql> DROP TABLE IF EXISTS t1, t2;
mysql> CREATE TABLE t1 (a INT, b INT);
mysql> CREATE TABLE t2 (a INT, b INT);
mysql> INSERT INTO t1 VALUES ROW(1,10), ROW(2,20), ROW(3,30);
mysql> INSERT INTO t2
        -> VALUES ROW(1,10), ROW(2,20), ROW(3,30), ROW(1,110), ROW(2,120), ROW(3,130);
mysql> SELECT * FROM t1
        -> WHERE t1.b < 0
        -> OR
        -> t1.a IN (SELECT t2.a + 1 FROM t2);
+------+-------+
| a | b |
+------+------+
\begin{array} { l l l l } { l } & { 2 } & { 2 0 } & { 1 } \\ { l } & { 3 } & { 1 } & { 3 0 } \\ { } & { } \end{array}
+------+-------+
mysql> SET @@optimizer_switch="subquery_to_derived=off";
mysql> EXPLAIN SELECT * FROM t1
```

```
        -> WHERE t1.b < 0
        -> OR
        -> t1.a IN (SELECT t2.a + 1 FROM t2)\G
                        *****
                        id: 1
    select_type: PRIMARY
                table: t1
        partitions: NULL
                    type: ALL
possible_keys: NULL
                            key: NULL
                key_len: NULL
                            ref: NULL
                    rows: 3
            filtered: 100.00
                    Extra: Using where
************************** 2. row *****************************************
                            id: 2
    select_type: DEPENDENT SUBQUERY
                    table: t2
        partitions: NULL
                        type: ALL
possible_keys: NULL
                            key: NULL
                key_len: NULL
                            ref: NULL
                        rows: 6
            filtered: 100.00
                    Extra: Using where
mysql> SET @@optimizer_switch="subquery_to_derived=on";
mysql> EXPLAIN SELECT * FROM t1
            -> WHERE t1.b < 0
            -> OR
            -> t1.a IN (SELECT t2.a + 1 FROM t2)\G
    ************************ 1. row *******************************************
                                id: 1
    select_type: PRIMARY
                    table: t1
        partitions: NULL
                        type: ALL
possible_keys: NULL
                            key: NULL
                key_len: NULL
                            ref: NULL
                        rows: 3
            filtered: 100.00
                    Extra: NULL
    ************************ 2. row *******************************************
                            id: 1
    select_type: PRIMARY
                    table: <derived2>
        partitions: NULL
                        type: ref
possible_keys: <auto_key0>
                            key: <auto_key0>
                key_len: 9
                            ref: std2.t1.a
                        rows: 2
            filtered: 100.00
                    Extra: Using where; Using index
************************** 3.row ******************************************
                            id: 2
    select_type: DERIVED
                    table: t2
        partitions: NULL
                        type: ALL
possible_keys: NULL
                        key: NULL
                key_len: NULL
                        ref: NULL
```

```
    rows: 6
filtered: 100.00
    Extra: Using temporary
```


Checking and simplifying the result of SHOW WARNINGS after executing EXPLAIN on this query shows that, when the subquery_to_derived flag enabled, SELECT * FROM t1 WHERE t1.b $<0$ OR t1.a IN (SELECT t2.a +1 FROM t2) is rewritten in a form similar to what is shown here:
```
SELECT a, b FROM t1
    LEFT JOIN (SELECT DISTINCT a + 1 AS e FROM t2) d
    ON t1.a = d.e
    WHERE t1.b < 0
        OR
        d.e IS NOT NULL;
```


Example, using a query with EXISTS (subquery) and the same tables and data as in the previous example:
```
mysql> SELECT * FROM t1
        -> WHERE t1.b < 0
        -> OR
        -> EXISTS(SELECT * FROM t2 WHERE t2.a = t1.a + 1);
+------+-------+
| a | b |
+------+------+
| 1 | 10 |
+------+-------+
mysql> SET @@optimizer_switch="subquery_to_derived=off";
mysql> EXPLAIN SELECT * FROM t1
        -> WHERE t1.b < 0
        -> OR
        -> EXISTS(SELECT * FROM t2 WHERE t2.a = t1.a + 1)\G
*************************** 1. row ******************************
                    id: 1
    select_type: PRIMARY
                table: t1
        partitions: NULL
                    type: ALL
possible_keys: NULL
                        key: NULL
                key_len: NULL
                        ref: NULL
                        rows: 3
            filtered: 100.00
                    Extra: Using where
************************* 2. row *******************************
                        id: 2
    select_type: DEPENDENT SUBQUERY
                    table: t2
        partitions: NULL
                        type: ALL
possible_keys: NULL
                        key: NULL
            key_len: NULL
                        ref: NULL
                    rows: 6
            filtered: 16.67
                Extra: Using where
mysql> SET @@optimizer_switch="subquery_to_derived=on";
mysql> EXPLAIN SELECT * FROM t1
        -> WHERE t1.b < 0
        -> OR
        -> EXISTS(SELECT * FROM t2 WHERE t2.a = t1.a + 1)\G
************************** 1. row *****************************
                    id: 1
```

```
    select_type: PRIMARY
                table: t1
        partitions: NULL
                    type: ALL
possible_keys: NULL
                        key: NULL
            key_len: NULL
                        ref: NULL
                    rows: 3
        filtered: 100.00
                Extra: NULL
************************** 2. row *****************************************
                            id: 1
    select_type: PRIMARY
                table: <derived2>
    partitions: NULL
                    type: ALL
possible_keys: NULL
                        key: NULL
            key_len: NULL
                        ref: NULL
                    rows: 6
        filtered: 100.00
                Extra: Using where; Using join buffer (hash join)
************************** 3. row *****************************************
                            id: 2
    select_type: DERIVED
                table: t2
    partitions: NULL
                    type: ALL
possible_keys: NULL
                        key: NULL
            key_len: NULL
                        ref: NULL
                    rows: 6
        filtered: 100.00
                Extra: Using temporary
```


If we execute SHOW WARNINGS after running EXPLAIN on the query SELECT * FROM t1 WHERE t1.b < 0 OR EXISTS(SELECT * FROM t2 WHERE t2.a = t1.a + 1) when subquery_to_derived has been enabled, and simplify the second row of the result, we see that it has been rewritten in a form which resembles this:
```
SELECT a, b FROM t1
LEFT JOIN (SELECT DISTINCT 1 AS e1, t2.a AS e2 FROM t2) d
ON t1.a + 1 = d.e2
WHERE t1.b < 0
    OR
    d.e1 IS NOT NULL;
```


For more information, see Section 10.2.2.4, "Optimizing Derived Tables, View References, and Common Table Expressions with Merging or Materialization", as well as Section 10.2.1.19, "LIMIT Query Optimization", and Optimizing IN and EXISTS Subquery Predicates with Semijoin Transformations.

When you assign a value to optimizer_switch, flags that are not mentioned keep their current values. This makes it possible to enable or disable specific optimizer behaviors in a single statement without affecting other behaviors. The statement does not depend on what other optimizer flags exist and what their values are. Suppose that all Index Merge optimizations are enabled:
```
mysql> SELECT @@optimizer_switch\G
************************** 1. row ******************************
@@optimizer_switch: index_merge=on,index_merge_union=on,
    index_merge_sort_union=on,index_merge_intersection=on,
    engine_condition_pushdown=on,index_condition_pushdown=on,
    mrr=on,mrr_cost_based=on,block_nested_loop=on,
    batched_key_access=off,materialization=on,semijoin=on,
    loosescan=on, firstmatch=on,
    subquery_materialization_cost_based=on,
```

```
use_index_extensions=on,condition_fanout_filter=on,
derived_merge=on,use_invisible_indexes=off,skip_scan=on,
hash_join=on,subquery_to_derived=off,
prefer_ordering_index=on
```


If the server is using the Index Merge Union or Index Merge Sort-Union access methods for certain queries and you want to check whether the optimizer can perform better without them, set the variable value like this:
```
mysql> SET optimizer_switch='index_merge_union=off,index_merge_sort_union=off';
mysql> SELECT @@optimizer_switch\G
************************** 1. row ******************************
@@optimizer_switch: index_merge=on,index_merge_union=off,
    index_merge_sort_union=off, index_merge_intersection=on,
    engine_condition_pushdown=on,index_condition_pushdown=on,
    mrr=on,mrr_cost_based=on,block_nested_loop=on,
    batched_key_access=off,materialization=on,semijoin=on,
    loosescan=on, firstmatch=on,
    subquery_materialization_cost_based=on,
    use_index_extensions=on,condition_fanout_filter=on,
    derived_merge=on,use_invisible_indexes=off,skip_scan=on,
    hash_join=on,subquery_to_derived=off,
    prefer_ordering_index=on
```


\subsection*{10.9.3 Optimizer Hints}

One means of control over optimizer strategies is to set the optimizer_switch system variable (see Section 10.9.2, "Switchable Optimizations"). Changes to this variable affect execution of all subsequent queries; to affect one query differently from another, it is necessary to change optimizer_switch before each one.

Another way to control the optimizer is by using optimizer hints, which can be specified within individual statements. Because optimizer hints apply on a per-statement basis, they provide finer control over statement execution plans than can be achieved using optimizer_switch. For example, you can enable an optimization for one table in a statement and disable the optimization for a different table. Hints within a statement take precedence over optimizer_switch flags.

Examples:
```
SELECT /*+ NO_RANGE_OPTIMIZATION(t3 PRIMARY, f2_idx) */ f1
    FROM t3 WHERE f1 > 30 AND f1 < 33;
SELECT /*+ BKA(t1) NO_BKA(t2) */ * FROM t1 INNER JOIN t2 WHERE ...;
SELECT /*+ NO_ICP(t1, t2) */ * FROM t1 INNER JOIN t2 WHERE ...;
SELECT /*+ SEMIJOIN(FIRSTMATCH, LOOSESCAN) */ * FROM t1 ...;
EXPLAIN SELECT /*+ NO_ICP(t1) */ * FROM t1 WHERE ...;
SELECT /*+ MERGE(dt) */ * FROM (SELECT * FROM t1) AS dt;
INSERT /*+ SET_VAR(foreign_key_checks=OFF) */ INTO t2 VALUES(2);
```


Optimizer hints, described here, differ from index hints, described in Section 10.9.4, "Index Hints". Optimizer and index hints may be used separately or together.
- Optimizer Hint Overview
- Optimizer Hint Syntax
- Join-Order Optimizer Hints
- Table-Level Optimizer Hints
- Index-Level Optimizer Hints
- Subquery Optimizer Hints
- Statement Execution Time Optimizer Hints
- Variable-Setting Hint Syntax
- Resource Group Hint Syntax
- Optimizer Hints for Naming Query Blocks

\section*{Optimizer Hint Overview}

Optimizer hints apply at different scope levels:
- Global: The hint affects the entire statement
- Query block: The hint affects a particular query block within a statement
- Table-level: The hint affects a particular table within a query block
- Index-level: The hint affects a particular index within a table

The following table summarizes the available optimizer hints, the optimizer strategies they affect, and the scope or scopes at which they apply. More details are given later.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 10.2 Optimizer Hints Available}
\begin{tabular}{|l|l|l|}
\hline Hint Name & Description & Applicable Scopes \\
\hline BKA, NO_BKA & Affects Batched Key Access join processing & Query block, table \\
\hline BNL, NO_BNL & Affects hash join optimization & Query block, table \\
\hline DERIVED_CONDITION_PUSHDOW NO_DERIVED_CONDITION_PUSH & Use or ignore the derived COndition pushdown optimization for materialized derived tables & Query block, table \\
\hline GROUP_INDEX, NO_GROUP_INDEX & Use or ignore the specified index or indexes for index scans in GROUP BY operations & Index \\
\hline HASH_JOIN, NO_HASH_JOIN & Affects Hash Join optimization (No effect in MySQL 8.4) & Query block, table \\
\hline INDEX, NO_INDEX & Acts as the combination of JOIN_INDEX, GROUP_INDEX, and ORDER_INDEX, or as the combination of NO_JOIN_INDEX, NO_GROUP_INDEX, and NO_ORDER_INDEX & Index \\
\hline INDEX_MERGE, NO_INDEX_MERGE & Affects Index Merge optimization & Table, index \\
\hline JOIN_FIXED_ORDER & Use table order specified in FROM clause for join order & Query block \\
\hline JOIN_INDEX, NO_JOIN_INDEX & Use or ignore the specified index or indexes for any access method & Index \\
\hline JOIN_ORDER & Use table order specified in hint for join order & Query block \\
\hline JOIN_PREFIX & Use table order specified in hint for first tables of join order & Query block \\
\hline JOIN_SUFFIX & Use table order specified in hint for last tables of join order & Query block \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Hint Name & Description & Applicable Scopes \\
\hline MAX_EXECUTION_TIME & Limits statement execution time & Global \\
\hline MERGE, NO_MERGE & Affects derived table/view merging into outer query block & Table \\
\hline MRR, NO_MRR & Affects Multi-Range Read optimization & Table, index \\
\hline NO_ICP & Affects Index Condition Pushdown optimization & Table, index \\
\hline NO_RANGE_OPTIMIZATION & Affects range optimization & Table, index \\
\hline ORDER_INDEX, NO_ORDER_INDEX & Use or ignore the specified index or indexes for sorting rows & Index \\
\hline QB_NAME & Assigns name to query block & Query block \\
\hline RESOURCE_GROUP & Set resource group during statement execution & Global \\
\hline SEMIJOIN, NO_SEMIJOIN & Affects semijoin and antijoin strategies & Query block \\
\hline SKIP_SCAN, NO_SKIP_SCAN & Affects Skip Scan optimization & Table, index \\
\hline SET_VAR & Set variable during statement execution & Global \\
\hline SUBQUERY & Affects materialization, IN-to-EXISTS subquery strategies & Query block \\
\hline
\end{tabular}

Disabling an optimization prevents the optimizer from using it. Enabling an optimization means the optimizer is free to use the strategy if it applies to statement execution, not that the optimizer necessarily uses it.

\section*{Optimizer Hint Syntax}

MySQL supports comments in SQL statements as described in Section 11.7, "Comments". Optimizer hints must be specified within /*+ ... */ comments. That is, optimizer hints use a variant of / * . . . */ C-style comment syntax, with a + character following the /* comment opening sequence. Examples:
```
/*+ BKA(t1) */
/*+ BNL(t1, t2) */
/*+ NO_RANGE_OPTIMIZATION(t4 PRIMARY) */
/*+ QB_NAME(qb2) */
```


Whitespace is permitted after the + character.
The parser recognizes optimizer hint comments after the initial keyword of SELECT, UPDATE, INSERT, REPLACE, and DELETE statements. Hints are permitted in these contexts:
- At the beginning of query and data change statements:
```
SELECT /*+ ... */ ...
INSERT /*+ ... */ ...
REPLACE /*+ ... */ ...
UPDATE /*+ ... */ ...
DELETE /*+ ... */ ...
```

- At the beginning of query blocks:
```
(SELECT /*+ ... */ ... )
(SELECT ... ) UNION (SELECT /*+ ... */ ... )
(SELECT /*+ ... */ ... ) UNION (SELECT /*+ ... */ ... )
UPDATE ... WHERE x IN (SELECT /*+ ... */ ...)
INSERT ... SELECT /*+ ... */ ...
```

- In hintable statements prefaced by EXPLAIN. For example:
```
EXPLAIN SELECT /*+ ... */ ...
EXPLAIN UPDATE ... WHERE x IN (SELECT /*+ ... */ ...)
```


The implication is that you can use EXPLAIN to see how optimizer hints affect execution plans. Use SHOW WARNINGS immediately after EXPLAIN to see how hints are used. The extended EXPLAIN output displayed by a following SHOW WARNINGS indicates which hints were used. Ignored hints are not displayed.

A hint comment may contain multiple hints, but a query block cannot contain multiple hint comments. This is valid:
```
SELECT /*+ BNL(t1) BKA(t2) */ ...
```


But this is invalid:
```
SELECT /*+ BNL(t1) */ /* BKA(t2) */ ...
```


When a hint comment contains multiple hints, the possibility of duplicates and conflicts exists. The following general guidelines apply. For specific hint types, additional rules may apply, as indicated in the hint descriptions.
- Duplicate hints: For a hint such as /*+ MRR(idx1) MRR(idx1) */, MySQL uses the first hint and issues a warning about the duplicate hint.
- Conflicting hints: For a hint such as /*+ MRR(idx1) NO_MRR(idx1) */, MySQL uses the first hint and issues a warning about the second conflicting hint.

Query block names are identifiers and follow the usual rules about what names are valid and how to quote them (see Section 11.2, "Schema Object Names").

Hint names, query block names, and strategy names are not case-sensitive. References to table and index names follow the usual identifier case-sensitivity rules (see Section 11.2.3, "Identifier Case Sensitivity").

\section*{Join-Order Optimizer Hints}

Join-order hints affect the order in which the optimizer joins tables.
Syntax of the JOIN_FIXED_ORDER hint:
```
hint_name([@query_block_name])
```


Syntax of other join-order hints:
```
hint_name([@query_block_name] tbl_name [, tbl_name] ...)
hint_name(tbl_name[@query_block_name] [, tbl_name[@query_block_name]] ...)
```


The syntax refers to these terms:
- hint_name: These hint names are permitted:
- JOIN_FIXED_ORDER: Force the optimizer to join tables using the order in which they appear in the FROM clause. This is the same as specifying SELECT STRAIGHT_JOIN.
- JOIN_ORDER: Instruct the optimizer to join tables using the specified table order. The hint applies to the named tables. The optimizer may place tables that are not named anywhere in the join order, including between specified tables.
- JOIN_PREFIX: Instruct the optimizer to join tables using the specified table order for the first tables of the join execution plan. The hint applies to the named tables. The optimizer places all other tables after the named tables.
- JOIN_SUFFIX: Instruct the optimizer to join tables using the specified table order for the last tables of the join execution plan. The hint applies to the named tables. The optimizer places all other tables before the named tables.
- tbl_name: The name of a table used in the statement. A hint that names tables applies to all tables that it names. The JOIN_FIXED_ORDER hint names no tables and applies to all tables in the FROM clause of the query block in which it occurs.

If a table has an alias, hints must refer to the alias, not the table name.
Table names in hints cannot be qualified with schema names.
- query_block_name: The query block to which the hint applies. If the hint includes no leading @query_block_name, the hint applies to the query block in which it occurs. For tbl_name@query_block_name syntax, the hint applies to the named table in the named query block. To assign a name to a query block, see Optimizer Hints for Naming Query Blocks.

Example:
```
SELECT
/*+ JOIN_PREFIX(t2, t5@subq2, t4@subq1)
    JOIN_ORDER(t4@subq1, t3)
    JOIN_SUFFIX(t1) */
COUNT(*) FROM t1 JOIN t2 JOIN t3
        WHERE t1.f1 IN (SELECT /*+ QB_NAME(subq1) */ f1 FROM t4)
            AND t2.f1 IN (SELECT /*+ QB_NAME(subq2) */ f1 FROM t5);
```


Hints control the behavior of semijoin tables that are merged to the outer query block. If subqueries subq1 and subq2 are converted to semijoins, tables t4@subq1 and t5@subq2 are merged to the outer query block. In this case, the hint specified in the outer query block controls the behavior of t4@subq1, t5@subq2 tables.

The optimizer resolves join-order hints according to these principles:
- Multiple hint instances

Only one JOIN_PREFIX and JOIN_SUFFIX hint of each type are applied. Any later hints of the same type are ignored with a warning. JOIN_ORDER can be specified several times.

Examples:
```
/*+ JOIN_PREFIX(t1) JOIN_PREFIX(t2) */
```


The second JOIN_PREFIX hint is ignored with a warning.
```
/*+ JOIN_PREFIX(t1) JOIN_SUFFIX(t2) */
```


Both hints are applicable. No warning occurs.
```
/*+ JOIN_ORDER(t1, t2) JOIN_ORDER(t2, t3) */
```


Both hints are applicable. No warning occurs.
- Conflicting hints

In some cases hints can conflict, such as when JOIN_ORDER and JOIN_PREFIX have table orders that are impossible to apply at the same time:
```
SELECT /*+ JOIN_ORDER(t1, t2) JOIN_PREFIX(t2, t1) */ ... FROM t1, t2;
```


In this case, the first specified hint is applied and subsequent conflicting hints are ignored with no warning. A valid hint that is impossible to apply is silently ignored with no warning.
- Ignored hints

A hint is ignored if a table specified in the hint has a circular dependency.
Example:
/*+ JOIN_ORDER(t1, t2) JOIN_PREFIX(t2, t1) */
The JOIN_ORDER hint sets table t2 dependent on t1. The JOIN_PREFIX hint is ignored because table t1 cannot be dependent on t2. Ignored hints are not displayed in extended EXPLAIN output.
- Interaction with const tables

The MySQL optimizer places const tables first in the join order, and the position of a const table cannot be affected by hints. References to const tables in join-order hints are ignored, although the hint is still applicable. For example, these are equivalent:
```
JOIN_ORDER(t1, const_tbl, t2)
JOIN_ORDER(t1, t2)
```


Accepted hints shown in extended EXPLAIN output include const tables as they were specified.
- Interaction with types of join operations

MySQL supports several type of joins: LEFT, RIGHT, INNER, CROSS, STRAIGHT_JOIN. A hint that conflicts with the specified type of join is ignored with no warning.

Example:
```
SELECT /*+ JOIN_PREFIX(t1, t2) */FROM t2 LEFT JOIN t1;
```


Here a conflict occurs between the requested join order in the hint and the order required by the LEFT JOIN. The hint is ignored with no warning.

\section*{Table-Level Optimizer Hints}

Table-level hints affect:
- Use of the Block Nested-Loop (BNL) and Batched Key Access (BKA) join-processing algorithms (see Section 10.2.1.12, "Block Nested-Loop and Batched Key Access Joins").
- Whether derived tables, view references, or common table expressions should be merged into the outer query block, or materialized using an internal temporary table.
- Use of the derived table condition pushdown optimization. See Section 10.2.2.5, "Derived Condition Pushdown Optimization".

These hint types apply to specific tables, or all tables in a query block.
Syntax of table-level hints:
```
hint_name([@query_block_name] [tbl_name [, tbl_name] ...])
hint_name([tbl_name@query_block_name [, tbl_name@query_block_name] ...])
```


The syntax refers to these terms:
- hint_name: These hint names are permitted:
- BKA, NO_BKA: Enable or disable batched key access for the specified tables.
- BNL, NO_BNL: Enable and disable the hash join optimization.
- DERIVED_CONDITION_PUSHDOWN, NO_DERIVED_CONDITION_PUSHDOWN: Enable or disable use of derived table condition pushdown for the specified tables. For more information, see Section 10.2.2.5, "Derived Condition Pushdown Optimization".
- HASH_JOIN, NO_HASH_JOIN: These hints have no effect in MySQL 8.4; use BNL or NO_BNL instead.
- MERGE, NO_MERGE: Enable merging for the specified tables, view references or common table expressions; or disable merging and use materialization instead.

\section*{Note}

To use a block nested loop or batched key access hint to enable join buffering for any inner table of an outer join, join buffering must be enabled for all inner tables of the outer join.
- tbl_name: The name of a table used in the statement. The hint applies to all tables that it names. If the hint names no tables, it applies to all tables of the query block in which it occurs.

If a table has an alias, hints must refer to the alias, not the table name.
Table names in hints cannot be qualified with schema names.
- query_block_name: The query block to which the hint applies. If the hint includes no leading @query_block_name, the hint applies to the query block in which it occurs. For tbl_name@query_block_name syntax, the hint applies to the named table in the named query block. To assign a name to a query block, see Optimizer Hints for Naming Query Blocks.

Examples:
```
SELECT /*+ NO_BKA(t1, t2) */ t1.* FROM t1 INNER JOIN t2 INNER JOIN t3;
SELECT /*+ NO_BNL() BKA(t1) */ t1.* FROM t1 INNER JOIN t2 INNER JOIN t3;
SELECT /*+ NO_MERGE(dt) */ * FROM (SELECT * FROM t1) AS dt;
```


A table-level hint applies to tables that receive records from previous tables, not sender tables. Consider this statement:
```
SELECT /*+ BNL(t2) */ FROM t1, t2;
```


If the optimizer chooses to process t1 first, it applies a Block Nested-Loop join to t2 by buffering the rows from t1 before starting to read from t2. If the optimizer instead chooses to process t2 first, the hint has no effect because t2 is a sender table.

For the MERGE and NO_MERGE hints, these precedence rules apply:
- A hint takes precedence over any optimizer heuristic that is not a technical constraint. (If providing a hint as a suggestion has no effect, the optimizer has a reason for ignoring it.)
- A hint takes precedence over the derived_merge flag of the optimizer_switch system variable.
- For view references, an ALGORITHM=\{MERGE|TEMPTABLE\} clause in the view definition takes precedence over a hint specified in the query referencing the view.

