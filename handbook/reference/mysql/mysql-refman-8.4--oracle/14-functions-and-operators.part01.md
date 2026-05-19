\section*{Chapter 14 Functions and Operators}
Table of Contents
14.1 Built-In Function and Operator Reference ..... 2083
14.2 Loadable Function Reference ..... 2100
14.3 Type Conversion in Expression Evaluation ..... 2104
14.4 Operators ..... 2108
14.4.1 Operator Precedence ..... 2109
14.4.2 Comparison Functions and Operators ..... 2110
14.4.3 Logical Operators ..... 2117
14.4.4 Assignment Operators ..... 2118
14.5 Flow Control Functions ..... 2120
14.6 Numeric Functions and Operators ..... 2122
14.6.1 Arithmetic Operators ..... 2123
14.6.2 Mathematical Functions ..... 2125
14.7 Date and Time Functions ..... 2134
14.8 String Functions and Operators ..... 2157
14.8.1 String Comparison Functions and Operators ..... 2172
14.8.2 Regular Expressions ..... 2176
14.8.3 Character Set and Collation of Function Results ..... 2183
14.9 Full-Text Search Functions ..... 2184
14.9.1 Natural Language Full-Text Searches ..... 2186
14.9.2 Boolean Full-Text Searches ..... 2189
14.9.3 Full-Text Searches with Query Expansion ..... 2194
14.9.4 Full-Text Stopwords ..... 2195
14.9.5 Full-Text Restrictions ..... 2199
14.9.6 Fine-Tuning MySQL Full-Text Search ..... 2200
14.9.7 Adding a User-Defined Collation for Full-Text Indexing ..... 2203
14.9.8 ngram Full-Text Parser ..... 2205
14.9.9 MeCab Full-Text Parser Plugin ..... 2207
14.10 Cast Functions and Operators ..... 2211
14.11 XML Functions ..... 2225
14.12 Bit Functions and Operators ..... 2235
14.13 Encryption and Compression Functions ..... 2245
14.14 Locking Functions ..... 2253
14.15 Information Functions ..... 2255
14.16 Spatial Analysis Functions ..... 2266
14.16.1 Spatial Function Reference ..... 2267
14.16.2 Argument Handling by Spatial Functions ..... 2269
14.16.3 Functions That Create Geometry Values from WKT Values ..... 2270
14.16.4 Functions That Create Geometry Values from WKB Values ..... 2272
14.16.5 MySQL-Specific Functions That Create Geometry Values ..... 2274
14.16.6 Geometry Format Conversion Functions ..... 2275
14.16.7 Geometry Property Functions ..... 2277
14.16.8 Spatial Operator Functions ..... 2289
14.16.9 Functions That Test Spatial Relations Between Geometry Objects ..... 2296
14.16.10 Spatial Geohash Functions ..... 2307
14.16.11 Spatial GeoJSON Functions ..... 2309
14.16.12 Spatial Aggregate Functions ..... 2311
14.16.13 Spatial Convenience Functions ..... 2313
14.17 JSON Functions ..... 2316
14.17.1 JSON Function Reference ..... 2317
14.17.2 Functions That Create JSON Values ..... 2319
14.17.3 Functions That Search JSON Values ..... 2320
14.17.4 Functions That Modify JSON Values ..... 2334
14.17.5 Functions That Return JSON Value Attributes ..... 2343
14.17.6 JSON Table Functions ..... 2345
14.17.7 JSON Schema Validation Functions ..... 2350
14.17.8 JSON Utility Functions ..... 2356
14.18 Replication Functions ..... 2361
14.18.1 Group Replication Functions ..... 2362
14.18.2 Functions Used with Global Transaction Identifiers (GTIDs) ..... 2370
14.18.3 Asynchronous Replication Channel Failover Functions ..... 2372
14.18.4 Position-Based Synchronization Functions ..... 2377
14.19 Aggregate Functions ..... 2378
14.19.1 Aggregate Function Descriptions ..... 2378
14.19.2 GROUP BY Modifiers ..... 2388
14.19.3 MySQL Handling of GROUP BY ..... 2394
14.19.4 Detection of Functional Dependence ..... 2397
14.20 Window Functions ..... 2400
14.20.1 Window Function Descriptions ..... 2401
14.20.2 Window Function Concepts and Syntax ..... 2407
14.20.3 Window Function Frame Specification ..... 2411
14.20.4 Named Windows ..... 2414
14.20.5 Window Function Restrictions ..... 2415
14.21 Performance Schema Functions ..... 2416
14.22 Internal Functions ..... 2419
14.23 Miscellaneous Functions ..... 2420
14.24 Precision Math ..... 2434
14.24.1 Types of Numeric Values ..... 2434
14.24.2 DECIMAL Data Type Characteristics ..... 2435
14.24.3 Expression Handling ..... 2436
14.24.4 Rounding Behavior ..... 2437
14.24.5 Precision Math Examples ..... 2438

Expressions can be used at several points in SQL statements, such as in the ORDER BY or HAVING clauses of SELECT statements, in the WHERE clause of a SELECT, DELETE, or UPDATE statement, or in SET statements. Expressions can be written using values from several sources, such as literal values, column values, NULL, variables, built-in functions and operators, loadable functions, and stored functions (a type of stored object).

This chapter describes the built-in functions and operators that are permitted for writing expressions in MySQL. For information about loadable functions and stored functions, see Section 7.7, "MySQL Server Loadable Functions", and Section 27.2, "Using Stored Routines". For the rules describing how the server interprets references to different kinds of functions, see Section 11.2.5, "Function Name Parsing and Resolution".

An expression that contains NULL always produces a NULL value unless otherwise indicated in the documentation for a particular function or operator.

\section*{Note}

By default, there must be no whitespace between a function name and the parenthesis following it. This helps the MySQL parser distinguish between function calls and references to tables or columns that happen to have the same name as a function. However, spaces around function arguments are permitted.

To tell the MySQL server to accept spaces after function names by starting it with the --sql-mode=IGNORE_SPACE option. (See Section 7.1.11, "Server SQL Modes".) Individual client programs can request this behavior by using the CLIENT_IGNORE_SPACE option for mysql_real_connect ( ). In either case, all function names become reserved words.

For the sake of brevity, some examples in this chapter display the output from the mysql program in abbreviated form. Rather than showing examples in this format:
```
mysql> SELECT MOD(29,9);
+------------+
| mod(29,9) |
+------------+
| 2 |
+------------+
1 rows in set (0.00 sec)
```


This format is used instead:
```
mysql> SELECT MOD(29,9);
    -> 2
```


\subsection*{14.1 Built-In Function and Operator Reference}

