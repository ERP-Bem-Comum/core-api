\section*{-}
-> 30
- VALIDATE_PASSWORD_STRENGTH(str)

Given an argument representing a plaintext password, this function returns an integer to indicate how strong the password is, or NULL if the argument is NULL. The return value ranges from 0 (weak) to 100 (strong).

Password assessment by VALIDATE_PASSWORD_STRENGTH( ) is done by the validate_password component. If that component is not installed, the function always returns 0 . For information about installing validate_password, see Section 8.4.3, "The Password Validation Component". To examine or configure the parameters that affect password testing, check or set the system variables implemented by validate_password. See Section 8.4.3.2, "Password Validation Options and Variables".

The password is subjected to increasingly strict tests and the return value reflects which tests were satisfied, as shown in the following table. In addition, if the validate_password.check_user_name system variable is enabled and the password matches the user name, VALIDATE_PASSWORD_STRENGTH( ) returns 0 regardless of how other validate_password system variables are set.

\begin{tabular}{|l|l|}
\hline Password Test & Return Value \\
\hline Length < 4 & 0 \\
\hline Length $\geq 4$ and < validate_password.length & 25 \\
\hline Satisfies policy 1 (LOW) & 50 \\
\hline Satisfies policy 2 (MEDIUM) & 75 \\
\hline Satisfies policy 3 (STRONG) & 100 \\
\hline
\end{tabular}

\subsection*{14.14 Locking Functions}

This section describes functions used to manipulate user-level locks.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.19 Locking Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline GET_LOCK( ) & Get a named lock \\
\hline IS_FREE_LOCK( ) & Whether the named lock is free \\
\hline IS_USED_LOCK( ) & Whether the named lock is in use; return connection identifier if true \\
\hline RELEASE_ALL_LOCKS( ) & Release all current named locks \\
\hline RELEASE_LOCK( ) & Release the named lock \\
\hline
\end{tabular}
\end{table}
- GET_LOCK(str,timeout)

Tries to obtain a lock with a name given by the string str, using a timeout of timeout seconds. A negative timeout value means infinite timeout. The lock is exclusive. While held by one session, other sessions cannot obtain a lock of the same name.

Returns 1 if the lock was obtained successfully, 0 if the attempt timed out (for example, because another client has previously locked the name), or NULL if an error occurred (such as running out of memory or the thread was killed with mysqladmin kill).

A lock obtained with GET_LOCK( ) is released explicitly by executing RELEASE_LOCK( ) or implicitly when your session terminates (either normally or abnormally). Locks obtained with GET_LOCK( ) are not released when transactions commit or roll back.

GET_LOCK( ) is implemented using the metadata locking (MDL) subsystem. Multiple simultaneous locks can be acquired and GET_LOCK( ) does not release any existing locks. For example, suppose that you execute these statements:
```
SELECT GET_LOCK('lock1',10);
SELECT GET_LOCK('lock2',10);
SELECT RELEASE_LOCK('lock2');
SELECT RELEASE_LOCK('lock1');
```


The second GET_LOCK( ) acquires a second lock and both RELEASE_LOCK( ) calls return 1 (success).

It is even possible for a given session to acquire multiple locks for the same name. Other sessions cannot acquire a lock with that name until the acquiring session releases all its locks for the name.

Uniquely named locks acquired with GET_LOCK ( ) appear in the Performance Schema metadata_locks table. The OBJECT_TYPE column says USER LEVEL LOCK and the OBJECT_NAME column indicates the lock name. In the case that multiple locks are acquired for the same name, only the first lock for the name registers a row in the metadata_locks table. Subsequent locks for the name increment a counter in the lock but do not acquire additional metadata locks. The metadata_locks row for the lock is deleted when the last lock instance on the name is released.

The capability of acquiring multiple locks means there is the possibility of deadlock among clients. When this happens, the server chooses a caller and terminates its lock-acquisition request with an ER_USER_LOCK_DEADLOCK error. This error does not cause transactions to roll back.

MySQL enforces a maximum length on lock names of 64 characters.
GET_LOCK( ) can be used to implement application locks or to simulate record locks. Names are locked on a server-wide basis. If a name has been locked within one session, GET_LOCK( ) blocks any request by another session for a lock with the same name. This enables clients that agree on a given lock name to use the name to perform cooperative advisory locking. But be aware that it also enables a client that is not among the set of cooperating clients to lock a name, either inadvertently or deliberately, and thus prevent any of the cooperating clients from locking that name. One way to reduce the likelihood of this is to use lock names that are database-specific or application-specific. For example, use lock names of the form db_name.str or app_name.str.

If multiple clients are waiting for a lock, the order in which they acquire it is undefined. Applications should not assume that clients acquire the lock in the same order that they issued the lock requests.

GET_LOCK( ) is unsafe for statement-based replication. A warning is logged if you use this function when binlog_format is set to STATEMENT.

Since GET_LOCK( ) establishes a lock only on a single mysqld, it is not suitable for use with NDB Cluster, which has no way of enforcing an SQL lock across multiple MySQL servers. See Section 25.2.7.10, "Limitations Relating to Multiple NDB Cluster Nodes", for more information.

\section*{Caution}

With the capability of acquiring multiple named locks, it is possible for a single statement to acquire a large number of locks. For example:
```
INSERT INTO ... SELECT GET_LOCK(t1.col_name) FROM t1;
```


These types of statements may have certain adverse effects. For example, if the statement fails part way through and rolls back, locks acquired up to the point of failure still exist. If the intent is for there to be a correspondence between rows inserted and locks acquired, that intent is not satisfied. Also, if it is important that locks are granted in a certain order, be aware that
result set order may differ depending on which execution plan the optimizer chooses. For these reasons, it may be best to limit applications to a single lock-acquisition call per statement.

A different locking interface is available as either a plugin service or a set of loadable functions. This interface provides lock namespaces and distinct read and write locks, unlike the interface provided by GET_LOCK( ) and related functions. For details, see Section 7.6.9.1, "The Locking Service".
- IS_FREE_LOCK(str)

Checks whether the lock named $s t r$ is free to use (that is, not locked). Returns 1 if the lock is free (no one is using the lock), 0 if the lock is in use, and NULL if an error occurs (such as an incorrect argument).

This function is unsafe for statement-based replication. A warning is logged if you use this function when binlog_format is set to STATEMENT.
- IS_USED_LOCK(str)

Checks whether the lock named $s t r$ is in use (that is, locked). If so, it returns the connection identifier of the client session that holds the lock. Otherwise, it returns NULL.

This function is unsafe for statement-based replication. A warning is logged if you use this function when binlog_format is set to STATEMENT.
- RELEASE_ALL_LOCKS()

Releases all named locks held by the current session and returns the number of locks released ( 0 if there were none)

This function is unsafe for statement-based replication. A warning is logged if you use this function when binlog_format is set to STATEMENT.
- RELEASE_LOCK(str)

Releases the lock named by the string str that was obtained with GET_LOCK( ). Returns 1 if the lock was released, 0 if the lock was not established by this thread (in which case the lock is not released), and NULL if the named lock did not exist. The lock does not exist if it was never obtained by a call to GET_LOCK( ) or if it has previously been released.

The DO statement is convenient to use with RELEASE_LOCK( ). See Section 15.2.3, "DO Statement".
This function is unsafe for statement-based replication. A warning is logged if you use this function when binlog_format is set to STATEMENT.

\subsection*{14.15 Information Functions}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.20 Information Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline BENCHMARK( ) & Repeatedly execute an expression \\
\hline CHARSET() & Return the character set of the argument \\
\hline COERCIBILITY() & Return the collation coercibility value of the string argument \\
\hline COLLATION() & Return the collation of the string argument \\
\hline CONNECTION_ID() & Return the connection ID (thread ID) for the connection \\
\hline CURRENT_ROLE() & Return the current active roles \\
\hline CURRENT_USER( ), CURRENT_USER & The authenticated user name and host name \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline DATABASE() & Return the default (current) database name \\
\hline FOUND_ROWS( ) & For a SELECT with a LIMIT clause, the number of rows that would be returned were there no LIMIT clause \\
\hline ICU_VERSION( ) & ICU library version \\
\hline LAST_INSERT_ID( ) & Value of the AUTOINCREMENT column for the last INSERT \\
\hline ROLES_GRAPHML ( ) & Return a GraphML document representing memory role subgraphs \\
\hline ROW_COUNT( ) & The number of rows updated \\
\hline SCHEMA( ) & Synonym for DATABASE() \\
\hline SESSION_USER( ) & Synonym for USER() \\
\hline SYSTEM_USER( ) & Synonym for USER() \\
\hline USER( ) & The user name and host name provided by the client \\
\hline VERSION() & Return a string that indicates the MySQL server version \\
\hline
\end{tabular}
- BENCHMARK(count, expr)

The BENCHMARK( ) function executes the expression expr repeatedly count times. It may be used to time how quickly MySQL processes the expression. The result value is 0, or NULL for inappropriate arguments such as a NULL or negative repeat count.

The intended use is from within the mysql client, which reports query execution times:
```
mysql> SELECT BENCHMARK(1000000,AES_ENCRYPT('hello','goodbye'));
+-----------------------------------------------------+
| BENCHMARK(1000000,AES_ENCRYPT('hello','goodbye')) |
+------------------------------------------------------
| 0 |
+------------------------------------------------------
1 row in set (4.74 sec)
```


The time reported is elapsed time on the client end, not CPU time on the server end. It is advisable to execute BENCHMARK( ) several times, and to interpret the result with regard to how heavily loaded the server machine is.

BENCHMARK( ) is intended for measuring the runtime performance of scalar expressions, which has some significant implications for the way that you use it and interpret the results:
- Only scalar expressions can be used. Although the expression can be a subquery, it must return a single column and at most a single row. For example, BENCHMARK(10, (SELECT * FROM t)) fails if the table $t$ has more than one column or more than one row.
- Executing a SELECT expr statement $N$ times differs from executing SELECT BENCHMARK ( $N$, expr) in terms of the amount of overhead involved. The two have very different execution profiles and you should not expect them to take the same amount of time. The former involves the parser, optimizer, table locking, and runtime evaluation $N$ times each. The latter involves only runtime evaluation $N$ times, and all the other components just once. Memory structures already allocated are reused, and runtime optimizations such as local caching of results already evaluated for aggregate functions can alter the results. Use of BENCHMARK( ) thus measures performance of the runtime component by giving more weight to that component and removing the "noise" introduced by the network, parser, optimizer, and so forth.
- CHARSET(str)

Returns the character set of the string argument, or NULL if the argument is NULL.
```
mysql> SELECT CHARSET('abc');
    -> 'utf8mb3'
mysql> SELECT CHARSET(CONVERT('abc' USING latin1));
    -> 'latin1'
mysql> SELECT CHARSET(USER());
    -> 'utf8mb3'
```

- COERCIBILITY(str)

Returns the collation coercibility value of the string argument.
```
mysql> SELECT COERCIBILITY('abc' COLLATE utf8mb4_swedish_ci);
    -> 0
mysql> SELECT COERCIBILITY(USER());
    -> 3
mysql> SELECT COERCIBILITY('abc');
    -> 4
mysql> SELECT COERCIBILITY(1000);
    -> 5
```


The return values have the meanings shown in the following table. Lower values have higher precedence.

\begin{tabular}{|l|l|l|}
\hline Coercibility & Meaning & Example \\
\hline 0 & Explicit collation & Value with COLLATE clause \\
\hline 1 & No collation & Concatenation of strings with different collations \\
\hline 2 & Implicit collation & Column value, stored routine parameter or local variable \\
\hline 3 & System constant & USER( ) return value \\
\hline 4 & Coercible & Literal string \\
\hline 5 & Numeric & Numeric or temporal value \\
\hline 6 & Ignorable & NULL or an expression derived from NULL \\
\hline
\end{tabular}

For more information, see Section 12.8.4, "Collation Coercibility in Expressions".
- COLLATION(str)

Returns the collation of the string argument.
```
mysql> SELECT COLLATION('abc');
    -> 'utf8mb4_0900_ai_ci'
mysql> SELECT COLLATION(_utf8mb4'abc');
    -> 'utf8mb4_0900_ai_ci'
mysql> SELECT COLLATION(_latin1'abc');
    -> 'latin1_swedish_ci'
```

- CONNECTION_ID()

Returns the connection ID (thread ID) for the connection. Every connection has an ID that is unique among the set of currently connected clients.

The value returned by CONNECTION_ID( ) is the same type of value as displayed in the ID column of the Information Schema PROCESSLIST table, the Id column of SHOW PROCESSLIST output, and the PROCESSLIST_ID column of the Performance Schema threads table.
```
mysql> SELECT CONNECTION_ID();
```

-> 23786

\section*{Warning}

Changing the session value of the pseudo_thread_id system variable changes the value returned by the CONNECTION_ID( ) function.
- CURRENT_ROLE()

Returns a utf8mb3 string containing the current active roles for the current session, separated by commas, or NONE if there are none. The value reflects the setting of the sql_quote_show_create system variable.

Suppose that an account is granted roles as follows:
```
GRANT 'r1', 'r2' TO 'u1'@'localhost';
SET DEFAULT ROLE ALL TO 'u1'@'localhost';
```


In sessions for u1, the initial CURRENT_ROLE( ) value names the default account roles. Using SET ROLE changes that:
```
mysql> SELECT CURRENT_ROLE();
+--------------------+
| CURRENT_ROLE() |
+--------------------+
| ˋr1ˋ@ˋ%ˋ,ˋr2ˋ@ˋ%ˋ |
+-------------------+
mysql> SET ROLE 'r1'; SELECT CURRENT_ROLE();
+-----------------+
| CURRENT_ROLE() |
+-----------------+
| ˋr1ˋ@ˋ%ˋ |
+-----------------+
```


CURRENT_USER, CURRENT_USER( )
Returns the user name and host name combination for the MySQL account that the server used to authenticate the current client. This account determines your access privileges. The return value is a string in the utf8mb3 character set.

The value of CURRENT_USER( ) can differ from the value of USER( ).
```
mysql> SELECT USER();
    -> 'davida@localhost'
mysql> SELECT * FROM mysql.user;
ERROR 1044: Access denied for user ''@'localhost' to
database 'mysql'
mysql> SELECT CURRENT_USER();
    -> '@localhost'
```


The example illustrates that although the client specified a user name of davida (as indicated by the value of the USER( ) function), the server authenticated the client using an anonymous user account
(as seen by the empty user name part of the CURRENT_USER( ) value). One way this might occur is that there is no account listed in the grant tables for davida.

Within a stored program or view, CURRENT_USER( ) returns the account for the user who defined the object (as given by its DEFINER value) unless defined with the SQL SECURITY INVOKER characteristic. In the latter case, CURRENT_USER( ) returns the object's invoker.

Triggers and events have no option to define the SQL SECURITY characteristic, so for these objects, CURRENT_USER( ) returns the account for the user who defined the object. To return the invoker, use USER() or SESSION_USER( ).

The following statements support use of the CURRENT_USER( ) function to take the place of the name of (and, possibly, a host for) an affected user or a definer; in such cases, CURRENT_USER( ) is expanded where and as needed:
- DROP USER
- RENAME USER
- GRANT
- REVOKE
- CREATE FUNCTION
- CREATE PROCEDURE
- CREATE TRIGGER
- CREATE EVENT
- CREATE VIEW
- ALTER EVENT
- ALTER VIEW
- SET PASSWORD

For information about the implications that this expansion of CURRENT_USER( ) has for replication, see Section 19.5.1.8, "Replication of CURRENT_USER()".

This function can be used for the default value of a VARCHAR or TEXT column, as shown in the following CREATE TABLE statement:

CREATE TABLE t (c VARCHAR(288) DEFAULT (CURRENT_USER()));
- DATABASE()

Returns the default (current) database name as a string in the utf 8 mb 3 character set. If there is no default database, DATABASE() returns NULL. Within a stored routine, the default database is the database that the routine is associated with, which is not necessarily the same as the database that is the default in the calling context.
```
mysql> SELECT DATABASE();
    -> 'test'
```


If there is no default database, DATABASE() returns NULL.
- FOUND_ROWS()

Note
The SQL_CALC_FOUND_ROWS query modifier and accompanying FOUND_ROWS( ) function are deprecated; expect them to be removed in a future version of MySQL. Execute the query with LIMIT, and then a second query with COUNT ( * ) and without LIMIT to determine whether there are additional rows. For example, instead of these queries:
```
SELECT SQL_CALC_FOUND_ROWS * FROM tbl_name WHERE id > 100 LIMIT 10;
SELECT FOUND_ROWS();
```


Use these queries instead:
SELECT * FROM tbl_name WHERE id > 100 LIMIT 10;
SELECT COUNT(*) FROM tbl_name WHERE id > 100;
COUNT ( * ) is subject to certain optimizations. SQL_CALC_FOUND_ROWS causes some optimizations to be disabled.

A SELECT statement may include a LIMIT clause to restrict the number of rows the server returns to the client. In some cases, it is desirable to know how many rows the statement would have returned without the LIMIT, but without running the statement again. To obtain this row count, include an SQL_CALC_FOUND_ROWS option in the SELECT statement, and then invoke FOUND_ROWS( ) afterward:
mysql> SELECT SQL_CALC_FOUND_ROWS * FROM tbl_name
-> WHERE id > 100 LIMIT 10;
mysql> SELECT FOUND_ROWS();
The second SELECT returns a number indicating how many rows the first SELECT would have returned had it been written without the LIMIT clause.

In the absence of the SQL_CALC_FOUND_ROWS option in the most recent successful SELECT statement, FOUND_ROWS( ) returns the number of rows in the result set returned by that statement. If the statement includes a LIMIT clause, FOUND_ROWS( ) returns the number of rows up to the limit. For example, FOUND_ROWS() returns 10 or 60, respectively, if the statement includes LIMIT 10 or LIMIT 50, 10.

The row count available through FOUND_ROWS( ) is transient and not intended to be available past the statement following the SELECT SQL_CALC_FOUND_ROWS statement. If you need to refer to the value later, save it:
mysql> SELECT SQL_CALC_FOUND_ROWS * FROM ... ;
mysql> SET @rows = FOUND_ROWS();
If you are using SELECT SQL_CALC_FOUND_ROWS, MySQL must calculate how many rows are in the full result set. However, this is faster than running the query again without LIMIT, because the result set need not be sent to the client.

SQL_CALC_FOUND_ROWS and FOUND_ROWS( ) can be useful in situations when you want to restrict the number of rows that a query returns, but also determine the number of rows in the full result set without running the query again. An example is a Web script that presents a paged display
containing links to the pages that show other sections of a search result. Using FOUND_ROWS( ) enables you to determine how many other pages are needed for the rest of the result.

The use of SQL_CALC_FOUND_ROWS and FOUND_ROWS( ) is more complex for UNION statements than for simple SELECT statements, because LIMIT may occur at multiple places in a UNION. It may be applied to individual SELECT statements in the UNION, or global to the UNION result as a whole.

The intent of SQL_CALC_FOUND_ROWS for UNION is that it should return the row count that would be returned without a global LIMIT. The conditions for use of SQL_CALC_FOUND_ROWS with UNION are:
- The SQL_CALC_FOUND_ROWS keyword must appear in the first SELECT of the UNION.
- The value of FOUND_ROWS( ) is exact only if UNION ALL is used. If UNION without ALL is used, duplicate removal occurs and the value of FOUND_ROWS() is only approximate.
- If no LIMIT is present in the UNION, SQL_CALC_FOUND_ROWS is ignored and returns the number of rows in the temporary table that is created to process the UNION.

Beyond the cases described here, the behavior of FOUND_ROWS( ) is undefined (for example, its value following a SELECT statement that fails with an error).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2291.jpg?height=122&width=108&top_left_y=1142&top_left_x=397)

\section*{Important}

FOUND_ROWS( ) is not replicated reliably using statement-based replication. This function is automatically replicated using row-based replication.
- ICU_VERSION()

The version of the International Components for Unicode (ICU) library used to support regular expression operations (see Section 14.8.2, "Regular Expressions"). This function is primarily intended for use in test cases.
- LAST_INSERT_ID( ), LAST_INSERT_ID(expr)

With no argument, LAST_INSERT_ID( ) returns a BIGINT UNSIGNED (64-bit) value representing the first automatically generated value successfully inserted for an AUTO_INCREMENT column as a result of the most recently executed INSERT statement. The value of LAST_INSERT_ID( ) remains unchanged if no rows are successfully inserted.

With an argument, LAST_INSERT_ID( ) returns an unsigned integer, or NULL if the argument is NULL.

For example, after inserting a row that generates an AUTO_INCREMENT value, you can get the value like this:
```
mysql> SELECT LAST_INSERT_ID();
    -> 195
```


The currently executing statement does not affect the value of LAST_INSERT_ID( ). Suppose that you generate an AUTO_INCREMENT value with one statement, and then refer to LAST_INSERT_ID( ) in a multiple-row INSERT statement that inserts rows into a table with its own AUTO_INCREMENT column. The value of LAST_INSERT_ID( ) remains stable in the second statement; its value for the second and later rows is not affected by the earlier row insertions. (You should be aware that, if you mix references to LAST_INSERT_ID( ) and LAST_INSERT_ID( expr ), the effect is undefined.)

If the previous statement returned an error, the value of LAST_INSERT_ID( ) is undefined. For transactional tables, if the statement is rolled back due to an error, the value of LAST_INSERT_ID( )
is left undefined. For manual ROLLBACK, the value of LAST_INSERT_ID( ) is not restored to that before the transaction; it remains as it was at the point of the ROLLBACK.

Within the body of a stored routine (procedure or function) or a trigger, the value of LAST_INSERT_ID( ) changes the same way as for statements executed outside the body of these kinds of objects. The effect of a stored routine or trigger upon the value of LAST_INSERT_ID( ) that is seen by following statements depends on the kind of routine:
- If a stored procedure executes statements that change the value of LAST_INSERT_ID( ), the changed value is seen by statements that follow the procedure call.
- For stored functions and triggers that change the value, the value is restored when the function or trigger ends, so statements coming after it do not see a changed value.

The ID that was generated is maintained in the server on a per-connection basis. This means that the value returned by the function to a given client is the first AUTO_INCREMENT value generated for most recent statement affecting an AUTO_INCREMENT column by that client. This value cannot be affected by other clients, even if they generate AUTO_INCREMENT values of their own. This behavior ensures that each client can retrieve its own ID without concern for the activity of other clients, and without the need for locks or transactions.

The value of LAST_INSERT_ID( ) is not changed if you set the AUTO_INCREMENT column of a row to a non-"magic" value (that is, a value that is not NULL and not 0).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2292.jpg?height=124&width=103&top_left_y=1231&top_left_x=338)

\section*{Important}

If you insert multiple rows using a single INSERT statement, LAST_INSERT_ID( ) returns the value generated for the first inserted row only. The reason for this is to make it possible to reproduce easily the same INSERT statement against some other server.

For example:
```
mysql> USE test;
mysql> CREATE TABLE t (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    name VARCHAR(10) NOT NULL
    );
mysql> INSERT INTO t VALUES (NULL, 'Bob');
mysql> SELECT * FROM t;
+----+-------+
| id | name |
+----+------+
| 1 | Bob |
+----+-------+
mysql> SELECT LAST_INSERT_ID();
+-------------------+
| LAST_INSERT_ID() |
+-------------------+
| 1 |
+-------------------+
mysql> INSERT INTO t VALUES
    (NULL, 'Mary'), (NULL, 'Jane'), (NULL, 'Lisa');
mysql> SELECT * FROM t;
+----+-------+
| id | name |
+----+------+
| 1 | Bob |
| 2 | Mary |
| 3 | Jane |
```

```
| 4 | Lisa |
+----+------+
mysql> SELECT LAST_INSERT_ID();
+-------------------+
| LAST_INSERT_ID() |
+-------------------+
| 2 |
+-------------------+
```


Although the second INSERT statement inserted three new rows into $t$, the ID generated for the first of these rows was 2, and it is this value that is returned by LAST_INSERT_ID( ) for the following SELECT statement.

If you use INSERT IGNORE and the row is ignored, the LAST_INSERT_ID() remains unchanged from the current value (or 0 is returned if the connection has not yet performed a successful INSERT) and, for non-transactional tables, the AUTO_INCREMENT counter is not incremented. For InnoDB tables, the AUTO_INCREMENT counter is incremented if innodb_autoinc_lock_mode is set to 1 or 2 , as demonstrated in the following example:
```
mysql> USE test;
mysql> SELECT @@innodb_autoinc_lock_mode;
+-----------------------------+
| @@innodb_autoinc_lock_mode |
+-----------------------------+
| 1 |
+-----------------------------+
mysql> CREATE TABLE ˋtˋ (
        ˋidˋ INT(11) NOT NULL AUTO_INCREMENT,
        ˋvalˋ INT(11) DEFAULT NULL,
        PRIMARY KEY (ˋidˋ),
        UNIQUE KEY ˋi1ˋ (ˋvalˋ)
        ) ENGINE=InnoDB;
# Insert two rows
mysql> INSERT INTO t (val) VALUES (1),(2);
# With auto_increment_offset=1, the inserted rows
# result in an AUTO_INCREMENT value of 3
mysql> SHOW CREATE TABLE t\G
************************** 1. row ******************************
        Table: t
Create Table: CREATE TABLE ˋtˋ (
    ˋidˋ int(11) NOT NULL AUTO_INCREMENT,
    ˋvalˋ int(11) DEFAULT NULL,
    PRIMARY KEY (ˋidˋ),
    UNIQUE KEY ˋi1ˋ (ˋvalˋ)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
# LAST_INSERT_ID() returns the first automatically generated
# value that is successfully inserted for the AUTO_INCREMENT column
mysql> SELECT LAST_INSERT_ID();
+--------------------+
| LAST_INSERT_ID() |
+-------------------+
| 1 |
+-------------------+
# The attempted insertion of duplicate rows fail but errors are ignored
mysql> INSERT IGNORE INTO t (val) VALUES (1),(2);
Query OK, 0 rows affected (0.00 sec)
Records: 2 Duplicates: 2 Warnings: 0
# With innodb_autoinc_lock_mode=1, the AUTO_INCREMENT counter
```

```
# is incremented for the ignored rows
mysql> SHOW CREATE TABLE t\G
************************** 1. row ****************************************
        Table: t
Create Table: CREATE TABLE ˋtˋ (
    ˋidˋ int(11) NOT NULL AUTO_INCREMENT,
    ˋvalˋ int(11) DEFAULT NULL,
    PRIMARY KEY (ˋidˋ),
    UNIQUE KEY ˋi1ˋ (ˋvalˋ)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
# The LAST_INSERT_ID is unchanged because the previous insert was unsuccessful
mysql> SELECT LAST_INSERT_ID();
+-------------------+
| LAST_INSERT_ID() |
+-------------------+
| 1 |
+-------------------+
```


For more information, see Section 17.6.1.6, "AUTO_INCREMENT Handling in InnoDB".
If expr is given as an argument to LAST_INSERT_ID( ), the value of the argument is returned by the function and is remembered as the next value to be returned by LAST_INSERT_ID( ). This can be used to simulate sequences:
1. Create a table to hold the sequence counter and initialize it:
```
mysql> CREATE TABLE sequence (id INT NOT NULL);
mysql> INSERT INTO sequence VALUES (0);
```

2. Use the table to generate sequence numbers like this:
```
mysql> UPDATE sequence SET id=LAST_INSERT_ID(id+1);
mysql> SELECT LAST_INSERT_ID();
```


The UPDATE statement increments the sequence counter and causes the next call to LAST_INSERT_ID( ) to return the updated value. The SELECT statement retrieves that value. The mysql_insert_id ( ) C API function can also be used to get the value. See mysql_insert_id().

You can generate sequences without calling LAST_INSERT_ID( ), but the utility of using the function this way is that the ID value is maintained in the server as the last automatically generated value. It is multi-user safe because multiple clients can issue the UPDATE statement and get their own sequence value with the SELECT statement (or mysql_insert_id( )), without affecting or being affected by other clients that generate their own sequence values.

Note that mysql_insert_id( ) is only updated after INSERT and UPDATE statements, so you cannot use the C API function to retrieve the value for LAST_INSERT_ID(expr) after executing other SQL statements like SELECT or SET.
- ROLES_GRAPHML()

Returns a utf8mb3 string containing a GraphML document representing memory role subgraphs. The ROLE_ADMIN privilege (or the deprecated SUPER privilege) is required to see content in the <graphml> element. Otherwise, the result shows only an empty element:
```
mysql> SELECT ROLES_GRAPHML();
+-------------------------------------------------------
| ROLES_GRAPHML() |
+-------------------------------------------------------
| <?xml version="1.0" encoding="UTF-8"?><graphml /> |
+------------------------------------------------------
```

- ROW_COUNT()

ROW_COUNT( ) returns a value as follows:
- DDL statements: 0 . This applies to statements such as CREATE TABLE or DROP TABLE.
- DML statements other than SELECT: The number of affected rows. This applies to statements such as UPDATE, INSERT, or DELETE (as before), but now also to statements such as ALTER TABLE and LOAD DATA.
- SELECT: -1 if the statement returns a result set, or the number of rows "affected" if it does not. For example, for SELECT * FROM t1, ROW_COUNT() returns -1. For SELECT * FROM t1 INTO OUTFILE 'file_name', ROW_COUNT() returns the number of rows written to the file.
- SIGNAL statements: 0 .

For UPDATE statements, the affected-rows value by default is the number of rows actually changed. If you specify the CLIENT_FOUND_ROWS flag to mysql_real_connect () when connecting to mysqld, the affected-rows value is the number of rows "found"; that is, matched by the WHERE clause.

For REPLACE statements, the affected-rows value is 2 if the new row replaced an old row, because in this case, one row was inserted after the duplicate was deleted.

For INSERT ... ON DUPLICATE KEY UPDATE statements, the affected-rows value per row is 1 if the row is inserted as a new row, 2 if an existing row is updated, and 0 if an existing row is set to its current values. If you specify the CLIENT_FOUND_ROWS flag, the affected-rows value is 1 (not 0 ) if an existing row is set to its current values.

The ROW_COUNT() value is similar to the value from the mysql_affected_rows() C API function and the row count that the mysql client displays following statement execution.
```
mysql> INSERT INTO t VALUES(1),(2),(3);
Query OK, 3 rows affected (0.00 sec)
Records: 3 Duplicates: 0 Warnings: 0
mysql> SELECT ROW_COUNT();
+--------------+
| ROW_COUNT() |
+--------------+
| 3 |
+-------------+
1 row in set (0.00 sec)
mysql> DELETE FROM t WHERE i IN(1,2);
Query OK, 2 rows affected (0.00 sec)
mysql> SELECT ROW_COUNT();
+--------------+
| ROW_COUNT() |
+--------------+
| 2 |
+--------------+
1 row in set (0.00 sec)
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2295.jpg?height=120&width=108&top_left_y=2325&top_left_x=397)

Important
ROW_COUNT( ) is not replicated reliably using statement-based replication. This function is automatically replicated using row-based replication.
- SCHEMA()

This function is a synonym for DATABASE( ).
- SESSION_USER()

SESSION_USER( ) is a synonym for USER( ).
Like USER( ), this function can be used for the default value of a VARCHAR or TEXT column, as shown in the following CREATE TABLE statement:
```
CREATE TABLE t (c VARCHAR(288) DEFAULT (SESSION_USER()));
```

- SYSTEM_USER()

SYSTEM_USER( ) is a synonym for USER( ).

\section*{Note}

The SYSTEM_USER( ) function is distinct from the SYSTEM_USER privilege. The former returns the current MySQL account name. The latter distinguishes the system user and regular user account categories (see Section 8.2.11, "Account Categories").

Like USER ( ), this function can be used for the default value of a VARCHAR or TEXT column, as shown in the following CREATE TABLE statement:
```
CREATE TABLE t (c VARCHAR(288) DEFAULT (SYSTEM_USER()));
```

- USER( )

Returns the current MySQL user name and host name as a string in the utf8mb3 character set.
```
mysql> SELECT USER();
    -> 'davida@localhost'
```


The value indicates the user name you specified when connecting to the server, and the client host from which you connected. The value can be different from that of CURRENT_USER( ).

This function can be used for the default value of a VARCHAR or TEXT column, as shown in the following CREATE TABLE statement:
```
CREATE TABLE t (c VARCHAR(288) DEFAULT (USER()));
```

- VERSION()

Returns a string that indicates the MySQL server version. The string uses the utf8mb3 character set. The value might have a suffix in addition to the version number. See the description of the version system variable in Section 7.1.8, "Server System Variables".

This function is unsafe for statement-based replication. A warning is logged if you use this function when binlog_format is set to STATEMENT.
```
mysql> SELECT VERSION();
    -> '8.4.9-standard'
```


\subsection*{14.16 Spatial Analysis Functions}

MySQL provides functions to perform various operations on spatial data. These functions can be grouped into several major categories according to the type of operation they perform:
- Functions that create geometries in various formats (WKT, WKB, internal)
- Functions that convert geometries between formats
- Functions that access qualitative or quantitative properties of a geometry
- Functions that describe relations between two geometries
- Functions that create new geometries from existing ones

For general background about MySQL support for using spatial data, see Section 13.4, "Spatial Data Types".

\subsection*{14.16.1 Spatial Function Reference}

The following table lists each spatial function and provides a short description of each one.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.21 Spatial Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline GeomCollection() & Construct geometry collection from geometries \\
\hline GeometryCollection() & Construct geometry collection from geometries \\
\hline LineString() & Construct LineString from Point values \\
\hline MBRContains() & Whether MBR of one geometry contains MBR of another \\
\hline MBRCoveredBy() & Whether one MBR is covered by another \\
\hline MBRCovers() & Whether one MBR covers another \\
\hline MBRDisjoint() & Whether MBRs of two geometries are disjoint \\
\hline MBREquals() & Whether MBRs of two geometries are equal \\
\hline MBRIntersects() & Whether MBRs of two geometries intersect \\
\hline MBROverlaps() & Whether MBRs of two geometries overlap \\
\hline MBRTouches() & Whether MBRs of two geometries touch \\
\hline MBRWithin() & Whether MBR of one geometry is within MBR of another \\
\hline MultiLineString() & Contruct MultiLineString from LineString values \\
\hline MultiPoint() & Construct MultiPoint from Point values \\
\hline MultiPolygon() & Construct MultiPolygon from Polygon values \\
\hline Point() & Construct Point from coordinates \\
\hline Polygon() & Construct Polygon from LineString arguments \\
\hline ST_Area() & Return Polygon or MultiPolygon area \\
\hline ST_AsBinary(), ST_AsWKB() & Convert from internal geometry format to WKB \\
\hline ST_AsGeoJSON() & Generate GeoJSON object from geometry \\
\hline ST_AsText(), ST_AsWKT() & Convert from internal geometry format to WKT \\
\hline ST_Buffer() & Return geometry of points within given distance from geometry \\
\hline ST_Buffer_Strategy() & Produce strategy option for ST_Buffer() \\
\hline ST_Centroid() & Return centroid as a point \\
\hline ST_Collect() & Aggregate spatial values into collection \\
\hline ST_Contains() & Whether one geometry contains another \\
\hline ST_ConvexHull() & Return convex hull of geometry \\
\hline ST_Crosses() & Whether one geometry crosses another \\
\hline ST_Difference() & Return point set difference of two geometries \\
\hline ST_Dimension() & Dimension of geometry \\
\hline ST_Disjoint() & Whether one geometry is disjoint from another \\
\hline ST_Distance() & The distance of one geometry from another \\
\hline
\end{tabular}
\end{table}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Spatial Function Reference}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline ST_Distance_Sphere() & Minimum distance on earth between two geometries \\
\hline ST_EndPoint() & End Point of LineString \\
\hline ST_Envelope() & Return MBR of geometry \\
\hline ST_Equals() & Whether one geometry is equal to another \\
\hline ST_ExteriorRing() & Return exterior ring of Polygon \\
\hline ST_FrechetDistance() & The discrete Fréchet distance of one geometry from another \\
\hline ST_GeoHash() & Produce a geohash value \\
\hline ST_GeomCollFromText(), ST_GeometryCollectionFromText(), ST_GeomCollFromTxt() & Return geometry collection from WKT \\
\hline ST_GeomCollFromWKB(), ST_GeometryCollectionFromWKB() & Return geometry collection from WKB \\
\hline ST_GeometryN() & Return N-th geometry from geometry collection \\
\hline ST_GeometryType() & Return name of geometry type \\
\hline ST_GeomFromGeoJSON() & Generate geometry from GeoJSON object \\
\hline ST_GeomFromText(), ST_GeometryFromText() & Return geometry from WKT \\
\hline ST_GeomFromWKB(), ST_GeometryFromWKB() & Return geometry from WKB \\
\hline ST_HausdorffDistance() & The discrete Hausdorff distance of one geometry from another \\
\hline ST_InteriorRingN() & Return N-th interior ring of Polygon \\
\hline ST_Intersection() & Return point set intersection of two geometries \\
\hline ST_Intersects() & Whether one geometry intersects another \\
\hline ST_IsClosed() & Whether a geometry is closed and simple \\
\hline ST_IsEmpty() & Whether a geometry is empty \\
\hline ST_IsSimple() & Whether a geometry is simple \\
\hline ST_IsValid() & Whether a geometry is valid \\
\hline ST_LatFromGeoHash() & Return latitude from geohash value \\
\hline ST_Latitude() & Return latitude of Point \\
\hline ST_Length() & Return length of LineString \\
\hline ST_LineFromText(), ST_LineStringFromText() & Construct LineString from WKT \\
\hline ST_LineFromWKB(), ST_LineStringFromWKB() & Construct LineString from WKB \\
\hline ST_LineInterpolatePoint() & The point a given percentage along a LineString \\
\hline ST_LineInterpolatePoints() & The points a given percentage along a LineString \\
\hline ST_LongFromGeoHash() & Return longitude from geohash value \\
\hline ST_Longitude() & Return longitude of Point \\
\hline ST_MakeEnvelope() & Rectangle around two points \\
\hline ST_MLineFromText(), ST_MultiLineStringFromText() & Construct MultiLineString from WKT \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline ST_MLineFromWKB( ), ST_MultiLineStringFromWKB() & Construct MultiLineString from WKB \\
\hline ST_MPointFromText(), ST_MultiPointFromText() & Construct MultiPoint from WKT \\
\hline ST_MPointFromWKB ( ), ST_MultiPointFromWKB() & Construct MultiPoint from WKB \\
\hline ST_MPolyFromText(), ST_MultiPolygonFromText() & Construct MultiPolygon from WKT \\
\hline ST_MPolyFromWKB ( ), ST_MultiPolygonFromWKB() & Construct MultiPolygon from WKB \\
\hline ST_NumGeometries() & Return number of geometries in geometry collection \\
\hline ST_NumInteriorRing(), ST_NumInteriorRings() & Return number of interior rings in Polygon \\
\hline ST_NumPoints() & Return number of points in LineString \\
\hline ST_Overlaps() & Whether one geometry overlaps another \\
\hline ST_PointAtDistance() & The point a given distance along a LineString \\
\hline ST_PointFromGeoHash() & Convert geohash value to POINT value \\
\hline ST_PointFromText() & Construct Point from WKT \\
\hline ST_PointFromWKB() & Construct Point from WKB \\
\hline ST_PointN() & Return N-th point from LineString \\
\hline ST_PolyFromText(), ST_PolygonFromText() & Construct Polygon from WKT \\
\hline ST_PolyFromWKB( ), ST_PolygonFromWKB ( ) & Construct Polygon from WKB \\
\hline ST_Simplify() & Return simplified geometry \\
\hline ST_SRID() & Return spatial reference system ID for geometry \\
\hline ST_StartPoint() & Start Point of LineString \\
\hline ST_SwapXY( ) & Return argument with X/Y coordinates swapped \\
\hline ST_SymDifference() & Return point set symmetric difference of two geometries \\
\hline ST_Touches( ) & Whether one geometry touches another \\
\hline ST_Transform() & Transform coordinates of geometry \\
\hline ST_Union() & Return point set union of two geometries \\
\hline ST_Validate() & Return validated geometry \\
\hline ST_Within() & Whether one geometry is within another \\
\hline ST_X() & Return X coordinate of Point \\
\hline ST_Y( ) & Return Y coordinate of Point \\
\hline
\end{tabular}

\subsection*{14.16.2 Argument Handling by Spatial Functions}

Spatial values, or geometries, have the properties described in Section 13.4.2.2, "Geometry Class". The following discussion lists general spatial function argument-handling characteristics. Specific functions or groups of functions may have additional or different argument-handling characteristics, as discussed in the sections where those function descriptions occur. Where that is true, those descriptions take precedence over the general discussion here.

Spatial functions are defined only for valid geometry values. See Section 13.4.4, "Geometry WellFormedness and Validity".

Each geometry value is associated with a spatial reference system (SRS), which is a coordinate-based system for geographic locations. See Section 13.4.5, "Spatial Reference System Support".

The spatial reference identifier (SRID) of a geometry identifies the SRS in which the geometry is defined. In MySQL, the SRID value is an integer associated with the geometry value. The maximum usable SRID value is $2^{32}-1$. If a larger value is given, only the lower 32 bits are used.

SRID 0 represents an infinite flat Cartesian plane with no units assigned to its axes. To ensure SRID 0 behavior, create geometry values using SRID 0 . SRID 0 is the default for new geometry values if no SRID is specified.

For computations on multiple geometry values, all values must be in the same SRS or an error occurs. Thus, spatial functions that take multiple geometry arguments require those arguments to be in the same SRS. If a spatial function returns ER_GIS_DIFFERENT_SRIDS, it means that the geometry arguments were not all in the same SRS. You must modify them to have the same SRS.

A geometry returned by a spatial function is in the SRS of the geometry arguments because geometry values produced by any spatial function inherit the SRID of the geometry arguments.

The Open Geospatial Consortium guidelines require that input polygons already be closed, so unclosed polygons are rejected as invalid rather than being closed.

In MySQL, the only valid empty geometry is represented in the form of an empty geometry collection. Empty geometry collection handling is as follows: An empty WKT input geometry collection may be specified as 'GEOMETRYCOLLECTION( ) '. This is also the output WKT resulting from a spatial operation that produces an empty geometry collection.

During parsing of a nested geometry collection, the collection is flattened and its basic components are used in various GIS operations to compute results. This provides additional flexibility to users because it is unnecessary to be concerned about the uniqueness of geometry data. Nested geometry collections may be produced from nested GIS function calls without having to be explicitly flattened first.

\subsection*{14.16.3 Functions That Create Geometry Values from WKT Values}

These functions take as arguments a Well-Known Text (WKT) representation and, optionally, a spatial reference system identifier (SRID). They return the corresponding geometry. For a description of WKT format, see Well-Known Text (WKT) Format.

Functions in this section detect arguments in either Cartesian or geographic spatial reference systems (SRSs), and return results appropriate to the SRS.

ST_GeomFromText ( ) accepts a WKT value of any geometry type as its first argument. Other functions provide type-specific construction functions for construction of geometry values of each geometry type.

Functions such as ST_MPointFromText ( ) and ST_GeomFromText ( ) that accept WKT-format representations of MultiPoint values permit individual points within values to be surrounded by parentheses. For example, both of the following function calls are valid:
```
ST_MPointFromText('MULTIPOINT (1 1, 2 2, 3 3)')
ST_MPointFromText('MULTIPOINT ((1 1), (2 2), (3 3))')
```


Functions such as ST_GeomFromText ( ) that accept WKT geometry collection arguments understand both OpenGIS 'GEOMETRYCOLLECTION EMPTY' standard syntax and MySQL ' GEOMETRYCOLLECTION( ) ' nonstandard syntax. Functions such as ST_AsWKT( ) that produce WKT values produce 'GEOMETRYCOLLECTION EMPTY' standard syntax:
```
mysql> SET @s1 = ST_GeomFromText('GEOMETRYCOLLECTION()');
mysql> SET @s2 = ST_GeomFromText('GEOMETRYCOLLECTION EMPTY');
mysql> SELECT ST_AsWKT(@s1), ST_AsWKT(@s2);
```

```
+----------------------------+---------------------------
| ST_AsWKT(@s1) | ST_AsWKT(@s2) |
+----------------------------+--------------------------+
| GEOMETRYCOLLECTION EMPTY | GEOMETRYCOLLECTION EMPTY |
+----------------------------+---------------------------
```


Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If any geometry argument is NULL or is not a syntactically well-formed geometry, or if the SRID argument is NULL, the return value is NULL.
- By default, geographic coordinates (latitude, longitude) are interpreted as in the order specified by the spatial reference system of geometry arguments. An optional options argument may be given to override the default axis order. options consists of a list of comma-separated key=value. The only permitted key value is axis-order, with permitted values of lat-long, long-lat and srid-defined (the default).

If the options argument is NULL, the return value is NULL. If the options argument is invalid, an error occurs to indicate why.
- If an SRID argument refers to an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- For geographic SRS geometry arguments, if any argument has a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range (-180, 180], an ER_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90, 90], an ER_LATITUDE_OUT_OF_RANGE error occurs.

Ranges shown are in degrees. If an SRS uses another unit, the range uses the corresponding values in its unit. The exact range limits deviate slightly due to floating-point arithmetic.

These functions are available for creating geometries from WKT values:
```
- ST_GeomCollFromText(wkt [, srid [, options]]),
    ST_GeometryCollectionFromText(wkt [, srid [, options]]),
    ST_GeomCollFromTxt(wkt [, srid [, options]])
```


Constructs a GeometryCollection value using its WKT representation and SRID.
These functions handle their arguments as described in the introduction to this section.
```
mysql> SET @g = "MULTILINESTRING((10 10, 11 11), (9 9, 10 10))";
mysql> SELECT ST_AsText(ST_GeomCollFromText(@g));
+-----------------------------------------------
| ST_AsText(ST_GeomCollFromText(@g)) |
+----------------------------------------------
| MULTILINESTRING((10 10,11 11),(9 9,10 10)) |
+---------------------------------------------+
```

- ST_GeomFromText(wkt [, srid [, options]]),ST_GeometryFromText(wkt [, srid [, options]])

Constructs a geometry value of any type using its WKT representation and SRID.
These functions handle their arguments as described in the introduction to this section.
- ST_LineFromText(wkt [, srid [, options]]),ST_LineStringFromText(wkt [, srid [, options]])

Constructs a LineString value using its WKT representation and SRID.
These functions handle their arguments as described in the introduction to this section.
- ST_MLineFromText(wkt [, srid [, options]]),ST_MultiLineStringFromText(wkt [, srid [, options]])

Constructs a MultiLineString value using its WKT representation and SRID.
These functions handle their arguments as described in the introduction to this section.
- ST_MPointFromText(wkt [, srid [, options]]),ST_MultiPointFromText(wkt [, srid [, options]])

Constructs a MultiPoint value using its WKT representation and SRID.
These functions handle their arguments as described in the introduction to this section.
- ST_MPolyFromText(wkt [, srid [, options]]),ST_MultiPolygonFromText(wkt [, srid [, options]])

Constructs a MultiPolygon value using its WKT representation and SRID.
These functions handle their arguments as described in the introduction to this section.
- ST_PointFromText(wkt [, srid [, options]])

Constructs a Point value using its WKT representation and SRID.
ST_PointFromText ( ) handles its arguments as described in the introduction to this section.
- ST_PolyFromText(wkt [, srid [, options]]),ST_PolygonFromText(wkt [, srid [, options]])

Constructs a Polygon value using its WKT representation and SRID.
These functions handle their arguments as described in the introduction to this section.

\subsection*{14.16.4 Functions That Create Geometry Values from WKB Values}

These functions take as arguments a BLOB containing a Well-Known Binary (WKB) representation and, optionally, a spatial reference system identifier (SRID). They return the corresponding geometry. For a description of WKB format, see Well-Known Binary (WKB) Format.

Functions in this section detect arguments in either Cartesian or geographic spatial reference systems (SRSs), and return results appropriate to the SRS.

ST_GeomFromWKB ( ) accepts a WKB value of any geometry type as its first argument. Other functions provide type-specific construction functions for construction of geometry values of each geometry type.

Prior to MySQL 8.4, these functions also accepted geometry objects as returned by the functions in Section 14.16.5, "MySQL-Specific Functions That Create Geometry Values". Geometry arguments are no longer permitted and produce an error. To migrate calls from using geometry arguments to using WKB arguments, follow these guidelines:
- Rewrite constructs such as ST_GeomFromWKB(Point(0, 0)) as Point(0, 0).
- Rewrite constructs such as ST_GeomFromWKB(Point(0, 0), 4326) as ST_SRID(Point(0, 0), 4326) or ST_GeomFromWKB(ST_AsWKB(Point(0, 0)), 4326).

Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If the WKB or SRID argument is NULL, the return value is NULL.
- By default, geographic coordinates (latitude, longitude) are interpreted as in the order specified by the spatial reference system of geometry arguments. An optional options argument may be given to override the default axis order. options consists of a list of comma-separated $k e y=v a l u e$.

The only permitted key value is axis-order, with permitted values of lat-long, long-lat and srid-defined (the default).

If the options argument is NULL, the return value is NULL. If the options argument is invalid, an error occurs to indicate why.
- If an SRID argument refers to an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- For geographic SRS geometry arguments, if any argument has a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range (-180, 180], an ER_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90, 90], an ER_LATITUDE_OUT_OF_RANGE error occurs.

Ranges shown are in degrees. If an SRS uses another unit, the range uses the corresponding values in its unit. The exact range limits deviate slightly due to floating-point arithmetic.

These functions are available for creating geometries from WKB values:
- ST_GeomCollFromWKB(wkb [, srid [, options]]),

ST_GeometryCollectionFromWKB(wkb [, srid [, options]])
Constructs a GeometryCollection value using its WKB representation and SRID.
These functions handle their arguments as described in the introduction to this section.
- ST_GeomFromWKB(wkb [, srid [, options]]),ST_GeometryFromWKB(wkb [, srid [, options]])

Constructs a geometry value of any type using its WKB representation and SRID.
These functions handle their arguments as described in the introduction to this section.
- ST_LineFromWKB(wkb [, srid [, options]]),ST_LineStringFromWKB(wkb [, srid [, options]])

Constructs a LineString value using its WKB representation and SRID.
These functions handle their arguments as described in the introduction to this section.
- ST_MLineFromWKB(wkb [, srid [, options]]),ST_MultiLineStringFromWKB(wkb [, srid [, options]])

Constructs a MultiLineString value using its WKB representation and SRID.
These functions handle their arguments as described in the introduction to this section.
- ST_MPointFromWKB(wkb [, srid [, options]]),ST_MultiPointFromWKB(wkb [, srid [, options]])

Constructs a MultiPoint value using its WKB representation and SRID.
These functions handle their arguments as described in the introduction to this section.
- ST_MPolyFromWKB(wkb [, srid [, options]]),ST_MultiPolygonFromWKB(wkb [, srid [, options]])

Constructs a MultiPolygon value using its WKB representation and SRID.
These functions handle their arguments as described in the introduction to this section.
- ST_PointFromWKB(wkb [, srid [, options]])

Constructs a Point value using its WKB representation and SRID.
ST_PointFromWKB() handles its arguments as described in the introduction to this section.
- ST_PolyFromWKB(wkb [, srid [, options]]),ST_PolygonFromWKB(wkb [, srid [, options]])

Constructs a Polygon value using its WKB representation and SRID.
These functions handle their arguments as described in the introduction to this section.

\subsection*{14.16.5 MySQL-Specific Functions That Create Geometry Values}

MySQL provides a set of useful nonstandard functions for creating geometry values. The functions described in this section are MySQL extensions to the OpenGIS specification.

These functions produce geometry objects from either WKB values or geometry objects as arguments. If any argument is not a proper WKB or geometry representation of the proper object type, the return value is NULL.

For example, you can insert the geometry return value from Point ( ) directly into a POINT column:
INSERT INTO t1 (pt_col) VALUES(Point(1,2));
- GeomCollection(g [, g] ...)

Constructs a GeomCollection value from the geometry arguments.
GeomCollection( ) returns all the proper geometries contained in the arguments even if a nonsupported geometry is present.

GeomCollection ( ) with no arguments is permitted as a way to create an empty geometry. Also, functions such as ST_GeomFromText ( ) that accept WKT geometry collection arguments understand both OpenGIS 'GEOMETRYCOLLECTION EMPTY' standard syntax and MySQL 'GEOMETRYCOLLECTION( )' nonstandard syntax.

GeomCollection() and GeometryCollection( ) are synonymous, with GeomCollection() the preferred function.
- GeometryCollection(g [, g] ...)

Constructs a GeomCollection value from the geometry arguments.
GeometryCollection( ) returns all the proper geometries contained in the arguments even if a nonsupported geometry is present.

GeometryCollection( ) with no arguments is permitted as a way to create an empty geometry. Also, functions such as ST_GeomFromText ( ) that accept WKT geometry collection arguments understand both OpenGIS 'GEOMETRYCOLLECTION EMPTY' standard syntax and MySQL 'GEOMETRYCOLLECTION( )' nonstandard syntax.

GeomCollection() and GeometryCollection( ) are synonymous, with GeomCollection() the preferred function.
- LineString(pt [, pt] ...)

Constructs a LineString value from a number of Point or WKB Point arguments. If the number of arguments is less than two, the return value is NULL.
- MultiLineString(ls [, ls] ...)

Constructs a MultiLineString value using LineString or WKB LineString arguments.
- MultiPoint(pt [, pt2] ...)

Constructs a MultiPoint value using Point or WKB Point arguments.
- MultiPolygon(poly [, poly] ...)

Constructs a MultiPolygon value from a set of Polygon or WKB Polygon arguments.
- Point(x, y)

Constructs a Point using its coordinates.
- Polygon(ls [, ls] ...)

Constructs a Polygon value from a number of LineString or WKB LineString arguments. If any argument does not represent a LinearRing (that is, not a closed and simple LineString), the return value is NULL.

\subsection*{14.16.6 Geometry Format Conversion Functions}

MySQL supports the functions listed in this section for converting geometry values from internal geometry format to WKT or WKB format, or for swapping the order of X and Y coordinates.

There are also functions to convert a string from WKT or WKB format to internal geometry format. See Section 14.16.3, "Functions That Create Geometry Values from WKT Values", and Section 14.16.4, "Functions That Create Geometry Values from WKB Values".

Functions such as ST_GeomFromText ( ) that accept WKT geometry collection arguments understand both OpenGIS 'GEOMETRYCOLLECTION EMPTY' standard syntax and MySQL ' GEOMETRYCOLLECTION( ) ' nonstandard syntax. Another way to produce an empty geometry collection is by calling GeometryCollection() with no arguments. Functions such as ST_AsWKT() that produce WKT values produce 'GEOMETRYCOLLECTION EMPTY' standard syntax:
```
mysql> SET @s1 = ST_GeomFromText('GEOMETRYCOLLECTION()');
mysql> SET @s2 = ST_GeomFromText('GEOMETRYCOLLECTION EMPTY');
mysql> SELECT ST_AsWKT(@s1), ST_AsWKT(@s2);
+----------------------------+--------------------------
| ST_AsWKT(@s1) | ST_AsWKT(@s2) |
+----------------------------+--------------------------
| GEOMETRYCOLLECTION EMPTY | GEOMETRYCOLLECTION EMPTY |
+----------------------------+---------------------------
mysql> SELECT ST_AsWKT(GeomCollection());
+------------------------------+
| ST_AsWKT(GeomCollection()) |
+-----------------------------+
| GEOMETRYCOLLECTION EMPTY |
+-----------------------------+
```


Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If any argument is NULL, the return value is NULL.
- If any geometry argument is not a syntactically well-formed geometry, an ER_GIS_INVALID_DATA error occurs.
- If any geometry argument is in an undefined spatial reference system, the axes are output in the order they appear in the geometry and an ER_WARN_SRS_NOT_FOUND_AXIS_ORDER warning occurs.
- By default, geographic coordinates (latitude, longitude) are interpreted as in the order specified by the spatial reference system of geometry arguments. An optional options argument may be given to override the default axis order. options consists of a list of comma-separated key=value.

The only permitted key value is axis-order, with permitted values of lat-long, long-lat and srid-defined (the default).

If the options argument is NULL, the return value is NULL. If the options argument is invalid, an error occurs to indicate why.
- Otherwise, the return value is non-NULL.

These functions are available for format conversions or coordinate swapping:
- ST_AsBinary(g [, options]),ST_AsWKB(g [, options])

Converts a value in internal geometry format to its WKB representation and returns the binary result.
The function return value has geographic coordinates (latitude, longitude) in the order specified by the spatial reference system that applies to the geometry argument. An optional options argument may be given to override the default axis order.

ST_AsBinary() and ST_AsWKB( ) handle their arguments as described in the introduction to this section.
```
mysql> SET @g = ST_LineFromText('LINESTRING(0 5,5 10,10 15)', 4326);
mysql> SELECT ST_AsText(ST_GeomFromWKB(ST_AsWKB(@g)));
+------------------------------------------+
| ST_AsText(ST_GeomFromWKB(ST_AsWKB(@g))) |
+-------------------------------------------
| LINESTRING(5 0,10 5,15 10) |
+-------------------------------------------+
mysql> SELECT ST_AsText(ST_GeomFromWKB(ST_AsWKB(@g, 'axis-order=long-lat')));
+--------------------------------------------------------------------
| ST_AsText(ST_GeomFromWKB(ST_AsWKB(@g, 'axis-order=long-lat'))) |
+-------------------------------------------------------------------
| LINESTRING(0 5,5 10,10 15) |
+--------------------------------------------------------------------
mysql> SELECT ST_AsText(ST_GeomFromWKB(ST_AsWKB(@g, 'axis-order=lat-long')));
+--------------------------------------------------------------------
| ST_AsText(ST_GeomFromWKB(ST_AsWKB(@g, 'axis-order=lat-long'))) |
+------------------------------------------------------------------
| LINESTRING(5 0,10 5,15 10) |
+--------------------------------------------------------------------
```

- ST_AsText(g [, options]),ST_AsWKT(g [, options])

Converts a value in internal geometry format to its WKT representation and returns the string result.
The function return value has geographic coordinates (latitude, longitude) in the order specified by the spatial reference system that applies to the geometry argument. An optional options argument may be given to override the default axis order.

ST_AsText ( ) and ST_AsWKT( ) handle their arguments as described in the introduction to this section.
```
mysql> SET @g = 'LineString(1 1,2 2,3 3)';
mysql> SELECT ST_AsText(ST_GeomFromText(@g));
+---------------------------------+
| ST_AsText(ST_GeomFromText(@g)) |
+---------------------------------+
| LINESTRING(1 1,2 2,3 3) |
+----------------------------------+
```


Output for MultiPoint values includes parentheses around each point. For example:
```
mysql> SELECT ST_AsText(ST_GeomFromText(@mp));
+----------------------------------+
| ST_AsText(ST_GeomFromText(@mp)) |
+----------------------------------+
```

```
| MULTIPOINT((1 1),(2 2),(3 3)) |
+-----------------------------------+
```

- ST_SwapXY(g)

Accepts an argument in internal geometry format, swaps the $X$ and $Y$ values of each coordinate pair within the geometry, and returns the result.

ST_SwapXY( ) handles its arguments as described in the introduction to this section.
```
mysql> SET @g = ST_LineFromText('LINESTRING(0 5,5 10,10 15)');
mysql> SELECT ST_AsText(@g);
+------------------------------+
| ST_AsText(@g) |
+-----------------------------+
| LINESTRING(0 5,5 10,10 15) |
+------------------------------+
mysql> SELECT ST_AsText(ST_SwapXY(@g));
+------------------------------+
| ST_AsText(ST_SwapXY(@g)) |
+------------------------------+
| LINESTRING(5 0,10 5,15 10) |
+-----------------------------+
```


\subsection*{14.16.7 Geometry Property Functions}

Each function that belongs to this group takes a geometry value as its argument and returns some quantitative or qualitative property of the geometry. Some functions restrict their argument type. Such functions return NULL if the argument is of an incorrect geometry type. For example, the ST_Area() polygon function returns NULL if the object type is neither Polygon nor MultiPolygon.

\subsection*{14.16.7.1 General Geometry Property Functions}

The functions listed in this section do not restrict their argument and accept a geometry value of any type.

Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If any argument is NULL, the return value is NULL.
- If any geometry argument is not a syntactically well-formed geometry, an ER_GIS_INVALID_DATA error occurs.
- If any geometry argument is a syntactically well-formed geometry in an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- If any SRID argument is not within the range of a 32-bit unsigned integer, an ER_DATA_OUT_OF_RANGE error occurs.
- If any SRID argument refers to an undefined SRS, an ER_SRS_NOT_FOUND error occurs.
- Otherwise, the return value is non-NULL.

These functions are available for obtaining geometry properties:
- ST_Dimension(g)

Returns the inherent dimension of the geometry value $g$. The dimension can be $-1,0,1$, or 2 . The meaning of these values is given in Section 13.4.2.2, "Geometry Class".

ST_Dimension( ) handles its arguments as described in the introduction to this section.
```
mysql> SELECT ST_Dimension(ST_GeomFromText('LineString(1 1,2 2)'));
+--------------------------------------------------------
| ST_Dimension(ST_GeomFromText('LineString(1 1,2 2)')) |
+--------------------------------------------------------
| 1 |
```

```
+------------------------------------------------------+
```

- ST_Envelope(g)

Returns the minimum bounding rectangle (MBR) for the geometry value $g$. The result is returned as a Polygon value that is defined by the corner points of the bounding box:
```
POLYGON((MINX MINY, MAXX MINY, MAXX MAXY, MINX MAXY, MINX MINY))
mysql> SELECT ST_AsText(ST_Envelope(ST_GeomFromText('LineString(1 1,2 2)')));
+------------------------------------------------------------------
| ST_AsText(ST_Envelope(ST_GeomFromText('LineString(1 1,2 2)'))) |
+--------------------------------------------------------------------
| POLYGON((1 1,2 1,2 2,1 2,1 1)) |
+-------------------------------------------------------------------
```


If the argument is a point or a vertical or horizontal line segment, ST_Envelope( ) returns the point or the line segment as its MBR rather than returning an invalid polygon:
```
mysql> SELECT ST_AsText(ST_Envelope(ST_GeomFromText('LineString(1 1,1 2)')));
+--------------------------------------------------------------------
| ST_AsText(ST_Envelope(ST_GeomFromText('LineString(1 1,1 2)'))) |
+--------------------------------------------------------------------
| LINESTRING(1 1,1 2)
```


ST_Envelope( ) handles its arguments as described in the introduction to this section, with this exception:
- If the geometry has an SRID value for a geographic spatial reference system (SRS), an ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS error occurs.
- ST_GeometryType(g)

Returns a binary string indicating the name of the geometry type of which the geometry instance $g$ is a member. The name corresponds to one of the instantiable Geometry subclasses.

ST_GeometryType( ) handles its arguments as described in the introduction to this section.
```
mysql> SELECT ST_GeometryType(ST_GeomFromText('POINT(1 1)'));
+----------------------------------------------------
| ST_GeometryType(ST_GeomFromText('POINT(1 1)')) |
+---------------------------------------------------
| POINT |
+---------------------------------------------------
```

- ST_IsEmpty(g)

This function is a placeholder that returns 1 for an empty geometry collection value or 0 otherwise.
The only valid empty geometry is represented in the form of an empty geometry collection value. MySQL does not support GIS EMPTY values such as POINT EMPTY.

ST_IsEmpty( ) handles its arguments as described in the introduction to this section.
- ST_IsSimple(g)

Returns 1 if the geometry value $g$ is simple according to the ISO SQL/MM Part 3: Spatial standard. ST_IsSimple( ) returns 0 if the argument is not simple.

The descriptions of the instantiable geometric classes given under Section 13.4.2, "The OpenGIS Geometry Model" include the specific conditions that cause class instances to be classified as not simple.

ST_IsSimple( ) handles its arguments as described in the introduction to this section, with this exception:
- If the geometry has a geographic SRS with a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range ( -180 , 180], an

ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90,90], an

ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE error occurs.
Ranges shown are in degrees. The exact range limits deviate slightly due to floating-point arithmetic.
- ST_SRID(g [, srid])

With a single argument representing a valid geometry object $g$, ST_SRID( ) returns an integer indicating the ID of the spatial reference system (SRS) associated with $g$.

With the optional second argument representing a valid SRID value, ST_SRID ( ) returns an object with the same type as its first argument with an SRID value equal to the second argument. This only sets the SRID value of the object; it does not perform any transformation of coordinate values.

ST_SRID( ) handles its arguments as described in the introduction to this section, with this exception:
- For the single-argument syntax, ST_SRID ( ) returns the geometry SRID even if it refers to an undefined SRS. An ER_SRS_NOT_FOUND error does not occur.

ST_SRID(g, target_srid) and ST_Transform(g, target_srid) differ as follows:
- ST_SRID( ) changes the geometry SRID value without transforming its coordinates.
- ST_Transform( ) transforms the geometry coordinates in addition to changing its SRID value.
```
mysql> SET @g = ST_GeomFromText('LineString(1 1,2 2)', 0);
mysql> SELECT ST_SRID(@g);
+--------------+
| ST_SRID(@g) |
+--------------+
| 0 |
+--------------+
mysql> SET @g = ST_SRID(@g, 4326);
mysql> SELECT ST_SRID(@g);
+--------------+
| ST_SRID(@g) |
+--------------+
| 4326 |
+--------------+
```


It is possible to create a geometry in a particular SRID by passing to ST_SRID ( ) the result of one of the MySQL-specific functions for creating spatial values, along with an SRID value. For example:

SET @g1 = ST_SRID(Point(1, 1), 4326);
However, that method creates the geometry in SRID 0, then casts it to SRID 4326 (WGS 84). A preferable alternative is to create the geometry with the correct spatial reference system to begin with. For example:
```
SET @g1 = ST_PointFromText('POINT(1 1)', 4326);
SET @g1 = ST_GeomFromText('POINT(1 1)', 4326);
```


The two-argument form of ST_SRID( ) is useful for tasks such as correcting or changing the SRS of geometries that have an incorrect SRID.

\subsection*{14.16.7.2 Point Property Functions}

A Point consists of $X$ and $Y$ coordinates, which may be obtained using the ST_X( ) and ST_Y( ) functions, respectively. These functions also permit an optional second argument that specifies an X or Y coordinate value, in which case the function result is the Point object from the first argument with the appropriate coordinate modified to be equal to the second argument.

For Point objects that have a geographic spatial reference system (SRS), the longitude and latitude may be obtained using the ST_Longitude( ) and ST_Latitude( ) functions, respectively. These functions also permit an optional second argument that specifies a longitude or latitude value, in which case the function result is the Point object from the first argument with the longitude or latitude modified to be equal to the second argument.

Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If any argument is NULL, the return value is NULL.
- If any geometry argument is a valid geometry but not a Point object, an ER_UNEXPECTED_GEOMETRY_TYPE error occurs.
- If any geometry argument is not a syntactically well-formed geometry, an ER_GIS_INVALID_DATA error occurs.
- If any geometry argument is a syntactically well-formed geometry in an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- If an X or Y coordinate argument is provided and the value is - inf, +inf, or NaN, an ER_DATA_OUT_OF_RANGE error occurs.
- If a longitude or latitude value is out of range, an error occurs:
- If a longitude value is not in the range (-180, 180], an ER_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90, 90], an ER_LATITUDE_OUT_OF_RANGE error occurs.

Ranges shown are in degrees. The exact range limits deviate slightly due to floating-point arithmetic.
- Otherwise, the return value is non-NULL.

These functions are available for obtaining point properties:
- ST_Latitude(p [, new_latitude_val])

With a single argument representing a valid Point object $p$ that has a geographic spatial reference system (SRS), ST_Latitude ( ) returns the latitude value of $p$ as a double-precision number.

With the optional second argument representing a valid latitude value, ST_Latitude( ) returns a Point object like the first argument with its latitude equal to the second argument.

ST_Latitude ( ) handles its arguments as described in the introduction to this section, with the addition that if the Point object is valid but does not have a geographic SRS, an ER_SRS_NOT_GEOGRAPHIC error occurs.
```
mysql> SET @pt = ST_GeomFromText('POINT(45 90)', 4326);
mysql> SELECT ST_Latitude(@pt);
+--------------------+
| ST_Latitude(@pt) |
+-------------------+
| 45 |
+-------------------+
mysql> SELECT ST_AsText(ST_Latitude(@pt, 10));
+----------------------------------+
| ST_AsText(ST_Latitude(@pt, 10)) |
+----------------------------------+
```

```
| POINT(10 90) |
```

- ST_Longitude(p [, new_longitude_val])

With a single argument representing a valid Point object $p$ that has a geographic spatial reference system (SRS), ST_Longitude ( ) returns the longitude value of $p$ as a double-precision number.

With the optional second argument representing a valid longitude value, ST_Longitude( ) returns a Point object like the first argument with its longitude equal to the second argument.

ST_Longitude( ) handles its arguments as described in the introduction to this section, with the addition that if the Point object is valid but does not have a geographic SRS, an ER_SRS_NOT_GEOGRAPHIC error occurs.
```
mysql> SET @pt = ST_GeomFromText('POINT(45 90)', 4326);
mysql> SELECT ST_Longitude(@pt);
+--------------------+
| ST_Longitude(@pt) |
+--------------------+
| 90 |
+--------------------+
mysql> SELECT ST_AsText(ST_Longitude(@pt, 10));
+------------------------------------+
| ST_AsText(ST_Longitude(@pt, 10)) |
+------------------------------------+
| POINT(45 10) |
+-----------------------------------+
```

- ST_X( $p$ [, new_x_val])

With a single argument representing a valid Point object $p$, ST_X() returns the X-coordinate value of $p$ as a double-precision number. The $X$ coordinate is considered to refer to the axis that appears first in the Point spatial reference system (SRS) definition.

With the optional second argument, ST_X() returns a Point object like the first argument with its X coordinate equal to the second argument. If the Point object has a geographic SRS, the second argument must be in the proper range for longitude or latitude values.

ST_X() handles its arguments as described in the introduction to this section.
```
mysql> SELECT ST_X(Point(56.7, 53.34));
+---------------------------+
| ST_X(Point(56.7, 53.34)) |
+---------------------------+
| 56.7 |
+---------------------------+
mysql> SELECT ST_AsText(ST_X(Point(56.7, 53.34), 10.5));
+--------------------------------------------+
| ST_AsText(ST_X(Point(56.7, 53.34), 10.5)) |
+----------------------------------------------
| POINT(10.5 53.34) |
+--------------------------------------------+
```

- ST_Y( $p$ [, new_y_val])

With a single argument representing a valid Point object $p$, ST_Y ( ) returns the Y-coordinate value of $p$ as a double-precision number. The Y coordinate is considered to refer to the axis that appears second in the Point spatial reference system (SRS) definition.

With the optional second argument, ST_Y( ) returns a Point object like the first argument with its Y coordinate equal to the second argument. If the Point object has a geographic SRS, the second argument must be in the proper range for longitude or latitude values.

ST_Y( ) handles its arguments as described in the introduction to this section.
```
mysql> SELECT ST_Y(Point(56.7, 53.34));
+----------------------------+
| ST_Y(Point(56.7, 53.34)) |
+---------------------------+
| 53.34 |
+----------------------------+
mysql> SELECT ST_AsText(ST_Y(Point(56.7, 53.34), 10.5));
+---------------------------------------------
| ST_AsText(ST_Y(Point(56.7, 53.34), 10.5)) |
+--------------------------------------------
| POINT(56.7 10.5)
+------------------
```


\subsection*{14.16.7.3 LineString and MultiLineString Property Functions}

A LineString consists of Point values. You can extract particular points of a LineString, count the number of points that it contains, or obtain its length.

Some functions in this section also work for MultiLineString values.
Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If any argument is NULL or any geometry argument is an empty geometry, the return value is NULL.
- If any geometry argument is not a syntactically well-formed geometry, an ER_GIS_INVALID_DATA error occurs.
- If any geometry argument is a syntactically well-formed geometry in an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- Otherwise, the return value is non-NULL.

These functions are available for obtaining linestring properties:
- ST_EndPoint(ls)

Returns the Point that is the endpoint of the LineString value $1 s$.
ST_EndPoint ( ) handles its arguments as described in the introduction to this section.
```
mysql> SET @ls = 'LineString(1 1,2 2,3 3)';
mysql> SELECT ST_AsText(ST_EndPoint(ST_GeomFromText(@ls)));
+-------------------------------------------------
| ST_AsText(ST_EndPoint(ST_GeomFromText(@ls))) |
+-------------------------------------------------
| POINT(3 3)
+-----------
```

- ST_IsClosed(ls)

For a LineString value ls, ST_IsClosed() returns 1 if ls is closed (that is, its ST_StartPoint() and ST_EndPoint() values are the same).

For a MultiLineString value ls, ST_IsClosed() returns 1 if ls is closed (that is, the ST_StartPoint() and ST_EndPoint() values are the same for each LineString in 1s).

ST_IsClosed() returns 0 if $1 s$ is not closed, and NULL if $1 s$ is NULL.
ST_IsClosed ( ) handles its arguments as described in the introduction to this section, with this exception:
- If the geometry has an SRID value for a geographic spatial reference system (SRS), an ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS error occurs.
```
mysql> SET @ls1 = 'LineString(1 1,2 2,3 3,2 2)';
mysql> SET @ls2 = 'LineString(1 1,2 2,3 3,1 1)';
mysql> SELECT ST_IsClosed(ST_GeomFromText(@ls1));
+--------------------------------------+
| ST_IsClosed(ST_GeomFromText(@ls1)) |
+--------------------------------------+
| 0 |
+--------------------------------------+
mysql> SELECT ST_IsClosed(ST_GeomFromText(@ls2));
+--------------------------------------+
| ST_IsClosed(ST_GeomFromText(@ls2)) |
+--------------------------------------
| 1 |
+--------------------------------------+
mysql> SET @ls3 = 'MultiLineString((1 1,2 2,3 3),(4 4,5 5))';
mysql> SELECT ST_IsClosed(ST_GeomFromText(@ls3));
+--------------------------------------+
| ST_IsClosed(ST_GeomFromText(@ls3)) |
+--------------------------------------+
| 0 |
+--------------------------------------+
```

- ST_Length(ls [, unit])

Returns a double-precision number indicating the length of the LineString or MultiLineString value $l s$ in its associated spatial reference system. The length of a MultiLineString value is equal to the sum of the lengths of its elements.

ST_Length ( ) computes a result as follows:
- If the geometry is a valid LineString in a Cartesian SRS, the return value is the Cartesian length of the geometry.
- If the geometry is a valid MultiLineString in a Cartesian SRS, the return value is the sum of the Cartesian lengths of its elements.
- If the geometry is a valid LineString in a geographic SRS, the return value is the geodetic length of the geometry in that SRS, in meters.
- If the geometry is a valid MultiLineString in a geographic SRS, the return value is the sum of the geodetic lengths of its elements in that SRS, in meters.

ST_Length ( ) handles its arguments as described in the introduction to this section, with these exceptions:
- If the geometry is not a LineString or MultiLineString, the return value is NULL.
- If the geometry is geometrically invalid, either the result is an undefined length (that is, it can be any number), or an error occurs.
- If the length computation result is + inf, an ER_DATA_OUT_OF_RANGE error occurs.
- If the geometry has a geographic SRS with a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range ( -180 , 180], an

ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90,90], an

ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE error occurs.
Ranges shown are in degrees. The exact range limits deviate slightly due to floating-point arithmetic.

ST_Length ( ) permits an optional unit argument that specifies the linear unit for the returned length value. These rules apply:
- If a unit is specified but not supported by MySQL, an ER_UNIT_NOT_FOUND error occurs.
- If a supported linear unit is specified and the SRID is 0 , an ER_GEOMETRY_IN_UNKNOWN_LENGTH_UNIT error occurs.
- If a supported linear unit is specified and the SRID is not 0 , the result is in that unit.
- If a unit is not specified, the result is in the unit of the SRS of the geometries, whether Cartesian or geographic. Currently, all MySQL SRSs are expressed in meters.

A unit is supported if it is found in the INFORMATION_SCHEMA ST_UNITS_OF_MEASURE table. See Section 28.3.37, "The INFORMATION_SCHEMA ST_UNITS_OF_MEASURE Table".
```
mysql> SET @ls = ST_GeomFromText('LineString(1 1,2 2,3 3)');
mysql> SELECT ST_Length(@ls);
+---------------------+
| ST_Length(@ls) |
```

```
+---------------------+
| 2.8284271247461903 |
+---------------------+
mysql> SET @mls = ST_GeomFromText('MultiLineString((1 1,2 2,3 3),(4 4,5 5))');
mysql> SELECT ST_Length(@mls);
+--------------------+
| ST_Length(@mls) |
+--------------------+
| 4.242640687119286 |
+--------------------+
mysql> SET @ls = ST_GeomFromText('LineString(1 1,2 2,3 3)', 4326);
mysql> SELECT ST_Length(@ls);
+--------------------+
| ST_Length(@ls) |
+--------------------+
| 313701.9623204328
+-------------------+
mysql> SELECT ST_Length(@ls, 'metre');
+---------------------------+
| ST_Length(@ls, 'metre') |
+---------------------------+
| 313701.9623204328 |
+---------------------------+
mysql> SELECT ST_Length(@ls, 'foot');
+-------------------------+
| ST_Length(@ls, 'foot') |
+-------------------------+
| 1029205.9131247795 |
+-------------------------+
```

- ST_NumPoints(ls)

Returns the number of Point objects in the LineString value ls.
ST_NumPoints() handles its arguments as described in the introduction to this section.
```
mysql> SET @ls = 'LineString(1 1,2 2,3 3)';
mysql> SELECT ST_NumPoints(ST_GeomFromText(@ls));
+--------------------------------------+
| ST_NumPoints(ST_GeomFromText(@ls)) |
+--------------------------------------+
| 3 |
+--------------------------------------+
```

- ST_PointN(ls, N)

Returns the $N$-th Point in the Linestring value ls. Points are numbered beginning with 1.
ST_PointN( ) handles its arguments as described in the introduction to this section.
```
mysql> SET @ls = 'LineString(1 1,2 2,3 3)';
mysql> SELECT ST_AsText(ST_PointN(ST_GeomFromText(@ls),2));
+------------------------------------------------
| ST_AsText(ST_PointN(ST_GeomFromText(@ls),2)) |
+-------------------------------------------------
| POINT(2 2)
```

- ST_StartPoint(ls)

Returns the Point that is the start point of the LineString value ls.
ST_StartPoint() handles its arguments as described in the introduction to this section.
```
mysql> SET @ls = 'LineString(1 1,2 2,3 3)';
mysql> SELECT ST_AsText(ST_StartPoint(ST_GeomFromText(@ls)));
+--------------------------------------------------+
| ST_AsText(ST_StartPoint(ST_GeomFromText(@ls))) |
```

```
+--------------------------------------------------+
+--------------------------------------------------
```


\subsection*{14.16.7.4 Polygon and MultiPolygon Property Functions}

Functions in this section return properties of Polygon or MultiPolygon values.
Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If any argument is NULL or any geometry argument is an empty geometry, the return value is NULL.
- If any geometry argument is not a syntactically well-formed geometry, an ER_GIS_INVALID_DATA error occurs.
- If any geometry argument is a syntactically well-formed geometry in an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- For functions that take multiple geometry arguments, if those arguments are not in the same SRS, an ER_GIS_DIFFERENT_SRIDS error occurs.
- Otherwise, the return value is non-NULL.

These functions are available for obtaining polygon properties:
- ST_Area(\{poly|mpoly\})

Returns a double-precision number indicating the area of the Polygon or MultiPolygon argument, as measured in its spatial reference system.

ST_Area( ) handles its arguments as described in the introduction to this section, with these exceptions:
- If the geometry is geometrically invalid, either the result is an undefined area (that is, it can be any number), or an error occurs.
- If the geometry is valid but is not a Polygon or MultiPolygon object, an ER_UNEXPECTED_GEOMETRY_TYPE error occurs.
- If the geometry is a valid Polygon in a Cartesian SRS, the result is the Cartesian area of the polygon.
- If the geometry is a valid MultiPolygon in a Cartesian SRS, the result is the sum of the Cartesian area of the polygons.
- If the geometry is a valid Polygon in a geographic SRS, the result is the geodetic area of the polygon in that SRS, in square meters.
- If the geometry is a valid MultiPolygon in a geographic SRS, the result is the sum of geodetic area of the polygons in that SRS, in square meters.
- If an area computation results in +inf, an ER_DATA_OUT_OF_RANGE error occurs.
- If the geometry has a geographic SRS with a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range (-180, 180], an ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90,90], an ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE error occurs.

Ranges shown are in degrees. The exact range limits deviate slightly due to floating-point arithmetic.
```
mysql> SET @poly =
    'Polygon((0 0,0 3,3 0,0 0),(1 1,1 2,2 1,1 1))';
mysql> SELECT ST_Area(ST_GeomFromText(@poly));
+-----------------------------------+
| ST_Area(ST_GeomFromText(@poly)) |
+----------------------------------+
| 4 |
+----------------------------------+
mysql> SET @mpoly =
    'MultiPolygon(((0 0,0 3,3 3,3 0,0 0),(1 1,1 2,2 2,2 1,1 1)))';
mysql> SELECT ST_Area(ST_GeomFromText(@mpoly));
+------------------------------------+
| ST_Area(ST_GeomFromText(@mpoly)) |
+------------------------------------+
| 8 |
+------------------------------------+
```

- ST_Centroid(\{poly|mpoly\})

Returns the mathematical centroid for the Polygon or MultiPolygon argument as a Point. The result is not guaranteed to be on the MultiPolygon.

This function processes geometry collections by computing the centroid point for components of highest dimension in the collection. Such components are extracted and made into a single MultiPolygon, MultiLineString, or MultiPoint for centroid computation.

ST_Centroid( ) handles its arguments as described in the introduction to this section, with these exceptions:
- The return value is NULL for the additional condition that the argument is an empty geometry collection.
- If the geometry has an SRID value for a geographic spatial reference system (SRS), an ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS error occurs.
```
mysql> SET @poly =
    ST_GeomFromText('POLYGON((0 0,10 0,10 10,0 10,0 0),(5 5,7 5,7 7,5 7,5 5))');
mysql> SELECT ST_GeometryType(@poly),ST_AsText(ST_Centroid(@poly));
+-------------------------+----------------------------------------------
| ST_GeometryType(@poly) | ST_AsText(ST_Centroid(@poly)) |
+-------------------------+----------------------------------------------
| POLYGON | POINT(4.958333333333333 4.958333333333333) |
+--------------------------+----------------------------------------------
```

- ST_ExteriorRing(poly)

Returns the exterior ring of the Polygon value poly as a LineString.
ST_ExteriorRing ( ) handles its arguments as described in the introduction to this section.
```
mysql> SET @poly =
    'Polygon((0 0,0 3,3 3,3 0,0 0),(1 1,1 2,2 2,2 1,1 1))';
mysql> SELECT ST_AsText(ST_ExteriorRing(ST_GeomFromText(@poly)));
+-------------------------------------------------------
| ST_AsText(ST_ExteriorRing(ST_GeomFromText(@poly))) |
+--------------------------------------------------------
| LINESTRING(0 0,0 3,3 3,3 0,0 0) |
+------------------------------------------------------
```

- ST_InteriorRingN(poly, N)

Returns the $N$-th interior ring for the Polygon value poly as a LineString. Rings are numbered beginning with 1 .

ST_InteriorRingN( ) handles its arguments as described in the introduction to this section.
```
mysql> SET @poly =
    'Polygon((0 0,0 3,3 3,3 0,0 0),(1 1,1 2,2 2,2 1,1 1))';
mysql> SELECT ST_AsText(ST_InteriorRingN(ST_GeomFromText(@poly),1));
+----------------------------------------------------------
| ST_AsText(ST_InteriorRingN(ST_GeomFromText(@poly),1)) |
+----------------------------------------------------------
| LINESTRING(1 1,1 2,2 2,2 1,1 1) |
+----------------------------------------------------------
```

- ST_NumInteriorRing(poly), ST_NumInteriorRings(poly)

Returns the number of interior rings in the Polygon value poly.
ST_NumInteriorRing() and ST_NuminteriorRings() handle their arguments as described in the introduction to this section.
```
mysql> SET @poly =
    'Polygon((0 0,0 3,3 3,3 0,0 0),(1 1,1 2,2 2,2 1,1 1))';
mysql> SELECT ST_NumInteriorRings(ST_GeomFromText(@poly));
+-----------------------------------------------+
| ST_NumInteriorRings(ST_GeomFromText(@poly)) |
+-----------------------------------------------
| 1 |
+------------------------------------------------
```


\subsection*{14.16.7.5 GeometryCollection Property Functions}

These functions return properties of GeometryCollection values.
Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If any argument is NULL or any geometry argument is an empty geometry, the return value is NULL.
- If any geometry argument is not a syntactically well-formed geometry, an ER_GIS_INVALID_DATA error occurs.
- If any geometry argument is a syntactically well-formed geometry in an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- Otherwise, the return value is non-NULL.

These functions are available for obtaining geometry collection properties:
- ST_GeometryN(gc, N)

Returns the $N$-th geometry in the GeometryCollection value $g c$. Geometries are numbered beginning with 1 .

ST_GeometryN( ) handles its arguments as described in the introduction to this section.
```
mysql> SET @gc = 'GeometryCollection(Point(1 1),LineString(2 2, 3 3))';
mysql> SELECT ST_AsText(ST_GeometryN(ST_GeomFromText(@gc),1));
+-----------------------------------------------------
| ST_AsText(ST_GeometryN(ST_GeomFromText(@gc),1)) |
+----------------------------------------------------
| POINT(1 1) |
+-----------------------------------------------------
```

- ST_NumGeometries(gc)

Returns the number of geometries in the GeometryCollection value gc.
ST_NumGeometries( ) handles its arguments as described in the introduction to this section.
```
mysql> SET @gc = 'GeometryCollection(Point(1 1),LineString(2 2, 3 3))';
mysql> SELECT ST_NumGeometries(ST_GeomFromText(@gc));
+------------------------------------------+
| ST_NumGeometries(ST_GeomFromText(@gc)) |
+------------------------------------------+
| 2 |
+------------------------------------------+
```


\subsection*{14.16.8 Spatial Operator Functions}

OpenGIS proposes a number of functions that can produce geometries. They are designed to implement spatial operators. These functions support all argument type combinations except those that are inapplicable according to the Open Geospatial Consortium specification.

MySQL also implements certain functions that are extensions to OpenGIS, as noted in the function descriptions. In addition, Section 14.16.7, "Geometry Property Functions", discusses several functions that construct new geometries from existing ones. See that section for descriptions of these functions:
- ST_Envelope(g)
- ST_StartPoint(ls)
- ST_EndPoint(ls)
- ST_PointN(ls, N)
- ST_ExteriorRing(poly)
- ST_InteriorRingN(poly, N)
- ST_GeometryN(gc, N)

Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If any argument is NULL, the return value is NULL.
- If any geometry argument is not a syntactically well-formed geometry, an ER_GIS_INVALID_DATA error occurs.
- If any geometry argument is a syntactically well-formed geometry in an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- For functions that take multiple geometry arguments, if those arguments are not in the same SRS, an ER_GIS_DIFFERENT_SRIDS error occurs.
- If any geometry argument has an SRID value for a geographic SRS and the function does not handle geographic geometries, an ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS error occurs.
- For geographic SRS geometry arguments, if any argument has a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range ( -180 , 180], an ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90,90], an

ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE error occurs.
Ranges shown are in degrees. If an SRS uses another unit, the range uses the corresponding values in its unit. The exact range limits deviate slightly due to floating-point arithmetic.
- Otherwise, the return value is non-NULL.

These spatial operator functions are available:
- ST_Buffer(g, d [, strategy1 [, strategy2 [, strategy3]]]))

Returns a geometry that represents all points whose distance from the geometry value $g$ is less than or equal to a distance of $d$. The result is in the same SRS as the geometry argument.

If the geometry argument is empty, ST_Buffer ( ) returns an empty geometry.
If the distance is 0, ST_Buffer ( ) returns the geometry argument unchanged:
```
mysql> SET @pt = ST_GeomFromText('POINT(0 0)');
mysql> SELECT ST_AsText(ST_Buffer(@pt, 0));
+--------------------------------+
| ST_AsText(ST_Buffer(@pt, 0)) |
+-------------------------------+
| POINT(0 0) |
+-------------------------------+
```


If the geometry argument is in a Cartesian SRS:
- ST_Buffer() supports negative distances for Polygon and MultiPolygon values, and for geometry collections containing Polygon or MultiPolygon values.
- If the result is reduced so much that it disappears, the result is an empty geometry.
- An ER_WRONG_ARGUMENTS error occurs for ST_Buffer ( ) with a negative distance for Point, MultiPoint, LineString, and MultiLineString values, and for geometry collections not containing any Polygon or MultiPolygon values.

Point geometries in a geographic SRS are permitted, subject to the following conditions:
- If the distance is not negative and no strategies are specified, the function returns the geographic buffer of the Point in its SRS. The distance argument must be in the SRS distance unit (currently always meters).
- If the distance is negative or any strategy (except NULL) is specified, an ER_WRONG_ARGUMENTS error occurs.

For non-Point geometries, an ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS error occurs.
ST_Buffer ( ) permits up to three optional strategy arguments following the distance argument.
Strategies influence buffer computation. These arguments are byte string values produced by the ST_Buffer_Strategy( ) function, to be used for point, join, and end strategies:
- Point strategies apply to Point and MultiPoint geometries. If no point strategy is specified, the default is ST_Buffer_Strategy('point_circle', 32).
- Join strategies apply to LineString, MultiLineString, Polygon, and MultiPolygon geometries. If no join strategy is specified, the default is ST_Buffer_Strategy('join_round', 32).
- End strategies apply to LineString and MultiLineString geometries. If no end strategy is specified, the default is ST_Buffer_Strategy ( 'end_round ', 32).

Up to one strategy of each type may be specified, and they may be given in any order.
If the buffer strategies are invalid, an ER_WRONG_ARGUMENTS error occurs. Strategies are invalid under any of these circumstances:
- Multiple strategies of a given type (point, join, or end) are specified.
- A value that is not a strategy (such as an arbitrary binary string or a number) is passed as a strategy.
- A Point strategy is passed and the geometry contains no Point or MultiPoint values.
- An end or join strategy is passed and the geometry contains no LineString, Polygon, MultiLinestring or MultiPolygon values.
```
mysql> SET @pt = ST_GeomFromText('POINT(0 0)');
mysql> SET @pt_strategy = ST_Buffer_Strategy('point_square');
mysql> SELECT ST_AsText(ST_Buffer(@pt, 2, @pt_strategy));
+----------------------------------------------+
| ST_AsText(ST_Buffer(@pt, 2, @pt_strategy)) |
+-----------------------------------------------
| POLYGON((-2 -2,2 -2,2 2,-2 2,-2 -2))
+-----------------------------------------------
```

```
mysql> SET @ls = ST_GeomFromText('LINESTRING(0 0,0 5,5 5)');
mysql> SET @end_strategy = ST_Buffer_Strategy('end_flat');
mysql> SET @join_strategy = ST_Buffer_Strategy('join_round', 10);
mysql> SELECT ST_AsText(ST_Buffer(@ls, 5, @end_strategy, @join_strategy))
+------------------------------------------------------------------
| ST_AsText(ST_Buffer(@ls, 5, @end_strategy, @join_strategy)) |
+--------------------------------------------------------------------
| POLYGON((5 5,5 10,0 10,-3.5355339059327373 8.535533905932738, |
| -5 5,-5 0,0 0,5 0,5 5)) |
```

- ST_Buffer_Strategy(strategy [, points_per_circle])

This function returns a strategy byte string for use with ST_Buffer ( ) to influence buffer computation.

Information about strategies is available at Boost.org.
The first argument must be a string indicating a strategy option:
- For point strategies, permitted values are 'point_circle' and 'point_square'.
- For join strategies, permitted values are 'join_round' and 'join_miter'.
- For end strategies, permitted values are 'end_round ' and 'end_flat'.

If the first argument is 'point_circle', 'join_round', 'join_miter', or'end_round', the points_per_circle argument must be given as a positive numeric value. The maximum points_per_circle value is the value of the max_points_in_geometry system variable.

For examples, see the description of ST_Buffer ( ).
ST_Buffer_Strategy( ) handles its arguments as described in the introduction to this section, with these exceptions:
- If any argument is invalid, an ER_WRONG_ARGUMENTS error occurs.
- If the first argument is 'point_square' or 'end_flat', the points_per_circle argument must not be given or an ER_WRONG_ARGUMENTS error occurs.

\section*{- ST_ConvexHull(g)}

Returns a geometry that represents the convex hull of the geometry value $g$.
This function computes a geometry's convex hull by first checking whether its vertex points are colinear. The function returns a linear hull if so, a polygon hull otherwise. This function processes
geometry collections by extracting all vertex points of all components of the collection, creating a MultiPoint value from them, and computing its convex hull.

ST_ConvexHull( ) handles its arguments as described in the introduction to this section, with this exception:
- The return value is NULL for the additional condition that the argument is an empty geometry collection.
```
mysql> SET @g = 'MULTIPOINT(5 0,25 0,15 10,15 25)';
mysql> SELECT ST_AsText(ST_ConvexHull(ST_GeomFromText(@g)));
+--------------------------------------------------
| ST_AsText(ST_ConvexHull(ST_GeomFromText(@g))) |
+---------------------------------------------------
| POLYGON((5 0,25 0,15 25,5 0)) |
+--------------------------------------------------
```

- ST_Difference(g1, g2)

Returns a geometry that represents the point set difference of the geometry values $g 1$ and $g 2$. The result is in the same SRS as the geometry arguments.

ST_Difference( ) permits arguments in either a Cartesian or a geographic SRS, and handles its arguments as described in the introduction to this section.
```
mysql> SET @g1 = Point(1,1), @g2 = Point(2,2);
mysql> SELECT ST_AsText(ST_Difference(@g1, @g2));
+--------------------------------------+
| ST_AsText(ST_Difference(@g1, @g2)) |
+--------------------------------------+
| POINT(1 1) |
+--------------------------------------+
```

- ST_Intersection(g1, g2)

Returns a geometry that represents the point set intersection of the geometry values $g 1$ and $g 2$. The result is in the same SRS as the geometry arguments.

ST_Intersection( ) permits arguments in either a Cartesian or a geographic SRS, and handles its arguments as described in the introduction to this section.
```
mysql> SET @g1 = ST_GeomFromText('LineString(1 1, 3 3)');
mysql> SET @g2 = ST_GeomFromText('LineString(1 3, 3 1)');
mysql> SELECT ST_AsText(ST_Intersection(@g1, @g2));
+----------------------------------------+
| ST_AsText(ST_Intersection(@g1, @g2)) |
+----------------------------------------+
| POINT(2 2) |
+----------------------------------------+
```

- ST_LineInterpolatePoint(ls, fractional_distance)

This function takes a LineString geometry and a fractional distance in the range [0.0, 1.0] and returns the Point along the LineString at the given fraction of the distance from its start point to
its endpoint. It can be used to answer questions such as which Point lies halfway along the road described by the geometry argument.

The function is implemented for LineString geometries in all spatial reference systems, both Cartesian and geographic.

If the fractional_distance argument is 1.0 , the result may not be exactly the last point of the LineString argument but a point close to it due to numerical inaccuracies in approximate-value computations.

A related function, ST_LineInterpolatePoints(), takes similar arguments but returns a MultiPoint consisting of Point values along the LineString at each fraction of the distance from its start point to its endpoint. For examples of both functions, see the ST_LineInterpolatePoints() description.

ST_LineInterpolatePoint ( ) handles its arguments as described in the introduction to this section, with these exceptions:
- If the geometry argument is not a LineString, an ER_UNEXPECTED_GEOMETRY_TYPE error occurs.
- If the fractional distance argument is outside the range [0.0, 1.0], an ER_DATA_OUT_OF_RANGE error occurs.

ST_LineInterpolatePoint ( ) is a MySQL extension to OpenGIS.
- ST_LineInterpolatePoints(ls, fractional_distance)

This function takes a LineString geometry and a fractional distance in the range (0.0, 1.0] and returns the MultiPoint consisting of the LineString start point, plus Point values along the LineString at each fraction of the distance from its start point to its endpoint. It can be used to answer questions such as which Point values lie every $10 \%$ of the way along the road described by the geometry argument.

The function is implemented for LineString geometries in all spatial reference systems, both Cartesian and geographic.

If the fractional_distance argument divides 1.0 with zero remainder the result may not contain the last point of the LineString argument but a point close to it due to numerical inaccuracies in approximate-value computations.

A related function, ST_LineInterpolatePoint( ), takes similar arguments but returns the Point along the LineString at the given fraction of the distance from its start point to its endpoint.

ST_LineInterpolatePoints() handles its arguments as described in the introduction to this section, with these exceptions:
- If the geometry argument is not a LineString, an ER_UNEXPECTED_GEOMETRY_TYPE error occurs.
- If the fractional distance argument is outside the range [0.0, 1.0], an ER_DATA_OUT_OF_RANGE error occurs.
```
mysql> SET @ls1 = ST_GeomFromText('LINESTRING(0 0,0 5,5 5)');
mysql> SELECT ST_AsText(ST_LineInterpolatePoint(@ls1, .5));
+------------------------------------------------+
| ST_AsText(ST_LineInterpolatePoint(@ls1, .5)) |
+-------------------------------------------------
| POINT(0 5)
+------------
mysql> SELECT ST_AsText(ST_LineInterpolatePoint(@ls1, .75));
+--------------------------------------------------
| ST_AsText(ST_LineInterpolatePoint(@ls1, .75)) |
```

```
+--------------------------------------------------
| POINT(2.5 5) |
+-------------------------------------------------+
mysql> SELECT ST_AsText(ST_LineInterpolatePoint(@ls1, 1));
+------------------------------------------------
| ST_AsText(ST_LineInterpolatePoint(@ls1, 1)) |
+-------------------------------------------------
| POINT(5 5) |
+------------------------------------------------
mysql> SELECT ST_AsText(ST_LineInterpolatePoints(@ls1, .25));
+----------------------------------------------------
| ST_AsText(ST_LineInterpolatePoints(@ls1, .25)) |
+--------------------------------------------------
| MULTIPOINT((0 2.5),(0 5),(2.5 5),(5 5)) |
+--------------------------------------------------
```


ST_LineInterpolatePoints() is a MySQL extension to OpenGIS.
- ST_PointAtDistance(ls, distance)

This function takes a LineString geometry and a distance in the range [0.0, ST_Length (ls)] measured in the unit of the spatial reference system (SRS) of the LineString, and returns the Point along the LineString at that distance from its start point. It can be used to answer questions such as which Point value is 400 meters from the start of the road described by the geometry argument.

The function is implemented for LineString geometries in all spatial reference systems, both Cartesian and geographic.

ST_PointAtDistance( ) handles its arguments as described in the introduction to this section, with these exceptions:
- If the geometry argument is not a LineString, an ER_UNEXPECTED_GEOMETRY_TYPE error occurs.
- If the fractional distance argument is outside the range [0.0, ST_Length( ls)], an ER_DATA_OUT_OF_RANGE error occurs.

ST_PointAtDistance( ) is a MySQL extension to OpenGIS.
- ST_SymDifference(g1, g2)

Returns a geometry that represents the point set symmetric difference of the geometry values $g 1$ and $g 2$, which is defined as:
```
g1 symdifference g2 := (g1 union g2) difference (g1 intersection g2)
```


Or, in function call notation:
```
ST_SymDifference(g1, g2) = ST_Difference(ST_Union(g1, g2), ST_Intersection(g1, g2))
```


The result is in the same SRS as the geometry arguments.
ST_SymDifference( ) permits arguments in either a Cartesian or a geographic SRS, and handles its arguments as described in the introduction to this section.
```
mysql> SET @g1 = ST_GeomFromText('MULTIPOINT(5 0,15 10,15 25)');
mysql> SET @g2 = ST_GeomFromText('MULTIPOINT(1 1,15 10,15 25)');
mysql> SELECT ST_AsText(ST_SymDifference(@g1, @g2));
+----------------------------------------+
| ST_AsText(ST_SymDifference(@g1, @g2)) |
+----------------------------------------+
| MULTIPOINT((1 1),(5 0)) |
+-----------------------------------------
```

- ST_Transform(g, target_srid)

Transforms a geometry from one spatial reference system (SRS) to another. The return value is a geometry of the same type as the input geometry with all coordinates transformed to the target SRID, target_srid. MySQL supports all SRSs defined by EPSG except for those listed here:
- EPSG 1042 Krovak Modified
- EPSG 1043 Krovak Modified (North Orientated)
- EPSG 9816 Tunisia Mining Grid
- EPSG 9826 Lambert Conic Conformal (West Orientated)

ST_Transform( ) handles its arguments as described in the introduction to this section, with these exceptions:
- Geometry arguments that have an SRID value for a geographic SRS do not produce an error.
- If the geometry or target SRID argument has an SRID value that refers to an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- If the geometry is in an SRS that ST_Transform( ) cannot transform from, an ER_TRANSFORM_SOURCE_SRS_NOT_SUPPORTED error occurs.
- If the target SRID is in an SRS that ST_Transform( ) cannot transform to, an ER_TRANSFORM_TARGET_SRS_NOT_SUPPORTED error occurs.
- If the geometry is in an SRS that is not WGS 84 and has no TOWGS84 clause, an ER_TRANSFORM_SOURCE_SRS_MISSING_TOWGS84 error occurs.
- If the target SRID is in an SRS that is not WGS 84 and has no TOWGS84 clause, an ER_TRANSFORM_TARGET_SRS_MISSING_TOWGS84 error occurs.

ST_SRID(g, target_srid) and ST_Transform(g, target_srid) differ as follows:
- ST_SRID( ) changes the geometry SRID value without transforming its coordinates.
- ST_Transform( ) transforms the geometry coordinates in addition to changing its SRID value.
```
mysql> SET @p = ST_GeomFromText('POINT(52.381389 13.064444)', 4326);
mysql> SELECT ST_AsText(@p);
+-----------------------------+
| ST_AsText(@p) |
+------------------------------+
| POINT(52.381389 13.064444) |
+------------------------------+
mysql> SET @p = ST_Transform(@p, 4230);
mysql> SELECT ST_AsText(@p);
+-----------------------------------------------
| ST_AsText(@p) |
+------------------------------------------------
| POINT(52.38208611407426 13.065520672345304) |
+-----------------------------------------------
```

- ST_Union(g1, g2)

Returns a geometry that represents the point set union of the geometry values $g 1$ and $g 2$. The result is in the same SRS as the geometry arguments.

ST_Union( ) permits arguments in either a Cartesian or a geographic SRS, and handles its arguments as described in the introduction to this section.
```
mysql> SET @g1 = ST_GeomFromText('LineString(1 1, 3 3)');
mysql> SET @g2 = ST_GeomFromText('LineString(1 3, 3 1)');
mysql> SELECT ST_AsText(ST_Union(@g1, @g2));
```

```
+----------------------------------------+
| ST_AsText(ST_Union(@g1, @g2)) |
+----------------------------------------+
| MULTILINESTRING((1 1,3 3),(1 3,3 1)) |
+----------------------------------------+
```


\subsection*{14.16.9 Functions That Test Spatial Relations Between Geometry Objects}

The functions described in this section take two geometries as arguments and return a qualitative or quantitative relation between them.

MySQL implements two sets of functions using function names defined by the OpenGIS specification. One set tests the relationship between two geometry values using precise object shapes, the other set uses object minimum bounding rectangles (MBRs).

\subsection*{14.16.9.1 Spatial Relation Functions That Use Object Shapes}

The OpenGIS specification defines the following functions to test the relationship between two geometry values $g 1$ and $g 2$, using precise object shapes. The return values 1 and 0 indicate true and false, respectively, except that distance functions return distance values.

Functions in this section detect arguments in either Cartesian or geographic spatial reference systems (SRSs), and return results appropriate to the SRS.

Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If any argument is NULL or any geometry argument is an empty geometry, the return value is NULL.
- If any geometry argument is not a syntactically well-formed geometry, an ER_GIS_INVALID_DATA error occurs.
- If any geometry argument is a syntactically well-formed geometry in an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- For functions that take multiple geometry arguments, if those arguments are not in the same SRS, an ER_GIS_DIFFERENT_SRIDS error occurs.
- If any geometry argument is geometrically invalid, either the result is true or false (it is undefined which), or an error occurs.
- For geographic SRS geometry arguments, if any argument has a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range ( -180 , 180], an ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90,90], an ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE error occurs.

Ranges shown are in degrees. If an SRS uses another unit, the range uses the corresponding values in its unit. The exact range limits deviate slightly due to floating-point arithmetic.
- Otherwise, the return value is non-NULL.

Some functions in this section permit a unit argument that specifies the length unit for the return value. Unless otherwise specified, functions handle their unit argument as follows:
- A unit is supported if it is found in the INFORMATION_SCHEMA ST_UNITS_OF_MEASURE table. See Section 28.3.37, "The INFORMATION_SCHEMA ST_UNITS_OF_MEASURE Table".
- If a unit is specified but not supported by MySQL, an ER_UNIT_NOT_FOUND error occurs.
- If a supported linear unit is specified and the SRID is 0 , an ER_GEOMETRY_IN_UNKNOWN_LENGTH_UNIT error occurs.
- If a supported linear unit is specified and the SRID is not 0 , the result is in that unit.
- If a unit is not specified, the result is in the unit of the SRS of the geometries, whether Cartesian or geographic. Currently, all MySQL SRSs are expressed in meters.

These object-shape functions are available for testing geometry relationships:
- ST_Contains(g1, g2)

Returns 1 or 0 to indicate whether $g 1$ completely contains $g 2$ (this means that $g 1$ and $g 2$ must not intersect). This relationship is the inverse of that tested by ST_Within().

ST_Contains( ) handles its arguments as described in the introduction to this section.
```
mysql> SET @g1 = ST_GeomFromText('Polygon((0 0,0 3,3 3,3 0,0 0))'),
    -> @p1 = ST_GeomFromText('Point(1 1)'),
    -> @p2 = ST_GeomFromText('Point(3 3)'),
    -> @p3 = ST_GeomFromText('Point(5 5)');
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT
    -> ST_Contains(@g1, @p1), ST_Within(@p1, @g1),
    -> ST_Disjoint(@g1, @p1), ST_Intersects(@g1, @p1)\G
*************************** 1. row ***************************************
    ST_Contains(@g1, @p1): 1
        ST_Within(@p1, @g1): 1
    ST_Disjoint(@g1, @p1): 0
ST_Intersects(@g1, @p1): 1
1 row in set (0.00 sec)
mysql> SELECT
        -> ST_Contains(@g1, @p2), ST_Within(@p2, @g1),
        -> ST_Disjoint(@g1, @p2), ST_Intersects(@g1, @p2)\G
*************************** 1. row ***************************************
    ST_Contains(@g1, @p2): 0
        ST_Within(@p2, @g1): 0
    ST_Disjoint(@g1, @p2): 0
ST_Intersects(@g1, @p2): 1
1 row in set (0.00 sec)
mysql>
        -> SELECT
        -> ST_Contains(@g1, @p3), ST_Within(@p3, @g1),
        -> ST_Disjoint(@g1, @p3), ST_Intersects(@g1, @p3)\G
************************** 1. row *****************************************
    ST_Contains(@g1, @p3): 0
        ST_Within(@p3, @g1): 0
    ST_Disjoint(@g1, @p3): 1
ST_Intersects(@g1, @p3): 0
1 row in set (0.00 sec)
```

- ST_Crosses(g1, g2)

Two geometries spatially cross if their spatial relation has the following properties:
- Unless $g 1$ and $g 2$ are both of dimension 1 : $g 1$ crosses $g 2$ if the interior of $g 2$ has points in common with the interior of $g 1$, but $g 2$ does not cover the entire interior of $g 1$.
- If both $g 1$ and $g 2$ are of dimension 1 : If the lines cross each other in a finite number of points (that is, no common line segments, only single points in common).

This function returns 1 or 0 to indicate whether $g 1$ spatially crosses $g 2$.
ST_Crosses( ) handles its arguments as described in the introduction to this section except that the return value is NULL for these additional conditions:
- $g 1$ is of dimension 2 (Polygon or MultiPolygon).
- $g 2$ is of dimension 1 (Point or MultiPoint).
- ST_Disjoint(g1, g2)

Returns 1 or 0 to indicate whether $g 1$ is spatially disjoint from (does not intersect) $g 2$.
ST_Disjoint ( ) handles its arguments as described in the introduction to this section.
- ST_Distance(g1, g2 [, unit])

Returns the distance between $g 1$ and $g 2$, measured in the length unit of the spatial reference system (SRS) of the geometry arguments, or in the unit of the optional unit argument if that is specified.

This function processes geometry collections by returning the shortest distance among all combinations of the components of the two geometry arguments.

ST_Distance( ) handles its geometry arguments as described in the introduction to this section, with these exceptions:
- ST_Distance( ) detects arguments in a geographic (ellipsoidal) spatial reference system and returns the geodetic distance on the ellipsoid. ST_Distance( ) supports distance calculations for geographic SRS arguments of all geometry types.
- If any argument is geometrically invalid, either the result is an undefined distance (that is, it can be any number), or an error occurs.
- If an intermediate or final result produces NaN or a negative number, an ER_GIS_INVALID_DATA error occurs.

ST_Distance( ) permits specifying the linear unit for the returned distance value with an optional unit argument which ST_Distance( ) handles as described in the introduction to this section.
```
mysql> SET @g1 = ST_GeomFromText('POINT(1 1)');
mysql> SET @g2 = ST_GeomFromText('POINT(2 2)');
mysql> SELECT ST_Distance(@g1, @g2);
+------------------------+
| ST_Distance(@g1, @g2) |
+-------------------------+
| 1.4142135623730951 |
+-------------------------+
mysql> SET @g1 = ST_GeomFromText('POINT(1 1)', 4326);
mysql> SET @g2 = ST_GeomFromText('POINT(2 2)', 4326);
mysql> SELECT ST_Distance(@g1, @g2);
+------------------------+
| ST_Distance(@g1, @g2) |
+------------------------+
| 156874.3859490455 |
+-------------------------+
mysql> SELECT ST_Distance(@g1, @g2, 'metre');
+-----------------------------------+
| ST_Distance(@g1, @g2, 'metre') |
+---------------------------------+
| 156874.3859490455 |
+---------------------------------+
mysql> SELECT ST_Distance(@g1, @g2, 'foot');
+--------------------------------+
| ST_Distance(@g1, @g2, 'foot') |
+---------------------------------+
| 514679.7439273146 |
+--------------------------------+
```


For the special case of distance calculations on a sphere, see the ST_Distance_Sphere( ) function.
```
- ST_Equals(g1, g2)
```


Returns 1 or 0 to indicate whether $g 1$ is spatially equal to $g 2$.
ST_Equals( ) handles its arguments as described in the introduction to this section, except that it does not return NULL for empty geometry arguments.
```
mysql> SET @g1 = Point(1,1), @g2 = Point(2,2);
mysql> SELECT ST_Equals(@g1, @g1), ST_Equals(@g1, @g2);
+----------------------+---------------------+
| ST_Equals(@g1, @g1) | ST_Equals(@g1, @g2) |
+----------------------+----------------------+
| +----------------------+---------------------+
```

- ST_FrechetDistance(g1, g2 [, unit])

Returns the discrete Fréchet distance between two geometries, reflecting how similar the geometries are. The result is a double-precision number measured in the length unit of the spatial reference system (SRS) of the geometry arguments, or in the length unit of the unit argument if that argument is given.

This function implements the discrete Fréchet distance, which means it is restricted to distances between the points of the geometries. For example, given two LineString arguments, only the points explicitly mentioned in the geometries are considered. Points on the line segments between these points are not considered.

ST_FrechetDistance( ) handles its geometry arguments as described in the introduction to this section, with these exceptions:
- The geometries may have a Cartesian or geographic SRS, but only LineString values are supported. If the arguments are in the same Cartesian or geographic SRS, but either is not a LineString, an ER_NOT_IMPLEMENTED_FOR_CARTESIAN_SRS or ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS error occurs, depending on the SRS type.

ST_FrechetDistance( ) handles its optional unit argument as described in the introduction to this section.
```
mysql> SET @ls1 = ST_GeomFromText('LINESTRING(0 0,0 5,5 5)');
mysql> SET @ls2 = ST_GeomFromText('LINESTRING(0 1,0 6,3 3,5 6)');
mysql> SELECT ST_FrechetDistance(@ls1, @ls2);
+---------------------------------+
| ST_FrechetDistance(@ls1, @ls2) |
+---------------------------------+
| 2.8284271247461903 |
+---------------------------------+
mysql> SET @ls1 = ST_GeomFromText('LINESTRING(0 0,0 5,5 5)', 4326);
mysql> SET @ls2 = ST_GeomFromText('LINESTRING(0 1,0 6,3 3,5 6)', 4326);
mysql> SELECT ST_FrechetDistance(@ls1, @ls2);
+---------------------------------+
| ST_FrechetDistance(@ls1, @ls2) |
+---------------------------------+
| 313421.1999416798 |
+---------------------------------+
mysql> SELECT ST_FrechetDistance(@ls1, @ls2, 'foot');
+------------------------------------------+
| ST_FrechetDistance(@ls1, @ls2, 'foot') |
+------------------------------------------+
| 1028284.7767115477 |
+------------------------------------------+
```

- ST_HausdorffDistance(g1, g2 [, unit])

Returns the discrete Hausdorff distance between two geometries, reflecting how similar the geometries are. The result is a double-precision number measured in the length unit of the spatial
reference system (SRS) of the geometry arguments, or in the length unit of the unit argument if that argument is given.

This function implements the discrete Hausdorff distance, which means it is restricted to distances between the points of the geometries. For example, given two LineString arguments, only the points explicitly mentioned in the geometries are considered. Points on the line segments between these points are not considered.

ST_HausdorffDistance( ) handles its geometry arguments as described in the introduction to this section, with these exceptions:
- If the geometry arguments are in the same Cartesian or geographic SRS, but are not in a supported combination, an ER_NOT_IMPLEMENTED_FOR_CARTESIAN_SRS or ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS error occurs, depending on the SRS type.
These combinations are supported:
- LineString and LineString
- Point and MultiPoint
- LineString and MultiLineString
- MultiPoint and MultiPoint
- MultiLineString and MultiLineString

ST_HausdorffDistance( ) handles its optional unit argument as described in the introduction to this section.
```
mysql> SET @ls1 = ST_GeomFromText('LINESTRING(0 0,0 5,5 5)');
mysql> SET @ls2 = ST_GeomFromText('LINESTRING(0 1,0 6,3 3,5 6)');
mysql> SELECT ST_HausdorffDistance(@ls1, @ls2);
+------------------------------------+
| ST_HausdorffDistance(@ls1, @ls2) |
+-----------------------------------+
| 1 |
+------------------------------------+
mysql> SET @ls1 = ST_GeomFromText('LINESTRING(0 0,0 5,5 5)', 4326);
mysql> SET @ls2 = ST_GeomFromText('LINESTRING(0 1,0 6,3 3,5 6)', 4326);
mysql> SELECT ST_HausdorffDistance(@ls1, @ls2);
+------------------------------------+
| ST_HausdorffDistance(@ls1, @ls2) |
+------------------------------------+
| 111319.49079326246 |
+------------------------------------+
mysql> SELECT ST_HausdorffDistance(@ls1, @ls2, 'foot');
+--------------------------------------------+
| ST_HausdorffDistance(@ls1, @ls2, 'foot') |
+-------------------------------------------+
| 365221.4264870815 |
+-------------------------------------------
```

- ST_Intersects(g1, g2)

Returns 1 or 0 to indicate whether $g 1$ spatially intersects $g 2$.
ST_Intersects() handles its arguments as described in the introduction to this section.
- ST_Overlaps(g1, g2)

Two geometries spatially overlap if they intersect and their intersection results in a geometry of the same dimension but not equal to either of the given geometries.

This function returns 1 or 0 to indicate whether $g 1$ spatially overlaps $g 2$.
ST_Overlaps( ) handles its arguments as described in the introduction to this section except that the return value is NULL for the additional condition that the dimensions of the two geometries are not equal.
- ST_Touches(g1, g2)

Two geometries spatially touch if their interiors do not intersect, but the boundary of one of the geometries intersects either the boundary or the interior of the other.

This function returns 1 or 0 to indicate whether $g 1$ spatially touches $g 2$.
ST_Touches( ) handles its arguments as described in the introduction to this section except that the return value is NULL for the additional condition that both geometries are of dimension 0 (Point or MultiPoint).
- ST_Within(g1, g2)

Returns 1 or 0 to indicate whether $g 1$ is spatially within $g 2$. This tests the opposite relationship as ST_Contains().

ST_Within( ) handles its arguments as described in the introduction to this section.

\subsection*{14.16.9.2 Spatial Relation Functions That Use Minimum Bounding Rectangles}

MySQL provides several MySQL-specific functions that test the relationship between minimum bounding rectangles (MBRs) of two geometries $g 1$ and $g 2$. The return values 1 and 0 indicate true and false, respectively.

The MBR (also known as the bounding box) for a two-dimensional geometry is the smallest rectangle which holds all points in the geometry, and so encloses the area between its greatest extents in both coordinate directions. In other words, it is the rectangle bounded by the points (min(x), min(y)), ( $\min (x), \max (y)),(\max (x), \max (y))$, and ( $\max (x), \min (y))$, where $\min ()$ and $\max ()$ represent the geometry's minimum and maximum $x$-coordinate or $y$-coordinate, respectively.

When speaking of relationships between geometries, it is important to distinguish between containment and covering, as described here:
- A geometry $g 1$ contains another geometry $g 2$ if and only if all points in $g 2$ are also in $g 1$, and their boundaries do not intersect. That is, all points (a, b) in $g 2$ must satisfy the conditions $\min (x)<a<\max (x)$ and min(y) < b < max(y). In this case, ST_Contains(g1, g2) and MBRContains(g1, g2) both return true, as does ST_Within(g2, g1).
- We say that $g 1$ covers $g 2$ if all points in $g 2$ are also in $g 1$, including any boundary points. That is, all points (a, b) in g2 must satisfy the conditions $\min (x)<=a<=\max (x)$ and $\min (y)<=b<=$ max(y). In this case, MBRCovers(g1, g2) and MBRCoveredBy(g2, g1) both return true.

Let us define a rectangle $g 1$ and points $p 1, p 2$, and $p 3$ using the SQL statements shown here:
```
SET
    @g1 = ST_GeomFromText('Polygon((0 0,0 3,3 3,3 0,0 0))'),
    @p1 = ST_GeomFromText('Point(1 1)'),
    @p2 = ST_GeomFromText('Point(3 3)'),
    @p3 = ST_GeomFromText('Point(5 5)');
```

$g 1$ contains and covers $p 1 ; p 1$ is entirely within $g 1$ and does not touch any of its boundaries, as we can see from the SELECT statement shown here:
```
mysql> SELECT
        -> ST_Contains(@g1, @p1), ST_Within(@p1, @g1),
        -> MBRContains(@g1, @p1),
        -> MBRCovers(@g1, @p1), MBRCoveredBy(@p1, @g1),
        -> ST_Disjoint(@g1, @p1), ST_Intersects(@g1, @p1)\G
************************** 1. row ******************************
    ST_Contains(@g1, @p1): 1
        ST_Within(@p1, @g1): 1
    MBRContains(@g1, @p1): 1
        MBRCovers(@g1, @p1): 1
    MBRCoveredBy(@p1, @g1): 1
    ST_Disjoint(@g1, @p1): 0
ST_Intersects(@g1, @p1): 1
1 row in set (0.01 sec)
```


Using the same query with @p2 in place of @p1, we can see that $g 2$ covers $p 2$, but does not contain it, because $p 2$ is included in the boundary of $g 2$, but does not lie within its interior. (That is, min $(x)<= \mathrm{a}<=\max (\mathrm{x})$ and min$(\mathrm{y})<=\mathrm{b}<=\max (\mathrm{y})$ are true, but min$(\mathrm{x})<\mathrm{a}<\max (\mathrm{x})$ and min(y) < b < max(y) are not.)
```
mysql> SELECT
        -> ST_Contains(@g1, @p2), ST_Within(@p2, @g1),
        -> MBRContains(@g1, @p2),
        -> MBRCovers(@g1, @p2), MBRCoveredBy(@p2, @g1),
        -> ST_Disjoint(@g1, @p2), ST_Intersects(@g1, @p2)\G
************************** 1. row ******************************
    ST_Contains(@g1, @p2): 0
        ST_Within(@p2, @g1): 0
    MBRContains(@g1, @p2): 0
        MBRCovers(@g1, @p2): 1
    MBRCoveredBy(@p2, @g1): 1
    ST_Disjoint(@g1, @p2): 0
ST_Intersects(@g1, @p2): 1
1 row in set (0.00 sec)
```


Executing the query-this time using @p3 rather than @p2 or @p1-shows us that p3 is disjoint from $g 1$; the two geometries have no points in common, and $g 1$ neither contains nor covers $p 3$. ST_Disjoint(g1, p3) returns true; ST_Intersects(g1, p3) returns false.
```
mysql> SELECT
        -> ST_Contains(@g1, @p3), ST_Within(@p3, @g1),
        -> MBRContains(@g1, @p3),
        -> MBRCovers(@g1, @p3), MBRCoveredBy(@p3, @g1),
        -> ST_Disjoint(@g1, @p3), ST_Intersects(@g1, @p3)\G
*************************** 1. rOW ***************************************
    ST_Contains(@g1, @p3): 0
        ST_Within(@p3, @g1): 0
    MBRContains(@g1, @p3): 0
        MBRCovers(@g1, @p3): 0
    MBRCoveredBy(@p3, @g1): 0
    ST_Disjoint(@g1, @p3): 1
ST_Intersects(@g1, @p3): 0
1 row in set (0.00 sec)
```


The function descriptions shown later in this section and in Section 14.16.9.1, "Spatial Relation Functions That Use Object Shapes" provide additional examples.

The bounding box of a point is interpreted as a point that is both boundary and interior.
The bounding box of a straight horizontal or vertical line is interpreted as a line where the interior of the line is also boundary. The endpoints are boundary points.

If any of the parameters are geometry collections, the interior, boundary, and exterior of those parameters are those of the union of all elements in the collection.

Functions in this section detect arguments in either Cartesian or geographic spatial reference systems (SRSs), and return results appropriate to the SRS.

Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If any argument is NULL or an empty geometry, the return value is NULL.
- If any geometry argument is not a syntactically well-formed geometry, an ER_GIS_INVALID_DATA error occurs.
- If any geometry argument is a syntactically well-formed geometry in an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- For functions that take multiple geometry arguments, if those arguments are not in the same SRS, an ER_GIS_DIFFERENT_SRIDS error occurs.
- If any argument is geometrically invalid, either the result is true or false (it is undefined which), or an error occurs.
- For geographic SRS geometry arguments, if any argument has a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range ( -180 , 180], an ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90,90], an

ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE error occurs.
Ranges shown are in degrees. If an SRS uses another unit, the range uses the corresponding values in its unit. The exact range limits deviate slightly due to floating-point arithmetic.
- Otherwise, the return value is non-NULL.

These MBR functions are available for testing geometry relationships:
- MBRContains(g1, g2)

Returns 1 or 0 to indicate whether the minimum bounding rectangle of $g 1$ contains the minimum bounding rectangle of $g 2$. This tests the opposite relationship as MBRWithin().

MBRContains() handles its arguments as described in the introduction to this section.
```
mysql> SET
    -> @g1 = ST_GeomFromText('Polygon((0 0,0 3,3 3,3 0,0 0))'),
    -> @g2 = ST_GeomFromText('Polygon((1 1,1 2,2 2,2 1,1 1))'),
    -> @g3 = ST_GeomFromText('Polygon((0 0,0 5,5 5,5 0,0 0))'),
    -> @g4 = ST_GeomFromText('Polygon((5 5,5 10,10 10,10 5,5 5))'),
    -> @p1 = ST_GeomFromText('Point(1 1)'),
    -> @p2 = ST_GeomFromText('Point(3 3)');
    -> @p3 = ST_GeomFromText('Point(5 5)');
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT
    -> MBRContains(@g1, @g2), MBRContains(@g1, @g4),
    -> MBRContains(@g2, @g1), MBRContains(@g2, @g4),
    -> MBRContains(@g2, @g3), MBRContains(@g3, @g4),
    -> MBRContains(@g3, @g1), MBRContains(@g1, @g3),
    -> MBRContains(@g1, @p1), MBRContains(@p1, @g1),
    -> MBRContains(@g1, @p1), MBRContains(@p1, @g1),
    -> MBRContains(@g2, @p2), MBRContains(@g2, @p3),
    -> MBRContains(@g3, @p1), MBRContains(@g3, @p2),
    -> MBRContains(@g3, @p3), MBRContains(@g4, @p1),
    -> MBRContains(@g4, @p2), MBRContains(@g4, @p3)\G
**************************** 1. r OW ***************************
MBRContains(@g1, @g2): 1
MBRContains(@g1, @g4): 0
MBRContains(@g2, @g1): 0
MBRContains(@g2, @g4): 0
MBRContains(@g2, @g3): 0
MBRContains(@g3, @g4): 0
MBRContains(@g3, @g1): 1
```

```
MBRContains(@g1, @g3): 0
MBRContains(@g1, @p1): 1
MBRContains(@p1, @g1): 0
MBRContains(@g1, @p1): 1
MBRContains(@p1, @g1): 0
MBRContains(@g2, @p2): 0
MBRContains(@g2, @p3): 0
MBRContains(@g3, @p1): 1
MBRContains(@g3, @p2): 1
MBRContains(@g3, @p3): 0
MBRContains(@g4, @p1): 0
MBRContains(@g4, @p2): 0
MBRContains(@g4, @p3): 0
1 row in set (0.00 sec)
```

- MBRCoveredBy(g1, g2)

Returns 1 or 0 to indicate whether the minimum bounding rectangle of $g 1$ is covered by the minimum bounding rectangle of $g 2$. This tests the opposite relationship as MBRCovers().

MBRCoveredBy( ) handles its arguments as described in the introduction to this section.
```
mysql> SET @g1 = ST_GeomFromText('Polygon((0 0,0 3,3 3,3 0,0 0))');
mysql> SET @g2 = ST_GeomFromText('Point(1 1)');
mysql> SELECT MBRCovers(@g1,@g2), MBRCoveredby(@g1,@g2);
+---------------------+-----------------------+
| MBRCovers(@g1,@g2) | MBRCoveredby(@g1,@g2) |
+---------------------+-----------------------+
| 1 | 0 |
+---------------------+-----------------------+
mysql> SELECT MBRCovers(@g2,@g1), MBRCoveredby(@g2,@g1);
+---------------------+-----------------------+
| MBRCovers(@g2,@g1) | MBRCoveredby(@g2,@g1) |
+---------------------+-----------------------+
| 0 | 1 |
+---------------------+----------------------+
```


See the description of the MBRCovers() function for additional examples.
- MBRCovers(g1, g2)

Returns 1 or 0 to indicate whether the minimum bounding rectangle of $g 1$ covers the minimum bounding rectangle of $g 2$. This tests the opposite relationship as MBRCoveredBy ( ). See the description of MBRCoveredBy( ) for additional examples.

MBRCovers() handles its arguments as described in the introduction to this section.
```
mysql> SET
    -> @g1 = ST_GeomFromText('Polygon((0 0,0 3,3 3,3 0,0 0))'),
    -> @g2 = ST_GeomFromText('Polygon((1 1,1 2,2 2,2 1,1 1))'),
    -> @p1 = ST_GeomFromText('Point(1 1)'),
    -> @p2 = ST_GeomFromText('Point(3 3)'),
    -> @p3 = ST_GeomFromText('Point(5 5)');
Query OK, 0 rows affected (0.02 sec)
mysql> SELECT
    -> MBRCovers(@g1, @p1), MBRCovers(@g1, @p2),
    -> MBRCovers(@g1, @g2), MBRCovers(@g1, @p3)\G
************************** 1. row ******************************
MBRCovers(@g1, @p1): 1
MBRCovers(@g1, @p2): 1
MBRCovers(@g1, @g2): 1
MBRCovers(@g1, @p3): 0
1 row in set (0.00 sec)
```

- MBRDisjoint(g1, g2)

Returns 1 or 0 to indicate whether the minimum bounding rectangles of the two geometries $g 1$ and g2 are disjoint (do not intersect).

MBRDisjoint ( ) handles its arguments as described in the introduction to this section.
```
mysql> SET
    -> @g1 = ST_GeomFromText('Polygon((0 0,0 3,3 3,3 0,0 0))'),
    -> @g2 = ST_GeomFromText('Polygon((1 1,1 2,2 2,2 1,1 1))'),
    -> @g3 = ST_GeomFromText('Polygon((0 0,0 5,5 5,5 0,0 0))'),
    -> @g4 = ST_GeomFromText('Polygon((5 5,5 10,10 10,10 5,5 5))'),
    -> @p1 = ST_GeomFromText('Point(1 1)'),
    -> @p2 = ST_GeomFromText('Point(3 3)'),
    -> @p3 = ST_GeomFromText('Point(5 5)');
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT
    -> MBRDisjoint(@g1, @g4), MBRDisjoint(@g2, @g4),
    -> MBRDisjoint(@g3, @g4), MBRDisjoint(@g4, @g4),
    -> MBRDisjoint(@g1, @p1), MBRDisjoint(@g1, @p2),
    -> MBRDisjoint(@g1, @p3)\G
*************************** 1. row ****************************************
MBRDisjoint(@g1, @g4): 1
MBRDisjoint(@g2, @g4): 1
MBRDisjoint(@g3, @g4): 0
MBRDisjoint(@g4, @g4): 0
MBRDisjoint(@g1, @p1): 0
MBRDisjoint(@g1, @p2): 0
MBRDisjoint(@g1, @p3): 1
1 row in set (0.00 sec)
```

- MBREquals(g1, g2)

Returns 1 or 0 to indicate whether the minimum bounding rectangles of the two geometries $g 1$ and g2 are the same.

MBREquals( ) handles its arguments as described in the introduction to this section, except that it does not return NULL for empty geometry arguments.
```
mysql> SET
    -> @g1 = ST_GeomFromText('Polygon((0 0,0 3,3 3,3 0,0 0))'),
    -> @g2 = ST_GeomFromText('Polygon((1 1,1 2,2 2,2 1,1 1))'),
    -> @p1 = ST_GeomFromText('Point(1 1)'),
    -> @p2 = ST_GeomFromText('Point(3 3)'),
    -> @p3 = ST_GeomFromText('Point(5 5)');
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT
    -> MBREquals(@g1, @g1), MBREquals(@g1, @g2),
    -> MBREquals(@g1, @p1), MBREquals(@g1, @p2), MBREquals(@g2, @g2),
    -> MBREquals(@p1, @p1), MBREquals(@p1, @p2), MBREquals(@p2, @p2)\G
*************************** 1. row ******************************
MBREquals(@g1, @g1): 1
MBREquals(@g1, @g2): 0
MBREquals(@g1, @p1): 0
MBREquals(@g1, @p2): 0
MBREquals(@g2, @g2): 1
MBREquals(@p1, @p1): 1
MBREquals(@p1, @p2): 0
MBREquals(@p2, @p2): 1
1 row in set (0.00 sec)
```

- MBRIntersects(g1, g2)

Returns 1 or 0 to indicate whether the minimum bounding rectangles of the two geometries $g 1$ and g2 intersect.

MBRIntersects() handles its arguments as described in the introduction to this section.
```
mysql> SET
    -> @g1 = ST_GeomFromText('Polygon((0 0,0 3,3 3,3 0,0 0))'),
    -> @g2 = ST_GeomFromText('Polygon((1 1,1 2,2 2,2 1,1 1))'),
    -> @g3 = ST_GeomFromText('Polygon((0 0,0 5,5 5,5 0,0 0))'),
```

```
    -> @g4 = ST_GeomFromText('Polygon((5 5,5 10,10 10,10 5,5 5))'),
    -> @g5 = ST_GeomFromText('Polygon((2 2,2 8,8 8,8 2,2 2))'),
    -> @p1 = ST_GeomFromText('Point(1 1)'),
    -> @p2 = ST_GeomFromText('Point(3 3)'),
    -> @p3 = ST_GeomFromText('Point(5 5)');
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT
    -> MBRIntersects(@g1, @g1), MBRIntersects(@g1, @g2),
    -> MBRIntersects(@g1, @g3), MBRIntersects(@g1, @g4), MBRIntersects(@g1, @g5),
    -> MBRIntersects(@g1, @p1), MBRIntersects(@g1, @p2), MBRIntersects(@g1, @p3),
    -> MBRIntersects(@g2, @p1), MBRIntersects(@g2, @p2), MBRIntersects(@g2, @p3)\G
************************** 1. row ******************************
MBRIntersects(@g1, @g1): 1
MBRIntersects(@g1, @g2): 1
MBRIntersects(@g1, @g3): 1
MBRIntersects(@g1, @g4): 0
MBRIntersects(@g1, @g5): 1
MBRIntersects(@g1, @p1): 1
MBRIntersects(@g1, @p2): 1
MBRIntersects(@g1, @p3): 0
MBRIntersects(@g2, @p1): 1
MBRIntersects(@g2, @p2): 0
MBRIntersects(@g2, @p3): 0
1 row in set (0.00 sec)
```

- MBROverlaps(g1, g2)

Two geometries spatially overlap if they intersect and their intersection results in a geometry of the same dimension but not equal to either of the given geometries.

This function returns 1 or 0 to indicate whether the minimum bounding rectangles of the two geometries $g 1$ and $g 2$ overlap.

MBROverlaps() handles its arguments as described in the introduction to this section.
- MBRTouches(g1, g2)

Two geometries spatially touch if their interiors do not intersect, but the boundary of one of the geometries intersects either the boundary or the interior of the other.

This function returns 1 or 0 to indicate whether the minimum bounding rectangles of the two geometries $g 1$ and $g 2$ touch.

MBRTouches() handles its arguments as described in the introduction to this section.
- MBRWithin(g1, g2)

Returns 1 or 0 to indicate whether the minimum bounding rectangle of $g 1$ is within the minimum bounding rectangle of $g 2$. This tests the opposite relationship as MBRContains().

MBRWithin() handles its arguments as described in the introduction to this section.
```
mysql> SET
    -> @g1 = ST_GeomFromText('Polygon((0 0,0 3,3 3,3 0,0 0))'),
    -> @g2 = ST_GeomFromText('Polygon((1 1,1 2,2 2,2 1,1 1))'),
    -> @g3 = ST_GeomFromText('Polygon((0 0,0 5,5 5,5 0,0 0))'),
    -> @g4 = ST_GeomFromText('Polygon((5 5,5 10,10 10,10 5,5 5))'),
    -> @p1 = ST_GeomFromText('Point(1 1)'),
    -> @p2 = ST_GeomFromText('Point(3 3)');
    -> @p3 = ST_GeomFromText('Point(5 5)');
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT
    -> MBRWithin(@g1, @g2), MBRWithin(@g1, @g4),
    -> MBRWithin(@g2, @g1), MBRWithin(@g2, @g4),
    -> MBRWithin(@g2, @g3), MBRWithin(@g3, @g4),
    -> MBRWithin(@g1, @p1), MBRWithin(@p1, @g1),
```

```
    -> MBRWithin(@g1, @p1), MBRWithin(@p1, @g1),
    -> MBRWithin(@g2, @p2), MBRWithin(@g2, @p3)\G
************************** 1. row ******************************
MBRWithin(@g1, @g2): 0
MBRWithin(@g1, @g4): 0
MBRWithin(@g2, @g1): 1
MBRWithin(@g2, @g4): 0
MBRWithin(@g2, @g3): 1
MBRWithin(@g3, @g4): 0
MBRWithin(@g1, @p1): 0
MBRWithin(@p1, @g1): 1
MBRWithin(@g1, @p1): 0
MBRWithin(@p1, @g1): 1
MBRWithin(@g2, @p2): 0
MBRWithin(@g2, @p3): 0
1 row in set (0.00 sec)
```


\subsection*{14.16.10 Spatial Geohash Functions}

Geohash is a system for encoding latitude and longitude coordinates of arbitrary precision into a text string. Geohash values are strings that contain only characters chosen from "0123456789bcdefghjkmnpqrstuvwxyz".

The functions in this section enable manipulation of geohash values, which provides applications the capabilities of importing and exporting geohash data, and of indexing and searching geohash values.

Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If any argument is NULL, the return value is NULL.
- If any argument is invalid, an error occurs.
- If any argument has a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range ( $-180,180$ ], an

ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90,90], an

ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE error occurs.
Ranges shown are in degrees. The exact range limits deviate slightly due to floating-point arithmetic.
- If any point argument does not have SRID 0 or 4326, an ER_SRS_NOT_FOUND error occurs. point argument SRID validity is not checked.
- If any SRID argument refers to an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- If any SRID argument is not within the range of a 32-bit unsigned integer, an ER_DATA_OUT_OF_RANGE error occurs.
- Otherwise, the return value is non-NULL.

These geohash functions are available:
- ST_GeoHash(longitude, latitude, max_length),ST_GeoHash(point, max_length)

Returns a geohash string in the connection character set and collation.
For the first syntax, the longitude must be a number in the range [-180, 180], and the latitude must be a number in the range [-90,90]. For the second syntax, a POINT value is required, where the $X$ and $Y$ coordinates are in the valid ranges for longitude and latitude, respectively.

The resulting string is no longer than max_length characters, which has an upper limit of 100. The string might be shorter than max_length characters because the algorithm that creates the
geohash value continues until it has created a string that is either an exact representation of the location or max_length characters, whichever comes first.

ST_GeoHash ( ) handles its arguments as described in the introduction to this section.
```
mysql> SELECT ST_GeoHash(180,0,10), ST_GeoHash(-180,-90,15);
+------------------------+-------------------------+
| ST_GeoHash(180,0,10) | ST_GeoHash(-180,-90,15) |
+-----------------------+-------------------------+
| xbpbpbpbpb | 000000000000000 |
+-----------------------+------------------------+
```

- ST_LatFromGeoHash(geohash_str)

Returns the latitude from a geohash string value, as a double-precision number in the range [-90, 90].

The ST_LatFromGeoHash ( ) decoding function reads no more than 433 characters from the geohash_str argument. That represents the upper limit on information in the internal representation of coordinate values. Characters past the 433rd are ignored, even if they are otherwise illegal and produce an error.

ST_LatFromGeoHash() handles its arguments as described in the introduction to this section.
```
mysql> SELECT ST_LatFromGeoHash(ST_GeoHash(45,-20,10));
+--------------------------------------------+
| ST_LatFromGeoHash(ST_GeoHash(45,-20,10)) |
+--------------------------------------------
| -20 |
+--------------------------------------------
```

- ST_LongFromGeoHash(geohash_str)

Returns the longitude from a geohash string value, as a double-precision number in the range $[-180$, 180].

The remarks in the description of ST_LatFromGeoHash ( ) regarding the maximum number of characters processed from the geohash_str argument also apply to ST_LongFromGeoHash ( ).

ST_LongFromGeoHash( ) handles its arguments as described in the introduction to this section.
```
mysql> SELECT ST_LongFromGeoHash(ST_GeoHash(45,-20,10));
+---------------------------------------------+
| ST_LongFromGeoHash(ST_GeoHash(45,-20,10)) |
+--------------------------------------------
| 45 |
+----------------------------------------------
```

- ST_PointFromGeoHash(geohash_str, srid)

Returns a POINT value containing the decoded geohash value, given a geohash string value.
The $X$ and $Y$ coordinates of the point are the longitude in the range $[-180,180]$ and the latitude in the range [-90, 90], respectively.

The srid argument is an 32-bit unsigned integer.
The remarks in the description of ST_LatFromGeoHash ( ) regarding the maximum number of characters processed from the geohash_str argument also apply to ST_PointFromGeoHash ( ).

ST_PointFromGeoHash() handles its arguments as described in the introduction to this section.
```
mysql> SET @gh = ST_GeoHash(45,-20,10);
mysql> SELECT ST_AsText(ST_PointFromGeoHash(@gh,0));
+-----------------------------------------+
| ST_AsText(ST_PointFromGeoHash(@gh,0)) |
```

```
+------------------------------------------+
+----------------------------------------+
```


\subsection*{14.16.11 Spatial GeoJSON Functions}

This section describes functions for converting between GeoJSON documents and spatial values. GeoJSON is an open standard for encoding geometric/geographical features. For more information, see http://geojson.org. The functions discussed here follow GeoJSON specification revision 1.0.

GeoJSON supports the same geometric/geographic data types that MySQL supports. Feature and FeatureCollection objects are not supported, except that geometry objects are extracted from them. CRS support is limited to values that identify an SRID.

MySQL also supports a native JSON data type and a set of SQL functions to enable operations on JSON values. For more information, see Section 13.5, "The JSON Data Type", and Section 14.17, "JSON Functions".
- ST_AsGeoJSON(g [, max_dec_digits [, options]])

Generates a GeoJSON object from the geometry $g$. The object string has the connection character set and collation.

If any argument is NULL, the return value is NULL. If any non-NULL argument is invalid, an error occurs.
max_dec_digits, if specified, limits the number of decimal digits for coordinates and causes rounding of output. If not specified, this argument defaults to its maximum value of $2^{32}-1$. The minimum is 0 .
options, if specified, is a bitmask. The following table shows the permitted flag values. If the geometry argument has an SRID of 0 , no CRS object is produced even for those flag values that request one.

\begin{tabular}{|l|l|}
\hline Flag Value & Meaning \\
\hline 0 & No options. This is the default if options is not specified. \\
\hline 1 & Add a bounding box to the output. \\
\hline 2 & Add a short-format CRS URN to the output. The default format is a short format (EPSG:srid). \\
\hline 4 & Add a long-format CRS URN (urn:ogc:def:crs:EPSG::srid). This flag overrides flag 2. For example, option values of 5 and 7 mean the same (add a bounding box and a long-format CRS URN). \\
\hline
\end{tabular}
```
mysql> SELECT ST_AsGeoJSON(ST_GeomFromText('POINT(11.11111 12.22222)'),2);
+------------------------------------------------------------------
| ST_AsGeoJSON(ST_GeomFromText('POINT(11.11111 12.22222)'),2) |
+-----------------------------------------------------------------
| {"type": "Point", "coordinates": [11.11, 12.22]} |
+----------------------------------------------------------------
```

- ST_GeomFromGeoJSON(str [, options [, srid]])

Parses a string str representing a GeoJSON object and returns a geometry.
If any argument is NULL, the return value is NULL. If any non-NULL argument is invalid, an error occurs.
options, if given, describes how to handle GeoJSON documents that contain geometries with coordinate dimensions higher than 2 . The following table shows the permitted options values.

\begin{tabular}{|l|l|}
\hline Option Value & Meaning \\
\hline 1 & Reject the document and produce an error. This is the default if options is not specified. \\
\hline 2, 3, 4 & Accept the document and strip off the coordinates for higher coordinate dimensions. \\
\hline
\end{tabular}
options values of 2,3 , and 4 currently produce the same effect. If geometries with coordinate dimensions higher than 2 are supported in the future, you can expect these values to produce different effects.

The srid argument, if given, must be a 32-bit unsigned integer. If not given, the geometry return value has an SRID of 4326.

If srid refers to an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.

For geographic SRS geometry arguments, if any argument has a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range (-180, 180], an ER_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90, 90], an ER_LATITUDE_OUT_OF_RANGE error occurs.

Ranges shown are in degrees. If an SRS uses another unit, the range uses the corresponding values in its unit. The exact range limits deviate slightly due to floating-point arithmetic.

GeoJSON geometry, feature, and feature collection objects may have a crs property. The parsing function parses named CRS URNs in the urn:ogc:def:crs:EPSG::srid and EPSG:srid namespaces, but not CRSs given as link objects. Also, urn:ogc:def:crs:0GC:1.3:CRS84 is recognized as SRID 4326. If an object has a CRS that is not understood, an error occurs, with the exception that if the optional srid argument is given, any CRS is ignored even if it is invalid.

If a crs member that specifies an SRID different from the top-level object SRID is found at a lower level of the GeoJSON document, an ER_INVALID_GEOJSON_CRS_NOT_TOP_LEVEL error occurs.

As specified in the GeoJSON specification, parsing is case-sensitive for the type member of the GeoJSON input (Point, LineString, and so forth). The specification is silent regarding case sensitivity for other parsing, which in MySQL is not case-sensitive.

This example shows the parsing result for a simple GeoJSON object. Observe that the order of coordinates depends on the SRID used.
```
mysql> SET @json = '{ "type": "Point", "coordinates": [102.0, 0.0]}';
mysql> SELECT ST_AsText(ST_GeomFromGeoJSON(@json));
+----------------------------------------+
| ST_AsText(ST_GeomFromGeoJSON(@json)) |
+----------------------------------------+
| POINT(0 102)
+-----------------------------------------+
mysql> SELECT ST_SRID(ST_GeomFromGeoJSON(@json));
+--------------------------------------+
| ST_SRID(ST_GeomFromGeoJSON(@json)) |
+--------------------------------------+
| 4326 |
+--------------------------------------+
mysql> SELECT ST_AsText(ST_SRID(ST_GeomFromGeoJSON(@json),0));
+----------------------------------------------------
```

```
ST_AsText(ST_SRID(ST_GeomFromGeoJSON(@json),0)) |
+-----------------------------------------------------
POINT(102 0) |
```


\subsection*{14.16.12 Spatial Aggregate Functions}

MySQL supports aggregate functions that perform a calculation on a set of values. For general information about these functions, see Section 14.19.1, "Aggregate Function Descriptions". This section describes the ST_Collect ( ) spatial aggregate function.

ST_Collect ( ) can be used as a window function, as signified in its syntax description by [over_clause], representing an optional OVER clause. over_clause is described in Section 14.20.2, "Window Function Concepts and Syntax", which also includes other information about window function usage.
- ST_Collect([DISTINCT] g) [over_clause]

Aggregates geometry values and returns a single geometry collection value. With the DISTINCT option, returns the aggregation of the distinct geometry arguments.

As with other aggregate functions, GROUP BY may be used to group arguments into subsets. ST_Collect ( ) returns an aggregate value for each subset.

This function executes as a window function if over_clause is present. over_clause is as described in Section 14.20.2, "Window Function Concepts and Syntax". In contrast to most aggregate functions that support windowing, ST_Collect ( ) permits use of over_clause together with DISTINCT.

ST_Collect ( ) handles its arguments as follows:
- NULL arguments are ignored.
- If all arguments are NULL or the aggregate result is empty, the return value is NULL.
- If any geometry argument is not a syntactically well-formed geometry, an ER_GIS_INVALID_DATA error occurs.
- If any geometry argument is a syntactically well-formed geometry in an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- If there are multiple geometry arguments and those arguments are in the same SRS, the return value is in that SRS. If those arguments are not in the same SRS, an ER_GIS_DIFFERENT_SRIDS_AGGREGATION error occurs.
- The result is the narrowest MultiXXX or GeometryCollection value possible, with the result type determined from the non-NULL geometry arguments as follows:
- If all arguments are Point values, the result is a MultiPoint value.
- If all arguments are LineString values, the result is a MultiLineString value.
- If all arguments are Polygon values, the result is a MultiPolygon value.
- Otherwise, the arguments are a mix of geometry types and the result is a GeometryCollection value.

This example data set shows hypothetical products by year and location of manufacture:
```
CREATE TABLE product (
    year INTEGER,
    product VARCHAR(256),
    location Geometry
```

```
);
INSERT INTO product
(year, product, location) VALUES
(2000, "Calculator", ST_GeomFromText('point(60 -24)',4326)),
(2000, "Computer" , ST_GeomFromText('point(28 -77)',4326)),
(2000, "Abacus" , ST_GeomFromText('point(28 -77)',4326)),
(2000, "TV" , ST_GeomFromText('point(38 60)',4326)),
(2001, "Calculator", ST_GeomFromText('point(60 -24)',4326)),
(2001, "Computer" , ST_GeomFromText('point(28 -77)',4326));
```


Some sample queries using ST_Collect ( ) on the data set:
```
mysql> SELECT ST_AsText(ST_Collect(location)) AS result
    FROM product;
+------------------------------------------------------------------------
| result
+----------------------------------------------------------------------
| MULTIPOINT((60-24),(28 -77),(28 -77),(38 60),(60 -24),(28 -77)) |
+---------------------------------------------------------------------
mysql> SELECT ST_AsText(ST_Collect(DISTINCT location)) AS result
    FROM product;
+-----------------------------------------
| result |
+----------------------------------------+
| MULTIPOINT((60-24),(28 -77),(38 60)) |
+----------------------------------------+
mysql> SELECT year, ST_AsText(ST_Collect(location)) AS result
        FROM product GROUP BY year;
+------+-------------------------------------------------
| year | result |
+------+--------------------------------------------------
| 2000 | MULTIPOINT((60-24),(28 -77),(28 -77),(38 60))
| 2001 | MULTIPOINT((60-24),(28 -77))
+------+---------------------------------------------------
mysql> SELECT year, ST_AsText(ST_Collect(DISTINCT location)) AS result
        FROM product GROUP BY year;
+------+-----------------------------------------
| year | result |
+------+-----------------------------------------
| 2000 | MULTIPOINT((60 -24),(28 -77),(38 60))
| 2001 | MULTIPOINT((60-24),(28 -77))
+------+-----------------------------------------
# selects nothing
mysql> SELECT ST_Collect(location) AS result
        FROM product WHERE year = 1999;
+--------+
| result |
+--------+
| NULL |
+--------+
mysql> SELECT ST_AsText(ST_Collect(location)
            OVER (ORDER BY year, product ROWS BETWEEN 1 PRECEDING AND CURRENT ROW))
            AS result
        FROM product;
+--------------------------------+
| result
+---------------------------------+
    MULTIPOINT((28 -77))
    | MULTIPOINT((28 - 77),(60 -24))
    | MULTIPOINT((60-24),(28 - 77))
    | MULTIPOINT((28 -77),(38 60))
    | MULTIPOINT((38 60),(60-24))
    | MULTIPOINT((60-24),(28 -77)) |
```


\subsection*{14.16.13 Spatial Convenience Functions}

The functions in this section provide convenience operations on geometry values.
Unless otherwise specified, functions in this section handle their geometry arguments as follows:
- If any argument is NULL, the return value is NULL.
- If any geometry argument is not a syntactically well-formed geometry, an ER_GIS_INVALID_DATA error occurs.
- If any geometry argument is a syntactically well-formed geometry in an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- For functions that take multiple geometry arguments, if those arguments are not in the same SRS, an ER_GIS_DIFFERENT_SRIDS error occurs.
- Otherwise, the return value is non-NULL.

These convenience functions are available:
- ST_Distance_Sphere(g1, g2 [, radius])

Returns the minimum spherical distance between Point or MultiPoint arguments on a sphere, in meters. (For general-purpose distance calculations, see the ST_Distance( ) function.) The optional radius argument should be given in meters.

If both geometry parameters are valid Cartesian Point or MultiPoint values in SRID 0, the return value is shortest distance between the two geometries on a sphere with the provided radius. If omitted, the default radius is $6,370,986$ meters, Point $X$ and $Y$ coordinates are interpreted as longitude and latitude, respectively, in degrees.

If both geometry parameters are valid Point or MultiPoint values in a geographic spatial reference system (SRS), the return value is the shortest distance between the two geometries on a sphere with the provided radius. If omitted, the default radius is equal to the mean radius, defined as $(2 a+b) / 3$, where $a$ is the semi-major axis and $b$ is the semi-minor axis of the SRS.

ST_Distance_Sphere( ) handles its arguments as described in the introduction to this section, with these exceptions:
- Supported geometry argument combinations are Point and Point, or Point and MultiPoint (in any argument order). If at least one of the geometries is neither Point nor MultiPoint, and its SRID is 0, an ER_NOT_IMPLEMENTED_FOR_CARTESIAN_SRS error occurs. If at least one of the geometries is neither Point nor MultiPoint, and its SRID refers to a geographic SRS, an ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS error occurs. If any geometry refers to a projected SRS, an ER_NOT_IMPLEMENTED_FOR_PROJECTED_SRS error occurs.
- If any argument has a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range ( -180 , 180], an ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90,90], an ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE error occurs.

Ranges shown are in degrees. If an SRS uses another unit, the range uses the corresponding values in its unit. The exact range limits deviate slightly due to floating-point arithmetic.
- If the radius argument is present but not positive, an ER_NONPOSITIVE_RADIUS error occurs.
- If the distance exceeds the range of a double-precision number, an ER_STD_OVERFLOW_ERROR error occurs.
```
mysql> SET @pt1 = ST_GeomFromText('POINT(0 0)');
mysql> SET @pt2 = ST_GeomFromText('POINT(180 0)');
mysql> SELECT ST_Distance_Sphere(@pt1, @pt2);
+---------------------------------+
| ST_Distance_Sphere(@pt1, @pt2) |
+--------------------------------+
| 20015042.813723423 |
+---------------------------------+
```

- ST_IsValid(g)

Returns 1 if the argument is geometrically valid, 0 if the argument is not geometrically valid. Geometry validity is defined by the OGC specification.

The only valid empty geometry is represented in the form of an empty geometry collection value. ST_IsValid ( ) returns 1 in this case. MySQL does not support GIS EMPTY values such as POINT EMPTY.

ST_IsValid( ) handles its arguments as described in the introduction to this section, with this exception:
- If the geometry has a geographic SRS with a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range ( -180 , 180], an

ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90,90], an

ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE error occurs.
Ranges shown are in degrees. If an SRS uses another unit, the range uses the corresponding values in its unit. The exact range limits deviate slightly due to floating-point arithmetic.
```
mysql> SET @ls1 = ST_GeomFromText('LINESTRING(0 0,-0.00 0,0.0 0)');
mysql> SET @ls2 = ST_GeomFromText('LINESTRING(0 0, 1 1)');
mysql> SELECT ST_IsValid(@ls1);
+-------------------+
| ST_IsValid(@ls1) |
+-------------------+
| 0 |
+-------------------+
mysql> SELECT ST_IsValid(@ls2);
+-------------------+
| ST_IsValid(@ls2) |
+-------------------+
| 1 |
+-------------------+
```

- ST_MakeEnvelope(pt1, pt2)

Returns the rectangle that forms the envelope around two points, as a Point, LineString, or Polygon.

Calculations are done using the Cartesian coordinate system rather than on a sphere, spheroid, or on earth.

Given two points pt1 and pt2, ST_MakeEnvelope( ) creates the result geometry on an abstract plane like this:
- If $p t 1$ and $p t 2$ are equal, the result is the point $p t 1$.
- Otherwise, if (pt1, pt2) is a vertical or horizontal line segment, the result is the line segment (pt1, pt2).
- Otherwise, the result is a polygon using $p t 1$ and $p t 2$ as diagonal points.

The result geometry has an SRID of 0 .
ST_MakeEnvelope( ) handles its arguments as described in the introduction to this section, with these exceptions:
- If the arguments are not Point values, an ER_WRONG_ARGUMENTS error occurs.
- An ER_GIS_INVALID_DATA error occurs for the additional condition that any coordinate value of the two points is infinite or NaN.
- If any geometry has an SRID value for a geographic spatial reference system (SRS), an ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS error occurs.
```
mysql> SET @pt1 = ST_GeomFromText('POINT(0 0)');
mysql> SET @pt2 = ST_GeomFromText('POINT(1 1)');
mysql> SELECT ST_AsText(ST_MakeEnvelope(@pt1, @pt2));
+------------------------------------------+
| ST_AsText(ST_MakeEnvelope(@pt1, @pt2)) |
+------------------------------------------+
| POLYGON((0 0,1 0,1 1,0 1,0 0)) |
+------------------------------------------+
```

- ST_Simplify(g, max_distance)

Simplifies a geometry using the Douglas-Peucker algorithm and returns a simplified value of the same type.

The geometry may be any geometry type, although the Douglas-Peucker algorithm may not actually process every type. A geometry collection is processed by giving its components one by one to the simplification algorithm, and the returned geometries are put into a geometry collection as result.

The max_distance argument is the distance (in units of the input coordinates) of a vertex to other segments to be removed. Vertices within this distance of the simplified linestring are removed.

According to Boost.Geometry, geometries might become invalid as a result of the simplification process, and the process might create self-intersections. To check the validity of the result, pass it to ST_IsValid().

ST_Simplify( ) handles its arguments as described in the introduction to this section, with this exception:
- If the max_distance argument is not positive, or is NaN, an ER_WRONG_ARGUMENTS error occurs.
```
mysql> SET @g = ST_GeomFromText('LINESTRING(0 0,0 1,1 1,1 2,2 2,2 3,3 3)');
mysql> SELECT ST_AsText(ST_Simplify(@g, 0.5));
```

```
+----------------------------------+
| ST_AsText(ST_Simplify(@g, 0.5)) |
+----------------------------------+
| LINESTRING(0 0,0 1,1 1,2 3,3 3) |
+-----------------------------------+
mysql> SELECT ST_AsText(ST_Simplify(@g, 1.0));
+----------------------------------+
| ST_AsText(ST_Simplify(@g, 1.0)) |
+----------------------------------+
| LINESTRING(0 0,3 3) |
```

- ST_Validate(g)

Validates a geometry according to the OGC specification. A geometry can be syntactically wellformed (WKB value plus SRID) but geometrically invalid. For example, this polygon is geometrically invalid: POLYGON (( 0 0, 0 0, 0 0, 0 0, 0 0))

ST_Validate( ) returns the geometry if it is syntactically well-formed and is geometrically valid, NULL if the argument is not syntactically well-formed or is not geometrically valid or is NULL.

ST_Validate( ) can be used to filter out invalid geometry data, although at a cost. For applications that require more precise results not tainted by invalid data, this penalty may be worthwhile.

If the geometry argument is valid, it is returned as is, except that if an input Polygon or MultiPolygon has clockwise rings, those rings are reversed before checking for validity. If the geometry is valid, the value with the reversed rings is returned.

The only valid empty geometry is represented in the form of an empty geometry collection value. ST_Validate( ) returns it directly without further checks in this case.

ST_Validate( ) handles its arguments as described in the introduction to this section, with the exceptions listed here:
- If the geometry has a geographic SRS with a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range ( -180 , 180], an ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90,90], an ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE error occurs.

Ranges shown are in degrees. The exact range limits deviate slightly due to floating-point arithmetic.
```
mysql> SET @ls1 = ST_GeomFromText('LINESTRING(0 0)');
mysql> SET @ls2 = ST_GeomFromText('LINESTRING(0 0, 1 1)');
mysql> SELECT ST_AsText(ST_Validate(@ls1));
+-------------------------------+
| ST_AsText(ST_Validate(@ls1)) |
+-------------------------------+
| NULL |
+-------------------------------+
mysql> SELECT ST_AsText(ST_Validate(@ls2));
+--------------------------------+
| ST_AsText(ST_Validate(@ls2)) |
+-------------------------------+
| LINESTRING(0 0,1 1) |
+-------------------------------+
```


\subsection*{14.17 JSON Functions}

The functions described in this section perform operations on JSON values. For discussion of the JSON data type and additional examples showing how to use these functions, see Section 13.5, "The JSON Data Type".

For functions that take a JSON argument, an error occurs if the argument is not a valid JSON value. Arguments parsed as JSON are indicated by json_doc; arguments indicated by val are not parsed.

Functions that return JSON values always perform normalization of these values (see Normalization, Merging, and Autowrapping of JSON Values), and thus orders them. The precise outcome of the sort is subject to change at any time; do not rely on it to be consistent between releases.

A set of spatial functions for operating on GeoJSON values is also available. See Section 14.16.11, "Spatial GeoJSON Functions".

\subsection*{14.17.1 JSON Function Reference}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.22 JSON Functions}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline -> & Return value from JSON column after evaluating path; equivalent to JSON_EXTRACT(). & \\
\hline ->> & Return value from JSON column after evaluating path and unquoting the result; equivalent to JSON_UNQUOTE(JSON_EXTRA & CT()). \\
\hline JSON_ARRAY() & Create JSON array & \\
\hline JSON_ARRAY_APPEND ( ) & Append data to JSON document & \\
\hline JSON_ARRAY_INSERT( ) & Insert into JSON array & \\
\hline JSON_CONTAINS( ) & Whether JSON document contains specific object at path & \\
\hline JSON_CONTAINS_PATH( ) & Whether JSON document contains any data at path & \\
\hline JSON_DEPTH( ) & Maximum depth of JSON document & \\
\hline JSON_EXTRACT ( ) & Return data from JSON document & \\
\hline JSON_INSERT( ) & Insert data into JSON document & \\
\hline JSON_KEYS( ) & Array of keys from JSON document & \\
\hline JSON_LENGTH( ) & Number of elements in JSON document & \\
\hline JSON_MERGE() & Merge JSON documents, preserving duplicate keys. Deprecated synonym for JSON_MERGE_PRESERVE() & Yes \\
\hline JSON_MERGE_PATCH() & Merge JSON documents, replacing values of duplicate keys & \\
\hline JSON_MERGE_PRESERVE( ) & Merge JSON documents, preserving duplicate keys & \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline JSON_OBJECT( ) & Create JSON object & \\
\hline JSON_OVERLAPS( ) & Compares two JSON documents, returns TRUE (1) if these have any key-value pairs or array elements in common, otherwise FALSE (0) & \\
\hline JSON_PRETTY() & Print a JSON document in human-readable format & \\
\hline JSON_QUOTE() & Quote JSON document & \\
\hline JSON_REMOVE( ) & Remove data from JSON document & \\
\hline JSON_REPLACE( ) & Replace values in JSON document & \\
\hline JSON_SCHEMA_VALID( ) & Validate JSON document against JSON schema; returns TRUE/1 if document validates against schema, or FALSE/0 if it does not & \\
\hline JSON_SCHEMA_VALIDATION_RE & Patidate JSON document against JSON schema; returns report in JSON format on outcome on validation including success or failure and reasons for failure & \\
\hline JSON_SEARCH( ) & Path to value within JSON document & \\
\hline JSON_SET() & Insert data into JSON document & \\
\hline JSON_STORAGE_FREE ( ) & Freed space within binary representation of JSON column value following partial update & \\
\hline JSON_STORAGE_SIZE() & Space used for storage of binary representation of a JSON document & \\
\hline JSON_TABLE() & Return data from a JSON expression as a relational table & \\
\hline JSON_TYPE() & Type of JSON value & \\
\hline JSON_UNQUOTE() & Unquote JSON value & \\
\hline JSON_VALID( ) & Whether JSON value is valid & \\
\hline JSON_VALUE() & Extract value from JSON document at location pointed to by path provided; return this value as VARCHAR(512) or specified type & \\
\hline MEMBER OF() & Returns true (1) if first operand matches any element of JSON array passed as second operand, otherwise returns false (0) & \\
\hline
\end{tabular}

MySQL supports two aggregate JSON functions JSON_ARRAYAGG() and JSON_OBJECTAGG(). See Section 14.19, "Aggregate Functions", for descriptions of these.

MySQL also supports "pretty-printing" of JSON values in an easy-to-read format, using the JSON_PRETTY( ) function. You can see how much storage space a given JSON value takes up, and how much space remains for additional storage, using JSON_STORAGE_SIZE( ) and JSON_STORAGE_FREE( ), respectively. For complete descriptions of these functions, see Section 14.17.8, "JSON Utility Functions".

\subsection*{14.17.2 Functions That Create JSON Values}

The functions listed in this section compose JSON values from component elements.
- JSON_ARRAY([val[, val] ...])

Evaluates a (possibly empty) list of values and returns a JSON array containing those values.
```
mysql> SELECT JSON_ARRAY(1, "abc", NULL, TRUE, CURTIME());
+-----------------------------------------------
| JSON_ARRAY(1, "abc", NULL, TRUE, CURTIME()) |
+------------------------------------------------
| [1, "abc", null, true, "11:30:24.000000"] |
+-----------------------------------------------
```

- JSON_OBJECT([key, val[, key, val] ...])

Evaluates a (possibly empty) list of key-value pairs and returns a JSON object containing those pairs. An error occurs if any key name is NULL or the number of arguments is odd.
```
mysql> SELECT JSON_OBJECT('id', 87, 'name', 'carrot');
+------------------------------------------+
| JSON_OBJECT('id', 87, 'name', 'carrot') |
+-------------------------------------------+
| {"id": 87, "name": "carrot"} |
+------------------------------------------+
```

- JSON_QUOTE(string)

Quotes a string as a JSON value by wrapping it with double quote characters and escaping interior quote and other characters, then returning the result as a utf8mb4 string. Returns NULL if the argument is NULL.

This function is typically used to produce a valid JSON string literal for inclusion within a JSON document.

Certain special characters are escaped with backslashes per the escape sequences shown in Table 14.23, "JSON_UNQUOTE() Special Character Escape Sequences".
```
mysql> SELECT JSON_QUOTE('null'), JSON_QUOTE('"null"');
+---------------------+----------------------+
| JSON_QUOTE('null') | JSON_QUOTE('"null"') |
+---------------------+----------------------+
| "null" | "\"null\"" |
+----------------------+----------------------+
mysql> SELECT JSON_QUOTE('[1, 2, 3]');
+---------------------------+
| JSON_QUOTE('[1, 2, 3]') |
+---------------------------+
| "[1, 2, 3]" |
+---------------------------+
```


You can also obtain JSON values by casting values of other types to the JSON type using CAST(value AS JSON); see Converting between JSON and non-JSON values, for more information.

Two aggregate functions generating JSON values are available. JSON_ARRAYAGG( ) returns a result set as a single JSON array, and JSON_OBJECTAGG( ) returns a result set as a single JSON object. For more information, see Section 14.19, "Aggregate Functions".

\subsection*{14.17.3 Functions That Search JSON Values}

The functions in this section perform search or comparison operations on JSON values to extract data from them, report whether data exists at a location within them, or report the path to data within them. The MEMBER OF( ) operator is also documented herein.
- JSON_CONTAINS(target, candidate[, path])

Indicates by returning 1 or 0 whether a given candidate JSON document is contained within a target JSON document, or-if a path argument was supplied-whether the candidate is found at a specific path within the target. Returns NULL if any argument is NULL, or if the path argument does not identify a section of the target document. An error occurs if target or candidate is not a valid JSON document, or if the path argument is not a valid path expression or contains a * or ** wildcard.

To check only whether any data exists at the path, use JSON_CONTAINS_PATH( ) instead.
The following rules define containment:
- A candidate scalar is contained in a target scalar if and only if they are comparable and are equal. Two scalar values are comparable if they have the same JSON_TYPE( ) types, with the exception that values of types INTEGER and DECIMAL are also comparable to each other.
- A candidate array is contained in a target array if and only if every element in the candidate is contained in some element of the target.
- A candidate nonarray is contained in a target array if and only if the candidate is contained in some element of the target.
- A candidate object is contained in a target object if and only if for each key in the candidate there is a key with the same name in the target and the value associated with the candidate key is contained in the value associated with the target key.

Otherwise, the candidate value is not contained in the target document.
Queries using JSON_CONTAINS( ) on InnoDB tables can be optimized using multi-valued indexes; see Multi-Valued Indexes, for more information.
```
mysql> SET @j = '{"a": 1, "b": 2, "c": {"d": 4}}';
mysql> SET @j2 = '1';
mysql> SELECT JSON_CONTAINS(@j, @j2, '$.a');
+--------------------------------+
| JSON_CONTAINS(@j, @j2, '$.a') |
+---------------------------------+
| 1 |
+--------------------------------+
mysql> SELECT JSON_CONTAINS(@j, @j2, '$.b');
+---------------------------------+
| JSON_CONTAINS(@j, @j2, '$.b') |
+--------------------------------+
| 0 |
+--------------------------------+
mysql> SET @j2 = '{"d": 4}';
mysql> SELECT JSON_CONTAINS(@j, @j2, '$.a');
+---------------------------------+
| JSON_CONTAINS(@j, @j2, '$.a') |
+---------------------------------+
| 0 |
+--------------------------------+
mysql> SELECT JSON_CONTAINS(@j, @j2, '$.c');
+---------------------------------+
| JSON_CONTAINS(@j, @j2, '$.c') |
+---------------------------------+
| 1 |
```

```
+--------------------------------+
```

```
JSON_CONTAINS_PATH(json_doc, one_or_all, path[, path] ...)
```


Returns 0 or 1 to indicate whether a JSON document contains data at a given path or paths. Returns NULL if any argument is NULL. An error occurs if the json_doc argument is not a valid JSON document, any path argument is not a valid path expression, or one_or_all is not 'one' or 'all'.

To check for a specific value at a path, use JSON_CONTAINS( ) instead.
The return value is 0 if no specified path exists within the document. Otherwise, the return value depends on the one_or_all argument:
- ' one ' : 1 if at least one path exists within the document, 0 otherwise.
- 'all': 1 if all paths exist within the document, 0 otherwise.
```
mysql> SET @j = '{"a": 1, "b": 2, "c": {"d": 4}}';
mysql> SELECT JSON_CONTAINS_PATH(@j, 'one', '$.a', '$.e');
+----------------------------------------------+
| JSON_CONTAINS_PATH(@j, 'one', '$.a', '$.e') |
+---------------------------------------------+
| 1 |
+----------------------------------------------+
mysql> SELECT JSON_CONTAINS_PATH(@j, 'all', '$.a', '$.e');
+---------------------------------------------+
| JSON_CONTAINS_PATH(@j, 'all', '$.a', '$.e') |
+---------------------------------------------+
| 0 |
+----------------------------------------------+
mysql> SELECT JSON_CONTAINS_PATH(@j, 'one', '$.c.d');
+----------------------------------------+
| JSON_CONTAINS_PATH(@j, 'one', '$.c.d') |
+----------------------------------------+
| 1 |
+------------------------------------------+
mysql> SELECT JSON_CONTAINS_PATH(@j, 'one', '$.a.d');
+----------------------------------------+
| JSON_CONTAINS_PATH(@j, 'one', '$.a.d') |
+----------------------------------------+
| 0 |
+------------------------------------------+
```


JSON_EXTRACT(json_doc, path[, path] ...)
Returns data from a JSON document, selected from the parts of the document matched by the path arguments. Returns NULL if any argument is NULL or no paths locate a value in the document. An error occurs if the json_doc argument is not a valid JSON document or any path argument is not a valid path expression.

The return value consists of all values matched by the path arguments. If it is possible that those arguments could return multiple values, the matched values are autowrapped as an array, in the order corresponding to the paths that produced them. Otherwise, the return value is the single matched value.
```
mysql> SELECT JSON_EXTRACT('[10, 20, [30, 40]]', '$[1]');
+---------------------------------------------+
| JSON_EXTRACT('[10, 20, [30, 40]]', '$[1]') |
+--------------------------------------------+
| 20
+--------------------------------------------+
mysql> SELECT JSON_EXTRACT('[10, 20, [30, 40]]', '$[1]', '$[0]');
+-----------------------------------------------------+
| JSON_EXTRACT('[10, 20, [30, 40]]', '$[1]', '$[0]') |
+----------------------------------------------------+
| [20, 10]
```

```
+--------------------------------------------------------+
+-------------------------------------------------+
| JSON_EXTRACT('[10, 20, [30, 40]]', '$[2][*]') |
+---------------------------------------------------
| [30, 40]
```


MySQL supports the -> operator as shorthand for this function as used with 2 arguments where the left hand side is a JSON column identifier (not an expression) and the right hand side is the JSON path to be matched within the column.
- column->path

The -> operator serves as an alias for the JSON_EXTRACT ( ) function when used with two arguments, a column identifier on the left and a JSON path (a string literal) on the right that is evaluated against the JSON document (the column value). You can use such expressions in place of column references wherever they occur in SQL statements.

The two SELECT statements shown here produce the same output:
```
mysql> SELECT c, JSON_EXTRACT(c, "$.id"), g
    > FROM jemp
    > WHERE JSON_EXTRACT(c, "$.id") > 1
    > ORDER BY JSON_EXTRACT(c, "$.name");
+---------------------------------+-----------+-----+
| c | c->"$.id" | g |
+--------------------------------+-----------+------+
| {"id": "3", "name": "Barney"} | "3" | 3 |
| {"id": "4", "name": "Betty"} | "4" | 4 |
| {"id": "2", "name": "Wilma"} | "2" | 2 |
+--------------------------------+-----------+-----+
3 rows in set (0.00 sec)
mysql> SELECT c, c->"$.id", g
    > FROM jemp
    > WHERE c->"$.id" > 1
    > ORDER BY c->"$.name";
+--------------------------------+-----------+-----+
| c | c->"$.id" | g |
+--------------------------------+-----------+-----+
| {"id": "3", "name": "Barney"} | "3" | 3 |
| {"id": "4", "name": "Betty"} | "4" | 4 |
| {"id": "2", "name": "Wilma"} | "2" | 2 |
3 rows in set (0.00 sec)
```


This functionality is not limited to SELECT, as shown here:
```
mysql> ALTER TABLE jemp ADD COLUMN n INT;
Query OK, 0 rows affected (0.68 sec)
Records: 0 Duplicates: 0 Warnings: 0
mysql> UPDATE jemp SET n=1 WHERE c->"$.id" = "4";
Query OK, 1 row affected (0.04 sec)
Rows matched: 1 Changed: 1 Warnings: 0
mysql> SELECT c, c->"$.id", g, n
    > FROM jemp
    > WHERE JSON_EXTRACT(c, "$.id") > 1
    > ORDER BY c->"$.name";
+---------------------------------+-----------+------+------+
| c | c->"$.id" | g | n |
| {"id": "3", "name": "Barney"} | "3" | 3 | NULL |
| {"id": "4", "name": "Betty"} | "4" | 4 | 1 |
| {"id": "2", "name": "Wilma"} | "2" | 2 | NULL |
3 rows in set (0.00 sec)
```

```
mysql> DELETE FROM jemp WHERE c->"$.id" = "4";
Query OK, 1 row affected (0.04 sec)
mysql> SELECT c, c->"$.id", g, n
    > FROM jemp
    > WHERE JSON_EXTRACT(c, "$.id") > 1
    > ORDER BY c->"$.name";
+---------------------------------+-----------+------+------+
2 rows in set (0.00 sec)
```

(See Indexing a Generated Column to Provide a JSON Column Index, for the statements used to create and populate the table just shown.)

This also works with JSON array values, as shown here:
```
mysql> CREATE TABLE tj10 (a JSON, b INT);
Query OK, 0 rows affected (0.26 sec)
mysql> INSERT INTO tj10
    > VALUES ("[3,10,5,17,44]", 33), ("[3,10,5,17,[22,44,66]]", 0);
Query OK, 1 row affected (0.04 sec)
mysql> SELECT a->"$[4]" FROM tj10;
+---------------+
| a->"$[4]" |
+---------------+
| 44
| [22, 44, 66] |
+---------------+
2 rows in set (0.00 sec)
mysql> SELECT * FROM tj10 WHERE a->"$[0]" = 3;
+-------------------------------+------+
| a | b |
+-------------------------------+------+
| [3, 10, 5, 17, 44] | 33 |
| [3, 10, 5, 17, [22, 44, 66]] | 0 |
+-------------------------------+------+
2 rows in set (0.00 sec)
```


Nested arrays are supported. An expression using -> evaluates as NULL if no matching key is found in the target JSON document, as shown here:
```
mysql> SELECT * FROM tj10 WHERE a->"$[4][1]" IS NOT NULL;
+-------------------------------+------+
| a | b |
+-------------------------------+------+
| [3, 10, 5, 17, [22, 44, 66]] | 0 |
+-------------------------------+------+
mysql> SELECT a->"$[4][1]" FROM tj10;
+---------------+
| a->"$[4][1]" |
+---------------+
| NULL
| 44
+---------------+
2 rows in set (0.00 sec)
```


This is the same behavior as seen in such cases when using JSON_EXTRACT ( ):
```
mysql> SELECT JSON_EXTRACT(a, "$[4][1]") FROM tj10;
+------------------------------+
| JSON_EXTRACT(a, "$[4][1]") |
+------------------------------+
```

```
| NULL
| 44
+-----------------------------+
2 rows in set (0.00 sec)
```

- column->>path

This is an improved, unquoting extraction operator. Whereas the -> operator simply extracts a value, the ->> operator in addition unquotes the extracted result. In other words, given a JSON column value column and a path expression path (a string literal), the following three expressions return the same value:
- JSON_UNQUOTE( JSON_EXTRACT(column, path) )
- JSON_UNQUOTE(column -> path)
- column->>path

The ->> operator can be used wherever JSON_UNQUOTE( JSON_EXTRACT ( ) ) would be allowed. This includes (but is not limited to) SELECT lists, WHERE and HAVING clauses, and ORDER BY and GROUP BY clauses.

The next few statements demonstrate some ->> operator equivalences with other expressions in the mysql client:
```
mysql> SELECT * FROM jemp WHERE g > 2;
+---------------------------------+------+
| C | ɡ |
+--------------------------------+------+
| {"id": "3", "name": "Barney"} | 3 |
| {"id": "4", "name": "Betty"} | 4 |
+---------------------------------+------+
2 rows in set (0.01 sec)
mysql> SELECT c->'$.name' AS name
    -> FROM jemp WHERE g > 2;
+-----------+
| name |
+-----------+
| "Barney"
| "Betty" |
+-----------+
2 rows in set (0.00 sec)
mysql> SELECT JSON_UNQUOTE(c->'$.name') AS name
    -> FROM jemp WHERE g > 2;
+--------+
| name |
+--------+
| Barney |
| Betty |
+--------+
2 rows in set (0.00 sec)
mysql> SELECT c->>'$.name' AS name
    -> FROM jemp WHERE g > 2;
+--------+
| name |
+--------+
| Barney |
| Betty |
+--------+
```

```
2 rows in set (0.00 sec)
```


See Indexing a Generated Column to Provide a JSON Column Index, for the SQL statements used to create and populate the jemp table in the set of examples just shown.

This operator can also be used with JSON arrays, as shown here:
```
mysql> CREATE TABLE tj10 (a JSON, b INT);
Query OK, 0 rows affected (0.26 sec)
mysql> INSERT INTO tj10 VALUES
        -> ('[3,10,5,"x",44]', 33),
        -> ('[3,10,5,17,[22,"y",66]]', 0);
Query OK, 2 rows affected (0.04 sec)
Records: 2 Duplicates: 0 Warnings: 0
mysql> SELECT a->"$[3]", a->"$[4][1]" FROM tj10;
+------------+--------------+
| a->"$[3]" | a->"$[4][1]" |
+-----------+--------------+
| "x" | | "y" |
+-----------+--------------+
2 rows in set (0.00 sec)
mysql> SELECT a->>"$[3]", a->>"$[4][1]" FROM tj10;
+-------------+----------------+
| a->>"$[3]" | a->>"$[4][1]" |
+------------+----------------+
\begin{array} { | l | l | l } { | } & { x } & { | } \\ { | } & { \text { NULL } } & { \text { \|} } \end{array}
+------------+---------------+
2 rows in set (0.00 sec)
```


As with ->, the ->> operator is always expanded in the output of EXPLAIN, as the following example demonstrates:
```
mysql> EXPLAIN SELECT c->>'$.name' AS name
        -> FROM jemp WHERE g > 2\G
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
************************* 1. row *****************************************
    Level: Note
        Code: 1003
Message: /* select#1 */ select
json_unquote(json_extract(ˋjtestˋ.ˋjempˋ.ˋcˋ,'$.name')) AS ˋnameˋ from
    jtestˋ.ˋjempˋ where (ˋjtestˋ.ˋjempˋ.ˋgˋ > 2)
1 row in set (0.00 sec)
```


This is similar to how MySQL expands the -> operator in the same circumstances.
- JSON_KEYS(json_doc[, path])

Returns the keys from the top-level value of a JSON object as a JSON array, or, if a path argument is given, the top-level keys from the selected path. Returns NULL if any argument is NULL, the
json_doc argument is not an object, or path, if given, does not locate an object. An error occurs if the json_doc argument is not a valid JSON document or the path argument is not a valid path expression or contains a * or ** wildcard.

The result array is empty if the selected object is empty. If the top-level value has nested subobjects, the return value does not include keys from those subobjects.
```
mysql> SELECT JSON_KEYS('{"a": 1, "b": {"c": 30}}');
+----------------------------------------+
| JSON_KEYS('{"a": 1, "b": {"c": 30}}') |
+-----------------------------------------+
| ["a", "b"] |
+----------------------------------------+
mysql> SELECT JSON_KEYS('{"a": 1, "b": {"c": 30}}', '$.b');
+------------------------------------------------
| JSON_KEYS('{"a": 1, "b": {"c": 30}}', '$.b') |
+-------------------------------------------------
| ["c"] |
+------------------------------------------------
```

- JSON_OVERLAPS(json_doc1, json_doc2)

Compares two JSON documents. Returns true (1) if the two document have any key-value pairs or array elements in common. If both arguments are scalars, the function performs a simple equality test. If either argument is NULL, the function returns NULL.

This function serves as counterpart to JSON_CONTAINS( ), which requires all elements of the array searched for to be present in the array searched in. Thus, JSON_CONTAINS( ) performs an AND operation on search keys, while JSON_OVERLAPS() performs an OR operation.

Queries on JSON columns of InnoDB tables using JSON_OVERLAPS( ) in the WHERE clause can be optimized using multi-valued indexes. Multi-Valued Indexes, provides detailed information and examples.

When comparing two arrays, JSON_OVERLAPS( ) returns true if they share one or more array elements in common, and false if they do not:
```
mysql> SELECT JSON_OVERLAPS("[1,3,5,7]", "[2,5,7]");
+-----------------------------------------+
| JSON_OVERLAPS("[1,3,5,7]", "[2,5,7]") |
+------------------------------------------
| 1 |
+-----------------------------------------+
1 row in set (0.00 sec)
mysql> SELECT JSON_OVERLAPS("[1,3,5,7]", "[2,6,7]");
+-----------------------------------------+
| JSON_OVERLAPS("[1,3,5,7]", "[2,6,7]") |
+-----------------------------------------
| 1 |
+-----------------------------------------+
1 row in set (0.00 sec)
mysql> SELECT JSON_OVERLAPS("[1,3,5,7]", "[2,6,8]");
+----------------------------------------+
| JSON_OVERLAPS("[1,3,5,7]", "[2,6,8]") |
+----------------------------------------+
| 0 |
+----------------------------------------+
1 row in set (0.00 sec)
```


Partial matches are treated as no match, as shown here:
```
mysql> SELECT JSON_OVERLAPS('[[1,2],[3,4],5]', '[1,[2,3],[4,5]]');
+------------------------------------------------------+
| JSON_OVERLAPS('[[1,2],[3,4],5]', '[1,[2,3],[4,5]]') |
+--------------------------------------------------------+
```

```
+-------------------------------------------------------
1 row in set (0.00 sec)
```


When comparing objects, the result is true if they have at least one key-value pair in common.
```
mysql> SELECT JSON_OVERLAPS('{"a":1,"b":10,"d":10}', '{"c":1,"e":10,"f":1,"d":10}');
+---------------------------------------------------------------------------
| JSON_OVERLAPS('{"a":1,"b":10,"d":10}', '{"c":1,"e":10,"f":1,"d":10}') |
+----------------------------------------------------------------------------
| 1 |
+---------------------------------------------------------------------------
1 row in set (0.00 sec)
mysql> SELECT JSON_OVERLAPS('{"a":1,"b":10,"d":10}', '{"a":5,"e":10,"f":1,"d":20}');
+---------------------------------------------------------------------------
| JSON_OVERLAPS('{"a":1,"b":10,"d":10}', '{"a":5,"e":10,"f":1,"d":20}') |
+----------------------------------------------------------------------------
| 0 |
+---------------------------------------------------------------------------
1 row in set (0.00 sec)
```


If two scalars are used as the arguments to the function, JSON_OVERLAPS( ) performs a simple test for equality:
```
mysql> SELECT JSON_OVERLAPS('5', '5');
+---------------------------+
| JSON_OVERLAPS('5', '5') |
+---------------------------+
| 1 |
+---------------------------+
1 row in set (0.00 sec)
mysql> SELECT JSON_OVERLAPS('5', '6');
+---------------------------+
| JSON_OVERLAPS('5', '6') |
+---------------------------+
| 0 |
+--------------------------+
1 row in set (0.00 sec)
```


When comparing a scalar with an array, JSON_OVERLAPS( ) attempts to treat the scalar as an array element. In this example, the second argument 6 is interpreted as [6], as shown here:
```
mysql> SELECT JSON_OVERLAPS('[4,5,6,7]', '6');
+----------------------------------+
| JSON_OVERLAPS('[4,5,6,7]', '6') |
+----------------------------------+
| 1 |
+----------------------------------+
1 row in set (0.00 sec)
```


The function does not perform type conversions:
```
mysql> SELECT JSON_OVERLAPS('[4,5,"6",7]', '6');
+------------------------------------+
| JSON_OVERLAPS('[4,5,"6",7]', '6') |
+------------------------------------+
| 0 |
1 row in set (0.00 sec)
mysql> SELECT JSON_OVERLAPS('[4,5,6,7]', '"6"');
+------------------------------------+
| JSON_OVERLAPS('[4,5,6,7]', '"6"') |
+------------------------------------+
| 0 |
+------------------------------------+
1 row in set (0.00 sec)
```

- JSON_SEARCH(json_doc, one_or_all, search_str[, escape_char[, path] ...])

Returns the path to the given string within a JSON document. Returns NULL if any of the json_doc, search_str, or path arguments are NULL; no path exists within the document; or search_str is not found. An error occurs if the json_doc argument is not a valid JSON document, any path argument is not a valid path expression, one_or_all is not 'one' or 'all', or escape_char is not a constant expression.

The one_or_all argument affects the search as follows:
- 'one': The search terminates after the first match and returns one path string. It is undefined which match is considered first.
- 'all': The search returns all matching path strings such that no duplicate paths are included. If there are multiple strings, they are autowrapped as an array. The order of the array elements is undefined.

Within the search_str search string argument, the \% and _ characters work as for the LIKE operator: \% matches any number of characters (including zero characters), and _ matches exactly one character.

To specify a literal \% or _ character in the search string, precede it by the escape character. The default is \it the escape_char argument is missing or NULL. Otherwise, escape_char must be a constant that is empty or one character.

For more information about matching and escape character behavior, see the description of LIKE in Section 14.8.1, "String Comparison Functions and Operators". For escape character handling, a difference from the LIKE behavior is that the escape character for JSON_SEARCH( ) must evaluate to a constant at compile time, not just at execution time. For example, if JSON_SEARCH( ) is used in a prepared statement and the escape_char argument is supplied using a ? parameter, the parameter value might be constant at execution time, but is not at compile time.
```
mysql> SET @j = '["abc", [{"k": "10"}, "def"], {"x":"abc"}, {"y":"bcd"}]';
mysql> SELECT JSON_SEARCH(@j, 'one', 'abc');
+---------------------------------+
| JSON_SEARCH(@j, 'one', 'abc') |
+--------------------------------+
| "$[0]" |
+---------------------------------+
mysql> SELECT JSON_SEARCH(@j, 'all', 'abc');
+---------------------------------+
| JSON_SEARCH(@j, 'all', 'abc') |
+--------------------------------+
| ["$[0]", "$[2].x"] |
+---------------------------------+
mysql> SELECT JSON_SEARCH(@j, 'all', 'ghi');
+---------------------------------+
| JSON_SEARCH(@j, 'all', 'ghi') |
+---------------------------------+
| NULL |
+---------------------------------+
mysql> SELECT JSON_SEARCH(@j, 'all', '10');
+-------------------------------+
| JSON_SEARCH(@j, 'all', '10') |
+-------------------------------+
| "$[1][0].k" |
+--------------------------------+
mysql> SELECT JSON_SEARCH(@j, 'all', '10', NULL, '$');
+-------------------------------------------+
| JSON_SEARCH(@j, 'all', '10', NULL, '$') |
+------------------------------------------+
```

```
| "$[1][0].k" \
mysql> SELECT JSON_SEARCH(@j, 'all', '10', NULL, '$[*]');
+----------------------------------------------+
| JSON_SEARCH(@j, 'all', '10', NULL, '$[*]') |
+----------------------------------------------
| "$[1][0].k"
mysql> SELECT JSON_SEARCH(@j, 'all', '10', NULL, '$**.k');
+----------------------------------------------+
| JSON_SEARCH(@j, 'all', '10', NULL, '$**.k') |
+------------------------------------------------
| "$[1][0].k"
mysql> SELECT JSON_SEARCH(@j, 'all', '10', NULL, '$[*][0].k');
+-----------------------------------------------------
| JSON_SEARCH(@j, 'all', '10', NULL, '$[*][0].k') |
+------------------------------------------------------
| "$[1][0].k"
+-----------------------------------------------------
mysql> SELECT JSON_SEARCH(@j, 'all', '10', NULL, '$[1]');
+----------------------------------------------
| JSON_SEARCH(@j, 'all', '10', NULL, '$[1]') |
+-----------------------------------------------
| "$[1][0].k" |
mysql> SELECT JSON_SEARCH(@j, 'all', '10', NULL, '$[1][0]');
+------------------------------------------------+
| JSON_SEARCH(@j, 'all', '10', NULL, '$[1][0]') |
+--------------------------------------------------
| "$[1][0].k"
mysql> SELECT JSON_SEARCH(@j, 'all', 'abc', NULL, '$[2]');
+------------------------------------------------
| JSON_SEARCH(@j, 'all', 'abc', NULL, '$[2]') |
+------------------------------------------------
| "$[2].x"
+-------------------------------------------------
mysql> SELECT JSON_SEARCH(@j, 'all', '%a%');
+---------------------------------+
| JSON_SEARCH(@j, 'all', '%a%') |
+--------------------------------+
| ["$[0]", "$[2].x"] |
mysql> SELECT JSON_SEARCH(@j, 'all', '%b%');
+---------------------------------+
| JSON_SEARCH(@j, 'all', '%b%') |
+--------------------------------+
| ["$[0]", "$[2].x", "$[3].y"] |
+---------------------------------+
mysql> SELECT JSON_SEARCH(@j, 'all', '%b%', NULL, '$[0]');
+-----------------------------------------------
| JSON_SEARCH(@j, 'all', '%b%', NULL, '$[0]') |
+------------------------------------------------
| "$[0]" |
mysql> SELECT JSON_SEARCH(@j, 'all', '%b%', NULL, '$[2]');
+----------------------------------------------
| JSON_SEARCH(@j, 'all', '%b%', NULL, '$[2]') |
+-------------------------------------------------
| "$[2].x"
+------------------------------------------------
```

```
mysql> SELECT JSON_SEARCH(@j, 'all', '%b%', NULL, '$[1]');
+------------------------------------------------
| JSON_SEARCH(@j, 'all', '%b%', NULL, '$[1]') |
+------------------------------------------------
| NULL |
+-----------------------------------------------+
mysql> SELECT JSON_SEARCH(@j, 'all', '%b%', '', '$[1]');
+--------------------------------------------+
| JSON_SEARCH(@j, 'all', '%b%', '', '$[1]') |
+---------------------------------------------+
| NULL |
+---------------------------------------------
mysql> SELECT JSON_SEARCH(@j, 'all', '%b%', '', '$[3]');
+----------------------------------------------
| JSON_SEARCH(@j, 'all', '%b%', '', '$[3]') |
+----------------------------------------------
| "$[3].y" |
+--------------------------------------------+
```


For more information about the JSON path syntax supported by MySQL, including rules governing the wildcard operators * and **, see JSON Path Syntax.
- JSON_VALUE(json_doc, path)

Extracts a value from a JSON document at the path given in the specified document, and returns the extracted value, optionally converting it to a desired type. The complete syntax is shown here:
```
JSON_VALUE(json_doc, path [RETURNING type] [on_empty] [on_error])
on_empty:
    {NULL | ERROR | DEFAULT value} ON EMPTY
on_error:
    {NULL | ERROR | DEFAULT value} ON ERROR
```

json_doc is a valid JSON document. If this is NULL, the function returns NULL. path is a JSON path pointing to a location in the document. This must be a string literal value. type is one of the following data types:
- FLOAT
- DOUBLE
- DECIMAL
- SIGNED
- UNSIGNED
- DATE
- TIME
- DATETIME
- YEAR

YEAR values of one or two digits are not supported.
- CHAR
- JSON

The types just listed are the same as the (non-array) types supported by the CAST( ) function.
If not specified by a RETURNING clause, the JSON_VALUE( ) function's return type is VARCHAR( 512 ). When no character set is specified for the return type, JSON_VALUE( ) uses utf 8 mb 4 with the binary collation, which is case-sensitive; if utf 8 mb 4 is specified as the character set for the result, the server uses the default collation for this character set, which is not casesensitive.

When the data at the specified path consists of or resolves to a JSON null literal, the function returns SQL NULL.
on_empty, if specified, determines how JSON_VALUE( ) behaves when no data is found at the path given; this clause takes one of the following values:
- NULL ON EMPTY: The function returns NULL; this is the default ON EMPTY behavior.
- DEFAULT value ON EMPTY: the provided value is returned. The value's type must match that of the return type.
- ERROR ON EMPTY: The function throws an error.

If used, on_error takes one of the following values with the corresponding outcome when an error occurs, as listed here:
- NULL ON ERROR: JSON_VALUE() returns NULL; this is the default behavior if no ON ERROR clause is used.
- DEFAULT value ON ERROR: This is the value returned; its value must match that of the return type.
- ERROR ON ERROR: An error is thrown.

ON EMPTY, if used, must precede any ON ERROR clause. Specifying them in the wrong order results in a syntax error.

Error handling. In general, errors are handled by JSON_VALUE( ) as follows:
- All JSON input (document and path) is checked for validity. If any of it is not valid, an SQL error is thrown without triggering the ON ERROR clause.
- ON ERROR is triggered whenever any of the following events occur:
- Attempting to extract an object or an array, such as that resulting from a path that resolves to multiple locations within the JSON document
- Conversion errors, such as attempting to convert 'asdf' to an UNSIGNED value
- Truncation of values
- A conversion error always triggers a warning even if NULL ON ERROR or DEFAULT . . . ON ERROR is specified.
- The ON EMPTY clause is triggered when the source JSON document (expr) contains no data at the specified location (path).

Examples. Two simple examples are shown here:
```
mysql> SELECT JSON_VALUE('{"fname": "Joe", "lname": "Palmer"}', '$.fname');
+------------------------------------------------------------------
| JSON_VALUE('{"fname": "Joe", "lname": "Palmer"}', '$.fname') |
+------------------------------------------------------------------
```

```
| Joe +-------------------------------------------------------------+
mysql> SELECT JSON_VALUE('{"item": "shoes", "price": "49.95"}', '$.price'
        -> RETURNING DECIMAL(4,2)) AS price;
+-------+
| price |
+-------+
| 49.95 |
+-------+
```


Except in cases where JSON_VALUE( ) returns NULL, the statement SELECT JSON_VALUE(json_doc, path RETURNING type) is equivalent to the following statement:
```
SELECT CAST(
        JSON_UNQUOTE( JSON_EXTRACT(json_doc, path) )
        AS type
);
```


JSON_VALUE( ) simplifies creating indexes on JSON columns by making it unnecessary in many cases to create a generated column and then an index on the generated column. You can do this when creating a table t1 that has a JSON column by creating an index on an expression that uses JSON_VALUE( ) operating on that column (with a path that matches a value in that column), as shown here:
```
CREATE TABLE t1(
        j JSON,
        INDEX i1 ( (JSON_VALUE(j, '$.id' RETURNING UNSIGNED)) )
);
```


The following EXPLAIN output shows that a query against t1 employing the index expression in the WHERE clause uses the index thus created:
```
mysql> EXPLAIN SELECT * FROM t1
        -> WHERE JSON_VALUE(j, '$.id' RETURNING UNSIGNED) = 123\G
************************** 1. row *******************************
                    id: 1
    select_type: SIMPLE
                table: t1
        partitions: NULL
                    type: ref
possible_keys: i1
                        key: i1
                ey_len: 9
                        ref: const
                    rows: 1
            filtered: 100.00
                Extra: NULL
```


This achieves much the same effect as creating a table t2 with an index on a generated column (see Indexing a Generated Column to Provide a JSON Column Index), like this one:
```
CREATE TABLE t2 (
        j JSON,
        g INT GENERATED ALWAYS AS (j->"$.id"),
        INDEX i1 (g)
);
```


The EXPLAIN output for a query against this table, referencing the generated column, shows that the index is used in the same way as for the previous query against table t1:
```
mysql> EXPLAIN SELECT * FROM t2 WHERE g = 123\G
*************************** 1. row ****************************************
                    id: 1
    select_type: SIMPLE
            table: t2
        partitions: NULL
                type: ref
possible_keys: i1
```

```
        key: i1
    key_len: 5
            ref: const
        rows: 1
filtered: 100.00
        Extra: NULL
```


For information about using indexes on generated columns for indirect indexing of JSON columns, see Indexing a Generated Column to Provide a JSON Column Index.
- value MEMBER OF(json_array)

Returns true (1) if value is an element of json_array, otherwise returns false (0). value must be a scalar or a JSON document; if it is a scalar, the operator attempts to treat it as an element of a JSON array. If value or json_array is NULL, the function returns NULL.

Queries using MEMBER OF() on JSON columns of InnoDB tables in the WHERE clause can be optimized using multi-valued indexes. See Multi-Valued Indexes, for detailed information and examples.

Simple scalars are treated as array values, as shown here:
```
mysql> SELECT 17 MEMBER OF('[23, "abc", 17, "ab", 10]');
+---------------------------------------------
| 17 MEMBER OF('[23, "abc", 17, "ab", 10]') |
+---------------------------------------------
| 1 |
+--------------------------------------------+
1 row in set (0.00 sec)
mysql> SELECT 'ab' MEMBER OF('[23, "abc", 17, "ab", 10]');
+-----------------------------------------------+
| 'ab' MEMBER OF('[23, "abc", 17, "ab", 10]') |
+------------------------------------------------
| 1 |
+------------------------------------------------
1 row in set (0.00 sec)
```


Partial matches of array element values do not match:
```
mysql> SELECT 7 MEMBER OF('[23, "abc", 17, "ab", 10]');
+--------------------------------------------+
| 7 MEMBER OF('[23, "abc", 17, "ab", 10]') |
+-------------------------------------------+
| 0 |
+-------------------------------------------+
1 row in set (0.00 sec)
mysql> SELECT 'a' MEMBER OF('[23, "abc", 17, "ab", 10]');
+----------------------------------------------+
| 'a' MEMBER OF('[23, "abc", 17, "ab", 10]') |
+----------------------------------------------+
| 0 |
+-----------------------------------------------
1 row in set (0.00 sec)
```


Conversions to and from string types are not performed:
```
mysql> SELECT
    -> 17 MEMBER OF('[23, "abc", "17", "ab", 10]'),
    -> "17" MEMBER OF('[23, "abc", 17, "ab", 10]')\G
*************************** 1. row *****************************
17 MEMBER OF('[23, "abc", "17", "ab", 10]'): 0
"17" MEMBER OF('[23, "abc", 17, "ab", 10]'): 0
```

```
1 row in set (0.00 sec)
```


To use this operator with a value which is itself an array, it is necessary to cast it explicitly as a JSON array. You can do this with CAST(... AS JSON):
```
mysql> SELECT CAST('[4,5]' AS JSON) MEMBER OF('[[3,4],[4,5]]');
+----------------------------------------------------+
| CAST('[4,5]' AS JSON) MEMBER OF('[[3,4],[4,5]]') |
+-----------------------------------------------------
| 1 |
+------------------------------------------------------
1 row in set (0.00 sec)
```


It is also possible to perform the necessary cast using the JSON_ARRAY( ) function, like this:
```
mysql> SELECT JSON_ARRAY(4,5) MEMBER OF('[[3,4],[4,5]]');
+----------------------------------------------+
| JSON_ARRAY(4,5) MEMBER OF('[[3,4],[4,5]]') |
+----------------------------------------------
| 1 |
+----------------------------------------------
1 row in set (0.00 sec)
```


Any JSON objects used as values to be tested or which appear in the target array must be coerced to the correct type using CAST(... AS JSON) or JSON_OBJECT( ). In addition, a target array containing JSON objects must itself be cast using JSON_ARRAY. This is demonstrated in the following sequence of statements:
```
mysql> SET @a = CAST('{"a":1}' AS JSON);
Query OK, 0 rows affected (0.00 sec)
mysql> SET @b = JSON_OBJECT("b", 2);
Query OK, 0 rows affected (0.00 sec)
mysql> SET @c = JSON_ARRAY(17, @b, "abc", @a, 23);
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @a MEMBER OF(@c), @b MEMBER OF(@c);
+-------------------+------------------+
| @a MEMBER OF(@c) | @b MEMBER OF(@c) |
+-------------------+------------------+
| 1 | 1 |
+-------------------+------------------+
1 row in set (0.00 sec)
```


\subsection*{14.17.4 Functions That Modify JSON Values}

The functions in this section modify JSON values and return the result.
- JSON_ARRAY_APPEND(json_doc, path, val[, path, val] ...)

Appends values to the end of the indicated arrays within a JSON document and returns the result. Returns NULL if any argument is NULL. An error occurs if the $j$ son_doc argument is not a valid JSON document or any path argument is not a valid path expression or contains a * or * * wildcard.

The path-value pairs are evaluated left to right. The document produced by evaluating one pair becomes the new value against which the next pair is evaluated.

If a path selects a scalar or object value, that value is autowrapped within an array and the new value is added to that array. Pairs for which the path does not identify any value in the JSON document are ignored.
```
mysql> SET @j = '["a", ["b", "c"], "d"]';
mysql> SELECT JSON_ARRAY_APPEND(@j, '$[1]', 1);
+-------------------------------------+
| JSON_ARRAY_APPEND(@j, '$[1]', 1) |
+------------------------------------+
```

```
| ["a", ["b", "c", 1], "d"] |
mysql> SELECT JSON_ARRAY_APPEND(@j, '$[0]', 2);
+-----------------------------------+
| JSON_ARRAY_APPEND(@j, '$[0]', 2) |
+------------------------------------+
| [["a", 2], ["b", "c"], "d"] |
+------------------------------------+
mysql> SELECT JSON_ARRAY_APPEND(@j, '$[1][0]', 3);
+---------------------------------------+
| JSON_ARRAY_APPEND(@j, '$[1][0]', 3) |
+--------------------------------------+
| ["a", [["b", 3], "c"], "d"] |
mysql> SET @j = '{"a": 1, "b": [2, 3], "c": 4}';
mysql> SELECT JSON_ARRAY_APPEND(@j, '$.b', 'x');
+--------------------------------------+
| JSON_ARRAY_APPEND(@j, '$.b', 'x') |
+--------------------------------------+
| {"a": 1, "b": [2, 3, "x"], "c": 4} |
+--------------------------------------+
mysql> SELECT JSON_ARRAY_APPEND(@j, '$.c', 'y');
+----------------------------------------+
| JSON_ARRAY_APPEND(@j, '$.c', 'y') |
+----------------------------------------+
| {"a": 1, "b": [2, 3], "c": [4, "y"]} |
+----------------------------------------+
mysql> SET @j = '{"a": 1}';
mysql> SELECT JSON_ARRAY_APPEND(@j, '$', 'z');
+----------------------------------+
| JSON_ARRAY_APPEND(@j, '$', 'z') |
+-----------------------------------+
| [{"a": 1}, "z"] |
```

- JSON_ARRAY_INSERT(json_doc, path, val[, path, val] ...)

Updates a JSON document, inserting into an array within the document and returning the modified document. Returns NULL if any argument is NULL. An error occurs if the json_doc argument is not a valid JSON document or any path argument is not a valid path expression or contains a * or ** wildcard or does not end with an array element identifier.

The path-value pairs are evaluated left to right. The document produced by evaluating one pair becomes the new value against which the next pair is evaluated.

Pairs for which the path does not identify any array in the JSON document are ignored. If a path identifies an array element, the corresponding value is inserted at that element position, shifting any following values to the right. If a path identifies an array position past the end of an array, the value is inserted at the end of the array.
```
mysql> SET @j = '["a", {"b": [1, 2]}, [3, 4]]';
mysql> SELECT JSON_ARRAY_INSERT(@j, '$[1]', 'x');
+--------------------------------------+
| JSON_ARRAY_INSERT(@j, '$[1]', 'x') |
+--------------------------------------+
| ["a", "x", {"b": [1, 2]}, [3, 4]] |
+--------------------------------------+
mysql> SELECT JSON_ARRAY_INSERT(@j, '$[100]', 'x');
+----------------------------------------+
| JSON_ARRAY_INSERT(@j, '$[100]', 'x') |
+----------------------------------------+
| ["a", {"b": [1, 2]}, [3, 4], "x"] |
+---------------------------------------+
mysql> SELECT JSON_ARRAY_INSERT(@j, '$[1].b[0]', 'x');
+-------------------------------------------
    JSON_ARRAY_INSERT(@j, '$[1].b[0]', 'x') |
+-------------------------------------------+
```

```
| ["a", {"b": ["x", 1, 2]}, [3, 4]] |
+-------------------------------------------+
mysql> SELECT JSON_ARRAY_INSERT(@j, '$[2][1]', 'y');
+----------------------------------------+
| JSON_ARRAY_INSERT(@j, '$[2][1]', 'y') |
+----------------------------------------+
| ["a", {"b": [1, 2]}, [3, "y", 4]] |
+----------------------------------------+
mysql> SELECT JSON_ARRAY_INSERT(@j, '$[0]', 'x', '$[2][1]', 'y');
+--------------------------------------------------------
| JSON_ARRAY_INSERT(@j, '$[0]', 'x', '$[2][1]', 'y') |
+-------------------------------------------------------
| ["x", "a", {"b": [1, 2]}, [3, 4]] |
```


Earlier modifications affect the positions of the following elements in the array, so subsequent paths in the same JSON_ARRAY_INSERT( ) call should take this into account. In the final example, the second path inserts nothing because the path no longer matches anything after the first insert.
- JSON_INSERT(json_doc, path, val[, path, val] ...)

Inserts data into a JSON document and returns the result. Returns NULL if any argument is NULL. An error occurs if the json_doc argument is not a valid JSON document or any path argument is not a valid path expression or contains a * or * * wildcard.

The path-value pairs are evaluated left to right. The document produced by evaluating one pair becomes the new value against which the next pair is evaluated.

A path-value pair for an existing path in the document is ignored and does not overwrite the existing document value. A path-value pair for a nonexisting path in the document adds the value to the document if the path identifies one of these types of values:
- A member not present in an existing object. The member is added to the object and associated with the new value.
- A position past the end of an existing array. The array is extended with the new value. If the existing value is not an array, it is autowrapped as an array, then extended with the new value.

Otherwise, a path-value pair for a nonexisting path in the document is ignored and has no effect.
For a comparison of JSON_INSERT( ), JSON_REPLACE( ), and JSON_SET( ), see the discussion of JSON_SET().
```
mysql> SET @j = '{ "a": 1, "b": [2, 3]}';
mysql> SELECT JSON_INSERT(@j, '$.a', 10, '$.c', '[true, false]');
+------------------------------------------------------
| JSON_INSERT(@j, '$.a', 10, '$.c', '[true, false]') |
+-------------------------------------------------------
| {"a": 1, "b": [2, 3], "c": "[true, false]"} |
```


The third and final value listed in the result is a quoted string and not an array like the second one (which is not quoted in the output); no casting of values to the JSON type is performed. To insert the array as an array, you must perform such casts explicitly, as shown here:
```
mysql> SELECT JSON_INSERT(@j, '$.a', 10, '$.c', CAST('[true, false]' AS JSON));
+------------------------------------------------------------------------
| JSON_INSERT(@j, '$.a', 10, '$.c', CAST('[true, false]' AS JSON)) |
+-----------------------------------------------------------------------
| {"a": 1, "b": [2, 3], "c": [true, false]} |
+---------------------------------------------------------------------
1 row in set (0.00 sec)
```

- JSON_MERGE(json_doc, json_doc[, json_doc] ...)

Deprecated synonym for JSON_MERGE_PRESERVE().
```
- JSON_MERGE_PATCH(json_doc, json_doc[, json_doc] ...)
```


Performs an RFC 7396 compliant merge of two or more JSON documents and returns the merged result, without preserving members having duplicate keys. Raises an error if at least one of the documents passed as arguments to this function is not valid.

\section*{Note}

For an explanation and example of the differences between this function and JSON_MERGE_PRESERVE( ), see JSON_MERGE_PATCH() compared with JSON_MERGE_PRESERVE().

JSON_MERGE_PATCH( ) performs a merge as follows:
1. If the first argument is not an object, the result of the merge is the same as if an empty object had been merged with the second argument.
2. If the second argument is not an object, the result of the merge is the second argument.
3. If both arguments are objects, the result of the merge is an object with the following members:
- All members of the first object which do not have a corresponding member with the same key in the second object.
- All members of the second object which do not have a corresponding key in the first object, and whose value is not the JSON null literal.
- All members with a key that exists in both the first and the second object, and whose value in the second object is not the JSON null literal. The values of these members are the results of recursively merging the value in the first object with the value in the second object.

For additional information, see Normalization, Merging, and Autowrapping of JSON Values.
```
mysql> SELECT JSON_MERGE_PATCH('[1, 2]', '[true, false]');
+----------------------------------------------+
| JSON_MERGE_PATCH('[1, 2]', '[true, false]') |
+------------------------------------------------
| [true, false] |
mysql> SELECT JSON_MERGE_PATCH('{"name": "x"}', '{"id": 47}');
+-----------------------------------------------------
| JSON_MERGE_PATCH('{"name": "x"}', '{"id": 47}') |
+-----------------------------------------------------
| {"id": 47, "name": "x"} |
+-----------------------------------------------------
mysql> SELECT JSON_MERGE_PATCH('1', 'true');
+---------------------------------+
| JSON_MERGE_PATCH('1', 'true') |
+---------------------------------+
| true |
+--------------------------------+
mysql> SELECT JSON_MERGE_PATCH('[1, 2]', '{"id": 47}');
+--------------------------------------------+
| JSON_MERGE_PATCH('[1, 2]', '{"id": 47}') |
+--------------------------------------------+
| {"id": 47} |
+--------------------------------------------+
mysql> SELECT JSON_MERGE_PATCH('{ "a": 1, "b":2 }',
    > '{ "a": 3, "c":4 }');
+---------------------------------------------------------------
| JSON_MERGE_PATCH('{ "a": 1, "b":2 }','{ "a": 3, "c":4 }') |
+--------------------------------------------------------------+
```

```
mysql> SELECT JSON_MERGE_PATCH('{ "a": 1, "b":2 }','{ "a": 3, "c":4 }',
    > '{ "a": 5, "d":6 }');
+---------------------------------------------------------------------------------
| JSON_MERGE_PATCH('{ "a": 1, "b":2 }','{ "a": 3, "c":4 }','{ "a": 5, "d":6 }') |
+--------------------------------------------------------------------------------
| {"a": 5, "b": 2, "c": 4, "d": 6}
```


You can use this function to remove a member by specifying null as the value of the same member in the second argument, as shown here:
```
mysql> SELECT JSON_MERGE_PATCH('{"a":1, "b":2}', '{"b":null}');
+-----------------------------------------------------
| JSON_MERGE_PATCH('{"a":1, "b":2}', '{"b":null}') |
+------------------------------------------------------
| {"a": 1} |
+-----------------------------------------------------
```


This example shows that the function operates in a recursive fashion; that is, values of members are not limited to scalars, but rather can themselves be JSON documents:
```
mysql> SELECT JSON_MERGE_PATCH('{"a":{"x":1}}', '{"a":{"y":2}}');
+------------------------------------------------------
| JSON_MERGE_PATCH('{"a":{"x":1}}', '{"a":{"y":2}}') |
+-------------------------------------------------------
| {"a": {"x": 1, "y": 2}} |
```


JSON_MERGE_PATCH() compared with JSON_MERGE_PRESERVE(). The behavior of JSON_MERGE_PATCH( ) is the same as that of JSON_MERGE_PRESERVE( ), with the following two exceptions:
- JSON_MERGE_PATCH( ) removes any member in the first object with a matching key in the second object, provided that the value associated with the key in the second object is not JSON null.
- If the second object has a member with a key matching a member in the first object, JSON_MERGE_PATCH( ) replaces the value in the first object with the value in the second object, whereas JSON_MERGE_PRESERVE( ) appends the second value to the first value.

This example compares the results of merging the same 3 JSON objects, each having a matching key "a", with each of these two functions:
```
mysql> SET @x = '{ "a": 1, "b": 2 }',
    > @y = '{ "a": 3, "c": 4 }',
    > @z = '{ "a": 5, "d": 6 }';
mysql> SELECT JSON_MERGE_PATCH(@x, @y, @z) AS Patch,
    -> JSON_MERGE_PRESERVE(@x, @y, @z) AS Preserve\G
************************** 1. row *****************************************
    Patch: {"a": 5, "b": 2, "c": 4, "d": 6}
Preserve: {"a": [1, 3, 5], "b": 2, "c": 4, "d": 6}
```

```
- JSON_MERGE_PRESERVE(json_doc, json_doc[, json_doc] ...)
```


Merges two or more JSON documents and returns the merged result. Returns NULL if any argument is NULL. An error occurs if any argument is not a valid JSON document.

Merging takes place according to the following rules. For additional information, see Normalization, Merging, and Autowrapping of JSON Values.
- Adjacent arrays are merged to a single array.
- Adjacent objects are merged to a single object.
- A scalar value is autowrapped as an array and merged as an array.
- An adjacent array and object are merged by autowrapping the object as an array and merging the two arrays.
```
mysql> SELECT JSON_MERGE_PRESERVE('[1, 2]', '[true, false]');
+--------------------------------------------------+
| JSON_MERGE_PRESERVE('[1, 2]', '[true, false]') |
+----------------------------------------------------
| [1, 2, true, false]
mysql> SELECT JSON_MERGE_PRESERVE('{"name": "x"}', '{"id": 47}');
+-------------------------------------------------------
| JSON_MERGE_PRESERVE('{"name": "x"}', '{"id": 47}') |
+-------------------------------------------------------
| {"id": 47, "name": "x"} |
+-------------------------------------------------------
mysql> SELECT JSON_MERGE_PRESERVE('1', 'true');
+------------------------------------+
| JSON_MERGE_PRESERVE('1', 'true') |
+-------------------------------------+
| [1, true] |
mysql> SELECT JSON_MERGE_PRESERVE('[1, 2]', '{"id": 47}');
+-----------------------------------------------
| JSON_MERGE_PRESERVE('[1, 2]', '{"id": 47}') |
+------------------------------------------------
| [1, 2, {"id": 47}] |
+------------------------------------------------
mysql> SELECT JSON_MERGE_PRESERVE('{ "a": 1, "b": 2 }',
    > '{ "a": 3, "c": 4 }');
+------------------------------------------------------------------
| JSON_MERGE_PRESERVE('{ "a": 1, "b": 2 }','{ "a": 3, "c":4 }') |
+-----------------------------------------------------------------
| {"a": [1, 3], "b": 2, "c": 4}
+------------------------------------------------------------+
mysql> SELECT JSON_MERGE_PRESERVE('{ "a": 1, "b": 2 }','{ "a": 3, "c": 4 }',
    > '{ "a": 5, "d": 6 }');
+--------------------------------------------------------------------------------------
| JSON_MERGE_PRESERVE('{ "a": 1, "b": 2 }','{ "a": 3, "c": 4 }','{ "a": 5, "d": 6 }') |
+--------------------------------------------------------------------------------------
| {"a": [1, 3, 5], "b": 2, "c": 4, "d": 6} |
```


This function is similar to but differs from JSON_MERGE_PATCH( ) in significant respects; see JSON_MERGE_PATCH() compared with JSON_MERGE_PRESERVE(), for more information.
- JSON_REMOVE(json_doc, path[, path] ...)

Removes data from a JSON document and returns the result. Returns NULL if any argument is NULL. An error occurs if the json_doc argument is not a valid JSON document or any path argument is not a valid path expression or is $\$$ or contains a * or ** wildcard.

The path arguments are evaluated left to right. The document produced by evaluating one path becomes the new value against which the next path is evaluated.

It is not an error if the element to be removed does not exist in the document; in that case, the path does not affect the document.
```
mysql> SET @j = '["a", ["b", "c"], "d"]';
mysql> SELECT JSON_REMOVE(@j, '$[1]');
+---------------------------+
| JSON_REMOVE(@j, '$[1]') |
+---------------------------+
| ["a", "d"] |
+---------------------------+
```

- JSON_REPLACE(json_doc, path, val[, path, val] ...)

Replaces existing values in a JSON document and returns the result. Returns NULL if json_doc or any path argument is NULL. An error occurs if the json_doc argument is not a valid JSON document or any path argument is not a valid path expression or contains a * or ** wildcard.

The path-value pairs are evaluated left to right. The document produced by evaluating one pair becomes the new value against which the next pair is evaluated.

A path-value pair for an existing path in the document overwrites the existing document value with the new value. A path-value pair for a nonexisting path in the document is ignored and has no effect.

The optimizer can perform a partial, in-place update of a JSON column instead of removing the old document and writing the new document in its entirety to the column. This optimization can be performed for an update statement that uses the JSON_REPLACE() function and meets the conditions outlined in Partial Updates of JSON Values.

For a comparison of JSON_INSERT( ), JSON_REPLACE( ), and JSON_SET( ), see the discussion of JSON_SET().
```
mysql> SET @j = '{ "a": 1, "b": [2, 3]}';
mysql> SELECT JSON_REPLACE(@j, '$.a', 10, '$.c', '[true, false]');
+--------------------------------------------------------
| JSON_REPLACE(@j, '$.a', 10, '$.c', '[true, false]') |
+-------------------------------------------------------
| {"a": 10, "b": [2, 3]} |
+--------------------------------------------------------
mysql> SELECT JSON_REPLACE(NULL, '$.a', 10, '$.c', '[true, false]');
+----------------------------------------------------------
| JSON_REPLACE(NULL, '$.a', 10, '$.c', '[true, false]') |
+----------------------------------------------------------
| NULL |
+---------------------------------------------------------+
mysql> SELECT JSON_REPLACE(@j, NULL, 10, '$.c', '[true, false]');
+------------------------------------------------------
| JSON_REPLACE(@j, NULL, 10, '$.c', '[true, false]') |
+------------------------------------------------------
| NULL |
+-------------------------------------------------------
mysql> SELECT JSON_REPLACE(@j, '$.a', NULL, '$.c', '[true, false]');
+---------------------------------------------------------
| JSON_REPLACE(@j, '$.a', NULL, '$.c', '[true, false]') |
+----------------------------------------------------------
| {"a": null, "b": [2, 3]}
```

```
+-------------------------------------------------------+
- JSON_SET(json_doc, path, val[, path, val] ...)
Inserts or updates data in a JSON document and returns the result. Returns NULL if json_doc or path is NULL, or if path, when given, does not locate an object. Otherwise, an error occurs if the json_doc argument is not a valid JSON document or any path argument is not a valid path expression or contains a * or ** wildcard.
```


The path-value pairs are evaluated left to right. The document produced by evaluating one pair becomes the new value against which the next pair is evaluated.

A path-value pair for an existing path in the document overwrites the existing document value with the new value. A path-value pair for a nonexisting path in the document adds the value to the document if the path identifies one of these types of values:
- A member not present in an existing object. The member is added to the object and associated with the new value.
- A position past the end of an existing array. The array is extended with the new value. If the existing value is not an array, it is autowrapped as an array, then extended with the new value.

Otherwise, a path-value pair for a nonexisting path in the document is ignored and has no effect.
The optimizer can perform a partial, in-place update of a JSON column instead of removing the old document and writing the new document in its entirety to the column. This optimization can be performed for an update statement that uses the JSON_SET( ) function and meets the conditions outlined in Partial Updates of JSON Values.
```
The JSON_SET(), JSON_INSERT( ), and JSON_REPLACE() functions are related:
```

- JSON_SET( ) replaces existing values and adds nonexisting values.
- JSON_INSERT( ) inserts values without replacing existing values.
- JSON_REPLACE( ) replaces only existing values.

The following examples illustrate these differences, using one path that does exist in the document (\$. a) and another that does not exist (\$. c):
```
mysql> SET @j = '{ "a": 1, "b": [2, 3]}';
mysql> SELECT JSON_SET(@j, '$.a', 10, '$.c', '[true, false]');
+----------------------------------------------------
| JSON_SET(@j, '$.a', 10, '$.c', '[true, false]') |
+-----------------------------------------------------
| {"a": 10, "b": [2, 3], "c": "[true, false]"} |
+---------------------------------------------------+
mysql> SELECT JSON_INSERT(@j, '$.a', 10, '$.c', '[true, false]');
+-------------------------------------------------------
| JSON_INSERT(@j, '$.a', 10, '$.c', '[true, false]') |
+--------------------------------------------------------
| {"a": 1, "b": [2, 3], "c": "[true, false]"} |
+------------------------------------------------------
mysql> SELECT JSON_REPLACE(@j, '$.a', 10, '$.c', '[true, false]');
+-------------------------------------------------------+
| JSON_REPLACE(@j, '$.a', 10, '$.c', '[true, false]') |
+--------------------------------------------------------
| {"a": 10, "b": [2, 3]} |
+-------------------------------------------------------+
```

- JSON_UNQUOTE(json_val)

Unquotes JSON value and returns the result as a utf8mb4 string. Returns NULL if the argument is NULL. An error occurs if the value starts and ends with double quotes but is not a valid JSON string literal.

Within a string, certain sequences have special meaning unless the NO_BACKSLASH_ESCAPES SQL mode is enabled. Each of these sequences begins with a backslash ( \\), known as the escape character. MySQL recognizes the escape sequences shown in Table 14.23, "JSON_UNQUOTE() Special Character Escape Sequences". For all other escape sequences, backslash is ignored. That is, the escaped character is interpreted as if it was not escaped. For example, $\backslash \mathrm{x}$ is just x . These sequences are case-sensitive. For example, \b is interpreted as a backspace, but \B is interpreted as B.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.23 JSON_UNQUOTE() Special Character Escape Sequences}
\begin{tabular}{|l|l|}
\hline Escape Sequence & Character Represented by Sequence \\
\hline \" & A double quote (") character \\
\hline \b & A backspace character \\
\hline \f & A formfeed character \\
\hline \n & A newline (linefeed) character \\
\hline \r & A carriage return character \\
\hline \t & A tab character \\
\hline \\ & A backslash ( \\) character \\
\hline \uXXXX & UTF-8 bytes for Unicode value XXXX \\
\hline
\end{tabular}
\end{table}

Two simple examples of the use of this function are shown here:
```
mysql> SET @j = '"abc"';
mysql> SELECT @j, JSON_UNQUOTE(@j);
+-------+-------------------+
| @j | JSON_UNQUOTE(@j) |
+-------+-------------------+
| "abc" | abc |
+-------+--------------------+
mysql> SET @j = '[1, 2, 3]';
mysql> SELECT @j, JSON_UNQUOTE(@j);
+-----------+------------------+
| @j | JSON_UNQUOTE(@j) |
+------------+------------------+
| [1, 2, 3] | [1, 2, 3] |
+------------+------------------+
```


The following set of examples shows how JSON_UNQUOTE handles escapes with NO_BACKSLASH_ESCAPES disabled and enabled:
```
mysql> SELECT @@sql_mode;
+-------------+
| @@sql_mode |
+-------------+
| |
+-------------+
mysql> SELECT JSON_UNQUOTE('"\\t\\u0032"');
+-------------------------------+
| JSON_UNQUOTE('"\\t\\u0032"') |
+-------------------------------+
| 2 |
+--------------------------------+
mysql> SET @@sql_mode = 'NO_BACKSLASH_ESCAPES';
mysql> SELECT JSON_UNQUOTE('"\\t\\u0032"');
+-------------------------------+
| JSON_UNQUOTE('"\\t\\u0032"') |
+-------------------------------+
| \t\u0032 |
+--------------------------------+
```

```
mysql> SELECT JSON_UNQUOTE('"\t\u0032"');
+-----------------------------+
| JSON_UNQUOTE('"\t\u0032"') |
+------------------------------+
| 2 |
```


\subsection*{14.17.5 Functions That Return JSON Value Attributes}

The functions in this section return attributes of JSON values.
- JSON_DEPTH(json_doc)

Returns the maximum depth of a JSON document. Returns NULL if the argument is NULL. An error occurs if the argument is not a valid JSON document.

An empty array, empty object, or scalar value has depth 1 . A nonempty array containing only elements of depth 1 or nonempty object containing only member values of depth 1 has depth 2 . Otherwise, a JSON document has depth greater than 2 .
```
mysql> SELECT JSON_DEPTH('{}'), JSON_DEPTH('[]'), JSON_DEPTH('true');
+-------------------+-------------------+--------------------
| JSON_DEPTH('{}') | JSON_DEPTH('[]') | JSON_DEPTH('true') |
+-------------------+------------------+---------------------
| 1 | 1 | 1 |
+--------------------+------------------+--------------------
mysql> SELECT JSON_DEPTH('[10, 20]'), JSON_DEPTH('[[], {}]');
+--------------------------+------------------------+
| JSON_DEPTH('[10, 20]') | JSON_DEPTH('[[], {}]') |
+--------------------------+---------------------------
| 2 | 2 |
+--------------------------+-------------------------
mysql> SELECT JSON_DEPTH('[10, {"a": 20}]');
+--------------------------------+
| JSON_DEPTH('[10, {"а": 20}]') |
+---------------------------------+
| 3 |
+---------------------------------+
```

- JSON_LENGTH(json_doc[, path])

Returns the length of a JSON document, or, if a path argument is given, the length of the value within the document identified by the path. Returns NULL if any argument is NULL or the path argument does not identify a value in the document. An error occurs if the json_doc argument is not a valid JSON document or the path argument is not a valid path expression.

The length of a document is determined as follows:
- The length of a scalar is 1 .
- The length of an array is the number of array elements.
- The length of an object is the number of object members.
- The length does not count the length of nested arrays or objects.
```
mysql> SELECT JSON_LENGTH('[1, 2, {"a": 3}]');
+-----------------------------------+
| JSON_LENGTH('[1, 2, {"a": 3}]') |
+----------------------------------+
| 3 |
+----------------------------------+
mysql> SELECT JSON_LENGTH('{"a": 1, "b": {"c": 30}}');
+-------------------------------------------+
| JSON_LENGTH('{"a": 1, "b": {"c": 30}}') |
+-------------------------------------------+
| 2 |
```

```
+--------------------------------------------+
+--------------------------------------------------
| JSON_LENGTH('{"a": 1, "b": {"c": 30}}', '$.b') |
+-----------------------------------------------------
| 1 |
+--------------------------------------------------
```

- JSON_TYPE(json_val)

Returns a utf8mb4 string indicating the type of a JSON value. This can be an object, an array, or a scalar type, as shown here:
```
mysql> SET @j = '{"a": [10, true]}';
mysql> SELECT JSON_TYPE(@j);
+----------------+
| JSON_TYPE(@j) |
+----------------+
| OBJECT |
mysql> SELECT JSON_TYPE(JSON_EXTRACT(@j, '$.a'));
+--------------------------------------+
| JSON_TYPE(JSON_EXTRACT(@j, '$.a')) |
+--------------------------------------+
| ARRAY |
+--------------------------------------+
mysql> SELECT JSON_TYPE(JSON_EXTRACT(@j, '$.a[0]'));
+-----------------------------------------+
| JSON_TYPE(JSON_EXTRACT(@j, '$.a[0]')) |
+-----------------------------------------+
| INTEGER |
+----------------------------------------+
mysql> SELECT JSON_TYPE(JSON_EXTRACT(@j, '$.a[1]'));
+-----------------------------------------+
| JSON_TYPE(JSON_EXTRACT(@j, '$.a[1]')) |
+-----------------------------------------+
| BOOLEAN
```


JSON_TYPE() returns NULL if the argument is NULL:
```
mysql> SELECT JSON_TYPE(NULL);
+------------------+
| JSON_TYPE(NULL) |
+------------------+
| NULL |
+------------------+
```


An error occurs if the argument is not a valid JSON value:
```
mysql> SELECT JSON_TYPE(1);
ERROR 3146 (22032): Invalid data type for JSON data in argument 1
to function json_type; a JSON string or JSON type is required.
```


For a non-NULL, non-error result, the following list describes the possible JSON_TYPE( ) return values:
- Purely JSON types:
- OBJECT: JSON objects
- ARRAY: JSON arrays
- BOOLEAN: The JSON true and false literals
- NULL: The JSON null literal
- Numeric types:
- INTEGER: MySQL TINYINT, SMALLINT, MEDIUMINT and INT and BIGINT scalars
- DOUBLE: MySQL DOUBLE FLOAT scalars
- DECIMAL: MySQL DECIMAL and NUMERIC scalars
- Temporal types:
- DATETIME: MySQL DATETIME and TIMESTAMP scalars
- DATE: MySQL DATE scalars
- TIME: MySQL TIME scalars
- String types:
- STRING: MySQL utf8mb3 character type scalars: CHAR, VARCHAR, TEXT, ENUM, and SET
- Binary types:
- BLOB: MySQL binary type scalars including BINARY, VARBINARY, BLOB, and BIT
- All other types:
- OPAQUE (raw bits)
- JSON_VALID(val)

Returns 0 or 1 to indicate whether a value is valid JSON. Returns NULL if the argument is NULL.
```
mysql> SELECT JSON_VALID('{"a": 1}');
+--------------------------+
| JSON_VALID('{"a": 1}') |
+--------------------------+
| 1 |
+-------------------------+
mysql> SELECT JSON_VALID('hello'), JSON_VALID('"hello"');
+----------------------+-----------------------+
| JSON_VALID('hello') | JSON_VALID('"hello"') |
+----------------------+------------------------
| 0 | 1 |
+----------------------+-----------------------
```


\subsection*{14.17.6 JSON Table Functions}

This section contains information about JSON functions that convert JSON data to tabular data. MySQL 8.4 supports one such function, JSON_TABLE( ).
```
JSON_TABLE(expr, path COLUMNS (column_list) [AS] alias)
```


Extracts data from a JSON document and returns it as a relational table having the specified columns. The complete syntax for this function is shown here:
```
JSON_TABLE(
    expr,
    path COLUMNS (column_list)
) [AS] alias
column_list:
    column[, column][, ...]
column:
    name FOR ORDINALITY
    | name type PATH string path [on_empty] [on_error]
```

```
    | name type EXISTS PATH string path
    | NESTED [PATH] path COLUMNS (column_list)
on_empty:
    {NULL | DEFAULT json_string | ERROR} ON EMPTY
on_error:
    {NULL | DEFAULT json_string | ERROR} ON ERROR
```

expr: This is an expression that returns JSON data. This can be a constant ( ${ }^{\prime}\{$ " a ": 1$\}$ ' ), a column (t1. json_data, given table t1 specified prior to JSON_TABLE() in the FROM clause), or a function call (JSON_EXTRACT( t1.json_data,'\$.post.comments')).
path: A JSON path expression, which is applied to the data source. We refer to the JSON value matching the path as the row source; this is used to generate a row of relational data. The COLUMNS clause evaluates the row source, finds specific JSON values within the row source, and returns those JSON values as SQL values in individual columns of a row of relational data.

The alias is required. The usual rules for table aliases apply (see Section 11.2, "Schema Object Names").

This function compares column names in case-insensitive fashion.
JSON_TABLE() supports four types of columns, described in the following list:
1. name FOR ORDINALITY: This type enumerates rows in the COLUMNS clause; the column named name is a counter whose type is UNSIGNED INT, and whose initial value is 1 . This is equivalent to specifying a column as AUTO_INCREMENT in a CREATE TABLE statement, and can be used to distinguish parent rows with the same value for multiple rows generated by a NESTED [PATH] clause.
2. name type PATH string_path [on_empty] [on_error]: Columns of this type are used to extract values specified by string_path. type is a MySQL scalar data type (that is, it cannot be an object or array). JSON_TABLE( ) extracts data as JSON then coerces it to the column type, using the regular automatic type conversion applying to JSON data in MySQL. A missing value triggers the on_empty clause. Saving an object or array triggers the optional on error clause; this also occurs when an error takes place during coercion from the value saved as JSON to the table column, such as trying to save the string ' asd ' to an integer column.
3. name type EXISTS PATH path: This column returns 1 if any data is present at the location specified by path, and 0 otherwise. type can be any valid MySQL data type, but should normally be specified as some variety of INT.
4. NESTED [PATH] path COLUMNS (column_list): This flattens nested objects or arrays in JSON data into a single row along with the JSON values from the parent object or array. Using multiple PATH options allows projection of JSON values from multiple levels of nesting into a single row.

The path is relative to the parent path row path of JSON_TABLE(), or the path of the parent NESTED [PATH] clause in the event of nested paths.
on empty, if specified, determines what JSON_TABLE() does in the event that data is missing (depending on type). This clause is also triggered on a column in a NESTED PATH clause when the latter has no match and a NULL complemented row is produced for it. on empty takes one of the following values:
- NULL ON EMPTY: The column is set to NULL; this is the default behavior.
- DEFAULT json_string ON EMPTY: the provided json_string is parsed as JSON, as long as it is valid, and stored instead of the missing value. Column type rules also apply to the default value.
- ERROR ON EMPTY: An error is thrown.

If used, on_error takes one of the following values with the corresponding result as shown here:
- NULL ON ERROR: The column is set to NULL; this is the default behavior.
- DEFAULT json string ON ERROR: The json_string is parsed as JSON (provided that it is valid) and stored instead of the object or array.
- ERROR ON ERROR: An error is thrown.

Specifying ON ERROR before ON EMPTY is nonstandard and deprecated in MySQL; trying to do so causes the server to issue a warning. Expect support for the nonstandard syntax to be removed in a future version of MySQL.

When a value saved to a column is truncated, such as saving 3.14159 in a $\operatorname{DECIMAL}(10,1)$ column, a warning is issued independently of any ON ERROR option. When multiple values are truncated in a single statement, the warning is issued only once.

When the expression and path passed to this function resolve to JSON null, JSON_TABLE( ) returns SQL NULL, in accordance with the SQL standard, as shown here:
```
mysql> SELECT *
    -> FROM
    -> JSON_TABLE(
    -> '[ {"c1": null} ]',
    -> '$[*]' COLUMNS( c1 INT PATH '$.c1' ERROR ON ERROR )
    -> ) as jt;
+------+
| c1 |
+------+
| NULL |
+------+
1 row in set (0.00 sec)
```


The following query demonstrates the use of ON EMPTY and ON ERROR. The row corresponding to $\{$ "b": 1$\}$ is empty for the path "\$.a", and attempting to save [1,2] as a scalar produces an error; these rows are highlighted in the output shown.
```
mysql> SELECT *
    -> FROM
    -> JSON_TABLE(
    -> '[{"a":"3"},{"a":2},{"b":1},{"a":0},{"a":[1,2]}]',
    -> "$[*]"
    -> COLUMNS(
    -> rowid FOR ORDINALITY,
    -> ac VARCHAR(100) PATH "$.a" DEFAULT '111' ON EMPTY DEFAULT '999' ON ERROR,
    -> aj JSON PATH "$.a" DEFAULT '{"x": 333}' ON EMPTY,
    -> bx INT EXISTS PATH "$.b"
    -> )
    -> ) AS tt;

\begin{tabular}{|l|l|l|l|}
\hline rowid & ac & aj & bx \\
\hline 1 & 3 & "3" & 0 \\
\hline 2 & 2 & 2 & 0 \\
\hline 3 & 111 & \{"x": 333\} & 1 \\
\hline 4 & 0 & 0 & 0 \\
\hline 5 & 999 & [1, 2] & 0 \\
\hline
\end{tabular}
rows in set (0.00 sec)
```


Column names are subject to the usual rules and limitations governing table column names. See Section 11.2, "Schema Object Names".

All JSON and JSON path expressions are checked for validity; an invalid expression of either type causes an error.

Each match for the path preceding the COLUMNS keyword maps to an individual row in the result table. For example, the following query gives the result shown here:
```
mysql> SELECT *
```

```
    -> FROM
    -> JSON_TABLE(
    -> '[{"x":2,"y":"8"},{"x":"3","y":"7"},{"x":"4","y":6}]',
    -> "$[*]" COLUMNS(
    -> xval VARCHAR(100) PATH "$.x",
    -> yval VARCHAR(100) PATH "$.y"
    -> )
    -> ) AS jt1;
+------+-------+

\begin{tabular}{|l|l|}
\hline xval & yval \\
\hline 2 & 8 \\
\hline 3 & 7 \\
\hline 4 & 6 \\
\hline
\end{tabular}
```


The expression " $\$\left[{ }^{*}\right]$ " matches each element of the array. You can filter the rows in the result by modifying the path. For example, using "\$[1]" limits extraction to the second element of the JSON array used as the source, as shown here:
```
mysql> SELECT *
    -> FROM
    -> JSON_TABLE(
    -> '[{"x":2,"y":"8"},{"x":"3","y":"7"},{"x":"4","y":6}]',
    -> "$[1]" COLUMNS(
    -> xval VARCHAR(100) PATH "$.x",
    -> yval VARCHAR(100) PATH "$.y"
    -> )
    -> ) AS jt1;
+------+-------+
| xval | yval |
+------+------+
| 3 | 7 |
+------+-------+
```


Within a column definition, "\$" passes the entire match to the column; "\$.x" and "\$.y" pass only the values corresponding to the keys $x$ and $y$, respectively, within that match. For more information, see JSON Path Syntax.

NESTED PATH (or simply NESTED; PATH is optional) produces a set of records for each match in the COLUMNS clause to which it belongs. If there is no match, all columns of the nested path are set to NULL. This implements an outer join between the topmost clause and NESTED [PATH]. An inner join can be emulated by applying a suitable condition in the WHERE clause, as shown here:
```
mysql> SELECT *
    -> FROM
    -> JSON_TABLE(
    -> '[ {"a": 1, "b": [11,111]}, {"a": 2, "b": [22,222]}, {"a":3}]',
    -> '$[*]' COLUMNS(
    -> a INT PATH '$.a',
    -> NESTED PATH '$.b[*]' COLUMNS (b INT PATH '$')
    -> )
    -> ) AS jt
    -> WHERE b IS NOT NULL;
+------+------+
| a | b |
+------+------+

\begin{tabular}{|r|r|}
$\mid$ & 1 \\
$\mid$ & 11 \\
$\mid$ & 2 \\
$\mid$ & 2 \\
$\mid$ & 222 \\
+ & 222 \\
$\mid$ &
\end{tabular}
```


Sibling nested paths-that is, two or more instances of NESTED [PATH] in the same COLUMNS clause -are processed one after another, one at a time. While one nested path is producing records, columns of any sibling nested path expressions are set to NULL. This means that the total number of records for
a single match within a single containing COLUMNS clause is the sum and not the product of all records produced by NESTED [PATH] modifiers, as shown here:
```
mysql> SELECT *
    -> FROM
    -> JSON_TABLE(
    -> '[{"a": 1, "b": [11,111]}, {"a": 2, "b": [22,222]}]',
    -> '$[*]' COLUMNS(
    -> a INT PATH '$.a',
    -> NESTED PATH '$.b[*]' COLUMNS (b1 INT PATH '$'),
    -> NESTED PATH '$.b[*]' COLUMNS (b2 INT PATH '$')
    -> )
    -> ) AS jt;
+------+------+------+
| a | b1 | b2 |
+------+------+------+

\begin{tabular}{|rr|r|r|}
\hline & 1 & 11 & NULL \\
\hline & 1 & 111 & NULL \\
\hline & 1 & NULL & 11 \\
\hline & 1 & NULL & 111 \\
\hline & 2 & 22 & NULL \\
\hline & 2 & 222 & NULL \\
\hline & 2 & NULL & 22 \\
\hline
\end{tabular}
```


A FOR ORDINALITY column enumerates records produced by the COLUMNS clause, and can be used to distinguish parent records of a nested path, especially if values in parent records are the same, as can be seen here:
```
mysql> SELECT *
    -> FROM
    -> JSON_TABLE(
    -> '[{"a": "a_val",
    '> "b": [{"c": "c_val", "l": [1,2]}]},
    '> {"a": "a_val",
    '> "b": [{"c": "c_val","l": [11]}, {"c": "c_val", "l": [22]}]}]',
    -> '$[*]' COLUMNS(
    -> top_ord FOR ORDINALITY,
    -> apath VARCHAR(10) PATH '$.a',
    -> NESTED PATH '$.b[*]' COLUMNS (
    -> bpath VARCHAR(10) PATH '$.c',
    -> ord FOR ORDINALITY,
    -> NESTED PATH '$.1[*]' COLUMNS (lpath varchar(10) PATH '$')
    -> )
    -> )
    -> ) as jt;
+----------+---------+---------+------+-------+
| top_ord | apath | bpath | ord | lpath |
+----------+---------+---------+------+-------+
| 1 | a_val | c_val | 1 | 1
| 1 | a_val | c_val | 1 | 2
| 2 | a_val | c_val | 1 | 11
| 2 | a_val | c_val | 2 | 22
+----------+---------+---------+------+-------+
```


The source document contains an array of two elements; each of these elements produces two rows. The values of apath and bpath are the same over the entire result set; this means that they cannot be used to determine whether lpath values came from the same or different parents. The value of the ord column remains the same as the set of records having top_ord equal to 1 , so these two values are from a single object. The remaining two values are from different objects, since they have different values in the ord column.

Normally, you cannot join a derived table which depends on columns of preceding tables in the same FROM clause. MySQL, per the SQL standard, makes an exception for table functions; these are considered lateral derived tables. This is implicit, and for this reason is not allowed before JSON_TABLE( ), also according to the standard.

Suppose you have a table t1 created and populated using the statements shown here:
```
CREATE TABLE t1 (c1 INT, c2 CHAR(1), c3 JSON);
INSERT INTO t1 () VALUES
ROW(1, 'z', JSON_OBJECT('a', 23, 'b', 27, 'c', 1)),
ROW(1, 'y', JSON_OBJECT('a', 44, 'b', 22, 'c', 11)),
ROW(2, 'x', JSON_OBJECT('b', 1, 'c', 15)),
ROW(3, 'w', JSON_OBJECT('a', 5, 'b', 6, 'c', 7)),
ROW(5, 'v', JSON_OBJECT('a', 123, 'c', 1111))
;
```


You can then execute joins, such as this one, in which JSON_TABLE() acts as a derived table while at the same time it refers to a column in a previously referenced table:
```
SELECT c1, c2, JSON_EXTRACT(c3, '$.*')
FROM t1 AS m
JOIN
JSON_TABLE(
    m.c3,
    '$.*'
    COLUMNS(
        at VARCHAR(10) PATH '$.a' DEFAULT '1' ON EMPTY,
        bt VARCHAR(10) PATH '$.b' DEFAULT '2' ON EMPTY,
        ct VARCHAR(10) PATH '$.c' DEFAULT '3' ON EMPTY
    )
) AS tt
ON m.c1 > tt.at;
```


Attempting to use the LATERAL keyword with this query raises ER_PARSE_ERROR.

\subsection*{14.17.7 JSON Schema Validation Functions}

MySQL supports validation of JSON documents against JSON schemas conforming to Draft 4 of the JSON Schema specification. This can be done using either of the functions detailed in this section, both of which take two arguments, a JSON schema, and a JSON document which is validated against the schema. JSON_SCHEMA_VALID ( ) returns true if the document validates against the schema, and false if it does not; JSON_SCHEMA_VALIDATION_REPORT ( ) provides a report in JSON format on the validation.

Both functions handle null or invalid input as follows:
- If at least one of the arguments is NULL, the function returns NULL.
- If at least one of the arguments is not valid JSON, the function raises an error (ER_INVALID_TYPE_FOR_JSON)
- In addition, if the schema is not a valid JSON object, the function returns ER_INVALID_JSON_TYPE.

MySQL supports the required attribute in JSON schemas to enforce the inclusion of required properties (see the examples in the function descriptions).

MySQL supports the id, \$schema, description, and type attributes in JSON schemas but does not require any of these.

MySQL does not support external resources in JSON schemas; using the \$ref keyword causes JSON_SCHEMA_VALID( ) to fail with ER_NOT_SUPPORTED_YET.

\section*{Note}

MySQL supports regular expression patterns in JSON schema, which supports but silently ignores invalid patterns (see the description of JSON_SCHEMA_VALID( ) for an example).

These functions are described in detail in the following list:
- JSON_SCHEMA_VALID(schema,document)

Validates a JSON document against a JSON schema. Both schema and document are required. The schema must be a valid JSON object; the document must be a valid JSON document. Provided that these conditions are met: If the document validates against the schema, the function returns true (1); otherwise, it returns false (0).

In this example, we set a user variable @schema to the value of a JSON schema for geographical coordinates, and another one @document to the value of a JSON document containing one such coordinate. We then verify that @document validates according to @schema by using them as the arguments to JSON_SCHEMA_VALID( ):
```
mysql> SET @schema = '{
    '> "id": "http://json-schema.org/geo",
    '> "$schema": "http://json-schema.org/draft-04/schema#",
    '> "description": "A geographical coordinate",
    '> "type": "object",
    '> "properties": {
    '> "latitude": {
    '> "type": "number",
    '> "minimum": -90,
    '> "maximum": 90
    '> },
    '> "longitude": {
    '> "type": "number",
    '> "minimum": -180,
    '> "maximum": 180
    '> }
    '> },
    '> "required": ["latitude", "longitude"]
    '>}';
Query OK, 0 rows affected (0.01 sec)
mysql> SET @document = '{
    '> "latitude": 63.444697,
    '> "longitude": 10.445118
    '>}';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT JSON_SCHEMA_VALID(@schema, @document);
+----------------------------------------+
| JSON_SCHEMA_VALID(@schema, @document) |
+-----------------------------------------
| 1 |
+-----------------------------------------
1 row in set (0.00 sec)
```


Since @schema contains the required attribute, we can set @document to a value that is otherwise valid but does not contain the required properties, then test it against @schema, like this:
```
mysql> SET @document = '{}';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT JSON_SCHEMA_VALID(@schema, @document);
+-----------------------------------------+
| JSON_SCHEMA_VALID(@schema, @document) |
+-----------------------------------------+
| 0 |
+-----------------------------------------+
1 row in set (0.00 sec)
```


If we now set the value of @schema to the same JSON schema but without the required attribute, @document validates because it is a valid JSON object, even though it contains no properties, as shown here:
```
mysql> SET @schema = '{
    '> "id": "http://json-schema.org/geo",
    '> "$schema": "http://json-schema.org/draft-04/schema#",
    '> "description": "A geographical coordinate",
    '> "type": "object",
```

```
    '> "properties": {
    '> "latitude": {
    '> "type": "number",
    '> "minimum": -90,
    '> "maximum": 90
    '> },
    '> "longitude": {
    '> "type": "number",
    '> "minimum": -180,
    '> "maximum": 180
    '> }
    '> }
    '>}';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT JSON_SCHEMA_VALID(@schema, @document);
+-----------------------------------------+
| JSON_SCHEMA_VALID(@schema, @document) |
+----------------------------------------+
| 1 |
+----------------------------------------+
1 row in set (0.00 sec)
```


JSON_SCHEMA_VALID() and CHECK constraints. JSON_SCHEMA_VALID( ) can also be used to enforce CHECK constraints.

Consider the table geo created as shown here, with a JSON column coordinate representing a point of latitude and longitude on a map, governed by the JSON schema used as an argument in a JSON_SCHEMA_VALID ( ) call which is passed as the expression for a CHECK constraint on this table:
```
mysql> CREATE TABLE geo (
    -> coordinate JSON,
    -> CHECK(
    -> JSON_SCHEMA_VALID(
    -> '{
    '> "type":"object",
    '> "properties":{
    '> "latitude":{"type":"number", "minimum":-90, "maximum":90},
    '> "longitude":{"type":"number", "minimum":-180, "maximum":180}
    '> },
    '> "required": ["latitude", "longitude"]
    '> }',
    -> coordinate
    -> )
    -> )
    -> );
Query OK, 0 rows affected (0.45 sec)
```


\section*{Note}

Because a MySQL CHECK constraint cannot contain references to variables, you must pass the JSON schema to JSON_SCHEMA_VALID ( ) inline when using it to specify such a constraint for a table.

We assign JSON values representing coordinates to three variables, as shown here:
```
mysql> SET @point1 = '{"latitude":59, "longitude":18}';
Query OK, 0 rows affected (0.00 sec)
mysql> SET @point2 = '{"latitude":91, "longitude":0}';
Query OK, 0 rows affected (0.00 sec)
mysql> SET @point3 = '{"longitude":120}';
```

```
Query OK, 0 rows affected (0.00 sec)
```


The first of these values is valid, as can be seen in the following INSERT statement:
```
mysql> INSERT INTO geo VALUES(@point1);
Query OK, 1 row affected (0.05 sec)
```


The second JSON value is invalid and so fails the constraint, as shown here:
```
mysql> INSERT INTO geo VALUES(@point2);
ERROR 3819 (HY000): Check constraint 'geo_chk_1' is violated.
```


You can obtain precise information about the nature of the failure-in this case, that the latitude value exceeds the maximum defined in the schema-by issuing a SHOW WARNINGS statement:
```
mysql> SHOW WARNINGS\G
************************* 1. row ******************************************
    Level: Error
    Code: 3934
Message: The JSON document location '#/latitude' failed requirement 'maximum' at
JSON Schema location '#/properties/latitude'.
************************** 2. row ******************************
    Level: Error
    Code: 3819
Message: Check constraint 'geo_chk_1' is violated.
2 rows in set (0.00 sec)
```


The third coordinate value defined above is also invalid, since it is missing the required latitude property. As before, you can see this by attempting to insert the value into the geo table, then issuing SHOW WARNINGS afterwards:
```
mysql> INSERT INTO geo VALUES(@point3);
ERROR 3819 (HY000): Check constraint 'geo_chk_1' is violated.
mysql> SHOW WARNINGS\G
************************** 1. row ******************************
    Level: Error
        Code: 3934
Message: The JSON document location '#' failed requirement 'required' at JSON
Schema location '#'.
************************** 2. row ******************************
    Level: Error
        Code: 3819
Message: Check constraint 'geo_chk_1' is violated.
2 rows in set (0.00 sec)
```


See Section 15.1.20.6, "CHECK Constraints", for more information.
JSON Schema has support for specifying regular expression patterns for strings, but the implementation used by MySQL silently ignores invalid patterns. This means that JSON_SCHEMA_VALID ( ) can return true even when a regular expression pattern is invalid, as shown here:
```
mysql> SELECT JSON_SCHEMA_VALID('{"type":"string","pattern":"("}', '"abc"');
+------------------------------------------------------------------
| JSON_SCHEMA_VALID('{"type":"string","pattern":"("}', '"abc"') |
+-------------------------------------------------------------------
| 1 |
+-------------------------------------------------------------------
1 row in set (0.04 sec)
```

- JSON_SCHEMA_VALIDATION_REPORT(schema,document)

Validates a JSON document against a JSON schema. Both schema and document are required. As with JSON_VALID_SCHEMA(), the schema must be a valid JSON object, and the document must be a valid JSON document. Provided that these conditions are met, the function returns a report, as a JSON document, on the outcome of the validation. If the JSON document is considered valid according to the JSON Schema, the function returns a JSON object with one property valid
having the value "true". If the JSON document fails validation, the function returns a JSON object which includes the properties listed here:
- valid: Always "false" for a failed schema validation
- reason: A human-readable string containing the reason for the failure
- schema-location: A JSON pointer URI fragment identifier indicating where in the JSON schema the validation failed (see Note following this list)
- document-location: A JSON pointer URI fragment identifier indicating where in the JSON document the validation failed (see Note following this list)
- schema-failed-keyword: A string containing the name of the keyword or property in the JSON schema that was violated
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2384.jpg?height=124&width=101&top_left_y=879&top_left_x=340)

\section*{Note}

JSON pointer URI fragment identifiers are defined in RFC 6901 - JavaScript Object Notation (JSON) Pointer. (These are not the same as the JSON path notation used by JSON_EXTRACT( ) and other MySQL JSON functions.) In this notation, \# represents the entire document, and \#/myprop represents the portion of the document included in the top-level property named myprop. See the specification just cited and the examples shown later in this section for more information.

In this example, we set a user variable @schema to the value of a JSON schema for geographical coordinates, and another one @document to the value of a JSON document containing one such coordinate. We then verify that @document validates according to @schema by using them as the arguments to JSON_SCHEMA_VALIDATION_REORT( ):
```
mysql> SET @schema = '{
    '> "id": "http://json-schema.org/geo",
    '> "$schema": "http://json-schema.org/draft-04/schema#",
    '> "description": "A geographical coordinate",
    '> "type": "object",
    '> "properties": {
    '> "latitude": {
    '> "type": "number",
    '> "minimum": -90,
    '> "maximum": 90
    '> },
    '> "longitude": {
    '> "type": "number",
    '> "minimum": -180,
    '> "maximum": 180
    '> }
    '> },
    '> "required": ["latitude", "longitude"]
    '>}';
Query OK, 0 rows affected (0.01 sec)
mysql> SET @document = '{
    '> "latitude": 63.444697,
    '> "longitude": 10.445118
    '>}';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT JSON_SCHEMA_VALIDATION_REPORT(@schema, @document);
+------------------------------------------------------
| JSON_SCHEMA_VALIDATION_REPORT(@schema, @document) |
+------------------------------------------------------
| {"valid": true}
+------------------------------------------------------
```

```
1 row in set (0.00 sec)
```


Now we set @document such that it specifies an illegal value for one of its properties, like this:
```
mysql> SET @document = '{
    '> "latitude": 63.444697,
    '> "longitude": 310.445118
    '> }';
```


Validation of @document now fails when tested with JSON_SCHEMA_VALIDATION_REPORT( ). The output from the function call contains detailed information about the failure (with the function wrapped by JSON_PRETTY( ) to provide better formatting), as shown here:
```
mysql> SELECT JSON_PRETTY(JSON_SCHEMA_VALIDATION_REPORT(@schema, @document))\G
*************************** 1. rOW *****************************
JSON_PRETTY(JSON_SCHEMA_VALIDATION_REPORT(@schema, @document)): {
    "valid": false,
    "reason": "The JSON document location '#/longitude' failed requirement 'maximum' at JSON Schema loc
    "schema-location": "#/properties/longitude",
    "document-location": "#/longitude",
    "schema-failed-keyword": "maximum"
}
1 \text { row in set (0.00 sec)}
```


Since @schema contains the required attribute, we can set @document to a value that is otherwise valid but does not contain the required properties, then test it against @schema. The output of JSON_SCHEMA_VALIDATION_REPORT( ) shows that validation fails due to lack of a required element, like this:
```
mysql> SET @document = '{}';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT JSON_PRETTY(JSON_SCHEMA_VALIDATION_REPORT(@schema, @document))\G
*************************** 1. row *****************************
JSON_PRETTY(JSON_SCHEMA_VALIDATION_REPORT(@schema, @document)): {
    "valid": false,
    "reason": "The JSON document location '#' failed requirement 'required' at JSON Schema location '#'
    "schema-location": "#",
    "document-location": "#",
    "schema-failed-keyword": "required"
}
1 row in set (0.00 sec)
```


If we now set the value of @schema to the same JSON schema but without the required attribute, @document validates because it is a valid JSON object, even though it contains no properties, as shown here:
```
mysql> SET @schema = '{
    '> "id": "http://json-schema.org/geo",
    '> "$schema": "http://json-schema.org/draft-04/schema#",
    '> "description": "A geographical coordinate",
    '> "type": "object",
    '> "properties": {
    '> "latitude": {
    '> "type": "number",
    '> "minimum": -90,
    '> "maximum": 90
    '> },
    '> "longitude": {
    '> "type": "number",
    '> "minimum": -180,
    '> "maximum": 180
    '> }
    '> }
    '>}';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT JSON_SCHEMA_VALIDATION_REPORT(@schema, @document);
+------------------------------------------------------
```

```
| JSON_SCHEMA_VALIDATION_REPORT(@schema, @document) |
+------------------------------------------------------
| {"valid": true} |
+-------------------------------------------------------
1 row in set (0.00 sec)
```


\subsection*{14.17.8 JSON Utility Functions}

This section documents utility functions that act on JSON values, or strings that can be parsed as JSON values. JSON_PRETTY( ) prints out a JSON value in a format that is easy to read. JSON_STORAGE_SIZE() and JSON_STORAGE_FREE() show, respectively, the amount of storage space used by a given JSON value and the amount of space remaining in a JSON column following a partial update.
- JSON_PRETTY(json_val)

Provides pretty-printing of JSON values similar to that implemented in PHP and by other languages and database systems. The value supplied must be a JSON value or a valid string representation of a JSON value. Extraneous whitespaces and newlines present in this value have no effect on the output. For a NULL value, the function returns NULL. If the value is not a JSON document, or if it cannot be parsed as one, the function fails with an error.

Formatting of the output from this function adheres to the following rules:
- Each array element or object member appears on a separate line, indented by one additional level as compared to its parent.
- Each level of indentation adds two leading spaces.
- A comma separating individual array elements or object members is printed before the newline that separates the two elements or members.
- The key and the value of an object member are separated by a colon followed by a space (': ').
- An empty object or array is printed on a single line. No space is printed between the opening and closing brace.
- Special characters in string scalars and key names are escaped employing the same rules used by the JSON_QUOTE( ) function.
```
mysql> SELECT JSON_PRETTY('123'); # scalar
+---------------------+
| JSON_PRETTY('123') |
+---------------------+
| 123 |
+---------------------+
mysql> SELECT JSON_PRETTY("[1,3,5]"); # array
+--------------------------+
| JSON_PRETTY("[1,3,5]") |
+-------------------------+
| [
    1,
    3,
    5
] I
+-------------------------+
mysql> SELECT JSON_PRETTY('{"a":"10","b":"15","x":"25"}'); # object
+-----------------------------------------------
| JSON_PRETTY('{"a":"10","b":"15","x":"25"}') |
+-----------------------------------------------
| {
    "a": "10",
    "b": "15",
    "x": "25"
```

```
} |
+-----------------------------------------------
mysql> SELECT JSON_PRETTY('["a",1,{"key1":
        '> "value1"},"5", "77",
        '> {"key2":["value3","valueX",
        '> "valueY"]},"j", "2" ]')\G # nested arrays and objects
*************************** 1. row ****************************************
JSON_PRETTY('["a",1,{"key1":
                "value1"},"5", "77" ,
                    {"key2":["value3","valuex",
            "valuey"]},"j", "2" ]'): [
    "a",
    1,
    {
        "key1": "value1"
    },
    "5",
    "77",
    {
        "key2": [
            "value3",
            "valuex",
            "valuey"
        ]
    },
    "j",
    "2"
]
```

- JSON_STORAGE_FREE(json_val)

For a JSON column value, this function shows how much storage space was freed in its binary representation after it was updated in place using JSON_SET( ), JSON_REPLACE( ), or JSON_REMOVE( ). The argument can also be a valid JSON document or a string which can be parsed as one-either as a literal value or as the value of a user variable-in which case the function returns 0 . It returns a positive, nonzero value if the argument is a JSON column value which has been updated as described previously, such that its binary representation takes up less space than it did prior to the update. For a JSON column which has been updated such that its binary representation is the same as or larger than before, or if the update was not able to take advantage of a partial update, it returns 0; it returns NULL if the argument is NULL.

If json_val is not NULL, and neither is a valid JSON document nor can be successfully parsed as one, an error results.

In this example, we create a table containing a JSON column, then insert a row containing a JSON object:
```
mysql> CREATE TABLE jtable (jcol JSON);
Query OK, 0 rows affected (0.38 sec)
mysql> INSERT INTO jtable VALUES
    -> ('{"a": 10, "b": "wxyz", "c": "[true, false]"}');
Query OK, 1 row affected (0.04 sec)
mysql> SELECT * FROM jtable;
+-------------------------------------------------
| jcol |
+-------------------------------------------------
| {"a": 10, "b": "wxyz", "c": "[true, false]"} |
+-------------------------------------------------
1 row in set (0.00 sec)
```


Now we update the column value using JSON_SET ( ) such that a partial update can be performed; in this case, we replace the value pointed to by the c key (the array [true, false]) with one that takes up less space (the integer 1):
```
mysql> UPDATE jtable
```

```
    -> SET jcol = JSON_SET(jcol, "$.a", 10, "$.b", "wxyz", "$.c", 1);
Query OK, 1 row affected (0.03 sec)
Rows matched: 1 Changed: 1 Warnings: 0
mysql> SELECT * FROM jtable;
+---------------------------------+
| jcol
+---------------------------------+
| {"a": 10, "b": "wxyz", "c": 1} |
+---------------------------------+
1 row in set (0.00 sec)
mysql> SELECT JSON_STORAGE_FREE(jcol) FROM jtable;
+---------------------------+
| JSON_STORAGE_FREE(jcol) |
+---------------------------+
| 14 |
+---------------------------+
1 row in set (0.00 sec)
```


The effects of successive partial updates on this free space are cumulative, as shown in this example using JSON_SET ( ) to reduce the space taken up by the value having key $b$ (and making no other changes):
```
mysql> UPDATE jtable
    -> SET jcol = JSON_SET(jcol, "$.a", 10, "$.b", "wx", "$.c", 1);
Query OK, 1 row affected (0.03 sec)
Rows matched: 1 Changed: 1 Warnings: 0
mysql> SELECT JSON_STORAGE_FREE(jcol) FROM jtable;
+---------------------------+
| JSON_STORAGE_FREE(jcol) |
+---------------------------+
| 16 |
+---------------------------+
1 row in set (0.00 sec)
```


Updating the column without using JSON_SET( ), JSON_REPLACE( ), or JSON_REMOVE( ) means that the optimizer cannot perform the update in place; in this case, JSON_STORAGE_FREE( ) returns 0 , as shown here:
```
mysql> UPDATE jtable SET jcol = '{"a": 10, "b": 1}';
Query OK, 1 row affected (0.05 sec)
Rows matched: 1 Changed: 1 Warnings: 0
mysql> SELECT JSON_STORAGE_FREE(jcol) FROM jtable;
+---------------------------+
| JSON_STORAGE_FREE(jcol) |
+---------------------------+
| 0 |
+---------------------------+
1 row in set (0.00 sec)
```


Partial updates of JSON documents can be performed only on column values. For a user variable that stores a JSON value, the value is always completely replaced, even when the update is performed using JSON_SET( ):
```
mysql> SET @j = '{"a": 10, "b": "wxyz", "c": "[true, false]"}';
Query OK, 0 rows affected (0.00 sec)
mysql> SET @j = JSON_SET(@j, '$.a', 10, '$.b', 'wxyz', '$.c', '1');
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @j, JSON_STORAGE_FREE(@j) AS Free;
+-----------------------------------+------+
| @j | Free |
+-----------------------------------+------+
| {"a": 10, "b": "wxyz", "c": "1"} | 0 |
```

```
1 row in set (0.00 sec)
```


For a JSON literal, this function always returns 0:
```
mysql> SELECT JSON_STORAGE_FREE('{"a": 10, "b": "wxyz", "c": "1"}') AS Free;
+------+
| Free |
+------+
| 0 |
+------+
1 row in set (0.00 sec)
```

- JSON_STORAGE_SIZE(json_val)

This function returns the number of bytes used to store the binary representation of a JSON document. When the argument is a JSON column, this is the space used to store the JSON document as it was inserted into the column, prior to any partial updates that may have been performed on it afterwards. json_val must be a valid JSON document or a string which can be parsed as one. In the case where it is string, the function returns the amount of storage space in the JSON binary representation that is created by parsing the string as JSON and converting it to binary. It returns NULL if the argument is NULL.

An error results when $j$ son_val is not NULL, and is not—or cannot be successfully parsed as—a JSON document.

To illustrate this function's behavior when used with a JSON column as its argument, we create a table named jtable containing a JSON column jcol, insert a JSON value into the table, then obtain the storage space used by this column with JSON_STORAGE_SIZE( ), as shown here:
```
mysql> CREATE TABLE jtable (jcol JSON);
Query OK, 0 rows affected (0.42 sec)
mysql> INSERT INTO jtable VALUES
    -> ('{"a": 1000, "b": "wxyz", "c": "[1, 3, 5, 7]"}');
Query OK, 1 row affected (0.04 sec)
mysql> SELECT
    -> jcol,
    -> JSON_STORAGE_SIZE(jcol) AS Size,
    -> JSON_STORAGE_FREE(jcol) AS Free
    -> FROM jtable;
+------------------------------------------------+------+-----+
| jcol | Size | Free |
+------------------------------------------------+------+------+
| {"a": 1000, "b": "wxyz", "c": "[1, 3, 5, 7]"} | 47 | 0 |
+------------------------------------------------+------+-----+
1 row in set (0.00 sec)
```


According to the output of JSON_STORAGE_SIZE( ), the JSON document inserted into the column takes up 47 bytes. We also checked the amount of space freed by any previous partial updates of the column using JSON_STORAGE_FREE( ); since no updates have yet been performed, this is 0 , as expected.

Next we perform an UPDATE on the table that should result in a partial update of the document stored in jcol, and then test the result as shown here:
```
mysql> UPDATE jtable SET jcol =
    -> JSON_SET(jcol, "$.b", "a");
Query OK, 1 row affected (0.04 sec)
Rows matched: 1 Changed: 1 Warnings: 0
mysql> SELECT
    -> jcol,
    -> JSON_STORAGE_SIZE(jcol) AS Size,
    -> JSON_STORAGE_FREE(jcol) AS Free
    -> FROM jtable;
+---------------------------------------------+------+-----+
```

```
| jcol | Size | Free |
+ {"a": 1000, "b": "a", "c": "[1, 3, 5, 7]"} | 47 | 3 |
+----------------------------------------------+------+------+
1 row in set (0.00 sec)
```


The value returned by JSON_STORAGE_FREE( ) in the previous query indicates that a partial update of the JSON document was performed, and that this freed 3 bytes of space used to store it. The result returned by JSON_STORAGE_SIZE( ) is unchanged by the partial update.

Partial updates are supported for updates using JSON_SET( ), JSON_REPLACE( ), or JSON_REMOVE( ). The direct assignment of a value to a JSON column cannot be partially updated; following such an update, JSON_STORAGE_SIZE( ) always shows the storage used for the newlyset value:
```
mysql> UPDATE jtable
mysql> SET jcol = '{"a": 4.55, "b": "wxyz", "c": "[true, false]"}';
Query OK, 1 row affected (0.04 sec)
Rows matched: 1 Changed: 1 Warnings: 0
mysql> SELECT
    -> jcol,
    -> JSON_STORAGE_SIZE(jcol) AS Size,
    -> JSON_STORAGE_FREE(jcol) AS Free
    -> FROM jtable;
+--------------------------------------------------+------+------+
| jcol | Size | Free |
+--------------------------------------------------+------+-----+
| {"a": 4.55, "b": "wxyz", "c": "[true, false]"} | 56 | 0 |
+--------------------------------------------------+------+------+
1 row in set (0.00 sec)
```


A JSON user variable cannot be partially updated. This means that this function always shows the space currently used to store a JSON document in a user variable:
```
mysql> SET @j = '[100, "sakila", [1, 3, 5], 425.05]';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @j, JSON_STORAGE_SIZE(@j) AS Size;
+-------------------------------------+-----+
| @j | Size |
+-------------------------------------+------+
| [100, "sakila", [1, 3, 5], 425.05] | 45 |
+-------------------------------------+------+
1 row in set (0.00 sec)
mysql> SET @j = JSON_SET(@j, '$[1]', "json");
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @j, JSON_STORAGE_SIZE(@j) AS Size;
+-----------------------------------+------+
| @j | Size |
+-----------------------------------+------+
| [100, "json", [1, 3, 5], 425.05] | 43 |
+------------------------------------+------+
1 row in set (0.00 sec)
mysql> SET @j = JSON_SET(@j, '$[2][0]', JSON_ARRAY(10, 20, 30));
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @j, JSON_STORAGE_SIZE(@j) AS Size;
+-------------------------------------------------------
| @j | Size |
+----------------------------------------------+------+
| [100, "json", [[10, 20, 30], 3, 5], 425.05] | 56 |
+-----------------------------------------------+-----+
```

```
1 row in set (0.00 sec)
```


For a JSON literal, this function always returns the current storage space used:
```
mysql> SELECT
    -> JSON_STORAGE_SIZE('[100, "sakila", [1, 3, 5], 425.05]') AS A,
    -> JSON_STORAGE_SIZE('{"a": 1000, "b": "a", "c": "[1, 3, 5, 7]"}') AS B,
    -> JSON_STORAGE_SIZE('{"a": 1000, "b": "wxyz", "c": "[1, 3, 5, 7]"}') AS C,
    -> JSON_STORAGE_SIZE('[100, "json", [[10, 20, 30], 3, 5], 425.05]') AS D;
+----+----+----+----+
| A | B | C | D |
+----+----+-----+----+
| 45 | 44 | 47 | 56 |
+----+----+----+----+
1 row in set (0.00 sec)
```


\subsection*{14.18 Replication Functions}

The functions described in the following sections are used with MySQL Replication.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.24 Replication Functions}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline asynchronous_connection_f & Aidlbgroupandembæn sgerce(e) server configuration information to a replication channel source list & \\
\hline asynchronous_connection_f & Addbsource server configu ration information server to a replication channel source list & \\
\hline asynchronous_connection_f & Rielmow admadragedngrowipfrd(m) a replication channel source list & \\
\hline asynchronous_connection_f & Rielmow ącse Ludæserver frem replication channel source list & \\
\hline asynchronous_connection_f & Relmove alt setting\$ relating to group replication asynchronous failover & \\
\hline group_replication_disable & Disable membéDa¢tion for event specified & \\
\hline group_replication_enable_ & Eanalboter mæntiæralction for event specified & \\
\hline group_replication_get_com & Cbet trension rof grautpreplicątion communication protocol currently in use & \\
\hline group_replication_get_wri & Getomaximume maynber of consensus instances currently set for group & \\
\hline group_replication_reset_m & AReset all atternber (ąctions to defaults and configuration version number to 1 & \\
\hline group_replication_set_as & Makea \& \$pecific group member the primary & \\
\hline group_replication_set_com & Set version forpgroup ceplication communication protocol to use & \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline group_replication_set_wri & Set maxcimanæ number of consensus instances that can be executed in parallel & \\
\hline group_replication_switch & Changesthe minder of angdou(p) running in single-primary mode to multi-primary mode & \\
\hline group_replication_switch & ![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2392.jpg?height=43\&width=496\&top_left_y=596\&top_left_x=823) running in multi-primary mode to single-primary mode & \\
\hline MASTER_POS_WAIT( ) & Block until the replica has read and applied all updates up to the specified position & Yes \\
\hline SOURCE_POS_WAIT( ) & Block until the replica has read and applied all updates up to the specified position & \\
\hline WAIT_FOR_EXECUTED_GTID_SE & Waitit until the given GTIDs have executed on the replica. & \\
\hline
\end{tabular}

\subsection*{14.18.1 Group Replication Functions}

The functions described in the following sections are used with Group Replication.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.25 Group Replication Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline group_replication_disable_member_actio & Dísable member action for event specified \\
\hline group_replication_enable_member_action & Eyable member action for event specified \\
\hline group_replication_get_communication_pr & Geoderision of group replication communication protocol currently in use \\
\hline group_replication_get_write_concurrenc & G(el maximum number of consensus instances currently set for group \\
\hline group_replication_reset_member_actions & Reset all member actions to defaults and configuration version number to 1 \\
\hline group_replication_set_as_primary() & Make a specific group member the primary \\
\hline group_replication_set_communication_pr & Sebverkson for group replication communication protocol to use \\
\hline group_replication_set_write_concurrenc & \$et) maximum number of consensus instances that can be executed in parallel \\
\hline group_replication_switch_to_multi_prim & ©hanges/th(e) mode of a group running in singleprimary mode to multi-primary mode \\
\hline group_replication_switch_to_single_pri & © anangtos the mode of a group running in multiprimary mode to single-primary mode \\
\hline
\end{tabular}
\end{table}

\subsection*{14.18.1.1 Function which Configures Group Replication Primary}

The following function enables you to set a member of a single-primary replication group to take over as the primary. The current primary becomes a read-only secondary, and the specified group member becomes the read-write primary. The function can be used on any member of a replication group running in single-primary mode. This function replaces the usual primary election process; see Section 20.5.1.1, "Changing the Primary", for more information.

If a standard source to replica replication channel is running on the existing primary member in addition to the Group Replication channels, you must stop that replication channel before you can change the primary member. You can identify the current primary using the MEMBER_ROLE column in the Performance Schema replication_group_members table.

Any uncommitted transactions that the group is waiting on must be committed, rolled back, or terminated before the operation can complete. You can specify a timeout for transactions that are running when you use the function. For the timeout to work, all members of the group must be MySQL version 8.0.29 or newer.

When the timeout expires, for any transactions that did not yet reach their commit phase, the client session is disconnected so that the transaction does not proceed. Transactions that reached their commit phase are allowed to complete. When you set a timeout, it also prevents new transactions starting on the primary from that point on. Explicitly defined transactions (with a START TRANSACTION or BEGIN statement) are subject to the timeout, disconnection, and incoming transaction blocking even if they do not modify any data. To allow inspection of the primary while the function is operating, single statements that do not modify data, as listed in Permitted Queries Under Consistency Rules, are permitted to proceed.
- group_replication_set_as_primary()

Appoints a specific member of the group as the new primary, overriding any election process.
Syntax:
STRING group_replication_set_as_primary(member_uuid[, timeout])
Arguments:
- member_uuid: A string containing the UUID of the member of the group that you want to become the new primary.
- timeout: An integer specifying a timeout in seconds for transactions that are running on the existing primary when you use the function. You can set a timeout from 0 seconds (immediately) up to 3600 seconds ( 60 minutes). When you set a timeout, new transactions cannot start on the primary from that point on. There is no default setting for the timeout, so if you do not set it, there is no upper limit to the wait time, and new transactions can start during that time.

Return value:

A string containing the result of the operation, for example whether it was successful or not.
Example:
SELECT group_replication_set_as_primary(‘00371d66-3c45-11ea-804b-080027337932’, 300);
This function waits for all ongoing transactions and DML operations to finish before electing the new primary. In MySQL 8.4, it also waits for the completion of any ongoing DDL statements such as ALTER TABLE. Operations that are considered DDL statements for this purpose are listed here:
- ALTER DATABASE
- ALTER FUNCTION
- ALTER INSTANCE
- ALTER PROCEDURE
- ALTER SERVER
- ALTER TABLE
- ALTER TABLESPACE
- ALTER USER
- ALTER VIEW
- ANALYZE TABLE
- CACHE INDEX
- CHECK TABLE
- CREATE DATABASE
- CREATE FUNCTION
- CREATE INDEX
- CREATE ROLE
- CREATE PROCEDURE
- CREATE SERVER
- CREATE SPATIAL REFERENCE SYSTEM
- CREATE TABLE
- CREATE TABLESPACE
- CREATE TRIGGER
- CREATE USER
- CREATE VIEW
- DROP DATABASE
- DROP FUNCTION
- DROP INDEX
- DROP PROCEDURE
- DROP ROLE
- DROP SERVER
- DROP SPATIAL REFERENCE SYSTEM
- DROP TABLE
- DROP TABLESPACE
- DROP TRIGGER
- DROP USER
- DROP VIEW
- GRANT
- LOAD INDEX
- OPTIMIZE TABLE
- RENAME TABLE
- REPAIR TABLE
- REVOKE
- TRUNCATE TABLE

This also includes any open cursors (see Section 15.6.6, "Cursors").
For more information, see Section 20.5.1.1, "Changing the Primary".

\subsection*{14.18.1.2 Functions which Configure the Group Replication Mode}

The following functions enable you to control the mode which a replication group is running in, either single-primary or multi-primary mode.
- group_replication_switch_to_multi_primary_mode()

Changes a group running in single-primary mode to multi-primary mode. Must be issued on a member of a replication group running in single-primary mode.

Syntax:
STRING group_replication_switch_to_multi_primary_mode()
This function has no parameters.
Return value:
A string containing the result of the operation, for example whether it was successful or not.
Example:
SELECT group_replication_switch_to_multi_primary_mode()
All members which belong to the group become primaries.
For more information, see Section 20.5.1.2, "Changing the Group Mode"
- group_replication_switch_to_single_primary_mode()

Changes a group running in multi-primary mode to single-primary mode, without the need to stop Group Replication. Must be issued on a member of a replication group running in multi-primary mode. When you change to single-primary mode, strict consistency checks are also disabled on all group members, as required in single-primary mode (group_replication_enforce_update_everywhere_checks=0FF).

Syntax:
STRING group_replication_switch_to_single_primary_mode([str])
Arguments:
- str: A string containing the UUID of a member of the group which should become the new single primary. Other members of the group become secondaries.

Return value:

A string containing the result of the operation, for example whether it was successful or not.
Example:
SELECT group_replication_switch_to_single_primary_mode(member_uuid);
For more information, see Section 20.5.1.2, "Changing the Group Mode"

\subsection*{14.18.1.3 Functions to Inspect and Configure the Maximum Consensus Instances of a Group}

The following functions enable you to inspect and configure the maximum number of consensus instances that a group can execute in parallel.
- group_replication_get_write_concurrency()

Check the maximum number of consensus instances that a group can execute in parallel.
Syntax:
INT group_replication_get_write_concurrency()
This function has no parameters.
Return value:
The maximum number of consensus instances currently set for the group.
Example:
SELECT group_replication_get_write_concurrency()
For more information, see Section 20.5.1.3, "Using Group Replication Group Write Consensus".
- group_replication_set_write_concurrency()

Configures the maximum number of consensus instances that a group can execute in parallel. The GROUP_REPLICATION_ADMIN privilege is required to use this function.

Syntax:
STRING group_replication_set_write_concurrency(instances)
Arguments:
- members: Sets the maximum number of consensus instances that a group can execute in parallel. Default value is 10 , valid values are integers in the range of 10 to 200.

Return value:
Any resulting error as a string.
Example:
SELECT group_replication_set_write_concurrency(instances);
For more information, see Section 20.5.1.3, "Using Group Replication Group Write Consensus".

\subsection*{14.18.1.4 Functions to Inspect and Set the Group Replication Communication Protocol Version}

The following functions enable you to inspect and configure the Group Replication communication protocol version that is used by a replication group.
- Section 20.7.4, "Message Compression"
- Section 20.7.5, "Message Fragmentation"
- Section 20.7.3, "Single Consensus Leader"
- group_replication_get_communication_protocol()

Inspect the Group Replication communication protocol version that is currently in use for a group.
Syntax:
STRING group_replication_get_communication_protocol()
This function has no parameters.
Return value:
The oldest MySQL Server version that can join this group and use the group's communication protocol. Note that the group_replication_get_communication_protocol( ) function returns the minimum MySQL version that the group supports, which might differ from the version number that was passed to group_replication_set_communication_protocol(), and from the MySQL Server version that is installed on the member where you use the function.

If the protocol cannot be inspected because this server instance does not belong to a replication group, an error is returned as a string.

Example:
```
SELECT group_replication_get_communication_protocol();
+--------------------------------------------------
| group_replication_get_communication_protocol() |
+-------------------------------------------------
| 8.4.9 |
```


For more information, see Section 20.5.1.4, "Setting a Group's Communication Protocol Version".
- group_replication_set_communication_protocol()

Downgrade the Group Replication communication protocol version of a group so that members at earlier releases can join, or upgrade the Group Replication communication protocol version of a group after upgrading MySQL Server on all members. The GROUP_REPLICATION_ADMIN privilege is required to use this function, and all existing group members must be online when you issue the statement, with no loss of majority.

\section*{Note}

For MySQL InnoDB cluster, the communication protocol version is managed automatically whenever the cluster topology is changed using AdminAPI operations. You do not have to use these functions yourself for an InnoDB cluster.

\section*{Syntax:}

STRING group_replication_set_communication_protocol(version)

\section*{Arguments:}
- version: For a downgrade, specify the MySQL Server version of the prospective group member that has the oldest installed server version. In this case, the command makes the group fall back to a communication protocol compatible with that server version if possible. The minimum server
version that you can specify is MySQL 5.7.14. For an upgrade, specify the new MySQL Server version to which the existing group members have been upgraded.

Return value:

A string containing the result of the operation, for example whether it was successful or not.
Example:
SELECT group_replication_set_communication_protocol("5.7.25");
For more information, see Section 20.5.1.4, "Setting a Group's Communication Protocol Version".

\subsection*{14.18.1.5 Functions to Set and Reset Group Replication Member Actions}

The following functions can be used to enable and disable actions for members of a group to take in specified situations, and to reset the configuration to the default setting for all member actions. They can only be used by administrators with the GROUP_REPLICATION_ADMIN privilege or the deprecated SUPER privilege.

You configure member actions on the group's primary using the group_replication_enable_member_action and group_replication_disable_member_action functions. The member actions configuration, consisting of all the member actions and whether they are enabled or disabled, is then propagated to other group members and joining members using Group Replication's group messages. This means that the group members will all act in the same way when they are in the specified situation, and you only need to use the function on the primary.

The functions can also be used on a server that is not part of a group, as long as the Group Replication plugin is installed. In that case, the member actions configuration is not propagated to any other servers.

The group_replication_reset_member_actions function can only be used on a server that is not part of a group. It resets the member actions configuration to the default settings, and resets its version number. The server must be writeable (with the read_only system variable set to 0FF) and have the Group Replication plugin installed.

The available member actions are as follows:
mysql_disable_super_read_oThiş memberiaction is taken after a member is elected as the group's primary, which is the event AFTER_PRIMARY_ELECTION. The member action is enabled by default. You can disable it using the group_replication_disable_member_action() function, and re-enable it using group_replication_enable_member_action().

When this member action is enabled and taken, super read-only mode is disabled on the primary, so that the primary becomes readwrite and accepts updates from a replication source server and from clients. This is the normal situation.

When this member action is disabled and not taken, the primary remains in super read-only mode after election. In this state, it does not accept updates from any clients, even users who have the CONNECTION_ADMIN or SUPER privilege. It does continue to accept updates performed by replication threads. This setup means that when a group's purpose is to provide a secondary backup to another group for disaster tolerance, you can ensure that the secondary group remains synchronized with the first.
mysql_start_failover_channtblis memberiaction is taken after a member is elected as the group's primary, which is the event AFTER_PRIMARY_ELECTION. The member action is enabled by default. You can disable it using the group_replication_disable_member_action() function, and re-enable it using the group_replication_enable_member_action() function.

When this member action is enabled, asynchronous connection failover for replicas is active for a replication channel on a Group Replication primary when you set SOURCE_CONNECTION_AUTO_FAILOVER=1 in the CHANGE REPLICATION SOURCE TO statement for the channel. When the feature is active and correctly configured, if the primary that is replicating goes offline or into an error state, the new primary starts replication on the same channel when it is elected. This is the normal situation. For instructions to configure the feature, see Section 19.4.9.2, "Asynchronous Connection Failover for Replicas".

When this member action is disabled, asynchronous connection failover does not take place for the replicas. If the primary goes offline or into an error state, replication stops for the channel. Note that if there is more than one channel with SOURCE_CONNECTION_AUTO_FAILOVER=1, the member action covers all the channels, so they cannot be individually enabled and disabled by this method. Set SOURCE_CONNECTION_AUTO_FAILOVER=0 to disable an individual channel.

For more information on member actions and how to view the member actions configuration, see Section 20.5.1.5, "Configuring Member Actions".
- group_replication_disable_member_action()

Disable a member action so that the member does not take it in the specified situation. If the server where you use the function is part of a group, it must be the current primary in a group in singleprimary mode, and it must be part of the majority. The changed setting is propagated to other group members and joining members, so they will all act in the same way when they are in the specified situation, and you only need to use the function on the primary.

Syntax:
STRING group_replication_disable_member_action(name, event)
Arguments:
- name: The name of the member action to disable.
- event: The event that triggers the member action.

Return value:

A string containing the result of the operation, for example whether it was successful or not.
Example:
SELECT group_replication_disable_member_action("mysql_disable_super_read_only_if_primary", "AFTER_PRI
For more information, see Section 20.5.1.5, "Configuring Member Actions".
- group_replication_enable_member_action()

Enable a member action for the member to take in the specified situation. If the server where you use the function is part of a group, it must be the current primary in a group in single-primary mode, and it must be part of the majority. The changed setting is propagated to other group members and joining members, so they will all act in the same way when they are in the specified situation, and you only need to use the function on the primary.

Syntax:
```
STRING group_replication_enable_member_action(name, event)
```


Arguments:
- name: The name of the member action to enable.
- event: The event that triggers the member action.

Return value:
A string containing the result of the operation, for example whether it was successful or not.
Example:
SELECT group_replication_enable_member_action("mysql_disable_super_read_only_if_primary", "AFTER_PRIMARY_
For more information, see Section 20.5.1.5, "Configuring Member Actions".
- group_replication_reset_member_actions()

Reset the member actions configuration to the default settings, and reset its version number to 1 .
The group_replication_reset_member_actions() function can only be used on a server that is not currently part of a group. The server must be writeable (with the read_only system variable set to 0FF) and have the Group Replication plugin installed. You can use this function to remove the member actions configuration that a server used when it was part of a group, if you intend to use it as a standalone server with no member actions or different member actions.

Syntax:
STRING group_replication_reset_member_actions()
Arguments:
None.
Return value:
A string containing the result of the operation, for example whether it was successful or not.
Example:
SELECT group_replication_reset_member_actions();
For more information, see Section 20.5.1.5, "Configuring Member Actions".

\subsection*{14.18.2 Functions Used with Global Transaction Identifiers (GTIDs)}

The functions described in this section are used with GTID-based replication. It is important to keep in mind that all of these functions take string representations of GTID sets as arguments. As such, the GTID sets must always be quoted when used with them. See GTID Sets for more information.

The union of two GTID sets is simply their representations as strings, joined together with an interposed comma. In other words, you can define a very simple function for obtaining the union of two GTID sets, similar to that created here:
```
CREATE FUNCTION GTID_UNION(g1 TEXT, g2 TEXT)
    RETURNS TEXT DETERMINISTIC
    RETURN CONCAT(g1,',',g2);
```


For more information about GTIDs and how these GTID functions are used in practice, see Section 19.1.3, "Replication with Global Transaction Identifiers".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.26 GTID Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline WAIT_FOR_EXECUTED_GTID_SET( ) & \begin{tabular}{l} 
Wait until the given GTIDs have executed on the \\
replica.
\end{tabular} \\
\hline
\end{tabular}
\end{table}
- GTID_SUBSET(set1,set2)

Given two sets of global transaction identifiers set1 and set2, returns true if all GTIDs in set1 are also in set2. Returns NULL if set1 or set2 is NULL. Returns false otherwise.

The GTID sets used with this function are represented as strings, as shown in the following examples:
```
mysql> SELECT GTID_SUBSET('3E11FA47-71CA-11E1-9E33-C80AA9429562:23',
    -> '3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57')\G
************************** 1. row ******************************
GTID_SUBSET( '3E11FA47-71CA-11E1-9E33-C80AA9429562:23 ',
    '3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57'): 1
1 row in set (0.00 sec)
mysql> SELECT GTID_SUBSET('3E11FA47-71CA-11E1-9E33-C80AA9429562:23-25',
    -> '3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57')\G
************************** 1. row ******************************
GTID_SUBSET( '3E11FA47-71CA-11E1-9E33-C80AA9429562:23-25',
    '3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57'): 1
1 row in set (0.00 sec)
mysql> SELECT GTID_SUBSET('3E11FA47-71CA-11E1-9E33-C80AA9429562:20-25',
    -> '3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57')\G
************************** 1. row ******************************
GTID_SUBSET( ' 3E11FA47-71CA-11E1-9E33-C80AA9429562:20-25 ',
    '3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57'): 0
1 row in set (0.00 sec)
```

- GTID_SUBTRACT(set1,set2)

Given two sets of global transaction identifiers set1 and set2, returns only those GTIDs from set1 that are not in set2. Returns NULL if set1 or set2 is NULL.

All GTID sets used with this function are represented as strings and must be quoted, as shown in these examples:
```
mysql> SELECT GTID_SUBTRACT('3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57',
    -> '3E11FA47-71CA-11E1-9E33-C80AA9429562:21')\G
*************************** 1. row ***************************************
GTID_SUBTRACT('3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57',
    '3E11FA47-71CA-11E1-9E33-C80AA9429562:21'): 3e11fa47-71ca-11e1-9e33-c80aa9429562:22-57
1 row in set (0.00 sec)
mysql> SELECT GTID_SUBTRACT('3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57',
    -> '3E11FA47-71CA-11E1-9E33-C80AA9429562:20-25')\G
*************************** 1. row *****************************
GTID_SUBTRACT( ' 3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57 ',
    '3E11FA47-71CA-11E1-9E33-C80AA9429562:20-25'): 3e11fa47-71ca-11e1-9e33-c80aa9429562:26-57
1 row in set (0.00 sec)
```

```
mysql> SELECT GTID_SUBTRACT('3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57',
    -> '3E11FA47-71CA-11E1-9E33-C80AA9429562:23-24')\G
*************************** 1. row ****************************************
GTID_SUBTRACT( ' 3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57 ',
    '3E11FA47-71CA-11E1-9E33-C80AA9429562:23-24'): 3e11fa47-71ca-11e1-9e33-c80aa9429562:21-22:25-57
1 row in set (0.01 sec)
```


Subtracting a GTID set from itself produces an empty set, as shown here:
```
mysql> SELECT GTID_SUBTRACT('3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57',
    -> '3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57')\G
*************************** 1. row ***************************************
GTID_SUBTRACT( ' 3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57',
    '3E11FA47-71CA-11E1-9E33-C80AA9429562:21-57'):
1 row in set (0.00 sec)
```

- WAIT_FOR_EXECUTED_GTID_SET(gtid_set[, timeout])

Wait until the server has applied all of the transactions whose global transaction identifiers are contained in gtid_set; that is, until the condition GTID_SUBSET(gtid_subset, @@GLOBAL. gtid_executed) holds. See Section 19.1.3.1, "GTID Format and Storage" for a definition of GTID sets.

If a timeout is specified, and timeout seconds elapse before all of the transactions in the GTID set have been applied, the function stops waiting. timeout is optional, and the default timeout is 0 seconds, in which case the function always waits until all of the transactions in the GTID set have been applied. timeout must be greater than or equal to 0 ; when running in strict SQL mode, a negative timeout value is immediately rejected with an error (ER_WRONG_ARGUMENTS); otherwise the function returns NULL, and raises a warning.

WAIT_FOR_EXECUTED_GTID_SET( ) monitors all the GTIDs that are applied on the server, including transactions that arrive from all replication channels and user clients. It does not take into account whether replication channels have been started or stopped.

For more information, see Section 19.1.3, "Replication with Global Transaction Identifiers".
GTID sets used with this function are represented as strings and so must be quoted as shown in the following example:
```
mysql> SELECT WAIT_FOR_EXECUTED_GTID_SET('3E11FA47-71CA-11E1-9E33-C80AA9429562:1-5');
    -> 0
```


For a syntax description for GTID sets, see Section 19.1.3.1, "GTID Format and Storage".
For WAIT_FOR_EXECUTED_GTID_SET( ), the return value is the state of the query, where 0 represents success, and 1 represents timeout. Any other failures generate an error.
gtid_mode cannot be changed to OFF while any client is using this function to wait for GTIDs to be applied.

\subsection*{14.18.3 Asynchronous Replication Channel Failover Functions}

The following functions enable you to add or remove replication source servers to or from the source list for a replication channel, as well as clear the source list for a given server.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.27 Failover Channel Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline asynchronous_connection_failover_add_m & Addagordurá member source server configuration information to a replication channel source list \\
\hline asynchronous_connection_failover_add_s & Addcsoutce server configuration information server to a replication channel source list \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline asynchronous_connection_failover_delet & Remœr ega d(anaged group from a replication channel source list \\
\hline asynchronous_connection_failover_delet & Reswoveca \$durce server from a replication channel source list \\
\hline asynchronous_connection_failover_reset & Remove all settings relating to group replication asynchronous failover \\
\hline
\end{tabular}

The asynchronous connection failover mechanism automatically establishes an asynchronous (source to replica) replication connection to a new source from the appropriate list after the existing connection from the replica to its source fails. The connection is also changed if the currently connected source does not have the highest weighted priority in the group. For Group Replication source servers that are defined as part of a managed group, the connection is also failed over to another group member if the currently connected source leaves the group or is no longer in the majority. For more information on the mechanism, see Section 19.4.9, "Switching Sources and Replicas with Asynchronous Connection Failover".

Source lists are stored in the mysql.replication_asynchronous_connection_failover and mysql.replication_asynchronous_connection_failover_managed tables, and can be viewed in the Performance Schema replication_asynchronous_connection_failover table.

If the replication channel is on a Group Replication primary for a group where failover between replicas is active, the source list is broadcast to all the group members when they join or when it is updated by any method. Failover between replicas is controlled by the mysql_start_failover_channels_if_primary member action, which is enabled by default, and can be disabled using the group_replication_disable_member_action function.
- asynchronous_connection_failover_add_managed()

Add configuration information for a replication source server that is part of a managed group (a Group Replication group member) to the source list for a replication channel. You only need to add one group member. The replica automatically adds the rest from the current group membership, then keeps the source list updated in line with membership change.

Syntax:
asynchronous_connection_failover_add_managed(channel, managed_type, managed_name, host, port, network
Arguments:
- channe1: The replication channel for which this replication source server is part of the source list.
- managed_type: The type of managed service that the asynchronous connection failover mechanism must provide for this server. The only value currently accepted is GroupReplication.
- managed_name: The identifier for the managed group that the server is a part of. For the GroupReplication managed service, the identifier is the value of the group_replication_group_name system variable.
- host: The host name for this replication source server.
- port: The port number for this replication source server.
- network_namespace: The network namespace for this replication source server. Specify an empty string, as this parameter is reserved for future use.
- primary_weight: The priority of this replication source server in the replication channel's source list when it is acting as the primary for the managed group. The weight is from 1 to 100 , with 100 being the highest. For the primary, 80 is a suitable weight. The asynchronous connection failover
mechanism activates if the currently connected source is not the highest weighted in the group. Assuming that you set up the managed group to give a higher weight to a primary and a lower weight to a secondary, when the primary changes, its weight increases, and the replica changes over the connection to it.
- secondary_weight: The priority of this replication source server in the replication channel's source list when it is acting as a secondary in the managed group. The weight is from 1 to 100 , with 100 being the highest. For a secondary, 60 is a suitable weight.

Return value:
A string containing the result of the operation, for example whether it was successful or not.
Example:
```
SELECT asynchronous_connection_failover_add_managed('channel2', 'GroupReplication', 'aaaaaaaa-aaaa-aaaa-a
+---------------------------------------------------------------------------------------------------------
| asynchronous_connection_failover_add_source('channel2', 'GroupReplication', 'aaaaaaaa-aaaa-aaaa-aaaa-ac
+--------------------------------------------------------------------------------------------------------
| Source managed configuration details successfully inserted.
```


For more information, see Section 19.4.9, "Switching Sources and Replicas with Asynchronous Connection Failover".
- asynchronous_connection_failover_add_source()

Add configuration information for a replication source server to the source list for a replication channel.

Syntax:
asynchronous_connection_failover_add_source(channel, host, port, network_namespace, weight)

\section*{Arguments:}
- channe1: The replication channel for which this replication source server is part of the source list.
- host: The host name for this replication source server.
- port: The port number for this replication source server.
- network_namespace: The network namespace for this replication source server. Specify an empty string, as this parameter is reserved for future use.
- weight: The priority of this replication source server in the replication channel's source list. The priority is from 1 to 100 , with 100 being the highest, and 50 being the default. When the asynchronous connection failover mechanism activates, the source with the highest priority setting among the alternative sources listed in the source list for the channel is chosen for the first connection attempt. If this attempt does not work, the replica tries with all the listed sources in descending order of priority, then starts again from the highest priority source. If multiple sources have the same priority, the replica orders them randomly. The asynchronous connection failover mechanism activates if the source currently connected is not the highest weighted in the group.

Return value:
A string containing the result of the operation, for example whether it was successful or not.
Example:
```
SELECT asynchronous_connection_failover_add_source('channel2', '127.0.0.1', 3310, '', 80);
+---------------------------------------------------------------------------------------------------
| asynchronous_connection_failover_add_source('channel2', '127.0.0.1', 3310, '', 80)
```

```
| Source configuration details successfully inserted.
```


For more information, see Section 19.4.9, "Switching Sources and Replicas with Asynchronous Connection Failover".
- asynchronous_connection_failover_delete_managed()

Remove an entire managed group from the source list for a replication channel. When you use this function, all the replication source servers defined in the managed group are removed from the channel's source list.

\section*{Syntax:}
```
asynchronous_connection_failover_delete_managed(channel, managed_name)
```


\section*{Arguments:}
- channel: The replication channel for which this replication source server was part of the source list.
- managed_name: The identifier for the managed group that the server is a part of. For the GroupReplication managed service, the identifier is the value of the group_replication_group_name system variable.

Return value:

A string containing the result of the operation, for example whether it was successful or not.

\section*{Example:}
```
SELECT asynchronous_connection_failover_delete_managed('channel2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa
+--------------------------------------------------------------------------------------------------------
| asynchronous_connection_failover_delete_managed('channel2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa')
+-------------------------------------------------------------------------------------------------------
| Source managed configuration details successfully deleted.
+-----------------------------------------------------------------------------------------------------------
```


For more information, see Section 19.4.9, "Switching Sources and Replicas with Asynchronous Connection Failover".
- asynchronous_connection_failover_delete_source()

Remove configuration information for a replication source server from the source list for a replication channel.

Syntax:
```
asynchronous_connection_failover_delete_source(channel, host, port, network_namespace)
```


Arguments:
- channel: The replication channel for which this replication source server was part of the source list.
- host: The host name for this replication source server.
- port: The port number for this replication source server.
- network_namespace: The network namespace for this replication source server. Specify an empty string, as this parameter is reserved for future use.

Return value:
A string containing the result of the operation, for example whether it was successful or not.
Example:
```
SELECT asynchronous_connection_failover_delete_source('channel2', '127.0.0.1', 3310, '');
+---------------------------------------------------------------------------------------------------
| asynchronous_connection_failover_delete_source('channel2', '127.0.0.1', 3310, '') |
+--------------------------------------------------------------------------------------------------
| Source configuration details successfully deleted. |
```


For more information, see Section 19.4.9, "Switching Sources and Replicas with Asynchronous Connection Failover".
- asynchronous_connection_failover_reset()

Remove all settings relating to the asynchronous connection failover mechanism. The function clears the Performance Schema tables replication_asynchronous_connection_failover and replication_asynchronous_connection_failover_managed.
asynchronous_connection_failover_reset() can be used only on a server that is not currently part of a group, and that does not have any replication channels running. You can use this function to clean up a server that is no longer being used in a managed group.

Syntax:
STRING asynchronous_connection_failover_reset()
Arguments:
None.
Return value:
A string containing the result of the operation, for example whether it was successful or not.
Example:
```
mysql> SELECT asynchronous_connection_failover_reset();
+--------------------------------------------------------------------------- | asynchronous_connection_failover_reset() |
```

```
The UDF asynchronous_connection_failover_reset() executed successfully. |
+-----------------------------------------------------------------------------
1 row in set (0.00 sec)
```


For more information, see Section 19.4.9, "Switching Sources and Replicas with Asynchronous Connection Failover".

\subsection*{14.18.4 Position-Based Synchronization Functions}

The functions listed in this section are used for controlling position-based synchronization of source and replica servers in MySQL Replication.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.28 Positional Synchronization Functions}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline MASTER_POS_WAIT( ) & Block until the replica has read and applied all updates up to the specified position & Yes \\
\hline SOURCE_POS_WAIT( ) & Block until the replica has read and applied all updates up to the specified position & \\
\hline
\end{tabular}
\end{table}
- MASTER_POS_WAIT(log_name,log_pos[,timeout][,channel])

Deprecated alias for SOURCE_POS_WAIT( ).
- SOURCE_POS_WAIT(log_name,log_pos[,timeout][,channel])

This function is for control of source-replica synchronization. It blocks until the replica has read and applied all updates up to the specified position in the source's binary log.

The return value is the number of log events the replica had to wait for to advance to the specified position. The function returns NULL if the replication SQL thread is not started, the replica's source information is not initialized, the arguments are incorrect, or an error occurs. It returns - 1 if the timeout has been exceeded. If the replication SQL thread stops while SOURCE_POS_WAIT( ) is waiting, the function returns NULL. If the replica is past the specified position, the function returns immediately.

If the binary log file position has been marked as invalid, the function waits until a valid file position is known. The binary log file position can be marked as invalid when the CHANGE REPLICATION SOURCE TO option GTID_ONLY is set for the replication channel, and the server is restarted or replication is stopped. The file position becomes valid after a transaction is successfully applied past the given file position. If the applier does not reach the stated position, the function waits until the timeout. Use a SHOW REPLICA STATUS statement to check if the binary log file position has been marked as invalid.

On a multithreaded replica, the function waits until expiry of the limit set by the replica_checkpoint_group or replica_checkpoint_period system variable, when the checkpoint operation is called to update the status of the replica. Depending on the setting for the system variables, the function might therefore return some time after the specified position was reached.

If binary log transaction compression is in use and the transaction payload at the specified position is compressed (as a Transaction_payload_event), the function waits until the whole transaction has been read and applied, and the positions have updated.

If a timeout value is specified, SOURCE_POS_WAIT( ) stops waiting when timeout seconds have elapsed. timeout must be greater than or equal to 0 . (When the server is running in strict SQL
mode, a negative timeout value is immediately rejected with ER_WRONG_ARGUMENTS; otherwise the function returns NULL, and raises a warning.)

The optional channel value enables you to name which replication channel the function applies to. See Section 19.2.2, "Replication Channels" for more information.

This function is unsafe for statement-based replication. A warning is logged if you use this function when binlog_format is set to STATEMENT.

\subsection*{14.19 Aggregate Functions}

Aggregate functions operate on sets of values. They are often used with a GROUP BY clause to group values into subsets. This section describes most aggregate functions. For information about aggregate functions that operate on geometry values, see Section 14.16.12, "Spatial Aggregate Functions".

\subsection*{14.19.1 Aggregate Function Descriptions}

This section describes aggregate functions that operate on sets of values. They are often used with a GROUP BY clause to group values into subsets.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.29 Aggregate Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline AVG( ) & Return the average value of the argument \\
\hline BIT_AND( ) & Return bitwise AND \\
\hline BIT_OR( ) & Return bitwise OR \\
\hline BIT_XOR( ) & Return bitwise XOR \\
\hline COUNT( ) & Return a count of the number of rows returned \\
\hline COUNT(DISTINCT) & Return the count of a number of different values \\
\hline GROUP_CONCAT( ) & Return a concatenated string \\
\hline JSON_ARRAYAGG() & Return result set as a single JSON array \\
\hline JSON_OBJECTAGG() & Return result set as a single JSON object \\
\hline MAX( ) & Return the maximum value \\
\hline MIN() & Return the minimum value \\
\hline STD( ) & Return the population standard deviation \\
\hline STDDEV( ) & Return the population standard deviation \\
\hline STDDEV_POP ( ) & Return the population standard deviation \\
\hline STDDEV_SAMP( ) & Return the sample standard deviation \\
\hline SUM( ) & Return the sum \\
\hline VAR_POP( ) & Return the population standard variance \\
\hline VAR_SAMP( ) & Return the sample variance \\
\hline VARIANCE( ) & Return the population standard variance \\
\hline
\end{tabular}
\end{table}

Unless otherwise stated, aggregate functions ignore NULL values.
If you use an aggregate function in a statement containing no GROUP BY clause, it is equivalent to grouping on all rows. For more information, see Section 14.19.3, "MySQL Handling of GROUP BY".

Most aggregate functions can be used as window functions. Those that can be used this way are signified in their syntax description by [over_clause], representing an optional OVER clause. over_clause is described in Section 14.20.2, "Window Function Concepts and Syntax", which also includes other information about window function usage.

For numeric arguments, the variance and standard deviation functions return a DOUBLE value. The SUM( ) and AVG( ) functions return a DECIMAL value for exact-value arguments (integer or DECIMAL), and a DOUBLE value for approximate-value arguments (FLOAT or DOUBLE).

The SUM() and AVG( ) aggregate functions do not work with temporal values. (They convert the values to numbers, losing everything after the first nonnumeric character.) To work around this problem, convert to numeric units, perform the aggregate operation, and convert back to a temporal value.
Examples:
```
SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(time_col))) FROM tbl_name;
SELECT FROM_DAYS(SUM(TO_DAYS(date_col))) FROM tbl_name;
```


Functions such as SUM() or $\operatorname{AVG}()$ that expect a numeric argument cast the argument to a number if necessary. For SET or ENUM values, the cast operation causes the underlying numeric value to be used.

The BIT_AND( ), BIT_OR( ), and BIT_XOR( ) aggregate functions perform bit operations.
MySQL bit functions and operators permit binary string type arguments (BINARY, VARBINARY, and the BLOB types) and return a value of like type, which enables them to take arguments and produce return values larger than 64 bits. For discussion about argument evaluation and result types for bit operations, see the introductory discussion in Section 14.12, "Bit Functions and Operators".
- AVG([DISTINCT] expr) [over_clause]

Returns the average value of expr. The DISTINCT option can be used to return the average of the distinct values of expr.

If there are no matching rows, $\operatorname{AVG}()$ returns NULL. The function also returns NULL if expr is NULL.
This function executes as a window function if over_clause is present. over_clause is as described in Section 14.20.2, "Window Function Concepts and Syntax"; it cannot be used with DISTINCT.
```
mysql> SELECT student_name, AVG(test_score)
    FROM student
    GROUP BY student_name;
```

- BIT_AND(expr) [over_clause]

Returns the bitwise AND of all bits in expr.
The result type depends on whether the function argument values are evaluated as binary strings or numbers:
- Binary-string evaluation occurs when the argument values have a binary string type, and the argument is not a hexadecimal literal, bit literal, or NULL literal. Numeric evaluation occurs otherwise, with argument value conversion to unsigned 64-bit integers as necessary.
- Binary-string evaluation produces a binary string of the same length as the argument values. If argument values have unequal lengths, an ER_INVALID_BITWISE_OPERANDS_SIZE error occurs. If the argument size exceeds 511 bytes, an ER_INVALID_BITWISE_AGGREGATE_OPERANDS_SIZE error occurs. Numeric evaluation produces an unsigned 64-bit integer.

If there are no matching rows, BIT_AND( ) returns a neutral value (all bits set to 1) having the same length as the argument values.

NULL values do not affect the result unless all values are NULL. In that case, the result is a neutral value having the same length as the argument values.

For more information discussion about argument evaluation and result types, see the introductory discussion in Section 14.12, "Bit Functions and Operators".

If BIT_AND ( ) is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".

This function executes as a window function if over_clause is present. over_clause is as described in Section 14.20.2, "Window Function Concepts and Syntax".
- BIT_OR(expr) [over_clause]

Returns the bitwise OR of all bits in expr.
The result type depends on whether the function argument values are evaluated as binary strings or numbers:
- Binary-string evaluation occurs when the argument values have a binary string type, and the argument is not a hexadecimal literal, bit literal, or NULL literal. Numeric evaluation occurs otherwise, with argument value conversion to unsigned 64-bit integers as necessary.
- Binary-string evaluation produces a binary string of the same length as the argument values. If argument values have unequal lengths, an ER_INVALID_BITWISE_OPERANDS_SIZE error occurs. If the argument size exceeds 511 bytes, an ER_INVALID_BITWISE_AGGREGATE_OPERANDS_SIZE error occurs. Numeric evaluation produces an unsigned 64-bit integer.

If there are no matching rows, BIT_OR( ) returns a neutral value (all bits set to 0 ) having the same length as the argument values.

NULL values do not affect the result unless all values are NULL. In that case, the result is a neutral value having the same length as the argument values.

For more information discussion about argument evaluation and result types, see the introductory discussion in Section 14.12, "Bit Functions and Operators".

If BIT_OR( ) is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".

This function executes as a window function if over_clause is present. over_clause is as described in Section 14.20.2, "Window Function Concepts and Syntax".
- BIT_XOR(expr) [over_clause]

Returns the bitwise XOR of all bits in expr.
The result type depends on whether the function argument values are evaluated as binary strings or numbers:
- Binary-string evaluation occurs when the argument values have a binary string type, and the argument is not a hexadecimal literal, bit literal, or NULL literal. Numeric evaluation occurs otherwise, with argument value conversion to unsigned 64-bit integers as necessary.
- Binary-string evaluation produces a binary string of the same length as the argument values. If argument values have unequal lengths, an ER_INVALID_BITWISE_OPERANDS_SIZE error occurs. If the argument size exceeds 511 bytes,
an ER_INVALID_BITWISE_AGGREGATE_OPERANDS_SIZE error occurs. Numeric evaluation produces an unsigned 64-bit integer.

If there are no matching rows, BIT_XOR( ) returns a neutral value (all bits set to 0 ) having the same length as the argument values.

NULL values do not affect the result unless all values are NULL. In that case, the result is a neutral value having the same length as the argument values.

For more information discussion about argument evaluation and result types, see the introductory discussion in Section 14.12, "Bit Functions and Operators".

If BIT_XOR( ) is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".

This function executes as a window function if over_clause is present. over_clause is as described in Section 14.20.2, "Window Function Concepts and Syntax".
- COUNT(expr) [over_clause]

Returns a count of the number of non-NULL values of expr in the rows retrieved by a SELECT statement. The result is a BIGINT value.

If there are no matching rows, COUNT( ) returns 0. COUNT( NULL ) returns 0.
This function executes as a window function if over_clause is present. over_clause is as described in Section 14.20.2, "Window Function Concepts and Syntax".
```
mysql> SELECT student.student_name,COUNT(*)
    FROM student, course
    WHERE student.student_id=course.student_id
    GROUP BY student_name;
```


COUNT ( * ) is somewhat different in that it returns a count of the number of rows retrieved, whether or not they contain NULL values.

For transactional storage engines such as InnoDB , storing an exact row count is problematic. Multiple transactions may be occurring at the same time, each of which may affect the count.

InnoDB does not keep an internal count of rows in a table because concurrent transactions might "see" different numbers of rows at the same time. Consequently, SELECT COUNT (*) statements only count rows visible to the current transaction.

SELECT COUNT(*) FROM tbl_name query performance for InnoDB tables is optimized for singlethreaded workloads if there are no extra clauses such as WHERE or GROUP BY.

InnoDB processes SELECT COUNT (*) statements by traversing the smallest available secondary index unless an index or optimizer hint directs the optimizer to use a different index. If a secondary index is not present, InnoDB processes SELECT COUNT (*) statements by scanning the clustered index.

Processing of SELECT COUNT( *) statements takes some time if index records are not entirely in the buffer pool. For a faster count, create a counter table and let your application update it according to the inserts and deletes it does. However, this method may not scale well in situations
where thousands of concurrent transactions are initiating updates to the same counter table. If an approximate row count is sufficient, use SHOW TABLE STATUS.

InnoDB handles SELECT COUNT (*) and SELECT COUNT (1) operations in the same way. There is no performance difference.

For MyISAM tables, COUNT ( * ) is optimized to return very quickly if the SELECT retrieves from one table, no other columns are retrieved, and there is no WHERE clause. For example:
```
mysql> SELECT COUNT(*) FROM student;
```


This optimization only applies to MyISAM tables, because an exact row count is stored for this storage engine and can be accessed very quickly. COUNT (1) is only subject to the same optimization if the first column is defined as NOT NULL.
- COUNT(DISTINCT expr,[expr…])

Returns a count of the number of rows with different non-NULL expr values.
If there are no matching rows, COUNT (DISTINCT) returns 0.
```
mysql> SELECT COUNT(DISTINCT results) FROM student;
```


In MySQL, you can obtain the number of distinct expression combinations that do not contain NULL by giving a list of expressions. In standard SQL, you would have to do a concatenation of all expressions inside COUNT(DISTINCT ...).
- GROUP_CONCAT(expr)

This function returns a string result with the concatenated non-NULL values from a group. It returns NULL if there are no non-NULL values. The full syntax is as follows:
```
GROUP_CONCAT([DISTINCT] expr [,expr ...]
            [ORDER BY {unsigned_integer | col_name | expr}
                [ASC | DESC] [,col_name ...]]
            [SEPARATOR str_val])
```

```
mysql> SELECT student_name,
        GROUP_CONCAT(test_score)
    FROM student
    GROUP BY student_name;
```


Or:
```
mysql> SELECT student_name,
        GROUP_CONCAT(DISTINCT test_score
            ORDER BY test_score DESC SEPARATOR ' ')
    FROM student
    GROUP BY student_name;
```


In MySQL, you can get the concatenated values of expression combinations. To eliminate duplicate values, use the DISTINCT clause. To sort values in the result, use the ORDER BY clause. To sort in reverse order, add the DESC (descending) keyword to the name of the column you are sorting by in the ORDER BY clause. The default is ascending order; this may be specified explicitly using the ASC keyword. The default separator between values in a group is comma (, ). To specify a separator explicitly, use SEPARATOR followed by the string literal value that should be inserted between group values. To eliminate the separator altogether, specify SEPARATOR ' '.

The result is truncated to the maximum length that is given by the group_concat_max_len system variable, which has a default value of 1024. The value can be set higher, although the effective maximum length of the return value is constrained by the value of max_allowed_packet. The
syntax to change the value of group_concat_max_len at runtime is as follows, where val is an unsigned integer:
```
SET [GLOBAL | SESSION] group_concat_max_len = val;
```


\section*{Important}

When setting the value for group_concat_max_len, consider the following:
- Estimate the maximum length required for GROUP_CONCAT( ) output and set the value accordingly.
- Setting the value excessively high can negatively affect performance and lead to out-of-memory (OOM) errors.
- In MySQL HeatWave, the maximum column length is 4 MB , so setting a value higher than this causes the output to be truncated. To avoid this, set a value under 4 MB .

The return value is a nonbinary or binary string, depending on whether the arguments are nonbinary or binary strings. The result type is TEXT or BLOB unless group_concat_max_len is less than or equal to 512 , in which case the result type is VARCHAR or VARBINARY.

If GROUP_CONCAT( ) is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".

See also CONCAT ( ) and CONCAT_WS( ): Section 14.8, "String Functions and Operators".
```
- JSON_ARRAYAGG(col_or_expr) [over_clause]
```


Aggregates a result set as a single JSON array whose elements consist of the rows. The order of elements in this array is undefined. The function acts on a column or an expression that evaluates to a single value. Returns NULL if the result contains no rows, or in the event of an error. If col_or_expr is NULL, the function returns an array of JSON [null] elements.

This function executes as a window function if over_clause is present. over_clause is as described in Section 14.20.2, "Window Function Concepts and Syntax".
```
mysql> SELECT o_id, attribute, value FROM t3;
+------+------------+-------+
| o_id | attribute | value |
+------+------------+-------+
| 2 | color | red |
| 2 | fabric | silk |
| 3 | color | green |
| 3 | shape | square|
+------+------------+-------+
4 rows in set (0.00 sec)
mysql> SELECT o_id, JSON_ARRAYAGG(attribute) AS attributes
    -> FROM t3 GROUP BY o_id;
+------+----------------------+
| o_id | attributes |
+------+----------------------+
| 2 | ["color", "fabric"] |
| 3 | ["color", "shape"] |
+------+----------------------+
2 rows in set (0.00 sec)
```

- JSON_OBJECTAGG(key, value) [over_clause]

Takes two column names or expressions as arguments, the first of these being used as a key and the second as a value, and returns a JSON object containing key-value pairs. Returns NULL if the
result contains no rows, or in the event of an error. An error occurs if any key name is NULL or the number of arguments is not equal to 2 .

This function executes as a window function if over_clause is present. over_clause is as described in Section 14.20.2, "Window Function Concepts and Syntax".
```
mysql> SELECT o_id, attribute, value FROM t3;
+------+------------+-------+
| o_id | attribute | value |
+------+------------+-------+
| 2 | color | red
| 2 | fabric | silk |
| 3 | color | green |
| 3 | shape | square|
+------+------------+-------+
4 rows in set (0.00 sec)
mysql> SELECT o_id, JSON_OBJECTAGG(attribute, value)
    -> FROM t3 GROUP BY o_id;
+------+----------------------------------------
| o_id | JSON_OBJECTAGG(attribute, value) |
+------+----------------------------------------
| 2 | {"color": "red", "fabric": "silk"} |
| 3 | {"color": "green", "shape": "square"} |
+------+-----------------------------------------
2 rows in set (0.00 sec)
```


Duplicate key handling. When the result of this function is normalized, values having duplicate keys are discarded. In keeping with the MySQL JSON data type specification that does not permit duplicate keys, only the last value encountered is used with that key in the returned object ("last duplicate key wins"). This means that the result of using this function on columns from a SELECT can depend on the order in which the rows are returned, which is not guaranteed.

When used as a window function, if there are duplicate keys within a frame, only the last value for the key is present in the result. The value for the key from the last row in the frame is deterministic if the ORDER BY specification guarantees that the values have a specific order. If not, the resulting value of the key is nondeterministic.

Consider the following:
```
mysql> CREATE TABLE t(c VARCHAR(10), i INT);
Query OK, 0 rows affected (0.33 sec)
mysql> INSERT INTO t VALUES ('key', 3), ('key', 4), ('key', 5);
Query OK, 3 rows affected (0.10 sec)
Records: 3 Duplicates: 0 Warnings: 0
mysql> SELECT c, i FROM t;
+------+-------+
| c | i |
+------+-------+
| key | 3 |
| key | 4 |
| key | 5 |
+------+-------+
3 rows in set (0.00 sec)
mysql> SELECT JSON_OBJECTAGG(c, i) FROM t;
+-----------------------+
| JSON_OBJECTAGG(c, i) |
+-----------------------+
| {"key": 5} |
+-----------------------+
1 row in set (0.00 sec)
mysql> DELETE FROM t;
Query OK, 3 rows affected (0.08 sec)
mysql> INSERT INTO t VALUES ('key', 3), ('key', 5), ('key', 4);
```

```
Query OK, 3 rows affected (0.06 sec)
Records: 3 Duplicates: 0 Warnings: 0
mysql> SELECT c, i FROM t;
+------+-------+
| c | i |
+------+-------+
| key | 3 |
| key | 5 |
| key | 4 |
+------+------+
3 rows in set (0.00 sec)
mysql> SELECT JSON_OBJECTAGG(c, i) FROM t;
+-----------------------+
| JSON_OBJECTAGG(c, i) |
+-----------------------+
| {"key": 4} |
+-----------------------+
1 row in set (0.00 sec)
```


The key chosen from the last query is nondeterministic. If the query does not use GROUP BY (which usually imposes its own ordering regardless) and you prefer a particular key ordering, you can invoke JSON_OBJECTAGG() as a window function by including an OVER clause with an ORDER BY specification to impose a particular order on frame rows. The following examples show what happens with and without ORDER BY for a few different frame specifications.

Without ORDER BY, the frame is the entire partition:
```
mysql> SELECT JSON_OBJECTAGG(c, i)
    OVER () AS json_object FROM t;
+--------------+
| json_object |
+--------------+
| {"key": 4} |
| {"key": 4} |
| {"key": 4} |
+--------------+
```


With ORDER BY, where the frame is the default of RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW (in both ascending and descending order):
```
mysql> SELECT JSON_OBJECTAGG(c, i)
    OVER (ORDER BY i) AS json_object FROM t;
+--------------+
| json_object |
+--------------+
| {"key": 3} |
| {"key": 4} |
| {"key": 5} |
+--------------+
mysql> SELECT JSON_OBJECTAGG(c, i)
    OVER (ORDER BY i DESC) AS json_object FROM t;
+--------------+
| json_object |
+--------------+
| {"key": 5} |
| {"key": 4} |
| {"key": 3} |
+--------------+
```


With ORDER BY and an explicit frame of the entire partition:
```
mysql> SELECT JSON_OBJECTAGG(c, i)
    OVER (ORDER BY i
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
    AS json_object
    FROM t;
+--------------+
| json_object |
```

```
+--------------+
| {"key": 5} |
| {"key": 5} |
| {"key": 5} |
+--------------+
```


To return a particular key value (such as the smallest or largest), include a LIMIT clause in the appropriate query. For example:
```
mysql> SELECT JSON_OBJECTAGG(c, i)
    OVER (ORDER BY i) AS json_object FROM t LIMIT 1;
+--------------+
| json_object |
+--------------+
| {"key": 3} |
+--------------+
mysql> SELECT JSON_OBJECTAGG(c, i)
    OVER (ORDER BY i DESC) AS json_object FROM t LIMIT 1;
+--------------+
| json_object |
+--------------+
| {"key": 5} |
+--------------+
```


See Normalization, Merging, and Autowrapping of JSON Values, for additional information and examples.
- MAX([DISTINCT] expr) [over_clause]

Returns the maximum value of expr. MAX( ) may take a string argument; in such cases, it returns the maximum string value. See Section 10.3.1, "How MySQL Uses Indexes". The DISTINCT keyword can be used to find the maximum of the distinct values of expr, however, this produces the same result as omitting DISTINCT.

If there are no matching rows, or if expr is NULL, MAX( ) returns NULL.
This function executes as a window function if over_clause is present. over_clause is as described in Section 14.20.2, "Window Function Concepts and Syntax"; it cannot be used with DISTINCT.
```
mysql> SELECT student_name, MIN(test_score), MAX(test_score)
    FROM student
    GROUP BY student_name;
```


For MAX( ), MySQL currently compares ENUM and SET columns by their string value rather than by the string's relative position in the set. This differs from how ORDER BY compares them.
- MIN([DISTINCT] expr) [over_clause]

Returns the minimum value of expr. MIN( ) may take a string argument; in such cases, it returns the minimum string value. See Section 10.3.1, "How MySQL Uses Indexes". The DISTINCT keyword can be used to find the minimum of the distinct values of expr, however, this produces the same result as omitting DISTINCT.

If there are no matching rows, or if expr is NULL, MIN() returns NULL.
This function executes as a window function if over_clause is present. over_clause is as described in Section 14.20.2, "Window Function Concepts and Syntax"; it cannot be used with DISTINCT.
```
mysql> SELECT student_name, MIN(test_score), MAX(test_score)
    FROM student
```


