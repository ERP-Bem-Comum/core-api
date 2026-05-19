\section*{ITERATE label}

ITERATE can appear only within LOOP, REPEAT, and WHILE statements. ITERATE means "start the loop again."

For an example, see Section 15.6.5.5, "LOOP Statement".

\subsection*{15.6.5.4 LEAVE Statement}

\section*{LEAVE label}

This statement is used to exit the flow control construct that has the given label. If the label is for the outermost stored program block, LEAVE exits the program.

LEAVE can be used within BEGIN . . . END or loop constructs (LOOP, REPEAT, WHILE).
For an example, see Section 15.6.5.5, "LOOP Statement".

\subsection*{15.6.5.5 LOOP Statement}
```
[begin_label:] LOOP
    statement_list
END LOOP [end_label]
```


LOOP implements a simple loop construct, enabling repeated execution of the statement list, which consists of one or more statements, each terminated by a semicolon (;) statement delimiter. The statements within the loop are repeated until the loop is terminated. Usually, this is accomplished with a LEAVE statement. Within a stored function, RETURN can also be used, which exits the function entirely.

Neglecting to include a loop-termination statement results in an infinite loop.

A LOOP statement can be labeled. For the rules regarding label use, see Section 15.6.2, "Statement Labels".

Example:
```
CREATE PROCEDURE doiterate(p1 INT)
BEGIN
    label1: LOOP
        SET p1 = p1 + 1;
        IF p1 < 10 THEN
            ITERATE label1;
        END IF;
        LEAVE label1;
    END LOOP label1;
    SET @x = p1;
END;
```


\subsection*{15.6.5.6 REPEAT Statement}
```
[begin_label:] REPEAT
    statement_list
UNTIL search_condition
END REPEAT [end_label]
```


The statement list within a REPEAT statement is repeated until the search_condition expression is true. Thus, a REPEAT always enters the loop at least once. statement_list consists of one or more statements, each terminated by a semicolon (;) statement delimiter.

A REPEAT statement can be labeled. For the rules regarding label use, see Section 15.6.2, "Statement Labels".

Example:
```
mysql> delimiter //
mysql> CREATE PROCEDURE dorepeat(p1 INT)
    BEGIN
        SET @x = 0;
        REPEAT
            SET @x = @x + 1;
        UNTIL @x > p1 END REPEAT;
    END
    //
Query OK, 0 rows affected (0.00 sec)
mysql> CALL dorepeat(1000)//
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @x//
+------+
| @x |
+------+
| 1001 |
+------+
1 row in set (0.00 sec)
```


\subsection*{15.6.5.7 RETURN Statement}

RETURN expr
The RETURN statement terminates execution of a stored function and returns the value expr to the function caller. There must be at least one RETURN statement in a stored function. There may be more than one if the function has multiple exit points.

This statement is not used in stored procedures, triggers, or events. The LEAVE statement can be used to exit a stored program of those types.

\subsection*{15.6.5.8 WHILE Statement}
```
[begin_label:] WHILE search_condition DO
    statement_list
END WHILE [end_label]
```


The statement list within a WHILE statement is repeated as long as the search_condition expression is true. statement_list consists of one or more SQL statements, each terminated by a semicolon (;) statement delimiter.

A WHILE statement can be labeled. For the rules regarding label use, see Section 15.6.2, "Statement Labels".

Example:
```
CREATE PROCEDURE dowhile()
BEGIN
    DECLARE v1 INT DEFAULT 5;
    WHILE v1 > 0 DO
        ...
        SET v1 = v1 - 1;
    END WHILE;
END;
```


\subsection*{15.6.6 Cursors}

MySQL supports cursors inside stored programs. The syntax is as in embedded SQL. Cursors have these properties:
- Asensitive: The server may or may not make a copy of its result table
- Read only: Not updatable
- Nonscrollable: Can be traversed only in one direction and cannot skip rows

Cursor declarations must appear before handler declarations and after variable and condition declarations.

Example:
```
CREATE PROCEDURE curdemo()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE a CHAR(16);
    DECLARE b, c INT;
    DECLARE cur1 CURSOR FOR SELECT id,data FROM test.t1;
    DECLARE cur2 CURSOR FOR SELECT i FROM test.t2;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    OPEN cur1;
    OPEN cur2;
    read_loop: LOOP
        FETCH cur1 INTO a, b;
        FETCH cur2 INTO c;
        IF done THEN
            LEAVE read_loop;
        END IF;
        IF b < c THEN
            INSERT INTO test.t3 VALUES (a,b);
        ELSE
            INSERT INTO test.t3 VALUES (a,c);
        END IF;
    END LOOP;
    CLOSE cur1;
    CLOSE cur2;
END;
```


\subsection*{15.6.6.1 Cursor CLOSE Statement}

CLOSE cursor_name
This statement closes a previously opened cursor. For an example, see Section 15.6.6, "Cursors".
An error occurs if the cursor is not open.
If not closed explicitly, a cursor is closed at the end of the BEGIN ... END block in which it was declared.

\subsection*{15.6.6.2 Cursor DECLARE Statement}

DECLARE cursor_name CURSOR FOR select_statement
This statement declares a cursor and associates it with a SELECT statement that retrieves the rows to be traversed by the cursor. To fetch the rows later, use a FETCH statement. The number of columns retrieved by the SELECT statement must match the number of output variables specified in the FETCH statement.

The SELECT statement cannot have an INTO clause.
Cursor declarations must appear before handler declarations and after variable and condition declarations.

A stored program may contain multiple cursor declarations, but each cursor declared in a given block must have a unique name. For an example, see Section 15.6.6, "Cursors".

For information available through SHOW statements, it is possible in many cases to obtain equivalent information by using a cursor with an INFORMATION_SCHEMA table.

\subsection*{15.6.6.3 Cursor FETCH Statement}

FETCH [[NEXT] FROM] cursor_name INTO var_name [, var_name] ...
This statement fetches the next row for the SELECT statement associated with the specified cursor (which must be open), and advances the cursor pointer. If a row exists, the fetched columns are stored in the named variables. The number of columns retrieved by the SELECT statement must match the number of output variables specified in the FETCH statement.

If no more rows are available, a No Data condition occurs with SQLSTATE value ' 02000 ' . To detect this condition, you can set up a handler for it (or for a NOT FOUND condition). For an example, see Section 15.6.6, "Cursors".

Be aware that another operation, such as a SELECT or another FETCH, may also cause the handler to execute by raising the same condition. If it is necessary to distinguish which operation raised the condition, place the operation within its own BEGIN ... END block so that it can be associated with its own handler.

\subsection*{15.6.6.4 Cursor OPEN Statement}

OPEN cursor_name
This statement opens a previously declared cursor. For an example, see Section 15.6.6, "Cursors".

\subsection*{15.6.6.5 Restrictions on Server-Side Cursors}

Server-side cursors are implemented in the C API using the mysql_stmt_attr_set ( ) function. The same implementation is used for cursors in stored routines. A server-side cursor enables a result set to be generated on the server side, but not transferred to the client except for those rows that the client requests. For example, if a client executes a query but is only interested in the first row, the remaining rows are not transferred.

In MySQL, a server-side cursor is materialized into an internal temporary table. Initially, this is a MEMORY table, but is converted to a MyISAM table when its size exceeds the minimum value of the
max_heap_table_size and tmp_table_size system variables. The same restrictions apply to internal temporary tables created to hold the result set for a cursor as for other uses of internal temporary tables. See Section 10.4.4, "Internal Temporary Table Use in MySQL". One limitation of the implementation is that for a large result set, retrieving its rows through a cursor might be slow.

Cursors are read only; you cannot use a cursor to update rows.
UPDATE WHERE CURRENT OF and DELETE WHERE CURRENT OF are not implemented, because updatable cursors are not supported.

Cursors are nonholdable (not held open after a commit).
Cursors are asensitive.
Cursors are nonscrollable.
Cursors are not named. The statement handler acts as the cursor ID.
You can have open only a single cursor per prepared statement. If you need several cursors, you must prepare several statements.

You cannot use a cursor for a statement that generates a result set if the statement is not supported in prepared mode. This includes statements such as CHECK TABLE, HANDLER READ, and SHOW BINLOG EVENTS.

\subsection*{15.6.7 Condition Handling}

Conditions may arise during stored program execution that require special handling, such as exiting the current program block or continuing execution. Handlers can be defined for general conditions such as warnings or exceptions, or for specific conditions such as a particular error code. Specific conditions can be assigned names and referred to that way in handlers.

To name a condition, use the DECLARE . . . CONDITION statement. To declare a handler, use the DECLARE ... HANDLER statement. See Section 15.6.7.1, "DECLARE ... CONDITION Statement", and Section 15.6.7.2, "DECLARE ... HANDLER Statement". For information about how the server chooses handlers when a condition occurs, see Section 15.6.7.6, "Scope Rules for Handlers".

To raise a condition, use the SIGNAL statement. To modify condition information within a condition handler, use RESIGNAL. See Section 15.6.7.1, "DECLARE ... CONDITION Statement", and Section 15.6.7.2, "DECLARE ... HANDLER Statement".

To retrieve information from the diagnostics area, use the GET DIAGNOSTICS statement (see Section 15.6.7.3, "GET DIAGNOSTICS Statement"). For information about the diagnostics area, see Section 15.6.7.7, "The MySQL Diagnostics Area".

\subsection*{15.6.7.1 DECLARE ... CONDITION Statement}
```
DECLARE condition_name CONDITION FOR condition_value
condition_value: {
    mysql_error_code
    | SQLSTATE [VALUE] sqlstate_value
}
```


The DECLARE . . . CONDITION statement declares a named error condition, associating a name with a condition that needs specific handling. The name can be referred to in a subsequent DECLARE ... HANDLER statement (see Section 15.6.7.2, "DECLARE ... HANDLER Statement").

Condition declarations must appear before cursor or handler declarations.
The condition_value for DECLARE ... CONDITION indicates the specific condition or class of conditions to associate with the condition name. It can take the following forms:
- mysql_error_code: An integer literal indicating a MySQL error code.

Do not use MySQL error code 0 because that indicates success rather than an error condition. For a list of MySQL error codes, see Server Error Message Reference.
- SQLSTATE [VALUE] sqlstate_value: A 5-character string literal indicating an SQLSTATE value.

Do not use SQLSTATE values that begin with ' 00 ' because those indicate success rather than an error condition. For a list of SQLSTATE values, see Server Error Message Reference.

Condition names referred to in SIGNAL or use RESIGNAL statements must be associated with SQLSTATE values, not MySQL error codes.

Using names for conditions can help make stored program code clearer. For example, this handler applies to attempts to drop a nonexistent table, but that is apparent only if you know that 1051 is the MySQL error code for "unknown table":
```
DECLARE CONTINUE HANDLER FOR 1051
    BEGIN
        -- body of handler
    END;
```


By declaring a name for the condition, the purpose of the handler is more readily seen:
```
DECLARE no_such_table CONDITION FOR 1051;
DECLARE CONTINUE HANDLER FOR no_such_table
    BEGIN
        -- body of handler
    END;
```


Here is a named condition for the same condition, but based on the corresponding SQLSTATE value rather than the MySQL error code:
```
DECLARE no_such_table CONDITION FOR SQLSTATE '42S02';
DECLARE CONTINUE HANDLER FOR no_such_table
    BEGIN
        -- body of handler
    END;
```


\subsection*{15.6.7.2 DECLARE ... HANDLER Statement}
```
DECLARE handler_action HANDLER
        FOR condition_value [, condition_value] ...
        statement
handler_action: {
        CONTINUE
    | EXIT
    | UNDO
}
condition_value: {
        mysql_error_code
    | SQLSTATE [VALUE] sqlstate_value
    | condition_name
    | SQLWARNING
    | NOT FOUND
    | SQLEXCEPTION
}
```


The DECLARE . . . HANDLER statement specifies a handler that deals with one or more conditions. If one of these conditions occurs, the specified statement executes. statement can be a simple statement such as SET var_name = value, or a compound statement written using BEGIN and END (see Section 15.6.1, "BEGIN ... END Compound Statement").

Handler declarations must appear after variable or condition declarations.
The handler_action value indicates what action the handler takes after execution of the handler statement:
- CONTINUE: Execution of the current program continues.
- EXIT: Execution terminates for the BEGIN . . . END compound statement in which the handler is declared. This is true even if the condition occurs in an inner block.
- UNDO: Not supported.

The condition_value for DECLARE ... HANDLER indicates the specific condition or class of conditions that activates the handler. It can take the following forms:
- mysql_error_code: An integer literal indicating a MySQL error code, such as 1051 to specify "unknown table":
```
DECLARE CONTINUE HANDLER FOR 1051
    BEGIN
        -- body of handler
    END;
```


Do not use MySQL error code 0 because that indicates success rather than an error condition. For a list of MySQL error codes, see Server Error Message Reference.
- SQLSTATE [VALUE] sqlstate_value: A 5-character string literal indicating an SQLSTATE value, such as '42S01' to specify "unknown table":
```
DECLARE CONTINUE HANDLER FOR SQLSTATE '42S02'
    BEGIN
        -- body of handler
    END;
```


Do not use SQLSTATE values that begin with ' 00 ' because those indicate success rather than an error condition. For a list of SQLSTATE values, see Server Error Message Reference.
- condition_name: A condition name previously specified with DECLARE ... CONDITION.

A condition name can be associated with a MySQL error code or SQLSTATE value. See Section 15.6.7.1, "DECLARE ... CONDITION Statement".
- SQLWARNING: Shorthand for the class of SQLSTATE values that begin with ' 01 ' .
```
DECLARE CONTINUE HANDLER FOR SQLWARNING
    BEGIN
        -- body of handler
    END;
```

- NOT FOUND: Shorthand for the class of SQLSTATE values that begin with ' 02 '. This is relevant within the context of cursors and is used to control what happens when a cursor reaches the end of a data set. If no more rows are available, a No Data condition occurs with SQLSTATE value ' 02000 '. To detect this condition, you can set up a handler for it or for a NOT FOUND condition.
```
DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        -- body of handler
    END;
```


For another example, see Section 15.6.6, "Cursors". The NOT FOUND condition also occurs for SELECT ... INTO var_list statements that retrieve no rows.
- SQLEXCEPTION: Shorthand for the class of SQLSTATE values that do not begin with ' 00 ' , ' 01 ' , or '02'.
```
DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        -- body of handler
    END;
```


For information about how the server chooses handlers when a condition occurs, see Section 15.6.7.6, "Scope Rules for Handlers".

If a condition occurs for which no handler has been declared, the action taken depends on the condition class:
- For SQLEXCEPTION conditions, the stored program terminates at the statement that raised the condition, as if there were an EXIT handler. If the program was called by another stored program, the calling program handles the condition using the handler selection rules applied to its own handlers.
- For SQLWARNING conditions, the program continues executing, as if there were a CONTINUE handler.
- For NOT FOUND conditions, if the condition was raised normally, the action is CONTINUE. If it was raised by SIGNAL or RESIGNAL, the action is EXIT.

The following example uses a handler for SQLSTATE ' 23000 ', which occurs for a duplicate-key error:
```
mysql> CREATE TABLE test.t (s1 INT, PRIMARY KEY (s1));
Query OK, 0 rows affected (0.00 sec)
mysql> delimiter //
mysql> CREATE PROCEDURE handlerdemo ()
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLSTATE '23000' SET @x2 = 1;
            SET @x = 1;
            INSERT INTO test.t VALUES (1);
            SET @x = 2;
            INSERT INTO test.t VALUES (1);
            SET @x = 3;
        END;
        //
Query OK, 0 rows affected (0.00 sec)
mysql> CALL handlerdemo()//
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @x//
    +------+
    | @x |
    +------+
    | 3 |
    +------+
    1 row in set (0.00 sec)
```


Notice that @x is 3 after the procedure executes, which shows that execution continued to the end of the procedure after the error occurred. If the DECLARE . . . HANDLER statement had not been present, MySQL would have taken the default action (EXIT) after the second INSERT failed due to the PRIMARY KEY constraint, and SELECT @x would have returned 2.

To ignore a condition, declare a CONTINUE handler for it and associate it with an empty block. For example:

DECLARE CONTINUE HANDLER FOR SQLWARNING BEGIN END;
The scope of a block label does not include the code for handlers declared within the block. Therefore, the statement associated with a handler cannot use ITERATE or LEAVE to refer to labels for blocks that enclose the handler declaration. Consider the following example, where the REPEAT block has a label of retry:
```
CREATE PROCEDURE p ()
BEGIN
    DECLARE i INT DEFAULT 3;
    retry:
        REPEAT
            BEGIN
                DECLARE CONTINUE HANDLER FOR SQLWARNING
                    BEGIN
                        ITERATE retry; # illegal
```

```
                END;
            IF i < 0 THEN
                LEAVE retry; # legal
            END IF;
            SET i = i - 1;
        END;
    UNTIL FALSE END REPEAT;
END;
```


The retry label is in scope for the IF statement within the block. It is not in scope for the CONTINUE handler, so the reference there is invalid and results in an error:

ERROR 1308 (42000): LEAVE with no matching label: retry
To avoid references to outer labels in handlers, use one of these strategies:
- To leave the block, use an EXIT handler. If no block cleanup is required, the BEGIN ... END handler body can be empty:

DECLARE EXIT HANDLER FOR SQLWARNING BEGIN END;
Otherwise, put the cleanup statements in the handler body:
```
DECLARE EXIT HANDLER FOR SQLWARNING
    BEGIN
        block cleanup statements
    END;
```

- To continue execution, set a status variable in a CONTINUE handler that can be checked in the enclosing block to determine whether the handler was invoked. The following example uses the variable done for this purpose:
```
CREATE PROCEDURE p ()
BEGIN
    DECLARE i INT DEFAULT 3;
    DECLARE done INT DEFAULT FALSE;
    retry:
        REPEAT
            BEGIN
                DECLARE CONTINUE HANDLER FOR SQLWARNING
                    BEGIN
                        SET done = TRUE;
                    END;
                IF done OR i < 0 THEN
                    LEAVE retry;
                END IF;
                SET i = i - 1;
            END;
        UNTIL FALSE END REPEAT;
END;
```


\subsection*{15.6.7.3 GET DIAGNOSTICS Statement}
```
GET [CURRENT | STACKED] DIAGNOSTICS {
        statement_information_item
        [, statement_information_item] ...
    | CONDITION condition_number
        condition_information_item
        [, condition_information_item] ...
}
statement_information_item:
        target = statement_information_item_name
condition_information_item:
        target = condition_information_item_name
statement_information_item_name: {
        NUMBER
    | ROW_COUNT
```

```
}
condition_information_item_name: {
    CLASS_ORIGIN
    | SUBCLASS_ORIGIN
    | RETURNED_SQLSTATE
    | MESSAGE_TEXT
    | MYSQL_ERRNO
    | CONSTRAINT_CATALOG
    | CONSTRAINT_SCHEMA
    | CONSTRAINT_NAME
    | CATALOG_NAME
    | SCHEMA_NAME
    | TABLE_NAME
    | COLUMN_NAME
    | CURSOR_NAME
}
condition_number, target:
        (see following discussion)
```


SQL statements produce diagnostic information that populates the diagnostics area. The GET DIAGNOSTICS statement enables applications to inspect this information. (You can also use SHOW WARNINGS or SHOW ERRORS to see conditions or errors.)

No special privileges are required to execute GET DIAGNOSTICS.
The keyword CURRENT means to retrieve information from the current diagnostics area. The keyword STACKED means to retrieve information from the second diagnostics area, which is available only if the current context is a condition handler. If neither keyword is given, the default is to use the current diagnostics area.

The GET DIAGNOSTICS statement is typically used in a handler within a stored program. It is a MySQL extension that GET [CURRENT] DIAGNOSTICS is permitted outside handler context to check the execution of any SQL statement. For example, if you invoke the mysql client program, you can enter these statements at the prompt:
```
mysql> DROP TABLE test.no_such_table;
ERROR 1051 (42S02): Unknown table 'test.no_such_table'
mysql> GET DIAGNOSTICS CONDITION 1
    @p1 = RETURNED_SQLSTATE, @p2 = MESSAGE_TEXT;
mysql> SELECT @p1, @p2;
+--------+-------------------------------------
| @p1 | @p2 |
+--------+-------------------------------------
| 42S02 | Unknown table 'test.no_such_table' |
+--------+-------------------------------------+
```


This extension applies only to the current diagnostics area. It does not apply to the second diagnostics area because GET STACKED DIAGNOSTICS is permitted only if the current context is a condition handler. If that is not the case, a GET STACKED DIAGNOSTICS when handler not active error occurs.

For a description of the diagnostics area, see Section 15.6.7.7, "The MySQL Diagnostics Area". Briefly, it contains two kinds of information:
- Statement information, such as the number of conditions that occurred or the affected-rows count.
- Condition information, such as the error code and message. If a statement raises multiple conditions, this part of the diagnostics area has a condition area for each one. If a statement raises no conditions, this part of the diagnostics area is empty.

For a statement that produces three conditions, the diagnostics area contains statement and condition information like this:
```
Statement information:
    row count
```

```
    ... other statement information items ...
Condition area list:
    Condition area 1:
        error code for condition 1
        error message for condition 1
        ... other condition information items ...
    Condition area 2:
        error code for condition 2:
        error message for condition 2
        ... other condition information items ...
    Condition area 3:
        error code for condition 3
        error message for condition 3
        ... other condition information items ...
```


GET DIAGNOSTICS can obtain either statement or condition information, but not both in the same statement:
- To obtain statement information, retrieve the desired statement items into target variables. This instance of GET DIAGNOSTICS assigns the number of available conditions and the rows-affected count to the user variables @p1 and @p2:
```
GET DIAGNOSTICS @p1 = NUMBER, @p2 = ROW_COUNT;
```

- To obtain condition information, specify the condition number and retrieve the desired condition items into target variables. This instance of GET DIAGNOSTICS assigns the SQLSTATE value and error message to the user variables @p3 and @p4:
```
GET DIAGNOSTICS CONDITION 1
    @p3 = RETURNED_SQLSTATE, @p4 = MESSAGE_TEXT;
```


The retrieval list specifies one or more target = item_name assignments, separated by commas. Each assignment names a target variable and either a statement_information_item_name or condition_information_item_name designator, depending on whether the statement retrieves statement or condition information.

Valid target designators for storing item information can be stored procedure or function parameters, stored program local variables declared with DECLARE, or user-defined variables.

Valid condition_number designators can be stored procedure or function parameters, stored program local variables declared with DECLARE, user-defined variables, system variables, or literals. A character literal may include a_charset introducer. A warning occurs if the condition number is not in the range from 1 to the number of condition areas that have information. In this case, the warning is added to the diagnostics area without clearing it.

When a condition occurs, MySQL does not populate all condition items recognized by GET DIAGNOSTICS. For example:
```
mysql> GET DIAGNOSTICS CONDITION 1
    @p5 = SCHEMA_NAME, @p6 = TABLE_NAME;
mysql> SELECT @p5, @p6;
+------+-------+
| @p5 | @p6 |
+------+-------+
| | |
+------+-------+
```


In standard SQL, if there are multiple conditions, the first condition relates to the SQLSTATE value returned for the previous SQL statement. In MySQL, this is not guaranteed. To get the main error, you cannot do this:
```
GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO;
```


Instead, retrieve the condition count first, then use it to specify which condition number to inspect:
```
GET DIAGNOSTICS @cno = NUMBER;
GET DIAGNOSTICS CONDITION @cno @errno = MYSQL_ERRNO;
```


For information about permissible statement and condition information items, and which ones are populated when a condition occurs, see Diagnostics Area Information Items.

Here is an example that uses GET DIAGNOSTICS and an exception handler in stored procedure context to assess the outcome of an insert operation. If the insert was successful, the procedure uses GET DIAGNOSTICS to get the rows-affected count. This shows that you can use GET DIAGNOSTICS multiple times to retrieve information about a statement as long as the current diagnostics area has not been cleared.
```
CREATE PROCEDURE do_insert(value INT)
BEGIN
    -- Declare variables to hold diagnostics area information
    DECLARE code CHAR(5) DEFAULT '00000';
    DECLARE msg TEXT;
    DECLARE nrows INT;
    DECLARE result TEXT;
    -- Declare exception handler for failed insert
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
        BEGIN
            GET DIAGNOSTICS CONDITION 1
                code = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
        END;
    -- Perform the insert
    INSERT INTO t1 (int_col) VALUES(value);
    -- Check whether the insert was successful
    IF code = '00000' THEN
        GET DIAGNOSTICS nrows = ROW_COUNT;
        SET result = CONCAT('insert succeeded, row count = ',nrows);
    ELSE
        SET result = CONCAT('insert failed, error = ',code,', message = ',msg);
    END IF;
    -- Say what happened
    SELECT result;
END;
```


Suppose that t1.int_col is an integer column that is declared as NOT NULL. The procedure produces these results when invoked to insert non-NULL and NULL values, respectively:
```
mysql> CALL do_insert(1);
+----------------------------------+
| result |
+----------------------------------+
| insert succeeded, row count = 1 |
+----------------------------------+
mysql> CALL do_insert(NULL);
+----------------------------------------------------------------------------
| result |
+-----------------------------------------------------------------------------
| insert failed, error = 23000, message = Column 'int_col' cannot be null |
+----------------------------------------------------------------------------
```


When a condition handler activates, a push to the diagnostics area stack occurs:
- The first (current) diagnostics area becomes the second (stacked) diagnostics area and a new current diagnostics area is created as a copy of it.
- GET [CURRENT] DIAGNOSTICS and GET STACKED DIAGNOSTICS can be used within the handler to access the contents of the current and stacked diagnostics areas.
- Initially, both diagnostics areas return the same result, so it is possible to get information from the current diagnostics area about the condition that activated the handler, as long as you execute no statements within the handler that change its current diagnostics area.
- However, statements executing within the handler can modify the current diagnostics area, clearing and setting its contents according to the normal rules (see How the Diagnostics Area is Cleared and Populated).

A more reliable way to obtain information about the handler-activating condition is to use the stacked diagnostics area, which cannot be modified by statements executing within the handler except RESIGNAL. For information about when the current diagnostics area is set and cleared, see Section 15.6.7.7, "The MySQL Diagnostics Area".

The next example shows how GET STACKED DIAGNOSTICS can be used within a handler to obtain information about the handled exception, even after the current diagnostics area has been modified by handler statements.

Within a stored procedure p() , we attempt to insert two values into a table that contains a TEXT NOT NULL column. The first value is a non-NULL string and the second is NULL. The column prohibits NULL values, so the first insert succeeds but the second causes an exception. The procedure includes an exception handler that maps attempts to insert NULL into inserts of the empty string:
```
DROP TABLE IF EXISTS t1;
CREATE TABLE t1 (c1 TEXT NOT NULL);
DROP PROCEDURE IF EXISTS p;
delimiter //
CREATE PROCEDURE p ()
BEGIN
    -- Declare variables to hold diagnostics area information
    DECLARE errcount INT;
    DECLARE errno INT;
    DECLARE msg TEXT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- Here the current DA is nonempty because no prior statements
        -- executing within the handler have cleared it
        GET CURRENT DIAGNOSTICS CONDITION 1
            errno = MYSQL_ERRNO, msg = MESSAGE_TEXT;
        SELECT 'current DA before mapped insert' AS op, errno, msg;
        GET STACKED DIAGNOSTICS CONDITION 1
            errno = MYSQL_ERRNO, msg = MESSAGE_TEXT;
        SELECT 'stacked DA before mapped insert' AS op, errno, msg;
        -- Map attempted NULL insert to empty string insert
        INSERT INTO t1 (c1) VALUES('');
        -- Here the current DA should be empty (if the INSERT succeeded),
        -- so check whether there are conditions before attempting to
        -- obtain condition information
        GET CURRENT DIAGNOSTICS errcount = NUMBER;
        IF errcount = 0
        THEN
            SELECT 'mapped insert succeeded, current DA is empty' AS op;
        ELSE
            GET CURRENT DIAGNOSTICS CONDITION 1
                errno = MYSQL_ERRNO, msg = MESSAGE_TEXT;
            SELECT 'current DA after mapped insert' AS op, errno, msg;
        END IF ;
        GET STACKED DIAGNOSTICS CONDITION 1
            errno = MYSQL_ERRNO, msg = MESSAGE_TEXT;
        SELECT 'stacked DA after mapped insert' AS op, errno, msg;
    END;
    INSERT INTO t1 (c1) VALUES('string 1');
    INSERT INTO t1 (c1) VALUES(NULL);
END;
//
delimiter ;
CALL p();
SELECT * FROM t1;
```


When the handler activates, a copy of the current diagnostics area is pushed to the diagnostics area stack. The handler first displays the contents of the current and stacked diagnostics areas, which are both the same initially:
```
+-----------------------------------+-------+-----------------------------
| op | errno | msg |
```

```
| current DA before mapped insert | 1048 | Column 'c1' cannot be null |
+-----------------------------------+-------+-----------------------------
+-----------------------------------+-------+------------------------------
| op | errno | msg |
| stacked DA before mapped insert | 1048 | Column 'c1' cannot be null |
+-----------------------------------+-------+-----------------------------
```


Statements executing after the GET DIAGNOSTICS statements may reset the current diagnostics area. statements may reset the current diagnostics area. For example, the handler maps the NULL insert to an empty-string insert and displays the result. The new insert succeeds and clears the current diagnostics area, but the stacked diagnostics area remains unchanged and still contains information about the condition that activated the handler:
```
+-----------------------------------------------
| op |
+--------------------------------------------------+
+--------------------------------------------+
+---------------------------------+--------+----------------------------+
```


When the condition handler ends, its current diagnostics area is popped from the stack and the stacked diagnostics area becomes the current diagnostics area in the stored procedure.

