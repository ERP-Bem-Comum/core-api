\section*{Regular Expression Function and Operator Descriptions}
- expr NOT REGEXP pat, expr NOT RLIKE pat

This is the same as NOT (expr REGEXP pat).
- expr REGEXP pat, expr RLIKE pat

Returns 1 if the string expr matches the regular expression specified by the pattern pat, 0 otherwise. If expr or pat is NULL, the return value is NULL.

REGEXP and RLIKE are synonyms for REGEXP_LIKE().
For additional information about how matching occurs, see the description for REGEXP_LIKE( ).
```
mysql> SELECT 'Michael!' REGEXP '.*';
+--------------------------+
| 'Michael!' REGEXP '.*' |
+-------------------------+
| 1 |
+------------------------+
mysql> SELECT 'new*\n*line' REGEXP 'new\\*.\\*line';
+----------------------------------------+
| 'new*\n*line' REGEXP 'new\\*.\\*line' |
```

```
+-----------------------------------------
| 0 |
+----------------------------------------+
mysql> SELECT 'a' REGEXP '^[a-d]';
+-----------------------+
| 'a' REGEXP '^[a-d]' |
+-----------------------+
| 1 |
+-----------------------+
```

- REGEXP_INSTR(expr, pat[, pos[, occurrence[, return_option[, match_type]]]])

Returns the starting index of the substring of the string expr that matches the regular expression specified by the pattern pat, 0 if there is no match. If expr or pat is NULL, the return value is NULL. Character indexes begin at 1 .

REGEXP_INSTR( ) takes these optional arguments:
- pos: The position in expr at which to start the search. If omitted, the default is 1 .
- occurrence: Which occurrence of a match to search for. If omitted, the default is 1 .
- return_option: Which type of position to return. If this value is 0, REGEXP_INSTR( ) returns the position of the matched substring's first character. If this value is 1, REGEXP_INSTR( ) returns the position following the matched substring. If omitted, the default is 0 .
- match_type: A string that specifies how to perform matching. The meaning is as described for REGEXP_LIKE().

For additional information about how matching occurs, see the description for REGEXP_LIKE( ).
```
mysql> SELECT REGEXP_INSTR('dog cat dog', 'dog');
+--------------------------------------+
| REGEXP_INSTR('dog cat dog', 'dog') |
+--------------------------------------+
| 1 |
+--------------------------------------+
mysql> SELECT REGEXP_INSTR('dog cat dog', 'dog', 2);
+-----------------------------------------+
| REGEXP_INSTR('dog cat dog', 'dog', 2) |
+----------------------------------------+
| 9 |
+----------------------------------------+
mysql> SELECT REGEXP_INSTR('aa aaa aaaa', 'a{2}');
+---------------------------------------+
| REGEXP_INSTR('aa aaa aaaa', 'a{2}') |
+---------------------------------------+
| 1 |
+---------------------------------------+
mysql> SELECT REGEXP_INSTR('aa aaa aaaa', 'a{4}');
+---------------------------------------+
| REGEXP_INSTR('aa aaa aaaa', 'a{4}') |
+--------------------------------------+
| 8 |
+----------------------------------------
```

- REGEXP_LIKE(expr, pat[, match_type])

Returns 1 if the string expr matches the regular expression specified by the pattern pat, 0 otherwise. If expr or pat is NULL, the return value is NULL.

The pattern can be an extended regular expression, the syntax for which is discussed in Regular Expression Syntax. The pattern need not be a literal string. For example, it can be specified as a string expression or table column.

The optional match_type argument is a string that may contain any or all the following characters specifying how to perform matching:
- c: Case-sensitive matching.
- i: Case-insensitive matching.
- m: Multiple-line mode. Recognize line terminators within the string. The default behavior is to match line terminators only at the start and end of the string expression.
- n : The . character matches line terminators. The default is for . matching to stop at the end of a line.
- u: Unix-only line endings. Only the newline character is recognized as a line ending by the ., , and $\$$ match operators.

If characters specifying contradictory options are specified within match_type, the rightmost one takes precedence.

By default, regular expression operations use the character set and collation of the expr and pat arguments when deciding the type of a character and performing the comparison. If the arguments have different character sets or collations, coercibility rules apply as described in Section 12.8.4, "Collation Coercibility in Expressions". Arguments may be specified with explicit collation indicators to change comparison behavior.
```
mysql> SELECT REGEXP_LIKE('CamelCase', 'CAMELCASE');
+-----------------------------------------+
| REGEXP_LIKE('CamelCase', 'CAMELCASE') |
+------------------------------------------
| 1 |
+----------------------------------------+
mysql> SELECT REGEXP_LIKE('CamelCase', 'CAMELCASE' COLLATE utf8mb4_0900_as_cs);
+------------------------------------------------------------------------
| REGEXP_LIKE('CamelCase', 'CAMELCASE' COLLATE utf8mb4_0900_as_cs) |
+----------------------------------------------------------------------
| 0 |
+---------------------------------------------------------------------
```

match_type may be specified with the c or i characters to override the default case sensitivity. Exception: If either argument is a binary string, the arguments are handled in case-sensitive fashion as binary strings, even if match_type contains the i character.

\section*{Note}

MySQL uses C escape syntax in strings (for example, \n to represent the newline character). If you want your expr or pat argument to contain a literal \\, you must double it. (Unless the NO_BACKSLASH_ESCAPES SQL mode is enabled, in which case no escape character is used.)
```
mysql> SELECT REGEXP_LIKE('Michael!', '.*');
+---------------------------------+
| REGEXP_LIKE('Michael!', '.*') |
+--------------------------------+
| 1 |
+--------------------------------+
```

```
mysql> SELECT REGEXP_LIKE('new*\n*line', 'new\\*.\\*line');
+------------------------------------------------
| REGEXP_LIKE('new*\n*line', 'new\\*.\\*line') |
+-------------------------------------------------
| 0 |
mysql> SELECT REGEXP_LIKE('a', '^[a-d]');
+------------------------------+
| REGEXP_LIKE('a', '^[a-d]') |
+-----------------------------+
| 1 |
+-----------------------------+
mysql> SELECT REGEXP_LIKE('abc', 'ABC');
+-----------------------------+
| REGEXP_LIKE('abc', 'ABC') |
+-----------------------------+
| 1 |
+-----------------------------+
mysql> SELECT REGEXP_LIKE('abc', 'ABC', 'c');
+----------------------------------+
| REGEXP_LIKE('abc', 'ABC', 'c') |
+---------------------------------+
| 0 |
+---------------------------------+
```


REGEXP_REPLACE(expr, pat, repl[, pos[, occurrence[, match_type]]])
Replaces occurrences in the string expr that match the regular expression specified by the pattern pat with the replacement string repl, and returns the resulting string. If expr, pat, or repl is NULL, the return value is NULL.

REGEXP_REPLACE ( ) takes these optional arguments:
- pos: The position in expr at which to start the search. If omitted, the default is 1 .
- occurrence: Which occurrence of a match to replace. If omitted, the default is 0 (which means "replace all occurrences").
- match_type: A string that specifies how to perform matching. The meaning is as described for REGEXP_LIKE().

The result returned by this function uses the character set and collation of the expression searched for matches.

For additional information about how matching occurs, see the description for REGEXP_LIKE( ).
```
mysql> SELECT REGEXP_REPLACE('a b c', 'b', 'X');
+------------------------------------+
| REGEXP_REPLACE('a b c', 'b', 'X') |
+-------------------------------------+
| a X c |
+------------------------------------+
mysql> SELECT REGEXP_REPLACE('abc def ghi', '[a-z]+', 'X', 1, 3);
+-------------------------------------------------------
| REGEXP_REPLACE('abc def ghi', '[a-z]+', 'X', 1, 3) |
+-------------------------------------------------------
| abc def X |
+-------------------------------------------------------
```

- REGEXP_SUBSTR(expr, pat[, pos[, occurrence[, match_type]]])

Returns the substring of the string expr that matches the regular expression specified by the pattern pat, NULL if there is no match. If expr or pat is NULL, the return value is NULL.

REGEXP_SUBSTR( ) takes these optional arguments:
- pos: The position in expr at which to start the search. If omitted, the default is 1 .
- occurrence: Which occurrence of a match to search for. If omitted, the default is 1 .
- match_type: A string that specifies how to perform matching. The meaning is as described for REGEXP_LIKE().

The result returned by this function uses the character set and collation of the expression searched for matches.

For additional information about how matching occurs, see the description for REGEXP_LIKE( ).
```
mysql> SELECT REGEXP_SUBSTR('abc def ghi', '[a-z]+');
+------------------------------------------+
| REGEXP_SUBSTR('abc def ghi', '[a-z]+') |
+------------------------------------------+
| abc
+---------
mysql> SELECT REGEXP_SUBSTR('abc def ghi', '[a-z]+', 1, 3);
+------------------------------------------------+
| REGEXP_SUBSTR('abc def ghi', '[a-z]+', 1, 3) |
+------------------------------------------------
| ghi
+-------
```


\section*{Regular Expression Syntax}

A regular expression describes a set of strings. The simplest regular expression is one that has no special characters in it. For example, the regular expression hello matches hello and nothing else.

Nontrivial regular expressions use certain special constructs so that they can match more than one string. For example, the regular expression hello|world contains the | alternation operator and matches either the hello or world.

As a more complex example, the regular expression $\mathrm{B}[\mathrm{an}]^{*} \mathrm{~s}$ matches any of the strings Bananas, Baaaaas, Bs, and any other string starting with a B, ending with an s , and containing any number of a or n characters in between.

The following list covers some of the basic special characters and constructs that can be used in regular expressions. For information about the full regular expression syntax supported by the ICU library used to implement regular expression support, visit the International Components for Unicode web site.
- $\wedge$

Match the beginning of a string.
```
mysql> SELECT REGEXP_LIKE('fo\nfo', '^fo$'); -> 0
mysql> SELECT REGEXP_LIKE('fofo', '^fo'); -> 1
```

- \$

Match the end of a string.
```
mysql> SELECT REGEXP_LIKE('fo\no', '^fo\no$'); -> 1
mysql> SELECT REGEXP_LIKE('fo\no', '^fo$'); -> 0
```


Match any character (including carriage return and newline, although to match these in the middle of a string, the $m$ (multiple line) match-control character or the (?m) within-pattern modifier must be given).
```
mysql> SELECT REGEXP_LIKE('fofo', '^f.*$'); -> 1
mysql> SELECT REGEXP_LIKE('fo\r\nfo', '^f.*$'); -> 0
mysql> SELECT REGEXP_LIKE('fo\r\nfo', '^f.*$', 'm'); -> 1
mysql> SELECT REGEXP_LIKE('fo\r\nfo', '(?m)^f.*$'); -> 1
```

- $\mathrm{a}^{*}$

Match any sequence of zero or more a characters.
```
mysql> SELECT REGEXP_LIKE('Ban', '^Ba*n'); -> 1
mysql> SELECT REGEXP_LIKE('Baaan', '^Ba*n'); -> 1
mysql> SELECT REGEXP_LIKE('Bn', '^Ba*n'); -> 1
```

- a+

Match any sequence of one or more a characters.
```
mysql> SELECT REGEXP_LIKE('Ban', '^Ba+n'); -> 1
mysql> SELECT REGEXP_LIKE('Bn', '^Ba+n'); -> 0
```

- a?

Match either zero or one a character.
```
mysql> SELECT REGEXP_LIKE('Bn', '^Ba?n'); -> 1
mysql> SELECT REGEXP_LIKE('Ban', '^Ba?n'); -> 1
mysql> SELECT REGEXP_LIKE('Baan', '^Ba?n'); -> 0
```

- de|abc

Alternation; match either of the sequences de or abc.
```
mysql> SELECT REGEXP_LIKE('pi', 'pi|apa'); -> 1
mysql> SELECT REGEXP_LIKE('axe', 'pi|apa'); -> 0
mysql> SELECT REGEXP_LIKE('apa', 'pi|apa'); -> 1
mysql> SELECT REGEXP_LIKE('apa', '^(pi|apa)$'); -> 1
mysql> SELECT REGEXP_LIKE('pi', '^(pi|apa)$'); -> 1
mysql> SELECT REGEXP_LIKE('pix', '^(pi|apa)$'); -> 0
```

- (abc)*

Match zero or more instances of the sequence abc.
```
mysql> SELECT REGEXP_LIKE('pi', '^(pi)*$'); -> 1
mysql> SELECT REGEXP_LIKE('pip', '^(pi)*$'); -> 0
mysql> SELECT REGEXP_LIKE('pipi', '^(pi)*$'); -> 1
```

- \{1\}, \{2,3\}

Repetition; $\{n\}$ and $\{m, n\}$ notation provide a more general way of writing regular expressions that match many occurrences of the previous atom (or "piece") of the pattern. $m$ and $n$ are integers.
- $\mathrm{a}^{*}$

Can be written as a $\{0$,$\} .$
- a+

Can be written as a $\{1$,$\} .$
- a?

Can be written as $a\{0,1\}$.
To be more precise, $\mathrm{a}\{n\}$ matches exactly $n$ instances of a. $\mathrm{a}\{n$,$\} matches n$ or more instances of a. a $\{m, n\}$ matches $m$ through $n$ instances of a, inclusive. If both $m$ and $n$ are given, $m$ must be less than or equal to $n$.
```
mysql> SELECT REGEXP_LIKE('abcde', 'a[bcd]{2}e'); -> 0
mysql> SELECT REGEXP_LIKE('abcde', 'a[bcd]{3}e'); -> 1
mysql> SELECT REGEXP_LIKE('abcde', 'a[bcd]{1,10}e'); -> 1
```

- [a-dX], [^a-dX]

