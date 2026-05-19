\section*{Chapter 10 Optimization}
Table of Contents
10.1 Optimization Overview ..... 1635
10.2 Optimizing SQL Statements ..... 1636
10.2.1 Optimizing SELECT Statements ..... 1636
10.2.2 Optimizing Subqueries, Derived Tables, View References, and Common Table Expressions ..... 1686
10.2.3 Optimizing INFORMATION_SCHEMA Queries ..... 1699
10.2.4 Optimizing Performance Schema Queries ..... 1702
10.2.5 Optimizing Data Change Statements ..... 1704
10.2.6 Optimizing Database Privileges ..... 1705
10.2.7 Other Optimization Tips ..... 1705
10.3 Optimization and Indexes ..... 1706
10.3.1 How MySQL Uses Indexes ..... 1706
10.3.2 Primary Key Optimization ..... 1707
10.3.3 SPATIAL Index Optimization ..... 1707
10.3.4 Foreign Key Optimization ..... 1708
10.3.5 Column Indexes ..... 1708
10.3.6 Multiple-Column Indexes ..... 1709
10.3.7 Verifying Index Usage ..... 1711
10.3.8 InnoDB and MyISAM Index Statistics Collection ..... 1711
10.3.9 Comparison of B-Tree and Hash Indexes ..... 1712
10.3.10 Use of Index Extensions ..... 1714
10.3.11 Optimizer Use of Generated Column Indexes ..... 1716
10.3.12 Invisible Indexes ..... 1717
10.3.13 Descending Indexes ..... 1719
10.3.14 Indexed Lookups from TIMESTAMP Columns ..... 1721
10.4 Optimizing Database Structure ..... 1723
10.4.1 Optimizing Data Size ..... 1723
10.4.2 Optimizing MySQL Data Types ..... 1725
10.4.3 Optimizing for Many Tables ..... 1726
10.4.4 Internal Temporary Table Use in MySQL ..... 1727
10.4.5 Limits on Number of Databases and Tables ..... 1731
10.4.6 Limits on Table Size ..... 1731
10.4.7 Limits on Table Column Count and Row Size ..... 1732
10.5 Optimizing for InnoDB Tables ..... 1735
10.5.1 Optimizing Storage Layout for InnoDB Tables ..... 1735
10.5.2 Optimizing InnoDB Transaction Management ..... 1735
10.5.3 Optimizing InnoDB Read-Only Transactions ..... 1736
10.5.4 Optimizing InnoDB Redo Logging ..... 1737
10.5.5 Bulk Data Loading for InnoDB Tables ..... 1738
10.5.6 Optimizing InnoDB Queries ..... 1740
10.5.7 Optimizing InnoDB DDL Operations ..... 1740
10.5.8 Optimizing InnoDB Disk I/O ..... 1740
10.5.9 Optimizing InnoDB Configuration Variables ..... 1744
10.5.10 Optimizing InnoDB for Systems with Many Tables ..... 1745
10.6 Optimizing for MyISAM Tables ..... 1745
10.6.1 Optimizing MyISAM Queries ..... 1745
10.6.2 Bulk Data Loading for MyISAM Tables ..... 1747
10.6.3 Optimizing REPAIR TABLE Statements ..... 1748
10.7 Optimizing for MEMORY Tables ..... 1749
10.8 Understanding the Query Execution Plan ..... 1750
10.8.1 Optimizing Queries with EXPLAIN ..... 1750
10.8.2 EXPLAIN Output Format ..... 1751
10.8.3 Extended EXPLAIN Output Format ..... 1764
10.8.4 Obtaining Execution Plan Information for a Named Connection ..... 1766
10.8.5 Estimating Query Performance ..... 1767
10.9 Controlling the Query Optimizer ..... 1767
10.9.1 Controlling Query Plan Evaluation ..... 1767
10.9.2 Switchable Optimizations ..... 1768
10.9.3 Optimizer Hints ..... 1778
10.9.4 Index Hints ..... 1792
10.9.5 The Optimizer Cost Model ..... 1794
10.9.6 Optimizer Statistics ..... 1798
10.10 Buffering and Caching ..... 1801
10.10.1 InnoDB Buffer Pool Optimization ..... 1801
10.10.2 The MyISAM Key Cache ..... 1801
10.10.3 Caching of Prepared Statements and Stored Programs ..... 1805
10.11 Optimizing Locking Operations ..... 1807
10.11.1 Internal Locking Methods ..... 1807
10.11.2 Table Locking Issues ..... 1809
10.11.3 Concurrent Inserts ..... 1811
10.11.4 Metadata Locking ..... 1811
10.11.5 External Locking ..... 1814
10.12 Optimizing the MySQL Server ..... 1815
10.12.1 Optimizing Disk I/O ..... 1815
10.12.2 Using Symbolic Links ..... 1817
10.12.3 Optimizing Memory Use ..... 1820
10.13 Measuring Performance (Benchmarking) ..... 1826
10.13.1 Measuring the Speed of Expressions and Functions ..... 1827
10.13.2 Using Your Own Benchmarks ..... 1827
10.13.3 Measuring Performance with performance_schema ..... 1827
10.14 Examining Server Thread (Process) Information ..... 1828
10.14.1 Accessing the Process List ..... 1828
10.14.2 Thread Command Values ..... 1830
10.14.3 General Thread States ..... 1832
10.14.4 Replication Source Thread States ..... 1838
10.14.5 Replication I/O (Receiver) Thread States ..... 1839
10.14.6 Replication SQL Thread States ..... 1840
10.14.7 Replication Connection Thread States ..... 1842
10.14.8 NDB Cluster Thread States ..... 1842
10.14.9 Event Scheduler Thread States ..... 1843
10.15 Tracing the Optimizer ..... 1843
10.15.1 Typical Usage ..... 1843
10.15.2 System Variables Controlling Tracing ..... 1843
10.15.3 Traceable Statements ..... 1844
10.15.4 Tuning Trace Purging ..... 1845
10.15.5 Tracing Memory Usage ..... 1846
10.15.6 Privilege Checking ..... 1846
10.15.7 Interaction with the --debug Option ..... 1846
10.15.8 The optimizer_trace System Variable ..... 1846
10.15.9 The end_markers_in_json System Variable ..... 1846
10.15.10 Selecting Optimizer Features to Trace ..... 1846
10.15.11 Trace General Structure ..... 1847
10.15.12 Example ..... 1847
10.15.13 Displaying Traces in Other Applications ..... 1857
10.15.14 Preventing the Use of Optimizer Trace ..... 1857
10.15.15 Testing Optimizer Trace ..... 1858
10.15.16 Optimizer Trace Implementation ..... 1858

This chapter explains how to optimize MySQL performance and provides examples. Optimization involves configuring, tuning, and measuring performance, at several levels. Depending on your job
role (developer, DBA, or a combination of both), you might optimize at the level of individual SQL statements, entire applications, a single database server, or multiple networked database servers. Sometimes you can be proactive and plan in advance for performance, while other times you might troubleshoot a configuration or code issue after a problem occurs. Optimizing CPU and memory usage can also improve scalability, allowing the database to handle more load without slowing down.

\subsection*{10.1 Optimization Overview}

Database performance depends on several factors at the database level, such as tables, queries, and configuration settings. These software constructs result in CPU and I/O operations at the hardware level, which you must minimize and make as efficient as possible. As you work on database performance, you start by learning the high-level rules and guidelines for the software side, and measuring performance using wall-clock time. As you become an expert, you learn more about what happens internally, and start measuring things such as CPU cycles and I/O operations.

Typical users aim to get the best database performance out of their existing software and hardware configurations. Advanced users look for opportunities to improve the MySQL software itself, or develop their own storage engines and hardware appliances to expand the MySQL ecosystem.
- Optimizing at the Database Level
- Optimizing at the Hardware Level
- Balancing Portability and Performance

\section*{Optimizing at the Database Level}

The most important factor in making a database application fast is its basic design:
- Are the tables structured properly? In particular, do the columns have the right data types, and does each table have the appropriate columns for the type of work? For example, applications that perform frequent updates often have many tables with few columns, while applications that analyze large amounts of data often have few tables with many columns.
- Are the right indexes in place to make queries efficient?
- Are you using the appropriate storage engine for each table, and taking advantage of the strengths and features of each storage engine you use? In particular, the choice of a transactional storage engine such as InnoDB or a nontransactional one such as MyISAM can be very important for performance and scalability.

\section*{Note}

InnoDB is the default storage engine for new tables. In practice, the advanced InnoDB performance features mean that InnoDB tables often outperform the simpler MyISAM tables, especially for a busy database.
- Does each table use an appropriate row format? This choice also depends on the storage engine used for the table. In particular, compressed tables use less disk space and so require less disk I/O to read and write the data. Compression is available for all kinds of workloads with InnoDB tables, and for read-only MyISAM tables.
- Does the application use an appropriate locking strategy? For example, by allowing shared access when possible so that database operations can run concurrently, and requesting exclusive access when appropriate so that critical operations get top priority. Again, the choice of storage engine is significant. The InnoDB storage engine handles most locking issues without involvement from you, allowing for better concurrency in the database and reducing the amount of experimentation and tuning for your code.
- Are all memory areas used for caching sized correctly? That is, large enough to hold frequently accessed data, but not so large that they overload physical memory and cause paging. The main memory areas to configure are the InnoDB buffer pool and the MyISAM key cache.

\section*{Optimizing at the Hardware Level}

Any database application eventually hits hardware limits as the database becomes more and more busy. A DBA must evaluate whether it is possible to tune the application or reconfigure the server to avoid these bottlenecks, or whether more hardware resources are required. System bottlenecks typically arise from these sources:
- Disk seeks. It takes time for the disk to find a piece of data. With modern disks, the mean time for this is usually lower than 10 ms , so we can in theory do about 100 seeks a second. This time improves slowly with new disks and is very hard to optimize for a single table. The way to optimize seek time is to distribute the data onto more than one disk.
- Disk reading and writing. When the disk is at the correct position, we need to read or write the data. With modern disks, one disk delivers at least $10-20 \mathrm{MB} / \mathrm{s}$ throughput. This is easier to optimize than seeks because you can read in parallel from multiple disks.
- CPU cycles. When the data is in main memory, we must process it to get our result. Having large tables compared to the amount of memory is the most common limiting factor. But with small tables, speed is usually not the problem.
- Memory bandwidth. When the CPU needs more data than can fit in the CPU cache, main memory bandwidth becomes a bottleneck. This is an uncommon bottleneck for most systems, but one to be aware of.

\section*{Balancing Portability and Performance}

To use performance-oriented SQL extensions in a portable MySQL program, you can wrap MySQLspecific keywords in a statement within /*! */ comment delimiters. Other SQL servers ignore the commented keywords. For information about writing comments, see Section 11.7, "Comments".

\subsection*{10.2 Optimizing SQL Statements}

The core logic of a database application is performed through SQL statements, whether issued directly through an interpreter or submitted behind the scenes through an API. The tuning guidelines in this section help to speed up all kinds of MySQL applications. The guidelines cover SQL operations that read and write data, the behind-the-scenes overhead for SQL operations in general, and operations used in specific scenarios such as database monitoring.

\subsection*{10.2.1 Optimizing SELECT Statements}

Queries, in the form of SELECT statements, perform all the lookup operations in the database. Tuning these statements is a top priority, whether to achieve sub-second response times for dynamic web pages, or to chop hours off the time to generate huge overnight reports.

Besides SELECT statements, the tuning techniques for queries also apply to constructs such as CREATE TABLE...AS SELECT, INSERT INTO...SELECT, and WHERE clauses in DELETE statements. Those statements have additional performance considerations because they combine write operations with the read-oriented query operations.

NDB Cluster supports a join pushdown optimization whereby a qualifying join is sent in its entirety to NDB Cluster data nodes, where it can be distributed among them and executed in parallel. For more information about this optimization, see Conditions for NDB pushdown joins.

The main considerations for optimizing queries are:
- To make a slow SELECT ... WHERE query faster, the first thing to check is whether you can add an index. Set up indexes on columns used in the WHERE clause, to speed up evaluation, filtering, and the final retrieval of results. To avoid wasted disk space, construct a small set of indexes that speed up many related queries used in your application.

Indexes are especially important for queries that reference different tables, using features such as joins and foreign keys. You can use the EXPLAIN statement to determine which indexes are used for a SELECT. See Section 10.3.1, "How MySQL Uses Indexes" and Section 10.8.1, "Optimizing Queries with EXPLAIN".
- Isolate and tune any part of the query, such as a function call, that takes excessive time. Depending on how the query is structured, a function could be called once for every row in the result set, or even once for every row in the table, greatly magnifying any inefficiency.
- Minimize the number of full table scans in your queries, particularly for big tables.
- Keep table statistics up to date by using the ANALYZE TABLE statement periodically, so the optimizer has the information needed to construct an efficient execution plan.
- Learn the tuning techniques, indexing techniques, and configuration parameters that are specific to the storage engine for each table. Both InnoDB and MyISAM have sets of guidelines for enabling and sustaining high performance in queries. For details, see Section 10.5.6, "Optimizing InnoDB Queries" and Section 10.6.1, "Optimizing MyISAM Queries".
- You can optimize single-query transactions for InnoDB tables, using the technique in Section 10.5.3, "Optimizing InnoDB Read-Only Transactions".
- Avoid transforming the query in ways that make it hard to understand, especially if the optimizer does some of the same transformations automatically.
- If a performance issue is not easily solved by one of the basic guidelines, investigate the internal details of the specific query by reading the EXPLAIN plan and adjusting your indexes, WHERE clauses, join clauses, and so on. (When you reach a certain level of expertise, reading the EXPLAIN plan might be your first step for every query.)
- Adjust the size and properties of the memory areas that MySQL uses for caching. With efficient use of the InnoDB buffer pool, MyISAM key cache, and the MySQL query cache, repeated queries run faster because the results are retrieved from memory the second and subsequent times.
- Even for a query that runs fast using the cache memory areas, you might still optimize further so that they require less cache memory, making your application more scalable. Scalability means that your application can handle more simultaneous users, larger requests, and so on without experiencing a big drop in performance.
- Deal with locking issues, where the speed of your query might be affected by other sessions accessing the tables at the same time.

\subsection*{10.2.1.1 WHERE Clause Optimization}

This section discusses optimizations that can be made for processing WHERE clauses. The examples use SELECT statements, but the same optimizations apply for WHERE clauses in DELETE and UPDATE statements.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1667.jpg?height=122&width=99&top_left_y=2106&top_left_x=370)

\section*{Note}

Because work on the MySQL optimizer is ongoing, not all of the optimizations that MySQL performs are documented here.

You might be tempted to rewrite your queries to make arithmetic operations faster, while sacrificing readability. Because MySQL does similar optimizations automatically, you can often avoid this work, and leave the query in a more understandable and maintainable form. Some of the optimizations performed by MySQL follow:
- Removal of unnecessary parentheses:
```
((a AND b) AND c OR (((a AND b) AND (c AND d))))
-> (a AND b AND c) OR (a AND b AND c AND d)
```

- Constant folding:
```
    (a<b AND b=c) AND a=5
-> b>5 AND b=c AND a=5
```

- Constant condition removal:
```
    (b>=5 AND b=5) OR (b=6 AND 5=5) OR (b=7 AND 5=6)
-> b=5 OR b=6
```


This takes place during preparation rather than during the optimization phase, which helps in simplification of joins. See Section 10.2.1.9, "Outer Join Optimization", for further information and examples.
- Constant expressions used by indexes are evaluated only once.
- Comparisons of columns of numeric types with constant values are checked and folded or removed for invalid or out-of-rage values:
```
# CREATE TABLE t (c TINYINT UNSIGNED NOT NULL);
    SELECT * FROM t WHERE c < 256;
->> SELECT * FROM t WHERE 1;
```


See Section 10.2.1.14, "Constant-Folding Optimization", for more information.
- COUNT (*) on a single table without a WHERE is retrieved directly from the table information for MyISAM and MEMORY tables. This is also done for any NOT NULL expression when used with only one table.
- Early detection of invalid constant expressions. MySQL quickly detects that some SELECT statements are impossible and returns no rows.
- HAVING is merged with WHERE if you do not use GROUP BY or aggregate functions (COUNT( ), MIN( ), and so on).
- For each table in a join, a simpler WHERE is constructed to get a fast WHERE evaluation for the table and also to skip rows as soon as possible.
- All constant tables are read first before any other tables in the query. A constant table is any of the following:
- An empty table or a table with one row.
- A table that is used with a WHERE clause on a PRIMARY KEY or a UNIQUE index, where all index parts are compared to constant expressions and are defined as NOT NULL.

All of the following tables are used as constant tables:
```
SELECT * FROM t WHERE primary_key=1;
SELECT * FROM t1,t2
    WHERE t1.primary_key=1 AND t2.primary_key=t1.id;
```

- The best join combination for joining the tables is found by trying all possibilities. If all columns in ORDER BY and GROUP BY clauses come from the same table, that table is preferred first when joining.
- If there is an ORDER BY clause and a different GROUP BY clause, or if the ORDER BY or GROUP BY contains columns from tables other than the first table in the join queue, a temporary table is created.
- If you use the SQL_SMALL_RESULT modifier, MySQL uses an in-memory temporary table.
- Each table index is queried, and the best index is used unless the optimizer believes that it is more efficient to use a table scan. At one time, a scan was used based on whether the best index spanned more than $30 \%$ of the table, but a fixed percentage no longer determines the choice between using
an index or a scan. The optimizer now is more complex and bases its estimate on additional factors such as table size, number of rows, and I/O block size.
- In some cases, MySQL can read rows from the index without even consulting the data file. If all columns used from the index are numeric, only the index tree is used to resolve the query.
- Before each row is output, those that do not match the HAVING clause are skipped.

Some examples of queries that are very fast:
```
SELECT COUNT(*) FROM tbl_name;
SELECT MIN(key_part1),MAX(key_part1) FROM tbl_name;
SELECT MAX(key_part2) FROM tbl_name
    WHERE key_part1=constant;
SELECT ... FROM tbl_name
    ORDER BY key_part1,key_part2,... LIMIT 10;
SELECT ... FROM tbl_name
    ORDER BY key_part1 DESC, key_part2 DESC, ... LIMIT 10;
```


MySQL resolves the following queries using only the index tree, assuming that the indexed columns are numeric:
```
SELECT key_part1,key_part2 FROM tbl_name WHERE key_part1=val;
SELECT COUNT(*) FROM tbl_name
    WHERE key_part1=val1 AND key_part2=val2;
SELECT MAX(key_part2) FROM tbl_name GROUP BY key_part1;
```


The following queries use indexing to retrieve the rows in sorted order without a separate sorting pass:
```
SELECT ... FROM tbl_name
    ORDER BY key_part1,key_part2,... ;
SELECT ... FROM tbl_name
    ORDER BY key_part1 DESC, key_part2 DESC, ... ;
```


\subsection*{10.2.1.2 Range Optimization}

The range access method uses a single index to retrieve a subset of table rows that are contained within one or several index value intervals. It can be used for a single-part or multiple-part index. The following sections describe conditions under which the optimizer uses range access.
- Range Access Method for Single-Part Indexes
- Range Access Method for Multiple-Part Indexes
- Equality Range Optimization of Many-Valued Comparisons
- Skip Scan Range Access Method
- Range Optimization of Row Constructor Expressions
- Limiting Memory Use for Range Optimization

\section*{Range Access Method for Single-Part Indexes}

For a single-part index, index value intervals can be conveniently represented by corresponding conditions in the WHERE clause, denoted as range conditions rather than "intervals."

The definition of a range condition for a single-part index is as follows:
- For both BTREE and HASH indexes, comparison of a key part with a constant value is a range condition when using the =,<=>, IN( ), IS NULL, or IS NOT NULL operators.
- Additionally, for BTREE indexes, comparison of a key part with a constant value is a range condition when using the >, <, >=, <=, BETWEEN, ! =, or <> operators, or LIKE comparisons if the argument to LIKE is a constant string that does not start with a wildcard character.
- For all index types, multiple range conditions combined with OR or AND form a range condition.
"Constant value" in the preceding descriptions means one of the following:
- A constant from the query string
- A column of a const or system table from the same join
- The result of an uncorrelated subquery
- Any expression composed entirely from subexpressions of the preceding types

Here are some examples of queries with range conditions in the WHERE clause:
```
SELECT * FROM t1
    WHERE key_col > 1
    AND key_col < 10;
SELECT * FROM t1
    WHERE key_col = 1
    OR key_col IN (15,18,20);
SELECT * FROM t1
    WHERE key_col LIKE 'ab%'
    OR key_col BETWEEN 'bar' AND 'foo';
```


Some nonconstant values may be converted to constants during the optimizer constant propagation phase.

MySQL tries to extract range conditions from the WHERE clause for each of the possible indexes. During the extraction process, conditions that cannot be used for constructing the range condition are dropped, conditions that produce overlapping ranges are combined, and conditions that produce empty ranges are removed.

Consider the following statement, where key1 is an indexed column and nonkey is not indexed:
```
SELECT * FROM t1 WHERE
    (key1 < 'abc' AND (key1 LIKE 'abcde%' OR key1 LIKE '%b')) OR
    (key1 < 'bar' AND nonkey = 4) OR
    (key1 < 'uux' AND key1 > 'z');
```


The extraction process for key key1 is as follows:
1. Start with original WHERE clause:
```
(key1 < 'abc' AND (key1 LIKE 'abcde%' OR key1 LIKE '%b')) OR
(key1 < 'bar' AND nonkey = 4) OR
(key1 < 'uux' AND key1 > 'z')
```

2. Remove nonkey = 4 and key1 LIKE '\%b ' because they cannot be used for a range scan. The correct way to remove them is to replace them with TRUE, so that we do not miss any matching rows when doing the range scan. Replacing them with TRUE yields:
```
(key1 < 'abc' AND (key1 LIKE 'abcde%' OR TRUE)) OR
(key1 < 'bar' AND TRUE) OR
(key1 < 'uux' AND key1 > 'z')
```

3. Collapse conditions that are always true or false:
- (key1 LIKE 'abcde\%' OR TRUE) is always true
- (key1 < 'uux' AND key1 > 'z') is always false

Replacing these conditions with constants yields:
```
(key1 < 'abc' AND TRUE) OR (key1 < 'bar' AND TRUE) OR (FALSE)
```


Removing unnecessary TRUE and FALSE constants yields:
```
(key1 < 'abc') OR (key1 < 'bar')
```

4. Combining overlapping intervals into one yields the final condition to be used for the range scan:
```
(key1 < 'bar')
```


In general (and as demonstrated by the preceding example), the condition used for a range scan is less restrictive than the WHERE clause. MySQL performs an additional check to filter out rows that satisfy the range condition but not the full WHERE clause.

The range condition extraction algorithm can handle nested AND/OR constructs of arbitrary depth, and its output does not depend on the order in which conditions appear in WHERE clause.

MySQL does not support merging multiple ranges for the range access method for spatial indexes. To work around this limitation, you can use a UNION with identical SELECT statements, except that you put each spatial predicate in a different SELECT.

\section*{Range Access Method for Multiple-Part Indexes}

Range conditions on a multiple-part index are an extension of range conditions for a single-part index. A range condition on a multiple-part index restricts index rows to lie within one or several key tuple intervals. Key tuple intervals are defined over a set of key tuples, using ordering from the index.

For example, consider a multiple-part index defined as key1(key_part1, key_part2, key_part3), and the following set of key tuples listed in key order:
```
key_part1 key_part2 key_part3
    NULL 1 'abc'
    NULL 'xyz'
    NULL 2 'foo'
        1 'abc'
        1 'xyz'
        1 'abc'
        2 'ааа'
```


The condition key_part1 = 1 defines this interval:
```
(1,-inf,-inf) <= (key_part1,key_part2,key_part3) < (1,+inf,+inf)
```


The interval covers the 4th, 5th, and 6th tuples in the preceding data set and can be used by the range access method.

By contrast, the condition key_part3 = 'abc' does not define a single interval and cannot be used by the range access method.

The following descriptions indicate how range conditions work for multiple-part indexes in greater detail.
- For HASH indexes, each interval containing identical values can be used. This means that the interval can be produced only for conditions in the following form:
```
    key_part1 cmp const1
AND key_part2 cmp const2
AND ...
AND key_partN cmp constN;
```


Here, const1, const2, ... are constants, cmp is one of the =,<=>, or IS NULL comparison operators, and the conditions cover all index parts. (That is, there are $N$ conditions, one for each part of an $N$-part index.) For example, the following is a range condition for a three-part HASH index:

\section*{Optimizing SELECT Statements}
key_part1 = 1 AND key_part2 IS NULL AND key_part3 = 'foo'
For the definition of what is considered to be a constant, see Range Access Method for Single-Part Indexes.
- For a BTREE index, an interval might be usable for conditions combined with AND, where each condition compares a key part with a constant value using =, <=>, IS NULL, >, <, >=, <=, !=, <>, BETWEEN, or LIKE 'pattern' (where 'pattern' does not start with a wildcard). An interval can be used as long as it is possible to determine a single key tuple containing all rows that match the condition (or two intervals if <> or ! = is used).