The following table lists each built-in (native) function and operator and provides a short description of each one. For a table listing functions that are loadable at runtime, see Section 14.2, "Loadable Function Reference".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.1 Built-In Functions and Operators}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline \& & Bitwise AND & \\
\hline > & Greater than operator & \\
\hline >> & Right shift & \\
\hline >= & Greater than or equal operator & \\
\hline < & Less than operator & \\
\hline <>, != & Not equal operator & \\
\hline << & Left shift & \\
\hline <= & Less than or equal operator & \\
\hline <=> & NULL-safe equal to operator & \\
\hline \%, MOD & Modulo operator & \\
\hline * & Multiplication operator & \\
\hline + & Addition operator & \\
\hline - & Minus operator & \\
\hline - & Change the sign of the argument & \\
\hline -> & Return value from JSON column after evaluating path; equivalent to JSON_EXTRACT(). & \\
\hline ->> & Return value from JSON column after evaluating path and unquoting the result; equivalent to JSON_UNQUOTE(JSON_EXTRACT()). & \\
\hline / & Division operator & \\
\hline := & Assign a value & \\
\hline = & Assign a value (as part of a SET statement, or as part of the SET clause in an UPDATE statement) & \\
\hline = & Equal operator & \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline $\wedge$ & Bitwise XOR & \\
\hline ABS( ) & Return the absolute value & \\
\hline ACOS() & Return the arc cosine & \\
\hline ADDDATE() & Add time values (intervals) to a date value & \\
\hline ADDTIME() & Add time & \\
\hline AES_DECRYPT( ) & Decrypt using AES & \\
\hline AES_ENCRYPT() & Encrypt using AES & \\
\hline AND, \&\& & Logical AND & \\
\hline ANY_VALUE ( ) & Suppress ONLY_FULL_GROUP_BY value rejection & \\
\hline ASCII() & Return numeric value of left-most character & \\
\hline ASIN() & Return the arc sine & \\
\hline asynchronous_connection_f & Addbgrœupandembæn sgerce(e) server configuration information to a replication channel source list & \\
\hline asynchronous_connection_f & Aidlbsource server configu ration information server to a replication channel source list & \\
\hline asynchronous_connection_f & Rielmow admadræagedngrowipfcb(m) a replication channel source list & \\
\hline asynchronous_connection_f & Rielmow ącse Ludæs erver frem (n)a replication channel source list & \\
\hline asynchronous_connection_f & Rielmore alt settings relating to group replication asynchronous failover & \\
\hline ATAN ( ) & Return the arc tangent & \\
\hline ATAN2( ), ATAN( ) & Return the arc tangent of the two arguments & \\
\hline AVG ( ) & Return the average value of the argument & \\
\hline BENCHMARK( ) & Repeatedly execute an expression & \\
\hline BETWEEN ... AND ... & Whether a value is within a range of values & \\
\hline BIN() & Return a string containing binary representation of a number & \\
\hline BIN_TO_UUID() & Convert binary UUID to string & \\
\hline BINARY & Cast a string to a binary string & Yes \\
\hline BIT_AND( ) & Return bitwise AND & \\
\hline BIT_COUNT( ) & Return the number of bits that are set & \\
\hline BIT_LENGTH( ) & Return length of argument in bits & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline BIT_OR( ) & Return bitwise OR & \\
\hline BIT_XOR() & Return bitwise XOR & \\
\hline CAN_ACCESS_COLUMN ( ) & Internal use only & \\
\hline CAN_ACCESS_DATABASE( ) & Internal use only & \\
\hline CAN_ACCESS_TABLE() & Internal use only & \\
\hline CAN_ACCESS_USER( ) & Internal use only & \\
\hline CAN_ACCESS_VIEW( ) & Internal use only & \\
\hline CASE & Case operator & \\
\hline CAST( ) & Cast a value as a certain type & \\
\hline CEIL() & Return the smallest integer value not less than the argument & \\
\hline CEILING() & Return the smallest integer value not less than the argument & \\
\hline CHAR( ) & Return the character for each integer passed & \\
\hline CHAR_LENGTH ( ) & Return number of characters in argument & \\
\hline CHARACTER_LENGTH( ) & Synonym for CHAR_LENGTH() & \\
\hline CHARSET ( ) & Return the character set of the argument & \\
\hline COALESCE() & Return the first non-NULL argument & \\
\hline COERCIBILITY() & Return the collation coercibility value of the string argument & \\
\hline COLLATION() & Return the collation of the string argument & \\
\hline COMPRESS( ) & Return result as a binary string & \\
\hline CONCAT( ) & Return concatenated string & \\
\hline CONCAT_WS( ) & Return concatenate with separator & \\
\hline CONNECTION_ID() & Return the connection ID (thread ID) for the connection & \\
\hline CONV( ) & Convert numbers between different number bases & \\
\hline CONVERT( ) & Cast a value as a certain type & \\
\hline CONVERT_TZ( ) & Convert from one time zone to another & \\
\hline $\cos ()$ & Return the cosine & \\
\hline COT( ) & Return the cotangent & \\
\hline COUNT( ) & Return a count of the number of rows returned & \\
\hline COUNT(DISTINCT) & Return the count of a number of different values & \\
\hline CRC32() & Compute a cyclic redundancy check value & \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Built-In Function and Operator Reference}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline CUME_DIST() & Cumulative distribution value & \\
\hline CURDATE() & Return the current date & \\
\hline CURRENT_DATE(), CURRENT_DATE & Synonyms for CURDATE() & \\
\hline CURRENT_ROLE() & Return the current active roles & \\
\hline CURRENT_TIME(), CURRENT_TIME & Synonyms for CURTIME() & \\
\hline CURRENT_TIMESTAMP( ), CURRENT_TIMESTAMP & Synonyms for NOW() & \\
\hline CURRENT_USER( ), CURRENT_USER & The authenticated user name and host name & \\
\hline CURTIME ( ) & Return the current time & \\
\hline DATABASE() & Return the default (current) database name & \\
\hline DATE( ) & Extract the date part of a date or datetime expression & \\
\hline DATE_ADD() & Add time values (intervals) to a date value & \\
\hline DATE_FORMAT( ) & Format date as specified & \\
\hline DATE_SUB() & Subtract a time value (interval) from a date & \\
\hline DATEDIFF() & Subtract two dates & \\
\hline DAY( ) & Synonym for DAYOFMONTH() & \\
\hline DAYNAME ( ) & Return the name of the weekday & \\
\hline DAYOFMONTH() & Return the day of the month (0-31) & \\
\hline DAYOFWEEK( ) & Return the weekday index of the argument & \\
\hline DAYOFYEAR( ) & Return the day of the year (1-366) & \\
\hline DEFAULT( ) & Return the default value for a table column & \\
\hline DEGREES( ) & Convert radians to degrees & \\
\hline DENSE_RANK() & Rank of current row within its partition, without gaps & \\
\hline DIV & Integer division & \\
\hline ELT( ) & Return string at index number & \\
\hline EXISTS( ) & Whether the result of a query contains any rows & \\
\hline EXP ( ) & Raise to the power of & \\
\hline EXPORT_SET() & Return a string such that for every bit set in the value bits, you get an on string and for every unset bit, you get an off string & \\
\hline EXTRACT( ) & Extract part of a date & \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline ExtractValue() & Extract a value from an XML string using XPath notation & \\
\hline FIELD() & Index (position) of first argument in subsequent arguments & \\
\hline FIND_IN_SET() & Index (position) of first argument within second argument & \\
\hline FIRST_VALUE() & Value of argument from first row of window frame & \\
\hline FLOOR( ) & Return the largest integer value not greater than the argument & \\
\hline FORMAT( ) & Return a number formatted to specified number of decimal places & \\
\hline FORMAT_BYTES( ) & Convert byte count to value with units & \\
\hline FORMAT_PICO_TIME() & Convert time in picoseconds to value with units & \\
\hline FOUND_ROWS() & For a SELECT with a LIMIT clause, the number of rows that would be returned were there no LIMIT clause & \\
\hline FROM_BASE64( ) & Decode base64 encoded string and return result & \\
\hline FROM_DAYS( ) & Convert a day number to a date & \\
\hline FROM_UNIXTIME() & Format Unix timestamp as a date & \\
\hline GeomCollection() & Construct geometry collection from geometries & \\
\hline GeometryCollection() & Construct geometry collection from geometries & \\
\hline GET_DD_COLUMN_PRIVILEGES( & )Internal use only & \\
\hline GET_DD_CREATE_OPTIONS( ) & Internal use only & \\
\hline GET_DD_INDEX_SUB_PART_LEN & Ontternal use only & \\
\hline GET_FORMAT( ) & Return a date format string & \\
\hline GET_LOCK( ) & Get a named lock & \\
\hline GREATEST( ) & Return the largest argument & \\
\hline GROUP_CONCAT( ) & Return a concatenated string & \\
\hline group_replication_disable & Disable membéDa¢ction for event specified & \\
\hline group_replication_enable_ & Eamalbor mæntiæra(ction for event specified & \\
\hline group_replication_get_com & C\&et Mension rof grautpreplicątion communication protocol currently in use & \\
\hline group_replication_get_wri & Getomaximum mayber of consensus instances currently set for group & \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Built-In Function and Operator Reference}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline group_replication_reset_m & AReset all antermber (ąctions to defaults and configuration version number to 1 & \\
\hline group_replication_set_as & Makeą \$pęcific group member the primary & \\
\hline group_replication_set_com & Set version forpgroup ceplication communication protocol to use & \\
\hline group_replication_set_wri & Set maximumen number of consensus instances that can be executed in parallel & \\
\hline group_replication_switch & Changesthe minder of angdou(p) running in single-primary mode to multi-primary mode & \\
\hline group_replication_switch & ![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2118.jpg?height=43\&width=496\&top_left_y=934\&top_left_x=823) running in multi-primary mode to single-primary mode & \\
\hline GROUPING() & Distinguish super-aggregate ROLLUP rows from regular rows & \\
\hline HEX( ) & Hexadecimal representation of decimal or string value & \\
\hline HOUR( ) & Extract the hour & \\
\hline ICU_VERSION( ) & ICU library version & \\
\hline IF ( ) & If/else construct & \\
\hline IFNULL() & Null if/else construct & \\
\hline IN ( ) & Whether a value is within a set of values & \\
\hline INET_ATON( ) & Return the numeric value of an IP address & \\
\hline INET_NTOA( ) & Return the IP address from a numeric value & \\
\hline INSERT( ) & Insert substring at specified position up to specified number of characters & \\
\hline INSTR( ) & Return the index of the first occurrence of substring & \\
\hline INTERNAL_AUTO_INCREMENT( ) & Internal use only & \\
\hline INTERNAL_AVG_ROW_LENGTH() & Internal use only & \\
\hline INTERNAL_CHECK_TIME( ) & Internal use only & \\
\hline INTERNAL_CHECKSUM( ) & Internal use only & \\
\hline INTERNAL_DATA_FREE( ) & Internal use only & \\
\hline INTERNAL_DATA_LENGTH ( ) & Internal use only & \\
\hline INTERNAL_DD_CHAR_LENGTH( ) & Internal use only & \\
\hline INTERNAL_GET_COMMENT_OR_E & Rrteryall use only & \\
\hline INTERNAL_GET_ENABLED_ROLE & Inteonal )use only & \\
\hline INTERNAL_GET_HOSTNAME( ) & Internal use only & \\
\hline INTERNAL_GET_USERNAME ( ) & Internal use only & \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline INTERNAL_GET_VIEW_WARNING & Internatrise (only & \\
\hline INTERNAL_INDEX_COLUMN_CAR & DunteAnal Use )only & \\
\hline INTERNAL_INDEX_LENGTH( ) & Internal use only & \\
\hline INTERNAL_IS_ENABLED_ROLE ( & )nternal use only & \\
\hline INTERNAL_IS_MANDATORY_ROL & triternal use only & \\
\hline INTERNAL_KEYS_DISABLED ( ) & Internal use only & \\
\hline INTERNAL_MAX_DATA_LENGTH( & Internal use only & \\
\hline INTERNAL_TABLE_ROWS( ) & Internal use only & \\
\hline INTERNAL_UPDATE_TIME() & Internal use only & \\
\hline INTERVAL ( ) & Return the index of the argument that is less than the first argument & \\
\hline IS & Test a value against a boolean & \\
\hline IS_FREE_LOCK( ) & Whether the named lock is free & \\
\hline IS NOT & Test a value against a boolean & \\
\hline IS NOT NULL & NOT NULL value test & \\
\hline IS NULL & NULL value test & \\
\hline IS_USED_LOCK( ) & Whether the named lock is in use; return connection identifier if true & \\
\hline IS_UUID() & Whether argument is a valid UUID & \\
\hline ISNULL() & Test whether the argument is NULL & \\
\hline JSON_ARRAY() & Create JSON array & \\
\hline JSON_ARRAY_APPEND ( ) & Append data to JSON document & \\
\hline JSON_ARRAY_INSERT( ) & Insert into JSON array & \\
\hline JSON_ARRAYAGG ( ) & Return result set as a single JSON array & \\
\hline JSON_CONTAINS() & Whether JSON document contains specific object at path & \\
\hline JSON_CONTAINS_PATH( ) & Whether JSON document contains any data at path & \\
\hline JSON_DEPTH() & Maximum depth of JSON document & \\
\hline JSON_EXTRACT( ) & Return data from JSON document & \\
\hline JSON_INSERT() & Insert data into JSON document & \\
\hline JSON_KEYS( ) & Array of keys from JSON document & \\
\hline JSON_LENGTH( ) & Number of elements in JSON document & \\
\hline JSON_MERGE() & Merge JSON documents, preserving duplicate keys. & Yes \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Built-In Function and Operator Reference}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline & Deprecated synonym for JSON_MERGE_PRESERVE() & \\
\hline JSON_MERGE_PATCH ( ) & Merge JSON documents, replacing values of duplicate keys & \\
\hline JSON_MERGE_PRESERVE( ) & Merge JSON documents, preserving duplicate keys & \\
\hline JSON_OBJECT( ) & Create JSON object & \\
\hline JSON_OBJECTAGG() & Return result set as a single JSON object & \\
\hline JSON_OVERLAPS( ) & Compares two JSON documents, returns TRUE (1) if these have any key-value pairs or array elements in common, otherwise FALSE (0) & \\
\hline JSON_PRETTY() & Print a JSON document in human-readable format & \\
\hline JSON_QUOTE( ) & Quote JSON document & \\
\hline JSON_REMOVE() & Remove data from JSON document & \\
\hline JSON_REPLACE() & Replace values in JSON document & \\
\hline JSON_SCHEMA_VALID( ) & Validate JSON document against JSON schema; returns TRUE/1 if document validates against schema, or FALSE/0 if it does not & \\
\hline JSON_SCHEMA_VALIDATION_RE & Vactidate JSON document against JSON schema; returns report in JSON format on outcome on validation including success or failure and reasons for failure & \\
\hline JSON_SEARCH( ) & Path to value within JSON document & \\
\hline JSON_SET( ) & Insert data into JSON document & \\
\hline JSON_STORAGE_FREE() & Freed space within binary representation of JSON column value following partial update & \\
\hline JSON_STORAGE_SIZE() & Space used for storage of binary representation of a JSON document & \\
\hline JSON_TABLE() & Return data from a JSON expression as a relational table & \\
\hline JSON_TYPE( ) & Type of JSON value & \\
\hline JSON_UNQUOTE( ) & Unquote JSON value & \\
\hline JSON_VALID( ) & Whether JSON value is valid & \\
\hline JSON_VALUE() & Extract value from JSON document at location pointed to by path provided; return this & \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline & value as VARCHAR(512) or specified type & \\
\hline LAG ( ) & Value of argument from row lagging current row within partition & \\
\hline LAST_DAY & Return the last day of the month for the argument & \\
\hline LAST_INSERT_ID( ) & Value of the AUTOINCREMENT column for the last INSERT & \\
\hline LAST_VALUE( ) & Value of argument from last row of window frame & \\
\hline LCASE( ) & Synonym for LOWER() & \\
\hline LEAD ( ) & Value of argument from row leading current row within partition & \\
\hline LEAST( ) & Return the smallest argument & \\
\hline LEFT( ) & Return the leftmost number of characters as specified & \\
\hline LENGTH( ) & Return the length of a string in bytes & \\
\hline LIKE & Simple pattern matching & \\
\hline LineString() & Construct LineString from Point values & \\
\hline LN ( ) & Return the natural logarithm of the argument & \\
\hline LOAD_FILE() & Load the named file & \\
\hline LOCALTIME(), LOCALTIME & Synonym for NOW() & \\
\hline LOCALTIMESTAMP, LOCALTIMESTAMP( ) & Synonym for NOW() & \\
\hline LOCATE( ) & Return the position of the first occurrence of substring & \\
\hline LOG ( ) & Return the natural logarithm of the first argument & \\
\hline LOG10( ) & Return the base-10 logarithm of the argument & \\
\hline LOG2( ) & Return the base-2 logarithm of the argument & \\
\hline LOWER( ) & Return the argument in lowercase & \\
\hline LPAD ( ) & Return the string argument, leftpadded with the specified string & \\
\hline LTRIM( ) & Remove leading spaces & \\
\hline MAKE_SET( ) & Return a set of commaseparated strings that have the corresponding bit in bits set & \\
\hline MAKEDATE() & Create a date from the year and day of year & \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Built-In Function and Operator Reference}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline MAKETIME() & Create time from hour, minute, second & \\
\hline MASTER_POS_WAIT( ) & Block until the replica has read and applied all updates up to the specified position & Yes \\
\hline MATCH( ) & Perform full-text search & \\
\hline MAX( ) & Return the maximum value & \\
\hline MBRContains() & Whether MBR of one geometry contains MBR of another & \\
\hline MBRCoveredBy() & Whether one MBR is covered by another & \\
\hline MBRCovers() & Whether one MBR covers another & \\
\hline MBRDisjoint() & Whether MBRs of two geometries are disjoint & \\
\hline MBREquals() & Whether MBRs of two geometries are equal & \\
\hline MBRIntersects() & Whether MBRs of two geometries intersect & \\
\hline MBROverlaps() & Whether MBRs of two geometries overlap & \\
\hline MBRTouches() & Whether MBRs of two geometries touch & \\
\hline MBRWithin() & Whether MBR of one geometry is within MBR of another & \\
\hline MD5 ( ) & Calculate MD5 checksum & \\
\hline MEMBER OF() & Returns true (1) if first operand matches any element of JSON array passed as second operand, otherwise returns false (0) & \\
\hline MICROSECOND() & Return the microseconds from argument & \\
\hline MID() & Return a substring starting from the specified position & \\
\hline MIN() & Return the minimum value & \\
\hline MINUTE() & Return the minute from the argument & \\
\hline MOD( ) & Return the remainder & \\
\hline MONTH( ) & Return the month from the date passed & \\
\hline MONTHNAME() & Return the name of the month & \\
\hline MultiLineString() & Contruct MultiLineString from LineString values & \\
\hline MultiPoint() & Construct MultiPoint from Point values & \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline MultiPolygon() & Construct MultiPolygon from Polygon values & \\
\hline NAME_CONST( ) & Cause the column to have the given name & \\
\hline NOT, ! & Negates value & \\
\hline NOT BETWEEN ... AND ... & Whether a value is not within a range of values & \\
\hline NOT EXISTS() & Whether the result of a query contains no rows & \\
\hline NOT IN() & Whether a value is not within a set of values & \\
\hline NOT LIKE & Negation of simple pattern matching & \\
\hline NOT REGEXP & Negation of REGEXP & \\
\hline NOW( ) & Return the current date and time & \\
\hline NTH_VALUE ( ) & Value of argument from N-th row of window frame & \\
\hline NTILE() & Bucket number of current row within its partition. & \\
\hline NULLIF( ) & Return NULL if expr1 = expr2 & \\
\hline OCT ( ) & Return a string containing octal representation of a number & \\
\hline OCTET_LENGTH() & Synonym for LENGTH() & \\
\hline OR, | | & Logical OR & \\
\hline ORD( ) & Return character code for leftmost character of the argument & \\
\hline PERCENT_RANK( ) & Percentage rank value & \\
\hline PERIOD_ADD() & Add a period to a year-month & \\
\hline PERIOD_DIFF() & Return the number of months between periods & \\
\hline PI() & Return the value of pi & \\
\hline Point() & Construct Point from coordinates & \\
\hline Polygon() & Construct Polygon from LineString arguments & \\
\hline POSITION() & Synonym for LOCATE() & \\
\hline POW ( ) & Return the argument raised to the specified power & \\
\hline POWER() & Return the argument raised to the specified power & \\
\hline PS_CURRENT_THREAD_ID() & Performance Schema thread ID for current thread & \\
\hline PS_THREAD_ID( ) & Performance Schema thread ID for given thread & \\
\hline QUARTER( ) & Return the quarter from a date argument & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline QUOTE( ) & Escape the argument for use in an SQL statement & \\
\hline RADIANS( ) & Return argument converted to radians & \\
\hline RAND ( ) & Return a random floating-point value & \\
\hline RANDOM_BYTES( ) & Return a random byte vector & \\
\hline RANK( ) & Rank of current row within its partition, with gaps & \\
\hline REGEXP & Whether string matches regular expression & \\
\hline REGEXP_INSTR( ) & Starting index of substring matching regular expression & \\
\hline REGEXP_LIKE() & Whether string matches regular expression & \\
\hline REGEXP_REPLACE() & Replace substrings matching regular expression & \\
\hline REGEXP_SUBSTR( ) & Return substring matching regular expression & \\
\hline RELEASE_ALL_LOCKS ( ) & Release all current named locks & \\
\hline RELEASE_LOCK( ) & Release the named lock & \\
\hline REPEAT( ) & Repeat a string the specified number of times & \\
\hline REPLACE() & Replace occurrences of a specified string & \\
\hline REVERSE( ) & Reverse the characters in a string & \\
\hline RIGHT() & Return the specified rightmost number of characters & \\
\hline RLIKE & Whether string matches regular expression & \\
\hline ROLES_GRAPHML ( ) & Return a GraphML document representing memory role subgraphs & \\
\hline ROUND ( ) & Round the argument & \\
\hline ROW_COUNT( ) & The number of rows updated & \\
\hline ROW_NUMBER( ) & Number of current row within its partition & \\
\hline RPAD( ) & Append string the specified number of times & \\
\hline RTRIM() & Remove trailing spaces & \\
\hline SCHEMA() & Synonym for DATABASE() & \\
\hline SEC_TO_TIME() & Converts seconds to 'hh:mm:ss' format & \\
\hline SECOND() & Return the second (0-59) & \\
\hline SESSION_USER() & Synonym for USER() & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline SHA1( ), SHA( ) & Calculate an SHA-1 160-bit checksum & \\
\hline SHA2() & Calculate an SHA-2 checksum & \\
\hline SIGN() & Return the sign of the argument & \\
\hline SIN() & Return the sine of the argument & \\
\hline SLEEP() & Sleep for a number of seconds & \\
\hline SOUNDEX() & Return a soundex string & \\
\hline SOUNDS LIKE & Compare sounds & \\
\hline SOURCE_POS_WAIT( ) & Block until the replica has read and applied all updates up to the specified position & \\
\hline SPACE() & Return a string of the specified number of spaces & \\
\hline SQRT( ) & Return the square root of the argument & \\
\hline ST_Area() & Return Polygon or MultiPolygon area & \\
\hline ST_AsBinary(), ST_AsWKB() & Convert from internal geometry format to WKB & \\
\hline ST_AsGeoJSON() & Generate GeoJSON object from geometry & \\
\hline ST_AsText(), ST_AsWKT() & Convert from internal geometry format to WKT & \\
\hline ST_Buffer() & Return geometry of points within given distance from geometry & \\
\hline ST_Buffer_Strategy() & Produce strategy option for ST_Buffer() & \\
\hline ST_Centroid() & Return centroid as a point & \\
\hline ST_Collect() & Aggregate spatial values into collection & \\
\hline ST_Contains() & Whether one geometry contains another & \\
\hline ST_ConvexHull() & Return convex hull of geometry & \\
\hline ST_Crosses() & Whether one geometry crosses another & \\
\hline ST_Difference() & Return point set difference of two geometries & \\
\hline ST_Dimension() & Dimension of geometry & \\
\hline ST_Disjoint() & Whether one geometry is disjoint from another & \\
\hline ST_Distance() & The distance of one geometry from another & \\
\hline ST_Distance_Sphere() & Minimum distance on earth between two geometries & \\
\hline ST_EndPoint() & End Point of LineString & \\
\hline ST_Envelope() & Return MBR of geometry & \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Built-In Function and Operator Reference}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline ST_Equals() & Whether one geometry is equal to another & \\
\hline ST_ExteriorRing() & Return exterior ring of Polygon & \\
\hline ST_FrechetDistance() & The discrete Fréchet distance of one geometry from another & \\
\hline ST_GeoHash() & Produce a geohash value & \\
\hline ST_GeomCollFromText(), ST_GeometryCollectionFrom ST_GeomCollFromTxt() & Return geometry collection from MNKT ( ), & \\
\hline ST_GeomCollFromWKB(), ST_GeometryCollectionFrom & Return geometry collection from WKKB) & \\
\hline ST_GeometryN() & Return N-th geometry from geometry collection & \\
\hline ST_GeometryType() & Return name of geometry type & \\
\hline ST_GeomFromGeoJSON() & Generate geometry from GeoJSON object & \\
\hline ST_GeomFromText(), ST_GeometryFromText() & Return geometry from WKT & \\
\hline ST_GeomFromWKB ( ), ST_GeometryFromWKB() & Return geometry from WKB & \\
\hline ST_HausdorffDistance() & The discrete Hausdorff distance of one geometry from another & \\
\hline ST_InteriorRingN() & Return N-th interior ring of Polygon & \\
\hline ST_Intersection() & Return point set intersection of two geometries & \\
\hline ST_Intersects() & Whether one geometry intersects another & \\
\hline ST_IsClosed() & Whether a geometry is closed and simple & \\
\hline ST_IsEmpty() & Whether a geometry is empty & \\
\hline ST_IsSimple() & Whether a geometry is simple & \\
\hline ST_IsValid() & Whether a geometry is valid & \\
\hline ST_LatFromGeoHash() & Return latitude from geohash value & \\
\hline ST_Latitude() & Return latitude of Point & \\
\hline ST_Length() & Return length of LineString & \\
\hline ST_LineFromText(), ST_LineStringFromText() & Construct LineString from WKT & \\
\hline ST_LineFromWKB ( ), ST_LineStringFromWKB() & Construct LineString from WKB & \\
\hline ST_LineInterpolatePoint() & The point a given percentage along a LineString & \\
\hline ST_LineInterpolatePoints(( & The points a given percentage along a LineString & \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline ST_LongFromGeoHash() & Return longitude from geohash value & \\
\hline ST_Longitude() & Return longitude of Point & \\
\hline ST_MakeEnvelope() & Rectangle around two points & \\
\hline ST_MLineFromText(), ST_MultiLineStringFromTex & Construct MultiLineString from WIKT & \\
\hline ST_MLineFromWKB(), ST_MultiLineStringFromWKB & Construct MultiLineString from MKB & \\
\hline ST_MPointFromText(), ST_MultiPointFromText() & Construct MultiPoint from WKT & \\
\hline ST_MPointFromWKB ( ), ST_MultiPointFromWKB() & Construct MultiPoint from WKB & \\
\hline ST_MPolyFromText(), ST_MultiPolygonFromText() & Construct MultiPolygon from WKT & \\
\hline ST_MPolyFromWKB(), ST_MultiPolygonFromWKB() & Construct MultiPolygon from WKB & \\
\hline ST_NumGeometries() & Return number of geometries in geometry collection & \\
\hline ST_NumInteriorRing(), ST_NumInteriorRings() & Return number of interior rings in Polygon & \\
\hline ST_NumPoints() & Return number of points in LineString & \\
\hline ST_Overlaps() & Whether one geometry overlaps another & \\
\hline ST_PointAtDistance() & The point a given distance along a LineString & \\
\hline ST_PointFromGeoHash() & Convert geohash value to POINT value & \\
\hline ST_PointFromText() & Construct Point from WKT & \\
\hline ST_PointFromWKB() & Construct Point from WKB & \\
\hline ST_PointN() & Return N-th point from LineString & \\
\hline ST_PolyFromText (), ST_PolygonFromText() & Construct Polygon from WKT & \\
\hline ST_PolyFromWKB ( ), ST_PolygonFromWKB() & Construct Polygon from WKB & \\
\hline ST_Simplify() & Return simplified geometry & \\
\hline ST_SRID() & Return spatial reference system ID for geometry & \\
\hline ST_StartPoint() & Start Point of LineString & \\
\hline ST_SwapXY( ) & Return argument with X/Y coordinates swapped & \\
\hline ST_SymDifference() & Return point set symmetric difference of two geometries & \\
\hline ST_Touches() & Whether one geometry touches another & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline ST_Transform() & Transform coordinates of geometry & \\
\hline ST_Union() & Return point set union of two geometries & \\
\hline ST_Validate() & Return validated geometry & \\
\hline ST_Within() & Whether one geometry is within another & \\
\hline ST_X() & Return X coordinate of Point & \\
\hline ST_Y( ) & Return Y coordinate of Point & \\
\hline STATEMENT_DIGEST() & Compute statement digest hash value & \\
\hline STATEMENT_DIGEST_TEXT( ) & Compute normalized statement digest & \\
\hline STD( ) & Return the population standard deviation & \\
\hline STDDEV( ) & Return the population standard deviation & \\
\hline STDDEV_POP ( ) & Return the population standard deviation & \\
\hline STDDEV_SAMP ( ) & Return the sample standard deviation & \\
\hline STR_TO_DATE( ) & Convert a string to a date & \\
\hline STRCMP() & Compare two strings & \\
\hline SUBDATE( ) & Synonym for DATE_SUB() when invoked with three arguments & \\
\hline SUBSTR( ) & Return the substring as specified & \\
\hline SUBSTRING() & Return the substring as specified & \\
\hline SUBSTRING_INDEX() & Return a substring from a string before the specified number of occurrences of the delimiter & \\
\hline SUBTIME () & Subtract times & \\
\hline SUM( ) & Return the sum & \\
\hline SYSDATE() & Return the time at which the function executes & \\
\hline SYSTEM_USER( ) & Synonym for USER() & \\
\hline TAN ( ) & Return the tangent of the argument & \\
\hline TIME () & Extract the time portion of the expression passed & \\
\hline TIME_FORMAT() & Format as time & \\
\hline TIME_TO_SEC() & Return the argument converted to seconds & \\
\hline TIMEDIFF() & Subtract time & \\
\hline TIMESTAMP() & With a single argument, this function returns the date or datetime expression; with two & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline & arguments, the sum of the arguments & \\
\hline TIMESTAMPADD() & Add an interval to a datetime expression & \\
\hline TIMESTAMPDIFF() & Return the difference of two datetime expressions, using the units specified & \\
\hline TO_BASE64 ( ) & Return the argument converted to a base-64 string & \\
\hline TO_DAYS( ) & Return the date argument converted to days & \\
\hline TO_SECONDS ( ) & Return the date or datetime argument converted to seconds since Year 0 & \\
\hline TRIM( ) & Remove leading and trailing spaces & \\
\hline TRUNCATE( ) & Truncate to specified number of decimal places & \\
\hline UCASE( ) & Synonym for UPPER() & \\
\hline UNCOMPRESS ( ) & Uncompress a string compressed & \\
\hline UNCOMPRESSED_LENGTH( ) & Return the length of a string before compression & \\
\hline UNHEX ( ) & Return a string containing hex representation of a number & \\
\hline UNIX_TIMESTAMP( ) & Return a Unix timestamp & \\
\hline UpdateXML ( ) & Return replaced XML fragment & \\
\hline UPPER( ) & Convert to uppercase & \\
\hline USER( ) & The user name and host name provided by the client & \\
\hline UTC_DATE( ) & Return the current UTC date & \\
\hline UTC_TIME( ) & Return the current UTC time & \\
\hline UTC_TIMESTAMP( ) & Return the current UTC date and time & \\
\hline UUID ( ) & Return a Universal Unique Identifier (UUID) & \\
\hline UUID_SHORT( ) & Return an integer-valued universal identifier & \\
\hline UUID_TO_BIN( ) & Convert string UUID to binary & \\
\hline VALIDATE_PASSWORD_STRENGT & Hetermine strength of password & \\
\hline VALUES( ) & Define the values to be used during an INSERT & \\
\hline VAR_POP( ) & Return the population standard variance & \\
\hline VAR_SAMP( ) & Return the sample variance & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline VARIANCE() & Return the population standard variance & \\
\hline VERSION() & Return a string that indicates the MySQL server version & \\
\hline WAIT_FOR_EXECUTED_GTID_SE & Watit until the given GTIDs have executed on the replica. & \\
\hline WEEK( ) & Return the week number & \\
\hline WEEKDAY() & Return the weekday index & \\
\hline WEEKOFYEAR( ) & Return the calendar week of the date (1-53) & \\
\hline WEIGHT_STRING() & Return the weight string for a string & \\
\hline XOR & Logical XOR & \\
\hline YEAR( ) & Return the year & \\
\hline YEARWEEK( ) & Return the year and week & \\
\hline | & Bitwise OR & \\
\hline ~ & Bitwise inversion & \\
\hline
\end{tabular}

\subsection*{14.2 Loadable Function Reference}

The following table lists each function that is loadable at runtime and provides a short description of each one. For a table listing built-in functions and operators, see Section 14.1, "Built-In Function and Operator Reference"

For general information about loadable functions, see Section 7.7, "MySQL Server Loadable Functions".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.2 Loadable Functions}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline asymmetric_decrypt() & Decrypt ciphertext using private or public key & \\
\hline asymmetric_derive() & Derive symmetric key from asymmetric keys & \\
\hline asymmetric_encrypt() & Encrypt cleartext using private or public key & \\
\hline asymmetric_sign() & Generate signature from digest & \\
\hline asymmetric_verify() & Verify that signature matches digest & \\
\hline asynchronous_connection_f & Aidlbæ ærpliæation soarcædserver in a managed group to the source list & \\
\hline asynchronous_connection_f & Aidlba æpliæation source(s)erver to the source list & \\
\hline asynchronous_connection_f & Rielmow managed gnaupąted ( ) replication source servers from the source list & \\
\hline asynchronous_connection_f & Riemore adeplidation ocsource( ) server from the source list & \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline audit_api_message_emit_ud & A(dd message event to audit log & \\
\hline audit_log_encryption_pass & Feetch gedit log encryption password & \\
\hline audit_log_encryption_pass & Set cluslit \#6g encryption password & \\
\hline audit_log_filter_flush() & Flush audit log filter tables & \\
\hline audit_log_filter_remove_f & Remav(e) audit log filter & \\
\hline audit_log_filter_remove_u & dtrassign audit log filter from user & \\
\hline audit_log_filter_set_filt & Deffine audit log filter & \\
\hline audit_log_filter_set_user & (A)ssign audit log filter to user & \\
\hline audit_log_read() & Return audit log records & \\
\hline audit_log_read_bookmark() & Bookmark for most recent audit log event & \\
\hline audit_log_rotate() & Rotate audit log file & \\
\hline create_asymmetric_priv_ke & Créate private key & \\
\hline create_asymmetric_pub_key & (C)reate public key & \\
\hline create_dh_parameters() & Generate shared DH secret & \\
\hline create_digest() & Generate digest from string & \\
\hline firewall_group_delist() & Remove account from firewall group profile & \\
\hline firewall_group_enlist() & Add account to firewall group profile & \\
\hline flush_rewrite_rules() & Load rewrite_rules table into Rewriter cache & \\
\hline gen_blacklist() & Perform dictionary term replacement & Yes \\
\hline gen_blocklist() & Perform dictionary term replacement & \\
\hline gen_blocklist() & Perform dictionary term replacement & \\
\hline gen_dictionary() & Return random term from dictionary & \\
\hline gen_dictionary_drop() & Remove dictionary from registry & \\
\hline gen_dictionary_load() & Load dictionary into registry & \\
\hline gen_dictionary() & Return random term from dictionary & \\
\hline gen_range() & Generate random number within range & \\
\hline gen_range() & Generate random number within range & \\
\hline gen_rnd_canada_sin() & Generate random Canada Social Insurance Number & \\
\hline gen_rnd_email() & Generate random email address & \\
\hline gen_rnd_email() & Generate random email address & \\
\hline
\end{tabular}

\section*{Loadable Function Reference}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline gen_rnd_iban() & Generate random International Bank Account Number & \\
\hline gen_rnd_pan( ) & Generate random payment card Primary Account Number & \\
\hline gen_rnd_pan() & Generate random payment card Primary Account Number & \\
\hline gen_rnd_ssn() & Generate random US Social Security Number & \\
\hline gen_rnd_ssn() & Generate random US Social Security Number & \\
\hline gen_rnd_uk_nin( ) & Generate random United Kingdom National Insurance Number & \\
\hline gen_rnd_us_phone() & Generate random US phone number & \\
\hline gen_rnd_us_phone ( ) & Generate random US phone number & \\
\hline gen_rnd_uuid ( ) & Generate random Universally Unique Identifier & \\
\hline group_replication_disable & Emabbe a membenadtion so that the member does not take it in the specified situation & \\
\hline group_replication_enable & Eanabler a amember (àction for the member to take in the specified situation & \\
\hline group_replication_get_com & ReturmaGrioup Replicatioh( ) protocol version & \\
\hline group_replication_get_wri & Returmmaximuurayn(u)mber of consensus instances executable in parallel & \\
\hline group_replication_reset_m & Reset thre memmse(r)actions configuration to the default settings & \\
\hline group_replication_set_as & Assignrgroup member as new primary & \\
\hline group_replication_set_com & Set Grætyprepplication pictocol version & \\
\hline group_replication_set_wri & Set maxcimumenumber of consensus instances executable in parallel & \\
\hline group_replication_switch & Changetgroup froam singtete ( ) primary to multi-primary mode & \\
\hline group_replication_switch & Chaætogægroup froma myultirepulien(ary to single-primary mode & \\
\hline keyring_aws_rotate_cmk () & Rotate AWS customer master key & \\
\hline keyring_aws_rotate_keys() & Rotate keys in keyring_aws storage file & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline keyring_hashicorp_update_ & Causeguntime keyring_hashicorp reconfiguration & \\
\hline keyring_key_fetch() & Fetch keyring key value & \\
\hline keyring_key_generate() & Generate random keyring key & \\
\hline keyring_key_length_fetch( & Return keyring key length & \\
\hline keyring_key_remove() & Remove keyring key & \\
\hline keyring_key_store() & Store key in keyring & \\
\hline keyring_key_type_fetch() & Return keyring key type & \\
\hline load_rewrite_rules() & Rewriter plugin helper routine & \\
\hline mask_canada_sin() & Mask Canada Social Insurance Number & \\
\hline mask_iban() & Mask International Bank Account Number & \\
\hline mask_inner() & Mask interior part of string & \\
\hline mask_inner() & Mask interior part of string & \\
\hline mask_outer() & Mask left and right parts of string & \\
\hline mask_outer() & Mask left and right parts of string & \\
\hline mask_pan() & Mask payment card Primary Account Number part of string & \\
\hline mask_pan() & Mask payment card Primary Account Number part of string & \\
\hline mask_pan_relaxed ( ) & Mask payment card Primary Account Number part of string & \\
\hline mask_pan_relaxed ( ) & Mask payment card Primary Account Number part of string & \\
\hline mask_ssn() & Mask US Social Security Number & \\
\hline mask_ssn() & Mask US Social Security Number & \\
\hline mask_uk_nin() & Mask United Kingdom National Insurance Number & \\
\hline mask_uuid() & Mask Universally Unique Identifier part of string & \\
\hline masking_dictionaries_flus & Caluse masking_dictionaries cache to be reloaded from table & \\
\hline masking_dictionary_remove & Remove dictionary from the database table & \\
\hline masking_dictionary_term_a & Add(d)new term to the dictionary & \\
\hline masking_dictionary_term_r & ARenaeve) existing term from the dictionary & \\
\hline mysql_firewall_flush_stat & Regset firewall status variables & \\
\hline mysql_query_attribute_str & Fretch) query attribute value & \\
\hline normalize_statement() & Normalize SQL statement to digest form & \\
\hline read_firewall_group_allow & Updatè) firewall group profile recorded-statement cache & \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Type Conversion in Expression Evaluation}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline read_firewall_groups() & Update firewall group profile cache & \\
\hline read_firewall_users() & Update firewall account profile cache & Yes \\
\hline read_firewall_whitelist() & Update firewall account profile recorded-statement cache & Yes \\
\hline service_get_read_locks() & Acquire locking service shared locks & \\
\hline service_get_write_locks() & Acquire locking service exclusive locks & \\
\hline service_release_locks() & Release locking service locks & \\
\hline set_firewall_group_mode() & Establish firewall group profile operational mode & \\
\hline set_firewall_mode() & Establish firewall account profile operational mode & Yes \\
\hline version_tokens_delete() & Delete tokens from version tokens list & \\
\hline version_tokens_edit() & Modify version tokens list & \\
\hline version_tokens_lock_exclu & Aicquirè exclusive locks on version tokens & \\
\hline version_tokens_lock_share & A(cquire shared locks on version tokens & \\
\hline version_tokens_set() & Set version tokens list & \\
\hline version_tokens_show() & Return version tokens list & \\
\hline version_tokens_unlock() & Release version tokens locks & \\
\hline
\end{tabular}
\end{table}

\subsection*{14.3 Type Conversion in Expression Evaluation}

When an operator is used with operands of different types, type conversion occurs to make the operands compatible. Some conversions occur implicitly. For example, MySQL automatically converts strings to numbers as necessary, and vice versa.
```
mysql> SELECT 1+'1';
    -> 2
mysql> SELECT CONCAT(2,' test');
    -> '2 test'
```


It is also possible to convert a number to a string explicitly using the CAST( ) function. Conversion occurs implicitly with the CONCAT ( ) function because it expects string arguments.
```
mysql> SELECT 38.8, CAST(38.8 AS CHAR);
    -> 38.8, '38.8'
mysql> SELECT 38.8, CONCAT(38.8);
    -> 38.8, '38.8'
```


See later in this section for information about the character set of implicit number-to-string conversions, and for modified rules that apply to CREATE TABLE . . . SELECT statements.

The following rules describe how conversion occurs for comparison operations:
- If one or both arguments are NULL, the result of the comparison is NULL, except for the NULL-safe <=> equality comparison operator. For NULL <=> NULL, the result is true. No conversion is needed.
- If both arguments in a comparison operation are strings, they are compared as strings.
- If both arguments are integers, they are compared as integers.
- Hexadecimal values are treated as binary strings if not compared to a number.
- If one of the arguments is a TIMESTAMP or DATETIME column and the other argument is a constant, the constant is converted to a timestamp before the comparison is performed. This is done to be more ODBC-friendly. This is not done for the arguments to IN ( ). To be safe, always use complete datetime, date, or time strings when doing comparisons. For example, to achieve best results when using BETWEEN with date or time values, use CAST ( ) to explicitly convert the values to the desired data type.

A single-row subquery from a table or tables is not considered a constant. For example, if a subquery returns an integer to be compared to a DATETIME value, the comparison is done as two integers. The integer is not converted to a temporal value. To compare the operands as DATETIME values, use CAST( ) to explicitly convert the subquery value to DATETIME.
- If one of the arguments is a decimal value, comparison depends on the other argument. The arguments are compared as decimal values if the other argument is a decimal or integer value, or as floating-point values if the other argument is a floating-point value.
- In all other cases, the arguments are compared as floating-point (double-precision) numbers. For example, a comparison of string and numeric operands takes place as a comparison of floating-point numbers.

For information about conversion of values from one temporal type to another, see Section 13.2.8, "Conversion Between Date and Time Types".

Comparison of JSON values takes place at two levels. The first level of comparison is based on the JSON types of the compared values. If the types differ, the comparison result is determined solely by which type has higher precedence. If the two values have the same JSON type, a second level of comparison occurs using type-specific rules. For comparison of JSON and non-JSON values, the non-JSON value is converted to JSON and the values compared as JSON values. For details, see Comparison and Ordering of JSON Values.

The following examples illustrate conversion of strings to numbers for comparison operations:
```
mysql> SELECT 1 > '6x';
    -> 0
mysql> SELECT 7 > '6x';
    -> 1
mysql> SELECT 0 > 'x6';
    -> 0
mysql> SELECT 0 = 'x6';
    -> 1
```


For comparisons of a string column with a number, MySQL cannot use an index on the column to look up the value quickly. If str_col is an indexed string column, the index cannot be used when performing the lookup in the following statement:
```
SELECT * FROM tbl_name WHERE str_col=1;
```


The reason for this is that there are many different strings that may convert to the value 1 , such as '1', ' 1', or '1a'.

Another issue can arise when comparing a string column with integer 0. Consider table t1 created and populated as shown here:
```
mysql> CREATE TABLE t1 (
    -> c1 INT NOT NULL AUTO_INCREMENT,
    -> c2 INT DEFAULT NULL,
    -> c3 VARCHAR(25) DEFAULT NULL,
    -> PRIMARY KEY (c1)
    -> );
```

```
Query OK, 0 rows affected (0.03 sec)
mysql> INSERT INTO t1 VALUES ROW(1, 52, 'grape'), ROW(2, 139, 'apple'),
    -> ROW(3, 37, 'peach'), ROW(4, 221, 'watermelon'),
    -> ROW(5, 83, 'pear');
Query OK, 5 rows affected (0.01 sec)
Records: 5 Duplicates: 0 Warnings: 0
```


Observe the result when selecting from this table and comparing c 3 , which is a VARCHAR column, with integer 0:
```
mysql> SELECT * FROM t1 WHERE c3 = 0;
+----+-------+------------+
| c1 | c2 | c3 |
+----+-------+------------+
| 1 | 52 | grape
| 2 | 139 | apple
| 3 | 37 | peach |
| 4 | 221 | watermelon |
| 5 | 83 | pear |
+----+-------+------------+
5 rows in set, 5 warnings (0.00 sec)
```


This occurs even when using strict SQL mode. To prevent this from happening, quote the value, as shown here:
```
mysql> SELECT * FROM t1 WHERE c3 = '0';
Empty set (0.00 sec)
```


This does not occur when SELECT is part of a data definition statement such as CREATE TABLE ... SELECT; in strict mode, the statement fails due to the invalid comparison:
```
mysql> CREATE TABLE t2 SELECT * FROM t1 WHERE c3 = 0;
ERROR 1292 (22007): Truncated incorrect DOUBLE value: 'grape'
```


When the 0 is quoted, the statement succeeds, but the table created contains no rows because there were none matching ' 0 ' , as shown here:
```
mysql> CREATE TABLE t2 SELECT * FROM t1 WHERE c3 = '0';
Query OK, 0 rows affected (0.03 sec)
Records: 0 Duplicates: 0 Warnings: 0
mysql> SELECT * FROM t2;
Empty set (0.00 sec)
```


This is a known issue, which is due to the fact that strict mode is not applied when processing SELECT. See also Strict SQL Mode.

Comparisons between floating-point numbers and large integer values are approximate because the integer is converted to double-precision floating point before comparison, which is not capable of representing all 64 -bit integers exactly. For example, the integer value $2^{53}+1$ is not representable as a float, and is rounded to $2^{53}$ or $2^{53}+2$ before a float comparison, depending on the platform.

To illustrate, only the first of the following comparisons compares equal values, but both comparisons return true (1):
```
mysql> SELECT '9223372036854775807' = 9223372036854775807;
    -> 1
mysql> SELECT '9223372036854775807' = 9223372036854775806;
    -> 1
```


When conversions from string to floating-point and from integer to floating-point occur, they do not necessarily occur the same way. The integer may be converted to floating-point by the CPU, whereas the string is converted digit by digit in an operation that involves floating-point multiplications. Also, results can be affected by factors such as computer architecture or the compiler version or optimization
level. One way to avoid such problems is to use CAST( ) so that a value is not converted implicitly to a float-point number:
```
mysql> SELECT CAST('9223372036854775807' AS UNSIGNED) = 9223372036854775806;
    -> 0
```


For more information about floating-point comparisons, see Section B.3.4.8, "Problems with FloatingPoint Values".

The server includes dtoa, a conversion library that provides the basis for improved conversion between string or DECIMAL values and approximate-value (FLOAT/DOUBLE) numbers:
- Consistent conversion results across platforms, which eliminates, for example, Unix versus Windows conversion differences.
- Accurate representation of values in cases where results previously did not provide sufficient precision, such as for values close to IEEE limits.
- Conversion of numbers to string format with the best possible precision. The precision of dtoa is always the same or better than that of the standard C library functions.

Because the conversions produced by this library differ in some cases from non-dtoa results, the potential exists for incompatibilities in applications that rely on previous results. For example, applications that depend on a specific exact result from previous conversions might need adjustment to accommodate additional precision.

The dtoa library provides conversions with the following properties. $D$ represents a value with a DECIMAL or string representation, and $F$ represents a floating-point number in native binary (IEEE) format.
- $F->D$ conversion is done with the best possible precision, returning $D$ as the shortest string that yields $F$ when read back in and rounded to the nearest value in native binary format as specified by IEEE.
- $D$-> $F$ conversion is done such that $F$ is the nearest native binary number to the input decimal string D.

These properties imply that $F->D->F$ conversions are lossless unless $F$ is -inf, +inf, or NaN. The latter values are not supported because the SQL standard defines them as invalid values for FLOAT or DOUBLE.

For $D->F->D$ conversions, a sufficient condition for losslessness is that $D$ uses 15 or fewer digits of precision, is not a denormal value, -inf, +inf, or NaN. In some cases, the conversion is lossless even if $D$ has more than 15 digits of precision, but this is not always the case.

Implicit conversion of a numeric or temporal value to string produces a value that has a character set and collation determined by the character_set_connection and collation_connection system variables. (These variables commonly are set with SET NAMES. For information about connection character sets, see Section 12.4, "Connection Character Sets and Collations".)

This means that such a conversion results in a character (nonbinary) string (a CHAR, VARCHAR, or LONGTEXT value), except in the case that the connection character set is set to binary. In that case, the conversion result is a binary string (a BINARY, VARBINARY, or LONGBLOB value).

For integer expressions, the preceding remarks about expression evaluation apply somewhat differently for expression assignment; for example, in a statement such as this:

CREATE TABLE t SELECT integer_expr;
In this case, the table in the column resulting from the expression has type INT or BIGINT depending on the length of the integer expression. If the maximum length of the expression does not fit in an INT,

BIGINT is used instead. The length is taken from the max_length value of the SELECT result set metadata (see C API Basic Data Structures). This means that you can force a BIGINT rather than INT by use of a sufficiently long expression:

CREATE TABLE t SELECT 000000000000000000000;

\subsection*{14.4 Operators}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.3 Operators}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline \& & Bitwise AND & \\
\hline > & Greater than operator & \\
\hline >> & Right shift & \\
\hline >= & Greater than or equal operator & \\
\hline < & Less than operator & \\
\hline <>, != & Not equal operator & \\
\hline << & Left shift & \\
\hline <= & Less than or equal operator & \\
\hline <=> & NULL-safe equal to operator & \\
\hline \%, MOD & Modulo operator & \\
\hline * & Multiplication operator & \\
\hline + & Addition operator & \\
\hline - & Minus operator & \\
\hline - & Change the sign of the argument & \\
\hline -> & Return value from JSON column after evaluating path; equivalent to JSON_EXTRACT(). & \\
\hline ->> & Return value from JSON column after evaluating path and unquoting the result; equivalent to JSON_UNQUOTE(JSON_EXTRACT()). & \\
\hline / & Division operator & \\
\hline := & Assign a value & \\
\hline = & Assign a value (as part of a SET statement, or as part of the SET clause in an UPDATE statement) & \\
\hline = & Equal operator & \\
\hline $\wedge$ & Bitwise XOR & \\
\hline AND, \&\& & Logical AND & \\
\hline BETWEEN ... AND ... & Whether a value is within a range of values & \\
\hline BINARY & Cast a string to a binary string & Yes \\
\hline CASE & Case operator & \\
\hline DIV & Integer division & \\
\hline EXISTS() & Whether the result of a query contains any rows & \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline IN ( ) & Whether a value is within a set of values & \\
\hline IS & Test a value against a boolean & \\
\hline IS NOT & Test a value against a boolean & \\
\hline IS NOT NULL & NOT NULL value test & \\
\hline IS NULL & NULL value test & \\
\hline LIKE & Simple pattern matching & \\
\hline MEMBER OF() & Returns true (1) if first operand matches any element of JSON array passed as second operand, otherwise returns false (0) & \\
\hline NOT, ! & Negates value & \\
\hline NOT BETWEEN ... AND ... & Whether a value is not within a range of values & \\
\hline NOT EXISTS() & Whether the result of a query contains no rows & \\
\hline NOT IN() & Whether a value is not within a set of values & \\
\hline NOT LIKE & Negation of simple pattern matching & \\
\hline NOT REGEXP & Negation of REGEXP & \\
\hline OR, || & Logical OR & \\
\hline REGEXP & Whether string matches regular expression & \\
\hline RLIKE & Whether string matches regular expression & \\
\hline SOUNDS LIKE & Compare sounds & \\
\hline XOR & Logical XOR & \\
\hline I & Bitwise OR & \\
\hline ~ & Bitwise inversion & \\
\hline
\end{tabular}

\subsection*{14.4.1 Operator Precedence}

Operator precedences are shown in the following list, from highest precedence to the lowest. Operators that are shown together on a line have the same precedence.
```
INTERVAL
BINARY, COLLATE
!
- (unary minus), ~ (unary bit inversion)
^
*, /, DIV, %, MOD
-, +
<<, >>
&
= (comparison), <=>, >=, >, <=, <, <>, !=, IS, LIKE, REGEXP, IN, MEMBER OF
BETWEEN, CASE, WHEN, THEN, ELSE
NOT
AND, &&
XOR
OR, | |
```

= (assignment), :=
The precedence of = depends on whether it is used as a comparison operator (=) or as an assignment operator (=). When used as a comparison operator, it has the same precedence as <=>, >=, >, <=, <, <>, !=, IS, LIKE, REGEXP, and IN( ). When used as an assignment operator, it has the same precedence as : $=$. Section 15.7.6.1, "SET Syntax for Variable Assignment", and Section 11.4, "UserDefined Variables", explain how MySQL determines which interpretation of = should apply.

For operators that occur at the same precedence level within an expression, evaluation proceeds left to right, with the exception that assignments evaluate right to left.

The precedence and meaning of some operators depends on the SQL mode:
- By default, | | is a logical OR operator. With PIPES_AS_CONCAT enabled, | | is string concatenation, with a precedence between ^ and the unary operators.
- By default, ! has a higher precedence than NOT. With HIGH_NOT_PRECEDENCE enabled, ! and NOT have the same precedence.

See Section 7.1.11, "Server SQL Modes".
The precedence of operators determines the order of evaluation of terms in an expression. To override this order and group terms explicitly, use parentheses. For example:
```
mysql> SELECT 1+2*3;
    -> 7
mysql> SELECT (1+2)*3;
    -> 9
```


\subsection*{14.4.2 Comparison Functions and Operators}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.4 Comparison Operators}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline > & Greater than operator \\
\hline >= & Greater than or equal operator \\
\hline < & Less than operator \\
\hline <>, != & Not equal operator \\
\hline <= & Less than or equal operator \\
\hline <=> & NULL-safe equal to operator \\
\hline = & Equal operator \\
\hline BETWEEN ... AND ... & Whether a value is within a range of values \\
\hline COALESCE() & Return the first non-NULL argument \\
\hline EXISTS( ) & Whether the result of a query contains any rows \\
\hline GREATEST( ) & Return the largest argument \\
\hline IN ( ) & Whether a value is within a set of values \\
\hline INTERVAL( ) & Return the index of the argument that is less than the first argument \\
\hline IS & Test a value against a boolean \\
\hline IS NOT & Test a value against a boolean \\
\hline IS NOT NULL & NOT NULL value test \\
\hline IS NULL & NULL value test \\
\hline ISNULL() & Test whether the argument is NULL \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline LEAST( ) & Return the smallest argument \\
\hline LIKE & Simple pattern matching \\
\hline NOT BETWEEN ... AND ... & Whether a value is not within a range of values \\
\hline NOT EXISTS() & Whether the result of a query contains no rows \\
\hline NOT IN() & Whether a value is not within a set of values \\
\hline NOT LIKE & Negation of simple pattern matching \\
\hline STRCMP( ) & Compare two strings \\
\hline
\end{tabular}

