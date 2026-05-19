\section*{Chapter 11 Language Structure}

\section*{Table of Contents}
11.1 Literal Values ..... 1859
11.1.1 String Literals ..... 1859
11.1.2 Numeric Literals ..... 1862
11.1.3 Date and Time Literals ..... 1862
11.1.4 Hexadecimal Literals ..... 1867
11.1.5 Bit-Value Literals ..... 1869
11.1.6 Boolean Literals ..... 1871
11.1.7 NULL Values ..... 1871
11.2 Schema Object Names ..... 1871
11.2.1 Identifier Length Limits ..... 1873
11.2.2 Identifier Qualifiers ..... 1874
11.2.3 Identifier Case Sensitivity ..... 1875
11.2.4 Mapping of Identifiers to File Names ..... 1877
11.2.5 Function Name Parsing and Resolution ..... 1879
11.3 Keywords and Reserved Words ..... 1882
11.4 User-Defined Variables ..... 1910
11.5 Expressions ..... 1913
11.6 Query Attributes ..... 1917
11.7 Comments ..... 1920

This chapter discusses the rules for writing the following elements of SQL statements when using MySQL:
- Literal values such as strings and numbers
- Identifiers such as database, table, and column names
- Keywords and reserved words
- User-defined and system variables
- Expressions
- Query attributes
- Comments

\subsection*{11.1 Literal Values}

This section describes how to write literal values in MySQL. These include strings, numbers, hexadecimal and bit values, boolean values, and NULL. The section also covers various nuances that you may encounter when dealing with these basic types in MySQL.

\subsection*{11.1.1 String Literals}

A string is a sequence of bytes or characters, enclosed within either single quote ( ' ) or double quote (") characters. Examples:
```
'a string'
"another string"
```


Quoted strings placed next to each other are concatenated to a single string. The following lines are equivalent:
```
'a string'
'a' ' ' 'string'
```


If the ANSI_QUOTES SQL mode is enabled, string literals can be quoted only within single quotation marks because a string quoted within double quotation marks is interpreted as an identifier.

A binary string is a string of bytes. Every binary string has a character set and collation named binary. A nonbinary string is a string of characters. It has a character set other than binary and a collation that is compatible with the character set.

For both types of strings, comparisons are based on the numeric values of the string unit. For binary strings, the unit is the byte; comparisons use numeric byte values. For nonbinary strings, the unit is the character and some character sets support multibyte characters; comparisons use numeric character code values. Character code ordering is a function of the string collation. (For more information, see Section 12.8.5, "The binary Collation Compared to _bin Collations".)

\section*{Note}

Within the mysql client, binary strings display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".

A character string literal may have an optional character set introducer and COLLATE clause, to designate it as a string that uses a particular character set and collation:
[_charset_name]'string' [COLLATE collation_name]
Examples:
```
SELECT _latin1'string';
SELECT _binary'string';
SELECT _utf8mb4'string' COLLATE utf8mb4_danish_ci;
```


You can use N'literal' (or n'literal') to create a string in the national character set. These statements are equivalent:

SELECT N'some text';
SELECT n'some text';
SELECT _utf8'some text';
For information about these forms of string syntax, see Section 12.3.7, "The National Character Set", and Section 12.3.8, "Character Set Introducers".

Within a string, certain sequences have special meaning unless the NO_BACKSLASH_ESCAPES SQL mode is enabled. Each of these sequences begins with a backslash ( \\), known as the escape character. MySQL recognizes the escape sequences shown in Table 11.1, "Special Character Escape Sequences". For all other escape sequences, backslash is ignored. That is, the escaped character is interpreted as if it was not escaped. For example, $\backslash \mathrm{x}$ is just x . These sequences are case-sensitive. For example, $\backslash \mathrm{b}$ is interpreted as a backspace, but $\backslash \mathrm{B}$ is interpreted as B . Escape processing is done according to the character set indicated by the character_set_connection system variable. This is true even for strings that are preceded by an introducer that indicates a different character set, as discussed in Section 12.3.6, "Character String Literal Character Set and Collation".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 11.1 Special Character Escape Sequences}
\begin{tabular}{|l|l|}
\hline Escape Sequence & Character Represented by Sequence \\
\hline \0 & An ASCII NUL ( X ' 00 ' ) character \\
\hline \' & A single quote ( ' ) character \\
\hline \" & A double quote (") character \\
\hline \b & A backspace character \\
\hline \n & A newline (linefeed) character \\
\hline \r & A carriage return character \\
\hline \t & A tab character \\
\hline \Z & ASCII 26 (Control+Z); see note following the table \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Escape Sequence & Character Represented by Sequence \\
\hline$\backslash \backslash$ & A backslash $(\backslash)$ character \\
\hline$\backslash \%$ & A \% character; see note following the table \\
\hline$\backslash \_$ & A_ character; see note following the table \\
\hline
\end{tabular}

The ASCII 26 character can be encoded as \Z to enable you to work around the problem that ASCII 26 stands for END-OF-FILE on Windows. ASCII 26 within a file causes problems if you try to use mysql db_name < file_name.

The \\% and \_ sequences are used to search for literal instances of \% and _ in pattern-matching contexts where they would otherwise be interpreted as wildcard characters. See the description of the LIKE operator in Section 14.8.1, "String Comparison Functions and Operators". If you use \\% or \_ outside of pattern-matching contexts, they evaluate to the strings $\backslash \%$ and $\backslash_{-}$, not to $\%$ and _.

There are several ways to include quote characters within a string:
- A ' inside a string quoted with ' may be written as ' '.
- A " inside a string quoted with " may be written as "".
- Precede the quote character by an escape character (\\).
- A ' inside a string quoted with " needs no special treatment and need not be doubled or escaped. In the same way, " inside a string quoted with ' needs no special treatment.

The following SELECT statements demonstrate how quoting and escaping work:
```
mysql> SELECT 'hello', '"hello"', '""hello""', 'hel''lo', '\'hello';
+-------+----------+-----------+--------+--------+
| hello | "hello" | ""hello"" | hel'lo | 'hello |
+--------+----------+-----------+--------+-------+
mysql> SELECT "hello", "'hello'", "''hello''", "hel""lo", "\"hello";
+-------+----------+------------+--------+--------+
| hello | 'hello' | ''hello'' | hel"lo | "hello |
+--------+----------+-----------+--------+-------+
mysql> SELECT 'This\nIs\nFour\nLines';
+---------------------+
| This
Is
Four
Lines |
+---------------------+
mysql> SELECT 'disappearing\ backslash';
+--------------------------+
| disappearing backslash |
+-------------------------+
```


To insert binary data into a string column (such as a BLOB column), you should represent certain characters by escape sequences. Backslash ( \\) and the quote character used to quote the string must be escaped. In certain client environments, it may also be necessary to escape NUL or Control $+Z$. The mysql client truncates quoted strings containing NUL characters if they are not escaped, and Control+Z may be taken for END-OF-FILE on Windows if not escaped. For the escape sequences that represent each of these characters, see Table 11.1, "Special Character Escape Sequences".

When writing application programs, any string that might contain any of these special characters must be properly escaped before the string is used as a data value in an SQL statement that is sent to the MySQL server. You can do this in two ways:
- Process the string with a function that escapes the special characters. In a C program, you can use the mysql_real_escape_string_quote( ) C API function to escape characters. See mysql_real_escape_string_quote(). Within SQL statements that construct other SQL statements, you
can use the QUOTE( ) function. The Perl DBI interface provides a quote method to convert special characters to the proper escape sequences. See Section 31.9, "MySQL Perl API". Other language interfaces may provide a similar capability.
- As an alternative to explicitly escaping special characters, many MySQL APIs provide a placeholder capability that enables you to insert special markers into a statement string, and then bind data values to them when you issue the statement. In this case, the API takes care of escaping special characters in the values for you.

\subsection*{11.1.2 Numeric Literals}

Number literals include exact-value (integer and DECIMAL) literals and approximate-value (floatingpoint) literals.

Integers are represented as a sequence of digits. Numbers may include . as a decimal separator. Numbers may be preceded by - or + to indicate a negative or positive value, respectively. Numbers represented in scientific notation with a mantissa and exponent are approximate-value numbers.

Exact-value numeric literals have an integer part or fractional part, or both. They may be signed.
Examples: $1, .2,3.4,-5,-6.78,+9.10$.
Approximate-value numeric literals are represented in scientific notation with a mantissa and exponent. Either or both parts may be signed. Examples: 1.2E3, 1.2E-3, -1.2E3, -1.2E-3.

Two numbers that look similar may be treated differently. For example, 2.34 is an exact-value (fixedpoint) number, whereas 2.34 E 0 is an approximate-value (floating-point) number.

The DECIMAL data type is a fixed-point type and calculations are exact. In MySQL, the DECIMAL type has several synonyms: NUMERIC, DEC, FIXED. The integer types also are exact-value types. For more information about exact-value calculations, see Section 14.24, "Precision Math".

The FLOAT and DOUBLE data types are floating-point types and calculations are approximate. In MySQL, types that are synonymous with FLOAT or DOUBLE are DOUBLE PRECISION and REAL.

An integer may be used in floating-point context; it is interpreted as the equivalent floating-point number.

\subsection*{11.1.3 Date and Time Literals}
- Standard SQL and ODBC Date and Time Literals
- String and Numeric Literals in Date and Time Context

Date and time values can be represented in several formats, such as quoted strings or as numbers, depending on the exact type of the value and other factors. For example, in contexts where MySQL expects a date, it interprets any of '2015-07 - 21 ', ' 20150721 ', and 20150721 as a date.

This section describes the acceptable formats for date and time literals. For more information about the temporal data types, such as the range of permitted values, see Section 13.2, "Date and Time Data Types".

\section*{Standard SQL and ODBC Date and Time Literals}

Standard SQL requires temporal literals to be specified using a type keyword and a string. The space between the keyword and string is optional.
```
DATE 'str'
TIME 'str'
TIMESTAMP 'str'
```


MySQL recognizes but, unlike standard SQL, does not require the type keyword. Applications that are to be standard-compliant should include the type keyword for temporal literals.

MySQL also recognizes the ODBC syntax corresponding to the standard SQL syntax:
```
{ d 'str' }
{ t 'str' }
{ ts 'str' }
```


MySQL uses the type keywords and the ODBC constructions to produce DATE, TIME, and DATETIME values, respectively, including a trailing fractional seconds part if specified. The TIMESTAMP syntax produces a DATETIME value in MySQL because DATETIME has a range that more closely corresponds to the standard SQL TIMESTAMP type, which has a year range from 0001 to 9999. (The MySQL TIMESTAMP year range is 1970 to 2038 .)

\section*{String and Numeric Literals in Date and Time Context}

MySQL recognizes DATE values in these formats:
- As a string in either ' $Y Y Y Y-M M-D D$ ' or ' $Y Y-M M-D D$ ' format. A "relaxed" syntax is permitted, but is deprecated: Any punctuation character may be used as the delimiter between date parts. For example, '2012-12-31', '2012/12/31', '2012^12^31', and '2012@12@31' are equivalent. Using any character other than the dash (-) as the delimiter raises a warning, as shown here:
```
mysql> SELECT DATE'2012@12@31';
+-------------------+
| DATE'2012@12@31' | 
+-------------------+
| 2012-12-31 |
+-------------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
************************** 1. row ****************************************
    Level: Warning
        Code: 4095
Message: Delimiter '@' in position 4 in datetime value '2012@12@31' at row 1 is
deprecated. Prefer the standard '-'.
1 row in set (0.00 sec)
```

- As a string with no delimiters in either ' YYYYMMDD' or ' YYMMDD' format, provided that the string makes sense as a date. For example, '20070523' and '070523' are interpreted as ${ }^{\prime} 2007-05-23$ ', but '071332' is illegal (it has nonsensical month and day parts) and becomes '0000-00-00'.
- As a number in either $Y Y Y Y M M D D$ or $Y Y M M D D$ format, provided that the number makes sense as a date. For example, 19830905 and 830905 are interpreted as '1983-09-05' .

MySQL recognizes DATETIME and TIMESTAMP values in these formats:
- As a string in either ' $Y Y Y Y-M M-D D$ hh:mm:ss' or ' $Y Y-M M-D D$ hh:mm:ss' format. MySQL also permits a "relaxed" syntax here, although this is deprecated: Any punctuation character may be used as the delimiter between date parts or time parts. For example, '2012-12-31 11:30:45', ${ }^{\prime} 2012 \wedge 12^{\wedge} 31$ 11+30+45','2012/12/31 11*30*45', and '2012@12@31 11^30^45' are equivalent. Use of any characters as delimiters in such values, other than the dash (-) for the date part and the colon (:) for the time part, raises a warning, as shown here:
```
mysql> SELECT TIMESTAMP'2012^12^31 11*30*45';
+---------------------------------+
| TIMESTAMP'2012^12^31 11*30*45' |
+----------------------------------+
| 2012-12-31 11:30:45 |
+----------------------------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
************************** 1. row *****************************************
    Level: Warning
        Code: 4095
Message: Delimiter '^' in position 4 in datetime value '2012^12^31 11*30*45' at
```

```
row 1 is deprecated. Prefer the standard '-'.
1 row in set (0.00 sec)
```


The only delimiter recognized between a date and time part and a fractional seconds part is the decimal point.

The date and time parts can be separated by T rather than a space. For example, ' 2012-12-31 11:30:45' '2012-12-31T11:30:45' are equivalent.

Previously, MySQL supported arbitrary numbers of leading and trailing whitespace characters in date and time values, as well as between the date and time parts of DATETIME and TIMESTAMP values. In MySQL 8.4, this behavior is deprecated, and the presence of excess whitespace characters triggers a warning, as shown here:
```
mysql> SELECT TIMESTAMP'2012-12-31 11-30-45';
+-----------------------------------+
| TIMESTAMP'2012-12-31 11-30-45' |
+------------------------------------+
| 2012-12-31 11:30:45 |
+------------------------------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
*************************** 1. row ****************************************
    Level: Warning
        Code: 4096
Message: Delimiter ' ' in position 11 in datetime value '2012-12-31 11-30-45'
at row 1 is superfluous and is deprecated. Please remove.
1 row in set (0.00 sec)
```