The optimizer attempts to use additional key parts to determine the interval as long as the comparison operator is =, <=>, or IS NULL. If the operator is >, <, >=, <=, !=,<>, BETWEEN, or LIKE, the optimizer uses it but considers no more key parts. For the following expression, the optimizer uses = from the first comparison. It also uses >= from the second comparison but considers no further key parts and does not use the third comparison for interval construction:
key_part1 = 'foo' AND key_part2 >= 10 AND key_part3 > 10
The single interval is:
('foo',10,-inf) < (key_part1,key_part2,key_part3) < ('foo',+inf,+inf)
It is possible that the created interval contains more rows than the initial condition. For example, the preceding interval includes the value ( ' foo' , 11, 0 ), which does not satisfy the original condition.
- If conditions that cover sets of rows contained within intervals are combined with 0 R , they form a condition that covers a set of rows contained within the union of their intervals. If the conditions are combined with AND, they form a condition that covers a set of rows contained within the intersection of their intervals. For example, for this condition on a two-part index:
(key_part1 = 1 AND key_part2 < 2) OR (key_part1 > 5)
The intervals are:
(1,-inf) < (key_part1,key_part2) < (1,2)
(5,-inf) < (key_part1,key_part2)
In this example, the interval on the first line uses one key part for the left bound and two key parts for the right bound. The interval on the second line uses only one key part. The key_len column in the EXPLAIN output indicates the maximum length of the key prefix used.

In some cases, key_len may indicate that a key part was used, but that might be not what you would expect. Suppose that key_part1 and key_part2 can be NULL. Then the key_len column displays two key part lengths for the following condition:
key_part1 >= 1 AND key_part2 < 2
But, in fact, the condition is converted to this:
key_part1 >= 1 AND key_part2 IS NOT NULL
For a description of how optimizations are performed to combine or eliminate intervals for range conditions on a single-part index, see Range Access Method for Single-Part Indexes. Analogous steps are performed for range conditions on multiple-part indexes.

\section*{Equality Range Optimization of Many-Valued Comparisons}

Consider these expressions, where col_name is an indexed column:
```
col_name IN(val1, ..., valN)
col_name = val1 OR ... OR col_name = valN
```


Each expression is true if col_name is equal to any of several values. These comparisons are equality range comparisons (where the "range" is a single value). The optimizer estimates the cost of reading qualifying rows for equality range comparisons as follows:
- If there is a unique index on col_name, the row estimate for each range is 1 because at most one row can have the given value.
- Otherwise, any index on col_name is nonunique and the optimizer can estimate the row count for each range using dives into the index or index statistics.

With index dives, the optimizer makes a dive at each end of a range and uses the number of rows in the range as the estimate. For example, the expression col_name IN ( $10,20,30$ ) has three equality ranges and the optimizer makes two dives per range to generate a row estimate. Each pair of dives yields an estimate of the number of rows that have the given value.

Index dives provide accurate row estimates, but as the number of comparison values in the expression increases, the optimizer takes longer to generate a row estimate. Use of index statistics is less accurate than index dives but permits faster row estimation for large value lists.

The eq_range_index_dive_limit system variable enables you to configure the number of values at which the optimizer switches from one row estimation strategy to the other. To permit use of index dives for comparisons of up to $N$ equality ranges, set eq_range_index_dive_limit to $N+1$. To disable use of statistics and always use index dives regardless of $N$, set eq_range_index_dive_limit to 0 .

To update table index statistics for best estimates, use ANALYZE TABLE.
Prior to MySQL 8.4, there is no way of skipping the use of index dives to estimate index usefulness, except by using the eq_range_index_dive_limit system variable. In MySQL 8.4, index dive skipping is possible for queries that satisfy all these conditions:
- The query is for a single table, not a join on multiple tables.
- A single-index FORCE INDEX index hint is present. The idea is that if index use is forced, there is nothing to be gained from the additional overhead of performing dives into the index.
- The index is nonunique and not a FULLTEXT index.
- No subquery is present.
- No DISTINCT, GROUP BY, or ORDER BY clause is present.

For EXPLAIN FOR CONNECTION, the output changes as follows if index dives are skipped:
- For traditional output, the rows and filtered values are NULL.
- For JSON output, rows_examined_per_scan and rows_produced_per_join do not appear, skip_index_dive_due_to_force is true, and cost calculations are not accurate.

Without FOR CONNECTION, EXPLAIN output does not change when index dives are skipped.
After execution of a query for which index dives are skipped, the corresponding row in the Information Schema OPTIMIZER_TRACE table contains an index_dives_for_range_access value of skipped_due_to_force_index.

\section*{Skip Scan Range Access Method}

Consider the following scenario:
CREATE TABLE t1 (f1 INT NOT NULL, f2 INT NOT NULL, PRIMARY KEY(f1, f2));
```
INSERT INTO t1 VALUES
    (1,1), (1,2), (1,3), (1,4), (1,5),
    (2,1), (2,2), (2,3), (2,4), (2,5);
INSERT INTO t1 SELECT f1, f2 + 5 FROM t1;
INSERT INTO t1 SELECT f1, f2 + 10 FROM t1;
INSERT INTO t1 SELECT f1, f2 + 20 FROM t1;
INSERT INTO t1 SELECT f1, f2 + 40 FROM t1;
ANALYZE TABLE t1;
EXPLAIN SELECT f1, f2 FROM t1 WHERE f2 > 40;
```


To execute this query, MySQL can choose an index scan to fetch all rows (the index includes all columns to be selected), then apply the f2 > 40 condition from the WHERE clause to produce the final result set.

A range scan is more efficient than a full index scan, but cannot be used in this case because there is no condition on f 1 , the first index column. The optimizer can perform multiple range scans, one for each value of f1, using a method called Skip Scan that is similar to Loose Index Scan (see Section 10.2.1.17, "GROUP BY Optimization"):
1. Skip between distinct values of the first index part, f1 (the index prefix).
2. Perform a subrange scan on each distinct prefix value for the $\mathrm{f} 2>40$ condition on the remaining index part.

For the data set shown earlier, the algorithm operates like this:
1. Get the first distinct value of the first key part ( $\mathrm{f} 1=1$ ).
2. Construct the range based on the first and second key parts (f1 $=1$ AND f2 > 40).
3. Perform a range scan.
4. Get the next distinct value of the first key part $(f 1=2)$.
5. Construct the range based on the first and second key parts (f1 $=2$ AND f2 > 40).
6. Perform a range scan.