Comparison operations result in a value of 1 (TRUE), 0 (FALSE), or NULL. These operations work for both numbers and strings. Strings are automatically converted to numbers and numbers to strings as necessary.

The following relational comparison operators can be used to compare not only scalar operands, but row operands:

The descriptions for those operators later in this section detail how they work with row operands. For additional examples of row comparisons in the context of row subqueries, see Section 15.2.15.5, "Row Subqueries".

Some of the functions in this section return values other than 1 (TRUE), 0 (FALSE), or NULL. LEAST( ) and GREATEST( ) are examples of such functions; Section 14.3, "Type Conversion in Expression Evaluation", describes the rules for comparison operations performed by these and similar functions for determining their return values.

\section*{Note}

In previous versions of MySQL, when evaluating an expression containing LEAST( ) or GREATEST ( ), the server attempted to guess the context in which the function was used, and to coerce the function's arguments to the data type of the expression as a whole. For example, the arguments to LEAST ("11", "45", "2") are evaluated and sorted as strings, so that this expression returns "11".

The function is executed using the arguments as provided, performing data type conversions to one or more of the arguments if and only if they are not all of the same type. Any type coercion mandated by an expression that makes use of the return value is now performed following function execution. This means that LEAST("11", "45", "2") + 0 evaluates to "11" + 0 and thus to integer 11.

To convert a value to a specific type for comparison purposes, you can use the CAST( ) function. String values can be converted to a different character set using CONVERT( ). See Section 14.10, "Cast Functions and Operators".

By default, string comparisons are not case-sensitive and use the current character set. The default is utf 8 mb 4 .
- =

Equal:
```
mysql> SELECT 1 = 0;
```

```
    -> 0
mysql> SELECT '0' = 0;
    -> 1
mysql> SELECT '0.0' = 0;
    -> 1
mysql> SELECT '0.01' = 0;
    -> 0
mysql> SELECT '.01' = 0.01;
    -> 1
```


For row comparisons, $(\mathrm{a}, \mathrm{b})=(\mathrm{x}, \mathrm{y})$ is equivalent to:
```
(a = x) AND (b = y)
```

- <=>

NULL-safe equal. This operator performs an equality comparison like the = operator, but returns 1 rather than NULL if both operands are NULL, and 0 rather than NULL if one operand is NULL.

The <=> operator is equivalent to the standard SQL IS NOT DISTINCT FROM operator.
```
mysql> SELECT 1 <=> 1, NULL <=> NULL, 1 <=> NULL;
    -> 1, 1, 0
mysql> SELECT 1 = 1, NULL = NULL, 1 = NULL;
    -> 1, NULL, NULL
```


For row comparisons, $(a, b) \Leftrightarrow(x, y)$ is equivalent to:
```
(a <=> x) AND (b <=> y)
```

- <>, ! =

Not equal:
```
mysql> SELECT '.01' <> '0.01';
    -> 1
mysql> SELECT .01 <> '0.01';
    -> 0
mysql> SELECT 'zapp' <> 'zappp';
    -> 1
```


For row comparisons, $(\mathrm{a}, \mathrm{b})<>(\mathrm{x}, \mathrm{y})$ and $(\mathrm{a}, \mathrm{b})!=(\mathrm{x}, \mathrm{y})$ are equivalent to:
```
(a <> x) OR (b <> y)
```

- <=

Less than or equal:
```
mysql> SELECT 0.1 <= 2;
    -> 1
```


For row comparisons, $(\mathrm{a}, \mathrm{b})<=(\mathrm{x}, \mathrm{y})$ is equivalent to:
```
(a < x) OR ((a = x) AND (b <= y))
```

- <

Less than:
```
mysql> SELECT 2 < 2;
    -> 0
```


For row comparisons, $(\mathrm{a}, \mathrm{b})<(\mathrm{x}, \mathrm{y})$ is equivalent to:
```
(a < x) OR ((a = x) AND (b < y))
```

- >=

Greater than or equal:
```
mysql> SELECT 2 >= 2;
    -> 1
```


For row comparisons, $(\mathrm{a}, \mathrm{b})>=(\mathrm{x}, \mathrm{y})$ is equivalent to:
```
(a > x) OR ((a = x) AND (b >= y))
```

- >

Greater than:
```
mysql> SELECT 2 > 2;
    -> 0
```


For row comparisons, $(\mathrm{a}, \mathrm{b})>(\mathrm{x}, \mathrm{y})$ is equivalent to:
```
(a > x) OR ((a = x) AND (b > y))
```

expr BETWEEN min AND max
If expr is greater than or equal to min and expr is less than or equal to max, BETWEEN returns 1, otherwise it returns 0 . This is equivalent to the expression (min <= expr AND expr <= max) if all the arguments are of the same type. Otherwise type conversion takes place according to the rules described in Section 14.3, "Type Conversion in Expression Evaluation", but applied to all the three arguments.
```
mysql> SELECT 2 BETWEEN 1 AND 3, 2 BETWEEN 3 and 1;
    -> 1, 0
mysql> SELECT 1 BETWEEN 2 AND 3;
    -> 0
mysql> SELECT 'b' BETWEEN 'a' AND 'c';
    -> 1
mysql> SELECT 2 BETWEEN 2 AND '3';
    -> 1
mysql> SELECT 2 BETWEEN 2 AND 'x-3';
    -> 0
```


For best results when using BETWEEN with date or time values, use CAST ( ) to explicitly convert the values to the desired data type. Examples: If you compare a DATETIME to two DATE values, convert the DATE values to DATETIME values. If you use a string constant such as '2001-1-1' in a comparison to a DATE, cast the string to a DATE.
- expr NOT BETWEEN min AND max

This is the same as NOT (expr BETWEEN min AND max).
- COALESCE(value,...)

Returns the first non-NULL value in the list, or NULL if there are no non-NULL values.
The return type of COALESCE ( ) is the aggregated type of the argument types.
```
mysql> SELECT COALESCE(NULL,1);
    -> 1
mysql> SELECT COALESCE(NULL,NULL,NULL);
    -> NULL
```

- EXISTS(query)

Whether the result of a query contains any rows.
```
CREATE TABLE t (col VARCHAR(3));
INSERT INTO t VALUES ('aaa', 'bbb', 'ccc', 'eee');
```

```
SELECT EXISTS (SELECT * FROM t WHERE col LIKE 'c%');
    -> 1
SELECT EXISTS (SELECT * FROM t WHERE col LIKE 'd%');
    -> 0
```

- NOT EXISTS(query)

Whether the result of a query contains no rows:
```
SELECT NOT EXISTS (SELECT * FROM t WHERE col LIKE 'c%');
    -> 0
SELECT NOT EXISTS (SELECT * FROM t WHERE col LIKE 'd%');
    -> 1
```

- GREATEST(value1,value2,...)

With two or more arguments, returns the largest (maximum-valued) argument. The arguments are compared using the same rules as for LEAST( ).
```
mysql> SELECT GREATEST(2,0);
    -> 2
mysql> SELECT GREATEST(34.0,3.0,5.0,767.0);
    -> 767.0
mysql> SELECT GREATEST('B','A','C');
    -> 'C'
```


GREATEST( ) returns NULL if any argument is NULL.
- expr IN (value,...)

Returns 1 (true) if expr is equal to any of the values in the IN ( ) list, else returns 0 (false).
Type conversion takes place according to the rules described in Section 14.3, "Type Conversion in Expression Evaluation", applied to all the arguments. If no type conversion is needed for the values in the IN ( ) list, they are all non-JSON constants of the same type, and expr can be compared to each of them as a value of the same type (possibly after type conversion), an optimization takes place. The values the list are sorted and the search for expr is done using a binary search, which makes the IN() operation very quick.
```
mysql> SELECT 2 IN (0,3,5,7);
    -> 0
mysql> SELECT 'wefwf' IN ('wee','wefwf','weg');
    -> 1
```


IN ( ) can be used to compare row constructors:
```
mysql> SELECT (3,4) IN ((1,2), (3,4));
    -> 1
mysql> SELECT (3,4) IN ((1,2), (3,5));
    -> 0
```


You should never mix quoted and unquoted values in an IN ( ) list because the comparison rules for quoted values (such as strings) and unquoted values (such as numbers) differ. Mixing types may therefore lead to inconsistent results. For example, do not write an IN ( ) expression like this:
```
SELECT val1 FROM tbl1 WHERE val1 IN (1,2,'a');
```


Instead, write it like this:
```
SELECT val1 FROM tbl1 WHERE val1 IN ('1','2','a');
```


Implicit type conversion may produce nonintuitive results:
```
mysql> SELECT 'a' IN (0), 0 IN ('b');
    -> 1, 1
```


In both cases, the comparison values are converted to floating-point values, yielding 0.0 in each case, and a comparison result of 1 (true).

The number of values in the IN( ) list is only limited by the max_allowed_packet value.
To comply with the SQL standard, IN( ) returns NULL not only if the expression on the left hand side is NULL, but also if no match is found in the list and one of the expressions in the list is NULL.

IN ( ) syntax can also be used to write certain types of subqueries. See Section 15.2.15.3, "Subqueries with ANY, IN, or SOME".
- expr NOT IN (value,...)

This is the same as NOT (expr IN (value,...)).
- INTERVAL( $N, N 1, N 2, N 3, . .$. )

Returns 0 if $N \leq N 1,1$ if $N \leq N 2$ and so on, or - 1 if $N$ is NULL. All arguments are treated as integers. It is required that $N 1 \leq N 2 \leq N 3 \leq \ldots \leq N n$ for this function to work correctly. This is because a binary search is used (very fast).
```
mysql> SELECT INTERVAL(23, 1, 15, 17, 30, 44, 200);
    -> 3
mysql> SELECT INTERVAL(10, 1, 10, 100, 1000);
    -> 2
mysql> SELECT INTERVAL(22, 23, 30, 44, 200);
    -> 0
```

- IS boolean_value

Tests a value against a boolean value, where boolean_value can be TRUE, FALSE, or UNKNOWN.
```
mysql> SELECT 1 IS TRUE, 0 IS FALSE, NULL IS UNKNOWN;
    -> 1, 1, 1
```

- IS NOT boolean_value

Tests a value against a boolean value, where boolean_value can be TRUE, FALSE, or UNKNOWN.
```
mysql> SELECT 1 IS NOT UNKNOWN, 0 IS NOT UNKNOWN, NULL IS NOT UNKNOWN;
    -> 1, 1, 0
```

- IS NULL

Tests whether a value is NULL.
```
mysql> SELECT 1 IS NULL, 0 IS NULL, NULL IS NULL;
    -> 0, 0, 1
```


To work well with ODBC programs, MySQL supports the following extra features when using IS NULL:
- If sql_auto_is_null variable is set to 1 , then after a statement that successfully inserts an automatically generated AUTO_INCREMENT value, you can find that value by issuing a statement of the following form:
```
SELECT * FROM tbl_name WHERE auto_col IS NULL
```


If the statement returns a row, the value returned is the same as if you invoked the LAST_INSERT_ID( ) function. For details, including the return value after a multiple-row insert,
see Section 14.15, "Information Functions". If no AUTO_INCREMENT value was successfully inserted, the SELECT statement returns no row.

The behavior of retrieving an AUTO_INCREMENT value by using an IS NULL comparison can be disabled by setting sql_auto_is_null = 0. See Section 7.1.8, "Server System Variables".

The default value of sql_auto_is_null is 0 .
- For DATE and DATETIME columns that are declared as NOT NULL, you can find the special date '0000-00-00 ' by using a statement like this:
```
SELECT * FROM tbl_name WHERE date_column IS NULL
```


This is needed to get some ODBC applications to work because ODBC does not support a ${ }^{\prime}$ 0000-00-00' date value.

See Obtaining Auto-Increment Values, and the description for the FLAG_AUTO_IS_NULL option at Connector/ODBC Connection Parameters.
- IS NOT NULL

Tests whether a value is not NULL.
```
mysql> SELECT 1 IS NOT NULL, 0 IS NOT NULL, NULL IS NOT NULL;
    -> 1, 1, 0
```

- ISNULL(expr)

If expr is NULL, ISNULL ( ) returns 1, otherwise it returns 0.
```
mysql> SELECT ISNULL(1+1);
    -> 0
mysql> SELECT ISNULL(1/0);
    -> 1
```


ISNULL() can be used instead of = to test whether a value is NULL. (Comparing a value to NULL using = always yields NULL.)

The ISNULL() function shares some special behaviors with the IS NULL comparison operator. See the description of IS NULL.
- LEAST(value1, value2,...)

With two or more arguments, returns the smallest (minimum-valued) argument. The arguments are compared using the following rules:
- If any argument is NULL, the result is NULL. No comparison is needed.
- If all arguments are integer-valued, they are compared as integers.
- If at least one argument is double precision, they are compared as double-precision values. Otherwise, if at least one argument is a DECIMAL value, they are compared as DECIMAL values.
- If the arguments comprise a mix of numbers and strings, they are compared as strings.
- If any argument is a nonbinary (character) string, the arguments are compared as nonbinary strings.
- In all other cases, the arguments are compared as binary strings.

The return type of LEAST( ) is the aggregated type of the comparison argument types.
```
mysql> SELECT LEAST(2,0);
    -> 0
```

```
mysql> SELECT LEAST(34.0,3.0,5.0,767.0);
    -> 3.0
mysql> SELECT LEAST('B','A','C');
    -> 'A'
```


\subsection*{14.4.3 Logical Operators}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.5 Logical Operators}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline AND, \&\& & Logical AND \\
\hline NOT, ! & Negates value \\
\hline OR, || & Logical OR \\
\hline XOR & Logical XOR \\
\hline
\end{tabular}
\end{table}

In SQL, all logical operators evaluate to TRUE, FALSE, or NULL (UNKNOWN). In MySQL, these are implemented as 1 (TRUE), 0 (FALSE), and NULL. Most of this is common to different SQL database servers, although some servers may return any nonzero value for TRUE.

MySQL evaluates any nonzero, non-NULL value to TRUE. For example, the following statements all assess to TRUE:
```
mysql> SELECT 10 IS TRUE;
-> 1
mysql> SELECT -10 IS TRUE;
-> 1
mysql> SELECT 'string' IS NOT NULL;
-> 1
```

- NOT, !

Logical NOT. Evaluates to 1 if the operand is 0 , to 0 if the operand is nonzero, and NOT NULL returns NULL.
```
mysql> SELECT NOT 10;
    -> 0
mysql> SELECT NOT 0;
    -> 1
mysql> SELECT NOT NULL;
    -> NULL
mysql> SELECT ! (1+1);
    -> 0
mysql> SELECT ! 1+1;
    -> 1
```


The last example produces 1 because the expression evaluates the same way as (!1)+1.
The ! operator is a nonstandard extension, and is deprecated; expect it to be removed in a future version of MySQL. Applications, where necessary, should be adjusted to use the standard SQL NOT operator instead.
- AND, \&\&

Logical AND. Evaluates to 1 if all operands are nonzero and not NULL, to 0 if one or more operands are 0 , otherwise NULL is returned.
```
mysql> SELECT 1 AND 1;
    -> 1
mysql> SELECT 1 AND 0;
    -> 0
mysql> SELECT 1 AND NULL;
    -> NULL
mysql> SELECT 0 AND NULL;
    -> 0
mysql> SELECT NULL AND 0;
    -> 0
```


The \&\&, operator is a nonstandard extension and is deprecated; expect support for it to be removed in a future version of MySQL. Applications, where necessary, should be adjusted to use the standard SQL AND operator instead.
- OR, ||

Logical OR. When both operands are non-NULL, the result is 1 if any operand is nonzero, and 0 otherwise. With a NULL operand, the result is 1 if the other operand is nonzero, and NULL otherwise. If both operands are NULL, the result is NULL.
```
mysql> SELECT 1 OR 1;
    -> 1
mysql> SELECT 1 OR 0;
    -> 1
mysql> SELECT 0 OR 0;
    -> 0
mysql> SELECT 0 OR NULL;
    -> NULL
mysql> SELECT 1 OR NULL;
    -> 1
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2148.jpg?height=123&width=103&top_left_y=995&top_left_x=338)

Note
If the PIPES_AS_CONCAT SQL mode is enabled, | | signifies the SQLstandard string concatenation operator (like CONCAT( )).

The ||, operator is a nonstandard extension, and is deprecated; expect support for it to be removed in a future version of MySQL. Applications, where necessary, should be adjusted to use the standard SQL OR operator instead. Exception: Deprecation does not apply if PIPES_AS_CONCAT is enabled because, in that case, || signifies string concatenation.
- XOR

Logical XOR. Returns NULL if either operand is NULL. For non-NULL operands, evaluates to 1 if an odd number of operands is nonzero, otherwise 0 is returned.
```
mysql> SELECT 1 XOR 1;
    -> 0
mysql> SELECT 1 XOR 0;
    -> 1
mysql> SELECT 1 XOR NULL;
    -> NULL
mysql> SELECT 1 XOR 1 XOR 1;
    -> 1
$a$ XOR $b$ is mathematically equal to (a AND (NOT b)) OR ((NOT a) and b).
```


\subsection*{14.4.4 Assignment Operators}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.6 Assignment Operators}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline$:=$ & Assign a value \\
\hline$=$ & \begin{tabular}{l} 
Assign a value (as part of a SET statement, or as \\
part of the SET clause in an UPDATE statement)
\end{tabular} \\
\hline
\end{tabular}
\end{table}
- :=

Assignment operator. Causes the user variable on the left hand side of the operator to take on the value to its right. The value on the right hand side may be a literal value, another variable storing a value, or any legal expression that yields a scalar value, including the result of a query (provided that this value is a scalar value). You can perform multiple assignments in the same SET statement. You can perform multiple assignments in the same statement.

Unlike $=$, the : $=$ operator is never interpreted as a comparison operator. This means you can use := in any valid SQL statement (not just in SET statements) to assign a value to a variable.
```
mysql> SELECT @var1, @var2;
    -> NULL, NULL
mysql> SELECT @var1 := 1, @var2;
    -> 1, NULL
mysql> SELECT @var1, @var2;
    -> 1, NULL
mysql> SELECT @var1, @var2 := @var1;
    -> 1, 1
mysql> SELECT @var1, @var2;
    -> 1, 1
mysql> SELECT @var1:=COUNT(*) FROM t1;
    -> 4
mysql> SELECT @var1;
    -> 4
```


You can make value assignments using := in other statements besides SELECT, such as UPDATE, as shown here:
```
mysql> SELECT @var1;
    -> 4
mysql> SELECT * FROM t1;
    -> 1, 3, 5, 7
mysql> UPDATE t1 SET c1 = 2 WHERE c1 = @var1:= 1;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1 Changed: 1 Warnings: 0
mysql> SELECT @var1;
    -> 1
mysql> SELECT * FROM t1;
    -> 2, 3, 5, 7
```


While it is also possible both to set and to read the value of the same variable in a single SQL statement using the := operator, this is not recommended. Section 11.4, "User-Defined Variables", explains why you should avoid doing this.
- =

This operator is used to perform value assignments in two cases, described in the next two paragraphs.

Within a SET statement, = is treated as an assignment operator that causes the user variable on the left hand side of the operator to take on the value to its right. (In other words, when used in a SET statement, $=$ is treated identically to : $=$.) The value on the right hand side may be a literal value, another variable storing a value, or any legal expression that yields a scalar value, including the result of a query (provided that this value is a scalar value). You can perform multiple assignments in the same SET statement.

In the SET clause of an UPDATE statement, = also acts as an assignment operator; in this case, however, it causes the column named on the left hand side of the operator to assume the value given to the right, provided any WHERE conditions that are part of the UPDATE are met. You can make multiple assignments in the same SET clause of an UPDATE statement.

In any other context, = is treated as a comparison operator.
```
mysql> SELECT @var1, @var2;
    -> NULL, NULL
mysql> SELECT @var1 := 1, @var2;
    -> 1, NULL
mysql> SELECT @var1, @var2;
    -> 1, NULL
