\section*{Index-Level Optimizer Hints}

Index-level hints affect which index-processing strategies the optimizer uses for particular tables or indexes. These hint types affect use of Index Condition Pushdown (ICP), Multi-Range Read (MRR), Index Merge, and range optimizations (see Section 10.2.1, "Optimizing SELECT Statements").

Syntax of index-level hints:
```
hint_name([@query_block_name] tbl_name [index_name [, index_name] ...])
hint_name(tbl_name@query_block_name [index_name [, index_name] ...])
```


The syntax refers to these terms:
- hint_name: These hint names are permitted:
- GROUP_INDEX, NO_GROUP_INDEX: Enable or disable the specified index or indexes for index scans for GROUP BY operations. Equivalent to the index hints FORCE INDEX FOR GROUP BY, IGNORE INDEX FOR GROUP BY.
- INDEX, NO_INDEX: Acts as the combination of JOIN_INDEX, GROUP_INDEX, and ORDER_INDEX, forcing the server to use the specified index or indexes for any and all scopes, or as the combination of NO_JOIN_INDEX, NO_GROUP_INDEX, and NO_ORDER_INDEX, which causes the server to ignore the specified index or indexes for any and all scopes. Equivalent to FORCE INDEX, IGNORE INDEX.
- INDEX_MERGE, NO_INDEX_MERGE: Enable or disable the Index Merge access method for the specified table or indexes. For information about this access method, see Section 10.2.1.3, "Index Merge Optimization". These hints apply to all three Index Merge algorithms.

The INDEX_MERGE hint forces the optimizer to use Index Merge for the specified table using the specified set of indexes. If no index is specified, the optimizer considers all possible index combinations and selects the least expensive one. The hint may be ignored if the index combination is inapplicable to the given statement.

The NO_INDEX_MERGE hint disables Index Merge combinations that involve any of the specified indexes. If the hint specifies no indexes, Index Merge is not permitted for the table.
- JOIN_INDEX, NO_JOIN_INDEX: Forces MySQL to use or ignore the specified index or indexes for any access method, such as ref, range, index_merge, and so on. Equivalent to FORCE INDEX FOR JOIN, IGNORE INDEX FOR JOIN.
- MRR, NO_MRR: Enable or disable MRR for the specified table or indexes. MRR hints apply only to InnoDB and MyISAM tables. For information about this access method, see Section 10.2.1.11, "Multi-Range Read Optimization".
- NO_ICP: Disable ICP for the specified table or indexes. By default, ICP is a candidate optimization strategy, so there is no hint for enabling it. For information about this access method, see Section 10.2.1.6, "Index Condition Pushdown Optimization".
- NO_RANGE_OPTIMIZATION: Disable index range access for the specified table or indexes. This hint also disables Index Merge and Loose Index Scan for the table or indexes. By default, range access is a candidate optimization strategy, so there is no hint for enabling it.

This hint may be useful when the number of ranges may be high and range optimization would require many resources.
- ORDER_INDEX, NO_ORDER_INDEX: Cause MySQL to use or to ignore the specified index or indexes for sorting rows. Equivalent to FORCE INDEX FOR ORDER BY, IGNORE INDEX FOR ORDER BY.
- SKIP_SCAN, NO_SKIP_SCAN: Enable or disable the Skip Scan access method for the specified table or indexes. For information about this access method, see Skip Scan Range Access Method.

The SKIP_SCAN hint forces the optimizer to use Skip Scan for the specified table using the specified set of indexes. If no index is specified, the optimizer considers all possible indexes and selects the least expensive one. The hint may be ignored if the index is inapplicable to the given statement.

The NO_SKIP_SCAN hint disables Skip Scan for the specified indexes. If the hint specifies no indexes, Skip Scan is not permitted for the table.
- tbl_name: The table to which the hint applies.
- index_name: The name of an index in the named table. The hint applies to all indexes that it names. If the hint names no indexes, it applies to all indexes in the table.

To refer to a primary key, use the name PRIMARY. To see the index names for a table, use SHOW INDEX.
- query_block_name: The query block to which the hint applies. If the hint includes no leading @query_block_name, the hint applies to the query block in which it occurs. For tbl_name@query_block_name syntax, the hint applies to the named table in the named query block. To assign a name to a query block, see Optimizer Hints for Naming Query Blocks.

Examples:
```
SELECT /*+ INDEX_MERGE(t1 f3, PRIMARY) */ f2 FROM t1
    WHERE f1 = 'o' AND f2 = f3 AND f3 <= 4;
SELECT /*+ MRR(t1) */ * FROM t1 WHERE f2 <= 3 AND 3 <= f3;
SELECT /*+ NO_RANGE_OPTIMIZATION(t3 PRIMARY, f2_idx) */ f1
    FROM t3 WHERE f1 > 30 AND f1 < 33;
INSERT INTO t3(f1, f2, f3)
    (SELECT /*+ NO_ICP(t2) */ t2.f1, t2.f2, t2.f3 FROM t1,t2
        WHERE t1.f1=t2.f1 AND t2.f2 BETWEEN t1.f1
        AND t1.f2 AND t2.f2 + 1 >= t1.f1 + 1);
SELECT /*+ SKIP_SCAN(t1 PRIMARY) */ f1, f2
    FROM t1 WHERE f2 > 40;
```


The following examples use the Index Merge hints, but other index-level hints follow the same principles regarding hint ignoring and precedence of optimizer hints in relation to the optimizer_switch system variable or index hints.

Assume that table t1 has columns a, b, c, and d; and that indexes named i_a, i_b, and i_c exist on $\mathrm{a}, \mathrm{b}$, and c , respectively:
```
SELECT /*+ INDEX_MERGE(t1 i_a, i_b, i_c)*/ * FROM t1
    WHERE a = 1 AND b = 2 AND c = 3 AND d = 4;
```


Index Merge is used for (i_a, i_b, i_c) in this case.
```
SELECT /*+ INDEX_MERGE(t1 i_a, i_b, i_c)*/ * FROM t1
    WHERE b = 1 AND c = 2 AND d = 3;
```


Index Merge is used for (i_b, i_c) in this case.
```
/*+ INDEX_MERGE(t1 i_a, i_b) NO_INDEX_MERGE(t1 i_b) */
```


NO_INDEX_MERGE is ignored because there is a preceding hint for the same table.
```
/*+ NO_INDEX_MERGE(t1 i_a, i_b) INDEX_MERGE(t1 i_b) */
```


INDEX_MERGE is ignored because there is a preceding hint for the same table.
For the INDEX_MERGE and NO_INDEX_MERGE optimizer hints, these precedence rules apply:
- If an optimizer hint is specified and is applicable, it takes precedence over the Index Merge-related flags of the optimizer_switch system variable.
```
SET optimizer_switch='index_merge_intersection=off';
SELECT /*+ INDEX_MERGE(t1 i_b, i_c) */ * FROM t1
WHERE b = 1 AND c = 2 AND d = 3;
```


The hint takes precedence over optimizer_switch. Index Merge is used for (i_b, i_c) in this case.
```
SET optimizer_switch='index_merge_intersection=on';
SELECT /*+ INDEX_MERGE(t1 i_b) */ * FROM t1
WHERE b = 1 AND c = 2 AND d = 3;
```


The hint specifies only one index, so it is inapplicable, and the optimizer_switch flag (on) applies. Index Merge is used if the optimizer assesses it to be cost efficient.
```
SET optimizer_switch='index_merge_intersection=off';
```

```
SELECT /*+ INDEX_MERGE(t1 i_b) */ * FROM t1
WHERE b = 1 AND c = 2 AND d = 3;
```


The hint specifies only one index, so it is inapplicable, and the optimizer_switch flag (off) applies. Index Merge is not used.
- The index-level optimizer hints GROUP_INDEX, INDEX, JOIN_INDEX, and ORDER_INDEX all take precedence over the equivalent FORCE INDEX hints; that is, they cause the FORCE INDEX hints to be ignored. Likewise, the NO_GROUP_INDEX, NO_INDEX, NO_JOIN_INDEX, and NO_ORDER_INDEX hints all take precedence over any IGNORE INDEX equivalents, also causing them to be ignored.

The index-level optimizer hints GROUP_INDEX, NO_GROUP_INDEX, INDEX,NO_INDEX, JOIN_INDEX,NO_JOIN_INDEX, ORDER_INDEX, and NO_ORDER_INDEX hints all take precedence over all other optimizer hints, including other index-level optimizer hints. Any other optimizer hints are applied only to the indexes permitted by these.

The GROUP_INDEX, INDEX, JOIN_INDEX, and ORDER_INDEX hints are all equivalent to FORCE INDEX and not to USE INDEX. This is because using one or more of these hints means that a table scan is used only if there is no way to use one of the named indexes to find rows in the table. To cause MySQL to use the same index or set of indexes as with a given instance of USE INDEX, you can use NO_INDEX, NO_JOIN_INDEX, NO_GROUP_INDEX, NO_ORDER_INDEX, or some combination of these.

To replicate the effect that USE INDEX has in the query SELECT a, c FROM t1 USE INDEX FOR ORDER BY (i_a) ORDER BY a, you can use the NO_ORDER_INDEX optimizer hint to cover all indexes on the table except the one that is desired like this:
```
SELECT /*+ NO_ORDER_INDEX(t1 i_b,i_c) */ a,c
    FROM t1
    ORDER BY a;
```


Attempting to combine NO_ORDER_INDEX for the table as a whole with USE INDEX FOR ORDER BY does not work to do this, because NO_ORDER_BY causes USE INDEX to be ignored, as shown here:
```
mysql> EXPLAIN SELECT /*+ NO_ORDER_INDEX(t1) */ a,c FROM t1
        -> USE INDEX FOR ORDER BY (i_a) ORDER BY a\G
*************************** 1. row ****************************************
                        id: 1
    select_type: SIMPLE
                table: t1
        partitions: NULL
                    type: ALL
possible_keys: NULL
                        key: NULL
            key_len: NULL
                        ref: NULL
                    rows: 256
            filtered: 100.00
                Extra: Using filesort
```

- The USE INDEX, FORCE INDEX, and IGNORE INDEX index hints have higher priority than the INDEX_MERGE and NO_INDEX_MERGE optimizer hints.
```
/*+ INDEX_MERGE(t1 i_a, i_b, i_c) */ ... IGNORE INDEX i_a
```


IGNORE INDEX takes precedence over INDEX_MERGE, so index i_a is excluded from the possible ranges for Index Merge.
```
/*+ NO_INDEX_MERGE(t1 i_a, i_b) */ ... FORCE INDEX i_a, i_b
```


Index Merge is disallowed for i_a, i_b because of FORCE INDEX, but the optimizer is forced to use either i_a or i_b for range or ref access. There are no conflicts; both hints are applicable.
- If an IGNORE INDEX hint names multiple indexes, those indexes are unavailable for Index Merge.
- The FORCE INDEX and USE INDEX hints make only the named indexes to be available for Index Merge.
```
SELECT /*+ INDEX_MERGE(t1 i_a, i_b, i_c) */ a FROM t1
FORCE INDEX (i_a, i_b) WHERE c = 'h' AND a = 2 AND b = 'b';
```


The Index Merge intersection access algorithm is used for ( $\mathrm{i} \_\mathrm{a}, \mathrm{i} \_\mathrm{b}$ ). The same is true if FORCE INDEX is changed to USE INDEX.

\section*{Subquery Optimizer Hints}

Subquery hints affect whether to use semijoin transformations and which semijoin strategies to permit, and, when semijoins are not used, whether to use subquery materialization or IN-to-EXISTS transformations. For more information about these optimizations, see Section 10.2.2, "Optimizing Subqueries, Derived Tables, View References, and Common Table Expressions".

Syntax of hints that affect semijoin strategies:
```
hint_name([@query_block_name] [strategy [, strategy] ...])
```


The syntax refers to these terms:
- hint_name: These hint names are permitted:
- SEMIJOIN, NO_SEMIJOIN: Enable or disable the named semijoin strategies.
- strategy: A semijoin strategy to be enabled or disabled. These strategy names are permitted: DUPSWEEDOUT, FIRSTMATCH, LOOSESCAN, MATERIALIZATION.

For SEMIJOIN hints, if no strategies are named, semijoin is used if possible based on the strategies enabled according to the optimizer_switch system variable. If strategies are named but inapplicable for the statement, DUPSWEEDOUT is used.

For NO_SEMIJOIN hints, if no strategies are named, semijoin is not used. If strategies are named that rule out all applicable strategies for the statement, DUPSWEEDOUT is used.

If one subquery is nested within another and both are merged into a semijoin of an outer query, any specification of semijoin strategies for the innermost query are ignored. SEMIJOIN and NO_SEMIJOIN hints can still be used to enable or disable semijoin transformations for such nested subqueries.

If DUPSWEEDOUT is disabled, on occasion the optimizer may generate a query plan that is far from optimal. This occurs due to heuristic pruning during greedy search, which can be avoided by setting optimizer_prune_level=0.

Examples:
```
SELECT /*+ NO_SEMIJOIN(@subq1 FIRSTMATCH, LOOSESCAN) */ * FROM t2
    WHERE t2.a IN (SELECT /*+ QB_NAME(subq1) */ a FROM t3);
SELECT /*+ SEMIJOIN(@subq1 MATERIALIZATION, DUPSWEEDOUT) */ * FROM t2
    WHERE t2.a IN (SELECT /*+ QB_NAME(subq1) */ a FROM t3);
```


Syntax of hints that affect whether to use subquery materialization or IN-to-EXISTS transformations:
```
SUBQUERY([@query_block_name] strategy)
```


The hint name is always SUBQUERY.
For SUBQUERY hints, these strategy values are permitted: INTOEXISTS, MATERIALIZATION.
Examples:
```
SELECT id, a IN (SELECT /*+ SUBQUERY(MATERIALIZATION) */ a FROM t1) FROM t2;
SELECT * FROM t2 WHERE t2.a IN (SELECT /*+ SUBQUERY(INTOEXISTS) */ a FROM t1);
```


For semijoin and SUBQUERY hints, a leading @query_block_name specifies the query block to which the hint applies. If the hint includes no leading @query_block_name, the hint applies to the query block in which it occurs. To assign a name to a query block, see Optimizer Hints for Naming Query Blocks.

If a hint comment contains multiple subquery hints, the first is used. If there are other following hints of that type, they produce a warning. Following hints of other types are silently ignored.

\section*{Statement Execution Time Optimizer Hints}

The MAX_EXECUTION_TIME hint is permitted only for SELECT statements. It places a limit $N$ (a timeout value in milliseconds) on how long a statement is permitted to execute before the server terminates it:
```
MAX_EXECUTION_TIME(N)
```


Example with a timeout of 1 second (1000 milliseconds):
```
SELECT /*+ MAX_EXECUTION_TIME(1000) */ * FROM t1 INNER JOIN t2 WHERE ...
```


The MAX_EXECUTION_TIME ( $N$ ) hint sets a statement execution timeout of $N$ milliseconds. If this option is absent or $N$ is 0 , the statement timeout established by the max_execution_time system variable applies.

The MAX_EXECUTION_TIME hint is applicable as follows:
- For statements with multiple SELECT keywords, such as unions or statements with subqueries, MAX_EXECUTION_TIME applies to the entire statement and must appear after the first SELECT.
- It applies to read-only SELECT statements. Statements that are not read only are those that invoke a stored function that modifies data as a side effect.
- It does not apply to SELECT statements in stored programs and is ignored.

\section*{Variable-Setting Hint Syntax}

The SET_VAR hint sets the session value of a system variable temporarily (for the duration of a single statement). Examples:
```
SELECT /*+ SET_VAR(sort_buffer_size = 16M) */ name FROM people ORDER BY name;
INSERT /*+ SET_VAR(foreign_key_checks=OFF) */ INTO t2 VALUES(2);
SELECT /*+ SET_VAR(optimizer_switch = 'mrr_cost_based=off') */ 1;
```


Syntax of the SET_VAR hint:
```
SET_VAR(var_name = value)
```

var_name names a system variable that has a session value (although not all such variables can be named, as explained later). value is the value to assign to the variable; the value must be a scalar.

SET_VAR makes a temporary variable change, as demonstrated by these statements:
```
mysql> SELECT @@unique_checks;
+------------------+
| @@unique_checks |
+------------------+
| 1 |
+------------------+
mysql> SELECT /*+ SET_VAR(unique_checks=OFF) */ @@unique_checks;
+------------------+
| @@unique_checks |
+------------------+
| 0 |
+------------------+
mysql> SELECT @@unique_checks;
```

```
+------------------+
+------------------+
| 1 |
+------------------+
```


With SET_VAR, there is no need to save and restore the variable value. This enables you to replace multiple statements by a single statement. Consider this sequence of statements:
```
SET @saved_val = @@SESSION.var_name;
SET @@SESSION.var_name = value;
SELECT ...
SET @@SESSION.var_name = @saved_val;
```


The sequence can be replaced by this single statement:
```
SELECT /*+ SET_VAR(var_name = value) ...
```


Standalone SET statements permit any of these syntaxes for naming session variables:
```
SET SESSION var_name = value;
SET @@SESSION.var_name = value;
SET @@.var_name = value;
```


Because the SET_VAR hint applies only to session variables, session scope is implicit, and SESSION, @@SESSION . , and @@ are neither needed nor permitted. Including explicit session-indicator syntax results in the SET_VAR hint being ignored with a warning.

Not all session variables are permitted for use with SET_VAR. Individual system variable descriptions indicate whether each variable is hintable; see Section 7.1.8, "Server System Variables". You can also check a system variable at runtime by attempting to use it with SET_VAR. If the variable is not hintable, a warning occurs:
```
mysql> SELECT /*+ SET_VAR(collation_server = 'utf8mb4') */ 1;
+---+
| 1 |
+---+
| 1 |
+---+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
*************************** 1. r ow ***************************************
    Level: Warning
    Code: 4537
Message: Variable 'collation_server' cannot be set using SET_VAR hint.
```


SET_VAR syntax permits setting only a single variable, but multiple hints can be given to set multiple variables:
```
SELECT /*+ SET_VAR(optimizer_switch = 'mrr_cost_based=off')
    SET_VAR(max_heap_table_size = 1G) */ 1;
```


If several hints with the same variable name appear in the same statement, the first one is applied and the others are ignored with a warning:
```
SELECT /*+ SET_VAR(max_heap_table_size = 1G)
    SET_VAR(max_heap_table_size = 3G) */ 1;
```


In this case, the second hint is ignored with a warning that it is conflicting.
A SET_VAR hint is ignored with a warning if no system variable has the specified name or the variable value is incorrect:
```
SELECT /*+ SET_VAR(max_size = 1G) */ 1;
SELECT /*+ SET_VAR(optimizer_switch = 'mrr_cost_based=yes') */ 1;
```


For the first statement, there is no max_size variable. For the second statement, mr r_cost_based takes values of on or off, so attempting to set it to yes is incorrect. In each case, the hint is ignored with a warning.

The SET_VAR hint is permitted only at the statement level. If used in a subquery, the hint is ignored with a warning.

Replicas ignore SET_VAR hints in replicated statements to avoid the potential for security issues.

\section*{Resource Group Hint Syntax}

The RESOURCE_GROUP optimizer hint is used for resource group management (see Section 7.1.16, "Resource Groups"). This hint assigns the thread that executes a statement to the named resource group temporarily (for the duration of the statement). It requires the RESOURCE_GROUP_ADMIN or RESOURCE_GROUP_USER privilege.

Examples:
```
SELECT /*+ RESOURCE_GROUP(USR_default) */ name FROM people ORDER BY name;
INSERT /*+ RESOURCE_GROUP(Batch) */ INTO t2 VALUES(2);
```


Syntax of the RESOURCE_GROUP hint:
```
RESOURCE_GROUP(group_name)
```

group_name indicates the resource group to which the thread should be assigned for the duration of statement execution. If the group is nonexistent, a warning occurs and the hint is ignored.

The RESOURCE_GROUP hint must appear after the initial statement keyword (SELECT, INSERT, REPLACE, UPDATE, or DELETE).

An alternative to RESOURCE_GROUP is the SET RESOURCE GROUP statement, which nontemporarily assigns threads to a resource group. See Section 15.7.2.4, "SET RESOURCE GROUP Statement".

\section*{Optimizer Hints for Naming Query Blocks}

Table-level, index-level, and subquery optimizer hints permit specific query blocks to be named as part of their argument syntax. To create these names, use the QB_NAME hint, which assigns a name to the query block in which it occurs:
```
QB_NAME(name)
```


QB_NAME hints can be used to make explicit in a clear way which query blocks other hints apply to. They also permit all non-query block name hints to be specified within a single hint comment for easier understanding of complex statements. Consider the following statement:
```
SELECT ...
    FROM (SELECT ...
    FROM (SELECT ... FROM ...)) ...
```


QB_NAME hints assign names to query blocks in the statement:
```
SELECT /*+ QB_NAME(qb1) */ ...
    FROM (SELECT /*+ QB_NAME(qb2) */ ...
    FROM (SELECT /*+ QB_NAME(qb3) */ ... FROM ...)) ...
```


Then other hints can use those names to refer to the appropriate query blocks:
```
SELECT /*+ QB_NAME(qb1) MRR(@qb1 t1) BKA(@qb2) NO_MRR(@qb3t1 idx1, id2) */ ...
    FROM (SELECT /*+ QB_NAME(qb2) */ ...
    FROM (SELECT /*+ QB_NAME(qb3) */ ... FROM ...)) ...
```


The resulting effect is as follows:
- MRR(@qb1 t1) applies to table t1 in query block qb1.
- BKA(@qb2) applies to query block qb2.
- NO_MRR(@qb3 t1 idx1, id2) applies to indexes idx1 and idx2 in table t1 in query block qb3.

Query block names are identifiers and follow the usual rules about what names are valid and how to quote them (see Section 11.2, "Schema Object Names"). For example, a query block name that contains spaces must be quoted, which can be done using backticks:
```
SELECT /*+ BKA(@ˋmy hint nameˋ) */ ...
    FROM (SELECT /*+ QB_NAME(ˋmy hint nameˋ) */ ...) ...
```