Matches any character that is (or is not, if ^ is used) either $\mathrm{a}, \mathrm{b}, \mathrm{c}, \mathrm{d}$ or X . A - character between two other characters forms a range that matches all characters from the first character to the second. For example, [0-9] matches any decimal digit. To include a literal ] character, it must immediately follow the opening bracket [. To include a literal - character, it must be written first or last. Any character that does not have a defined special meaning inside a [] pair matches only itself.
```
mysql> SELECT REGEXP_LIKE('aXbc', '[a-dXYZ]'); -> 1
mysql> SELECT REGEXP_LIKE('aXbc', '^[a-dXYZ]$'); -> 0
mysql> SELECT REGEXP_LIKE('aXbc', '^[a-dXYZ]+$'); -> 1
mysql> SELECT REGEXP_LIKE('aXbc', '^[^a-dXYZ]+$'); -> 0
mysql> SELECT REGEXP_LIKE('gheis', '^[^a-dXYZ]+$'); -> 1
mysql> SELECT REGEXP_LIKE('gheisa', '^[^a-dXYZ]+$'); -> 0
```

- [=character_class=]

Within a bracket expression (written using [ and ]), [=character_class=] represents an equivalence class. It matches all characters with the same collation value, including itself. For example, if o and ( + ) are the members of an equivalence class, [ $[=\mathrm{o}=]$ ], [ [=(+)=]], and $[\mathrm{o}(+)]$ are all synonymous. An equivalence class may not be used as an endpoint of a range.
- [:character_class:]

Within a bracket expression (written using [ and ]), [ : character_class: ] represents a character class that matches all characters belonging to that class. The following table lists the standard class names. These names stand for the character classes defined in the ctype (3) manual page. A particular locale may provide other class names. A character class may not be used as an endpoint of a range.

\begin{tabular}{|l|l|}
\hline Character Class Name & Meaning \\
\hline alnum & Alphanumeric characters \\
\hline alpha & Alphabetic characters \\
\hline blank & Whitespace characters \\
\hline cntrl & Control characters \\
\hline digit & Digit characters \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Character Class Name & Meaning \\
\hline graph & Graphic characters \\
\hline lower & Lowercase alphabetic characters \\
\hline print & Graphic or space characters \\
\hline punct & Punctuation characters \\
\hline space & Space, tab, newline, and carriage return \\
\hline upper & Uppercase alphabetic characters \\
\hline xdigit & Hexadecimal digit characters \\
\hline
\end{tabular}
```
mysql> SELECT REGEXP_LIKE('justalnums', '[[:alnum:]]+'); -> 1
mysql> SELECT REGEXP_LIKE('!!', '[[:alnum:]]+'); -> 0
```


To use a literal instance of a special character in a regular expression, precede it by two backslash ( $\backslash$ ) characters. The MySQL parser interprets one of the backslashes, and the regular expression library interprets the other. For example, to match the string 1+2 that contains the special + character, only the last of the following regular expressions is the correct one:
```
mysql> SELECT REGEXP_LIKE('1+2', '1+2'); -> 0
mysql> SELECT REGEXP_LIKE('1+2', '1\+2'); -> 0
mysql> SELECT REGEXP_LIKE('1+2', '1\\+2'); -> 1
```


\section*{Regular Expression Resource Control}

REGEXP_LIKE() and similar functions use resources that can be controlled by setting system variables:
- The match engine uses memory for its internal stack. To control the maximum available memory for the stack in bytes, set the regexp_stack_limit system variable.
- The match engine operates in steps. To control the maximum number of steps performed by the engine (and thus indirectly the execution time), set the regexp_time_limit system variable. Because this limit is expressed as number of steps, it affects execution time only indirectly. Typically, it is on the order of milliseconds.

\subsection*{14.8.3 Character Set and Collation of Function Results}

MySQL has many operators and functions that return a string. This section answers the question: What is the character set and collation of such a string?

For simple functions that take string input and return a string result as output, the output's character set and collation are the same as those of the principal input value. For example, UPPER ( $X$ ) returns a string with the same character string and collation as $X$. The same applies for INSTR( ), LCASE( ), LOWER( ), LTRIM( ), MID( ), REPEAT( ), REPLACE( ), REVERSE( ), RIGHT( ), RPAD( ), RTRIM( ), SOUNDEX(), SUBSTRING(), TRIM(), UCASE( ), and UPPER( ).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2213.jpg?height=112&width=99&top_left_y=2161&top_left_x=370)

\section*{Note}

The REPLACE ( ) function, unlike all other functions, always ignores the collation of the string input and performs a case-sensitive comparison.

If a string input or function result is a binary string, the string has the binary character set and collation. This can be checked by using the CHARSET( ) and COLLATION ( ) functions, both of which return binary for a binary string argument:
```
mysql> SELECT CHARSET(BINARY 'a'), COLLATION(BINARY 'a');
+-----------------------+-----------------------+
| CHARSET(BINARY 'a') | COLLATION(BINARY 'a') |
+-----------------------+------------------------
| binary | binary |
```

+---------------------+-----------------------+
For operations that combine multiple string inputs and return a single string output, the "aggregation rules" of standard SQL apply for determining the collation of the result:
- If an explicit COLLATE Y occurs, use Y.
- If explicit COLLATE Y and COLLATE Z occur, raise an error.
- Otherwise, if all collations are $Y$, use $Y$.
- Otherwise, the result has no collation.

For example, with CASE ... WHEN a THEN b WHEN b THEN c COLLATE $X$ END, the resulting collation is $X$. The same applies for UNION, ||, CONCAT( ), ELT( ), GREATEST( ), IF( ), and LEAST( ).

For operations that convert to character data, the character set and collation of the strings that result from the operations are defined by the character_set_connection and collation_connection system variables that determine the default connection character set and collation (see Section 12.4, "Connection Character Sets and Collations"). This applies only to BIN_TO_UUID( ), CAST( ), CONV( ), FORMAT( ), HEX( ), and SPACE( ).

An exception to the preceding principle occurs for expressions for virtual generated columns. In such expressions, the table character set is used for BIN_TO_UUID( ), CONV( ), or HEX( ) results, regardless of connection character set.

If there is any question about the character set or collation of the result returned by a string function, use the CHARSET( ) or COLLATION ( ) function to find out:
```
mysql> SELECT USER(), CHARSET(USER()), COLLATION(USER());
+-----------------+-----------------+--------------------
| USER() | CHARSET(USER()) | COLLATION(USER()) |
+-----------------+-----------------+--------------------
| test@localhost | utf8mb3 | utf8mb3_general_ci |
+-----------------+------------------+-------------------+
mysql> SELECT CHARSET(COMPRESS('abc')), COLLATION(COMPRESS('abc'));
+----------------------------+-----------------------------
| CHARSET(COMPRESS('abc')) | COLLATION(COMPRESS('abc')) |
+----------------------------+-----------------------------
| binary | binary |
+----------------------------+---------------------------+
```


\subsection*{14.9 Full-Text Search Functions}
```
MATCH (col1,col2,...) AGAINST (expr [search_modifier])
search_modifier:
    {
            IN NATURAL LANGUAGE MODE
        | IN NATURAL LANGUAGE MODE WITH QUERY EXPANSION
        | IN BOOLEAN MODE
        | WITH QUERY EXPANSION
    }
```


MySQL has support for full-text indexing and searching:
- A full-text index in MySQL is an index of type FULLTEXT.
- Full-text indexes can be used only with InnoDB or MyISAM tables, and can be created only for CHAR, VARCHAR, or TEXT columns.
- MySQL provides a built-in full-text ngram parser that supports Chinese, Japanese, and Korean (CJK), and an installable MeCab full-text parser plugin for Japanese. Parsing differences are outlined in Section 14.9.8, "ngram Full-Text Parser", and Section 14.9.9, "MeCab Full-Text Parser Plugin".
- A FULLTEXT index definition can be given in the CREATE TABLE statement when a table is created, or added later using ALTER TABLE or CREATE INDEX.
- For large data sets, it is much faster to load your data into a table that has no FULLTEXT index and then create the index after that, than to load data into a table that has an existing FULLTEXT index.

Full-text searching is performed using MATCH() AGAINST( ) syntax. MATCH( ) takes a commaseparated list that names the columns to be searched. AGAINST takes a string to search for, and an optional modifier that indicates what type of search to perform. The search string must be a string value that is constant during query evaluation. This rules out, for example, a table column because that can differ for each row.

MySQL does not permit the use of a rollup column with MATCH( ); more specifically, any query matching all of the criteria listed here is rejected with ER_FULLTEXT_WITH_ROLLUP:
- MATCH( ) appears in the SELECT list, GROUP BY clause, HAVING clause, or ORDER BY clause of a query block.
- The query block contains a GROUP BY ... WITH ROLLUP clause.
- The argument of the call to the MATCH( ) function is one of the grouping columns.

Some examples of such queries are shown here:
```
# MATCH() in SELECT list...
SELECT MATCH (a) AGAINST ('abc') FROM t GROUP BY a WITH ROLLUP;
SELECT 1 FROM t GROUP BY a, MATCH (a) AGAINST ('abc') WITH ROLLUP;
# ...in HAVING clause...
SELECT 1 FROM t GROUP BY a WITH ROLLUP HAVING MATCH (a) AGAINST ('abc');
# ...and in ORDER BY clause
SELECT 1 FROM t GROUP BY a WITH ROLLUP ORDER BY MATCH (a) AGAINST ('abc');
```


The use of MATCH ( ) with a rollup column in the WHERE clause is permitted.
There are three types of full-text searches:
- A natural language search interprets the search string as a phrase in natural human language (a phrase in free text). There are no special operators, with the exception of double quote (") characters. The stopword list applies. For more information about stopword lists, see Section 14.9.4, "Full-Text Stopwords".

Full-text searches are natural language searches if the IN NATURAL LANGUAGE MODE modifier is given or if no modifier is given. For more information, see Section 14.9.1, "Natural Language FullText Searches".
- A boolean search interprets the search string using the rules of a special query language. The string contains the words to search for. It can also contain operators that specify requirements such that a word must be present or absent in matching rows, or that it should be weighted higher or lower than usual. Certain common words (stopwords) are omitted from the search index and do not match if present in the search string. The IN BOOLEAN MODE modifier specifies a boolean search. For more information, see Section 14.9.2, "Boolean Full-Text Searches".
- A query expansion search is a modification of a natural language search. The search string is used to perform a natural language search. Then words from the most relevant rows returned by the search are added to the search string and the search is done again. The query returns the rows from the second search. The IN NATURAL LANGUAGE MODE WITH QUERY EXPANSION or WITH QUERY EXPANSION modifier specifies a query expansion search. For more information, see Section 14.9.3, "Full-Text Searches with Query Expansion".

For information about FULLTEXT query performance, see Section 10.3.5, "Column Indexes".

For more information about InnoDB FULLTEXT indexes, see Section 17.6.2.4, "InnoDB Full-Text Indexes".

Constraints on full-text searching are listed in Section 14.9.5, "Full-Text Restrictions".
The myisam_ftdump utility dumps the contents of a MyISAM full-text index. This may be helpful for debugging full-text queries. See Section 6.6.3, "myisam_ftdump - Display Full-Text Index information".

\subsection*{14.9.1 Natural Language Full-Text Searches}

By default or with the IN NATURAL LANGUAGE MODE modifier, the MATCH() function performs a natural language search for a string against a text collection. A collection is a set of one or more columns included in a FULLTEXT index. The search string is given as the argument to AGAINST( ). For each row in the table, MATCH ( ) returns a relevance value; that is, a similarity measure between the search string and the text in that row in the columns named in the MATCH( ) list.
```
mysql> CREATE TABLE articles (
    -> id INT UNSIGNED AUTO_INCREMENT NOT NULL PRIMARY KEY,
    -> title VARCHAR(200),
    -> body TEXT,
    -> FULLTEXT (title,body)
    -> ) ENGINE=InnoDB;
Query OK, 0 rows affected (0.08 sec)
mysql> INSERT INTO articles (title,body) VALUES
    -> ('MySQL Tutorial','DBMS stands for DataBase ...'),
    -> ('How To Use MySQL Well','After you went through a ...'),
    -> ('Optimizing MySQL','In this tutorial, we show ...'),
    -> ('1001 MySQL Tricks','1. Never run mysqld as root. 2. ...'),
    -> ('MySQL vs. YourSQL','In the following database comparison ...'),
    -> ('MySQL Security','When configured properly, MySQL ...');
Query OK, 6 rows affected (0.01 sec)
Records: 6 Duplicates: 0 Warnings: 0
mysql> SELECT * FROM articles
    -> WHERE MATCH (title,body)
    -> AGAINST ('database' IN NATURAL LANGUAGE MODE);
+----+--------------------+-------------------------------------------
| id | title | body |
+----+--------------------+-------------------------------------------
| 1 | MySQL Tutorial | DBMS stands for DataBase ...
| 5 | MySQL vs. YourSQL | In the following database compari |
+----+--------------------+------------------------------------------
2 rows in set (0.00 sec)
```


By default, the search is performed in case-insensitive fashion. To perform a case-sensitive full-text search, use a case-sensitive or binary collation for the indexed columns. For example, a column that uses the utf8mb4 character set of can be assigned a collation of utf8mb4_0900_as_cs or utf8mb4_bin to make it case-sensitive for full-text searches.

When MATCH( ) is used in a WHERE clause, as in the example shown earlier, the rows returned are automatically sorted with the highest relevance first as long as the following conditions are met:
- There must be no explicit ORDER BY clause.
- The search must be performed using a full-text index scan rather than a table scan.
- If the query joins tables, the full-text index scan must be the leftmost non-constant table in the join.

Given the conditions just listed, it is usually less effort to specify using ORDER BY an explicit sort order when one is necessary or desired.

Relevance values are nonnegative floating-point numbers. Zero relevance means no similarity. Relevance is computed based on the number of words in the row (document), the number of unique words in the row, the total number of words in the collection, and the number of rows that contain a particular word.

\section*{Note}

The term "document" may be used interchangeably with the term "row", and both terms refer to the indexed part of the row. The term "collection" refers to the indexed columns and encompasses all rows.

To simply count matches, you could use a query like this:
```
mysql> SELECT COUNT(*) FROM articles
    -> WHERE MATCH (title,body)
    -> AGAINST ('database' IN NATURAL LANGUAGE MODE);
+-----------+
| COUNT(*) |
+-----------+
| 2 |
+-----------+
1 row in set (0.00 sec)
```


You might find it quicker to rewrite the query as follows:
```
mysql> SELECT
    -> COUNT(IF(MATCH (title,body) AGAINST ('database' IN NATURAL LANGUAGE MODE), 1, NULL))
    -> AS count
    -> FROM articles;
+-------+
| count |
+-------+
| 2 |
+-------+
1 row in set (0.03 sec)
```


The first query does some extra work (sorting the results by relevance) but also can use an index lookup based on the WHERE clause. The index lookup might make the first query faster if the search matches few rows. The second query performs a full table scan, which might be faster than the index lookup if the search term was present in most rows.

For natural-language full-text searches, the columns named in the MATCH( ) function must be the same columns included in some FULLTEXT index in your table. For the preceding query, note that the columns named in the MATCH( ) function (title and body) are the same as those named in the definition of the article table's FULLTEXT index. To search the title or body separately, you would create separate FULLTEXT indexes for each column.

You can also perform a boolean search or a search with query expansion. These search types are described in Section 14.9.2, "Boolean Full-Text Searches", and Section 14.9.3, "Full-Text Searches with Query Expansion".

A full-text search that uses an index can name columns only from a single table in the MATCH( ) clause because an index cannot span multiple tables. For MyISAM tables, a boolean search can be done in the absence of an index (albeit more slowly), in which case it is possible to name columns from multiple tables.

The preceding example is a basic illustration that shows how to use the MATCH( ) function where rows are returned in order of decreasing relevance. The next example shows how to retrieve the relevance values explicitly. Returned rows are not ordered because the SELECT statement includes neither WHERE nor ORDER BY clauses:
```
mysql> SELECT id, MATCH (title,body)
    -> AGAINST ('Tutorial' IN NATURAL LANGUAGE MODE) AS score
    -> FROM articles;
+----+----------------------+
| id | score |
+----+----------------------+
| 1 | 0.22764469683170319 |
| 2 | 0 |
| 3 | 0.22764469683170319 |
|5 | 0 0 |
```

```
|6 | 0 |
+----+---------------------+
6 rows in set (0.00 sec)
```


The following example is more complex. The query returns the relevance values and it also sorts the rows in order of decreasing relevance. To achieve this result, specify MATCH ( ) twice: once in the SELECT list and once in the WHERE clause. This causes no additional overhead, because the MySQL optimizer notices that the two MATCH( ) calls are identical and invokes the full-text search code only once.
```
mysql> SELECT id, body, MATCH (title,body)
    -> AGAINST ('Security implications of running MySQL as root'
    -> IN NATURAL LANGUAGE MODE) AS score
    -> FROM articles
    -> WHERE MATCH (title,body)
    -> AGAINST('Security implications of running MySQL as root'
    -> IN NATURAL LANGUAGE MODE);
+----+--------------------------------------+------------------
| id | body | score |
+-----+--------------------------------------+-----------------
| 4 | 1. Never run mysqld as root. 2. ... | 1.5219271183014 |
| 6 | When configured properly, MySQL ... | 1.3114095926285 |
+----+--------------------------------------+-----------------
2 rows in set (0.00 sec)
```


A phrase that is enclosed within double quote (") characters matches only rows that contain the phrase literally, as it was typed. The full-text engine splits the phrase into words and performs a search in the FULLTEXT index for the words. Nonword characters need not be matched exactly: Phrase searching requires only that matches contain exactly the same words as the phrase and in the same order. For example, "test phrase" matches "test, phrase". If the phrase contains no words that are in the index, the result is empty. For example, if all words are either stopwords or shorter than the minimum length of indexed words, the result is empty.

The MySQL FULLTEXT implementation regards any sequence of true word characters (letters, digits, and underscores) as a word. That sequence may also contain apostrophes ( ' ), but not more than one in a row. This means that aaa'bbb is regarded as one word, but aaa' 'bbb is regarded as two words. Apostrophes at the beginning or the end of a word are stripped by the FULLTEXT parser; 'aaa ' bbb ' would be parsed as aaa'bbb.

The built-in FULLTEXT parser determines where words start and end by looking for certain delimiter characters; for example, (space), , (comma), and . (period). If words are not separated by delimiters (as in, for example, Chinese), the built-in FULLTEXT parser cannot determine where a word begins or ends. To be able to add words or other indexed terms in such languages to a FULLTEXT index that uses the built-in FULLTEXT parser, you must preprocess them so that they are separated by some arbitrary delimiter. Alternatively, you can create FULLTEXT indexes using the ngram parser plugin (for Chinese, Japanese, or Korean) or the MeCab parser plugin (for Japanese).

It is possible to write a plugin that replaces the built-in full-text parser. For details, see The MySQL Plugin API. For example parser plugin source code, see the plugin/fulltext directory of a MySQL source distribution.

Some words are ignored in full-text searches:
- Any word that is too short is ignored. The default minimum length of words that are found by full-text searches is three characters for InnoDB search indexes, or four characters for MyISAM. You can control the cutoff by setting a configuration option before creating the index: innodb_ft_min_token_size configuration option for InnoDB search indexes, or ft_min_word_len for MyISAM.

\section*{Note}

This behavior does not apply to FULLTEXT indexes that use the ngram parser. For the ngram parser, token length is defined by the ngram_token_size option.
- Words in the stopword list are ignored. A stopword is a word such as "the" or "some" that is so common that it is considered to have zero semantic value. There is a built-in stopword list, but it can be overridden by a user-defined list. The stopword lists and related configuration options are different for InnoDB search indexes and MyISAM ones. Stopword processing is controlled by the configuration options innodb_ft_enable_stopword, innodb_ft_server_stopword_table, and innodb_ft_user_stopword_table for InnoDB search indexes, and ft_stopword_file for MyISAM ones.

See Section 14.9.4, "Full-Text Stopwords" to view default stopword lists and how to change them. The default minimum word length can be changed as described in Section 14.9.6, "Fine-Tuning MySQL Full-Text Search".

Every correct word in the collection and in the query is weighted according to its significance in the collection or query. Thus, a word that is present in many documents has a lower weight, because it has lower semantic value in this particular collection. Conversely, if the word is rare, it receives a higher weight. The weights of the words are combined to compute the relevance of the row. This technique works best with large collections.

\section*{MyISAM Limitation}

For very small tables, word distribution does not adequately reflect their semantic value, and this model may sometimes produce bizarre results for search indexes on MyISAM tables. For example, although the word "MySQL" is present in every row of the articles table shown earlier, a search for the word in a MyISAM search index produces no results:
```
mysql> SELECT * FROM articles
    -> WHERE MATCH (title,body)
    -> AGAINST ('MySQL' IN NATURAL LANGUAGE MODE);
Empty set (0.00 sec)
```


The search result is empty because the word "MySQL" is present in at least $50 \%$ of the rows, and so is effectively treated as a stopword. This filtering technique is more suitable for large data sets, where you might not want the result set to return every second row from a 1GB table, than for small data sets where it might cause poor results for popular terms.

The 50\% threshold can surprise you when you first try full-text searching to see how it works, and makes InnoDB tables more suited to experimentation with full-text searches. If you create a MyISAM table and insert only one or two rows of text into it, every word in the text occurs in at least 50\% of the rows. As a result, no search returns any results until the table contains more rows. Users who need to bypass the 50\% limitation can build search indexes on InnoDB tables, or use the boolean search mode explained in Section 14.9.2, "Boolean Full-Text Searches".

\subsection*{14.9.2 Boolean Full-Text Searches}

MySQL can perform boolean full-text searches using the IN BOOLEAN MODE modifier. With this modifier, certain characters have special meaning at the beginning or end of words in the search string. In the following query, the + and - operators indicate that a word must be present or absent, respectively, for a match to occur. Thus, the query retrieves all the rows that contain the word "MySQL" but that do not contain the word "YourSQL":
```
mysql> SELECT * FROM articles WHERE MATCH (title,body)
    -> AGAINST ('+MySQL -YourSQL' IN BOOLEAN MODE);
+----+------------------------+--------------------------------------
| id | title | body |
+----+-------------------------+--------------------------------------
| 1 | MySQL Tutorial | DBMS stands for DataBase ...
| 2 | How To Use MySQL Well | After you went through a ...
| 3 | Optimizing MySQL | In this tutorial, we show ... |
```

```
| 4 | 1001 MySQL Tricks | 1. Never run mysqld as root. 2. ... |
| 6 | MySQL Security | When configured properly, MySQL ... |
+----+-------------------------+-------------------------------------
```


\section*{Note}

In implementing this feature, MySQL uses what is sometimes referred to as implied Boolean logic, in which
- + stands for AND
- - stands for NOT
- [no operator] implies OR

Boolean full-text searches have these characteristics:
- They do not automatically sort rows in order of decreasing relevance.
- InnoDB tables require a FULLTEXT index on all columns of the MATCH( ) expression to perform boolean queries. Boolean queries against a MyISAM search index can work even without a FULLTEXT index, although a search executed in this fashion would be quite slow.
- The minimum and maximum word length full-text parameters apply to FULLTEXT indexes created using the built-in FULLTEXT parser and MeCab parser plugin. innodb_ft_min_token_size and innodb_ft_max_token_size are used for InnoDB search indexes. ft_min_word_len and ft_max_word_len are used for MyISAM search indexes.

Minimum and maximum word length full-text parameters do not apply to FULLTEXT indexes created using the ngram parser. ngram token size is defined by the ngram_token_size option.
- The stopword list applies, controlled by innodb_ft_enable_stopword, innodb_ft_server_stopword_table, and innodb_ft_user_stopword_table for InnoDB search indexes, and ft_stopword_file for MyISAM ones.
- InnoDB full-text search does not support the use of multiple operators on a single search word, as in this example: '++apple'. Use of multiple operators on a single search word returns a syntax error to standard out. MyISAM full-text search successfully processes the same search, ignoring all operators except for the operator immediately adjacent to the search word.
- InnoDB full-text search only supports leading plus or minus signs. For example, InnoDB supports '+apple' but does not support 'apple+'. Specifying a trailing plus or minus sign causes InnoDB to report a syntax error.
- InnoDB full-text search does not support the use of a leading plus sign with wildcard ( ' + * '), a plus and minus sign combination ( ${ }^{\prime}+-^{\prime}$ ), or leading a plus and minus sign combination ( ${ }^{\prime}+$-apple ${ }^{\prime}$ ). These invalid queries return a syntax error.
- InnoDB full-text search does not support the use of the @ symbol in boolean full-text searches. The @ symbol is reserved for use by the @distance proximity search operator.
- They do not use the $50 \%$ threshold that applies to MyISAM search indexes.

The boolean full-text search capability supports the following operators:
- +

A leading or trailing plus sign indicates that this word must be present in each row that is returned. InnoDB only supports leading plus signs.
- -

A leading or trailing minus sign indicates that this word must not be present in any of the rows that are returned. InnoDB only supports leading minus signs.

Note: The - operator acts only to exclude rows that are otherwise matched by other search terms. Thus, a boolean-mode search that contains only terms preceded by - returns an empty result. It does not return "all rows except those containing any of the excluded terms."
- (no operator)

By default (when neither + nor - is specified), the word is optional, but the rows that contain it are rated higher. This mimics the behavior of MATCH() AGAINST() without the IN BOOLEAN MODE modifier.
- @distance

This operator works on InnoDB tables only. It tests whether two or more words all start within a specified distance from each other, measured in words. Specify the search words within a double-quoted string immediately before the @distance operator, for example, MATCH(col1) AGAINST('"word1 word2 word3" @8' IN BOOLEAN MODE)
- > <

These two operators are used to change a word's contribution to the relevance value that is assigned to a row. The > operator increases the contribution and the < operator decreases it. See the example following this list.
- ( )

Parentheses group words into subexpressions. Parenthesized groups can be nested.
- ~

A leading tilde acts as a negation operator, causing the word's contribution to the row's relevance to be negative. This is useful for marking "noise" words. A row containing such a word is rated lower than others, but is not excluded altogether, as it would be with the - operator.
- *

The asterisk serves as the truncation (or wildcard) operator. Unlike the other operators, it is appended to the word to be affected. Words match if they begin with the word preceding the * operator.

If a word is specified with the truncation operator, it is not stripped from a boolean query, even if it is too short or a stopword. Whether a word is too short is determined from the innodb_ft_min_token_size setting for InnoDB tables, or ft_min_word_len for MyISAM tables. These options are not applicable to FULLTEXT indexes that use the ngram parser.

The wildcarded word is considered as a prefix that must be present at the start of one or more words. If the minimum word length is 4, a search for '+word +the* ' could return fewer rows than a search for '+word +the ', because the second query ignores the too-short search term the.
- "

A phrase that is enclosed within double quote (") characters matches only rows that contain the phrase literally, as it was typed. The full-text engine splits the phrase into words and performs a search in the FULLTEXT index for the words. Nonword characters need not be matched exactly: Phrase searching requires only that matches contain exactly the same words as the phrase and in the same order. For example, "test phrase" matches "test, phrase".

If the phrase contains no words that are in the index, the result is empty. The words might not be in the index because of a combination of factors: if they do not exist in the text, are stopwords, or are shorter than the minimum length of indexed words.

The following examples demonstrate some search strings that use boolean full-text operators:
- 'apple banana'

Find rows that contain at least one of the two words.
- '+apple +juice'

Find rows that contain both words.
- '+apple macintosh'

Find rows that contain the word "apple", but rank rows higher if they also contain "macintosh".
- '+apple -macintosh'

Find rows that contain the word "apple" but not "macintosh".
- '+apple ~macintosh'

Find rows that contain the word "apple", but if the row also contains the word "macintosh", rate it lower than if row does not. This is "softer" than a search for '+apple -macintosh ', for which the presence of "macintosh" causes the row not to be returned at all.
- '+apple +(>turnover <strudel)'

Find rows that contain the words "apple" and "turnover", or "apple" and "strudel" (in any order), but rank "apple turnover" higher than "apple strudel".
- 'apple*'

Find rows that contain words such as "apple", "apples", "applesauce", or "applet".
- '"some words"'

Find rows that contain the exact phrase "some words" (for example, rows that contain "some words of wisdom" but not "some noise words"). Note that the " characters that enclose the phrase are operator characters that delimit the phrase. They are not the quotation marks that enclose the search string itself.

\section*{Relevancy Rankings for InnoDB Boolean Mode Search}

InnoDB full-text search is modeled on the Sphinx full-text search engine, and the algorithms used are based on BM25 and TF-IDF ranking algorithms. For these reasons, relevancy rankings for InnoDB boolean full-text search may differ from MyISAM relevancy rankings.

InnoDB uses a variation of the "term frequency-inverse document frequency" (TF-IDF) weighting system to rank a document's relevance for a given full-text search query. The TF-IDF weighting is based on how frequently a word appears in a document, offset by how frequently the word appears in all documents in the collection. In other words, the more frequently a word appears in a document, and the less frequently the word appears in the document collection, the higher the document is ranked.

\section*{How Relevancy Ranking is Calculated}

The term frequency (TF) value is the number of times that a word appears in a document. The inverse document frequency (IDF) value of a word is calculated using the following formula, where total_records is the number of records in the collection, and matching_records is the number of records that the search term appears in.
\$\{IDF\} = log10( \$\{total_records\} / \$\{matching_records\} )
When a document contains a word multiple times, the IDF value is multiplied by the TF value:
\$\{TF\} * \$\{IDF\}

Using the TF and IDF values, the relevancy ranking for a document is calculated using this formula:
```
${rank} = ${TF} * ${IDF} * ${IDF}
```


The formula is demonstrated in the following examples.

\section*{Relevancy Ranking for a Single Word Search}

This example demonstrates the relevancy ranking calculation for a single-word search.
```
mysql> CREATE TABLE articles (
    -> id INT UNSIGNED AUTO_INCREMENT NOT NULL PRIMARY KEY,
    -> title VARCHAR(200),
    -> body TEXT,
    -> FULLTEXT (title,body)
    ->) ENGINE=InnoDB;
Query OK, 0 rows affected (1.04 sec)
mysql> INSERT INTO articles (title,body) VALUES
    -> ('MySQL Tutorial','This database tutorial ...'),
    -> ("How To Use MySQL",'After you went through a ...'),
    -> ('Optimizing Your Database','In this database tutorial ...'),
    -> ('MySQL vs. YourSQL','When comparing databases ...'),
    -> ('MySQL Security','When configured properly, MySQL ...'),
    -> ('Database, Database, Database','database database database'),
    -> ('1001 MySQL Tricks','1. Never run mysqld as root. 2. ...'),
    -> ('MySQL Full-Text Indexes', 'MySQL fulltext indexes use a ..');
Query OK, 8 rows affected (0.06 sec)
Records: 8 Duplicates: 0 Warnings: 0
mysql> SELECT id, title, body,
    -> MATCH (title,body) AGAINST ('database' IN BOOLEAN MODE) AS score
    -> FROM articles ORDER BY score DESC;

\begin{tabular}{|l|l|l|l|}
\hline id & title & body & score \\
\hline 6 & Database, Database, Database & database database database & 1.0886961221694946 \\
\hline 3 & Optimizing Your Database & In this database tutorial & 0.36289870738983154 \\
\hline 1 & MySQL Tutorial & This database tutorial & 0.18144935369491577 \\
\hline 2 & How To Use MySQL & After you went through a & 0 \\
\hline 4 & MySQL vs. YourSQL & When comparing databases & 0 \\
\hline 5 & MySQL Security & When configured properly, MySQL & 0 \\
\hline 7 & 1001 MySQL Tricks & 1. Never run mysqld as root. 2. & 0 \\
\hline 8 & MySQL Full-Text Indexes & MySQL fulltext indexes use a & 0 \\
\hline \multicolumn{4}{|c|}{8 rows in set (0.00 sec)} \\
\hline
\end{tabular}
```


There are 8 records in total, with 3 that match the "database" search term. The first record (id 6) contains the search term 6 times and has a relevancy ranking of 1.0886961221694946 . This ranking value is calculated using a TF value of 6 (the "database" search term appears 6 times in record id 6) and an IDF value of 0.42596873216370745 , which is calculated as follows (where 8 is the total number of records and 3 is the number of records that the search term appears in):
```
${IDF} = LOG10( 8 / 3 ) = 0.42596873216370745
```


The TF and IDF values are then entered into the ranking formula:
```
${rank} = ${TF} * ${IDF} * ${IDF}
```


Performing the calculation in the MySQL command-line client returns a ranking value of 1.088696164686938.
```
mysql> SELECT 6*LOG10(8/3)*LOG10(8/3);
+---------------------------+
| 6*LOG10(8/3)*LOG10(8/3) |
+---------------------------+
| 1.088696164686938 |
+---------------------------+
1 row in set (0.00 sec)
```


\section*{Note}

You may notice a slight difference in the ranking values returned by the SELECT ... MATCH ... AGAINST statement and the MySQL command-line client ( 1.0886961221694946 versus 1.088696164686938 ). The difference is due to how the casts between integers and floats/doubles are performed internally by InnoDB (along with related precision and rounding decisions), and how they are performed elsewhere, such as in the MySQL command-line client or other types of calculators.

\section*{Relevancy Ranking for a Multiple Word Search}

This example demonstrates the relevancy ranking calculation for a multiple-word full-text search based on the articles table and data used in the previous example.

If you search on more than one word, the relevancy ranking value is a sum of the relevancy ranking value for each word, as shown in this formula:
```
${rank} = ${TF} * ${IDF} * ${IDF} + ${TF} * ${IDF} * ${IDF}
```


Performing a search on two terms ('mysql tutorial') returns the following results:
```
mysql> SELECT id, title, body, MATCH (title,body)
    -> AGAINST ('mysql tutorial' IN BOOLEAN MODE) AS score
    -> FROM articles ORDER BY score DESC;
+----+-------------------------------+-------------------------------------------------------------
| id | title | body | score |
+----+--------------------------------+------------------------------------------------------------
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2224.jpg?height=67&width=1642&top_left_y=1320&top_left_x=287)
```
|5 | MySQL Security | When configured properly, MySQL ... | 0.031219376251101494 |
|8 | MySQL Full-Text Indexes | MySQL fulltext indexes use a .. | 0.031219376251101494 |
| 2 | How To Use MySQL | After you went through a ... | 0.015609688125550747 
|4 MySQL vs.YourSQL | When comparing databases ... 2. 1. Never run mysqld as root. 2. 0.015609688125550747 0.015609688125550747 
| 6 | Database, Database, Database | database database database |}0\mathrm{ |
8 rows in set (0.00 sec)
```


In the first record (id 8), 'mysql' appears once and 'tutorial' appears twice. There are six matching records for 'mysql' and two matching records for 'tutorial'. The MySQL command-line client returns the expected ranking value when inserting these values into the ranking formula for a multiple word search:
```
mysql> SELECT (1*log10(8/6)*log10(8/6)) + (2*log10(8/2)*log10(8/2));
+--------------------------------------------------------
|(1*\operatorname{log10(8/6)*log10(8/6)) + (2*log10(8/2)*log10(8/2)) |}
+---------------------------------------------------------
| 0.7405621541938003 |
+---------------------------------------------------------
1 row in set (0.00 sec)
```


\section*{Note}

The slight difference in the ranking values returned by the SELECT . . . MATCH . . . AGAINST statement and the MySQL command-line client is explained in the preceding example.

\subsection*{14.9.3 Full-Text Searches with Query Expansion}

Full-text search supports query expansion (and in particular, its variant "blind query expansion"). This is generally useful when a search phrase is too short, which often means that the user is relying on implied knowledge that the full-text search engine lacks. For example, a user searching for "database" may really mean that "MySQL", "Oracle", "DB2", and "RDBMS" all are phrases that should match "databases" and should be returned, too. This is implied knowledge.

Blind query expansion (also known as automatic relevance feedback) is enabled by adding WITH QUERY EXPANSION or IN NATURAL LANGUAGE MODE WITH QUERY EXPANSION following the search phrase. It works by performing the search twice, where the search phrase for the second search is the original search phrase concatenated with the few most highly relevant documents from the first search. Thus, if one of these documents contains the word "databases" and the word "MySQL", the second search finds the documents that contain the word "MySQL" even if they do not contain the word "database". The following example shows this difference:
```
mysql> SELECT * FROM articles
    WHERE MATCH (title,body)
    AGAINST ('database' IN NATURAL LANGUAGE MODE);
+----+--------------------+-------------------------------------------
| id | title | body
+----+--------------------+-------------------------------------------
| 1 | MySQL Tutorial | DBMS stands for DataBase ...
| 5 | MSQL \
\textbf{mSQL vs. YourSQL \ In the following database comparison ... |
2 rows in set (0.00 sec)
mysql> SELECT * FROM articles
    WHERE MATCH (title,body)
    AGAINST ('database' WITH QUERY EXPANSION);
+----+------------------------+--------------------------------------------
| id | title | body |
+----+------------------------+--------------------------------------------
| 5 | MySQL vs. YourSQL | In the following database comparison ... |
| 1 | MySQL Tutorial | DBMS stands for DataBase ...
| 3 | Optimizing MySQL | In this tutorial we show ...
| 6 | MySQL Security | When configured properly, MySQL ...
| 2 | How To Use MySQL Well | After you went through a ...
| 4 | 1001 MySQL Tricks | 1. Never run mysqld as root. 2. ...
+----+-----------------------+--------------------------------------------
6 rows in set (0.00 sec)
```


Another example could be searching for books by Georges Simenon about Maigret, when a user is not sure how to spell "Maigret". A search for "Megre and the reluctant witnesses" finds only "Maigret and the Reluctant Witnesses" without query expansion. A search with query expansion finds all books with the word "Maigret" on the second pass.

\section*{Note}

Because blind query expansion tends to increase noise significantly by returning nonrelevant documents, use it only when a search phrase is short.

\subsection*{14.9.4 Full-Text Stopwords}

The stopword list is loaded and searched for full-text queries using the server character set and collation (the values of the character_set_server and collation_server system variables). False hits or misses might occur for stopword lookups if the stopword file or columns used for full-text indexing or searches have a character set or collation different from character_set_server or collation_server.

Case sensitivity of stopword lookups depends on the server collation. For example, lookups are case-insensitive if the collation is utf8mb4_0900_ai_ci, whereas lookups are case-sensitive if the collation is utf8mb4_0900_as_cs or utf8mb4_bin.
- Stopwords for InnoDB Search Indexes
- Stopwords for MyISAM Search Indexes

\section*{Stopwords for InnoDB Search Indexes}

InnoDB has a relatively short list of default stopwords, because documents from technical, literary, and other sources often use short words as keywords or in significant phrases. For example, you might
search for "to be or not to be" and expect to get a sensible result, rather than having all those words ignored.

To see the default InnoDB stopword list, query the Information Schema INNODB_FT_DEFAULT_STOPWORD table.
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_DEFAULT_STOPWORD;
+-------+
| value |
+-------+
| a
| about
| an
| are
| as
| at
| be
| by
| com
| de
| en
| for
| from
| how
| i
| in
| is
| it
| la
| of
| on
| or
| that
| the
| this
| to
| was
| what
| when
| where
| who
| will
| with
| und
| the
| www
+--------+
36 rows in set (0.00 sec)
```


To define your own stopword list for all InnoDB tables, define a table with the same structure as the INNODB_FT_DEFAULT_STOPWORD table, populate it with stopwords, and set the value of the innodb_ft_server_stopword_table option to a value in the form $d b \_n a m e / t a b l e \_n a m e$ before creating the full-text index. The stopword table must have a single VARCHAR column named value. The following example demonstrates creating and configuring a new global stopword table for InnoDB.
```
-- Create a new stopword table
mysql> CREATE TABLE my_stopwords(value VARCHAR(30)) ENGINE = INNODB;
Query OK, 0 rows affected (0.01 sec)
-- Insert stopwords (for simplicity, a single stopword is used in this example)
mysql> INSERT INTO my_stopwords(value) VALUES ('Ishmael');
Query OK, 1 row affected (0.00 sec)
-- Create the table
mysql> CREATE TABLE opening_lines (
id INT UNSIGNED AUTO_INCREMENT NOT NULL PRIMARY KEY,
opening_line TEXT(500),
author VARCHAR(200),
```

```
title VARCHAR(200)
) ENGINE=InnoDB;
Query OK, 0 rows affected (0.01 sec)
-- Insert data into the table
mysql> INSERT INTO opening_lines(opening_line,author,title) VALUES
('Call me Ishmael.','Herman Melville','Moby-Dick'),
('A screaming comes across the sky.','Thomas Pynchon','Gravity\'s Rainbow'),
('I am an invisible man.','Ralph Ellison','Invisible Man'),
('Where now? Who now? When now?','Samuel Beckett','The Unnamable'),
('It was love at first sight.','Joseph Heller','Catch-22'),
('All this happened, more or less.','Kurt Vonnegut','Slaughterhouse-Five'),
('Mrs. Dalloway said she would buy the flowers herself.','Virginia Woolf','Mrs. Dalloway'),
('It was a pleasure to burn.','Ray Bradbury','Fahrenheit 451');
Query OK, 8 rows affected (0.00 sec)
Records: 8 Duplicates: 0 Warnings: 0
-- Set the innodb_ft_server_stopword_table option to the new stopword table
mysql> SET GLOBAL innodb_ft_server_stopword_table = 'test/my_stopwords';
Query OK, 0 rows affected (0.00 sec)
-- Create the full-text index (which rebuilds the table if no FTS_DOC_ID column is defined)
mysql> CREATE FULLTEXT INDEX idx ON opening_lines(opening_line);
Query OK, 0 rows affected, 1 warning (1.17 sec)
Records: 0 Duplicates: 0 Warnings: 1
```


Verify that the specified stopword ('Ishmael') does not appear by querying the Information Schema INNODB_FT_INDEX_TABLE table.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2227.jpg?height=127&width=99&top_left_y=1338&top_left_x=370)

\section*{Note}

By default, words less than 3 characters in length or greater than 84 characters in length do not appear in an InnoDB full-text search index. Maximum and minimum word length values are configurable using the innodb_ft_max_token_size and innodb_ft_min_token_size variables. This default behavior does not apply to the ngram parser plugin. ngram token size is defined by the ngram_token_size option.
```
mysql> SET GLOBAL innodb_ft_aux_table='test/opening_lines';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT word FROM INFORMATION_SCHEMA.INNODB_FT_INDEX_TABLE LIMIT 15;
+------------+
| word
+-----------+
| across
| all
| burn
| buy
| call
| comes
| dalloway
| first
| flowers
| happened
| herself
| invisible
| less
| love
| man
+-----------+
15 rows in set (0.00 sec)
```


To create stopword lists on a table-by-table basis, create other stopword tables and use the innodb_ft_user_stopword_table option to specify the stopword table that you want to use before you create the full-text index.

\section*{Stopwords for MyISAM Search Indexes}

The stopword file is loaded and searched using latin1 if character_set_server is ucs2, utf16, utf16le, or utf32.

To override the default stopword list for MyISAM tables, set the ft_stopword_file system variable. (See Section 7.1.8, "Server System Variables".) The variable value should be the path name of the file containing the stopword list, or the empty string to disable stopword filtering. The server looks for the file in the data directory unless an absolute path name is given to specify a different directory. After changing the value of this variable or the contents of the stopword file, restart the server and rebuild your FULLTEXT indexes.

The stopword list is free-form, separating stopwords with any nonalphanumeric character such as newline, space, or comma. Exceptions are the underscore character (_) and a single apostrophe ( ' ) which are treated as part of a word. The character set of the stopword list is the server's default character set; see Section 12.3.2, "Server Character Set and Collation".

The following list shows the default stopwords for MyISAM search indexes. In a MySQL source distribution, you can find this list in the storage/myisam/ft_static.c file.

\begin{tabular}{|l|l|l|l|l|}
\hline a's & able & about & above & according \\
\hline again & against & ain't & all & allow \\
\hline allows & almost & alone & along & already \\
\hline also & although & always & am & among \\
\hline amongst & an & and & another & any \\
\hline anybody & anyhow & anyone & anything & anyway \\
\hline anyways & anywhere & apart & appear & appreciate \\
\hline appropriate & are & aren't & around & as \\
\hline aside & ask & asking & associated & at \\
\hline available & away & awfully & be & became \\
\hline because & become & becomes & becoming & been \\
\hline before & beforehand & behind & being & believe \\
\hline below & beside & besides & best & better \\
\hline between & beyond & both & brief & but \\
\hline by & c'mon & c's & came & can \\
\hline can't & cannot & cant & cause & causes \\
\hline certain & certainly & changes & clearly & co \\
\hline com & come & comes & concerning & consequently \\
\hline consider & considering & contain & containing & contains \\
\hline corresponding & could & couldn't & course & currently \\
\hline definitely & described & despite & did & didn't \\
\hline different & do & does & doesn't & doing \\
\hline don't & done & down & downwards & during \\
\hline each & edu & eg & eight & either \\
\hline else & elsewhere & enough & entirely & especially \\
\hline et & etc & even & ever & every \\
\hline everybody & everyone & everything & everywhere & ex \\
\hline exactly & example & except & far & few \\
\hline fifth & first & five & followed & following \\
\hline follows & for & former & formerly & forth \\
\hline four & from & further & furthermore & get \\
\hline gets & getting & given & gives & go \\
\hline goes & going & gone & got & gotten \\
\hline greetings & had & hadn't & happens & hardly \\
\hline has & hasn't & have & haven't & having \\
\hline he & he's & hello & help & hence \\
\hline her & here & here's & hereafter & hereby \\
\hline herein & hereupon & hers & herself & hi \\
\hline him & himself & his & hither & hopefully \\
\hline how & howbeit & however & i'd & i'll \\
\hline i'm & i've & ie & if & ignored \\
\hline immediate & in & inasmuch & inc & indeed \\
\hline indicate & indicated & indicates & inner & insofar \\
\hline instead & into & inward & is & isn't \\
\hline it & it'd & it'll & it's & its \\
\hline itself & just & keep & keeps & kept \\
\hline know & known & knows & last & lately \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|}
\hline later & latter & latterly & least & less \\
\hline lest & let & let's & like & liked \\
\hline likely & little & look & looking & looks \\
\hline ltd & mean & many & may & need \\
\hline next & nine & no & nobody & non \\
\hline none & noone & nor & normally & not \\
\hline nothing & novel & now & nowhere & obviously \\
\hline of & off & often & oh & ok \\
\hline okay & old & on & once & one \\
\hline ones & only & onto & or & other \\
\hline others & out & ought & our & ours \\
\hline own & particular & particularly & per & perhaps \\
\hline placed & rd & que & possible & qv \\
\hline regarding & regardless & same & saw & say \\
\hline saying & says & second & secondly & see \\
\hline seeing & seem & seemed & seeming & seems \\
\hline seen & self & selves & sensible & sent \\
\hline she & seriously & seven & several & six \\
\hline so & some & somebody & somehow & someone \\
\hline something & sometime & sometimes & somewhat & somewhere \\
\hline soon & sub & such & sup & sure \\
\hline t's & take & taken & tell & tends \\
\hline th & than & thank & thanks & thanx \\
\hline that & that's & thats & the & their \\
\hline there & there's & thereafter & thereby & therefore \\
\hline therein & theres & thereupon & these & they \\
\hline third & this & thorough & thoroughly & those \\
\hline though & three & through & throughout & thru \\
\hline thus & to & together & too & took \\
\hline toward & towards & tried & tries & truly \\
\hline try & trying & twice & two & un \\
\hline under & unfortunately & unless & unlikely & until \\
\hline unto & up & upon & us & use \\
\hline used & useful & uses & using & usually \\
\hline value & various & very & via & viz \\
\hline vs & want & wants & was & wasn't \\
\hline way & we & we'd & we'll & we're \\
\hline we've & welcome & well & went & were \\
\hline weren't & what & what's & whatever & when \\
\hline whence & whenever & where & where's & whereafter \\
\hline whereas & whereby & wherein & whereupon & wherever \\
\hline whether & which & while & whither & who \\
\hline who's & whoever & whole & whom & whose \\
\hline why & will & willing & wish & with \\
\hline within & without & won't & wonder & would \\
\hline wouldn't & yes & yet & you & you'd \\
\hline you'll & you're & you've & your & yours \\
\hline yourself & yourselves & zero & & \\
\hline
\end{tabular}

\subsection*{14.9.5 Full-Text Restrictions}
- Full-text searches are supported for InnoDB and MyISAM tables only.
- Full-text searches are not supported for partitioned tables. See Section 26.6, "Restrictions and Limitations on Partitioning".
- Full-text searches can be used with most multibyte character sets. The exception is that for Unicode, the utf8mb3 or utf8mb4 character set can be used, but not the ucs2 character set. Although

FULLTEXT indexes on ucs2 columns cannot be used, you can perform IN BOOLEAN MODE searches on a ucs2 column that has no such index.

The remarks for utf8mb3 also apply to utf8mb4, and the remarks for ucs2 also apply to utf16, utf16le, and utf32.
- Ideographic languages such as Chinese and Japanese do not have word delimiters. Therefore, the built-in full-text parser cannot determine where words begin and end in these and other such languages.

A character-based ngram full-text parser that supports Chinese, Japanese, and Korean (CJK), and a word-based MeCab parser plugin that supports Japanese are provided for use with InnoDB and MyISAM tables.
- Although the use of multiple character sets within a single table is supported, all columns in a FULLTEXT index must use the same character set and collation.
- The MATCH( ) column list must match exactly the column list in some FULLTEXT index definition for the table, unless this MATCH() is IN BOOLEAN MODE on a MyISAM table. For MyISAM tables, boolean-mode searches can be done on nonindexed columns, although they are likely to be slow.
- The argument to AGAINST( ) must be a string value that is constant during query evaluation. This rules out, for example, a table column because that can differ for each row.

The argument to MATCH( ) cannot use a rollup column.
- Index hints are more limited for FULLTEXT searches than for non-FULLTEXT searches. See Section 10.9.4, "Index Hints".
- For InnoDB, all DML operations (INSERT, UPDATE, DELETE) involving columns with full-text indexes are processed at transaction commit time. For example, for an INSERT operation, an inserted string is tokenized and decomposed into individual words. The individual words are then added to full-text index tables when the transaction is committed. As a result, full-text searches only return committed data.
- The ' $\%$ ' character is not a supported wildcard character for full-text searches.

\subsection*{14.9.6 Fine-Tuning MySQL Full-Text Search}

MySQL's full-text search capability has few user-tunable parameters. You can exert more control over full-text searching behavior if you have a MySQL source distribution because some changes require source code modifications. See Section 2.8, "Installing MySQL from Source".

Full-text search is carefully tuned for effectiveness. Modifying the default behavior in most cases can actually decrease effectiveness. Do not alter the MySQL sources unless you know what you are doing.

Most full-text variables described in this section must be set at server startup time. A server restart is required to change them; they cannot be modified while the server is running.

Some variable changes require that you rebuild the FULLTEXT indexes in your tables. Instructions for doing so are given later in this section.
- Configuring Minimum and Maximum Word Length
- Configuring the Natural Language Search Threshold
- Modifying Boolean Full-Text Search Operators
- Character Set Modifications
- Rebuilding InnoDB Full-Text Indexes
- Optimizing InnoDB Full-Text Indexes
- Rebuilding MyISAM Full-Text Indexes

\section*{Configuring Minimum and Maximum Word Length}

The minimum and maximum lengths of words to be indexed are defined by the innodb_ft_min_token_size and innodb_ft_max_token_size for InnoDB search indexes, and ft_min_word_len and ft_max_word_len for MyISAM ones.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2231.jpg?height=127&width=99&top_left_y=648&top_left_x=370)

\section*{Note \\ Minimum and maximum word length full-text parameters do not apply to FULLTEXT indexes created using the ngram parser. ngram token size is defined by the ngram_token_size option.}

After changing any of these options, rebuild your FULLTEXT indexes for the change to take effect. For example, to make two-character words searchable, you could put the following lines in an option file:
```
[mysqld]
innodb_ft_min_token_size=2
ft_min_word_len=2
```


Then restart the server and rebuild your FULLTEXT indexes. For MyISAM tables, note the remarks regarding myisamchk in the instructions that follow for rebuilding MyISAM full-text indexes.

\section*{Configuring the Natural Language Search Threshold}

For MyISAM search indexes, the 50\% threshold for natural language searches is determined by the particular weighting scheme chosen. To disable it, look for the following line in storage/myisam/ ftdefs.h:
```
#define GWS_IN_USE GWS_PROB
```


Change that line to this:
```
#define GWS_IN_USE GWS_FREQ
```


Then recompile MySQL. There is no need to rebuild the indexes in this case.

> Note
> By making this change, you severely decrease MySQL's ability to provide adequate relevance values for the MATCH( ) function. If you really need to search for such common words, it would be better to search using IN BOOLEAN MODE instead, which does not observe the 50\% threshold.

\section*{Modifying Boolean Full-Text Search Operators}

To change the operators used for boolean full-text searches on MyISAM tables, set the ft_boolean_syntax system variable. (InnoDB does not have an equivalent setting.) This variable can be changed while the server is running, but you must have privileges sufficient to set global system variables (see Section 7.1.9.1, "System Variable Privileges"). No rebuilding of indexes is necessary in this case.

\section*{Character Set Modifications}

For the built-in full-text parser, you can change the set of characters that are considered word characters in several ways, as described in the following list. After making the modification, rebuild the indexes for each table that contains any FULLTEXT indexes. Suppose that you want to treat the hyphen character ('-') as a word character. Use one of these methods:
- Modify the MySQL source: In storage/innobase/handler/ha_innodb.cc (for InnoDB), or in storage/myisam/ftdefs.h (for MyISAM), see the true_word_char() and misc_word_char ( ) macros. Add ' - ' to one of those macros and recompile MySQL.
- Modify a character set file: This requires no recompilation. The true_word_char ( ) macro uses a "character type" table to distinguish letters and numbers from other characters. . You can edit the contents of the <ctype><map> array in one of the character set XML files to specify that ' - ' is a "letter." Then use the given character set for your FULLTEXT indexes. For information about the <ctype><map> array format, see Section 12.13.1, "Character Definition Arrays".
- Add a new collation for the character set used by the indexed columns, and alter the columns to use that collation. For general information about adding collations, see Section 12.14, "Adding a Collation to a Character Set". For an example specific to full-text indexing, see Section 14.9.7, "Adding a UserDefined Collation for Full-Text Indexing".

\section*{Rebuilding InnoDB Full-Text Indexes}

For the changes to take effect, FULLTEXT indexes must be rebuilt after modifying any of the following full-text index variables: innodb_ft_min_token_size; innodb_ft_max_token_size; innodb_ft_server_stopword_table; innodb_ft_user_stopword_table; innodb_ft_enable_stopword; ngram_token_size. Modifying innodb_ft_min_token_size, innodb_ft_max_token_size, or ngram_token_size requires restarting the server.

To rebuild FULLTEXT indexes for an InnoDB table, use ALTER TABLE with the DROP INDEX and ADD INDEX options to drop and re-create each index.

\section*{Optimizing InnoDB Full-Text Indexes}

Running OPTIMIZE TABLE on a table with a full-text index rebuilds the full-text index, removing deleted Document IDs and consolidating multiple entries for the same word, where possible.

To optimize a full-text index, enable innodb_optimize_fulltext_only and run OPTIMIZE TABLE.
```
mysql> set GLOBAL innodb_optimize_fulltext_only=ON;
Query OK, 0 rows affected (0.01 sec)
mysql> OPTIMIZE TABLE opening_lines;
+----------------------+----------+----------+---------+
| Table | Op | Msg_type | Msg_text |
+----------------------+----------+----------+----------+
| test.opening_lines | optimize | status | OK |
+----------------------+----------+----------+----------+
1 row in set (0.01 sec)
```


To avoid lengthy rebuild times for full-text indexes on large tables, you can use the innodb_ft_num_word_optimize option to perform the optimization in stages. The innodb_ft_num_word_optimize option defines the number of words that are optimized each time OPTIMIZE TABLE is run. The default setting is 2000 , which means that 2000 words are optimized each time OPTIMIZE TABLE is run. Subsequent OPTIMIZE TABLE operations continue from where the preceding OPTIMIZE TABLE operation ended.

\section*{Rebuilding MyISAM Full-Text Indexes}

If you modify full-text variables that affect indexing (ft_min_word_len, ft_max_word_len, or ft_stopword_file), or if you change the stopword file itself, you must rebuild your FULLTEXT indexes after making the changes and restarting the server.

To rebuild the FULLTEXT indexes for a MyISAM table, it is sufficient to do a QUICK repair operation:
mysql> REPAIR TABLE tbl_name QUICK;
Alternatively, use ALTER TABLE as just described. In some cases, this may be faster than a repair operation.

Each table that contains any FULLTEXT index must be repaired as just shown. Otherwise, queries for the table may yield incorrect results, and modifications to the table causes the server to see the table as corrupt and in need of repair.

If you use myisamchk to perform an operation that modifies MyISAM table indexes (such as repair or analyze), the FULLTEXT indexes are rebuilt using the default full-text parameter values for minimum word length, maximum word length, and stopword file unless you specify otherwise. This can result in queries failing.

The problem occurs because these parameters are known only by the server. They are not stored in MyISAM index files. To avoid the problem if you have modified the minimum or maximum word length or stopword file values used by the server, specify the same ft_min_word_len, ft_max_word_len, and ft_stopword_file values for myisamchk that you use for mysqld. For example, if you have set the minimum word length to 3 , you can repair a table with myisamchk like this:
```
myisamchk --recover --ft_min_word_len=3 tbl_name.MYI
```


To ensure that myisamchk and the server use the same values for full-text parameters, place each one in both the [mysqld] and [myisamchk] sections of an option file:
```
[mysqld]
ft_min_word_len=3
[myisamchk]
ft_min_word_len=3
```


An alternative to using myisamchk for MyISAM table index modification is to use the REPAIR TABLE, ANALYZE TABLE, OPTIMIZE TABLE, or ALTER TABLE statements. These statements are performed by the server, which knows the proper full-text parameter values to use.

\subsection*{14.9.7 Adding a User-Defined Collation for Full-Text Indexing}

\section*{Warning}

User-defined collations are deprecated; you should expect support for them to be removed in a future version of MySQL. The server issues a warning for any use of COLLATE user_defined_collation in an SQL statement; a warning is also issued when the server is started with --collation-server set equal to the name of a user-defined collation.

This section describes how to add a user-defined collation for full-text searches using the built-in fulltext parser. The sample collation is like latin1_swedish_ci but treats the ' - ' character as a letter rather than as a punctuation character so that it can be indexed as a word character. General information about adding collations is given in Section 12.14, "Adding a Collation to a Character Set"; it is assumed that you have read it and are familiar with the files involved.

To add a collation for full-text indexing, use the following procedure. The instructions here add a collation for a simple character set, which as discussed in Section 12.14, "Adding a Collation to a Character Set", can be created using a configuration file that describes the character set properties. For a complex character set such as Unicode, create collations using C source files that describe the character set properties.
1. Add a collation to the Index.xml file. The permitted range of IDs for user-defined collations is given in Section 12.14.2, "Choosing a Collation ID". The ID must be unused, so choose a value different from 1025 if that ID is already taken on your system.
```
<charset name="latin1">
...
<collation name="latin1_fulltext_ci" id="1025"/>
</charset>
```

2. Declare the sort order for the collation in the latin1.xml file. In this case, the order can be copied from latin1_swedish_ci:
```
<collation name="latin1_fulltext_ci">
<map>
00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F
10 11 12 13 14 15 16 17 18 19 1A 1B 1C 1D 1E 1F
20 21 22 23 24 25 26 27 28 29 2A 2B 2C 2D 2E 2F
30 31 32 33 34 35 36 37 38 39 3A 3B 3C 3D 3E 3F
40 41 42 43 44 45 46 47 48 49 4A 4B 4C 4D 4E 4F
50 51 52 53 54 55 56 57 58 59 5A 5B 5C 5D 5E 5F
60 41 42 43 44 45 46 47 48 49 4A 4B 4C 4D 4E 4F
50 51 52 53 54 55 56 57 58 59 5A 7B 7C 7D 7E 7F
80 81 82 83 84 85 86 87 88 89 8A 8B 8C 8D 8E 8F
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2234.jpg?height=31&width=794&top_left_y=616&top_left_x=342)
```
A0 A1 A2 A3 A4 A5 A6 A7 A8 A9 AA AB AC AD AE AF
B0 B1 B2 B3 B4 B5 B6 B7 B8 B9 BA BB BC BD BE BF
41 41 41 41 5C 5B 5C 43 45 45 45 45 49 49 49 49
44 4E 4F 4F 4F 4F 5D D7 D8 55 55 55 59 59 DE DF
41 41 41 41 5C 5B 5C 43 45 45 45 45 49 49 49 49
44 4E 4F 4F 4F 4F 5D F7 D8 55 55 55 59 59 DE FF
</map>
</collation>
```

3. Modify the ctype array in latin1.xml. Change the value corresponding to 0x2D (which is the code for the ' - ' character) from 10 (punctuation) to 01 (uppercase letter). In the following array, this is the element in the fourth row down, third value from the end.
```
<ctype>
<map>
00

\begin{tabular}{|l|l|l|l|l|l|l|l|l|l|l|l|l|l|l|l|}
\hline 20 & 20 & 20 & 20 & 20 & 20 & 20 & 20 & 20 & 28 & 28 & 28 & 28 & 28 & 20 & 20 \\
\hline 20 & 20 & 20 & 20 & 20 & 20 & 20 & 20 & 20 & 20 & 20 & 20 & 20 & 20 & 20 & 20 \\
\hline 48 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 01 & 10 & 10 \\
\hline 84 & 84 & 84 & 84 & 84 & 84 & 84 & 84 & 84 & 84 & 10 & 10 & 10 & 10 & 10 & 10 \\
\hline 10 & 81 & 81 & 81 & 81 & 81 & 81 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 \\
\hline 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 10 & 10 & 10 & 10 & 10 \\
\hline 10 & 82 & 82 & 82 & 82 & 82 & 82 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 \\
\hline 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 10 & 10 & 10 & 10 & 20 \\
\hline 10 & 00 & 10 & 02 & 10 & 10 & 10 & 10 & 10 & 10 & 01 & 10 & 01 & 00 & 01 & 00 \\
\hline 00 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 02 & 10 & 02 & 00 & 02 & 01 \\
\hline 48 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 \\
\hline 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 & 10 \\
\hline 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 01 \\
\hline 01 & 01 & 01 & 01 & 01 & 01 & 01 & 10 & 01 & 01 & 01 & 01 & 01 & 01 & 01 & 02 \\
\hline 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 \\
\hline 02 & 02 & 02 & 02 & 02 & 02 & 02 & 10 & 02 & 02 & 02 & 02 & 02 & 02 & 02 & 02 \\
\hline
\end{tabular}
</map>
</ctype>
```

4. Restart the server.
5. To employ the new collation, include it in the definition of columns that are to use it:
```
mysql> DROP TABLE IF EXISTS t1;
Query OK, 0 rows affected (0.13 sec)
mysql> CREATE TABLE t1 (
    a TEXT CHARACTER SET latin1 COLLATE latin1_fulltext_ci,
    FULLTEXT INDEX(a)
    ) ENGINE=InnoDB;
Query OK, 0 rows affected (0.47 sec)
```

6. Test the collation to verify that hyphen is considered as a word character:
```
mysql> INSERT INTO t1 VALUEs ('----'),('....'),('abcd');
Query OK, 3 rows affected (0.22 sec)
Records: 3 Duplicates: 0 Warnings: 0
mysql> SELECT * FROM t1 WHERE MATCH a AGAINST ('----' IN BOOLEAN MODE);
+------+
| a |
+------+
```

```
| ---- |
+------+
1 row in set (0.00 sec)
```


\section*{14．9．8 ngram Full－Text Parser}

The built－in MySQL full－text parser uses the white space between words as a delimiter to determine where words begin and end，which is a limitation when working with ideographic languages that do not use word delimiters．To address this limitation，MySQL provides an ngram full－text parser that supports Chinese，Japanese，and Korean（CJK）．The ngram full－text parser is supported for use with InnoDB and MyISAM．
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2235.jpg?height=122&width=99&top_left_y=717&top_left_x=370)

\section*{Note}

MySQL also provides a MeCab full－text parser plugin for Japanese，which tokenizes documents into meaningful words．For more information，see Section 14．9．9，＂MeCab Full－Text Parser Plugin＂．

An ngram is a contiguous sequence of $n$ characters from a given sequence of text．The ngram parser tokenizes a sequence of text into a contiguous sequence of $n$ characters．For example，you can tokenize＂abcd＂for different values of $n$ using the ngram full－text parser．
```
n=1: 'a', 'b', 'c', 'd'
n=2: 'ab', 'bc', 'cd'
n=3: 'abc', 'bcd'
n=4: 'abcd'
```


The ngram full－text parser is a built－in server plugin．As with other built－in server plugins，it is automatically loaded when the server is started．

The full－text search syntax described in Section 14．9，＂Full－Text Search Functions＂applies to the ngram parser plugin．Differences in parsing behavior are described in this section．Full－ text－related configuration options，except for minimum and maximum word length options （innodb＿ft＿min＿token＿size，innodb＿ft＿max＿token＿size，ft＿min＿word＿len， ft＿max＿word＿len）are also applicable．

\section*{Configuring ngram Token Size}

The ngram parser has a default ngram token size of 2 （bigram）．For example，with a token size of 2， the ngram parser parses the string＂abc def＂into four tokens：＂ab＂，＂bc＂，＂de＂and＂ef＂．
ngram token size is configurable using the ngram＿token＿size configuration option，which has a minimum value of 1 and maximum value of 10 ．

Typically，ngram＿token＿size is set to the size of the largest token that you want to search for． If you only intend to search for single characters，set ngram＿token＿size to 1 ．A smaller token size produces a smaller full－text search index，and faster searches．If you need to search for words comprised of more than one character，set ngram＿token＿size accordingly．For example，＂Happy Birthday＂is＂生日快乐＂in simplified Chinese，where＂生日＂is＂birthday＂，and＂快乐＂translates as ＂happy＂．To search on two－character words such as these，set ngram＿token＿size to a value of 2 or higher．

As a read－only variable，ngram＿token＿size may only be set as part of a startup string or in a configuration file：
－Startup string：
```
mysqld --ngram_token_size=2
```

－Configuration file：
```
[mysqld]
ngram_token_size=2
```


\section*{Note}

The following minimum and maximum word length configuration options are ignored for FULLTEXT indexes that use the ngram parser： innodb＿ft＿min＿token＿size，innodb＿ft＿max＿token＿size， ft＿min＿word＿len，and ft＿max＿word＿len．

\section*{Creating a FULLTEXT Index that Uses the ngram Parser}

To create a FULLTEXT index that uses the ngram parser，specify WITH PARSER ngram with CREATE TABLE，ALTER TABLE，or CREATE INDEX．

The following example demonstrates creating a table with an ngram FULLTEXT index，inserting sample data（Simplified Chinese text），and viewing tokenized data in the Information Schema INNODB＿FT＿INDEX＿CACHE table．
```
mysql> USE test;
mysql> CREATE TABLE articles (
        id INT UNSIGNED AUTO_INCREMENT NOT NULL PRIMARY KEY,
        title VARCHAR(200),
        body TEXT,
        FULLTEXT (title,body) WITH PARSER ngram
    ) ENGINE=InnoDB CHARACTER SET utf8mb4;
mysql> SET NAMES utf8mb4;
INSERT INTO articles (title,body) VALUES
    ('数据库管理','在本教程中我将向你展示如何管理数据库'),
    ('数据库应用开发','学习开发数据库应用程序');
mysql> SET GLOBAL innodb_ft_aux_table="test/articles";
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_INDEX_CACHE ORDER BY doc_id, position;
```


To add a FULLTEXT index to an existing table，you can use ALTER TABLE or CREATE INDEX．For example：
```
CREATE TABLE articles (
        id INT UNSIGNED AUTO_INCREMENT NOT NULL PRIMARY KEY,
        title VARCHAR(200),
        body TEXT
    ) ENGINE=InnoDB CHARACTER SET utf8mb4;
ALTER TABLE articles ADD FULLTEXT INDEX ft_index (title,body) WITH PARSER ngram;
# Or:
CREATE FULLTEXT INDEX ft_index ON articles (title,body) WITH PARSER ngram;
```


\section*{ngram Parser Space Handling}

The ngram parser eliminates spaces when parsing．For example：
－＂ab cd＂is parsed to＂ab＂，＂cd＂
－＂a bc＂is parsed to＂bc＂

\section*{ngram Parser Stopword Handling}

The built－in MySQL full－text parser compares words to entries in the stopword list．If a word is equal to an entry in the stopword list，the word is excluded from the index．For the ngram parser， stopword handling is performed differently．Instead of excluding tokens that are equal to entries in the stopword list，the ngram parser excludes tokens that contain stopwords．For example，assuming ngram＿token＿size＝2，a document that contains＂a，b＂is parsed to＂a，＂and＂，b＂．If a comma（＂，＂）is defined as a stopword，both＂a，＂and＂，b＂are excluded from the index because they contain a comma．

By default，the ngram parser uses the default stopword list，which contains a list of English stopwords． For a stopword list applicable to Chinese，Japanese，or Korean，you must create your own．For information about creating a stopword list，see Section 14．9．4，＂Full－Text Stopwords＂．

Stopwords greater in length than ngram＿token＿size are ignored．

\section*{ngram Parser Term Search}

For natural language mode search，the search term is converted to a union of ngram terms．For example，the string＂abc＂（assuming ngram＿token＿size＝2）is converted to＂ab bc＂．Given two documents，one containing＂ab＂and the other containing＂abc＂，the search term＂ab bc＂matches both documents．

For boolean mode search，the search term is converted to an ngram phrase search．For example，the string＇abc＇（assuming ngram＿token＿size＝2）is converted to＇＂ab bc＂＇．Given two documents，one containing＇ab＇and the other containing＇abc＇，the search phrase＇＂ab bc＂＇only matches the document containing＇abc＇．

\section*{ngram Parser Wildcard Search}

Because an ngram FULLTEXT index contains only ngrams，and does not contain information about the beginning of terms，wildcard searches may return unexpected results．The following behaviors apply to wildcard searches using ngram FULLTEXT search indexes：
－If the prefix term of a wildcard search is shorter than ngram token size，the query returns all indexed rows that contain ngram tokens starting with the prefix term．For example，assuming ngram＿token＿size＝2，a search on＂a＊＂returns all rows starting with＂a＂．
－If the prefix term of a wildcard search is longer than ngram token size，the prefix term is converted to an ngram phrase and the wildcard operator is ignored．For example，assuming ngram＿token＿size＝2，an＂abc＊＂wildcard search is converted to＂ab bc＂．

\section*{ngram Parser Phrase Search}

Phrase searches are converted to ngram phrase searches．For example，The search phrase＂abc＂is converted to＂ab bc＂，which returns documents containing＂abc＂and＂ab bc＂．

The search phrase＂abc def＂is converted to＂ab bc de ef＂，which returns documents containing＂abc def＂and＂ab bc de ef＂．A document that contains＂abcdef＂is not returned．

\section*{14．9．9 MeCab Full－Text Parser Plugin}

The built－in MySQL full－text parser uses the white space between words as a delimiter to determine where words begin and end，which is a limitation when working with ideographic languages that do not use word delimiters．To address this limitation for Japanese，MySQL provides a MeCab full－text parser plugin．The MeCab full－text parser plugin is supported for use with InnoDB and MyISAM．
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2237.jpg?height=106&width=99&top_left_y=2129&top_left_x=370)

Note
MySQL also provides an ngram full－text parser plugin that supports Japanese．
For more information，see Section 14．9．8，＂ngram Full－Text Parser＂．
The MeCab full－text parser plugin is a full－text parser plugin for Japanese that tokenizes a sequence of text into meaningful words．For example，MeCab tokenizes＂データベース管理＂（＂Database Management＂）into＂データベース＂（＂Database＂）and＂管理＂（＂Management＂）．By comparison，the ngram full－text parser tokenizes text into a contiguous sequence of $n$ characters，where $n$ represents a number between 1 and 10 ．

In addition to tokenizing text into meaningful words，MeCab indexes are typically smaller than ngram indexes，and MeCab full－text searches are generally faster．One drawback is that it may take longer for the MeCab full－text parser to tokenize documents，compared to the ngram full－text parser．

The full-text search syntax described in Section 14.9, "Full-Text Search Functions" applies to the MeCab parser plugin. Differences in parsing behavior are described in this section. Full-text related configuration options are also applicable.

For additional information about the MeCab parser, refer to the MeCab: Yet Another Part-of-Speech and Morphological Analyzer project on Github.

\section*{Installing the MeCab Parser Plugin}

The MeCab parser plugin requires mecab and mecab-ipadic.
On supported Fedora, Debian and Ubuntu platforms (except Ubuntu 12.04 where the system mecab version is too old), MySQL dynamically links to the system mecab installation if it is installed to the default location. On other supported Unix-like platforms, libmecab. so is statically linked in libpluginmecab. so, which is located in the MySQL plugin directory. mecab-ipadic is included in MySQL binaries and is located in MYSQL_HOME \lib\mecab.

You can install mecab and mecab-ipadic using a native package management utility (on Fedora, Debian, and Ubuntu), or you can build mecab and mecab-ipadic from source. For information about installing mecab and mecab-ipadic using a native package management utility, see Installing MeCab From a Binary Distribution (Optional). If you want to build mecab and mecab-ipadic from source, see Building MeCab From Source (Optional).

On Windows, libmecab.dll is found in the MySQL bin directory. mecab-ipadic is located in MYSQL_HOME/lib/mecab.

To install and configure the MeCab parser plugin, perform the following steps:
1. In the MySQL configuration file, set the mecab_rc_file configuration option to the location of the mecabrc configuration file, which is the configuration file for MeCab. If you are using the MeCab package distributed with MySQL, the mecabrc file is located in MYSQL_HOME/lib/mecab/etc/.
[mysqld]
loose-mecab-rc-file=MYSQL_HOME/lib/mecab/etc/mecabrc
The loose prefix is an option modifier. The mecab_rc_file option is not recognized by MySQL until the MeCaB parser plugin is installed but it must be set before attempting to install the MeCaB parser plugin. The loose prefix allows you restart MySQL without encountering an error due to an unrecognized variable.

If you use your own MeCab installation, or build MeCab from source, the location of the mecabrc configuration file may differ.

For information about the MySQL configuration file and its location, see Section 6.2.2.2, "Using Option Files".
2. Also in the MySQL configuration file, set the minimum token size to 1 or 2 , which are the values recommended for use with the MeCab parser. For InnoDB tables, minimum token size is defined by the innodb_ft_min_token_size configuration option, which has a default value of 3 . For MyISAM tables, minimum token size is defined by ft_min_word_len, which has a default value of 4.
```
[mysqld]
innodb_ft_min_token_size=1
```

3. Modify the mecabrc configuration file to specify the dictionary you want to use. The mecabipadic package distributed with MySQL binaries includes three dictionaries (ipadic_euc-jp, ipadic_sjis, and ipadic_utf-8). The mecabrc configuration file packaged with MySQL contains and entry similar to the following:
dicdir = /path/to/mysql/lib/mecab/lib/mecab/dic/ipadic_euc-jp
To use the ipadic_utf-8 dictionary, for example, modify the entry as follows:
dicdir=MYSQL_HOME/lib/mecab/dic/ipadic_utf-8
If you are using your own MeCab installation or have built MeCab from source, the default dicdir entry in the mecabrc file is likely to differ, as are the dictionaries and their location.

\section*{Note}

After the MeCab parser plugin is installed, you can use the mecab_charset status variable to view the character set used with MeCab. The three MeCab dictionaries provided with the MySQL binary support the following character sets.
- The ipadic_euc-jp dictionary supports the ujis and eucjpms character sets.
- The ipadic_sjis dictionary supports the sjis and cp932 character sets.
- The ipadic_utf-8 dictionary supports the utf8mb3 and utf8mb4 character sets.
mecab_charset only reports the first supported character set. For example, the ipadic_utf-8 dictionary supports both utf8mb3 and utf8mb4. mecab_charset always reports utf8 when this dictionary is in use.
4. Restart MySQL.
5. Install the MeCab parser plugin:

The MeCab parser plugin is installed using INSTALL PLUGIN. The plugin name is mecab, and the shared library name is libpluginmecab. so. For additional information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

INSTALL PLUGIN mecab SONAME 'libpluginmecab.so';
Once installed, the MeCab parser plugin loads at every normal MySQL restart.
6. Verify that the MeCab parser plugin is loaded using the SHOW PLUGINS statement.
mysql> SHOW PLUGINS;
A mecab plugin should appear in the list of plugins.

\section*{Creating a FULLTEXT Index that uses the MeCab Parser}

To create a FULLTEXT index that uses the mecab parser, specify WITH PARSER ngram with CREATE TABLE, ALTER TABLE, or CREATE INDEX.

This example demonstrates creating a table with a mecab FULLTEXT index, inserting sample data, and viewing tokenized data in the Information Schema INNODB_FT_INDEX_CACHE table:
```
mysql> USE test;
mysql> CREATE TABLE articles (
    id INT UNSIGNED AUTO_INCREMENT NOT NULL PRIMARY KEY,
    title VARCHAR(200),
    body TEXT,
    FULLTEXT (title,body) WITH PARSER mecab
    ) ENGINE=InnoDB CHARACTER SET utf8mb4;
mysql> SET NAMES utf8mb4;
mysql> INSERT INTO articles (title,body) VALUES
```

```
    ('データベース管理','このチュートリアルでは、私はどのようにデータベースを管理する方法を紹介します'),
    ('データベースアプリケーション開発','データベースアプリケーションを開発することを学ぶ');
mysql> SET GLOBAL innodb_ft_aux_table="test/articles";
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_INDEX_CACHE ORDER BY doc_id, position;
```


To add a FULLTEXT index to an existing table，you can use ALTER TABLE or CREATE INDEX．For example：
```
CREATE TABLE articles (
    id INT UNSIGNED AUTO_INCREMENT NOT NULL PRIMARY KEY,
    title VARCHAR(200),
    body TEXT
    ) ENGINE=InnoDB CHARACTER SET utf8mb4;
ALTER TABLE articles ADD FULLTEXT INDEX ft_index (title,body) WITH PARSER mecab;
# Or:
CREATE FULLTEXT INDEX ft_index ON articles (title,body) WITH PARSER mecab;
```


\section*{MeCab Parser Space Handling}

The MeCab parser uses spaces as separators in query strings．For example，the MeCab parser tokenizes データベース管理 as データベース and 管理．

\section*{MeCab Parser Stopword Handling}

By default，the MeCab parser uses the default stopword list，which contains a short list of English stopwords．For a stopword list applicable to Japanese，you must create your own．For information about creating stopword lists，see Section 14．9．4，＂Full－Text Stopwords＂．

\section*{MeCab Parser Term Search}

For natural language mode search，the search term is converted to a union of tokens．For example， データベース管理 is converted to データベース 管理．
```
SELECT COUNT(*) FROM articles
    WHERE MATCH(title,body) AGAINST('データベース管理' IN NATURAL LANGUAGE MODE);
```


For boolean mode search，the search term is converted to a search phrase．For example， データベース管理 is converted to データベース 管理．
```
SELECT COUNT(*) FROM articles
    WHERE MATCH(title,body) AGAINST('データベース管理' IN BOOLEAN MODE);
```


\section*{MeCab Parser Wildcard Search}

Wildcard search terms are not tokenized．A search on データベース管理＊is performed on the prefix， データベース管理．
```
SELECT COUNT(*) FROM articles
    WHERE MATCH(title,body) AGAINST('データベース*' IN BOOLEAN MODE);
```


\section*{MeCab Parser Phrase Search}

Phrases are tokenized．For example，データベース管理 is tokenized as データベース管理．
```
SELECT COUNT(*) FROM articles
    WHERE MATCH(title,body) AGAINST('"データベース管理"' IN BOOLEAN MODE);
```


\section*{Installing MeCab From a Binary Distribution（Optional）}

This section describes how to install mecab and mecab－ipadic from a binary distribution using a native package management utility．For example，on Fedora，you can use Yum to perform the installation：
\$> yum mecab-devel
On Debian or Ubuntu, you can perform an APT installation:
```
$> apt-get install mecab
$> apt-get install mecab-ipadic
```


\section*{Installing MeCab From Source (Optional)}

If you want to build mecab and mecab-ipadic from source, basic installation steps are provided below. For additional information, refer to the MeCab documentation.
1. Download the tar.gz packages for mecab and mecab-ipadic from http://taku910.github.io/mecab/ \#download. As of February, 2016, the latest available packages are mecab-0.996.tar.gz and mecab-ipadic-2.7.0-20070801.tar.gz.
2. Install mecab:
```
$> tar zxfv mecab-0.996.tar
$> cd mecab-0.996
$> ./configure
$> make
$> make check
$> su
$> make install
```

3. Install mecab-ipadic:
```
$> tar zxfv mecab-ipadic-2.7.0-20070801.tar
$> cd mecab-ipadic-2.7.0-20070801
$> ./configure
$> make
$> su
$> make install
```

4. Compile MySQL using the WITH_MECAB CMake option. Set the WITH_MECAB option to system if you have installed mecab and mecab-ipadic to the default location.
-DWITH_MECAB=system
If you defined a custom installation directory, set WITH_MECAB to the custom directory. For example:
-DWITH_MECAB=/path/to/mecab

\subsection*{14.10 Cast Functions and Operators}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.15 Cast Functions and Operators}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline BINARY & Cast a string to a binary string & Yes \\
\hline CAST( ) & Cast a value as a certain type & \\
\hline CONVERT( ) & Cast a value as a certain type & \\
\hline
\end{tabular}
\end{table}

Cast functions and operators enable conversion of values from one data type to another.
- Cast Function and Operator Descriptions
- Character Set Conversions
- Character Set Conversions for String Comparisons
- Cast Operations on Spatial Types
- Other Uses for Cast Operations

\section*{Cast Function and Operator Descriptions}
- BINARY expr

The BINARY operator converts the expression to a binary string (a string that has the binary character set and binary collation). A common use for BINARY is to force a character string comparison to be done byte by byte using numeric byte values rather than character by character. The BINARY operator also causes trailing spaces in comparisons to be significant. For information about the differences between the binary collation of the binary character set and the _bin collations of nonbinary character sets, see Section 12.8.5, "The binary Collation Compared to _bin Collations".

The BINARY operator is deprecated; you should expect its removal in a future version of MySQL. Use CAST(... AS BINARY) instead.
```
mysql> SET NAMES utf8mb4 COLLATE utf8mb4_general_ci;
    -> OK
mysql> SELECT 'a' = 'A';
    -> 1
mysql> SELECT BINARY 'a' = 'A';
    -> 0
mysql> SELECT 'a' = 'a ';
    -> 1
mysql> SELECT BINARY 'a' = 'a ';
    -> 0
```


In a comparison, BINARY affects the entire operation; it can be given before either operand with the same result.

To convert a string expression to a binary string, these constructs are equivalent:
```
CONVERT(expr USING BINARY)
CAST(expr AS BINARY)
BINARY expr
```


If a value is a string literal, it can be designated as a binary string without converting it by using the _binary character set introducer:
```
mysql> SELECT 'a' = 'A';
    -> 1
mysql> SELECT _binary 'a' = 'A';
    -> 0
```


For information about introducers, see Section 12.3.8, "Character Set Introducers".
The BINARY operator in expressions differs in effect from the BINARY attribute in character column definitions. For a character column defined with the BINARY attribute, MySQL assigns the table default character set and the binary (_bin) collation of that character set. Every nonbinary character set has a _bin collation. For example, if the table default character set is utf 8 mb 4 , these two column definitions are equivalent:
```
CHAR(10) BINARY
CHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
```


The use of CHARACTER SET binary in the definition of a CHAR, VARCHAR, or TEXT column causes the column to be treated as the corresponding binary string data type. For example, the following pairs of definitions are equivalent:
```
CHAR(10) CHARACTER SET binary
BINARY(10)
VARCHAR(10) CHARACTER SET binary
VARBINARY(10)
```

```
TEXT CHARACTER SET binary
BLOB
```


If BINARY is invoked from within the mysql client, binary strings display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".
- CAST(expr AS type [ARRAY])
```
CAST(timestamp_value AT TIME ZONE timezone_specifier AS
DATETIME[(precision)])
timezone_specifier: [INTERVAL] '+00:00' | 'UTC'
```


With CAST( expr AS type syntax, the CAST( ) function takes an expression of any type and produces a result value of the specified type. This operation may also be expressed as CONVERT(expr, type), which is equivalent. If expr is NULL, CAST( ) returns NULL.

These type values are permitted:
- BINARY[(N)]

Produces a string with the VARBINARY data type, except that when the expression expr is empty (zero length), the result type is $\operatorname{BINARY}(0)$. If the optional length $N$ is given, $\operatorname{BINARY}(N)$ causes the cast to use no more than $N$ bytes of the argument. Values shorter than $N$ bytes are padded with $0 \times 00$ bytes to a length of $N$. If the optional length $N$ is not given, MySQL calculates the maximum length from the expression. If the supplied or calculated length is greater than an internal threshold, the result type is BLOB. If the length is still too long, the result type is LONGBLOB.

For a description of how casting to BINARY affects comparisons, see Section 13.3.3, "The BINARY and VARBINARY Types".
- CHAR[(N)] [charset_info]

Produces a string with the VARCHAR data type, unless the expression expr is empty (zero length), in which case the result type is $\operatorname{CHAR}(0)$. If the optional length $N$ is given, $\operatorname{CHAR}(N)$ causes the cast to use no more than $N$ characters of the argument. No padding occurs for values shorter than $N$ characters. If the optional length $N$ is not given, MySQL calculates the maximum length from the expression. If the supplied or calculated length is greater than an internal threshold, the result type is TEXT. If the length is still too long, the result type is LONGTEXT.

With no charset_info clause, CHAR produces a string with the default character set. To specify the character set explicitly, these charset_info values are permitted:
- CHARACTER SET charset_name: Produces a string with the given character set.
- ASCII: Shorthand for CHARACTER SET latin1.
- UNICODE: Shorthand for CHARACTER SET ucs2.

In all cases, the string has the character set default collation.
- DATE

Produces a DATE value.
- DATETIME[(M)]

Produces a DATETIME value. If the optional $M$ value is given, it specifies the fractional seconds precision.
- DECIMAL[(M[,D])]

Produces a DECIMAL value. If the optional $M$ and $D$ values are given, they specify the maximum number of digits (the precision) and the number of digits following the decimal point (the scale). If $D$ is omitted, 0 is assumed. If $M$ is omitted, 10 is assumed.
- DOUBLE

Produces a DOUBLE result.
- FLOAT [( $p$ )]

If the precision $p$ is not specified, produces a result of type FLOAT. If $p$ is provided and $0<=<p<=$ 24 , the result is of type FLOAT. If $25<=p<=53$, the result is of type DOUBLE. If $p<0$ or $p>53$, an error is returned.
- JSON

Produces a JSON value. For details on the rules for conversion of values between JSON and other types, see Comparison and Ordering of JSON Values.
- NCHAR [(N)]

Like CHAR, but produces a string with the national character set. See Section 12.3.7, "The National Character Set".

Unlike CHAR, NCHAR does not permit trailing character set information to be specified.
- REAL

Produces a result of type REAL. This is actually FLOAT if the REAL_AS_FLOAT SQL mode is enabled; otherwise the result is of type DOUBLE.
- SIGNED [INTEGER]

Produces a signed BIGINT value.
- spatial_type

CAST( ) and CONVERT( ) support casting geometry values from one spatial type to another, for certain combinations of spatial types. For details, see Cast Operations on Spatial Types.
- TIME[(M)]

Produces a TIME value. If the optional $M$ value is given, it specifies the fractional seconds precision.
- UNSIGNED [INTEGER]

Produces an unsigned BIGINT value.
- YEAR

Produces a YEAR value. These rules govern conversion to YEAR as follows:
- For a four-digit number in the range 1901-2155 inclusive, or for a string which can be interpreted as a four-digit number in this range, return the corresponding YEAR value.
- For a number consisting of one or two digits, or for a string which can be interpreted as such a number, return a YEAR value as follows:
- If the number is in the range $1-69$ inclusive, add 2000 and return the sum.
- If the number is in the range $70-99$ inclusive, add 1900 and return the sum.
- For a string which evaluates to 0 , return 2000 .
- For the number 0 , return 0 .
- For a DATE, DATETIME, or TIMESTAMP value, return the YEAR portion of the value. For a TIME value, return the current year.

If you do not specify the type of a TIME argument, you may get a different result from what you expect, as shown here:
```
mysql> SELECT CAST("11:35:00" AS YEAR), CAST(TIME "11:35:00" AS YEAR);
+-----------------------------+--------------------------------
| CAST("11:35:00" AS YEAR) | CAST(TIME "11:35:00" AS YEAR) |
+----------------------------+--------------------------------
| 2011 | 2021 |
+----------------------------+-------------------------------
```

- If the argument is of type DECIMAL, DOUBLE, DECIMAL, or REAL, round the value to the nearest integer, then attempt to cast the value to YEAR using the rules for integer values, as shown here:
```
mysql> SELECT CAST(1944.35 AS YEAR), CAST(1944.50 AS YEAR);
+-------------------------+-----------------------+
| CAST(1944.35 AS YEAR) | CAST(1944.50 AS YEAR) |
+-------------------------+----------------------+
| 1944 | 1945 |
+-------------------------+-----------------------
mysql> SELECT CAST(66.35 AS YEAR), CAST(66.50 AS YEAR);
+----------------------+---------------------+
| CAST(66.35 AS YEAR) | CAST(66.50 AS YEAR) |
+----------------------+---------------------+
| 2066 | 2067 |
+----------------------+---------------------
```

- An argument of type GEOMETRY cannot be converted to YEAR.
- For a value that cannot be successfully converted to YEAR, return NULL.

A string value containing non-numeric characters which must be truncated prior to conversion raises a warning, as shown here:
```
mysql> SELECT CAST("1979aaa" AS YEAR);
+---------------------------+
| CAST("1979aaa" AS YEAR) |
+---------------------------+
| 1979 |
+---------------------------+
1 row in set, 1 warning (0.00 sec)
```

```
mysql> SHOW WARNINGS;
+----------+------+-------------------------------------------
| Level | Code | Message |
+----------+------+--------------------------------------------
| Warning | 1292 | Truncated incorrect YEAR value: '1979aaa' |
+----------+------+-------------------------------------------
```


InnoDB allows the use of an additional ARRAY keyword for creating a multi-valued index on a JSON array as part of CREATE INDEX, CREATE TABLE, and ALTER TABLE statements. ARRAY is not supported except when used to create a multi-valued index in one of these statements, in which case it is required. The column being indexed must be a column of type JSON. With ARRAY, the type following the AS keyword may specify any of the types supported by CAST( ), with the exceptions of BINARY, JSON, and YEAR. For syntax information and examples, as well as other relevant information, see Multi-Valued Indexes.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2246.jpg?height=123&width=99&top_left_y=826&top_left_x=342)

Note
CONVERT( ), unlike CAST( ), does not support multi-valued index creation or the ARRAY keyword.

CAST( ) supports retrieval of a TIMESTAMP value as being in UTC, using the AT TIMEZONE operator. The only supported time zone is UTC; this can be specified as either of ' $+00: 00$ ' or 'UTC'. The only return type supported by this syntax is DATETIME, with an optional precision specifier in the range of 0 to 6 , inclusive.

TIMESTAMP values that use timezone offsets are also supported.
```
mysql> SELECT @@system_time_zone;
+---------------------+
| @@system_time_zone |
+---------------------+
| EDT
+---------------------+
1 row in set (0.00 sec)
mysql> CREATE TABLE tz (c TIMESTAMP);
Query OK, 0 rows affected (0.41 sec)
mysql> INSERT INTO tz VALUES
        -> ROW(CURRENT_TIMESTAMP),
    -> ROW('2020-07-28 14:50:15+1:00');
Query OK, 1 row affected (0.08 sec)
mysql> TABLE tz;
+-----------------------+
| c |
+-----------------------+
| 2020-07-28 09:22:41 |
| 2020-07-28 09:50:15 |
+-----------------------+
2 rows in set (0.00 sec)
mysql> SELECT CAST(c AT TIME ZONE '+00:00' AS DATETIME) AS u FROM tz;
+-----------------------+
| u |
+----------------------+
| 2020-07-28 13:22:41 |
| 2020-07-28 13:50:15 |
+----------------------+
2 rows in set (0.00 sec)
mysql> SELECT CAST(c AT TIME ZONE 'UTC' AS DATETIME(2)) AS u FROM tz;
+--------------------------+
| u |
+--------------------------+
| 2020-07-28 13:22:41.00 |
| 2020-07-28 13:50:15.00 |
+--------------------------+
```

```
2 rows in set (0.00 sec)
```


If you use 'UTC' as the time zone specifier with this form of CAST( ), and the server raises an error such as Unknown or incorrect time zone: 'UTC', you may need to install the MySQL time zone tables (see Populating the Time Zone Tables).

AT TIME ZONE does not support the ARRAY keyword, and is not supported by the CONVERT ( ) function.
- CONVERT(expr USING transcoding_name)

CONVERT(expr,type)
CONVERT(expr USING transcoding_name) is standard SQL syntax. The non-USING form of CONVERT( ) is ODBC syntax. Regardless of the syntax used, the function returns NULL if expr is NULL.

CONVERT(expr USING transcoding_name) converts data between different character sets. In MySQL, transcoding names are the same as the corresponding character set names. For example, this statement converts the string 'abc ' in the default character set to the corresponding string in the utf 8 mb 4 character set:
```
SELECT CONVERT('abc' USING utf8mb4);
```


CONVERT( expr, type) syntax (without USING) takes an expression and a type value specifying a result type, and produces a result value of the specified type. This operation may also be expressed as CAST(expr AS type), which is equivalent. For more information, see the description of CAST( ).

\section*{Character Set Conversions}

CONVERT( ) with a USING clause converts data between character sets:
```
CONVERT(expr USING transcoding_name)
```


In MySQL, transcoding names are the same as the corresponding character set names.
Examples:
```
SELECT CONVERT('test' USING utf8mb4);
SELECT CONVERT(_latin1'Müller' USING utf8mb4);
INSERT INTO utf8mb4_table (utf8mb4_column)
    SELECT CONVERT(latin1_column USING utf8mb4) FROM latin1_table;
```


To convert strings between character sets, you can also use CONVERT (expr, type) syntax (without USING), or CAST(expr AS type), which is equivalent:
```
CONVERT(string, CHAR[(N)] CHARACTER SET charset_name)
CAST(string AS CHAR[(N)] CHARACTER SET charset_name)
```


Examples:
```
SELECT CONVERT('test', CHAR CHARACTER SET utf8mb4);
SELECT CAST('test' AS CHAR CHARACTER SET utf8mb4);
```


If you specify CHARACTER SET charset_name as just shown, the character set and collation of the result are charset_name and the default collation of charset_name. If you omit CHARACTER SET charset_name, the character set and collation of the result are defined by the character_set_connection and collation_connection system variables that determine the default connection character set and collation (see Section 12.4, "Connection Character Sets and Collations").

A COLLATE clause is not permitted within a CONVERT( ) or CAST( ) call, but you can apply it to the function result. For example, these are legal:
```
SELECT CONVERT('test' USING utf8mb4) COLLATE utf8mb4_bin;
SELECT CONVERT('test', CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_bin;
SELECT CAST('test' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_bin;
```


But these are illegal:
```
SELECT CONVERT('test' USING utf8mb4 COLLATE utf8mb4_bin);
SELECT CONVERT('test', CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_bin);
SELECT CAST('test' AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_bin);
```


For string literals, another way to specify the character set is to use a character set introducer. _latin1 and _latin2 in the preceding example are instances of introducers. Unlike conversion functions such as CAST( ), or CONVERT( ), which convert a string from one character set to another, an introducer designates a string literal as having a particular character set, with no conversion involved. For more information, see Section 12.3.8, "Character Set Introducers".

\section*{Character Set Conversions for String Comparisons}

Normally, you cannot compare a BLOB value or other binary string in case-insensitive fashion because binary strings use the binary character set, which has no collation with the concept of lettercase. To perform a case-insensitive comparison, first use the CONVERT( ) or CAST( ) function to convert the value to a nonbinary string. Comparisons of the resulting string use its collation. For example, if the conversion result collation is not case-sensitive, a LIKE operation is not case-sensitive. That is true for the following operation because the default utf8mb4 collation (utf8mb4_0900_ai_ci) is not casesensitive:
```
SELECT 'A' LIKE CONVERT(blob_col USING utf8mb4)
    FROM tbl_name;
```


To specify a particular collation for the converted string, use a COLLATE clause following the CONVERT( ) call:
```
SELECT 'A' LIKE CONVERT(blob_col USING utf8mb4) COLLATE utf8mb4_unicode_ci
    FROM tbl_name;
```


To use a different character set, substitute its name for utf8mb4 in the preceding statements (and similarly to use a different collation).

CONVERT( ) and CAST( ) can be used more generally for comparing strings represented in different character sets. For example, a comparison of these strings results in an error because they have different character sets:
```
mysql> SET @s1 = _latin1 'abc', @s2 = _latin2 'abc';
mysql> SELECT @s1 = @s2;
ERROR 1267 (HY000): Illegal mix of collations (latin1_swedish_ci,IMPLICIT)
and (latin2_general_ci,IMPLICIT) for operation '='
```


Converting one of the strings to a character set compatible with the other enables the comparison to occur without error:
```
mysql> SELECT @s1 = CONVERT(@s2 USING latin1);
+----------------------------------+
| @s1 = CONVERT(@s2 USING latin1) |
+-----------------------------------+
| 1 |
+----------------------------------+
```


Character set conversion is also useful preceding lettercase conversion of binary strings. LOWER( ) and UPPER( ) are ineffective when applied directly to binary strings because the concept of lettercase does not apply. To perform lettercase conversion of a binary string, first convert it to a nonbinary string using a character set appropriate for the data stored in the string:
```
mysql> SET @str = BINARY 'New York';
mysql> SELECT LOWER(@str), LOWER(CONVERT(@str USING utf8mb4));
+--------------+--------------------------------------
| LOWER(@str) | LOWER(CONVERT(@str USING utf8mb4)) |
```

```
+--------------+--------------------------------------+
+--------------+-----------------------------------+
```


Be aware that if you apply BINARY, CAST ( ), or CONVERT ( ) to an indexed column, MySQL may not be able to use the index efficiently.

\section*{Cast Operations on Spatial Types}

CAST( ) and CONVERT( ) support casting geometry values from one spatial type to another, for certain combinations of spatial types. The following list shows the permitted type combinations, where "MySQL extension" designates casts implemented in MySQL beyond those defined in the SQL/MM standard:
- From Point to:
- MultiPoint
- GeometryCollection
- From LineString to:
- Polygon (MySQL extension)
- MultiPoint (MySQL extension)
- MultiLineString
- GeometryCollection
- From Polygon to:
- LineString (MySQL extension)
- MultiLineString (MySQL extension)
- MultiPolygon
- GeometryCollection
- From MultiPoint to:
- Point
- LineString (MySQL extension)
- GeometryCollection
- From MultiLineString to:
- LineString
- Polygon (MySQL extension)
- MultiPolygon (MySQL extension)
- GeometryCollection
- From MultiPolygon to:
- Polygon
- MultiLineString (MySQL extension)
- GeometryCollection
- From GeometryCollection to:
- Point
- LineString
- Polygon
- MultiPoint
- MultiLineString
- MultiPolygon

In spatial casts, GeometryCollection and GeomCollection are synonyms for the same result type.

Some conditions apply to all spatial type casts, and some conditions apply only when the cast result is to have a particular spatial type. For information about terms such as "well-formed geometry," see Section 13.4.4, "Geometry Well-Formedness and Validity".
- General Conditions for Spatial Casts
- Conditions for Casts to Point
- Conditions for Casts to LineString
- Conditions for Casts to Polygon
- Conditions for Casts to MultiPoint
- Conditions for Casts to MultiLineString
- Conditions for Casts to MultiPolygon
- Conditions for Casts to GeometryCollection

\section*{General Conditions for Spatial Casts}

These conditions apply to all spatial casts regardless of the result type:
- The result of a cast is in the same SRS as that of the expression to cast.
- Casting between spatial types does not change coordinate values or order.
- If the expression to cast is NULL, the function result is NULL.
- Casting to spatial types using the JSON_VALUE( ) function with a RETURNING clause specifying a spatial type is not permitted.
- Casting to an ARRAY of spatial types is not permitted.
- If the spatial type combination is permitted but the expression to cast is not a syntactically wellformed geometry, an ER_GIS_INVALID_DATA error occurs.
- If the spatial type combination is permitted but the expression to cast is a syntactically well-formed geometry in an undefined spatial reference system (SRS), an ER_SRS_NOT_FOUND error occurs.
- If the expression to cast has a geographic SRS but has a longitude or latitude that is out of range, an error occurs:
- If a longitude value is not in the range ( -180 , 180], an ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE error occurs.
- If a latitude value is not in the range [-90,90], an

ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE error occurs.
Ranges shown are in degrees. If an SRS uses another unit, the range uses the corresponding values in its unit. The exact range limits deviate slightly due to floating-point arithmetic.

\section*{Conditions for Casts to Point}

When the cast result type is Point, these conditions apply:
- If the expression to cast is a well-formed geometry of type Point, the function result is that Point.
- If the expression to cast is a well-formed geometry of type MultiPoint containing a single Point, the function result is that Point. If the expression contains more than one Point, an ER_INVALID_CAST_TO_GEOMETRY error occurs.
- If the expression to cast is a well-formed geometry of type GeometryCollection containing only a single Point, the function result is that Point. If the expression is empty, contains more than one Point, or contains other geometry types, an ER_INVALID_CAST_TO_GEOMETRY error occurs.
- If the expression to cast is a well-formed geometry of type other than Point, MultiPoint, GeometryCollection, an ER_INVALID_CAST_TO_GEOMETRY error occurs.

\section*{Conditions for Casts to LineString}

When the cast result type is LineString, these conditions apply:
- If the expression to cast is a well-formed geometry of type LineString, the function result is that LineString.
- If the expression to cast is a well-formed geometry of type Polygon that has no inner rings, the function result is a LineString containing the points of the outer ring in the same order. If the expression has inner rings, an ER_INVALID_CAST_TO_GEOMETRY error occurs.
- If the expression to cast is a well-formed geometry of type MultiPoint containing at least two points, the function result is a LineString containing the points of the MultiPoint in the order they appear in the expression. If the expression contains only one Point, an ER_INVALID_CAST_TO_GEOMETRY error occurs.
- If the expression to cast is a well-formed geometry of type MultiLineString containing a single LineString, the function result is that LineString. If the expression contains more than one LineString, an ER_INVALID_CAST_TO_GEOMETRY error occurs.
- If the expression to cast is a well-formed geometry of type GeometryCollection, containing only a single LineString, the function result is that LineString. If the expression is empty, contains more than one LineString, or contains other geometry types, an ER_INVALID_CAST_TO_GEOMETRY error occurs.
- If the expression to cast is a well-formed geometry of type other than LineString, Polygon, MultiPoint, MultiLineString, or GeometryCollection, an ER_INVALID_CAST_TO_GEOMETRY error occurs.

\section*{Conditions for Casts to Polygon}

When the cast result type is Polygon, these conditions apply:
- If the expression to cast is a well-formed geometry of type LineString that is a ring (that is, the start and end points are the same), the function result is a Polygon with an outer ring consisting of the points of the LineString in the same order. If the expression is not a ring, an ER_INVALID_CAST_TO_GEOMETRY error occurs. If the ring is not in the correct order (the exterior ring must be counter-clockwise), an ER_INVALID_CAST_POLYGON_RING_DIRECTION error occurs.
- If the expression to cast is a well-formed geometry of type Polygon, the function result is that Polygon.
- If the expression to cast is a well-formed geometry of type MultiLineString where all elements are rings, the function result is a Polygon with the first LineString as outer ring and any additional LineString values as inner rings. If any element of the expression is not a ring, an ER_INVALID_CAST_TO_GEOMETRY error occurs. If any ring is not in the correct order (the exterior ring must be counter-clockwise, interior rings must be clockwise), an ER_INVALID_CAST_POLYGON_RING_DIRECTION error occurs.
- If the expression to cast is a well-formed geometry of type MultiPolygon containing a single Polygon, the function result is that Polygon. If the expression contains more than one Polygon, an ER_INVALID_CAST_TO_GEOMETRY error occurs.
- If the expression to cast is a well-formed geometry of type GeometryCollection containing only a single Polygon, the function result is that Polygon. If the expression is empty, contains more than one Polygon, or contains other geometry types, an ER_INVALID_CAST_TO_GEOMETRY error occurs.
- If the expression to cast is a well-formed geometry of type other than LineString, Polygon, MultiLineString, MultiPolygon, or GeometryCollection, an ER_INVALID_CAST_TO_GEOMETRY error occurs.

\section*{Conditions for Casts to MultiPoint}

When the cast result type is MultiPoint, these conditions apply:
- If the expression to cast is a well-formed geometry of type Point, the function result is a MultiPoint containing that Point as its sole element.
- If the expression to cast is a well-formed geometry of type LineString, the function result is a MultiPoint containing the points of the LineString in the same order.
- If the expression to cast is a well-formed geometry of type MultiPoint, the function result is that MultiPoint.
- If the expression to cast is a well-formed geometry of type GeometryCollection containing only points, the function result is a MultiPoint containing those points. If the GeometryCollection is empty or contains other geometry types, an ER_INVALID_CAST_TO_GEOMETRY error occurs.
- If the expression to cast is a well-formed geometry of type other than Point, LineString, MultiPoint, or GeometryCollection, an ER_INVALID_CAST_TO_GEOMETRY error occurs.

\section*{Conditions for Casts to MultiLineString}

When the cast result type is MultiLineString, these conditions apply:
- If the expression to cast is a well-formed geometry of type LineString, the function result is a MultiLineString containing that LineString as its sole element.
- If the expression to cast is a well-formed geometry of type Polygon, the function result is a MultiLineString containing the outer ring of the Polygon as its first element and any inner rings as additional elements in the order they appear in the expression.
- If the expression to cast is a well-formed geometry of type MultiLineString, the function result is that MultiLineString.
- If the expression to cast is a well-formed geometry of type MultiPolygon containing only polygons without inner rings, the function result is a MultiLineString containing the polygon rings in the order they appear in the expression. If the expression contains any polygons with inner rings, an ER_WRONG_PARAMETERS_TO_STORED_FCT error occurs.
- If the expression to cast is a well-formed geometry of type GeometryCollection containing only linestrings, the function result is a MultiLineString containing those linestrings. If the expression is empty or contains other geometry types, an ER_INVALID_CAST_TO_GEOMETRY error occurs.
- If the expression to cast is a well-formed geometry of type other than LineString, Polygon, MultiLineString, MultiPolygon, or GeometryCollection, an ER_INVALID_CAST_TO_GEOMETRY error occurs.

\section*{Conditions for Casts to MultiPolygon}

When the cast result type is MultiPolygon, these conditions apply:
- If the expression to cast is a well-formed geometry of type Polygon, the function result is a MultiPolygon containing the Polygon as its sole element.
- If the expression to cast is a well-formed geometry of type MultiLineString where all elements are rings, the function result is a MultiPolygon containing a Polygon with only an outer ring for each element of the expression. If any element is not a ring, an ER_INVALID_CAST_TO_GEOMETRY error occurs. If any ring is not in the correct order (exterior ring must be counter-clockwise), an ER_INVALID_CAST_POLYGON_RING_DIRECTION error occurs.
- If the expression to cast is a well-formed geometry of type MultiPolygon, the function result is that MultiPolygon.
- If the expression to cast is a well-formed geometry of type GeometryCollection containing only polygons, the function result is a MultiPolygon containing those polygons. If the expression is empty or contains other geometry types, an ER_INVALID_CAST_TO_GEOMETRY error occurs.
- If the expression to cast is a well-formed geometry of type other than Polygon, MultiLineString, MultiPolygon, or GeometryCollection, an ER_INVALID_CAST_TO_GEOMETRY error occurs.

\section*{Conditions for Casts to GeometryCollection}

When the cast result type is GeometryCollection, these conditions apply:
- GeometryCollection and GeomCollection are synonyms for the same result type.
- If the expression to cast is a well-formed geometry of type Point, the function result is a GeometryCollection containing that Point as its sole element.
- If the expression to cast is a well-formed geometry of type LineString, the function result is a GeometryCollection containing that LineString as its sole element.
- If the expression to cast is a well-formed geometry of type Polygon, the function result is a GeometryCollection containing that Polygon as its sole element.
- If the expression to cast is a well-formed geometry of type MultiPoint, the function result is a GeometryCollection containing the points in the order they appear in the expression.
- If the expression to cast is a well-formed geometry of type MultiLineString, the function result is a GeometryCollection containing the linestrings in the order they appear in the expression.
- If the expression to cast is a well-formed geometry of type MultiPolygon, the function result is a GeometryCollection containing the elements of the MultiPolygon in the order they appear in the expression.
- If the expression to cast is a well-formed geometry of type GeometryCollection, the function result is that GeometryCollection.

\section*{Other Uses for Cast Operations}

The cast functions are useful for creating a column with a specific type in a CREATE TABLE ... SELECT statement:
```
mysql> CREATE TABLE new_table SELECT CAST('2000-01-01' AS DATE) AS c1;
mysql> SHOW CREATE TABLE new_table\G
************************** 1. row *****************************************
        Table: new_table
Create Table: CREATE TABLE ˋnew_tableˋ (
    ˋc1ˋ date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```


The cast functions are useful for sorting ENUM columns in lexical order. Normally, sorting of ENUM columns occurs using the internal numeric values. Casting the values to CHAR results in a lexical sort:
```
SELECT enum_col FROM tbl_name
    ORDER BY CAST(enum_col AS CHAR);
```


CAST( ) also changes the result if you use it as part of a more complex expression such as CONCAT('Date: ',CAST(NOW() AS DATE)).

For temporal values, there is little need to use CAST( ) to extract data in different formats. Instead, use a function such as EXTRACT( ), DATE_FORMAT( ), or TIME_FORMAT( ). See Section 14.7, "Date and Time Functions".

To cast a string to a number, it normally suffices to use the string value in numeric context:
```
mysql> SELECT 1+'1';
    -> 2
```


That is also true for hexadecimal and bit literals, which are binary strings by default:
```
mysql> SELECT X'41', X'41'+0;
    -> 'A', 65
mysql> SELECT b'1100001', b'1100001'+0;
    -> 'a', 97
```


A string used in an arithmetic operation is converted to a floating-point number during expression evaluation.

A number used in string context is converted to a string:
```
mysql> SELECT CONCAT('hello you ',2);
    -> 'hello you 2'
```


For information about implicit conversion of numbers to strings, see Section 14.3, "Type Conversion in Expression Evaluation".

MySQL supports arithmetic with both signed and unsigned 64-bit values. For numeric operators (such as + or -) where one of the operands is an unsigned integer, the result is unsigned by default (see Section 14.6.1, "Arithmetic Operators"). To override this, use the SIGNED or UNSIGNED cast operator to cast a value to a signed or unsigned 64-bit integer, respectively.
```
mysql> SELECT 1 - 2;
    -> -1
mysql> SELECT CAST(1 - 2 AS UNSIGNED);
    -> 18446744073709551615
mysql> SELECT CAST(CAST(1 - 2 AS UNSIGNED) AS SIGNED);
    -> -1
```


If either operand is a floating-point value, the result is a floating-point value and is not affected by the preceding rule. (In this context, DECIMAL column values are regarded as floating-point values.)
```
mysql> SELECT CAST(1 AS UNSIGNED) - 2.0;
    -> -1.0
```


The SQL mode affects the result of conversion operations (see Section 7.1.11, "Server SQL Modes"). Examples:
- For conversion of a "zero" date string to a date, CONVERT( ) and CAST( ) return NULL and produce a warning when the NO_ZERO_DATE SQL mode is enabled.
- For integer subtraction, if the NO_UNSIGNED_SUBTRACTION SQL mode is enabled, the subtraction result is signed even if any operand is unsigned.

\subsection*{14.11 XML Functions}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.16 XML Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline ExtractValue( ) & \begin{tabular}{l} 
Extract a value from an XML string using XPath \\
notation
\end{tabular} \\
\hline UpdateXML ( ) & Return replaced XML fragment \\
\hline
\end{tabular}
\end{table}

This section discusses XML and related functionality in MySQL.

\section*{Note \\ It is possible to obtain XML-formatted output from MySQL in the mysql and mysqldump clients by invoking them with the --xml option. See Section 6.5.1, "mysql - The MySQL Command-Line Client", and Section 6.5.4, "mysqldump - A Database Backup Program".}

Two functions providing basic XPath 1.0 (XML Path Language, version 1.0) capabilities are available. Some basic information about XPath syntax and usage is provided later in this section; however, an in-depth discussion of these topics is beyond the scope of this manual, and you should refer to the XML Path Language (XPath) 1.0 standard for definitive information. A useful resource for those new to XPath or who desire a refresher in the basics is the Zvon.org XPath Tutorial, which is available in several languages.

\section*{Note}

These functions remain under development. We continue to improve these and other aspects of XML and XPath functionality in MySQL 8.4 and onwards. You may discuss these, ask questions about them, and obtain help from other users with them in the MySQL XML User Forum.

XPath expressions used with these functions support user variables and local stored program variables. User variables are weakly checked; variables local to stored programs are strongly checked (see also Bug \#26518):
- User variables (weak checking). Variables using the syntax \$@variable_name (that is, user variables) are not checked. No warnings or errors are issued by the server if a variable has the wrong type or has previously not been assigned a value. This also means the user is fully responsible for any typographical errors, since no warnings are given if (for example) \$@myvairable is used where \$@myvariable was intended.

Example:
```
mysql> SET @xml = '<a><b>X</b><b>Y</b></a>';
Query OK, 0 rows affected (0.00 sec)
mysql> SET @i =1, @j = 2;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @i, ExtractValue(@xml, '//b[$@i]');
+------+---------------------------------+
| @i | ExtractValue(@xml, '//b[$@i]') |
+------+---------------------------------+
| 1 | X |
+------+---------------------------------+
```

```
1 row in set (0.00 sec)
mysql> SELECT @j, ExtractValue(@xml, '//b[$@j]');
+------+---------------------------------+
| @j | ExtractValue(@xml, '//b[$@j]') |
+------+---------------------------------+
| 2 | Y
+------+---------------------------------+
1 row in set (0.00 sec)
mysql> SELECT @k, ExtractValue(@xml, '//b[$@k]');
+------+---------------------------------+
| @k | ExtractValue(@xml, '//b[$@k]') |
+------+----------------------------------+
| NULL | |
+------+---------------------------------+
1 row in set (0.00 sec)
```

- Variables in stored programs (strong checking). Variables using the syntax \$variable_name can be declared and used with these functions when they are called inside stored programs. Such variables are local to the stored program in which they are defined, and are strongly checked for type and value.

\section*{Example:}
```
mysql> DELIMITER |
mysql> CREATE PROCEDURE myproc ()
    -> BEGIN
    -> DECLARE i INT DEFAULT 1;
    -> DECLARE xml VARCHAR(25) DEFAULT '<a>X</a><a>Y</a><a>Z</a>';
    ->
    -> WHILE i < 4 DO
    -> SELECT xml, i, ExtractValue(xml, '//a[$i]');
    -> SET i = i+1;
    -> END WHILE;
    -> END |
Query OK, 0 rows affected (0.01 sec)
mysql> DELIMITER ;
mysql> CALL myproc();
+----------------------------+---+-------------------------------
| xml | i | ExtractValue(xml, '//a[$i]') |
+----------------------------+---+-------------------------------
|<a>X</a><a>Y</a><a>Z</a> |1 | X |
+----------------------------+---+------------------------------
1 row in set (0.00 sec)
+----------------------------+---+-------------------------------
| xml | i | ExtractValue(xml, '//a[$i]') |
+----------------------------+---+-------------------------------
|<a>X</a><a>Y</a><a>Z</a> | 2 | Y |
+----------------------------+---+------------------------------
1 row in set (0.01 sec)
+---------------------------+---+-----------------------------+
| xml | | ExtractValue(xml, '//a[$i]') |
+----------------------------+---+-------------------------------+
+----------------------------+---+------------------------------
1 row in set (0.01 sec)
```


Parameters. Variables used in XPath expressions inside stored routines that are passed in as parameters are also subject to strong checking.

Expressions containing user variables or variables local to stored programs must otherwise (except for notation) conform to the rules for XPath expressions containing variables as given in the XPath 1.0 specification.

\section*{Note}

A user variable used to store an XPath expression is treated as an empty string. Because of this, it is not possible to store an XPath expression as a user variable. (Bug \#32911)
```
- ExtractValue(xml_frag, xpath_expr)
```


ExtractValue( ) takes two string arguments, a fragment of XML markup xml_frag and an XPath expression xpath_expr (also known as a locator); it returns the text (CDATA) of the first text node which is a child of the element or elements matched by the XPath expression.

Using this function is the equivalent of performing a match using the xpath_expr after appending /text(). In other words, ExtractValue('<a><b>Sakila</b></a>', '/a/b') and ExtractValue('<a><b>Sakila</b></a>', '/a/b/text()') produce the same result. If xml_frag or xpath_expr is NULL, the function returns NULL.

If multiple matches are found, the content of the first child text node of each matching element is returned (in the order matched) as a single, space-delimited string.

If no matching text node is found for the expression (including the implicit / text ( ) )-for whatever reason, as long as xpath_expr is valid, and xml_frag consists of elements which are properly nested and closed-an empty string is returned. No distinction is made between a match on an empty element and no match at all. This is by design.

If you need to determine whether no matching element was found in xml_frag or such an element was found but contained no child text nodes, you should test the result of an expression that uses the XPath count ( ) function. For example, both of these statements return an empty string, as shown here:
```
mysql> SELECT ExtractValue('<a><b/></a>', '/a/b');
+--------------------------------------+
| ExtractValue('<a><b/></a>', '/a/b') |
+-------------------------------------+
| |
1 row in set (0.00 sec)
mysql> SELECT ExtractValue('<a><c/></a>', '/a/b');
+-------------------------------------+
| ExtractValue('<a><c/></a>', '/a/b') |
+-------------------------------------+
| |
+--------------------------------------+
1 row in set (0.00 sec)
```


However, you can determine whether there was actually a matching element using the following:
```
mysql> SELECT ExtractValue('<a><b/></a>', 'count(/a/b)');
+--------------------------------------+
| ExtractValue('<a><b/></a>', 'count(/a/b)') |
+--------------------------------------+
| 1
+-------------------------------------+
1 row in set (0.00 sec)
mysql> SELECT ExtractValue('<a><c/></a>', 'count(/a/b)');
+--------------------------------------+
| ExtractValue('<a><c/></a>', 'count(/a/b)') |
+-------------------------------------+
|0 |
+---------------------------------------+
```

```
1 row in set (0.01 sec)
```


\section*{Important}

ExtractValue( ) returns only CDATA, and does not return any tags that might be contained within a matching tag, nor any of their content (see the result returned as val1 in the following example).
```
mysql> SELECT
    -> ExtractValue('<a>ccc<b>ddd</b></a>', '/a') AS val1,
    -> ExtractValue('<a>ccc<b>ddd</b></a>', '/a/b') AS val2,
    -> ExtractValue('<a>ccc<b>ddd</b></a>', '//b') AS val3,
    -> ExtractValue('<a>ccc<b>ddd</b></a>', '/b') AS val4,
    -> ExtractValue('<a>ccc<b>ddd</b><b>eee</b></a>', '//b') AS val5;
+------+-------+------+------+---------+
| val1 | val2 | val3 | val4 | val5 |
+------+-------+------+------+---------+
| ccc | ddd | ddd | | ddd eee |
+------+-------+------+------+---------+
```


This function uses the current SQL collation for making comparisons with contains(), performing the same collation aggregation as other string functions (such as CONCAT( )), in taking into account the collation coercibility of their arguments; see Section 12.8.4, "Collation Coercibility in Expressions", for an explanation of the rules governing this behavior.
(Previously, binary-that is, case-sensitive-comparison was always used.)
NULL is returned if xml_frag contains elements which are not properly nested or closed, and a warning is generated, as shown in this example:
```
mysql> SELECT ExtractValue('<a>c</a><b', '//a');
+-------------------------------------+
| ExtractValue('<a>c</a><b', '//a') |
+------------------------------------+
| NULL
+------------------------------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
************************** 1. row *****************************************
    Level: Warning
        Code: 1525
Message: Incorrect XML value: 'parse error at line 1 pos 11:
            END-OF-INPUT unexpected ('>' wanted)'
1 row in set (0.00 sec)
mysql> SELECT ExtractValue('<a>c</a><b/>', '//a');
+---------------------------------------+
| ExtractValue('<a>c</a><b/>', '//a') |
+--------------------------------------+
| c
+-------------------------------
1 row in set (0.00 sec)
```

- UpdateXML(xml_target, xpath_expr, new_xml)

This function replaces a single portion of a given fragment of XML markup xml_target with a new XML fragment new_xml, and then returns the changed XML. The portion of xml_target that is replaced matches an XPath expression xpath_expr supplied by the user.

If no expression matching xpath_expr is found, or if multiple matches are found, the function returns the original xml_target XML fragment. All three arguments should be strings. If any of the arguments to UpdateXML ( ) are NULL, the function returns NULL.
```
mysql> SELECT
    -> UpdateXML('<a><b>ccc</b><d></d></a>', '/a', '<e>fff</e>') AS val1,
```

```
    -> UpdateXML('<a><b>ccc</b><d></d></a>', '/b', '<e>fff</e>') AS val2,
    -> UpdateXML('<a><b>ccc</b><d></d></a>', '//b', '<e>fff</e>') AS val3,
    -> UpdateXML('<a><b>ccc</b><d></d></a>', '/a/d', '<e>fff</e>') AS val4,
    -> UpdateXML('<a><d></d><b>ccc</b><d></d></a>', '/a/d', '<e>fff</e>') AS val5
    -> \G
************************* 1. row ******************************************
val1: <e>fff</e>
val2: <a><b>ccc</b><d></d></a>
val3: <a><e>fff</e><d></d></a>
val4: <a><b>ccc</b><e>fff</e></a>
val5: <a><d></d><b>ccc</b><d></d></a>
```


\section*{Note}

A discussion in depth of XPath syntax and usage are beyond the scope of this manual. Please see the XML Path Language (XPath) 1.0 specification for definitive information. A useful resource for those new to XPath or who are wishing a refresher in the basics is the Zvon.org XPath Tutorial, which is available in several languages.

Descriptions and examples of some basic XPath expressions follow:
- /tag

Matches <tag/> if and only if <tag/> is the root element.
Example: /a has a match in <a><b/></a> because it matches the outermost (root) tag. It does not match the inner a element in <b><a/></b> because in this instance it is the child of another element.
- /tag1/tag2

Matches <tag2/> if and only if it is a child of <tag1/>, and <tag1/> is the root element.
Example: /a/b matches the $b$ element in the XML fragment <a><b/></a> because it is a child of the root element $a$. It does not have a match in $<b><a /></ b>$ because in this case, $b$ is the root element (and hence the child of no other element). Nor does the XPath expression have a match in $<\mathrm{a}><\mathrm{c}><\mathrm{b} /></ \mathrm{c}></ \mathrm{a}>$; here, $b$ is a descendant of $a$, but not actually a child of $a$.

This construct is extendable to three or more elements. For example, the XPath expression /a/b/c matches the $c$ element in the fragment $<a><b><c /></ b></ a>$.
- //tag

Matches any instance of <tag>.
Example: //a matches the $a$ element in any of the following: <a><b><c/></b></a>; <c><a><b/ ></a></b>;<c><b><a/></b></c>.
// can be combined with /. For example, //a/b matches the $b$ element in either of the fragments <a><b/></a> or <c><a><b/></a></c>.

\section*{Note}
//tag is the equivalent of/descendant-or-self: :*/tag. A common error is to confuse this with/descendant-or-self: :tag, although the latter expression can actually lead to very different results, as can be seen here:
```
mysql> SET @xml = '<a><b><c>w</c><b>x</b><d>y</d>z</b></a>';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @xml;
```

```
+-------------------------------------------+
| @xml |
+-------------------------------------------+
|<a><b><c>w</c><b>x</b><d>y</d>z</b></a> |
+------------------------------------------+
1 row in set (0.00 sec)
mysql> SELECT ExtractValue(@xml, '//b[1]');
+--------------------------------+
| ExtractValue(@xml, '//b[1]') |
+--------------------------------+
| x z
+-------------------------------+
1 row in set (0.00 sec)
mysql> SELECT ExtractValue(@xml, '//b[2]');
+--------------------------------+
| ExtractValue(@xml, '//b[2]') |
+--------------------------------+
| |
+--------------------------------+
1 row in set (0.01 sec)
mysql> SELECT ExtractValue(@xml, '/descendant-or-self::*/b[1]');
+------------------------------------------------------
| ExtractValue(@xml, '/descendant-or-self::*/b[1]') |
+-------------------------------------------------------
| x z
+-----------------------------------------------------+
1 row in set (0.06 sec)
mysql> SELECT ExtractValue(@xml, '/descendant-or-self::*/b[2]');
+-------------------------------------------------------
| ExtractValue(@xml, '/descendant-or-self::*/b[2]') |
+-------------------------------------------------------
| |
+-------------------------------------------------------
1 row in set (0.00 sec)
mysql> SELECT ExtractValue(@xml, '/descendant-or-self::b[1]');
+-----------------------------------------------------
| ExtractValue(@xml, '/descendant-or-self::b[1]') |
+------------------------------------------------------
| z
+------------------------------------------------------
1 row in set (0.00 sec)
mysql> SELECT ExtractValue(@xml, '/descendant-or-self::b[2]');
+-----------------------------------------------------
| ExtractValue(@xml, '/descendant-or-self::b[2]') |
+------------------------------------------------------
| x
+-----------------------------------------------------
1 row in set (0.00 sec)
```

- The * operator acts as a "wildcard" that matches any element. For example, the expression /*/b matches the $b$ element in either of the XML fragments $<a><b /></ a>$ or $<c><b /></ c>$. However, the expression does not produce a match in the fragment <b><a/></b> because $b$ must be a child of some other element. The wildcard may be used in any position: The expression /*/b/* matches any child of a $b$ element that is itself not the root element.
- You can match any of several locators using the | (UNION) operator. For example, the expression //b|//c matches all $b$ and $c$ elements in the XML target.
- It is also possible to match an element based on the value of one or more of its attributes. This done using the syntax tag[@attribute="value"]. For example, the expression //b[@id="idB"] matches the second $b$ element in the fragment <a><b id="idA"/><c/><b id="idB"/></ a>. To match against any element having attribute="value", use the XPath expression // *[attribute="value"].

To filter multiple attribute values, simply use multiple attribute-comparison clauses in succession. For example, the expression //b[@c="x"][@d="y"] matches the element <b c="x" d="y"/> occurring anywhere in a given XML fragment.

To find elements for which the same attribute matches any of several values, you can use multiple locators joined by the | operator. For example, to match all $b$ elements whose $c$ attributes have either of the values 23 or 17, use the expression //b[@c="23"] | //b [@c="17"]. You can also use the logical or operator for this purpose: //b[@c="23" or @c="17"].

\section*{Note}

The difference between or and | is that or joins conditions, while | joins result sets.

XPath Limitations. The XPath syntax supported by these functions is currently subject to the following limitations:
- Nodeset-to-nodeset comparison (such as '/a/b[@c=@d] ') is not supported.
- All of the standard XPath comparison operators are supported. (Bug \#22823)
- Relative locator expressions are resolved in the context of the root node. For example, consider the following query and result:
```
mysql> SELECT ExtractValue(
    -> '<a><b c="1">X</b><b c="2">Y</b></a>',
    -> 'a/b'
    -> ) AS result;
+--------+
| result |
+--------+
| X Y |
+--------+
1 row in set (0.03 sec)
```


In this case, the locator $\mathrm{a} / \mathrm{b}$ resolves to / $\mathrm{a} / \mathrm{b}$.
Relative locators are also supported within predicates. In the following example, d [ . ./@c="1"] is resolved as /a/b[@c="1"]/d:
```
mysql> SELECT ExtractValue(
    -> '<a>
    -> <b c="1"><d>X</d></b>
    -> <b c="2"><d>X</d></b>
    -> </a>',
    -> 'a/b/d[../@c="1"]')
    -> AS result;
+--------+
| result |
+--------+
| X |
+--------+
1 row in set (0.00 sec)
```

- Locators prefixed with expressions that evaluate as scalar values-including variable references, literals, numbers, and scalar function calls-are not permitted, and their use results in an error.
- The : : operator is not supported in combination with node types such as the following:
- axis: :comment()
- axis: :text()
- axis: :processing-instructions()
- axis: :node()

However, name tests (such as axis: :name and axis: :*) are supported, as shown in these examples:
```
mysql> SELECT ExtractValue('<a><b>x</b><c>y</c></a>','/a/child::b');
+----------------------------------------------------------
| ExtractValue('<a><b>x</b><c>y</c></a>','/a/child::b') |
+---------------------------------------------------------
| x
+-------- |
1 row in set (0.02 sec)
mysql> SELECT ExtractValue('<a><b>x</b><c>y</c></a>','/a/child::*');
+----------------------------------------------------------
| ExtractValue('<a><b>x</b><c>y</c></a>','/a/child::*') |
+----------------------------------------------------------
| x y
+----------------------------------------------------------
1 row in set (0.01 sec)
```

- "Up-and-down" navigation is not supported in cases where the path would lead "above" the root element. That is, you cannot use expressions which match on descendants of ancestors of a given element, where one or more of the ancestors of the current element is also an ancestor of the root element (see Bug \#16321).
- The following XPath functions are not supported, or have known issues as indicated:
- id()
- lang()
- local-name()
- name()
- namespace-uri()
- normalize-space()
- starts-with()
- string()
- substring-after()
- substring-before()
- translate()
- The following axes are not supported:
- following-sibling
- following
- preceding-sibling
- preceding

XPath expressions passed as arguments to ExtractValue() and UpdateXML() may contain the colon character (:) in element selectors, which enables their use with markup employing XML namespaces notation. For example:
```
mysql> SET @xml = '<a>111<b:c>222<d>333</d><e:f>444</e:f></b:c></a>';
```

```
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT ExtractValue(@xml, '//e:f');
+-------------------------------+
| ExtractValue(@xml, '//e:f') |
+-------------------------------+
| 444
+-------------------------------+
1 row in set (0.00 sec)
mysql> SELECT UpdateXML(@xml, '//b:c', '<g:h>555</g:h>');
+----------------------------------------------+
| UpdateXML(@xml, '//b:c', '<g:h>555</g:h>') |
+-----------------------------------------------
| <a>111<g:h>555</g:h></a> |
+-----------------------------------------------
1 row in set (0.00 sec)
```


This is similar in some respects to what is permitted by Apache Xalan and some other parsers, and is much simpler than requiring namespace declarations or the use of the namespace-uri( ) and local-name ( ) functions.

Error handling. For both ExtractValue() and UpdateXML(), the XPath locator used must be valid and the XML to be searched must consist of elements which are properly nested and closed. If the locator is invalid, an error is generated:
```
mysql> SELECT ExtractValue('<a>c</a><b/>', '/&a');
ERROR 1105 (HY000): XPATH syntax error: '&a'
```


If xml_frag does not consist of elements which are properly nested and closed, NULL is returned and a warning is generated, as shown in this example:
```
mysql> SELECT ExtractValue('<a>c</a><b', '//a');
+-------------------------------------+
| ExtractValue('<a>c</a><b', '//a') |
+------------------------------------+
| NULL |
+------------------------------------+
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
*************************** 1. row ****************************************
    Level: Warning
        Code: 1525
Message: Incorrect XML value: 'parse error at line 1 pos 11:
            END-OF-INPUT unexpected ('>' wanted)'
1 row in set (0.00 sec)
mysql> SELECT ExtractValue('<a>c</a><b/>', '//a');
+--------------------------------------+
| ExtractValue('<a>c</a><b/>', '//a') |
+---------------------------------------+
| c
+--------------------------------------+
1 row in set (0.00 sec)
```


\section*{Important}

The replacement XML used as the third argument to UpdateXML( ) is not checked to determine whether it consists solely of elements which are properly nested and closed.

XPath Injection. code injection occurs when malicious code is introduced into the system to gain unauthorized access to privileges and data. It is based on exploiting assumptions made by developers about the type and content of data input from users. XPath is no exception in this regard.

A common scenario in which this can happen is the case of application which handles authorization by matching the combination of a login name and password with those found in an XML file, using an XPath expression like this one:
```
//user[login/text()='neapolitan' and password/text()='1c3cr34m']/attribute::id
```


This is the XPath equivalent of an SQL statement like this one:
```
SELECT id FROM users WHERE login='neapolitan' AND password='1c3cr34m';
```


A PHP application employing XPath might handle the login process like this:
```
<?php
    $file = "users.xml";
    $login = $POST["login"];
    $password = $POST["password"];
    $xpath = "//user[login/text()=$login and password/text()=$password]/attribute::id";
    if( file_exists($file) )
    {
        $xml = simplexml_load_file($file);
        if($result = $xml->xpath($xpath))
            echo "You are now logged in as user $result[0].";
        else
            echo "Invalid login name or password.";
    }
    else
        exit("Failed to open $file.");
?>
```


No checks are performed on the input. This means that a malevolent user can "short-circuit" the test by entering ' or $1=1$ for both the login name and password, resulting in $\$ x p a t h$ being evaluated as shown here:
```
//user[login/text()='' or 1=1 and password/text()='' or 1=1]/attribute::id
```


Since the expression inside the square brackets always evaluates as true, it is effectively the same as this one, which matches the id attribute of every user element in the XML document:
```
//user/attribute::id
```


One way in which this particular attack can be circumvented is simply by quoting the variable names to be interpolated in the definition of \$xpath, forcing the values passed from a Web form to be converted to strings:
```
$xpath = "//user[login/text()='$login' and password/text()='$password']/attribute::id";
```


This is the same strategy that is often recommended for preventing SQL injection attacks. In general, the practices you should follow for preventing XPath injection attacks are the same as for preventing SQL injection:
- Never accepted untested data from users in your application.
- Check all user-submitted data for type; reject or convert data that is of the wrong type
- Test numeric data for out of range values; truncate, round, or reject values that are out of range. Test strings for illegal characters and either strip them out or reject input containing them.
- Do not output explicit error messages that might provide an unauthorized user with clues that could be used to compromise the system; log these to a file or database table instead.

Just as SQL injection attacks can be used to obtain information about database schemas, so can XPath injection be used to traverse XML files to uncover their structure, as discussed in Amit Klein's paper Blind XPath Injection (PDF file, 46 KB ).

It is also important to check the output being sent back to the client. Consider what can happen when we use the MySQL ExtractValue( ) function:
```
mysql> SELECT ExtractValue(
    -> LOAD_FILE('users.xml'),
    -> '//user[login/text()="" or 1=1 and password/text()="" or 1=1]/attribute::id'
    -> ) AS id;
+--------------------------------+
| id
+----- |
| 00327 13579 02403 42354 28570
+--------------------------------+
1 row in set (0.01 sec)
```


Because ExtractValue( ) returns multiple matches as a single space-delimited string, this injection attack provides every valid ID contained within users.xml to the user as a single row of output. As an extra safeguard, you should also test output before returning it to the user. Here is a simple example:
```
mysql> SELECT @id = ExtractValue(
    -> LOAD_FILE('users.xml'),
    -> '//user[login/text()="" or 1=1 and password/text()="" or 1=1]/attribute::id'
    -> );
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT IF(
    -> INSTR(@id, ' ') = 0,
    -> @id,
    -> 'Unable to retrieve user ID')
    -> AS singleID;
+-----------------------------+
| singleID |
+----------------------------+
| Unable to retrieve user ID |
+-----------------------------+
1 row in set (0.00 sec)
```


In general, the guidelines for returning data to users securely are the same as for accepting user input. These can be summed up as:
- Always test outgoing data for type and permissible values.
- Never permit unauthorized users to view error messages that might provide information about the application that could be used to exploit it.

\subsection*{14.12 Bit Functions and Operators}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.17 Bit Functions and Operators}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline \& & Bitwise AND \\
\hline >> & Right shift \\
\hline << & Left shift \\
\hline $\wedge$ & Bitwise XOR \\
\hline BIT_COUNT() & Return the number of bits that are set \\
\hline | & Bitwise OR \\
\hline ~ & Bitwise inversion \\
\hline
\end{tabular}
\end{table}

The following list describes available bit functions and operators:
- I

Bitwise OR.
The result type depends on whether the arguments are evaluated as binary strings or numbers:
- Binary-string evaluation occurs when the arguments have a binary string type, and at least one of them is not a hexadecimal literal, bit literal, or NULL literal. Numeric evaluation occurs otherwise, with argument conversion to unsigned 64-bit integers as necessary.
- Binary-string evaluation produces a binary string of the same length as the arguments. If the arguments have unequal lengths, an ER_INVALID_BITWISE_OPERANDS_SIZE error occurs. Numeric evaluation produces an unsigned 64-bit integer.

For more information, see the introductory discussion in this section.
```
mysql> SELECT 29 | 15;
    -> 31
mysql> SELECT _binary X'40404040' | X'01020304';
    -> 'ABCD'
```


If bitwise OR is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".
- \&

Bitwise AND.
The result type depends on whether the arguments are evaluated as binary strings or numbers:
- Binary-string evaluation occurs when the arguments have a binary string type, and at least one of them is not a hexadecimal literal, bit literal, or NULL literal. Numeric evaluation occurs otherwise, with argument conversion to unsigned 64-bit integers as necessary.
- Binary-string evaluation produces a binary string of the same length as the arguments. If the arguments have unequal lengths, an ER_INVALID_BITWISE_OPERANDS_SIZE error occurs. Numeric evaluation produces an unsigned 64-bit integer.

For more information, see the introductory discussion in this section.
```
mysql> SELECT 29 & 15;
    -> 13
mysql> SELECT HEX(_binary X'FF' & b'11110000');
    -> 'F0'
```


If bitwise AND is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".
- ^

Bitwise XOR.
The result type depends on whether the arguments are evaluated as binary strings or numbers:
- Binary-string evaluation occurs when the arguments have a binary string type, and at least one of them is not a hexadecimal literal, bit literal, or NULL literal. Numeric evaluation occurs otherwise, with argument conversion to unsigned 64-bit integers as necessary.
- Binary-string evaluation produces a binary string of the same length as the arguments. If the arguments have unequal lengths, an ER_INVALID_BITWISE_OPERANDS_SIZE error occurs. Numeric evaluation produces an unsigned 64-bit integer.

For more information, see the introductory discussion in this section.
```
mysql> SELECT 1 ^ 1;
    -> 0
mysql> SELECT 1 ^ 0;
```

```
    -> 1
mysql> SELECT 11 ^ 3;
    -> 8
mysql> SELECT HEX(_binary X'FEDC' ^ X'1111');
    -> 'EFCD'
```


If bitwise XOR is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".
- <<

Shifts a longlong (BIGINT) number or binary string to the left.
The result type depends on whether the bit argument is evaluated as a binary string or number:
- Binary-string evaluation occurs when the bit argument has a binary string type, and is not a hexadecimal literal, bit literal, or NULL literal. Numeric evaluation occurs otherwise, with argument conversion to an unsigned 64-bit integer as necessary.
- Binary-string evaluation produces a binary string of the same length as the bit argument. Numeric evaluation produces an unsigned 64-bit integer.

Bits shifted off the end of the value are lost without warning, regardless of the argument type. In particular, if the shift count is greater or equal to the number of bits in the bit argument, all bits in the result are 0 .

For more information, see the introductory discussion in this section.
```
mysql> SELECT 1 << 2;
    -> 4
mysql> SELECT HEX(_binary X'00FF00FF00FF' << 8);
    -> 'FF00FF00FF00'
```


If a bit shift is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".
>>
Shifts a longlong (BIGINT) number or binary string to the right.
The result type depends on whether the bit argument is evaluated as a binary string or number:
- Binary-string evaluation occurs when the bit argument has a binary string type, and is not a hexadecimal literal, bit literal, or NULL literal. Numeric evaluation occurs otherwise, with argument conversion to an unsigned 64-bit integer as necessary.
- Binary-string evaluation produces a binary string of the same length as the bit argument. Numeric evaluation produces an unsigned 64-bit integer.

Bits shifted off the end of the value are lost without warning, regardless of the argument type. In particular, if the shift count is greater or equal to the number of bits in the bit argument, all bits in the result are 0 .

For more information, see the introductory discussion in this section.
```
mysql> SELECT 4 >> 2;
    -> 1
mysql> SELECT HEX(_binary X'00FF00FF00FF' >> 8);
```

-> '0000FF00FF00'

If a bit shift is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".

Invert all bits.
The result type depends on whether the bit argument is evaluated as a binary string or number:
- Binary-string evaluation occurs when the bit argument has a binary string type, and is not a hexadecimal literal, bit literal, or NULL literal. Numeric evaluation occurs otherwise, with argument conversion to an unsigned 64-bit integer as necessary.
- Binary-string evaluation produces a binary string of the same length as the bit argument. Numeric evaluation produces an unsigned 64-bit integer.

For more information, see the introductory discussion in this section.
```
mysql> SELECT 5 & ~1;
    -> 4
mysql> SELECT HEX(~X'0000FFFF1111EEEE');
    -> 'FFFF0000EEEE1111'
```


If bitwise inversion is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".
- BIT_COUNT(N)

Returns the number of bits that are set in the argument $N$ as an unsigned 64-bit integer, or NULL if the argument is NULL.
```
mysql> SELECT BIT_COUNT(64), BIT_COUNT(BINARY 64);
    -> 1, 7
mysql> SELECT BIT_COUNT('64'), BIT_COUNT(_binary '64');
    -> 1, 7
mysql> SELECT BIT_COUNT(X'40'), BIT_COUNT(_binary X'40');
    -> 1, 1
```


Bit functions and operators comprise BIT_COUNT( ), BIT_AND( ), BIT_OR( ), BIT_XOR( ), \&, | , ^, ~, <<, and >>. (The BIT_AND( ), BIT_OR( ), and BIT_XOR( ) aggregate functions are described in Section 14.19.1, "Aggregate Function Descriptions".)

Bit functions and operators permit binary string type arguments (BINARY, VARBINARY, and the BLOB types) and return a value of like type. Nonbinary string arguments are converted to BIGINT.
- Bit Operations
- Binary String Bit-Operation Examples
- Bitwise AND, OR, and XOR Operations
- Bitwise Complement and Shift Operations
- BIT_COUNT() Operations
- BIT_AND(), BIT_OR(), and BIT_XOR() Operations
- Special Handling of Hexadecimal Literals, Bit Literals, and NULL Literals

\section*{Bit Operations}

MySQL 8.4 handles binary string arguments directly (without conversion) and produces binary string results. Arguments that are not integers or binary strings are converted to integers.

Arguments that count as binary strings include column values, routine parameters, local variables, and user-defined variables that have a binary string type: BINARY, VARBINARY, or one of the BLOB types.

You can specify arguments to bit operations using hexadecimal literals or bit literals with the intent that they represent numbers; MySQL evaluates bit operations in numeric context when all bit arguments are hexadecimal or bit literals. For evaluation as binary strings instead, use the _binary introducer for at least one of the literal values.
- These bit operations evaluate the hexadecimal literals and bit literals as integers:
```
mysql> SELECT X'40' | X'01', b'11110001' & b'01001111';
+----------------+----------------------------+
| X'40' | X'01' | b'11110001' & b'01001111' |
+----------------+-----------------------------
| 65 |65 |
+----------------+---------------------------
```

- These bit operations evaluate the hexadecimal literals and bit literals as binary strings, due to the _binary introducer:
```
mysql> SELECT _binary X'40' | X'01', b'11110001' & _binary b'01001111';
+-------------------------+------------------------------------
| _binary X'40' | X'01' | b'11110001' & _binary b'01001111' |
+-------------------------+------------------------------------
| A | A |
+-------------------------+-----------------------------------
```


Although the bit operations in both statements produce a result with a numeric value of 65 , the second statement operates in binary-string context, for which 65 is ASCII A.

In numeric evaluation context, permitted values of hexadecimal literal and bit literal arguments have a maximum of 64 bits, as do results. By contrast, in binary-string evaluation context, permitted arguments (and results) can exceed 64 bits:
```
mysql> SELECT _binary X'4040404040404040' | X'0102030405060708';
+-----------------------------------------------------+
| _binary X'4040404040404040' | X'0102030405060708' |
+------------------------------------------------------
| ABCDEFGH
+-----------------------------------------------------+
```


There are several ways to refer to a hexadecimal literal or bit literal in a bit operation to cause binarystring evaluation:
```
_binary literal
BINARY literal
CAST(literal AS BINARY)
```


Another way to produce binary-string evaluation of hexadecimal literals or bit literals is to assign them to user-defined variables, which results in variables that have a binary string type:
```
mysql> SET @v1 = X'40', @v2 = X'01', @v3 = b'11110001', @v4 = b'01001111';
mysql> SELECT @v1 | @v2, @v3 & @v4;
+------------+-----------+
| @v1 | @v2 | @v3 & @v4 |
+-----------+------------+
+------------+------------+
```


In binary-string context, bitwise operation arguments must have the same length or an ER_INVALID_BITWISE_OPERANDS_SIZE error occurs:
```
mysql> SELECT _binary X'40' | X'0001';
```

```
ERROR 3513 (HY000): Binary operands of bitwise
operators must be of equal length
```


To satisfy the equal-length requirement, pad the shorter value with leading zero digits or, if the longer value begins with leading zero digits and a shorter result value is acceptable, strip them:
```
mysql> SELECT _binary X'0040' | X'0001';
+-----------------------------+
| _binary X'0040' | X'0001' |
+-----------------------------+
| A |
+----------------------------+
mysql> SELECT _binary X'40' | X'01';
+------------------------+
| _binary X'40' | X'01' |
+------------------------+
| A |
+------------------------+
```


Padding or stripping can also be accomplished using functions such as LPAD( ), RPAD( ), SUBSTR( ), or CAST( ). In such cases, the expression arguments are no longer all literals and _binary becomes unnecessary. Examples:
```
mysql> SELECT LPAD(X'40', 2, X'00') | X'0001';
+----------------------------------+
| LPAD(X'40', 2, X'00') | X'0001' |
+-----------------------------------+
| A |
+----------------------------------+
mysql> SELECT X'40' | SUBSTR(X'0001', 2, 1);
+---------------------------------+
| X'40' | SUBSTR(X'0001', 2, 1) |
+---------------------------------+
| A |
+--------------------------------+
```


See also Special Handling of Hexadecimal Literals, Bit Literals, and NULL Literals.

\section*{Binary String Bit-Operation Examples}

The following example illustrates use of bit operations to extract parts of a UUID value, in this case, the timestamp and IEEE 802 node number. This technique requires bitmasks for each extracted part.

Convert the text UUID to the corresponding 16-byte binary value so that it can be manipulated using bit operations in binary-string context:
```
mysql> SET @uuid = UUID_TO_BIN('6ccd780c-baba-1026-9564-5b8c656024db');
mysql> SELECT HEX(@uuid);
+------------------------------------+
| HEX(@uuid) |
+------------------------------------+
| 6CCD780CBABA102695645B8C656024DB |
+-----------------------------------+
```


Construct bitmasks for the timestamp and node number parts of the value. The timestamp comprises the first three parts ( 64 bits, bits 0 to 63 ) and the node number is the last part ( 48 bits, bits 80 to 127 ):
```
mysql> SET @ts_mask = CAST(X'FFFFFFFFFFFFFFFF' AS BINARY(16));
mysql> SET @node_mask = CAST(X'FFFFFFFFFFFF' AS BINARY(16)) >> 80;
mysql> SELECT HEX(@ts_mask);
+------------------------------------+
| HEX(@ts_mask) |
+------------------------------------+
| FFFFFFFFFFFFFFFF0000000000000000
+-------------------------------------+
mysql> SELECT HEX(@node_mask);
+------------------------------------+
| HEX(@node_mask) |
+-----------------------------------+
| 00000000000000000000FFFFFFFFFFFF
```

----------------------------------+
The CAST( ... AS BINARY (16)) function is used here because the masks must be the same length as the UUID value against which they are applied. The same result can be produced using other functions to pad the masks to the required length:
```
SET @ts_mask= RPAD(X'FFFFFFFFFFFFFFFFF' , 16, X'00');
SET @node_mask = LPAD(X'FFFFFFFFFFFF', 16, X'00') ;
```


Use the masks to extract the timestamp and node number parts:
```
mysql> SELECT HEX(@uuid & @ts_mask) AS 'timestamp part';
+-----------------------------------+
| timestamp part |
+-----------------------------------+
| 6CCD780CBABA10260000000000000000 |
+-----------------------------------+
mysql> SELECT HEX(@uuid & @node_mask) AS 'node part';
+------------------------------------+
| node part |
+----------------------------------+
| 000000000000000000005B8C656024DB |
+-----------------------------------+
```


The preceding example uses these bit operations: right shift ( $\gg$ ) and bitwise AND (\&).

\section*{Note}

UUID_TO_BIN ( ) takes a flag that causes some bit rearrangement in the resulting binary UUID value. If you use that flag, modify the extraction masks accordingly.

The next example uses bit operations to extract the network and host parts of an IPv6 address. Suppose that the network part has a length of 80 bits. Then the host part has a length of $128-80=$ 48 bits. To extract the network and host parts of the address, convert it to a binary string, then use bit operations in binary-string context.

Convert the text IPv6 address to the corresponding binary string:
```
mysql> SET @ip = INET6_ATON('fe80::219:d1ff:fe91:1a72');
```


Define the network length in bits:
```
mysql> SET @net_len = 80;
```


Construct network and host masks by shifting the all-ones address left or right. To do this, begin with the address : :, which is shorthand for all zeros, as you can see by converting it to a binary string like this:
```
mysql> SELECT HEX(INET6_ATON('::')) AS 'all zeros';
+------------------------------------+
| all zeros |
+-----------------------------------+
| 00000000000000000000000000000000 |
+------------------------------------+
```


To produce the complementary value (all ones), use the $\sim$ operator to invert the bits:
```
mysql> SELECT HEX(~INET6_ATON('::')) AS 'all ones';
+------------------------------------+
| all ones |
+-----------------------------------+
| FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF |
+------------------------------------+
```


Shift the all-ones value left or right to produce the network and host masks:
```
mysql> SET @net_mask = ~INET6_ATON('::') << (128 - @net_len);
mysql> SET @host_mask = ~INET6_ATON('::') >> @net_len;
```


Display the masks to verify that they cover the correct parts of the address:
```
mysql> SELECT INET6_NTOA(@net_mask) AS 'network mask';
+------------------------------+
| network mask |
+------------------------------+
| ffff:ffff:ffff:ffff:ffff:: |
+-----------------------------+
mysql> SELECT INET6_NTOA(@host_mask) AS 'host mask';
+-------------------------+
| host mask |
+-------------------------+
| ::ffff:255.255.255.255 |
+-------------------------+
```


Extract and display the network and host parts of the address:
```
mysql> SET @net_part = @ip & @net_mask;
mysql> SET @host_part = @ip & @host_mask;
mysql> SELECT INET6_NTOA(@net_part) AS 'network part';
+------------------+
| network part |
+------------------+
| fe80::219:0:0:0 |
+------------------+
mysql> SELECT INET6_NTOA(@host_part) AS 'host part';
+-------------------+
| host part |
+-------------------+
| ::d1ff:fe91:1a72 |
+-------------------+
```


The preceding example uses these bit operations: Complement ( $\sim$ ), left shift (<<), and bitwise AND (\&).
The remaining discussion provides details on argument handling for each group of bit operations, and more information about literal-value handling in bit operations.

\section*{Bitwise AND, OR, and XOR Operations}

For \&, |, and ^ bit operations, the result type depends on whether the arguments are evaluated as binary strings or numbers:
- Binary-string evaluation occurs when the arguments have a binary string type, and at least one of them is not a hexadecimal literal, bit literal, or NULL literal. Numeric evaluation occurs otherwise, with argument conversion to unsigned 64-bit integers as necessary.
- Binary-string evaluation produces a binary string of the same length as the arguments. If the arguments have unequal lengths, an ER_INVALID_BITWISE_OPERANDS_SIZE error occurs. Numeric evaluation produces an unsigned 64-bit integer.

Examples of numeric evaluation:
```
mysql> SELECT 64 | 1, X'40' | X'01';
+--------+----------------+
| 64 | 1 | X'40' | X'01' |
+--------+----------------+
|65 |65 |
+--------+---------------+
```


Examples of binary-string evaluation:
```
mysql> SELECT _binary X'40' | X'01';
+-------------------------+
| _binary X'40' | X'01' |
+-------------------------+
| A |
+-------------------------+
mysql> SET @var1 = X'40', @var2 = X'01';
mysql> SELECT @var1 | @var2;
```

```
+----------------+
+----------------+
| A
+----------------+
```


\section*{Bitwise Complement and Shift Operations}

For ~, <<, and >> bit operations, the result type depends on whether the bit argument is evaluated as a binary string or number:
- Binary-string evaluation occurs when the bit argument has a binary string type, and is not a hexadecimal literal, bit literal, or NULL literal. Numeric evaluation occurs otherwise, with argument conversion to an unsigned 64-bit integer as necessary.
- Binary-string evaluation produces a binary string of the same length as the bit argument. Numeric evaluation produces an unsigned 64-bit integer.

For shift operations, bits shifted off the end of the value are lost without warning, regardless of the argument type. In particular, if the shift count is greater or equal to the number of bits in the bit argument, all bits in the result are 0 .

Examples of numeric evaluation:
```
mysql> SELECT ~0, 64 << 2, X'40' << 2;
+-----------------------+---------+-----------+
| ~0 | 64 << 2 | |'40' << 2 |
+-----------------------+---------+-----------+
| 18446744073709551615 | 256 | 256 |
+-----------------------+---------+-----------+
```


Examples of binary-string evaluation:
```
mysql> SELECT HEX(_binary X'1111000022220000' >> 16);
+------------------------------------------+
| HEX(_binary X'1111000022220000' >> 16) |
+------------------------------------------+
| 0000111100002222 |
+------------------------------------------+
mysql> SELECT HEX(_binary X'1111000022220000' << 16);
+------------------------------------------+
| HEX(_binary X'1111000022220000' << 16) |
+------------------------------------------+
| 0000222200000000 |
+-----------------------------------------+
mysql> SET @var1 = X'F0F0F0F0';
mysql> SELECT HEX(~@var1);
+--------------+
| HEX(~@var1) |
+--------------+
| 0F0F0F0F |
+--------------+
```


\section*{BIT_COUNT() Operations}

The BIT_COUNT( ) function always returns an unsigned 64-bit integer, or NULL if the argument is NULL.
```
mysql> SELECT BIT_COUNT(127);
+-----------------+
| BIT_COUNT(127) |
+-----------------+
| 7 |
+-----------------+
mysql> SELECT BIT_COUNT(b'010101'), BIT_COUNT(_binary b'010101');
+------------------------+------------------------------+
| BIT_COUNT(b'010101') | BIT_COUNT(_binary b'010101') |
+------------------------+------------------------------+
```


| 3 | 3 | 3 |

\section*{BIT_AND(), BIT_OR(), and BIT_XOR() Operations}

For the BIT_AND( ), BIT_OR( ), and BIT_XOR( ) bit functions, the result type depends on whether the function argument values are evaluated as binary strings or numbers:
- Binary-string evaluation occurs when the argument values have a binary string type, and the argument is not a hexadecimal literal, bit literal, or NULL literal. Numeric evaluation occurs otherwise, with argument value conversion to unsigned 64-bit integers as necessary.
- Binary-string evaluation produces a binary string of the same length as the argument values. If argument values have unequal lengths, an ER_INVALID_BITWISE_OPERANDS_SIZE error occurs. If the argument size exceeds 511 bytes, an ER_INVALID_BITWISE_AGGREGATE_OPERANDS_SIZE error occurs. Numeric evaluation produces an unsigned 64-bit integer.

NULL values do not affect the result unless all values are NULL. In that case, the result is a neutral value having the same length as the length of the argument values (all bits 1 for BIT_AND( ), all bits 0 for BIT_OR( ), and BIT_XOR( )).

Example:
```
mysql> CREATE TABLE t (group_id INT, a VARBINARY(6));
mysql> INSERT INTO t VALUES (1, NULL);
mysql> INSERT INTO t VALUES (1, NULL);
mysql> INSERT INTO t VALUES (2, NULL);
mysql> INSERT INTO t VALUES (2, X'1234');
mysql> INSERT INTO t VALUES (2, X'FF34');
mysql> SELECT HEX(BIT_AND(a)), HEX(BIT_OR(a)), HEX(BIT_XOR(a))
    FROM t GROUP BY group_id;
+------------------+-----------------+------------------
| HEX(BIT_AND(a)) | HEX(BIT_OR(a)) | HEX(BIT_XOR(a)) |
+------------------+-----------------+-----------------+
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2274.jpg?height=95&width=908&top_left_y=1530&top_left_x=287)

\section*{Special Handling of Hexadecimal Literals, Bit Literals, and NULL Literals}

MySQL 8.4 evaluates bit operations in numeric context when all bit arguments are hexadecimal literals, bit literals, or NULL literals. That is, bit operations on binary-string bit arguments do not use binarystring evaluation if all bit arguments are unadorned hexadecimal literals, bit literals, or NULL literals. (This does not apply to such literals if they are written with a _binary introducer, BINARY operator, or other way of specifying them explicitly as binary strings.)

Examples:
- These bit operations evaluate the literals in numeric context and produce a BIGINT result:
```
b'0001' | b'0010'
X'0008' << 8
```

- These bit operations evaluate NULL in numeric context and produce a BIGINT result that has a NULL value:
```
NULL & NULL
NULL >> 4
```


You can cause those operations to evaluate the arguments in binary-string context by indicating explicitly that at least one argument is a binary string:
```
binary b'0001' | b'0010'
binary X'0008' << 8
BINARY NULL & NULL
```


BINARY NULL >> 4
The result of the last two expressions is NULL, just as without the BINARY operator, but the data type of the result is a binary string type rather than an integer type.

\subsection*{14.13 Encryption and Compression Functions}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 14.18 Encryption Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline AES_DECRYPT ( ) & Decrypt using AES \\
\hline AES_ENCRYPT() & Encrypt using AES \\
\hline COMPRESS( ) & Return result as a binary string \\
\hline MD5( ) & Calculate MD5 checksum \\
\hline RANDOM_BYTES( ) & Return a random byte vector \\
\hline SHA1( ), SHA( ) & Calculate an SHA-1 160-bit checksum \\
\hline SHA2() & Calculate an SHA-2 checksum \\
\hline STATEMENT_DIGEST() & Compute statement digest hash value \\
\hline STATEMENT_DIGEST_TEXT( ) & Compute normalized statement digest \\
\hline UNCOMPRESS( ) & Uncompress a string compressed \\
\hline UNCOMPRESSED_LENGTH( ) & Return the length of a string before compression \\
\hline VALIDATE_PASSWORD_STRENGTH( ) & Determine strength of password \\
\hline
\end{tabular}
\end{table}

Many encryption and compression functions return strings for which the result might contain arbitrary byte values. If you want to store these results, use a column with a VARBINARY or BLOB binary string data type. This avoids potential problems with trailing space removal or character set conversion that would change data values, such as may occur if you use a nonbinary string data type (CHAR, VARCHAR, TEXT).

Some encryption functions return strings of ASCII characters: MD5( ), SHA( ), SHA1( ), SHA2( ), STATEMENT_DIGEST( ), STATEMENT_DIGEST_TEXT( ). Their return value is a string that has a character set and collation determined by the character_set_connection and collation_connection system variables. This is a nonbinary string unless the character set is binary.

If an application stores values from a function such as MD5() or SHA1() that returns a string of hex digits, more efficient storage and comparisons can be obtained by converting the hex representation to binary using UNHEX( ) and storing the result in a $\operatorname{BINARY}(N)$ column. Each pair of hexadecimal digits requires one byte in binary form, so the value of $N$ depends on the length of the hex string. $N$ is 16 for an MD5 ( ) value and 20 for a SHA1( ) value. For SHA2 ( ), $N$ ranges from 28 to 32 depending on the argument specifying the desired bit length of the result.

The size penalty for storing the hex string in a CHAR column is at least two times, up to eight times if the value is stored in a column that uses the utf8mb4 character set (where each character uses 4 bytes). Storing the string also results in slower comparisons because of the larger values and the need to take character set collation rules into account.

Suppose that an application stores MD5 ( ) string values in a CHAR (32) column:
```
CREATE TABLE md5_tbl (md5_val CHAR(32), ...);
INSERT INTO md5_tbl (md5_val, ...) VALUES(MD5('abcdef'), ...);
```


To convert hex strings to more compact form, modify the application to use UNHEX ( ) and BINARY (16) instead as follows:
```
CREATE TABLE md5_tbl (md5_val BINARY(16), ...);
INSERT INTO md5_tbl (md5_val, ...) VALUES(UNHEX(MD5('abcdef')), ...);
```


Applications should be prepared to handle the very rare case that a hashing function produces the same value for two different input values. One way to make collisions detectable is to make the hash column a primary key.

\section*{Note}

Exploits for the MD5 and SHA-1 algorithms have become known. You may wish to consider using another one-way encryption function described in this section instead, such as SHA2( ).

\section*{Caution}

Passwords or other sensitive values supplied as arguments to encryption functions are sent as cleartext to the MySQL server unless an SSL connection is used. Also, such values appear in any MySQL logs to which they are written. To avoid these types of exposure, applications can encrypt sensitive values on the client side before sending them to the server. The same considerations apply to encryption keys. To avoid exposing these, applications can use stored procedures to encrypt and decrypt values on the server side.
- AES_DECRYPT(crypt_str,key_str[,init_vector][,kdf_name][,salt][,info | iterations])

This function decrypts data using the official AES (Advanced Encryption Standard) algorithm. For more information, see the description of AES_ENCRYPT ( ).

Statements that use AES_DECRYPT() are unsafe for statement-based replication.
- AES_ENCRYPT(str,key_str[,init_vector][,kdf_name][,salt][,info | iterations])

AES_ENCRYPT( ) and AES_DECRYPT ( ) implement encryption and decryption of data using the official AES (Advanced Encryption Standard) algorithm, previously known as "Rijndael." The AES standard permits various key lengths. By default these functions implement AES with a 128 -bit key length. Key lengths of 196 or 256 bits can be used, as described later. The key length is a trade off between performance and security.

AES_ENCRYPT( ) encrypts the string str using the key string key_str , and returns a binary string containing the encrypted output. AES_DECRYPT ( ) decrypts the encrypted string crypt_str using the key string key_str, and returns the original (binary) string in hexadecimal format. (To obtain the string as plaintext, cast the result to CHAR. Alternatively, start the mysql client with --skip-binary-as-hex to cause all binary values to be displayed as text.) If either function argument is NULL, the function returns NULL. If AES_DECRYPT ( ) detects invalid data or incorrect padding, it returns NULL. However, it is possible for AES_DECRYPT( ) to return a non-NULL value (possibly garbage) if the input data or the key is invalid.

These functions support the use of a key derivation function (KDF) to create a cryptographically strong secret key from the information passed in key_str. The derived key is used to encrypt and decrypt the data, and it remains in the MySQL Server instance and is not accessible to users. Using a KDF is highly recommended, as it provides better security than specifying your own premade key or deriving it by a simpler method as you use the function. The functions support HKDF (available from OpenSSL 1.1.0), for which you can specify an optional salt and context-specific information to include in the keying material, and PBKDF2 (available from OpenSSL 1.0.2), for which you can specify an optional salt and set the number of iterations used to produce the key.

If you do not use a KDF, the key size should be less than 16 bytes. AES_ENCRYPT() does the following by default when a KDF is not used:
- Sets the full 16 -byte key to 0s.
- XORs the supplied key into the internal key for as long as there is data.
- If the supplied key is longer than the required key, it wraps around at the start of the result key and keeps XORing until there is data in the supplied key.

AES_ENCRYPT( ) and AES_DECRYPT ( ) permit control of the block encryption mode. The block_encryption_mode system variable controls the mode for block-based encryption algorithms. Its default value is aes-128-ecb, which signifies encryption using a key length of 128 bits and ECB mode. For a description of the permitted values of this variable, see Section 7.1.8, "Server System Variables". The optional init_vector argument is used to provide an initialization vector for block encryption modes that require it.

Statements that use AES_ENCRYPT ( ) or AES_DECRYPT ( ) are unsafe for statement-based replication.

If AES_ENCRYPT( ) is invoked from within the mysql client, binary strings display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".

The arguments for the AES_ENCRYPT( ) and AES_DECRYPT ( ) functions are as follows:
str
crypt_str

\section*{key_str}

The string for AES_ENCRYPT( ) to encrypt using the key string key_str, or the key derived from it by the specified KDF. The string can be any length. Padding is automatically added to str so it is a multiple of a block as required by block-based algorithms such as AES. This padding is automatically removed by the AES_DECRYPT( ) function.

The encrypted string for AES_DECRYPT ( ) to decrypt using the key string key_str, or the key derived from it by the specified KDF. The string can be any length. The length of crypt_str can be calculated from the length of the original string using this formula:

16 * (trunc(string_length / 16) + 1)
The encryption key, or the input keying material that is used as the basis for deriving a key using a key derivation function (KDF). For the same instance of data, use the same value of key_str for encryption with AES_ENCRYPT( ) and decryption with AES_DECRYPT( ).

If you are using a KDF, key_str can be any arbitrary information such as a password or passphrase. In the further arguments for the function, you specify the KDF name, then add further options to increase the security as appropriate for the KDF.

When you use a KDF, the function creates a cryptographically strong secret key from the information passed in key_str and any salt or additional information that you provide in the other arguments. The derived key is used to encrypt and decrypt the data, and it remains in the MySQL Server instance and is not accessible to users. Using a KDF is highly recommended, as it provides better security than specifying your own premade key or deriving it by a simpler method as you use the function.

If you are not using a KDF, for a key length of 128 bits, the most secure way to pass a key to the key_str argument is to create
a truly random 128-bit value and pass it as a binary value. For example:

INSERT INTO t
VALUES (1,AES_ENCRYPT('text',UNHEX('F3229A0B371ED2D9441B830D21A390C3')))
A passphrase can be used to generate an AES key by hashing the passphrase. For example:

INSERT INTO t
VALUES (1,AES_ENCRYPT('text', UNHEX(SHA2('My secret passphrase',512))));
If you exceed the maximum key length of 128 bits, a warning is returned. If you are not using a KDF, do not pass a password or passphrase directly to key_str, hash it first. Previous versions of this documentation suggested the former approach, but it is no longer recommended as the examples shown here are more secure.

An initialization vector, for block encryption modes that require it. The block_encryption_mode system variable controls the mode. For the same instance of data, use the same value of init_vector for encryption with AES_ENCRYPT ( ) and decryption with AES_DECRYPT( ).

\section*{Note}

If you are using a KDF, you must specify an initialization vector or a null string for this argument, in order to access the later arguments to define the KDF.

For modes that require an initialization vector, it must be 16 bytes or longer (bytes in excess of 16 are ignored). An error occurs if init_vector is missing. For modes that do not require an initialization vector, it is ignored and a warning is generated if init_vector is specified, unless you are using a KDF.

The default value for the block_encryption_mode system variable is aes-128-ecb, or ECB mode, which does not require an initialization vector. The alternative permitted block encryption modes CBC, CFB1, CFB8, CFB128, and OFB all require an initialization vector.

A random string of bytes to use for the initialization vector can be produced by calling RANDOM_BYTES(16).
kdf_name
The name of the key derivation function (KDF) to create a key from the input keying material passed in key_str, and other arguments as appropriate for the KDF. Optional.

For the same instance of data, use the same value of $k d f \_n a m e$ for encryption with AES_ENCRYPT( ) and decryption with AES_DECRYPT( ). When you specify $k d f \_n a m e$, you must specify init_vector, using either a valid initialization vector,
or a null string if the encryption mode does not require an initialization vector.

The following values are supported:

\begin{tabular}{|l|l|}
\hline hkdf & HKDF, which is available from OpenSSL 1.1.0. HKDF extracts a pseudorandom key from the keying material then expands it into additional keys. With HKDF, you can specify an optional salt (salt) and context-specific information such as application details (info) to include in the keying material. \\
\hline pbkdf2_hmac & PBKDF2, which is available from OpenSSL 1.0.2. PBKDF2 applies a pseudorandom function to the keying material, and repeats this process a large number of times to produce the key. With PBKDF2, you can specify an optional salt (salt) to include in the keying material, and set the number of iterations used to produce the key (iterations). \\
\hline
\end{tabular}

In this example, HKDF is specified as the key derivation function, and a salt and context information are provided. The argument for the initialization vector is included but is the empty string:

SELECT AES_ENCRYPT('mytext','mykeystring', '', 'hkdf', 'salt', 'info
In this example, PBKDF2 is specified as the key derivation function, a salt is provided, and the number of iterations is doubled from the recommended minimum:

SELECT AES_ENCRYPT('mytext','mykeystring', '', 'pbkdf2_hmac','salt',
salt
A salt to be passed to the key derivation function (KDF). Optional. Both HKDF and PBKDF2 can use salts, and their use is recommended to help prevent attacks based on dictionaries of common passwords or rainbow tables.

A salt consists of random data, which for security must be different for each encryption operation. A random string of bytes to use for the salt can be produced by calling RANDOM_BYTES( ). This example produces a 64-bit salt:

SET @salt = RANDOM_BYTES(8);
For the same instance of data, use the same value of salt for encryption with AES_ENCRYPT( ) and decryption with AES_DECRYPT( ). The salt can safely be stored along with the encrypted data.

\section*{info}

Context-specific information for HKDF to include in the keying material, such as information about the application. Optional; available when you specify hkdf as the KDF name. HKDF adds this information to the keying material specified in key_str and the salt specified in salt to produce the key.

For the same instance of data, use the same value of info for encryption with AES_ENCRYPT( ) and decryption with AES_DECRYPT( ).

\section*{iterations}

The iteration count for PBKDF2 to use when producing the key. Optional; available when you specify pbkdf2_hmac as the KDF name. A higher count gives greater resistance to bruteforce attacks because it has a greater computational cost for the attacker, but the same is necessarily true for the key derivation process. The default if you do not specify this argument is 1000 , which is the minimum recommended by the OpenSSL standard.

For the same instance of data, use the same value of iterations for encryption with AES_ENCRYPT() and decryption with AES_DECRYPT( ).
```
mysql> SET block_encryption_mode = 'aes-256-cbc';
mysql> SET @key_str = SHA2('My secret passphrase',512);
mysql> SET @init_vector = RANDOM_BYTES(16);
mysql> SET @crypt_str = AES_ENCRYPT('text',@key_str,@init_vector);
mysql> SELECT CAST(AES_DECRYPT(@crypt_str,@key_str,@init_vector) AS CHAR);
+---------------------------------------------------------------
| CAST(AES_DECRYPT(@crypt_str,@key_str,@init_vector) AS CHAR) |
+-----------------------------------------------------------------
| text
+------- |
```

- COMPRESS(string_to_compress)

Compresses a string and returns the result as a binary string. This function requires MySQL to have been compiled with a compression library such as zlib. Otherwise, the return value is always NULL. The return value is also NULL if string_to_compress is NULL. The compressed string can be uncompressed with UNCOMPRESS( ).
```
mysql> SELECT LENGTH(COMPRESS(REPEAT('a',1000)));
    -> 21
mysql> SELECT LENGTH(COMPRESS(''));
    -> 0
mysql> SELECT LENGTH(COMPRESS('a'));
    -> 13
mysql> SELECT LENGTH(COMPRESS(REPEAT('a',16)));
    -> 15
```


The compressed string contents are stored the following way:
- Empty strings are stored as empty strings.
- Nonempty strings are stored as a 4-byte length of the uncompressed string (low byte first), followed by the compressed string. If the string ends with space, an extra . character is added to avoid problems with endspace trimming should the result be stored in a CHAR or VARCHAR column. (However, use of nonbinary string data types such as CHAR or VARCHAR to store
compressed strings is not recommended anyway because character set conversion may occur. Use a VARBINARY or BLOB binary string column instead.)

If COMPRESS( ) is invoked from within the mysql client, binary strings display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".
- MD5(str)

Calculates an MD5 128-bit checksum for the string. The value is returned as a string of 32 hexadecimal digits, or NULL if the argument was NULL. The return value can, for example, be used as a hash key. See the notes at the beginning of this section about storing hash values efficiently.

The return value is a string in the connection character set.
If FIPS mode is enabled, MD5() returns NULL. See Section 8.8, "FIPS Support".
```
mysql> SELECT MD5('testing');
    -> 'ae2b1fca515949e5d54fb22b8ed95575'
```


This is the "RSA Data Security, Inc. MD5 Message-Digest Algorithm."
See the note regarding the MD5 algorithm at the beginning this section.
- RANDOM_BYTES(len)

This function returns a binary string of len random bytes generated using the random number generator of the SSL library. Permitted values of len range from 1 to 1024. For values outside that range, an error occurs. Returns NULL if len is NULL.

RANDOM_BYTES( ) can be used to provide the initialization vector for the AES_DECRYPT ( ) and AES_ENCRYPT( ) functions. For use in that context, len must be at least 16. Larger values are permitted, but bytes in excess of 16 are ignored.

RANDOM_BYTES( ) generates a random value, which makes its result nondeterministic. Consequently, statements that use this function are unsafe for statement-based replication.

If RANDOM_BYTES( ) is invoked from within the mysql client, binary strings display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".
- SHA1(str), SHA(str)

Calculates an SHA-1 160-bit checksum for the string, as described in RFC 3174 (Secure Hash Algorithm). The value is returned as a string of 40 hexadecimal digits, or NULL if the argument is NULL. One of the possible uses for this function is as a hash key. See the notes at the beginning of this section about storing hash values efficiently. SHA() is synonymous with SHA1().

The return value is a string in the connection character set.
```
mysql> SELECT SHA1('abc');
    -> 'a9993e364706816aba3e25717850c26c9cd0d89d'
```


SHA1 ( ) can be considered a cryptographically more secure equivalent of MD5( ). However, see the note regarding the MD5 and SHA-1 algorithms at the beginning this section.
- SHA2(str, hash_length)

Calculates the SHA-2 family of hash functions (SHA-224, SHA-256, SHA-384, and SHA-512). The first argument is the plaintext string to be hashed. The second argument indicates the desired bit length of the result, which must have a value of $224,256,384,512$, or 0 (which is equivalent to 256 ).

NULL. Otherwise, the function result is a hash value containing the desired number of bits. See the notes at the beginning of this section about storing hash values efficiently.

The return value is a string in the connection character set.
```
mysql> SELECT SHA2('abc', 224);
    -> '23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7'
```


This function works only if MySQL has been configured with SSL support. See Section 8.3, "Using Encrypted Connections".

SHA2( ) can be considered cryptographically more secure than MD5( ) or SHA1( ).
- STATEMENT_DIGEST(statement)

Given an SQL statement as a string, returns the statement digest hash value as a string in the connection character set, or NULL if the argument is NULL. The related STATEMENT_DIGEST_TEXT( ) function returns the normalized statement digest. For information about statement digesting, see Section 29.10, "Performance Schema Statement Digests and Sampling".

Both functions use the MySQL parser to parse the statement. If parsing fails, an error occurs. The error message includes the parse error only if the statement is provided as a literal string.

The max_digest_length system variable determines the maximum number of bytes available to these functions for computing normalized statement digests.
```
mysql> SET @stmt = 'SELECT * FROM mytable WHERE cola = 10 AND colb = 20';
mysql> SELECT STATEMENT_DIGEST(@stmt);
+-----------------------------------------------------------------------
| STATEMENT_DIGEST(@stmt) |
+-----------------------------------------------------------------------
| 3bb95eeade896657c4526e74ff2a2862039d0a0fe8a9e7155b5fe492cbd78387 |
+-----------------------------------------------------------------------
mysql> SELECT STATEMENT_DIGEST_TEXT(@stmt);
+-------------------------------------------------------------
| STATEMENT_DIGEST_TEXT(@stmt) |
+-------------------------------------------------------------
| SELECT * FROM ˋmytableˋ WHERE ˋcolaˋ = ? AND ˋcolbˋ = ? |
+-------------------------------------------------------------
```

- STATEMENT_DIGEST_TEXT(statement)

Given an SQL statement as a string, returns the normalized statement digest as a string in the connection character set, or NULL if the argument is NULL. For additional discussion and examples, see the description of the related STATEMENT_DIGEST( ) function.
- UNCOMPRESS(string_to_uncompress)

Uncompresses a string compressed by the COMPRESS( ) function. If the argument is not a compressed value, the result is NULL; if string_to_uncompress is NULL, the result is also NULL. This function requires MySQL to have been compiled with a compression library such as zlib. Otherwise, the return value is always NULL.
```
mysql> SELECT UNCOMPRESS(COMPRESS('any string'));
    -> 'any string'
mysql> SELECT UNCOMPRESS('any string');
    -> NULL
```

- UNCOMPRESSED_LENGTH(compressed_string)

Returns the length that the compressed string had before being compressed. Returns NULL if compressed_string is NULL. mysql> SELECT UNCOMPRESSED_LENGTH(COMPRESS(REPEAT('a',30)));