After the procedure returns, the table contains two rows. The empty row results from the attempt to insert NULL that was mapped to an empty-string insert:
```
+----------+
| c1 |
| string 1 |
| +----------+
```


\subsection*{15.6.7.4 RESIGNAL Statement}
```
RESIGNAL [condition_value]
        [SET signal_information_item
        [, signal_information_item] ...]
condition_value: {
        SQLSTATE [VALUE] sqlstate_value
    | condition_name
}
signal_information_item:
        condition_information_item_name = simple_value_specification
condition_information_item_name: {
        CLASS_ORIGIN
    | SUBCLASS_ORIGIN
    | MESSAGE_TEXT
    | MYSQL_ERRNO
    | CONSTRAINT_CATALOG
    | CONSTRAINT_SCHEMA
    | CONSTRAINT_NAME
    | CATALOG_NAME
    | SCHEMA_NAME
    | TABLE_NAME
    | COLUMN_NAME
    | CURSOR_NAME
}
```

```
condition_name, simple_value_specification:
    (see following discussion)
```


RESIGNAL passes on the error condition information that is available during execution of a condition handler within a compound statement inside a stored procedure or function, trigger, or event. RESIGNAL may change some or all information before passing it on. RESIGNAL is related to SIGNAL, but instead of originating a condition as SIGNAL does, RESIGNAL relays existing condition information, possibly after modifying it.

RESIGNAL makes it possible to both handle an error and return the error information. Otherwise, by executing an SQL statement within the handler, information that caused the handler's activation is destroyed. RESIGNAL also can make some procedures shorter if a given handler can handle part of a situation, then pass the condition "up the line" to another handler.

No privileges are required to execute the RESIGNAL statement.
All forms of RESIGNAL require that the current context be a condition handler. Otherwise, RESIGNAL is illegal and a RESIGNAL when handler not active error occurs.

To retrieve information from the diagnostics area, use the GET DIAGNOSTICS statement (see Section 15.6.7.3, "GET DIAGNOSTICS Statement"). For information about the diagnostics area, see Section 15.6.7.7, "The MySQL Diagnostics Area".
- RESIGNAL Overview
- RESIGNAL Alone
- RESIGNAL with New Signal Information
- RESIGNAL with a Condition Value and Optional New Signal Information
- RESIGNAL Requires Condition Handler Context

\section*{RESIGNAL Overview}

For condition_value and signal_information_item, the definitions and rules are the same for RESIGNAL as for SIGNAL. For example, the condition_value can be an SQLSTATE value, and the value can indicate errors, warnings, or "not found." For additional information, see Section 15.6.7.5, "SIGNAL Statement".

The RESIGNAL statement takes condition_value and SET clauses, both of which are optional. This leads to several possible uses:
- RESIGNAL alone:
```
RESIGNAL;
```

- RESIGNAL with new signal information:
```
RESIGNAL SET signal_information_item [, signal_information_item] ...;
```

- RESIGNAL with a condition value and possibly new signal information:
```
RESIGNAL condition_value
    [SET signal_information_item [, signal_information_item] ...];
```


These use cases all cause changes to the diagnostics and condition areas:
- A diagnostics area contains one or more condition areas.
- A condition area contains condition information items, such as the SQLSTATE value, MYSQL_ERRNO, or MESSAGE_TEXT.

There is a stack of diagnostics areas. When a handler takes control, it pushes a diagnostics area to the top of the stack, so there are two diagnostics areas during handler execution:
- The first (current) diagnostics area, which starts as a copy of the last diagnostics area, but is overwritten by the first statement in the handler that changes the current diagnostics area.
- The last (stacked) diagnostics area, which has the condition areas that were set up before the handler took control.

The maximum number of condition areas in a diagnostics area is determined by the value of the max_error_count system variable. See Diagnostics Area-Related System Variables.

\section*{RESIGNAL Alone}

A simple RESIGNAL alone means "pass on the error with no change." It restores the last diagnostics area and makes it the current diagnostics area. That is, it "pops" the diagnostics area stack.

Within a condition handler that catches a condition, one use for RESIGNAL alone is to perform some other actions, and then pass on without change the original condition information (the information that existed before entry into the handler).

Example:
```
DROP TABLE IF EXISTS xx;
delimiter //
CREATE PROCEDURE p ()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET @error_count = @error_count + 1;
        IF @a = 0 THEN RESIGNAL; END IF;
    END;
    DROP TABLE xx;
END//
delimiter ;
SET @error_count = 0;
SET @a = 0;
CALL p();
```


Suppose that the DROP TABLE $x \times$ statement fails. The diagnostics area stack looks like this:
```
DA 1. ERROR 1051 (42S02): Unknown table 'xx'
```


Then execution enters the EXIT handler. It starts by pushing a diagnostics area to the top of the stack, which now looks like this:
```
DA 1. ERROR 1051 (42S02): Unknown table 'xx'
DA 2. ERROR 1051 (42S02): Unknown table 'xx'
```


At this point, the contents of the first (current) and second (stacked) diagnostics areas are the same. The first diagnostics area may be modified by statements executing subsequently within the handler.

Usually a procedure statement clears the first diagnostics area. BEGIN is an exception, it does not clear, it does nothing. SET is not an exception, it clears, performs the operation, and produces a result of "success." The diagnostics area stack now looks like this:
```
DA 1. ERROR 0000 (00000): Successful operation
DA 2. ERROR 1051 (42S02): Unknown table 'xx'
```


At this point, if @a = 0, RESIGNAL pops the diagnostics area stack, which now looks like this:
```
DA 1. ERROR 1051 (42S02): Unknown table 'xx'
```


And that is what the caller sees.
If @a is not 0 , the handler simply ends, which means that there is no more use for the current diagnostics area (it has been "handled"), so it can be thrown away, causing the stacked diagnostics area to become the current diagnostics area again. The diagnostics area stack looks like this:
```
DA 1. ERROR 0000 (00000): Successful operation
```


The details make it look complex, but the end result is quite useful: Handlers can execute without destroying information about the condition that caused activation of the handler.

\section*{RESIGNAL with New Signal Information}

RESIGNAL with a SET clause provides new signal information, so the statement means "pass on the error with changes":

RESIGNAL SET signal_information_item [, signal_information_item] ...;
As with RESIGNAL alone, the idea is to pop the diagnostics area stack so that the original information goes out. Unlike RESIGNAL alone, anything specified in the SET clause changes.

Example:
```
DROP TABLE IF EXISTS xx;
delimiter //
CREATE PROCEDURE p ()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET @error_count = @error_count + 1;
        IF @a = 0 THEN RESIGNAL SET MYSQL_ERRNO = 5; END IF;
    END;
    DROP TABLE xx;
END//
delimiter ;
SET @error_count = 0;
SET @a = 0;
CALL p();
```


Remember from the previous discussion that RESIGNAL alone results in a diagnostics area stack like this:

DA 1. ERROR 1051 (42S02): Unknown table 'xx'
The RESIGNAL SET MYSQL_ERRNO $=5$ statement results in this stack instead, which is what the caller sees:
```
DA 1. ERROR 5 (42S02): Unknown table 'xx'
```


In other words, it changes the error number, and nothing else.
The RESIGNAL statement can change any or all of the signal information items, making the first condition area of the diagnostics area look quite different.

\section*{RESIGNAL with a Condition Value and Optional New Signal Information}

RESIGNAL with a condition value means "push a condition into the current diagnostics area." If the SET clause is present, it also changes the error information.
```
RESIGNAL condition_value
    [SET signal_information_item [, signal_information_item] ...];
```


This form of RESIGNAL restores the last diagnostics area and makes it the current diagnostics area. That is, it "pops" the diagnostics area stack, which is the same as what a simple RESIGNAL alone would do. However, it also changes the diagnostics area depending on the condition value or signal information.

Example:
```
DROP TABLE IF EXISTS xx;
delimiter //
CREATE PROCEDURE p ()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
```

```
        SET @error_count = @error_count + 1;
        IF @a = 0 THEN RESIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=5; END IF;
    END;
    DROP TABLE xx;
END//
delimiter ;
SET @error_count = 0;
SET @a = 0;
SET @@max_error_count = 2;
CALL p();
SHOW ERRORS;
```


This is similar to the previous example, and the effects are the same, except that if RESIGNAL happens, the current condition area looks different at the end. (The reason the condition adds to rather than replaces the existing condition is the use of a condition value.)

The RESIGNAL statement includes a condition value (SQLSTATE '45000'), so it adds a new condition area, resulting in a diagnostics area stack that looks like this:
```
DA 1. (condition 2) ERROR 1051 (42S02): Unknown table 'xx'
    (condition 1) ERROR 5 (45000) Unknown table 'xx'
```


The result of CALL $p()$ and SHOW ERRORS for this example is:
```
mysql> CALL p();
ERROR 5 (45000): Unknown table 'xx'
mysql> SHOW ERRORS;
+--------+------+------------------------------------
| Level | Code | Message |
+--------+------+----------------------------------+
| Error | 1051 | Unknown table 'xx'
| Error | 5 | Unknown table 'xx'
+--------+------+---------------------------------+
```


\section*{RESIGNAL Requires Condition Handler Context}

All forms of RESIGNAL require that the current context be a condition handler. Otherwise, RESIGNAL is illegal and a RESIGNAL when handler not active error occurs. For example:
```
mysql> CREATE PROCEDURE p () RESIGNAL;
Query OK, 0 rows affected (0.00 sec)
mysql> CALL p();
ERROR 1645 (0K000): RESIGNAL when handler not active
```


Here is a more difficult example:
```
delimiter //
CREATE FUNCTION f () RETURNS INT
BEGIN
    RESIGNAL;
    RETURN 5;
END//
CREATE PROCEDURE p ()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION SET @a=f();
    SIGNAL SQLSTATE '55555';
END//
delimiter ;
CALL p();
```


RESIGNAL occurs within the stored function $f()$. Although $f()$ itself is invoked within the context of the EXIT handler, execution within $f()$ has its own context, which is not handler context. Thus, RESIGNAL within $f()$ results in a "handler not active" error.

\subsection*{15.6.7.5 SIGNAL Statement}
```
SIGNAL condition_value
    [SET signal_information_item
```

```
        [, signal_information_item] ...]
condition_value: {
        SQLSTATE [VALUE] sqlstate_value
    | condition_name
}
signal_information_item:
        condition_information_item_name = simple_value_specification
condition_information_item_name: {
        CLASS_ORIGIN
    | SUBCLASS_ORIGIN
    | MESSAGE_TEXT
    | MYSQL_ERRNO
    | CONSTRAINT_CATALOG
    | CONSTRAINT_SCHEMA
    | CONSTRAINT_NAME
    | CATALOG_NAME
    | SCHEMA_NAME
    | TABLE_NAME
    | COLUMN_NAME
    | CURSOR_NAME
}
condition_name, simple_value_specification:
        (see following discussion)
```


SIGNAL is the way to "return" an error. SIGNAL provides error information to a handler, to an outer portion of the application, or to the client. Also, it provides control over the error's characteristics (error number, SQLSTATE value, message). Without SIGNAL, it is necessary to resort to workarounds such as deliberately referring to a nonexistent table to cause a routine to return an error.

No privileges are required to execute the SIGNAL statement.
To retrieve information from the diagnostics area, use the GET DIAGNOSTICS statement (see Section 15.6.7.3, "GET DIAGNOSTICS Statement"). For information about the diagnostics area, see Section 15.6.7.7, "The MySQL Diagnostics Area".
- SIGNAL Overview
- Signal Condition Information Items
- Effect of Signals on Handlers, Cursors, and Statements

\section*{SIGNAL Overview}

The condition_value in a SIGNAL statement indicates the error value to be returned. It can be an SQLSTATE value (a 5-character string literal) or a condition_name that refers to a named condition previously defined with DECLARE ... CONDITION (see Section 15.6.7.1, "DECLARE ... CONDITION Statement").

An SQLSTATE value can indicate errors, warnings, or "not found." The first two characters of the value indicate its error class, as discussed in Signal Condition Information Items. Some signal values cause statement termination; see Effect of Signals on Handlers, Cursors, and Statements.

The SQLSTATE value for a SIGNAL statement should not start with ' 00 ' because such values indicate success and are not valid for signaling an error. This is true whether the SQLSTATE value is specified directly in the SIGNAL statement or in a named condition referred to in the statement. If the value is invalid, a Bad SQLSTATE error occurs.

To signal a generic SQLSTATE value, use ' 45000 ' , which means "unhandled user-defined exception."
The SIGNAL statement optionally includes a SET clause that contains multiple signal items, in a list of condition_information_item_name = simple_value_specification assignments, separated by commas.

Each condition_information_item_name may be specified only once in the SET clause. Otherwise, a Duplicate condition information item error occurs.

Valid simple_value_specification designators can be specified using stored procedure or function parameters, stored program local variables declared with DECLARE, user-defined variables, system variables, or literals. A character literal may include a_charset introducer.

For information about permissible condition_information_item_name values, see Signal Condition Information Items.

The following procedure signals an error or warning depending on the value of pval, its input parameter:
```
CREATE PROCEDURE p (pval INT)
BEGIN
    DECLARE specialty CONDITION FOR SQLSTATE '45000';
    IF pval = 0 THEN
        SIGNAL SQLSTATE '01000';
    ELSEIF pval = 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'An error occurred';
    ELSEIF pval = 2 THEN
        SIGNAL specialty
            SET MESSAGE_TEXT = 'An error occurred';
    ELSE
        SIGNAL SQLSTATE '01000'
            SET MESSAGE_TEXT = 'A warning occurred', MYSQL_ERRNO = 1000;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'An error occurred', MYSQL_ERRNO = 1001;
    END IF;
END;
```


If pval is $0, p()$ signals a warning because SQLSTATE values that begin with ' 01 ' are signals in the warning class. The warning does not terminate the procedure, and can be seen with SHOW WARNINGS after the procedure returns.

If pval is $1, \mathrm{p}()$ signals an error and sets the MESSAGE_TEXT condition information item. The error terminates the procedure, and the text is returned with the error information.

If pval is 2 , the same error is signaled, although the SQLSTATE value is specified using a named condition in this case.

If pval is anything else, p() first signals a warning and sets the message text and error number condition information items. This warning does not terminate the procedure, so execution continues and p() then signals an error. The error does terminate the procedure. The message text and error number set by the warning are replaced by the values set by the error, which are returned with the error information.

SIGNAL is typically used within stored programs, but it is a MySQL extension that it is permitted outside handler context. For example, if you invoke the mysql client program, you can enter any of these statements at the prompt:
```
SIGNAL SQLSTATE '77777';
CREATE TRIGGER t_bi BEFORE INSERT ON t
    FOR EACH ROW SIGNAL SQLSTATE '77777';
CREATE EVENT e ON SCHEDULE EVERY 1 SECOND
    DO SIGNAL SQLSTATE '77777';
```


SIGNAL executes according to the following rules:
If the SIGNAL statement indicates a particular SQLSTATE value, that value is used to signal the condition specified. Example:

CREATE PROCEDURE p (divisor INT)
```
BEGIN
    IF divisor = 0 THEN
        SIGNAL SQLSTATE '22012';
    END IF;
END;
```


If the SIGNAL statement uses a named condition, the condition must be declared in some scope that applies to the SIGNAL statement, and must be defined using an SQLSTATE value, not a MySQL error number. Example:
```
CREATE PROCEDURE p (divisor INT)
BEGIN
    DECLARE divide_by_zero CONDITION FOR SQLSTATE '22012';
    IF divisor = 0 THEN
        SIGNAL divide_by_zero;
    END IF;
END;
```


If the named condition does not exist in the scope of the SIGNAL statement, an Undefined CONDITION error occurs.

If SIGNAL refers to a named condition that is defined with a MySQL error number rather than an SQLSTATE value, a SIGNAL/RESIGNAL can only use a CONDITION defined with SQLSTATE error occurs. The following statements cause that error because the named condition is associated with a MySQL error number:
```
DECLARE no_such_table CONDITION FOR 1051;
SIGNAL no_such_table;
```


If a condition with a given name is declared multiple times in different scopes, the declaration with the most local scope applies. Consider the following procedure:
```
CREATE PROCEDURE p (divisor INT)
BEGIN
    DECLARE my_error CONDITION FOR SQLSTATE '45000';
    IF divisor = 0 THEN
        BEGIN
            DECLARE my_error CONDITION FOR SQLSTATE '22012';
            SIGNAL my_error;
        END;
    END IF;
    SIGNAL my_error;
END;
```


If divisor is 0 , the first SIGNAL statement executes. The innermost my_error condition declaration applies, raising SQLSTATE '22012'.

If divisor is not 0 , the second SIGNAL statement executes. The outermost my_error condition declaration applies, raising SQLSTATE ' 45000 ' .

For information about how the server chooses handlers when a condition occurs, see Section 15.6.7.6, "Scope Rules for Handlers".

Signals can be raised within exception handlers:
```
CREATE PROCEDURE p ()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SIGNAL SQLSTATE VALUE '99999'
            SET MESSAGE_TEXT = 'An error occurred';
    END;
    DROP TABLE no_such_table;
END;
```


CALL p() reaches the DROP TABLE statement. There is no table named no_such_table, so the error handler is activated. The error handler destroys the original error ("no such table") and makes a new error with SQLSTATE '99999' and message An error occurred.

\section*{Signal Condition Information Items}

The following table lists the names of diagnostics area condition information items that can be set in a SIGNAL (or RESIGNAL) statement. All items are standard SQL except MYSQL_ERRNO, which is a MySQL extension. For more information about these items see Section 15.6.7.7, "The MySQL Diagnostics Area".

\begin{tabular}{|l|l|}
\hline Item Name & Definition \\
\hline CLASS_ORIGIN & VARCHAR(64) \\
\hline SUBCLASS_ORIGIN & VARCHAR(64) \\
\hline CONSTRAINT_CATALOG & VARCHAR(64) \\
\hline CONSTRAINT_SCHEMA & VARCHAR(64) \\
\hline CONSTRAINT_NAME & VARCHAR(64) \\
\hline CATALOG_NAME & VARCHAR(64) \\
\hline SCHEMA_NAME & VARCHAR(64) \\
\hline TABLE_NAME & VARCHAR(64) \\
\hline COLUMN_NAME & VARCHAR(64) \\
\hline CURSOR_NAME & VARCHAR(64) \\
\hline MESSAGE_TEXT & VARCHAR(128) \\
\hline MYSQL_ERRNO & SMALLINT UNSIGNED \\
\hline
\end{tabular}

The character set for character items is UTF-8.
It is illegal to assign NULL to a condition information item in a SIGNAL statement.
A SIGNAL statement always specifies an SQLSTATE value, either directly, or indirectly by referring to a named condition defined with an SQLSTATE value. The first two characters of an SQLSTATE value are its class, and the class determines the default value for the condition information items:
- Class = '00' (success)

Illegal. SQLSTATE values that begin with ' 00 ' indicate success and are not valid for SIGNAL.
- Class = '01' (warning)
```
MESSAGE_TEXT = 'Unhandled user-defined warning condition';
MYSQL_ERRNO = ER_SIGNAL_WARN
```

- Class = '02' (not found)
```
MESSAGE_TEXT = 'Unhandled user-defined not found condition';
MYSQL_ERRNO = ER_SIGNAL_NOT_FOUND
```

- Class > '02' (exception)
```
MESSAGE_TEXT = 'Unhandled user-defined exception condition';
MYSQL_ERRNO = ER_SIGNAL_EXCEPTION
```


For legal classes, the other condition information items are set as follows:
```
CLASS_ORIGIN = SUBCLASS_ORIGIN = '';
CONSTRAINT_CATALOG = CONSTRAINT_SCHEMA = CONSTRAINT_NAME = '';
CATALOG_NAME = SCHEMA_NAME = TABLE_NAME = COLUMN_NAME = '';
CURSOR_NAME = '';
```


The error values that are accessible after SIGNAL executes are the SQLSTATE value raised by the SIGNAL statement and the MESSAGE_TEXT and MYSQL_ERRNO items. These values are available from the C API:
- mysql_sqlstate() returns the SQLSTATE value.
- mysql_errno() returns the MYSQL_ERRNO value.
- mysql_error() returns the MESSAGE_TEXT value.

At the SQL level, the output from SHOW WARNINGS and SHOW ERRORS indicates the MYSQL_ERRNO and MESSAGE_TEXT values in the Code and Message columns.

To retrieve information from the diagnostics area, use the GET DIAGNOSTICS statement (see Section 15.6.7.3, "GET DIAGNOSTICS Statement"). For information about the diagnostics area, see Section 15.6.7.7, "The MySQL Diagnostics Area".

\section*{Effect of Signals on Handlers, Cursors, and Statements}

Signals have different effects on statement execution depending on the signal class. The class determines how severe an error is. MySQL ignores the value of the sql_mode system variable; in particular, strict SQL mode does not matter. MySQL also ignores IGNORE: The intent of SIGNAL is to raise a user-generated error explicitly, so a signal is never ignored.

In the following descriptions, "unhandled" means that no handler for the signaled SQLSTATE value has been defined with DECLARE ... HANDLER.
- Class = '00' (success)

Illegal. SQLSTATE values that begin with ' 00 ' indicate success and are not valid for SIGNAL.
- Class = '01' (warning)

The value of the warning_count system variable goes up. SHOW WARNINGS shows the signal. SQLWARNING handlers catch the signal.

Warnings cannot be returned from stored functions because the RETURN statement that causes the function to return clears the diagnostic area. The statement thus clears any warnings that may have been present there (and resets warning_count to 0 ).
- Class = '02' (not found)

NOT FOUND handlers catch the signal. There is no effect on cursors. If the signal is unhandled in a stored function, statements end.
- Class > '02' (exception)

SQLEXCEPTION handlers catch the signal. If the signal is unhandled in a stored function, statements end.
- Class $=$ ' $40^{\prime}$

Treated as an ordinary exception.

\subsection*{15.6.7.6 Scope Rules for Handlers}

A stored program may include handlers to be invoked when certain conditions occur within the program. The applicability of each handler depends on its location within the program definition and on the condition or conditions that it handles:
- A handler declared in a BEGIN ... END block is in scope only for the SQL statements following the handler declarations in the block. If the handler itself raises a condition, it cannot handle that condition, nor can any other handlers declared in the block. In the following example, handlers H1 and H2 are in scope for conditions raised by statements stmt1 and stmt2. But neither H1 nor H2 are in scope for conditions raised in the body of H 1 or H 2 .
```
BEGIN -- outer block
    DECLARE EXIT HANDLER FOR ...; -- handler H1
    DECLARE EXIT HANDLER FOR ...; -- handler H2
    stmt1;
    stmt2;
END;
```

- A handler is in scope only for the block in which it is declared, and cannot be activated for conditions occurring outside that block. In the following example, handler H 1 is in scope for stmt1 in the inner block, but not for stmt2 in the outer block:
```
BEGIN -- outer block
    BEGIN -- inner block
        DECLARE EXIT HANDLER FOR ...; -- handler H1
        stmt1;
    END;
    stmt2;
END;
```

- A handler can be specific or general. A specific handler is for a MySQL error code, SQLSTATE value, or condition name. A general handler is for a condition in the SQLWARNING, SQLEXCEPTION, or NOT FOUND class. Condition specificity is related to condition precedence, as described later.

Multiple handlers can be declared in different scopes and with different specificities. For example, there might be a specific MySQL error code handler in an outer block, and a general SQLWARNING handler in an inner block. Or there might be handlers for a specific MySQL error code and the general SQLWARNING class in the same block.

Whether a handler is activated depends not only on its own scope and condition value, but on what other handlers are present. When a condition occurs in a stored program, the server searches for applicable handlers in the current scope (current BEGIN . . . END block). If there are no applicable handlers, the search continues outward with the handlers in each successive containing scope (block). When the server finds one or more applicable handlers at a given scope, it chooses among them based on condition precedence:
- A MySQL error code handler takes precedence over an SQLSTATE value handler.
- An SQLSTATE value handler takes precedence over general SQLWARNING, SQLEXCEPTION, or NOT FOUND handlers.
- An SQLEXCEPTION handler takes precedence over an SQLWARNING handler.
- It is possible to have several applicable handlers with the same precedence. For example, a statement could generate multiple warnings with different error codes, for each of which an error-specific handler exists. In this case, the choice of which handler the server activates is nondeterministic, and may change depending on the circumstances under which the condition occurs.

One implication of the handler selection rules is that if multiple applicable handlers occur in different scopes, handlers with the most local scope take precedence over handlers in outer scopes, even over those for more specific conditions.

If there is no appropriate handler when a condition occurs, the action taken depends on the class of the condition:
- For SQLEXCEPTION conditions, the stored program terminates at the statement that raised the condition, as if there were an EXIT handler. If the program was called by another stored program, the calling program handles the condition using the handler selection rules applied to its own handlers.
- For SQLWARNING conditions, the program continues executing, as if there were a CONTINUE handler.
- For NOT FOUND conditions, if the condition was raised normally, the action is CONTINUE. If it was raised by SIGNAL or RESIGNAL, the action is EXIT.

The following examples demonstrate how MySQL applies the handler selection rules.
This procedure contains two handlers, one for the specific SQLSTATE value ( ' 42S02 ' ) that occurs for attempts to drop a nonexistent table, and one for the general SQLEXCEPTION class:
```
CREATE PROCEDURE p1()
```

```
BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '42S02'
        SELECT 'SQLSTATE handler was activated' AS msg;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
        SELECT 'SQLEXCEPTION handler was activated' AS msg;
    DROP TABLE test.t;
END;
```


Both handlers are declared in the same block and have the same scope. However, SQLSTATE handlers take precedence over SQLEXCEPTION handlers, so if the table $t$ is nonexistent, the DROP TABLE statement raises a condition that activates the SQLSTATE handler:
```
mysql> CALL p1();
+---------------------------------+
| msg |
+---------------------------------+
| SQLSTATE handler was activated |
+---------------------------------+
```


This procedure contains the same two handlers. But this time, the DROP TABLE statement and SQLEXCEPTION handler are in an inner block relative to the SQLSTATE handler:
```
CREATE PROCEDURE p2()
BEGIN -- outer block
        DECLARE CONTINUE HANDLER FOR SQLSTATE '42S02'
            SELECT 'SQLSTATE handler was activated' AS msg;
    BEGIN -- inner block
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
            SELECT 'SQLEXCEPTION handler was activated' AS msg;
        DROP TABLE test.t; -- occurs within inner block
    END;
END;
```


In this case, the handler that is more local to where the condition occurs takes precedence. The SQLEXCEPTION handler activates, even though it is more general than the SQLSTATE handler:
```
mysql> CALL p2();
+--------------------------------------+
| msg |
+--------------------------------------+
| SQLEXCEPTION handler was activated |
+--------------------------------------+
```


In this procedure, one of the handlers is declared in a block inner to the scope of the DROP TABLE statement:
```
CREATE PROCEDURE p3()
BEGIN -- outer block
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
        SELECT 'SQLEXCEPTION handler was activated' AS msg;
    BEGIN -- inner block
        DECLARE CONTINUE HANDLER FOR SQLSTATE '42S02'
            SELECT 'SQLSTATE handler was activated' AS msg;
    END;
    DROP TABLE test.t; -- occurs within outer block
END;
```


Only the SQLEXCEPTION handler applies because the other one is not in scope for the condition raised by the DROP TABLE:
```
mysql> CALL p3();
+--------------------------------------+
| msg |
+--------------------------------------+
| SQLEXCEPTION handler was activated |
+--------------------------------------+
```


In this procedure, both handlers are declared in a block inner to the scope of the DROP TABLE statement:
```
CREATE PROCEDURE p4()
BEGIN -- outer block
    BEGIN -- inner block
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
            SELECT 'SQLEXCEPTION handler was activated' AS msg;
        DECLARE CONTINUE HANDLER FOR SQLSTATE '42S02'
            SELECT 'SQLSTATE handler was activated' AS msg;
    END;
    DROP TABLE test.t; -- occurs within outer block
END;
```


Neither handler applies because they are not in scope for the DROP TABLE. The condition raised by the statement goes unhandled and terminates the procedure with an error:
```
mysql> CALL p4();
ERROR 1051 (42S02): Unknown table 'test.t'
```


\subsection*{15.6.7.7 The MySQL Diagnostics Area}

SQL statements produce diagnostic information that populates the diagnostics area. Standard SQL has a diagnostics area stack, containing a diagnostics area for each nested execution context. Standard SQL also supports GET STACKED DIAGNOSTICS syntax for referring to the second diagnostics area during condition handler execution.

The following discussion describes the structure of the diagnostics area in MySQL, the information items recognized by MySQL, how statements clear and set the diagnostics area, and how diagnostics areas are pushed to and popped from the stack.
- Diagnostics Area Structure
- Diagnostics Area Information Items
- How the Diagnostics Area is Cleared and Populated
- How the Diagnostics Area Stack Works
- Diagnostics Area-Related System Variables

\section*{Diagnostics Area Structure}

The diagnostics area contains two kinds of information:
- Statement information, such as the number of conditions that occurred or the affected-rows count.
- Condition information, such as the error code and message. If a statement raises multiple conditions, this part of the diagnostics area has a condition area for each one. If a statement raises no conditions, this part of the diagnostics area is empty.

For a statement that produces three conditions, the diagnostics area contains statement and condition information like this:
```
Statement information:
    row count
    ... other statement information items ...
Condition area list:
    Condition area 1:
        error code for condition 1
        error message for condition 1
        ... other condition information items ...
    Condition area 2:
        error code for condition 2:
        error message for condition 2
```

```
    ... other condition information items ...
Condition area 3:
    error code for condition 3
    error message for condition 3
    ... other condition information items ...
```