If the ANSI_QUOTES SQL mode is enabled, it is also possible to quote query block names within double quotation marks:
```
SELECT /*+ BKA(@"my hint name") */ ...
    FROM (SELECT /*+ QB_NAME("my hint name") */ ...) ...
```


\subsection*{10.9.4 Index Hints}

Index hints give the optimizer information about how to choose indexes during query processing. Index hints, described here, differ from optimizer hints, described in Section 10.9.3, "Optimizer Hints". Index and optimizer hints may be used separately or together.

Index hints apply to SELECT and UPDATE statements. They also work with multi-table DELETE statements, but not with single-table DELETE, as shown later in this section.

Index hints are specified following a table name. (For the general syntax for specifying tables in a SELECT statement, see Section 15.2.13.2, "JOIN Clause".) The syntax for referring to an individual table, including index hints, looks like this:
```
tbl_name [[AS] alias] [index_hint_list]
index_hint_list:
        index_hint [index_hint] ...
index_hint:
        USE {INDEX|KEY}
            [FOR {JOIN|ORDER BY|GROUP BY}] ([index_list])
    | {IGNORE|FORCE} {INDEX|KEY}
            [FOR {JOIN|ORDER BY|GROUP BY}] (index_list)
index_list:
        index_name [, index_name] ...
```


The USE INDEX (index_list) hint tells MySQL to use only one of the named indexes to find rows in the table. The alternative syntax IGNORE INDEX (index_list) tells MySQL to not use some particular index or indexes. These hints are useful if EXPLAIN shows that MySQL is using the wrong index from the list of possible indexes.

The FORCE INDEX hint acts like USE INDEX (index_list), with the addition that a table scan is assumed to be very expensive. In other words, a table scan is used only if there is no way to use one of the named indexes to find rows in the table.

\section*{Note}

MySQL 8.4 supports the index-level optimizer hints JOIN_INDEX, GROUP_INDEX, ORDER_INDEX, and INDEX, which are equivalent to and intended to supersede FORCE INDEX index hints, as well as the NO_JOIN_INDEX, NO_GROUP_INDEX, NO_ORDER_INDEX, and NO_INDEX optimizer hints, which are equivalent to and intended to supersede IGNORE INDEX index hints. Thus, you should expect USE INDEX, FORCE INDEX, and

\section*{IGNORE INDEX to be deprecated in a future release of MySQL, and at some time thereafter to be removed altogether.}

These index-level optimizer hints are supported with both single-table and multitable DELETE statements.

For more information, see Index-Level Optimizer Hints.
Each hint requires index names, not column names. To refer to a primary key, use the name PRIMARY. To see the index names for a table, use the SHOW INDEX statement or the Information Schema STATISTICS table.

An index_name value need not be a full index name. It can be an unambiguous prefix of an index name. If a prefix is ambiguous, an error occurs.

Examples:
```
SELECT * FROM table1 USE INDEX (col1_index,col2_index)
    WHERE col1=1 AND col2=2 AND col3=3;
SELECT * FROM table1 IGNORE INDEX (col3_index)
    WHERE col1=1 AND col2=2 AND col3=3;
```


The syntax for index hints has the following characteristics:
- It is syntactically valid to omit index_list for USE INDEX, which means "use no indexes." Omitting index_list for FORCE INDEX or IGNORE INDEX is a syntax error.
- You can specify the scope of an index hint by adding a FOR clause to the hint. This provides more fine-grained control over optimizer selection of an execution plan for various phases of query processing. To affect only the indexes used when MySQL decides how to find rows in the table and how to process joins, use FOR JOIN. To influence index usage for sorting or grouping rows, use FOR ORDER BY or FOR GROUP BY.
- You can specify multiple index hints:
```
SELECT * FROM t1 USE INDEX (i1) IGNORE INDEX FOR ORDER BY (i2) ORDER BY a;
```


It is not an error to name the same index in several hints (even within the same hint):
```
SELECT * FROM t1 USE INDEX (i1) USE INDEX (i1,i1);
```


However, it is an error to mix USE INDEX and FORCE INDEX for the same table:
```
SELECT * FROM t1 USE INDEX FOR JOIN (i1) FORCE INDEX FOR JOIN (i2);
```


If an index hint includes no FOR clause, the scope of the hint is to apply to all parts of the statement. For example, this hint:
```
IGNORE INDEX (i1)
```

is equivalent to this combination of hints:
```
IGNORE INDEX FOR JOIN (i1)
IGNORE INDEX FOR ORDER BY (i1)
IGNORE INDEX FOR GROUP BY (i1)
```


When index hints are processed, they are collected in a single list by type (USE, FORCE, IGNORE) and by scope (FOR JOIN, FOR ORDER BY, FOR GROUP BY). For example:
```
SELECT * FROM t1
    USE INDEX () IGNORE INDEX (i2) USE INDEX (i1) USE INDEX (i2);
```

is equivalent to:
```
SELECT * FROM t1
```

```
USE INDEX (i1,i2) IGNORE INDEX (i2);
```


The index hints then are applied for each scope in the following order:
1. \{USE|FORCE\} INDEX is applied if present. (If not, the optimizer-determined set of indexes is used.)
2. IGNORE INDEX is applied over the result of the previous step. For example, the following two queries are equivalent:
```
SELECT * FROM t1 USE INDEX (i1) IGNORE INDEX (i2) USE INDEX (i2);
SELECT * FROM t1 USE INDEX (i1);
```


For FULLTEXT searches, index hints work as follows:
- For natural language mode searches, index hints are silently ignored. For example, IGNORE INDEX(i1) is ignored with no warning and the index is still used.
- For boolean mode searches, index hints with FOR ORDER BY or FOR GROUP BY are silently ignored. Index hints with FOR JOIN or no FOR modifier are honored. In contrast to how hints apply for non-FULLTEXT searches, the hint is used for all phases of query execution (finding rows and retrieval, grouping, and ordering). This is true even if the hint is given for a non-FULLTEXT index.

For example, the following two queries are equivalent:
```
SELECT * FROM t
    USE INDEX (index1)
    IGNORE INDEX FOR ORDER BY (index1)
    IGNORE INDEX FOR GROUP BY (index1)
    WHERE ... IN BOOLEAN MODE ... ;
SELECT * FROM t
    USE INDEX (index1)
    WHERE ... IN BOOLEAN MODE ... ;
```


Index hints work with DELETE statements, but only if you use multi-table DELETE syntax, as shown here:
```
mysql> EXPLAIN DELETE FROM t1 USE INDEX(col2)
        -> WHERE col1 BETWEEN 1 AND 100 AND COL2 BETWEEN 1 AND 100\G
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that
corresponds to your MySQL server version for the right syntax to use near 'use
index(col2) where col1 between 1 and 100 and col2 between 1 and 100' at line 1
mysql> EXPLAIN DELETE t1.* FROM t1 USE INDEX(col2)
        -> WHERE col1 BETWEEN 1 AND 100 AND COL2 BETWEEN 1 AND 100\G
*************************** 1. row ******************************
                    id: 1
    select_type: DELETE
                table: t1
        partitions: NULL
                        type: range
possible_keys: col2
                        key: col2
            key_len: 5
                        ref: NULL
                    rows: 72
            filtered: 11.11
                Extra: Using where
1 row in set, 1 warning (0.00 sec)
```


\subsection*{10.9.5 The Optimizer Cost Model}

To generate execution plans, the optimizer uses a cost model that is based on estimates of the cost of various operations that occur during query execution. The optimizer has a set of compiled-in default "cost constants" available to it to make decisions regarding execution plans.

The optimizer also has a database of cost estimates to use during execution plan construction. These estimates are stored in the server_cost and engine_cost tables in the mysql system database and are configurable at any time. The intent of these tables is to make it possible to easily adjust the cost estimates that the optimizer uses when it attempts to arrive at query execution plans.
- Cost Model General Operation
- The Cost Model Database
- Making Changes to the Cost Model Database

\section*{Cost Model General Operation}

The configurable optimizer cost model works like this:
- The server reads the cost model tables into memory at startup and uses the in-memory values at runtime. Any non-NULL cost estimate specified in the tables takes precedence over the corresponding compiled-in default cost constant. Any NULL estimate indicates to the optimizer to use the compiled-in default.
- At runtime, the server may re-read the cost tables. This occurs when a storage engine is dynamically loaded or when a FLUSH OPTIMIZER_COSTS statement is executed.
- Cost tables enable server administrators to easily adjust cost estimates by changing entries in the tables. It is also easy to revert to a default by setting an entry's cost to NULL. The optimizer uses the in-memory cost values, so changes to the tables should be followed by FLUSH OPTIMIZER_COSTS to take effect.
- The in-memory cost estimates that are current when a client session begins apply throughout that session until it ends. In particular, if the server re-reads the cost tables, any changed estimates apply only to subsequently started sessions. Existing sessions are unaffected.
- Cost tables are specific to a given server instance. The server does not replicate cost table changes to replicas.

\section*{The Cost Model Database}

The optimizer cost model database consists of two tables in the mysql system database that contain cost estimate information for operations that occur during query execution:
- server_cost: Optimizer cost estimates for general server operations
- engine_cost: Optimizer cost estimates for operations specific to particular storage engines

The server_cost table contains these columns:
- cost_name

The name of a cost estimate used in the cost model. The name is not case-sensitive. If the server does not recognize the cost name when it reads this table, it writes a warning to the error log.
- cost_value

The cost estimate value. If the value is non-NULL, the server uses it as the cost. Otherwise, it uses the default estimate (the compiled-in value). DBAs can change a cost estimate by updating this column. If the server finds that the cost value is invalid (nonpositive) when it reads this table, it writes a warning to the error log.

To override a default cost estimate (for an entry that specifies NULL), set the cost to a non-NULL value. To revert to the default, set the value to NULL. Then execute FLUSH OPTIMIZER_COSTS to tell the server to re-read the cost tables.
- last_update

The time of the last row update.
- comment

A descriptive comment associated with the cost estimate. DBAs can use this column to provide information about why a cost estimate row stores a particular value.
- default_value

The default (compiled-in) value for the cost estimate. This column is a read-only generated column that retains its value even if the associated cost estimate is changed. For rows added to the table at runtime, the value of this column is NULL.

The primary key for the server_cost table is the cost_name column, so it is not possible to create multiple entries for any cost estimate.

The server recognizes these cost_name values for the server_cost table:
- disk_temptable_create_cost, disk_temptable_row_cost

The cost estimates for internally created temporary tables stored in a disk-based storage engine (either InnoDB or MyISAM). Increasing these values increases the cost estimate of using internal temporary tables and makes the optimizer prefer query plans with less use of them. For information about such tables, see Section 10.4.4, "Internal Temporary Table Use in MySQL".

The larger default values for these disk parameters compared to the default values for the corresponding memory parameters (memory_temptable_create_cost, memory_temptable_row_cost) reflects the greater cost of processing disk-based tables.
- key_compare_cost

The cost of comparing record keys. Increasing this value causes a query plan that compares many keys to become more expensive. For example, a query plan that performs a filesort becomes relatively more expensive compared to a query plan that avoids sorting by using an index.
- memory_temptable_create_cost, memory_temptable_row_cost

The cost estimates for internally created temporary tables stored in the MEMORY storage engine. Increasing these values increases the cost estimate of using internal temporary tables and makes the optimizer prefer query plans with less use of them. For information about such tables, see Section 10.4.4, "Internal Temporary Table Use in MySQL".

The smaller default values for these memory parameters compared to the default values for the corresponding disk parameters (disk_temptable_create_cost, disk_temptable_row_cost) reflects the lesser cost of processing memory-based tables.
- row_evaluate_cost

The cost of evaluating record conditions. Increasing this value causes a query plan that examines many rows to become more expensive compared to a query plan that examines fewer rows. For example, a table scan becomes relatively more expensive compared to a range scan that reads fewer rows.

The engine_cost table contains these columns:
- engine_name

The name of the storage engine to which this cost estimate applies. The name is not case-sensitive. If the value is default, it applies to all storage engines that have no named entry of their own. If the server does not recognize the engine name when it reads this table, it writes a warning to the error log.
- device_type

The device type to which this cost estimate applies. The column is intended for specifying different cost estimates for different storage device types, such as hard disk drives versus solid state drives. Currently, this information is not used and 0 is the only permitted value.
- cost_name

Same as in the server_cost table.
- cost_value

Same as in the server_cost table.
- last_update

Same as in the server_cost table.
- comment

Same as in the server_cost table.
- default_value

The default (compiled-in) value for the cost estimate. This column is a read-only generated column that retains its value even if the associated cost estimate is changed. For rows added to the table at runtime, the value of this column is NULL, with the exception that if the row has the same cost_name value as one of the original rows, the default_value column has the same value as that row.

The primary key for the engine_cost table is a tuple comprising the (cost_name, engine_name, device_type) columns, so it is not possible to create multiple entries for any combination of values in those columns.

The server recognizes these cost_name values for the engine_cost table:
- io_block_read_cost

The cost of reading an index or data block from disk. Increasing this value causes a query plan that reads many disk blocks to become more expensive compared to a query plan that reads fewer disk blocks. For example, a table scan becomes relatively more expensive compared to a range scan that reads fewer blocks.
- memory_block_read_cost

Similar to io_block_read_cost, but represents the cost of reading an index or data block from an in-memory database buffer.

If the io_block_read_cost and memory_block_read_cost values differ, the execution plan may change between two runs of the same query. Suppose that the cost for memory access is less than the cost for disk access. In that case, at server startup before data has been read into the buffer pool, you may get a different plan than after the query has been run because then the data is in memory.

\section*{Making Changes to the Cost Model Database}

For DBAs who wish to change the cost model parameters from their defaults, try doubling or halving the value and measuring the effect.

Changes to the io_block_read_cost and memory_block_read_cost parameters are most likely to yield worthwhile results. These parameter values enable cost models for data access methods to take into account the costs of reading information from different sources; that is, the cost of reading information from disk versus reading information already in a memory buffer.

For example, all other things being equal, setting io_block_read_cost to a value larger than memory_block_read_cost causes the optimizer to prefer query plans that read information already held in memory to plans that must read from disk.

This example shows how to change the default value for io_block_read_cost:
```
UPDATE mysql.engine_cost
    SET cost_value = 2.0
    WHERE cost_name = 'io_block_read_cost';
FLUSH OPTIMIZER_COSTS;
```


This example shows how to change the value of io_block_read_cost only for the InnoDB storage engine:
```
INSERT INTO mysql.engine_cost
    VALUES ('InnoDB', 0, 'io_block_read_cost', 3.0,
    CURRENT_TIMESTAMP, 'Using a slower disk for InnoDB');
FLUSH OPTIMIZER_COSTS;
```


\subsection*{10.9.6 Optimizer Statistics}

The column_statistics data dictionary table stores histogram statistics about column values, for use by the optimizer in constructing query execution plans. To perform histogram management, use the ANALYZE TABLE statement.

The column_statistics table has these characteristics:
- The table contains statistics for columns of all data types except geometry types (spatial data) and JSON.
- The table is persistent so that column statistics need not be created each time the server starts.
- The server performs updates to the table; users do not.

The column_statistics table is not directly accessible by users because it is part of the data dictionary. Histogram information is available using INFORMATION_SCHEMA. COLUMN_STATISTICS, which is implemented as a view on the data dictionary table. COLUMN_STATISTICS has these columns:
- SCHEMA_NAME, TABLE_NAME, COLUMN_NAME: The names of the schema, table, and column for which the statistics apply.
- HISTOGRAM: A JSON value describing the column statistics, stored as a histogram.

Column histograms contain buckets for parts of the range of values stored in the column. Histograms are JSON objects to permit flexibility in the representation of column statistics. Here is a sample histogram object:
```
{
    "buckets": [
        [
            1,
            0.3333333333333333
        ],
        [
            2,
            0.6666666666666666
        ],
        [
            3,
            1
        ]
    ],
    "null-values": 0,
    "last-updated": "2017-03-24 13:32:40.000000",
```

```
    "sampling-rate": 1,
    "histogram-type": "singleton",
    "number-of-buckets-specified": 128,
    "data-type": "int",
    "collation-id": 8
}
```


Histogram objects have these keys:
- buckets: The histogram buckets. Bucket structure depends on the histogram type.

For singleton histograms, buckets contain two values:
- Value 1: The value for the bucket. The type depends on the column data type.
- Value 2: A double representing the cumulative frequency for the value. For example, .25 and .75 indicate that $25 \%$ and $75 \%$ of the values in the column are less than or equal to the bucket value.

For equi-height histograms, buckets contain four values:
- Values 1, 2: The lower and upper inclusive values for the bucket. The type depends on the column data type.
- Value 3: A double representing the cumulative frequency for the value. For example, .25 and .75 indicate that 25\% and 75\% of the values in the column are less than or equal to the bucket upper value.
- Value 4: The number of distinct values in the range from the bucket lower value to its upper value.
- null-values: A number between 0.0 and 1.0 indicating the fraction of column values that are SQL NULL values. If 0 , the column contains no NULL values.
- last-updated: When the histogram was generated, as a UTC value in $Y Y Y Y-M M-D D$ hh:mm:ss. uuuuuu format.
- sampling-rate: A number between 0.0 and 1.0 indicating the fraction of data that was sampled to create the histogram. A value of 1 means that all of the data was read (no sampling).
- histogram-type: The histogram type:
- singleton: One bucket represents one single value in the column. This histogram type is created when the number of distinct values in the column is less than or equal to the number of buckets specified in the ANALYZE TABLE statement that generated the histogram.
- equi-height: One bucket represents a range of values. This histogram type is created when the number of distinct values in the column is greater than the number of buckets specified in the ANALYZE TABLE statement that generated the histogram.
- number-of-buckets-specified: The number of buckets specified in the ANALYZE TABLE statement that generated the histogram.
- data-type: The type of data this histogram contains. This is needed when reading and parsing histograms from persistent storage into memory. The value is one of int, uint (unsigned integer), double, decimal, datetime, or string (includes character and binary strings).
- collation-id: The collation ID for the histogram data. It is mostly meaningful when the datatype value is string. Values correspond to ID column values in the Information Schema COLLATIONS table.

To extract particular values from the histogram objects, you can use JSON operations. For example:
```
mysql> SELECT
    TABLE_NAME, COLUMN_NAME,
```

```
        HISTOGRAM->>'$."data-type"' AS 'data-type',
        JSON_LENGTH(HISTOGRAM->>'$."buckets"') AS 'bucket-count'
    FROM INFORMATION_SCHEMA.COLUMN_STATISTICS;
+-------------------+-------------+-----------+---------------
| TABLE_NAME | COLUMN_NAME | data-type | bucket-count |
+-----------------+--------------+------------+--------------+
\begin{array} { | l | l | l | r | } { \hline \text { city } } & { \text { Population } } & { \text { int } } & { 1 0 2 4 } \\ { \text { countrylanguage \|} } & { \text { Language \|} } & { \text { string \|} } & { 4 5 7 } \\ { \hline } \end{array}
+-------------------+-------------+-----------+--------------+
```


The optimizer uses histogram statistics, if applicable, for columns of any data type for which statistics are collected. The optimizer applies histogram statistics to determine row estimates based on the selectivity (filtering effect) of column value comparisons against constant values. Predicates of these forms qualify for histogram use:
```
col_name = constant
col_name <> constant
col_name != constant
col_name > constant
col_name < constant
col_name >= constant
col_name <= constant
col_name IS NULL
col_name IS NOT NULL
col_name BETWEEN constant AND constant
col_name NOT BETWEEN constant AND constant
col_name IN (constant[, constant] ...)
col_name NOT IN (constant[, constant] ...)
```


For example, these statements contain predicates that qualify for histogram use:
```
SELECT * FROM orders WHERE amount BETWEEN 100.0 AND 300.0;
SELECT * FROM tbl WHERE col1 = 15 AND col2 > 100;
```


The requirement for comparison against a constant value includes functions that are constant, such as ABS( ) and FLOOR( ):
```
SELECT * FROM tbl WHERE col1 < ABS(-34);
```


Histogram statistics are useful primarily for nonindexed columns. Adding an index to a column for which histogram statistics are applicable might also help the optimizer make row estimates. The tradeoffs are:
- An index must be updated when table data is modified.
- A histogram is created or updated only on demand, so it adds no overhead when table data is modified. On the other hand, the statistics become progressively more out of date when table modifications occur, until the next time they are updated.

The optimizer prefers range optimizer row estimates to those obtained from histogram statistics. If the optimizer determines that the range optimizer applies, it does not use histogram statistics.

For columns that are indexed, row estimates can be obtained for equality comparisons using index dives (see Section 10.2.1.2, "Range Optimization"). In this case, histogram statistics are not necessarily useful because index dives can yield better estimates.

In some cases, use of histogram statistics may not improve query execution (for example, if the statistics are out of date). To check whether this is the case, use ANALYZE TABLE to regenerate the histogram statistics, then run the query again.

Alternatively, to disable histogram statistics, use ANALYZE TABLE to drop them. A different method of disabling histogram statistics is to turn off the condition_fanout_filter flag of the optimizer_switch system variable (although this may disable other optimizations as well):
```
SET optimizer_switch='condition_fanout_filter=off';
```


If histogram statistics are used, the resulting effect is visible using EXPLAIN. Consider the following query, where no index is available for column col1:

SELECT * FROM t1 WHERE col1 < 24;
If histogram statistics indicate that 57\% of the rows in t1 satisfy the col1 < 24 predicate, filtering can occur even in the absence of an index, and EXPLAIN shows 57.00 in the filtered column.

\subsection*{10.10 Buffering and Caching}

MySQL uses several strategies that cache information in memory buffers to increase performance.

\subsection*{10.10.1 InnoDB Buffer Pool Optimization}

InnoDB maintains a storage area called the buffer pool for caching data and indexes in memory. Knowing how the InnoDB buffer pool works, and taking advantage of it to keep frequently accessed data in memory, is an important aspect of MySQL tuning.

For an explanation of the inner workings of the InnoDB buffer pool, an overview of its LRU replacement algorithm, and general configuration information, see Section 17.5.1, "Buffer Pool".