mysql> SELECT @var1, @var2 := @var1;
```

```
    -> 1, 1
mysql> SELECT @var1, @var2;
    -> 1, 1
```


For more information, see Section 15.7.6.1, "SET Syntax for Variable Assignment", Section 15.2.17, "UPDATE Statement", and Section 15.2.15, "Subqueries".

\subsection*{14.5 Flow Control Functions}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.7 Flow Control Operators}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline CASE & Case operator \\
\hline IF( ) & If/else construct \\
\hline IFNULL() & Null if/else construct \\
\hline NULLIF( ) & Return NULL if expr1 = expr2 \\
\hline
\end{tabular}
\end{table}
- CASE value WHEN compare_value THEN result [WHEN compare_value THEN result ...] [ELSE result] END

CASE WHEN condition THEN result [WHEN condition THEN result ...] [ELSE result] END

The first CASE syntax returns the result for the first value=compare_value comparison that is true. The second syntax returns the result for the first condition that is true. If no comparison or condition is true, the result after ELSE is returned, or NULL if there is no ELSE part.

\section*{Note}

The syntax of the CASE operator described here differs slightly from that of the SQL CASE statement described in Section 15.6.5.1, "CASE Statement", for use inside stored programs. The CASE statement cannot have an ELSE NULL clause, and it is terminated with END CASE instead of END.

The return type of a CASE expression result is the aggregated type of all result values:
- If all types are numeric, the aggregated type is also numeric:
- If at least one argument is double precision, the result is double precision.
- Otherwise, if at least one argument is DECIMAL, the result is DECIMAL.
- Otherwise, the result is an integer type (with one exception):
- If all integer types are all signed or all unsigned, the result is the same sign and the precision is the highest of all specified integer types (that is, TINYINT, SMALLINT, MEDIUMINT, INT, or BIGINT).
- If there is a combination of signed and unsigned integer types, the result is signed and the precision may be higher. For example, if the types are signed INT and unsigned INT, the result is signed BIGINT.
- The exception is unsigned BIGINT combined with any signed integer type. The result is DECIMAL with sufficient precision and scale 0 .
- If all types are BIT, the result is BIT. Otherwise, BIT arguments are treated similar to BIGINT.
- If all types are YEAR, the result is YEAR. Otherwise, YEAR arguments are treated similar to INT.
- If all types are character string (CHAR or VARCHAR), the result is VARCHAR with maximum length determined by the longest character length of the operands.
- If all types are character or binary string, the result is VARBINARY.
- SET and ENUM are treated similar to VARCHAR; the result is VARCHAR.
- If all types are JSON, the result is JSON.
- If all types are temporal, the result is temporal:
- If all temporal types are DATE, TIME, or TIMESTAMP, the result is DATE, TIME, or TIMESTAMP, respectively.
- Otherwise, for a mix of temporal types, the result is DATETIME.
- If all types are GEOMETRY, the result is GEOMETRY.
- If any type is BLOB, the result is BLOB.
- For all other type combinations, the result is VARCHAR.
- Literal NULL operands are ignored for type aggregation.
```
mysql> SELECT CASE 1 WHEN 1 THEN 'one'
    -> WHEN 2 THEN 'two' ELSE 'more' END;
        -> 'one'
mysql> SELECT CASE WHEN 1>0 THEN 'true' ELSE 'false' END;
        -> 'true'
mysql> SELECT CASE BINARY 'B'
    -> WHEN 'a' THEN 1 WHEN 'b' THEN 2 END;
        -> NULL
```

- IF(expr1, expr2, expr3)

If expr1 is TRUE (expr1 <> 0 and expr1 IS NOT NULL), IF( ) returns expr2. Otherwise, it returns expr3.

\section*{Note}

There is also an IF statement, which differs from the IF( ) function described here. See Section 15.6.5.2, "IF Statement".

If only one of expr2 or expr3 is explicitly NULL, the result type of the $\operatorname{IF}()$ function is the type of the non-NULL expression.

The default return type of $\operatorname{IF}()$ (which may matter when it is stored into a temporary table) is calculated as follows:
- If expr2 or expr3 produce a string, the result is a string.

If expr2 and expr3 are both strings, the result is case-sensitive if either string is case-sensitive.
- If expr2 or expr3 produce a floating-point value, the result is a floating-point value.
- If expr2 or expr3 produce an integer, the result is an integer.
```
mysql> SELECT IF(1>2,2,3);
    -> 3
mysql> SELECT IF(1<2,'yes','no');
    -> 'yes'
mysql> SELECT IF(STRCMP('test','test1'),'no','yes');
    -> 'no'
```

- IFNULL(expr1, expr2)

If expr1 is not NULL, IFNULL() returns expr1; otherwise it returns expr2.
```
mysql> SELECT IFNULL(1,0);
    -> 1
mysql> SELECT IFNULL(NULL,10);
    -> 10
mysql> SELECT IFNULL(1/0,10);
    -> 10
mysql> SELECT IFNULL(1/0,'yes');
    -> 'yes'
```


The default return type of IFNULL(expr1, expr2) is the more "general" of the two expressions, in the order STRING, REAL, or INTEGER. Consider the case of a table based on expressions or where MySQL must internally store a value returned by IFNULL( ) in a temporary table:
```
mysql> CREATE TABLE tmp SELECT IFNULL(1,'test') AS test;
mysql> DESCRIBE tmp;
+-------+---------------+------+-----+---------+-------+
| Field | Type | Null | Key | Default | Extra |
+--------+---------------+------+-----+---------+-------+
| test | varbinary(4) | NO | | |
+--------+--------------+------+-----+---------+------+
```


In this example, the type of the test column is VARBINARY(4) (a string type).
- NULLIF(expr1, expr2)

Returns NULL if expr1 $=\operatorname{expr} 2$ is true, otherwise returns expr1. This is the same as CASE WHEN expr1 = expr2 THEN NULL ELSE expr1 END.

The return value has the same type as the first argument.
```
mysql> SELECT NULLIF(1,1);
    -> NULL
mysql> SELECT NULLIF(1,2);
    -> 1
```


Note
MySQL evaluates expr1 twice if the arguments are not equal.

For each of these functions, if the first argument contains only characters present in the character set and collation used by the second argument (and it is constant), the latter character set and collation is used to make the comparison. System variable values are handled as column values of the same character and collation. Some queries using these functions with system variables may be rejected with Illegal mix of collations as a result. In such cases, you should cast the system variable to the correct character set and collation.

\subsection*{14.6 Numeric Functions and Operators}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.8 Numeric Functions and Operators}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline \%, MOD & Modulo operator \\
\hline * & Multiplication operator \\
\hline + & Addition operator \\
\hline - & Minus operator \\
\hline - & Change the sign of the argument \\
\hline / & Division operator \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline ABS( ) & Return the absolute value \\
\hline ACOS( ) & Return the arc cosine \\
\hline ASIN() & Return the arc sine \\
\hline ATAN ( ) & Return the arc tangent \\
\hline ATAN2( ), ATAN( ) & Return the arc tangent of the two arguments \\
\hline CEIL() & Return the smallest integer value not less than the argument \\
\hline CEILING() & Return the smallest integer value not less than the argument \\
\hline CONV( ) & Convert numbers between different number bases \\
\hline $\cos ()$ & Return the cosine \\
\hline COT( ) & Return the cotangent \\
\hline CRC32() & Compute a cyclic redundancy check value \\
\hline DEGREES( ) & Convert radians to degrees \\
\hline DIV & Integer division \\
\hline EXP ( ) & Raise to the power of \\
\hline FLOOR( ) & Return the largest integer value not greater than the argument \\
\hline LN ( ) & Return the natural logarithm of the argument \\
\hline LOG( ) & Return the natural logarithm of the first argument \\
\hline LOG10( ) & Return the base-10 logarithm of the argument \\
\hline LOG2( ) & Return the base-2 logarithm of the argument \\
\hline MOD( ) & Return the remainder \\
\hline PI() & Return the value of pi \\
\hline POW( ) & Return the argument raised to the specified power \\
\hline POWER( ) & Return the argument raised to the specified power \\
\hline RADIANS( ) & Return argument converted to radians \\
\hline RAND ( ) & Return a random floating-point value \\
\hline ROUND ( ) & Round the argument \\
\hline SIGN() & Return the sign of the argument \\
\hline SIN() & Return the sine of the argument \\
\hline SQRT( ) & Return the square root of the argument \\
\hline TAN ( ) & Return the tangent of the argument \\
\hline TRUNCATE( ) & Truncate to specified number of decimal places \\
\hline
\end{tabular}

\subsection*{14.6.1 Arithmetic Operators}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.9 Arithmetic Operators}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline \%, MOD & Modulo operator \\
\hline * & Multiplication operator \\
\hline + & Addition operator \\
\hline - & Minus operator \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline- & Change the sign of the argument \\
\hline$/$ & Division operator \\
\hline DIV & Integer division \\
\hline
\end{tabular}

The usual arithmetic operators are available. The result is determined according to the following rules:
- In the case of -, +, and *, the result is calculated with BIGINT (64-bit) precision if both operands are integers.
- If both operands are integers and any of them are unsigned, the result is an unsigned integer. For subtraction, if the NO_UNSIGNED_SUBTRACTION SQL mode is enabled, the result is signed even if any operand is unsigned.
- If any of the operands of a,,$+- /$, *, $\%$ is a real or string value, the precision of the result is the precision of the operand with the maximum precision.
- In division performed with /, the scale of the result when using two exact-value operands is the scale of the first operand plus the value of the div_precision_increment system variable (which is 4 by default). For example, the result of the expression $5.05 / 0.014$ has a scale of six decimal places (360.714286).

These rules are applied for each operation, such that nested calculations imply the precision of each component. Hence, (14620/ 9432456) / (24250/9432456), resolves first to (0.0014) / (0.0026), with the final result having 8 decimal places (0.60288653).

Because of these rules and the way they are applied, care should be taken to ensure that components and subcomponents of a calculation use the appropriate level of precision. See Section 14.10, "Cast Functions and Operators".

For information about handling of overflow in numeric expression evaluation, see Section 13.1.7, "Out-of-Range and Overflow Handling".

Arithmetic operators apply to numbers. For other types of values, alternative operations may be available. For example, to add date values, use DATE_ADD( ); see Section 14.7, "Date and Time Functions".
- +

Addition:
```
mysql> SELECT 3+5;
    -> 8
```

- -

Subtraction:
```
mysql> SELECT 3-5;
    -> -2
```

- -

Unary minus. This operator changes the sign of the operand.
```
mysql> SELECT - 2;
    -> -2
```


\section*{Note}

If this operator is used with a BIGINT, the return value is also a BIGINT. This means that you should avoid using - on integers that may have the value of $-2^{63}$.
- *

Multiplication:
```
mysql> SELECT 3*5;
    -> 15
mysql> SELECT 18014398509481984*18014398509481984.0;
    -> 324518553658426726783156020576256.0
mysql> SELECT 18014398509481984*18014398509481984;
    -> out-of-range error
```


The last expression produces an error because the result of the integer multiplication exceeds the 64-bit range of BIGINT calculations. (See Section 13.1, "Numeric Data Types".)
- /

Division:
```
mysql> SELECT 3/5;
    -> 0.60
```


Division by zero produces a NULL result:
```
mysql> SELECT 102/(1-1);
    -> NULL
```


A division is calculated with BIGINT arithmetic only if performed in a context where its result is converted to an integer.
- DIV

Integer division. Discards from the division result any fractional part to the right of the decimal point.
If either operand has a noninteger type, the operands are converted to DECIMAL and divided using DECIMAL arithmetic before converting the result to BIGINT. If the result exceeds BIGINT range, an error occurs.
```
mysql> SELECT 5 DIV 2, -5 DIV 2, 5 DIV -2, -5 DIV -2;
    -> 2, -2, -2, 2
```

- $N \% M, N$ MOD M

Modulo operation. Returns the remainder of $N$ divided by $M$. For more information, see the description for the MOD( ) function in Section 14.6.2, "Mathematical Functions".

\subsection*{14.6.2 Mathematical Functions}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.10 Mathematical Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline ABS( ) & Return the absolute value \\
\hline ACOS( ) & Return the arc cosine \\
\hline ASIN() & Return the arc sine \\
\hline ATAN( ) & Return the arc tangent \\
\hline ATAN2(), ATAN() & Return the arc tangent of the two arguments \\
\hline CEIL() & Return the smallest integer value not less than the argument \\
\hline CEILING() & Return the smallest integer value not less than the argument \\
\hline CONV( ) & Convert numbers between different number bases \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline cos( ) & Return the cosine \\
\hline COT( ) & Return the cotangent \\
\hline CRC32() & Compute a cyclic redundancy check value \\
\hline DEGREES( ) & Convert radians to degrees \\
\hline EXP ( ) & Raise to the power of \\
\hline FLOOR( ) & Return the largest integer value not greater than the argument \\
\hline LN( ) & Return the natural logarithm of the argument \\
\hline LOG( ) & Return the natural logarithm of the first argument \\
\hline LOG10( ) & Return the base-10 logarithm of the argument \\
\hline LOG2( ) & Return the base-2 logarithm of the argument \\
\hline MOD( ) & Return the remainder \\
\hline PI() & Return the value of pi \\
\hline POW() & Return the argument raised to the specified power \\
\hline POWER( ) & Return the argument raised to the specified power \\
\hline RADIANS( ) & Return argument converted to radians \\
\hline RAND ( ) & Return a random floating-point value \\
\hline ROUND( ) & Round the argument \\
\hline SIGN() & Return the sign of the argument \\
\hline SIN() & Return the sine of the argument \\
\hline SQRT( ) & Return the square root of the argument \\
\hline TAN ( ) & Return the tangent of the argument \\
\hline TRUNCATE( ) & Truncate to specified number of decimal places \\
\hline
\end{tabular}

All mathematical functions return NULL in the event of an error.
- $\operatorname{ABS}(X)$

Returns the absolute value of $X$, or NULL if $X$ is NULL.
The result type is derived from the argument type. An implication of this is that ABS(-9223372036854775808) produces an error because the result cannot be stored in a signed BIGINT value.
```
mysql> SELECT ABS(2);
    -> 2
mysql> SELECT ABS(-32);
    -> 32
```


This function is safe to use with BIGINT values.
- $\operatorname{ACOS}(X)$

Returns the arc cosine of $X$, that is, the value whose cosine is $X$. Returns NULL if $X$ is not in the range -1 to 1 , or if $X$ is NULL.
```
mysql> SELECT ACOS(1);
    -> 0
mysql> SELECT ACOS(1.0001);
    -> NULL
mysql> SELECT ACOS(0);
    -> 1.5707963267949
```

- ASIN(X)

Returns the arc sine of $X$, that is, the value whose sine is $X$. Returns NULL if $X$ is not in the range -1 to 1 , or if $X$ is NULL.
```
mysql> SELECT ASIN(0.2);
    -> 0.20135792079033
mysql> SELECT ASIN('foo');
+--------------+
| ASIN('foo') |
+--------------+
| 0 |
+--------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS;
+----------+-------+------------------------------------------
| Level | Code | Message |
+---------+-------+-----------------------------------------
| Warning | 1292 | Truncated incorrect DOUBLE value: 'foo' |
+----------+-------+-----------------------------------------
```

- ATAN $(X)$

Returns the arc tangent of $X$, that is, the value whose tangent is $X$. Returns NULL if $X$ is NULL
```
mysql> SELECT ATAN(2);
    -> 1.1071487177941
mysql> SELECT ATAN(-2);
    -> -1.1071487177941
```

- ATAN $(Y, X), \operatorname{ATAN2}(Y, X)$

Returns the arc tangent of the two variables $X$ and $Y$. It is similar to calculating the arc tangent of $Y / X$, except that the signs of both arguments are used to determine the quadrant of the result. Returns NULL if $X$ or $Y$ is NULL.
```
mysql> SELECT ATAN(-2,2);
    -> -0.78539816339745
mysql> SELECT ATAN2(PI(),0);
    -> 1.5707963267949
```

- $\operatorname{CEIL}(X)$

CEIL( ) is a synonym for CEILING().
- CEILING(X)

Returns the smallest integer value not less than $X$. Returns NULL if $X$ is NULL.
```
mysql> SELECT CEILING(1.23);
    -> 2
mysql> SELECT CEILING(-1.23);
    -> -1
```


For exact-value numeric arguments, the return value has an exact-value numeric type. For string or floating-point arguments, the return value has a floating-point type.
- $\operatorname{CONV}($ N, from_base,to_base)

Converts numbers between different number bases. Returns a string representation of the number $N$, converted from base from_base to base to_base. Returns NULL if any argument is NULL. The argument $N$ is interpreted as an integer, but may be specified as an integer or a string. The minimum
base is 2 and the maximum base is 36 . If from_base is a negative number, $N$ is regarded as a signed number. Otherwise, $N$ is treated as unsigned. $\operatorname{CONV}()$ works with 64-bit precision.

CONV( ) returns NULL if any of its arguments are NULL.
```
mysql> SELECT CONV('a',16,2);
    -> '1010'
mysql> SELECT CONV('6E',18,8);
    -> '172'
mysql> SELECT CONV(-17,10,-18);
    -> '-H'
mysql> SELECT CONV(10+'10'+'10'+X'0a',10,10);
    -> '40'
```

- $\cos (X)$

Returns the cosine of $X$, where $X$ is given in radians. Returns NULL if $X$ is NULL.
```
mysql> SELECT COS(PI());
    -> -1
```

- $\operatorname{COT}(X)$

Returns the cotangent of $X$. Returns NULL if $X$ is NULL.
```
mysql> SELECT COT(12);
    -> -1.5726734063977
mysql> SELECT COT(0);
    -> out-of-range error
```

- CRC32(expr)

Computes a cyclic redundancy check value and returns a 32 -bit unsigned value. The result is NULL if the argument is NULL. The argument is expected to be a string and (if possible) is treated as one if it is not.
```
mysql> SELECT CRC32('MySQL');
    -> 3259397556
mysql> SELECT CRC32('mysql');
    -> 2501908538
```

- DEGREES( $X$ )

Returns the argument $X$, converted from radians to degrees. Returns NULL if $X$ is NULL.
```
mysql> SELECT DEGREES(PI());
    -> 180
mysql> SELECT DEGREES(PI() / 2);
    -> 90
```

- $\operatorname{EXP}(X)$

Returns the value of $e$ (the base of natural logarithms) raised to the power of $X$. The inverse of this function is LOG( ) (using a single argument only) or LN( ).

If $X$ is NULL, this function returns NULL.
```
mysql> SELECT EXP(2);
    -> 7.3890560989307
mysql> SELECT EXP(-2);
    -> 0.13533528323661
mysql> SELECT EXP(0);
    -> 1
```

- $\operatorname{FLOOR}(X)$

Returns the largest integer value not greater than $X$. Returns NULL if $X$ is NULL.
```
mysql> SELECT FLOOR(1.23), FLOOR(-1.23);
    -> 1, -2
```


For exact-value numeric arguments, the return value has an exact-value numeric type. For string or floating-point arguments, the return value has a floating-point type.
- FORMAT ( $X, D$ )

Formats the number $X$ to a format like ' $\#, \# \# \#, \# \# \# . \# \# '$, rounded to $D$ decimal places, and returns the result as a string. For details, see Section 14.8, "String Functions and Operators".
- HEX(N_or_S)

This function can be used to obtain a hexadecimal representation of a decimal number or a string; the manner in which it does so varies according to the argument's type. See this function's description in Section 14.8, "String Functions and Operators", for details.
- LN ( $X$ )

Returns the natural logarithm of $X$; that is, the base-e logarithm of $X$. If $X$ is less than or equal to 0.0E0, the function returns NULL and a warning "Invalid argument for logarithm" is reported. Returns NULL if $X$ is NULL.
```
mysql> SELECT LN(2);
    -> 0.69314718055995
mysql> SELECT LN(-2);
    -> NULL
```


This function is synonymous with $\operatorname{LOG}(X)$. The inverse of this function is the EXP() function.
- $\operatorname{LOG}(X), \operatorname{LOG}(B, X)$

If called with one parameter, this function returns the natural logarithm of $X$. If $X$ is less than or equal to 0.0E0, the function returns NULL and a warning "Invalid argument for logarithm" is reported.
Returns NULL if $X$ or $B$ is NULL.
The inverse of this function (when called with a single argument) is the EXP( ) function.
```
mysql> SELECT LOG(2);
    -> 0.69314718055995
mysql> SELECT LOG(-2);
    -> NULL
```


If called with two parameters, this function returns the logarithm of $X$ to the base $B$. If $X$ is less than or equal to 0 , or if $B$ is less than or equal to 1 , then NULL is returned.
```
mysql> SELECT LOG(2,65536);
    -> 16
mysql> SELECT LOG(10,100);
    -> 2
mysql> SELECT LOG(1,100);
    -> NULL
```

$\operatorname{LOG}(B, X)$ is equivalent to $\operatorname{LOG}(X) / \operatorname{LOG}(B)$.
- $\operatorname{LOG} 2(X)$

Returns the base-2 logarithm of $X$. If $X$ is less than or equal to 0.0E0, the function returns NULL and a warning "Invalid argument for logarithm" is reported. Returns NULL if $X$ is NULL.
```
mysql> SELECT LOG2(65536);
    -> 16
```

```
mysql> SELECT LOG2(-100);
    -> NULL
```


LOG2( ) is useful for finding out how many bits a number requires for storage. This function is approximately equivalent to the expression $\operatorname{LOG}(X) / \operatorname{LOG}(2)$.
- $\operatorname{LOG} 10(X)$

Returns the base-10 logarithm of $X$. If $X$ is less than or equal to 0.0E0, the function returns NULL and a warning "Invalid argument for logarithm" is reported. Returns NULL if $X$ is NULL.
```
mysql> SELECT LOG10(2);
    -> 0.30102999566398
mysql> SELECT LOG10(100);
    -> 2
mysql> SELECT LOG10(-100);
    -> NULL
```

$\operatorname{LOG} 10(X)$ is approximately equivalent to $\operatorname{LOG}(10, X)$.
- $\operatorname{MOD}(N, M), N \% M, N$ MOD $M$

Modulo operation. Returns the remainder of $N$ divided by $M$. Returns NULL if $M$ or $N$ is NULL.
```
mysql> SELECT MOD(234, 10);
    -> 4
mysql> SELECT 253 % 7;
    -> 1
mysql> SELECT MOD(29,9);
    -> 2
mysql> SELECT 29 MOD 9;
    -> 2
```


This function is safe to use with BIGINT values.
MOD( ) also works on values that have a fractional part and returns the exact remainder after division:
```
mysql> SELECT MOD(34.5,3);
    -> 1.5
```

$\operatorname{MOD}(N, 0)$ returns NULL.
- PI()

Returns the value of $\pi(\mathrm{pi})$. The default number of decimal places displayed is seven, but MySQL uses the full double-precision value internally.

Because the return value of this function is a double-precision value, its exact representation may vary between platforms or implementations. This also applies to any expressions making use of PI( ). See Section 13.1.4, "Floating-Point Types (Approximate Value) - FLOAT, DOUBLE".
```
mysql> SELECT PI();
    -> 3.141593
mysql> SELECT PI()+0.000000000000000000;
    -> 3.141592653589793000
```

- $\operatorname{POW}(X, Y)$

Returns the value of $X$ raised to the power of $Y$. Returns NULL if $X$ or $Y$ is NULL.
```
mysql> SELECT POW(2,2);
    -> 4
mysql> SELECT POW(2,-2);
    -> 0.25
```

- POWER( $X, Y$ )

This is a synonym for POW() .
- RADIANS( $X$ )

Returns the argument $X$, converted from degrees to radians. (Note that $\pi$ radians equals 180 degrees.) Returns NULL if $X$ is NULL.
```
mysql> SELECT RADIANS(90);
    -> 1.5707963267949
```

- RAND([N])

Returns a random floating-point value $v$ in the range $0<=v<1.0$. To obtain a random integer $R$ in the range $i<=R<j$, use the expression $\operatorname{FLOOR}(i+\operatorname{RAND}()$ * ( $j-i)$ ). For example, to obtain a random integer in the range the range $7<=R<12$, use the following statement:
```
SELECT FLOOR(7 + (RAND() * 5));
```


If an integer argument $N$ is specified, it is used as the seed value:
- With a constant initializer argument, the seed is initialized once when the statement is prepared, prior to execution.
- With a nonconstant initializer argument (such as a column name), the seed is initialized with the value for each invocation of RAND ( ).

One implication of this behavior is that for equal argument values, RAND ( $N$ ) returns the same value each time, and thus produces a repeatable sequence of column values. In the following example, the sequence of values produced by RAND ( 3 ) is the same both places it occurs.
```
mysql> CREATE TABLE t (i INT);
Query OK, 0 rows affected (0.42 sec)
mysql> INSERT INTO t VALUES(1),(2),(3);
Query OK, 3 rows affected (0.00 sec)
Records: 3 Duplicates: 0 Warnings: 0
mysql> SELECT i, RAND() FROM t;
+-------+------------------+
| i | RAND() |
+-------+-------------------+
| 1 | 0.61914388706828 |
| 2 | 0.93845168309142 |
| 3 | 0.83482678498591 |
+-------+------------------+
3 rows in set (0.00 sec)
mysql> SELECT i, RAND(3) FROM t;
+-------+-------------------+
| i | RAND(3) |
+-------+------------------+
| 1 | 0.90576975597606 |
| 2 | 0.37307905813035 |
| 3 | 0.14808605345719 |
+-------+------------------+
3 rows in set (0.00 sec)
mysql> SELECT i, RAND() FROM t;
+-------+-------------------+
| i | RAND() |
+-------+-------------------+
| 1 | 0.35877890638893 |
| 2 | 0.28941420772058 |
| 3 | 0.37073435016976 |
+-------+------------------+
3 rows in set (0.00 sec)
```

```
mysql> SELECT i, RAND(3) FROM t;
+-------+-------------------+
| i | RAND(3) |
+-------+-------------------+
| 1 | 0.90576975597606 |
| 2 | 0.37307905813035 |
| 3 | 0.14808605345719 |
+-------+------------------+
3 rows in set (0.01 sec)
```


RAND ( ) in a WHERE clause is evaluated for every row (when selecting from one table) or combination of rows (when selecting from a multiple-table join). Thus, for optimizer purposes, RAND ( ) is not a constant value and cannot be used for index optimizations. For more information, see Section 10.2.1.20, "Function Call Optimization".

Use of a column with RAND ( ) values in an ORDER BY or GROUP BY clause may yield unexpected results because for either clause a RAND ( ) expression can be evaluated multiple times for the same row, each time returning a different result. If the goal is to retrieve rows in random order, you can use a statement like this:
```
SELECT * FROM tbl_name ORDER BY RAND();
```


To select a random sample from a set of rows, combine ORDER BY RAND ( ) with LIMIT:
```
SELECT * FROM table1, table2 WHERE a=b AND c<d ORDER BY RAND() LIMIT 1000;
```


RAND ( ) is not meant to be a perfect random generator. It is a fast way to generate random numbers on demand that is portable between platforms for the same MySQL version.

This function is unsafe for statement-based replication. A warning is logged if you use this function when binlog_format is set to STATEMENT.
- ROUND ( $X$ ), ROUND ( $X, D$ )

Rounds the argument $X$ to $D$ decimal places. The rounding algorithm depends on the data type of $X$. $D$ defaults to 0 if not specified. $D$ can be negative to cause $D$ digits left of the decimal point of the value $X$ to become zero. The maximum absolute value for $D$ is 30 ; any digits in excess of 30 (or -30 ) are truncated. If $X$ or $D$ is NULL, the function returns NULL.
```
mysql> SELECT ROUND(-1.23);
    -> -1
mysql> SELECT ROUND(-1.58);
    -> -2