Using this strategy decreases the number of accessed rows because MySQL skips the rows that do not qualify for each constructed range. This Skip Scan access method is applicable under the following conditions:
- Table T has at least one compound index with key parts of the form ([A $\_1, \ldots, \mathrm{~A} \_k, \mathrm{~B} \_1, \ldots, \mathrm{~B} \_m, \mathrm{C}[$, D_1, ..., D_n]). Key parts A and D may be empty, but B and C must be nonempty.
- The query references only one table.
- The query does not use GROUP BY or DISTINCT.
- The query references only columns in the index.
- The predicates on $\mathrm{A} \_1, \ldots, \mathrm{~A} \_k$ must be equality predicates and they must be constants. This includes the IN( ) operator.
- The query must be a conjunctive query; that is, an AND of OR conditions: (cond1 (key_part1) OR cond2(key_part1)) AND (cond1(key_part2) OR ...) AND ...
- There must be a range condition on C .
- Conditions on D columns are permitted. Conditions on D must be in conjunction with the range condition on C .

Use of Skip Scan is indicated in EXPLAIN output as follows:
- Using index for skip scan in the Extra column indicates that the loose index Skip Scan access method is used.
- If the index can be used for Skip Scan, the index should be visible in the possible_keys column.

Use of Skip Scan is indicated in optimizer trace output by a "skip scan" element of this form:
```
"skip_scan_range": {
    "type": "skip_scan",
    "index": index_used_for_skip_scan,
    "key_parts_used_for_access": [key_parts_used_for_access],
    "range": [range]
}
```


You may also see a "best_skip_scan_summary" element. If Skip Scan is chosen as the best range access variant, a "chosen_range_access_summary" is written. If Skip Scan is chosen as the overall best access method, a "best_access_path" element is present.

Use of Skip Scan is subject to the value of the skip_scan flag of the optimizer_switch system variable. See Section 10.9.2, "Switchable Optimizations". By default, this flag is on. To disable it, set skip_scan to off.

In addition to using the optimizer_switch system variable to control optimizer use of Skip Scan session-wide, MySQL supports optimizer hints to influence the optimizer on a per-statement basis. See Section 10.9.3, "Optimizer Hints".

\section*{Range Optimization of Row Constructor Expressions}

The optimizer is able to apply the range scan access method to queries of this form:
```
SELECT ... FROM t1 WHERE ( col_1, col_2 ) IN (( 'a', 'b' ), ( 'c', 'd' ));
```


Previously, for range scans to be used, it was necessary to write the query as:
```
SELECT ... FROM t1 WHERE ( col_1 = 'a' AND col_2 = 'b' )
OR ( col_1 = 'c' AND col_2 = 'd' );
```


For the optimizer to use a range scan, queries must satisfy these conditions:
- Only IN ( ) predicates are used, not NOT IN ( ).
- On the left side of the IN( ) predicate, the row constructor contains only column references.
- On the right side of the IN( ) predicate, row constructors contain only runtime constants, which are either literals or local column references that are bound to constants during execution.
- On the right side of the IN() predicate, there is more than one row constructor.

For more information about the optimizer and row constructors, see Section 10.2.1.22, "Row Constructor Expression Optimization"

\section*{Limiting Memory Use for Range Optimization}

To control the memory available to the range optimizer, use the range_optimizer_max_mem_size system variable:
- A value of 0 means "no limit."
- With a value greater than 0 , the optimizer tracks the memory consumed when considering the range access method. If the specified limit is about to be exceeded, the range access method is abandoned and other methods, including a full table scan, are considered instead. This could be less optimal. If this happens, the following warning occurs (where $N$ is the current range_optimizer_max_mem_size value):
```
Warning 3170 Memory capacity of N bytes for
    'range_optimizer_max_mem_size' exceeded. Range
    optimization was not done for this query.
```

- For UPDATE and DELETE statements, if the optimizer falls back to a full table scan and the sql_safe_updates system variable is enabled, an error occurs rather than a warning because, in effect, no key is used to determine which rows to modify. For more information, see Using SafeUpdates Mode (--safe-updates).

For individual queries that exceed the available range optimization memory and for which the optimizer falls back to less optimal plans, increasing the range_optimizer_max_mem_size value may improve performance.

To estimate the amount of memory needed to process a range expression, use these guidelines:
- For a simple query such as the following, where there is one candidate key for the range access method, each predicate combined with OR uses approximately 230 bytes:
```
SELECT COUNT(*) FROM t
WHERE a=1 OR a=2 OR a=3 OR ... . a=N;
```

- Similarly for a query such as the following, each predicate combined with AND uses approximately 125 bytes:
```
SELECT COUNT(*) FROM t
WHERE a=1 AND b=1 AND c=1 ... N;
```

- For a query with IN( ) predicates:
```
SELECT COUNT(*) FROM t
WHERE a IN (1,2, ..., M) AND b IN (1,2, ..., N);
```


Each literal value in an IN ( ) list counts as a predicate combined with OR. If there are two IN ( ) lists, the number of predicates combined with OR is the product of the number of literal values in each list. Thus, the number of predicates combined with OR in the preceding case is M × N.

\subsection*{10.2.1.3 Index Merge Optimization}

The Index Merge access method retrieves rows with multiple range scans and merges their results into one. This access method merges index scans from a single table only, not scans across multiple tables. The merge can produce unions, intersections, or unions-of-intersections of its underlying scans.

Example queries for which Index Merge may be used:
```
SELECT * FROM tbl_name WHERE key1 = 10 OR key2 = 20;
SELECT * FROM tbl_name
    WHERE (key1 = 10 OR key2 = 20) AND non_key = 30;
SELECT * FROM t1, t2
    WHERE (t1.key1 IN (1,2) OR t1.key2 LIKE 'value%')
    AND t2.key1 = t1.some_col;
SELECT * FROM t1, t2
    WHERE t1.key1 = 1
    AND (t2.key1 = t1.some_col OR t2.key2 = t1.some_col2);
```


\section*{Note}

The Index Merge optimization algorithm has the following known limitations:
- If your query has a complex WHERE clause with deep AND/OR nesting and MySQL does not choose the optimal plan, try distributing terms using the following identity transformations:
```
(x AND y) OR z => (x OR z) AND (y OR z)
(x OR y) AND z => (x AND z) OR (y AND z)
```

- Index Merge is not applicable to full-text indexes.

In EXPLAIN output, the Index Merge method appears as index_merge in the type column. In this case, the key column contains a list of indexes used, and key_len contains a list of the longest key parts for those indexes.

The Index Merge access method has several algorithms, which are displayed in the Extra field of EXPLAIN output:
- Using intersect(...)
- Using union(...)
- Using sort_union(...)

The following sections describe these algorithms in greater detail. The optimizer chooses between different possible Index Merge algorithms and other access methods based on cost estimates of the various available options.
- Index Merge Intersection Access Algorithm
- Index Merge Union Access Algorithm
- Index Merge Sort-Union Access Algorithm
- Influencing Index Merge Optimization

\section*{Index Merge Intersection Access Algorithm}

This access algorithm is applicable when a WHERE clause is converted to several range conditions on different keys combined with AND, and each condition is one of the following:
- An $N$-part expression of this form, where the index has exactly $N$ parts (that is, all index parts are covered):
```
key_part1 = const1 AND key_part2 = const2 ... AND key_partN = constN
```

- Any range condition over the primary key of an InnoDB table.

Examples:
```
SELECT * FROM innodb_table
    WHERE primary_key < 10 AND key_col1 = 20;
SELECT * FROM tbl_name
    WHERE key1_part1 = 1 AND key1_part2 = 2 AND key2 = 2;
```


The Index Merge intersection algorithm performs simultaneous scans on all used indexes and produces the intersection of row sequences that it receives from the merged index scans.

If all columns used in the query are covered by the used indexes, full table rows are not retrieved (EXPLAIN output contains Using index in Extra field in this case). Here is an example of such a query:
```
SELECT COUNT(*) FROM t1 WHERE key1 = 1 AND key2 = 1;
```


If the used indexes do not cover all columns used in the query, full rows are retrieved only when the range conditions for all used keys are satisfied.

If one of the merged conditions is a condition over the primary key of an InnoDB table, it is not used for row retrieval, but is used to filter out rows retrieved using other conditions.

\section*{Index Merge Union Access Algorithm}

The criteria for this algorithm are similar to those for the Index Merge intersection algorithm. The algorithm is applicable when the table's WHERE clause is converted to several range conditions on different keys combined with 0R, and each condition is one of the following:
- An $N$-part expression of this form, where the index has exactly $N$ parts (that is, all index parts are covered):
```
key_part1 = const1 OR key_part2 = const2 ... OR key_partN = constN
```

- Any range condition over a primary key of an InnoDB table.
- A condition for which the Index Merge intersection algorithm is applicable.

Examples:
```
SELECT * FROM t1
    WHERE key1 = 1 OR key2 = 2 OR key3 = 3;
SELECT * FROM innodb_table
    WHERE (key1 = 1 AND key2 = 2)
        OR (key3 = 'foo' AND key4 = 'bar') AND key5 = 5;
```


\section*{Index Merge Sort-Union Access Algorithm}

This access algorithm is applicable when the WHERE clause is converted to several range conditions combined by OR, but the Index Merge union algorithm is not applicable.

Examples:
```
SELECT * FROM tbl_name
    WHERE key_col1 < 10 OR key_col2 < 20;
SELECT * FROM tbl_name
    WHERE (key_col1 > 10 OR key_col2 = 20) AND nonkey_col = 30;
```


The difference between the sort-union algorithm and the union algorithm is that the sort-union algorithm must first fetch row IDs for all rows and sort them before returning any rows.

\section*{Influencing Index Merge Optimization}

Use of Index Merge is subject to the value of the index_merge, index_merge_intersection, index_merge_union, and index_merge_sort_union flags of the optimizer_switch system variable. See Section 10.9.2, "Switchable Optimizations". By default, all those flags are on. To enable only certain algorithms, set index_merge to off, and enable only such of the others as should be permitted.

In addition to using the optimizer_switch system variable to control optimizer use of the Index Merge algorithms session-wide, MySQL supports optimizer hints to influence the optimizer on a perstatement basis. See Section 10.9.3, "Optimizer Hints".

\subsection*{10.2.1.4 Hash Join Optimization}

By default, MySQL employs hash joins whenever possible. It is possible to control whether hash joins are employed using one of the BNL and NO_BNL optimizer hints, or by setting block_nested_loop=on or block_nested_loop=off as part of the setting for the optimizer_switch server system variable.

MySQL employs a hash join for any query for which each join has an equi-join condition, and in which there are no indexes that can be applied to any join conditions, such as this one:
```
SELECT *
```

```
FROM t1
JOIN t2
    ON t1.c1=t2.c1;
```


A hash join can also be used when there are one or more indexes that can be used for single-table predicates.

In the example just shown and the remaining examples in this section, we assume that the three tables t 1 , t 2 , and t 3 have been created using the following statements:
```
CREATE TABLE t1 (c1 INT, c2 INT);
CREATE TABLE t2 (c1 INT, c2 INT);
CREATE TABLE t3 (c1 INT, c2 INT);
```


You can see that a hash join is being employed by using EXPLAIN, like this:
```
mysql> EXPLAIN
        -> SELECT * FROM t1
        -> JOIN t2 ON t1.c1=t2.c1\G
************************** 1. rOW ****************************************
                    id: 1
    select_type: SIMPLE
                table: t1
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
    select_type: SIMPLE
                table: t2
        partitions: NULL
                    type: ALL
possible_keys: NULL
                        key: NULL
                key_len: NULL
                        ref: NULL
                        rows: 1
            filtered: 100.00
                    Extra: Using where; Using join buffer (hash join)
```


EXPLAIN ANALYZE also displays information about hash joins used.
The hash join is used for queries involving multiple joins as well, as long as at least one join condition for each pair of tables is an equi-join, like the query shown here:
```
SELECT * FROM t1
    JOIN t2 ON (t1.c1 = t2.c1 AND t1.c2 < t2.c2)
    JOIN t3 ON (t2.c1 = t3.c1);
```


In cases like the one just shown, which makes use of an inner join, any extra conditions which are not equi-joins are applied as filters after the join is executed. (For outer joins, such as left joins, semijoins, and antijoins, they are printed as part of the join.) This can be seen here in the output of EXPLAIN:
```
mysql> EXPLAIN FORMAT=TREE
    -> SELECT *
    -> FROM t1
    -> JOIN t2
    -> ON (t1.c1 = t2.c1 AND t1.c2 < t2.c2)
    -> JOIN t3
    -> ON (t2.c1 = t3.c1)\G
************************** 1. row ******************************
EXPLAIN: -> Inner hash join (t3.c1 = t1.c1) (cost=1.05 rows=1)
    -> Table scan on t3 (cost=0.35 rows=1)
```

```
-> Hash
    -> Filter: (t1.c2 < t2.c2) (cost=0.70 rows=1)
        -> Inner hash join (t2.c1 = t1.c1) (cost=0.70 rows=1)
            -> Table scan on t2 (cost=0.35 rows=1)
            -> Hash
                -> Table scan on t1 (cost=0.35 rows=1)
```


As also can be seen from the output just shown, multiple hash joins can be (and are) used for joins having multiple equi-join conditions.

A hash join is used even if any pair of joined tables does not have at least one equi-join condition, as shown here:
```
mysql> EXPLAIN FORMAT=TREE
    -> SELECT * FROM t1
    -> JOIN t2 ON (t1.c1 = t2.c1)
    -> JOIN t3 ON (t2.c1 < t3.c1)\G
************************* 1. row ******************************
EXPLAIN: -> Filter: (t1.c1 < t3.c1) (cost=1.05 rows=1)
    -> Inner hash join (no condition) (cost=1.05 rows=1)
        -> Table scan on t3 (cost=0.35 rows=1)
        -> Hash
            -> Inner hash join (t2.c1 = t1.c1) (cost=0.70 rows=1)
                -> Table scan on t2 (cost=0.35 rows=1)
                -> Hash
                    -> Table scan on t1 (cost=0.35 rows=1)
```

(Additional examples are provided later in this section.)
A hash join is also applied for a Cartesian product-that is, when no join condition is specified, as shown here:
```
mysql> EXPLAIN FORMAT=TREE
    -> SELECT *
    -> FROM t1
    -> JOIN t2
    -> WHERE t1.c2 > 50\G
************************* 1. row *******************************
EXPLAIN: -> Inner hash join (cost=0.70 rows=1)
    -> Table scan on t2 (cost=0.35 rows=1)
    -> Hash
        -> Filter: (t1.c2 > 50) (cost=0.35 rows=1)
            -> Table scan on t1 (cost=0.35 rows=1)
```


It is not necessary for the join to contain at least one equi-join condition in order for a hash join to be used. This means that the types of queries which can be optimized using hash joins include those in the following list (with examples):
- Inner non-equi-join:
```
mysql> EXPLAIN FORMAT=TREE SELECT * FROM t1 JOIN t2 ON t1.c1 < t2.c1\G
*************************** 1. row *****************************
EXPLAIN: -> Filter: (t1.c1 < t2.c1) (cost=4.70 rows=12)
    -> Inner hash join (no condition) (cost=4.70 rows=12)
        -> Table scan on t2 (cost=0.08 rows=6)
        -> Hash
            -> Table scan on t1 (cost=0.85 rows=6)
```

- Semijoin:
```
mysql> EXPLAIN FORMAT=TREE SELECT * FROM t1
    -> WHERE t1.c1 IN (SELECT t2.c2 FROM t2)\G
************************** 1. row *****************************************
EXPLAIN: -> Hash semijoin (t2.c2 = t1.c1) (cost=0.70 rows=1)
    -> Table scan on t1 (cost=0.35 rows=1)
    -> Hash
        -> Table scan on t2 (cost=0.35 rows=1)
```

- Antijoin:
```
mysql> EXPLAIN FORMAT=TREE SELECT * FROM t2
        -> WHERE NOT EXISTS (SELECT * FROM t1 WHERE t1.c1 = t2.c1)\G
*************************** 1. roW ****************************************
EXPLAIN: -> Hash antijoin (t1.c1 = t2.c1) (cost=0.70 rows=1)
        -> Table scan on t2 (cost=0.35 rows=1)
        -> Hash
            -> Table scan on t1 (cost=0.35 rows=1)
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
*************************** 1. row ***************************************
    Level: Note
    Code: 1276
Message: Field or reference 't3.t2.c1' of SELECT #2 was resolved in SELECT #1
```

- Left outer join:
```
mysql> EXPLAIN FORMAT=TREE SELECT * FROM t1 LEFT JOIN t2 ON t1.c1 = t2.c1\G
*************************** 1. row *****************************
EXPLAIN: -> Left hash join (t2.c1 = t1.c1) (cost=0.70 rows=1)
    -> Table scan on t1 (cost=0.35 rows=1)
    -> Hash
        -> Table scan on t2 (cost=0.35 rows=1)
```

- Right outer join (observe that MySQL rewrites all right outer joins as left outer joins):
```
mysql> EXPLAIN FORMAT=TREE SELECT * FROM t1 RIGHT JOIN t2 ON t1.c1 = t2.c1\G
*************************** 1. row ***************************************
EXPLAIN: -> Left hash join (t1.c1 = t2.c1) (cost=0.70 rows=1)
    -> Table scan on t2 (cost=0.35 rows=1)
    -> Hash
        -> Table scan on t1 (cost=0.35 rows=1)
```


By default, MySQL employs hash joins whenever possible. It is possible to control whether hash joins are employed using one of the BNL and NO_BNL optimizer hints.

Memory usage by hash joins can be controlled using the join_buffer_size system variable; a hash join cannot use more memory than this amount. When the memory required for a hash join exceeds the amount available, MySQL handles this by using files on disk. If this happens, you should be aware that the join may not succeed if a hash join cannot fit into memory and it creates more files than set for open_files_limit. To avoid such problems, make either of the following changes:
- Increase join_buffer_size so that the hash join does not spill over to disk.
- Increase open_files_limit.

Join buffers for hash joins are allocated incrementally; thus, you can set join_buffer_size higher without small queries allocating very large amounts of RAM, but outer joins allocate the entire buffer. Hash joins are used for outer joins (including antijoins and semijoins) as well, so this is no longer an issue.

\subsection*{10.2.1.5 Engine Condition Pushdown Optimization}

This optimization improves the efficiency of direct comparisons between a nonindexed column and a constant. In such cases, the condition is "pushed down" to the storage engine for evaluation. This optimization can be used only by the NDB storage engine.

For NDB Cluster, this optimization can eliminate the need to send nonmatching rows over the network between the cluster's data nodes and the MySQL server that issued the query, and can speed up queries where it is used by a factor of 5 to 10 times over cases where condition pushdown could be but is not used.

Suppose that an NDB Cluster table is defined as follows:
```
CREATE TABLE t1 (
```

```
    a INT,
    b INT,
    KEY(a)
) ENGINE=NDB;
```


Engine condition pushdown can be used with queries such as the one shown here, which includes a comparison between a nonindexed column and a constant:
```
SELECT a, b FROM t1 WHERE b = 10;
```


The use of engine condition pushdown can be seen in the output of EXPLAIN:
```
mysql> EXPLAIN SELECT a, b FROM t1 WHERE b = 10\G
************************** 1. row *****************************************
                    id: 1
    select_type: SIMPLE
            table: t1
                type: ALL
possible_keys: NULL
                    key: NULL
        key_len: NULL
                    ref: NULL
                rows: 10
            Extra: Using where with pushed condition
```


However, engine condition pushdown cannot be used with the following query:
SELECT a,b FROM t1 WHERE a = 10;
Engine condition pushdown is not applicable here because an index exists on column a. (An index access method would be more efficient and so would be chosen in preference to condition pushdown.)

Engine condition pushdown may also be employed when an indexed column is compared with a constant using a > or < operator:
```
mysql> EXPLAIN SELECT a, b FROM t1 WHERE a < 2\G
************************** 1. row ******************************
                    id: 1
    select_type: SIMPLE
            table: t1
                type: range
possible_keys: a
                    key: a
        key_len: 5
                    ref: NULL
                rows: 2
            Extra: Using where with pushed condition
```


Other supported comparisons for engine condition pushdown include the following:
- column [NOT] LIKE pattern
pattern must be a string literal containing the pattern to be matched; for syntax, see Section 14.8.1, "String Comparison Functions and Operators".
- column IS [NOT] NULL
- column IN (value_list)

Each item in the value_list must be a constant, literal value.
- column BETWEEN constant1 AND constant2
constant1 and constant2 must each be a constant, literal value.
In all of the cases in the preceding list, it is possible for the condition to be converted into the form of one or more direct comparisons between a column and a constant.

Engine condition pushdown is enabled by default. To disable it at server startup, set the optimizer_switch system variable's engine_condition_pushdown flag to off. For example, in a my.cnf file, use these lines:
```
[mysqld]
optimizer_switch=engine_condition_pushdown=off
```


At runtime, disable condition pushdown like this:
```
SET optimizer_switch='engine_condition_pushdown=off';
```


Limitations. Engine condition pushdown is subject to the following limitations:
- Engine condition pushdown is supported only by the NDB storage engine.
- In NDB 8.4, columns can be compared with one another as long as they are of exactly the same type, including the same signedness, length, character set, precision, and scale, where these are applicable.
- Columns used in comparisons cannot be of any of the BLOB or TEXT types. This exclusion extends to JSON, BIT, and ENUM columns as well.
- A string value to be compared with a column must use the same collation as the column.
- Joins are not directly supported; conditions involving multiple tables are pushed separately where possible. Use extended EXPLAIN output to determine which conditions are actually pushed down. See Section 10.8.3, "Extended EXPLAIN Output Format".

Previously, engine condition pushdown was limited to terms referring to column values from the same table to which the condition was being pushed. In NDB 8.4, column values from tables earlier in the query plan can also be referred to from pushed conditions. This reduces the number of rows which must be handled by the SQL node during join processing. Filtering can be also performed in parallel in the LDM threads, rather than in a single mysqld process. This has the potential to improve performance of queries by a significant margin.

NDB can push an outer join using a scan if there are no unpushable conditions on any table used in the same join nest, or on any table in join nests above it on which it depends. This is also true for a semijoin, provided the optimization strategy employed is firstMatch (see Optimizing IN and EXISTS Subquery Predicates with Semijoin Transformations).

Join algorithms cannot be combined with referring columns from previous tables in the following two situations:
1. When any of the referred previous tables are in a join buffer. In this case, each row retrieved from the scan-filtered table is matched against every row in the buffer. This means that there is no single specific row from which column values can be fetched from when generating the scan filter.
2. When the column originates from a child operation in a pushed join. This is because rows referenced from ancestor operations in the join have not yet been retrieved when the scan filter is generated.

Columns from ancestor tables in a join can be pushed down, provided that they meet the requirements listed previously. An example of such a query, using the table t1 created previously, is shown here:
```
mysql> EXPLAIN
        -> SELECT * FROM t1 AS x
        -> LEFT JOIN t1 AS y
        -> ON x.a=0 AND y.b>=3\G
************************** 1. row *****************************************
                    id: 1
    select_type: SIMPLE
            table: x
        partitions: p0,p1
            type: ALL
```

```
possible_keys: NULL
                    key: NULL
            key_len: NULL
                        ref: NULL
                    rows: 4
        filtered: 100.00
                Extra: NULL
*************************** 2. r ow ***************************************
                        id: 1
    select_type: SIMPLE
                table: y
        artitions: p0,p1
                    type: ALL
possible_keys: NULL
                        key: NULL
            key_len: NULL
                        ref: NULL
                    rows: 4
        filtered: 100.00
                Extra: Using where; Using pushed condition (ˋtestˋ.ˋyˋ.ˋbˋ >= 3); Using join buffer (hash join)
2 rows in set, 2 warnings ( 0.00 sec)
```


\subsection*{10.2.1.6 Index Condition Pushdown Optimization}

Index Condition Pushdown (ICP) is an optimization for the case where MySQL retrieves rows from a table using an index. Without ICP, the storage engine traverses the index to locate rows in the base table and returns them to the MySQL server which evaluates the WHERE condition for the rows. With ICP enabled, and if parts of the WHERE condition can be evaluated by using only columns from the index, the MySQL server pushes this part of the WHERE condition down to the storage engine. The storage engine then evaluates the pushed index condition by using the index entry and only if this is satisfied is the row read from the table. ICP can reduce the number of times the storage engine must access the base table and the number of times the MySQL server must access the storage engine.

Applicability of the Index Condition Pushdown optimization is subject to these conditions:
- ICP is used for the range, ref, eq_ref, and ref_or_null access methods when there is a need to access full table rows.
- ICP can be used for InnoDB and MyISAM tables, including partitioned InnoDB and MyISAM tables.
- For InnoDB tables, ICP is used only for secondary indexes. The goal of ICP is to reduce the number of full-row reads and thereby reduce I/O operations. For InnoDB clustered indexes, the complete record is already read into the InnoDB buffer. Using ICP in this case does not reduce I/O.
- ICP is not supported with secondary indexes created on virtual generated columns. InnoDB supports secondary indexes on virtual generated columns.
- Conditions that refer to subqueries cannot be pushed down.
- Conditions that refer to stored functions cannot be pushed down. Storage engines cannot invoke stored functions.
- Triggered conditions cannot be pushed down. (For information about triggered conditions, see Section 10.2.2.3, "Optimizing Subqueries with the EXISTS Strategy".)
- Conditions cannot be pushed down to derived tables containing references to system variables.

To understand how this optimization works, first consider how an index scan proceeds when Index Condition Pushdown is not used:
1. Get the next row, first by reading the index tuple, and then by using the index tuple to locate and read the full table row.
2. Test the part of the WHERE condition that applies to this table. Accept or reject the row based on the test result.

Using Index Condition Pushdown, the scan proceeds like this instead:
1. Get the next row's index tuple (but not the full table row).
2. Test the part of the WHERE condition that applies to this table and can be checked using only index columns. If the condition is not satisfied, proceed to the index tuple for the next row.
3. If the condition is satisfied, use the index tuple to locate and read the full table row.
4. Test the remaining part of the WHERE condition that applies to this table. Accept or reject the row based on the test result.

EXPLAIN output shows Using index condition in the Extra column when Index Condition Pushdown is used. It does not show Using index because that does not apply when full table rows must be read.

Suppose that a table contains information about people and their addresses and that the table has an index defined as INDEX (zipcode, lastname, firstname). If we know a person's zipcode value but are not sure about the last name, we can search like this:
```
SELECT * FROM people
    WHERE zipcode='95054'
    AND lastname LIKE '%etrunia%'
    AND address LIKE '%Main Street%';
```


MySQL can use the index to scan through people with zipcode='95054'. The second part (lastname LIKE '\%etrunia\%') cannot be used to limit the number of rows that must be scanned, so without Index Condition Pushdown, this query must retrieve full table rows for all people who have zipcode='95054'.

With Index Condition Pushdown, MySQL checks the lastname LIKE '\%etrunia\%' part before reading the full table row. This avoids reading full rows corresponding to index tuples that match the zipcode condition but not the lastname condition.

Index Condition Pushdown is enabled by default. It can be controlled with the optimizer_switch system variable by setting the index_condition_pushdown flag:
```
SET optimizer_switch = 'index_condition_pushdown=off';
SET optimizer_switch = 'index_condition_pushdown=on';
```


See Section 10.9.2, "Switchable Optimizations".

\subsection*{10.2.1.7 Nested-Loop Join Algorithms}

MySQL executes joins between tables using a nested-loop algorithm or variations on it.
- Nested-Loop Join Algorithm

\section*{Nested-Loop Join Algorithm}

A simple nested-loop join (NLJ) algorithm reads rows from the first table in a loop one at a time, passing each row to a nested loop that processes the next table in the join. This process is repeated as many times as there remain tables to be joined.

Assume that a join between three tables t1, t2, and t3 is to be executed using the following join types:
```
Table Join Type
t1 range
t2 ref
t3 ALL
```


If a simple NLJ algorithm is used, the join is processed like this:
```
for each row in t1 matching range {
    for each row in t2 matching reference key {
        for each row in t3 {
            if row satisfies join conditions, send to client
        }
    }
}
```


Because the NLJ algorithm passes rows one at a time from outer loops to inner loops, it typically reads tables processed in the inner loops many times.

\subsection*{10.2.1.8 Nested Join Optimization}

The syntax for expressing joins permits nested joins. The following discussion refers to the join syntax described in Section 15.2.13.2, "JOIN Clause".

The syntax of table_factor is extended in comparison with the SQL Standard. The latter accepts only table_reference, not a list of them inside a pair of parentheses. This is a conservative extension if we consider each comma in a list of table_reference items as equivalent to an inner join. For example:
```
SELECT * FROM t1 LEFT JOIN (t2, t3, t4)
        ON (t2.a=t1.a AND t3.b=t1.b AND t4.c=t1.c)
```


Is equivalent to:
```
SELECT * FROM t1 LEFT JOIN (t2 CROSS JOIN t3 CROSS JOIN t4)
        ON (t2.a=t1.a AND t3.b=t1.b AND t4.c=t1.c)
```


In MySQL, CROSS JOIN is syntactically equivalent to INNER JOIN; they can replace each other. In standard SQL, they are not equivalent. INNER JOIN is used with an ON clause; CROSS JOIN is used otherwise.

In general, parentheses can be ignored in join expressions containing only inner join operations. Consider this join expression:
```
t1 LEFT JOIN (t2 LEFT JOIN t3 ON t2.b=t3.b OR t2.b IS NULL)
    ON t1.a=t2.a
```


After removing parentheses and grouping operations to the left, that join expression transforms into this expression:
```
(t1 LEFT JOIN t2 ON t1.a=t2.a) LEFT JOIN t3
    ON t2.b=t3.b OR t2.b IS NULL
```


Yet, the two expressions are not equivalent. To see this, suppose that the tables t1, t2, and t3 have the following state:
- Table t1 contains rows (1), (2)
- Table t2 contains row $(1,101)$
- Table t3 contains row (101)

In this case, the first expression returns a result set including the rows ( $1,1,101,101$ ), ( 2 , NULL, NULL, NULL ), whereas the second expression returns the rows ( $1,1,101,101$ ), (2, NULL, NULL, 101):
```
mysql> SELECT *
    FROM t1
        LEFT JOIN
        (t2 LEFT JOIN t3 ON t2.b=t3.b OR t2.b IS NULL)
        ON t1.a=t2.a;
+-------+------+------+------+
|a |a |b |b |
```

```
+-------+------+------+------+
| 1 | 1 | 101 | 101 |
| 2 | NULL | NULL | NULL |
+------+------+------+------+
mysql> SELECT *
    FROM (t1 LEFT JOIN t2 ON t1.a=t2.a)
        LEFT JOIN t3
        ON t2.b=t3.b OR t2.b IS NULL;
+-------+------+------+------+
|a |a |b |b |
+------+------+------+------+
\begin{array} { | l l | r | r | l | } { } \\ { \hline } & { 1 } & { 1 } & { 1 0 1 } & { 1 0 1 } \\ { } & { 2 } & { \text { NULL } } & { \text { NULL } } & { 1 0 1 } \\ { \hline } \end{array}
+------+------+------+------+
```


In the following example, an outer join operation is used together with an inner join operation:
```
t1 LEFT JOIN (t2, t3) ON t1.a=t2.a
```


That expression cannot be transformed into the following expression:
```
t1 LEFT JOIN t2 ON t1.a=t2.a, t3
```


For the given table states, the two expressions return different sets of rows:
```
mysql> SELECT *
    FROM t1 LEFT JOIN (t2, t3) ON t1.a=t2.a;
+-------+------+------+------+
|a |a |b |b |
+------+------+------+------+
| 1 | 1 | 101 | 101 |
| 2 | NULL | NULL | NULL |
+-------+------+------+------+
mysql> SELECT *
    FROM t1 LEFT JOIN t2 ON t1.a=t2.a, t3;
+-------+------+------+------+
| a | a | b | b |
+-------+------+------+------+
| 1 | 1 | 101 | 101 |
| 2 | NULL | NULL | 101 |
+-------+------+------+------+
```


Therefore, if we omit parentheses in a join expression with outer join operators, we might change the result set for the original expression.

More exactly, we cannot ignore parentheses in the right operand of the left outer join operation and in the left operand of a right join operation. In other words, we cannot ignore parentheses for the inner table expressions of outer join operations. Parentheses for the other operand (operand for the outer table) can be ignored.

The following expression:
```
(t1,t2) LEFT JOIN t3 ON P(t2.b,t3.b)
```


Is equivalent to this expression for any tables $\mathrm{t} 1, \mathrm{t} 2, \mathrm{t} 3$ and any condition P over attributes $\mathrm{t} 2 . \mathrm{b}$ and t3.b:
```
t1, t2 LEFT JOIN t3 ON P(t2.b,t3.b)
```


Whenever the order of execution of join operations in a join expression (joined_table) is not from left to right, we talk about nested joins. Consider the following queries:
```
SELECT * FROM t1 LEFT JOIN (t2 LEFT JOIN t3 ON t2.b=t3.b) ON t1.a=t2.a
    WHERE t1.a > 1
SELECT * FROM t1 LEFT JOIN (t2, t3) ON t1.a=t2.a
    WHERE (t2.b=t3.b OR t2.b IS NULL) AND t1.a > 1
```


Those queries are considered to contain these nested joins:
```
t2 LEFT JOIN t3 ON t2.b=t3.b
t2, t3
```


In the first query, the nested join is formed with a left join operation. In the second query, it is formed with an inner join operation.

In the first query, the parentheses can be omitted: The grammatical structure of the join expression dictates the same order of execution for join operations. For the second query, the parentheses cannot be omitted, although the join expression here can be interpreted unambiguously without them. In our extended syntax, the parentheses in ( t 2 , t3) of the second query are required, although theoretically the query could be parsed without them: We still would have unambiguous syntactical structure for the query because LEFT JOIN and ON play the role of the left and right delimiters for the expression ( $\mathrm{t} 2, \mathrm{t} 3$ ).

The preceding examples demonstrate these points:
- For join expressions involving only inner joins (and not outer joins), parentheses can be removed and joins evaluated left to right. In fact, tables can be evaluated in any order.
- The same is not true, in general, for outer joins or for outer joins mixed with inner joins. Removal of parentheses may change the result.

Queries with nested outer joins are executed in the same pipeline manner as queries with inner joins. More exactly, a variation of the nested-loop join algorithm is exploited. Recall the algorithm by which the nested-loop join executes a query (see Section 10.2.1.7, "Nested-Loop Join Algorithms"). Suppose that a join query over 3 tables T1, T2, T3 has this form:
```
SELECT * FROM T1 INNER JOIN T2 ON P1(T1,T2)
            INNER JOIN T3 ON P2(T2,T3)
    WHERE P(T1,T2,T3)
```


Here, $\mathrm{P} 1(\mathrm{~T} 1, \mathrm{~T} 2)$ and $\mathrm{P} 2(\mathrm{~T} 3, \mathrm{~T} 3)$ are some join conditions (on expressions), whereas $\mathrm{P}(\mathrm{T} 1, \mathrm{~T} 2, \mathrm{~T} 3)$ is a condition over columns of tables T1, T2, T3.

The nested-loop join algorithm would execute this query in the following manner:
```
FOR each row t1 in T1 {
    FOR each row t2 in T2 such that P1(t1,t2) {
        FOR each row t3 in T3 such that P2(t2,t3) {
            IF P(t1,t2,t3) {
                t:=t1||t2||t3; OUTPUT t;
            }
        }
    }
}
```


The notation $\mathrm{t} 1||\mathrm{t} 2|| \mathrm{t} 3$ indicates a row constructed by concatenating the columns of rows t1, t2, and t 3 . In some of the following examples, NULL where a table name appears means a row in which NULL is used for each column of that table. For example, t1||t2||NULL indicates a row constructed by concatenating the columns of rows t1 and t2, and NULL for each column of t3. Such a row is said to be NULL-complemented.

Now consider a query with nested outer joins:
```
SELECT * FROM T1 LEFT JOIN
        (T2 LEFT JOIN T3 ON P2(T2,T3))
        ON P1(T1,T2)
    WHERE P(T1,T2,T3)
```


For this query, modify the nested-loop pattern to obtain:
```
FOR each row t1 in T1 {
```

```
    BOOL f1:=FALSE;
    FOR each row t2 in T2 such that P1(t1,t2) {
        BOOL f2:=FALSE;
        FOR each row t3 in T3 such that P2(t2,t3) {
            IF P(t1,t2,t3) {
                t:=t1||t2||t3; OUTPUT t;
            }
            f2=TRUE;
            f1=TRUE;
        }
        IF (!f2) {
            IF P(t1,t2,NULL) {
                t:=t1||t2||NULL; OUTPUT t;
            }
            f1=TRUE;
        }
    }
    IF (!f1) {
        IF P(t1,NULL,NULL) {
            t:=t1||NULL||NULL; OUTPUT t;
        }
    }
}
```


In general, for any nested loop for the first inner table in an outer join operation, a flag is introduced that is turned off before the loop and is checked after the loop. The flag is turned on when for the current row from the outer table a match from the table representing the inner operand is found. If at the end of the loop cycle the flag is still off, no match has been found for the current row of the outer table. In this case, the row is complemented by NULL values for the columns of the inner tables. The result row is passed to the final check for the output or into the next nested loop, but only if the row satisfies the join condition of all embedded outer joins.

In the example, the outer join table expressed by the following expression is embedded:
```
(T2 LEFT JOIN T3 ON P2(T2,T3))
```


For the query with inner joins, the optimizer could choose a different order of nested loops, such as this one:
```
FOR each row t3 in T3 {
    FOR each row t2 in T2 such that P2(t2,t3) {
        FOR each row t1 in T1 such that P1(t1,t2) {
            IF P(t1,t2,t3) {
                t:=t1||t2||t3; OUTPUT t;
            }
        }
    }
}
```


For queries with outer joins, the optimizer can choose only such an order where loops for outer tables precede loops for inner tables. Thus, for our query with outer joins, only one nesting order is possible. For the following query, the optimizer evaluates two different nestings. In both nestings, T1 must be processed in the outer loop because it is used in an outer join. T2 and T3 are used in an inner join, so that join must be processed in the inner loop. However, because the join is an inner join, T2 and T3 can be processed in either order.
```
SELECT * T1 LEFT JOIN (T2,T3) ON P1(T1,T2) AND P2(T1,T3)
    WHERE P(T1,T2,T3)
```


One nesting evaluates T2, then T3:
```
FOR each row t1 in T1 {
    BOOL f1:=FALSE;
    FOR each row t2 in T2 such that P1(t1,t2) {
        FOR each row t3 in T3 such that P2(t1,t3) {
            IF P(t1,t2,t3) {
                t:=t1||t2||t3; OUTPUT t;
            }
```

```
            f1:=TRUE
        }
    }
    IF (!f1) {
        IF P(t1,NULL,NULL) {
            t:=t1||NULL||NULL; OUTPUT t;
        }
    }
}
```


The other nesting evaluates T3, then T2:
```
FOR each row t1 in T1 {
    BOOL f1:=FALSE;
    FOR each row t3 in T3 such that P2(t1,t3) {
        FOR each row t2 in T2 such that P1(t1,t2) {
            IF P(t1,t2,t3) {
                t:=t1||t2||t3; OUTPUT t;
            }
            f1:=TRUE
        }
    }
    IF (!f1) {
        IF P(t1,NULL,NULL) {
            t:=t1||NULL||NULL; OUTPUT t;
        }
    }
}
```


When discussing the nested-loop algorithm for inner joins, we omitted some details whose impact on the performance of query execution may be huge. We did not mention so-called "pushed-down" conditions. Suppose that our WHERE condition P(T1, T2, T3) can be represented by a conjunctive formula:
$\mathrm{P}(\mathrm{T} 1, \mathrm{~T} 2, \mathrm{~T} 2)=\mathrm{C} 1(\mathrm{~T} 1)$ AND C2(T2) AND C3(T3).
In this case, MySQL actually uses the following nested-loop algorithm for the execution of the query with inner joins:
```
FOR each row t1 in T1 such that C1(t1) {
    FOR each row t2 in T2 such that P1(t1,t2) AND C2(t2) {
        FOR each row t3 in T3 such that P2(t2,t3) AND C3(t3) {
            IF P(t1,t2,t3) {
                t:=t1||t2||t3; OUTPUT t;
            }
        }
    }
}
```


You see that each of the conjuncts $\mathrm{C} 1(\mathrm{~T} 1), \mathrm{C} 2(\mathrm{~T} 2), \mathrm{C} 3(\mathrm{~T} 3)$ are pushed out of the most inner loop to the most outer loop where it can be evaluated. If C1(T1) is a very restrictive condition, this condition pushdown may greatly reduce the number of rows from table T1 passed to the inner loops. As a result, the execution time for the query may improve immensely.

For a query with outer joins, the WHERE condition is to be checked only after it has been found that the current row from the outer table has a match in the inner tables. Thus, the optimization of pushing conditions out of the inner nested loops cannot be applied directly to queries with outer joins. Here we must introduce conditional pushed-down predicates guarded by the flags that are turned on when a match has been encountered.

Recall this example with outer joins:
```
P(T1,T2,T3)=C1(T1) AND C(T2) AND C3(T3)
```


For that example, the nested-loop algorithm using guarded pushed-down conditions looks like this:
```
FOR each row t1 in T1 such that C1(t1) {
    BOOL f1:=FALSE;
```

```
    FOR each row t2 in T2
            such that P1(t1,t2) AND (f1?C2(t2):TRUE) {
        BOOL f2:=FALSE;
        FOR each row t3 in T3
                such that P2(t2,t3) AND (f1&&f2?C3(t3):TRUE) {
            IF (f1&&f2?TRUE:(C2(t2) AND C3(t3))) {
                t:=t1||t2||t3; OUTPUT t;
            }
            f2=TRUE;
            f1=TRUE;
        }
        IF (!f2) {
            IF (f1?TRUE:C2(t2) && P(t1,t2,NULL)) {
                t:=t1||t2||NULL; OUTPUT t;
            }
            f1=TRUE;
        }
    }
    IF (!f1 && P(t1,NULL,NULL)) {
            t:=t1||NULL||NULL; OUTPUT t;
    }
}
```


In general, pushed-down predicates can be extracted from join conditions such as P1(T1, T2) and $\mathrm{P}(\mathrm{T} 2, \mathrm{~T} 3)$. In this case, a pushed-down predicate is guarded also by a flag that prevents checking the predicate for the NULL-complemented row generated by the corresponding outer join operation.

Access by key from one inner table to another in the same nested join is prohibited if it is induced by a predicate from the WHERE condition.

\subsection*{10.2.1.9 Outer Join Optimization}

Outer joins include LEFT JOIN and RIGHT JOIN.
MySQL implements an A LEFT JOIN B join_specification as follows:
- Table $B$ is set to depend on table $A$ and all tables on which $A$ depends.
- Table $A$ is set to depend on all tables (except $B$ ) that are used in the LEFT JOIN condition.
- The LEFT JOIN condition is used to decide how to retrieve rows from table $B$. (In other words, any condition in the WHERE clause is not used.)
- All standard join optimizations are performed, with the exception that a table is always read after all tables on which it depends. If there is a circular dependency, an error occurs.
- All standard WHERE optimizations are performed.
- If there is a row in $A$ that matches the WHERE clause, but there is no row in $B$ that matches the ON condition, an extra $B$ row is generated with all columns set to NULL.
- If you use LEFT JOIN to find rows that do not exist in some table and you have the following test: col_name IS NULL in the WHERE part, where col_name is a column that is declared as NOT NULL, MySQL stops searching for more rows (for a particular key combination) after it has found one row that matches the LEFT JOIN condition.

The RIGHT JOIN implementation is analogous to that of LEFT JOIN with the table roles reversed. Right joins are converted to equivalent left joins, as described in Section 10.2.1.10, "Outer Join Simplification".

For a LEFT JOIN, if the WHERE condition is always false for the generated NULL row, the LEFT JOIN is changed to an inner join. For example, the WHERE clause would be false in the following query if t2.column1 were NULL:
```
SELECT * FROM t1 LEFT JOIN t2 ON (column1) WHERE t2.column2=5;
```


\section*{Optimizing SELECT Statements}

Therefore, it is safe to convert the query to an inner join:
```
SELECT * FROM t1, t2 WHERE t2.column2=5 AND t1.column1=t2.column1;
```


Trivial WHERE conditions arising from constant literal expressions are removed during preparation, rather than at a later stage in optimization, by which time joins have already been simplified. Earlier removal of trivial conditions allows the optimizer to convert outer joins to inner joins; this can result in improved plans for queries with outer joins containing trivial conditions in the WHERE clause, such as this one:
```
SELECT * FROM t1 LEFT JOIN t2 ON condition_1 WHERE condition_2 OR 0 = 1
```


The optimizer now sees during preparation that $0=1$ is always false, making $0 \mathrm{R} 0=1$ redundant, and removes it, leaving this:
```
SELECT * FROM t1 LEFT JOIN t2 ON condition_1 where condition_2
```


Now the optimizer can rewrite the query as an inner join, like this:
```
SELECT * FROM t1 JOIN t2 WHERE condition_1 AND condition_2
```


Now the optimizer can use table t2 before table t1 if doing so would result in a better query plan. To provide a hint about the table join order, use optimizer hints; see Section 10.9.3, "Optimizer Hints". Alternatively, use STRAIGHT_JOIN; see Section 15.2.13, "SELECT Statement". However, STRAIGHT_JOIN may prevent indexes from being used because it disables semijoin transformations; see Optimizing IN and EXISTS Subquery Predicates with Semijoin Transformations.

\subsection*{10.2.1.10 Outer Join Simplification}

Table expressions in the FROM clause of a query are simplified in many cases.
At the parser stage, queries with right outer join operations are converted to equivalent queries containing only left join operations. In the general case, the conversion is performed such that this right join:
```
(T1, ...) RIGHT JOIN (T2, ...) ON P(T1, ..., T2, ...)
```


Becomes this equivalent left join:
```
(T2, ...) LEFT JOIN (T1, ...) ON P(T1, ..., T2, ...)
```


All inner join expressions of the form T1 INNER JOIN T2 ON P(T1, T2) are replaced by the list $\mathrm{T} 1, \mathrm{~T} 2, \mathrm{P}(\mathrm{T} 1, \mathrm{~T} 2)$ being joined as a conjunct to the WHERE condition (or to the join condition of the embedding join, if there is any).

When the optimizer evaluates plans for outer join operations, it takes into consideration only plans where, for each such operation, the outer tables are accessed before the inner tables. The optimizer choices are limited because only such plans enable outer joins to be executed using the nested-loop algorithm.

Consider a query of this form, where $\mathrm{R}(\mathrm{T} 2)$ greatly narrows the number of matching rows from table T2:
```
SELECT * T1 FROM T1
    LEFT JOIN T2 ON P1(T1,T2)
    WHERE P(T1,T2) AND R(T2)
```


If the query is executed as written, the optimizer has no choice but to access the less-restricted table T1 before the more-restricted table T2, which may produce a very inefficient execution plan.

Instead, MySQL converts the query to a query with no outer join operation if the WHERE condition is null-rejected. (That is, it converts the outer join to an inner join.) A condition is said to be null-rejected
for an outer join operation if it evaluates to FALSE or UNKNOWN for any NULL-complemented row generated for the operation.

Thus, for this outer join:
```
T1 LEFT JOIN T2 ON T1.A=T2.A
```


Conditions such as these are null-rejected because they cannot be true for any NULL-complemented row (with T2 columns set to NULL):
```
T2.B IS NOT NULL
T2.B > 3
T2.C <= T1.C
T2.B < 2 OR T2.C > 1
```


Conditions such as these are not null-rejected because they might be true for a NULL-complemented row:
```
T2.B IS NULL
T1.B < 3 OR T2.B IS NOT NULL
T1.B < 3 OR T2.B > 3
```


The general rules for checking whether a condition is null-rejected for an outer join operation are simple:
- It is of the form A IS NOT NULL, where $A$ is an attribute of any of the inner tables
- It is a predicate containing a reference to an inner table that evaluates to UNKNOWN when one of its arguments is NULL
- It is a conjunction containing a null-rejected condition as a conjunct
- It is a disjunction of null-rejected conditions

A condition can be null-rejected for one outer join operation in a query and not null-rejected for another. In this query, the WHERE condition is null-rejected for the second outer join operation but is not nullrejected for the first one:
```
SELECT * FROM T1 LEFT JOIN T2 ON T2.A=T1.A
        LEFT JOIN T3 ON T3.B=T1.B
    WHERE T3.C > 0
```


If the WHERE condition is null-rejected for an outer join operation in a query, the outer join operation is replaced by an inner join operation.

For example, in the preceding query, the second outer join is null-rejected and can be replaced by an inner join:
```
SELECT * FROM T1 LEFT JOIN T2 ON T2.A=T1.A
        INNER JOIN T3 ON T3.B=T1.B
    WHERE T3.C > 0
```


For the original query, the optimizer evaluates only plans compatible with the single table-access order $\mathrm{T} 1, \mathrm{~T} 2, \mathrm{~T} 3$. For the rewritten query, it additionally considers the access order T3, T1, T2.

A conversion of one outer join operation may trigger a conversion of another. Thus, the query:
```
SELECT * FROM T1 LEFT JOIN T2 ON T2.A=T1.A
        LEFT JOIN T3 ON T3.B=T2.B
    WHERE T3.C > 0
```


Is first converted to the query:
```
SELECT * FROM T1 LEFT JOIN T2 ON T2.A=T1.A
    INNER JOIN T3 ON T3.B=T2.B
```

```
WHERE T3.C > 0
```


Which is equivalent to the query:
```
SELECT * FROM (T1 LEFT JOIN T2 ON T2.A=T1.A), T3
    WHERE T3.C > 0 AND T3.B=T2.B
```


The remaining outer join operation can also be replaced by an inner join because the condition T3. B=T2. B is null-rejected. This results in a query with no outer joins at all:
```
SELECT * FROM (T1 INNER JOIN T2 ON T2.A=T1.A), T3
    WHERE T3.C > 0 AND T3.B=T2.B
```


Sometimes the optimizer succeeds in replacing an embedded outer join operation, but cannot convert the embedding outer join. The following query:
```
SELECT * FROM T1 LEFT JOIN
        (T2 LEFT JOIN T3 ON T3.B=T2.B)
        ON T2.A=T1.A
    WHERE T3.C > 0
```


Is converted to:
```
SELECT * FROM T1 LEFT JOIN
        (T2 INNER JOIN T3 ON T3.B=T2.B)
        ON T2.A=T1.A
    WHERE T3.C > 0
```


That can be rewritten only to the form still containing the embedding outer join operation:
```
SELECT * FROM T1 LEFT JOIN
        (T2, T3)
        ON (T2.A=T1.A AND T3.B=T2.B)
    WHERE T3.C > 0
```


Any attempt to convert an embedded outer join operation in a query must take into account the join condition for the embedding outer join together with the WHERE condition. In this query, the WHERE condition is not null-rejected for the embedded outer join, but the join condition of the embedding outer join T2.A=T1.A AND T3.C=T1.C is null-rejected:
```
SELECT * FROM T1 LEFT JOIN
        (T2 LEFT JOIN T3 ON T3.B=T2.B)
        ON T2.A=T1.A AND T3.C=T1.C
    WHERE T3.D > 0 OR T1.D > 0
```


Consequently, the query can be converted to:
```
SELECT * FROM T1 LEFT JOIN
        (T2, T3)
        ON T2.A=T1.A AND T3.C=T1.C AND T3.B=T2.B
    WHERE T3.D > 0 OR T1.D > 0
```


\subsection*{10.2.1.11 Multi-Range Read Optimization}

Reading rows using a range scan on a secondary index can result in many random disk accesses to the base table when the table is large and not stored in the storage engine's cache. With the DiskSweep Multi-Range Read (MRR) optimization, MySQL tries to reduce the number of random disk access for range scans by first scanning the index only and collecting the keys for the relevant rows. Then the keys are sorted and finally the rows are retrieved from the base table using the order of the primary key. The motivation for Disk-sweep MRR is to reduce the number of random disk accesses and instead achieve a more sequential scan of the base table data.

The Multi-Range Read optimization provides these benefits:
- MRR enables data rows to be accessed sequentially rather than in random order, based on index tuples. The server obtains a set of index tuples that satisfy the query conditions, sorts them
according to data row ID order, and uses the sorted tuples to retrieve data rows in order. This makes data access more efficient and less expensive.
- MRR enables batch processing of requests for key access for operations that require access to data rows through index tuples, such as range index scans and equi-joins that use an index for the join attribute. MRR iterates over a sequence of index ranges to obtain qualifying index tuples. As these results accumulate, they are used to access the corresponding data rows. It is not necessary to acquire all index tuples before starting to read data rows.

The MRR optimization is not supported with secondary indexes created on virtual generated columns. InnoDB supports secondary indexes on virtual generated columns.

The following scenarios illustrate when MRR optimization can be advantageous:
Scenario A: MRR can be used for InnoDB and MyISAM tables for index range scans and equi-join operations.
1. A portion of the index tuples are accumulated in a buffer.
2. The tuples in the buffer are sorted by their data row ID.
3. Data rows are accessed according to the sorted index tuple sequence.

Scenario B: MRR can be used for NDB tables for multiple-range index scans or when performing an equi-join by an attribute.
1. A portion of ranges, possibly single-key ranges, is accumulated in a buffer on the central node where the query is submitted.
2. The ranges are sent to the execution nodes that access data rows.
3. The accessed rows are packed into packages and sent back to the central node.
4. The received packages with data rows are placed in a buffer.
5. Data rows are read from the buffer.

When MRR is used, the Extra column in EXPLAIN output shows Using MRR.
InnoDB and MyISAM do not use MRR if full table rows need not be accessed to produce the query result. This is the case if results can be produced entirely on the basis on information in the index tuples (through a covering index); MRR provides no benefit.

Two optimizer_switch system variable flags provide an interface to the use of MRR optimization. The mrr flag controls whether MRR is enabled. If mrr is enabled (on), the mrr_cost_based flag controls whether the optimizer attempts to make a cost-based choice between using and not using MRR (on) or uses MRR whenever possible (off). By default, mrr is on and mrr_cost_based is on. See Section 10.9.2, "Switchable Optimizations".

For MRR, a storage engine uses the value of the read_rnd_buffer_size system variable as a guideline for how much memory it can allocate for its buffer. The engine uses up to read_rnd_buffer_size bytes and determines the number of ranges to process in a single pass.

\subsection*{10.2.1.12 Block Nested-Loop and Batched Key Access Joins}

In MySQL, a Batched Key Access (BKA) Join algorithm is available that uses both index access to the joined table and a join buffer. The BKA algorithm supports inner join, outer join, and semijoin operations, including nested outer joins. Benefits of BKA include improved join performance due to more efficient table scanning. Also, the Block Nested-Loop (BNL) Join algorithm previously used only for inner joins is extended and can be employed for outer join and semijoin operations, including nested outer joins.

The following sections discuss the join buffer management that underlies the extension of the original BNL algorithm, the extended BNL algorithm, and the BKA algorithm. For information about semijoin strategies, see Optimizing IN and EXISTS Subquery Predicates with Semijoin Transformations
- Join Buffer Management for Block Nested-Loop and Batched Key Access Algorithms
- Block Nested-Loop Algorithm for Outer Joins and Semijoins
- Batched Key Access Joins
- Optimizer Hints for Block Nested-Loop and Batched Key Access Algorithms

\section*{Join Buffer Management for Block Nested-Loop and Batched Key Access Algorithms}

MySQL can employ join buffers to execute not only inner joins without index access to the inner table, but also outer joins and semijoins that appear after subquery flattening. Moreover, a join buffer can be effectively used when there is an index access to the inner table.

The join buffer management code slightly more efficiently utilizes join buffer space when storing the values of the interesting row columns: No additional bytes are allocated in buffers for a row column if its value is NULL, and the minimum number of bytes is allocated for any value of the VARCHAR type.

The code supports two types of buffers, regular and incremental. Suppose that join buffer B1 is employed to join tables t1 and t2 and the result of this operation is joined with table t3 using join buffer B2:
- A regular join buffer contains columns from each join operand. If B2 is a regular join buffer, each row $r$ put into B 2 is composed of the columns of a row $r 1$ from B 1 and the interesting columns of a matching row r2 from table t3.
- An incremental join buffer contains only columns from rows of the table produced by the second join operand. That is, it is incremental to a row from the first operand buffer. If B2 is an incremental join buffer, it contains the interesting columns of the row r2 together with a link to the row r1 from B1.

Incremental join buffers are always incremental relative to a join buffer from an earlier join operation, so the buffer from the first join operation is always a regular buffer. In the example just given, the buffer B1 used to join tables t1 and t2 must be a regular buffer.

Each row of the incremental buffer used for a join operation contains only the interesting columns of a row from the table to be joined. These columns are augmented with a reference to the interesting columns of the matched row from the table produced by the first join operand. Several rows in the incremental buffer can refer to the same row $r$ whose columns are stored in the previous join buffers insofar as all these rows match row $r$.

Incremental buffers enable less frequent copying of columns from buffers used for previous join operations. This provides a savings in buffer space because in the general case a row produced by the first join operand can be matched by several rows produced by the second join operand. It is unnecessary to make several copies of a row from the first operand. Incremental buffers also provide a savings in processing time due to the reduction in copying time.

The block_nested_loop flag of the optimizer_switch system variable controls hash joins.
The batched_key_access flag controls how the optimizer uses the Batched Key Access join algorithms.

By default, block_nested_loop is on and batched_key_access is off. See Section 10.9.2, "Switchable Optimizations". Optimizer hints may also be applied; see Optimizer Hints for Block NestedLoop and Batched Key Access Algorithms.

For information about semijoin strategies, see Optimizing IN and EXISTS Subquery Predicates with Semijoin Transformations

\section*{Block Nested-Loop Algorithm for Outer Joins and Semijoins}

The original implementation of the MySQL BNL algorithm was extended to support outer join and semijoin operations (and was later superseded by the hash join algorithm; see Section 10.2.1.4, "Hash Join Optimization").

When these operations are executed with a join buffer, each row put into the buffer is supplied with a match flag.

If an outer join operation is executed using a join buffer, each row of the table produced by the second operand is checked for a match against each row in the join buffer. When a match is found, a new extended row is formed (the original row plus columns from the second operand) and sent for further extensions by the remaining join operations. In addition, the match flag of the matched row in the buffer is enabled. After all rows of the table to be joined have been examined, the join buffer is scanned. Each row from the buffer that does not have its match flag enabled is extended by NULL complements (NULL values for each column in the second operand) and sent for further extensions by the remaining join operations.

The block_nested_loop flag of the optimizer_switch system variable controls hash joins.
See Section 10.9.2, "Switchable Optimizations", for more information. Optimizer hints may also be applied; see Optimizer Hints for Block Nested-Loop and Batched Key Access Algorithms.

In EXPLAIN output, use of BNL for a table is signified when the Extra value contains Using join buffer (Block Nested Loop) and the type value is ALL, index, or range.

For information about semijoin strategies, see Optimizing IN and EXISTS Subquery Predicates with Semijoin Transformations

\section*{Batched Key Access Joins}

MySQL implements a method of joining tables called the Batched Key Access (BKA) join algorithm. BKA can be applied when there is an index access to the table produced by the second join operand. Like the BNL join algorithm, the BKA join algorithm employs a join buffer to accumulate the interesting columns of the rows produced by the first operand of the join operation. Then the BKA algorithm builds keys to access the table to be joined for all rows in the buffer and submits these keys in a batch to the database engine for index lookups. The keys are submitted to the engine through the Multi-Range Read (MRR) interface (see Section 10.2.1.11, "Multi-Range Read Optimization"). After submission of the keys, the MRR engine functions perform lookups in the index in an optimal way, fetching the rows of the joined table found by these keys, and starts feeding the BKA join algorithm with matching rows. Each matching row is coupled with a reference to a row in the join buffer.

When BKA is used, the value of join_buffer_size defines how large the batch of keys is in each request to the storage engine. The larger the buffer, the more sequential access is made to the right hand table of a join operation, which can significantly improve performance.

For BKA to be used, the batched_key_access flag of the optimizer_switch system variable must be set to on. BKA uses MRR, so the mrr flag must also be on. Currently, the cost estimation for MRR is too pessimistic. Hence, it is also necessary for mrr_cost_based to be off for BKA to be used. The following setting enables BKA:
```
mysql> SET optimizer_switch='mrr=on,mrr_cost_based=off,batched_key_access=on';
```


There are two scenarios by which MRR functions execute:
- The first scenario is used for conventional disk-based storage engines such as InnoDB and MyISAM. For these engines, usually the keys for all rows from the join buffer are submitted to the MRR interface at once. Engine-specific MRR functions perform index lookups for the submitted keys, get row IDs (or primary keys) from them, and then fetch rows for all these selected row IDs one by one by request from BKA algorithm. Every row is returned with an association reference that enables access to the matched row in the join buffer. The rows are fetched by the MRR functions in an optimal way: They are fetched in the row ID (primary key) order. This improves performance because reads are in disk order rather than random order.
- The second scenario is used for remote storage engines such as NDB. A package of keys for a portion of rows from the join buffer, together with their associations, is sent by a MySQL Server (SQL node) to MySQL Cluster data nodes. In return, the SQL node receives a package (or several packages) of matching rows coupled with corresponding associations. The BKA join algorithm takes these rows and builds new joined rows. Then a new set of keys is sent to the data nodes and the rows from the returned packages are used to build new joined rows. The process continues until the last keys from the join buffer are sent to the data nodes, and the SQL node has received and joined all rows matching these keys. This improves performance because fewer key-bearing packages sent by the SQL node to the data nodes means fewer round trips between it and the data nodes to perform the join operation.

With the first scenario, a portion of the join buffer is reserved to store row IDs (primary keys) selected by index lookups and passed as a parameter to the MRR functions.

There is no special buffer to store keys built for rows from the join buffer. Instead, a function that builds the key for the next row in the buffer is passed as a parameter to the MRR functions.

In EXPLAIN output, use of BKA for a table is signified when the Extra value contains Using join buffer (Batched Key Access) and the type value is ref or eq_ref.

\section*{Optimizer Hints for Block Nested-Loop and Batched Key Access Algorithms}

In addition to using the optimizer_switch system variable to control optimizer use of the BNL and BKA algorithms session-wide, MySQL supports optimizer hints to influence the optimizer on a perstatement basis. See Section 10.9.3, "Optimizer Hints".

To use a BNL or BKA hint to enable join buffering for any inner table of an outer join, join buffering must be enabled for all inner tables of the outer join.

\subsection*{10.2.1.13 Condition Filtering}

In join processing, prefix rows are those rows passed from one table in a join to the next. In general, the optimizer attempts to put tables with low prefix counts early in the join order to keep the number of row combinations from increasing rapidly. To the extent that the optimizer can use information about conditions on rows selected from one table and passed to the next, the more accurately it can compute row estimates and choose the best execution plan.

Without condition filtering, the prefix row count for a table is based on the estimated number of rows selected by the WHERE clause according to whichever access method the optimizer chooses. Condition filtering enables the optimizer to use other relevant conditions in the WHERE clause not taken into account by the access method, and thus improve its prefix row count estimates. For example, even though there might be an index-based access method that can be used to select rows from the current table in a join, there might also be additional conditions for the table in the WHERE clause that can filter (further restrict) the estimate for qualifying rows passed to the next table.

A condition contributes to the filtering estimate only if:
- It refers to the current table.
- It depends on a constant value or values from earlier tables in the join sequence.
- It was not already taken into account by the access method.

In EXPLAIN output, the rows column indicates the row estimate for the chosen access method, and the filtered column reflects the effect of condition filtering. filtered values are expressed as percentages. The maximum value is 100 , which means no filtering of rows occurred. Values decreasing from 100 indicate increasing amounts of filtering.

The prefix row count (the number of rows estimated to be passed from the current table in a join to the next) is the product of the rows and filtered values. That is, the prefix row count is the estimated row count, reduced by the estimated filtering effect. For example, if rows is 1000 and filtered is
$20 \%$, condition filtering reduces the estimated row count of 1000 to a prefix row count of $1000 \times 20 \%= 1000 \times .2=200$.

Consider the following query:
```
SELECT *
    FROM employee JOIN department ON employee.dept_no = department.dept_no
    WHERE employee.first_name = 'John'
    AND employee.hire_date BETWEEN '2018-01-01' AND '2018-06-01';
```


Suppose that the data set has these characteristics:
- The employee table has 1024 rows.
- The department table has 12 rows.
- Both tables have an index on dept_no.
- The employee table has an index on first_name.
- 8 rows satisfy this condition on employee.first_name:
```
employee.first_name = 'John'
```

- 150 rows satisfy this condition on employee.hire_date:
```
employee.hire_date BETWEEN '2018-01-01' AND '2018-06-01'
```

- 1 row satisfies both conditions:
```
employee.first_name = 'John'
AND employee.hire_date BETWEEN '2018-01-01' AND '2018-06-01'
```


Without condition filtering, EXPLAIN produces output like this:
```
+----+-------------+--------+------------------+---------+---------+------+---------
| id | table | type | possible_keys | key | ref | rows | filtered |
+----+-------------+--------+------------------+---------+---------+------+---------
| 1 | employee | ref | name,h_date,dept | name | const | 8 | 100.00
| 1 | department | eq_ref | PRIMARY | PRIMARY | dept_no | 1 | 100.00
+----+-------------+--------+-----------------+--------+--------+------+---------+
```


For employee, the access method on the name index picks up the 8 rows that match a name of ${ }^{\prime}$ John '. No filtering is done (filtered is 100\%), so all rows are prefix rows for the next table: The prefix row count is rows × filtered $=8 \times 100 \%=8$.

With condition filtering, the optimizer additionally takes into account conditions from the WHERE clause not taken into account by the access method. In this case, the optimizer uses heuristics to estimate a filtering effect of $16.31 \%$ for the BETWEEN condition on employee.hire_date. As a result, EXPLAIN produces output like this:
```
+----+-------------+--------+------------------+---------+--------+-----------------
| id | table | type | possible_keys | key | ref | rows | filtered |
+----+-------------+--------+------------------+---------+---------+------+---------+
| 1 | employee | ref | name,h_date,dept | name | const | 8 | 16.31
| 1 | department | eq_ref | PRIMARY | PRIMARY | dept_no | 1 | 100.00
+----+-------------+---------+------------------+---------+---------+----------------
```


Now the prefix row count is rows × filtered $=8 \times 16.31 \%=1.3$, which more closely reflects actual data set.

Normally, the optimizer does not calculate the condition filtering effect (prefix row count reduction) for the last joined table because there is no next table to pass rows to. An exception occurs for EXPLAIN: To provide more information, the filtering effect is calculated for all joined tables, including the last one.

To control whether the optimizer considers additional filtering conditions, use the condition_fanout_filter flag of the optimizer_switch system variable (see Section 10.9.2,
"Switchable Optimizations"). This flag is enabled by default but can be disabled to suppress condition filtering (for example, if a particular query is found to yield better performance without it).

If the optimizer overestimates the effect of condition filtering, performance may be worse than if condition filtering is not used. In such cases, these techniques may help:
- If a column is not indexed, index it so that the optimizer has some information about the distribution of column values and can improve its row estimates.
- Similarly, if no column histogram information is available, generate a histogram (see Section 10.9.6, "Optimizer Statistics").
- Change the join order. Ways to accomplish this include join-order optimizer hints (see Section 10.9.3, "Optimizer Hints"), STRAIGHT_JOIN immediately following the SELECT, and the STRAIGHT_JOIN join operator.
- Disable condition filtering for the session:
```
SET optimizer_switch = 'condition_fanout_filter=off';
```


Or, for a given query, using an optimizer hint:
```
SELECT /*+ SET_VAR(optimizer_switch = 'condition_fanout_filter=off') */ ...
```


\subsection*{10.2.1.14 Constant-Folding Optimization}

Comparisons between constants and column values in which the constant value is out of range or of the wrong type with respect to the column type are now handled once during query optimization rather row-by-row than during execution. The comparisons that can be treated in this manner are >, >=, <, <=, <>/! =, =, and <=>.

Consider the table created by the following statement:
CREATE TABLE t (c TINYINT UNSIGNED NOT NULL);
The WHERE condition in the query SELECT * FROM t WHERE $\mathrm{c}<256$ contains the integral constant 256 which is out of range for a TINYINT UNSIGNED column. Previously, this was handled by treating both operands as the larger type, but now, since any allowed value for c is less than the constant, the WHERE expression can instead be folded as WHERE 1 , so that the query is rewritten as SELECT * FROM t WHERE 1.

This makes it possible for the optimizer to remove the WHERE expression altogether. If the column c were nullable (that is, defined only as TINYINT UNSIGNED) the query would be rewritten like this:
```
SELECT * FROM t WHERE ti IS NOT NULL
```


Folding is performed for constants compared to supported MySQL column types as follows:
- Integer column type. Integer types are compared with constants of the following types as described here:
- Integer value. If the constant is out of range for the column type, the comparison is folded to 1 or IS NOT NULL, as already shown.

If the constant is a range boundary, the comparison is folded to $=$. For example (using the same table as already defined):
```
mysql> EXPLAIN SELECT * FROM t WHERE c >= 255;
************************** 1. row *****************************************
            id: 1
    select_type: SIMPLE
        table: t
        partitions: NULL
        type: ALL
possible_keys: NULL
```

```
                    key: NULL
            key_len: NULL
                    ref: NULL
                rows: 5
        filtered: 20.00
            Extra: Using where
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS;
************************* 1. row *******************************
    Level: Note
    Code: 1003
Message: /* select#1 */ select ˋtestˋ.ˋtˋ.ˋtiˋ AS ˋtiˋ from ˋtestˋ.ˋtˋ where (ˋtestˋ.ˋtˋ.ˋtiˋ = 255
1 row in set (0.00 sec)
```

- Floating- or fixed-point value. If the constant is one of the decimal types (such as DECIMAL, REAL, DOUBLE, or FLOAT) and has a nonzero decimal portion, it cannot be equal; fold accordingly. For other comparisons, round up or down to an integer value according to the sign, then perform a range check and handle as already described for integer-integer comparisons.

A REAL value that is too small to be represented as DECIMAL is rounded to .01 or - .01 depending on the sign, then handled as a DECIMAL.
- String types. Try to interpret the string value as an integer type, then handle the comparison as between integer values. If this fails, attempt to handle the value as a REAL.
- DECIMAL or REAL column. Decimal types are compared with constants of the following types as described here:
- Integer value. Perform a range check against the column value's integer part. If no folding results, convert the constant to DECIMAL with the same number of decimal places as the column value, then check it as a DECIMAL (see next).
- DECIMAL or REAL value. Check for overflow (that is, whether the constant has more digits in its integer part than allowed for the column's decimal type). If so, fold.

If the constant has more significant fractional digits than column's type, truncate the constant. If the comparison operator is = or <>, fold. If the operator is >= or <=, adjust the operator due to truncation. For example, if column's type is $\operatorname{DECIMAL}(3,1)$, SELECT * FROM $t$ WHERE $f>=$ 10.13 becomes SELECT * FROM t WHERE $\mathrm{f}>10.1$.

If the constant has fewer decimal digits than the column's type, convert it to a constant with same number of digits. For underflow of a REAL value (that is, too few fractional digits to represent it), convert the constant to decimal 0 .
- String value. If the value can be interpreted as an integer type, handle it as such. Otherwise, try to handle it as REAL.
- FLOAT or DOUBLE column. FLOAT $(m, n)$ or $\operatorname{DOUBLE}(m, n)$ values compared with constants are handled as follows:

If the value overflows the range of the column, fold.
If the value has more than $n$ decimals, truncate, compensating during folding. For $=$ and <> comparisons, fold to TRUE, FALSE, or IS [NOT] NULL as described previously; for other operators, adjust the operator.

If the value has more than $m$ integer digits, fold.
Limitations. This optimization cannot be used in the following cases:
1. With comparisons using BETWEEN or IN.
2. With BIT columns or columns using date or time types.
3. During the preparation phase for a prepared statement, although it can be applied during the optimization phase when the prepared statement is actually executed. This due to the fact that, during statement preparation, the value of the constant is not yet known.

\subsection*{10.2.1.15 IS NULL Optimization}

MySQL can perform the same optimization on col_name IS NULL that it can use for col_name = constant_value. For example, MySQL can use indexes and ranges to search for NULL with IS NULL.

Examples:
```
SELECT * FROM tbl_name WHERE key_col IS NULL;
SELECT * FROM tbl_name WHERE key_col <=> NULL;
SELECT * FROM tbl_name
    WHERE key_col=const1 OR key_col=const2 OR key_col IS NULL;
```


If a WHERE clause includes a col_name IS NULL condition for a column that is declared as NOT NULL, that expression is optimized away. This optimization does not occur in cases when the column might produce NULL anyway (for example, if it comes from a table on the right side of a LEFT JOIN).

MySQL can also optimize the combination col_name = expr OR col_name IS NULL, a form that is common in resolved subqueries. EXPLAIN shows ref_or_null when this optimization is used.

This optimization can handle one IS NULL for any key part.
Some examples of queries that are optimized, assuming that there is an index on columns a and b of table t2:
```
SELECT * FROM t1 WHERE t1.a=expr OR t1.a IS NULL;
SELECT * FROM t1, t2 WHERE t1.a=t2.a OR t2.a IS NULL;
SELECT * FROM t1, t2
    WHERE (t1.a=t2.a OR t2.a IS NULL) AND t2.b=t1.b;
SELECT * FROM t1, t2
    WHERE t1.a=t2.a AND (t2.b=t1.b OR t2.b IS NULL);
SELECT * FROM t1, t2
    WHERE (t1.a=t2.a AND t2.a IS NULL AND ...)
    OR (t1.a=t2.a AND t2.a IS NULL AND ...);
```

ref_or_null works by first doing a read on the reference key, and then a separate search for rows with a NULL key value.

The optimization can handle only one IS NULL level. In the following query, MySQL uses key lookups only on the expression (t1.a=t2.a AND t2.a IS NULL) and is not able to use the key part on b:
```
SELECT * FROM t1, t2
    WHERE (t1.a=t2.a AND t2.a IS NULL)
    OR (t1.b=t2.b AND t2.b IS NULL);
```


\subsection*{10.2.1.16 ORDER BY Optimization}

This section describes when MySQL can use an index to satisfy an ORDER BY clause, the filesort operation used when an index cannot be used, and execution plan information available from the optimizer about ORDER BY.

An ORDER BY with and without LIMIT may return rows in different orders, as discussed in Section 10.2.1.19, "LIMIT Query Optimization".
- Use of Indexes to Satisfy ORDER BY
- Use of filesort to Satisfy ORDER BY
- Influencing ORDER BY Optimization
- ORDER BY Execution Plan Information Available

\section*{Use of Indexes to Satisfy ORDER BY}

In some cases, MySQL may use an index to satisfy an ORDER BY clause and avoid the extra sorting involved in performing a filesort operation.

The index may also be used even if the ORDER BY does not match the index exactly, as long as all unused portions of the index and all extra ORDER BY columns are constants in the WHERE clause. If the index does not contain all columns accessed by the query, the index is used only if index access is cheaper than other access methods.

Assuming that there is an index on ( key_part1, key_part2), the following queries may use the index to resolve the ORDER BY part. Whether the optimizer actually does so depends on whether reading the index is more efficient than a table scan if columns not in the index must also be read.
- In this query, the index on (key_part1, key_part2) enables the optimizer to avoid sorting:
```
SELECT * FROM t1
    ORDER BY key_part1, key_part2;
```


However, the query uses SELECT *, which may select more columns than key_part1 and key_part2. In that case, scanning an entire index and looking up table rows to find columns not in the index may be more expensive than scanning the table and sorting the results. If so, the optimizer probably does not use the index. If SELECT * selects only the index columns, the index is used and sorting avoided.

If t1 is an InnoDB table, the table primary key is implicitly part of the index, and the index can be used to resolve the ORDER BY for this query:
```
SELECT pk, key_part1, key_part2 FROM t1
    ORDER BY key_part1, key_part2;
```

- In this query, key_part1 is constant, so all rows accessed through the index are in key_part2 order, and an index on (key_part1, key_part2) avoids sorting if the WHERE clause is selective enough to make an index range scan cheaper than a table scan:
```
SELECT * FROM t1
    WHERE key_part1 = constant
    ORDER BY key_part2;
```

- In the next two queries, whether the index is used is similar to the same queries without DESC shown previously:
```
SELECT * FROM t1
    ORDER BY key_part1 DESC, key_part2 DESC;
SELECT * FROM t1
    WHERE key_part1 = constant
    ORDER BY key_part2 DESC;
```

- Two columns in an ORDER BY can sort in the same direction (both ASC, or both DESC) or in opposite directions (one ASC, one DESC). A condition for index use is that the index must have the same homogeneity, but need not have the same actual direction.

If a query mixes ASC and DESC, the optimizer can use an index on the columns if the index also uses corresponding mixed ascending and descending columns:
```
SELECT * FROM t1
    ORDER BY key_part1 DESC, key_part2 ASC;
```


The optimizer can use an index on (key_part1, key_part2) if key_part1 is descending and key_part2 is ascending. It can also use an index on those columns (with a backward scan) if key_part1 is ascending and key_part2 is descending. See Section 10.3.13, "Descending Indexes".
- In the next two queries, key_part1 is compared to a constant. The index is used if the WHERE clause is selective enough to make an index range scan cheaper than a table scan:
```
SELECT * FROM t1
    WHERE key_part1 > constant
    ORDER BY key_part1 ASC;
SELECT * FROM t1
    WHERE key_part1 < constant
    ORDER BY key_part1 DESC;
```

- In the next query, the ORDER BY does not name key_part1, but all rows selected have a constant key_part1 value, so the index can still be used:
```
SELECT * FROM t1
    WHERE key_part1 = constant1 AND key_part2 > constant2
    ORDER BY key_part2;
```


In some cases, MySQL cannot use indexes to resolve the ORDER BY, although it may still use indexes to find the rows that match the WHERE clause. Examples:
- The query uses ORDER BY on different indexes:
```
SELECT * FROM t1 ORDER BY key1, key2;
```

- The query uses ORDER BY on nonconsecutive parts of an index:
```
SELECT * FROM t1 WHERE key2=constant ORDER BY key1_part1, key1_part3;
```

- The index used to fetch the rows differs from the one used in the ORDER BY:
```
SELECT * FROM t1 WHERE key2=constant ORDER BY key1;
```

- The query uses ORDER BY with an expression that includes terms other than the index column name:
```
SELECT * FROM t1 ORDER BY ABS(key);
SELECT * FROM t1 ORDER BY -key;
```

- The query joins many tables, and the columns in the ORDER BY are not all from the first nonconstant table that is used to retrieve rows. (This is the first table in the EXPLAIN output that does not have a const join type.)
- The query has different ORDER BY and GROUP BY expressions.
- There is an index on only a prefix of a column named in the ORDER BY clause. In this case, the index cannot be used to fully resolve the sort order. For example, if only the first 10 bytes of a CHAR (20) column are indexed, the index cannot distinguish values past the 10th byte and a filesort is needed.
- The index does not store rows in order. For example, this is true for a HASH index in a MEMORY table.

Availability of an index for sorting may be affected by the use of column aliases. Suppose that the column t1. a is indexed. In this statement, the name of the column in the select list is a. It refers to t1. a, as does the reference to a in the ORDER BY, so the index on t1. a can be used:

\section*{SELECT a FROM t1 ORDER BY a;}

In this statement, the name of the column in the select list is also a, but it is the alias name. It refers to ABS (a), as does the reference to a in the ORDER BY, so the index on t1. a cannot be used:
```
SELECT ABS(a) AS a FROM t1 ORDER BY a;
```


In the following statement, the ORDER BY refers to a name that is not the name of a column in the select list. But there is a column in t1 named a, so the ORDER BY refers to t1. a and the index on t1. a can be used. (The resulting sort order may be completely different from the order for ABS (a), of course.)
```
SELECT ABS(a) AS b FROM t1 ORDER BY a;
```


Previously (MySQL 8.3 and lower), GROUP BY sorted implicitly under certain conditions. In MySQL 8.4, that no longer occurs, so specifying ORDER BY NULL at the end to suppress implicit sorting (as was done previously) is no longer necessary. However, query results may differ from previous MySQL versions. To produce a given sort order, provide an ORDER BY clause.

\section*{Use of filesort to Satisfy ORDER BY}

If an index cannot be used to satisfy an ORDER BY clause, MySQL performs a filesort operation that reads table rows and sorts them. A filesort constitutes an extra sorting phase in query execution.

To obtain memory for filesort operations, the optimizer allocates memory buffers incrementally as needed, up to the size indicated by the sort_buffer_size system variable. This enables users to set sort_buffer_size to larger values to speed up larger sorts, without concern for excessive memory use for small sorts. (This benefit may not occur for multiple concurrent sorts on Windows, which has a weak multithreaded malloc.)

A filesort operation uses temporary disk files as necessary if the result set is too large to fit in memory. Some types of queries are particularly suited to completely in-memory filesort operations. For example, the optimizer can use filesort to efficiently handle in memory, without temporary files, the ORDER BY operation for queries (and subqueries) of the following form:
```
SELECT ... FROM single_table ... ORDER BY non_index_column [DESC] LIMIT [M,]N;
```


Such queries are common in web applications that display only a few rows from a larger result set. Examples:
```
SELECT col1, ... FROM t1 ... ORDER BY name LIMIT 10;
SELECT col1, ... FROM t1 ... ORDER BY RAND() LIMIT 15;
```


\section*{Influencing ORDER BY Optimization}

To increase ORDER BY speed, check whether you can get MySQL to use indexes rather than an extra sorting phase. If this is not possible, try the following strategies:
- Increase the sort_buffer_size variable value. Ideally, the value should be large enough for the entire result set to fit in the sort buffer (to avoid writes to disk and merge passes).

Take into account that the size of column values stored in the sort buffer is affected by the max_sort_length system variable value. For example, if tuples store values of long string columns and you increase the value of max_sort_length, the size of sort buffer tuples increases as well and may require you to increase sort_buffer_size.

To monitor the number of merge passes (to merge temporary files), check the Sort_merge_passes status variable.
- Increase the read_rnd_buffer_size variable value so that more rows are read at a time.
- Change the tmpdir system variable to point to a dedicated file system with large amounts of free space. The variable value can list several paths that are used in round-robin fashion; you can use this feature to spread the load across several directories. Separate the paths by colon characters (:) on Unix and semicolon characters (;) on Windows. The paths should name directories in file systems located on different physical disks, not different partitions on the same disk.

\section*{ORDER BY Execution Plan Information Available}

With EXPLAIN (see Section 10.8.1, "Optimizing Queries with EXPLAIN"), you can check whether MySQL can use indexes to resolve an ORDER BY clause:
- If the Extra column of EXPLAIN output does not contain Using filesort, the index is used and a filesort is not performed.
- If the Extra column of EXPLAIN output contains Using filesort, the index is not used and a filesort is performed.

In addition, if a filesort is performed, optimizer trace output includes a filesort_summary block. For example:
```
"filesort_summary": {
    "rows": 100,
    "examined_rows": 100,
    "number_of_tmp_files": 0,
    "peak_memory_used": 25192,
    "sort_mode": "<sort_key, packed_additional_fields>"
}
```

peak_memory_used indicates the maximum memory used at any one time during the sort. This is a value up to but not necessarily as large as the value of the sort_buffer_size system variable. The optimizer allocates sort-buffer memory incrementally, beginning with a small amount and adding more as necessary, up to sort_buffer_size bytes.)

The sort_mode value provides information about the contents of tuples in the sort buffer:
- <sort_key, rowid>: This indicates that sort buffer tuples are pairs that contain the sort key value and row ID of the original table row. Tuples are sorted by sort key value and the row ID is used to read the row from the table.
- <sort_key, additional_fields>: This indicates that sort buffer tuples contain the sort key value and columns referenced by the query. Tuples are sorted by sort key value and column values are read directly from the tuple.
- <sort_key, packed_additional_fields>: Like the previous variant, but the additional columns are packed tightly together instead of using a fixed-length encoding.

EXPLAIN does not distinguish whether the optimizer does or does not perform a filesort in memory. Use of an in-memory filesort can be seen in optimizer trace output. Look for filesort_priority_queue_optimization. For information about the optimizer trace, see Section 10.15, "Tracing the Optimizer".

\subsection*{10.2.1.17 GROUP BY Optimization}

The most general way to satisfy a GROUP BY clause is to scan the whole table and create a new temporary table where all rows from each group are consecutive, and then use this temporary table to discover groups and apply aggregate functions (if any). In some cases, MySQL is able to do much better than that and avoid creation of temporary tables by using index access.

The most important preconditions for using indexes for GROUP BY are that all GROUP BY columns reference attributes from the same index, and that the index stores its keys in order (as is true, for example, for a BTREE index, but not for a HASH index). Whether use of temporary tables can be replaced by index access also depends on which parts of an index are used in a query, the conditions specified for these parts, and the selected aggregate functions.

There are two ways to execute a GROUP BY query through index access, as detailed in the following sections. The first method applies the grouping operation together with all range predicates (if any). The second method first performs a range scan, and then groups the resulting tuples.
- Loose Index Scan
- Tight Index Scan

Loose Index Scan can also be used in the absence of GROUP BY under some conditions. See Skip Scan Range Access Method.

\section*{Loose Index Scan}

The most efficient way to process GROUP BY is when an index is used to directly retrieve the grouping columns. With this access method, MySQL uses the property of some index types that the keys are ordered (for example, BTREE). This property enables use of lookup groups in an index without having to consider all keys in the index that satisfy all WHERE conditions. This access method considers only a fraction of the keys in an index, so it is called a Loose Index Scan. When there is no WHERE clause, a Loose Index Scan reads as many keys as the number of groups, which may be a much smaller number than that of all keys. If the WHERE clause contains range predicates (see the discussion of the range join type in Section 10.8.1, "Optimizing Queries with EXPLAIN"), a Loose Index Scan looks up the first key of each group that satisfies the range conditions, and again reads the smallest possible number of keys. This is possible under the following conditions:
- The query is over a single table.
- The GROUP BY names only columns that form a leftmost prefix of the index and no other columns. (If, instead of GROUP BY, the query has a DISTINCT clause, all distinct attributes refer to columns that form a leftmost prefix of the index.) For example, if a table t1 has an index on (c1,c2,c3), Loose Index Scan is applicable if the query has GROUP BY $\mathrm{c} 1, \mathrm{c} 2$. It is not applicable if the query has GROUP BY c2, c3 (the columns are not a leftmost prefix) or GROUP BY c1, c2, c4 (c4 is not in the index).
- The only aggregate functions used in the select list (if any) are MIN ( ) and MAX ( ), and all of them refer to the same column. The column must be in the index and must immediately follow the columns in the GROUP BY.
- Any other parts of the index than those from the GROUP BY referenced in the query must be constants (that is, they must be referenced in equalities with constants), except for the argument of MIN( ) or MAX( ) functions.
- For columns in the index, full column values must be indexed, not just a prefix. For example, with c1 VARCHAR(20), INDEX (c1(10)), the index uses only a prefix of c1 values and cannot be used for Loose Index Scan.

If Loose Index Scan is applicable to a query, the EXPLAIN output shows Using index for groupby in the Extra column.

Assume that there is an index idx(c1, c2, c3) on table t1(c1, c2, c3, c4). The Loose Index Scan access method can be used for the following queries:
```
SELECT c1, c2 FROM t1 GROUP BY c1, c2;
SELECT DISTINCT c1, c2 FROM t1;
SELECT c1, MIN(c2) FROM t1 GROUP BY c1;
SELECT c1, c2 FROM t1 WHERE c1 < const GROUP BY c1, c2;
SELECT MAX(c3), MIN(c3), c1, c2 FROM t1 WHERE c2 > const GROUP BY c1, c2;
SELECT c2 FROM t1 WHERE c1 < const GROUP BY c1, c2;
SELECT c1, c2 FROM t1 WHERE c3 = const GROUP BY c1, c2;
```


The following queries cannot be executed with this quick select method, for the reasons given:
- There are aggregate functions other than MIN( ) or MAX( ):
```
SELECT c1, SUM(c2) FROM t1 GROUP BY c1;
```

- The columns in the GROUP BY clause do not form a leftmost prefix of the index:

SELECT c1, c2 FROM t1 GROUP BY c2, c3;
- The query refers to a part of a key that comes after the GROUP BY part, and for which there is no equality with a constant:

SELECT c1, c3 FROM t1 GROUP BY c1, c2;
Were the query to include WHERE c3 = const, Loose Index Scan could be used.
The Loose Index Scan access method can be applied to other forms of aggregate function references in the select list, in addition to the MIN ( ) and MAX( ) references already supported:
- AVG(DISTINCT), SUM(DISTINCT), and COUNT(DISTINCT) are supported. AVG(DISTINCT) and SUM(DISTINCT) take a single argument. COUNT(DISTINCT) can have more than one column argument.
- There must be no GROUP BY or DISTINCT clause in the query.
- The Loose Index Scan limitations described previously still apply.

Assume that there is an index idx(c1, c2, c3) on table t1(c1, c2, c3, c4). The Loose Index Scan access method can be used for the following queries:

SELECT COUNT(DISTINCT c1), SUM(DISTINCT c1) FROM t1;
SELECT COUNT(DISTINCT c1, c2), COUNT(DISTINCT c2, c1) FROM t1;

\section*{Tight Index Scan}

A Tight Index Scan may be either a full index scan or a range index scan, depending on the query conditions.

When the conditions for a Loose Index Scan are not met, it still may be possible to avoid creation of temporary tables for GROUP BY queries. If there are range conditions in the WHERE clause, this method reads only the keys that satisfy these conditions. Otherwise, it performs an index scan. Because this method reads all keys in each range defined by the WHERE clause, or scans the whole index if there are no range conditions, it is called a Tight Index Scan. With a Tight Index Scan, the grouping operation is performed only after all keys that satisfy the range conditions have been found.

For this method to work, it is sufficient that there be a constant equality condition for all columns in a query referring to parts of the key coming before or in between parts of the GROUP BY key. The constants from the equality conditions fill in any "gaps" in the search keys so that it is possible to form complete prefixes of the index. These index prefixes then can be used for index lookups. If the GROUP BY result requires sorting, and it is possible to form search keys that are prefixes of the index, MySQL also avoids extra sorting operations because searching with prefixes in an ordered index already retrieves all the keys in order.

Assume that there is an index idx(c1, c2, c3) on table t1(c1, c2, c3, c4). The following queries do not work with the Loose Index Scan access method described previously, but still work with the Tight Index Scan access method.
- There is a gap in the GROUP BY, but it is covered by the condition $\mathrm{c} 2={ }^{\prime} \mathrm{a}$ ':
```
SELECT c1, c2, c3 FROM t1 WHERE c2 = 'a' GROUP BY c1, c3;
```

- The GROUP BY does not begin with the first part of the key, but there is a condition that provides a constant for that part:

SELECT c1, c2, c3 FROM t1 WHERE c1 = 'a' GROUP BY c2, c3;

\subsection*{10.2.1.18 DISTINCT Optimization}

DISTINCT combined with ORDER BY needs a temporary table in many cases.
Because DISTINCT may use GROUP BY, learn how MySQL works with columns in ORDER BY or HAVING clauses that are not part of the selected columns. See Section 14.19.3, "MySQL Handling of GROUP BY".

In most cases, a DISTINCT clause can be considered as a special case of GROUP BY. For example, the following two queries are equivalent:
```
SELECT DISTINCT c1, c2, c3 FROM t1
WHERE c1 > const;
SELECT c1, c2, c3 FROM t1
WHERE c1 > const GROUP BY c1, c2, c3;
```


Due to this equivalence, the optimizations applicable to GROUP BY queries can be also applied to queries with a DISTINCT clause. Thus, for more details on the optimization possibilities for DISTINCT queries, see Section 10.2.1.17, "GROUP BY Optimization".

When combining LIMIT row_count with DISTINCT, MySQL stops as soon as it finds row_count unique rows.

If you do not use columns from all tables named in a query, MySQL stops scanning any unused tables as soon as it finds the first match. In the following case, assuming that t1 is used before t2 (which you can check with EXPLAIN), MySQL stops reading from t2 (for any particular row in t1) when it finds the first row in t2:
```
SELECT DISTINCT t1.a FROM t1, t2 where t1.a=t2.a;
```


\subsection*{10.2.1.19 LIMIT Query Optimization}

If you need only a specified number of rows from a result set, use a LIMIT clause in the query, rather than fetching the whole result set and throwing away the extra data.

MySQL sometimes optimizes a query that has a LIMIT row_count clause and no HAVING clause:
- If you select only a few rows with LIMIT, MySQL uses indexes in some cases when normally it would prefer to do a full table scan.
- If you combine LIMIT row_count with ORDER BY, MySQL stops sorting as soon as it has found the first row_count rows of the sorted result, rather than sorting the entire result. If ordering is done by using an index, this is very fast. If a filesort must be done, all rows that match the query without the LIMIT clause are selected, and most or all of them are sorted, before the first row_count are found. After the initial rows have been found, MySQL does not sort any remainder of the result set.

One manifestation of this behavior is that an ORDER BY query with and without LIMIT may return rows in different order, as described later in this section.
- If you combine LIMIT row_count with DISTINCT, MySQL stops as soon as it finds row_count unique rows.
- In some cases, a GROUP BY can be resolved by reading the index in order (or doing a sort on the index), then calculating summaries until the index value changes. In this case, LIMIT row_count does not calculate any unnecessary GROUP BY values.
- As soon as MySQL has sent the required number of rows to the client, it aborts the query unless you are using SQL_CALC_FOUND_ROWS. In that case, the number of rows can be retrieved with SELECT FOUND_ROWS( ). See Section 14.15, "Information Functions".
- LIMIT 0 quickly returns an empty set. This can be useful for checking the validity of a query. It can also be employed to obtain the types of the result columns within applications that use a MySQL API that makes result set metadata available. With the mysql client program, you can use the -column-type-info option to display result column types.
- If the server uses temporary tables to resolve a query, it uses the LIMIT row_count clause to calculate how much space is required.
- If an index is not used for ORDER BY but a LIMIT clause is also present, the optimizer may be able to avoid using a merge file and sort the rows in memory using an in-memory filesort operation.

If multiple rows have identical values in the ORDER BY columns, the server is free to return those rows in any order, and may do so differently depending on the overall execution plan. In other words, the sort order of those rows is nondeterministic with respect to the nonordered columns.

One factor that affects the execution plan is LIMIT, so an ORDER BY query with and without LIMIT may return rows in different orders. Consider this query, which is sorted by the category column but nondeterministic with respect to the id and rating columns:
```
mysql> SELECT * FROM ratings ORDER BY category;
+----+-----------+--------+
| id | category | rating |
+----+-----------+--------+

\begin{tabular}{|l|l|l|l|}
\hline 1 & 1 & 4.5 \\
\hline 5 & 1 & 3.2 \\
\hline 3 & 2 & 3.7 \\
\hline 4 & 2 & 3.5 \\
\hline 6 & 2 & 3.5 \\
\hline 2 & 3 & 5.0 \\
\hline 7 & 3 & 2.7 \\
\hline
\end{tabular}
```


Including LIMIT may affect order of rows within each category value. For example, this is a valid query result:
```
mysql> SELECT * FROM ratings ORDER BY category LIMIT 5;
+----+-----------+--------+
| id | category | rating |
+----+-----------+--------+

\begin{tabular}{|r|r|r|r|}
$\mid$ & 1 & 1 & 4.5 \\
$\mid$ & 5 & 1 & 3.2 \\
$\mid$ & 4 & 2 & 3.5 \\
$\mid$ & 3 & 2 & 3.7 \\
6 & 2 & 3.5 \\
$\mid$ & &
\end{tabular}
```


In each case, the rows are sorted by the ORDER BY column, which is all that is required by the SQL standard.

If it is important to ensure the same row order with and without LIMIT, include additional columns in the ORDER BY clause to make the order deterministic. For example, if id values are unique, you can make rows for a given category value appear in id order by sorting like this:
```
mysql> SELECT * FROM ratings ORDER BY category, id;
+----+-----------+--------+
| id | category | rating |
+----+-----------+--------+
| 1 | 1 | 4.5 |
|5 | 1 | 3.2 |
|3 | 2 | 3.7 |
\begin{array} { l l l l } { 4 } & { 2 } & { 3 . 5 } \\ { 6 } & { 2 } & { 3 . 5 } \end{array}
|2 | 3 | 5.0 |
|7 3 | 2.7 |
+----+-----------+--------+
mysql> SELECT * FROM ratings ORDER BY category, id LIMIT 5;
+----+-----------+--------+
| id | category | rating |
+----+-----------+--------+

\begin{tabular}{llll|l|}
$\mid$ & 1 & 1 & 4.5 \\
$\mid$ & 5 & 1 & 3.2 \\
$\mid$ & $3 \mid$ & 2 & 3.7
\end{tabular}
```


\begin{tabular}{rrr|r}
$\mid$ & 4 & 2 & 3.5 \\
$\mid$ & 6 & $\mid$ & 2 \\
+ & 3.5 & $\mid$ \\
& &
\end{tabular}

For a query with an ORDER BY or GROUP BY and a LIMIT clause, the optimizer tries to choose an ordered index by default when it appears doing so would speed up query execution. In cases where using some other optimization might be faster, it is possible to turn off this optimization by setting the optimizer_switch system variable's prefer_ordering_index flag to off.

Example: First we create and populate a table t as shown here:
```
# Create and populate a table t:
mysql> CREATE TABLE t (
    -> id1 BIGINT NOT NULL,
    -> id2 BIGINT NOT NULL,
    -> c1 VARCHAR(50) NOT NULL,
    -> c2 VARCHAR(50) NOT NULL,
    -> PRIMARY KEY (id1),
    -> INDEX i (id2, c1)
    -> );
# [Insert some rows into table t - not shown]
```


Verify that the prefer_ordering_index flag is enabled:
```
mysql> SELECT @@optimizer_switch LIKE '%prefer_ordering_index=on%';
+-------------------------------------------------------+
| @@optimizer_switch LIKE '%prefer_ordering_index=on%' |
+--------------------------------------------------------
| 1 |
+---------------------------------------------------------
```


Since the following query has a LIMIT clause, we expect it to use an ordered index, if possible. In this case, as we can see from the EXPLAIN output, it uses the table's primary key.
```
mysql> EXPLAIN SELECT c2 FROM t
        -> WHERE id2 > 3
        -> ORDER BY id1 ASC LIMIT 2\G
************************** 1. rOW *******************************
                    id: 1
    select_type: SIMPLE
                table: t
        partitions: NULL
                    type: index
possible_keys: i
                        key: PRIMARY
            key_len: 8
                    ref: NULL
                    rows: 2
            filtered: 70.00
                Extra: Using where
```


Now we disable the prefer_ordering_index flag, and re-run the same query; this time it uses the index i (which includes the id2 column used in the WHERE clause), and a filesort:
```
mysql> SET optimizer_switch = "prefer_ordering_index=off";
mysql> EXPLAIN SELECT c2 FROM t
        -> WHERE id2 > 3
        -> ORDER BY id1 ASC LIMIT 2\G
************************** 1. row ******************************
                        id: 1
    select_type: SIMPLE
                table: t
        partitions: NULL
                    type: range
possible_keys: i
                    key: i
            key_len: 8
```

```
        ref: NULL
    rows: 14
filtered: 100.00
    Extra: Using index condition; Using filesort
```


See also Section 10.9.2, "Switchable Optimizations".

\subsection*{10.2.1.20 Function Call Optimization}

MySQL functions are tagged internally as deterministic or nondeterministic. A function is nondeterministic if, given fixed values for its arguments, it can return different results for different invocations. Examples of nondeterministic functions: RAND( ), UUID( ).

If a function is tagged nondeterministic, a reference to it in a WHERE clause is evaluated for every row (when selecting from one table) or combination of rows (when selecting from a multiple-table join).

MySQL also determines when to evaluate functions based on types of arguments, whether the arguments are table columns or constant values. A deterministic function that takes a table column as argument must be evaluated whenever that column changes value.

Nondeterministic functions may affect query performance. For example, some optimizations may not be available, or more locking might be required. The following discussion uses RAND ( ) but applies to other nondeterministic functions as well.

Suppose that a table $t$ has this definition:
CREATE TABLE t (id INT NOT NULL PRIMARY KEY, col_a VARCHAR(100));
Consider these two queries:
```
SELECT * FROM t WHERE id = POW(1,2);
SELECT * FROM t WHERE id = FLOOR(1 + RAND() * 49);
```


Both queries appear to use a primary key lookup because of the equality comparison against the primary key, but that is true only for the first of them:
- The first query always produces a maximum of one row because POW() with constant arguments is a constant value and is used for index lookup.
- The second query contains an expression that uses the nondeterministic function RAND ( ), which is not constant in the query but in fact has a new value for every row of table $t$. Consequently, the query reads every row of the table, evaluates the predicate for each row, and outputs all rows for which the primary key matches the random value. This might be zero, one, or multiple rows, depending on the id column values and the values in the RAND ( ) sequence.

The effects of nondeterminism are not limited to SELECT statements. This UPDATE statement uses a nondeterministic function to select rows to be modified:
```
UPDATE t SET col_a = some_expr WHERE id = FLOOR(1 + RAND() * 49);
```


Presumably the intent is to update at most a single row for which the primary key matches the expression. However, it might update zero, one, or multiple rows, depending on the id column values and the values in the RAND ( ) sequence.

The behavior just described has implications for performance and replication:
- Because a nondeterministic function does not produce a constant value, the optimizer cannot use strategies that might otherwise be applicable, such as index lookups. The result may be a table scan.
- InnoDB might escalate to a range-key lock rather than taking a single row lock for one matching row.
- Updates that do not execute deterministically are unsafe for replication.

The difficulties stem from the fact that the RAND ( ) function is evaluated once for every row of the table. To avoid multiple function evaluations, use one of these techniques:
- Move the expression containing the nondeterministic function to a separate statement, saving the value in a variable. In the original statement, replace the expression with a reference to the variable, which the optimizer can treat as a constant value:
```
SET @keyval = FLOOR(1 + RAND() * 49);
UPDATE t SET col_a = some_expr WHERE id = @keyval;
```

- Assign the random value to a variable in a derived table. This technique causes the variable to be assigned a value, once, prior to its use in the comparison in the WHERE clause:
```
UPDATE /*+ NO_MERGE(dt) */ t, (SELECT FLOOR(1 + RAND() * 49) AS r) AS dt
SET col_a = some_expr WHERE id = dt.r;
```


As mentioned previously, a nondeterministic expression in the WHERE clause might prevent optimizations and result in a table scan. However, it may be possible to partially optimize the WHERE clause if other expressions are deterministic. For example:
```
SELECT * FROM t WHERE partial_key=5 AND some_column=RAND();
```


If the optimizer can use partial_key to reduce the set of rows selected, RAND( ) is executed fewer times, which diminishes the effect of nondeterminism on optimization.

\subsection*{10.2.1.21 Window Function Optimization}

Window functions affect the strategies the optimizer considers:
- Derived table merging for a subquery is disabled if the subquery has window functions. The subquery is always materialized.
- Semijoins are not applicable to window function optimization because semijoins apply to subqueries in WHERE and JOIN ... ON, which cannot contain window functions.
- The optimizer processes multiple windows that have the same ordering requirements in sequence, so sorting can be skipped for windows following the first one.
- The optimizer makes no attempt to merge windows that could be evaluated in a single step (for example, when multiple OVER clauses contain identical window definitions). The workaround is to define the window in a WINDOW clause and refer to the window name in the OVER clauses.

An aggregate function not used as a window function is aggregated in the outermost possible query. For example, in this query, MySQL sees that COUNT( $\mathrm{t} 1 . \mathrm{b}$ ) is something that cannot exist in the outer query because of its placement in the WHERE clause:
```
SELECT * FROM t1 WHERE t1.a = (SELECT COUNT(t1.b) FROM t2);
```


Consequently, MySQL aggregates inside the subquery, treating t1.b as a constant and returning the count of rows of t2.

Replacing WHERE with HAVING results in an error:
```
mysql> SELECT * FROM t1 HAVING t1.a = (SELECT COUNT(t1.b) FROM t2);
ERROR 1140 (42000): In aggregated query without GROUP BY, expression #1
of SELECT list contains nonaggregated column 'test.t1.a'; this is
incompatible with sql_mode=only_full_group_by
```


The error occurs because COUNT( t1. b) can exist in the HAVING, and so makes the outer query aggregated.

Window functions (including aggregate functions used as window functions) do not have the preceding complexity. They always aggregate in the subquery where they are written, never in the outer query.

Window function evaluation may be affected by the value of the windowing_use_high_precision system variable, which determines whether to compute window operations without loss of precision. By default, windowing_use_high_precision is enabled.

For some moving frame aggregates, the inverse aggregate function can be applied to remove values from the aggregate. This can improve performance but possibly with a loss of precision. For example, adding a very small floating-point value to a very large value causes the very small value to be "hidden" by the large value. When inverting the large value later, the effect of the small value is lost.

Loss of precision due to inverse aggregation is a factor only for operations on floating-point (approximate-value) data types. For other types, inverse aggregation is safe; this includes DECIMAL, which permits a fractional part but is an exact-value type.

For faster execution, MySQL always uses inverse aggregation when it is safe:
- For floating-point values, inverse aggregation is not always safe and might result in loss of precision. The default is to avoid inverse aggregation, which is slower but preserves precision. If it is permissible to sacrifice safety for speed, windowing_use_high_precision can be disabled to permit inverse aggregation.
- For nonfloating-point data types, inverse aggregation is always safe and is used regardless of the windowing_use_high_precision value.
- windowing_use_high_precision has no effect on MIN() and MAX(), which do not use inverse aggregation in any case.

For evaluation of the variance functions STDDEV_POP( ), STDDEV_SAMP( ), VAR_POP( ), VAR_SAMP( ), and their synonyms, evaluation can occur in optimized mode or default mode. Optimized mode may produce slightly different results in the last significant digits. If such differences are permissible, windowing_use_high_precision can be disabled to permit optimized mode.

For EXPLAIN, windowing execution plan information is too extensive to display in traditional output format. To see windowing information, use EXPLAIN FORMAT=JSON and look for the windowing element.

\subsection*{10.2.1.22 Row Constructor Expression Optimization}

Row constructors permit simultaneous comparisons of multiple values. For example, these two statements are semantically equivalent:
```
SELECT * FROM t1 WHERE (column1,column2) = (1,1);
SELECT * FROM t1 WHERE column1 = 1 AND column2 = 1;
```


In addition, the optimizer handles both expressions the same way.
The optimizer is less likely to use available indexes if the row constructor columns do not cover the prefix of an index. Consider the following table, which has a primary key on (c1, c2, c3):
```
CREATE TABLE t1 (
    c1 INT, c2 INT, c3 INT, c4 CHAR(100),
    PRIMARY KEY(c1,c2,c3)
);
```


In this query, the WHERE clause uses all columns in the index. However, the row constructor itself does not cover an index prefix, with the result that the optimizer uses only c1 (key_len=4, the size of c1):
```
mysql> EXPLAIN SELECT * FROM t1
        WHERE c1=1 AND (c2,c3) > (1,1)\G
************************** 1. row ******************************
                id: 1
    select_type: SIMPLE
        table: t1
        partitions: NULL
            type: ref
```

```
possible_keys: PRIMARY
            key: PRIMARY
    key_len: 4
            ref: const
            rows: 3
    filtered: 100.00
        Extra: Using where
```


In such cases, rewriting the row constructor expression using an equivalent nonconstructor expression may result in more complete index use. For the given query, the row constructor and equivalent nonconstructor expressions are:
```
(c2,c3) > (1,1)
c2 > 1 OR ((c2 = 1) AND (c3 > 1))
```


Rewriting the query to use the nonconstructor expression results in the optimizer using all three columns in the index (key_len=12):
```
mysql> EXPLAIN SELECT * FROM t1
            WHERE c1 = 1 AND (c2 > 1 OR ((c2 = 1) AND (c3 > 1)))\G
************************** 1. row ******************************
                        id: 1
    select_type: SIMPLE
                table: t1
        partitions: NULL
                    type: range
possible_keys: PRIMARY
                        key: PRIMARY
            key_len: 12
                        ref: NULL
                    rows: 3
            filtered: 100.00
                Extra: Using where
```


Thus, for better results, avoid mixing row constructors with AND/OR expressions. Use one or the other.
Under certain conditions, the optimizer can apply the range access method to IN ( ) expressions that have row constructor arguments. See Range Optimization of Row Constructor Expressions.

\subsection*{10.2.1.23 Avoiding Full Table Scans}

The output from EXPLAIN shows ALL in the type column when MySQL uses a full table scan to resolve a query. This usually happens under the following conditions:
- The table is so small that it is faster to perform a table scan than to bother with a key lookup. This is common for tables with fewer than 10 rows and a short row length.
- There are no usable restrictions in the ON or WHERE clause for indexed columns.
- You are comparing indexed columns with constant values and MySQL has calculated (based on the index tree) that the constants cover too large a part of the table and that a table scan would be faster. See Section 10.2.1.1, "WHERE Clause Optimization".
- You are using a key with low cardinality (many rows match the key value) through another column. In this case, MySQL assumes that by using the key probably requires many key lookups and that a table scan would be faster.

For small tables, a table scan often is appropriate and the performance impact is negligible. For large tables, try the following techniques to avoid having the optimizer incorrectly choose a table scan:
- Use ANALYZE TABLE tbl_name to update the key distributions for the scanned table. See Section 15.7.3.1, "ANALYZE TABLE Statement".
- Use FORCE INDEX for the scanned table to tell MySQL that table scans are very expensive compared to using the given index:
```
SELECT * FROM t1, t2 FORCE INDEX (index_for_column)
    WHERE t1.col_name=t2.col_name;
```


See Section 10.9.4, "Index Hints".
- Start mysqld with the --max-seeks-for-key=1000 option or use SET max_seeks_for_key=1000 to tell the optimizer to assume that no key scan causes more than 1,000 key seeks. See Section 7.1.8, "Server System Variables".

\subsection*{10.2.2 Optimizing Subqueries, Derived Tables, View References, and Common Table Expressions}

The MySQL query optimizer has different strategies available to evaluate subqueries:
- For a subquery used with an IN, $=$ ANY, or EXISTS predicate, the optimizer has these choices:
- Semijoin
- Materialization
- EXISTS strategy
- For a subquery used with a NOT IN, <> ALL or NOT EXISTS predicate, the optimizer has these choices:
- Materialization
- EXISTS strategy

For a derived table, the optimizer has these choices (which also apply to view references and common table expressions):
- Merge the derived table into the outer query block
- Materialize the derived table to an internal temporary table

The following discussion provides more information about the preceding optimization strategies.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1716.jpg?height=127&width=99&top_left_y=1726&top_left_x=306)