For additional InnoDB buffer pool configuration and tuning information, see these sections:
- Section 17.8.3.4, "Configuring InnoDB Buffer Pool Prefetching (Read-Ahead)"
- Section 17.8.3.5, "Configuring Buffer Pool Flushing"
- Section 17.8.3.3, "Making the Buffer Pool Scan Resistant"
- Section 17.8.3.2, "Configuring Multiple Buffer Pool Instances"
- Section 17.8.3.6, "Saving and Restoring the Buffer Pool State"
- Section 17.8.3.1, "Configuring InnoDB Buffer Pool Size"

\subsection*{10.10.2 The MyISAM Key Cache}

To minimize disk I/O, the MyISAM storage engine exploits a strategy that is used by many database management systems. It employs a cache mechanism to keep the most frequently accessed table blocks in memory:
- For index blocks, a special structure called the key cache (or key buffer) is maintained. The structure contains a number of block buffers where the most-used index blocks are placed.
- For data blocks, MySQL uses no special cache. Instead it relies on the native operating system file system cache.

This section first describes the basic operation of the MyISAM key cache. Then it discusses features that improve key cache performance and that enable you to better control cache operation:
- Multiple sessions can access the cache concurrently.
- You can set up multiple key caches and assign table indexes to specific caches.

To control the size of the key cache, use the key_buffer_size system variable. If this variable is set equal to zero, no key cache is used. The key cache also is not used if the key_buffer_size value is too small to allocate the minimal number of block buffers (8).

When the key cache is not operational, index files are accessed using only the native file system buffering provided by the operating system. (In other words, table index blocks are accessed using the same strategy as that employed for table data blocks.)

An index block is a contiguous unit of access to the MyISAM index files. Usually the size of an index block is equal to the size of nodes of the index B-tree. (Indexes are represented on disk using a B-tree data structure. Nodes at the bottom of the tree are leaf nodes. Nodes above the leaf nodes are nonleaf nodes.)

All block buffers in a key cache structure are the same size. This size can be equal to, greater than, or less than the size of a table index block. Usually one these two values is a multiple of the other.

When data from any table index block must be accessed, the server first checks whether it is available in some block buffer of the key cache. If it is, the server accesses data in the key cache rather than on disk. That is, it reads from the cache or writes into it rather than reading from or writing to disk. Otherwise, the server chooses a cache block buffer containing a different table index block (or blocks) and replaces the data there by a copy of required table index block. As soon as the new index block is in the cache, the index data can be accessed.

If it happens that a block selected for replacement has been modified, the block is considered "dirty." In this case, prior to being replaced, its contents are flushed to the table index from which it came.

Usually the server follows an LRU (Least Recently Used) strategy: When choosing a block for replacement, it selects the least recently used index block. To make this choice easier, the key cache module maintains all used blocks in a special list (LRU chain) ordered by time of use. When a block is accessed, it is the most recently used and is placed at the end of the list. When blocks need to be replaced, blocks at the beginning of the list are the least recently used and become the first candidates for eviction.

The InnoDB storage engine also uses an LRU algorithm, to manage its buffer pool. See Section 17.5.1, "Buffer Pool".

\subsection*{10.10.2.1 Shared Key Cache Access}

Threads can access key cache buffers simultaneously, subject to the following conditions:
- A buffer that is not being updated can be accessed by multiple sessions.
- A buffer that is being updated causes sessions that need to use it to wait until the update is complete.
- Multiple sessions can initiate requests that result in cache block replacements, as long as they do not interfere with each other (that is, as long as they need different index blocks, and thus cause different cache blocks to be replaced).

Shared access to the key cache enables the server to improve throughput significantly.

\subsection*{10.10.2.2 Multiple Key Caches}

\section*{Note}

As of MySQL 8.4, the compound-part structured-variable syntax discussed here for referring to multiple MyISAM key caches is deprecated.

Shared access to the key cache improves performance but does not eliminate contention among sessions entirely. They still compete for control structures that manage access to the key cache buffers. To reduce key cache access contention further, MySQL also provides multiple key caches. This feature enables you to assign different table indexes to different key caches.

Where there are multiple key caches, the server must know which cache to use when processing queries for a given MyISAM table. By default, all MyISAM table indexes are cached in the default key cache. To assign table indexes to a specific key cache, use the CACHE INDEX statement (see Section 15.7.8.2, "CACHE INDEX Statement"). For example, the following statement assigns indexes from the tables t1, t2, and t3 to the key cache named hot_cache:
```
mysql> CACHE INDEX t1, t2, t3 IN hot_cache;
+---------+----------------------+----------+----------+
| Table | Op | Msg_type | Msg_text |
+---------+----------------------+----------+----------+
| test.t1 | assign_to_keycache | status | OK
| test.t2 | assign_to_keycache | status | OK
| test.t3 | assign_to_keycache | status | OK
+----------+---------------------+----------+----------+
```


The key cache referred to in a CACHE INDEX statement can be created by setting its size with a SET GLOBAL parameter setting statement or by using server startup options. For example:
```
mysql> SET GLOBAL keycache1.key_buffer_size=128*1024;
```


To destroy a key cache, set its size to zero:
```
mysql> SET GLOBAL keycache1.key_buffer_size=0;
```


You cannot destroy the default key cache. Any attempt to do this is ignored:
```
mysql> SET GLOBAL key_buffer_size = 0;
mysql> SHOW VARIABLES LIKE 'key_buffer_size';
+------------------+---------+
| Variable_name | Value |
+------------------+---------+
| key_buffer_size | 8384512 |
+------------------+---------+
```


Key cache variables are structured system variables that have a name and components. For keycache1.key_buffer_size, keycache1 is the cache variable name and key_buffer_size is the cache component. See Section 7.1.9.5, "Structured System Variables", for a description of the syntax used for referring to structured key cache system variables.

By default, table indexes are assigned to the main (default) key cache created at the server startup. When a key cache is destroyed, all indexes assigned to it are reassigned to the default key cache.

For a busy server, you can use a strategy that involves three key caches:
- A "hot" key cache that takes up $20 \%$ of the space allocated for all key caches. Use this for tables that are heavily used for searches but that are not updated.
- A "cold" key cache that takes up $20 \%$ of the space allocated for all key caches. Use this cache for medium-sized, intensively modified tables, such as temporary tables.
- A "warm" key cache that takes up $60 \%$ of the key cache space. Employ this as the default key cache, to be used by default for all other tables.

One reason the use of three key caches is beneficial is that access to one key cache structure does not block access to the others. Statements that access tables assigned to one cache do not compete with statements that access tables assigned to another cache. Performance gains occur for other reasons as well:
- The hot cache is used only for retrieval queries, so its contents are never modified. Consequently, whenever an index block needs to be pulled in from disk, the contents of the cache block chosen for replacement need not be flushed first.
- For an index assigned to the hot cache, if there are no queries requiring an index scan, there is a high probability that the index blocks corresponding to nonleaf nodes of the index B-tree remain in the cache.
- An update operation most frequently executed for temporary tables is performed much faster when the updated node is in the cache and need not be read from disk first. If the size of the indexes of the temporary tables are comparable with the size of cold key cache, the probability is very high that the updated node is in the cache.

The CACHE INDEX statement sets up an association between a table and a key cache, but the association is lost each time the server restarts. If you want the association to take effect each time the server starts, one way to accomplish this is to use an option file: Include variable settings that configure your key caches, and an init_file system variable that names a file containing CACHE INDEX statements to be executed. For example:
```
key_buffer_size = 4G
hot_cache.key_buffer_size = 2G
cold_cache.key_buffer_size = 2G
init_file=/path/to/data-directory/mysqld_init.sql
```


The statements in mysqld_init. sql are executed each time the server starts. The file should contain one SQL statement per line. The following example assigns several tables each to hot_cache and cold_cache:

CACHE INDEX db1.t1, db1.t2, db2.t3 IN hot_cache
CACHE INDEX db1.t4, db2.t5, db2.t6 IN cold_cache

\subsection*{10.10.2.3 Midpoint Insertion Strategy}

By default, the key cache management system uses a simple LRU strategy for choosing key cache blocks to be evicted, but it also supports a more sophisticated method called the midpoint insertion strategy.

When using the midpoint insertion strategy, the LRU chain is divided into two parts: a hot sublist and a warm sublist. The division point between two parts is not fixed, but the key cache management system takes care that the warm part is not "too short," always containing at least key_cache_division_limit percent of the key cache blocks. key_cache_division_limit is a component of structured key cache variables, so its value is a parameter that can be set per cache.

When an index block is read from a table into the key cache, it is placed at the end of the warm sublist. After a certain number of hits (accesses of the block), it is promoted to the hot sublist. At present, the number of hits required to promote a block (3) is the same for all index blocks.

A block promoted into the hot sublist is placed at the end of the list. The block then circulates within this sublist. If the block stays at the beginning of the sublist for a long enough time, it is demoted to the warm sublist. This time is determined by the value of the key_cache_age_threshold component of the key cache.

The threshold value prescribes that, for a key cache containing $N$ blocks, the block at the beginning of the hot sublist not accessed within the last $N$ * key_cache_age_threshold / 100 hits is to be moved to the beginning of the warm sublist. It then becomes the first candidate for eviction, because blocks for replacement always are taken from the beginning of the warm sublist.

The midpoint insertion strategy enables you to keep more-valued blocks always in the cache. If you prefer to use the plain LRU strategy, leave the key_cache_division_limit value set to its default of 100.

The midpoint insertion strategy helps to improve performance when execution of a query that requires an index scan effectively pushes out of the cache all the index blocks corresponding to valuable high-level B-tree nodes. To avoid this, you must use a midpoint insertion strategy with the key_cache_division_limit set to much less than 100. Then valuable frequently hit nodes are preserved in the hot sublist during an index scan operation as well.

\subsection*{10.10.2.4 Index Preloading}

If there are enough blocks in a key cache to hold blocks of an entire index, or at least the blocks corresponding to its nonleaf nodes, it makes sense to preload the key cache with index blocks before starting to use it. Preloading enables you to put the table index blocks into a key cache buffer in the most efficient way: by reading the index blocks from disk sequentially.

Without preloading, the blocks are still placed into the key cache as needed by queries. Although the blocks stay in the cache, because there are enough buffers for all of them, they are fetched from disk in random order, and not sequentially.

To preload an index into a cache, use the LOAD INDEX INTO CACHE statement. For example, the following statement preloads nodes (index blocks) of indexes of the tables t1 and t2:
```
mysql> LOAD INDEX INTO CACHE t1, t2 IGNORE LEAVES;
+----------+--------------+----------+----------+
| Table | Op | Msg_type | Msg_text |
+----------+--------------+----------+----------+
| test.t1 | preload_keys | status | OK |
| test.t2 | preload_keys | status | OK |
+----------+--------------+----------+---------+
```


The IGNORE LEAVES modifier causes only blocks for the nonleaf nodes of the index to be preloaded. Thus, the statement shown preloads all index blocks from t1, but only blocks for the nonleaf nodes from t 2 .

If an index has been assigned to a key cache using a CACHE INDEX statement, preloading places index blocks into that cache. Otherwise, the index is loaded into the default key cache.

\subsection*{10.10.2.5 Key Cache Block Size}

It is possible to specify the size of the block buffers for an individual key cache using the key_cache_block_size variable. This permits tuning of the performance of I/O operations for index files.

The best performance for I/O operations is achieved when the size of read buffers is equal to the size of the native operating system I/O buffers. But setting the size of key nodes equal to the size of the I/ O buffer does not always ensure the best overall performance. When reading the big leaf nodes, the server pulls in a lot of unnecessary data, effectively preventing reading other leaf nodes.

To control the size of blocks in the .MYI index file of MyISAM tables, use the --myisam-block-size option at server startup.

\subsection*{10.10.2.6 Restructuring a Key Cache}

A key cache can be restructured at any time by updating its parameter values. For example:
```
mysql> SET GLOBAL cold_cache.key_buffer_size=4*1024*1024;
```


If you assign to either the key_buffer_size or key_cache_block_size key cache component a value that differs from the component's current value, the server destroys the cache's old structure and creates a new one based on the new values. If the cache contains any dirty blocks, the server saves them to disk before destroying and re-creating the cache. Restructuring does not occur if you change other key cache parameters.

When restructuring a key cache, the server first flushes the contents of any dirty buffers to disk. After that, the cache contents become unavailable. However, restructuring does not block queries that need to use indexes assigned to the cache. Instead, the server directly accesses the table indexes using native file system caching. File system caching is not as efficient as using a key cache, so although queries execute, a slowdown can be anticipated. After the cache has been restructured, it becomes available again for caching indexes assigned to it, and the use of file system caching for the indexes ceases.

\subsection*{10.10.3 Caching of Prepared Statements and Stored Programs}

For certain statements that a client might execute multiple times during a session, the server converts the statement to an internal structure and caches that structure to be used during execution. Caching
enables the server to perform more efficiently because it avoids the overhead of reconverting the statement should it be needed again during the session. Conversion and caching occurs for these statements:
- Prepared statements, both those processed at the SQL level (using the PREPARE statement) and those processed using the binary client/server protocol (using the mysql_stmt_prepare( ) C API function). The max_prepared_stmt_count system variable controls the total number of statements the server caches. (The sum of the number of prepared statements across all sessions.)
- Stored programs (stored procedures and functions, triggers, and events). In this case, the server converts and caches the entire program body. The stored_program_cache system variable indicates the approximate number of stored programs the server caches per session.

The server maintains caches for prepared statements and stored programs on a per-session basis. Statements cached for one session are not accessible to other sessions. When a session ends, the server discards any statements cached for it.

When the server uses a cached internal statement structure, it must take care that the structure does not go out of date. Metadata changes can occur for an object used by the statement, causing a mismatch between the current object definition and the definition as represented in the internal statement structure. Metadata changes occur for DDL statements such as those that create, drop, alter, rename, or truncate tables, or that analyze, optimize, or repair tables. Table content changes (for example, with INSERT or UPDATE) do not change metadata, nor do SELECT statements.

Here is an illustration of the problem. Suppose that a client prepares this statement:
```
PREPARE s1 FROM 'SELECT * FROM t1';
```


The SELECT * expands in the internal structure to the list of columns in the table. If the set of columns in the table is modified with ALTER TABLE, the prepared statement goes out of date. If the server does not detect this change the next time the client executes s1, the prepared statement returns incorrect results.

To avoid problems caused by metadata changes to tables or views referred to by the prepared statement, the server detects these changes and automatically reprepares the statement when it is next executed. That is, the server reparses the statement and rebuilds the internal structure. Reparsing also occurs after referenced tables or views are flushed from the table definition cache, either implicitly to make room for new entries in the cache, or explicitly due to FLUSH TABLES.

Similarly, if changes occur to objects used by a stored program, the server reparses affected statements within the program.

The server also detects metadata changes for objects in expressions. These might be used in statements specific to stored programs, such as DECLARE CURSOR or flow-control statements such as IF, CASE, and RETURN.

To avoid reparsing entire stored programs, the server reparses affected statements or expressions within a program only as needed. Examples:
- Suppose that metadata for a table or view is changed. Reparsing occurs for a SELECT * within the program that accesses the table or view, but not for a SELECT * that does not access the table or view.
- When a statement is affected, the server reparses it only partially if possible. Consider this CASE statement:
```
CASE case_expr
    WHEN when_expr1 ...
    WHEN when_expr2 ...
    WHEN when_expr3 ...
    ...
END CASE
```


If a metadata change affects only WHEN when_expr3, that expression is reparsed. case_expr and the other WHEN expressions are not reparsed.

Reparsing uses the default database and SQL mode that were in effect for the original conversion to internal form.

The server attempts reparsing up to three times. An error occurs if all attempts fail.
Reparsing is automatic, but to the extent that it occurs, diminishes prepared statement and stored program performance.

For prepared statements, the Com_stmt_reprepare status variable tracks the number of repreparations.

\subsection*{10.11 Optimizing Locking Operations}

MySQL manages contention for table contents using locking:
- Internal locking is performed within the MySQL server itself to manage contention for table contents by multiple threads. This type of locking is internal because it is performed entirely by the server and involves no other programs. See Section 10.11.1, "Internal Locking Methods".
- External locking occurs when the server and other programs lock MyISAM table files to coordinate among themselves which program can access the tables at which time. See Section 10.11.5, "External Locking".

\subsection*{10.11.1 Internal Locking Methods}

This section discusses internal locking; that is, locking performed within the MySQL server itself to manage contention for table contents by multiple sessions. This type of locking is internal because it is performed entirely by the server and involves no other programs. For locking performed on MySQL files by other programs, see Section 10.11.5, "External Locking".
- Row-Level Locking
- Table-Level Locking
- Choosing the Type of Locking

\section*{Row-Level Locking}

MySQL uses row-level locking for InnoDB tables to support simultaneous write access by multiple sessions, making them suitable for multi-user, highly concurrent, and OLTP applications.

To avoid deadlocks when performing multiple concurrent write operations on a single InnoDB table, acquire necessary locks at the start of the transaction by issuing a SELECT ... FOR UPDATE statement for each group of rows expected to be modified, even if the data change statements come later in the transaction. If transactions modify or lock more than one table, issue the applicable statements in the same order within each transaction. Deadlocks affect performance rather than representing a serious error, because InnoDB automatically detects deadlock conditions by default and rolls back one of the affected transactions.

On high concurrency systems, deadlock detection can cause a slowdown when numerous threads wait for the same lock. At times, it may be more efficient to disable deadlock detection and rely on the innodb_lock_wait_timeout setting for transaction rollback when a deadlock occurs. Deadlock detection can be disabled using the innodb_deadlock_detect configuration option.

Advantages of row-level locking:
- Fewer lock conflicts when different sessions access different rows.
- Fewer changes for rollbacks.
- Possible to lock a single row for a long time.

\section*{Table-Level Locking}

MySQL uses table-level locking for MyISAM, MEMORY, and MERGE tables, permitting only one session to update those tables at a time. This locking level makes these storage engines more suitable for readonly, read-mostly, or single-user applications.

These storage engines avoid deadlocks by always requesting all needed locks at once at the beginning of a query and always locking the tables in the same order. The tradeoff is that this strategy reduces concurrency; other sessions that want to modify the table must wait until the current data change statement finishes.

Advantages of table-level locking:
- Relatively little memory required (row locking requires memory per row or group of rows locked)
- Fast when used on a large part of the table because only a single lock is involved.
- Fast if you often do GROUP BY operations on a large part of the data or must scan the entire table frequently.

MySQL grants table write locks as follows:
1. If there are no locks on the table, put a write lock on it.
2. Otherwise, put the lock request in the write lock queue.

MySQL grants table read locks as follows:
1. If there are no write locks on the table, put a read lock on it.
2. Otherwise, put the lock request in the read lock queue.

Table updates are given higher priority than table retrievals. Therefore, when a lock is released, the lock is made available to the requests in the write lock queue and then to the requests in the read lock queue. This ensures that updates to a table are not "starved" even when there is heavy SELECT activity for the table. However, if there are many updates for a table, SELECT statements wait until there are no more updates.

For information on altering the priority of reads and writes, see Section 10.11.2, "Table Locking Issues".
You can analyze the table lock contention on your system by checking the Table_locks_immediate and Table_locks_waited status variables, which indicate the number of times that requests for table locks could be granted immediately and the number that had to wait, respectively:
```
mysql> SHOW STATUS LIKE 'Table%';
+------------------------+---------+
| Variable_name | Value |
+------------------------+---------+
| Table_locks_immediate | 1151552 |
| Table_locks_waited | 15324 |
+------------------------+---------+
```


The Performance Schema lock tables also provide locking information. See Section 29.12.13, "Performance Schema Lock Tables".

The MyISAM storage engine supports concurrent inserts to reduce contention between readers and writers for a given table: If a MyISAM table has no free blocks in the middle of the data file, rows are always inserted at the end of the data file. In this case, you can freely mix concurrent INSERT and

SELECT statements for a MyISAM table without locks. That is, you can insert rows into a MyISAM table at the same time other clients are reading from it. Holes can result from rows having been deleted from or updated in the middle of the table. If there are holes, concurrent inserts are disabled but are enabled again automatically when all holes have been filled with new data. To control this behavior, use the concurrent_insert system variable. See Section 10.11.3, "Concurrent Inserts".

If you acquire a table lock explicitly with LOCK TABLES, you can request a READ LOCAL lock rather than a READ lock to enable other sessions to perform concurrent inserts while you have the table locked.

To perform many INSERT and SELECT operations on a table t1 when concurrent inserts are not possible, you can insert rows into a temporary table temp_t1 and update the real table with the rows from the temporary table:
```
mysql> LOCK TABLES t1 WRITE, temp_t1 WRITE;
mysql> INSERT INTO t1 SELECT * FROM temp_t1;
mysql> DELETE FROM temp_t1;
mysql> UNLOCK TABLES;
```


\section*{Choosing the Type of Locking}

Generally, table locks are superior to row-level locks in the following cases:
- Most statements for the table are reads.
- Statements for the table are a mix of reads and writes, where writes are updates or deletes for a single row that can be fetched with one key read:
```
UPDATE tbl_name SET column=value WHERE unique_key_col=key_value;
DELETE FROM tbl_name WHERE unique_key_col=key_value;
```

- SELECT combined with concurrent INSERT statements, and very few UPDATE or DELETE statements.
- Many scans or GROUP BY operations on the entire table without any writers.

With higher-level locks, you can more easily tune applications by supporting locks of different types, because the lock overhead is less than for row-level locks.

Options other than row-level locking:
- Versioning (such as that used in MySQL for concurrent inserts) where it is possible to have one writer at the same time as many readers. This means that the database or table supports different views for the data depending on when access begins. Other common terms for this are "time travel," "copy on write," or "copy on demand."
- Copy on demand is in many cases superior to row-level locking. However, in the worst case, it can use much more memory than using normal locks.
- Instead of using row-level locks, you can employ application-level locks, such as those provided by GET_LOCK( ) and RELEASE_LOCK( ) in MySQL. These are advisory locks, so they work only with applications that cooperate with each other. See Section 14.14, "Locking Functions".