\section*{Diagnostics Area Information Items}

The diagnostics area contains statement and condition information items. Numeric items are integers. The character set for character items is UTF-8. No item can be NULL. If a statement or condition item is not set by a statement that populates the diagnostics area, its value is 0 or the empty string, depending on the item data type.

The statement information part of the diagnostics area contains these items:
- NUMBER: An integer indicating the number of condition areas that have information.
- ROW_COUNT: An integer indicating the number of rows affected by the statement. ROW_COUNT has the same value as the ROW_COUNT ( ) function (see Section 14.15, "Information Functions").

The condition information part of the diagnostics area contains a condition area for each condition. Condition areas are numbered from 1 to the value of the NUMBER statement condition item. If NUMBER is 0 , there are no condition areas.

Each condition area contains the items in the following list. All items are standard SQL except MYSQL_ERRNO, which is a MySQL extension. The definitions apply for conditions generated other than by a signal (that is, by a SIGNAL or RESIGNAL statement). For nonsignal conditions, MySQL populates only those condition items not described as always empty. The effects of signals on the condition area are described later.
- CLASS_ORIGIN: A string containing the class of the RETURNED_SQLSTATE value. If the RETURNED_SQLSTATE value begins with a class value defined in SQL standards document ISO 9075-2 (section 24.1, SQLSTATE), CLASS_ORIGIN is 'ISO 9075'. Otherwise, CLASS_ORIGIN is 'MySQL'.
- SUBCLASS_ORIGIN: A string containing the subclass of the RETURNED_SQLSTATE value. If CLASS_ORIGIN is 'ISO $9075^{\prime}$ or RETURNED_SQLSTATE ends with '000', SUBCLASS_ORIGIN is 'ISO 9075'. Otherwise, SUBCLASS_ORIGIN is 'MySQL'.
- RETURNED_SQLSTATE: A string that indicates the SQLSTATE value for the condition.
- MESSAGE_TEXT: A string that indicates the error message for the condition.
- MYSQL_ERRNO: An integer that indicates the MySQL error code for the condition.
- CONSTRAINT_CATALOG, CONSTRAINT_SCHEMA, CONSTRAINT_NAME: Strings that indicate the catalog, schema, and name for a violated constraint. They are always empty.
- CATALOG_NAME, SCHEMA_NAME, TABLE_NAME, COLUMN_NAME: Strings that indicate the catalog, schema, table, and column related to the condition. They are always empty.
- CURSOR_NAME: A string that indicates the cursor name. This is always empty.

For the RETURNED_SQLSTATE, MESSAGE_TEXT, and MYSQL_ERRNO values for particular errors, see Server Error Message Reference.

If a SIGNAL (or RESIGNAL) statement populates the diagnostics area, its SET clause can assign to any condition information item except RETURNED_SQLSTATE any value that is legal for the item data type. SIGNAL also sets the RETURNED_SQLSTATE value, but not directly in its SET clause. That value comes from the SIGNAL statement SQLSTATE argument.

SIGNAL also sets statement information items. It sets NUMBER to $\mathbf{1}$. It sets ROW_COUNT to $\boldsymbol{-} \mathbf{1}$ for errors and 0 otherwise.

\section*{How the Diagnostics Area is Cleared and Populated}

Nondiagnostic SQL statements populate the diagnostics area automatically, and its contents can be set explicitly with the SIGNAL and RESIGNAL statements. The diagnostics area can be examined with GET DIAGNOSTICS to extract specific items, or with SHOW WARNINGS or SHOW ERRORS to see conditions or errors.

SQL statements clear and set the diagnostics area as follows:
- When the server starts executing a statement after parsing it, it clears the diagnostics area for nondiagnostic statements. Diagnostic statements do not clear the diagnostics area. These statements are diagnostic:
- GET DIAGNOSTICS
- SHOW ERRORS
- SHOW WARNINGS
- If a statement raises a condition, the diagnostics area is cleared of conditions that belong to earlier statements. The exception is that conditions raised by GET DIAGNOSTICS and RESIGNAL are added to the diagnostics area without clearing it.

Thus, even a statement that does not normally clear the diagnostics area when it begins executing clears it if the statement raises a condition.

The following example shows the effect of various statements on the diagnostics area, using SHOW WARNINGS to display information about conditions stored there.

This DROP TABLE statement clears the diagnostics area and populates it when the condition occurs:
```
mysql> DROP TABLE IF EXISTS test.no_such_table;
Query OK, 0 rows affected, 1 warning (0.01 sec)
mysql> SHOW WARNINGS;
+--------+------+--------------------------------------
| Level | Code | Message |
+--------+------+-------------------------------------
| Note | 1051 | Unknown table 'test.no_such_table' |
+--------+------+---------------------------------------
1 row in set (0.00 sec)
```


This SET statement generates an error, so it clears and populates the diagnostics area:
```
mysql> SET @x = @@x;
ERROR 1193 (HY000): Unknown system variable 'x'
mysql> SHOW WARNINGS;
+--------+------+-----------------------------
| Level | Code | Message |
+--------+------+----------------------------+
| Error | 1193 | Unknown system variable 'x' |
+--------+------+-----------------------------+
1 row in set (0.00 sec)
```


The previous SET statement produced a single condition, so 1 is the only valid condition number for GET DIAGNOSTICS at this point. The following statement uses a condition number of 2 , which produces a warning that is added to the diagnostics area without clearing it:
```
mysql> GET DIAGNOSTICS CONDITION 2 @p = MESSAGE_TEXT;
Query OK, 0 rows affected, 1 warning (0.00 sec)
mysql> SHOW WARNINGS;
+-------+------+-------------------------------
| Level | Code | Message |
+--------+------+-------------------------------
| Error | 1193 | Unknown system variable 'xx' |
```

```
| Error | 1753 | Invalid condition number |
+-------+------+-----------------------------+
2 rows in set (0.00 sec)
```


Now there are two conditions in the diagnostics area, so the same GET DIAGNOSTICS statement succeeds:
```
mysql> GET DIAGNOSTICS CONDITION 2 @p = MESSAGE_TEXT;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @p;
+---------------------------+
| @p |
+---------------------------+
| Invalid condition number |
+---------------------------+
1 row in set (0.01 sec)
```


\section*{How the Diagnostics Area Stack Works}

When a push to the diagnostics area stack occurs, the first (current) diagnostics area becomes the second (stacked) diagnostics area and a new current diagnostics area is created as a copy of it. Diagnostics areas are pushed to and popped from the stack under the following circumstances:
- Execution of a stored program

A push occurs before the program executes and a pop occurs afterward. If the stored program ends while handlers are executing, there can be more than one diagnostics area to pop; this occurs due to an exception for which there are no appropriate handlers or due to RETURN in the handler.

Any warning or error conditions in the popped diagnostics areas then are added to the current diagnostics area, except that, for triggers, only errors are added. When the stored program ends, the caller sees these conditions in its current diagnostics area.
- Execution of a condition handler within a stored program

When a push occurs as a result of condition handler activation, the stacked diagnostics area is the area that was current within the stored program prior to the push. The new now-current diagnostics area is the handler's current diagnostics area. GET [CURRENT] DIAGNOSTICS and GET STACKED DIAGNOSTICS can be used within the handler to access the contents of the current (handler) and stacked (stored program) diagnostics areas. Initially, they return the same result, but statements executing within the handler modify the current diagnostics area, clearing and setting its contents according to the normal rules (see How the Diagnostics Area is Cleared and Populated). The stacked diagnostics area cannot be modified by statements executing within the handler except RESIGNAL.

If the handler executes successfully, the current (handler) diagnostics area is popped and the stacked (stored program) diagnostics area again becomes the current diagnostics area. Conditions added to the handler diagnostics area during handler execution are added to the current diagnostics area.
- Execution of RESIGNAL

The RESIGNAL statement passes on the error condition information that is available during execution of a condition handler within a compound statement inside a stored program. RESIGNAL may change some or all information before passing it on, modifying the diagnostics stack as described in Section 15.6.7.4, "RESIGNAL Statement".

\section*{Diagnostics Area-Related System Variables}

Certain system variables control or are related to some aspects of the diagnostics area:
- max_error_count controls the number of condition areas in the diagnostics area. If more conditions than this occur, MySQL silently discards information for the excess conditions. (Conditions
added by RESIGNAL are always added, with older conditions being discarded as necessary to make room.)
- warning_count indicates the number of conditions that occurred. This includes errors, warnings, and notes. Normally, NUMBER and warning_count are the same. However, as the number of conditions generated exceeds max_error_count, the value of warning_count continues to rise whereas NUMBER remains capped at max_error_count because no additional conditions are stored in the diagnostics area.
- error_count indicates the number of errors that occurred. This value includes "not found" and exception conditions, but excludes warnings and notes. Like warning_count, its value can exceed max_error_count.
- If the sql_notes system variable is set to 0 , notes are not stored and do not increment warning_count.

Example: If max_error_count is 10 , the diagnostics area can contain a maximum of 10 condition areas. Suppose that a statement raises 20 conditions, 12 of which are errors. In that case, the diagnostics area contains the first 10 conditions, NUMBER is 10 , warning_count is 20 , and error_count is 12.

Changes to the value of max_error_count have no effect until the next attempt to modify the diagnostics area. If the diagnostics area contains 10 condition areas and max_error_count is set to 5 , that has no immediate effect on the size or content of the diagnostics area.

\subsection*{15.6.7.8 Condition Handling and OUT or INOUT Parameters}

If a stored procedure exits with an unhandled exception, modified values of OUT and INOUT parameters are not propagated back to the caller.

If an exception is handled by a CONTINUE or EXIT handler that contains a RESIGNAL statement, execution of RESIGNAL pops the Diagnostics Area stack, thus signalling the exception (that is, the information that existed before entry into the handler). If the exception is an error, the values of OUT and INOUT parameters are not propagated back to the caller.

\subsection*{15.6.8 Restrictions on Condition Handling}

SIGNAL, RESIGNAL, and GET DIAGNOSTICS are not permissible as prepared statements. For example, this statement is invalid:

PREPARE stmt1 FROM 'SIGNAL SQLSTATE "02000"';
SQLSTATE values in class ' 04 ' are not treated specially. They are handled the same as other exceptions.

In standard SQL, the first condition relates to the SQLSTATE value returned for the previous SQL statement. In MySQL, this is not guaranteed, so to get the main error, you cannot do this:

GET DIAGNOSTICS CONDITION 1 @errno = MYSQL_ERRNO;
Instead, do this:
GET DIAGNOSTICS @cno = NUMBER;
GET DIAGNOSTICS CONDITION @cno @errno = MYSQL_ERRNO;

\subsection*{15.7 Database Administration Statements}

\subsection*{15.7.1 Account Management Statements}

MySQL account information is stored in the tables of the mysql system schema. This database and the access control system are discussed extensively in Chapter 7, MySQL Server Administration, which you should consult for additional details.

\section*{Important}

Some MySQL releases introduce changes to the grant tables to add new privileges or features. To make sure that you can take advantage of any new capabilities, update your grant tables to the current structure whenever you upgrade MySQL. See Chapter 3, Upgrading MySQL.

When the read_only system variable is enabled, account-management statements require the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege), in addition to any other required privileges. This is because they modify tables in the mysql system schema.

Account management statements are atomic and crash safe. For more information, see Section 15.1.1, "Atomic Data Definition Statement Support".

\subsection*{15.7.1.1 ALTER USER Statement}
```
ALTER USER [IF EXISTS]
        user [auth_option] [, user [auth_option]] ...
        [REQUIRE {NONE | tls_option [[AND] tls_option] ...}]
        [WITH resource_option [resource_option] ...]
        [password_option | lock_option] ...
        [COMMENT 'comment_string' | ATTRIBUTE 'json_object']
ALTER USER [IF EXISTS]
        USER() user_func_auth_option
ALTER USER [IF EXISTS]
        user [registration_option]
ALTER USER [IF EXISTS]
        USER() [registration_option]
ALTER USER [IF EXISTS]
        user DEFAULT ROLE
        {NONE | ALL | role [, role ] ...}
user:
        (see Section 8.2.4, "Specifying Account Names")
auth_option: {
        IDENTIFIED BY 'auth_string'
            [REPLACE 'current_auth_string']
            [RETAIN CURRENT PASSWORD]
    | IDENTIFIED BY RANDOM PASSWORD
            [REPLACE 'current_auth_string']
            [RETAIN CURRENT PASSWORD]
    | IDENTIFIED WITH auth_plugin
    | IDENTIFIED WITH auth_plugin BY 'auth_string'
            [REPLACE 'current_auth_string']
            [RETAIN CURRENT PASSWORD]
    | IDENTIFIED WITH auth_plugin BY RANDOM PASSWORD
            [REPLACE 'current_auth_string']
            [RETAIN CURRENT PASSWORD]
    | IDENTIFIED WITH auth_plugin AS 'auth_string'
    | DISCARD OLD PASSWORD
    | ADD factor factor_auth_option [ADD factor factor_auth_option]
    | MODIFY factor factor_auth_option [MODIFY factor factor_auth_option]
    | DROP factor [DROP factor]
}
user_func_auth_option: {
        IDENTIFIED BY 'auth_string'
            [REPLACE 'current_auth_string']
            [RETAIN CURRENT PASSWORD]
    | DISCARD OLD PASSWORD
}
factor_auth_option: {
        IDENTIFIED BY 'auth_string'
```

```
    | IDENTIFIED BY RANDOM PASSWORD
    | IDENTIFIED WITH auth_plugin BY 'auth_string'
    | IDENTIFIED WITH auth_plugin BY RANDOM PASSWORD
    | IDENTIFIED WITH auth_plugin AS 'auth_string'
}
registration_option: {
        factor INITIATE REGISTRATION
    | factor FINISH REGISTRATION SET CHALLENGE_RESPONSE AS 'auth_string'
    | factor UNREGISTER
}
factor: {2 | 3} FACTOR
tls_option: {
        SSL
    | X509
    | CIPHER 'cipher'
    | ISSUER 'issuer'
    | SUBJECT 'subject'
}
resource_option: {
        MAX_QUERIES_PER_HOUR count
    | MAX_UPDATES_PER_HOUR count
    | MAX_CONNECTIONS_PER_HOUR count
    | MAX_USER_CONNECTIONS count
}
password_option: {
        PASSWORD EXPIRE [DEFAULT | NEVER | INTERVAL N DAY]
    | PASSWORD HISTORY {DEFAULT | N}
    | PASSWORD REUSE INTERVAL {DEFAULT | N DAY}
    | PASSWORD REQUIRE CURRENT [DEFAULT | OPTIONAL]
    | FAILED_LOGIN_ATTEMPTS N
    | PASSWORD_LOCK_TIME {N | UNBOUNDED}
}
lock_option: {
        ACCOUNT LOCK
    | ACCOUNT UNLOCK
}
```


The ALTER USER statement modifies MySQL accounts. It enables authentication, role, SSL/TLS, resource-limit, password-management, comment, and attribute properties to be modified for existing accounts. It can also be used to lock and unlock accounts.

In most cases, ALTER USER requires the global CREATE USER privilege, or the UPDATE privilege for the mysql system schema. The exceptions are:
- Any client who connects to the server using a nonanonymous account can change the password for that account. (In particular, you can change your own password.) To see which account the server authenticated you as, invoke the CURRENT_USER( ) function:
```
SELECT CURRENT_USER();
```

- For DEFAULT ROLE syntax, ALTER USER requires these privileges:
- Setting the default roles for another user requires the global CREATE USER privilege, or the UPDATE privilege for the mysql. default_roles system table.
- Setting the default roles for yourself requires no special privileges, as long as the roles you want as the default have been granted to you.
- Statements that modify secondary passwords require these privileges:
- The APPLICATION_PASSWORD_ADMIN privilege is required to use the RETAIN CURRENT PASSWORD or DISCARD OLD PASSWORD clause for ALTER USER statements that apply to your
own account. The privilege is required to manipulate your own secondary password because most users require only one password.
- If an account is to be permitted to manipulate secondary passwords for all accounts, it requires the CREATE USER privilege rather than APPLICATION_PASSWORD_ADMIN.

When the read_only system variable is enabled, ALTER USER additionally requires the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege).

These additional privilege considerations also apply:
- The authentication_policy system variable places certain constraints on how the authentication-related clauses of ALTER USER statements may be used; for details, see the description of that variable. These constraints do not apply if you have the AUTHENTICATION_POLICY_ADMIN privilege.
- To modify an account that uses passwordless authentication, you must have the PASSWORDLESS_USER_ADMIN privilege.

By default, an error occurs if you try to modify a user that does not exist. If the IF EXISTS clause is given, the statement produces a warning for each named user that does not exist, rather than an error.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2815.jpg?height=113&width=111&top_left_y=1142&top_left_x=360)

\section*{Important}

Under some circumstances, ALTER USER may be recorded in server logs or on the client side in a history file such as $\sim /$. mysql_history, which means that cleartext passwords may be read by anyone having read access to that information. For information about the conditions under which this occurs for the server logs and how to control it, see Section 8.1.2.3, "Passwords and Logging". For similar information about client-side logging, see Section 6.5.1.3, "mysql Client Logging".

There are several aspects to the ALTER USER statement, described under the following topics:
- ALTER USER Overview
- ALTER USER Authentication Options
- ALTER USER Multifactor Authentication Options
- ALTER USER Registration Options
- ALTER USER Role Options
- ALTER USER SSL/TLS Options
- ALTER USER Resource-Limit Options
- ALTER USER Password-Management Options
- ALTER USER Comment and Attribute Options
- ALTER USER Account-Locking Options
- ALTER USER Binary Logging

\section*{ALTER USER Overview}

For each affected account, ALTER USER modifies the corresponding row in the mysql. user system table to reflect the properties specified in the statement. Unspecified properties retain their current values.

Each account name uses the format described in Section 8.2.4, "Specifying Account Names". The host name part of the account name, if omitted, defaults to ' $\%$ ' . It is also possible to specify CURRENT_USER or CURRENT_USER ( ) to refer to the account associated with the current session.

In one case only, the account may be specified with the USER( ) function:
ALTER USER USER() IDENTIFIED BY 'auth_string';
This syntax enables changing your own password without naming your account literally. (The syntax also supports the REPLACE, RETAIN CURRENT PASSWORD, and DISCARD OLD PASSWORD clauses described at ALTER USER Authentication Options.)

For ALTER USER syntax that permits an auth_option value to follow a user value, auth_option indicates how the account authenticates by specifying an account authentication plugin, credentials (for example, a password), or both. Each auth_option value applies only to the account named immediately preceding it.

Following the user specifications, the statement may include options for SSL/TLS, resource-limit, password-management, and locking properties. All such options are global to the statement and apply to all accounts named in the statement.

Example: Change an account's password and expire it. As a result, the user must connect with the named password and choose a new one at the next connection:
```
ALTER USER 'jeffrey'@'localhost'
    IDENTIFIED BY 'new_password' PASSWORD EXPIRE;
```


Example: Modify an account to use the caching_sha2_password authentication plugin and the given password. Require that a new password be chosen every 180 days, and enable failed-login tracking, such that three consecutive incorrect passwords cause temporary account locking for two days:
```
ALTER USER 'jeffrey'@'localhost'
    IDENTIFIED WITH caching_sha2_password BY 'new_password'
    PASSWORD EXPIRE INTERVAL 180 DAY
    FAILED_LOGIN_ATTEMPTS 3 PASSWORD_LOCK_TIME 2;
```


Example: Lock or unlock an account:
```
ALTER USER 'jeffrey'@'localhost' ACCOUNT LOCK;
ALTER USER 'jeffrey'@'localhost' ACCOUNT UNLOCK;
```


Example: Require an account to connect using SSL and establish a limit of 20 connections per hour:
```
ALTER USER 'jeffrey'@'localhost'
    REQUIRE SSL WITH MAX_CONNECTIONS_PER_HOUR 20;
```


Example: Alter multiple accounts, specifying some per-account properties and some global properties:
```
ALTER USER
    'jeffrey'@'localhost'
        IDENTIFIED BY 'jeffrey_new_password',
    'jeanne'@'localhost',
    'josh'@'localhost'
        IDENTIFIED BY 'josh_new_password'
        REPLACE 'josh_current_password'
        RETAIN CURRENT PASSWORD
    REQUIRE SSL WITH MAX_USER_CONNECTIONS 2
    PASSWORD HISTORY 5;
```


The IDENTIFIED BY value following jeffrey applies only to its immediately preceding account, so it changes the password to 'jeffrey_new_password' only for jeffrey. For jeanne, there is no per-account value (thus leaving the password unchanged). For josh, IDENTIFIED BY establishes
a new password ('josh_new_password'), REPLACE is specified to verify that the user issuing the ALTER USER statement knows the current password ('josh_current_password'), and that current password is also retained as the account secondary password. (As a result, josh can connect with either the primary or secondary password.)

The remaining properties apply globally to all accounts named in the statement, so for both accounts:
- Connections are required to use SSL.
- The account can be used for a maximum of two simultaneous connections.
- Password changes cannot reuse any of the five most recent passwords.

Example: Discard the secondary password for josh, leaving the account with only its primary password:

ALTER USER 'josh'@'localhost' DISCARD OLD PASSWORD;
In the absence of a particular type of option, the account remains unchanged in that respect. For example, with no locking option, the locking state of the account is not changed.

\section*{ALTER USER Authentication Options}

An account name may be followed by an auth_option authentication option that specifies the account authentication plugin, credentials, or both. It may also include a password-verification clause that specifies the account current password to be replaced, and clauses that manage whether an account has a secondary password.

> Note
> Clauses for random password generation, password verification, and secondary passwords apply only to accounts that use an authentication plugin that stores credentials internally to MySQL. For accounts that use a plugin that performs authentication against a credentials system that is external to MySQL, password management must be handled externally against that system as well. For more information about internal credentials storage, see Section 8.2.15, "Password Management".
- auth_plugin names an authentication plugin. The plugin name can be a quoted string literal or an unquoted name. Plugin names are stored in the plugin column of the mysql. user system table.

For auth_option syntax that does not specify an authentication plugin, the server assigns the default plugin, determined as described in The Default Authentication Plugin. For descriptions of each plugin, see Section 8.4.1, "Authentication Plugins".
- Credentials that are stored internally are stored in the mysql.user system table. An 'auth_string' value or RANDOM PASSWORD specifies account credentials, either as a cleartext (unencrypted) string or hashed in the format expected by the authentication plugin associated with the account, respectively:
- For syntax that uses BY 'auth_string', the string is cleartext and is passed to the authentication plugin for possible hashing. The result returned by the plugin is stored in the mysql.user table. A plugin may use the value as specified, in which case no hashing occurs.
- For syntax that uses BY RANDOM PASSWORD, MySQL generates a random password and as cleartext and passes it to the authentication plugin for possible hashing. The result returned by the plugin is stored in the mysql. user table. A plugin may use the value as specified, in which case no hashing occurs.

Randomly generated passwords have the characteristics described in Random Password Generation.
- For syntax that uses AS 'auth_string', the string is assumed to be already in the format the authentication plugin requires, and is stored as is in the mysql. user table. If a plugin requires a hashed value, the value must be already hashed in a format appropriate for the plugin; otherwise, the value cannot be used by the plugin and correct authentication of client connections does not occur.

A hashed string can be either a string literal or a hexadecimal value. The latter corresponds to the type of value displayed by SHOW CREATE USER for password hashes containing unprintable characters when the print_identified_with_as_hex system variable is enabled.
- If an authentication plugin performs no hashing of the authentication string, the BY 'auth_string' and AS 'auth_string' clauses have the same effect: The authentication string is stored as is in the mysql. user system table.
- The REPLACE 'current_auth_string' clause performs password verification. If given:
- REPLACE specifies the account current password to be replaced, as a cleartext (unencrypted) string.
- The clause must be given if password changes for the account are required to specify the current password, as verification that the user attempting to make the change actually knows the current password.
- The clause is optional if password changes for the account may but need not specify the current password.
- The statement fails if the clause is given but does not match the current password, even if the clause is optional.
- REPLACE can be specified only when changing the account password for the current user.

For more information about password verification by specifying the current password, see Section 8.2.15, "Password Management".
- The RETAIN CURRENT PASSWORD and DISCARD OLD PASSWORD clauses implement dualpassword capability. Both are optional, but if given, have the following effects:
- RETAIN CURRENT PASSWORD retains an account current password as its secondary password, replacing any existing secondary password. The new password becomes the primary password, but clients can use the account to connect to the server using either the primary or secondary password. (Exception: If the new password specified by the ALTER USER statement is empty, the secondary password becomes empty as well, even if RETAIN CURRENT PASSWORD is given.)
- If you specify RETAIN CURRENT PASSWORD for an account that has an empty primary password, the statement fails.
- If an account has a secondary password and you change its primary password without specifying RETAIN CURRENT PASSWORD, the secondary password remains unchanged.
- If you change the authentication plugin assigned to the account, the secondary password is discarded. If you change the authentication plugin and also specify RETAIN CURRENT PASSWORD, the statement fails.
- DISCARD OLD PASSWORD discards the secondary password, if one exists. The account retains only its primary password, and clients can use the account to connect to the server only with the primary password.

For more information about use of dual passwords, see Section 8.2.15, "Password Management".
ALTER USER permits these auth_option syntaxes:
- IDENTIFIED BY 'auth_string' [REPLACE 'current_auth_string'] [RETAIN CURRENT PASSWORD]

Sets the account authentication plugin to the default plugin, passes the cleartext 'auth_string' value to the plugin for possible hashing, and stores the result in the account row in the mysql.user system table.

The REPLACE clause, if given, specifies the account current password, as described previously in this section.

The RETAIN CURRENT PASSWORD clause, if given, causes the account current password to be retained as its secondary password, as described previously in this section.
- IDENTIFIED BY RANDOM PASSWORD [REPLACE 'current_auth_string'] [RETAIN CURRENT PASSWORD]

Sets the account authentication plugin to the default plugin, generates a random password, passes the cleartext password value to the plugin for possible hashing, and stores the result in the account row in the mysql. user system table. The statement also returns the cleartext password in a result set to make it available to the user or application executing the statement. For details about the result set and characteristics of randomly generated passwords, see Random Password Generation.

The REPLACE clause, if given, specifies the account current password, as described previously in this section.

The RETAIN CURRENT PASSWORD clause, if given, causes the account current password to be retained as its secondary password, as described previously in this section.
- IDENTIFIED WITH auth_plugin

Sets the account authentication plugin to auth_plugin, clears the credentials to the empty string (the credentials are associated with the old authentication plugin, not the new one), and stores the result in the account row in the mysql.user system table.

In addition, the password is marked expired. The user must choose a new one when next connecting.
- IDENTIFIED WITH auth_plugin BY 'auth_string' [REPLACE
'current_auth_string'] [RETAIN CURRENT PASSWORD]
Sets the account authentication plugin to auth_plugin, passes the cleartext 'auth_string' value to the plugin for possible hashing, and stores the result in the account row in the mysql.user system table.

The REPLACE clause, if given, specifies the account current password, as described previously in this section.

The RETAIN CURRENT PASSWORD clause, if given, causes the account current password to be retained as its secondary password, as described previously in this section.
- IDENTIFIED WITH auth_plugin BY RANDOM PASSWORD [REPLACE
'current_auth_string'] [RETAIN CURRENT PASSWORD]
Sets the account authentication plugin to auth_plugin, generates a random password, passes the cleartext password value to the plugin for possible hashing, and stores the result in the account row in the mysql. user system table. The statement also returns the cleartext password in a result set to make it available to the user or application executing the statement. For details about the result set and characteristics of randomly generated passwords, see Random Password Generation.

The REPLACE clause, if given, specifies the account current password, as described previously in this section.

The RETAIN CURRENT PASSWORD clause, if given, causes the account current password to be retained as its secondary password, as described previously in this section.
- IDENTIFIED WITH auth_plugin AS 'auth_string'

Sets the account authentication plugin to auth_plugin and stores the 'auth_string' value as is in the mysql. user account row. If the plugin requires a hashed string, the string is assumed to be already hashed in the format the plugin requires.
- DISCARD OLD PASSWORD

Discards the account secondary password, if there is one, as described previously in this section.
Example: Specify the password as cleartext; the default plugin is used:
```
ALTER USER 'jeffrey'@'localhost'
    IDENTIFIED BY 'password';
```


Example: Specify the authentication plugin, along with a cleartext password value:
```
ALTER USER 'jeffrey'@'localhost'
    IDENTIFIED WITH mysql_native_password
        BY 'password';
```


Example: Like the preceding example, but in addition, specify the current password as a cleartext value to satisfy any account requirement that the user making the change knows that password:
```
ALTER USER 'jeffrey'@'localhost'
    IDENTIFIED WITH mysql_native_password
        BY 'password'
        REPLACE 'current_password';
```


The preceding statement fails unless the current user is jeffrey because REPLACE is permitted only for changes to the current user's password.

Example: Establish a new primary password and retain the existing password as the secondary password:
```
ALTER USER 'jeffrey'@'localhost'
    IDENTIFIED BY 'new_password'
    RETAIN CURRENT PASSWORD;
```


Example: Discard the secondary password, leaving the account with only its primary password:
```
ALTER USER 'jeffery'@'localhost' DISCARD OLD PASSWORD;
```


Example: Specify the authentication plugin, along with a hashed password value:
```
ALTER USER 'jeffrey'@'localhost'
    IDENTIFIED WITH mysql_native_password
        AS '*6C8989366EAF75BB670AD8EA7A7FC1176A95CEF4';
```


For additional information about setting passwords and authentication plugins, see Section 8.2.14, "Assigning Account Passwords", and Section 8.2.17, "Pluggable Authentication".

\section*{ALTER USER Multifactor Authentication Options}