> Note
> A limitation on UPDATE and DELETE statements that use a subquery to modify a single table is that the optimizer does not use semijoin or materialization subquery optimizations. As a workaround, try rewriting them as multiple-table UPDATE and DELETE statements that use a join rather than a subquery.

\subsection*{10.2.2.1 Optimizing IN and EXISTS Subquery Predicates with Semijoin and Antijoin Transformations}

A semijoin is a preparation-time transformation that enables multiple execution strategies such as table pullout, duplicate weedout, first match, loose scan, and materialization. The optimizer uses semijoin strategies to improve subquery execution, as described in this section.

For an inner join between two tables, the join returns a row from one table as many times as there are matches in the other table. But for some questions, the only information that matters is whether there is a match, not the number of matches. Suppose that there are tables named class and roster that list classes in a course curriculum and class rosters (students enrolled in each class), respectively. To list the classes that actually have students enrolled, you could use this join:
```
SELECT class.class_num, class.class_name
    FROM class
    INNER JOIN roster
```

```
WHERE class.class_num = roster.class_num;
```


However, the result lists each class once for each enrolled student. For the question being asked, this is unnecessary duplication of information.

Assuming that class_num is a primary key in the class table, duplicate suppression is possible by using SELECT DISTINCT, but it is inefficient to generate all matching rows first only to eliminate duplicates later.