\subsection*{10.11.2 Table Locking Issues}

InnoDB tables use row-level locking so that multiple sessions and applications can read from and write to the same table simultaneously, without making each other wait or producing inconsistent results. For this storage engine, avoid using the LOCK TABLES statement, because it does not offer any extra protection, but instead reduces concurrency. The automatic row-level locking makes these tables suitable for your busiest databases with your most important data, while also simplifying application logic since you do not need to lock and unlock tables. Consequently, the InnoDB storage engine is the default in MySQL.

MySQL uses table locking (instead of page, row, or column locking) for all storage engines except InnoDB. The locking operations themselves do not have much overhead. But because only one session can write to a table at any one time, for best performance with these other storage engines, use them primarily for tables that are queried often and rarely inserted into or updated.
- Performance Considerations Favoring InnoDB
- Workarounds for Locking Performance Issues

\section*{Performance Considerations Favoring InnoDB}

When choosing whether to create a table using InnoDB or a different storage engine, keep in mind the following disadvantages of table locking:
- Table locking enables many sessions to read from a table at the same time, but if a session wants to write to a table, it must first get exclusive access, meaning it might have to wait for other sessions to finish with the table first. During the update, all other sessions that want to access this particular table must wait until the update is done.
- Table locking causes problems when a session is waiting because the disk is full and free space needs to become available before the session can proceed. In this case, all sessions that want to access the problem table are also put in a waiting state until more disk space is made available.
- A SELECT statement that takes a long time to run prevents other sessions from updating the table in the meantime, making the other sessions appear slow or unresponsive. While a session is waiting to get exclusive access to the table for updates, other sessions that issue SELECT statements queue up behind it, reducing concurrency even for read-only sessions.

\section*{Workarounds for Locking Performance Issues}

The following items describe some ways to avoid or reduce contention caused by table locking:
- Consider switching the table to the InnoDB storage engine, either using CREATE TABLE ... ENGINE=INNODB during setup, or using ALTER TABLE ... ENGINE=INNODB for an existing table. See Chapter 17, The InnoDB Storage Engine for more details about this storage engine.
- Optimize SELECT statements to run faster so that they lock tables for a shorter time. You might have to create some summary tables to do this.
- Start mysqld with--low-priority-updates. For storage engines that use only table-level locking (such as MyISAM, MEMORY, and MERGE), this gives all statements that update (modify) a table lower priority than SELECT statements. In this case, the second SELECT statement in the preceding scenario would execute before the UPDATE statement, and would not wait for the first SELECT to finish.
- To specify that all updates issued in a specific connection should be done with low priority, set the low_priority_updates server system variable equal to 1 .
- To give a specific INSERT, UPDATE, or DELETE statement lower priority, use the LOW_PRIORITY attribute.
- To give a specific SELECT statement higher priority, use the HIGH_PRIORITY attribute. See Section 15.2.13, "SELECT Statement".
- Start mysqld with a low value for the max_write_lock_count system variable to force MySQL to temporarily elevate the priority of all SELECT statements that are waiting for a table after a specific number of write locks to the table occur (for example, for insert operations). This permits read locks after a certain number of write locks.
- If you have problems with mixed SELECT and DELETE statements, the LIMIT option to DELETE may help. See Section 15.2.2, "DELETE Statement".
- Using SQL_BUFFER_RESULT with SELECT statements can help to make the duration of table locks shorter. See Section 15.2.13, "SELECT Statement".
- Splitting table contents into separate tables may help, by allowing queries to run against columns in one table, while updates are confined to columns in a different table.
- You could change the locking code in mysys/thr_lock. c to use a single queue. In this case, write locks and read locks would have the same priority, which might help some applications.

\subsection*{10.11.3 Concurrent Inserts}

The MyISAM storage engine supports concurrent inserts to reduce contention between readers and writers for a given table: If a MyISAM table has no holes in the data file (deleted rows in the middle), an INSERT statement can be executed to add rows to the end of the table at the same time that SELECT statements are reading rows from the table. If there are multiple INSERT statements, they are queued and performed in sequence, concurrently with the SELECT statements. The results of a concurrent INSERT may not be visible immediately.

The concurrent_insert system variable can be set to modify the concurrent-insert processing. By default, the variable is set to AUTO (or 1) and concurrent inserts are handled as just described. If concurrent_insert is set to NEVER (or 0 ), concurrent inserts are disabled. If the variable is set to ALWAYS (or 2), concurrent inserts at the end of the table are permitted even for tables that have deleted rows. See also the description of the concurrent_insert system variable.

If you are using the binary log, concurrent inserts are converted to normal inserts for CREATE . . . SELECT or INSERT ... SELECT statements. This is done to ensure that you can re-create an exact copy of your tables by applying the log during a backup operation. See Section 7.4.4, "The Binary Log". In addition, for those statements a read lock is placed on the selected-from table such that inserts into that table are blocked. The effect is that concurrent inserts for that table must wait as well.

With LOAD DATA, if you specify CONCURRENT with a MyISAM table that satisfies the condition for concurrent inserts (that is, it contains no free blocks in the middle), other sessions can retrieve data from the table while LOAD DATA is executing. Use of the CONCURRENT option affects the performance of LOAD DATA a bit, even if no other session is using the table at the same time.

If you specify HIGH_PRIORITY, it overrides the effect of the --low-priority-updates option if the server was started with that option. It also causes concurrent inserts not to be used.

For LOCK TABLE, the difference between READ LOCAL and READ is that READ LOCAL permits nonconflicting INSERT statements (concurrent inserts) to execute while the lock is held. However, this cannot be used if you are going to manipulate the database using processes external to the server while you hold the lock.

\subsection*{10.11.4 Metadata Locking}

MySQL uses metadata locking to manage concurrent access to database objects and to ensure data consistency. Metadata locking applies not just to tables, but also to schemas, stored programs (procedures, functions, triggers, scheduled events), tablespaces, user locks acquired with the GET_LOCK( ) function (see Section 14.14, "Locking Functions"), and locks acquired with the locking service described in Section 7.6.9.1, "The Locking Service".

The Performance Schema metadata_locks table exposes metadata lock information, which can be useful for seeing which sessions hold locks, are blocked waiting for locks, and so forth. For details, see Section 29.12.13.3, "The metadata_locks Table".

Metadata locking does involve some overhead, which increases as query volume increases. Metadata contention increases the more that multiple queries attempt to access the same objects.

Metadata locking is not a replacement for the table definition cache, and its mutexes and locks differ from the LOCK_open mutex. The following discussion provides some information about how metadata locking works.
- Metadata Lock Acquisition
- Metadata Lock Release

\section*{Metadata Lock Acquisition}

If there are multiple waiters for a given lock, the highest-priority lock request is satisfied first, with an exception related to the max_write_lock_count system variable. Write lock requests have higher priority than read lock requests. However, if max_write_lock_count is set to some low value (say, 10), read lock requests may be preferred over pending write lock requests if the read lock requests have already been passed over in favor of 10 write lock requests. Normally this behavior does not occur because max_write_lock_count by default has a very large value.

Statements acquire metadata locks one by one, not simultaneously, and perform deadlock detection in the process.

DML statements normally acquire locks in the order in which tables are mentioned in the statement.
DDL statements, LOCK TABLES, and other similar statements try to reduce the number of possible deadlocks between concurrent DDL statements by acquiring locks on explicitly named tables in name order. Locks might be acquired in a different order for implicitly used tables (such as tables in foreign key relationships that also must be locked).

For example, RENAME TABLE is a DDL statement that acquires locks in name order:
- This RENAME TABLE statement renames tbla to something else, and renames tblc to tbla:

RENAME TABLE tbla TO tbld, tblc TO tbla;
The statement acquires metadata locks, in order, on tbla, tblc, and tbld (because tbld follows tblc in name order):
- This slightly different statement also renames tbla to something else, and renames tblc to tbla:

RENAME TABLE tbla TO tblb, tblc TO tbla;
In this case, the statement acquires metadata locks, in order, on tbla, tblb, and tblc (because tblb precedes tblc in name order):

Both statements acquire locks on tbla and tblc, in that order, but differ in whether the lock on the remaining table name is acquired before or after tblc.

Metadata lock acquisition order can make a difference in operation outcome when multiple transactions execute concurrently, as the following example illustrates.

Begin with two tables x and $\mathrm{x} \_$new that have identical structure. Three clients issue statements that involve these tables:

Client 1:
LOCK TABLE × WRITE, x_new WRITE;
The statement requests and acquires write locks in name order on x and $\mathrm{x} \_$new.
Client 2:
INSERT INTO x VALUES(1);
The statement requests and blocks waiting for a write lock on x .
Client 3:
RENAME TABLE x TO x_old, x_new TO x;

The statement requests exclusive locks in name order on x , $\mathrm{x} \_$new, and $\mathrm{x} \_\mathrm{o}$ d, but blocks waiting for the lock on x .

Client 1:

\section*{UNLOCK TABLES;}

The statement releases the write locks on x and $\mathrm{x} \_$new. The exclusive lock request for x by Client 3 has higher priority than the write lock request by Client 2, so Client 3 acquires its lock on x , then also on x_new and x_old, performs the renaming, and releases its locks. Client 2 then acquires its lock on $x$, performs the insert, and releases its lock.

Lock acquisition order results in the RENAME TABLE executing before the INSERT. The x into which the insert occurs is the table that was named x_new when Client 2 issued the insert and was renamed to × by Client 3:
```
mysql> SELECT * FROM x;
+------+
| i |
+------+
| 1 |
+------+
mysql> SELECT * FROM x_old;
Empty set (0.01 sec)
```


Now begin instead with tables named × and new x that have identical structure. Again, three clients issue statements that involve these tables:

\section*{Client 1:}
```
LOCK TABLE x WRITE, new_x WRITE;
```


The statement requests and acquires write locks in name order on new_x and x.
Client 2:
INSERT INTO x VALUES(1);
The statement requests and blocks waiting for a write lock on x .

\section*{Client 3:}

RENAME TABLE x TO old_x, new_x TO x;
The statement requests exclusive locks in name order on new $\_\mathrm{x}$, old $\_\mathrm{x}$, and x , but blocks waiting for the lock on new_x.

Client 1:

\section*{UNLOCK TABLES;}

The statement releases the write locks on x and new x . For x , the only pending request is by Client 2, so Client 2 acquires its lock, performs the insert, and releases the lock. For new_x, the only pending request is by Client 3 , which is permitted to acquire that lock (and also the lock on old_x). The rename operation still blocks for the lock on x until the Client 2 insert finishes and releases its lock. Then Client 3 acquires the lock on x , performs the rename, and releases its lock.

In this case, lock acquisition order results in the INSERT executing before the RENAME TABLE. The $x$ into which the insert occurs is the original ×, now renamed to old_x by the rename operation:
```
mysql> SELECT * FROM x;
Empty set (0.01 sec)
mysql> SELECT * FROM old_x;
```

```
+------+
| i |
+------+
| 1 |
+------+
```


If order of lock acquisition in concurrent statements makes a difference to an application in operation outcome, as in the preceding example, you may be able to adjust the table names to affect the order of lock acquisition.

Metadata locks are extended, as necessary, to tables related by a foreign key constraint to prevent conflicting DML and DDL operations from executing concurrently on the related tables. When updating a parent table, a metadata lock is taken on the child table while updating foreign key metadata. Foreign key metadata is owned by the child table.

\section*{Metadata Lock Release}

To ensure transaction serializability, the server must not permit one session to perform a data definition language (DDL) statement on a table that is used in an uncompleted explicitly or implicitly started transaction in another session. The server achieves this by acquiring metadata locks on tables used within a transaction and deferring release of those locks until the transaction ends. A metadata lock on a table prevents changes to the table's structure. This locking approach has the implication that a table that is being used by a transaction within one session cannot be used in DDL statements by other sessions until the transaction ends.

This principle applies not only to transactional tables, but also to nontransactional tables. Suppose that a session begins a transaction that uses transactional table $t$ and nontransactional table $n t$ as follows:
```
START TRANSACTION;
SELECT * FROM t;
SELECT * FROM nt;
```


The server holds metadata locks on both t and nt until the transaction ends. If another session attempts a DDL or write lock operation on either table, it blocks until metadata lock release at transaction end. For example, a second session blocks if it attempts any of these operations:
```
DROP TABLE t;
ALTER TABLE t ...;
DROP TABLE nt;
ALTER TABLE nt ...;
LOCK TABLE t ... WRITE;
```


The same behavior applies for The LOCK TABLES ... READ. That is, explicitly or implicitly started transactions that update any table (transactional or nontransactional) block and are blocked by LOCK TABLES ... READ for that table.

If the server acquires metadata locks for a statement that is syntactically valid but fails during execution, it does not release the locks early. Lock release is still deferred to the end of the transaction because the failed statement is written to the binary log and the locks protect log consistency.

In autocommit mode, each statement is in effect a complete transaction, so metadata locks acquired for the statement are held only to the end of the statement.

Metadata locks acquired during a PREPARE statement are released once the statement has been prepared, even if preparation occurs within a multiple-statement transaction.

For XA transactions in PREPARED state, metadata locks are maintained across client disconnects and server restarts, until an XA COMMIT or XA ROLLBACK is executed.

\subsection*{10.11.5 External Locking}

External locking is the use of file system locking to manage contention for MyISAM database tables by multiple processes. External locking is used in situations where a single process such as the MySQL
server cannot be assumed to be the only process that requires access to tables. Here are some examples:
- If you run multiple servers that use the same database directory (not recommended), each server must have external locking enabled.
- If you use myisamchk to perform table maintenance operations on MyISAM tables, you must either ensure that the server is not running, or that the server has external locking enabled so that it locks table files as necessary to coordinate with myisamchk for access to the tables. The same is true for use of myisampack to pack MyISAM tables.

If the server is run with external locking enabled, you can use myisamchk at any time for read operations such a checking tables. In this case, if the server tries to update a table that myisamchk is using, the server waits for myisamchk to finish before it continues.

If you use myisamchk for write operations such as repairing or optimizing tables, or if you use myisampack to pack tables, you must always ensure that the mysqld server is not using the table. If you do not stop mysqld, at least do a mysqladmin flush-tables before you run myisamchk. Your tables may become corrupted if the server and myisamchk access the tables simultaneously.

With external locking in effect, each process that requires access to a table acquires a file system lock for the table files before proceeding to access the table. If all necessary locks cannot be acquired, the process is blocked from accessing the table until the locks can be obtained (after the process that currently holds the locks releases them).

External locking affects server performance because the server must sometimes wait for other processes before it can access tables.

External locking is unnecessary if you run a single server to access a given data directory (which is the usual case) and if no other programs such as myisamchk need to modify tables while the server is running. If you only read tables with other programs, external locking is not required, although myisamchk might report warnings if the server changes tables while myisamchk is reading them.

With external locking disabled, to use myisamchk, you must either stop the server while myisamchk executes or else lock and flush the tables before running myisamchk. To avoid this requirement, use the CHECK TABLE and REPAIR TABLE statements to check and repair MyISAM tables.

For mysqld, external locking is controlled by the value of the skip_external_locking system variable. When this variable is enabled, external locking is disabled, and vice versa. External locking is disabled by default.

Use of external locking can be controlled at server startup by using the --external-locking or -skip-external-locking option.

If you do use external locking option to enable updates to MyISAM tables from many MySQL processes, do not start the server with the delay_key_write system variable set to ALL or use the DELAY_KEY_WRITE=1 table option for any shared tables. Otherwise, index corruption can occur.

The easiest way to satisfy this condition is to always use --external-locking together with --delay-key-write=0FF. (This is not done by default because in many setups it is useful to have a mixture of the preceding options.)

\subsection*{10.12 Optimizing the MySQL Server}

This section discusses optimization techniques for the database server, primarily dealing with system configuration rather than tuning SQL statements. The information in this section is appropriate for DBAs who want to ensure performance and scalability across the servers they manage; for developers constructing installation scripts that include setting up the database; and people running MySQL themselves for development, testing, and so on who want to maximize their own productivity.

\subsection*{10.12.1 Optimizing Disk I/O}

This section describes ways to configure storage devices when you can devote more and faster storage hardware to the database server. For information about optimizing an InnoDB configuration to improve I/O performance, see Section 10.5.8, "Optimizing InnoDB Disk I/O".
- Disk seeks are a huge performance bottleneck. This problem becomes more apparent when the amount of data starts to grow so large that effective caching becomes impossible. For large databases where you access data more or less randomly, you can be sure that you need at least one disk seek to read and a couple of disk seeks to write things. To minimize this problem, use disks with low seek times.
- Increase the number of available disk spindles (and thereby reduce the seek overhead) by either symlinking files to different disks or striping the disks:
- Using symbolic links

This means that, for MyISAM tables, you symlink the index file and data files from their usual location in the data directory to another disk (that may also be striped). This makes both the seek and read times better, assuming that the disk is not used for other purposes as well. See Section 10.12.2, "Using Symbolic Links".

Symbolic links are not supported for use with InnoDB tables. However, it is possible to place InnoDB data and log files on different physical disks. For more information, see Section 10.5.8, "Optimizing InnoDB Disk I/O".
- Striping

Striping means that you have many disks and put the first block on the first disk, the second block on the second disk, and the $N$-th block on the ( $N$ MOD number_of_disks) disk, and so on. This means if your normal data size is less than the stripe size (or perfectly aligned), you get much better performance. Striping is very dependent on the operating system and the stripe size, so benchmark your application with different stripe sizes. See Section 10.13.2, "Using Your Own Benchmarks".

The speed difference for striping is very dependent on the parameters. Depending on how you set the striping parameters and number of disks, you may get differences measured in orders of magnitude. You have to choose to optimize for random or sequential access.
- For reliability, you may want to use RAID $0+1$ (striping plus mirroring), but in this case, you need $2 \times N$ drives to hold $N$ drives of data. This is probably the best option if you have the money for it. However, you may also have to invest in some volume-management software to handle it efficiently.
- A good option is to vary the RAID level according to how critical a type of data is. For example, store semi-important data that can be regenerated on a RAID 0 disk, but store really important data such as host information and logs on a RAID $0+1$ or RAID $N$ disk. RAID $N$ can be a problem if you have many writes, due to the time required to update the parity bits.
- You can also set the parameters for the file system that the database uses:

If you do not need to know when files were last accessed (which is not really useful on a database server), you can mount your file systems with the - o noatime option. That skips updates to the last access time in inodes on the file system, which avoids some disk seeks.

On many operating systems, you can set a file system to be updated asynchronously by mounting it with the - o async option. If your computer is reasonably stable, this should give you better performance without sacrificing too much reliability. (This flag is on by default on Linux.)

\section*{Using NFS with MySQL}

You should be cautious when considering whether to use NFS with MySQL. Potential issues, which vary by operating system and NFS version, include the following:
- MySQL data and log files placed on NFS volumes becoming locked and unavailable for use. Locking issues may occur in cases where multiple instances of MySQL access the same data directory or where MySQL is shut down improperly, due to a power outage, for example. NFS version 4 addresses underlying locking issues with the introduction of advisory and lease-based locking. However, sharing a data directory among MySQL instances is not recommended.
- Data inconsistencies introduced due to messages received out of order or lost network traffic. To avoid this issue, use TCP with hard and intr mount options.
- Maximum file size limitations. NFS Version 2 clients can only access the lowest 2 GB of a file (signed 32 bit offset). NFS Version 3 clients support larger files (up to 64 bit offsets). The maximum supported file size also depends on the local file system of the NFS server.

Using NFS within a professional SAN environment or other storage system tends to offer greater reliability than using NFS outside of such an environment. However, NFS within a SAN environment may be slower than directly attached or bus-attached non-rotational storage.

If you choose to use NFS, NFS Version 4 or later is recommended, as is testing your NFS setup thoroughly before deploying into a production environment.

\subsection*{10.12.2 Using Symbolic Links}

You can move databases or tables from the database directory to other locations and replace them with symbolic links to the new locations. You might want to do this, for example, to move a database to a file system with more free space or increase the speed of your system by spreading your tables to different disks.

For InnoDB tables, use the DATA DIRECTORY clause of the CREATE TABLE statement instead of symbolic links, as explained in Section 17.6.1.2, "Creating Tables Externally". This new feature is a supported, cross-platform technique.

The recommended way to do this is to symlink entire database directories to a different disk. Symlink MyISAM tables only as a last resort.

To determine the location of your data directory, use this statement:
```
SHOW VARIABLES LIKE 'datadir';
```


\subsection*{10.12.2.1 Using Symbolic Links for Databases on Unix}

On Unix, symlink a database using this procedure:
1. Create the database using CREATE DATABASE:
mysql> CREATE DATABASE mydb1;
Using CREATE DATABASE creates the database in the MySQL data directory and permits the server to update the data dictionary with information about the database directory.
2. Stop the server to ensure that no activity occurs in the new database while it is being moved.
3. Move the database directory to some disk where you have free space. For example, use tar or mv . If you use a method that copies rather than moves the database directory, remove the original database directory after copying it.
4. Create a soft link in the data directory to the moved database directory:
```
$> ln -s /path/to/mydb1 /path/to/datadir
```


The command creates a symlink named mydb1 in the data directory.
5. Restart the server.

\subsection*{10.12.2.2 Using Symbolic Links for MyISAM Tables on Unix}

\section*{Note}

Symbolic link support as described here, along with the --symbolic-links option that controls it, and is deprecated; expect these to be removed in a future version of MySQL. In addition, the option is disabled by default.

Symlinks are fully supported only for MyISAM tables. For files used by tables for other storage engines, you may get strange problems if you try to use symbolic links. For InnodB tables, use the alternative technique explained in Section 17.6.1.2, "Creating Tables Externally" instead.

Do not symlink tables on systems that do not have a fully operational realpath() call. (Linux and Solaris support realpath( )). To determine whether your system supports symbolic links, check the value of the have_symlink system variable using this statement:

SHOW VARIABLES LIKE 'have_symlink';
The handling of symbolic links for MyISAM tables works as follows:
- In the data directory, you always have the data (.MYD) file and the index (.MYI) file. The data file and index file can be moved elsewhere and replaced in the data directory by symlinks.
- You can symlink the data file and the index file independently to different directories.
- To instruct a running MySQL server to perform the symlinking, use the DATA DIRECTORY and INDEX DIRECTORY options to CREATE TABLE. See Section 15.1.20, "CREATE TABLE Statement". Alternatively, if mysqld is not running, symlinking can be accomplished manually using $\ln -s$ from the command line.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1848.jpg?height=127&width=101&top_left_y=1434&top_left_x=340)

Note
The path used with either or both of the DATA DIRECTORY and INDEX DIRECTORY options may not include the MySQL data directory. (Bug \#32167)
- myisamchk does not replace a symlink with the data file or index file. It works directly on the file to which the symlink points. Any temporary files are created in the directory where the data file or index file is located. The same is true for the ALTER TABLE, OPTIMIZE TABLE, and REPAIR TABLE statements.
- a

\section*{Note}

When you drop a table that is using symlinks, both the symlink and the file to which the symlink points are dropped. This is an extremely good reason not to run mysqld as the root operating system user or permit operating system users to have write access to MySQL database directories.
- If you rename a table with ALTER TABLE ... RENAME or RENAME TABLE and you do not move the table to another database, the symlinks in the database directory are renamed to the new names and the data file and index file are renamed accordingly.
- If you use ALTER TABLE ... RENAME or RENAME TABLE to move a table to another database, the table is moved to the other database directory. If the table name changed, the symlinks in the new database directory are renamed to the new names and the data file and index file are renamed accordingly.
- If you are not using symlinks, start mysqld with the --skip-symbolic-links option to ensure that no one can use mysqld to drop or rename a file outside of the data directory.

These table symlink operations are not supported:
- ALTER TABLE ignores the DATA DIRECTORY and INDEX DIRECTORY table options.

\subsection*{10.12.2.3 Using Symbolic Links for Databases on Windows}

On Windows, symbolic links can be used for database directories. This enables you to put a database directory at a different location (for example, on a different disk) by setting up a symbolic link to it. Use of database symlinks on Windows is similar to their use on Unix, although the procedure for setting up the link differs.

Suppose that you want to place the database directory for a database named mydb at $\mathrm{D}: \backslash$ data $\backslash$ mydb. To do this, create a symbolic link in the MySQL data directory that points to $\mathrm{D}: \backslash$ data $\backslash$ mydb. However, before creating the symbolic link, make sure that the $\mathrm{D}: \backslash$ data $\backslash$ mydb directory exists by creating it if necessary. If you already have a database directory named mydb in the data directory, move it to D : \data. Otherwise, the symbolic link has no effect. To avoid problems, make sure that the server is not running when you move the database directory.

On Windows, you can create a symlink using the mklink command. This command requires administrative privileges.
1. Make sure that the desired path to the database exists. For this example, we use $\mathrm{D}: \backslash$ data $\backslash$ mydb, and a database named mydb.
2. If the database does not already exist, issue CREATE DATABASE mydb in the mysql client to create it.
3. Stop the MySQL service.
4. Using Windows Explorer or the command line, move the directory mydb from the data directory to D: \data, replacing the directory of the same name.
5. If you are not already using the command prompt, open it, and change location to the data directory, like this:
```
C:\> cd \path\to\datadir
```


If your MySQL installation is in the default location, you can use this:
```
C:\> cd C:\ProgramData\MySQL\MySQL Server 8.4\Data
```

6. In the data directory, create a symlink named mydb that points to the location of the database directory:
```
C:\> mklink /d mydb D:\data\mydb
```

7. Start the MySQL service.

After this, all tables created in the database mydb are created in $\mathrm{D}: \backslash$ data $\backslash$ mydb.
Alternatively, on any version of Windows supported by MySQL, you can create a symbolic link to a MySQL database by creating a . sym file in the data directory that contains the path to the destination directory. The file should be named $d b \_n a m e$. sym, where $d b \_$name is the database name.

Support for database symbolic links on Windows using . sym files is enabled by default. If you do not need . sym file symbolic links, you can disable support for them by starting mysqld with the --skip-symbolic-links option. To determine whether your system supports . sym file symbolic links, check the value of the have_symlink system variable using this statement:
```
SHOW VARIABLES LIKE 'have_symlink';
```


To create a . sym file symlink, use this procedure:
1. Change location into the data directory:

\section*{C:\> cd \path\to\datadir}
2. In the data directory, create a text file named mydb. sym that contains this path name: D: \data \mydb\}

\section*{Note}

The path name to the new database and tables should be absolute. If you specify a relative path, the location is relative to the mydb. sym file.

After this, all tables created in the database mydb are created in $\mathrm{D}: \backslash$ data $\backslash$ mydb.

\subsection*{10.12.3 Optimizing Memory Use}

\subsection*{10.12.3.1 How MySQL Uses Memory}

MySQL allocates buffers and caches to improve performance of database operations. The default configuration is designed to permit a MySQL server to start on a virtual machine that has approximately 512 MB of RAM. You can improve MySQL performance by increasing the values of certain cache and buffer-related system variables. You can also modify the default configuration to run MySQL on systems with limited memory.

The following list describes some of the ways that MySQL uses memory. Where applicable, relevant system variables are referenced. Some items are storage engine or feature specific.
- The InnoDB buffer pool is a memory area that holds cached InnoDB data for tables, indexes, and other auxiliary buffers. For efficiency of high-volume read operations, the buffer pool is divided into pages that can potentially hold multiple rows. For efficiency of cache management, the buffer pool is implemented as a linked list of pages; data that is rarely used is aged out of the cache, using a variation of the LRU algorithm. For more information, see Section 17.5.1, "Buffer Pool".

The size of the buffer pool is important for system performance:
- InnoDB allocates memory for the entire buffer pool at server startup, using malloc() operations. The innodb_buffer_pool_size system variable defines the buffer pool size. Typically, a recommended innodb_buffer_pool_size value is 50 to 75 percent of system memory. innodb_buffer_pool_size can be configured dynamically, while the server is running. For more information, see Section 17.8.3.1, "Configuring InnoDB Buffer Pool Size".
- On systems with a large amount of memory, you can improve concurrency by dividing the buffer pool into multiple buffer pool instances. The innodb_buffer_pool_instances system variable defines the number of buffer pool instances.
- A buffer pool that is too small may cause excessive churning as pages are flushed from the buffer pool only to be required again a short time later.
- A buffer pool that is too large may cause swapping due to competition for memory.
- The storage engine interface enables the optimizer to provide information about the size of the record buffer to be used for scans that the optimizer estimates are likely to read multiple rows. The buffer size can vary based on the size of the estimate. InnoDB uses this variable-size buffering capability to take advantage of row prefetching, and to reduce the overhead of latching and B-tree navigation.
- All threads share the MyISAM key buffer. The key_buffer_size system variable determines its size.

For each MyISAM table the server opens, the index file is opened once; the data file is opened once for each concurrently running thread that accesses the table. For each concurrent thread, a table structure, column structures for each column, and a buffer of size 3 * $N$ are allocated (where $N$ is
the maximum row length, not counting BLOB columns). A BLOB column requires five to eight bytes plus the length of the BLOB data. The MyISAM storage engine maintains one extra row buffer for internal use.
- The myisam_use_mmap system variable can be set to 1 to enable memory-mapping for all MyISAM tables.
- If an internal in-memory temporary table becomes too large (as determined by tmp_table_size and max_heap_table_size), MySQL automatically converts the table from in-memory to on-disk format, which uses the InnoDB storage engine. You can increase the permissible temporary table size as described in Section 10.4.4, "Internal Temporary Table Use in MySQL".

For MEMORY tables explicitly created with CREATE TABLE, only the max_heap_table_size system variable determines how large a table can grow, and there is no conversion to on-disk format.
- The MySQL Performance Schema is a feature for monitoring MySQL server execution at a low level. The Performance Schema dynamically allocates memory incrementally, scaling its memory use to actual server load, instead of allocating required memory during server startup. Once memory is allocated, it is not freed until the server is restarted. For more information, see Section 29.17, "The Performance Schema Memory-Allocation Model".
- Each thread that the server uses to manage client connections requires some thread-specific space. The following list indicates these and which system variables control their size:
- A stack (thread_stack)
- A connection buffer (net_buffer_length)
- A result buffer (net_buffer_length)

The connection buffer and result buffer each begin with a size equal to net_buffer_length bytes, but are dynamically enlarged up to max_allowed_packet bytes as needed. The result buffer shrinks to net_buffer_length bytes after each SQL statement. While a statement is running, a copy of the current statement string is also allocated.

Each connection thread uses memory for computing statement digests. The server allocates max_digest_length bytes per session. See Section 29.10, "Performance Schema Statement Digests and Sampling".
- All threads share the same base memory.
- When a thread is no longer needed, the memory allocated to it is released and returned to the system unless the thread goes back into the thread cache. In that case, the memory remains allocated.
- Each request that performs a sequential scan of a table allocates a read buffer. The read_buffer_size system variable determines the buffer size.
- When reading rows in an arbitrary sequence (for example, following a sort), a random-read buffer may be allocated to avoid disk seeks. The read_rnd_buffer_size system variable determines the buffer size.
- All joins are executed in a single pass, and most joins can be done without even using a temporary table. Most temporary tables are memory-based hash tables. Temporary tables with a large row length (calculated as the sum of all column lengths) or that contain BLOB columns are stored on disk.
- Most requests that perform a sort allocate a sort buffer and zero to two temporary files depending on the result set size. See Section B.3.3.5, "Where MySQL Stores Temporary Files".
- Almost all parsing and calculating is done in thread-local and reusable memory pools. No memory overhead is needed for small items, thus avoiding the normal slow memory allocation and freeing. Memory is allocated only for unexpectedly large strings.
- For each table having BLOB columns, a buffer is enlarged dynamically to read in larger BLOB values. If you scan a table, the buffer grows as large as the largest BLOB value.
- MySQL requires memory and descriptors for the table cache. Handler structures for all in-use tables are saved in the table cache and managed as "First In, First Out" (FIFO). The table_open_cache system variable defines the initial table cache size; see Section 10.4.3.1, "How MySQL Opens and Closes Tables".

MySQL also requires memory for the table definition cache. The table_definition_cache system variable defines the number of table definitions that can be stored in the table definition cache. If you use a large number of tables, you can create a large table definition cache to speed up the opening of tables. The table definition cache takes less space and does not use file descriptors, unlike the table cache.
- A FLUSH TABLES statement or mysqladmin flush-tables command closes all tables that are not in use at once and marks all in-use tables to be closed when the currently executing thread finishes. This effectively frees most in-use memory. FLUSH TABLES does not return until all tables have been closed.
- The server caches information in memory as a result of GRANT, CREATE USER, CREATE SERVER, and INSTALL PLUGIN statements. This memory is not released by the corresponding REVOKE, DROP USER, DROP SERVER, and UNINSTALL PLUGIN statements, so for a server that executes many instances of the statements that cause caching, there is an increase in cached memory use unless it is freed with FLUSH PRIVILEGES.
- In a replication topology, the following settings affect memory usage, and can be adjusted as required:
- The max_allowed_packet system variable on a replication source limits the maximum message size that the source sends to its replicas for processing. This setting defaults to 64 M .
- The system variable replica_pending_jobs_size_max on a multithreaded replica sets the maximum amount of memory that is made available for holding messages awaiting processing. This setting defaults to 128 M . The memory is only allocated when needed, but it might be used if your replication topology handles large transactions sometimes. It is a soft limit, and larger transactions can be processed.
- The rpl_read_size system variable on a replication source or replica controls the minimum amount of data in bytes that is read from the binary log files and relay log files. The default is 8192 bytes. A buffer the size of this value is allocated for each thread that reads from the binary log and relay log files, including dump threads on sources and coordinator threads on replicas.
- The binlog_transaction_dependency_history_size system variable limits the number of row hashes held as an in-memory history.
- The max_binlog_cache_size system variable specifies the upper limit of memory usage by an individual transaction.
- The max_binlog_stmt_cache_size system variable specifies the upper limit of memory usage by the statement cache.
ps and other system status programs may report that mysqld uses a lot of memory. This may be caused by thread stacks on different memory addresses. For example, the Solaris version of ps counts the unused memory between stacks as used memory. To verify this, check available swap with swap - s . We test mysqld with several memory-leakage detectors (both commercial and Open Source), so there should be no memory leaks.

\subsection*{10.12.3.2 Monitoring MySQL Memory Usage}

The following example demonstrates how to use Performance Schema and sys schema to monitor MySQL memory usage.

Most Performance Schema memory instrumentation is disabled by default. Instruments can be enabled by updating the ENABLED column of the Performance Schema setup_instruments table. Memory instruments have names in the form of memory/code_area/instrument_name, where code_area is a value such as sql or innodb, and instrument_name is the instrument detail.
1. To view available MySQL memory instruments, query the Performance Schema setup_instruments table. The following query returns hundreds of memory instruments for all code areas.
```
mysql> SELECT * FROM performance_schema.setup_instruments
    WHERE NAME LIKE '%memory%';
```


You can narrow results by specifying a code area. For example, you can limit results to InnoDB memory instruments by specifying innodb as the code area.
```
mysql> SELECT * FROM performance_schema.setup_instruments
    WHERE NAME LIKE '%memory/innodb%';

\begin{tabular}{|l|l|l|}
\hline NAME & ENABLED & TIMED \\
\hline memory/innodb/adaptive hash index & NO & NO \\
\hline memory/innodb/buf_buf_pool & NO & NO \\
\hline memory/innodb/dict_stats_bg_recalc_pool_t & NO & NO \\
\hline memory/innodb/dict_stats_index_map_t & NO & NO \\
\hline memory/innodb/dict_stats_n_diff_on_level & NO & NO \\
\hline memory/innodb/other & N0 & NO \\
\hline memory/innodb/row_log_buf & NO & NO \\
\hline memory/innodb/row_merge_sort & NO & NO \\
\hline memory/innodb/std & NO & NO \\
\hline memory/innodb/trx_sys_t::rw_trx_ids & NO & NO \\
\hline
\end{tabular}
⋯
```


Depending on your MySQL installation, code areas may include performance_schema, sql, client, innodb, myisam, csv, memory, blackhole, archive, partition, and others.
2. To enable memory instruments, add a performance-schema-instrument rule to your MySQL configuration file. For example, to enable all memory instruments, add this rule to your configuration file and restart the server:
performance-schema-instrument='memory/\%=COUNTED'
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1853.jpg?height=125&width=100&top_left_y=1742&top_left_x=424)

\section*{Note}

Enabling memory instruments at startup ensures that memory allocations that occur at startup are counted.

After restarting the server, the ENABLED column of the Performance Schema setup_instruments table should report YES for memory instruments that you enabled. The TIMED column in the setup_instruments table is ignored for memory instruments because memory operations are not timed.
```
mysql> SELECT * FROM performance_schema.setup_instruments
    WHERE NAME LIKE '%memory/innodb%';
+--------------------------------------------+---------+-------+
| NAME | ENABLED | TIMED |
+---------------------------------------------+---------+-------+
| memory/innodb/adaptive hash index | NO | NO
| memory/innodb/buf_buf_pool | NO | NO
| memory/innodb/dict_stats_bg_recalc_pool_t | NO | NO
| memory/innodb/dict_stats_index_map_t | NO | NO
| memory/innodb/dict_stats_n_diff_on_level | NO | NO
| memory/innodb/other | NO | NO
| memory/innodb/row_log_buf | NO | NO
| memory/innodb/row_merge_sort | NO | NO
| memory/innodb/std | NO | NO
| memory/innodb/trx_sys_t::rw_trx_ids | NO | NO |
...
```

3. Query memory instrument data. In this example, memory instrument data is queried in the Performance Schema memory_summary_global_by_event_name table, which summarizes data by EVENT_NAME. The EVENT_NAME is the name of the instrument.

The following query returns memory data for the InnoDB buffer pool. For column descriptions, see Section 29.12.20.10, "Memory Summary Tables".
```
mysql> SELECT * FROM performance_schema.memory_summary_global_by_event_name
        WHERE EVENT_NAME LIKE 'memory/innodb/buf_buf_pool'\G
                    EVENT_NAME: memory/innodb/buf_buf_pool
                COUNT_ALLOC: 1
                    COUNT_FREE: 0
    SUM_NUMBER_OF_BYTES_ALLOC: 137428992
        SUM_NUMBER_OF_BYTES_FREE: 0
                    LOW_COUNT_USED: 0
                CURRENT_COUNT_USED: 1
                    HIGH_COUNT_USED: 1
        LOW_NUMBER_OF_BYTES_USED: 0
CURRENT_NUMBER_OF_BYTES_USED: 137428992
    HIGH_NUMBER_OF_BYTES_USED: 137428992
```


The same underlying data can be queried using the sys schema memory_global_by_current_bytes table, which shows current memory usage within the server globally, broken down by allocation type.
```
mysql> SELECT * FROM sys.memory_global_by_current_bytes
            WHERE event_name LIKE 'memory/innodb/buf_buf_pool'\G
************************** 1. row ******************************
            event_name: memory/innodb/buf_buf_pool
        current_count: 1
        current_alloc: 131.06 MiB
current_avg_alloc: 131.06 MiB
            high_count: 1
            high_alloc: 131.06 MiB
    high_avg_alloc: 131.06 MiB
```


This sys schema query aggregates currently allocated memory (current_alloc) by code area:
```
mysql> SELECT SUBSTRING_INDEX(event_name,'/',2) AS
    code_area, FORMAT_BYTES(SUM(current_alloc))
    AS current_alloc
    FROM sys.x$memory_global_by_current_bytes
    GROUP BY SUBSTRING_INDEX(event_name,'/',2)
    ORDER BY SUM(current_alloc) DESC;
+----------------------------+--------------+
| code_area | current_alloc |
+----------------------------+---------------+

\begin{tabular}{|l|l|}
\hline memory/innodb & 843.24 MiB \\
\hline memory/performance_schema & 81.29 MiB \\
\hline memory/mysys & 8.20 MiB \\
\hline memory/sql & 2.47 MiB \\
\hline memory/memory & 174.01 KiB \\
\hline memory/myisam & 46.53 KiB \\
\hline memory/blackhole & 512 bytes \\
\hline memory/federated & 512 bytes \\
\hline memory/csv & 512 bytes \\
\hline memory/vio & 496 bytes \\
\hline
\end{tabular}
```


For more information about sys schema, see Chapter 30, MySQL sys Schema.

\subsection*{10.12.3.3 Enabling Large Page Support}

Some hardware and operating system architectures support memory pages greater than the default (usually 4 KB ). The actual implementation of this support depends on the underlying hardware and operating system. Applications that perform a lot of memory accesses may obtain performance improvements by using large pages due to reduced Translation Lookaside Buffer (TLB) misses.

In MySQL, large pages can be used by InnoDB, to allocate memory for its buffer pool and additional memory pool.

Standard use of large pages in MySQL attempts to use the largest size supported, up to 4 MB . Under Solaris, a "super large pages" feature enables uses of pages up to 256 MB . This feature is available for recent SPARC platforms. It can be enabled or disabled by using the --super-large-pages or -skip-super-large-pages option.

MySQL also supports the Linux implementation of large page support (which is called HugeTLB in Linux).

Before large pages can be used on Linux, the kernel must be enabled to support them and it is necessary to configure the HugeTLB memory pool. For reference, the HugeTBL API is documented in the Documentation/vm/hugetlbpage.txt file of your Linux sources.

The kernels for some recent systems such as Red Hat Enterprise Linux may have the large pages feature enabled by default. To check whether this is true for your kernel, use the following command and look for output lines containing "huge":
```
$> grep -i huge /proc/meminfo
AnonHugePages: 2658304 kB
ShmemHugePages: 0 kB
HugePages_Total: 0
HugePages_Free: 0
HugePages_Rsvd: 0
HugePages_Surp: 0
Hugepagesize: 2048 kB
Hugetlb: 0 kB
```


The nonempty command output indicates that large page support is present, but the zero values indicate that no pages are configured for use.

If your kernel needs to be reconfigured to support large pages, consult the hugetlbpage.txt file for instructions.

Assuming that your Linux kernel has large page support enabled, configure it for use by MySQL using the following steps:
1. Determine the number of large pages needed. This is the size of the InnoDB buffer pool divided by the large page size, which we can calculate as innodb_buffer_pool_size / Hugepagesize. Assuming the default value for the innodb_buffer_pool_size $(128 \mathrm{MB})$ and using the Hugepagesize value obtained from /proc/meminfo $(2 \mathrm{MB})$, this is $128 \mathrm{MB} / 2 \mathrm{MB}$, or 64 Huge Pages. We call this value $P$.
2. As system root, open the file /etc/sysctl.conf in a text editor, and add the line shown here, where $P$ is the number of large pages obtained in the previous step:
```
vm.nr_hugepages=P
```


Using the actual value obtained previously, the additional line should look like this:
vm.nr_hugepages=66
Save the updated file.
3. As system root, run the following command:
```
$> sudo sysctl -p
```


\section*{Note}

On some systems the large pages file may be named slightly differently; for example, some distributions call it nr_hugepages. In the event sysctl returns an error relating to the file name, check the name of the corresponding file in /proc/sys/vm and use that instead.

To verify the large page configuration, check /proc/meminfo again as described previously. Now you should see some additional nonzero values in the output, similar to this:
```
$> grep -i huge /proc/meminfo
AnonHugePages: 2686976 kB
ShmemHugePages: 0 kB
HugePages_Total: 233
HugePages_Free: 233
HugePages_Rsvd: 0
HugePages_Surp: 0
Hugepagesize: 2048 kB
Hugetlb: 477184 kB
```

4. Optionally, you may wish to compact the Linux VM. You can do this using a sequence of commands, possibly in a script file, similar to what is shown here:
```
sync
sync
sync
echo 3 > /proc/sys/vm/drop_caches
echo 1 > /proc/sys/vm/compact_memory
```