ALTER USER has ADD, MODIFY, and DROP clauses that enable authentication factors to be added, modified, or dropped. In each case, the clause specifies an operation to perform on one authentication factor, and optionally an operation on another authentication factor. For each operation, the factor item specifies the FACTOR keyword preceded by the number 2 or 3 to indicate whether the operation applies to the second or third authentication factor. (1 is not permitted in this context. To act on the first authentication factor, use the syntax described in ALTER USER Authentication Options.)

ALTER USER multifactor authentication clause constraints are defined by the authentication_policy system variable. For example, the authentication_policy setting
controls the number of authentication factors that accounts may have, and for each factor, which authentication methods are permitted. See Configuring the Multifactor Authentication Policy.

When ALTER USER adds, modifies, or drops second and third factors in a single statement, operations are executed sequentially, but if any operation in the sequence fails the entire ALTER USER statement fails.

For ADD, each named factor must not already exist or it cannot be added. For MODIFY and DROP, each named factor must exist to be modified or dropped. If a second and third factor are defined, dropping the second factor causes the third factor to take its place as the second factor.

This statement drops authentication factors 2 and 3, which has the effect of converting the account from 3FA to 1FA:

ALTER USER 'user' DROP 2 FACTOR 3 FACTOR;
For additional ADD, MODIFY, and DROP examples, see Getting Started with Multifactor Authentication.
For information about factor-specific rules that determine the default authentication plugin for authentication clauses that do not name a plugin, see The Default Authentication Plugin.

\section*{ALTER USER Registration Options}

ALTER USER has clauses that enable FIDO/FIDO2 devices to be registered and unregistered. For more information, see Using WebAuthn Authentication, Device Unregistration for WebAuthn, and the mysql client --register-factor option description.

The mysql client --register-factor option, used for FIDO/FIDO2 device registration, causes the mysql client to generate and execute INITIATE REGISTRATION and FINISH REGISTRATION statements. These statements are not intended for manual execution.

\section*{ALTER USER Role Options}

ALTER USER . . . DEFAULT ROLE defines which roles become active when the user connects to the server and authenticates, or when the user executes the SET ROLE DEFAULT statement during a session.

ALTER USER ... DEFAULT ROLE is alternative syntax for SET DEFAULT ROLE (see Section 15.7.1.9, "SET DEFAULT ROLE Statement"). However, ALTER USER can set the default for only a single user, whereas SET DEFAULT ROLE can set the default for multiple users. On the other hand, you can specify CURRENT_USER as the user name for the ALTER USER statement, whereas you cannot for SET DEFAULT ROLE.

Each user account name uses the format described previously.
Each role name uses the format described in Section 8.2.5, "Specifying Role Names". For example:
ALTER USER 'joe'@'10.0.0.1' DEFAULT ROLE administrator, developer;
The host name part of the role name, if omitted, defaults to ' $\%$ '.
The clause following the DEFAULT ROLE keywords permits these values:
- NONE: Set the default to NONE (no roles).
- ALL: Set the default to all roles granted to the account.
- role [, role] ...: Set the default to the named roles, which must exist and be granted to the account at the time ALTER USER ... DEFAULT ROLE is executed.

\section*{ALTER USER SSL/TLS Options}

MySQL can check X. 509 certificate attributes in addition to the usual authentication that is based on the user name and credentials. For background information on the use of SSL/TLS with MySQL, see Section 8.3, "Using Encrypted Connections".

To specify SSL/TLS-related options for a MySQL account, use a REQUIRE clause that specifies one or more tls_option values.

Order of REQUIRE options does not matter, but no option can be specified twice. The AND keyword is optional between REQUIRE options.

ALTER USER permits these tls_option values:
- NONE

Indicates that all accounts named by the statement have no SSL or X. 509 requirements. Unencrypted connections are permitted if the user name and password are valid. Encrypted connections can be used, at the client's option, if the client has the proper certificate and key files.

ALTER USER 'jeffrey'@'localhost' REQUIRE NONE;
Clients attempt to establish a secure connection by default. For clients that have REQUIRE NONE, the connection attempt falls back to an unencrypted connection if a secure connection cannot be established. To require an encrypted connection, a client need specify only the --sslmode=REQUIRED option; the connection attempt fails if a secure connection cannot be established.
- SSL

Tells the server to permit only encrypted connections for all accounts named by the statement.
ALTER USER 'jeffrey'@'localhost' REQUIRE SSL;
Clients attempt to establish a secure connection by default. For accounts that have REQUIRE SSL, the connection attempt fails if a secure connection cannot be established.
- X509

For all accounts named by the statement, requires that clients present a valid certificate, but the exact certificate, issuer, and subject do not matter. The only requirement is that it should be possible to verify its signature with one of the CA certificates. Use of X. 509 certificates always implies encryption, so the SSL option is unnecessary in this case.

ALTER USER 'jeffrey'@'localhost' REQUIRE X509;
For accounts with REQUIRE X509, clients must specify the --ssl-key and --ssl-cert options to connect. (It is recommended but not required that --ssl-ca also be specified so that the public certificate provided by the server can be verified.) This is true for ISSUER and SUBJECT as well because those REQUIRE options imply the requirements of X509.
- ISSUER 'issuer'

For all accounts named by the statement, requires that clients present a valid X. 509 certificate issued by CA 'issuer'. If a client presents a certificate that is valid but has a different issuer, the server rejects the connection. Use of X. 509 certificates always implies encryption, so the SSL option is unnecessary in this case.

ALTER USER 'jeffrey'@'localhost'
REQUIRE ISSUER '/C=SE/ST=Stockholm/L=Stockholm/
0=MySQL/CN=CA/emailAddress=ca@example.com';
Because ISSUER implies the requirements of X509, clients must specify the --ssl-key and --ssl-cert options to connect. (It is recommended but not required that--ssl-ca also be specified so that the public certificate provided by the server can be verified.)
- SUBJECT 'subject'

For all accounts named by the statement, requires that clients present a valid X. 509 certificate containing the subject subject. If a client presents a certificate that is valid but has a different
subject, the server rejects the connection. Use of X. 509 certificates always implies encryption, so the SSL option is unnecessary in this case.
```
ALTER USER 'jeffrey'@'localhost'
    REQUIRE SUBJECT '/C=SE/ST=Stockholm/L=Stockholm/
        O=MySQL demo client certificate/
        CN=client/emailAddress=client@example.com';
```


MySQL does a simple string comparison of the 'subject ' value to the value in the certificate, so lettercase and component ordering must be given exactly as present in the certificate.

Because SUBJECT implies the requirements of X509, clients must specify the --ssl-key and --ssl-cert options to connect. (It is recommended but not required that--ssl-ca also be specified so that the public certificate provided by the server can be verified.)
- CIPHER 'cipher'

For all accounts named by the statement, requires a specific cipher method for encrypting connections. This option is needed to ensure that ciphers and key lengths of sufficient strength are used. Encryption can be weak if old algorithms using short encryption keys are used.
```
ALTER USER 'jeffrey'@'localhost'
    REQUIRE CIPHER 'EDH-RSA-DES-CBC3-SHA';
```


The SUBJECT, ISSUER, and CIPHER options can be combined in the REQUIRE clause:
```
ALTER USER 'jeffrey'@'localhost'
    REQUIRE SUBJECT '/C=SE/ST=Stockholm/L=Stockholm/
        O=MySQL demo client certificate/
        CN=client/emailAddress=client@example.com'
    AND ISSUER '/C=SE/ST=Stockholm/L=Stockholm/
        0=MySQL/CN=CA/emailAddress=ca@example.com'
    AND CIPHER 'EDH-RSA-DES-CBC3-SHA';
```


\section*{ALTER USER Resource-Limit Options}

It is possible to place limits on use of server resources by an account, as discussed in Section 8.2.21, "Setting Account Resource Limits". To do so, use a WITH clause that specifies one or more resource_option values.

Order of WITH options does not matter, except that if a given resource limit is specified multiple times, the last instance takes precedence.

ALTER USER permits these resource_option values:
- MAX_QUERIES_PER_HOUR count,MAX_UPDATES_PER_HOUR count, MAX_CONNECTIONS_PER_HOUR count

For all accounts named by the statement, these options restrict how many queries, updates, and connections to the server are permitted to each account during any given one-hour period. If count is 0 (the default), this means that there is no limitation for the account.

\section*{- MAX_USER_CONNECTIONS count}

For all accounts named by the statement, restricts the maximum number of simultaneous connections to the server by each account. A nonzero count specifies the limit for the account explicitly. If count is 0 (the default), the server determines the number of simultaneous connections for the account from the global value of the max_user_connections system variable. If max_user_connections is also zero, there is no limit for the account.

Example:
```
ALTER USER 'jeffrey'@'localhost'
    WITH MAX_QUERIES_PER_HOUR 500 MAX_UPDATES_PER_HOUR 100;
```


\section*{ALTER USER Password-Management Options}

ALTER USER supports several password_option values for password management:
- Password expiration options: You can expire an account password manually and establish its password expiration policy. Policy options do not expire the password. Instead, they determine how the server applies automatic expiration to the account based on password age, which is assessed from the date and time of the most recent account password change.
- Password reuse options: You can restrict password reuse based on number of password changes, time elapsed, or both.
- Password verification-required options: You can indicate whether attempts to change an account password must specify the current password, as verification that the user attempting to make the change actually knows the current password.
- Incorrect-password failed-login tracking options: You can cause the server to track failed login attempts and temporarily lock accounts for which too many consecutive incorrect passwords are given. The required number of failures and the lock time are configurable.

This section describes the syntax for password-management options. For information about establishing policy for password management, see Section 8.2.15, "Password Management".

If multiple password-management options of a given type are specified, the last one takes precedence. For example, PASSWORD EXPIRE DEFAULT PASSWORD EXPIRE NEVER is the same as PASSWORD EXPIRE NEVER.

\section*{Note}

Except for the options that pertain to failed-login tracking, passwordmanagement options apply only to accounts that use an authentication plugin that stores credentials internally to MySQL. For accounts that use a plugin that performs authentication against a credentials system that is external to MySQL, password management must be handled externally against that system as well. For more information about internal credentials storage, see Section 8.2.15, "Password Management".

A client has an expired password if the account password was expired manually or the password age is considered greater than its permitted lifetime per the automatic expiration policy. In this case, the server either disconnects the client or restricts the operations permitted to it (see Section 8.2.16, "Server Handling of Expired Passwords"). Operations performed by a restricted client result in an error until the user establishes a new account password.

\section*{Note}

Although it is possible to "reset" an expired password by setting it to its current value, it is preferable, as a matter of good policy, to choose a different password. DBAs can enforce non-reuse by establishing an appropriate password-reuse policy. See Password Reuse Policy.

ALTER USER permits these password_option values for controlling password expiration:
- PASSWORD EXPIRE

Immediately marks the password expired for all accounts named by the statement.
ALTER USER 'jeffrey'@'localhost' PASSWORD EXPIRE;
- PASSWORD EXPIRE DEFAULT

Sets all accounts named by the statement so that the global expiration policy applies, as specified by the default_password_lifetime system variable.
```
ALTER USER 'jeffrey'@'localhost' PASSWORD EXPIRE DEFAULT;
```

- PASSWORD EXPIRE NEVER

This expiration option overrides the global policy for all accounts named by the statement. For each, it disables password expiration so that the password never expires.

ALTER USER 'jeffrey'@'localhost' PASSWORD EXPIRE NEVER;
- PASSWORD EXPIRE INTERVAL $N$ DAY

This expiration option overrides the global policy for all accounts named by the statement. For each, it sets the password lifetime to $N$ days. The following statement requires the password to be changed every 180 days:

ALTER USER 'jeffrey'@'localhost' PASSWORD EXPIRE INTERVAL 180 DAY;
ALTER USER permits these password_option values for controlling reuse of previous passwords based on required minimum number of password changes:
- PASSWORD HISTORY DEFAULT

Sets all accounts named by the statement so that the global policy about password history length applies, to prohibit reuse of passwords before the number of changes specified by the password_history system variable.

ALTER USER 'jeffrey'@'localhost' PASSWORD HISTORY DEFAULT;
- PASSWORD HISTORY $N$

This history-length option overrides the global policy for all accounts named by the statement. For each, it sets the password history length to $N$ passwords, to prohibit reusing any of the $N$ most recently chosen passwords. The following statement prohibits reuse of any of the previous 6 passwords:

ALTER USER 'jeffrey'@'localhost' PASSWORD HISTORY 6;
ALTER USER permits these password_option values for controlling reuse of previous passwords based on time elapsed:
- PASSWORD REUSE INTERVAL DEFAULT

Sets all statements named by the account so that the global policy about time elapsed
applies, to prohibit reuse of passwords newer than the number of days specified by the password_reuse_interval system variable.

ALTER USER 'jeffrey'@'localhost' PASSWORD REUSE INTERVAL DEFAULT;
- PASSWORD REUSE INTERVAL $N$ DAY

This time-elapsed option overrides the global policy for all accounts named by the statement. For each, it sets the password reuse interval to $N$ days, to prohibit reuse of passwords newer than that many days. The following statement prohibits password reuse for 360 days:

ALTER USER 'jeffrey'@'localhost' PASSWORD REUSE INTERVAL 360 DAY;
ALTER USER permits these password_option values for controlling whether attempts to change an account password must specify the current password, as verification that the user attempting to make the change actually knows the current password:
- PASSWORD REQUIRE CURRENT

This verification option overrides the global policy for all accounts named by the statement. For each, it requires that password changes specify the current password.

ALTER USER 'jeffrey'@'localhost' PASSWORD REQUIRE CURRENT;
- PASSWORD REQUIRE CURRENT OPTIONAL

This verification option overrides the global policy for all accounts named by the statement. For each, it does not require that password changes specify the current password. (The current password may but need not be given.)

ALTER USER 'jeffrey'@'localhost' PASSWORD REQUIRE CURRENT OPTIONAL;
- PASSWORD REQUIRE CURRENT DEFAULT

Sets all statements named by the account so that the global policy about password verification applies, as specified by the password_require_current system variable.

ALTER USER 'jeffrey'@'localhost' PASSWORD REQUIRE CURRENT DEFAULT;
ALTER USER permits these password_option values for controlling failed-login tracking:
- FAILED_LOGIN_ATTEMPTS $N$

Whether to track account login attempts that specify an incorrect password. $N$ must be a number from 0 to 32767 . A value of 0 disables failed-login tracking. Values greater than 0 indicate how many consecutive password failures cause temporary account locking (if PASSWORD_LOCK_TIME is also nonzero).
- PASSWORD_LOCK_TIME \{N | UNBOUNDED\}

How long to lock the account after too many consecutive login attempts provide an incorrect password. $N$ must be a number from 0 to 32767, or UNBOUNDED. A value of 0 disables temporary account locking. Values greater than 0 indicate how long to lock the account in days. A value of UNBOUNDED causes the account locking duration to be unbounded; once locked, the account remains in a locked state until unlocked. For information about the conditions under which unlocking occurs, see Failed-Login Tracking and Temporary Account Locking.

For failed-login tracking and temporary locking to occur, an account's FAILED_LOGIN_ATTEMPTS and PASSWORD_LOCK_TIME options both must be nonzero. The following statement modifies an account such that it remains locked for two days after four consecutive password failures:

ALTER USER 'jeffrey'@'localhost'
FAILED_LOGIN_ATTEMPTS 4 PASSWORD_LOCK_TIME 2;

\section*{ALTER USER Comment and Attribute Options}

MySQL 8.4 supports user comments and user attributes, as described in Section 15.7.1.3, "CREATE USER Statement". These can be modified employing ALTER USER by means of the COMMENT and ATTRIBUTE options, respectively. You cannot specify both options in the same ALTER USER statement; attempting to do so results in a syntax error.

The user comment and user attribute are stored in the Information Schema USER_ATTRIBUTES table as a JSON object; the user comment is stored as the value for a comment key in the ATTRIBUTE column of this table, as shown later in this discussion. The COMMENT text can be any arbitrary quoted text, and replaces any existing user comment. The ATTRIBUTE value must be the valid string representation of a JSON object. This is merged with any existing user attribute as if the JSON_MERGE_PATCH( ) function had been used on the existing user attribute and the new one; for any keys that are re-used, the new value overwrites the old one, as shown here:
```
mysql> SELECT * FROM INFORMATION_SCHEMA.USER_ATTRIBUTES
    -> WHERE USER='bill' AND HOST='localhost';
+------+------------+----------------+
| USER | HOST | ATTRIBUTE |
+------+------------+----------------+
| bill | localhost | {"foo": "bar"} |
+------+------------+----------------+
```

```
1 row in set (0.11 sec)
mysql> ALTER USER 'bill'@'localhost' ATTRIBUTE '{"baz": "faz", "foo": "moo"}';
Query OK, 0 rows affected (0.22 sec)
mysql> SELECT * FROM INFORMATION_SCHEMA.USER_ATTRIBUTES
    -> WHERE USER='bill' AND HOST='localhost';
+-------+------------+------------------------------+
| USER | HOST | ATTRIBUTE |
+-------+------------+--------------------------------
| bill | localhost | {"baz": "faz", "foo": "moo"} |
+-------+------------+-------------------------------
1 row in set (0.00 sec)
```


To remove a key and its value from the user attribute, set the key to JSON null (must be lowercase and unquoted), like this:
```
mysql> ALTER USER 'bill'@'localhost' ATTRIBUTE '{"foo": null}';
Query OK, 0 rows affected (0.08 sec)
mysql> SELECT * FROM INFORMATION_SCHEMA.USER_ATTRIBUTES
        -> WHERE USER='bill' AND HOST='localhost';
+------+-----------+----------------+
+------+------------+----------------+
| bill | localhost | {"baz": "faz"} |
+------+------------+----------------+
1 row in set (0.00 sec)
```


To set an existing user comment to an empty string, use ALTER USER ... COMMENT ' '. This leaves an empty comment value in the USER_ATTRIBUTES table; to remove the user comment completely, use ALTER USER ... ATTRIBUTE ... with the value for the column key set to JSON null (unquoted, in lower case). This is illustrated by the following sequence of SQL statements:
```
mysql> ALTER USER 'bill'@'localhost' COMMENT 'Something about Bill';
Query OK, 0 rows affected (0.06 sec)
mysql> SELECT * FROM INFORMATION_SCHEMA.USER_ATTRIBUTES
        -> WHERE USER='bill' AND HOST='localhost';
+------+------------+-----------------------------------------------------
| USER | HOST | ATTRIBUTE |
+------+------------+-----------------------------------------------------
| bill | localhost | {"baz": "faz", "comment": "Something about Bill"} |
+------+------------+-----------------------------------------------------
1 row in set (0.00 sec)
mysql> ALTER USER 'bill'@'localhost' COMMENT '';
Query OK, 0 rows affected (0.09 sec)
mysql> SELECT * FROM INFORMATION_SCHEMA.USER_ATTRIBUTES
        -> WHERE USER='bill' AND HOST='localhost';
+------+------------+---------------------------------
| USER | HOST | ATTRIBUTE |
+------+------------+---------------------------------
| bill | localhost | {"baz": "faz", "comment": ""} |
+------+------------+-------------------------------+
1 row in set (0.00 sec)
mysql> ALTER USER 'bill'@'localhost' ATTRIBUTE '{"comment": null}';
Query OK, 0 rows affected (0.07 sec)
mysql> SELECT * FROM INFORMATION_SCHEMA.USER_ATTRIBUTES
        -> WHERE USER='bill' AND HOST='localhost';
+------+------------+----------------+
| USER | HOST | ATTRIBUTE |
+------+------------+----------------+
| bill | localhost | {"baz": "faz"} |
+------+------------+----------------+
1 row in set (0.00 sec)
```


\section*{ALTER USER Account-Locking Options}

MySQL supports account locking and unlocking using the ACCOUNT LOCK and ACCOUNT UNLOCK options, which specify the locking state for an account. For additional discussion, see Section 8.2.20, "Account Locking".

If multiple account-locking options are specified, the last one takes precedence.
ALTER USER . . . ACCOUNT UNLOCK unlocks any account named by the statement that is temporarily locked due to too many failed logins. See Section 8.2.15, "Password Management".

\section*{ALTER USER Binary Logging}

ALTER USER is written to the binary log if it succeeds, but not if it fails; in that case, rollback occurs and no changes are made. A statement written to the binary log includes all named users. If the IF EXISTS clause is given, this includes even users that do not exist and were not altered.

If the original statement changes the credentials for a user, the statement written to the binary log specifies the applicable authentication plugin for that user, determined as follows:
- The plugin named in the original statement, if one was specified.
- Otherwise, the plugin associated with the user account if the user exists, or the default authentication plugin if the user does not exist. (If the statement written to the binary log must specify a particular authentication plugin for a user, include it in the original statement.)

If the server adds the default authentication plugin for any users in the statement written to the binary log, it writes a warning to the error log naming those users.

If the original statement specifies the FAILED_LOGIN_ATTEMPTS or PASSWORD_LOCK_TIME option, the statement written to the binary log includes the option.

ALTER USER statements with clauses that support multifactor authentication (MFA) are written to the binary log with the exception of ALTER USER user factor INITIATE REGISTRATION statements.
- ALTER USER user factor FINISH REGISTRATION SET CHALLENGE_RESPONSE AS 'auth_string' statements are written to the binary log as ALTER USER user MODIFY factor IDENTIFIED WITH authentication_webauthn AS webauthn_hash_string;
- In a replication context, the replication user requires PASSWORDLESS_USER_ADMIN privilege to execute ALTER USER ... MODIFY operations on accounts configured for passwordless authentication using the authentication_webauthn plugin.

\subsection*{15.7.1.2 CREATE ROLE Statement}

CREATE ROLE [IF NOT EXISTS] role [, role ] ...
CREATE ROLE creates one or more roles, which are named collections of privileges. To use this statement, you must have the global CREATE ROLE or CREATE USER privilege. When the read_only system variable is enabled, CREATE ROLE additionally requires the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege).

A role when created is locked, has no password, and is assigned the default authentication plugin. (These role attributes can be changed later with the ALTER USER statement, by users who have the global CREATE USER privilege.)

CREATE ROLE either succeeds for all named roles or rolls back and has no effect if any error occurs. By default, an error occurs if you try to create a role that already exists. If the IF NOT EXISTS clause is given, the statement produces a warning for each named role that already exists, rather than an error.

The statement is written to the binary log if it succeeds, but not if it fails; in that case, rollback occurs and no changes are made. A statement written to the binary log includes all named roles. If the IF NOT EXISTS clause is given, this includes even roles that already exist and were not created.

Each role name uses the format described in Section 8.2.5, "Specifying Role Names". For example:
```
CREATE ROLE 'admin', 'developer';
CREATE ROLE 'webapp'@'localhost';
```


The host name part of the role name, if omitted, defaults to ' $\%$ '.
For role usage examples, see Section 8.2.10, "Using Roles".

\subsection*{15.7.1.3 CREATE USER Statement}
```
CREATE USER [IF NOT EXISTS]
        user [auth_option] [, user [auth_option]] ...
        DEFAULT ROLE role [, role ] ...
        [REQUIRE {NONE | tls_option [[AND] tls_option] ...}]
        [WITH resource_option [resource_option] ...]
        [password_option | lock_option] ...
        [COMMENT 'comment_string' | ATTRIBUTE 'json_object']
user:
        (see Section 8.2.4, "Specifying Account Names")
auth_option: {
        IDENTIFIED BY 'auth_string' [AND 2fa_auth_option]
    | IDENTIFIED BY RANDOM PASSWORD [AND 2fa_auth_option]
    | IDENTIFIED WITH auth_plugin [AND 2fa_auth_option]
    | IDENTIFIED WITH auth_plugin BY 'auth_string' [AND 2fa_auth_option]
    | IDENTIFIED WITH auth_plugin BY RANDOM PASSWORD [AND 2fa_auth_option]
    | IDENTIFIED WITH auth_plugin AS 'auth_string' [AND 2fa_auth_option]
    | IDENTIFIED WITH auth_plugin [initial_auth_option]
}
2fa_auth_option: {
        IDENTIFIED BY 'auth_string' [AND 3fa_auth_option]
    | IDENTIFIED BY RANDOM PASSWORD [AND 3fa_auth_option]
    | IDENTIFIED WITH auth_plugin [AND 3fa_auth_option]
    | IDENTIFIED WITH auth_plugin BY 'auth_string' [AND 3fa_auth_option]
    | IDENTIFIED WITH auth_plugin BY RANDOM PASSWORD [AND 3fa_auth_option]
    | IDENTIFIED WITH auth_plugin AS 'auth_string' [AND 3fa_auth_option]
}
3fa_auth_option: {
        IDENTIFIED BY 'auth_string'
    | IDENTIFIED BY RANDOM PASSWORD
    | IDENTIFIED WITH auth_plugin
    | IDENTIFIED WITH auth_plugin BY 'auth_string'
    | IDENTIFIED WITH auth_plugin BY RANDOM PASSWORD
    | IDENTIFIED WITH auth_plugin AS 'auth_string'
}
initial_auth_option: {
        INITIAL AUTHENTICATION IDENTIFIED BY {RANDOM PASSWORD | 'auth_string'}
    | INITIAL AUTHENTICATION IDENTIFIED WITH auth_plugin AS 'auth_string'
}
tls_option: {
        SSL
    | X509
    | CIPHER 'cipher'
    | ISSUER 'issuer'
    | SUBJECT 'subject'
}
resource_option: {
        MAX_QUERIES_PER_HOUR count
    | MAX_UPDATES_PER_HOUR count
    | MAX_CONNECTIONS_PER_HOUR count
    | MAX_USER_CONNECTIONS count
}
password_option: {
```

```
        PASSWORD EXPIRE [DEFAULT | NEVER | INTERVAL N DAY]
    | PASSWORD HISTORY {DEFAULT | N}
    | PASSWORD REUSE INTERVAL {DEFAULT | N DAY}
    | PASSWORD REQUIRE CURRENT [DEFAULT | OPTIONAL]
    | FAILED_LOGIN_ATTEMPTS N
    | PASSWORD_LOCK_TIME {N | UNBOUNDED}
}
lock_option: {
        ACCOUNT LOCK
    | ACCOUNT UNLOCK
}
```


The CREATE USER statement creates new MySQL accounts. It enables authentication, role, SSL/TLS, resource-limit, password-management, comment, and attribute properties to be established for new accounts. It also controls whether accounts are initially locked or unlocked.

To use CREATE USER, you must have the global CREATE USER privilege, or the INSERT privilege for the mysql system schema. When the read_only system variable is enabled, CREATE USER additionally requires the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege).

These additional privilege considerations also apply:
- The authentication_policy system variable places certain constraints on how the authentication-related clauses of CREATE USER statements may be used; for details, see the description of that variable. These constraints do not apply if you have the AUTHENTICATION_POLICY_ADMIN privilege.
- To create an account that uses passwordless authentication, you must have the PASSWORDLESS_USER_ADMIN privilege.

CREATE USER fails with an error if any account to be created is named as the DEFINER attribute for any stored object. (That is, the statement fails if creating an account would cause the account to adopt a currently orphaned stored object.) To perform the operation anyway, you must have the SET_ANY_DEFINER or ALLOW_NONEXISTENT_DEFINER privilege; in this case, the statement succeeds with a warning rather than failing with an error. To perform the user-creation operation without either of these, drop the orphan objects, create the account and grant its privileges, and then re-create the dropped objects. For additional information, including how to identify which objects name a given account as the DEFINER attribute, see Orphan Stored Objects.

CREATE USER either succeeds for all named users or rolls back and has no effect if any error occurs. By default, an error occurs if you try to create a user that already exists. If the IF NOT EXISTS clause is given, the statement produces a warning for each named user that already exists, rather than an error.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2830.jpg?height=120&width=113&top_left_y=1939&top_left_x=294)

\section*{Important}

Under some circumstances, CREATE USER may be recorded in server logs or on the client side in a history file such as ~/. mysql_history, which means that cleartext passwords may be read by anyone having read access to that information. For information about the conditions under which this occurs for the server logs and how to control it, see Section 8.1.2.3, "Passwords and Logging". For similar information about client-side logging, see Section 6.5.1.3, "mysql Client Logging".

There are several aspects to the CREATE USER statement, described under the following topics:
- CREATE USER Overview
- CREATE USER Authentication Options
- CREATE USER Multifactor Authentication Options
- CREATE USER Role Options
- CREATE USER SSL/TLS Options
- CREATE USER Resource-Limit Options
- CREATE USER Password-Management Options
- CREATE USER Comment and Attribute Options
- CREATE USER Account-Locking Options
- CREATE USER Binary Logging

\section*{CREATE USER Overview}

For each account, CREATE USER creates a new row in the mysql. user system table. The account row reflects the properties specified in the statement. Unspecified properties are set to their default values:
- Authentication: The default authentication plugin (determined as described in The Default Authentication Plugin), and empty credentials
- Default role: NONE
- SSL/TLS: NONE
- Resource limits: Unlimited
- Password management: PASSWORD EXPIRE DEFAULT PASSWORD HISTORY DEFAULT PASSWORD REUSE INTERVAL DEFAULT PASSWORD REQUIRE CURRENT DEFAULT; failed-login tracking and temporary account locking are disabled
- Account locking: ACCOUNT UNLOCK

An account when first created has no privileges and the default role NONE. To assign privileges or roles to this account, use one or more GRANT statements.

Each account name uses the format described in Section 8.2.4, "Specifying Account Names". For example:

CREATE USER 'jeffrey'@'localhost' IDENTIFIED BY 'password';
The host name part of the account name, if omitted, defaults to ' $\%$ '. You should be aware that, while MySQL 8.4 treats grants made to such a user as though they had been granted to 'user'@'localhost', this behavior is deprecated, and thus subject to removal in a future version of MySQL.