The same duplicate-free result can be obtained by using a subquery:
```
SELECT class_num, class_name
    FROM class
    WHERE class_num IN
        (SELECT class_num FROM roster);
```


Here, the optimizer can recognize that the IN clause requires the subquery to return only one instance of each class number from the roster table. In this case, the query can use a semijoin; that is, an operation that returns only one instance of each row in class that is matched by rows in roster.

The following statement, which contains an EXISTS subquery predicate, is equivalent to the previous statement containing an IN subquery predicate:
```
SELECT class_num, class_name
    FROM class
    WHERE EXISTS
        (SELECT * FROM roster WHERE class.class_num = roster.class_num);
```


Any statement with an EXISTS subquery predicate is subject to the same semijoin transforms as a statement with an equivalent IN subquery predicate.

The following subqueries are transformed into antijoins:
- NOT IN (SELECT ... FROM ...)
- NOT EXISTS (SELECT ... FROM ...).
- IN (SELECT ... FROM ...) IS NOT TRUE
- EXISTS (SELECT ... FROM ...) IS NOT TRUE.
- IN (SELECT ... FROM ...) IS FALSE
- EXISTS (SELECT ... FROM ...) IS FALSE.

In short, any negation of a subquery of the form IN (SELECT ... FROM ...) or EXISTS (SELECT ... FROM ...) is transformed into an antijoin.