See your operating platform documentation for more information about how to do this.
5. Check any configuration files such as my.cnf used by the server, and make sure that innodb_buffer_pool_chunk_size is set larger than the huge page size. The default for this variable is 128 M .
6. Large page support in the MySQL server is disabled by default. To enable it, start the server with --large-pages. You can also do so by adding the following line to the [mysqld] section of the server my.cnf file:
```
large-pages=ON
```


With this option enabled, InnoDB uses large pages automatically for its buffer pool and additional memory pool. If InnoDB cannot do this, it falls back to use of traditional memory and writes a warning to the error log: Warning: Using conventional memory pool.

You can verify that MySQL is now using large pages by checking / proc/meminfo again after restarting mysqld, like this:
```
$> grep -i huge /proc/meminfo
AnonHugePages: 2516992 kB
ShmemHugePages: 0 kB
HugePages_Total: 233
HugePages_Free: 222
HugePages_Rsvd: 55
HugePages_Surp: 0
Hugepagesize: 2048 kB
Hugetlb: 477184 kB
```


\subsection*{10.13 Measuring Performance (Benchmarking)}

To measure performance, consider the following factors:
- Whether you are measuring the speed of a single operation on a quiet system, or how a set of operations (a "workload") works over a period of time. With simple tests, you usually test how changing one aspect (a configuration setting, the set of indexes on a table, the SQL clauses in a query) affects performance. Benchmarks are typically long-running and elaborate performance tests, where the results could dictate high-level choices such as hardware and storage configuration, or how soon to upgrade to a new MySQL version.
- For benchmarking, sometimes you must simulate a heavy database workload to get an accurate picture.
- Performance can vary depending on so many different factors that a difference of a few percentage points might not be a decisive victory. The results might shift the opposite way when you test in a different environment.
- Certain MySQL features help or do not help performance depending on the workload. For completeness, always test performance with those features turned on and turned off. The most important feature to try with each workload is the adaptive hash index for InnoDB tables.

This section progresses from simple and direct measurement techniques that a single developer can do, to more complicated ones that require additional expertise to perform and interpret the results.

\subsection*{10.13.1 Measuring the Speed of Expressions and Functions}

To measure the speed of a specific MySQL expression or function, invoke the BENCHMARK( ) function using the mysql client program. Its syntax is BENCHMARK(loop_count, expr). The return value is always zero, but mysql prints a line displaying approximately how long the statement took to execute. For example:
```
mysql> SELECT BENCHMARK(1000000,1+1);
+--------------------------+
| BENCHMARK(1000000,1+1) |
+-------------------------+
| 0 |
+-------------------------+
1 row in set (0.32 sec)
```


This result was obtained on a Pentium II 400 MHz system. It shows that MySQL can execute $1,000,000$ simple addition expressions in 0.32 seconds on that system.

The built-in MySQL functions are typically highly optimized, but there may be some exceptions. BENCHMARK( ) is an excellent tool for finding out if some function is a problem for your queries.

\subsection*{10.13.2 Using Your Own Benchmarks}

Benchmark your application and database to find out where the bottlenecks are. After fixing one bottleneck (or by replacing it with a "dummy" module), you can proceed to identify the next bottleneck. Even if the overall performance for your application currently is acceptable, you should at least make a plan for each bottleneck and decide how to solve it if someday you really need the extra performance.

A free benchmark suite is the Open Source Database Benchmark, available at http:// osdb.sourceforge.net/.

It is very common for a problem to occur only when the system is very heavily loaded. We have had many customers who contact us when they have a (tested) system in production and have encountered load problems. In most cases, performance problems turn out to be due to issues of basic database design (for example, table scans are not good under high load) or problems with the operating system or libraries. Most of the time, these problems would be much easier to fix if the systems were not already in production.

To avoid problems like this, benchmark your whole application under the worst possible load:
- The mysqlslap program can be helpful for simulating a high load produced by multiple clients issuing queries simultaneously. See Section 6.5.7, "mysqlslap - A Load Emulation Client".
- You can also try benchmarking packages such as SysBench and DBT2, available at https:// launchpad.net/sysbench, and http://osdldbt.sourceforge.net/\#dbt2.

These programs or packages can bring a system to its knees, so be sure to use them only on your development systems.

\subsection*{10.13.3 Measuring Performance with performance_schema}

You can query the tables in the performance_schema database to see real-time information about the performance characteristics of your server and the applications it is running. See Chapter 29, MySQL Performance Schema for details.

\subsection*{10.14 Examining Server Thread (Process) Information}

To ascertain what your MySQL server is doing, it can be helpful to examine the process list, which indicates the operations currently being performed by the set of threads executing within the server. For example:
```
mysql> SHOW PROCESSLIST\G
************************** 1. row
            Id: 5
        User: event_scheduler
        Host: localhost
            db: NULL
Command: Daemon
        Time: 2756681
    State: Waiting on empty queue
        Info: NULL
************************** 2. row
            Id: 20
        User: me
        Host: localhost:52943
            db: test
Command: Query
        Time: 0
    State: starting
        Info: SHOW PROCESSLIST
```


Threads can be killed with the KILL statement. See Section 15.7.8.4, "KILL Statement".

\subsection*{10.14.1 Accessing the Process List}

The following discussion enumerates the sources of process information, the privileges required to see process information, and describes the content of process list entries.
- Sources of Process Information
- Privileges Required to Access the Process List
- Content of Process List Entries

\section*{Sources of Process Information}

Process information is available from these sources:
- The SHOW PROCESSLIST statement: Section 15.7.7.31, "SHOW PROCESSLIST Statement"
- The mysqladmin processlist command: Section 6.5.2, "mysqladmin - A MySQL Server Administration Program"
- The INFORMATION_SCHEMA PROCESSLIST table: Section 28.3.23, "The INFORMATION_SCHEMA PROCESSLIST Table"
- The Performance Schema processlist table: Section 29.12.22.7, "The processlist Table"
- The Performance Schema threads table columns with names having a prefix of PROCESSLIST_: Section 29.12.22.8, "The threads Table"
- The sys schema processlist and session views: Section 30.4.3.22, "The processlist and x \$processlist Views", and Section 30.4.3.33, "The session and $\times \$$ session Views"

The threads table compares to SHOW PROCESSLIST, INFORMATION_SCHEMA PROCESSLIST, and mysqladmin processlist as follows:
- Access to the threads table does not require a mutex and has minimal impact on server performance. The other sources have negative performance consequences because they require a mutex.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1859.jpg?height=122&width=97&top_left_y=406&top_left_x=404)

> Note
> An alternative implementation for SHOW PROCESSLIST is available based on the Performance Schema processlist table, which, like the threads table, does not require a mutex and has better performance characteristics. For details, see Section 29.12.22.7, "The processlist Table".
- The threads table displays background threads, which the other sources do not. It also provides additional information for each thread that the other sources do not, such as whether the thread is a foreground or background thread, and the location within the server associated with the thread. This means that the threads table can be used to monitor thread activity the other sources cannot.
- You can enable or disable Performance Schema thread monitoring, as described in Section 29.12.22.8, "The threads Table".

For these reasons, DBAs who perform server monitoring using one of the other thread information sources may wish to monitor using the threads table instead.

The sys schema processlist view presents information from the Performance Schema threads table in a more accessible format. The sys schema session view presents information about user sessions like the sys schema processlist view, but with background processes filtered out.

\section*{Privileges Required to Access the Process List}

For most sources of process information, if you have the PROCESS privilege, you can see all threads, even those belonging to other users. Otherwise (without the PROCESS privilege), nonanonymous users have access to information about their own threads but not threads for other users, and anonymous users have no access to thread information.

The Performance Schema threads table also provides thread information, but table access uses a different privilege model. See Section 29.12.22.8, "The threads Table".

\section*{Content of Process List Entries}

Each process list entry contains several pieces of information. The following list describes them using the labels from SHOW PROCESSLIST output. Other process information sources use similar labels.
- Id is the connection identifier for the client associated with the thread.
- User and Host indicate the account associated with the thread.
- db is the default database for the thread, or NULL if none has been selected.
- Command and State indicate what the thread is doing.

Most states correspond to very quick operations. If a thread stays in a given state for many seconds, there might be a problem that needs to be investigated.

The following sections list the possible Command values, and State values grouped by category. The meaning for some of these values is self-evident. For others, additional description is provided.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1859.jpg?height=108&width=95&top_left_y=2398&top_left_x=406)

\section*{Note}

Applications that examine process list information should be aware that the commands and states are subject to change.
- Time indicates how long the thread has been in its current state. The thread's notion of the current time may be altered in some cases: The thread can change the time with SET TIMESTAMP =
value. For a replica SQL thread, the value is the number of seconds between the timestamp of the last replicated event and the real time of the replica host. See Section 19.2.3, "Replication Threads".
- Info indicates the statement the thread is executing, or NULL if it is executing no statement. For SHOW PROCESSLIST, this value contains only the first 100 characters of the statement. To see complete statements, use SHOW FULL PROCESSLIST (or query a different process information source).

\subsection*{10.14.2 Thread Command Values}

A thread can have any of the following Command values:
- Binlog Dump

This is a thread on a replication source for sending binary log contents to a replica.
- Change user

The thread is executing a change user operation.
- Close stmt

The thread is closing a prepared statement.
- Connect

Used by replication receiver threads connected to the source, and by replication worker threads.
- Connect Out

A replica is connecting to its source.
- Create DB

The thread is executing a create database operation.
- Daemon

This thread is internal to the server, not a thread that services a client connection.
- Debug

The thread is generating debugging information.
- Delayed insert

The thread is a delayed insert handler.
- Drop DB

The thread is executing a drop database operation.
- Error
- Execute

The thread is executing a prepared statement.
- Fetch

The thread is fetching the results from executing a prepared statement.
- Field List

The thread is retrieving information for table columns.
- Init DB

The thread is selecting a default database.
- Kill

The thread is killing another thread.
- Long Data

The thread is retrieving long data in the result of executing a prepared statement.
- Ping

The thread is handling a server ping request.
- Prepare

The thread is preparing a prepared statement.
- Processlist

The thread is producing information about server threads.
- Query

Employed for user clients while executing queries by single-threaded replication applier threads, as well as by the replication coordinator thread.
- Quit

The thread is terminating.
- Refresh

The thread is flushing table, logs, or caches, or resetting status variable or replication server information.
- Register Slave

The thread is registering a replica server.
- Reset stmt

The thread is resetting a prepared statement.
- Set option

The thread is setting or resetting a client statement execution option.
- Shutdown

The thread is shutting down the server.
- Sleep

The thread is waiting for the client to send a new statement to it.
- Statistics

The thread is producing server status information.
- Time

Unused.

\subsection*{10.14.3 General Thread States}

The following list describes thread State values that are associated with general query processing and not more specialized activities such as replication. Many of these are useful only for finding bugs in the server.
- After create

This occurs when the thread creates a table (including internal temporary tables), at the end of the function that creates the table. This state is used even if the table could not be created due to some error.
- altering table

The server is in the process of executing an in-place ALTER TABLE.
- Analyzing

The thread is calculating a MyISAM table key distributions (for example, for ANALYZE TABLE).
- checking permissions

The thread is checking whether the server has the required privileges to execute the statement.
- Checking table

The thread is performing a table check operation.
- cleaning up

The thread has processed one command and is preparing to free memory and reset certain state variables.
- closing tables

The thread is flushing the changed table data to disk and closing the used tables. This should be a fast operation. If not, verify that you do not have a full disk and that the disk is not in very heavy use.
- committing alter table to storage engine

The server has finished an in-place ALTER TABLE and is committing the result.
- converting HEAP to ondisk

The thread is converting an internal temporary table from a MEMORY table to an on-disk table.
- copy to tmp table

The thread is processing an ALTER TABLE statement. This state occurs after the table with the new structure has been created but before rows are copied into it.

For a thread in this state, the Performance Schema can be used to obtain about the progress of the copy operation. See Section 29.12.5, "Performance Schema Stage Event Tables".
- Copying to group table

If a statement has different ORDER BY and GROUP BY criteria, the rows are sorted by group and copied to a temporary table.
- Copying to tmp table

The server is copying to a temporary table in memory.
- Copying to tmp table on disk

The server is copying to a temporary table on disk. The temporary result set has become too large (see Section 10.4.4, "Internal Temporary Table Use in MySQL"). Consequently, the thread is changing the temporary table from in-memory to disk-based format to save memory.
- Creating index

The thread is processing ALTER TABLE ... ENABLE KEYS for a MyISAM table.
- Creating sort index

The thread is processing a SELECT that is resolved using an internal temporary table.
- creating table

The thread is creating a table. This includes creation of temporary tables.
- Creating tmp table

The thread is creating a temporary table in memory or on disk. If the table is created in memory but later is converted to an on-disk table, the state during that operation is Copying to tmp table on disk.
- deleting from main table

The server is executing the first part of a multiple-table delete. It is deleting only from the first table, and saving columns and offsets to be used for deleting from the other (reference) tables.
- deleting from reference tables

The server is executing the second part of a multiple-table delete and deleting the matched rows from the other tables.
- discard_or_import_tablespace

The thread is processing an ALTER TABLE ... DISCARD TABLESPACE or ALTER TABLE ... IMPORT TABLESPACE statement.
- end

This occurs at the end but before the cleanup of ALTER TABLE, CREATE VIEW, DELETE, INSERT, SELECT, or UPDATE statements.

For the end state, the following operations could be happening:
- Writing an event to the binary log
- Freeing memory buffers, including for blobs
- executing

The thread has begun executing a statement.
- Execution of init_command

The thread is executing statements in the value of the init_command system variable.
- freeing items

The thread has executed a command. This state is usually followed by cleaning up.
- FULLTEXT initialization

The server is preparing to perform a natural-language full-text search.
- init

This occurs before the initialization of ALTER TABLE, DELETE, INSERT, SELECT, or UPDATE statements. Actions taken by the server in this state include flushing the binary log and the InnoDB log.
- Killed

Someone has sent a KILL statement to the thread and it should abort next time it checks the kill flag. The flag is checked in each major loop in MySQL, but in some cases it might still take a short time for the thread to die. If the thread is locked by some other thread, the kill takes effect as soon as the other thread releases its lock.
- Locking system tables

The thread is trying to lock a system table (for example, a time zone or log table).
- logging slow query

The thread is writing a statement to the slow-query log.
- login

The initial state for a connection thread until the client has been authenticated successfully.
- manage keys

The server is enabling or disabling a table index.
- Opening system tables

The thread is trying to open a system table (for example, a time zone or log table).
- Opening tables

The thread is trying to open a table. This is should be very fast procedure, unless something prevents opening. For example, an ALTER TABLE or a LOCK TABLE statement can prevent opening a table until the statement is finished. It is also worth checking that your table_open_cache value is large enough.

For system tables, the Opening system tables state is used instead.
- optimizing

The server is performing initial optimizations for a query.
- preparing

This state occurs during query optimization.
- preparing for alter table

The server is preparing to execute an in-place ALTER TABLE.
- Purging old relay logs

The thread is removing unneeded relay log files.
- query end

This state occurs after processing a query but before the freeing items state.
- Receiving from client

The server is reading a packet from the client.
- Removing duplicates

The query was using SELECT DISTINCT in such a way that MySQL could not optimize away the distinct operation at an early stage. Because of this, MySQL requires an extra stage to remove all duplicated rows before sending the result to the client.
- removing tmp table

The thread is removing an internal temporary table after processing a SELECT statement. This state is not used if no temporary table was created.
- rename

The thread is renaming a table.
- rename result table

The thread is processing an ALTER TABLE statement, has created the new table, and is renaming it to replace the original table.
- Reopen tables

The thread got a lock for the table, but noticed after getting the lock that the underlying table structure changed. It has freed the lock, closed the table, and is trying to reopen it.
- Repair by sorting

The repair code is using a sort to create indexes.
- Repair done

The thread has completed a multithreaded repair for a MyISAM table.
- Repair with keycache

The repair code is using creating keys one by one through the key cache. This is much slower than Repair by sorting.
- Rolling back

The thread is rolling back a transaction.
- Saving state

For MyISAM table operations such as repair or analysis, the thread is saving the new table state to the .MYI file header. State includes information such as number of rows, the AUTO_INCREMENT counter, and key distributions.
- Searching rows for update

The thread is doing a first phase to find all matching rows before updating them. This has to be done if the UPDATE is changing the index that is used to find the involved rows.
- Sending data

This state is now included in the Executing state.
- Sending to client

The server is writing a packet to the client.
- setup

The thread is beginning an ALTER TABLE operation.
- Sorting for group

The thread is doing a sort to satisfy a GROUP BY.
- Sorting for order

The thread is doing a sort to satisfy an ORDER BY.
- Sorting index

The thread is sorting index pages for more efficient access during a MyISAM table optimization operation.
- Sorting result

For a SELECT statement, this is similar to Creating sort index, but for nontemporary tables.
- starting

The first stage at the beginning of statement execution.
- statistics

The server is calculating statistics to develop a query execution plan. If a thread is in this state for a long time, the server is probably disk-bound performing other work.
- System lock

The thread has called mysql_lock_tables() and the thread state has not been updated since. This is a very general state that can occur for many reasons.

For example, the thread is going to request or is waiting for an internal or external system lock for the table. This can occur when InnoDB waits for a table-level lock during execution of LOCK TABLES. If this state is being caused by requests for external locks and you are not using multiple mysqld servers that are accessing the same MyISAM tables, you can disable external system locks with the --skip-external-locking option. However, external locking is disabled by default, so it is likely that this option has no effect. For SHOW PROFILE, this state means the thread is requesting the lock (not waiting for it).

For system tables, the Locking system tables state is used instead.
- update

The thread is getting ready to start updating the table.
- Updating

The thread is searching for rows to update and is updating them.
- updating main table

The server is executing the first part of a multiple-table update. It is updating only the first table, and saving columns and offsets to be used for updating the other (reference) tables.
- updating reference tables

The server is executing the second part of a multiple-table update and updating the matched rows from the other tables.
- User lock

The thread is going to request or is waiting for an advisory lock requested with a GET_LOCK( ) call. For SHOW PROFILE, this state means the thread is requesting the lock (not waiting for it).
- User sleep

The thread has invoked a SLEEP() call.
- Waiting for commit lock

FLUSH TABLES WITH READ LOCK is waiting for a commit lock.
- waiting for handler commit

The thread is waiting for a transaction to commit versus other parts of query processing.
- Waiting for tables

The thread got a notification that the underlying structure for a table has changed and it needs to reopen the table to get the new structure. However, to reopen the table, it must wait until all other threads have closed the table in question.

This notification takes place if another thread has used FLUSH TABLES or one of the following statements on the table in question: FLUSH TABLES tbl_name, ALTER TABLE, RENAME TABLE, REPAIR TABLE, ANALYZE TABLE, or OPTIMIZE TABLE.
- Waiting for table flush

The thread is executing FLUSH TABLES and is waiting for all threads to close their tables, or the thread got a notification that the underlying structure for a table has changed and it needs to reopen the table to get the new structure. However, to reopen the table, it must wait until all other threads have closed the table in question.

This notification takes place if another thread has used FLUSH TABLES or one of the following statements on the table in question: FLUSH TABLES tbl_name, ALTER TABLE, RENAME TABLE, REPAIR TABLE, ANALYZE TABLE, or OPTIMIZE TABLE.
```
Waiting for lock_type lock
```


The server is waiting to acquire a THR_LOCK lock or a lock from the metadata locking subsystem, where lock_type indicates the type of lock.

This state indicates a wait for a THR_LOCK:
- Waiting for table level lock

These states indicate a wait for a metadata lock:
- Waiting for event metadata lock
- Waiting for global read lock
- Waiting for schema metadata lock
- Waiting for stored function metadata lock
- Waiting for stored procedure metadata lock
- Waiting for table metadata lock
- Waiting for trigger metadata lock

For information about table lock indicators, see Section 10.11.1, "Internal Locking Methods". For information about metadata locking, see Section 10.11.4, "Metadata Locking". To see which locks are blocking lock requests, use the Performance Schema lock tables described at Section 29.12.13, "Performance Schema Lock Tables".
- Waiting on cond

A generic state in which the thread is waiting for a condition to become true. No specific state information is available.
- Writing to net

The server is writing a packet to the network.

\subsection*{10.14.4 Replication Source Thread States}

The following list shows the most common states you may see in the State column for the Binlog Dump thread of the replication source. If you see no Binlog Dump threads on a source, this means that replication is not running; that is, that no replicas are currently connected.

In MySQL 8.0, incompatible changes were made to instrumentation names. Monitoring tools that work with these instrumentation names might be impacted. If the incompatible changes have an impact for you, set the terminology_use_previous system variable to BEFORE_8_0_26 to make MySQL Server use the old versions of the names for the objects specified in the previous list. This enables monitoring tools that rely on the old names to continue working until they can be updated to use the new names.

Set the terminology_use_previous system variable with session scope to support individual functions, or global scope to be a default for all new sessions. When global scope is used, the slow query log contains the old versions of the names.
- Finished reading one binlog; switching to next binlog

The thread has finished reading a binary log file and is opening the next one to send to the replica.
- Master has sent all binlog to slave; waiting for more updates

Source has sent all binlog to replica; waiting for more updates

The thread has read all remaining updates from the binary logs and sent them to the replica. The thread is now idle, waiting for new events to appear in the binary log resulting from new updates occurring on the source.
- Sending binlog event to slave

Sending binlog event to replica
Binary logs consist of events, where an event is usually an update plus some other information. The thread has read an event from the binary log and is now sending it to the replica.
- Waiting to finalize termination

A very brief state that occurs as the thread is stopping.

\subsection*{10.14.5 Replication I/O (Receiver) Thread States}

The following list shows the most common states you see in the State column for a replication I/ O (receiver) thread on a replica server. This state also appears in the Replica_IO_State column displayed by SHOW REPLICA STATUS, so you can get a good view of what is happening by using that statement.

In MySQL 8.0, incompatible changes were made to instrumentation names. Monitoring tools that work with these instrumentation names might be impacted. If the incompatible changes have an impact for you, set the terminology_use_previous system variable to BEFORE_8_0_26 to make MySQL Server use the old versions of the names for the objects specified in the previous list. This enables monitoring tools that rely on the old names to continue working until they can be updated to use the new names.