Each user value naming an account may be followed by an optional auth_option value that indicates how the account authenticates. These values enable account authentication plugins and credentials (for example, a password) to be specified. Each auth_option value applies only to the account named immediately preceding it.

Following the user specifications, the statement may include options for SSL/TLS, resource-limit, password-management, and locking properties. All such options are global to the statement and apply to all accounts named in the statement.

Example: Create an account that uses the default authentication plugin and the given password. Mark the password expired so that the user must choose a new one at the first connection to the server:
```
CREATE USER 'jeffrey'@'localhost'
    IDENTIFIED BY 'new_password' PASSWORD EXPIRE;
```


Example: Create an account that uses the caching_sha2_password authentication plugin and the given password. Require that a new password be chosen every 180 days, and enable failed-login tracking, such that three consecutive incorrect passwords cause temporary account locking for two days:
```
CREATE USER 'jeffrey'@'localhost'
    IDENTIFIED WITH caching_sha2_password BY 'new_password'
    PASSWORD EXPIRE INTERVAL 180 DAY
    FAILED_LOGIN_ATTEMPTS 3 PASSWORD_LOCK_TIME 2;
```


Example: Create multiple accounts, specifying some per-account properties and some global properties:
```
CREATE USER
    'jeffrey'@'localhost' IDENTIFIED WITH mysql_native_password
        BY 'new_password1',
    'jeanne'@'localhost' IDENTIFIED WITH caching_sha2_password
        BY 'new_password2'
    REQUIRE X509 WITH MAX_QUERIES_PER_HOUR 60
    PASSWORD HISTORY 5
    ACCOUNT LOCK;
```


Each auth_option value (IDENTIFIED WITH . . . BY in this case) applies only to the account named immediately preceding it, so each account uses the immediately following authentication plugin and password.

The remaining properties apply globally to all accounts named in the statement, so for both accounts:
- Connections must be made using a valid X. 509 certificate.
- Up to 60 queries per hour are permitted.
- Password changes cannot reuse any of the five most recent passwords.
- The account is locked initially, so effectively it is a placeholder and cannot be used until an administrator unlocks it.

\section*{CREATE USER Authentication Options}

An account name may be followed by an auth_option authentication option that specifies the account authentication plugin, credentials, or both.

\section*{Note}

MySQL 8.4 supports multifactor authentication (MFA), such that accounts can have up to three authentication methods. That is, accounts can use twofactor authentication (2FA) or three-factor authentication (3FA). The syntax and semantics of auth_option remain unchanged, but auth_option may be followed by specifications for additional authentication methods. This section describes auth_option. For details about the optional MFA-related following clauses, see CREATE USER Multifactor Authentication Options.

\section*{Note}

Clauses for random password generation apply only to accounts that use an authentication plugin that stores credentials internally to MySQL. For accounts that use a plugin that performs authentication against a credentials system that is external to MySQL, password management must be handled externally against that system as well. For more information about internal credentials storage, see Section 8.2.15, "Password Management".
- auth_plugin names an authentication plugin. The plugin name can be a quoted string literal or an unquoted name. Plugin names are stored in the plugin column of the mysql. user system table.

For auth_option syntax that does not specify an authentication plugin, the server assigns the default plugin, determined as described in The Default Authentication Plugin. For descriptions of each plugin, see Section 8.4.1, "Authentication Plugins".
- Credentials that are stored internally are stored in the mysql.user system table. An 'auth_string' value or RANDOM PASSWORD specifies account credentials, either as a cleartext
(unencrypted) string or hashed in the format expected by the authentication plugin associated with the account, respectively:
- For syntax that uses BY 'auth_string', the string is cleartext and is passed to the authentication plugin for possible hashing. The result returned by the plugin is stored in the mysql. user table. A plugin may use the value as specified, in which case no hashing occurs.
- For syntax that uses BY RANDOM PASSWORD, MySQL generates a random password and as cleartext and passes it to the authentication plugin for possible hashing. The result returned by the plugin is stored in the mysql. user table. A plugin may use the value as specified, in which case no hashing occurs.

Randomly generated passwords have the characteristics described in Random Password Generation.
- For syntax that uses AS 'auth_string', the string is assumed to be already in the format the authentication plugin requires, and is stored as is in the mysql. user table. If a plugin requires a hashed value, the value must be already hashed in a format appropriate for the plugin; otherwise, the value cannot be used by the plugin and correct authentication of client connections does not occur.

A hashed string can be either a string literal or a hexadecimal value. The latter corresponds to the type of value displayed by SHOW CREATE USER for password hashes containing unprintable characters when the print_identified_with_as_hex system variable is enabled.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2833.jpg?height=120&width=108&top_left_y=1210&top_left_x=434)

\section*{Important}

Although we show 'auth_string' with quotation marks, a hexadecimal value used for this purpose must not be quoted.
- If an authentication plugin performs no hashing of the authentication string, the BY 'auth_string' and AS 'auth_string' clauses have the same effect: The authentication string is stored as is in the mysql. user system table.

CREATE USER permits these auth_option syntaxes:
- IDENTIFIED BY 'auth_string'

Sets the account authentication plugin to the default plugin, passes the cleartext 'auth_string' value to the plugin for possible hashing, and stores the result in the account row in the mysql.user system table.

\section*{- IDENTIFIED BY RANDOM PASSWORD}

Sets the account authentication plugin to the default plugin, generates a random password, passes the cleartext password value to the plugin for possible hashing, and stores the result in the account row in the mysql. user system table. The statement also returns the cleartext password in a result set to make it available to the user or application executing the statement. For details about the result set and characteristics of randomly generated passwords, see Random Password Generation.

\section*{- IDENTIFIED WITH auth_plugin}

Sets the account authentication plugin to auth_plugin, clears the credentials to the empty string, and stores the result in the account row in the mysql.user system table.

\section*{- IDENTIFIED WITH auth_plugin BY 'auth_string'}

Sets the account authentication plugin to auth_plugin, passes the cleartext 'auth_string' value to the plugin for possible hashing, and stores the result in the account row in the mysql.user system table.

\section*{- IDENTIFIED WITH auth_plugin BY RANDOM PASSWORD}

Sets the account authentication plugin to auth_plugin, generates a random password, passes the cleartext password value to the plugin for possible hashing, and stores the result in the account row in the mysql. user system table. The statement also returns the cleartext password in a result set to make it available to the user or application executing the statement. For details about the result set and characteristics of randomly generated passwords, see Random Password Generation.

\section*{- IDENTIFIED WITH auth_plugin AS 'auth_string'}

Sets the account authentication plugin to auth_plugin and stores the 'auth_string' value as is in the mysql. user account row. If the plugin requires a hashed string, the string is assumed to be already hashed in the format the plugin requires.

Example: Specify the password as cleartext; the default plugin is used:
```
CREATE USER 'jeffrey'@'localhost'
    IDENTIFIED BY 'password';
```


Example: Specify the authentication plugin, along with a cleartext password value:
```
CREATE USER 'jeffrey'@'localhost'
    IDENTIFIED WITH mysql_native_password BY 'password';
```


In each case, the password value stored in the account row is the cleartext value 'password' after it has been hashed by the authentication plugin associated with the account.

For additional information about setting passwords and authentication plugins, see Section 8.2.14, "Assigning Account Passwords", and Section 8.2.17, "Pluggable Authentication".

\section*{CREATE USER Multifactor Authentication Options}

The auth_option part of CREATE USER defines an authentication method for one-factor/singlefactor authentication (1FA/SFA). CREATE USER also supports multifactor authentication (MFA), such that accounts can have up to three authentication methods. That is, accounts can use two-factor authentication (2FA) or three-factor authentication (3FA).

The authentication_policy system variable defines constraints for CREATE USER statements with multifactor authentication (MFA) clauses. For example, the authentication_policy setting controls the number of authentication factors that accounts may have, and for each factor, which authentication methods are permitted. See Configuring the Multifactor Authentication Policy.

For information about factor-specific rules that determine the default authentication plugin for authentication clauses that name no plugin, see The Default Authentication Plugin.

Following auth_option, there may appear different optional MFA clauses:
- 2fa_auth_option: Specifies a factor 2 authentication method. The following example defines caching_sha2_password as the factor 1 authentication method, and authentication_ldap_sasl as the factor 2 authentication method.
```
CREATE USER 'u1'@'localhost'
    IDENTIFIED WITH caching_sha2_password
        BY 'sha2_password'
    AND IDENTIFIED WITH authentication_ldap_sasl
        AS 'uid=u1_ldap,ou=People,dc=example,dc=com';
```

- 3fa_auth_option: Following 2fa_auth_option, there may appear a 3fa_auth_option clause to specify a factor 3 authentication method. The following example defines caching_sha2_password as the factor 1 authentication method, authentication_ldap_sasl as the factor 2 authentication method, and authentication_webauthn as the factor 3 authentication method
```
CREATE USER 'u1'@'localhost'
    IDENTIFIED WITH caching_sha2_password
        BY 'sha2_password'
```

```
AND IDENTIFIED WITH authentication_ldap_sasl
    AS 'uid=u1_ldap,ou=People,dc=example,dc=com'
AND IDENTIFIED WITH authentication_webauthn;
```

- initial_auth_option: Specifies an initial authentication method for configuring FIDO/FIDO2 passwordless authentication. As shown in the following, temporary authentication using either a generated random password or a user-specified auth-string is required to enable WebAuthn passwordless authentication.
```
CREATE USER user
    IDENTIFIED WITH authentication_webauthn
    INITIAL AUTHENTICATION IDENTIFIED BY {RANDOM PASSWORD | 'auth_string'};
```


For information about configuring passwordless authentication using WebAuthn pluggable authentication, See WebAuthn Passwordless Authentication.

\section*{CREATE USER Role Options}

The DEFAULT ROLE clause defines which roles become active when the user connects to the server and authenticates, or when the user executes the SET ROLE DEFAULT statement during a session.

Each role name uses the format described in Section 8.2.5, "Specifying Role Names". For example:
```
CREATE USER 'joe'@'10.0.0.1' DEFAULT ROLE administrator, developer;
```


The host name part of the role name, if omitted, defaults to ' $\%$ '.
The DEFAULT ROLE clause permits a list of one or more comma-separated role names. These roles must exist at the time CREATE USER is executed; otherwise the statement raises an error (ER_USER_DOES_NOT_EXIST), and the user is not created.

\section*{CREATE USER SSL/TLS Options}

MySQL can check X. 509 certificate attributes in addition to the usual authentication that is based on the user name and credentials. For background information on the use of SSL/TLS with MySQL, see Section 8.3, "Using Encrypted Connections".

To specify SSL/TLS-related options for a MySQL account, use a REQUIRE clause that specifies one or more tls_option values.

Order of REQUIRE options does not matter, but no option can be specified twice. The AND keyword is optional between REQUIRE options.

CREATE USER permits these tls_option values:
- NONE

Indicates that all accounts named by the statement have no SSL or X. 509 requirements. Unencrypted connections are permitted if the user name and password are valid. Encrypted connections can be used, at the client's option, if the client has the proper certificate and key files.

CREATE USER 'jeffrey'@'localhost' REQUIRE NONE;
Clients attempt to establish a secure connection by default. For clients that have REQUIRE NONE, the connection attempt falls back to an unencrypted connection if a secure connection cannot be established. To require an encrypted connection, a client need specify only the --sslmode=REQUIRED option; the connection attempt fails if a secure connection cannot be established.

NONE is the default if no SSL-related REQUIRE options are specified.
- SSL

Tells the server to permit only encrypted connections for all accounts named by the statement.
```
CREATE USER 'jeffrey'@'localhost' REQUIRE SSL;
```


Clients attempt to establish a secure connection by default. For accounts that have REQUIRE SSL, the connection attempt fails if a secure connection cannot be established.
- X509

For all accounts named by the statement, requires that clients present a valid certificate, but the exact certificate, issuer, and subject do not matter. The only requirement is that it should be possible to verify its signature with one of the CA certificates. Use of X. 509 certificates always implies encryption, so the SSL option is unnecessary in this case.

CREATE USER 'jeffrey'@'localhost' REQUIRE X509;
For accounts with REQUIRE X509, clients must specify the --ssl-key and --ssl-cert options to connect. (It is recommended but not required that --ssl-ca also be specified so that the public certificate provided by the server can be verified.) This is true for ISSUER and SUBJECT as well because those REQUIRE options imply the requirements of X509.
- ISSUER 'issuer'

For all accounts named by the statement, requires that clients present a valid X. 509 certificate issued by CA 'issuer'. If a client presents a certificate that is valid but has a different issuer, the server rejects the connection. Use of X. 509 certificates always implies encryption, so the SSL option is unnecessary in this case.
```
CREATE USER 'jeffrey'@'localhost'
    REQUIRE ISSUER '/C=SE/ST=Stockholm/L=Stockholm/
        0=MySQL/CN=CA/emailAddress=ca@example.com';
```


Because ISSUER implies the requirements of X509, clients must specify the --ssl-key and --ssl-cert options to connect. (It is recommended but not required that--ssl-ca also be specified so that the public certificate provided by the server can be verified.)

\section*{- SUBJECT 'subject'}

For all accounts named by the statement, requires that clients present a valid X. 509 certificate containing the subject subject. If a client presents a certificate that is valid but has a different subject, the server rejects the connection. Use of X. 509 certificates always implies encryption, so the SSL option is unnecessary in this case.
```
CREATE USER 'jeffrey'@'localhost'
    REQUIRE SUBJECT '/C=SE/ST=Stockholm/L=Stockholm/
        O=MySQL demo client certificate/
        CN=client/emailAddress=client@example.com';
```


MySQL does a simple string comparison of the 'subject ' value to the value in the certificate, so lettercase and component ordering must be given exactly as present in the certificate.

Because SUBJECT implies the requirements of X509, clients must specify the --ssl-key and --ssl-cert options to connect. (It is recommended but not required that--ssl-ca also be specified so that the public certificate provided by the server can be verified.)
- CIPHER 'cipher'

For all accounts named by the statement, requires a specific cipher method for encrypting connections. This option is needed to ensure that ciphers and key lengths of sufficient strength are used. Encryption can be weak if old algorithms using short encryption keys are used.
```
CREATE USER 'jeffrey'@'localhost'
    REQUIRE CIPHER 'EDH-RSA-DES-CBC3-SHA';
```


The SUBJECT, ISSUER, and CIPHER options can be combined in the REQUIRE clause:
```
CREATE USER 'jeffrey'@'localhost'
```

```
REQUIRE SUBJECT '/C=SE/ST=Stockholm/L=Stockholm/
    O=MySQL demo client certificate/
    CN=client/emailAddress=client@example.com'
AND ISSUER '/C=SE/ST=Stockholm/L=Stockholm/
    0=MySQL/CN=CA/emailAddress=ca@example.com'
AND CIPHER 'EDH-RSA-DES-CBC3-SHA';
```


\section*{CREATE USER Resource-Limit Options}

It is possible to place limits on use of server resources by an account, as discussed in Section 8.2.21, "Setting Account Resource Limits". To do so, use a WITH clause that specifies one or more resource_option values.

Order of WITH options does not matter, except that if a given resource limit is specified multiple times, the last instance takes precedence.

CREATE USER permits these resource_option values:
- MAX_QUERIES_PER_HOUR count,MAX_UPDATES_PER_HOUR count, MAX_CONNECTIONS_PER_HOUR count

For all accounts named by the statement, these options restrict how many queries, updates, and connections to the server are permitted to each account during any given one-hour period. If count is 0 (the default), this means that there is no limitation for the account.
- MAX_USER_CONNECTIONS count

For all accounts named by the statement, restricts the maximum number of simultaneous connections to the server by each account. A nonzero count specifies the limit for the account explicitly. If count is 0 (the default), the server determines the number of simultaneous connections for the account from the global value of the max_user_connections system variable. If max_user_connections is also zero, there is no limit for the account.

Example:
```
CREATE USER 'jeffrey'@'localhost'
    WITH MAX_QUERIES_PER_HOUR 500 MAX_UPDATES_PER_HOUR 100;
```


\section*{CREATE USER Password-Management Options}

CREATE USER supports several password_option values for password management:
- Password expiration options: You can expire an account password manually and establish its password expiration policy. Policy options do not expire the password. Instead, they determine how the server applies automatic expiration to the account based on password age, which is assessed from the date and time of the most recent account password change.
- Password reuse options: You can restrict password reuse based on number of password changes, time elapsed, or both.
- Password verification-required options: You can indicate whether attempts to change an account password must specify the current password, as verification that the user attempting to make the change actually knows the current password.
- Incorrect-password failed-login tracking options: You can cause the server to track failed login attempts and temporarily lock accounts for which too many consecutive incorrect passwords are given. The required number of failures and the lock time are configurable.

This section describes the syntax for password-management options. For information about establishing policy for password management, see Section 8.2.15, "Password Management".

If multiple password-management options of a given type are specified, the last one takes precedence. For example, PASSWORD EXPIRE DEFAULT PASSWORD EXPIRE NEVER is the same as PASSWORD EXPIRE NEVER.

\section*{Note}

Except for the options that pertain to failed-login tracking, passwordmanagement options apply only to accounts that use an authentication plugin that stores credentials internally to MySQL. For accounts that use a plugin that performs authentication against a credentials system that is external to MySQL, password management must be handled externally against that system as well. For more information about internal credentials storage, see Section 8.2.15, "Password Management".

A client has an expired password if the account password was expired manually or the password age is considered greater than its permitted lifetime per the automatic expiration policy. In this case, the server either disconnects the client or restricts the operations permitted to it (see Section 8.2.16, "Server Handling of Expired Passwords"). Operations performed by a restricted client result in an error until the user establishes a new account password.

CREATE USER permits these password_option values for controlling password expiration:
- PASSWORD EXPIRE

Immediately marks the password expired for all accounts named by the statement.
CREATE USER 'jeffrey'@'localhost' PASSWORD EXPIRE;
- PASSWORD EXPIRE DEFAULT

Sets all accounts named by the statement so that the global expiration policy applies, as specified by the default_password_lifetime system variable.

CREATE USER 'jeffrey'@'localhost' PASSWORD EXPIRE DEFAULT;
- PASSWORD EXPIRE NEVER

This expiration option overrides the global policy for all accounts named by the statement. For each, it disables password expiration so that the password never expires.

CREATE USER 'jeffrey'@'localhost' PASSWORD EXPIRE NEVER;
- PASSWORD EXPIRE INTERVAL $N$ DAY

This expiration option overrides the global policy for all accounts named by the statement. For each, it sets the password lifetime to $N$ days. The following statement requires the password to be changed every 180 days:

CREATE USER 'jeffrey'@'localhost' PASSWORD EXPIRE INTERVAL 180 DAY;
CREATE USER permits these password_option values for controlling reuse of previous passwords based on required minimum number of password changes:
- PASSWORD HISTORY DEFAULT

Sets all accounts named by the statement so that the global policy about password history length applies, to prohibit reuse of passwords before the number of changes specified by the password_history system variable.

CREATE USER 'jeffrey'@'localhost' PASSWORD HISTORY DEFAULT;
- PASSWORD HISTORY $N$

This history-length option overrides the global policy for all accounts named by the statement. For each, it sets the password history length to $N$ passwords, to prohibit reusing any of the $N$ most recently chosen passwords. The following statement prohibits reuse of any of the previous 6 passwords:

CREATE USER 'jeffrey'@'localhost' PASSWORD HISTORY 6;
CREATE USER permits these password_option values for controlling reuse of previous passwords based on time elapsed:
- PASSWORD REUSE INTERVAL DEFAULT

Sets all statements named by the account so that the global policy about time elapsed applies, to prohibit reuse of passwords newer than the number of days specified by the password_reuse_interval system variable.

CREATE USER 'jeffrey'@'localhost' PASSWORD REUSE INTERVAL DEFAULT;
- PASSWORD REUSE INTERVAL $N$ DAY

This time-elapsed option overrides the global policy for all accounts named by the statement. For each, it sets the password reuse interval to $N$ days, to prohibit reuse of passwords newer than that many days. The following statement prohibits password reuse for 360 days:

CREATE USER 'jeffrey'@'localhost' PASSWORD REUSE INTERVAL 360 DAY;
CREATE USER permits these password_option values for controlling whether attempts to change an account password must specify the current password, as verification that the user attempting to make the change actually knows the current password:
- PASSWORD REQUIRE CURRENT

This verification option overrides the global policy for all accounts named by the statement. For each, it requires that password changes specify the current password.

CREATE USER 'jeffrey'@'localhost' PASSWORD REQUIRE CURRENT;
- PASSWORD REQUIRE CURRENT OPTIONAL

This verification option overrides the global policy for all accounts named by the statement. For each, it does not require that password changes specify the current password. (The current password may but need not be given.)

CREATE USER 'jeffrey'@'localhost' PASSWORD REQUIRE CURRENT OPTIONAL;
- PASSWORD REQUIRE CURRENT DEFAULT

Sets all statements named by the account so that the global policy about password verification applies, as specified by the password_require_current system variable.

CREATE USER 'jeffrey'@'localhost' PASSWORD REQUIRE CURRENT DEFAULT;
CREATE USER permits these password_option values for controlling failed-login tracking:
- FAILED_LOGIN_ATTEMPTS N

Whether to track account login attempts that specify an incorrect password. $N$ must be a number from 0 to 32767 . A value of 0 disables failed-login tracking. Values greater than 0 indicate how many consecutive password failures cause temporary account locking (if PASSWORD_LOCK_TIME is also nonzero).
- PASSWORD_LOCK_TIME \{N | UNBOUNDED\}

How long to lock the account after too many consecutive login attempts provide an incorrect password. $N$ must be a number from 0 to 32767 , or UNBOUNDED. A value of 0 disables temporary account locking. Values greater than 0 indicate how long to lock the account in days. A value of UNBOUNDED causes the account locking duration to be unbounded; once locked, the account
remains in a locked state until unlocked. For information about the conditions under which unlocking occurs, see Failed-Login Tracking and Temporary Account Locking.

For failed-login tracking and temporary locking to occur, an account's FAILED_LOGIN_ATTEMPTS and PASSWORD_LOCK_TIME options both must be nonzero. The following statement creates an account that remains locked for two days after four consecutive password failures:
```
CREATE USER 'jeffrey'@'localhost'
    FAILED_LOGIN_ATTEMPTS 4 PASSWORD_LOCK_TIME 2;
```


\section*{CREATE USER Comment and Attribute Options}

You can also include an optional comment or attribute when creating a user, as described here:

\section*{- User comment}

To set a user comment, add COMMENT 'user_comment' to the CREATE USER statement, where user_comment is the text of the user comment.

Example (omitting any other options):
```
CREATE USER 'jon'@'localhost' COMMENT 'Some information about Jon';
```


\section*{- User attribute}

A user attribute is a JSON object made up of one or more key-value pairs, and is set by including ATTRIBUTE 'json_object' as part of CREATE USER.json_object must be a valid JSON object.

Example (omitting any other options):
```
CREATE USER 'jim'@'localhost'
    ATTRIBUTE '{"fname": "James", "lname": "Scott", "phone": "123-456-7890"}';
```


User comments and user attributes are stored together in the ATTRIBUTE column of the Information Schema USER_ATTRIBUTES table. This query displays the row in this table inserted by the statement just shown for creating the user jim@localhost:
```
mysql> SELECT * FROM INFORMATION_SCHEMA.USER_ATTRIBUTES
    -> WHERE USER = 'jim' AND HOST = 'localhost'\G
*************************** 1. rOW ***************************************
    USER: jim
    HOST: localhost
ATTRIBUTE: {"fname": "James", "lname": "Scott", "phone": "123-456-7890"}
1 row in set (0.00 sec)
```


The COMMENT option in actuality provides a shortcut for setting a user attribute whose only element has comment as its key and whose value is the argument supplied for the option. You can see this by executing the statement CREATE USER 'jon'@'localhost' COMMENT 'Some information about Jon ', and observing the row which it inserts into the USER_ATTRIBUTES table:
```
mysql> CREATE USER 'jon'@'localhost' COMMENT 'Some information about Jon';
Query OK, 0 rows affected (0.06 sec)
mysql> SELECT * FROM INFORMATION_SCHEMA.USER_ATTRIBUTES
    -> WHERE USER = 'jon' AND HOST = 'localhost';
+-------+------------+--------------------------------------------
| USER | HOST | ATTRIBUTE |
+-------+------------+--------------------------------------------
| jon | localhost | {"comment": "Some information about Jon"} |
+-------+------------+-------------------------------------------
1 row in set (0.00 sec)
```


You cannot use COMMENT and ATTRIBUTE together in the same CREATE USER statement; attempting to do so causes a syntax error. To set a user comment concurrently with setting a user attribute, use ATTRIBUTE and include in its argument a value with a comment key, like this:
```
mysql> CREATE USER 'bill'@'localhost'
    -> ATTRIBUTE '{"fname":"William", "lname":"Schmidt",
    -> "comment":"Website developer"}';
Query OK, 0 rows affected (0.16 sec)
```


Since the content of the ATTRIBUTE row is a JSON object, you can employ any appropriate MySQL JSON functions or operators to manipulate it, as shown here:
```
mysql> SELECT
    -> USER AS User,
    -> HOST AS Host,
    -> CONCAT(ATTRIBUTE->>"$.fname"," ",ATTRIBUTE->>"$.lname") AS 'Full Name',
    -> ATTRIBUTE->>"$.comment" AS Comment
    -> FROM INFORMATION_SCHEMA.USER_ATTRIBUTES
    -> WHERE USER='bill' AND HOST='localhost';
+------+------------+-----------------+------------------+
| User | Host | Full Name | Comment |
+------+------------+-----------------+-------------------
| bill | localhost | William Schmidt | Website developer |
+-------+------------+-----------------+------------------+
1 row in set (0.00 sec)
```


To set or to make changes in the user comment or user attribute for an existing user, you can use a COMMENT or ATTRIBUTE option with an ALTER USER statement.

Because the user comment and user attribute are stored together internally in a single JSON column, this sets an upper limit on their maximum combined size; see JSON Storage Requirements, for more information.

See also the description of the Information Schema USER_ATTRIBUTES table for more information and examples.

\section*{CREATE USER Account-Locking Options}

MySQL supports account locking and unlocking using the ACCOUNT LOCK and ACCOUNT UNLOCK options, which specify the locking state for an account. For additional discussion, see Section 8.2.20, "Account Locking".

If multiple account-locking options are specified, the last one takes precedence.

\section*{CREATE USER Binary Logging}

CREATE USER is written to the binary log if it succeeds, but not if it fails; in that case, rollback occurs and no changes are made. A statement written to the binary log includes all named users. If the IF NOT EXISTS clause is given, this includes even users that already exist and were not created.

The statement written to the binary log specifies an authentication plugin for each user, determined as follows:
- The plugin named in the original statement, if one was specified.
- Otherwise, the default authentication plugin. In particular, if a user u1 already exists and uses a nondefault authentication plugin, the statement written to the binary log for CREATE USER IF NOT EXISTS u1 names the default authentication plugin. (If the statement written to the binary log must specify a nondefault authentication plugin for a user, include it in the original statement.)

If the server adds the default authentication plugin for any nonexisting users in the statement written to the binary log, it writes a warning to the error log naming those users.

If the original statement specifies the FAILED_LOGIN_ATTEMPTS or PASSWORD_LOCK_TIME option, the statement written to the binary log includes the option.

CREATE USER statements with clauses that support multifactor authentication (MFA) are written to the binary log.
- CREATE USER ... IDENTIFIED WITH .. INITIAL AUTHENTICATION IDENTIFIED WITH . . . statements are written to the binary log as CREATE USER . . IDENTIFIED WITH . . INITIAL AUTHENTICATION IDENTIFIED WITH .. AS 'password-hash', where the password-hash is the user-specified auth-string or the random password generated by server when the RANDOM PASSWORD clause is specified.

\subsection*{15.7.1.4 DROP ROLE Statement}

DROP ROLE [IF EXISTS] role [, role ] ...
DROP ROLE removes one or more roles (named collections of privileges). To use this statement, you must have the global DROP ROLE or CREATE USER privilege. When the read_only system variable is enabled, DROP ROLE additionally requires the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege).

Users who have the CREATE USER privilege can use this statement to drop accounts that are locked or unlocked. Users who have the DROP ROLE privilege can use this statement only to drop accounts that are locked (unlocked accounts are presumably user accounts used to log in to the server and not just as roles).

Roles named in the mandatory_roles system variable value cannot be dropped.
DROP ROLE either succeeds for all named roles or rolls back and has no effect if any error occurs. By default, an error occurs if you try to drop a role that does not exist. If the IF EXISTS clause is given, the statement produces a warning for each named role that does not exist, rather than an error.

The statement is written to the binary log if it succeeds, but not if it fails; in that case, rollback occurs and no changes are made. A statement written to the binary log includes all named roles. If the IF EXISTS clause is given, this includes even roles that do not exist and were not dropped.

Each role name uses the format described in Section 8.2.5, "Specifying Role Names". For example:
DROP ROLE 'admin', 'developer';
DROP ROLE 'webapp'@'localhost';
The host name part of the role name, if omitted, defaults to ' $\%$ '.
A dropped role is automatically revoked from any user account (or role) to which the role was granted. Within any current session for such an account, its adjusted privileges apply beginning with the next statement executed.

For role usage examples, see Section 8.2.10, "Using Roles".

\subsection*{15.7.1.5 DROP USER Statement}

DROP USER [IF EXISTS] user [, user] ...
The DROP USER statement removes one or more MySQL accounts and their privileges. It removes privilege rows for the account from all grant tables.