An antijoin is an operation that returns only rows for which there is no match. Consider the query shown here:
```
SELECT class_num, class_name
    FROM class
    WHERE class_num NOT IN
        (SELECT class_num FROM roster);
```


This query is rewritten internally as the antijoin SELECT class_num, class_name FROM class ANTIJOIN roster ON class_num, which returns one instance of each row in class that is not matched by any rows in roster. This means that, for each row in class, as soon as a match is found in roster, the row in class can be discarded.

Antijoin transformations cannot in most cases be applied if the expressions being compared are nullable. An exception to this rule is that (... NOT IN (SELECT ...)) IS NOT FALSE and its equivalent (... IN (SELECT ...)) IS NOT TRUE can be transformed into antijoins.

Outer join and inner join syntax is permitted in the outer query specification, and table references may be base tables, derived tables, view references, or common table expressions.

In MySQL, a subquery must satisfy these criteria to be handled as a semijoin (or an antijoin, if NOT modifies the subquery):
- It must be part of an IN, = ANY, or EXISTS predicate that appears at the top level of the WHERE or ON clause, possibly as a term in an AND expression. For example:
```
SELECT ...
    FROM ot1, ...
    WHERE (oe1, ...) IN
        (SELECT ie1, ... FROM it1, ... WHERE ...);
```


Here, ot $\_i$ and it $\_i$ represent tables in the outer and inner parts of the query, and oe $\_i$ and ie $\_i$ represent expressions that refer to columns in the outer and inner tables.

The subquery can also be the argument to an expression modified by NOT, IS [NOT] TRUE, or IS [NOT] FALSE.
- It must be a single SELECT without UNION constructs.
- It must not contain a HAVING clause.
- It must not contain any aggregate functions (whether it is explicitly or implicitly grouped).
- It must not have a LIMIT clause.
- The statement must not use the STRAIGHT_JOIN join type in the outer query.
- The STRAIGHT_JOIN modifier must not be present.
- The number of outer and inner tables together must be less than the maximum number of tables permitted in a join.
- The subquery may be correlated or uncorrelated. Decorrelation looks at trivially correlated predicates in the WHERE clause of a subquery used as the argument to EXISTS, and makes it possible to optimize it as if it was used within IN (SELECT b FROM . . .). The term trivially correlated means that the predicate is an equality predicate, that it is the sole predicate in the WHERE clause (or is combined with AND), and that one operand is from a table referenced in the subquery and the other operand is from the outer query block.
- The DISTINCT keyword is permitted but ignored. Semijoin strategies automatically handle duplicate removal.
- A GROUP BY clause is permitted but ignored, unless the subquery also contains one or more aggregate functions.
- An ORDER BY clause is permitted but ignored, since ordering is irrelevant to the evaluation of semijoin strategies.

If a subquery meets the preceding criteria, MySQL converts it to a semijoin (or to an antijoin if applicable) and makes a cost-based choice from these strategies:
- Convert the subquery to a join, or use table pullout and run the query as an inner join between subquery tables and outer tables. Table pullout pulls a table out from the subquery to the outer query.
- Duplicate Weedout: Run the semijoin as if it was a join and remove duplicate records using a temporary table.
- FirstMatch: When scanning the inner tables for row combinations and there are multiple instances of a given value group, choose one rather than returning them all. This "shortcuts" scanning and eliminates production of unnecessary rows.
- LooseScan: Scan a subquery table using an index that enables a single value to be chosen from each subquery's value group.
- Materialize the subquery into an indexed temporary table that is used to perform a join, where the index is used to remove duplicates. The index might also be used later for lookups when joining the temporary table with the outer tables; if not, the table is scanned. For more information about materialization, see Section 10.2.2.2, "Optimizing Subqueries with Materialization".

Each of these strategies can be enabled or disabled using the following optimizer_switch system variable flags:
- The semijoin flag controls whether semijoins and antijoins are used.
- If semijoin is enabled, the firstmatch, loosescan, duplicateweedout, and materialization flags enable finer control over the permitted semijoin strategies.
- If the duplicateweedout semijoin strategy is disabled, it is not used unless all other applicable strategies are also disabled.
- If duplicateweedout is disabled, on occasion the optimizer may generate a query plan that is far from optimal. This occurs due to heuristic pruning during greedy search, which can be avoided by setting optimizer_prune_level=0.

These flags are enabled by default. See Section 10.9.2, "Switchable Optimizations".
The optimizer minimizes differences in handling of views and derived tables. This affects queries that use the STRAIGHT_JOIN modifier and a view with an IN subquery that can be converted to a semijoin. The following query illustrates this because the change in processing causes a change in transformation, and thus a different execution strategy:
```
CREATE VIEW v AS
SELECT *
FROM t1
WHERE a IN (SELECT b
    FROM t2);
SELECT STRAIGHT_JOIN *
FROM t3 JOIN v ON t3.x = v.a;
```


The optimizer first looks at the view and converts the IN subquery to a semijoin, then checks whether it is possible to merge the view into the outer query. Because the STRAIGHT_JOIN modifier in the outer query prevents semijoin, the optimizer refuses the merge, causing derived table evaluation using a materialized table.

EXPLAIN output indicates the use of semijoin strategies as follows:
- For extended EXPLAIN output, the text displayed by a following SHOW WARNINGS shows the rewritten query, which displays the semijoin structure. (See Section 10.8.3, "Extended EXPLAIN Output Format".) From this you can get an idea about which tables were pulled out of the semijoin. If a subquery was converted to a semijoin, you should see that the subquery predicate is gone and its tables and WHERE clause were merged into the outer query join list and WHERE clause.
- Temporary table use for Duplicate Weedout is indicated by Start temporary and End temporary in the Extra column. Tables that were not pulled out and are in the range of EXPLAIN output rows covered by Start temporary and End temporary have their rowid in the temporary table.
- FirstMatch(tbl_name) in the Extra column indicates join shortcutting.
- LooseScan ( $m . . n$ ) in the Extra column indicates use of the LooseScan strategy. $m$ and $n$ are key part numbers.
- Temporary table use for materialization is indicated by rows with a select_type value of MATERIALIZED and rows with a table value of <subquery $N$ >.