mysql> SELECT ROUND(1.58);
    -> 2
mysql> SELECT ROUND(1.298, 1);
    -> 1.3
mysql> SELECT ROUND(1.298, 0);
    -> 1
mysql> SELECT ROUND(23.298, -1);
    -> 20
mysql> SELECT ROUND(.12345678901234567890123456789012345, 35);
    -> 0.123456789012345678901234567890
```


The return value has the same type as the first argument (assuming that it is integer, double, or decimal). This means that for an integer argument, the result is an integer (no decimal places):
```
mysql> SELECT ROUND(150.000,2), ROUND(150,2);
+-------------------+--------------+
| ROUND(150.000,2) | ROUND(150,2) |
+-------------------+--------------+
```

```
+---------------------+----------------+
```


ROUND ( ) uses the following rules depending on the type of the first argument:
- For exact-value numbers, ROUND ( ) uses the "round half away from zero" or "round toward nearest" rule: A value with a fractional part of .5 or greater is rounded up to the next integer if positive or down to the next integer if negative. (In other words, it is rounded away from zero.) A value with a fractional part less than .5 is rounded down to the next integer if positive or up to the next integer if negative.
- For approximate-value numbers, the result depends on the C library. On many systems, this means that ROUND ( ) uses the "round to nearest even" rule: A value with a fractional part exactly halfway between two integers is rounded to the nearest even integer.

The following example shows how rounding differs for exact and approximate values:
```
mysql> SELECT ROUND(2.5), ROUND(25E-1);
+-------------+---------------+
| ROUND(2.5) | ROUND(25E-1) |
+-------------+--------------+
|3 | 2 |
+-------------+--------------+
```


For more information, see Section 14.24, "Precision Math".
The data type returned by ROUND ( ) (and TRUNCATE( )) is determined according to the rules listed here:
- When the first argument is of any integer type, the return type is always BIGINT.
- When the first argument is of any floating-point type or of any non-numeric type, the return type is always DOUBLE.
- When the first argument is a DECIMAL value, the return type is also DECIMAL.
- The type attributes for the return value are also copied from the first argument, except in the case of DECIMAL, when the second argument is a constant value.

When the desired number of decimal places is less than the scale of the argument, the scale and the precision of the result are adjusted accordingly.

In addition, for ROUND ( ) (but not for the TRUNCATE( ) function), the precision is extended by one place to accommodate rounding that increases the number of significant digits. If the second argument is negative, the return type is adjusted such that its scale is 0 , with a corresponding precision. For example, ROUND ( 99.999 , 2) returns 100.00-the first argument is DECIMAL (5, $3)$, and the return type is $\operatorname{DECIMAL}(5,2)$.

If the second argument is negative, the return type has scale 0 and a corresponding precision; ROUND ( $99.999,-1$ ) returns 100 , which is $\operatorname{DECIMAL}(3,0)$.

\section*{- $\operatorname{SIGN}(X)$}

Returns the sign of the argument as $-1,0$, or 1 , depending on whether $X$ is negative, zero, or positive. Returns NULL if $X$ is NULL.
```
mysql> SELECT SIGN(-32);
    -> -1
mysql> SELECT SIGN(0);
    -> 0
mysql> SELECT SIGN(234);
    -> 1
```

- $\operatorname{SIN}(X)$

Returns the sine of $X$, where $X$ is given in radians. Returns NULL if $X$ is NULL.
```
mysql> SELECT SIN(PI());
    -> 1.2246063538224e-16
mysql> SELECT ROUND(SIN(PI()));
    -> 0
```

- SQRT( $X$ )

Returns the square root of a nonnegative number $X$. If $X$ is NULL, the function returns NULL.
```
mysql> SELECT SQRT(4);
    -> 2
mysql> SELECT SQRT(20);
    -> 4.4721359549996
mysql> SELECT SQRT(-16);
    -> NULL
```

- TAN $(X)$

Returns the tangent of $X$, where $X$ is given in radians. Returns NULL if $X$ is NULL.
```
mysql> SELECT TAN(PI());
    -> -1.2246063538224e-16
mysql> SELECT TAN(PI()+1);
    -> 1.5574077246549
```

- TRUNCATE ( $X, D$ )

Returns the number $X$, truncated to $D$ decimal places. If $D$ is 0 , the result has no decimal point or fractional part. $D$ can be negative to cause $D$ digits left of the decimal point of the value $X$ to become zero. If $X$ or $D$ is NULL, the function returns NULL.
```
mysql> SELECT TRUNCATE(1.223,1);
    -> 1.2
mysql> SELECT TRUNCATE(1.999,1);
    -> 1.9
mysql> SELECT TRUNCATE(1.999,0);
    -> 1
mysql> SELECT TRUNCATE(-1.999,1);
    -> -1.9
mysql> SELECT TRUNCATE(122,-2);
    -> 100
mysql> SELECT TRUNCATE(10.28*100,0);
    -> 1028
```


All numbers are rounded toward zero.
The data type returned by TRUNCATE( ) follows the same rules that determine the return type of the ROUND ( ) function; for details, see the description for ROUND ( ).

\subsection*{14.7 Date and Time Functions}

This section describes the functions that can be used to manipulate temporal values. See Section 13.2, "Date and Time Data Types", for a description of the range of values each date and time type has and the valid formats in which values may be specified.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.11 Date and Time Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline ADDDATE( ) & Add time values (intervals) to a date value \\
\hline ADDTIME( ) & Add time \\
\hline CONVERT_TZ( ) & Convert from one time zone to another \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline CURDATE() & Return the current date \\
\hline CURRENT_DATE(), CURRENT_DATE & Synonyms for CURDATE() \\
\hline CURRENT_TIME(), CURRENT_TIME & Synonyms for CURTIME() \\
\hline CURRENT_TIMESTAMP( ), CURRENT_TIMESTAMP & Synonyms for NOW() \\
\hline CURTIME ( ) & Return the current time \\
\hline DATE( ) & Extract the date part of a date or datetime expression \\
\hline DATE_ADD( ) & Add time values (intervals) to a date value \\
\hline DATE_FORMAT( ) & Format date as specified \\
\hline DATE_SUB( ) & Subtract a time value (interval) from a date \\
\hline DATEDIFF() & Subtract two dates \\
\hline DAY( ) & Synonym for DAYOFMONTH() \\
\hline DAYNAME ( ) & Return the name of the weekday \\
\hline DAYOFMONTH( ) & Return the day of the month (0-31) \\
\hline DAYOFWEEK( ) & Return the weekday index of the argument \\
\hline DAYOFYEAR( ) & Return the day of the year (1-366) \\
\hline EXTRACT( ) & Extract part of a date \\
\hline FROM_DAYS( ) & Convert a day number to a date \\
\hline FROM_UNIXTIME() & Format Unix timestamp as a date \\
\hline GET_FORMAT( ) & Return a date format string \\
\hline HOUR( ) & Extract the hour \\
\hline LAST_DAY & Return the last day of the month for the argument \\
\hline LOCALTIME(), LOCALTIME & Synonym for NOW() \\
\hline LOCALTIMESTAMP, LOCALTIMESTAMP() & Synonym for NOW() \\
\hline MAKEDATE( ) & Create a date from the year and day of year \\
\hline MAKETIME( ) & Create time from hour, minute, second \\
\hline MICROSECOND() & Return the microseconds from argument \\
\hline MINUTE() & Return the minute from the argument \\
\hline MONTH( ) & Return the month from the date passed \\
\hline MONTHNAME ( ) & Return the name of the month \\
\hline NOW ( ) & Return the current date and time \\
\hline PERIOD_ADD() & Add a period to a year-month \\
\hline PERIOD_DIFF() & Return the number of months between periods \\
\hline QUARTER( ) & Return the quarter from a date argument \\
\hline SEC_TO_TIME() & Converts seconds to 'hh:mm:ss' format \\
\hline SECOND ( ) & Return the second (0-59) \\
\hline STR_TO_DATE( ) & Convert a string to a date \\
\hline SUBDATE() & Synonym for DATE_SUB() when invoked with three arguments \\
\hline SUBTIME() & Subtract times \\
\hline SYSDATE( ) & Return the time at which the function executes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline TIME() & Extract the time portion of the expression passed \\
\hline TIME_FORMAT() & Format as time \\
\hline TIME_TO_SEC() & Return the argument converted to seconds \\
\hline TIMEDIFF() & Subtract time \\
\hline TIMESTAMP() & With a single argument, this function returns the date or datetime expression; with two arguments, the sum of the arguments \\
\hline TIMESTAMPADD() & Add an interval to a datetime expression \\
\hline TIMESTAMPDIFF() & Return the difference of two datetime expressions, using the units specified \\
\hline TO_DAYS( ) & Return the date argument converted to days \\
\hline TO_SECONDS() & Return the date or datetime argument converted to seconds since Year 0 \\
\hline UNIX_TIMESTAMP( ) & Return a Unix timestamp \\
\hline UTC_DATE() & Return the current UTC date \\
\hline UTC_TIME() & Return the current UTC time \\
\hline UTC_TIMESTAMP( ) & Return the current UTC date and time \\
\hline WEEK() & Return the week number \\
\hline WEEKDAY() & Return the weekday index \\
\hline WEEKOFYEAR( ) & Return the calendar week of the date (1-53) \\
\hline YEAR( ) & Return the year \\
\hline YEARWEEK( ) & Return the year and week \\
\hline
\end{tabular}

Here is an example that uses date functions. The following query selects all rows with a date_col value from within the last 30 days:
```
mysql> SELECT something FROM tbl_name
    -> WHERE DATE_SUB(CURDATE(),INTERVAL 30 DAY) <= date_col;
```


The query also selects rows with dates that lie in the future.
Functions that expect date values usually accept datetime values and ignore the time part. Functions that expect time values usually accept datetime values and ignore the date part.

Functions that return the current date or time each are evaluated only once per query at the start of query execution. This means that multiple references to a function such as NOW ( ) within a single query always produce the same result. (For our purposes, a single query also includes a call to a stored program (stored routine, trigger, or event) and all subprograms called by that program.) This principle also applies to CURDATE( ), CURTIME( ), UTC_DATE( ), UTC_TIME( ), UTC_TIMESTAMP( ), and to any of their synonyms.

The CURRENT_TIMESTAMP(), CURRENT_TIME(), CURRENT_DATE(), and FROM_UNIXTIME() functions return values in the current session time zone, which is available as the session value of the time_zone system variable. In addition, UNIX_TIMESTAMP( ) assumes that its argument is a datetime value in the session time zone. See Section 7.1.15, "MySQL Server Time Zone Support".

Some date functions can be used with "zero" dates or incomplete dates such as '2001-11-00 ', whereas others cannot. Functions that extract parts of dates typically work with incomplete dates and thus can return 0 when you might otherwise expect a nonzero value. For example:
```
mysql> SELECT DAYOFMONTH('2001-11-00'), MONTH('2005-00-00');
```

```
-> 0, 0
```


Other functions expect complete dates and return NULL for incomplete dates. These include functions that perform date arithmetic or that map parts of dates to names. For example:
```
mysql> SELECT DATE_ADD('2006-05-00',INTERVAL 1 DAY);
    -> NULL
mysql> SELECT DAYNAME('2006-05-00');
    -> NULL
```


Several functions are strict when passed a DATE() function value as their argument and reject incomplete dates with a day part of zero: CONVERT_TZ( ), DATE_ADD( ), DATE_SUB( ), DAYOFYEAR(), TIMESTAMPDIFF(), TO_DAYS(), TO_SECONDS(), WEEK( ), WEEKDAY( ), WEEKOFYEAR(), YEARWEEK().

Fractional seconds for TIME, DATETIME, and TIMESTAMP values are supported, with up to microsecond precision. Functions that take temporal arguments accept values with fractional seconds. Return values from temporal functions include fractional seconds as appropriate.
- ADDDATE(date,INTERVAL expr unit),ADDDATE(date,days)

When invoked with the INTERVAL form of the second argument, ADDDATE ( ) is a synonym for DATE_ADD(). The related function SUBDATE() is a synonym for DATE_SUB(). For information on the INTERVAL unit argument, see Temporal Intervals.
```
mysql> SELECT DATE_ADD('2008-01-02', INTERVAL 31 DAY);
    -> '2008-02-02'
mysql> SELECT ADDDATE('2008-01-02', INTERVAL 31 DAY);
    -> '2008-02-02'
```


When invoked with the days form of the second argument, MySQL treats it as an integer number of days to be added to expr.
```
mysql> SELECT ADDDATE('2008-01-02', 31);
    -> '2008-02-02'
```


This function returns NULL if date or days is NULL.
- ADDTIME(expr1,expr2)

ADDTIME() adds expr2 to expr1 and returns the result. expr1 is a time or datetime expression, and expr2 is a time expression. Returns NULL if expr1or expr2 is NULL.

The return type of this function and of the SUBTIME( ) function is determined as follows:
- If the first argument is a dynamic parameter (such as in a prepared statement), the return type is TIME.
- Otherwise, the resolved type of the function is derived from the resolved type of the first argument.
```
mysql> SELECT ADDTIME('2007-12-31 23:59:59.999999', '1 1:1:1.000002');
    -> '2008-01-02 01:01:01.000001'
mysql> SELECT ADDTIME('01:00:00.999999', '02:00:00.999998');
    -> '03:00:01.999997'
```

- CONVERT_TZ(dt,from_tz,to_tz)

CONVERT_TZ( ) converts a datetime value $d t$ from the time zone given by from_ $t z$ to the time zone given by to_tz and returns the resulting value. Time zones are specified as described in Section 7.1.15, "MySQL Server Time Zone Support". This function returns NULL if any of the arguments are invalid, or if any of them are NULL.

On 32-bit platforms, the supported range of values for this function is the same as for the TIMESTAMP type (see Section 13.2.1, "Date and Time Data Type Syntax", for range information). On 64-bit platforms, the maximum supported value is '3001-01-18 23:59:59.999999' UTC.

Regardless of platform or MySQL version, if the value falls out of the supported range when converted from from_tz to UTC, no conversion occurs.
```
mysql> SELECT CONVERT_TZ('2004-01-01 12:00:00','GMT','MET');
    -> '2004-01-01 13:00:00'
mysql> SELECT CONVERT_TZ('2004-01-01 12:00:00','+00:00','+10:00');
    -> '2004-01-01 22:00:00'
```


\section*{Note}

To use named time zones such as 'MET' or 'Europe/Amsterdam', the time zone tables must be properly set up. For instructions, see Section 7.1.15, "MySQL Server Time Zone Support".
- CURDATE()

Returns the current date as a value in ' $Y Y Y Y-M M-D D$ ' or $Y Y Y Y M M D D$ format, depending on whether the function is used in string or numeric context.
```
mysql> SELECT CURDATE();
    -> '2008-06-13'
mysql> SELECT CURDATE() + 0;
    -> 20080613
```

- CURRENT_DATE, CURRENT_DATE()

CURRENT_DATE and CURRENT_DATE() are synonyms for CURDATE().
- CURRENT_TIME, CURRENT_TIME([fsp])

CURRENT_TIME and CURRENT_TIME( ) are synonyms for CURTIME().
- CURRENT_TIMESTAMP, CURRENT_TIMESTAMP([fsp])

CURRENT_TIMESTAMP and CURRENT_TIMESTAMP( ) are synonyms for NOW( ).
- CURTIME([fsp])

Returns the current time as a value in ' $h h: m m: s s$ ' or hhmmss format, depending on whether the function is used in string or numeric context. The value is expressed in the session time zone.

If the $f s p$ argument is given to specify a fractional seconds precision from 0 to 6 , the return value includes a fractional seconds part of that many digits.
```
mysql> SELECT CURTIME();
+------------+
| CURTIME() |
+------------+
| 19:25:37 |
+-----------+
mysql> SELECT CURTIME() + 0;
+----------------+
| CURTIME() + 0 |
+----------------+
| 192537 |
+----------------+
mysql> SELECT CURTIME(3);
+---------------+
| CURTIME(3) |
+---------------+
| 19:25:37.840 |
+---------------+
```

- DATE(expr)

Extracts the date part of the date or datetime expression expr. Returns NULL if expr is NULL.
```
mysql> SELECT DATE('2003-12-31 01:02:03');
    -> '2003-12-31'
```

- DATEDIFF(expr1, expr2)

DATEDIFF ( ) returns expr1 - expr2 expressed as a value in days from one date to the other. expr1 and expr2 are date or date-and-time expressions. Only the date parts of the values are used in the calculation.
```
mysql> SELECT DATEDIFF('2007-12-31 23:59:59','2007-12-30');
    -> 1
mysql> SELECT DATEDIFF('2010-11-30 23:59:59','2010-12-31');
    -> -31
```


This function returns NULL if expr1 or expr2 is NULL.
- DATE_ADD(date,INTERVAL expr unit),DATE_SUB(date,INTERVAL expr unit)

These functions perform date arithmetic. The date argument specifies the starting date or datetime value. expr is an expression specifying the interval value to be added or subtracted from the starting date. expr is evaluated as a string; it may start with a - for negative intervals. unit is a keyword indicating the units in which the expression should be interpreted.

For more information about temporal interval syntax, including a full list of unit specifiers, the expected form of the expr argument for each unit value, and rules for operand interpretation in temporal arithmetic, see Temporal Intervals.

The return value depends on the arguments:
- If date is NULL, the function returns NULL.
- DATE if the date argument is a DATE value and your calculations involve only YEAR, MONTH, and DAY parts (that is, no time parts).
- TIME if the date argument is a TIME value and the calculations involve only HOURS, MINUTES, and SECONDS parts (that is, no date parts).
- DATETIME if the first argument is a DATETIME (or TIMESTAMP) value, or if the first argument is a DATE and the unit value uses HOURS, MINUTES, or SECONDS, or if the first argument is of type TIME and the unit value uses YEAR, MONTH, or DAY.
- If the first argument is a dynamic parameter (for example, of a prepared statement), its resolved type is DATE if the second argument is an interval that contains some combination of YEAR, MONTH, or DAY values only; otherwise, its type is DATETIME.
- String otherwise (type VARCHAR).

To ensure that the result is DATETIME, you can use CAST( ) to convert the first argument to DATETIME.
```
mysql> SELECT DATE_ADD('2018-05-01',INTERVAL 1 DAY);
    -> '2018-05-02'
mysql> SELECT DATE_SUB('2018-05-01',INTERVAL 1 YEAR);
    -> '2017-05-01'
mysql> SELECT DATE_ADD('2020-12-31 23:59:59',
    -> INTERVAL 1 SECOND);
        -> '2021-01-01 00:00:00'
mysql> SELECT DATE_ADD('2018-12-31 23:59:59',
    -> INTERVAL 1 DAY);
        -> '2019-01-01 23:59:59'
mysql> SELECT DATE_ADD('2100-12-31 23:59:59',
    -> INTERVAL '1:1' MINUTE_SECOND);
```

```
    -> '2101-01-01 00:01:00'
mysql> SELECT DATE_SUB('2025-01-01 00:00:00',
    -> INTERVAL '1 1:1:1' DAY_SECOND);
        -> '2024-12-30 22:58:59'
mysql> SELECT DATE_ADD('1900-01-01 00:00:00',
    -> INTERVAL '-1 10' DAY_HOUR);
        -> '1899-12-30 14:00:00'
mysql> SELECT DATE_SUB('1998-01-02', INTERVAL 31 DAY);
        -> '1997-12-02'
mysql> SELECT DATE_ADD('1992-12-31 23:59:59.000002',
    -> INTERVAL '1.999999' SECOND_MICROSECOND);
        -> '1993-01-01 00:00:01.000001'
```


When adding a MONTH interval to a DATE or DATETIME value, and the resulting date includes a day that does not exist in the given month, the day is adjusted to the last day of the month, as shown here:
```
mysql> SELECT DATE_ADD('2024-03-30', INTERVAL 1 MONTH) AS d1,
    > DATE_ADD('2024-03-31', INTERVAL 1 MONTH) AS d2;
+-------------+-------------+
| d1 | d2 |
+-------------+-------------+
| 2024-04-30 | 2024-04-30 |
+-------------+------------+
1 row in set (0.00 sec)
```

- DATE_FORMAT(date,format)

Formats the date value according to the format string. If either argument is NULL, the function returns NULL.

The specifiers shown in the following table may be used in the format string. The \% character is required before format specifier characters. The specifiers apply to other functions as well: STR_TO_DATE(), TIME_FORMAT(), UNIX_TIMESTAMP( ).

\begin{tabular}{|l|l|}
\hline Specifier & Description \\
\hline \%a & Abbreviated weekday name (Sun..Sat) \\
\hline \%b & Abbreviated month name (Jan..Dec) \\
\hline \%c & Month, numeric (0..12) \\
\hline \%D & Day of the month with English suffix (0th, 1st, 2nd, 3rd, ...) \\
\hline \%d & Day of the month, numeric (00..31) \\
\hline \%e & Day of the month, numeric (0..31) \\
\hline \%f & Microseconds (000000..999999) \\
\hline \%H & Hour (00..23) \\
\hline \%h & Hour (01..12) \\
\hline \%I & Hour (01..12) \\
\hline \%i & Minutes, numeric (00..59) \\
\hline \%j & Day of year (001..366) \\
\hline \%k & Hour (0..23) \\
\hline \%1 & Hour (1..12) \\
\hline \%M & Month name (January..December) \\
\hline \%m & Month, numeric (00..12) \\
\hline \%p & AM or PM \\
\hline \%r & Time, 12-hour (hh: mm: ss followed by AM or PM) \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Specifier & Description \\
\hline \%S & Seconds (00..59) \\
\hline \%s & Seconds (00..59) \\
\hline \%T & Time, 24-hour (hh : mm : ss) \\
\hline \%U & Week (00..53), where Sunday is the first day of the week; WEEK( ) mode 0 \\
\hline \%u & Week (00..53), where Monday is the first day of the week; WEEK( ) mode 1 \\
\hline \%V & Week (01..53), where Sunday is the first day of the week; WEEK ( ) mode 2; used with \%X \\
\hline \%v & Week (01..53), where Monday is the first day of the week; WEEK ( ) mode 3; used with \%x \\
\hline \%W & Weekday name (Sunday..Saturday) \\
\hline \%w & Day of the week (0=Sunday..6=Saturday) \\
\hline \%X & Year for the week where Sunday is the first day of the week, numeric, four digits; used with \%V \\
\hline \%x & Year for the week, where Monday is the first day of the week, numeric, four digits; used with \%v \\
\hline \%Y & Year, numeric, four digits \\
\hline \%y & Year, numeric (two digits) \\
\hline \%\% & A literal \% character \\
\hline $\% x$ & $x$, for any " $x$ " not listed above \\
\hline
\end{tabular}

Ranges for the month and day specifiers begin with zero due to the fact that MySQL permits the storing of incomplete dates such as '2014-00-00' .

The language used for day and month names and abbreviations is controlled by the value of the lc_time_names system variable (Section 12.16, "MySQL Server Locale Support").

For the $\% \mathrm{U}, \% \mathrm{u}, \% \mathrm{~V}$, and $\% \mathrm{v}$ specifiers, see the description of the WEEK( ) function for information about the mode values. The mode affects how week numbering occurs.

DATE_FORMAT ( ) returns a string with a character set and collation given by character_set_connection and collation_connection so that it can return month and weekday names containing non-ASCII characters.
```
mysql> SELECT DATE_FORMAT('2009-10-04 22:23:00', '%W %M %Y');
    -> 'Sunday October 2009'
mysql> SELECT DATE_FORMAT('2007-10-04 22:23:00', '%H:%i:%s');
    -> '22:23:00'
mysql> SELECT DATE_FORMAT('1900-10-04 22:23:00',
    -> '%D %y %a %d %m %b %j');
        -> '4th 00 Thu 04 10 Oct 277'
mysql> SELECT DATE_FORMAT('1997-10-04 22:23:00',
    -> '%H %k %I %r %T %S %w');
        -> '22 22 10 10:23:00 PM 22:23:00 00 6'
mysql> SELECT DATE_FORMAT('1999-01-01', '%X %V');
        -> '1998 52'
mysql> SELECT DATE_FORMAT('2006-06-00', '%d');
        -> '00'
```

- DATE_SUB(date,INTERVAL expr unit)

See the description for DATE_ADD( ).
- DAY(date)

DAY( ) is a synonym for DAYOFMONTH ( ).
- DAYNAME(date)

Returns the name of the weekday for date. The language used for the name is controlled by the value of the lc_time_names system variable (see Section 12.16, "MySQL Server Locale Support"). Returns NULL if date is NULL.
```
mysql> SELECT DAYNAME('2007-02-03');
    -> 'Saturday'
```

- DAYOFMONTH(date)

Returns the day of the month for date, in the range 1 to 31 , or 0 for dates such as ${ }^{\prime}$ 0000-00-00 ' or '2008-00-00' that have a zero day part. Returns NULL if date is NULL.
```
mysql> SELECT DAYOFMONTH('2007-02-03');
    -> 3
```

- DAYOFWEEK(date)

Returns the weekday index for date ( $1=$ Sunday, $2=$ Monday, $\ldots, 7=$ Saturday). These index values correspond to the ODBC standard. Returns NULL if date is NULL.
```
mysql> SELECT DAYOFWEEK('2007-02-03');
    -> 7
```

- DAYOFYEAR(date)

Returns the day of the year for date, in the range 1 to 366 . Returns NULL if date is NULL.
```
mysql> SELECT DAYOFYEAR('2007-02-03');
    -> 34
```

- EXTRACT(unit FROM date)

The EXTRACT( ) function uses the same kinds of unit specifiers as DATE_ADD( ) or DATE_SUB( ), but extracts parts from the date rather than performing date arithmetic. For information on the unit argument, see Temporal Intervals. Returns NULL if date is NULL.
```
mysql> SELECT EXTRACT(YEAR FROM '2019-07-02');
    -> 2019
mysql> SELECT EXTRACT(YEAR_MONTH FROM '2019-07-02 01:02:03');
    -> 201907
mysql> SELECT EXTRACT(DAY_MINUTE FROM '2019-07-02 01:02:03');
    -> 20102
mysql> SELECT EXTRACT(MICROSECOND
    -> FROM '2003-01-02 10:30:00.000123');
        -> 123
```

- FROM_DAYS( $N$ )

Given a day number $N$, returns a DATE value. Returns NULL if $N$ is NULL.
```
mysql> SELECT FROM_DAYS(730669);
    -> '2000-07-03'
```


Use FROM_DAYS( ) with caution on old dates. It is not intended for use with values that precede the advent of the Gregorian calendar (1582). See Section 13.2.7, "What Calendar Is Used By MySQL?".
- FROM_UNIXTIME(unix_timestamp[,format])

Returns a representation of unix_timestamp as a datetime or character string value. The value returned is expressed using the session time zone. (Clients can set the session time zone as
described in Section 7.1.15, "MySQL Server Time Zone Support".) unix_timestamp is an internal timestamp value representing seconds since '1970-01-01 00:00:00' UTC, such as produced by the UNIX_TIMESTAMP( ) function.

If format is omitted, this function returns a DATETIME value.
If unix_timestamp or format is NULL, this function returns NULL.
If unix_timestamp is an integer, the fractional seconds precision of the DATETIME is zero. When unix_timestamp is a decimal value, the fractional seconds precision of the DATETIME is the same as the precision of the decimal value, up to a maximum of 6 . When unix_timestamp is a floating point number, the fractional seconds precision of the datetime is 6 .

On 32-bit platforms, the maximum useful value for unix_timestamp is 2147483647.999999, which returns '2038-01-19 03:14:07.999999' UTC. On 64-bit platforms, the effective maximum is 32536771199.999999, which returns '3001-01-18 23:59:59.999999' UTC. Regardless of platform or version, a greater value for unix_timestamp than the effective maximum returns 0.
format is used to format the result in the same way as the format string used for the DATE_FORMAT ( ) function. If format is supplied, the value returned is a VARCHAR.
```
mysql> SELECT FROM_UNIXTIME(1447430881);
    -> '2015-11-13 10:08:01'