Roles named in the mandatory_roles system variable value cannot be dropped.
To use DROP USER, you must have the global CREATE USER privilege, or the DELETE privilege for the mysql system schema. When the read_only system variable is enabled, DROP USER additionally requires the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege).

DROP USER fails with an error if any account to be dropped is named as the DEFINER attribute for any stored object. (That is, the statement fails if dropping an account would cause a stored object to become orphaned.) To perform the operation anyway, you must have the SET_ANY_DEFINER or ALLOW_NONEXISTENT_DEFINER privilege; in this case, the statement succeeds with a warning rather than failing with an error. For additional information, including how to identify which objects name a given account as the DEFINER attribute, see Orphan Stored Objects.

DROP USER either succeeds for all named users or rolls back and has no effect if any error occurs. By default, an error occurs if you try to drop a user that does not exist. If the IF EXISTS clause is given, the statement produces a warning for each named user that does not exist, rather than an error.

The statement is written to the binary log if it succeeds, but not if it fails; in that case, rollback occurs and no changes are made. A statement written to the binary log includes all named users. If the IF EXISTS clause is given, this includes even users that do not exist and were not dropped.

Each account name uses the format described in Section 8.2.4, "Specifying Account Names". For example:

DROP USER 'jeffrey'@'localhost';
The host name part of the account name, if omitted, defaults to ${ }^{\prime} \%^{\prime}$.

\section*{Important}

DROP USER does not automatically close any open user sessions. Rather, in the event that a user with an open session is dropped, the statement does not take effect until that user's session is closed. Once the session is closed, the user is dropped, and that user's next attempt to log in fails. This is by design.

DROP USER does not automatically drop or invalidate databases or objects within them that the old user created. This includes stored programs or views for which the DEFINER attribute names the dropped user. Attempts to access such objects may produce an error if they execute in definer security context. (For information about security context, see Section 27.6, "Stored Object Access Control".)

\subsection*{15.7.1.6 GRANT Statement}
```
GRANT
        priv_type [(column_list)]
            [, priv_type [(column_list)]] ...
        ON [object_type] priv_level
        TO user_or_role [, user_or_role] ...
        [WITH GRANT OPTION]
        [AS user
                [WITH ROLE
                        DEFAULT
                    | NONE
                    | ALL
                    | ALL EXCEPT role [, role ] ...
                    | role [, role ] ...
                ]
        ]
}
GRANT PROXY ON user_or_role
        TO user_or_role [, user_or_role] ...
        [WITH GRANT OPTION]
GRANT role [, role] ...
        TO user_or_role [, user_or_role] ...
        [WITH ADMIN OPTION]
object_type: {
        TABLE
    | FUNCTION
    | PROCEDURE
}
priv_level: {
        *
    | *. *
    | db_name.*
    | db_name.tbl_name
    | tbl_name
    | db_name.routine_name
}
```

```
user_or_role: {
        user (see Section 8.2.4, "Specifying Account Names")
    | role (see Section 8.2.5, "Specifying Role Names")
}
```


The GRANT statement assigns privileges and roles to MySQL user accounts and roles. There are several aspects to the GRANT statement, described under the following topics:
- GRANT General Overview
- Object Quoting Guidelines
- Account Names
- Privileges Supported by MySQL
- Global Privileges
- Database Privileges
- Table Privileges
- Column Privileges
- Stored Routine Privileges
- Proxy User Privileges
- Granting Roles
- The AS Clause and Privilege Restrictions
- Other Account Characteristics
- MySQL and Standard SQL Versions of GRANT

\section*{GRANT General Overview}

The GRANT statement enables system administrators to grant privileges and roles, which can be granted to user accounts and roles. These syntax restrictions apply:
- GRANT cannot mix granting both privileges and roles in the same statement. A given GRANT statement must grant either privileges or roles.
- The ON clause distinguishes whether the statement grants privileges or roles:
- With ON, the statement grants privileges.
- Without ON, the statement grants roles.
- It is permitted to assign both privileges and roles to an account, but you must use separate GRANT statements, each with syntax appropriate to what is to be granted.

For more information about roles, see Section 8.2.10, "Using Roles".
To grant a privilege with GRANT, you must have the GRANT OPTION privilege, and you must have the privileges that you are granting. (Alternatively, if you have the UPDATE privilege for the grant tables in the mysql system schema, you can grant any account any privilege.) When the read_only system variable is enabled, GRANT additionally requires the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege).

GRANT either succeeds for all named users and roles or rolls back and has no effect if any error occurs. The statement is written to the binary log only if it succeeds for all named users and roles.

The REVOKE statement is related to GRANT and enables administrators to remove account privileges. See Section 15.7.1.8, "REVOKE Statement".

Each account name uses the format described in Section 8.2.4, "Specifying Account Names". Each role name uses the format described in Section 8.2.5, "Specifying Role Names". For example:
```
GRANT ALL ON db1.* TO 'jeffrey'@'localhost';
GRANT 'role1', 'role2' TO 'user1'@'localhost', 'user2'@'localhost';
GRANT SELECT ON world.* TO 'role3';
```


The host name part of the account or role name, if omitted, defaults to ' $\%$ '.
Normally, a database administrator first uses CREATE USER to create an account and define its nonprivilege characteristics such as its password, whether it uses secure connections, and limits on access to server resources, then uses GRANT to define its privileges. ALTER USER may be used to change the nonprivilege characteristics of existing accounts. For example:
```
CREATE USER 'jeffrey'@'localhost' IDENTIFIED BY 'password';
GRANT ALL ON db1.* TO 'jeffrey'@'localhost';
GRANT SELECT ON db2.invoice TO 'jeffrey'@'localhost';
ALTER USER 'jeffrey'@'localhost' WITH MAX_QUERIES_PER_HOUR 90;
```


From the mysql program, GRANT responds with Query OK, 0 rows affected when executed successfully. To determine what privileges result from the operation, use SHOW GRANTS. See Section 15.7.7.22, "SHOW GRANTS Statement".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2845.jpg?height=109&width=104&top_left_y=1105&top_left_x=365)

\section*{Important}

Under some circumstances, GRANT may be recorded in server logs or on the client side in a history file such as ~/. mysql_history, which means that cleartext passwords may be read by anyone having read access to that information. For information about the conditions under which this occurs for the server logs and how to control it, see Section 8.1.2.3, "Passwords and Logging". For similar information about client-side logging, see Section 6.5.1.3, "mysql Client Logging".

GRANT supports host names up to 255 characters long. User names can be up to 32 characters. Database, table, column, and routine names can be up to 64 characters.

\section*{Warning}

Do not attempt to change the permissible length for user names by altering the mysql. user system table. Doing so results in unpredictable behavior which may even make it impossible for users to log in to the MySQL server. Never alter the structure of tables in the mysql system schema in any manner except by means of the procedure described in Chapter 3, Upgrading MySQL.

\section*{Object Quoting Guidelines}

Several objects within GRANT statements are subject to quoting, although quoting is optional in many cases: Account, role, database, table, column, and routine names. For example, if a user_name or host_name value in an account name is legal as an unquoted identifier, you need not quote it. However, quotation marks are necessary to specify a user_name string containing special characters (such as -), or a host_name string containing special characters or wildcard characters such as \% (for example, 'test-user'@'\%.com'). Quote the user name and host name separately.

To specify quoted values:
- Quote database, table, column, and routine names as identifiers.
- Quote user names and host names as identifiers or as strings.
- Quote passwords as strings.

For string-quoting and identifier-quoting guidelines, see Section 11.1.1, "String Literals", and Section 11.2, "Schema Object Names".

\section*{Important}

The use of the wildcard characters \% and _ as described in the next few paragraphs is deprecated, and thus subject to removal in a future version of MySQL. The _ and \% wildcards are permitted when specifying database names in GRANT statements that grant privileges at the database level (GRANT ... ON db_name.*). This means, for example, that to use a _ character as part of a database name, specify it using the \escape character as \_ in the GRANT statement, to prevent the user from being able to access additional databases matching the wildcard pattern (for example, GRANT ... ON ˋfoo\_barˋ . * TO ...).

Issuing multiple GRANT statements containing wildcards may not have the expected effect on DML statements; when resolving grants involving wildcards, MySQL takes only the first matching grant into consideration. In other words, if a user has two database-level grants using wildcards that match the same database, the grant which was created first is applied. Consider the database db and table t created using the statements shown here:
```
mysql> CREATE DATABASE db;
Query OK, 1 row affected (0.01 sec)
mysql> CREATE TABLE db.t (c INT);
Query OK, 0 rows affected (0.01 sec)
mysql> INSERT INTO db.t VALUES ROW(1);
Query OK, 1 row affected (0.00 sec)
```


Next (assuming that the current account is the MySQL root account or another account having the necessary privileges), we create a user u then issue two GRANT statements containing wildcards, like this:
```
mysql> CREATE USER u;
Query OK, 0 rows affected (0.01 sec)
mysql> GRANT SELECT ON ˋd_ˋ.* TO u;
Query OK, 0 rows affected (0.01 sec)
mysql> GRANT INSERT ON ˋd%ˋ.* TO u;
Query OK, 0 rows affected (0.00 sec)
mysql> EXIT
Bye
```


If we end the session and then log in again with the mysql client, this time as $u$, we see that this account has only the privilege provided by the first matching grant, but not the second:
```
$> mysql -uu -hlocalhost
Welcome to the MySQL monitor. Commands end with ; or \g.
Your MySQL connection id is 10
Server version: 8.4.9-tr Source distribution
Copyright (c) 2000, 2023, Oracle and/or its affiliates.
Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.
Type 'help;' or '\h' for help. Type '\c' to clear the current input
statement.
mysql> TABLE db.t;
+------+
| c |
+------+
| 1 |
+------+
1 row in set (0.00 sec)
```

```
mysql> INSERT INTO db.t VALUES ROW(2);
ERROR 1142 (42000): INSERT command denied to user 'u'@'localhost' for table 't'
```


In privilege assignments, MySQL interprets occurrences of unescaped _ and \% SQL wildcard characters in database names as literal characters under these circumstances:
- When a database name is not used to grant privileges at the database level, but as a qualifier for granting privileges to some other object such as a table or routine (for example, GRANT . . . ON db_name.tbl_name).
- Enabling partial_revokes causes MySQL to interpret unescaped _ and \% wildcard characters in database names as literal characters, just as if they had been escaped as \_and \\%. Because this changes how MySQL interprets privileges, it may be advisable to avoid unescaped wildcard characters in privilege assignments for installations where partial_revokes may be enabled. For more information, see Section 8.2.12, "Privilege Restriction Using Partial Revokes".

\section*{Account Names}

A user value in a GRANT statement indicates a MySQL account to which the statement applies. To accommodate granting rights to users from arbitrary hosts, MySQL supports specifying the user value in the form 'user_name'@'host_name'.

You can specify wildcards in the host name. For example, 'user_name'@'\%.example.com' applies to user_name for any host in the example.com domain, and 'user_name'@'198.51.100.\%' applies to user_name for any host in the 198.51.100 class C subnet.

The simple form 'user_name' is a synonym for 'user_name'@'\%'.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2847.jpg?height=209&width=266&top_left_y=1336&top_left_x=367)

\section*{Note}

MySQL automatically assigns all privileges granted to 'username'@'\%' to the 'username'@'localhost' account as well. This behavior is deprecated, and is subject to removal in a future version of MySQL.

MySQL does not support wildcards in user names. To refer to an anonymous user, specify an account with an empty user name with the GRANT statement:
```
GRANT ALL ON test.* TO ''@'localhost' ...;
```


In this case, any user who connects from the local host with the correct password for the anonymous user is permitted access, with the privileges associated with the anonymous-user account.

For additional information about user name and host name values in account names, see Section 8.2.4, "Specifying Account Names".

\section*{Privileges Supported by MySQL}

The following tables summarize the permissible static and dynamic priv_type privilege types that can be specified for the GRANT and REVOKE statements, and the levels at which each privilege can be granted. For additional information about each privilege, see Section 8.2.2, "Privileges Provided by MySQL". For information about the differences between static and dynamic privileges, see Static Versus Dynamic Privileges.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 15.11 Permissible Static Privileges for GRANT and REVOKE}
\begin{tabular}{|l|l|}
\hline Privilege & Meaning and Grantable Levels \\
\hline ALL [PRIVILEGES] & Grant all privileges at specified access level except GRANT OPTION and PROXY. \\
\hline ALTER & Enable use of ALTER TABLE. Levels: Global, database, table. \\
\hline ALTER ROUTINE & Enable stored routines to be altered or dropped. Levels: Global, database, routine. \\
\hline CREATE & Enable database and table creation. Levels: Global, database, table. \\
\hline CREATE ROLE & Enable role creation. Level: Global. \\
\hline CREATE ROUTINE & Enable stored routine creation. Levels: Global, database. \\
\hline CREATE TABLESPACE & Enable tablespaces and log file groups to be created, altered, or dropped. Level: Global. \\
\hline CREATE TEMPORARY TABLES & Enable use of CREATE TEMPORARY TABLE. Levels: Global, database. \\
\hline CREATE USER & Enable use of CREATE USER, DROP USER, RENAME USER, and REVOKE ALL PRIVILEGES. Level: Global. \\
\hline CREATE VIEW & Enable views to be created or altered. Levels: Global, database, table. \\
\hline DELETE & Enable use of DELETE. Level: Global, database, table. \\
\hline DROP & Enable databases, tables, and views to be dropped. Levels: Global, database, table. \\
\hline DROP ROLE & Enable roles to be dropped. Level: Global. \\
\hline EVENT & Enable use of events for the Event Scheduler. Levels: Global, database. \\
\hline EXECUTE & Enable the user to execute stored routines. Levels: Global, database, routine. \\
\hline FILE & Enable the user to cause the server to read or write files. Level: Global. \\
\hline FLUSH_PRIVILEGES & Enable the user to issue FLUSH PRIVILEGES statements. Level: Global. \\
\hline GRANT OPTION & Enable privileges to be granted to or removed from other accounts. Levels: Global, database, table, routine, proxy. \\
\hline INDEX & Enable indexes to be created or dropped. Levels: Global, database, table. \\
\hline INSERT & Enable use of INSERT. Levels: Global, database, table, column. \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Privilege & Meaning and Grantable Levels \\
\hline LOCK TABLES & Enable use of LOCK TABLES on tables for which you have the SELECT privilege. Levels: Global, database. \\
\hline OPTIMIZE_LOCAL_TABLE & Enable use of OPTIMIZE LOCAL TABLE or OPTIMIZE NO_WRITE_TO_BINLOG TABLE. Levels: Global, database, table. \\
\hline PROCESS & Enable the user to see all processes with SHOW PROCESSLIST. Level: Global. \\
\hline PROXY & Enable user proxying. Level: From user to user. \\
\hline REFERENCES & Enable foreign key creation. Levels: Global, database, table, column. \\
\hline RELOAD & Enable use of FLUSH operations. Level: Global. \\
\hline REPLICATION CLIENT & Enable the user to ask where source or replica servers are. Level: Global. \\
\hline REPLICATION SLAVE & Enable replicas to read binary log events from the source. Level: Global. \\
\hline SELECT & Enable use of SELECT. Levels: Global, database, table, column. \\
\hline SHOW DATABASES & Enable SHOW DATABASES to show all databases. Level: Global. \\
\hline SHOW VIEW & Enable use of SHOW CREATE VIEW. Levels: Global, database, table. \\
\hline SHUTDOWN & Enable use of mysqladmin shutdown. Level: Global. \\
\hline SUPER & Enable use of other administrative operations such as CHANGE REPLICATION SOURCE TO, KILL, PURGE BINARY LOGS, SET GLOBAL, and mysqladmin debug command. Level: Global. \\
\hline TRIGGER & Enable trigger operations. Levels: Global, database, table. \\
\hline UPDATE & Enable use of UPDATE. Levels: Global, database, table, column. \\
\hline USAGE & Synonym for "no privileges" \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 15.12 Permissible Dynamic Privileges for GRANT and REVOKE}
\begin{tabular}{|l|l|}
\hline Privilege & Meaning and Grantable Levels \\
\hline APPLICATION_PASSWORD_ADMIN & Enable dual password administration. Level: Global. \\
\hline AUDIT_ABORT_EXEMPT & Allow queries blocked by audit log filter. Level: Global. \\
\hline AUDIT_ADMIN & Enable audit log configuration. Level: Global. \\
\hline AUTHENTICATION_POLICY_ADMIN & Enable authentication policy administration. Level: Global. \\
\hline BACKUP_ADMIN & Enable backup administration. Level: Global. \\
\hline BINLOG_ADMIN & Enable binary log control. Level: Global. \\
\hline BINLOG_ENCRYPTION_ADMIN & Enable activation and deactivation of binary log encryption. Level: Global. \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Privilege & Meaning and Grantable Levels \\
\hline CLONE_ADMIN & Enable clone administration. Level: Global. \\
\hline CONNECTION_ADMIN & Enable connection limit/restriction control. Level: Global. \\
\hline ENCRYPTION_KEY_ADMIN & Enable InnoDB key rotation. Level: Global. \\
\hline FIREWALL_ADMIN & Enable firewall rule administration, any user. Level: Global. \\
\hline FIREWALL_EXEMPT & Exempt user from firewall restrictions. Level: Global. \\
\hline FIREWALL_USER & Enable firewall rule administration, self. Level: Global. \\
\hline FLUSH_OPTIMIZER_COSTS & Enable optimizer cost reloading. Level: Global. \\
\hline FLUSH_STATUS & Enable status indicator flushing. Level: Global. \\
\hline FLUSH_TABLES & Enable table flushing. Level: Global. \\
\hline FLUSH_USER_RESOURCES & Enable user-resource flushing. Level: Global. \\
\hline GROUP_REPLICATION_ADMIN & Enable Group Replication control. Level: Global. \\
\hline INNODB_REDO_LOG_ARCHIVE & Enable redo log archiving administration. Level: Global. \\
\hline INNODB_REDO_LOG_ENABLE & Enable or disable redo logging. Level: Global. \\
\hline NDB_STORED_USER & Enable sharing of user or role between SQL nodes (NDB Cluster). Level: Global. \\
\hline PASSWORDLESS_USER_ADMIN & Enable passwordless user account administration. Level: Global. \\
\hline PERSIST_RO_VARIABLES_ADMIN & Enable persisting read-only system variables. Level: Global. \\
\hline REPLICATION_APPLIER & Act as the PRIVILEGE_CHECKS_USER for a replication channel. Level: Global. \\
\hline REPLICATION_SLAVE_ADMIN & Enable regular replication control. Level: Global. \\
\hline RESOURCE_GROUP_ADMIN & Enable resource group administration. Level: Global. \\
\hline RESOURCE_GROUP_USER & Enable resource group administration. Level: Global. \\
\hline ROLE_ADMIN & Enable roles to be granted or revoked, use of WITH ADMIN OPTION. Level: Global. \\
\hline SESSION_VARIABLES_ADMIN & Enable setting restricted session system variables. Level: Global. \\
\hline SHOW_ROUTINE & Enable access to stored routine definitions. Level: Global. \\
\hline SKIP_QUERY_REWRITE & Do not rewrite queries executed by this user. Level: Global. \\
\hline SYSTEM_USER & Designate account as system account. Level: Global. \\
\hline SYSTEM_VARIABLES_ADMIN & Enable modifying or persisting global system variables. Level: Global. \\
\hline TABLE_ENCRYPTION_ADMIN & Enable overriding default encryption settings. Level: Global. \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Privilege & Meaning and Grantable Levels \\
\hline TELEMETRY_LOG_ADMIN & Enable telemetry log configuration for MySQL HeatWave on AWS. Level: Global. \\
\hline TP_CONNECTION_ADMIN & Enable thread pool connection administration. Level: Global. \\
\hline VERSION_TOKEN_ADMIN & Enable use of Version Tokens functions. Level: Global. \\
\hline XA_RECOVER_ADMIN & Enable XA RECOVER execution. Level: Global. \\
\hline
\end{tabular}

A trigger is associated with a table. To create or drop a trigger, you must have the TRIGGER privilege for the table, not the trigger.

In GRANT statements, the ALL [PRIVILEGES] or PROXY privilege must be named by itself and cannot be specified along with other privileges. ALL [PRIVILEGES] stands for all privileges available for the level at which privileges are to be granted except for the GRANT OPTION and PROXY privileges.

MySQL account information is stored in the tables of the mysql system schema. For additional details, consult Section 8.2, "Access Control and Account Management", which discusses the mysql system schema and the access control system extensively.

If the grant tables hold privilege rows that contain mixed-case database or table names and the lower_case_table_names system variable is set to a nonzero value, REVOKE cannot be used to revoke these privileges. It is necessary in such cases to manipulate the grant tables directly. (GRANT does not create such rows when lower_case_table_names is set, but such rows might have been created prior to setting that variable. The lower_case_table_names setting can only be configured at server startup.)

Privileges can be granted at several levels, depending on the syntax used for the ON clause. For REVOKE, the same ON syntax specifies which privileges to remove.

For the global, database, table, and routine levels, GRANT ALL assigns only the privileges that exist at the level you are granting. For example, GRANT ALL ON db_name .* is a database-level statement, so it does not grant any global-only privileges such as FILE. Granting ALL does not assign the GRANT OPTION or PROXY privilege.

The object_type clause, if present, should be specified as TABLE, FUNCTION, or PROCEDURE when the following object is a table, a stored function, or a stored procedure.

The privileges that a user holds for a database, table, column, or routine are formed additively as the logical OR of the account privileges at each of the privilege levels, including the global level. It is not possible to deny a privilege granted at a higher level by absence of that privilege at a lower level. For example, this statement grants the SELECT and INSERT privileges globally:

GRANT SELECT, INSERT ON *.* TO u1;
The globally granted privileges apply to all databases, tables, and columns, even though not granted at any of those lower levels.

It is possible to deny explicitly a privilege granted at the global level by revoking it for particular databases, if the partial_revokes system variable is enabled:

GRANT SELECT, INSERT, UPDATE ON *.* TO u1;
REVOKE INSERT, UPDATE ON db1.* FROM u1;
The result of the preceding statements is that SELECT applies globally to all tables, whereas INSERT and UPDATE apply globally except to tables in db1. Account access to db1 is read only.

Details of the privilege-checking procedure are presented in Section 8.2.7, "Access Control, Stage 2: Request Verification".

If you are using table, column, or routine privileges for even one user, the server examines table, column, and routine privileges for all users and this slows down MySQL a bit. Similarly, if you limit the number of queries, updates, or connections for any users, the server must monitor these values.

MySQL enables you to grant privileges on databases or tables that do not exist. For tables, the privileges to be granted must include the CREATE privilege. This behavior is by design, and is intended to enable the database administrator to prepare user accounts and privileges for databases or tables that are to be created at a later time.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2852.jpg?height=99&width=104&top_left_y=621&top_left_x=301)

\section*{Important}

MySQL does not automatically revoke any privileges when you drop a database or table. However, if you drop a routine, any routine-level privileges granted for that routine are revoked.

\section*{Global Privileges}

Global privileges are administrative or apply to all databases on a given server. To assign global privileges, use ON * . * syntax:

GRANT ALL ON *.* TO 'someuser'@'somehost';
GRANT SELECT, INSERT ON *.* TO 'someuser'@'somehost';
The CREATE TABLESPACE, CREATE USER, FILE, PROCESS, RELOAD, REPLICATION CLIENT, REPLICATION SLAVE, SHOW DATABASES, SHUTDOWN, and SUPER, CREATE ROLE and DROP ROLE static privileges are administrative and can only be granted globally.

Dynamic privileges are all global and can only be granted globally.
Other privileges can be granted globally or at more specific levels.
The effect of GRANT OPTION granted at the global level differs for static and dynamic privileges:
- GRANT OPTION granted for any static global privilege applies to all static global privileges.
- GRANT OPTION granted for any dynamic privilege applies only to that dynamic privilege.

GRANT ALL at the global level grants all static global privileges and all currently registered dynamic privileges. A dynamic privilege registered subsequent to execution of the GRANT statement is not granted retroactively to any account.

MySQL stores global privileges in the mysql. user system table.

\section*{Database Privileges}

Database privileges apply to all objects in a given database. To assign database-level privileges, use ON db_name.* syntax:

GRANT ALL ON mydb.* TO 'someuser'@'somehost';
GRANT SELECT, INSERT ON mydb.* TO 'someuser'@'somehost';
If you use ON * syntax (rather than ON * *), privileges are assigned at the database level for the default database. An error occurs if there is no default database.

The CREATE, DROP, EVENT, GRANT OPTION, LOCK TABLES, and REFERENCES privileges can be specified at the database level. Table or routine privileges also can be specified at the database level, in which case they apply to all tables or routines in the database.

MySQL stores database privileges in the mysql. db system table.

\section*{Table Privileges}

Table privileges apply to all columns in a given table. To assign table-level privileges, use ON db_name.tbl_name syntax:

GRANT ALL ON mydb.mytbl TO 'someuser'@'somehost';
GRANT SELECT, INSERT ON mydb.mytbl TO 'someuser'@'somehost';
If you specify tbl_name rather than db_name,tbl_name, the statement applies to tbl_name in the default database. An error occurs if there is no default database.

The permissible priv_type values at the table level are ALTER, CREATE VIEW, CREATE, DELETE, DROP, GRANT OPTION, INDEX, INSERT, REFERENCES, SELECT, SHOW VIEW, TRIGGER, and UPDATE.

Table-level privileges apply to base tables and views. They do not apply to tables created with CREATE TEMPORARY TABLE, even if the table names match. For information about TEMPORARY table privileges, see Section 15.1.20.2, "CREATE TEMPORARY TABLE Statement".

MySQL stores table privileges in the mysql.tables_priv system table.

\section*{Column Privileges}

Column privileges apply to single columns in a given table. Each privilege to be granted at the column level must be followed by the column or columns, enclosed within parentheses.
```
GRANT SELECT (col1), INSERT (col1, col2) ON mydb.mytbl TO 'someuser'@'somehost';
```


The permissible priv_type values for a column (that is, when you use a column_list clause) are INSERT, REFERENCES, SELECT, and UPDATE.

MySQL stores column privileges in the mysql.columns_priv system table.

\section*{Stored Routine Privileges}

The ALTER ROUTINE, CREATE ROUTINE, EXECUTE, and GRANT OPTION privileges apply to stored routines (procedures and functions). They can be granted at the global and database levels. Except for CREATE ROUTINE, these privileges can be granted at the routine level for individual routines.
```
GRANT CREATE ROUTINE ON mydb.* TO 'someuser'@'somehost';
GRANT EXECUTE ON PROCEDURE mydb.myproc TO 'someuser'@'somehost';
```


The permissible priv_type values at the routine level are ALTER ROUTINE, EXECUTE, and GRANT OPTION. CREATE ROUTINE is not a routine-level privilege because you must have the privilege at the global or database level to create a routine in the first place.

MySQL stores routine-level privileges in the mysql.procs_priv system table.

\section*{Proxy User Privileges}

The PROXY privilege enables one user to be a proxy for another. The proxy user impersonates or takes the identity of the proxied user; that is, it assumes the privileges of the proxied user.
```
GRANT PROXY ON 'localuser'@'localhost' TO 'externaluser'@'somehost';
```


When PROXY is granted, it must be the only privilege named in the GRANT statement, and the only permitted WITH option is WITH GRANT OPTION.

Proxying requires that the proxy user authenticate through a plugin that returns the name of the proxied user to the server when the proxy user connects, and that the proxy user have the PROXY privilege for the proxied user. For details and examples, see Section 8.2.19, "Proxy Users".

MySQL stores proxy privileges in the mysql.proxies_priv system table.

\section*{Granting Roles}

GRANT syntax without an ON clause grants roles rather than individual privileges. A role is a named collection of privileges; see Section 8.2.10, "Using Roles". For example:
```
GRANT 'role1', 'role2' TO 'user1'@'localhost', 'user2'@'localhost';
```


Each role to be granted must exist, as well as each user account or role to which it is to be granted. Roles cannot be granted to anonymous users.

Granting a role does not automatically cause the role to be active. For information about role activation and inactivation, see Activating Roles.

These privileges are required to grant roles:
- If you have the ROLE_ADMIN privilege (or the deprecated SUPER privilege), you can grant or revoke any role to users or roles.
- If you were granted a role with a GRANT statement that includes the WITH ADMIN OPTION clause, you become able to grant that role to other users or roles, or revoke it from other users or roles, as long as the role is active at such time as you subsequently grant or revoke it. This includes the ability to use WITH ADMIN OPTION itself.
- To grant a role that has the SYSTEM_USER privilege, you must have the SYSTEM_USER privilege.

It is possible to create circular references with GRANT. For example:
```
CREATE USER 'u1', 'u2';
CREATE ROLE 'r1', 'r2';
GRANT 'u1' TO 'u1'; -- simple loop: u1 => u1
GRANT 'r1' TO 'r1'; -- simple loop: r1 => r1
GRANT 'r2' TO 'u2';
GRANT 'u2' TO 'r2'; -- mixed user/role loop: u2 => r2 => u2
```


Circular grant references are permitted but add no new privileges or roles to the grantee because a user or role already has its privileges and roles.

\section*{The AS Clause and Privilege Restrictions}

GRANT can specify additional information about the privilege context to use for statement execution by using an AS user [WITH ROLE] clause. This syntax is visible at the SQL level, although its primary purpose is to enable uniform replication across all nodes of grantor privilege restrictions imposed by partial revokes, by causing those restrictions to appear in the binary log. For information about partial revokes, see Section 8.2.12, "Privilege Restriction Using Partial Revokes".

When the AS user clause is specified, statement execution takes into account any privilege restrictions associated with the named user, including all roles specified by WITH ROLE, if present. The result is that the privileges actually granted by the statement may be reduced relative to those specified.