A semijoin transformation can also be applied to a single-table UPDATE or DELETE statement that uses a [NOT] IN or [NOT] EXISTS subquery predicate, provided that the statement does not use ORDER BY or LIMIT, and that semijoin transformations are allowed by an optimizer hint or by the optimizer_switch setting.

\subsection*{10.2.2.2 Optimizing Subqueries with Materialization}

The optimizer uses materialization to enable more efficient subquery processing. Materialization speeds up query execution by generating a subquery result as a temporary table, normally in memory. The first time MySQL needs the subquery result, it materializes that result into a temporary table. Any subsequent time the result is needed, MySQL refers again to the temporary table. The optimizer may index the table with a hash index to make lookups fast and inexpensive. The index contains unique values to eliminate duplicates and make the table smaller.

Subquery materialization uses an in-memory temporary table when possible, falling back to on-disk storage if the table becomes too large. See Section 10.4.4, "Internal Temporary Table Use in MySQL".

If materialization is not used, the optimizer sometimes rewrites a noncorrelated subquery as a correlated subquery. For example, the following IN subquery is noncorrelated (where_condition involves only columns from t2 and not t1):
```
SELECT * FROM t1
WHERE t1.a IN (SELECT t2.b FROM t2 WHERE where_condition);
```


The optimizer might rewrite this as an EXISTS correlated subquery:
```
SELECT * FROM t1
WHERE EXISTS (SELECT t2.b FROM t2 WHERE where_condition AND t1.a=t2.b);
```


Subquery materialization using a temporary table avoids such rewrites and makes it possible to execute the subquery only once rather than once per row of the outer query.

For subquery materialization to be used in MySQL, the optimizer_switch system variable materialization flag must be enabled. (See Section 10.9.2, "Switchable Optimizations".) With the materialization flag enabled, materialization applies to subquery predicates that appear anywhere (in the select list, WHERE, ON, GROUP BY, HAVING, or ORDER BY), for predicates that fall into any of these use cases:
- The predicate has this form, when no outer expression $o e \_i$ or inner expression $i e \_i$ is nullable. $N$ is 1 or larger.
```
(oe_1, oe_2, ..., oe_N) [NOT] IN (SELECT ie_1, i_2, ..., ie_N ...)
```

- The predicate has this form, when there is a single outer expression oe and inner expression ie. The expressions can be nullable.
```
oe [NOT] IN (SELECT ie ...)
```

- The predicate is IN or NOT IN and a result of UNKNOWN (NULL) has the same meaning as a result of FALSE.

The following examples illustrate how the requirement for equivalence of UNKNOWN and FALSE predicate evaluation affects whether subquery materialization can be used. Assume that where_condition involves columns only from t2 and not t1 so that the subquery is noncorrelated.

This query is subject to materialization:
```
SELECT * FROM t1
WHERE t1.a IN (SELECT t2.b FROM t2 WHERE where_condition);
```


Here, it does not matter whether the IN predicate returns UNKNOWN or FALSE. Either way, the row from t1 is not included in the query result.

An example where subquery materialization is not used is the following query, where $\mathrm{t} 2 . \mathrm{b}$ is a nullable column:
```
SELECT * FROM t1
WHERE (t1.a,t1.b) NOT IN (SELECT t2.a,t2.b FROM t2
    WHERE where_condition);
```


The following restrictions apply to the use of subquery materialization:
- The types of the inner and outer expressions must match. For example, the optimizer might be able to use materialization if both expressions are integer or both are decimal, but cannot if one expression is integer and the other is decimal.
- The inner expression cannot be a BLOB.

Use of EXPLAIN with a query provides some indication of whether the optimizer uses subquery materialization:
- Compared to query execution that does not use materialization, select_type may change from DEPENDENT SUBQUERY to SUBQUERY. This indicates that, for a subquery that would be executed once per outer row, materialization enables the subquery to be executed just once.
- For extended EXPLAIN output, the text displayed by a following SHOW WARNINGS includes materialize and materialized-subquery.

MySQL can also apply subquery materialization to a single-table UPDATE or DELETE statement that uses a [NOT] IN or [NOT] EXISTS subquery predicate, provided that the statement does not use ORDER BY or LIMIT, and that subquery materialization is allowed by an optimizer hint or by the optimizer_switch setting.

\subsection*{10.2.2.3 Optimizing Subqueries with the EXISTS Strategy}

Certain optimizations are applicable to comparisons that use the IN (or =ANY) operator to test subquery results. This section discusses these optimizations, particularly with regard to the challenges that NULL values present. The last part of the discussion suggests how you can help the optimizer.

Consider the following subquery comparison:
```
outer_expr IN (SELECT inner_expr FROM ... WHERE subquery_where)
```


MySQL evaluates queries "from outside to inside." That is, it first obtains the value of the outer expression outer_expr, and then runs the subquery and captures the rows that it produces.

A very useful optimization is to "inform" the subquery that the only rows of interest are those where the inner expression inner_expr is equal to outer_expr. This is done by pushing down an appropriate equality into the subquery's WHERE clause to make it more restrictive. The converted comparison looks like this:
```
EXISTS (SELECT 1 FROM ... WHERE subquery_where AND outer_expr=inner_expr)
```


After the conversion, MySQL can use the pushed-down equality to limit the number of rows it must examine to evaluate the subquery.

More generally, a comparison of $N$ values to a subquery that returns $N$-value rows is subject to the same conversion. If $o e \_i$ and $i e \_i$ represent corresponding outer and inner expression values, this subquery comparison:
```
(oe_1, ..., oe_N) IN
    (SELECT ie_1, ..., ie_N FROM ... WHERE subquery_where)
```


Becomes:
```
EXISTS (SELECT 1 FROM ... WHERE subquery_where
    AND oe_1 = ie_1
```

```
AND ...
AND oe_N = ie_N)
```


For simplicity, the following discussion assumes a single pair of outer and inner expression values.
The "pushdown" strategy just described works if either of these conditions is true:
- outer_expr and inner_expr cannot be NULL.
- You need not distinguish NULL from FALSE subquery results. If the subquery is a part of an OR or AND expression in the WHERE clause, MySQL assumes that you do not care. Another instance where the optimizer notices that NULL and FALSE subquery results need not be distinguished is this construct:
```
... WHERE outer_expr IN (subquery)
```


In this case, the WHERE clause rejects the row whether IN (subquery) returns NULL or FALSE.
Suppose that outer_expr is known to be a non-NULL value but the subquery does not produce a row such that outer_expr = inner_expr. Then outer_expr IN (SELECT ...) evaluates as follows:
- NULL, if the SELECT produces any row where inner_expr is NULL
- FALSE, if the SELECT produces only non-NULL values or produces nothing

In this situation, the approach of looking for rows with outer_expr = inner_expr is no longer valid. It is necessary to look for such rows, but if none are found, also look for rows where inner_expr is NULL. Roughly speaking, the subquery can be converted to something like this:
```
EXISTS (SELECT 1 FROM ... WHERE subquery_where AND
    (outer_expr=inner_expr OR inner_expr IS NULL))
```


The need to evaluate the extra IS NULL condition is why MySQL has the ref_or_null access method:
```
mysql> EXPLAIN
        SELECT outer_expr IN (SELECT t2.maybe_null_key
                    FROM t2, t3 WHERE ...)
            FROM t1;
*************************** 1. r ow ***************************************
                        id: 1
    select_type: PRIMARY
            table: t1
...
*************************** 2.row******************************
                    id: 2
    select_type: DEPENDENT SUBQUERY
            table: t2
                type: ref_or_null
possible_keys: maybe_null_key
                    key: maybe_null_key
        key_len: 5
                    ref: func
                rows: 2
            Extra: Using where; Using index
...
```


The unique_subquery and index_subquery subquery-specific access methods also have "or NULL" variants.

The additional OR ... IS NULL condition makes query execution slightly more complicated (and some optimizations within the subquery become inapplicable), but generally this is tolerable.

The situation is much worse when outer_expr can be NULL. According to the SQL interpretation of NULL as "unknown value," NULL IN (SELECT inner_expr ...) should evaluate to:
- NULL, if the SELECT produces any rows
- FALSE, if the SELECT produces no rows

For proper evaluation, it is necessary to be able to check whether the SELECT has produced any rows at all, so outer_expr = inner_expr cannot be pushed down into the subquery. This is a problem because many real world subqueries become very slow unless the equality can be pushed down.

Essentially, there must be different ways to execute the subquery depending on the value of outer_expr.

The optimizer chooses SQL compliance over speed, so it accounts for the possibility that outer_expr might be NULL:
- If outer_expr is NULL, to evaluate the following expression, it is necessary to execute the SELECT to determine whether it produces any rows:
```
NULL IN (SELECT inner_expr FROM ... WHERE subquery_where)
```


It is necessary to execute the original SELECT here, without any pushed-down equalities of the kind mentioned previously.
- On the other hand, when outer_expr is not NULL, it is absolutely essential that this comparison:
```
outer_expr IN (SELECT inner_expr FROM ... WHERE subquery_where)
```


Be converted to this expression that uses a pushed-down condition:
```
EXISTS (SELECT 1 FROM ... WHERE subquery_where AND outer_expr=inner_expr)
```


Without this conversion, subqueries are slow.
To solve the dilemma of whether or not to push down conditions into the subquery, the conditions are wrapped within "trigger" functions. Thus, an expression of the following form:
```
outer_expr IN (SELECT inner_expr FROM ... WHERE subquery_where)
```


Is converted into:
```
EXISTS (SELECT 1 FROM ... WHERE subquery_where
    AND trigcond(outer_expr=inner_expr))
```


More generally, if the subquery comparison is based on several pairs of outer and inner expressions, the conversion takes this comparison:
```
(oe_1, ..., oe_N) IN (SELECT ie_1, ..., ie_N FROM ... WHERE subquery_where)
```


And converts it to this expression:
```
EXISTS (SELECT 1 FROM ... WHERE subquery_where
        AND trigcond(oe_1=ie_1)
        AND ...
        AND trigcond(Oe_N=ie_N)
    )
```


Each trigcond ( $X$ ) is a special function that evaluates to the following values:
- $X$ when the "linked" outer expression oe_i is not NULL
- TRUE when the "linked" outer expression oe_i is NULL

\section*{Note}

Trigger functions are not triggers of the kind that you create with CREATE TRIGGER.

Equalities that are wrapped within trigcond ( ) functions are not first class predicates for the query optimizer. Most optimizations cannot deal with predicates that may be turned on and off at query
execution time, so they assume any trigcond $(X)$ to be an unknown function and ignore it. Triggered equalities can be used by those optimizations:
- Reference optimizations: trigcond $(X=Y$ [OR $Y$ IS NULL]) can be used to construct ref, eq_ref, or ref_or_null table accesses.
- Index lookup-based subquery execution engines: trigcond ( $X=Y$ ) can be used to construct unique_subquery or index_subquery accesses.
- Table-condition generator: If the subquery is a join of several tables, the triggered condition is checked as soon as possible.

When the optimizer uses a triggered condition to create some kind of index lookup-based access (as for the first two items of the preceding list), it must have a fallback strategy for the case when the condition is turned off. This fallback strategy is always the same: Do a full table scan. In EXPLAIN output, the fallback shows up as Full scan on NULL key in the Extra column:
```
mysql> EXPLAIN SELECT t1.col1,
            t1.col1 IN (SELECT t2.key1 FROM t2 WHERE t2.col2=t1.col2) FROM t1\G
************************** 1. row *****************************************
                    id: 1
    select_type: PRIMARY
            table: t1
                ...
************************** 2. row *****************************************
                    id: 2
    select_type: DEPENDENT SUBQUERY
            table: t2
                type: index_subquery
possible_keys: key1
                    key: key1
        key_len: 5
                    ref: func
                rows: 2
            Extra: Using where; Full scan on NULL key
```


If you run EXPLAIN followed by SHOW WARNINGS, you can see the triggered condition:
```
************************* 1. row
    Level: Note
        Code: 1003
Message: select ˋtestˋ.ˋt1ˋ.ˋcol1ˋ AS ˋcol1ˋ,
            <in_optimizer>(ˋtestˋ.ˋt1ˋ.ˋcol1ˋ,
            <exists>(<index_lookup>(<cache>(ˋtestˋ.ˋt1ˋ.ˋcol1ˋ) in t2
            on key1 checking NULL
            where (ˋtestˋ.ˋt2ˋ.ˋcol2ˋ = ˋtestˋ.ˋt1ˋ.ˋcol2ˋ) having
            trigcond(<is_not_null_test>(ˋtestˋ.ˋt2ˋ.ˋkey1ˋ))))) AS
                ˋt1.col1 IN (select t2.key1 from t2 where t2.col2=t1.col2)ˋ
            from ˋtestˋ.ˋt1ˋ
```


The use of triggered conditions has some performance implications. A NULL IN (SELECT ...) expression now may cause a full table scan (which is slow) when it previously did not. This is the price paid for correct results (the goal of the trigger-condition strategy is to improve compliance, not speed).

For multiple-table subqueries, execution of NULL IN (SELECT . . .) is particularly slow because the join optimizer does not optimize for the case where the outer expression is NULL. It assumes that subquery evaluations with NULL on the left side are very rare, even if there are statistics that indicate otherwise. On the other hand, if the outer expression might be NULL but never actually is, there is no performance penalty.

To help the query optimizer better execute your queries, use these suggestions:
- Declare a column as NOT NULL if it really is. This also helps other aspects of the optimizer by simplifying condition testing for the column.
- If you need not distinguish a NULL from FALSE subquery result, you can easily avoid the slow execution path. Replace a comparison that looks like this:
```
outer_expr [NOT] IN (SELECT inner_expr FROM ...)
```

with this expression:
```
(outer_expr IS NOT NULL) AND (outer_expr [NOT] IN (SELECT inner_expr FROM ...))
```


Then NULL IN (SELECT ...) is never evaluated because MySQL stops evaluating AND parts as soon as the expression result is clear.

Another possible rewrite:
```
[NOT] EXISTS (SELECT inner_expr FROM ...
    WHERE inner_expr=outer_expr)
```


The subquery_materialization_cost_based flag of the optimizer_switch system variable enables control over the choice between subquery materialization and IN-to-EXISTS subquery transformation. See Section 10.9.2, "Switchable Optimizations".

\subsection*{10.2.2.4 Optimizing Derived Tables, View References, and Common Table Expressions with Merging or Materialization}

The optimizer can handle derived table references using two strategies (which also apply to view references and common table expressions):
- Merge the derived table into the outer query block
- Materialize the derived table to an internal temporary table

Example 1:
```
SELECT * FROM (SELECT * FROM t1) AS derived_t1;
```


With merging of the derived table derived_t1, that query is executed similar to:
```
SELECT * FROM t1;
```


Example 2:
```
SELECT *
    FROM t1 JOIN (SELECT t2.f1 FROM t2) AS derived_t2 ON t1.f2=derived_t2.f1
    WHERE t1.f1 > 0;
```


With merging of the derived table derived_t2, that query is executed similar to:
```
SELECT t1.*, t2.f1
    FROM t1 JOIN t2 ON t1.f2=t2.f1
    WHERE t1.f1 > 0;
```


With materialization, derived_t1 and derived_t2 are each treated as a separate table within their respective queries.

The optimizer handles derived tables, view references, and common table expressions the same way: It avoids unnecessary materialization whenever possible, which enables pushing down conditions from the outer query to derived tables and produces more efficient execution plans. (For an example, see Section 10.2.2.2, "Optimizing Subqueries with Materialization".)

If merging would result in an outer query block that references more than 61 base tables, the optimizer chooses materialization instead.

The optimizer propagates an ORDER BY clause in a derived table or view reference to the outer query block if these conditions are all true:
- The outer query is not grouped or aggregated.
- The outer query does not specify DISTINCT, HAVING, or ORDER BY.
- The outer query has this derived table or view reference as the only source in the FROM clause.

Otherwise, the optimizer ignores the ORDER BY clause.
The following means are available to influence whether the optimizer attempts to merge derived tables, view references, and common table expressions into the outer query block:
- The MERGE and NO_MERGE optimizer hints can be used. They apply assuming that no other rule prevents merging. See Section 10.9.3, "Optimizer Hints".
- Similarly, you can use the derived_merge flag of the optimizer_switch system variable. See Section 10.9.2, "Switchable Optimizations". By default, the flag is enabled to permit merging. Disabling the flag prevents merging and avoids ER_UPDATE_TABLE_USED errors.

The derived_merge flag also applies to views that contain no ALGORITHM clause. Thus, if an ER_UPDATE_TABLE_USED error occurs for a view reference that uses an expression equivalent to the subquery, adding ALGORITHM=TEMPTABLE to the view definition prevents merging and takes precedence over the derived_merge value.
- It is possible to disable merging by using in the subquery any constructs that prevent merging, although these are not as explicit in their effect on materialization. Constructs that prevent merging are the same for derived tables, common table expressions, and view references:
- Aggregate functions or window functions (SUM( ), MIN( ), MAX( ), COUNT( ), and so forth)
- DISTINCT
- GROUP BY
- HAVING
- LIMIT
- UNION or UNION ALL
- Subqueries in the select list
- Assignments to user variables
- References only to literal values (in this case, there is no underlying table)

If the optimizer chooses the materialization strategy rather than merging for a derived table, it handles the query as follows:
- The optimizer postpones derived table materialization until its contents are needed during query execution. This improves performance because delaying materialization may result in not having to do it at all. Consider a query that joins the result of a derived table to another table: If the optimizer processes that other table first and finds that it returns no rows, the join need not be carried out further and the optimizer can completely skip materializing the derived table.
- During query execution, the optimizer may add an index to a derived table to speed up row retrieval from it.

Consider the following EXPLAIN statement, for a SELECT query that contains a derived table:
EXPLAIN SELECT * FROM (SELECT * FROM t1) AS derived_t1;
The optimizer avoids materializing the derived table by delaying it until the result is needed during SELECT execution. In this case, the query is not executed (because it occurs in an EXPLAIN statement), so the result is never needed.

Even for queries that are executed, delay of derived table materialization may enable the optimizer to avoid materialization entirely. When this happens, query execution is quicker by the time needed to perform materialization. Consider the following query, which joins the result of a derived table to another table:
```
SELECT *
    FROM t1 JOIN (SELECT t2.f1 FROM t2) AS derived_t2
        ON t1.f2=derived_t2.f1
    WHERE t1.f1 > 0;
```


If the optimization processes t1 first and the WHERE clause produces an empty result, the join must necessarily be empty and the derived table need not be materialized.

For cases when a derived table requires materialization, the optimizer may add an index to the materialized table to speed up access to it. If such an index enables ref access to the table, it can greatly reduce amount of data read during query execution. Consider the following query:
```
SELECT *
    FROM t1 JOIN (SELECT DISTINCT f1 FROM t2) AS derived_t2
        ON t1.f1=derived_t2.f1;
```


The optimizer constructs an index over column f1 from derived_t2 if doing so would enable use of ref access for the lowest cost execution plan. After adding the index, the optimizer can treat the materialized derived table the same as a regular table with an index, and it benefits similarly from the generated index. The overhead of index creation is negligible compared to the cost of query execution without the index. If ref access would result in higher cost than some other access method, the optimizer creates no index and loses nothing.

For optimizer trace output, a merged derived table or view reference is not shown as a node. Only its underlying tables appear in the top query's plan.

What is true for materialization of derived tables is also true for common table expressions (CTEs). In addition, the following considerations pertain specifically to CTEs.

If a CTE is materialized by a query, it is materialized once for the query, even if the query references it several times.

A recursive CTE is always materialized.
If a CTE is materialized, the optimizer automatically adds relevant indexes if it estimates that indexing can speed up access by the top-level statement to the CTE. This is similar to automatic indexing of derived tables, except that if the CTE is referenced multiple times, the optimizer may create multiple indexes, to speed up access by each reference in the most appropriate way.

The MERGE and NO_MERGE optimizer hints can be applied to CTEs. Each CTE reference in the top-level statement can have its own hint, permitting CTE references to be selectively merged or materialized. The following statement uses hints to indicate that cte1 should be merged and cte2 should be materialized:
```
WITH
    cte1 AS (SELECT a, b FROM table1),
    cte2 AS (SELECT c, d FROM table2)
SELECT /*+ MERGE(cte1) NO_MERGE(cte2) */ cte1.b, cte2.d
FROM cte1 JOIN cte2
WHERE cte1.a = cte2.c;
```


The ALGORITHM clause for CREATE VIEW does not affect materialization for any WITH clause preceding the SELECT statement in the view definition. Consider this statement:
```
CREATE ALGORITHM={TEMPTABLE|MERGE} VIEW v1 AS WITH ... SELECT ...
```


The ALGORITHM value affects materialization only of the SELECT, not the WITH clause.

As mentioned previously, a CTE, if materialized, is materialized once, even if referenced multiple times. To indicate one-time materialization, optimizer trace output contains an occurrence of creating_tmp_table plus one or more occurrences of reusing_tmp_table.

CTEs are similar to derived tables, for which the materialized_from_subquery node follows the reference. This is true for a CTE that is referenced multiple times, so there is no duplication of materialized_from_subquery nodes (which would give the impression that the subquery is executed multiple times, and produce unnecessarily verbose output). Only one reference to the CTE has a complete materialized_from_subquery node with the description of its subquery plan. Other references have a reduced materialized_from_subquery node. The same idea applies to EXPLAIN output in TRADITIONAL format: Subqueries for other references are not shown.

\subsection*{10.2.2.5 Derived Condition Pushdown Optimization}

MySQL supports derived condition pushdown for eligible subqueries. For a query such as SELECT * FROM (SELECT i, j FROM t1) AS dt WHERE i > constant, it is possible in many cases to push the outer WHERE condition down to the derived table, in this case resulting in SELECT * FROM (SELECT i, j FROM t1 WHERE i > constant) AS dt. When a derived table cannot be merged into the outer query (for example, if the derived table uses aggregation), pushing the outer WHERE condition down to the derived table should decrease the number of rows that need to be processed and thus speed up execution of the query.

Outer WHERE conditions can be pushed down to derived materialized tables under the following circumstances:
- When the derived table uses no aggregate or window functions, the outer WHERE condition can be pushed down to it directly. This includes WHERE conditions having multiple predicates joined with AND, OR, or both.

For example, the query SELECT * FROM (SELECT f1, f2 FROM t1) AS dt WHERE f1 < 3 AND f2 > 11 is rewritten as SELECT f1, f2 FROM (SELECT f1, f2 FROM t1 WHERE f1 < 3 AND f2 > 11) AS dt.
- When the derived table has a GROUP BY and uses no window functions, an outer WHERE condition referencing one or more columns which are not part of the GROUP BY can be pushed down to the derived table as a HAVING condition.

For example, SELECT * FROM (SELECT i, j, SUM(k) AS sum FROM t1 GROUP BY i, j) AS dt WHERE sum > 100 is rewritten following derived condition pushdown as SELECT * FROM (SELECT i, j, SUM(k) AS sum FROM t1 GROUP BY i, j HAVING sum > 100) AS dt.
- When the derived table uses a GROUP BY and the columns in the outer WHERE condition are GROUP BY columns, the WHERE conditions referencing those columns can be pushed down directly to the derived table.

For example, the query SELECT * FROM (SELECT i,j, SUM(k) AS sum FROM t1 GROUP BY $i, j$ ) AS $d t$ WHERE $i>10$ is rewritten as SELECT * FROM (SELECT $i, j$, SUM(k) AS sum FROM t1 WHERE i > 10 GROUP BY i,j) AS dt.

In the event that the outer WHERE condition has predicates referencing columns which are part of the GROUP BY as well as predicates referencing columns which are not, predicates of the former sort are pushed down as WHERE conditions, while those of the latter type are pushed down as HAVING conditions. For example, in the query SELECT * FROM (SELECT i, j, SUM(k) AS sum FROM t1 GROUP BY i,j) AS dt WHERE i > 10 AND sum > 100, the predicate i > 10 in the outer WHERE clause references a GROUP BY column, whereas the predicate sum $>100$ does not reference any GROUP BY column. Thus the derived table pushdown optimization causes the query to be rewritten in a manner similar to what is shown here:
```
SELECT * FROM (
    SELECT i, j, SUM(k) AS sum FROM t1
        WHERE i > 10
```

```
    GROUP BY i, j
    HAVING sum > 100
) AS dt;
```


To enable derived condition pushdown, the optimizer_switch system variable's derived_condition_pushdown flag (added in this release) must be set to on, which is the default setting. If this optimization is disabled by optimizer_switch, you can enable it for a specific query using the DERIVED_CONDITION_PUSHDOWN optimizer hint. To disable the optimization for a given query, use the NO_DERIVED_CONDITION_PUSHDOWN optimizer hint.