Set the terminology_use_previous system variable with session scope to support individual functions, or global scope to be a default for all new sessions. When global scope is used, the slow query log contains the old versions of the names.
- Checking master version

Checking source version
A state that occurs very briefly, after the connection to the source is established.
- Connecting to master

Connecting to source
The thread is attempting to connect to the source.
- Queueing master event to the relay log

Queueing source event to the relay log
The thread has read an event and is copying it to the relay log so that the SQL thread can process it.
- Reconnecting after a failed binlog dump request

The thread is trying to reconnect to the source.
- Reconnecting after a failed master event read

Reconnecting after a failed source event read
The thread is trying to reconnect to the source. When connection is established again, the state becomes Waiting for master to send event.
- Registering slave on master
```
Registering replica on source
```


A state that occurs very briefly after the connection to the source is established.
- Requesting binlog dump

A state that occurs very briefly, after the connection to the source is established. The thread sends to the source a request for the contents of its binary logs, starting from the requested binary log file name and position.
- Waiting for its turn to commit

A state that occurs when the replica thread is waiting for older worker threads to commit if replica_preserve_commit_order is enabled.
- Waiting for master to send event
```
Waiting for source to send event
```


The thread has connected to the source and is waiting for binary log events to arrive. This can last for a long time if the source is idle. If the wait lasts for replica_net_timeout seconds, a timeout occurs. At that point, the thread considers the connection to be broken and makes an attempt to reconnect.
- Waiting for master update
```
Waiting for source update
```


The initial state before Connecting to master or Connecting to source.
- Waiting for slave mutex on exit
```
Waiting for replica mutex on exit
```


A state that occurs briefly as the thread is stopping.
- Waiting for the slave SQL thread to free enough relay log space
```
Waiting for the replica SQL thread to free enough relay log space
```


You are using a nonzero relay_log_space_limit value, and the relay logs have grown large enough that their combined size exceeds this value. The I/O (receiver) thread is waiting until the SQL (applier) thread frees enough space by processing relay log contents so that it can delete some relay log files.
- Waiting to reconnect after a failed binlog dump request

If the binary log dump request failed (due to disconnection), the thread goes into this state while it sleeps, then tries to reconnect periodically. The interval between retries can be specified using the CHANGE REPLICATION SOURCE TO.
- Waiting to reconnect after a failed master event read
```
Waiting to reconnect after a failed source event read
```


An error occurred while reading (due to disconnection). The thread is sleeping for the number of seconds set by the CHANGE REPLICATION SOURCE TO statement before attempting to reconnect.

The following list shows the most common states you may see in the State column for a replication SQL thread on a replica server.

In MySQL 8.0, incompatible changes were made to instrumentation names. Monitoring tools that work with these instrumentation names might be impacted. If the incompatible changes have an impact for you, set the terminology_use_previous system variable to BEFORE_8_0_26 to make MySQL Server use the old versions of the names for the objects specified in the previous list. This enables monitoring tools that rely on the old names to continue working until they can be updated to use the new names.

Set the terminology_use_previous system variable with session scope to support individual functions, or global scope to be a default for all new sessions. When global scope is used, the slow query log contains the old versions of the names.
- Making temporary file (append) before replaying LOAD DATA INFILE

The thread is executing a LOAD DATA statement and is appending the data to a temporary file containing the data from which the replica reads rows.
- Making temporary file (create) before replaying LOAD DATA INFILE

The thread is executing a LOAD DATA statement and is creating a temporary file containing the data from which the replica reads rows. This state can only be encountered if the original LOAD DATA statement was logged by a source running a version of MySQL lower than MySQL 5.0.3.
- Reading event from the relay log

The thread has read an event from the relay log so that the event can be processed.
- Slave has read all relay log; waiting for more updates

Replica has read all relay log; waiting for more updates
The thread has processed all events in the relay log files, and is now waiting for the I/O (receiver) thread to write new events to the relay log.
- Waiting for an event from Coordinator

Using the multithreaded replica (replica_parallel_workers is greater than 1), one of the replica worker threads is waiting for an event from the coordinator thread.
- Waiting for slave mutex on exit

Waiting for replica mutex on exit
A very brief state that occurs as the thread is stopping.
- Waiting for Slave Workers to free pending events

Waiting for Replica Workers to free pending events
This waiting action occurs when the total size of events being processed by Workers exceeds the size of the replica_pending_jobs_size_max system variable. The Coordinator resumes scheduling when the size drops below this limit. This state occurs only when replica_parallel_workers is set greater than 0 .
- Waiting for the next event in relay log

The initial state before Reading event from the relay log.
- Waiting until SOURCE_DELAY seconds after source executed event

The SQL thread has read an event but is waiting for the replica delay to lapse. This delay is set with the SOURCE_DELAY option of the CHANGE REPLICATION SOURCE TO.

The Info column for the SQL thread may also show the text of a statement. This indicates that the thread has read an event from the relay log, extracted the statement from it, and may be executing it.

\subsection*{10.14.7 Replication Connection Thread States}

These thread states occur on a replica server but are associated with connection threads, not with the I/O or SQL threads.
- Changing master

Changing replication source
The thread is processing a CHANGE REPLICATION SOURCE TO statement.
- Killing slave

The thread is processing a STOP REPLICA statement.
- Opening master dump table

This state occurs after Creating table from master dump.
- Reading master dump table data

This state occurs after Opening master dump table.
- Rebuilding the index on master dump table

This state occurs after Reading master dump table data.

\subsection*{10.14.8 NDB Cluster Thread States}
- Committing events to binlog
- Opening mysql.ndb_apply_status
- Processing events

The thread is processing events for binary logging.
- Processing events from schema table

The thread is doing the work of schema replication.
- Shutting down
- Syncing ndb table schema operation and binlog

This is used to have a correct binary log of schema operations for NDB.
- Waiting for allowed to take ndbcluster global schema lock

The thread is waiting for permission to take a global schema lock.
- Waiting for event from ndbcluster

The server is acting as an SQL node in an NDB Cluster, and is connected to a cluster management node.
- Waiting for first event from ndbcluster
- Waiting for ndbcluster binlog update to reach current position
- Waiting for ndbcluster global schema lock

The thread is waiting for a global schema lock held by another thread to be released.
- Waiting for ndbcluster to start
- Waiting for schema epoch

The thread is waiting for a schema epoch (that is, a global checkpoint).

\subsection*{10.14.9 Event Scheduler Thread States}

These states occur for the Event Scheduler thread, threads that are created to execute scheduled events, or threads that terminate the scheduler.
- Clearing

The scheduler thread or a thread that was executing an event is terminating and is about to end.
- Initialized

The scheduler thread or a thread that executes an event has been initialized.
- Waiting for next activation

The scheduler has a nonempty event queue but the next activation is in the future.
- Waiting for scheduler to stop

The thread issued SET GLOBAL event_scheduler=0FF and is waiting for the scheduler to stop.
- Waiting on empty queue

The scheduler's event queue is empty and it is sleeping.

\subsection*{10.15 Tracing the Optimizer}

The MySQL optimizer includes the capability to perform tracing; the interface is provided by a set of optimizer_trace_xxx system variables and the INFORMATION_SCHEMA. OPTIMIZER_TRACE table.

\subsection*{10.15.1 Typical Usage}

To perform optimizer tracing entails the following steps:
1. Enable tracing by executing SET optimizer_trace="enabled=ON".
2. Execute the statement to be traced. See Section 10.15.3, "Traceable Statements", for a listing of statements which can be traced.
3. Examine the contents of the INFORMATION_SCHEMA.OPTIMIZER_TRACE table.
4. To examine traces for multiple queries, repeat the previous two steps as needed.
5. To disable tracing after you have finished, execute SET optimizer_trace="enabled=0FF".

You can trace only statements which are executed within the current session; you cannot see traces from other sessions.

\subsection*{10.15.2 System Variables Controlling Tracing}

The following system variables affect optimizer tracing:
- optimizer_trace: Enables or disables optimizer tracing. See Section 10.15.8, "The optimizer_trace System Variable".
- optimizer_trace_features: Enables or disables selected features of the MySQL Optimizer, using the syntax shown here:
```
SET optimizer_trace_features=option=value[,option=value][,...]
option:
    {greedy_search | range_optimizer | dynamic_range | repeated_subselect}
value:
    {on | off | default}
```


See Section 10.15.10, "Selecting Optimizer Features to Trace", for more information on the effects of these.
- optimizer_trace_max_mem_size: Maximum amount of memory that can be used for storing all traces.
- optimizer_trace_limit: The maximum number of optimizer traces to be shown. See Section 10.15.4, "Tuning Trace Purging", for more information.
- optimizer_trace_offset: Offset of the first trace shown. See Section 10.15.4, "Tuning Trace Purging".
- end_markers_in_json: If set to 1 , causes the trace to repeat the key (if present) near the closing bracket. This also affects the output of EXPLAIN FORMAT=JSON in those versions of MySQL which support this statement. See Section 10.15.9, "The end_markers_in_ison System Variable".

\subsection*{10.15.3 Traceable Statements}

Statements which are traceable are listed here:
- SELECT
- INSERT
- REPLACE
- UPDATE
- DELETE
- EXPLAIN with any of the preceding statements
- SET
- DO
- DECLARE, CASE, IF, and RETURN as used in stored routines
- CALL

Tracing is supported for both INSERT and REPLACE statements using VALUES, VALUES ROW, or SELECT.

Traces of multi-table UPDATE and DELETE statements are supported.
Tracing of SET optimizer_trace is not supported.
For statements which are prepared and executed in separate steps, preparation and execution are traced separately.

\subsection*{10.15.4 Tuning Trace Purging}

By default, each new trace overwrites the previous trace. Thus, if a statement contains substatements (such as invoking stored procedures, stored functions, or triggers), the topmost statement and substatements each generate one trace, but at the end of execution, the trace for only the last substatement is visible.

A user who wants to see the trace of a different substatement can enable or disable tracing for the desired substatement, but this requires editing the routine code, which may not always be possible. Another solution is to tune trace purging. This is done by setting the optimizer_trace_offset and optimizer_trace_limit system variables, like this:
```
SET optimizer_trace_offset=offset, optimizer_trace_limit=limit;
```

offset is a signed integer (default - 1); limit is a positive integer (default 1). Such a SET statement has the following effects:
- All traces previously stored are cleared from memory.
- A subsequent SELECT from the OPTIMIZER_TRACE table returns the first limit traces of the offset oldest stored traces (if offset >=0), or the first limit traces of the -offset newest stored traces (if offset < 0).

Examples:
- SET optimizer_trace_offset=-1, optimizer_trace_limit=1: The most recent trace is shown (the default).
- SET optimizer_trace_offset=-2, optimizer_trace_limit=1: The next-to-last trace is shown.
- SET optimizer_trace_offset=-5, optimizer_trace_limit=5: The last five traces are shown.

Negative values for offset can thus prove useful when the substatements of interest are the last few in a stored routine. For example:
```
SET optimizer_trace_offset=-5, optimizer_trace_limit=5;
CALL stored_routine(); # more than 5 substatements in this routine
SELECT * FROM information_schema.OPTIMIZER_TRACE; # see only the last 5 traces
```


A positive offset can be useful when one knows that the interesting substatements are the first few in a stored routine.

The more accurately these two variables are set, the less memory is used. For example, SET optimizer_trace_offset=0, optimizer_trace_limit=5 requires sufficient memory to store five traces, so if only the three first are needed, is is better to use SET optimizer_trace_offset=0, optimizer_trace_limit=3, since tracing stops after limit traces. A stored routine may have a loop which executes many substatements and thus generates many traces, which can use a lot of memory; in such cases, choosing appropriate values for offset and limit can restrict tracing to, for example, a single iteration of the loop. This also decreases the impact of tracing on execution speed.

If offset is greater than or equal to 0 , only limit traces are kept in memory. If offset is less than 0 , that is not true: instead, -offset traces are kept in memory. Even if limit is smaller than offset, excluding the last statement, the last statement must still be traced because it will be within the limit after executing one more statement. Since an offset less than 0 is counted from the end, the "window" moves as more statements execute.

Using optimizer_trace_offset and optimizer_trace_limit, which are restrictions at the trace producer level, provide better (greater) speed and (less) memory usage than setting offsets or
limits at the trace consumer (SQL) level with SELECT * FROM OPTIMIZER_TRACE LIMIT limit OFFSET offset, which saves almost nothing.

\subsection*{10.15.5 Tracing Memory Usage}

Each stored trace is a string, which is extended (using realloc( )) as optimization progresses by appending more data to it. The optimizer_trace_max_mem_size server system variable sets a limit on the total amount of memory used by all traces currently being stored. If this limit is reached, the current trace is not extended, which means the trace is incomplete; in this case the MISSING_BYTES_BEYOND_MAX_MEM_SIZE column shows the number of bytes missing from the trace.

\subsection*{10.15.6 Privilege Checking}

In complex scenarios where the query uses SQL SECURITY DEFINER views or stored routines, it may be that a user is denied from seeing the trace of its query because it lacks some extra privileges on those objects. In that case, the trace will be shown as empty and the INSUFFICIENT_PRIVILEGES column will show " 1 ".

\subsection*{10.15.7 Interaction with the --debug Option}

Anything written to the trace is automatically written to the debug file.

\subsection*{10.15.8 The optimizer_trace System Variable}

The optimizer_trace system variable has these on/off switches:
- enabled: Enables (ON) or disables (OFF) tracing
- one_line: If set to 0 N , the trace contains no whitespace, thus conserving space. This renders the trace difficult to read for humans, still usable by JSON parsers, since they ignore whitespace.

\subsection*{10.15.9 The end_markers_in_json System Variable}

When reading a very large JSON document, it can be difficult to pair its closing bracket and opening brackets; setting end_markers_in_json=0N repeats the structure's key, if it has one, near the closing bracket. This variable affects both optimizer traces and the output of EXPLAIN FORMAT=JSON.

> Note
> If end_markers_in_json is enabled, the repetition of the key means the result is not a valid JSON document, and causes JSON parsers to throw an error.

\subsection*{10.15.10 Selecting Optimizer Features to Trace}

Some features in the optimizer can be invoked many times during statement optimization and execution, and thus can make the trace grow beyond reason. They are:
- Greedy search: With an $N$-table join, this could explore factorial $(N)$ plans.
- Range optimizer
- Dynamic range optimization: Shown as range checked for each record in EXPLAIN output; each outer row causes a re-run of the range optimizer.
- Subqueries: A subquery in which the WHERE clause may be executed once per row.

Those features can be excluded from tracing by setting one or more switches of the optimizer_trace_features system variable to OFF. These switches are listed here:
- greedy_search: Greedy search is not traced.
- range_optimizer: The range optimizer is not traced.
- dynamic_range: Only the first call to the range optimizer on this JOIN_TAB: :SQL_SELECT is traced.
- repeated_subselect: Only the first execution of this Item_subselect is traced.

\subsection*{10.15.11 Trace General Structure}

A trace follows the actual execution path very closely; for each join, there is a join preparation object, a join optimization object, and a join execution object. Query transformations (IN to EXISTS, outer join to inner join, and so on), simplifications (elimination of clauses), and equality propagation are shown in subobjects. Calls to the range optimizer, cost evaluations, reasons why an access path is chosen over another one, or why a sorting method is chosen over another one, are shown as well.

\subsection*{10.15.12 Example}

Here we take an example from the test suite.
```
#
# Tracing of ORDER BY & GROUP BY simplification.
#
SET optimizer_trace="enabled=on",end_markers_in_json=on; # make readable
SET optimizer_trace_max_mem_size=1000000; # avoid small default
CREATE TABLE t1 (
    pk INT, col_int_key INT,
    col_varchar_key VARCHAR(1),
    col_varchar_nokey VARCHAR(1)
);
INSERT INTO t1 VALUES
    (10,7,'v','v'),(11,0,'s','s'),(12,9,'l','l'),(13,3,'y','y'),(14,4,'c','c'),
    (15,2,'i','i'),(16,5,'h','h'),(17,3,'q','q'),(18,1,'a','a'),(19,3,'v','v'),
    (20,6,'u','u'),(21,7,'s','s'),(22,5,'y','y'),(23,1,'z','z'),(24,204,'h','h'),
    (25,224,'p','p'),(26,9,'e','e'),(27,5,'i','i'),(28,0,'y','y'),(29,3,'w','w');
CREATE TABLE t2 (
    pk INT, col_int_key INT,
    col_varchar_key VARCHAR(1),
    col_varchar_nokey VARCHAR(1),
    PRIMARY KEY (pk)
);
INSERT INTO t2 VALUES
    (1,4,'b','b'),(2,8,'y','y'),(3,0,'p','p'),(4,0,'f','f'),(5,0,'p','p'),
    (6,7,'d','d'),(7,7,'f','f'),(8,5,'j','j'),(9,3,'e','e'),(10,188,'u','u'),
    (11,4,'v','v'),(12,9,'u','u'),(13,6,'i','i'),(14,1,'x','x'),(15,5,'l','l'),
    (16,6,'q','q'),(17,2,'n','n'),(18,4,'r','r'),(19,231,'c','c'),(20,4,'h','h'),
    (21,3,'k','k'),(22,3,'t','t'),(23,7,'t','t'),(24,6,'k','k'),(25,7,'g','g'),
    (26,9,'z','z'),(27,4,'n','n'),(28,4,'j','j'),(29,2,'l','l'),(30,1,'d','d'),
    (31,2,'t','t'),(32,194,'y','y'),(33,2,'i','i'),(34,3,'j','j'),(35,8,'r','r'),
    (36,4,'b','b'),(37,9,'o','o'),(38,4,'k','k'),(39,5,'a','a'),(40,5,'f','f'),
    (41,9,'t','t'),(42,3,'c','c'),(43,8,'c','c'),(44,0,'r','r'),(45,98,'k','k'),
    (46,3,'l','l'),(47,1,'o','o'),(48,0,'t','t'),(49,189,'v','v'),(50,8,'x','x'),
    (51,3,'j','j'),(52,3,'x','x'),(53,9,'k','k'),(54,6,'o','o'),(55,8,'z','z'),
    (56,3,'n','n'),(57,9,'c','c'),(58,5,'d','d'),(59,9,'s','s'),(60,2,'j','j'),
    (61,2,'w','w'),(62,5,'f','f'),(63,8,'p','p'),(64,6,'o','o'),(65,9,'f','f'),
    (66,0,'x','x'),(67,3,'q','q'),(68,6,'g','g'),(69,5,'x','x'),(70,8,'p','p'),
    (71,2,'q','q'),(72,120,'q','q'),(73,25,'v','v'),(74,1,'g','g'),(75,3,'l','l'),
    (76,1,'w','w'),(77,3,'h','h'),(78,153,'c','c'),(79,5,'o','o'),(80,9,'o','o'),
    (81,1,'v','v'),(82,8,'y','y'),(83,7,'d','d'),(84,6,'p','p'),(85,2,'z','z'),
    (86,4,'t','t'),(87,7,'b','b'),(88,3,'y','y'),(89,8,'k','k'),(90,4,'c','c'),
    (91,6,'z','z'),(92,1,'t','t'),(93,7,'o','o'),(94,1,'u','u'),(95,0,'t','t'),
    (96,2,'k','k'),(97,7,'u','u'),(98,2,'b','b'),(99,1,'m','m'),(100,5,'o','o');
SELECT SUM(alias2.col_varchar_nokey) AS c1, alias2.pk AS c2
    FROM t1 AS alias1
    STRAIGHT_JOIN t2 AS alias2
```

```
    ON alias2.pk = alias1.col_int_key
    WHERE alias1.pk
    GROUP BY c2
    ORDER BY alias1.col_int_key, alias2.pk;
+------+----+
| c1 | c2 |
+------+----+
|}00 1 1 | 2 
| 0 | 3 |
| 0 | 4
| 0 | 5 |
| 0 | 6 |
| 0 | 7 |
| 0 | 9 |
+------+----+
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1878.jpg?height=130&width=105&top_left_y=843&top_left_x=303)

\section*{Note}

For reference, the complete trace is shown uninterrupted at the end of this section.

Now we can examine the trace, whose first column (QUERY), containing the original statement to be traced, is shown here:
```
SELECT * FROM INFORMATION_SCHEMA.OPTIMIZER_TRACE\G
************************** 1. row *****************************
QUERY: SELECT SUM(alias2.col_varchar_nokey) AS c1, alias2.pk AS c2
    FROM t1 AS alias1
    STRAIGHT_JOIN t2 AS alias2
    ON alias2.pk = alias1.col_int_key
    WHERE alias1.pk
    GROUP BY c2
    ORDER BY alias1.col_int_key, alias2.pk
```


This can be useful mark when several traces are stored.
The TRACE column begins by showing that execution of the statement is made up of discrete steps, like this:
```
"steps": [
    {
```


This is followed by the preparation of the join for the first (and only) SELECT in the statement being traced, as shown here:
```
"steps": [
    {
        "expanded_query": "/* select#1 */ select \
                sum(ˋtestˋ.ˋalias2ˋ.ˋcol_varchar_nokeyˋ) AS \
                ˋSUM(alias2.col_varchar_nokey)ˋ,ˋtestˋ.ˋalias2ˋ.ˋpkˋ AS ˋfield2ˋ \
                from (ˋtestˋ.ˋt1ˋ ˋalias1ˋ straight_join ˋtestˋ.ˋt2ˋ ˋalias2ˋ \
                on((ˋtestˋ.ˋalias2ˋ.ˋpkˋ = ˋtestˋ.ˋalias1ˋ.ˋcol_int_keyˋ))) \
                where ˋtestˋ.ˋalias1ˋ.ˋpkˋ \
                group by ˋtestˋ.ˋalias2ˋ.ˋpkˋ \
                order by ˋtestˋ.ˋalias1ˋ.ˋcol_int_keyˋ,ˋtestˋ.ˋalias2ˋ.ˋpkˋ"
        }
] /* steps */
            } /* join_preparation */
        },