mysql> SELECT FROM_UNIXTIME(1447430881) + 0;
    -> 20151113100801
mysql> SELECT FROM_UNIXTIME(1447430881,
    -> '%Y %D %M %h:%i:%s %x');
        -> '2015 13th November 10:08:01 2015'
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2173.jpg?height=127&width=95&top_left_y=1393&top_left_x=406)

\section*{Note}

If you use UNIX_TIMESTAMP( ) and FROM_UNIXTIME( ) to convert between values in a non-UTC time zone and Unix timestamp values, the conversion is lossy because the mapping is not one-to-one in both directions. For details, see the description of the UNIX_TIMESTAMP( ) function.
- GET_FORMAT(\{DATE|TIME|DATETIME\}, \{'EUR'|'USA'|'JIS'|'ISO'|'INTERNAL'\})

Returns a format string. This function is useful in combination with the DATE_FORMAT ( ) and the STR_TO_DATE() functions.

If format is NULL, this function returns NULL.
The possible values for the first and second arguments result in several possible format strings (for the specifiers used, see the table in the DATE_FORMAT ( ) function description). ISO format refers to ISO 9075, not ISO 8601.

\begin{tabular}{|l|l|}
\hline Function Call & Result \\
\hline GET_FORMAT(DATE, 'USA' ) & '\%m.\%d.\%Y' \\
\hline GET_FORMAT(DATE, ' JIS ' ) & '\%Y-\%m-\%d ' \\
\hline GET_FORMAT(DATE, 'ISO' ) & '\%Y-\%m-\%d' \\
\hline GET_FORMAT(DATE, 'EUR') & '\%d.\%m.\%Y' \\
\hline GET_FORMAT(DATE, 'INTERNAL ' ) & '\%Y\%m\%d ' \\
\hline GET_FORMAT(DATETIME, 'USA' ) & '\%Y-\%m-\%d \%H.\%i.\%s' \\
\hline GET_FORMAT(DATETIME, 'JIS') & '\%Y-\%m-\%d \%H:\%i:\%s' \\
\hline GET_FORMAT(DATETIME, 'ISO') & '\%Y-\%m-\%d \%H:\%i:\%s' \\
\hline GET_FORMAT(DATETIME, 'EUR') & '\%Y-\%m-\%d \%H.\%i.\%s' \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Function Call & Result \\
\hline GET_FORMAT(DATETIME, 'INTERNAL' ) & ${ }^{\prime} \% \mathrm{Y}_{\mathrm{m}} \% \mathrm{~d} \% \mathrm{H}_{\mathrm{H}} \% \mathrm{~s}^{\prime}$ \\
\hline GET_FORMAT(TIME, 'USA' ) & '\%h:\%i:\%s \%p' \\
\hline GET_FORMAT(TIME, ' JIS' ) & '\%H:\%i:\%s' \\
\hline GET_FORMAT(TIME, 'ISO' ) & '\%H:\%i:\%s' \\
\hline GET_FORMAT(TIME, 'EUR') & '\%H.\%i.\%s' \\
\hline GET_FORMAT(TIME, 'INTERNAL' ) & '\%H\%i\%s ' \\
\hline
\end{tabular}

TIMESTAMP can also be used as the first argument to GET_FORMAT ( ), in which case the function returns the same values as for DATETIME.
```
mysql> SELECT DATE_FORMAT('2003-10-03',GET_FORMAT(DATE,'EUR'));
    -> '03.10.2003'
mysql> SELECT STR_TO_DATE('10.31.2003',GET_FORMAT(DATE,'USA'));
    -> '2003-10-31'
```

- HOUR(time)

Returns the hour for time. The range of the return value is 0 to 23 for time-of-day values. However, the range of TIME values actually is much larger, so HOUR can return values greater than 23 . Returns NULL if time is NULL.
```
mysql> SELECT HOUR('10:05:03');
    -> 10
mysql> SELECT HOUR('272:59:59');
    -> 272
```

- LAST_DAY(date)

Takes a date or datetime value and returns the corresponding value for the last day of the month. Returns NULL if the argument is invalid or NULL.
```
mysql> SELECT LAST_DAY('2003-02-05');
    -> '2003-02-28'
mysql> SELECT LAST_DAY('2004-02-05');
    -> '2004-02-29'
mysql> SELECT LAST_DAY('2004-01-01 01:01:01');
    -> '2004-01-31'
mysql> SELECT LAST_DAY('2003-03-32');
    -> NULL
```

- LOCALTIME, LOCALTIME([fsp])

LOCALTIME and LOCALTIME() are synonyms for NOW().
- LOCALTIMESTAMP, LOCALTIMESTAMP([fsp])

LOCALTIMESTAMP and LOCALTIMESTAMP( ) are synonyms for NOW().
- MAKEDATE(year,dayofyear)

Returns a date, given year and day-of-year values. dayofyear must be greater than 0 or the result is NULL. The result is also NULL if either argument is NULL.
```
mysql> SELECT MAKEDATE(2011,31), MAKEDATE(2011,32);
    -> '2011-01-31', '2011-02-01'
mysql> SELECT MAKEDATE(2011,365), MAKEDATE(2014,365);
    -> '2011-12-31', '2014-12-31'
mysql> SELECT MAKEDATE(2011,0);
    -> NULL
```

- MAKETIME(hour,minute,second)

Returns a time value calculated from the hour, minute, and second arguments. Returns NULL if any of its arguments are NULL.

The second argument can have a fractional part.
```
mysql> SELECT MAKETIME(12,15,30);
    -> '12:15:30'
```

- MICROSECOND (expr)

Returns the microseconds from the time or datetime expression expr as a number in the range from 0 to 999999. Returns NULL if expr is NULL.
```
mysql> SELECT MICROSECOND('12:00:00.123456');
    -> 123456
mysql> SELECT MICROSECOND('2019-12-31 23:59:59.000010');
    -> 10
```

- MINUTE(time)

Returns the minute for time, in the range 0 to 59 , or NULL if time is NULL.
```
mysql> SELECT MINUTE('2008-02-03 10:05:03');
    -> 5
```

- MONTH(date)

Returns the month for date, in the range 1 to 12 for January to December, or 0 for dates such as '0000-00-00' or '2008-00-00' that have a zero month part. Returns NULL if date is NULL.
```
mysql> SELECT MONTH('2008-02-03');
    -> 2
```

- MONTHNAME(date)

Returns the full name of the month for date. The language used for the name is controlled by the value of the lc_time_names system variable (Section 12.16, "MySQL Server Locale Support"). Returns NULL if date is NULL.
```
mysql> SELECT MONTHNAME('2008-02-03');
    -> 'February'
```

- NOW([fsp])

Returns the current date and time as a value in ' YYYY-MM-DD hh:mm:ss' or YYYYMMDDhhmmss format, depending on whether the function is used in string or numeric context. The value is expressed in the session time zone.

If the fsp argument is given to specify a fractional seconds precision from 0 to 6 , the return value includes a fractional seconds part of that many digits.
```
mysql> SELECT NOW();
    -> '2007-12-15 23:50:26'
mysql> SELECT NOW() + 0;
    -> 20071215235026.000000
```


NOW ( ) returns a constant time that indicates the time at which the statement began to execute. (Within a stored function or trigger, NOW ( ) returns the time at which the function or triggering statement began to execute.) This differs from the behavior for SYSDATE( ), which returns the exact time at which it executes.
```
mysql> SELECT NOW(), SLEEP(2), NOW();
+----------------------+----------+---------------------
    | NOW() | SLEEP(2) | NOW() |
```

```
+----------------------+----------+--------------------+
| 2006-04-12 13:47:36 | 0 | 2006-04-12 13:47:36 |
+----------------------+----------+--------------------+
mysql> SELECT SYSDATE(), SLEEP(2), SYSDATE();
+----------------------+----------+---------------------+
| SYSDATE() | SLEEP(2) | SYSDATE() |
+----------------------+----------+---------------------
| 2006-04-12 13:47:44 | 0 | 2006-04-12 13:47:46 |
+----------------------+----------+--------------------+
```


In addition, the SET TIMESTAMP statement affects the value returned by NOW ( ) but not by SYSDATE(). This means that timestamp settings in the binary log have no effect on invocations of SYSDATE( ). Setting the timestamp to a nonzero value causes each subsequent invocation of NOW ( ) to return that value. Setting the timestamp to zero cancels this effect so that NOW ( ) once again returns the current date and time.

See the description for SYSDATE( ) for additional information about the differences between the two functions.
- PERIOD_ADD( $P, N$ )

Adds $N$ months to period $P$ (in the format $Y$ YMM or YYYYMM). Returns a value in the format YYYYMM.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2176.jpg?height=122&width=99&top_left_y=1160&top_left_x=338)

Note
The period argument $P$ is not a date value.

This function returns NULL if $P$ or $N$ is NULL.
```
mysql> SELECT PERIOD_ADD(200801,2);
    -> 200803
```

- PERIOD_DIFF( $P 1, P 2$ )

Returns the number of months between periods $P 1$ and $P 2 . P 1$ and $P 2$ should be in the format $Y Y M M$ or $Y Y Y Y M M$. Note that the period arguments $P 1$ and $P 2$ are not date values.

This function returns NULL if $P 1$ or $P 2$ is NULL.
```
mysql> SELECT PERIOD_DIFF(200802,200703);
    -> 11
```

- QUARTER(date)

Returns the quarter of the year for date, in the range 1 to 4 , or NULL if date is NULL.
```
mysql> SELECT QUARTER('2008-04-01');
    -> 2
```

- SECOND(time)

Returns the second for time, in the range 0 to 59 , or NULL if time is NULL.
```
mysql> SELECT SECOND('10:05:03');
    -> 3
```

- SEC_TO_TIME(seconds)

Returns the seconds argument, converted to hours, minutes, and seconds, as a TIME value. The range of the result is constrained to that of the TIME data type. A warning occurs if the argument corresponds to a value outside that range.

The function returns NULL if seconds is NULL.
```
mysql> SELECT SEC_TO_TIME(2378);
    -> '00:39:38'
mysql> SELECT SEC_TO_TIME(2378) + 0;
    -> 3938
```

- STR_TO_DATE(str,format)

This is the inverse of the DATE_FORMAT() function. It takes a string str and a format string format. STR_TO_DATE( ) returns a DATETIME value if the format string contains both date and time parts, or a DATE or TIME value if the string contains only date or time parts. If str or format is NULL, the function returns NULL. If the date, time, or datetime value extracted from str cannot be parsed according to the rules followed by the server, STR_TO_DATE( ) returns NULL and produces a warning.

The server scans str attempting to match format to it. The format string can contain literal characters and format specifiers beginning with \%. Literal characters in format must match literally in str. Format specifiers in format must match a date or time part in str. For the specifiers that can be used in format, see the DATE_FORMAT ( ) function description.
```
mysql> SELECT STR_TO_DATE('01,5,2013','%d,%m,%Y');
    -> '2013-05-01'
mysql> SELECT STR_TO_DATE('May 1, 2013','%M %d,%Y');
    -> '2013-05-01'
```


Scanning starts at the beginning of str and fails if format is found not to match. Extra characters at the end of str are ignored.
```
mysql> SELECT STR_TO_DATE('a09:30:17','a%h:%i:%s');
    -> '09:30:17'
mysql> SELECT STR_TO_DATE('a09:30:17','%h:%i:%s');
    -> NULL
mysql> SELECT STR_TO_DATE('09:30:17a','%h:%i:%s');
    -> '09:30:17'
```


Unspecified date or time parts have a value of 0 , so incompletely specified values in str produce a result with some or all parts set to 0 :
```
mysql> SELECT STR_TO_DATE('abc','abc');
    -> '0000-00-00'
mysql> SELECT STR_TO_DATE('9','%m');
    -> '0000-09-00'
mysql> SELECT STR_TO_DATE('9','%s');
    -> '00:00:09'
```


Range checking on the parts of date values is as described in Section 13.2.2, "The DATE, DATETIME, and TIMESTAMP Types". This means, for example, that "zero" dates or dates with part values of 0 are permitted unless the SQL mode is set to disallow such values.
```
mysql> SELECT STR_TO_DATE('00/00/0000', '%m/%d/%Y');
    -> '0000-00-00'
mysql> SELECT STR_TO_DATE('04/31/2004', '%m/%d/%Y');
    -> '2004-04-31'
```


If the NO_ZERO_DATE SQL mode is enabled, zero dates are disallowed. In that case, STR_TO_DATE( ) returns NULL and generates a warning:
```
mysql> SET sql_mode = '';
mysql> SELECT STR_TO_DATE('00/00/0000', '%m/%d/%Y');
```

```
+----------------------------------------+
| STR_TO_DATE('00/00/0000', '%m/%d/%Y') |
+-----------------------------------------+
| 0000-00-00 |
+----------------------------------------+
mysql> SET sql_mode = 'NO_ZERO_DATE';
mysql> SELECT STR_TO_DATE('00/00/0000', '%m/%d/%Y');
+-----------------------------------------+
| STR_TO_DATE('00/00/0000', '%m/%d/%Y') |
+-----------------------------------------+
| NULL |
+-----------------------------------------+
mysql> SHOW WARNINGS\G
************************* 1. row *******************************
    Level: Warning
        Code: 1411
Message: Incorrect datetime value: '00/00/0000' for function str_to_date
```


In some previous versions of MySQL, it was possible to pass an invalid date string such as '2021-11 - 31' to this function. In MySQL 8.4, STR_TO_DATE( ) performs complete range checking and raises an error if the date after conversion would be invalid.

\section*{Note \\ You cannot use format "\%X\%V" to convert a year-week string to a date because the combination of a year and week does not uniquely identify a year and month if the week crosses a month boundary. To convert a year-week to a date, you should also specify the weekday:}
```
mysql> SELECT STR_TO_DATE('200442 Monday', '%X%V %W');
    -> '2004-10-18'
```


You should also be aware that, for dates and the date portions of datetime values, STR_TO_DATE( ) checks (only) the individual year, month, and day of month values for validity. More precisely, this means that the year is checked to be sure that it is in the range 0-9999 inclusive, the month is checked to ensure that it is in the range 1-12 inclusive, and the day of month is checked to make sure that it is in the range 1-31 inclusive, but the server does not check the values in combination. For example, SELECT STR_TO_DATE('23-2-31', '\%Y-\%m-\%d') returns 2023-02-31. Enabling or disabling the ALLOW_INVALID_DATES server SQL mode has no effect on this behavior. See Section 13.2.2, "The DATE, DATETIME, and TIMESTAMP Types", for more information.
- SUBDATE(date, INTERVAL expr unit), SUBDATE(expr, days)

When invoked with the INTERVAL form of the second argument, SUBDATE ( ) is a synonym for DATE_SUB( ). For information on the INTERVAL unit argument, see the discussion for DATE_ADD().
```
mysql> SELECT DATE_SUB('2008-01-02', INTERVAL 31 DAY);
    -> '2007-12-02'
mysql> SELECT SUBDATE('2008-01-02', INTERVAL 31 DAY);
    -> '2007-12-02'
```


The second form enables the use of an integer value for days. In such cases, it is interpreted as the number of days to be subtracted from the date or datetime expression expr.
```
mysql> SELECT SUBDATE('2008-01-02 12:00:00', 31);
    -> '2007-12-02 12:00:00'
```


This function returns NULL if any of its arguments are NULL.
- SUBTIME(expr1,expr2)

SUBTIME() returns expr1 - expr2 expressed as a value in the same format as expr1. expr1 is a time or datetime expression, and expr2 is a time expression.

Resolution of this function's return type is performed as it is for the ADDTIME() function; see the description of that function for more information.
```
mysql> SELECT SUBTIME('2007-12-31 23:59:59.999999','1 1:1:1.000002');
    -> '2007-12-30 22:58:58.999997'
mysql> SELECT SUBTIME('01:00:00.999999', '02:00:00.999998');
    -> '-00:59:59.999999'
```


This function returns NULL if expr1 or expr2 is NULL.
- SYSDATE([fsp])

Returns the current date and time as a value in ' YYYY-MM-DD hh:mm:ss' or YYYYMMDDhhmmss format, depending on whether the function is used in string or numeric context.

If the $f s p$ argument is given to specify a fractional seconds precision from 0 to 6 , the return value includes a fractional seconds part of that many digits.

SYSDATE( ) returns the time at which it executes. This differs from the behavior for NOW( ), which returns a constant time that indicates the time at which the statement began to execute. (Within a stored function or trigger, NOW ( ) returns the time at which the function or triggering statement began to execute.)
```
mysql> SELECT NOW(), SLEEP(2), NOW();
+----------------------+----------+---------------------
| NOW() | SLEEP(2) | NOW() |
+----------------------+----------+---------------------
| 2006-04-12 13:47:36 | 0 | 2006-04-12 13:47:36 |
+----------------------+----------+---------------------+
mysql> SELECT SYSDATE(), SLEEP(2), SYSDATE();
+----------------------+----------+----------------------
| SYSDATE() | SLEEP(2) | SYSDATE() |
+----------------------+----------+--------------------+
| 2006-04-12 13:47:44 | 0 | 2006-04-12 13:47:46 |
+----------------------+----------+--------------------+
```


In addition, the SET TIMESTAMP statement affects the value returned by NOW() but not by SYSDATE( ). This means that timestamp settings in the binary log have no effect on invocations of SYSDATE().

Because SYSDATE( ) can return different values even within the same statement, and is not affected by SET TIMESTAMP, it is nondeterministic and therefore unsafe for replication if statement-based binary logging is used. If that is a problem, you can use row-based logging.

Alternatively, you can use the--sysdate-is-now option to cause SYSDATE() to be an alias for NOW ( ). This works if the option is used on both the replication source server and the replica.

The nondeterministic nature of SYSDATE( ) also means that indexes cannot be used for evaluating expressions that refer to it.
- TIME(expr)

Extracts the time part of the time or datetime expression expr and returns it as a string. Returns NULL if expr is NULL.

This function is unsafe for statement-based replication. A warning is logged if you use this function when binlog_format is set to STATEMENT.
```
mysql> SELECT TIME('2003-12-31 01:02:03');
    -> '01:02:03'
mysql> SELECT TIME('2003-12-31 01:02:03.000123');
    -> '01:02:03.000123'
```

- TIMEDIFF(expr1,expr2)

TIMEDIFF() returns expr1 - expr2 expressed as a time value. expr1 and expr2 are strings which are converted to TIME or DATETIME expressions; these must be of the same type following conversion. Returns NULL if expr1 or expr2 is NULL.

The result returned by TIMEDIFF( ) is limited to the range allowed for TIME values. Alternatively, you can use either of the functions TIMESTAMPDIFF( ) and UNIX_TIMESTAMP( ), both of which return integers.
```
mysql> SELECT TIMEDIFF('2000-01-01 00:00:00',
    -> '2000-01-01 00:00:00.000001');
        -> '-00:00:00.000001'
mysql> SELECT TIMEDIFF('2008-12-31 23:59:59.000001',
    -> '2008-12-30 01:01:01.000002');
        -> '46:58:57.999999'
```

- TIMESTAMP( expr), TIMESTAMP( expr1, expr2)

With a single argument, this function returns the date or datetime expression expr as a datetime value. With two arguments, it adds the time expression expr2 to the date or datetime expression expr1 and returns the result as a datetime value. Returns NULL if expr, expr1, or expr2 is NULL.
```
mysql> SELECT TIMESTAMP('2003-12-31');
    -> '2003-12-31 00:00:00'
mysql> SELECT TIMESTAMP('2003-12-31 12:00:00','12:00:00');
    -> '2004-01-01 00:00:00'
```

- TIMESTAMPADD(unit,interval,datetime_expr)

Adds the integer expression interval to the date or datetime expression datetime_expr. The unit for interval is given by the unit argument, which should be one of the following values: MICROSECOND (microseconds), SECOND, MINUTE, HOUR, DAY, WEEK, MONTH, QUARTER, or YEAR.

The unit value may be specified using one of keywords as shown, or with a prefix of SQL_TSI_. For example, DAY and SQL_TSI_DAY both are legal.

This function returns NULL if interval or datetime_expr is NULL.
```
mysql> SELECT TIMESTAMPADD(MINUTE, 1, '2003-01-02');
    -> '2003-01-02 00:01:00'
mysql> SELECT TIMESTAMPADD(WEEK,1,'2003-01-02');
    -> '2003-01-09'
```


When adding a MONTH interval to a DATE or DATETIME value, and the resulting date includes a day that does not exist in the given month, the day is adjusted to the last day of the month, as shown here:
```
mysql> SELECT TIMESTAMPADD(MONTH, 1, DATE '2024-03-30') AS t1,
    > TIMESTAMPADD(MONTH, 1, DATE '2024-03-31') AS t2;
+-------------+-------------+
| t1 | t2 |
+-------------+------------+
```

```
| 2024-04-30 | 2024-04-30 |
+-------------+------------+
1 row in set (0.00 sec)
```

- TIMESTAMPDIFF(unit,datetime_expr1,datetime_expr2)

Returns datetime_expr2 - datetime_expr1, where datetime_expr1 and datetime_expr2 are date or datetime expressions. One expression may be a date and the other a datetime; a date value is treated as a datetime having the time part ${ }^{\prime} 00: 00: 00^{\prime}$ where necessary. The unit for the result (an integer) is given by the unit argument. The legal values for unit are the same as those listed in the description of the TIMESTAMPADD( ) function.

This function returns NULL if datetime_expr1 or datetime_expr2 is NULL.
```
mysql> SELECT TIMESTAMPDIFF(MONTH,'2003-02-01','2003-05-01');
    -> 3
mysql> SELECT TIMESTAMPDIFF(YEAR,'2002-05-01','2001-01-01');
    -> -1
mysql> SELECT TIMESTAMPDIFF(MINUTE,'2003-02-01','2003-05-01 12:05:55');
    -> 128885
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2181.jpg?height=126&width=97&top_left_y=1037&top_left_x=404)

\section*{Note}

The order of the date or datetime arguments for this function is the opposite of that used with the TIMESTAMP ( ) function when invoked with 2 arguments.
- TIME_FORMAT(time,format)

This is used like the DATE_FORMAT ( ) function, but the format string may contain format specifiers only for hours, minutes, seconds, and microseconds. Other specifiers produce a NULL or 0. TIME_FORMAT() returns NULL if time or format is NULL.

If the time value contains an hour part that is greater than 23 , the $\% \mathrm{H}$ and $\% \mathrm{k}$ hour format specifiers produce a value larger than the usual range of $0 . .23$. The other hour format specifiers produce the hour value modulo 12.
```
mysql> SELECT TIME_FORMAT('100:00:00', '%H %k %h %I %l');
    -> '100 100 04 04 4'
```

- TIME_TO_SEC(time)

Returns the time argument, converted to seconds. Returns NULL if time is NULL.
```
mysql> SELECT TIME_TO_SEC('22:23:00');
    -> 80580
mysql> SELECT TIME_TO_SEC('00:39:38');
    -> 2378
```

- TO_DAYS(date)

Given a date date, returns a day number (the number of days since year 0). Returns NULL if date is NULL.
```
mysql> SELECT TO_DAYS(950501);
    -> 728779
mysql> SELECT TO_DAYS('2007-10-07');
    -> 733321
```


TO_DAYS( ) is not intended for use with values that precede the advent of the Gregorian calendar (1582), because it does not take into account the days that were lost when the calendar was
changed. For dates before 1582 (and possibly a later year in other locales), results from this function are not reliable. See Section 13.2.7, "What Calendar Is Used By MySQL?", for details.

Remember that MySQL converts two-digit year values in dates to four-digit form using the rules in Section 13.2, "Date and Time Data Types". For example, ' 2008-10-07' and '08-10-07' are seen as identical dates:
```
mysql> SELECT TO_DAYS('2008-10-07'), TO_DAYS('08-10-07');
    -> 733687, 733687
```


In MySQL, the zero date is defined as '0000-00-00' , even though this date is itself considered invalid. This means that, for '0000-00-00' and '0000-01-01', TO_DAYS() returns the values shown here:
```
mysql> SELECT TO_DAYS('0000-00-00');
+-------------------------+
| to_days('0000-00-00') |
+-------------------------+
| NULL |
+-------------------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS;
+----------+------+------------------------------------------
| Level | Code | Message |
+----------+------+----------------------------------------
| Warning | 1292 | Incorrect datetime value: '0000-00-00' |
+---------+------+-----------------------------------------
1 row in set (0.00 sec)
mysql> SELECT TO_DAYS('0000-01-01');
+------------------------+
| to_days('0000-01-01') |
+-------------------------+
| 1 |
+-------------------------+
1 row in set (0.00 sec)
```


This is true whether or not the ALLOW_INVALID_DATES SQL server mode is enabled.
- TO_SECONDS(expr)

Given a date or datetime expr, returns the number of seconds since the year 0 . If expr is not a valid date or datetime value (including NULL), it returns NULL.
```
mysql> SELECT TO_SECONDS(950501);
    -> 62966505600
mysql> SELECT TO_SECONDS('2009-11-29');
    -> 63426672000
mysql> SELECT TO_SECONDS('2009-11-29 13:43:32');
    -> 63426721412
mysql> SELECT TO_SECONDS( NOW() );
    -> 63426721458
```


Like TO_DAYS( ), TO_SECONDS( ) is not intended for use with values that precede the advent of the Gregorian calendar (1582), because it does not take into account the days that were lost when the calendar was changed. For dates before 1582 (and possibly a later year in other locales), results
from this function are not reliable. See Section 13.2.7, "What Calendar Is Used By MySQL?", for details.

Like TO_DAYS( ), TO_SECONDS( ), converts two-digit year values in dates to four-digit form using the rules in Section 13.2, "Date and Time Data Types".

In MySQL, the zero date is defined as '0000-00-00 ' , even though this date is itself considered invalid. This means that, for '0000-00-00' and '0000-01-01', TO_SECONDS() returns the values shown here:
```
mysql> SELECT TO_SECONDS('0000-00-00');
+----------------------------+
| TO_SECONDS('0000-00-00') |
+---------------------------+
| NULL |
+---------------------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS;
+----------+------+----------------------------------------
| Level | Code | Message |
+---------+------+---------------------------------------+
| Warning | 1292 | Incorrect datetime value: '0000-00-00' |
+----------+------+-----------------------------------------
1 row in set (0.00 sec)
mysql> SELECT TO_SECONDS('0000-01-01');
+----------------------------+
| TO_SECONDS('0000-01-01') |
+---------------------------+
| 86400 |
+---------------------------+
1 row in set (0.00 sec)
```


This is true whether or not the ALLOW_INVALID_DATES SQL server mode is enabled.
- UNIX_TIMESTAMP([date])

If UNIX_TIMESTAMP( ) is called with no date argument, it returns a Unix timestamp representing seconds since '1970-01-01 00:00:00' UTC.

If UNIX_TIMESTAMP( ) is called with a date argument, it returns the value of the argument as seconds since '1970-01-01 00:00:00' UTC. The server interprets date as a value in the session time zone and converts it to an internal Unix timestamp value in UTC. (Clients can set the session time zone as described in Section 7.1.15, "MySQL Server Time Zone Support".) The date argument may be a DATE, DATETIME, or TIMESTAMP string, or a number in YYMMDD, YYMMDDhhmmss, YYYYMMDD, or YYYYMMDDhhmmss format. If the argument includes a time part, it may optionally include a fractional seconds part.

The return value is an integer if no argument is given or the argument does not include a fractional seconds part, or DECIMAL if an argument is given that includes a fractional seconds part.

When the date argument is a TIMESTAMP column, UNIX_TIMESTAMP( ) returns the internal timestamp value directly, with no implicit "string-to-Unix-timestamp" conversion.

The valid range of argument values is the same as for the TIMESTAMP data type: '1970-01-01 00:00:01.000000' UTC to '2038-01-19 03:14:07.999999' UTC for 32-bit platforms; for MySQL running on 64-bit platforms, the valid range of argument values for UNIX_TIMESTAMP( )
is '1970-01-01 00:00:01.000000' UTC to '3001-01-19 03:14:07.999999' UTC (corresponding to 32536771199.999999 seconds).

Regardless of MySQL version or platform architecture, if you pass an out-of-range date to UNIX_TIMESTAMP( ), it returns 0 . If date is NULL, it returns NULL.
```
mysql> SELECT UNIX_TIMESTAMP();
    -> 1447431666