These conditions apply to the AS user clause:
- AS has an effect only when the named user has privilege restrictions (which implies that the partial_revokes system variable is enabled).
- If WITH ROLE is given, all roles named must be granted to the named user.
- The named user should be a MySQL account specified as 'user_name'@'host_name', CURRENT_USER, or CURRENT_USER( ). The current user may be named together with WITH ROLE for the case that the executing user wants GRANT to execute with a set of roles applied that may differ from the roles active within the current session.
- AS cannot be used to gain privileges not possessed by the user who executes the GRANT statement. The executing user must have at least the privileges to be granted, but the AS clause can only restrict the privileges granted, not escalate them.
- With respect to the privileges to be granted, AS cannot specify a user/role combination that has more privileges (fewer restrictions) than the user who executes the GRANT statement. The AS user/role
combination is permitted to have more privileges than the executing user, but only if the statement does not grant those additional privileges.
- AS is supported only for granting global privileges (ON * *).
- AS is not supported for PROXY grants.

The following example illustrates the effect of the AS clause. Create a user u1 that has some global privileges, as well as restrictions on those privileges:
```
CREATE USER u1;
GRANT SELECT, INSERT, UPDATE, DELETE ON *.* TO u1;
REVOKE INSERT, UPDATE ON schema1.* FROM u1;
REVOKE SELECT ON schema2.* FROM u1;
```


Also create a role r 1 that lifts some of the privilege restrictions and grant the role to u 1 :
```
CREATE ROLE r1;
GRANT INSERT ON schema1.* TO r1;
GRANT SELECT ON schema2.* TO r1;
GRANT r1 TO u1;
```


Now, using an account that has no privilege restrictions of its own, grant to multiple users the same set of global privileges, but each with different restrictions imposed by the AS clause, and check which privileges are actually granted.
- The GRANT statement here has no AS clause, so the privileges granted are exactly those specified:
```
mysql> CREATE USER u2;
mysql> GRANT SELECT, INSERT, UPDATE ON *.* TO u2;
mysql> SHOW GRANTS FOR u2;
+---------------------------------------------------+
| Grants for u2@%
+----------------------------------------------------
| GRANT SELECT, INSERT, UPDATE ON *.* TO ˋu2ˋ @ˋ%ˋ |
+----------------------------------------------------
```

- The GRANT statement here has an AS clause, so the privileges granted are those specified but with the restrictions from u1 applied:
```
mysql> CREATE USER u3;
mysql> GRANT SELECT, INSERT, UPDATE ON *.* TO u3 AS u1;
mysql> SHOW GRANTS FOR u3;
+-------------------------------------------------------
| Grants for u3@% |
+-----------------------------------------------------+
    GRANT SELECT, INSERT, UPDATE ON *.* TO ˋu3ˋ@ˋ%ˋ
    REVOKE INSERT, UPDATE ON ˋschema1ˋ.* FROM ˋu3ˋ@ˋ%ˋ
    REVOKE SELECT ON ˋschema2ˋ.* FROM ˋu3ˋ@ˋ%ˋ |
+------------------------------------------------------+
```


As mentioned previously, the AS clause can only add privilege restrictions; it cannot escalate privileges. Thus, although u1 has the DELETE privilege, that is not included in the privileges granted because the statement does not specify granting DELETE.
- The AS clause for the GRANT statement here makes the role r 1 active for u 1 . That role lifts some of the restrictions on u1. Consequently, the privileges granted have some restrictions, but not so many as for the previous GRANT statement:
```
mysql> CREATE USER u4;
mysql> GRANT SELECT, INSERT, UPDATE ON *.* TO u4 AS u1 WITH ROLE r1;
mysql> SHOW GRANTS FOR u4;
+-----------------------------------------------------
| Grants for u4@% |
+---------------------------------------------------+
| GRANT SELECT, INSERT, UPDATE ON *.* TO ˋu4ˋ@ˋ%ˋ |
| REVOKE UPDATE ON ˋschema1ˋ.* FROM ˋu4ˋ@ˋ%ˋ |
+----------------------------------------------------+
```


If a GRANT statement includes an AS user clause, privilege restrictions on the user who executes the statement are ignored (rather than applied as they would be in the absence of an AS clause).

\section*{Other Account Characteristics}

The optional WITH clause is used to enable a user to grant privileges to other users. The WITH GRANT OPTION clause gives the user the ability to give to other users any privileges the user has at the specified privilege level.

To grant the GRANT OPTION privilege to an account without otherwise changing its privileges, do this:
GRANT USAGE ON *.* TO 'someuser'@'somehost' WITH GRANT OPTION;
Be careful to whom you give the GRANT OPTION privilege because two users with different privileges may be able to combine privileges!

You cannot grant another user a privilege which you yourself do not have; the GRANT OPTION privilege enables you to assign only those privileges which you yourself possess.

Be aware that when you grant a user the GRANT OPTION privilege at a particular privilege level, any privileges the user possesses (or may be given in the future) at that level can also be granted by that user to other users. Suppose that you grant a user the INSERT privilege on a database. If you then grant the SELECT privilege on the database and specify WITH GRANT OPTION, that user can give to other users not only the SELECT privilege, but also INSERT. If you then grant the UPDATE privilege to the user on the database, the user can grant INSERT, SELECT, and UPDATE.

For a nonadministrative user, you should not grant the ALTER privilege globally or for the mysql system schema. If you do that, the user can try to subvert the privilege system by renaming tables!

For additional information about security risks associated with particular privileges, see Section 8.2.2, "Privileges Provided by MySQL".

\section*{MySQL and Standard SQL Versions of GRANT}

The biggest differences between the MySQL and standard SQL versions of GRANT are:
- MySQL associates privileges with the combination of a host name and user name and not with only a user name.
- Standard SQL does not have global or database-level privileges, nor does it support all the privilege types that MySQL supports.
- MySQL does not support the standard SQL UNDER privilege.
- Standard SQL privileges are structured in a hierarchical manner. If you remove a user, all privileges the user has been granted are revoked. This is also true in MySQL if you use DROP USER. See Section 15.7.1.5, "DROP USER Statement".
- In standard SQL, when you drop a table, all privileges for the table are revoked. In standard SQL, when you revoke a privilege, all privileges that were granted based on that privilege are also revoked. In MySQL, privileges can be dropped with DROP USER or REVOKE statements.
- In MySQL, it is possible to have the INSERT privilege for only some of the columns in a table. In this case, you can still execute INSERT statements on the table, provided that you insert values only for those columns for which you have the INSERT privilege. The omitted columns are set to their implicit default values if strict SQL mode is not enabled. In strict mode, the statement is rejected if any of the omitted columns have no default value. (Standard SQL requires you to have the INSERT privilege on all columns.) For information about strict SQL mode and implicit default values, see Section 7.1.11, "Server SQL Modes", and Section 13.6, "Data Type Default Values".

\subsection*{15.7.1.7 RENAME USER Statement}
```
RENAME USER old_user TO new_user
    [, old_user TO new_user] ...
```


The RENAME USER statement renames existing MySQL accounts. An error occurs for old accounts that do not exist or new accounts that already exist.

To use RENAME USER, you must have the global CREATE USER privilege, or the UPDATE privilege for the mysql system schema. When the read_only system variable is enabled, RENAME USER additionally requires the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege).

RENAME USER fails with an error if any account to be renamed is named as the DEFINER attribute for any stored object. (That is, the statement fails if renaming an account would cause a stored object to become orphaned.) To perform the operation anyway, you must have the SET_ANY_DEFINER or ALLOW_NONEXISTENT_DEFINER privilege; in this case, the statement succeeds with a warning rather than failing with an error. For additional information, including how to identify which objects name a given account as the DEFINER attribute, see Orphan Stored Objects.

Each account name uses the format described in Section 8.2.4, "Specifying Account Names". For example:

RENAME USER 'jeffrey'@'localhost' TO 'jeff'@'127.0.0.1';
The host name part of the account name, if omitted, defaults to ' $\%$ '.
RENAME USER causes the privileges held by the old user to be those held by the new user. However, RENAME USER does not automatically drop or invalidate databases or objects within them that the old user created. This includes stored programs or views for which the DEFINER attribute names the old user. Attempts to access such objects may produce an error if they execute in definer security context. (For information about security context, see Section 27.6, "Stored Object Access Control".)

The privilege changes take effect as indicated in Section 8.2.13, "When Privilege Changes Take Effect".

\subsection*{15.7.1.8 REVOKE Statement}
```
REVOKE [IF EXISTS]
        priv_type [(column_list)]
            [, priv_type [(column_list)]] ...
        ON [object_type] priv_level
        FROM user_or_role [, user_or_role] ...
        [IGNORE UNKNOWN USER]
REVOKE [IF EXISTS] ALL [PRIVILEGES], GRANT OPTION
        FROM user_or_role [, user_or_role] ...
        [IGNORE UNKNOWN USER]
REVOKE [IF EXISTS] PROXY ON user_or_role
        FROM user_or_role [, user_or_role] ...
        [IGNORE UNKNOWN USER]
REVOKE [IF EXISTS] role [, role ] ...
        FROM user_or_role [, user_or_role ] ...
        [IGNORE UNKNOWN USER]
user_or_role: {
        user (see Section 8.2.4, "Specifying Account Names")
    | role (see Section 8.2.5, "Specifying Role Names"
}
```


The REVOKE statement enables system administrators to revoke privileges and roles, which can be revoked from user accounts and roles.

For details on the levels at which privileges exist, the permissible priv_type,priv_level, and object_type values, and the syntax for specifying users and passwords, see Section 15.7.1.6, "GRANT Statement".

For information about roles, see Section 8.2.10, "Using Roles".
When the read_only system variable is enabled, REVOKE requires the CONNECTION_ADMIN or privilege (or the deprecated SUPER privilege), in addition to any other required privileges described in the following discussion.

All the forms shown for REVOKE support an IF EXISTS option as well as an IGNORE UNKNOWN USER option. With neither of these modifications, REVOKE either succeeds for all named users and roles, or rolls back and has no effect if any error occurs; the statement is written to the binary log only if it succeeds for all named users and roles. The precise effects of IF EXISTS and IGNORE UNKNOWN USER are discussed later in this section.

Each account name uses the format described in Section 8.2.4, "Specifying Account Names". Each role name uses the format described in Section 8.2.5, "Specifying Role Names". For example:
```
REVOKE INSERT ON *.* FROM 'jeffrey'@'localhost';
REVOKE 'role1', 'role2' FROM 'user1'@'localhost', 'user2'@'localhost';
REVOKE SELECT ON world.* FROM 'role3';
```


The host name part of the account or role name, if omitted, defaults to ' $\%$ '.
To use the first REVOKE syntax, you must have the GRANT OPTION privilege, and you must have the privileges that you are revoking.

To revoke all privileges from a user, use one of the following statements; either of these statements drops all global, database, table, column, and routine privileges for the named users or roles:
```
REVOKE ALL PRIVILEGES, GRANT OPTION
    FROM user_or_role [, user_or_role] ...
REVOKE ALL ON *.*
    FROM user_or_role [, user_or_role] ...
```


Neither of the two statements just shown revokes any roles.
To use these REVOKE statements, you must have the global CREATE USER privilege, or the UPDATE privilege for the mysql system schema.

The syntax for which the REVOKE keyword is followed by one or more role names takes a FROM clause indicating one or more users or roles from which to revoke the roles.

The IF EXISTS and IGNORE UNKNOWN USER options have the effects listed here:
- IF EXISTS means that, if the target user or role exists but no such privilege or role is found assigned to the target for any reason, a warning is raised, instead of an error; if no privilege or role named by the statement is assigned to the target, the statement has no (other) effect. Otherwise, REVOKE executes normally; if the user does not exist, the statement raises an error.

Example: Given table t1 in database test, we execute the following statements, with the results shown.
```
mysql> CREATE USER jerry@localhost;
Query OK, 0 rows affected (0.01 sec)
mysql> REVOKE SELECT ON test.t1 FROM jerry@localhost;
ERROR 1147 (42000): There is no such grant defined for user 'jerry' on host
'localhost' on table 't1'
mysql> REVOKE IF EXISTS SELECT ON test.t1 FROM jerry@localhost;
Query OK, 0 rows affected, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
************************** 1. row ****************************************
    Level: Warning
        Code: 1147
Message: There is no such grant defined for user 'jerry' on host 'localhost' on
```

```
table 't1'
1 row in set (0.00 sec)
```


IF EXISTS causes an error to be demoted to a warning even if the privilege or role named does not exist, or the statement attempts to assign it at the wrong level.
- If the REVOKE statement includes IGNORE UNKNOWN USER, the statement raises a warning for any target user or role named in the statement but not found; if no target named by the statement exists, REVOKE succeeds but has no actual effect. Otherwise, the statement executes as usual, and attempting to revoke a privilege not assigned to the target for whatever reason raises an error, as expected.

Example (continuing from the previous example):
```
mysql> DROP USER IF EXISTS jerry@localhost;
Query OK, 0 rows affected (0.01 sec)
mysql> REVOKE SELECT ON test.t1 FROM jerry@localhost;
ERROR 1147 (42000): There is no such grant defined for user 'jerry' on host
'localhost' on table 't1'
mysql> REVOKE SELECT ON test.t1 FROM jerry@localhost IGNORE UNKNOWN USER;
Query OK, 0 rows affected, 1 warning (0.01 sec)
mysql> SHOW WARNINGS\G
*************************** 1. row ***************************************
    Level: Warning
    Code: 3162
Message: Authorization ID jerry does not exist.
1 row in set (0.00 sec)
```

- The combination of IF EXISTS and IGNORE UNKNOWN USER means that REVOKE never raises an error for an unknown target user or role or for an unassigned or unavailable privilege, and the statement as whole in such cases succeeds; roles or privileges are removed from existing target users or roles whenever possible, and any revocation which is not possible raises a warning and executes as a NOOP.

Example (again continuing from example in the previous item):
```
# No such user, no such role
mysql> DROP ROLE IF EXISTS Bogus;
Query OK, 0 rows affected, 1 warning (0.02 sec)
mysql> SHOW WARNINGS;
+-------+-------+-----------------------------------------------
| Level | Code | Message |
+-------+-------+-----------------------------------------------
| Note | 3162 | Authorization ID 'Bogus'@'%' does not exist. |
+-------+-------+------------------------------------------------
1 row in set (0.00 sec)
# This statement attempts to revoke a nonexistent role from a nonexistent user
mysql> REVOKE Bogus ON test FROM jerry@localhost;
ERROR 3619 (HY000): Illegal privilege level specified for test
# The same, with IF EXISTS
mysql> REVOKE IF EXISTS Bogus ON test FROM jerry@localhost;
ERROR 1147 (42000): There is no such grant defined for user 'jerry' on host
'localhost' on table 'test'
# The same, with IGNORE UNKNOWN USER
mysql> REVOKE Bogus ON test FROM jerry@localhost IGNORE UNKNOWN USER;
ERROR 3619 (HY000): Illegal privilege level specified for test
# The same, with both options
mysql> REVOKE IF EXISTS Bogus ON test FROM jerry@localhost IGNORE UNKNOWN USER;
Query OK, 0 rows affected, 2 warnings (0.01 sec)
mysql> SHOW WARNINGS;
+---------+-------+---------------------------------------------
```

```
| Level | Code | Message |
+---------+-------+---------------------------------------------
| Warning | 3619 | Illegal privilege level specified for test |
| Warning | 3162 | Authorization ID jerry does not exist. |
+---------+-------+----------------------------------------------
2 rows in set (0.00 sec)
```


Roles named in the mandatory_roles system variable value cannot be revoked. When IF EXISTS and IGNORE UNKNOWN USER are used together in a statement that tries to remove a mandatory privilege, the error normally raised by attempting to do this is demoted to a warning; the statement executes successfully, but does not make any changes.

A revoked role immediately affects any user account from which it was revoked, such that within any current session for the account, its privileges are adjusted for the next statement executed.

Revoking a role revokes the role itself, not the privileges that it represents. Suppose that an account is granted a role that includes a given privilege, and is also granted the privilege explicitly or another role that includes the privilege. In this case, the account still possesses that privilege if the first role is revoked. For example, if an account is granted two roles that each include SELECT, the account still can select after either role is revoked.

REVOKE ALL ON *.* (at the global level) revokes all granted static global privileges and all granted dynamic privileges.

A revoked privilege that is granted but not known to the server is revoked with a warning. This situation can occur for dynamic privileges. For example, a dynamic privilege can be granted while the component that registers it is installed, but if that component is subsequently uninstalled, the privilege becomes unregistered, although accounts that possess the privilege still possess it and it can be revoked from them.

REVOKE removes privileges, but does not remove rows from the mysql. user system table. To remove a user account entirely, use DROP USER. See Section 15.7.1.5, "DROP USER Statement".

If the grant tables hold privilege rows that contain mixed-case database or table names and the lower_case_table_names system variable is set to a nonzero value, REVOKE cannot be used to revoke these privileges. It is necessary in such cases to manipulate the grant tables directly. (GRANT does not create such rows when lower_case_table_names is set, but such rows might have been created prior to setting the variable. The lower_case_table_names setting can only be configured when initializing the server.)

When successfully executed from the mysql program, REVOKE responds with Query OK, 0 rows affected. To determine what privileges remain after the operation, use SHOW GRANTS. See Section 15.7.7.22, "SHOW GRANTS Statement".

\subsection*{15.7.1.9 SET DEFAULT ROLE Statement}
```
SET DEFAULT ROLE
    {NONE | ALL | role [, role ] ...}
    TO user [, user ] ...
```


For each user named immediately after the TO keyword, this statement defines which roles become active when the user connects to the server and authenticates, or when the user executes the SET ROLE DEFAULT statement during a session.

SET DEFAULT ROLE is alternative syntax for ALTER USER . . . DEFAULT ROLE (see Section 15.7.1.1, "ALTER USER Statement"). However, ALTER USER can set the default for only a single user, whereas SET DEFAULT ROLE can set the default for multiple users. On the other hand, you can specify CURRENT_USER as the user name for the ALTER USER statement, whereas you cannot for SET DEFAULT ROLE.

\section*{SET DEFAULT ROLE requires these privileges:}
- Setting the default roles for another user requires the global CREATE USER privilege, or the UPDATE privilege for the mysql.default_roles system table.
- Setting the default roles for yourself requires no special privileges, as long as the roles you want as the default have been granted to you.

Each role name uses the format described in Section 8.2.5, "Specifying Role Names". For example:
```
SET DEFAULT ROLE 'admin', 'developer' TO 'joe'@'10.0.0.1';
```


The host name part of the role name, if omitted, defaults to ' $\%$ '.
The clause following the DEFAULT ROLE keywords permits these values:
- NONE: Set the default to NONE (no roles).
- ALL: Set the default to all roles granted to the account.
- role [, role] . . .: Set the default to the named roles, which must exist and be granted to the account at the time SET DEFAULT ROLE is executed.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2861.jpg?height=116&width=99&top_left_y=1066&top_left_x=370)

\section*{Note}

SET DEFAULT ROLE and SET ROLE DEFAULT are different statements:
- SET DEFAULT ROLE defines which account roles to activate by default within account sessions.
- SET ROLE DEFAULT sets the active roles within the current session to the current account default roles.

For role usage examples, see Section 8.2.10, "Using Roles".

\subsection*{15.7.1.10 SET PASSWORD Statement}
```
SET PASSWORD [FOR user] auth_option
        [REPLACE 'current_auth_string']
        [RETAIN CURRENT PASSWORD]
auth_option: {
        = 'auth_string'
    | TO RANDOM
}
```


The SET PASSWORD statement assigns a password to a MySQL user account. The password may be either explicitly specified in the statement or randomly generated by MySQL. The statement may also include a password-verification clause that specifies the account current password to be replaced, and a clause that manages whether an account has a secondary password. 'auth_string' and 'current_auth_string' each represent a cleartext (unencrypted) password.

\section*{Note}

Rather than using SET PASSWORD to assign passwords, ALTER USER is the preferred statement for account alterations, including assigning passwords. For example:

ALTER USER user IDENTIFIED BY 'auth_string';

\section*{Note}

Clauses for random password generation, password verification, and secondary passwords apply only to accounts that use an authentication plugin that stores credentials internally to MySQL. For accounts that use a plugin that performs
> authentication against a credentials system that is external to MySQL, password management must be handled externally against that system as well. For more information about internal credentials storage, see Section 8.2.15, "Password Management".

The REPLACE 'current_auth_string' clause performs password verification. If given:
- REPLACE specifies the account current password to be replaced, as a cleartext (unencrypted) string.
- The clause must be given if password changes for the account are required to specify the current password, as verification that the user attempting to make the change actually knows the current password.
- The clause is optional if password changes for the account may but need not specify the current password.
- The statement fails if the clause is given but does not match the current password, even if the clause is optional.
- REPLACE can be specified only when changing the account password for the current user.

For more information about password verification by specifying the current password, see Section 8.2.15, "Password Management".

The RETAIN CURRENT PASSWORD clause implements dual-password capability. If given:
- RETAIN CURRENT PASSWORD retains an account current password as its secondary password, replacing any existing secondary password. The new password becomes the primary password, but clients can use the account to connect to the server using either the primary or secondary password. (Exception: If the new password specified by the SET PASSWORD statement is empty, the secondary password becomes empty as well, even if RETAIN CURRENT PASSWORD is given.)
- If you specify RETAIN CURRENT PASSWORD for an account that has an empty primary password, the statement fails.
- If an account has a secondary password and you change its primary password without specifying RETAIN CURRENT PASSWORD, the secondary password remains unchanged.

For more information about use of dual passwords, see Section 8.2.15, "Password Management".
SET PASSWORD permits these auth_option syntaxes:
- = 'auth_string'

Assigns the account the given literal password.
- TO RANDOM

Assigns the account a password randomly generated by MySQL. The statement also returns the cleartext password in a result set to make it available to the user or application executing the statement.

For details about the result set and characteristics of randomly generated passwords, see Random Password Generation.

\section*{Important}

Under some circumstances, SET PASSWORD may be recorded in server logs or on the client side in a history file such as ~/.mysql_history, which means that cleartext passwords may be read by anyone having read access to that information. For information about the conditions under which this occurs for the server logs and how to control it, see Section 8.1.2.3, "Passwords and Logging".

\section*{For similar information about client-side logging, see Section 6.5.1.3, "mysql Client Logging".}

SET PASSWORD can be used with or without a FOR clause that explicitly names a user account:
- With a FOR user clause, the statement sets the password for the named account, which must exist:
```
SET PASSWORD FOR 'jeffrey'@'localhost' = 'auth_string';
```

- With no FOR user clause, the statement sets the password for the current user:
```
SET PASSWORD = 'auth_string';
```


Any client who connects to the server using a nonanonymous account can change the password for that account. (In particular, you can change your own password.) To see which account the server authenticated you as, invoke the CURRENT_USER( ) function:
```
SELECT CURRENT_USER();
```


If a FOR user clause is given, the account name uses the format described in Section 8.2.4, "Specifying Account Names". For example:
```
SET PASSWORD FOR 'bob'@'%.example.org' = 'auth_string';
```


The host name part of the account name, if omitted, defaults to ' $\%$ '.
SET PASSWORD interprets the string as a cleartext string, passes it to the authentication plugin associated with the account, and stores the result returned by the plugin in the account row in the mysql. user system table. (The plugin is given the opportunity to hash the value into the encryption format it expects. The plugin may use the value as specified, in which case no hashing occurs.)

Setting the password for a named account (with a FOR clause) requires the UPDATE privilege for the mysql system schema. Setting the password for yourself (for a nonanonymous account with no FOR clause) requires no special privileges.

Statements that modify secondary passwords require these privileges:
- The APPLICATION_PASSWORD_ADMIN privilege is required to use the RETAIN CURRENT PASSWORD clause for SET PASSWORD statements that apply to your own account. The privilege is required to manipulate your own secondary password because most users require only one password.
- If an account is to be permitted to manipulate secondary passwords for all accounts, it should be granted the CREATE USER privilege rather than APPLICATION_PASSWORD_ADMIN.

When the read_only system variable is enabled, SET PASSWORD requires the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege), in addition to any other required privileges.

For additional information about setting passwords and authentication plugins, see Section 8.2.14, "Assigning Account Passwords", and Section 8.2.17, "Pluggable Authentication".

\subsection*{15.7.1.11 SET ROLE Statement}
```
SET ROLE {
        DEFAULT
    | NONE
    | ALL
    | ALL EXCEPT role [, role ] ...
    | role [, role ] ...
}
```


SET ROLE modifies the current user's effective privileges within the current session by specifying which of its granted roles are active. Granted roles include those granted explicitly to the user and those named in the mandatory_roles system variable value.

Examples:
```
SET ROLE DEFAULT;
SET ROLE 'role1', 'role2';
SET ROLE ALL;
SET ROLE ALL EXCEPT 'role1', 'role2';
```


Each role name uses the format described in Section 8.2.5, "Specifying Role Names". The host name part of the role name, if omitted, defaults to ' $\%$ '.

Privileges that the user has been granted directly (rather than through roles) remain unaffected by changes to the active roles.

The statement permits these role specifiers:
- DEFAULT: Activate the account default roles. Default roles are those specified with SET DEFAULT ROLE.

When a user connects to the server and authenticates successfully, the server determines which roles to activate as the default roles. If the activate_all_roles_on_login system variable is enabled, the server activates all granted roles. Otherwise, the server executes SET ROLE DEFAULT implicitly. The server activates only default roles that can be activated. The server writes warnings to its error log for default roles that cannot be activated, but the client receives no warnings.

If a user executes SET ROLE DEFAULT during a session, an error occurs if any default role cannot be activated (for example, if it does not exist or is not granted to the user). In this case, the current active roles are not changed.
- NONE: Set the active roles to NONE (no active roles).
- ALL: Activate all roles granted to the account.
- ALL EXCEPT role [, role] . . . : Activate all roles granted to the account except those named. The named roles need not exist or be granted to the account.
- role [, role ] ... : Activate the named roles, which must be granted to the account.

\begin{figure}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2864.jpg?height=127&width=99&top_left_y=1685&top_left_x=306}
\captionsetup{labelformat=empty}
\caption{Note
SET DEFAULT ROLE and SET ROLE DEFAULT are different statements:
- SET DEFAULT ROLE defines which account roles to activate by default within account sessions.
- SET ROLE DEFAULT sets the active roles within the current session to the current account default roles.}
\end{figure}

For role usage examples, see Section 8.2.10, "Using Roles".

\subsection*{15.7.2 Resource Group Management Statements}

MySQL supports creation and management of resource groups, and permits assigning threads running within the server to particular groups so that threads execute according to the resources available to the group. This section describes the SQL statements available for resource group management. For general discussion of the resource group capability, see Section 7.1.16, "Resource Groups".

\subsection*{15.7.2.1 ALTER RESOURCE GROUP Statement}
```
ALTER RESOURCE GROUP group_name
    [VCPU [=] vcpu_spec [, vcpu_spec] ...]
    [THREAD_PRIORITY [=] N]
    [ENABLE|DISABLE [FORCE]]
```

```
vcpu_spec: {N | M - N}
```


ALTER RESOURCE GROUP is used for resource group management (see Section 7.1.16, "Resource Groups"). This statement alters modifiable attributes of an existing resource group. It requires the RESOURCE_GROUP_ADMIN privilege.
group_name identifies which resource group to alter. If the group does not exist, an error occurs.
The attributes for CPU affinity, priority, and whether the group is enabled can be modified with ALTER RESOURCE GROUP. These attributes are specified the same way as described for CREATE RESOURCE GROUP (see Section 15.7.2.2, "CREATE RESOURCE GROUP Statement"). Only the attributes specified are altered. Unspecified attributes retain their current values.

The FORCE modifier is used with DISABLE. It determines statement behavior if the resource group has any threads assigned to it:
- If FORCE is not given, existing threads in the group continue to run until they terminate, but new threads cannot be assigned to the group.
- If FORCE is given, existing threads in the group are moved to their respective default group (system threads to SYS_default, user threads to USR_default).

The name and type attributes are set at group creation time and cannot be modified thereafter with ALTER RESOURCE GROUP.

\section*{Examples:}
- Alter a group CPU affinity:
```
ALTER RESOURCE GROUP rg1 VCPU = 0-63;
```

- Alter a group thread priority:
```
ALTER RESOURCE GROUP rg2 THREAD_PRIORITY = 5;
```

- Disable a group, moving any threads assigned to it to the default groups:
```
ALTER RESOURCE GROUP rg3 DISABLE FORCE;
```


Resource group management is local to the server on which it occurs. ALTER RESOURCE GROUP statements are not written to the binary log and are not replicated.

\subsection*{15.7.2.2 CREATE RESOURCE GROUP Statement}
```
CREATE RESOURCE GROUP group_name
    TYPE = {SYSTEM|USER}
    [VCPU [=] vcpu_spec [, vcpu_spec] ...]
    [THREAD_PRIORITY [=] N]
    [ENABLE|DISABLE]
vcpu_spec: {N | M - N}
```


CREATE RESOURCE GROUP is used for resource group management (see Section 7.1.16, "Resource Groups"). This statement creates a new resource group and assigns its initial attribute values. It requires the RESOURCE_GROUP_ADMIN privilege.
group_name identifies which resource group to create. If the group already exists, an error occurs.
The TYPE attribute is required. It should be SYSTEM for a system resource group, USER for a user resource group. The group type affects permitted THREAD_PRIORITY values, as described later.