```


The output just shown displays the query as it is used for preparing the join; all columns (fields) have been resolved to their databases and tables, and each SELECT is annotated with a sequence number, which can be useful when studying subqueries.

The next portion of the trace shows how the join is optimized, starting with condition processing:
```
{
    "join_optimization": {
```

```
        "select#": 1,
        "steps": [
            {
                "condition_processing": {
                    "condition": "WHERE",
                    "original_condition": "(ˋtestˋ.ˋalias1ˋ.ˋpkˋ and \
                    (ˋtestˋ.ˋalias2ˋ.ˋpkˋ = ˋtestˋ.ˋalias1ˋ.ˋcol_int_keyˋ))",
                    "steps": [
                        {
                            "transformation": "equality_propagation",
                            "resulting_condition": "(ˋtestˋ.ˋalias1ˋ.ˋpkˋ and \
                            multiple equal(ˋtestˋ.ˋalias2ˋ.ˋpkˋ, \
                            ˋtestˋ.ˋalias1ˋ.ˋcol_int_keyˋ))"
                        },
                        {
                            "transformation": "constant_propagation",
                            "resulting_condition": "(ˋtestˋ.ˋalias1ˋ.ˋpkˋ and \
                            multiple equal(ˋtestˋ.ˋalias2ˋ.ˋpkˋ, \
                            ˋtestˋ.ˋalias1ˋ.ˋcol_int_keyˋ))"
                        },
                        {
                            "transformation": "trivial_condition_removal",
                            "resulting_condition": "(ˋtestˋ.ˋalias1ˋ.ˋpkˋ and \
                            multiple equal(ˋtestˋ.ˋalias2ˋ.ˋpkˋ, \
                            ˋtestˋ.ˋalias1ˋ.ˋcol_int_keyˋ))"
            }
        ] /* steps */
    } /* condition_processing */
},
```


Next, the optimizer checks for possible ref accesses, and identifies one:
```
    {
        "ref_optimizer_key_uses": [
            {
                "database": "test",
                "table": "alias2",
                "field": "pk",
                "equals": "ˋtestˋ.ˋalias1ˋ.ˋcol_int_keyˋ",
                "null_rejecting": true
            }
    ] /* ref_optimizer_key_uses */
},
```


A ref access which rejects NULL has been identified: no NULL in test.alias1.col_int_key can have a match. (Observe that it could have a match, were the operator a null-safe equals <=>).

Next, for every table in the query, we estimate the cost of, and number of records returned by, a table scan or a range access.

We need to find an optimal order for the tables. Normally, greedy search is used, but since the statement uses a straight join, only the requested order is explored, and one or more access methods are selected. As shown in this portion of the trace, we can choose a table scan:
```
    "records_estimation": [
        {
            "database": "test",
            "table": "alias1",
            "const_keys_added": {
                "keys": [
                ] /* keys */,
                "cause": "group_by"
            } /* const_keys_added */,
            "range_analysis": {
                "table_scan": {
                    "records": 20,
                    "cost": 8.1977
                } /* table_scan */
            } /* range_analysis */
        },
```

```
        {
        "database": "test",
            "table": "alias2",
            "const_keys_added": {
                "keys": [
                    "PRIMARY"
                ] /* keys */,
                "cause": "group_by"
            } /* const_keys_added */,
            "range_analysis": {
            "table_scan": {
                "records": 100,
                "cost": 24.588
            } /* table_scan */,
            "potential_range_indices": [
                {
                    "index": "PRIMARY",
                        "usable": true,
                    "key_parts": [
                        "pk"
                    ] /* key_parts */
                    }
                ] /* potential_range_indices */,
                "setup_range_conditions": [
                ] /* setup_range_conditions */,
                "group_index_range": {
                    "chosen": false,
                    "cause": "not_single_table"
                        } /* group_index_range */
            } /* range_analysis */
        }
    ] /* records_estimation */
},
```


As just shown in the second portion of the range analysis, it is not possible to use GROUP_MIN_MAX because it accepts only one table, and we have two in the join. This means that no range access is possible.

The optimizer estimates that reading the first table, and applying any required conditions to it, yields 20 rows:
```
    {
"considered_execution_plans": [
    {
        "database": "test",
        "table": "alias1",
        "best_access_path": {
            "considered_access_paths": [
                {
                    "access_type": "scan",
                    "records": 20,
                    "cost": 2.0977,
                    "chosen": true
                }
            ] /* considered_access_paths */
        } /* best_access_path */,
        "cost_for_plan": 6.0977,
        "records_for_plan": 20,
```


For alias2, we choose ref access on the primary key rather than a table scan, because the number of records returned by the latter (75)is far greater than that returned by ref access (1), as shown here:
```
"rest_of_plan": [
    {
        "database": "test",
        "table": "alias2",
        "best_access_path": {
            "considered_access_paths": [
                {
                    "access_type": "ref",
                    "index": "PRIMARY",
```

```
                                "records": 1,
                                "cost": 20.2,
                                "chosen": true
                            },
                            {
                                "access_type": "scan",
                                "using_join_cache": true,
                                "records": 75,
                                "cost": 7.4917,
                                "chosen": false
                            }
                        ] /* considered_access_paths */
                    } /* best_access_path */,
                    "cost_for_plan": 30.098,
                    "records_for_plan": 20,
                    "chosen": true
                }
            ] /* rest_of_plan */
        }
    ] /* considered_execution_plans */
},
```


Now that the order of tables is fixed, we can split the WHERE condition into chunks which can be tested early (pushdown of conditions down the join tree):
```
{
    "attaching_conditions_to_tables": {
        "original_condition": "((ˋtestˋ.ˋalias2ˋ.ˋpkˋ = \
            ˋtestˋ.ˋalias1ˋ.ˋcol_int_keyˋ) and ˋtestˋ.ˋalias1ˋ.ˋpkˋ)",
        "attached_conditions_computation": [
        ] /* attached_conditions_computation */,
        "attached_conditions_summary": [
            {
                "database": "test",
                "table": "alias1",
                "attached": "(ˋtestˋ.ˋalias1ˋ.ˋpkˋ and \
                (ˋtestˋ.ˋalias1ˋ.ˋcol_int_keyˋ is not null))"
},
```


This condition can be tested on rows of alias1 without reading rows from alias2.
```
            {
                "database": "test",
                "table": "alias2",
                "attached": null
            }
        ] /* attached_conditions_summary */
    } /* attaching_conditions_to_tables */
},
{
```


Now we try to simplify the ORDER BY:
```
"clause_processing": {
    "clause": "ORDER BY",
    "original_clause": "ˋtestˋ.ˋalias1ˋ.ˋcol_int_keyˋ,ˋtestˋ.ˋalias2ˋ.ˋpkˋ",
    "items": [
        {
            "item": "ˋtestˋ.ˋalias1ˋ.ˋcol_int_keyˋ"
        },
        {
            "item": "ˋtestˋ.ˋalias2ˋ.ˋpkˋ",
            "eq_ref_to_preceding_items": true
        }
    ] /* items */,
```


Because the WHERE clause contains alias2.pk=alias1.col_int_key, ordering by both columns is unnecessary; we can order by the first column alone, since the second column is always equal to it.
```
    "resulting_clause_is_simple": true,
    "resulting_clause": "ˋtestˋ.ˋalias1ˋ.ˋcol_int_keyˋ"
} /* clause_processing */
```

```
,
```


The shorter ORDER BY clause (which is not visible in in the output of EXPLAIN) can be implemented as an index scan, since it uses only a single column of one table.
```
            {
                "clause_processing": {
                    "clause": "GROUP BY",
                    "original_clause": "ˋtestˋ.ˋalias2ˋ.ˋpkˋ",
                    "items": [
                        {
                            "item": "ˋtestˋ.ˋalias2ˋ.ˋpkˋ"
                        }
                    ] /* items */,
                    "resulting_clause_is_simple": false,
                    "resulting_clause": "ˋtestˋ.ˋalias2ˋ.ˋpkˋ"
                } /* clause_processing */
            },
            {
                "refine_plan": [
                    {
                        "database": "test",
                        "table": "alias1",
                        "scan_type": "table"
                    },
                    {
                        "database": "test",
                        "table": "alias2"
                    }
                ] /* refine_plan */
            }
        ] /* steps */
    } /* join_optimization */
},
{
```


Now the join is executed:
```
        "join_execution": {
                "select#": 1,
                "steps": [
                ] /* steps */
            } /* join_execution */
        }
    ] /* steps */
} 0 0
```


All traces have the same basic structure. If a statement uses subqueries, there can be mutliple preparations, optimizations, and executions, as well as subquery-specific transformations.

The complete trace is shown here:
```
mysql> SELECT * FROM INFORMATION_SCHEMA.OPTIMIZER_TRACE\G
*************************** 1. rOW ****************************
                        QUERY: SELECT SUM(alias2.col_varchar_nokey) AS c1, alias2.pk AS c2
    FROM t1 AS alias1
    STRAIGHT_JOIN t2 AS alias2
    ON alias2.pk = alias1.col_int_key
    WHERE alias1.pk
    GROUP BY c2
    ORDER BY alias1.col_int_key, alias2.pk
                        TRACE: {
    "steps": [
        {
            "join_preparation": {
                "select#": 1,
                "steps": [
                    {
                        "expanded_query": "/* select#1 */ select sum(ˋalias2ˋ.ˋcol_varchar_nokeyˋ) AS ˋc1ˋ,ˋalias2ˋ.ˋp।
                    },
                    {
                        "transformations_to_nested_joins": {
```

```
                    "transformations": [
                        "JOIN_condition_to_WHERE",
                        "parenthesis_removal"
                    ] /* transformations */,
                    "expanded_query": "/* select#1 */ select sum(ˋalias2ˋ.ˋcol_varchar_nokeyˋ) AS ˋc1ˋ,ˋalias
                } /* transformations_to_nested_joins */
            },
            {
                "functional_dependencies_of_GROUP_columns": {
                    "all_columns_of_table_map_bits": [
                        1
                    ] /* all_columns_of_table_map_bits */,
                    "columns": [
                        "test.alias2.pk",
                        "test.alias1.col_int_key"
                    ] /* columns */
                } /* functional_dependencies_of_GROUP_columns */
            }
        ] /* steps */
    } /* join_preparation */
},
{
    "join_optimization": {
        "select#": 1,
        "steps": [
            {
                "condition_processing": {
                    "condition": "WHERE",
                    "original_condition": "((0 <> ˋalias1ˋ.ˋpkˋ) and (ˋalias2ˋ.ˋpkˋ = ˋalias1ˋ.ˋcol_int_keyˋ)
                    "steps": [
                        {
                            "transformation": "equality_propagation",
                            "resulting_condition": "((0 <> ˋalias1ˋ.ˋpkˋ) and multiple equal(ˋalias2ˋ.ˋpkˋ, ˋalia
                        },
                        {
                            "transformation": "constant_propagation",
                            "resulting_condition": "((0 <> ˋalias1ˋ.ˋpkˋ) and multiple equal(ˋalias2ˋ.ˋpkˋ, ˋalia
                        },
                        {
                            "transformation": "trivial_condition_removal",
                            "resulting_condition": "((0 <> ˋalias1ˋ.ˋpkˋ) and multiple equal(ˋalias2ˋ.ˋpkˋ, ˋalia
                        }
                    ] /* steps */
                } /* condition_processing */
            },
            {
                "substitute_generated_columns": {
                } /* substitute_generated_columns */
            },
            {
                "table_dependencies": [
                    {
                        "table": "ˋt1ˋ ˋalias1ˋ",
                        "row_may_be_null": false,
                        "map_bit": 0,
                        "depends_on_map_bits": [
                        ] /* depends_on_map_bits */
                    },
                    {
                        "table": "ˋt2ˋ ˋalias2ˋ",
                        "row_may_be_null": false,
                        "map_bit": 1,
                        "depends_on_map_bits": [
                            0
                        ] /* depends_on_map_bits */
                    }
                ] /* table_dependencies */
            },
            {
                "ref_optimizer_key_uses": [
                    {
                        "table": "ˋt2ˋ ˋalias2ˋ",
```

```
            "field": "pk",
            "equals": "ˋalias1ˋ.ˋcol_int_keyˋ",
            "null_rejecting": true
        }
    ] /* ref_optimizer_key_uses */
},
{
    "rows_estimation": [
        {
            "table": "ˋt1ˋ ˋalias1ˋ",
            "table_scan": {
                "rows": 20,
                "cost": 0.25
            } /* table_scan */
        },
        {
            "table": "ˋt2ˋ ˋalias2ˋ",
            "const_keys_added": {
                "keys": [
                    "PRIMARY"
                ] /* keys */,
                "cause": "group_by"
            } /* const_keys_added */,
            "range_analysis": {
                "table_scan": {
                    "rows": 100,
                    "cost": 12.35
                } /* table_scan */,
                "potential_range_indexes": [
                    {
                        "index": "PRIMARY",
                        "usable": true,
                        "key_parts": [
                            "pk"
                        ] /* key_parts */
                    }
                ] /* potential_range_indexes */,
                "setup_range_conditions": [
                ] /* setup_range_conditions */,
                "group_index_skip_scan": {
                    "chosen": false,
                    "cause": "not_single_table"
                } /* group_index_skip_scan */,
                "skip_scan_range": {
                    "chosen": false,
                    "cause": "not_single_table"
                } /* skip_scan_range */
            } /* range_analysis */
        }
    ] /* rows_estimation */
},
{
    "considered_execution_plans": [
        {
            "plan_prefix": [
            ] /* plan_prefix */,
            "table": "ˋt1ˋ ˋalias1ˋ",
            "best_access_path": {
                "considered_access_paths": [
                    {
                        "rows_to_scan": 20,
                        "filtering_effect": [
                        ] /* filtering_effect */,
                        "final_filtering_effect": 0.9,
                        "access_type": "scan",
                        "resulting_rows": 18,
                        "cost": 2.25,
                        "chosen": true
                    }
                ] /* considered_access_paths */
            } /* best_access_path */,
            "condition_filtering_pct": 100,
```

```
            "rows_for_plan": 18,
            "cost_for_plan": 2.25,
            "rest_of_plan": [
                {
                    "plan_prefix": [
                        "ˋt1ˋ ˋalias1ˋ"
                    ] /* plan_prefix */,
                    "table": "ˋt2ˋ ˋalias2ˋ",
                    "best_access_path": {
                        "considered_access_paths": [
                            {
                                "access_type": "eq_ref",
                                "index": "PRIMARY",
                                "rows": 1,
                                "cost": 6.3,
                                "chosen": true,
                                "cause": "clustered_pk_chosen_by_heuristics"
                            },
                            {
                                "rows_to_scan": 100,
                                "filtering_effect": [
                                ] /* filtering_effect */,
                                "final_filtering_effect": 1,
                                "access_type": "scan",
                                "using_join_cache": true,
                                "buffers_needed": 1,
                                "resulting_rows": 100,
                                "cost": 180.25,
                                "chosen": false
                            }
                        ] /* considered_access_paths */
                    } /* best_access_path */,
                    "condition_filtering_pct": 100,
                    "rows_for_plan": 18,
                    "cost_for_plan": 8.55,
                    "chosen": true
                }
            ] /* rest_of_plan */
        }
    ] /* considered_execution_plans */
},
{
    "attaching_conditions_to_tables": {
        "original_condition": "((ˋalias2ˋ.ˋpkˋ = ˋalias1ˋ.ˋcol_int_keyˋ) and (0 <> ˋalias1ˋ.ˋpkˋ)
        "attached_conditions_computation": [
        ] /* attached_conditions_computation */,
        "attached_conditions_summary": [
            {
                "table": "ˋt1ˋ ˋalias1ˋ",
                "attached": "((0 <> ˋalias1ˋ.ˋpkˋ) and (ˋalias1ˋ.ˋcol_int_keyˋ is not null))"
            },
            {
                "table": "ˋt2ˋ ˋalias2ˋ",
                "attached": "(ˋalias2ˋ.ˋpkˋ = ˋalias1ˋ.ˋcol_int_keyˋ)"
            }
        ] /* attached_conditions_summary */
    } /* attaching_conditions_to_tables */
},
{
    "optimizing_distinct_group_by_order_by": {
        "simplifying_order_by": {
            "original_clause": "ˋalias1ˋ.ˋcol_int_keyˋ,ˋalias2ˋ.ˋpkˋ",
            "items": [
                {
                    "item": "ˋalias1ˋ.ˋcol_int_keyˋ"
                },
                {
                    "item": "ˋalias2ˋ.ˋpkˋ",
                    "eq_ref_to_preceding_items": true
                }
            ] /* items */,
            "resulting_clause_is_simple": true,
```

```
                        "resulting_clause": "ˋalias1ˋ.ˋcol_int_keyˋ"
                    } /* simplifying_order_by */,
                    "simplifying_group_by": {
                        "original_clause": "ˋc2ˋ",
                        "items": [
                            {
                                "item": "ˋalias2ˋ.ˋpkˋ"
                            }
                        ] /* items */,
                        "resulting_clause_is_simple": false,
                        "resulting_clause": "ˋc2ˋ"
                    } /* simplifying_group_by */
                } /* optimizing_distinct_group_by_order_by */
            },
            {
                "finalizing_table_conditions": [
                    {
                        "table": "ˋt1ˋ ˋalias1ˋ",
                        "original_table_condition": "((0 <> ˋalias1ˋ.ˋpkˋ) and (ˋalias1ˋ.ˋcol_int_keyˋ is not null)
                        "final_table_condition ": "((0 <> ˋalias1ˋ.ˋpkˋ) and (ˋalias1ˋ.ˋcol_int_keyˋ is not null)
                    },
                    {
                        "table": "ˋt2ˋ ˋalias2ˋ",
                        "original_table_condition": "(ˋalias2ˋ.ˋpkˋ = ˋalias1ˋ.ˋcol_int_keyˋ)",
                        "final_table_condition ": null
                    }
                ] /* finalizing_table_conditions */
            },
            {
                "refine_plan": [
                    {
                        "table": "ˋt1ˋ ˋalias1ˋ"
                    },
                    {
                        "table": "ˋt2ˋ ˋalias2ˋ"
                    }
                ] /* refine_plan */
            },
            {
                "considering_tmp_tables": [
                    {
                        "adding_tmp_table_in_plan_at_position": 2,
                        "write_method": "continuously_update_group_row"
                    },
                    {
                        "adding_sort_to_table": ""
                    } /* filesort */
                ] /* considering_tmp_tables */
            }
        ] /* steps */
    } /* join_optimization */
},
{
    "join_execution": {
        "select#": 1,
        "steps": [
            {
                "temp_table_aggregate": {
                    "select#": 1,
                    "steps": [
                        {
                            "creating_tmp_table": {
                                "tmp_table_info": {
                                    "table": "<temporary>",
                                    "in_plan_at_position": 2,
                                    "columns": 3,
                                    "row_length": 18,
                                    "key_length": 4,
                                    "unique_constraint": false,
                                    "makes_grouped_rows": true,
                                    "cannot_insert_duplicates": false,
                                    "location": "TempTable"
```

```
                                        } /* tmp_table_info */
                                    } /* creating_tmp_table */
                                }
                            ] /* steps */
                        } /* temp_table_aggregate */
                    },
                    {
                        "sorting_table": "<temporary>",
                        "filesort_information": [
                            {
                                "direction": "asc",
                                "expression": "ˋalias1ˋ.ˋcol_int_keyˋ"
                            }
                        ] /* filesort_information */,
                        "filesort_priority_queue_optimization": {
                            "usable": false,
                            "cause": "not applicable (no LIMIT)"
                        } /* filesort_priority_queue_optimization */,
                        "filesort_execution": [
                        ] /* filesort_execution */,
                        "filesort_summary": {
                            "memory_available": 262144,
                            "key_size": 9,
                            "row_size": 26,
                            "max_rows_per_buffer": 7710,
                            "num_rows_estimate": 18446744073709551615,
                            "num_rows_found": 8,
                            "num_initial_chunks_spilled_to_disk": 0,
                            "peak_memory_used": 32832,
                            "sort_algorithm": "std::sort",
                            "unpacked_addon_fields": "skip_heuristic",
                            "sort_mode": "<fixed_sort_key, additional_fields>"
                        } /* filesort_summary */
                    }
                ] /* steps */
            } /* join_execution */
        }
    ] /* steps */
}
MISSING_BYTES_BEYOND_MAX_MEM_SIZE: 0
                INSUFFICIENT_PRIVILEGES: 0
```


\subsection*{10.15.13 Displaying Traces in Other Applications}

Examining a trace in the mysql command-line client can be made less difficult using the pager less command (or your operating platform's equivalent). An alternative can be to send the trace to a file, similarly to what is shown here:
```
SELECT TRACE INTO DUMPFILE file
FROM INFORMATION_SCHEMA.OPTIMIZER_TRACE;
```


You can then pass this file to a JSON-aware text editor or other viewer, such as the JsonView add-on for Firefox and Chrome, which shows objects in color and allows objects to be expanded or collapsed.

INTO DUMPFILE is preferable to INTO OUTFILE for this purpose, since the latter escapes newlines. As noted previously, you should ensure that end_markers_in_json is OFFwhen executing the SELECT INTO statement, so that the output is valid JSON.

\subsection*{10.15.14 Preventing the Use of Optimizer Trace}

If, for some reason, you wish to prevent users from seeing traces of their queries, start the server with the options shown here:
```
--maximum-optimizer-trace-max-mem-size=0 --optimizer-trace-max-mem-size=0
```


This sets the maximum size to 0 and prevents users from changing this limit, thus truncating all traces to 0 bytes.

\subsection*{10.15.15 Testing Optimizer Trace}

This feature is tested in mysql-test/suite/opt_trace and unittest/gunit/opt_trace-t.

\subsection*{10.15.16 Optimizer Trace Implementation}

See the files sql/opt_trace*, starting with sql/opt_trace.h. A trace is started by creating an instance of Opt_trace_start; information is added to this trace by creating instances of Opt_trace_object and Opt_trace_array, and by using the add ( ) methods of these classes.