A warning is also raised when whitespace characters other than the space character is used, like this:
```
mysql> SELECT TIMESTAMP'2021-06-06
        '> 11:15:25';
+---------------------------------+
| TIMESTAMP'2021-06-06
11:15:25' |
+---------------------------------+
| 2021-06-06 11:15:25 |
+----------------------------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
************************** 1. row *****************************************
    Level: Warning
        Code: 4095
Message: Delimiter '\n' in position 10 in datetime value '2021-06-06
11:15:25' at row 1 is deprecated. Prefer the standard ' '.
1 row in set (0.00 sec)
```


Only one such warning is raised per temporal value, even though multiple issues may exist with delimiters, whitespace, or both, as shown in the following series of statements:
```
mysql> SELECT TIMESTAMP'2012!-12-31 11:30:45';
+------------------------------------+
| TIMESTAMP'2012!-12-31 11:30:45' |
+------------------------------------+
| 2012-12-31 11:30:45 |
+-----------------------------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
*************************** 1. row ****************************************
    Level: Warning
        Code: 4095
Message: Delimiter '!' in position 4 in datetime value '2012!-12-31 11:30:45'
at row 1 is deprecated. Prefer the standard '-'.
1 row in set (0.00 sec)
```

```
mysql> SELECT TIMESTAMP'2012-12-31 11:30:45';
+-----------------------------------+
| TIMESTAMP'2012-12-31 11:30:45' |
+-----------------------------------+
| 2012-12-31 11:30:45
+---------------------------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
************************** 1. row *****************************************
    Level: Warning
    Code: 4096
Message: Delimiter ' ' in position 11 in datetime value '2012-12-31 11:30:45'
at row 1 is superfluous and is deprecated. Please remove.
1 row in set (0.00 sec)
mysql> SELECT TIMESTAMP'2012-12-31 11:30:45';
+---------------------------------+
| TIMESTAMP'2012-12-31 11:30:45' |
+----------------------------------+
| 2012-12-31 11:30:45 |
+----------------------------------+
1 row in set (0.00 sec)
```

- As a string with no delimiters in either 'YYYYMMDDhhmmss' or 'YYMMDDhhmmss' format, provided that the string makes sense as a date. For example, '20070523091528' and '070523091528' are interpreted as '2007-05-23 09:15:28', but '071122129015' is illegal (it has a nonsensical minute part) and becomes '0000-00-00 00:00:00'.
- As a number in either YYYYMMDDhhmmss or YYMMDDhhmmss format, provided that the number makes sense as a date. For example, 19830905132800 and 830905132800 are interpreted as ${ }^{\prime} 1983-09-05$ 13:28:00'.

A DATETIME or TIMESTAMP value can include a trailing fractional seconds part in up to microseconds (6 digits) precision. The fractional part should always be separated from the rest of the time by a decimal point; no other fractional seconds delimiter is recognized. For information about fractional seconds support in MySQL, see Section 13.2.6, "Fractional Seconds in Time Values".

Dates containing two-digit year values are ambiguous because the century is unknown. MySQL interprets two-digit year values using these rules:
- Year values in the range 70-99 become 1970-1999.
- Year values in the range 00-69 become 2000-2069.

See also Section 13.2.9, "2-Digit Years in Dates".
For values specified as strings that include date part delimiters, it is unnecessary to specify two digits for month or day values that are less than 10. '2015-6 - 9' is the same as '2015-06-09 ' . Similarly, for values specified as strings that include time part delimiters, it is unnecessary to specify two digits for hour, minute, or second values that are less than 10. '2015-10 - $301: 2: 3$ ' is the same as ${ }^{\prime} 2015-10-30$ 01:02:03'.

Values specified as numbers should be $6,8,12$, or 14 digits long. If a number is 8 or 14 digits long, it is assumed to be in $Y Y Y Y M M D D$ or $Y Y Y Y M M D D h h m m s s$ format and that the year is given by the first 4 digits. If the number is 6 or 12 digits long, it is assumed to be in $Y Y M M D D$ or $Y Y M M D D h T m m s s$ format and that the year is given by the first 2 digits. Numbers that are not one of these lengths are interpreted as though padded with leading zeros to the closest length.

Values specified as nondelimited strings are interpreted according their length. For a string 8 or 14 characters long, the year is assumed to be given by the first 4 characters. Otherwise, the year is assumed to be given by the first 2 characters. The string is interpreted from left to right to find year, month, day, hour, minute, and second values, for as many parts as are present in the string. This means you should not use strings that have fewer than 6 characters. For example, if you specify
${ }^{\prime} 9903$ ', thinking that represents March, 1999, MySQL converts it to the "zero" date value. This occurs because the year and month values are 99 and 03 , but the day part is completely missing. However, you can explicitly specify a value of zero to represent missing month or day parts. For example, to insert the value '1999-03-00', use '990300'.

MySQL recognizes TIME values in these formats:
- As a string in ' $D h h$ : $m m$ : $s s$ ' format. You can also use one of the following "relaxed" syntaxes: ' $h h: m m: s s^{\prime}, ' h h: m m^{\prime}, ' D ~ h h: m m^{\prime}, ' D ~ h h^{\prime}$, or 'ss'. Here $D$ represents days and can have a value from 0 to 34.
- As a string with no delimiters in ' $h h m m s s$ ' format, provided that it makes sense as a time. For example, '101112' is understood as '10:11:12', but '109712' is illegal (it has a nonsensical minute part) and becomes '00:00:00'.
- As a number in hhmmss format, provided that it makes sense as a time. For example, 101112 is understood as '10:11:12'. The following alternative formats are also understood: $s s, m m s s$, or hhmmss.

A trailing fractional seconds part is recognized in the 'D hh:mm:ss.fraction', 'hh:mm:ss.fraction','hhmmss.fraction', and hhmmss.fraction time formats, where fraction is the fractional part in up to microseconds (6 digits) precision. The fractional part should always be separated from the rest of the time by a decimal point; no other fractional seconds delimiter is recognized. For information about fractional seconds support in MySQL, see Section 13.2.6, "Fractional Seconds in Time Values".

For TIME values specified as strings that include a time part delimiter, it is unnecessary to specify two digits for hours, minutes, or seconds values that are less than 10 . $8: 3: 2^{\prime}$ is the same as '08:03:02'.

You can specify a time zone offset when inserting TIMESTAMP and DATETIME values into a table. The offset is appended to the time part of a datetime literal, with no intravening spaces, and uses the same format used for setting the time_zone system variable, with the following exceptions:
- For hour values less than 10 , a leading zero is required.
- The value ${ }^{\prime}-00: 00^{\prime}$ is rejected.
- Time zone names such as 'EET' and 'Asia/Shanghai' cannot be used; 'SYSTEM' also cannot be used in this context.

The value inserted must not have a zero for the month part, the day part, or both parts. This is enforced regardless of the server SQL mode setting.

This example illustrates inserting datetime values with time zone offsets into TIMESTAMP and DATETIME columns using different time_zone settings, and then retrieving them:
```
mysql> CREATE TABLE ts (
    -> id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    -> col TIMESTAMP NOT NULL
    -> ) AUTO_INCREMENT = 1;
mysql> CREATE TABLE dt (
    -> id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    -> col DATETIME NOT NULL
    -> ) AUTO_INCREMENT = 1;
mysql> SET @@time_zone = 'SYSTEM';
mysql> INSERT INTO ts (col) VALUES ('2020-01-01 10:10:10'),
    -> ('2020-01-01 10:10:10+05:30'), ('2020-01-01 10:10:10-08:00');
mysql> SET @@time_zone = '+00:00';
mysql> INSERT INTO ts (col) VALUES ('2020-01-01 10:10:10'),
```

```
    -> ('2020-01-01 10:10:10+05:30'), ('2020-01-01 10:10:10-08:00');
mysql> SET @@time_zone = 'SYSTEM';
mysql> INSERT INTO dt (col) VALUES ('2020-01-01 10:10:10'),
    -> ('2020-01-01 10:10:10+05:30'), ('2020-01-01 10:10:10-08:00');
mysql> SET @@time_zone = '+00:00';
mysql> INSERT INTO dt (col) VALUES ('2020-01-01 10:10:10'),
    -> ('2020-01-01 10:10:10+05:30'), ('2020-01-01 10:10:10-08:00');
mysql> SET @@time_zone = 'SYSTEM';
mysql> SELECT @@system_time_zone;
+---------------------+
| @@system_time_zone |
+---------------------+
| EST |
+---------------------+
mysql> SELECT col, UNIX_TIMESTAMP(col) FROM dt ORDER BY id;
+----------------------+---------------------+
| col | UNIX_TIMESTAMP(col) |
+----------------------+---------------------
| 2020-01-01 10:10:10 | 1577891410 |
| 2019-12-31 23:40:10 | 1577853610 |
| 2020-01-01 13:10:10 | 1577902210 |
| 2020-01-01 10:10:10 | 1577891410 |
| 2020-01-01 04:40:10 | 15:10:10 | 1577920210 |
+----------------------+---------------------+
mysql> SELECT col, UNIX_TIMESTAMP(col) FROM ts ORDER BY id;
+----------------------+---------------------+
| col | UNIX_TIMESTAMP(col) |
+----------------------+--------------------+
| 2020-01-01 10:10:10 | 1577891410 |
| 2019-12-31 23:40:10 | 1577853610 |
| 2020-01-01 13:10:10 | 1577902210 |
| 2020-01-01 05:10:10 | 1577873410 |
| 2019-12-31 23:40:10 | 1577853610 |
+----------------------+---------------------+
```


The offset is not displayed when selecting a datetime value, even if one was used when inserting it.
The range of supported offset values is $-13: 59$ to $+14: 00$, inclusive.
Datetime literals that include time zone offsets are accepted as parameter values by prepared statements.

\subsection*{11.1.4 Hexadecimal Literals}

Hexadecimal literal values are written using $\mathrm{X}^{\prime}$ val ' or 0 x val notation, where val contains hexadecimal digits ( $0 . .9$, A . F). Lettercase of the digits and of any leading $X$ does not matter. A leading 0x is case-sensitive and cannot be written as 0X.

Legal hexadecimal literals:
```
X'01AF'
X'01af'
x'01AF'
x'01af'
0x01AF
0x01af
```


Illegal hexadecimal literals:
```
X'0G' (G is not a hexadecimal digit)
```

```
0X01AF (0X must be written as 0x)
```


Values written using $X^{\prime}$ val ' notation must contain an even number of digits or a syntax error occurs. To correct the problem, pad the value with a leading zero:
```
mysql> SET @s = X'FFF';
ERROR 1064 (42000): You have an error in your SQL syntax;
check the manual that corresponds to your MySQL server
version for the right syntax to use near 'X'FFF''
mysql> SET @s = X'0FFF';
Query OK, 0 rows affected (0.00 sec)
```


Values written using 0xval notation that contain an odd number of digits are treated as having an extra leading 0. For example, 0xaaa is interpreted as 0x0aaa.

By default, a hexadecimal literal is a binary string, where each pair of hexadecimal digits represents a character:
```
mysql> SELECT X'4D7953514C', CHARSET(X'4D7953514C');
+----------------+------------------------+
| X'4D7953514C' | CHARSET(X'4D7953514C') |
+----------------+------------------------+
| MySQL | binary |
+----------------+------------------------+
mysql> SELECT 0x5461626c65, CHARSET(0x5461626c65);
+---------------+-----------------------+
| 0x5461626c65 | CHARSET(0x5461626c65) |
+---------------+-----------------------+
| Table | binary |
+---------------+----------------------+
```


A hexadecimal literal may have an optional character set introducer and COLLATE clause, to designate it as a string that uses a particular character set and collation:
```
[_charset_name] X'val' [COLLATE collation_name]
```


\section*{Examples:}
```
SELECT _latin1 X'4D7953514C';
SELECT _utf8mb4 0x4D7953514C COLLATE utf8mb4_danish_ci;
```


The examples use X'val' notation, but 0xval notation permits introducers as well. For information about introducers, see Section 12.3.8, "Character Set Introducers".

In numeric contexts, MySQL treats a hexadecimal literal like a BIGINT UNSIGNED (64-bit unsigned integer). To ensure numeric treatment of a hexadecimal literal, use it in numeric context. Ways to do this include adding 0 or using CAST( . . . AS UNSIGNED ). For example, a hexadecimal literal assigned to a user-defined variable is a binary string by default. To assign the value as a number, use it in numeric context:
```
mysql> SET @v1 = X'41';
mysql> SET @v2 = X'41'+0;
mysql> SET @v3 = CAST(X'41' AS UNSIGNED);
mysql> SELECT @v1, @v2, @v3;
+-------+------+------+
| @v1 | @v2 | @v3 |
+------+------+------+
| A | 65 | 65 |
+------+------+------+
```