The VCPU attribute indicates the CPU affinity; that is, the set of virtual CPUs the group can use:
- If VCPU is not given, the resource group has no CPU affinity and can use all available CPUs.
- If VCPU is given, the attribute value is a list of comma-separated CPU numbers or ranges:
- Each number must be an integer in the range from 0 to the number of CPUs - 1 . For example, on a system with 64 CPUs, the number can range from 0 to 63.
- A range is given in the form $M-N$, where $M$ is less than or equal to $N$ and both numbers are in the CPU range.
- If a CPU number is an integer outside the permitted range or is not an integer, an error occurs.

Example VCPU specifiers (these are all equivalent):
```
VCPU = 0,1,2,3,9,10
VCPU = 0-3,9-10
VCPU = 9,10,0-3
VCPU = 0,10,1,9,3,2
```


The THREAD_PRIORITY attribute indicates the priority for threads assigned to the group:
- If THREAD_PRIORITY is not given, the default priority is 0 .
- If THREAD_PRIORITY is given, the attribute value must be in the range from -20 (highest priority) to 19 (lowest priority). The priority for system resource groups must be in the range from - 20 to 0 . The priority for user resource groups must be in the range from 0 to 19. Use of different ranges for system and user groups ensures that user threads never have a higher priority than system threads.

ENABLE and DISABLE specify that the resource group is initially enabled or disabled. If neither is specified, the group is enabled by default. A disabled group cannot have threads assigned to it.

\section*{Examples:}
- Create an enabled user group that has a single CPU and the lowest priority:
```
CREATE RESOURCE GROUP rg1
    TYPE = USER
    VCPU = 0
    THREAD_PRIORITY = 19;
```

- Create a disabled system group that has no CPU affinity (can use all CPUs) and the highest priority:
```
CREATE RESOURCE GROUP rg2
    TYPE = SYSTEM
    THREAD_PRIORITY = -20
    DISABLE;
```


Resource group management is local to the server on which it occurs. CREATE RESOURCE GROUP statements are not written to the binary log and are not replicated.

\subsection*{15.7.2.3 DROP RESOURCE GROUP Statement}

DROP RESOURCE GROUP group_name [FORCE]
DROP RESOURCE GROUP is used for resource group management (see Section 7.1.16, "Resource Groups"). This statement drops a resource group. It requires the RESOURCE_GROUP_ADMIN privilege.
group_name identifies which resource group to drop. If the group does not exist, an error occurs.
The FORCE modifier determines statement behavior if the resource group has any threads assigned to it:
- If FORCE is not given and any threads are assigned to the group, an error occurs.
- If FORCE is given, existing threads in the group are moved to their respective default group (system threads to SYS_default, user threads to USR_default).

Examples:
- Drop a group, failing if the group contains any threads:
```
DROP RESOURCE GROUP rg1;
```

- Drop a group and move existing threads to the default groups:
```
DROP RESOURCE GROUP rg2 FORCE;
```


Resource group management is local to the server on which it occurs. DROP RESOURCE GROUP statements are not written to the binary log and are not replicated.

\subsection*{15.7.2.4 SET RESOURCE GROUP Statement}
```
SET RESOURCE GROUP group_name
    [FOR thread_id [, thread_id] ...]
```


SET RESOURCE GROUP is used for resource group management (see Section 7.1.16, "Resource Groups"). This statement assigns threads to a resource group. It requires the RESOURCE_GROUP_ADMIN or RESOURCE_GROUP_USER privilege.
group_name identifies which resource group to be assigned. Any thread_id values indicate threads to assign to the group. Thread IDs can be determined from the Performance Schema threads table. If the resource group or any named thread ID does not exist, an error occurs.

With no FOR clause, the statement assigns the current thread for the session to the resource group.
With a FOR clause that names thread IDs, the statement assigns those threads to the resource group.
For attempts to assign a system thread to a user resource group or a user thread to a system resource group, a warning occurs.

\section*{Examples:}
- Assign the current session thread to a group:
```
SET RESOURCE GROUP rg1;
```

- Assign the named threads to a group:
```
SET RESOURCE GROUP rg2 FOR 14, 78, 4;
```


Resource group management is local to the server on which it occurs. SET RESOURCE GROUP statements are not written to the binary log and are not replicated.

An alternative to SET RESOURCE GROUP is the RESOURCE_GROUP optimizer hint, which assigns individual statements to a resource group. See Section 10.9.3, "Optimizer Hints".

\subsection*{15.7.3 Table Maintenance Statements}

\subsection*{15.7.3.1 ANALYZE TABLE Statement}
```
ANALYZE [NO_WRITE_TO_BINLOG | LOCAL]
    TABLE tbl_name [, tbl_name] ...
ANALYZE [NO_WRITE_TO_BINLOG | LOCAL]
    TABLE tbl_name
    UPDATE HISTOGRAM ON col_name [, col_name] ...
```

```
        [WITH N BUCKETS]
    [{MANUAL | AUTO} UPDATE]
ANALYZE [NO_WRITE_TO_BINLOG | LOCAL]
    TABLE tbl_name
    UPDATE HISTOGRAM ON col_name [USING DATA 'json_data']
ANALYZE [NO_WRITE_TO_BINLOG | LOCAL]
    TABLE tbl_name
    DROP HISTOGRAM ON col_name [, col_name] ...
```


ANALYZE TABLE generates table statistics:
- ANALYZE TABLE without any HISTOGRAM clause performs a key distribution analysis and stores the distribution for the named table or tables. For MyISAM tables, ANALYZE TABLE for key distribution analysis is equivalent to using myisamchk --analyze.
- ANALYZE TABLE with the UPDATE HISTOGRAM clause generates histogram statistics for the named table columns and stores them in the data dictionary. Only one table name is permitted with this syntax. MySQL also supports setting the histogram of a single column to a user-defined JSON value.
- ANALYZE TABLE with the DROP HISTOGRAM clause removes histogram statistics for the named table columns from the data dictionary. Only one table name is permitted for this syntax.

This statement requires SELECT and INSERT privileges for the table.
ANALYZE TABLE works with InnoDB, NDB, and MyISAM tables. It does not work with views.
If the innodb_read_only system variable is enabled, ANALYZE TABLE may fail because it cannot update statistics tables in the data dictionary, which use InnodB. For ANALYZE TABLE operations that update the key distribution, failure may occur even if the operation updates the table itself (for example, if it is a MyISAM table). To obtain the updated distribution statistics, set information_schema_stats_expiry=0.

ANALYZE TABLE is supported for partitioned tables, and you can use ALTER TABLE ... ANALYZE PARTITION to analyze one or more partitions; for more information, see Section 15.1.9, "ALTER TABLE Statement", and Section 26.3.4, "Maintenance of Partitions".

During the analysis, the table is locked with a read lock for InnoDB and MyISAM.
By default, the server writes ANALYZE TABLE statements to the binary log so that they replicate to replicas. To suppress logging, specify the optional NO_WRITE_TO_BINLOG keyword or its alias LOCAL.
- ANALYZE TABLE Output
- Key Distribution Analysis
- Histogram Statistics Analysis
- Other Considerations

\section*{ANALYZE TABLE Output}

ANALYZE TABLE returns a result set with the columns shown in the following table.

\begin{tabular}{|l|l|}
\hline Column & Value \\
\hline Table & The table name \\
\hline Op & analyze or histogram \\
\hline Msg_type & status, error, info, note, or warning \\
\hline Msg_text & An informational message \\
\hline
\end{tabular}

\section*{Key Distribution Analysis}

ANALYZE TABLE without either HISTOGRAM clause performs a key distribution analysis and stores the distribution for the table or tables. Any existing histogram statistics remain unaffected.

If the table has not changed since the last key distribution analysis, the table is not analyzed again.
MySQL uses the stored key distribution to decide the order in which tables should be joined for joins on something other than a constant. In addition, key distributions can be used when deciding which indexes to use for a specific table within a query.

To check the stored key distribution cardinality, use the SHOW INDEX statement or the INFORMATION_SCHEMA STATISTICS table. See Section 15.7.7.23, "SHOW INDEX Statement", and Section 28.3.34, "The INFORMATION_SCHEMA STATISTICS Table".

For InnoDB tables, ANALYZE TABLE determines index cardinality by performing random dives on each of the index trees and updating index cardinality estimates accordingly. Because these are only estimates, repeated runs of ANALYZE TABLE could produce different numbers. This makes ANALYZE TABLE fast on InnoDB tables but not 100\% accurate because it does not take all rows into account.

You can make the statistics collected by ANALYZE TABLE more precise and more stable by enabling innodb_stats_persistent, as explained in Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters". When innodb_stats_persistent is enabled, it is important to run ANALYZE TABLE after major changes to index column data, as statistics are not recalculated periodically (such as after a server restart).

If innodb_stats_persistent is enabled, you can change the number of random dives by modifying the innodb_stats_persistent_sample_pages system variable. If innodb_stats_persistent is disabled, modify innodb_stats_transient_sample_pages instead.

For more information about key distribution analysis in InnoDB, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters", and Section 17.8.10.3, "Estimating ANALYZE TABLE Complexity for InnoDB Tables".

MySQL uses index cardinality estimates in join optimization. If a join is not optimized in the right way, try running ANALYZE TABLE. In the few cases that ANALYZE TABLE does not produce values good enough for your particular tables, you can use FORCE INDEX with your queries to force the use of a particular index, or set the max_seeks_for_key system variable to ensure that MySQL prefers index lookups over table scans. See Section B.3.5, "Optimizer-Related Issues".

\section*{Histogram Statistics Analysis}

ANALYZE TABLE with the HISTOGRAM clause enables management of histogram statistics for table column values. For information about histogram statistics, see Section 10.9.6, "Optimizer Statistics".

These histogram operations are available:
- ANALYZE TABLE with an UPDATE HISTOGRAM clause generates histogram statistics for the named table columns and stores them in the data dictionary. Only one table name is permitted for this syntax.

The optional WITH $N$ BUCKETS clause specifies the number of buckets for the histogram. The value of $N$ must be an integer in the range from 1 to 1024. If this clause is omitted, the number of buckets is 100.

The optional AUTO UPDATE clause enables automatic updates of histograms on the table. When enabled, an ANALYZE TABLE statement on this table automatically updates the histogram, using the same number of buckets as last specified by WITH ... BUCKETS if this was previously set for this table. In addition, when recalculating persistent statistics for the table (see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters"), the InnoDB background statistics thread
also updates the histogram. MANUAL UPDATE disables automatic updates, and is the default setting if not specified.
- ANALYZE TABLE with a DROP HISTOGRAM clause removes histogram statistics for the named table columns from the data dictionary. Only one table name is permitted for this syntax.

Stored histogram management statements affect only the named columns. Consider these statements:
```
ANALYZE TABLE t UPDATE HISTOGRAM ON c1, c2, c3 WITH 10 BUCKETS;
ANALYZE TABLE t UPDATE HISTOGRAM ON c1, c3 WITH 10 BUCKETS;
ANALYZE TABLE t DROP HISTOGRAM ON c2;
```


The first statement updates the histograms for columns c1, c2, and c3, replacing any existing histograms for those columns. The second statement updates the histograms for c1 and c3, leaving the c2 histogram unaffected. The third statement removes the histogram for c2, leaving those for c1 and c 3 unaffected.

When sampling user data as part of building a histogram, not all values are read; this may lead to missing some values considered important. In such cases, it might be useful to modify the histogram, or to set your own histogram explicitly based on your own criteria, such as the complete data set. ANALYZE TABLE tbl_name UPDATE HISTOGRAM ON col_name USING DATA 'json_data' updates a column of the histogram table with data supplied in the same JSON format used to display HISTOGRAM column values from the Information Schema COLUMN_STATISTICS table. Only one column can be modified when updating the histogram with JSON data.

We can illustrate the use of USING DATA by first generating a histogram on column c1 of table $t$, like this:
```
mysql> ANALYZE TABLE t UPDATE HISTOGRAM ON c1;
+-------+------------+-----------+---------------------------------------------
| Table | Op | Msg_type | Msg_text |
+-------+------------+-----------+----------------------------------------------
| h.t | histogram | status | Histogram statistics created for column 'c1'. |
+-------+------------+----------+----------------------------------------------
1 row in set (0.00 sec)
```


We can see the histogram generated in the COLUMN_STATISTICS table:
```
mysql> TABLE information_schema.column_statistics\G
*************************** 1. row *****************************
SCHEMA_NAME: h
    TABLE_NAME: t
COLUMN_NAME: c1
    HISTOGRAM: {"buckets": [], "data-type": "int", "auto-update": false,
"null-values": 0.0, "collation-id": 8, "last-updated": "2024-03-26
16:54:43.674995", "sampling-rate": 1.0, "histogram-type": "singleton",
"number-of-buckets-specified": 100}
1 row in set (0.00 sec)
```


Now we drop the histogram, and when we check COLUMN_STATISTICS, it is empty:
```
mysql> ANALYZE TABLE t DROP HISTOGRAM ON c1;
+-------+------------+-----------+----------------------------------------------
| Table | Op | Msg_type | Msg_text |
+-------+------------+-----------+---------------------------------------------
| h.t | histogram | status | Histogram statistics removed for column 'c1'. |
+-------+------------+-----------+----------------------------------------------
1 row in set (0.01 sec)
mysql> TABLE information_schema.column_statistics\G
Empty set (0.00 sec)
```


We can restore the dropped histogram by inserting its JSON representation obtained previously from the HISTOGRAM column of the COLUMN_STATISTICS table, and when we query that table again, we can see that the histogram has been restored to its previous state:
```
mysql> ANALYZE TABLE t UPDATE HISTOGRAM ON c1
    -> USING DATA '{"buckets": [], "data-type": "int", "auto-update": false,
```

```
        -> "null-values": 0.0, "collation-id": 8, "last-updated": "2024-03-26
        -> 16:54:43.674995", "sampling-rate": 1.0, "histogram-type": "singleton",
        -> "number-of-buckets-specified": 100}';
+-------+------------+-----------+---------------------------------------------
| Table | Op | Msg_type | Msg_text
+-------+-----------+----------+-----------
| h.t | histogram | status | Histogram statistics created for column 'c1'. |
+-------+------------+----------+----------------------------------------------
mysql> TABLE information_schema.column_statistics\G
*************************** 1. row
SCHEMA_NAME: h
    TABLE_NAME: t
COLUMN_NAME: c1
    HISTOGRAM: {"buckets": [], "data-type": "int", "auto-update": false,
"null-values": 0.0, "collation-id": 8, "last-updated": "2024-03-26
16:54:43.674995", "sampling-rate": 1.0, "histogram-type": "singleton",
"number-of-buckets-specified": 100}
```


Histogram generation is not supported for encrypted tables (to avoid exposing data in the statistics) or TEMPORARY tables.

Histogram generation applies to columns of all data types except geometry types (spatial data) and JSON.

Histograms can be generated for stored and virtual generated columns.
Histograms cannot be generated for columns that are covered by single-column unique indexes.
Histogram management statements attempt to perform as much of the requested operation as possible, and report diagnostic messages for the remainder. For example, if an UPDATE HISTOGRAM statement names multiple columns, but some of them do not exist or have an unsupported data type, histograms are generated for the other columns, and messages are produced for the invalid columns.

Histograms are affected by these DDL statements:
- DROP TABLE removes histograms for columns in the dropped table.
- DROP DATABASE removes histograms for any table in the dropped database because the statement drops all tables in the database.
- RENAME TABLE does not remove histograms. Instead, it renames histograms for the renamed table to be associated with the new table name.
- ALTER TABLE statements that remove or modify a column remove histograms for that column.
- ALTER TABLE ... CONVERT TO CHARACTER SET removes histograms for character columns because they are affected by the change of character set. Histograms for noncharacter columns remain unaffected.

The histogram_generation_max_mem_size system variable controls the maximum amount of memory available for histogram generation. The global and session values may be set at runtime.

Changing the global histogram_generation_max_mem_size value requires privileges sufficient to set global system variables. Changing the session histogram_generation_max_mem_size value requires privileges sufficient to set restricted session system variables. See Section 7.1.9.1, "System Variable Privileges".

If the estimated amount of data to be read into memory for histogram generation exceeds the limit defined by histogram_generation_max_mem_size, MySQL samples the data rather than reading all of it into memory. Sampling is evenly distributed over the entire table. MySQL uses SYSTEM sampling, which is a page-level sampling method.

The sampling-rate value in the HISTOGRAM column of the Information Schema COLUMN_STATISTICS table can be queried to determine the fraction of data that was sampled to
create the histogram. The sampling-rate is a number between 0.0 and 1.0. A value of 1 means that all of the data was read (no sampling).

The following example demonstrates sampling. To ensure that the amount of data exceeds the histogram_generation_max_mem_size limit for the purpose of the example, the limit is set to a low value (2000000 bytes) prior to generating histogram statistics for the birth_date column of the employees table.
```
mysql> SET histogram_generation_max_mem_size = 2000000;
mysql> USE employees;
mysql> ANALYZE TABLE employees UPDATE HISTOGRAM ON birth_date WITH 16 BUCKETS\G
************************** 1. rOW ******************************
    Table: employees.employees
        Op: histogram
Msg_type: status
Msg_text: Histogram statistics created for column 'birth_date'.
mysql> SELECT HISTOGRAM->>'$."sampling-rate"'
        FROM INFORMATION_SCHEMA.COLUMN_STATISTICS
        WHERE TABLE_NAME = "employees"
        AND COLUMN_NAME = "birth_date";
+----------------------------------+
| HISTOGRAM->>'$."sampling-rate"' |
+----------------------------------+
| 0.0491431208869665
+-----------------------------------+
```


A sampling-rate value of 0.0491431208869665 means that approximately $4.9 \%$ of the data from the birth_date column was read into memory for generating histogram statistics.

The InnoDB storage engine provides its own sampling implementation for data stored in InnoDB tables. The default sampling implementation used by MySQL when storage engines do not provide their own requires a full table scan, which is costly for large tables. The InnoDB sampling implementation improves sampling performance by avoiding full table scans.

The sampled_pages_read and sampled_pages_skipped INNODB_METRICS counters can be used to monitor sampling of InnoDB data pages. (For general INNODB_METRICS counter usage information, see Section 28.4.21, "The INFORMATION_SCHEMA INNODB_METRICS Table".)

The following example demonstrates sampling counter usage, which requires enabling the counters prior to generating histogram statistics.
```
mysql> SET GLOBAL innodb_monitor_enable = 'sampled%';
mysql> USE employees;
mysql> ANALYZE TABLE employees UPDATE HISTOGRAM ON birth_date WITH 16 BUCKETS\G
************************** 1. row *****************************
    Table: employees.employees
        Op: histogram
Msg_type: status
Msg_text: Histogram statistics created for column 'birth_date'.
mysql> USE INFORMATION_SCHEMA;
mysql> SELECT NAME, COUNT FROM INNODB_METRICS WHERE NAME LIKE 'sampled%'\G
************************** 1. row ******************************
    NAME: sampled_pages_read
COUNT: 43
***************************************************************************
    NAME: sampled_pages_skipped
COUNT: 843
```


This formula approximates a sampling rate based on the sampling counter data:
```
sampling rate = sampled_page_read/(sampled_pages_read + sampled_pages_skipped)
```


A sampling rate based on sampling counter data is roughly the same as the sampling-rate value in the HISTOGRAM column of the Information Schema COLUMN_STATISTICS table.

For information about memory allocations performed for histogram generation, monitor the Performance Schema memory/sql/histograms instrument. See Section 29.12.20.10, "Memory Summary Tables".

\section*{Other Considerations}

ANALYZE TABLE clears table statistics from the Information Schema INNODB_TABLESTATS table and sets the STATS_INITIALIZED column to Uninitialized. Statistics are collected again the next time the table is accessed.

\subsection*{15.7.3.2 CHECK TABLE Statement}
```
CHECK TABLE tbl_name [, tbl_name] ... [option] ...
option: {
        FOR UPGRADE
    | QUICK
        FAST
        MEDIUM
        EXTENDED
        CHANGED
}
```


CHECK TABLE checks a table or tables for errors. CHECK TABLE can also check views for problems, such as tables that are referenced in the view definition that no longer exist.

To check a table, you must have some privilege for it.
CHECK TABLE works for InnoDB, MyISAM, ARCHIVE, and CSV tables.
Before running CHECK TABLE on InnoDB tables, see CHECK TABLE Usage Notes for InnoDB Tables.
CHECK TABLE is supported for partitioned tables, and you can use ALTER TABLE ... CHECK PARTITION to check one or more partitions; for more information, see Section 15.1.9, "ALTER TABLE Statement", and Section 26.3.4, "Maintenance of Partitions".

CHECK TABLE ignores virtual generated columns that are not indexed.
- CHECK TABLE Output
- Checking Version Compatibility
- Checking Data Consistency
- CHECK TABLE Usage Notes for InnoDB Tables
- CHECK TABLE Usage Notes for MyISAM Tables

\section*{CHECK TABLE Output}

CHECK TABLE returns a result set with the columns shown in the following table.

\begin{tabular}{|l|l|}
\hline Column & Value \\
\hline Table & The table name \\
\hline Op & Always check \\
\hline Msg_type & status, error, info, note, or warning \\
\hline Msg_text & An informational message \\
\hline
\end{tabular}

The statement might produce many rows of information for each checked table. The last row has a Msg_type value of status and the Msg_text normally should be OK. Table is already up to date means that the storage engine for the table indicated that there was no need to check the table.

\section*{Checking Version Compatibility}

The FOR UPGRADE option checks whether the named tables are compatible with the current version of MySQL. With FOR UPGRADE, the server checks each table to determine whether there have been any incompatible changes in any of the table's data types or indexes since the table was created. If not, the check succeeds. Otherwise, if there is a possible incompatibility, the server runs a full check on the table (which might take some time).

Incompatibilities might occur because the storage format for a data type has changed or because its sort order has changed. Our aim is to avoid these changes, but occasionally they are necessary to correct problems that would be worse than an incompatibility between releases.

FOR UPGRADE discovers these incompatibilities:
- The indexing order for end-space in TEXT columns for InnoDB and MyISAM tables changed between MySQL 4.1 and 5.0.
- The storage method of the new DECIMAL data type changed between MySQL 5.0.3 and 5.0.5.
- Changes are sometimes made to character sets or collations that require table indexes to be rebuilt. For details about such changes, see Section 3.5, "Changes in MySQL 8.4". For information about rebuilding tables, see Section 3.14, "Rebuilding or Repairing Tables or Indexes".
- MySQL 8.4 does not support the 2 -digit YEAR $(2)$ data type permitted in older versions of MySQL. For tables containing YEAR (2) columns, CHECK TABLE recommends REPAIR TABLE, which converts 2-digit YEAR ( 2 ) columns to 4-digit YEAR columns.
- Trigger creation time is maintained.
- A table is reported as needing a rebuild if it contains old temporal columns in pre-5.6.4 format (TIME, DATETIME, and TIMESTAMP columns without support for fractional seconds precision). This helps the MySQL upgrade procedure detect and upgrade tables containing old temporal columns.
- Warnings are issued for tables that use nonnative partitioning because nonnative partitioning is removed in MySQL 8.4. See Chapter 26, Partitioning.

\section*{Checking Data Consistency}

The following table shows the other check options that can be given. These options are passed to the storage engine, which may use or ignore them.

\begin{tabular}{|l|l|}
\hline Type & Meaning \\
\hline QUICK & Do not scan the rows to check for incorrect links. Applies to InnoDB and MyISAM tables and views. \\
\hline FAST & Check only tables that have not been closed properly. Ignored for InnoDB; applies only to MyISAM tables and views. \\
\hline CHANGED & Check only tables that have been changed since the last check or that have not been closed properly. Ignored for InnoDB; applies only to MyISAM tables and views. \\
\hline MEDIUM & Scan rows to verify that deleted links are valid. This also calculates a key checksum for the rows and verifies this with a calculated checksum for \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Type & Meaning \\
\hline & the keys. Ignored for InnoDB; applies only to MyISAM tables and views. \\
\hline EXTENDED & Do a full key lookup for all keys for each row. This ensures that the table is $100 \%$ consistent, but takes a long time. Ignored for InnoDB; applies only to MyISAM tables and views. \\
\hline
\end{tabular}

You can combine check options, as in the following example that does a quick check on the table to determine whether it was closed properly:

CHECK TABLE test_table FAST QUICK;

\section*{Note}

If CHECK TABLE finds no problems with a table that is marked as "corrupted" or "not closed properly", CHECK TABLE may remove the mark.

If a table is corrupted, the problem is most likely in the indexes and not in the data part. All of the preceding check types check the indexes thoroughly and should thus find most errors.

To check a table that you assume is okay, use no check options or the QUICK option. The latter should be used when you are in a hurry and can take the very small risk that QUICK does not find an error in the data file. (In most cases, under normal usage, MySQL should find any error in the data file. If this happens, the table is marked as "corrupted" and cannot be used until it is repaired.)

FAST and CHANGED are mostly intended to be used from a script (for example, to be executed from cron) to check tables periodically. In most cases, FAST is to be preferred over CHANGED. (The only case when it is not preferred is when you suspect that you have found a bug in the MyISAM code.)

EXTENDED is to be used only after you have run a normal check but still get errors from a table when MySQL tries to update a row or find a row by key. This is very unlikely if a normal check has succeeded.

Use of CHECK TABLE ... EXTENDED might influence execution plans generated by the query optimizer.

Some problems reported by CHECK TABLE cannot be corrected automatically:
- Found row where the auto_increment column has the value 0 .

This means that you have a row in the table where the AUTO_INCREMENT index column contains the value 0 . (It is possible to create a row where the AUTO_INCREMENT column is 0 by explicitly setting the column to 0 with an UPDATE statement.)

This is not an error in itself, but could cause trouble if you decide to dump the table and restore it or do an ALTER TABLE on the table. In this case, the AUTO_INCREMENT column changes value according to the rules of AUTO_INCREMENT columns, which could cause problems such as a duplicate-key error.

To get rid of the warning, execute an UPDATE statement to set the column to some value other than 0.

\section*{CHECK TABLE Usage Notes for InnoDB Tables}

The following notes apply to InnoDB tables:
- If CHECK TABLE encounters a corrupt page, the server exits to prevent error propagation (Bug \#10132). If the corruption occurs in a secondary index but table data is readable, running CHECK TABLE can still cause a server exit.
- If CHECK TABLE encounters a corrupted DB_TRX_ID or DB_ROLL_PTR field in a clustered index, CHECK TABLE can cause InnoDB to access an invalid undo log record, resulting in an MVCCrelated server exit.
- If CHECK TABLE encounters errors in InnoDB tables or indexes, it reports an error, and usually marks the index and sometimes marks the table as corrupted, preventing further use of the index or table. Such errors include an incorrect number of entries in a secondary index or incorrect links.
- If CHECK TABLE finds an incorrect number of entries in a secondary index, it reports an error but does not cause a server exit or prevent access to the file.
- CHECK TABLE surveys the index page structure, then surveys each key entry. It does not validate the key pointer to a clustered record or follow the path for BLOB pointers.
- When an InnoDB table is stored in its own . ibd file, the first 3 pages of the . ibd file contain header information rather than table or index data. The CHECK TABLE statement does not detect inconsistencies that affect only the header data. To verify the entire contents of an InnoDB. ibd file, use the innochecksum command.
- When running CHECK TABLE on large InnoDB tables, other threads may be blocked during CHECK TABLE execution. To avoid timeouts, the semaphore wait threshold ( 600 seconds) is extended by 2 hours ( 7200 seconds) for CHECK TABLE operations. If InnoDB detects semaphore waits of 240 seconds or more, it starts printing InnoDB monitor output to the error log. If a lock request extends beyond the semaphore wait threshold, InnoDB aborts the process. To avoid the possibility of a semaphore wait timeout entirely, run CHECK TABLE QUICK instead of CHECK TABLE.
- CHECK TABLE functionality for InnoDB SPATIAL indexes includes an R-tree validity check and a check to ensure that the R-tree row count matches the clustered index.
- CHECK TABLE supports secondary indexes on virtual generated columns, which are supported by InnodB.
- InnoDB supports parallel clustered index reads, which can improve CHECK TABLE performance. InnoDB reads the clustered index twice during a CHECK TABLE operation. The second read can be performed in parallel. The innodb_parallel_read_threads session variable must be set to a value greater than 1 for parallel clustered index reads to occur. The actual number of threads used to perform a parallel clustered index read is determined by the innodb_parallel_read_threads setting or the number of index subtrees to scan, whichever is smaller.

\section*{CHECK TABLE Usage Notes for MyISAM Tables}

The following notes apply to MyISAM tables:
- CHECK TABLE updates key statistics for MyISAM tables.
- If CHECK TABLE output does not return OK or Table is already up to date, you should normally run a repair of the table. See Section 9.6, "MyISAM Table Maintenance and Crash Recovery".
- If none of the CHECK TABLE options QUICK, MEDIUM, or EXTENDED are specified, the default check type for dynamic-format MyISAM tables is MEDIUM. This has the same result as running myisamchk --medium-check tbl_name on the table. The default check type also is MEDIUM for static-format MyISAM tables, unless CHANGED or FAST is specified. In that case, the default is QUICK. The row scan is skipped for CHANGED and FAST because the rows are very seldom corrupted.

\subsection*{15.7.3.3 CHECKSUM TABLE Statement}

CHECKSUM TABLE tbl_name [, tbl_name] ... [QUICK | EXTENDED]
CHECKSUM TABLE reports a checksum for the contents of a table. You can use this statement to verify that the contents are the same before and after a backup, rollback, or other operation that is intended to put the data back to a known state.

This statement requires the SELECT privilege for the table.
This statement is not supported for views. If you run CHECKSUM TABLE against a view, the Checksum value is always NULL, and a warning is returned.

For a nonexistent table, CHECKSUM TABLE returns NULL and generates a warning.
During the checksum operation, the table is locked with a read lock for InnoDB and MyISAM.