mysql> SELECT UNIX_TIMESTAMP('2015-11-13 10:20:19');
    -> 1447431619
mysql> SELECT UNIX_TIMESTAMP('2015-11-13 10:20:19.012');
    -> 1447431619.012
```


If you use UNIX_TIMESTAMP( ) and FROM_UNIXTIME( ) to convert between values in a non-UTC time zone and Unix timestamp values, the conversion is lossy because the mapping is not one-toone in both directions. For example, due to conventions for local time zone changes such as Daylight Saving Time (DST), it is possible for UNIX_TIMESTAMP( ) to map two values that are distinct in a non-UTC time zone to the same Unix timestamp value. FROM_UNIXTIME() maps that value back to only one of the original values. Here is an example, using values that are distinct in the MET time zone:
```
mysql> SET time_zone = 'MET';
mysql> SELECT UNIX_TIMESTAMP('2005-03-27 03:00:00');
+----------------------------------------+
| UNIX_TIMESTAMP('2005-03-27 03:00:00') |
+----------------------------------------+
| 1111885200 |
+----------------------------------------+
mysql> SELECT UNIX_TIMESTAMP('2005-03-27 02:00:00');
+----------------------------------------+
| UNIX_TIMESTAMP('2005-03-27 02:00:00') |
+----------------------------------------+
| 1111885200 |
+----------------------------------------+
mysql> SELECT FROM_UNIXTIME(1111885200);
+-----------------------------+
| FROM_UNIXTIME(1111885200) |
+-----------------------------+
| 2005-03-27 03:00:00 |
+-----------------------------+
```


Note

To use named time zones such as 'MET' or 'Europe/Amsterdam', the time zone tables must be properly set up. For instructions, see Section 7.1.15, "MySQL Server Time Zone Support".

If you want to subtract UNIX_TIMESTAMP( ) columns, you might want to cast them to signed integers. See Section 14.10, "Cast Functions and Operators".
- UTC_DATE, UTC_DATE()

Returns the current UTC date as a value in ' $Y Y Y Y-M M-D D$ ' or $Y Y Y Y M M D D$ format, depending on whether the function is used in string or numeric context.
```
mysql> SELECT UTC_DATE(), UTC_DATE() + 0;
    -> '2003-08-14', 20030814
```

- UTC_TIME, UTC_TIME([fsp])

Returns the current UTC time as a value in ' $h h: m m: s s^{\prime}$ or $h h m m s s$ format, depending on whether the function is used in string or numeric context.

If the $f s p$ argument is given to specify a fractional seconds precision from 0 to 6 , the return value includes a fractional seconds part of that many digits.
```
mysql> SELECT UTC_TIME(), UTC_TIME() + 0;
    -> '18:07:53', 180753.000000
```

- UTC_TIMESTAMP, UTC_TIMESTAMP([fsp])

Returns the current UTC date and time as a value in ' $Y Y Y Y-M M-D D$ hh:mm:ss' or YYYYMMDDhhmmss format, depending on whether the function is used in string or numeric context.

If the fsp argument is given to specify a fractional seconds precision from 0 to 6 , the return value includes a fractional seconds part of that many digits.
```
mysql> SELECT UTC_TIMESTAMP(), UTC_TIMESTAMP() + 0;
    -> '2003-08-14 18:08:04', 20030814180804.000000
```

- WEEK(date[,mode])

This function returns the week number for date. The two-argument form of WEEK( ) enables you to specify whether the week starts on Sunday or Monday and whether the return value should be in the range from 0 to 53 or from 1 to 53 . If the mode argument is omitted, the value of the default_week_format system variable is used. See Section 7.1.8, "Server System Variables". For a NULL date value, the function returns NULL.

The following table describes how the mode argument works.

\begin{tabular}{|l|l|l|l|}
\hline Mode & First day of week & Range & Week 1 is the first week ... \\
\hline 0 & Sunday & 0-53 & with a Sunday in this year \\
\hline 1 & Monday & 0-53 & with 4 or more days this year \\
\hline 2 & Sunday & 1-53 & with a Sunday in this year \\
\hline 3 & Monday & 1-53 & with 4 or more days this year \\
\hline 4 & Sunday & 0-53 & with 4 or more days this year \\
\hline 5 & Monday & 0-53 & with a Monday in this year \\
\hline 6 & Sunday & 1-53 & with 4 or more days this year \\
\hline 7 & Monday & 1-53 & with a Monday in this year \\
\hline
\end{tabular}

For mode values with a meaning of "with 4 or more days this year," weeks are numbered according to ISO 8601:1988:
- If the week containing January 1 has 4 or more days in the new year, it is week 1.
- Otherwise, it is the last week of the previous year, and the next week is week 1.
```
mysql> SELECT WEEK('2008-02-20');
    -> 7
mysql> SELECT WEEK('2008-02-20',0);
    -> 7
mysql> SELECT WEEK('2008-02-20',1);
    -> 8
mysql> SELECT WEEK('2008-12-31',1);
    -> 53
```


If a date falls in the last week of the previous year, MySQL returns 0 if you do not use $2,3,6$, or 7 as the optional mode argument:
```
mysql> SELECT YEAR('2000-01-01'), WEEK('2000-01-01',0);
    -> 2000, 0
```


One might argue that WEEK ( ) should return 52 because the given date actually occurs in the 52nd week of 1999. WEEK ( ) returns 0 instead so that the return value is "the week number in the given year." This makes use of the WEEK( ) function reliable when combined with other functions that extract a date part from a date.

If you prefer a result evaluated with respect to the year that contains the first day of the week for the given date, use $0,2,5$, or 7 as the optional mode argument.
```
mysql> SELECT WEEK('2000-01-01',2);
    -> 52
```


Alternatively, use the YEARWEEK( ) function:
```
mysql> SELECT YEARWEEK('2000-01-01');
    -> 199952
mysql> SELECT MID(YEARWEEK('2000-01-01'),5,2);
    -> '52'
```

- WEEKDAY(date)

Returns the weekday index for date (0 = Monday, $1=$ Tuesday, $\ldots 6=$ Sunday). Returns NULL if date is NULL.
```
mysql> SELECT WEEKDAY('2008-02-03 22:23:00');
    -> 6
mysql> SELECT WEEKDAY('2007-11-06');
    -> 1
```

- WEEKOFYEAR(date)

Returns the calendar week of the date as a number in the range from 1 to 53. Returns NULL if date is NULL.

WEEKOFYEAR( ) is a compatibility function that is equivalent to WEEK(date, 3 ).
```
mysql> SELECT WEEKOFYEAR('2008-02-20');
    -> 8
```

- YEAR(date)

Returns the year for date, in the range 1000 to 9999 , or 0 for the "zero" date. Returns NULL if date is NULL.
```
mysql> SELECT YEAR('1987-01-01');
    -> 1987
```

- YEARWEEK(date), YEARWEEK(date,mode)

Returns year and week for a date. The year in the result may be different from the year in the date argument for the first and the last week of the year. Returns NULL if date is NULL.

The mode argument works exactly like the mode argument to WEEK( ). For the single-argument syntax, a mode value of 0 is used. Unlike WEEK( ), the value of default_week_format does not influence YEARWEEK( ).
```
mysql> SELECT YEARWEEK('1987-01-01');
    -> 198652
```


The week number is different from what the WEEK( ) function would return (0) for optional arguments 0 or 1, as WEEK( ) then returns the week in the context of the given year.

\subsection*{14.8 String Functions and Operators}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.12 String Functions and Operators}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline ASCII() & Return numeric value of left-most character \\
\hline BIN() & Return a string containing binary representation of a number \\
\hline BIT_LENGTH( ) & Return length of argument in bits \\
\hline CHAR( ) & Return the character for each integer passed \\
\hline CHAR_LENGTH( ) & Return number of characters in argument \\
\hline CHARACTER_LENGTH( ) & Synonym for CHAR_LENGTH() \\
\hline CONCAT() & Return concatenated string \\
\hline CONCAT_WS( ) & Return concatenate with separator \\
\hline ELT( ) & Return string at index number \\
\hline EXPORT_SET() & Return a string such that for every bit set in the value bits, you get an on string and for every unset bit, you get an off string \\
\hline FIELD() & Index (position) of first argument in subsequent arguments \\
\hline FIND_IN_SET() & Index (position) of first argument within second argument \\
\hline FORMAT( ) & Return a number formatted to specified number of decimal places \\
\hline FROM_BASE64( ) & Decode base64 encoded string and return result \\
\hline HEX( ) & Hexadecimal representation of decimal or string value \\
\hline INSERT( ) & Insert substring at specified position up to specified number of characters \\
\hline INSTR( ) & Return the index of the first occurrence of substring \\
\hline LCASE( ) & Synonym for LOWER() \\
\hline LEFT( ) & Return the leftmost number of characters as specified \\
\hline LENGTH( ) & Return the length of a string in bytes \\
\hline LIKE & Simple pattern matching \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline LOAD_FILE( ) & Load the named file \\
\hline LOCATE( ) & Return the position of the first occurrence of substring \\
\hline LOWER( ) & Return the argument in lowercase \\
\hline LPAD ( ) & Return the string argument, left-padded with the specified string \\
\hline LTRIM( ) & Remove leading spaces \\
\hline MAKE_SET( ) & Return a set of comma-separated strings that have the corresponding bit in bits set \\
\hline MATCH( ) & Perform full-text search \\
\hline MID() & Return a substring starting from the specified position \\
\hline NOT LIKE & Negation of simple pattern matching \\
\hline NOT REGEXP & Negation of REGEXP \\
\hline OCT( ) & Return a string containing octal representation of a number \\
\hline OCTET_LENGTH( ) & Synonym for LENGTH() \\
\hline ORD ( ) & Return character code for leftmost character of the argument \\
\hline POSITION() & Synonym for LOCATE() \\
\hline QUOTE( ) & Escape the argument for use in an SQL statement \\
\hline REGEXP & Whether string matches regular expression \\
\hline REGEXP_INSTR( ) & Starting index of substring matching regular expression \\
\hline REGEXP_LIKE() & Whether string matches regular expression \\
\hline REGEXP_REPLACE() & Replace substrings matching regular expression \\
\hline REGEXP_SUBSTR( ) & Return substring matching regular expression \\
\hline REPEAT( ) & Repeat a string the specified number of times \\
\hline REPLACE() & Replace occurrences of a specified string \\
\hline REVERSE( ) & Reverse the characters in a string \\
\hline RIGHT() & Return the specified rightmost number of characters \\
\hline RLIKE & Whether string matches regular expression \\
\hline RPAD( ) & Append string the specified number of times \\
\hline RTRIM() & Remove trailing spaces \\
\hline SOUNDEX() & Return a soundex string \\
\hline SOUNDS LIKE & Compare sounds \\
\hline SPACE() & Return a string of the specified number of spaces \\
\hline STRCMP( ) & Compare two strings \\
\hline SUBSTR( ) & Return the substring as specified \\
\hline SUBSTRING() & Return the substring as specified \\
\hline SUBSTRING_INDEX() & Return a substring from a string before the specified number of occurrences of the delimiter \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline TO_BASE64() & Return the argument converted to a base-64 string \\
\hline TRIM( ) & Remove leading and trailing spaces \\
\hline UCASE( ) & Synonym for UPPER() \\
\hline UNHEX ( ) & Return a string containing hex representation of a number \\
\hline UPPER( ) & Convert to uppercase \\
\hline WEIGHT_STRING() & Return the weight string for a string \\
\hline
\end{tabular}

String-valued functions return NULL if the length of the result would be greater than the value of the max_allowed_packet system variable. See Section 7.1.1, "Configuring the Server".

For functions that operate on string positions, the first position is numbered 1.
For functions that take length arguments, noninteger arguments are rounded to the nearest integer.
- ASCII(str)

Returns the numeric value of the leftmost character of the string str. Returns 0 if str is the empty string. Returns NULL if str is NULL. ASCII ( ) works for 8-bit characters.
```
mysql> SELECT ASCII('2');
    -> 50
mysql> SELECT ASCII(2);
    -> 50
mysql> SELECT ASCII('dx');
    -> 100
```


See also the ORD() function.
- $\operatorname{BIN}(N)$

Returns a string representation of the binary value of $N$, where $N$ is a longlong (BIGINT) number. This is equivalent to $\operatorname{CONV}(N, 10,2)$. Returns NULL if $N$ is NULL.
```
mysql> SELECT BIN(12);
    -> '1100'
```

- BIT_LENGTH(str)

Returns the length of the string $s t r$ in bits. Returns NULL if $s t r$ is NULL.
```
mysql> SELECT BIT_LENGTH('text');
    -> 32
```

- CHAR( $N, . .$. [USING charset_name])

CHAR( ) interprets each argument $N$ as an integer and returns a string consisting of the characters given by the code values of those integers. NULL values are skipped.
```
mysql> SELECT CHAR(77,121,83,81,'76');
+------------------------------------------------------
| CHAR(77,121,83,81,'76') |
+------------------------------------------------------
| 0x4D7953514C
+----------------------------------------------------+
1 row in set (0.00 sec)
mysql> SELECT CHAR(77,77.3,'77.3');
+-----------------------------------------------
| CHAR(77,77.3,'77.3') |
+----------------------------------------------
| 0x4D4D4D |
+----------------------------------------------
```

```
1 row in set (0.00 sec)
```


By default, CHAR( ) returns a binary string. To produce a string in a given character set, use the optional USING clause:
```
mysql> SELECT CHAR(77,121,83,81,'76' USING utf8mb4);
+-----------------------------------------+
| CHAR(77,121,83,81,'76' USING utf8mb4) |
+-----------------------------------------+
| MySQL |
+-----------------------------------------+
1 row in set (0.00 sec)
mysql> SELECT CHAR(77,77.3,'77.3' USING utf8mb4);
+--------------------------------------+
| CHAR(77,77.3,'77.3' USING utf8mb4) |
+--------------------------------------+
| MMM |
+--------------------------------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS;
+----------+------+--------------------------------------------
| Level | Code | Message |
+----------+------+------------------------------------------
| Warning | 1292 | Truncated incorrect INTEGER value: '77.3' |
+----------+------+-------------------------------------------
1 row in set (0.00 sec)
```


If USING is given and the result string is illegal for the given character set, a warning is issued. Also, if strict SQL mode is enabled, the result from CHAR( ) becomes NULL.

If CHAR( ) is invoked from within the mysql client, binary strings display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".

CHAR( ) arguments larger than 255 are converted into multiple result bytes. For example, $\operatorname{CHAR}(256)$ is equivalent to $\operatorname{CHAR}(1,0)$, and $\operatorname{CHAR}(256 * 256)$ is equivalent to $\operatorname{CHAR}(1,0,0):$
```
mysql> SELECT HEX(CHAR(1,0)), HEX(CHAR(256));
+-----------------+----------------+
| HEX(CHAR(1,0)) | HEX(CHAR(256)) |
+-----------------+----------------+
| 0100 |0100 |
+-----------------+----------------+
1 row in set (0.00 sec)
mysql> SELECT HEX(CHAR(1,0,0)), HEX(CHAR(256*256));
+-------------------+--------------------+
| HEX(CHAR(1,0,0)) | HEX(CHAR(256*256)) |
+-------------------+--------------------+
|010000 |010000 |
+-------------------+---------------------+
1 row in set (0.00 sec)
```


CHAR_LENGTH(str)
Returns the length of the string str, measured in code points. A multibyte character counts as a single code point. This means that, for a string containing two 3-byte characters, LENGTH( ) returns 6, whereas CHAR_LENGTH( ) returns 2, as shown here:
```
mysql> SET @dolphin:='海豚';
Query OK, 0 rows affected (0.01 sec)
mysql> SELECT LENGTH(@dolphin), CHAR_LENGTH(@dolphin);
+-------------------+-----------------------+
| LENGTH(@dolphin) | CHAR_LENGTH(@dolphin) |
+-------------------+-----------------------+
```

```
+-------------------+----------------------+
1 row in set (0.00 sec)
```


CHAR_LENGTH( ) returns NULL if str is NULL.
- CHARACTER_LENGTH(str)

CHARACTER_LENGTH( ) is a synonym for CHAR_LENGTH( ).
- CONCAT(str1,str2,...)

Returns the string that results from concatenating the arguments. May have one or more arguments. If all arguments are nonbinary strings, the result is a nonbinary string. If the arguments include any binary strings, the result is a binary string. A numeric argument is converted to its equivalent nonbinary string form.

CONCAT( ) returns NULL if any argument is NULL.
```
mysql> SELECT CONCAT('My', 'S', 'QL');
    -> 'MySQL'
mysql> SELECT CONCAT('My', NULL, 'QL');
    -> NULL
mysql> SELECT CONCAT(14.3);
    -> '14.3'
```


For quoted strings, concatenation can be performed by placing the strings next to each other:
```
mysql> SELECT 'My' 'S' 'QL';
    -> 'MySQL'
```


If CONCAT( ) is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql — The MySQL Command-Line Client".
- CONCAT_WS(separator,str1,str2,...)

CONCAT_WS( ) stands for Concatenate With Separator and is a special form of CONCAT( ). The first argument is the separator for the rest of the arguments. The separator is added between the strings to be concatenated. The separator can be a string, as can the rest of the arguments. If the separator is NULL, the result is NULL.
```
mysql> SELECT CONCAT_WS(',', 'First name', 'Second name', 'Last Name');
    -> 'First name,Second name,Last Name'
mysql> SELECT CONCAT_WS(',', 'First name', NULL, 'Last Name');
    -> 'First name,Last Name'
```


CONCAT_WS( ) does not skip empty strings. However, it does skip any NULL values after the separator argument.
- ELT( $N$, str1,str2,str3,...)

ELT ( ) returns the $N$ th element of the list of strings: str1 if $N=1, s t r 2$ if $N=2$, and so on. Returns NULL if $N$ is less than 1 , greater than the number of arguments, or NULL. ELT( ) is the complement of FIELD().
```
mysql> SELECT ELT(1, 'Aa', 'Bb', 'Cc', 'Dd');
    -> 'Aa'
mysql> SELECT ELT(4, 'Aa', 'Bb', 'Cc', 'Dd');
    -> 'Dd'
```

- EXPORT_SET(bits,on,off[,separator[,number_of_bits]])

Returns a string such that for every bit set in the value bits, you get an on string and for every bit not set in the value, you get an off string. Bits in bits are examined from right to left (from low-order to high-order bits). Strings are added to the result from left to right, separated by the
separator string (the default being the comma character, ). The number of bits examined is given by number_of_bits, which has a default of 64 if not specified. number_of_bits is silently clipped to 64 if larger than 64 . It is treated as an unsigned integer, so a value of -1 is effectively the same as 64.
```
mysql> SELECT EXPORT_SET(5,'Y','N',',',4);
    -> 'Y,N,Y,N'
mysql> SELECT EXPORT_SET(6,'1','0',',',10);
    -> '0,1,1,0,0,0,0,0,0,0'
```

- FIELD(str,str1,str2,str3,...)

Returns the index (position) of str in the str1, str2, str3, ... list. Returns 0 if str is not found.
If all arguments to FIELD( ) are strings, all arguments are compared as strings. If all arguments are numbers, they are compared as numbers. Otherwise, the arguments are compared as double.

If $s t r$ is NULL, the return value is 0 because NULL fails equality comparison with any value. FIELD( ) is the complement of ELT( ).
```
mysql> SELECT FIELD('Bb', 'Aa', 'Bb', 'Cc', 'Dd', 'Ff');
    -> 2
mysql> SELECT FIELD('Gg', 'Aa', 'Bb', 'Cc', 'Dd', 'Ff');
    -> 0
```

- FIND_IN_SET(str,strlist)

Returns a value in the range of 1 to $N$ if the string str is in the string list strlist consisting of $N$ substrings. A string list is a string composed of substrings separated by, characters. If the first argument is a constant string and the second is a column of type SET, the FIND_IN_SET( ) function is optimized to use bit arithmetic. Returns 0 if str is not in strlist or if strlist is the empty string. Returns NULL if either argument is NULL. This function does not work properly if the first argument contains a comma (, ) character.
```
mysql> SELECT FIND_IN_SET('b','a,b,c,d');
    -> 2
```

- FORMAT( $X, D[$, locale])

Formats the number $X$ to a format like ' $\#, \# \# \#, \# \# \# . \# \# '$, rounded to $D$ decimal places, and returns the result as a string. If $D$ is 0 , the result has no decimal point or fractional part. If $X$ or $D$ is NULL, the function returns NULL.

The optional third parameter enables a locale to be specified to be used for the result number's decimal point, thousands separator, and grouping between separators. Permissible locale values are the same as the legal values for the lc_time_names system variable (see Section 12.16, "MySQL Server Locale Support"). If the locale is NULL or not specified, the default locale is ' en_US '.
```
mysql> SELECT FORMAT(12332.123456, 4);
    -> '12,332.1235'
mysql> SELECT FORMAT(12332.1,4);
    -> '12,332.1000'
mysql> SELECT FORMAT(12332.2,0);
    -> '12,332'
mysql> SELECT FORMAT(12332.2,2,'de_DE');
    -> '12.332,20'
```

- FROM_BASE64(str)

Takes a string encoded with the base-64 encoded rules used by T0_BASE64 ( ) and returns the decoded result as a binary string. The result is NULL if the argument is NULL or not a valid base-64 string. See the description of T0_BASE64 ( ) for details about the encoding and decoding rules.
```
mysql> SELECT TO_BASE64('abc'), FROM_BASE64(TO_BASE64('abc'));
    -> 'JWJj', 'abc'
```


If FROM_BASE64 ( ) is invoked from within the mysql client, binary strings display using hexadecimal notation. You can disable this behavior by setting the value of the --binary-as-hex to 0 when starting the mysql client. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".
- HEX(str), HEX( $N$ )

For a string argument str, HEX() returns a hexadecimal string representation of str where each byte of each character in str is converted to two hexadecimal digits. (Multibyte characters therefore become more than two digits.) The inverse of this operation is performed by the UNHEX( ) function.

For a numeric argument $N$, HEX() returns a hexadecimal string representation of the value of $N$ treated as a longlong (BIGINT) number. This is equivalent to $\operatorname{CONV}(N, 10,16)$. The inverse of this operation is performed by $\operatorname{CONV}(\operatorname{HEX}(N), 16,10)$.

For a NULL argument, this function returns NULL.
```
mysql> SELECT X'616263', HEX('abc'), UNHEX(HEX('abc'));
    -> 'abc', 616263, 'abc'
mysql> SELECT HEX(255), CONV(HEX(255),16,10);
    -> 'FF', 255
```

- INSERT(str,pos,len,newstr)

Returns the string str, with the substring beginning at position pos and len characters long replaced by the string newstr. Returns the original string if pos is not within the length of the string. Replaces the rest of the string from position pos if len is not within the length of the rest of the string. Returns NULL if any argument is NULL.
```
mysql> SELECT INSERT('Quadratic', 3, 4, 'What');
    -> 'QuWhattic'
mysql> SELECT INSERT('Quadratic', -1, 4, 'What');
    -> 'Quadratic'
mysql> SELECT INSERT('Quadratic', 3, 100, 'What');
    -> 'QuWhat'
```


This function is multibyte safe.
- INSTR(str,substr)

Returns the position of the first occurrence of substring substr in string str. This is the same as the two-argument form of LOCATE( ), except that the order of the arguments is reversed.
```
mysql> SELECT INSTR('foobarbar', 'bar');
    -> 4
mysql> SELECT INSTR('xbar', 'foobar');
    -> 0
```


This function is multibyte safe, and is case-sensitive only if at least one argument is a binary string. If either argument is NULL, this functions returns NULL.
- LCASE(str)

LCASE() is a synonym for LOWER( ).
LCASE( ) used in a view is rewritten as LOWER( ) when storing the view's definition. (Bug \#12844279)
- LEFT(str,len)

Returns the leftmost len characters from the string $s t r$, or NULL if any argument is NULL.
```
mysql> SELECT LEFT('foobarbar', 5);
    -> 'fooba'
```


This function is multibyte safe.
- LENGTH(str)

Returns the length of the string $s t r$, measured in bytes. A multibyte character counts as multiple bytes. This means that for a string containing five 2-byte characters, LENGTH( ) returns 10, whereas CHAR_LENGTH( ) returns 5. Returns NULL if str is NULL.
```
mysql> SELECT LENGTH('text');
    -> 4
```


Note
The Length( ) OpenGIS spatial function is named ST_Length( ) in MySQL.
- LOAD_FILE(file_name)

Reads the file and returns the file contents as a string. To use this function, the file must be located on the server host, you must specify the full path name to the file, and you must have the FILE privilege. The file must be readable by the server and its size less than max_allowed_packet bytes. If the secure_file_priv system variable is set to a nonempty directory name, the file to be loaded must be located in that directory.

If the file does not exist or cannot be read because one of the preceding conditions is not satisfied, the function returns NULL.

The character_set_filesystem system variable controls interpretation of file names that are given as literal strings.
```
mysql> UPDATE t
        SET blob_col=LOAD_FILE('/tmp/picture')
        WHERE id=1;
```

- LOCATE(substr,str), LOCATE(substr,str,pos)

The first syntax returns the position of the first occurrence of substring substr in string str. The second syntax returns the position of the first occurrence of substring substr in string str, starting at position pos. Returns 0 if substr is not in str. Returns NULL if any argument is NULL.
```
mysql> SELECT LOCATE('bar', 'foobarbar');
    -> 4
mysql> SELECT LOCATE('xbar', 'foobar');
    -> 0
mysql> SELECT LOCATE('bar', 'foobarbar', 5);
    -> 7
```


This function is multibyte safe, and is case-sensitive only if at least one argument is a binary string.
- LOWER(str)

Returns the string str with all characters changed to lowercase according to the current character set mapping, or NULL if str is NULL. The default character set is utf 8 mb 4 .
```
mysql> SELECT LOWER('QUADRATICALLY');
    -> 'quadratically'
```


LOWER( ) (and UPPER( )) are ineffective when applied to binary strings (BINARY, VARBINARY, BLOB). To perform lettercase conversion of a binary string, first convert it to a nonbinary string using a character set appropriate for the data stored in the string:
```
mysql> SET @str = BINARY 'New York';
mysql> SELECT LOWER(@str), LOWER(CONVERT(@str USING utf8mb4));
+--------------+-------------------------------------
| LOWER(@str) | LOWER(CONVERT(@str USING utf8mb4)) |
```

```
+--------------+--------------------------------------
| New York | new york |
+--------------+--------------------------------------
```


For collations of Unicode character sets, LOWER( ) and UPPER ( ) work according to the Unicode Collation Algorithm (UCA) version in the collation name, if there is one, and UCA 4.0.0 if no version is specified. For example, utf8mb4_0900_ai_ci and utf8mb3_unicode_520_ci work according to UCA 9.0.0 and 5.2.0, respectively, whereas utf8mb3_unicode_ci works according to UCA 4.0.0. See Section 12.10.1, "Unicode Character Sets".

This function is multibyte safe.
LCASE() used within views is rewritten as LOWER().
- LPAD(str,len,padstr)

Returns the string str, left-padded with the string padstr to a length of len characters. If str is longer than len, the return value is shortened to len characters.
```
mysql> SELECT LPAD('hi',4,'??');
    -> '??hi'