The following restrictions and limitations apply to the derived table condition pushdown optimization:
- The derived table condition pushdown optimization can be employed with UNION queries, with the following exceptions:
- Condition pushdown cannot be used with a UNION query if any materialized derived table that is part of the UNION is a recursive common table expression (see Recursive Common Table Expressions).
- Conditions containing nondeterministic expressions cannot be pushed down to a derived table.
- The derived table cannot use a LIMIT clause.
- Conditions containing subqueries cannot be pushed down.
- The optimization cannot be used if the derived table is an inner table of an outer join.
- If a materialized derived table is a common table expression, conditions are not pushed down to it if it is referenced multiple times.
- Conditions using parameters can be pushed down if the condition is of the form derived_column > ?. If a derived column in an outer WHERE condition is an expression having a ? in the underlying derived table, this condition cannot be pushed down.
- For a query in which the condition is on the tables of a view created using ALGORITHM=TEMPTABLE instead of on the view itself, the multiple equality is not recognized at resolution, and thus the condition cannot be not pushed down. This because, when optimizing a query, condition pushdown takes place during resolution phase while multiple equality propagation occurs during optimization.

This is not an issue in such cases for a view using ALGORITHM=MERGE, where the equality can be propagated and the condition pushed down.
- A condition cannot be pushed down if the derived table's SELECT list contain any assignments to user variables.

\subsection*{10.2.3 Optimizing INFORMATION_SCHEMA Queries}

Applications that monitor databases may make frequent use of INFORMATION_SCHEMA tables. To write queries for these tables most efficiently, use the following general guidelines:
- Try to query only INFORMATION_SCHEMA tables that are views on data dictionary tables.
- Try to query only for static metadata. Selecting columns or using retrieval conditions for dynamic metadata along with static metadata adds overhead to process the dynamic metadata.

> Note
> Comparison behavior for database and table names in INFORMATION_SCHEMA queries might differ from what you expect. For details, see Section 12.8.7, "Using Collation in INFORMATION_SCHEMA Searches".

These INFORMATION_SCHEMA tables are implemented as views on data dictionary tables, so queries on them retrieve information from the data dictionary:
```
CHARACTER_SETS
CHECK_CONSTRAINTS
COLLATIONS
COLLATION_CHARACTER_SET_APPLICABILITY
COLUMNS
EVENTS
FILES
INNODB_COLUMNS
INNODB_DATAFILES
INNODB_FIELDS
INNODB_FOREIGN
INNODB_FOREIGN_COLS
INNODB_INDEXES
INNODB_TABLES
INNODB_TABLESPACES
INNODB_TABLESPACES_BRIEF
INNODB_TABLESTATS
KEY_COLUMN_USAGE
PARAMETERS
PARTITIONS
REFERENTIAL_CONSTRAINTS
RESOURCE_GROUPS
ROUTINES
SCHEMATA
STATISTICS
TABLES
TABLE_CONSTRAINTS
TRIGGERS
VIEWS
VIEW_ROUTINE_USAGE
VIEW_TABLE_USAGE
```


Some types of values, even for a non-view INFORMATION_SCHEMA table, are retrieved by lookups from the data dictionary. This includes values such as database and table names, table types, and storage engines.

Some INFORMATION_SCHEMA tables contain columns that provide table statistics:
```
STATISTICS.CARDINALITY
TABLES.AUTO_INCREMENT
TABLES.AVG_ROW_LENGTH
TABLES.CHECKSUM
TABLES.CHECK_TIME
TABLES.CREATE_TIME
TABLES.DATA_FREE
TABLES.DATA_LENGTH
TABLES.INDEX_LENGTH
TABLES.MAX_DATA_LENGTH
TABLES.TABLE_ROWS
TABLES.UPDATE_TIME
```


Those columns represent dynamic table metadata; that is, information that changes as table contents change.

By default, MySQL retrieves cached values for those columns from the mysql.index_stats and mysql.innodb_table_stats dictionary tables when the columns are queried, which is more efficient than retrieving statistics directly from the storage engine. If cached statistics are not available or have expired, MySQL retrieves the latest statistics from the storage engine and caches them in the mysql.index_stats and mysql.innodb_table_stats dictionary tables. Subsequent queries retrieve the cached statistics until the cached statistics expire. A server restart or the first opening of the mysql.index_stats and mysql.innodb_table_stats tables do not update cached statistics automatically.

The information_schema_stats_expiry session variable defines the period of time before cached statistics expire. The default is 86400 seconds ( 24 hours), but the time period can be extended to as much as one year.

To update cached values at any time for a given table, use ANALYZE TABLE.

Querying statistics columns does not store or update statistics in the mysql.index_stats and mysql.innodb_table_stats dictionary tables under these circumstances:
- When cached statistics have not expired.
- When information_schema_stats_expiry is set to 0 .
- When the server is in read_only, super_read_only, transaction_read_only, or innodb_read_only mode.
- When the query also fetches Performance Schema data.
information_schema_stats_expiry is a session variable, and each client session can define its own expiration value. Statistics that are retrieved from the storage engine and cached by one session are available to other sessions.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1731.jpg?height=127&width=99&top_left_y=863&top_left_x=370)

> Note
> If the innodb_read_only system variable is enabled, ANALYZE TABLE may fail because it cannot update statistics tables in the data dictionary, which use InnoDB. For ANALYZE TABLE operations that update the key distribution, failure may occur even if the operation updates the table itself (for example, if it is a MyISAM table). To obtain the updated distribution statistics, set information_schema_stats_expiry=0.

For INFORMATION_SCHEMA tables implemented as views on data dictionary tables, indexes on the underlying data dictionary tables permit the optimizer to construct efficient query execution plans. To see the choices made by the optimizer, use EXPLAIN. To also see the query used by the server to execute an INFORMATION_SCHEMA query, use SHOW WARNINGS immediately following EXPLAIN.

Consider this statement, which identifies collations for the utf8mb4 character set:
```
mysql> SELECT COLLATION_NAME
        FROM INFORMATION_SCHEMA.COLLATION_CHARACTER_SET_APPLICABILITY
        WHERE CHARACTER_SET_NAME = 'utf8mb4';
+-----------------------------+
| COLLATION_NAME |
+------------------------------+
| utf8mb4_general_ci
| utf8mb4_bin
| utf8mb4_unicode_ci
| utf8mb4_icelandic_ci
| utf8mb4_latvian_ci
| utf8mb4_romanian_ci
| utf8mb4_slovenian_ci
...
```


How does the server process that statement? To find out, use EXPLAIN:
```
mysql> EXPLAIN SELECT COLLATION_NAME
                FROM INFORMATION_SCHEMA.COLLATION_CHARACTER_SET_APPLICABILITY
                WHERE CHARACTER_SET_NAME = 'utf8mb4'\G
************************** 1. row ******************************
                        id: 1
    select_type: SIMPLE
                table: cs
        partitions: NULL
                    type: const
possible_keys: PRIMARY,name
                        key: name
            key_len: 194
                        ref: const
                    rows: 1
            filtered: 100.00
                Extra: Using index
************************** 2. row *****************************************
                        id: 1
```

```
    select_type: SIMPLE
                table: col
        partitions: NULL
                        type: ref
possible_keys: character_set_id
                            key: character_set_id
                key_len: 8
                            ref: const
                        rows: 68
            filtered: 100.00
                    Extra: NULL
2 rows in set, 1 warning (0.01 sec)
```


To see the query used to satisfy that statement, use SHOW WARNINGS:
```
mysql> SHOW WARNINGS\G
************************** 1. row *****************************************
    Level: Note
        Code: 1003
Message: /* select#1 */ select ˋmysqlˋ.ˋcolˋ.ˋnameˋ AS ˋCOLLATION_NAMEˋ
                from ˋmysqlˋ.ˋcharacter_setsˋ ˋcsˋ
                join ˋmysqlˋ.ˋcollationsˋ ˋcolˋ
                where ((ˋmysqlˋ.ˋcolˋ.ˋcharacter_set_idˋ = '45')
                    and ('utf8mb4' = 'utf8mb4'))
```


As indicated by SHOW WARNINGS, the server handles the query on COLLATION_CHARACTER_SET_APPLICABILITY as a query on the character_sets and collations data dictionary tables in the mysql system database.

\subsection*{10.2.4 Optimizing Performance Schema Queries}

Applications that monitor databases may make frequent use of Performance Schema tables. To write queries for these tables most efficiently, take advantage of their indexes. For example, include a WHERE clause that restricts retrieved rows based on comparison to specific values in an indexed column.

Most Performance Schema tables have indexes. Tables that do not are those that normally contain few rows or are unlikely to be queried frequently. Performance Schema indexes give the optimizer access to execution plans other than full table scans. These indexes also improve performance for related objects, such as sys schema views that use those tables.

To see whether a given Performance Schema table has indexes and what they are, use SHOW INDEX or SHOW CREATE TABLE:
```
mysql> SHOW INDEX FROM performance_schema.accounts\G
*************************** 1. rOW ***************************************
                    Table: accounts
        Non_unique: 0
                Key_name: ACCOUNT
    Seq_in_index: 1
    Column_name: USER
            Collation: NULL
    Cardinality: NULL
                Sub_part: NULL
                        Packed: NULL
                            Null: YES
        Index_type: HASH
                    Comment:
Index_comment:
                    Visible: YES
*************************** 2. r ow ***************************************
                        Table: accounts
        Non_unique: 0
                Key_name: ACCOUNT
    Seq_in_index: 2
    Column_name: HOST
            Collation: NULL
    Cardinality: NULL
            Sub_part: NULL
```

```
            Packed: NULL
                    Null: YES
        Index_type: HASH
            Comment:
Index_comment:
            Visible: YES
mysql> SHOW CREATE TABLE performance_schema.rwlock_instances\G
************************** 1. row ******************************
            Table: rwlock_instances
Create Table: CREATE TABLE ˋrwlock_instancesˋ (
    ˋNAMEˋ varchar(128) NOT NULL,
    ˋOBJECT_INSTANCE_BEGINˋ bigint(20) unsigned NOT NULL,
    ˋWRITE_LOCKED_BY_THREAD_IDˋ bigint(20) unsigned DEFAULT NULL,
    ˋREAD_LOCKED_BY_COUNTˋ int(10) unsigned NOT NULL,
    PRIMARY KEY (ˋOBJECT_INSTANCE_BEGINˋ),
    KEY ˋNAMEˋ (ˋNAMEˋ),
    KEY ˋWRITE_LOCKED_BY_THREAD_IDˋ (ˋWRITE_LOCKED_BY_THREAD_IDˋ)
) ENGINE=PERFORMANCE_SCHEMA DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```


To see the execution plan for a Performance Schema query and whether it uses any indexes, use EXPLAIN:
```
mysql> EXPLAIN SELECT * FROM performance_schema.accounts
            WHERE (USER,HOST) = ('root','localhost')\G
*************************** 1. row ***************************************
                        id: 1
    select_type: SIMPLE
                table: accounts
    partitions: NULL
                    type: const
possible_keys: ACCOUNT
                        key: ACCOUNT
            key_len: 278
                        ref: const,const
                    rows: 1
        filtered: 100.00
                Extra: NULL
```


The EXPLAIN output indicates that the optimizer uses the accounts table ACCOUNT index that comprises the USER and HOST columns.

Performance Schema indexes are virtual: They are a construct of the Performance Schema storage engine and use no memory or disk storage. The Performance Schema reports index information to the optimizer so that it can construct efficient execution plans. The Performance Schema in turn uses optimizer information about what to look for (for example, a particular key value), so that it can perform efficient lookups without building actual index structures. This implementation provides two important benefits:
- It entirely avoids the maintenance cost normally incurred for tables that undergo frequent updates.
- It reduces at an early stage of query execution the amount of data retrieved. For conditions on the indexed columns, the Performance Schema efficiently returns only table rows that satisfy the query conditions. Without an index, the Performance Schema would return all rows in the table, requiring that the optimizer later evaluate the conditions against each row to produce the final result.

Performance Schema indexes are predefined and cannot be dropped, added, or altered.
Performance Schema indexes are similar to hash indexes. For example:
- They are used only for equality comparisons that use the = or <=> operators.
- They are unordered. If a query result must have specific row ordering characteristics, include an ORDER BY clause.

For additional information about hash indexes, see Section 10.3.9, "Comparison of B-Tree and Hash Indexes".

\subsection*{10.2.5 Optimizing Data Change Statements}

This section explains how to speed up data change statements: INSERT, UPDATE, and DELETE. Traditional OLTP applications and modern web applications typically do many small data change operations, where concurrency is vital. Data analysis and reporting applications typically run data change operations that affect many rows at once, where the main considerations is the I/O to write large amounts of data and keep indexes up-to-date. For inserting and updating large volumes of data (known in the industry as ETL, for "extract-transform-load"), sometimes you use other SQL statements or external commands, that mimic the effects of INSERT, UPDATE, and DELETE statements.

\subsection*{10.2.5.1 Optimizing INSERT Statements}

To optimize insert speed, combine many small operations into a single large operation. Ideally, you make a single connection, send the data for many new rows at once, and delay all index updates and consistency checking until the very end.

The time required for inserting a row is determined by the following factors, where the numbers indicate approximate proportions:
- Connecting: ( 3 )
- Sending query to server: ( 2 )
- Parsing query: (2)
- Inserting row: ( $1 \times$ size of row)
- Inserting indexes: ( $1 \times$ number of indexes)
- Closing: (1)

This does not take into consideration the initial overhead to open tables, which is done once for each concurrently running query.

The size of the table slows down the insertion of indexes by $\log N$, assuming B-tree indexes.
You can use the following methods to speed up inserts:
- If you are inserting many rows from the same client at the same time, use INSERT statements with multiple VALUES lists to insert several rows at a time. This is considerably faster (many times faster in some cases) than using separate single-row INSERT statements. If you are adding data to a nonempty table, you can tune the bulk_insert_buffer_size variable to make data insertion even faster. See Section 7.1.8, "Server System Variables".
- When loading a table from a text file, use LOAD DATA. This is usually 20 times faster than using INSERT statements. See Section 15.2.9, "LOAD DATA Statement".
- Take advantage of the fact that columns have default values. Insert values explicitly only when the value to be inserted differs from the default. This reduces the parsing that MySQL must do and improves the insert speed.
- See Section 10.5.5, "Bulk Data Loading for InnoDB Tables" for tips specific to InnoDB tables.
- See Section 10.6.2, "Bulk Data Loading for MyISAM Tables" for tips specific to MyISAM tables.

\subsection*{10.2.5.2 Optimizing UPDATE Statements}

An update statement is optimized like a SELECT query with the additional overhead of a write. The speed of the write depends on the amount of data being updated and the number of indexes that are updated. Indexes that are not changed do not get updated.

Another way to get fast updates is to delay updates and then do many updates in a row later. Performing multiple updates together is much quicker than doing one at a time if you lock the table.

For a MyISAM table that uses dynamic row format, updating a row to a longer total length may split the row. If you do this often, it is very important to use OPTIMIZE TABLE occasionally. See Section 15.7.3.4, "OPTIMIZE TABLE Statement".

\subsection*{10.2.5.3 Optimizing DELETE Statements}

The time required to delete individual rows in a MyISAM table is exactly proportional to the number of indexes. To delete rows more quickly, you can increase the size of the key cache by increasing the key_buffer_size system variable. See Section 7.1.1, "Configuring the Server".

To delete all rows from a MyISAM table, TRUNCATE TABLE tbl_name is faster than DELETE FROM tbl_name. Truncate operations are not transaction-safe; an error occurs when attempting one in the course of an active transaction or active table lock. See Section 15.1.37, "TRUNCATE TABLE Statement".

\subsection*{10.2.6 Optimizing Database Privileges}

The more complex your privilege setup, the more overhead applies to all SQL statements. Simplifying the privileges established by GRANT statements enables MySQL to reduce permission-checking overhead when clients execute statements. For example, if you do not grant any table-level or columnlevel privileges, the server need not ever check the contents of the tables_priv and columns_priv tables. Similarly, if you place no resource limits on any accounts, the server does not have to perform resource counting. If you have a very high statement-processing load, consider using a simplified grant structure to reduce permission-checking overhead.

\subsection*{10.2.7 Other Optimization Tips}

This section lists a number of miscellaneous tips for improving query processing speed:
- If your application makes several database requests to perform related updates, combining the statements into a stored routine can help performance. Similarly, if your application computes a single result based on several column values or large volumes of data, combining the computation into a loadable function can help performance. The resulting fast database operations are then available to be reused by other queries, applications, and even code written in different programming languages. See Section 27.2, "Using Stored Routines" and Adding Functions to MySQL for more information.
- To fix any compression issues that occur with ARCHIVE tables, use OPTIMIZE TABLE. See Section 18.5, "The ARCHIVE Storage Engine".
- If possible, classify reports as "live" or as "statistical", where data needed for statistical reports is created only from summary tables that are generated periodically from the live data.
- If you have data that does not conform well to a rows-and-columns table structure, you can pack and store data into a BLOB column. In this case, you must provide code in your application to pack and unpack information, but this might save I/O operations to read and write the sets of related values.
- With Web servers, store images and other binary assets as files, with the path name stored in the database rather than the file itself. Most Web servers are better at caching files than database contents, so using files is generally faster. (Although you must handle backups and storage issues yourself in this case.)
- If you need really high speed, look at the low-level MySQL interfaces. For example, by accessing the MySQL InnoDB or MyISAM storage engine directly, you could get a substantial speed increase compared to using the SQL interface.

Similarly, for databases using the NDBCLUSTER storage engine, you may wish to investigate possible use of the NDB API (see MySQL NDB Cluster API Developer Guide).
- Replication can provide a performance benefit for some operations. You can distribute client retrievals among replicas to split up the load. To avoid slowing down the source while making backups, you can make backups using a replica. See Chapter 19, Replication.

\subsection*{10.3 Optimization and Indexes}

The best way to improve the performance of SELECT operations is to create indexes on one or more of the columns that are tested in the query. The index entries act like pointers to the table rows, allowing the query to quickly determine which rows match a condition in the WHERE clause, and retrieve the other column values for those rows. All MySQL data types can be indexed.

Although it can be tempting to create an indexes for every possible column used in a query, unnecessary indexes waste space and waste time for MySQL to determine which indexes to use. Indexes also add to the cost of inserts, updates, and deletes because each index must be updated. You must find the right balance to achieve fast queries using the optimal set of indexes.

\subsection*{10.3.1 How MySQL Uses Indexes}

Indexes are used to find rows with specific column values quickly. Without an index, MySQL must begin with the first row and then read through the entire table to find the relevant rows. The larger the table, the more this costs. If the table has an index for the columns in question, MySQL can quickly determine the position to seek to in the middle of the data file without having to look at all the data. This is much faster than reading every row sequentially.

Most MySQL indexes (PRIMARY KEY, UNIQUE, INDEX, and FULLTEXT) are stored in B-trees. Exceptions: Indexes on spatial data types use R-trees; MEMORY tables also support hash indexes; InnoDB uses inverted lists for FULLTEXT indexes.

In general, indexes are used as described in the following discussion. Characteristics specific to hash indexes (as used in MEMORY tables) are described in Section 10.3.9, "Comparison of B-Tree and Hash Indexes".

MySQL uses indexes for these operations:
- To find the rows matching a WHERE clause quickly.
- To eliminate rows from consideration. If there is a choice between multiple indexes, MySQL normally uses the index that finds the smallest number of rows (the most selective index).
- If the table has a multiple-column index, any leftmost prefix of the index can be used by the optimizer to look up rows. For example, if you have a three-column index on (col1, col2, col3), you have indexed search capabilities on (col1), (col1, col2), and (col1, col2, col3). For more information, see Section 10.3.6, "Multiple-Column Indexes".
- To retrieve rows from other tables when performing joins. MySQL can use indexes on columns more efficiently if they are declared as the same type and size. In this context, VARCHAR and CHAR are considered the same if they are declared as the same size. For example, $\operatorname{VARCHAR}(10)$ and $\operatorname{CHAR}(10)$ are the same size, but $\operatorname{VARCHAR}(10)$ and $\operatorname{CHAR}(15)$ are not.

For comparisons between nonbinary string columns, both columns should use the same character set. For example, comparing a utf 8 mb 4 column with a latin1 column precludes use of an index.

Comparison of dissimilar columns (comparing a string column to a temporal or numeric column, for example) may prevent use of indexes if values cannot be compared directly without conversion. For a given value such as 1 in the numeric column, it might compare equal to any number of values in the string column such as '1', ' 1', '00001', or '01.e1'. This rules out use of any indexes for the string column.
- To find the MIN() or MAX( ) value for a specific indexed column key_col. This is optimized by a preprocessor that checks whether you are using WHERE key_part_N = constant on all key
parts that occur before key_col in the index. In this case, MySQL does a single key lookup for each MIN( ) or MAX( ) expression and replaces it with a constant. If all expressions are replaced with constants, the query returns at once. For example:
```
SELECT MIN(key_part2),MAX(key_part2)
    FROM tbl_name WHERE key_part1=10;
```

- To sort or group a table if the sorting or grouping is done on a leftmost prefix of a usable index (for example, ORDER BY key_part1, key_part2). If all key parts are followed by DESC, the key is read in reverse order. (Or, if the index is a descending index, the key is read in forward order.) See Section 10.2.1.16, "ORDER BY Optimization", Section 10.2.1.17, "GROUP BY Optimization", and Section 10.3.13, "Descending Indexes".
- In some cases, a query can be optimized to retrieve values without consulting the data rows. (An index that provides all the necessary results for a query is called a covering index.) If a query uses from a table only columns that are included in some index, the selected values can be retrieved from the index tree for greater speed:
```
SELECT key_part3 FROM tbl_name
    WHERE key_part1=1
```


Indexes are less important for queries on small tables, or big tables where report queries process most or all of the rows. When a query needs to access most of the rows, reading sequentially is faster than working through an index. Sequential reads minimize disk seeks, even if not all the rows are needed for the query. See Section 10.2.1.23, "Avoiding Full Table Scans" for details.

\subsection*{10.3.2 Primary Key Optimization}

The primary key for a table represents the column or set of columns that you use in your most vital queries. It has an associated index, for fast query performance. Query performance benefits from the NOT NULL optimization, because it cannot include any NULL values. With the InnoDB storage engine, the table data is physically organized to do ultra-fast lookups and sorts based on the primary key column or columns.

If your table is big and important, but does not have an obvious column or set of columns to use as a primary key, you might create a separate column with auto-increment values to use as the primary key. These unique IDs can serve as pointers to corresponding rows in other tables when you join tables using foreign keys.

\subsection*{10.3.3 SPATIAL Index Optimization}

MySQL permits creation of SPATIAL indexes on NOT NULL geometry-valued columns (see Section 13.4.10, "Creating Spatial Indexes"). The optimizer checks the SRID attribute for indexed columns to determine which spatial reference system (SRS) to use for comparisons, and uses calculations appropriate to the SRS. (Prior to MySQL 8.4, the optimizer performs comparisons of SPATIAL index values using Cartesian calculations; the results of such operations are undefined if the column contains values with non-Cartesian SRIDs.)

For comparisons to work properly, each column in a SPATIAL index must be SRID-restricted. That is, the column definition must include an explicit SRID attribute, and all column values must have the same SRID.

The optimizer considers SPATIAL indexes only for SRID-restricted columns:
- Indexes on columns restricted to a Cartesian SRID enable Cartesian bounding box computations.
- Indexes on columns restricted to a geographic SRID enable geographic bounding box computations.

The optimizer ignores SPATIAL indexes on columns that have no SRID attribute (and thus are not SRID-restricted). MySQL still maintains such indexes, as follows:
- They are updated for table modifications (INSERT, UPDATE, DELETE, and so forth). Updates occur as though the index was Cartesian, even though the column might contain a mix of Cartesian and geographical values.
- They exist only for backward compatibility (for example, the ability to perform a dump in MySQL 8.2 and restore in MySQL 8.3). Because SPATIAL indexes on columns that are not SRID-restricted are of no use to the optimizer, each such column should be modified:
- Verify that all values within the column have the same SRID. To determine the SRIDs contained in a geometry column col_name, use the following query:

SELECT DISTINCT ST_SRID(col_name) FROM tbl_name;
If the query returns more than one row, the column contains a mix of SRIDs. In that case, modify its contents so all values have the same SRID.
- Redefine the column to have an explicit SRID attribute.
- Recreate the SPATIAL index.

\subsection*{10.3.4 Foreign Key Optimization}

If a table has many columns, and you query many different combinations of columns, it might be efficient to split the less-frequently used data into separate tables with a few columns each, and relate them back to the main table by duplicating the numeric ID column from the main table. That way, each small table can have a primary key for fast lookups of its data, and you can query just the set of columns that you need using a join operation. Depending on how the data is distributed, the queries might perform less I/O and take up less cache memory because the relevant columns are packed together on disk. (To maximize performance, queries try to read as few data blocks as possible from disk; tables with only a few columns can fit more rows in each data block.)

\subsection*{10.3.5 Column Indexes}

The most common type of index involves a single column, storing copies of the values from that column in a data structure, allowing fast lookups for the rows with the corresponding column values. The B-tree data structure lets the index quickly find a specific value, a set of values, or a range of values, corresponding to operators such as $=,>, \leq$, BETWEEN, IN, and so on, in a WHERE clause.

The maximum number of indexes per table and the maximum index length is defined per storage engine. See Chapter 17, The InnoDB Storage Engine, and Chapter 18, Alternative Storage Engines. All storage engines support at least 16 indexes per table and a total index length of at least 256 bytes. Most storage engines have higher limits.

For additional information about column indexes, see Section 15.1.15, "CREATE INDEX Statement".
- Index Prefixes
- FULLTEXT Indexes
- Spatial Indexes
- Indexes in the MEMORY Storage Engine