An empty hexadecimal value ( $X^{\prime}$ ' ) evaluates to a zero-length binary string. Converted to a number, it produces 0:
```
mysql> SELECT CHARSET(X''), LENGTH(X'');
+---------------+--------------+
| CHARSET(X'') | LENGTH(X'') |
+---------------+-------------+
```

```
| binary | 0 |
+---------------+-------------+
mysql> SELECT X''+0;
+-------+
| X''+0 |
+-------+
| 0 |
+-------+
```


The X'val' notation is based on standard SQL. The 0x notation is based on ODBC, for which hexadecimal strings are often used to supply values for BLOB columns.

To convert a string or a number to a string in hexadecimal format, use the HEX( ) function:
```
mysql> SELECT HEX('cat');
+-------------+
| HEX('cat') |
+-------------+
| 636174 |
+-------------+
mysql> SELECT X'636174';
+------------+
| X'636174' |
+------------+
| cat |
+------------+
```


For hexadecimal literals, bit operations are considered numeric context, but bit operations permit numeric or binary string arguments in MySQL 8.4 and higher. To explicitly specify binary string context for hexadecimal literals, use a _binary introducer for at least one of the arguments:
```
mysql> SET @v1 = X'000D' | X'0BC0';
mysql> SET @v2 = _binary X'000D' | X'0BC0';
mysql> SELECT HEX(@v1), HEX(@v2);
+-----------+-----------+
| HEX(@v1) | HEX(@v2) |
+-----------+-----------+
| BCD | 0BCD |
+-----------+-----------+
```


The displayed result appears similar for both bit operations, but the result without _binary is a BIGINT value, whereas the result with _binary is a binary string. Due to the difference in result types, the displayed values differ: High-order 0 digits are not displayed for the numeric result.

\subsection*{11.1.5 Bit-Value Literals}

Bit-value literals are written using ' val' or 0bval notation. val is a binary value written using zeros and ones. Lettercase of any leading $b$ does not matter. A leading 0b is case-sensitive and cannot be written as 0B.

Legal bit-value literals:
```
b'01'
B'01'
0b01
```


Illegal bit-value literals:
```
b'2' (2 is not a binary digit)
0B01 (0B must be written as 0b)
```


By default, a bit-value literal is a binary string:
```
mysql> SELECT b'1000001', CHARSET(b'1000001');
+-------------+---------------------+
| b'1000001' | CHARSET(b'1000001') |
+-------------+----------------------+
| | | binary |
```

```
+-------------+-----------------------+
+-----------+--------------------+
| 0b1100001 | CHARSET(0b1100001) |
+-----------+--------------------+
| a | binary |
```


A bit-value literal may have an optional character set introducer and COLLATE clause, to designate it as a string that uses a particular character set and collation:
```
[_charset_name] b'val' [COLLATE collation_name]
```


\section*{Examples:}
```
SELECT _latin1 b'1000001';
SELECT _utf8mb4 0b1000001 COLLATE utf8mb4_danish_ci;
```


The examples use b 'val' notation, but 0 bval notation permits introducers as well. For information about introducers, see Section 12.3.8, "Character Set Introducers".

In numeric contexts, MySQL treats a bit literal like an integer. To ensure numeric treatment of a bit literal, use it in numeric context. Ways to do this include adding 0 or using CAST ( . . . AS UNSIGNED). For example, a bit literal assigned to a user-defined variable is a binary string by default. To assign the value as a number, use it in numeric context:
```
mysql> SET @v1 = b'1100001';
mysql> SET @v2 = b'1100001'+0;
mysql> SET @v3 = CAST(b'1100001' AS UNSIGNED);
mysql> SELECT @v1, @v2, @v3;
+------+-------+-------+
| @v1 | @v2 | @v3 |
+------+------+------+
| a | 97 | 97 |
+------+------+------+
```


An empty bit value (b ' ' ) evaluates to a zero-length binary string. Converted to a number, it produces 0 :
```
mysql> SELECT CHARSET(b''), LENGTH(b'');
+---------------+-------------+
| CHARSET(b'') | LENGTH(b'') |
+---------------+-------------+
| binary | 0 |
+---------------+-------------+
mysql> SELECT b''+0;
+--------+
| b''+0 |
+--------+
| 0 |
+--------+
```


Bit-value notation is convenient for specifying values to be assigned to BIT columns:
```
mysql> CREATE TABLE t (b BIT(8));
mysql> INSERT INTO t SET b = b'11111111';
mysql> INSERT INTO t SET b = b'1010';
mysql> INSERT INTO t SET b = b'0101';
```


Bit values in result sets are returned as binary values, which may not display well. To convert a bit value to printable form, use it in numeric context or use a conversion function such as BIN ( ) or HEX( ). High-order 0 digits are not displayed in the converted value.
```
mysql> SELECT b+0, BIN(b), OCT(b), HEX(b) FROM t;
+------+----------+--------+--------+
| b+0 | BIN(b) | OCT(b) | HEX(b) |
+------+-----------+--------+--------+
| 255 | 11111111 | 377 | FF |
```

```
| 10 |1010 | 12 | A 
```


For bit literals, bit operations are considered numeric context, but bit operations permit numeric or binary string arguments in MySQL 8.4 and higher. To explicitly specify binary string context for bit literals, use a _binary introducer for at least one of the arguments:
```
mysql> SET @v1 = b'000010101' | b'000101010';
mysql> SET @v2 = _binary b'000010101' | _binary b'000101010';
mysql> SELECT HEX(@v1), HEX(@v2);
+----------+-----------+
| HEX(@v1) | HEX(@v2) |
+-----------+-----------+
| 3F | 003F |
+-----------+-----------+
```


The displayed result appears similar for both bit operations, but the result without _binary is a BIGINT value, whereas the result with _binary is a binary string. Due to the difference in result types, the displayed values differ: High-order 0 digits are not displayed for the numeric result.

\subsection*{11.1.6 Boolean Literals}

The constants TRUE and FALSE evaluate to 1 and 0 , respectively. The constant names can be written in any lettercase.
```
mysql> SELECT TRUE, true, FALSE, false;
    -> 1, 1, 0, 0
```


\subsection*{11.1.7 NULL Values}

The NULL value means "no data." NULL can be written in any lettercase.
Be aware that the NULL value is different from values such as 0 for numeric types or the empty string for string types. For more information, see Section B.3.4.3, "Problems with NULL Values".

For text file import or export operations performed with LOAD DATA or SELECT . . . INTO OUTFILE, NULL is represented by the \N sequence. See Section 15.2.9, "LOAD DATA Statement".

For sorting with ORDER BY, NULL values sort before other values for ascending sorts, after other values for descending sorts.

\subsection*{11.2 Schema Object Names}

Certain objects within MySQL, including database, table, index, column, alias, view, stored procedure, partition, tablespace, resource group and other object names are known as identifiers. This section describes the permissible syntax for identifiers in MySQL. Section 11.2.1, "Identifier Length Limits", indicates the maximum length of each type of identifier. Section 11.2.3, "Identifier Case Sensitivity", describes which types of identifiers are case-sensitive and under what conditions.

An identifier may be quoted or unquoted. If an identifier contains special characters or is a reserved word, you must quote it whenever you refer to it. (Exception: A reserved word that follows a period in a qualified name must be an identifier, so it need not be quoted.) Reserved words are listed at Section 11.3, "Keywords and Reserved Words".

Internally, identifiers are converted to and are stored as Unicode (UTF-8). The permissible Unicode characters in identifiers are those in the Basic Multilingual Plane (BMP). Supplementary characters are not permitted. Identifiers thus may contain these characters:
- Permitted characters in unquoted identifiers:
- ASCII: [0-9,a-z,A-Z\$] (basic Latin letters, digits 0-9, dollar, underscore)
- Extended: U+0080 .. U+FFFF
- Permitted characters in quoted identifiers include the full Unicode Basic Multilingual Plane (BMP), except U+0000:
- ASCII: U+0001 .. U+007F
- Extended: U+0080 .. U+FFFF
- ASCII NUL ( $\mathrm{U}+0000$ ) and supplementary characters ( $\mathrm{U}+10000$ and higher) are not permitted in quoted or unquoted identifiers.
- Identifiers may begin with a digit but unless quoted may not consist solely of digits.
- Database, table, and column names cannot end with space characters.
- Use of the dollar sign as the first character in the unquoted name of a database, table, view, column, stored program, or alias is deprecated, including such names used with qualifiers (see Section 11.2.2, "Identifier Qualifiers"). An unquoted identifier beginning with a dollar sign cannot contain any additional dollar sign characters. Otherwise, the leading dollar sign is permitted but triggers a deprecation warning.

The dollar sign can still be used as the leading character of such an identifier without producing the warning, when it is quoted according to the rules given later in this section.

The identifier quote character is the backtick (ˋ):
mysql> SELECT * FROM ˋselectˋ WHERE ˋselectˋ.id > 100;
If the ANSI_QUOTES SQL mode is enabled, it is also permissible to quote identifiers within double quotation marks:
mysql> CREATE TABLE "test" (col INT);
ERROR 1064: You have an error in your SQL syntax...
mysql> SET sql_mode='ANSI_QUOTES';
mysql> CREATE TABLE "test" (col INT);
Query OK, 0 rows affected ( 0.00 sec )
The ANSI_QUOTES mode causes the server to interpret double-quoted strings as identifiers.
Consequently, when this mode is enabled, string literals must be enclosed within single quotation marks. They cannot be enclosed within double quotation marks. The server SQL mode is controlled as described in Section 7.1.11, "Server SQL Modes".

Identifier quote characters can be included within an identifier if you quote the identifier. If the character to be included within the identifier is the same as that used to quote the identifier itself, then you need to double the character. The following statement creates a table named aˋb that contains a column named c"d:
mysql> CREATE TABLE ˋaˋˋbˋ (ˋc"dˋ INT);

In the select list of a query, a quoted column alias can be specified using identifier or string quoting characters:
```
mysql> SELECT 1 AS ˋoneˋ, 2 AS 'two';
+-----+-----+
| one | two |
+-----+-----+
| 1 | 2 |
+-----+-----+
```


Elsewhere in the statement, quoted references to the alias must use identifier quoting or the reference is treated as a string literal.

It is recommended that you do not use names that begin with $M$ e or $M$ e $N$, where $M$ and $N$ are integers. For example, avoid using 1 e as an identifier, because an expression such as $1 \mathrm{e}+3$ is ambiguous. Depending on context, it might be interpreted as the expression $1 \mathrm{e}+3$ or as the number $1 \mathrm{e}+3$.

Be careful when using MD5 ( ) to produce table names because it can produce names in illegal or ambiguous formats such as those just described.

It is also recommended that you do not use column names that begin with ! hidden ! to ensure that new names do not collide with names used by existing hidden columns for functional indexes.

A user variable cannot be used directly in an SQL statement as an identifier or as part of an identifier. See Section 11.4, "User-Defined Variables", for more information and examples of workarounds.

Special characters in database and table names are encoded in the corresponding file system names as described in Section 11.2.4, "Mapping of Identifiers to File Names".

\subsection*{11.2.1 Identifier Length Limits}

The following table describes the maximum length for each type of identifier.

\begin{tabular}{|l|l|}
\hline Identifier Type & Maximum Length (characters) \\
\hline Database & 64 \\
\hline Table & 64 \\
\hline Column & 64 \\
\hline Index & 64 \\
\hline Constraint & 64 \\
\hline Stored Program & 64 \\
\hline View & 64 \\
\hline Tablespace & 64 \\
\hline Server & 64 \\
\hline Log File Group & 64 \\
\hline Alias & 256 (see exception following table) \\
\hline Compound Statement Label & 16 \\
\hline User-Defined Variable & 64 \\
\hline Resource Group & 64 \\
\hline
\end{tabular}

Aliases for column names in CREATE VIEW statements are checked against the maximum column length of 64 characters (not the maximum alias length of 256 characters).

For constraint definitions that include no constraint name, the server internally generates a name derived from the associated table name. For example, internally generated foreign key and CHECK constraint names consist of the table name plus _ibfk_ or _chk_ and a number. If the table name is close to the length limit for constraint names, the additional characters required for the constraint name may cause that name to exceed the limit, resulting in an error.

Identifiers are stored using Unicode (UTF-8). This applies to identifiers in table definitions and to identifiers stored in the grant tables in the mysql database. The sizes of the identifier string columns in the grant tables are measured in characters. You can use multibyte characters without reducing the number of characters permitted for values stored in these columns.

Values such as user name and host names in MySQL account names are strings rather than identifiers. For information about the maximum length of such values as stored in grant tables, see Grant Table Scope Column Properties.

\subsection*{11.2.2 Identifier Qualifiers}

Object names may be unqualified or qualified. An unqualified name is permitted in contexts where interpretation of the name is unambiguous. A qualified name includes at least one qualifier to clarify the interpretive context by overriding a default context or providing missing context.

For example, this statement creates a table using the unqualified name t1:
CREATE TABLE t1 (i INT);
Because t1 includes no qualifier to specify a database, the statement creates the table in the default database. If there is no default database, an error occurs.

This statement creates a table using the qualified name db1.t1:
CREATE TABLE db1.t1 (i INT);
Because db1. t1 includes a database qualifier db1, the statement creates t1 in the database named db1, regardless of the default database. The qualifier must be specified if there is no default database. The qualifier may be specified if there is a default database, to specify a database different from the default, or to make the database explicit if the default is the same as the one specified.

Qualifiers have these characteristics:
- An unqualified name consists of a single identifier. A qualified name consists of multiple identifiers.
- The components of a multiple-part name must be separated by period (.) characters. The initial parts of a multiple-part name act as qualifiers that affect the context within which to interpret the final identifier.
- The qualifier character is a separate token and need not be contiguous with the associated identifiers. For example, tbl_name.col_name and tbl_name . col_name are equivalent.
- If any components of a multiple-part name require quoting, quote them individually rather than quoting the name as a whole. For example, write ˋmy-tableˋ . ˋmy-column ˋ, not ˋmy-table.my-columnˋ.
- A reserved word that follows a period in a qualified name must be an identifier, so in that context it need not be quoted.

The permitted qualifiers for object names depend on the object type:
- A database name is fully qualified and takes no qualifier:
```
CREATE DATABASE db1;
```

- A table, view, or stored program name may be given a database-name qualifier. Examples of unqualified and qualified names in CREATE statements:
```
CREATE TABLE mytable ...;
CREATE VIEW myview ...;
CREATE PROCEDURE myproc ...;
CREATE FUNCTION myfunc ...;
CREATE EVENT myevent ...;
CREATE TABLE mydb.mytable ...;
CREATE VIEW mydb.myview ...;
CREATE PROCEDURE mydb.myproc ...;
CREATE FUNCTION mydb.myfunc ...;
CREATE EVENT mydb.myevent ...;
```

- A trigger is associated with a table, so any qualifier applies to the table name:
```
CREATE TRIGGER mytrigger ... ON mytable ...;
```

```
CREATE TRIGGER mytrigger ... ON mydb.mytable ...;
```

- A column name may be given multiple qualifiers to indicate context in statements that reference it, as shown in the following table.

\begin{tabular}{|l|l|}
\hline Column Reference & Meaning \\
\hline col_name & Column col_name from whichever table used in the statement contains a column of that name \\
\hline tbl_name.col_name & Column col_name from table tbl_name of the default database \\
\hline db_name.tbl_name.col_name & Column col_name from table tbl_name of the database $d b \_n a m e$ \\
\hline
\end{tabular}

In other words, a column name may be given a table-name qualifier, which itself may be given a database-name qualifier. Examples of unqualified and qualified column references in SELECT statements:
```
SELECT c1 FROM mytable
WHERE c2 > 100;
SELECT mytable.c1 FROM mytable
WHERE mytable.c2 > 100;
SELECT mydb.mytable.c1 FROM mydb.mytable
WHERE mydb.mytable.c2 > 100;
```


You need not specify a qualifier for an object reference in a statement unless the unqualified reference is ambiguous. Suppose that column c1 occurs only in table t1, c2 only in t2, and c in both t1 and t2. Any unqualified reference to c is ambiguous in a statement that refers to both tables and must be qualified as t1.c or t2.c to indicate which table you mean:
```
SELECT c1, c2, t1.c FROM t1 INNER JOIN t2
WHERE t2.c > 100;
```


Similarly, to retrieve from a table t in database db 1 and from a table t in database db 2 in the same statement, you must qualify the table references: For references to columns in those tables, qualifiers are required only for column names that appear in both tables. Suppose that column c1 occurs only in table db1.t, c2 only in db2.t, and c in both db1.t and db2.t. In this case, c is ambiguous and must be qualified but c1 and c2 need not be:
```
SELECT c1, c2, db1.t.c FROM db1.t INNER JOIN db2.t
WHERE db2.t.c > 100;
```


Table aliases enable qualified column references to be written more simply:
```
SELECT c1, c2, t1.c FROM db1.t AS t1 INNER JOIN db2.t AS t2
WHERE t2.c > 100;
```


\subsection*{11.2.3 Identifier Case Sensitivity}

In MySQL, databases correspond to directories within the data directory. Each table within a database corresponds to at least one file within the database directory (and possibly more, depending on the storage engine). Triggers also correspond to files. Consequently, the case sensitivity of the underlying operating system plays a part in the case sensitivity of database, table, and trigger names. This means such names are not case-sensitive in Windows, but are case-sensitive in most varieties of Unix. One notable exception is macOS, which is Unix-based but uses a default file system type (HFS+) that is not case-sensitive. However, macOS also supports UFS volumes, which are case-sensitive just as on any Unix. See Section 1.7.1, "MySQL Extensions to Standard SQL". The lower_case_table_names system variable also affects how the server handles identifier case sensitivity, as described later in this section.

\section*{Note}

Although database, table, and trigger names are not case-sensitive on some platforms, you should not refer to one of these using different cases within the same statement. The following statement would not work because it refers to a table both as my_table and as MY_TABLE:
mysql> SELECT * FROM my_table WHERE MY_TABLE.col=1;
Partition, subpartition, column, index, stored routine, event, and resource group names are not casesensitive on any platform, nor are column aliases.

However, names of logfile groups are case-sensitive. This differs from standard SQL.
By default, table aliases are case-sensitive on Unix, but not so on Windows or macOS. The following statement would not work on Unix, because it refers to the alias both as a and as A:
```
mysql> SELECT col_name FROM tbl_name AS a
    WHERE a.col_name = 1 OR A.col_name = 2;
```


However, this same statement is permitted on Windows. To avoid problems caused by such differences, it is best to adopt a consistent convention, such as always creating and referring to databases and tables using lowercase names. This convention is recommended for maximum portability and ease of use.

How table and database names are stored on disk and used in MySQL is affected by the lower_case_table_names system variable. lower_case_table_names can take the values shown in the following table. This variable does not affect case sensitivity of trigger identifiers. On Unix, the default value of lower_case_table_names is 0 . On Windows, the default value is 1 . On macOS, the default value is 2 .
lower_case_table_names can only be configured when initializing the server. Changing the lower_case_table_names setting after the server is initialized is prohibited.

\begin{tabular}{|l|l|}
\hline Value & Meaning \\
\hline 0 & Table and database names are stored on disk using the lettercase specified in the CREATE TABLE or CREATE DATABASE statement. Name comparisons are case-sensitive. You should not set this variable to 0 if you are running MySQL on a system that has case-insensitive file names (such as Windows or macOS). If you force this variable to 0 with - - lower - case - table names=0 on a case-insensitive file system and access MyISAM tablenames using different lettercases, index corruption may result. \\
\hline 1 & Table names are stored in lowercase on disk and name comparisons are not case-sensitive. MySQL converts all table names to lowercase on storage and lookup. This behavior also applies to database names and table aliases. \\
\hline 2 & Table and database names are stored on disk using the lettercase specified in the CREATE TABLE or CREATE DATABASE statement, but MySQL converts them to lowercase on lookup. Name comparisons are not case-sensitive. This works only on file systems that are not case-sensitive! InnoDB table names and view names are stored in lowercase, as for lower_case_table_names=1. \\
\hline
\end{tabular}

If you are using MySQL on only one platform, you do not normally have to use a lower_case_table_names setting other than the default. However, you may encounter difficulties if you want to transfer tables between platforms that differ in file system case sensitivity. For example, on Unix, you can have two different tables named my_table and MY_TABLE, but on Windows these two names are considered identical. To avoid data transfer problems arising from lettercase of database or table names, you have two options:
- Use lower_case_table_names=1 on all systems. The main disadvantage with this is that when you use SHOW TABLES or SHOW DATABASES, you do not see the names in their original lettercase.
- Use lower_case_table_names=0 on Unix and lower_case_table_names=2 on Windows. This preserves the lettercase of database and table names. The disadvantage of this is that you must ensure that your statements always refer to your database and table names with the correct lettercase on Windows. If you transfer your statements to Unix, where lettercase is significant, they do not work if the lettercase is incorrect.

Exception: If you are using InnoDB tables and you are trying to avoid these data transfer problems, you should use lower_case_table_names=1 on all platforms to force names to be converted to lowercase.

Object names may be considered duplicates if their uppercase forms are equal according to a binary collation. That is true for names of cursors, conditions, procedures, functions, savepoints, stored routine parameters, stored program local variables, and plugins. It is not true for names of columns, constraints, databases, partitions, statements prepared with PREPARE, tables, triggers, users, and user-defined variables.

File system case sensitivity can affect searches in string columns of INFORMATION_SCHEMA tables. For more information, see Section 12.8.7, "Using Collation in INFORMATION_SCHEMA Searches".

\subsection*{11.2.4 Mapping of Identifiers to File Names}

There is a correspondence between database and table identifiers and names in the file system. For the basic structure, MySQL represents each database as a directory in the data directory, and depending upon the storage engine, each table may be represented by one or more files in the appropriate database directory.

For the data and index files, the exact representation on disk is storage engine specific. These files may be stored in the database directory, or the information may be stored in a separate file. InnoDB data is stored in the InnoDB data files. If you are using tablespaces with InnoDB, then the specific tablespace files you create are used instead.

Any character is legal in database or table identifiers except ASCII NUL ( $\mathrm{X}^{\prime} 00$ ' ). MySQL encodes any characters that are problematic in the corresponding file system objects when it creates database directories or table files:
- Basic Latin letters (a . . zA . . Z), digits (0 . .9) and underscore (_) are encoded as is. Consequently, their case sensitivity directly depends on file system features.
- All other national letters from alphabets that have uppercase/lowercase mapping are encoded as shown in the following table. Values in the Code Range column are UCS-2 values.

\begin{tabular}{|l|l|l|l|l|l|}
\hline Code Range & Pattern & Number & Used & Unused & Blocks \\
\hline 00C0..017F & [@][0..4][g..z] & $5 * 20=100$ & 97 & 3 & Latin-1 Supplement + Latin ExtendedA \\
\hline 0370..03FF & [@][5..9][g..z] & $5 * 20=100$ & 88 & 12 & Greek and Coptic \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Code Range & Pattern & Number & Used & Unused & Blocks \\
\hline 0400..052F & [@][g..z][0..6] & 20 * $7=140$ & 137 & 3 & Cyrillic + Cyrillic Supplement \\
\hline 0530..058F & [@][g..z][7..8] & 20*2= 40 & 38 & 2 & Armenian \\
\hline 2160..217F & [@][g..z][9] & 20*1= 20 & 16 & 4 & Number Forms \\
\hline 0180..02AF & [@][g..z][a..k] & 20*11=220 & 203 & 17 & \begin{tabular}{l}
Latin ExtendedB + IPA \\
Extensions
\end{tabular} \\
\hline 1E00..1EFF & [@][g..z][l..r] & $20 * 7=140$ & 136 & 4 & Latin Extended Additional \\
\hline 1F00..1FFF & [@][g..z][s..z] & $20 * 8=160$ & 144 & 16 & Greek Extended \\
\hline .... .... & [@][a..f][g..z] & 6*20= 120 & 0 & 120 & RESERVED \\
\hline 24B6..24E9 & [@][@][a..z] & 26 & 26 & 0 & Enclosed Alphanumerics \\
\hline FF21..FF5A & [@][a..z][@] & 26 & 26 & 0 & Halfwidth and Fullwidth forms \\
\hline
\end{tabular}

One of the bytes in the sequence encodes lettercase. For example: LATIN CAPITAL LETTER A WITH GRAVE is encoded as @0G, whereas LATIN SMALL LETTER A WITH GRAVE is encoded as @0g. Here the third byte (G or g) indicates lettercase. (On a case-insensitive file system, both letters are treated as the same.)

For some blocks, such as Cyrillic, the second byte determines lettercase. For other blocks, such as Latin1 Supplement, the third byte determines lettercase. If two bytes in the sequence are letters (as in Greek Extended), the leftmost letter character stands for lettercase. All other letter bytes must be in lowercase.
- All nonletter characters except underscore (_), as well as letters from alphabets that do not have uppercase/lowercase mapping (such as Hebrew) are encoded using hexadecimal representation using lowercase letters for hexadecimal digits a . . f:
```
0x003F -> @003f
0xFFFF -> @ffff
```


The hexadecimal values correspond to character values in the ucs2 double-byte character set.
On Windows, some names such as nul, prn, and aux are encoded by appending @@@ to the name when the server creates the corresponding file or directory. This occurs on all platforms for portability of the corresponding database object between platforms.

The following names are reserved and appended with @@@ if used in schema or table names:
- CON
- PRN
- AUX
- NUL
- COM1 through COM9
- LPT1 through LPT9

CLOCK\$ is also a member of this group of reserved names, but is not appended with @@@, but @0024 instead. That is, if CLOCK\$ is used as a schema or table name, it is written to the file system as

CLOCK@0024. The same is true for any use of \$ (dollar sign) in a schema or table name; it is replaced with @0024 on the filesystem.

\section*{Note}

These names are also written to INNODB_TABLES in their appended forms, but are written to TABLES in their unappended form, as entered by the user.

\subsection*{11.2.5 Function Name Parsing and Resolution}

MySQL supports built-in (native) functions, loadable functions, and stored functions. This section describes how the server recognizes whether the name of a built-in function is used as a function call or as an identifier, and how the server determines which function to use in cases when functions of different types exist with a given name.
- Built-In Function Name Parsing
- Function Name Resolution

\section*{Built-In Function Name Parsing}

The parser uses default rules for parsing names of built-in functions. These rules can be changed by enabling the IGNORE_SPACE SQL mode.

When the parser encounters a word that is the name of a built-in function, it must determine whether the name signifies a function call or is instead a nonexpression reference to an identifier such as a table or column name. For example, in the following statements, the first reference to count is a function call, whereas the second reference is a table name:

SELECT COUNT(*) FROM mytable;
CREATE TABLE count (i INT);
The parser should recognize the name of a built-in function as indicating a function call only when parsing what is expected to be an expression. That is, in nonexpression context, function names are permitted as identifiers.

However, some built-in functions have special parsing or implementation considerations, so the parser uses the following rules by default to distinguish whether their names are being used as function calls or as identifiers in nonexpression context:
- To use the name as a function call in an expression, there must be no whitespace between the name and the following ( parenthesis character.
- Conversely, to use the function name as an identifier, it must not be followed immediately by a parenthesis.

The requirement that function calls be written with no whitespace between the name and the parenthesis applies only to the built-in functions that have special considerations. COUNT is one such name. The sql/lex.h source file lists the names of these special functions for which following whitespace determines their interpretation: names defined by the SYM_FN( ) macro in the symbols [] array.

The following list names the functions in MySQL 8.4 that are affected by the IGNORE_SPACE setting and listed as special in the sql/lex.h source file. You may find it easiest to treat the no-whitespace requirement as applying to all function calls.
- ADDDATE
- BIT_AND
- BIT_OR
- BIT_XOR
- CAST
- COUNT
- CURDATE
- CURTIME
- DATE_ADD
- DATE_SUB
- EXTRACT
- GROUP_CONCAT
- MAX
- MID
- MIN
- NOW
- POSITION
- SESSION_USER
- STD
- STDDEV
- STDDEV_POP
- STDDEV_SAMP
- SUBDATE
- SUBSTR
- SUBSTRING
- SUM
- SYSDATE
- SYSTEM_USER
- TRIM
- VARIANCE
- VAR_POP
- VAR_SAMP

For functions not listed as special in sql/lex.h, whitespace does not matter. They are interpreted as function calls only when used in expression context and may be used freely as identifiers otherwise. ASCII is one such name. However, for these nonaffected function names, interpretation may vary in expression context: func_name ( ) is interpreted as a built-in function if there is one with the given name; if not, func_name ( ) is interpreted as a loadable function or stored function if one exists with that name.

The IGNORE_SPACE SQL mode can be used to modify how the parser treats function names that are whitespace-sensitive:
- With IGNORE_SPACE disabled, the parser interprets the name as a function call when there is no whitespace between the name and the following parenthesis. This occurs even when the function name is used in nonexpression context:
```
mysql> CREATE TABLE count(i INT);
ERROR 1064 (42000): You have an error in your SQL syntax ...
near 'count(i INT)'
```


To eliminate the error and cause the name to be treated as an identifier, either use whitespace following the name or write it as a quoted identifier (or both):
```
CREATE TABLE count (i INT);
CREATE TABLE ˋcountˋ(i INT);
CREATE TABLE ˋcountˋ (i INT);
```

- With IGNORE_SPACE enabled, the parser loosens the requirement that there be no whitespace between the function name and the following parenthesis. This provides more flexibility in writing function calls. For example, either of the following function calls are legal:
```
SELECT COUNT(*) FROM mytable;
SELECT COUNT (*) FROM mytable;
```


However, enabling IGNORE_SPACE also has the side effect that the parser treats the affected function names as reserved words (see Section 11.3, "Keywords and Reserved Words"). This means that a space following the name no longer signifies its use as an identifier. The name can be used in function calls with or without following whitespace, but causes a syntax error in nonexpression context unless it is quoted. For example, with IGNORE_SPACE enabled, both of the following statements fail with a syntax error because the parser interprets count as a reserved word:
```
CREATE TABLE count(i INT);
CREATE TABLE count (i INT);
```


To use the function name in nonexpression context, write it as a quoted identifier:
```
CREATE TABLE ˋcountˋ(i INT);
CREATE TABLE ˋcountˋ (i INT);
```


To enable the IGNORE_SPACE SQL mode, use this statement:
```
SET sql_mode = 'IGNORE_SPACE';
```


IGNORE_SPACE is also enabled by certain other composite modes such as ANSI that include it in their value:
```
SET sql_mode = 'ANSI';
```


Check Section 7.1.11, "Server SQL Modes", to see which composite modes enable IGNORE_SPACE.
To minimize the dependency of SQL code on the IGNORE_SPACE setting, use these guidelines:
- Avoid creating loadable functions or stored functions that have the same name as a built-in function.
- Avoid using function names in nonexpression context. For example, these statements use count (one of the affected function names affected by IGNORE_SPACE), so they fail with or without whitespace following the name if IGNORE_SPACE is enabled:
```
CREATE TABLE count(i INT);
CREATE TABLE count (i INT);
```


If you must use a function name in nonexpression context, write it as a quoted identifier:
```
CREATE TABLE ˋcountˋ(i INT);
```


CREATE TABLE ˋcountˋ (i INT);

\section*{Function Name Resolution}

The following rules describe how the server resolves references to function names for function creation and invocation:
- Built-in functions and loadable functions

An error occurs if you try to create a loadable function with the same name as a built-in function.
IF NOT EXISTS has no effect in such cases. See Section 15.7.4.1, "CREATE FUNCTION Statement for Loadable Functions", for more information.
- Built-in functions and stored functions

It is possible to create a stored function with the same name as a built-in function, but to invoke the stored function it is necessary to qualify it with a schema name. For example, if you create a stored function named PI in the test schema, invoke it as test. PI() because the server resolves PI() without a qualifier as a reference to the built-in function. The server generates a warning if the stored function name collides with a built-in function name. The warning can be displayed with SHOW WARNINGS.

IF NOT EXISTS has no effect in such cases; see Section 15.1.17, "CREATE PROCEDURE and CREATE FUNCTION Statements".
- Loadable functions and stored functions

It is possible to create a stored function with the same name as an existing loadable function, or the other way around. The server generates a warning if a proposed stored function name collides with an existing loadable function name, or if a proposed loadable function name would be the same as that of an existing stored function. In either case, once both functions exist, it is necessary thereafter to qualify the stored function with a schema name when invoking it; the server assumes in such cases that the unqualified name refers to the loadable function.

MySQL 8.4 supports IF NOT EXISTS with CREATE FUNCTION statements, but it has no effect in such cases.

The preceding function name resolution rules have implications for upgrading to versions of MySQL that implement new built-in functions:
- If you have already created a loadable function with a given name and upgrade MySQL to a version that implements a new built-in function with the same name, the loadable function becomes inaccessible. To correct this, use DROP FUNCTION to drop the loadable function and CREATE FUNCTION to re-create the loadable function with a different nonconflicting name. Then modify any affected code to use the new name.
- If a new version of MySQL implements a built-in function or loadable function with the same name as an existing stored function, you have two choices: Rename the stored function to use a nonconflicting name, or change any calls to the function that do not do so already to use a schema qualifier (schema_name.func_name ( ) syntax). In either case, modify any affected code accordingly.

\subsection*{11.3 Keywords and Reserved Words}

Keywords are words that have significance in SQL. Certain keywords, such as SELECT, DELETE, or BIGINT, are reserved and require special treatment for use as identifiers such as table and column names. This may also be true for the names of built-in functions.

Most nonreserved keywords are permitted as identifiers without quoting. Some keywords which are otherwise considered nonreserved are restricted from use as unquoted identifiers for roles, stored
program labels, or, in some cases, both. See MySQL 8.4 Restricted Keywords, for listings of these keywords.

Reserved words are permitted as identifiers if you quote them as described in Section 11.2, "Schema Object Names":
```
mysql> CREATE TABLE interval (begin INT, end INT);
ERROR 1064 (42000): You have an error in your SQL syntax ...
near 'interval (begin INT, end INT)'
```


BEGIN and END are keywords but not reserved, so their use as identifiers does not require quoting. INTERVAL is a reserved keyword and must be quoted to be used as an identifier:
```
mysql> CREATE TABLE ˋintervalˋ (begin INT, end INT);
Query OK, 0 rows affected (0.01 sec)
```


Exception: A word that follows a period in a qualified name must be an identifier, so it need not be quoted even if it is reserved:
```
mysql> CREATE TABLE mydb.interval (begin INT, end INT);
Query OK, 0 rows affected (0.01 sec)
```


Names of built-in functions are permitted as identifiers but may require care to be used as such. For example, COUNT is acceptable as a column name. However, by default, no whitespace is permitted in function invocations between the function name and the following ( character. This requirement enables the parser to distinguish whether the name is used in a function call or in nonfunction context. For further details on recognition of function names, see Section 11.2.5, "Function Name Parsing and Resolution".

The INFORMATION_SCHEMA. KEYWORDS table lists the words considered keywords by MySQL and indicates whether they are reserved. See Section 28.3.17, "The INFORMATION_SCHEMA KEYWORDS Table".
- MySQL 8.4 Keywords and Reserved Words
- MySQL 8.4 New Keywords and Reserved Words
- MySQL 8.4 Removed Keywords and Reserved Words
- MySQL 8.4 Restricted Keywords

\section*{MySQL 8.4 Keywords and Reserved Words}

The following list shows the keywords and reserved words in MySQL 8.4, along with changes to individual words from version to version. Reserved keywords are marked with (R). In addition, _FILENAME is reserved.

At some point, you might upgrade to a higher version, so it is a good idea to have a look at future reserved words, too. You can find these in the manuals that cover higher versions of MySQL. Most of the reserved words in the list are forbidden by standard SQL as column or table names (for example, GROUP). A few are reserved because MySQL needs them and uses a yacc parser.

\section*{$\mathrm{A}|\mathrm{B}| \mathrm{C}|\mathrm{D}| \mathrm{E}|\mathrm{F}| \mathrm{G}|\mathrm{H}| \mathrm{I}|\mathrm{J}| \mathrm{K}|\mathrm{L}| \mathrm{M}|\mathrm{N}| \mathrm{O}|\mathrm{P}| \mathrm{Q}|\mathrm{R}| \mathrm{S}|\mathrm{T}| \mathrm{U}|\mathrm{V}| \mathrm{W}|\mathrm{X}| \mathrm{Y} \mid \mathrm{Z}$}

A
- ACCESSIBLE (R)
- ACCOUNT
- ACTION
- ACTIVE
- ADD (R)
- ADMIN
- AFTER
- AGAINST
- AGGREGATE
- ALGORITHM
- ALL (R)
- ALTER (R)
- ALWAYS
- ANALYZE (R)
- AND (R)
- ANY
- ARRAY
- AS (R)
- ASC (R)
- ASCII
- ASENSITIVE (R)
- AT
- ATTRIBUTE
- AUTHENTICATION
- AUTO
- AUTOEXTEND_SIZE
- AUTO_INCREMENT
- AVG
- AVG_ROW_LENGTH

B
- BACKUP
- BEFORE (R)
- BEGIN
- BERNOULLI
- BETWEEN (R)
- BIGINT (R)
- BINARY (R)
- BINLOG
- BIT
- BLOB (R)
- BLOCK
- BOOL
- BOOLEAN
- BOTH (R)
- BTREE
- BUCKETS
- BULK
- BY (R)
- BYTE

C
- CACHE
- CALL (R)
- CASCADE (R)
- CASCADED
- CASE (R)
- CATALOG_NAME
- CHAIN
- CHALLENGE_RESPONSE
- CHANGE (R)
- CHANGED
- CHANNEL
- CHAR (R)
- CHARACTER (R)
- CHARSET
- CHECK (R)
- CHECKSUM
- CIPHER
- CLASS_ORIGIN
- CLIENT
- CLONE
- CLOSE
- COALESCE
- CODE
- COLLATE (R)
- COLLATION
- COLUMN (R)
- COLUMNS
- COLUMN_FORMAT
- COLUMN_NAME
- COMMENT
- COMMIT
- COMMITTED
- COMPACT
- COMPLETION
- COMPONENT
- COMPRESSED
- COMPRESSION
- CONCURRENT
- CONDITION (R)
- CONNECTION
- CONSISTENT
- CONSTRAINT (R)
- CONSTRAINT_CATALOG
- CONSTRAINT_NAME
- CONSTRAINT_SCHEMA
- CONTAINS
- CONTEXT
- CONTINUE (R)
- CONVERT (R)
- CPU
- CREATE (R)
- CROSS (R)
- CUBE (R)
- CUME_DIST (R)
- CURRENT
- CURRENT_DATE (R)
- CURRENT_TIME (R)
- CURRENT_TIMESTAMP (R)
- CURRENT_USER (R)
- CURSOR (R)
- CURSOR_NAME

D
- DATA
- DATABASE (R)
- DATABASES (R)
- DATAFILE
- DATE
- DATETIME
- DAY
- DAY_HOUR (R)
- DAY_MICROSECOND (R)
- DAY_MINUTE (R)
- DAY_SECOND (R)
- DEALLOCATE
- DEC (R)
- DECIMAL (R)
- DECLARE (R)
- DEFAULT (R)
- DEFAULT_AUTH
- DEFINER
- DEFINITION
- DELAYED (R)
- DELAY_KEY_WRITE
- DELETE (R)
- DENSE_RANK (R)
- DESC (R)
- DESCRIBE (R)
- DESCRIPTION
- DETERMINISTIC (R)
- DIAGNOSTICS
- DIRECTORY
- DISABLE
- DISCARD
- DISK
- DISTINCT (R)
- DISTINCTROW (R)
- DIV (R)
- DO
- DOUBLE (R)
- DROP (R)
- DUAL (R)
- DUMPFILE
- DUPLICATE
- DYNAMIC

E
- EACH (R)
- ELSE (R)
- ELSEIF (R)
- EMPTY (R)
- ENABLE
- ENCLOSED (R)
- ENCRYPTION
- END
- ENDS
- ENFORCED
- ENGINE
- ENGINES
- ENGINE_ATTRIBUTE
- ENUM
- ERROR
- ERRORS
- ESCAPE
- ESCAPED (R)
- EVENT
- EVENTS
- EVERY
- EXCEPT (R)
- EXCHANGE
- EXCLUDE
- EXECUTE
- EXISTS (R)
- EXIT (R)
- EXPANSION
- EXPIRE
- EXPLAIN (R)
- EXPORT
- EXTENDED
- EXTENT_SIZE

F
- FACTOR
- FAILED_LOGIN_ATTEMPTS
- FALSE (R)
- FAST
- FAULTS
- FETCH (R)
- FIELDS
- FILE
- FILE_BLOCK_SIZE
- FILTER
- FINISH
- FIRST
- FIRST_VALUE (R)
- FIXED
- FLOAT (R)
- FLOAT4 (R)
- FLOAT8 (R)
- FLUSH
- FOLLOWING
- FOLLOWS
- FOR (R)
- FORCE (R)
- FOREIGN (R)
- FORMAT
- FOUND
- FROM (R)
- FULL
- FULLTEXT (R)
- FUNCTION (R)

G
- GENERAL
- GENERATE
- GENERATED (R)
- GEOMCOLLECTION
- GEOMETRY
- GEOMETRYCOLLECTION
- GET (R)
- GET_FORMAT
- GET_SOURCE_PUBLIC_KEY
- GLOBAL
- GRANT (R)
- GRANTS
- GROUP (R)
- GROUPING (R)
- GROUPS (R)
- GROUP_REPLICATION
- GTIDS
- GTID_ONLY

H
- HANDLER
- HASH
- HAVING (R)
- HELP
- HIGH_PRIORITY (R)
- HISTOGRAM
- HISTORY
- HOST
- HOSTS
- HOUR
- HOUR_MICROSECOND (R)
- HOUR_MINUTE (R)
- HOUR_SECOND (R)

I
- IDENTIFIED
- IF (R)
- IGNORE (R)
- IGNORE_SERVER_IDS
- IMPORT
- IN (R)
- INACTIVE
- INDEX (R)
- INDEXES
- INFILE (R)
- INITIAL
- INITIAL_SIZE
- INITIATE
- INNER (R)
- INOUT (R)
- INSENSITIVE (R)
- INSERT (R)
- INSERT_METHOD
- INSTALL
- INSTANCE
- INT (R)
- INT1 (R)
- INT2 (R)
- INT3 (R)
- INT4 (R)
- INT8 (R)
- INTEGER (R)
- INTERSECT (R)
- INTERVAL (R)
- INTO (R)
- INVISIBLE
- INVOKER
- I0
- IO_AFTER_GTIDS (R)
- IO_BEFORE_GTIDS (R)
- IO_THREAD
- IPC
- IS (R)
- ISOLATION
- ISSUER
- ITERATE (R)

J
- JOIN (R)
- JSON
- JSON_TABLE (R)
- JSON_VALUE

K
- KEY (R)
- KEYRING
- KEYS (R)
- KEY_BLOCK_SIZE
- KILL (R)

L
- LAG (R)
- LANGUAGE
- LAST
- LAST_VALUE (R)
- LATERAL (R)
- LEAD (R)
- LEADING (R)
- LEAVE (R)
- LEAVES
- LEFT (R)
- LESS
- LEVEL
- LIKE (R)
- LIMIT (R)
- LINEAR (R)
- LINES (R)
- LINESTRING
- LIST
- LOAD (R)
- LOCAL
- LOCALTIME (R)
- LOCALTIMESTAMP (R)
- LOCK (R)
- LOCKED
- LOCKS
- LOG
- LOGFILE
- LOGS
- LONG (R)
- LONGBLOB (R)
- LONGTEXT (R)
- LOOP (R)
- LOW_PRIORITY (R)

M
- MANUAL (R)
- MASTER
- MATCH (R)
- MAXVALUE (R)
- MAX_CONNECTIONS_PER_HOUR
- MAX_QUERIES_PER_HOUR
- MAX_ROWS
- MAX_SIZE
- MAX_UPDATES_PER_HOUR
- MAX_USER_CONNECTIONS
- MEDIUM
- MEDIUMBLOB (R)
- MEDIUMINT (R)
- MEDIUMTEXT (R)
- MEMBER
- MEMORY
- MERGE
- MESSAGE_TEXT
- MICROSECOND
- MIDDLEINT (R)
- MIGRATE
- MINUTE
- MINUTE_MICROSECOND (R)
- MINUTE_SECOND (R)
- MIN_ROWS
- MOD (R)
- MODE
- MODIFIES (R)
- MODIFY
- MONTH
- MULTILINESTRING
- MULTIPOINT
- MULTIPOLYGON
- MUTEX
- MYSQL_ERRNO

N
- NAME
- NAMES
- NATIONAL
- NATURAL (R)
- NCHAR
- NDB
- NDBCLUSTER
- NESTED
- NETWORK_NAMESPACE
- NEVER
- NEW
- NEXT
- NO
- NODEGROUP
- NONE
- NOT (R)
- NOWAIT
- NO_WAIT
- NO_WRITE_TO_BINLOG (R)
- NTH_VALUE (R)
- NTILE (R)
- NULL (R)
- NULLS
- NUMBER
- NUMERIC (R)
- NVARCHAR

O
- OF (R)
- OFF
- OFFSET
- OJ
- OLD
- ON (R)
- ONE
- ONLY
- OPEN
- OPTIMIZE (R)
- OPTIMIZER_COSTS (R)
- OPTION (R)
- OPTIONAL
- OPTIONALLY (R)
- OPTIONS
- OR (R)
- ORDER (R)
- ORDINALITY
- ORGANIZATION
- OTHERS
- OUT (R)
- OUTER (R)
- OUTFILE (R)
- OVER (R)
- OWNER

P
- PACK_KEYS
- PAGE
- PARALLEL (R)
- PARSER
- PARSE_TREE
- PARTIAL
- PARTITION (R)
- PARTITIONING
- PARTITIONS
- PASSWORD
- PASSWORD_LOCK_TIME
- PATH
- PERCENT_RANK (R)
- PERSIST
- PERSIST_ONLY
- PHASE
- PLUGIN
- PLUGINS
- PLUGIN_DIR
- POINT
- POLYGON
- PORT
- PRECEDES
- PRECEDING
- PRECISION (R)
- PREPARE
- PRESERVE
- PREV
- PRIMARY (R)
- PRIVILEGES
- PRIVILEGE_CHECKS_USER
- PROCEDURE (R)
- PROCESS
- PROCESSLIST
- PROFILE
- PROFILES
- PROXY
- PURGE (R)

Q
- QUALIFY (R)
- QUARTER
- QUERY
- QUICK

R
- RANDOM
- RANGE (R)
- RANK (R)
- READ (R)
- READS (R)
- READ_ONLY
- READ_WRITE (R)
- REAL (R)
- REBUILD
- RECOVER
- RECURSIVE (R)
- REDO_BUFFER_SIZE
- REDUNDANT
- REFERENCE
- REFERENCES (R)
- REGEXP (R)
- REGISTRATION
- RELAY
- RELAYLOG
- RELAY_LOG_FILE
- RELAY_LOG_POS
- RELAY_THREAD
- RELEASE (R)
- RELOAD
- REMOVE
- RENAME (R)
- REORGANIZE
- REPAIR
- REPEAT (R)
- REPEATABLE
- REPLACE (R)
- REPLICA
- REPLICAS
- REPLICATE_DO_DB
- REPLICATE_DO_TABLE
- REPLICATE_IGNORE_DB
- REPLICATE_IGNORE_TABLE
- REPLICATE_REWRITE_DB
- REPLICATE_WILD_DO_TABLE
- REPLICATE_WILD_IGNORE_TABLE
- REPLICATION
- REQUIRE (R)
- REQUIRE_ROW_FORMAT
- RESET
- RESIGNAL (R)
- RESOURCE
- RESPECT
- RESTART
- RESTORE
- RESTRICT (R)
- RESUME
- RETAIN
- RETURN (R)
- RETURNED_SQLSTATE
- RETURNING
- RETURNS
- REUSE
- REVERSE
- REVOKE (R)
- RIGHT (R)
- RLIKE (R)
- ROLE
- ROLLBACK
- ROLLUP
- ROTATE
- ROUTINE
- ROW (R)
- ROWS (R)
- ROW_COUNT
- ROW_FORMAT
- ROW_NUMBER (R)
- RTREE

S
- S3
- SAVEPOINT
- SCHEDULE
- SCHEMA (R)
- SCHEMAS (R)
- SCHEMA_NAME
- SECOND
- SECONDARY
- SECONDARY_ENGINE
- SECONDARY_ENGINE_ATTRIBUTE
- SECONDARY_LOAD
- SECONDARY_UNLOAD
- SECOND_MICROSECOND (R)
- SECURITY
- SELECT (R)
- SENSITIVE (R)
- SEPARATOR (R)
- SERIAL
- SERIALIZABLE
- SERVER
- SESSION
- SET (R)
- SHARE
- SHOW (R)
- SHUTDOWN
- SIGNAL (R)
- SIGNED
- SIMPLE
- SKIP
- SLAVE
- SLOW
- SMALLINT (R)
- SNAPSHOT
- SOCKET
- SOME
- SONAME
- SOUNDS
- SOURCE
- SOURCE_AUTO_POSITION
- SOURCE_BIND
- SOURCE_COMPRESSION_ALGORITHMS
- SOURCE_CONNECT_RETRY
- SOURCE_DELAY
- SOURCE_HEARTBEAT_PERIOD
- SOURCE_HOST
- SOURCE_LOG_FILE
- SOURCE_LOG_POS
- SOURCE_PASSWORD
- SOURCE_PORT
- SOURCE_PUBLIC_KEY_PATH
- SOURCE_RETRY_COUNT
- SOURCE_SSL
- SOURCE_SSL_CA
- SOURCE_SSL_CAPATH
- SOURCE_SSL_CERT
- SOURCE_SSL_CIPHER
- SOURCE_SSL_CRL
- SOURCE_SSL_CRLPATH
- SOURCE_SSL_KEY
- SOURCE_SSL_VERIFY_SERVER_CERT
- SOURCE_TLS_CIPHERSUITES
- SOURCE_TLS_VERSION
- SOURCE_USER
- SOURCE_ZSTD_COMPRESSION_LEVEL
- SPATIAL (R)
- SPECIFIC (R)
- SQL (R)
- SQLEXCEPTION (R)
- SQLSTATE (R)
- SQLWARNING (R)
- SQL_AFTER_GTIDS
- SQL_AFTER_MTS_GAPS
- SQL_BEFORE_GTIDS
- SQL_BIG_RESULT (R)
- SQL_BUFFER_RESULT
- SQL_CALC_FOUND_ROWS (R)
- SQL_NO_CACHE
- SQL_SMALL_RESULT (R)
- SQL_THREAD
- SQL_TSI_DAY
- SQL_TSI_HOUR
- SQL_TSI_MINUTE
- SQL_TSI_MONTH
- SQL_TSI_QUARTER
- SQL_TSI_SECOND
- SQL_TSI_WEEK
- SQL_TSI_YEAR
- SRID
- SSL (R)
- STACKED
- START
- STARTING (R)
- STARTS
- STATS_AUTO_RECALC
- STATS_PERSISTENT
- STATS_SAMPLE_PAGES
- STATUS
- STOP
- STORAGE
- STORED (R)
- STRAIGHT_JOIN (R)
- STREAM
- STRING
- SUBCLASS_ORIGIN
- SUBJECT
- SUBPARTITION
- SUBPARTITIONS
- SUPER
- SUSPEND
- SWAPS
- SWITCHES
- SYSTEM (R)

T
- TABLE (R)
- TABLES
- TABLESAMPLE (R)
- TABLESPACE
- TABLE_CHECKSUM
- TABLE_NAME
- TEMPORARY
- TEMPTABLE
- TERMINATED (R)
- TEXT
- THAN
- THEN (R)
- THREAD_PRIORITY
- TIES
- TIME
- TIMESTAMP
- TIMESTAMPADD
- TIMESTAMPDIFF
- TINYBLOB (R)
- TINYINT (R)
- TINYTEXT (R)
- TLS
- TO (R)
- TRAILING (R)
- TRANSACTION
- TRIGGER (R)
- TRIGGERS
- TRUE (R)
- TRUNCATE
- TYPE
- TYPES

U
- UNBOUNDED
- UNCOMMITTED
- UNDEFINED
- UNDO (R)
- UNDOFILE
- UNDO_BUFFER_SIZE
- UNICODE
- UNINSTALL
- UNION (R)
- UNIQUE (R)
- UNKNOWN
- UNLOCK (R)
- UNREGISTER
- UNSIGNED (R)
- UNTIL
- UPDATE (R)
- UPGRADE
- URL
- USAGE (R)
- USE (R)
- USER
- USER_RESOURCES
- USE_FRM
- USING (R)
- UTC_DATE (R)
- UTC_TIME (R)
- UTC_TIMESTAMP (R)

V
- VALIDATION
- VALUE
- VALUES (R)
- VARBINARY (R)
- VARCHAR (R)
- VARCHARACTER (R)
- VARIABLES
- VARYING (R)
- VCPU
- VIEW
- VIRTUAL (R)
- VISIBLE
w
- WAIT
- WARNINGS
- WEEK
- WEIGHT_STRING
- WHEN (R)
- WHERE (R)
- WHILE (R)
- WINDOW (R)
- WITH (R)
- WITHOUT
- WORK
- WRAPPER
- WRITE (R)

X
- X509
- XA
- XID
- XML
- XOR (R)

Y
- YEAR
- YEAR_MONTH (R)

Z
- ZEROFILL (R)
- ZONE

\section*{MySQL 8.4 New Keywords and Reserved Words}

The following list shows the keywords and reserved words that are added in MySQL 8.4, compared to MySQL 8.0. Reserved keywords are marked with (R).
$\mathrm{A}|\mathrm{B}| \mathrm{G}|\mathrm{L}| \mathrm{M}|\mathrm{P}| \mathrm{Q}|\mathrm{S}| \mathrm{T}$
A
- AUTO

B
- BERNOULLI

G
- GTIDS

L
- LOG

M
- MANUAL (R)

P
- PARALLEL (R)
- PARSE_TREE

Q
- QUALIFY (R)

S
- S3

T
- TABLESAMPLE (R)

\section*{MySQL 8.4 Removed Keywords and Reserved Words}

The following list shows the keywords and reserved words that are removed in MySQL 8.4, compared to MySQL 8.0. Reserved keywords are marked with (R).

G | M
G
- GET_MASTER_PUBLIC_KEY

M
- MASTER_AUTO_POSITION
- MASTER_BIND (R)
- MASTER_COMPRESSION_ALGORITHMS
- MASTER_CONNECT_RETRY
- MASTER_DELAY
- MASTER_HEARTBEAT_PERIOD
- MASTER_HOST
- MASTER_LOG_FILE
- MASTER_LOG_POS
- MASTER_PASSWORD
- MASTER_PORT
- MASTER_PUBLIC_KEY_PATH
- MASTER_RETRY_COUNT
- MASTER_SSL
- MASTER_SSL_CA
- MASTER_SSL_CAPATH
- MASTER_SSL_CERT
- MASTER_SSL_CIPHER
- MASTER_SSL_CRL
- MASTER_SSL_CRLPATH
- MASTER_SSL_KEY
- MASTER_SSL_VERIFY_SERVER_CERT (R)
- MASTER_TLS_CIPHERSUITES
- MASTER_TLS_VERSION
- MASTER_USER
- MASTER_ZSTD_COMPRESSION_LEVEL

\section*{MySQL 8.4 Restricted Keywords}

Some MySQL keywords are not reserved but even so must be quoted in certain circumstances. This section provides listings of these keywords.
- Keywords which must be quoted when used as labels
- Keywords which must be quoted when used as role names
- Keywords which must be quoted when used as labels or role names

\section*{Keywords which must be quoted when used as labels}

The keywords listed here must be quoted when used as labels in MySQL stored programs:
A|B|C|D|E|F|H|I|L|N|P|R|S|T|U|X
A
- ASCII

B
- BEGIN
- BYTE

C
- CACHE
- CHARSET
- CHECKSUM
- CLONE
- COMMENT
- COMMIT
- CONTAINS

D
- DEALLOCATE
- DO

E
- END

F
- FLUSH
- FOLLOWS

H
- HANDLER
- HELP

I
- IMPORT
- INSTALL

L
- LANGUAGE

N
- NO

P
- PRECEDES
- PREPARE

R
- REPAIR
- RESET
- ROLLBACK

S
- SAVEPOINT
- SIGNED
- SLAVE
- START
- STOP

T
- TRUNCATE

U
- UNICODE
- UNINSTALL

X
- XA

\section*{Keywords which must be quoted when used as role names}

The keywords listed here must be quoted when used as names of roles:
- EVENT
- FILE
- NONE
- PROCESS
- PROXY
- RELOAD
- REPLICATION
- RESOURCE
- SUPER

\section*{Keywords which must be quoted when used as labels or role names}

The keywords listed here must be quoted when used as labels in stored programs, or as names of roles:
- EXECUTE
- RESTART
- SHUTDOWN

\subsection*{11.4 User-Defined Variables}

You can store a value in a user-defined variable in one statement and refer to it later in another statement. This enables you to pass values from one statement to another.

User variables are written as @var_name, where the variable name var_name consists of alphanumeric characters, ., ,, and $\$$. A user variable name can contain other characters if you quote it as a string or identifier (for example, @ 'my-var', @"my-var", or @ˋmy-varˋ).

User-defined variables are session specific. A user variable defined by one client cannot be seen or used by other clients. (Exception: A user with access to the Performance Schema
user_variables_by_thread table can see all user variables for all sessions.) All variables for a given client session are automatically freed when that client exits.

User variable names are not case-sensitive. Names have a maximum length of 64 characters.
One way to set a user-defined variable is by issuing a SET statement:
```
SET @var_name = expr [, @var_name = expr] ...
```


For SET, either = or := can be used as the assignment operator.
User variables can be assigned a value from a limited set of data types: integer, decimal, floating-point, binary or nonbinary string, or NULL value. Assignment of decimal and real values does not preserve the precision or scale of the value. A value of a type other than one of the permissible types is converted to a permissible type. For example, a value having a temporal or spatial data type is converted to a binary string. A value having the JSON data type is converted to a string with a character set of utf8mb4 and a collation of utf8mb4_bin.

If a user variable is assigned a nonbinary (character) string value, it has the same character set and collation as the string. The coercibility of user variables is implicit. (This is the same coercibility as for table column values.)

Hexadecimal or bit values assigned to user variables are treated as binary strings. To assign a hexadecimal or bit value as a number to a user variable, use it in numeric context. For example, add 0 or use CAST(... AS UNSIGNED):
```
mysql> SET @v1 = X'41';
mysql> SET @v2 = X'41'+0;
mysql> SET @v3 = CAST(X'41' AS UNSIGNED);
mysql> SELECT @v1, @v2, @v3;
+------+------+------+
| @v1 | @v2 | @v3 |
+------+------+------+
| A | 65 | 65 |
+------+------+------+
mysql> SET @v1 = b'1000001';
mysql> SET @v2 = b'1000001'+0;
mysql> SET @v3 = CAST(b'1000001' AS UNSIGNED);
mysql> SELECT @v1, @v2, @v3;
+------+------+------+
| @v1 | @v2 | @v3 |
+------+-------+------+
| A | 65 | 65 |
+------+------+------+
```


If the value of a user variable is selected in a result set, it is returned to the client as a string.
If you refer to a variable that has not been initialized, it has a value of NULL and a type of string.
A reference to a user variable in a prepared statement has its type determined when the statement is first prepared, and retains this type each time the statement is executed thereafter. Similarly, the type of a user variable employed in a statement within a stored procedure is determined the first time the stored procedure is invoked, and retains this type with each subsequent invocation.

User variables may be used in most contexts where expressions are permitted. This does not currently include contexts that explicitly require a literal value, such as in the LIMIT clause of a SELECT statement, or the IGNORE $N$ LINES clause of a LOAD DATA statement.

Previous releases of MySQL made it possible to assign a value to a user variable in statements other than SET. This functionality is supported in MySQL 8.4 for backward compatibility but is subject to removal in a future release of MySQL.

When making an assignment in this way, you must use : = as the assignment operator; = is treated as the comparison operator in statements other than SET.

The order of evaluation for expressions involving user variables is undefined. For example, there is no guarantee that SELECT @a, @a:=@a+1 evaluates @a first and then performs the assignment.

In addition, the default result type of a variable is based on its type at the beginning of the statement. This may have unintended effects if a variable holds a value of one type at the beginning of a statement in which it is also assigned a new value of a different type.

To avoid problems with this behavior, either do not assign a value to and read the value of the same variable within a single statement, or else set the variable to $0,0.0$, or ' ' to define its type before you use it.

HAVING, GROUP BY, and ORDER BY, when referring to a variable that is assigned a value in the select expression list do not work as expected because the expression is evaluated on the client and thus can use stale column values from a previous row.

User variables are intended to provide data values. They cannot be used directly in an SQL statement as an identifier or as part of an identifier, such as in contexts where a table or database name is expected, or as a reserved word such as SELECT. This is true even if the variable is quoted, as shown in the following example:
```
mysql> SELECT c1 FROM t;
+----+
| c1 |
+----+
| 0 |
+----+
| 1 |
+----+
2 rows in set (0.00 sec)
mysql> SET @col = "c1";
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @col FROM t;
+------+
| @col |
+------+
| c1 |
+------+
1 row in set (0.00 sec)
mysql> SELECT ˋ@colˋ FROM t;
ERROR 1054 (42S22): Unknown column '@col' in 'field list'
mysql> SET @col = "ˋc1ˋ";
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @col FROM t;
+------+
| @col |
+------+
| ˋc1ˋ |
+------+
1 row in set (0.00 sec)
```


An exception to this principle that user variables cannot be used to provide identifiers, is when you are constructing a string for use as a prepared statement to execute later. In this case, user variables can be used to provide any part of the statement. The following example illustrates how this can be done:
```
mysql> SET @c = "c1";
Query OK, 0 rows affected (0.00 sec)
mysql> SET @s = CONCAT("SELECT ", @c, " FROM t");
Query OK, 0 rows affected (0.00 sec)
mysql> PREPARE stmt FROM @s;
Query OK, 0 rows affected (0.04 sec)
Statement prepared
```

```
mysql> EXECUTE stmt;
+----+
| c1 |
+----+
| 0 |
+----+
| 1 |
+----+
2 rows in set (0.00 sec)
mysql> DEALLOCATE PREPARE stmt;
Query OK, 0 rows affected (0.00 sec)
```


See Section 15.5, "Prepared Statements", for more information.
A similar technique can be used in application programs to construct SQL statements using program variables, as shown here using PHP 5:
```
<?php
    $mysqli = new mysqli("localhost", "user", "pass", "test");
    if( mysqli_connect_errno() )
        die("Connection failed: %s\n", mysqli_connect_error());
    $col = "c1";
    $query = "SELECT $col FROM t";
    $result = $mysqli->query($query);
    while($row = $result->fetch_assoc())
    {
        echo "<p>" . $row["$col"] . "</p>\n";
    }
    $result->close();
    $mysqli->close();
?>
```


Assembling an SQL statement in this fashion is sometimes known as "Dynamic SQL".

\subsection*{11.5 Expressions}

This section lists the grammar rules that expressions must follow in MySQL and provides additional information about the types of terms that may appear in expressions.
- Expression Syntax
- Expression Term Notes
- Temporal Intervals

\section*{Expression Syntax}

The following grammar rules define expression syntax in MySQL. The grammar shown here is based on that given in the sql/sql_yacc.yy file of MySQL source distributions. For additional information about some of the expression terms, see Expression Term Notes.
```
expr:
        expr OR expr
    | expr || expr
    | expr XOR expr
    | expr AND expr
    | expr && expr
    | NOT expr
```

```
    | ! expr
    | boolean_primary IS [NOT] {TRUE | FALSE | UNKNOWN}
    | boolean_primary
boolean_primary:
        boolean_primary IS [NOT] NULL
    | boolean_primary <=> predicate
    | boolean_primary comparison_operator predicate
    | boolean_primary comparison_operator {ALL | ANY} (subquery)
    | predicate
comparison_operator: = | >= | > | <= | < | <> | !=
predicate:
        bit_expr [NOT] IN (subquery)
    | bit_expr [NOT] IN (expr [, expr] ...)
    | bit_expr [NOT] BETWEEN bit_expr AND predicate
    | bit_expr SOUNDS LIKE bit_expr
    | bit_expr [NOT] LIKE simple_expr [ESCAPE simple_expr]
    | bit_expr [NOT] REGEXP bit_expr
    | bit_expr
bit_expr:
        bit_expr | bit_expr
    | bit_expr & bit_expr
    | bit_expr << bit_expr
    | bit_expr >> bit_expr
    | bit_expr + bit_expr
    | bit_expr - bit_expr
    | bit_expr * bit_expr
    | bit_expr / bit_expr
    | bit_expr DIV bit_expr
    | bit_expr MOD bit_expr
    | bit_expr % bit_expr
    | bit_expr ^ bit_expr
    | bit_expr + interval_expr
    | bit_expr - interval_expr
    | simple_expr
simple_expr:
        literal
    | identifier
    | function_call
    | simple_expr COLLATE collation_name
    | param_marker
    | variable
    | simple_expr || simple_expr
    | + simple_expr
    | - simple_expr
    | ~ simple_expr
    | ! simple_expr
    | BINARY simple_expr
        (expr [, expr] ...)
        ROW (expr, expr [, expr] ...)
        (subquery)
        EXISTS (subquery)
        {identifier expr}
        match_expr
        case_expr
        interval_expr
```


For operator precedence, see Section 14.4.1, "Operator Precedence". The precedence and meaning of some operators depends on the SQL mode:
- By default, | | is a logical OR operator. With PIPES_AS_CONCAT enabled, | | is string concatenation, with a precedence between ^ and the unary operators.
- By default, ! has a higher precedence than NOT. With HIGH_NOT_PRECEDENCE enabled, ! and NOT have the same precedence.

\section*{See Section 7.1.11, "Server SQL Modes".}

\section*{Expression Term Notes}

For literal value syntax, see Section 11.1, "Literal Values".
For identifier syntax, see Section 11.2, "Schema Object Names".
Variables can be user variables, system variables, or stored program local variables or parameters:
- User variables: Section 11.4, "User-Defined Variables"
- System variables: Section 7.1.9, "Using System Variables"
- Stored program local variables: Section 15.6.4.1, "Local Variable DECLARE Statement"
- Stored program parameters: Section 15.1.17, "CREATE PROCEDURE and CREATE FUNCTION Statements"
param_marker is ? as used in prepared statements for placeholders. See Section 15.5.1, "PREPARE Statement".
(subquery) indicates a subquery that returns a single value; that is, a scalar subquery. See Section 15.2.15.1, "The Subquery as Scalar Operand".
\{identifier expr\} is ODBC escape syntax and is accepted for ODBC compatibility. The value is expr. The \{ and \} curly braces in the syntax should be written literally; they are not metasyntax as used elsewhere in syntax descriptions.
match_expr indicates a MATCH expression. See Section 14.9, "Full-Text Search Functions".
case_expr indicates a CASE expression. See Section 14.5, "Flow Control Functions".
interval_expr represents a temporal interval. See Temporal Intervals.

\section*{Temporal Intervals}
interval_expr in expressions represents a temporal interval. Intervals have this syntax:
INTERVAL expr unit
expr represents a quantity. unit represents the unit for interpreting the quantity; it is a specifier such as HOUR, DAY, or WEEK. The INTERVAL keyword and the unit specifier are not case-sensitive.

The following table shows the expected form of the expr argument for each unit value.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 11.2 Temporal Interval Expression and Unit Arguments}
\begin{tabular}{|l|l|}
\hline unit Value & Expected expr Format \\
\hline MICROSECOND & MICROSECONDS \\
\hline SECOND & SECONDS \\
\hline MINUTE & MINUTES \\
\hline HOUR & HOURS \\
\hline DAY & DAYS \\
\hline WEEK & WEEKS \\
\hline MONTH & MONTHS \\
\hline QUARTER & QUARTERS \\
\hline YEAR & YEARS \\
\hline SECOND_MICROSECOND & 'SECONDS.MICROSECONDS' \\
\hline MINUTE_MICROSECOND & 'MINUTES: SECONDS.MICROSECONDS ' \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline unit Value & Expected expr Format \\
\hline MINUTE_SECOND & 'MINUTES:SECONDS' \\
\hline HOUR_MICROSECOND & 'HOURS:MINUTES:SECONDS.MICROSECONDS' \\
\hline HOUR_SECOND & 'HOURS:MINUTES:SECONDS' \\
\hline HOUR_MINUTE & 'HOURS:MINUTES' \\
\hline DAY_MICROSECOND & \begin{tabular}{l}
'DAYS \\
HOURS:MINUTES:SECONDS.MICROSECONDS'
\end{tabular} \\
\hline DAY_SECOND & 'DAYS HOURS:MINUTES:SECONDS' \\
\hline DAY_MINUTE & 'DAYS HOURS:MINUTES' \\
\hline DAY_HOUR & 'DAYS HOURS' \\
\hline YEAR_MONTH & 'YEARS-MONTHS ' \\
\hline
\end{tabular}

MySQL permits any punctuation delimiter in the expr format. Those shown in the table are the suggested delimiters.

Temporal intervals are used for certain functions, such as DATE_ADD( ) and DATE_SUB( ):
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


Temporal arithmetic also can be performed in expressions using INTERVAL together with the + or operator:
```
date + INTERVAL expr unit
date - INTERVAL expr unit
```


INTERVAL expr unit is permitted on either side of the + operator if the expression on the other side is a date or datetime value. For the - operator, INTERVAL expr unit is permitted only on the right side, because it makes no sense to subtract a date or datetime value from an interval.
```
mysql> SELECT '2018-12-31 23:59:59' + INTERVAL 1 SECOND;
    -> '2019-01-01 00:00:00'
mysql> SELECT INTERVAL 1 DAY + '2018-12-31';
    -> '2019-01-01'
mysql> SELECT '2025-01-01' - INTERVAL 1 SECOND;
    -> '2024-12-31 23:59:59'
```


The EXTRACT( ) function uses the same kinds of unit specifiers as DATE_ADD( ) or DATE_SUB( ), but extracts parts from the date rather than performing date arithmetic:
```
mysql> SELECT EXTRACT(YEAR FROM '2019-07-02');
```

```
-> 2019
mysql> SELECT EXTRACT(YEAR_MONTH FROM '2019-07-02 01:02:03');
    -> 201907
```


Temporal intervals can be used in CREATE EVENT statements:
```
CREATE EVENT myevent
    ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 1 HOUR
    DO
        UPDATE myschema.mytable SET mycol = mycol + 1;
```


If you specify an interval value that is too short (does not include all the interval parts that would be expected from the unit keyword), MySQL assumes that you have left out the leftmost parts of the interval value. For example, if you specify a unit of DAY_SECOND, the value of expr is expected to have days, hours, minutes, and seconds parts. If you specify a value like ${ }^{\prime} 1: 10$ ', MySQL assumes that the days and hours parts are missing and the value represents minutes and seconds. In other words, ' $1: 10$ ' DAY_SECOND is interpreted in such a way that it is equivalent to ' $1: 10$ ' MINUTE_SECOND. This is analogous to the way that MySQL interprets TIME values as representing elapsed time rather than as a time of day.
expr is treated as a string, so be careful if you specify a nonstring value with INTERVAL. For example, with an interval specifier of HOUR_MINUTE, '6/4' is treated as 6 hours, four minutes, whereas 6/4 evaluates to 1.5000 and is treated as 1 hour, 5000 minutes:
```
mysql> SELECT '6/4', 6/4;
    -> 1.5000
mysql> SELECT DATE_ADD('2019-01-01', INTERVAL '6/4' HOUR_MINUTE);
    -> '2019-01-01 06:04:00'
mysql> SELECT DATE_ADD('2019-01-01', INTERVAL 6/4 HOUR_MINUTE);
    -> '2019-01-04 12:20:00'
```


To ensure interpretation of the interval value as you expect, a CAST( ) operation may be used. To treat 6/4 as 1 hour, 5 minutes, cast it to a DECIMAL value with a single fractional digit:
```
mysql> SELECT CAST(6/4 AS DECIMAL(3,1));
    -> 1.5
mysql> SELECT DATE_ADD('1970-01-01 12:00:00',
    -> INTERVAL CAST(6/4 AS DECIMAL(3,1)) HOUR_MINUTE);
        -> '1970-01-01 13:05:00'
```


If you add to or subtract from a date value something that contains a time part, the result is automatically converted to a datetime value:
```
mysql> SELECT DATE_ADD('2023-01-01', INTERVAL 1 DAY);
    -> '2023-01-02'
mysql> SELECT DATE_ADD('2023-01-01', INTERVAL 1 HOUR);
    -> '2023-01-01 01:00:00'
```


If you add MONTH, YEAR_MONTH, or YEAR and the resulting date has a day that is larger than the maximum day for the new month, the day is adjusted to the maximum days in the new month:
```
mysql> SELECT DATE_ADD('2019-01-30', INTERVAL 1 MONTH);
    -> '2019-02-28'
```


Date arithmetic operations require complete dates and do not work with incomplete dates such as '2016-07-00' or badly malformed dates:
```
mysql> SELECT DATE_ADD('2016-07-00', INTERVAL 1 DAY);
    -> NULL
mysql> SELECT '2005-03-32' + INTERVAL 1 MONTH;
    -> NULL
```


\subsection*{11.6 Query Attributes}

The most visible part of an SQL statement is the text of the statement. Clients can also define query attributes that apply to the next statement sent to the server for execution:
- Attributes are defined prior to sending the statement.
- Attributes exist until statement execution ends, at which point the attribute set is cleared.
- While attributes exist, they can be accessed on the server side.

Examples of the ways query attributes may be used:
- A web application produces pages that generate database queries, and for each query must track the URL of the page that generated it.
- An application passes extra processing information with each query, for use by a plugin such as an audit plugin or query rewrite plugin.

MySQL supports these capabilities without the use of workarounds such as specially formatted comments included in query strings. The remainder of this section describes how to use query attribute support, including the prerequisites that must be satisfied.
- Defining and Accessing Query Attributes
- Prerequisites for Using Query Attributes
- Query Attribute Loadable Functions

\section*{Defining and Accessing Query Attributes}

Applications that use the MySQL C API define query attributes by calling the mysql_bind_param( ) function. See mysql_bind_param(). Other MySQL connectors may also provide query-attribute support. See the documentation for individual connectors.

The mysql client has a query_attributes command that enables defining up to 32 pairs of attribute names and values. See Section 6.5.1.2, "mysql Client Commands".

Query attribute names are transmitted using the character set indicated by the character_set_client system variable.

To access query attributes within SQL statements for which attributes have been defined, install the query_attributes component as described in Prerequisites for Using Query Attributes. The component implements a mysql_query_attribute_string() loadable function that takes an attribute name argument and returns the attribute value as a string, or NULL if the attribute does not exist. See Query Attribute Loadable Functions.

The following examples use the mysql client query_attributes command to define attribute name/ value pairs, and the mysql_query_attribute_string() function to access attribute values by name.

This example defines two attributes named n 1 and n 2 . The first SELECT shows how to retrieve those attributes, and also demonstrates that retrieving a nonexistent attribute (n3) returns NULL. The second SELECT shows that attributes do not persist across statements.
```
mysql> query_attributes n1 v1 n2 v2;
mysql> SELECT
    mysql_query_attribute_string('n1') AS 'attr 1',
    mysql_query_attribute_string('n2') AS 'attr 2',
    mysql_query_attribute_string('n3') AS 'attr 3';
+--------+--------+--------+
| attr 1 | attr 2 | attr 3 |
+--------+---------+--------+
| v1 | v2 | NULL |
+--------+---------+--------+
mysql> SELECT
    mysql_query_attribute_string('n1') AS 'attr 1',
```

```
    mysql_query_attribute_string('n2') AS 'attr 2';
+--------+--------+
| attr 1 | attr 2 |
+--------+---------+
| NULL | NULL |
+--------+---------+
```


As shown by the second SELECT statement, attributes defined prior to a given statement are available only to that statement and are cleared after the statement executes. To use an attribute value across multiple statements, assign it to a variable. The following example shows how to do this, and illustrates that attribute values are available in subsequent statements by means of the variables, but not by calling mysql_query_attribute_string():
```
mysql> query_attributes n1 v1 n2 v2;
mysql> SET
    @attr1 = mysql_query_attribute_string('n1'),
    @attr2 = mysql_query_attribute_string('n2');
mysql> SELECT
    @attr1, mysql_query_attribute_string('n1') AS 'attr 1',
    @attr2, mysql_query_attribute_string('n2') AS 'attr 2';
+--------+--------+--------+--------+
| @attr1 | attr 1 | @attr2 | attr 2 |
+--------+---------+--------+--------+
| v1 | NULL | v2 | NULL |
+--------+---------+--------+--------+
```


Attributes can also be saved for later use by storing them in a table:
```
mysql> CREATE TABLE t1 (c1 CHAR(20), c2 CHAR(20));
mysql> query_attributes n1 v1 n2 v2;
mysql> INSERT INTO t1 (c1, c2) VALUES(
            mysql_query_attribute_string('n1'),
            mysql_query_attribute_string('n2')
        );
mysql> SELECT * FROM t1;
+------+-------+
| c1 | c2 |
+------+-------+
| v1 | v2 |
+------+-------+
```


Query attributes are subject to these limitations and restrictions:
- If multiple attribute-definition operations occur prior to sending a statement to the server for execution, the most recent definition operation applies and replaces attributes defined in earlier operations.
- If multiple attributes are defined with the same name, attempts to retrieve the attribute value have an undefined result.
- An attribute defined with an empty name cannot be retrieved by name.
- Attributes are not available to statements prepared with PREPARE.
- The mysql_query_attribute_string() function cannot be used in DDL statements.
- Attributes are not replicated. Statements that invoke the mysql_query_attribute_string() function will not get the same value on all servers.

\section*{Prerequisites for Using Query Attributes}

To access query attributes within SQL statements for which attributes have been defined, the query_attributes component must be installed. Do so using this statement:

INSTALL COMPONENT "file://component_query_attributes";
Component installation is a one-time operation that need not be done per server startup. INSTALL COMPONENT loads the component, and also registers it in the mysql.component system table to cause it to be loaded during subsequent server startups.

The query_attributes component accesses query attributes to implement a mysql_query_attribute_string() function. See Section 7.5.4, "Query Attribute Components".

To uninstall the query_attributes component, use this statement:
UNINSTALL COMPONENT "file://component_query_attributes";
UNINSTALL COMPONENT unloads the component, and unregisters it from the mysql.component system table to cause it not to be loaded during subsequent server startups.

Because installing and uninstalling the query_attributes component installs and uninstalls the mysql_query_attribute_string() function that the component implements, it is not necessary to use CREATE FUNCTION or DROP FUNCTION to do so.

\section*{Query Attribute Loadable Functions}
- mysql_query_attribute_string(name)

Applications can define attributes that apply to the next query sent to the server. The mysql_query_attribute_string() function returns an attribute value as a string, given the attribute name. This function enables a query to access and incorporate values of the attributes that apply to it.
mysql_query_attribute_string() is installed by installing the query_attributes component. See Section 11.6, "Query Attributes", which also discusses the purpose and use of query attributes.

Arguments:
- name: The attribute name.

Return value:
Returns the attribute value as a string for success, or NULL if the attribute does not exist.
Example:
The following example uses the mysql client query_attributes command to define query attributes that can be retrieved by mysql_query_attribute_string(). The SELECT shows that retrieving a nonexistent attribute (n3) returns NULL.
```
mysql> query_attributes n1 v1 n2 v2;
mysql> SELECT
    -> mysql_query_attribute_string('n1') AS 'attr 1',
    -> mysql_query_attribute_string('n2') AS 'attr 2',
    -> mysql_query_attribute_string('n3') AS 'attr 3';
+--------+---------+--------+
| attr 1 | attr 2 | attr 3 |
+--------+---------+--------+
| v1 | v2 | NULL |
+--------+---------+--------+
```


\subsection*{11.7 Comments}

MySQL Server supports three comment styles:
- From a \# character to the end of the line.
- From a - - sequence to the end of the line. In MySQL, the - - (double-dash) comment style requires the second dash to be followed by at least one whitespace or control character, such as a space or tab. This syntax differs slightly from standard SQL comment syntax, as discussed in Section 1.7.2.4, "'--' as the Start of a Comment".
- From a /* sequence to the following */ sequence, as in the C programming language. This syntax enables a comment to extend over multiple lines because the beginning and closing sequences need not be on the same line.

The following example demonstrates all three comment styles:
```
mysql> SELECT 1+1; # This comment continues to the end of line
mysql> SELECT 1+1; -- This comment continues to the end of line
mysql> SELECT 1 /* this is an in-line comment */ + 1;
mysql> SELECT 1+
/*
this is a
multiple-line comment
*/
1;
```


Nested comments are not supported, and are deprecated; expect them to be removed in a future MySQL release. (Under some conditions, nested comments might be permitted, but usually are not, and users should avoid them.)

MySQL Server supports certain variants of C-style comments. These enable you to write code that includes MySQL extensions, but is still portable, by using comments of the following form:
```
/*! MySQL-specific code */
```


In this case, MySQL Server parses and executes the code within the comment as it would any other SQL statement, but other SQL servers should ignore the extensions. For example, MySQL Server recognizes the STRAIGHT_JOIN keyword in the following statement, but other servers should not:
```
SELECT /*! STRAIGHT_JOIN */ col1 FROM table1,table2 WHERE ...
```


If you add a version number after the ! character, the syntax within the comment is executed only if the MySQL version is greater than or equal to the specified version number. The KEY_BLOCK_SIZE keyword in the following comment is executed only by servers from MySQL 5.1.10 or higher:

CREATE TABLE t1(a INT, KEY (a)) /*!50110 KEY_BLOCK_SIZE=1024 */;
The version number uses the format $M m m r r$, where $M$ is a major version, $m m$ is a two-digit minor version, and $r r$ is a two-digit release number. For example: In a statement to be run only by a MySQL server version 8.4.9 or later, use 80409 in the comment.

In MySQL 8.4, the version number can also optionally be comprised of six digits in MMmmrr format, where $M M$ is a two-digit major version, and $m m$ and $r r$ are the two-digit minor version and two-digit release numbers, respectively.

The version number should be followed by at least one whitespace character (or the end of the comment). If the comment begins with six digits followed by whitespace, this is interpreted as a sixdigit version number. Otherwise, if it begins with at least five digits, these are interpreted as a five-digit version number (and any remaining characters ignored for this purpose); if it begins with fewer than five digits, the comment is handled as a normal MySQL comment.

The comment syntax just described applies to how the mysqld server parses SQL statements. The mysql client program also performs some parsing of statements before sending them to the server. (It does this to determine statement boundaries within a multiple-statement input line.) For information about differences between the server and mysql client parsers, see Section 6.5.1.6, "mysql Client Tips".

Comments in / * ! $12345 \ldots$ */ format are not stored on the server. If this format is used to comment stored programs, the comments are not retained in the program body.

Another variant of C-style comment syntax is used to specify optimizer hints. Hint comments include a + character following the /* comment opening sequence. Example:

SELECT /*+ BKA(t1) */ FROM ... ;
For more information, see Section 10.9.3, "Optimizer Hints".
The use of short-form mysql commands such as \C within multiple-line /* . . . */ comments is not supported. Short-form commands do work within single-line /*! . . . */ version comments, as do / *+ . . . */ optimizer-hint comments, which are stored in object definitions. If there is a concern that optimizer-hint comments may be stored in object definitions so that dump files when reloaded with mysql would result in execution of such commands, either invoke mysql with the --binary-mode option or use a reload client other than mysql.