mysql> SELECT LPAD('hi',1,'??');
    -> 'h'
```


Returns NULL if any of its arguments are NULL.
- LTRIM(str)

Returns the string $s t r$ with leading space characters removed. Returns NULL if str is NULL.
```
mysql> SELECT LTRIM(' barbar');
    -> 'barbar'
```


This function is multibyte safe.
- MAKE_SET(bits,str1,str2,...)

Returns a set value (a string containing substrings separated by, characters) consisting of the strings that have the corresponding bit in bits set. str1 corresponds to bit 0 , str2 to bit 1 , and so on. NULL values in str1, str2, . . . are not appended to the result.
```
mysql> SELECT MAKE_SET(1,'a','b','c');
    -> 'a'
mysql> SELECT MAKE_SET(1 | 4,'hello','nice','world');
    -> 'hello,world'
mysql> SELECT MAKE_SET(1 | 4,'hello','nice',NULL,'world');
    -> 'hello'
mysql> SELECT MAKE_SET(0,'a','b','c');
    -> ''
```

- MID(str,pos),MID(str FROM pos),MID(str,pos,len),MID(str FROM pos FOR len) MID(str,pos,len) is a synonym for SUBSTRING(str,pos, len).
- OCT(N)

Returns a string representation of the octal value of $N$, where $N$ is a longlong (BIGINT) number. This is equivalent to $\operatorname{CONV}(N, 10,8)$. Returns NULL if $N$ is NULL.
```
mysql> SELECT OCT(12);
    -> '14'
```

- OCTET_LENGTH(str)

OCTET_LENGTH( ) is a synonym for LENGTH( ).
- ORD(str)

If the leftmost character of the string $s t r$ is a multibyte character, returns the code for that character, calculated from the numeric values of its constituent bytes using this formula:
```
    (1st byte code)
+ (2nd byte code * 256)
+ (3rd byte code * 256^2) ...
```


If the leftmost character is not a multibyte character, ORD( ) returns the same value as the ASCII ( ) function. The function returns NULL if str is NULL.
```
mysql> SELECT ORD('2');
    -> 50
```

- POSITION(substr IN str)

POSITION(substr IN str) is a synonym for LOCATE(substr,str).
- QUOTE(str)

Quotes a string to produce a result that can be used as a properly escaped data value in an SQL statement. The string is returned enclosed by single quotation marks and with each instance of backslash ( \\), single quote ( ' ), ASCII NUL, and Control+Z preceded by a backslash. If the argument is NULL, the return value is the word "NULL" without enclosing single quotation marks.
```
mysql> SELECT QUOTE('Don\'t!');
    -> 'Don\'t!'
mysql> SELECT QUOTE(NULL);
    -> NULL
```


For comparison, see the quoting rules for literal strings and within the C API in Section 11.1.1, "String Literals", and mysql_real_escape_string_quote().
- REPEAT(str,count)

Returns a string consisting of the string str repeated count times. If count is less than 1 , returns an empty string. Returns NULL if str or count is NULL.
```
mysql> SELECT REPEAT('MySQL', 3);
    -> 'MySQLMySQLMySQL'
```

- REPLACE(str,from_str,to_str)

Returns the string str with all occurrences of the string from_str replaced by the string to_str. REPLACE ( ) performs a case-sensitive match when searching for from_str.
```
mysql> SELECT REPLACE('www.mysql.com', 'w', 'Ww');
    -> 'WwWwWw.mysql.com'
```


This function is multibyte safe. It returns NULL if any of its arguments are NULL.
- REVERSE(str)

Returns the string str with the order of the characters reversed, or NULL if $s t r$ is NULL.
```
mysql> SELECT REVERSE('abc');
    -> 'cba'
```


This function is multibyte safe.
- RIGHT(str,len)

Returns the rightmost len characters from the string $s t r$, or NULL if any argument is NULL.
```
mysql> SELECT RIGHT('foobarbar', 4);
    -> 'rbar'
```


This function is multibyte safe.
- RPAD(str, len, padstr)

Returns the string $s t r$, right-padded with the string padstr to a length of len characters. If $s t r$ is longer than len, the return value is shortened to len characters. If str, padstr, or len is NULL, the function returns NULL.
```
mysql> SELECT RPAD('hi',5,'?');
    -> 'hi???'
mysql> SELECT RPAD('hi',1,'?');
    -> 'h'
```


This function is multibyte safe.
- RTRIM(str)

Returns the string str with trailing space characters removed.
```
mysql> SELECT RTRIM('barbar ');
    -> 'barbar'
```


This function is multibyte safe, and returns NULL if str is NULL.
- SOUNDEX(str)

Returns a soundex string from str, or NULL if $s t r$ is NULL. Two strings that sound almost the same should have identical soundex strings. A standard soundex string is four characters long, but the SOUNDEX( ) function returns an arbitrarily long string. You can use SUBSTRING( ) on the result to get a standard soundex string. All nonalphabetic characters in str are ignored. All international alphabetic characters outside the A-Z range are treated as vowels.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2197.jpg?height=124&width=108&top_left_y=1656&top_left_x=397)

\section*{Important}

When using SOUNDEX( ), you should be aware of the following limitations:
- This function, as currently implemented, is intended to work well with strings that are in the English language only. Strings in other languages may not produce reliable results.
- This function is not guaranteed to provide consistent results with strings that use multibyte character sets, including utf-8. See Bug \#22638 for more information.
```
mysql> SELECT SOUNDEX('Hello');
    -> 'H400'
mysql> SELECT SOUNDEX('Quadratically');
    -> 'Q36324'
```


\section*{Note}

This function implements the original Soundex algorithm, not the more popular enhanced version (also described by D. Knuth). The difference is that original version discards vowels first and duplicates second, whereas the enhanced version discards duplicates first and vowels second.
- expr1 SOUNDS LIKE expr2

This is the same as SOUNDEX(expr1) = SOUNDEX(expr2).
- SPACE(N)

Returns a string consisting of $N$ space characters, or NULL if $N$ is NULL.
```
mysql> SELECT SPACE(6);
    -> ' '
    -> ' '
```

    - SUBSTR(str,pos),SUBSTR(str FROM pos),SUBSTR(str,pos,len),SUBSTR(str FROM
pos FOR len)
SUBSTR( ) is a synonym for SUBSTRING( ).
- SUBSTRING(str,pos),SUBSTRING(str FROM pos),SUBSTRING(str,pos,len), SUBSTRING(str FROM pos FOR len)

The forms without a len argument return a substring from string str starting at position pos. The forms with a len argument return a substring len characters long from string str, starting at position pos. The forms that use FROM are standard SQL syntax. It is also possible to use a negative value for pos. In this case, the beginning of the substring is pos characters from the end of the string, rather than the beginning. A negative value may be used for pos in any of the forms of this function. A value of 0 for pos returns an empty string.

For all forms of SUBSTRING( ), the position of the first character in the string from which the substring is to be extracted is reckoned as 1 .
```
mysql> SELECT SUBSTRING('Quadratically',5);
    -> 'ratically'
mysql> SELECT SUBSTRING('foobarbar' FROM 4);
    -> 'barbar'
mysql> SELECT SUBSTRING('Quadratically',5,6);
    -> 'ratica'
mysql> SELECT SUBSTRING('Sakila', -3);
    -> 'ila'
mysql> SELECT SUBSTRING('Sakila', -5, 3);
    -> 'aki'
mysql> SELECT SUBSTRING('Sakila' FROM -4 FOR 2);
    -> 'ki'
```


This function is multibyte safe. It returns NULL if any of its arguments are NULL.
If len is less than 1 , the result is the empty string.
- SUBSTRING_INDEX(str,delim,count)

Returns the substring from string str before count occurrences of the delimiter delim. If count is positive, everything to the left of the final delimiter (counting from the left) is returned. If count is negative, everything to the right of the final delimiter (counting from the right) is returned. SUBSTRING_INDEX( ) performs a case-sensitive match when searching for delim.
```
mysql> SELECT SUBSTRING_INDEX('www.mysql.com', '.', 2);
    -> 'www.mysql'
mysql> SELECT SUBSTRING_INDEX('www.mysql.com', '.', -2);
    -> 'mysql.com'
```


This function is multibyte safe.
SUBSTRING_INDEX() returns NULL if any of its arguments are NULL.
- TO_BASE64(str)

Converts the string argument to base-64 encoded form and returns the result as a character string with the connection character set and collation. If the argument is not a string, it is converted to a
string before conversion takes place. The result is NULL if the argument is NULL. Base-64 encoded strings can be decoded using the FROM_BASE64( ) function.
```
mysql> SELECT TO_BASE64('abc'), FROM_BASE64(TO_BASE64('abc'));
    -> 'JWJj', 'abc'
```


Different base-64 encoding schemes exist. These are the encoding and decoding rules used by T0_BASE64( ) and FROM_BASE64 ( ):
- The encoding for alphabet value 62 is ' + '.
- The encoding for alphabet value 63 is '/'.
- Encoded output consists of groups of 4 printable characters. Each 3 bytes of the input data are encoded using 4 characters. If the last group is incomplete, it is padded with ' $=$ ' characters to a length of 4 .
- A newline is added after each 76 characters of encoded output to divide long output into multiple lines.
- Decoding recognizes and ignores newline, carriage return, tab, and space.
```
- TRIM([{BOTH | LEADING | TRAILING} [remstr] FROM] str),TRIM([remstr FROM]
str)
```


Returns the string str with all remstr prefixes or suffixes removed. If none of the specifiers BOTH, LEADING, or TRAILING is given, BOTH is assumed. remstr is optional and, if not specified, spaces are removed.
```
mysql> SELECT TRIM(' bar ');
    -> 'bar'
mysql> SELECT TRIM(LEADING 'x' FROM 'xxxbarxxx');
    -> 'barxxx'
mysql> SELECT TRIM(BOTH 'x' FROM 'xxxbarxxx');
    -> 'bar'
mysql> SELECT TRIM(TRAILING 'xyz' FROM 'barxxyz');
    -> 'barx'
```


This function is multibyte safe. It returns NULL if any of its arguments are NULL.
- UCASE(str)

UCASE() is a synonym for UPPER( ).
UCASE() used within views is rewritten as UPPER().
- UNHEX(str)

For a string argument $s t r$, UNHEX(str) interprets each pair of characters in the argument as a hexadecimal number and converts it to the byte represented by the number. The return value is a binary string.
```
mysql> SELECT UNHEX('4D7953514C');
    -> 'MySQL'
mysql> SELECT X'4D7953514C';
    -> 'MySQL'
mysql> SELECT UNHEX(HEX('string'));
    -> 'string'
mysql> SELECT HEX(UNHEX('1267'));
    -> '1267'
```


The characters in the argument string must be legal hexadecimal digits: ' 0 ' .. ' 9 ', 'A ' .. ' F ' , ' a ' .. ' $f$ '. If the argument contains any nonhexadecimal digits, or is itself NULL, the result is NULL:
```
mysql> SELECT UNHEX('GG');
```

```
+--------------+
| UNHEX('GG') |
+--------------+
| NULL |
+-------------+
mysql> SELECT UNHEX(NULL);
+--------------+
| UNHEX(NULL) |
+--------------+
| NULL |
+--------------+
```


A NULL result can also occur if the argument to UNHEX( ) is a BINARY column, because values are padded with $0 \times 00$ bytes when stored but those bytes are not stripped on retrieval. For example, ${ }^{\prime} 41^{\prime}$ is stored into a CHAR(3) column as '41 ' and retrieved as '41' (with the trailing pad space stripped), so UNHEX( ) for the column value returns $\mathrm{X}^{\prime} 41^{\prime}$. By contrast, '41' is stored into a BINARY (3) column as ' $41 \backslash 0$ ' and retrieved as ' $41 \backslash 0$ ' (with the trailing pad 0x00 byte not stripped). ' \0' is not a legal hexadecimal digit, so UNHEX( ) for the column value returns NULL.

For a numeric argument $N$, the inverse of $\operatorname{HEX}(N)$ is not performed by UNHEX( ). Use $\operatorname{CONV}(\operatorname{HEX}(N), 16,10)$ instead. See the description of HEX().

If UNHEX( ) is invoked from within the mysql client, binary strings display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql — The MySQL Command-Line Client".
- UPPER(str)

Returns the string str with all characters changed to uppercase according to the current character set mapping, or NULL if str is NULL. The default character set is utf 8 mb 4 .
```
mysql> SELECT UPPER('Hej');
    -> 'HEJ'
```


See the description of LOWER( ) for information that also applies to UPPER( ). This included information about how to perform lettercase conversion of binary strings (BINARY, VARBINARY, BLOB) for which these functions are ineffective, and information about case folding for Unicode character sets.

This function is multibyte safe.
UCASE() used within views is rewritten as UPPER().
- WEIGHT_STRING(str [AS \{CHAR|BINARY\}(N)] [flags])

This function returns the weight string for the input string. The return value is a binary string that represents the comparison and sorting value of the string, or NULL if the argument is NULL. It has these properties:
- If WEIGHT_STRING(str1) = WEIGHT_STRING(str2), then str1 = str2(str1 and str2 are considered equal)
- If WEIGHT_STRING(str1) < WEIGHT_STRING(str2), then str1 < str2 (str1 sorts before str2)

WEIGHT_STRING( ) is a debugging function intended for internal use. Its behavior can change without notice between MySQL versions. It can be used for testing and debugging of collations,
especially if you are adding a new collation. See Section 12.14, "Adding a Collation to a Character Set".

This list briefly summarizes the arguments. More details are given in the discussion following the list.
- str: The input string expression.
- AS clause: Optional; cast the input string to a given type and length.
- flags: Optional; unused.

The input string, $s t r$, is a string expression. If the input is a nonbinary (character) string such as a CHAR, VARCHAR, or TEXT value, the return value contains the collation weights for the string. If the input is a binary (byte) string such as a BINARY, VARBINARY, or BLOB value, the return value is the same as the input (the weight for each byte in a binary string is the byte value). If the input is NULL, WEIGHT_STRING( ) returns NULL.

\section*{Examples:}
```
mysql> SET @s = _utf8mb4 'AB' COLLATE utf8mb4_0900_ai_ci;
mysql> SELECT @s, HEX(@s), HEX(WEIGHT_STRING(@s));
+------+----------+------------------------+
| @s | HEX(@s) | HEX(WEIGHT_STRING(@s)) |
+------+----------+------------------------+
| AB | 4142 | 1C471C60 |
+------+----------+-----------------------+
```

```
mysql> SET @s = _utf8mb4 'ab' COLLATE utf8mb4_0900_ai_ci;
mysql> SELECT @s, HEX(@s), HEX(WEIGHT_STRING(@s));
+------+----------+-------------------------+
| @s | HEX(@s) | HEX(WEIGHT_STRING(@s)) |
+------+----------+------------------------+
| ab | 6162 | 1C471C60 |
+------+----------+-----------------------+
```

```
mysql> SET @s = CAST('AB' AS BINARY);
mysql> SELECT @s, HEX(@s), HEX(WEIGHT_STRING(@s));
+------+----------+-------------------------+
| @s | HEX(@s) | HEX(WEIGHT_STRING(@s)) |
+------+----------+------------------------+
|AB | 4142 | 4142 |
+------+----------+-----------------------+
```

```
mysql> SET @s = CAST('ab' AS BINARY);
mysql> SELECT @s, HEX(@s), HEX(WEIGHT_STRING(@s));
+------+----------+-------------------------+
| @s | HEX(@s) | HEX(WEIGHT_STRING(@s)) |
+------+----------+------------------------+
| ab | 6162 | 6162 |
+------+----------+-----------------------+
```


The preceding examples use HEX( ) to display the WEIGHT_STRING( ) result. Because the result is a binary value, HEX() can be especially useful when the result contains nonprinting values, to display it in printable form:
```
mysql> SET @s = CONVERT(X'C39F' USING utf8mb4) COLLATE utf8mb4_czech_ci;
mysql> SELECT HEX(WEIGHT_STRING(@s));
+--------------------------+
| HEX(WEIGHT_STRING(@s)) |
+-------------------------+
| 0FEA0FEA
```

+------------------------+
For non-NULL return values, the data type of the value is VARBINARY if its length is within the maximum length for VARBINARY, otherwise the data type is BLOB.

The AS clause may be given to cast the input string to a nonbinary or binary string and to force it to a given length:
- AS $\operatorname{CHAR}(N)$ casts the string to a nonbinary string and pads it on the right with spaces to a length of $N$ characters. $N$ must be at least 1 . If $N$ is less than the length of the input string, the string is truncated to $N$ characters. No warning occurs for truncation.
- AS $\operatorname{BINARY}(N)$ is similar but casts the string to a binary string, $N$ is measured in bytes (not characters), and padding uses 0x00 bytes (not spaces).
```
mysql> SET NAMES 'latin1';
mysql> SELECT HEX(WEIGHT_STRING('ab' AS CHAR(4)));
+----------------------------------------+
| HEX(WEIGHT_STRING('ab' AS CHAR(4))) |
+---------------------------------------+
| 41422020
+--------------------------------------+
mysql> SET NAMES 'utf8mb4';
mysql> SELECT HEX(WEIGHT_STRING('ab' AS CHAR(4)));
+----------------------------------------+
| HEX(WEIGHT_STRING('ab' AS CHAR(4))) |
+---------------------------------------+
| 1C471C60 |
+--------------------------------------+
mysql> SELECT HEX(WEIGHT_STRING('ab' AS BINARY(4)));
+-----------------------------------------+
| HEX(WEIGHT_STRING('ab' AS BINARY(4))) |
+----------------------------------------+
| 61620000 |
+----------------------------------------+
```


The flags clause currently is unused.
If WEIGHT_STRING( ) is invoked from within the mysql client, binary strings display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".

\subsection*{14.8.1 String Comparison Functions and Operators}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.13 String Comparison Functions and Operators}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline LIKE & Simple pattern matching \\
\hline NOT LIKE & Negation of simple pattern matching \\
\hline STRCMP( ) & Compare two strings \\
\hline
\end{tabular}
\end{table}

If a string function is given a binary string as an argument, the resulting string is also a binary string. A number converted to a string is treated as a binary string. This affects only comparisons.

Normally, if any expression in a string comparison is case-sensitive, the comparison is performed in case-sensitive fashion.

If a string function is invoked from within the mysql client, binary strings display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".
- expr LIKE pat [ESCAPE 'escape_char']

Pattern matching using an SQL pattern. Returns 1 (TRUE) or 0 (FALSE). If either expr or pat is NULL, the result is NULL.

The pattern need not be a literal string. For example, it can be specified as a string expression or table column. In the latter case, the column must be defined as one of the MySQL string types (see Section 13.3, "String Data Types").

Per the SQL standard, LIKE performs matching on a per-character basis, thus it can produce results different from the = comparison operator:
```
mysql> SELECT 'ä' LIKE 'ae' COLLATE latin1_german2_ci;
+-------------------------------------------+
| 'ä' LIKE 'ae' COLLATE latin1_german2_ci |
+-------------------------------------------
| 0 |
+-----------------------------------------+
mysql> SELECT 'ä' = 'ae' COLLATE latin1_german2_ci;
+----------------------------------------+
| 'ä' = 'ae' COLLATE latin1_german2_ci |
+---------------------------------------+
| 1 |
+----------------------------------------+
```


In particular, trailing spaces are always significant. This differs from comparisons performed with the = operator, for which the significance of trailing spaces in nonbinary strings (CHAR, VARCHAR, and TEXT values) depends on the pad attribute of the collation used for the comparison. For more information, see Trailing Space Handling in Comparisons.

With LIKE you can use the following two wildcard characters in the pattern:
- $\%$ matches any number of characters, even zero characters.
- _ matches exactly one character.
```
mysql> SELECT 'David!' LIKE 'David_';
    -> 1
mysql> SELECT 'David!' LIKE '%D%v%';
    -> 1
```


To test for literal instances of a wildcard character, precede it by the escape character. If you do not specify the ESCAPE character, \} \text { is assumed, unless the NO_BACKSLASH_ESCAPES SQL mode is } enabled. In that case, no escape character is used.
- $\backslash \%$ matches one $\%$ character.
- \_ matches one _ character.
```
mysql> SELECT 'David!' LIKE 'David\_';
    -> 0
mysql> SELECT 'David_' LIKE 'David\_';
    -> 1
```


To specify a different escape character, use the ESCAPE clause:
```
mysql> SELECT 'David_' LIKE 'David|_' ESCAPE '|';
```

```
-> 1
```


The escape sequence should be one character long to specify the escape character, or empty to specify that no escape character is used. The expression must evaluate as a constant at execution time. If the NO_BACKSLASH_ESCAPES SQL mode is enabled, the sequence cannot be empty.

The following statements illustrate that string comparisons are not case-sensitive unless one of the operands is case-sensitive (uses a case-sensitive collation or is a binary string):
```
mysql> SELECT 'abc' LIKE 'ABC';
    -> 1
mysql> SELECT 'abc' LIKE _utf8mb4 'ABC' COLLATE utf8mb4_0900_as_cs;
    -> 0
mysql> SELECT 'abc' LIKE _utf8mb4 'ABC' COLLATE utf8mb4_bin;
    -> 0
mysql> SELECT 'abc' LIKE BINARY 'ABC';
    -> 0
```


As an extension to standard SQL, MySQL permits LIKE on numeric expressions.
```
mysql> SELECT 10 LIKE '1%';
    -> 1
```


MySQL attempts in such cases to perform implicit conversion of the expression to a string. See Section 14.3, "Type Conversion in Expression Evaluation".

\section*{Note}

MySQL uses C escape syntax in strings (for example, \n to represent the newline character). If you want a LIKE string to contain a literal \\, you must double it. (Unless the NO_BACKSLASH_ESCAPES SQL mode is enabled, in which case no escape character is used.) For example, to search for \n, specify it as $\backslash \backslash n$. To search for $\backslash$, specify it as $\backslash \backslash \backslash \backslash$; this is because the backslashes are stripped once by the parser and again when the pattern match is made, leaving a single backslash to be matched against.

Exception: At the end of the pattern string, backslash can be specified as \\. At the end of the string, backslash stands for itself because there is nothing following to escape. Suppose that a table contains the following values:
```
mysql> SELECT filename FROM t1;
+---------------+
| filename |
+---------------+
| C:
| C:\
| C:\Programs
| C:\Programs\
+---------------+
```


To test for values that end with backslash, you can match the values using either of the following patterns:
```
mysql> SELECT filename, filename LIKE '%\\' FROM t1;
+---------------+---------------------+
| filename | filename LIKE '%\\' |
+---------------+---------------------+
| C: | 0 |
| C:\ | 1 |
| C:\Programs | 0 |
| C:\Programs\ | 1 |
+---------------+---------------------+
mysql> SELECT filename, filename LIKE '%\\\\' FROM t1;
+---------------+-----------------------+
| filename | filename LIKE '%\\\\' |
```

```
+---------------+------------------------+
| C:
| C:\
1
| C:\Programs\ | 1 |
+---------------+-----------------------+
```

- expr NOT LIKE pat [ESCAPE 'escape_char']

This is the same as NOT (expr LIKE pat [ESCAPE 'escape_char']).

\section*{Note}

Aggregate queries involving NOT LIKE comparisons with columns containing NULL may yield unexpected results. For example, consider the following table and data:
```
CREATE TABLE foo (bar VARCHAR(10));
INSERT INTO foo VALUES (NULL), (NULL);
```


The query SELECT COUNT(*) FROM foo WHERE bar LIKE '\%baz\%'; returns 0. You might assume that SELECT COUNT(*) FROM foo WHERE bar NOT LIKE '\%baz\%'; would return 2. However, this is not the case: The second query returns 0 . This is because NULL NOT LIKE expr always returns NULL, regardless of the value of expr. The same is true for aggregate queries involving NULL and comparisons using NOT RLIKE or NOT REGEXP. In such cases, you must test explicitly for NOT NULL using OR (and not AND), as shown here:

SELECT COUNT(*) FROM foo WHERE bar NOT LIKE '\%baz\%' OR bar IS NULL;
- STRCMP(expr1,expr2)

STRCMP( ) returns 0 if the strings are the same, -1 if the first argument is smaller than the second according to the current sort order, and NULL if either argument is NULL. It returns 1 otherwise.
```
mysql> SELECT STRCMP('text', 'text2');
    -> -1
mysql> SELECT STRCMP('text2', 'text');
    -> 1
mysql> SELECT STRCMP('text', 'text');
    -> 0
```


STRCMP() performs the comparison using the collation of the arguments.
```
mysql> SET @s1 = _utf8mb4 'x' COLLATE utf8mb4_0900_ai_ci;
mysql> SET @s2 = _utf8mb4 'X' COLLATE utf8mb4_0900_ai_ci;
mysql> SET @s3 = _utf8mb4 'x' COLLATE utf8mb4_0900_as_cs;
mysql> SET @s4 = _utf8mb4 'X' COLLATE utf8mb4_0900_as_cs;
mysql> SELECT STRCMP(@s1, @s2), STRCMP(@s3, @s4);
+-------------------+------------------+
| STRCMP(@s1, @s2) | STRCMP(@s3, @s4) |
+-------------------+------------------+
| 0 | -1 |
+-------------------+------------------+
```


If the collations are incompatible, one of the arguments must be converted to be compatible with the other. See Section 12.8.4, "Collation Coercibility in Expressions".
```
mysql> SET @s1 = _utf8mb4 'x' COLLATE utf8mb4_0900_ai_ci;
mysql> SET @s2 = _utf8mb4 'X' COLLATE utf8mb4_0900_ai_ci;
mysql> SET @s3 = _utf8mb4 'x' COLLATE utf8mb4_0900_as_cs;
mysql> SET @s4 = _utf8mb4 'X' COLLATE utf8mb4_0900_as_cs;
-->
mysql> SELECT STRCMP(@s1, @s3);
ERROR 1267 (HY000): Illegal mix of collations (utf8mb4_0900_ai_ci,IMPLICIT)
```

```
and (utf8mb4_0900_as_cs,IMPLICIT) for operation 'strcmp'
mysql> SELECT STRCMP(@s1, @s3 COLLATE utf8mb4_0900_ai_ci);
+----------------------------------------------+
| STRCMP(@s1, @s3 COLLATE utf8mb4_0900_ai_ci) |
+-----------------------------------------------+
| 0 |
+----------------------------------------------
```


\subsection*{14.8.2 Regular Expressions}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.14 Regular Expression Functions and Operators}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline NOT REGEXP & Negation of REGEXP \\
\hline REGEXP & Whether string matches regular expression \\
\hline REGEXP_INSTR( ) & Starting index of substring matching regular expression \\
\hline REGEXP_LIKE() & Whether string matches regular expression \\
\hline REGEXP_REPLACE() & Replace substrings matching regular expression \\
\hline REGEXP_SUBSTR( ) & Return substring matching regular expression \\
\hline RLIKE & Whether string matches regular expression \\
\hline
\end{tabular}
\end{table}

A regular expression is a powerful way of specifying a pattern for a complex search. This section discusses the functions and operators available for regular expression matching and illustrates, with examples, some of the special characters and constructs that can be used for regular expression operations. See also Section 5.3.4.7, "Pattern Matching".

MySQL implements regular expression support using International Components for Unicode (ICU), which provides full Unicode support and is multibyte safe.

Use of a binary string with any of the MySQL regular expression functions is rejected with ER_CHARACTER_SET_MISMATCH.
- Regular Expression Function and Operator Descriptions
- Regular Expression Syntax
- Regular Expression Resource Control

