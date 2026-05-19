\section*{Running innochecksum on Multiple System Tablespace Files}

By default, there is only one InnoDB system tablespace file (ibdata1) but multiple files for the system tablespace can be defined using the innodb_data_file_path option. In the following example, three files for the system tablespace are defined using the innodb_data_file_path option: ibdata1, ibdata2, and ibdata3.
./bin/mysqld --no-defaults --innodb-data-file-path="ibdata1:10M;ibdata2:10M;ibdata3:10M:autoextend"
The three files (ibdata1, ibdata2, and ibdata3) form one logical system tablespace. To run innochecksum on multiple files that form one logical system tablespace, innochecksum requires the - option to read tablespace files in from standard input, which is equivalent to concatenating multiple files to create one single file. For the example provided above, the following innochecksum command would be used:
```
cat ibdata* | innochecksum -
```


Refer to the innochecksum options information for more information about the "-" option.

\section*{Note}

Running innochecksum on multiple files in the same tablespace is not supported on Windows operating systems, as Windows shells such as
> cmd . exe do not support glob pattern expansion. On Windows systems, innochecksum must be run separately for each system tablespace file. For example:
```
innochecksum.exe ibdata1
innochecksum.exe ibdata2
innochecksum.exe ibdata3
```


\subsection*{6.6.3 myisam_ftdump — Display Full-Text Index information}
myisam_ftdump displays information about FULLTEXT indexes in MyISAM tables. It reads the MyISAM index file directly, so it must be run on the server host where the table is located. Before using myisam_ftdump, be sure to issue a FLUSH TABLES statement first if the server is running.
myisam_ftdump scans and dumps the entire index, which is not particularly fast. On the other hand, the distribution of words changes infrequently, so it need not be run often.

Invoke myisam_ftdump like this:
```
myisam_ftdump [options] tbl_name index_num
```


The tbl_name argument should be the name of a MyISAM table. You can also specify a table by naming its index file (the file with the .MYI suffix). If you do not invoke myisam_ftdump in the directory where the table files are located, the table or index file name must be preceded by the path name to the table's database directory. Index numbers begin with 0 .

Example: Suppose that the test database contains a table named mytexttable that has the following definition:
```
CREATE TABLE mytexttable
(
    id INT NOT NULL,
    txt TEXT NOT NULL,
    PRIMARY KEY (id),
    FULLTEXT (txt)
) ENGINE=MyISAM;
```


The index on id is index 0 and the FULLTEXT index on txt is index 1 . If your working directory is the test database directory, invoke myisam_ftdump as follows:
```
myisam_ftdump mytexttable 1
```


If the path name to the test database directory is /usr/local/mysql/data/test, you can also specify the table name argument using that path name. This is useful if you do not invoke myisam_ftdump in the database directory:
```
myisam_ftdump /usr/local/mysql/data/test/mytexttable 1
```


You can use myisam_ftdump to generate a list of index entries in order of frequency of occurrence like this on Unix-like systems:
```
myisam_ftdump -c mytexttable 1 | sort -r
```


On Windows, use:
```
myisam_ftdump -c mytexttable 1 | sort /R
```

myisam_ftdump supports the following options:
- --help, -h -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display a help message and exit.
- --count, -c

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - count \\
\hline
\end{tabular}

Calculate per-word statistics (counts and global weights).
- --dump, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - dump \\
\hline
\end{tabular}

Dump the index, including data offsets and word weights.
- --length, -l

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- -length \\
\hline
\end{tabular}

Report the length distribution.
- --stats, -s

\begin{tabular}{|l|l|}
\hline Command-Line Format & --stats \\
\hline
\end{tabular}

Report global index statistics. This is the default operation if no other operation is specified.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Verbose mode. Print more output about what the program does.

\subsection*{6.6.4 myisamchk - MyISAM Table-Maintenance Utility}

The myisamchk utility gets information about your database tables or checks, repairs, or optimizes them. myisamchk works with MyISAM tables (tables that have . MYD and . MYI files for storing data and indexes).

You can also use the CHECK TABLE and REPAIR TABLE statements to check and repair MyISAM tables. See Section 15.7.3.2, "CHECK TABLE Statement", and Section 15.7.3.5, "REPAIR TABLE Statement".

The use of myisamchk with partitioned tables is not supported.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0551.jpg?height=213&width=273&top_left_y=1923&top_left_x=360)

\section*{Caution}

It is best to make a backup of a table before performing a table repair operation; under some circumstances the operation might cause data loss. Possible causes include but are not limited to file system errors.

Invoke myisamchk like this:
```
myisamchk [options] tbl_name ...
```


The options specify what you want myisamchk to do. They are described in the following sections. You can also get a list of options by invoking myisamchk --help.

With no options, myisamchk simply checks your table as the default operation. To get more information or to tell myisamchk to take corrective action, specify options as described in the following discussion.
tbl_name is the database table you want to check or repair. If you run myisamchk somewhere other than in the database directory, you must specify the path to the database directory, because myisamchk has no idea where the database is located. In fact, myisamchk does not actually care whether the files you are working on are located in a database directory. You can copy the files that correspond to a database table into some other location and perform recovery operations on them there.

You can name several tables on the myisamchk command line if you wish. You can also specify a table by naming its index file (the file with the .MYI suffix). This enables you to specify all tables in a directory by using the pattern *. MYI. For example, if you are in a database directory, you can check all the MyISAM tables in that directory like this:
myisamchk *.MYI
If you are not in the database directory, you can check all the tables there by specifying the path to the directory:
myisamchk /path/to/database_dir/*.MYI
You can even check all tables in all databases by specifying a wildcard with the path to the MySQL data directory:
myisamchk /path/to/datadir/*/*.MYI
The recommended way to quickly check all MyISAM tables is:
myisamchk --silent --fast /path/to/datadir/*/*.MYI
If you want to check all MyISAM tables and repair any that are corrupted, you can use the following command:
```
myisamchk --silent --force --fast --update-state \
    --key_buffer_size=64M --myisam_sort_buffer_size=64M \
    --read_buffer_size=1M --write_buffer_size=1M \
    /path/to/datadir/*/*.MYI
```


This command assumes that you have more than 64 MB free. For more information about memory allocation with myisamchk, see Section 6.6.4.6, "myisamchk Memory Usage".

For additional information about using myisamchk, see Section 9.6, "MyISAM Table Maintenance and Crash Recovery".

\section*{Important}

You must ensure that no other program is using the tables while you are running myisamchk. The most effective means of doing so is to shut down the MySQL server while running myisamchk, or to lock all tables that myisamchk is being used on.

Otherwise, when you run myisamchk, it may display the following error message:
warning: clients are using or haven't closed the table properly
This means that you are trying to check a table that has been updated by another program (such as the mysqld server) that hasn't yet closed the file or that has died without closing the file properly, which can sometimes lead to the corruption of one or more MyISAM tables.

If mysqld is running, you must force it to flush any table modifications that are still buffered in memory by using FLUSH TABLES. You should then ensure that no one is using the tables while you are running myisamchk

However, the easiest way to avoid this problem is to use CHECK TABLE instead of myisamchk to check tables. See Section 15.7.3.2, "CHECK TABLE Statement".
myisamchk supports the following options, which can be specified on the command line or in the [myisamchk] group of an option file. For information about option files used by MySQL programs, see Section 6.2.2.2, "Using Option Files".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.17 myisamchk Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --analyze & Analyze the distribution of key values \\
\hline --backup & Make a backup of the .MYD file as file_nametime.BAK \\
\hline --block-search & Find the record that a block at the given offset belongs to \\
\hline --character-sets-dir & Directory where character sets can be found \\
\hline --check & Check the table for errors \\
\hline --check-only-changed & Check only tables that have changed since the last check \\
\hline --correct-checksum & Correct the checksum information for the table \\
\hline --data-file-length & Maximum length of the data file (when re-creating data file when it is full) \\
\hline --debug & Write debugging log \\
\hline --decode_bits & Decode_bits \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --defaults-group-suffix & Option group suffix value \\
\hline --description & Print some descriptive information about the table \\
\hline --extend-check & Do very thorough table check or repair that tries to recover every possible row from the data file \\
\hline --fast & Check only tables that haven't been closed properly \\
\hline --force & Do a repair operation automatically if myisamchk finds any errors in the table \\
\hline --force & Overwrite old temporary files. For use with the -r or -o option \\
\hline --ft_max_word_len & Maximum word length for FULLTEXT indexes \\
\hline --ft_min_word_len & Minimum word length for FULLTEXT indexes \\
\hline --ft_stopword_file & Use stopwords from this file instead of built-in list \\
\hline --HELP & Display help message and exit \\
\hline --help & Display help message and exit \\
\hline --information & Print informational statistics about the table that is checked \\
\hline --key_buffer_size & Size of buffer used for index blocks for MyISAM tables \\
\hline --keys-used & A bit-value that indicates which indexes to update \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --max-record-length & Skip rows larger than the given length if myisamchk cannot allocate memory to hold them \\
\hline --medium-check & Do a check that is faster than an --extend-check operation \\
\hline --myisam_block_size & Block size to be used for MyISAM index pages \\
\hline --myisam_sort_buffer_size & The buffer that is allocated when sorting the index when doing a REPAIR or when creating indexes with CREATE INDEX or ALTER TABLE \\
\hline --no-defaults & Read no option files \\
\hline --parallel-recover & Uses the same technique as -r and -n, but creates all the keys in parallel, using different threads (beta) \\
\hline --print-defaults & Print default options \\
\hline --quick & Achieve a faster repair by not modifying the data file \\
\hline --read_buffer_size & Each thread that does a sequential scan allocates a buffer of this size for each table it scans \\
\hline --read-only & Do not mark the table as checked \\
\hline --recover & Do a repair that can fix almost any problem except unique keys that aren't unique \\
\hline --safe-recover & Do a repair using an old recovery method that reads through all rows in order and updates all index trees based on the rows found \\
\hline --set-auto-increment & Force AUTO_INCREMENT numbering for new records to start at the given value \\
\hline --set-collation & Specify the collation to use for sorting table indexes \\
\hline --silent & Silent mode \\
\hline --sort_buffer_size & The buffer that is allocated when sorting the index when doing a REPAIR or when creating indexes with CREATE INDEX or ALTER TABLE \\
\hline --sort-index & Sort the index tree blocks in high-low order \\
\hline --sort_key_blocks & sort_key_blocks \\
\hline --sort-records & Sort records according to a particular index \\
\hline --sort-recover & Force myisamchk to use sorting to resolve the keys even if the temporary files would be very large \\
\hline --stats_method & Specifies how MyISAM index statistics collection code should treat NULLs \\
\hline --tmpdir & Directory to be used for storing temporary files \\
\hline --unpack & Unpack a table that was packed with myisampack \\
\hline --update-state & Store information in the .MYI file to indicate when the table was checked and whether the table crashed \\
\hline --verbose & Verbose mode \\
\hline --version & Display version information and exit \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --wait & \begin{tabular}{l} 
Wait for locked table to be unlocked, instead of \\
terminating
\end{tabular} \\
\hline --write_buffer_size & Write buffer size \\
\hline
\end{tabular}

\subsection*{6.6.4.1 myisamchk General Options}

The options described in this section can be used for any type of table maintenance operation performed by myisamchk. The sections following this one describe options that pertain only to specific operations, such as table checking or repairing.
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display a help message and exit. Options are grouped by type of operation.
- --HELP, -H

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - HELP \\
\hline
\end{tabular}

Display a help message and exit. Options are presented in a single list.
- --debug=debug_options, -\# debug_options

\begin{tabular}{|l|l|}
\hline Command-Line Format & --debug[=debug_options] \\
\hline Type & String \\
\hline Default Value & d:t:o,/tmp/myisamchk.trace \\
\hline
\end{tabular}

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: 0$,file_name. The default is d:t:o,/tmp/myisamchk.trace.

This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --defaults-extra-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Read this option file after the global option file but (on Unix) before the user option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=file_name \\
\hline
\end{tabular}

Use only the given option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-group-suffix=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - defaults - group - suffix=str \\
\hline Type & String \\
\hline
\end{tabular}

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, myisamchk normally reads the [myisamchk] group. If this option is given as --defaults-group-suffix=_other, myisamchk also reads the [myisamchk_other] group.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read.

The exception is that the .mylogin.cnf file is read in all cases, if it exists. This permits passwords to be specified in a safer way than on the command line even when --no-defaults is used. To create .mylogin.cnf, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print the program name and all options that it gets from option files.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --silent, -s

\begin{tabular}{|l|l|}
\hline Command-Line Format & --silent \\
\hline
\end{tabular}

Silent mode. Write output only when errors occur. You can use -s twice (-ss) to make myisamchk very silent.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Verbose mode. Print more information about what the program does. This can be used with - d and e. Use - v multiple times (- vv, - vvv) for even more output.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
- --wait, -w

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -wait \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Instead of terminating with an error if the table is locked, wait until the table is unlocked before continuing. If you are running mysqld with external locking disabled, the table can be locked only by another myisamchk command.

You can also set the following variables by using --var_name=value syntax:

\begin{tabular}{|l|l|}
\hline Variable & Default Value \\
\hline decode_bits & 9 \\
\hline ft_max_word_len & version-dependent \\
\hline ft_min_word_len & 4 \\
\hline ft_stopword_file & built-in list \\
\hline key_buffer_size & 523264 \\
\hline myisam_block_size & 1024 \\
\hline myisam_sort_key_blocks & 16 \\
\hline read_buffer_size & 262136 \\
\hline sort_buffer_size & 2097144 \\
\hline sort_key_blocks & 16 \\
\hline stats_method & nulls_unequal \\
\hline write_buffer_size & 262136 \\
\hline
\end{tabular}

The possible myisamchk variables and their default values can be examined with myisamchk -help:
myisam_sort_buffer_size is used when the keys are repaired by sorting keys, which is the normal case when you use --recover. sort_buffer_size is a deprecated synonym for myisam_sort_buffer_size.
key_buffer_size is used when you are checking the table with --extend-check or when the keys are repaired by inserting keys row by row into the table (like when doing normal inserts). Repairing through the key buffer is used in the following cases:
- You use --safe-recover.
- The temporary files needed to sort the keys would be more than twice as big as when creating the key file directly. This is often the case when you have large key values for CHAR, VARCHAR, or TEXT columns, because the sort operation needs to store the complete key values as it proceeds. If you have lots of temporary space and you can force myisamchk to repair by sorting, you can use the -sort-recover option.

Repairing through the key buffer takes much less disk space than using sorting, but is also much slower.

If you want a faster repair, set the key_buffer_size and myisam_sort_buffer_size variables to about $25 \%$ of your available memory. You can set both variables to large values, because only one of them is used at a time.
myisam_block_size is the size used for index blocks.
stats_method influences how NULL values are treated for index statistics collection when the --analyze option is given. It acts like the myisam_stats_method system variable. For more information, see the description of myisam_stats_method in Section 7.1.8, "Server System Variables", and Section 10.3.8, "InnoDB and MyISAM Index Statistics Collection".
ft_min_word_len and ft_max_word_len indicate the minimum and maximum word length for FULLTEXT indexes on MyISAM tables. ft_stopword_file names the stopword file. These need to be set under the following circumstances.

If you use myisamchk to perform an operation that modifies table indexes (such as repair or analyze), the FULLTEXT indexes are rebuilt using the default full-text parameter values for minimum and maximum word length and the stopword file unless you specify otherwise. This can result in queries failing.

The problem occurs because these parameters are known only by the server. They are not stored in MyISAM index files. To avoid the problem if you have modified the minimum or maximum word length or the stopword file in the server, specify the same ft_min_word_len, ft_max_word_len, and ft_stopword_file values to myisamchk that you use for mysqld. For example, if you have set the minimum word length to 3 , you can repair a table with myisamchk like this:
```
myisamchk --recover --ft_min_word_len=3 tbl_name.MYI
```


To ensure that myisamchk and the server use the same values for full-text parameters, you can place each one in both the [mysqld] and [myisamchk] sections of an option file:
```
[mysqld]
ft_min_word_len=3
[myisamchk]
ft_min_word_len=3
```


An alternative to using myisamchk is to use the REPAIR TABLE, ANALYZE TABLE, OPTIMIZE TABLE, or ALTER TABLE. These statements are performed by the server, which knows the proper fulltext parameter values to use.

\subsection*{6.6.4.2 myisamchk Check Options}
myisamchk supports the following options for table checking operations:
- --check, -c

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - check \\
\hline
\end{tabular}

Check the table for errors. This is the default operation if you specify no option that selects an operation type explicitly.
- --check-only-changed, - C

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - check - only-changed \\
\hline
\end{tabular}

Check only tables that have changed since the last check.
- --extend-check, -e

\begin{tabular}{|l|l|}
\hline Command-Line Format & --extend-check \\
\hline
\end{tabular}

Check the table very thoroughly. This is quite slow if the table has many indexes. This option should only be used in extreme cases. Normally, myisamchk or myisamchk --medium-check should be able to determine whether there are any errors in the table.

If you are using --extend-check and have plenty of memory, setting the key_buffer_size variable to a large value helps the repair operation run faster.

See also the description of this option under table repair options.
For a description of the output format, see Section 6.6.4.5, "Obtaining Table Information with myisamchk".
- --fast, -F

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - fast \\
\hline
\end{tabular}

Check only tables that haven't been closed properly.
- --force, -f

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - force \\
\hline
\end{tabular}

Do a repair operation automatically if myisamchk finds any errors in the table. The repair type is the same as that specified with the --recover or - r option.
- --information, -i

\begin{tabular}{|l|l|}
\hline Command-Line Format & --information \\
\hline
\end{tabular}

Print informational statistics about the table that is checked.
- --medium-check, -m

\begin{tabular}{|l|l|}
\hline Command-Line Format & --medium-check \\
\hline
\end{tabular}

Do a check that is faster than an --extend-check operation. This finds only $99.99 \%$ of all errors, which should be good enough in most cases.
- --read-only, -T

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - read - only \\
\hline
\end{tabular}

Do not mark the table as checked. This is useful if you use myisamchk to check a table that is in use by some other application that does not use locking, such as mysqld when run with external locking disabled.

Command-Line Format
shouldn't use this option if the mysqld server is using the table and you are running it with external locking disabled.

\subsection*{6.6.4.3 myisamchk Repair Options}
myisamchk supports the following options for table repair operations (operations performed when an option such as --recover or --safe-recover is given):
- - - backup, - B

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - backup \\
\hline
\end{tabular}

Make a backup of the .MYD file as file_name-time. BAK
- --character-sets-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

The directory where character sets are installed. See Section 12.15, "Character Set Configuration".
- --correct-checksum

\begin{tabular}{|l|l|}
\hline Command-Line Format & --correct-checksum \\
\hline
\end{tabular}

Correct the checksum information for the table.
- --data-file-length=len, -D len

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - data-file-length=len \\
\hline Type & Numeric \\
\hline
\end{tabular}

The maximum length of the data file (when re-creating data file when it is "full").
- --extend-check, -e

\begin{tabular}{|l|l|}
\hline Command-Line Format & --extend-check \\
\hline
\end{tabular}

Do a repair that tries to recover every possible row from the data file. Normally, this also finds a lot of garbage rows. Do not use this option unless you are desperate.

See also the description of this option under table checking options.
For a description of the output format, see Section 6.6.4.5, "Obtaining Table Information with myisamchk".
- --force, -f

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - force \\
\hline
\end{tabular}

Overwrite old intermediate files (files with names like tbl_name.TMD) instead of aborting.
- --keys-used=val, -k val

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - keys - used=val \\
\hline Type & Numeric \\
\hline
\end{tabular}

For myisamchk, the option value is a bit value that indicates which indexes to update. Each binary bit of the option value corresponds to a table index, where the first index is bit 0 . An option value of 0 disables updates to all indexes, which can be used to get faster inserts. Deactivated indexes can be reactivated by using myisamchk -r.
- --max-record-length=len

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -max-record-length=len \\
\hline Type & Numeric \\
\hline
\end{tabular}

Skip rows larger than the given length if myisamchk cannot allocate memory to hold them.
- --quick, -q

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - quick \\
\hline
\end{tabular}

Achieve a faster repair by modifying only the index file, not the data file. You can specify this option twice to force myisamchk to modify the original data file in case of duplicate keys.
- --recover, -r

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- recover \\
\hline
\end{tabular}

Do a repair that can fix almost any problem except unique keys that are not unique (which is an extremely unlikely error with MyISAM tables). If you want to recover a table, this is the option to try first. You should try--safe-recover only if myisamchk reports that the table cannot be recovered using --recover. (In the unlikely case that --recover fails, the data file remains intact.)

If you have lots of memory, you should increase the value of myisam_sort_buffer_size.
- --safe-recover, -o

\begin{tabular}{|l|l|}
\hline Command-Line Format & --safe-recover \\
\hline
\end{tabular}

Do a repair using an old recovery method that reads through all rows in order and updates all index trees based on the rows found. This is an order of magnitude slower than --recover, but can handle a couple of very unlikely cases that --recover cannot. This recovery method also uses much less disk space than - - recover. Normally, you should repair first using - - recover, and then with --safe-recover only if --recover fails.

If you have lots of memory, you should increase the value of key_buffer_size.
- --set-collation=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - set-collation=name \\
\hline Type & String \\
\hline
\end{tabular}

Specify the collation to use for sorting table indexes. The character set name is implied by the first part of the collation name.
- --sort-recover, -n

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sort-recover \\
\hline
\end{tabular}

Force myisamchk to use sorting to resolve the keys even if the temporary files would be very large.
- --tmpdir=dir_name, -t dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - tmpdir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The path of the directory to be used for storing temporary files. If this is not set, myisamchk uses the value of the TMPDIR environment variable. --tmpdir can be set to a list of directory paths that are used successively in round-robin fashion for creating temporary files. The separator character between directory names is the colon (:) on Unix and the semicolon (;) on Windows.
- - - unpack, - u

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - unpack \\
\hline
\end{tabular}

Unpack a table that was packed with myisampack.

\subsection*{6.6.4.4 Other myisamchk Options}
myisamchk supports the following options for actions other than table checks and repairs:
- --analyze, -a

\begin{tabular}{|l|l|}
\hline Command-Line Format & --analyze \\
\hline
\end{tabular}

Analyze the distribution of key values. This improves join performance by enabling the join optimizer to better choose the order in which to join the tables and which indexes it should use. To obtain information about the key distribution, use a myisamchk --description --verbose tbl_name command or the SHOW INDEX FROM tbl_name statement.
- --block-search=offset, -b offset

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - block - search=offset \\
\hline Type & Numeric \\
\hline
\end{tabular}

Find the record that a block at the given offset belongs to.
- --description, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & --description \\
\hline
\end{tabular}

AUTO_INCREMENT numbers for new records begin with the largest value currently in the table, plus one.
- --sort-index, -S

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sort-index \\
\hline
\end{tabular}

Sort the index tree blocks in high-low order. This optimizes seeks and makes table scans that use indexes faster.
- --sort-records= $N$, -R $N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -sort - records=\# \\
\hline Type & Numeric \\
\hline
\end{tabular}

Sort records according to a particular index. This makes your data much more localized and may speed up range-based SELECT and ORDER BY operations that use this index. (The first time you use this option to sort a table, it may be very slow.) To determine a table's index numbers, use SHOW INDEX, which displays a table's indexes in the same order that myisamchk sees them. Indexes are numbered beginning with 1.

If keys are not packed (PACK_KEYS=0), they have the same length, so when myisamchk sorts and moves records, it just overwrites record offsets in the index. If keys are packed (PACK_KEYS=1), myisamchk must unpack key blocks first, then re-create indexes and pack the key blocks again. (In this case, re-creating indexes is faster than updating offsets for each index.)

\subsection*{6.6.4.5 Obtaining Table Information with myisamchk}

To obtain a description of a MyISAM table or statistics about it, use the commands shown here. The output from these commands is explained later in this section.
- myisamchk -d tbl_name

Runs myisamchk in "describe mode" to produce a description of your table. If you start the MySQL server with external locking disabled, myisamchk may report an error for a table that is updated while it runs. However, because myisamchk does not change the table in describe mode, there is no risk of destroying data.
- myisamchk -dv tbl_name

Adding - v runs myisamchk in verbose mode so that it produces more information about the table.
Adding - v a second time produces even more information.
- myisamchk -eis tbl_name

Shows only the most important information from a table. This operation is slow because it must read the entire table.
- myisamchk -eiv tbl_name

This is like-eis, but tells you what is being done.
The tbl_name argument can be either the name of a MyISAM table or the name of its index file, as described in Section 6.6.4, "myisamchk - MyISAM Table-Maintenance Utility". Multiple tbl_name arguments can be given.

Suppose that a table named person has the following structure. (The MAX_ROWS table option is included so that in the example output from myisamchk shown later, some values are smaller and fit the output format more easily.)
```
CREATE TABLE person
(
    id INT NOT NULL AUTO_INCREMENT,
    last_name VARCHAR(20) NOT NULL,
    first_name VARCHAR(20) NOT NULL,
    birth DATE,
    death DATE,
    PRIMARY KEY (id),
    INDEX (last_name, first_name),
    INDEX (birth)
) MAX_ROWS = 1000000 ENGINE=MYISAM;
```


Suppose also that the table has these data and index file sizes:
```
-rw-rw---- 1 mysql mysql 9347072 Aug 19 11:47 person.MYD
-rw-rw---- 1 mysql mysql 6066176 Aug 19 11:47 person.MYI
```


Example of myisamchk -dvv output:
```
MyISAM file: person
Record format: Packed
Character set: utf8mb4_0900_ai_ci (255)
File-version: 1
Creation time: 2017-03-30 21:21:30
Status: checked,analyzed,optimized keys,sorted index pages
Auto increment key: 1 Last value: 306688
Data records: 306688 Deleted blocks: 0
Datafile parts: 306688 Deleted data: 0
Datafile pointer (bytes): 4 Keyfile pointer (bytes): 3
Datafile length: 9347072 Keyfile length: 6066176
Max datafile length: 4294967294 Max keyfile length: 17179868159
Recordlength: 54
table description:

\begin{tabular}{llllrrr} 
Key & Start & Len & Index & Type & Rec/key & Root \\
1 & 2 & 4 & unique & long & 1 & \\
2 & 6 & 80 & multip. & varchar prefix & 0 & 1024 \\
& 87 & 80 & & varchar & 0 & 1024 \\
3 & 168 & 3 & multip. & uint24 NULL & 0 & \\
& & & & 0 & 1024
\end{tabular}

\begin{tabular}{llllll}
\multicolumn{6}{l}{ Field Start } \\
\cline { 2 - 3 } 1 & 1 & 1 & Length & Nullpos & Nullbit \\
2 & 2 & 4 & & & Type \\
3 & 6 & 81 & & & no zeros \\
4 & 87 & 81 & & & varchar \\
5 & 168 & 3 & 1 & 1 & varchar \\
6 & 171 & 3 & 1 & 2 & no zeros \\
& & & & no zeros
\end{tabular}
```


Explanations for the types of information myisamchk produces are given here. "Keyfile" refers to the index file. "Record" and "row" are synonymous, as are "field" and "column."

The initial part of the table description contains these values:
- MyISAM file

Name of the MyISAM (index) file.
- Record format

The format used to store table rows. The preceding examples use Fixed length. Other possible values are Compressed and Packed. (Packed corresponds to what SHOW TABLE STATUS reports as Dynamic.)
- Chararacter set

The table default character set.
- File-version

Version of MyISAM format. Always 1.
- Creation time

When the data file was created.
- Recover time

When the index/data file was last reconstructed.
- Status

Table status flags. Possible values are crashed, open, changed, analyzed, optimized keys, and sorted index pages.
- Auto increment key, Last value

The key number associated the table's AUTO_INCREMENT column, and the most recently generated value for this column. These fields do not appear if there is no such column.
- Data records

The number of rows in the table.
- Deleted blocks

How many deleted blocks still have reserved space. You can optimize your table to minimize this space. See Section 9.6.4, "MyISAM Table Optimization".
- Datafile parts

For dynamic-row format, this indicates how many data blocks there are. For an optimized table without fragmented rows, this is the same as Data records.
- Deleted data

How many bytes of unreclaimed deleted data there are. You can optimize your table to minimize this space. See Section 9.6.4, "MyISAM Table Optimization".
- Datafile pointer

The size of the data file pointer, in bytes. It is usually $2,3,4$, or 5 bytes. Most tables manage with 2 bytes, but this cannot be controlled from MySQL yet. For fixed tables, this is a row address. For dynamic tables, this is a byte address.
- Keyfile pointer

The size of the index file pointer, in bytes. It is usually 1,2 , or 3 bytes. Most tables manage with 2 bytes, but this is calculated automatically by MySQL. It is always a block address.
- Max datafile length

How long the table data file can become, in bytes.
- Max keyfile length

How long the table index file can become, in bytes.
- Recordlength

How much space each row takes, in bytes.
The table description part of the output includes a list of all keys in the table. For each key, myisamchk displays some low-level information:
- Key

This key's number. This value is shown only for the first column of the key. If this value is missing, the line corresponds to the second or later column of a multiple-column key. For the table shown in the example, there are two table description lines for the second index. This indicates that it is a multiple-part index with two parts.
- Start

Where in the row this portion of the index starts.
- Len

How long this portion of the index is. For packed numbers, this should always be the full length of the column. For strings, it may be shorter than the full length of the indexed column, because you can index a prefix of a string column. The total length of a multiple-part key is the sum of the Len values for all key parts.
- Index

Whether a key value can exist multiple times in the index. Possible values are unique or multip. (multiple).
- Type

What data type this portion of the index has. This is a MyISAM data type with the possible values packed, stripped, or empty.
- Root

Address of the root index block.
- Blocksize

The size of each index block. By default this is 1024, but the value may be changed at compile time when MySQL is built from source.
- Rec/key

This is a statistical value used by the optimizer. It tells how many rows there are per value for this index. A unique index always has a value of 1 . This may be updated after a table is loaded (or greatly changed) with myisamchk - a. If this is not updated at all, a default value of 30 is given.

The last part of the output provides information about each column:
- Field

The column number.
- Start

The byte position of the column within table rows.
- Length

The length of the column in bytes.
- Nullpos, Nullbit

For columns that can be NULL, MyISAM stores NULL values as a flag in a byte. Depending on how many nullable columns there are, there can be one or more bytes used for this purpose. The Nullpos and Nullbit values, if nonempty, indicate which byte and bit contains that flag indicating whether the column is NULL.

The position and number of bytes used to store NULL flags is shown in the line for field 1. This is why there are six Field lines for the person table even though it has only five columns.
- Type

The data type. The value may contain any of the following descriptors:
- constant

All rows have the same value.
- no endspace

Do not store endspace.
- no endspace, not_always

Do not store endspace and do not do endspace compression for all values.
- no endspace, no empty

Do not store endspace. Do not store empty values.
- table-lookup

The column was converted to an ENUM.
- zerofill(N)

The most significant $N$ bytes in the value are always 0 and are not stored.
- no zeros

Do not store zeros.
- always zero

Zero values are stored using one bit.
- Huff tree

The number of the Huffman tree associated with the column.
- Bits

The number of bits used in the Huffman tree.
The Huff tree and Bits fields are displayed if the table has been compressed with myisampack. See Section 6.6.6, "myisampack - Generate Compressed, Read-Only MyISAM Tables", for an example of this information.

Example of myisamchk -eiv output:
```
Checking MyISAM file: person
Data records: 306688 Deleted blocks: 0
- check file-size
- check record delete-chain
No recordlinks
- check key delete-chain
block_size 1024:
- check index reference
- check data record references index: 1
Key: 1: Keyblocks used: 98% Packed: 0% Max levels: 3
- check data record references index: 2
```

```
Key: 2: Keyblocks used: 99% Packed: 97% Max levels: 3
- check data record references index: 3
Key: 3: Keyblocks used: 98% Packed: -14% Max levels: 3
Total: Keyblocks used: 98% Packed: 89%
- check records and index references
*** LOTS OF ROW NUMBERS DELETED ***

\begin{tabular}{lrlrlc} 
Records: & 306688 & M.recordlength: & 25 Packed: & $83 \%$ \\
Recordspace used: & $97 \%$ & Empty space: & $2 \%$ Blocks/Record: & 1.00 \\
Record blocks: & 306688 & Delete blocks: & 0 & \\
Record data: & 7934464 & Deleted data: & 0 & \\
Lost space: & 256512 & Linkdata: & 1156096 &
\end{tabular}
User time 43.08, System time 1.68
Maximum resident set size 0, Integral resident set size 0
Non-physical pagefaults 0, Physical pagefaults 0, Swaps 0
Blocks in 0 out 7, Messages in 0 out 0, Signals 0
Voluntary context switches 0, Involuntary context switches 0
Maximum memory usage: 1046926 bytes (1023k)
```

myisamchk -eiv output includes the following information:
- Data records

The number of rows in the table.
- Deleted blocks

How many deleted blocks still have reserved space. You can optimize your table to minimize this space. See Section 9.6.4, "MyISAM Table Optimization".
- Key

The key number.
- Keyblocks used

What percentage of the keyblocks are used. When a table has just been reorganized with myisamchk, the values are very high (very near theoretical maximum).
- Packed

MySQL tries to pack key values that have a common suffix. This can only be used for indexes on CHAR and VARCHAR columns. For long indexed strings that have similar leftmost parts, this can significantly reduce the space used. In the preceding example, the second key is 40 bytes long and a $97 \%$ reduction in space is achieved.
- Max levels

How deep the B-tree for this key is. Large tables with long key values get high values.
- Records

How many rows are in the table.
- M.recordlength

The average row length. This is the exact row length for tables with fixed-length rows, because all rows have the same length.
- Packed

MySQL strips spaces from the end of strings. The Packed value indicates the percentage of savings achieved by doing this.
- Recordspace used

What percentage of the data file is used.
- Empty space

What percentage of the data file is unused.
- Blocks/Record

Average number of blocks per row (that is, how many links a fragmented row is composed of). This is always 1.0 for fixed-format tables. This value should stay as close to 1.0 as possible. If it gets too large, you can reorganize the table. See Section 9.6.4, "MyISAM Table Optimization".
- Recordblocks

How many blocks (links) are used. For fixed-format tables, this is the same as the number of rows.
- Deleteblocks

How many blocks (links) are deleted.
- Recorddata

How many bytes in the data file are used.
- Deleted data

How many bytes in the data file are deleted (unused).
- Lost space

If a row is updated to a shorter length, some space is lost. This is the sum of all such losses, in bytes.
- Linkdata

When the dynamic table format is used, row fragments are linked with pointers ( 4 to 7 bytes each). Linkdata is the sum of the amount of storage used by all such pointers.

\subsection*{6.6.4.6 myisamchk Memory Usage}

Memory allocation is important when you run myisamchk. myisamchk uses no more memory than its memory-related variables are set to. If you are going to use myisamchk on very large tables, you should first decide how much memory you want it to use. The default is to use only about 3 MB to perform repairs. By using larger values, you can get myisamchk to operate faster. For example, if you have more than 512 MB RAM available, you could use options such as these (in addition to any other options you might specify):
```
myisamchk --myisam_sort_buffer_size=256M \
    --key_buffer_size=512M \
    --read_buffer_size=64M \
    --write_buffer_size=64M ...
```


Using --myisam_sort_buffer_size=16M is probably enough for most cases.
Be aware that myisamchk uses temporary files in TMPDIR. If TMPDIR points to a memory file system, out of memory errors can easily occur. If this happens, run myisamchk with the --tmpdir=dir_name option to specify a directory located on a file system that has more space.

When performing repair operations, myisamchk also needs a lot of disk space:
- Twice the size of the data file (the original file and a copy). This space is not needed if you do a repair with - -quick; in this case, only the index file is re-created. This space must be available on the same file system as the original data file, as the copy is created in the same directory as the original.
- Space for the new index file that replaces the old one. The old index file is truncated at the start of the repair operation, so you usually ignore this space. This space must be available on the same file system as the original data file.
- When using --recover or--sort-recover (but not when using--safe-recover), you need space on disk for sorting. This space is allocated in the temporary directory (specified by TMPDIR or --tmpdir=dir_name). The following formula yields the amount of space required:
(largest_key + row_pointer_length) * number_of_rows * 2
You can check the length of the keys and the row_pointer_length with myisamchk dv tbl_name (see Section 6.6.4.5, "Obtaining Table Information with myisamchk"). The row_pointer_length and number_of_rows values are the Datafile pointer and Data records values in the table description. To determine the largest_key value, check the Key lines in the table description. The Len column indicates the number of bytes for each key part. For a multiple-column index, the key size is the sum of the Len values for all key parts.

If you have a problem with disk space during repair, you can try --safe-recover instead of -recover.

\subsection*{6.6.5 myisamlog — Display MyISAM Log File Contents}
myisamlog processes the contents of a MyISAM log file. To create such a file, start the server with a --log-isam=log_file option.

Invoke myisamlog like this:
myisamlog [options] [file_name [tbl_name] ...]
The default operation is update ( -u ). If a recovery is done ( -r ), all writes and possibly updates and deletes are done and errors are only counted. The default log file name is myisam. log if no log_file argument is given. If tables are named on the command line, only those tables are updated.
myisamlog supports the following options:
- - ?, - I

Display a help message and exit.
- - C $N$

Execute only $N$ commands.
- - f $N$

Specify the maximum number of open files.
- -F filepath/

Specify the file path with a trailing slash.
- -i

Display extra information before exiting.
- -o offset

Specify the starting offset.
- - p N

Remove $N$ components from path.
- - $r$

Perform a recovery operation.
- -R record_pos_file record_pos

Specify record position file and record position.
- - u

Perform an update operation.
- -V

Verbose mode. Print more output about what the program does. This option can be given multiple times to produce more and more output.
- -w write_file

Specify the write file.
- -V

Display version information.

\subsection*{6.6.6 myisampack — Generate Compressed, Read-Only MyISAM Tables}

The myisampack utility compresses MyISAM tables. myisampack works by compressing each column in the table separately. Usually, myisampack packs the data file 40\% to 70\%.

When the table is used later, the server reads into memory the information needed to decompress columns. This results in much better performance when accessing individual rows, because you only have to uncompress exactly one row.

MySQL uses mmap( ) when possible to perform memory mapping on compressed tables. If mmap ( ) does not work, MySQL falls back to normal read/write file operations.

Please note the following:
- If the mysqld server was invoked with external locking disabled, it is not a good idea to invoke myisampack if the table might be updated by the server during the packing process. It is safest to compress tables with the server stopped.
- After packing a table, it becomes read only. This is generally intended (such as when accessing packed tables on a CD).
- myisampack does not support partitioned tables.

Invoke myisampack like this:
```
myisampack [options] file_name ...
```


Each file name argument should be the name of an index (.MYI) file. If you are not in the database directory, you should specify the path name to the file. It is permissible to omit the .MYI extension.

After you compress a table with myisampack, use myisamchk -rq to rebuild its indexes. Section 6.6.4, "myisamchk - MyISAM Table-Maintenance Utility".
myisampack supports the following options. It also reads option files and supports the options for processing them described at Section 6.2.2.3, "Command-Line Options that Affect Option-File Handling".
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display a help message and exit.
- --backup, -b

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - backup \\
\hline
\end{tabular}

Make a backup of each table's data file using the name tbl_name. OLD.
- --character-sets-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory where character sets are installed. See Section 12.15, "Character Set Configuration".
- --debug[=debug_options], -\# [debug_options]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -debug[=debug_options] \\
\hline Type & String \\
\hline Default Value & d:t:o \\
\hline
\end{tabular}

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: \mathrm{o}$, file_name. The default is d:t:o.

This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --force, -f

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - force \\
\hline
\end{tabular}

Produce a packed table even if it becomes larger than the original or if the intermediate file from an earlier invocation of myisampack exists. (myisampack creates an intermediate file named tbl_name. TMD in the database directory while it compresses the table. If you kill myisampack, the .TMD file might not be deleted.) Normally, myisampack exits with an error if it finds that tbl_name.TMD exists. With --force, myisampack packs the table anyway.
- --join=big_tbl_name, -j big_tbl_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --join=big_tbl_name \\
\hline Type & String \\
\hline
\end{tabular}

Join all tables named on the command line into a single packed table big_tbl_name. All tables that are to be combined must have identical structure (same column names and types, same indexes, and so forth).
big_tbl_name must not exist prior to the join operation. All source tables named on the command line to be merged into big_tbl_name must exist. The source tables are read for the join operation but not modified.
- --silent, -s

\begin{tabular}{|l|l|}
\hline Command-Line Format & --silent \\
\hline
\end{tabular}

Silent mode. Write output only when errors occur.
- --test,-t

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - test \\
\hline
\end{tabular}

Do not actually pack the table, just test packing it.
- --tmpdir=dir_name, -T dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - tmpdir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

Use the named directory as the location where myisampack creates temporary files.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Verbose mode. Write information about the progress of the packing operation and its result.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
- --wait, -w

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - wait \\
\hline
\end{tabular}

Wait and retry if the table is in use. If the mysqld server was invoked with external locking disabled, it is not a good idea to invoke myisampack if the table might be updated by the server during the packing process.

The following sequence of commands illustrates a typical table compression session:
```
$> ls -l station.*
-rw-rw-r-- 1 jones my 994128 Apr 17 19:00 station.MYD
-rw-rw-r-- 1 jones my 53248 Apr 17 19:00 station.MYI
$> myisamchk -dvv station
MyISAM file: station
Isam-version: 2
Creation time: 1996-03-13 10:08:58
Recover time: 1997-02-02 3:06:43
Data records: 1192 Deleted blocks: 0
Datafile parts: 1192 Deleted data: 0
Datafile pointer (bytes): 2 Keyfile pointer (bytes): 2
Max datafile length: 54657023 Max keyfile length: 33554431
Recordlength: 834
Record format: Fixed length
table description:

\begin{tabular}{llllrrr} 
Key Start & Len & Index & Type & Root & Blocksize & Rec/key \\
1 & 2 & 4 & unique & unsigned long & 1024 & 1024
\end{tabular}
```


23230 multip. text 1024010241

Field Start Length Type

\begin{tabular}{|l|l|l|}
\hline 1 & 1 & 1 \\
\hline 2 & 2 & 4 \\
\hline 3 & 6 & 4 \\
\hline 4 & 10 & 1 \\
\hline 5 & 11 & 20 \\
\hline 6 & 31 & 1 \\
\hline 7 & 32 & 30 \\
\hline 8 & 62 & 35 \\
\hline 9 & 97 & 35 \\
\hline 10 & 132 & 35 \\
\hline 11 & 167 & 4 \\
\hline 12 & 171 & 16 \\
\hline 13 & 187 & 35 \\
\hline 14 & 222 & 4 \\
\hline 15 & 226 & 16 \\
\hline 16 & 242 & 20 \\
\hline 17 & 262 & 20 \\
\hline 18 & 282 & 20 \\
\hline 19 & 302 & 30 \\
\hline 20 & 332 & 4 \\
\hline 21 & 336 & 4 \\
\hline 22 & 340 & 1 \\
\hline 23 & 341 & 8 \\
\hline 24 & 349 & 8 \\
\hline 25 & 357 & 8 \\
\hline 26 & 365 & 2 \\
\hline 27 & 367 & 2 \\
\hline 28 & 369 & 4 \\
\hline 29 & 373 & 4 \\
\hline 30 & 377 & 1 \\
\hline 31 & 378 & 2 \\
\hline 32 & 380 & 8 \\
\hline 33 & 388 & 4 \\
\hline 34 & 392 & 4 \\
\hline 35 & 396 & 4 \\
\hline 36 & 400 & 4 \\
\hline 37 & 404 & 1 \\
\hline 38 & 405 & 4 \\
\hline 39 & 409 & 4 \\
\hline 40 & 413 & 4 \\
\hline 41 & 417 & 4 \\
\hline 42 & 421 & 4 \\
\hline 43 & 425 & 4 \\
\hline 44 & 429 & 20 \\
\hline 45 & 449 & 30 \\
\hline 46 & 479 & 1 \\
\hline 47 & 480 & 1 \\
\hline 48 & 481 & 79 \\
\hline 49 & 560 & 79 \\
\hline 50 & 639 & 79 \\
\hline 51 & 718 & 79 \\
\hline 52 & 797 & 8 \\
\hline 53 & 805 & 1 \\
\hline 54 & 806 & 1 \\
\hline 55 & 807 & 20 \\
\hline 56 & 827 & 4 \\
\hline 57 & 831 & 4 \\
\hline
\end{tabular}
\$> myisampack station.MYI
Compressing station.MYI: (1192 records)
- Calculating statistics

\begin{tabular}{lrll} 
normal: & 20 & empty-space: & 16 \\
pre-space: & 0 & empty-zero: & 12 \\
end-space: & 12 & table-lookups: & 5 \\
zero: &
\end{tabular}
Original trees: 57 After join: 17
- Compressing file
87.14\%
Remember to run myisamchk -rq on compressed tables
```
$> myisamchk -rq station
- check record delete-chain
- recovering (with sort) MyISAM-table 'station'
Data records: 1192
- Fixing index 1
- Fixing index 2
$> mysqladmin -uroot flush-tables
$> ls -l station.*

\begin{tabular}{lllr}
-rw-rw-r-- & 1 jones & my & $127874 \mathrm{Apr} 1719: 00$ \\
-rw-rw-r-- & 1 jones & my & $55296 \mathrm{Apr} 1719: 04$
\end{tabular} station.MYD
$> myisamchk -dvv station
MyISAM file: station
Isam-version: 2
Creation time: 1996-03-13 10:08:58
Recover time: 1997-04-17 19:04:26
Data records: 1192 Deleted blocks: 0
Datafile parts: 1192 Deleted data: 0
Datafile pointer (bytes): 3 Keyfile pointer (bytes): 1
Max datafile length: 16777215 Max keyfile length: 131071
Recordlength: 834
Record format: Compressed
table description:

\begin{tabular}{llllrrr} 
Key & Start & Len & Index & Type & Root & Blocksize \\
1 & 2 & 4 & unique & unsigned long & 10240 & 1024 \\
2 & 32 & 30 & multip. & text & 54272 & 1024
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline Field & Start & Length & Type & & Huff & tree & Bits \\
\hline 1 & 1 & 1 & constant & & & 1 & 0 \\
\hline 2 & 2 & 4 & zerofill(1) & & & 2 & 9 \\
\hline 3 & 6 & 4 & no zeros, zerofill(1) & & & 2 & 9 \\
\hline 4 & 10 & 1 & & & & 3 & 9 \\
\hline 5 & 11 & 20 & table-lookup & & & 4 & 0 \\
\hline 6 & 31 & 1 & & & & 3 & 9 \\
\hline 7 & 32 & 30 & no endspace, not_always & & & 5 & 9 \\
\hline 8 & 62 & 35 & no endspace, not_always, no empty & & & 6 & 9 \\
\hline 9 & 97 & 35 & no empty & & & 7 & 9 \\
\hline 10 & 132 & 35 & no endspace, not_always, no empty & & & 6 & 9 \\
\hline 11 & 167 & 4 & zerofill(1) & & & 2 & 9 \\
\hline 12 & 171 & 16 & no endspace, not_always, no empty & & & 5 & 9 \\
\hline 13 & 187 & 35 & no endspace, not_always, no empty & & & 6 & 9 \\
\hline 14 & 222 & 4 & zerofill(1) & & & 2 & 9 \\
\hline 15 & 226 & 16 & no endspace, not_always, no empty & & & 5 & 9 \\
\hline 16 & 242 & 20 & no endspace, not_always & & & 8 & 9 \\
\hline 17 & 262 & 20 & no endspace, no empty & & & 8 & 9 \\
\hline 18 & 282 & 20 & no endspace, no empty & & & 5 & 9 \\
\hline 19 & 302 & 30 & no endspace, no empty & & & 6 & 9 \\
\hline 20 & 332 & 4 & always zero & & & 2 & 9 \\
\hline 21 & 336 & 4 & always zero & & & 2 & 9 \\
\hline 22 & 340 & 1 & & & & 3 & 9 \\
\hline 23 & 341 & 8 & table-lookup & & & 9 & 0 \\
\hline 24 & 349 & 8 & table-lookup & & & 10 & 0 \\
\hline 25 & 357 & 8 & always zero & & & 2 & 9 \\
\hline 26 & 365 & 2 & & & & 2 & 9 \\
\hline 27 & 367 & 2 & no zeros, zerofill(1) & & & 2 & 9 \\
\hline 28 & 369 & 4 & no zeros, zerofill(1) & & & 2 & 9 \\
\hline 29 & 373 & 4 & table-lookup & & & 11 & 0 \\
\hline 30 & 377 & 1 & & & & 3 & 9 \\
\hline 31 & 378 & 2 & no zeros, zerofill(1) & & & 2 & 9 \\
\hline 32 & 380 & 8 & no zeros & & & 2 & 9 \\
\hline 33 & 388 & 4 & always zero & & & 2 & 9 \\
\hline 34 & 392 & 4 & table-lookup & & & 12 & 0 \\
\hline 35 & 396 & 4 & no zeros, zerofill(1) & & & 13 & 9 \\
\hline 36 & 400 & 4 & no zeros, zerofill(1) & & & 2 & 9 \\
\hline 37 & 404 & 1 & & & & 2 & 9 \\
\hline 38 & 405 & 4 & no zeros & & & 2 & 9 \\
\hline 39 & 409 & 4 & always zero & & & 2 & 9 \\
\hline 40 & 413 & 4 & no zeros & & & 2 & 9 \\
\hline
\end{tabular}
```


\begin{tabular}{|l|l|l|l|l|l|}
\hline 41 & 417 & 4 & always zero & 2 & 9 \\
\hline 42 & 421 & 4 & no zeros & 2 & 9 \\
\hline 43 & 425 & 4 & always zero & 2 & 9 \\
\hline 44 & 429 & 20 & no empty & 3 & 9 \\
\hline 45 & 449 & 30 & no empty & 3 & 9 \\
\hline 46 & 479 & 1 & & 14 & 4 \\
\hline 47 & 480 & 1 & & 14 & 4 \\
\hline 48 & 481 & 79 & no endspace, no empty & 15 & 9 \\
\hline 49 & 560 & 79 & no empty & 2 & 9 \\
\hline 50 & 639 & 79 & no empty & 2 & 9 \\
\hline 51 & 718 & 79 & no endspace & 16 & 9 \\
\hline 52 & 797 & 8 & no empty & 2 & 9 \\
\hline 53 & 805 & 1 & & 17 & 1 \\
\hline 54 & 806 & 1 & & 3 & 9 \\
\hline 55 & 807 & 20 & no empty & 3 & 9 \\
\hline 56 & 827 & 4 & no zeros, zerofill(2) & 2 & 9 \\
\hline 57 & 831 & 4 & no zeros, zerofill(1) & 2 & 9 \\
\hline
\end{tabular}
myisampack displays the following kinds of information:
- normal

The number of columns for which no extra packing is used.
- empty-space

The number of columns containing values that are only spaces. These occupy one bit.
- empty-zero

The number of columns containing values that are only binary zeros. These occupy one bit.
- empty-fill

The number of integer columns that do not occupy the full byte range of their type. These are changed to a smaller type. For example, a BIGINT column (eight bytes) can be stored as a TINYINT column (one byte) if all its values are in the range from -128 to 127.
- pre-space

The number of decimal columns that are stored with leading spaces. In this case, each value contains a count for the number of leading spaces.
- end-space

The number of columns that have a lot of trailing spaces. In this case, each value contains a count for the number of trailing spaces.
- table-lookup

The column had only a small number of different values, which were converted to an ENUM before Huffman compression.
- zero

The number of columns for which all values are zero.
- Original trees

The initial number of Huffman trees.
- After join

The number of distinct Huffman trees left after joining trees to save some header space.
After a table has been compressed, the Field lines displayed by myisamchk -dvv include additional information about each column:
- Type

The data type. The value may contain any of the following descriptors:
- constant

All rows have the same value.
- no endspace

Do not store endspace.
- no endspace, not_always

Do not store endspace and do not do endspace compression for all values.
- no endspace, no empty

Do not store endspace. Do not store empty values.
- table-lookup

The column was converted to an ENUM.
- zerofill(N)

The most significant $N$ bytes in the value are always 0 and are not stored.
- no zeros

Do not store zeros.
- always zero

Zero values are stored using one bit.
- Huff tree

The number of the Huffman tree associated with the column.
- Bits

The number of bits used in the Huffman tree.
After you run myisampack, use myisamchk to re-create any indexes. At this time, you can also sort the index blocks and create statistics needed for the MySQL optimizer to work more efficiently:
myisamchk -rq --sort-index --analyze tbl_name.MYI
After you have installed the packed table into the MySQL database directory, you should execute mysqladmin flush-tables to force mysqld to start using the new table.

To unpack a packed table, use the --unpack option to myisamchk.

\subsection*{6.6.7 mysql_config_editor - MySQL Configuration Utility}

The mysql_config_editor utility enables you to store authentication credentials in an obfuscated login path file named . mylogin. cnf. The file location is the \%APPDATA\%\MySQL directory on Windows and the current user's home directory on non-Windows systems. The file can be read later by MySQL client programs to obtain authentication credentials for connecting to MySQL Server.

The unobfuscated format of the . mylogin. cnf login path file consists of option groups, similar to other option files. Each option group in . mylogin. cnf is called a "login path," which is a group
that permits only certain options: host, user, password, port and socket. Think of a login path option group as a set of options that specify which MySQL server to connect to and which account to authenticate as. Here is an unobfuscated example:
```
[client]
user = mydefaultname
password = mydefaultpass
host = 127.0.0.1
[mypath]
user = myothername
password = myotherpass
host = localhost
```


When you invoke a client program to connect to the server, the client uses .mylogin. cnf in conjunction with other option files. Its precedence is higher than other option files, but less than options specified explicitly on the client command line. For information about the order in which option files are used, see Section 6.2.2.2, "Using Option Files".

To specify an alternate login path file name, set the MYSQL_TEST_LOGIN_FILE environment variable. This variable is recognized by mysql_config_editor, by standard MySQL clients (mysql, mysqladmin, and so forth), and by the mysql-test-run.pl testing utility.

Programs use groups in the login path file as follows:
- mysql_config_editor operates on the client login path by default if you specify no --loginpath=name option to indicate explicitly which login path to use.
- Without a --login-path option, client programs read the same option groups from the login path file that they read from other option files. Consider this command:
```
mysql
```


By default, the mysql client reads the [client] and [mysql] groups from other option files, so it reads them from the login path file as well.
- With a --login-path option, client programs additionally read the named login path from the login path file. The option groups read from other option files remain the same. Consider this command:
```
mysql --login-path=mypath
```


The mysql client reads [client] and [mysql] from other option files, and [client], [mysql], and [mypath] from the login path file.
- Client programs read the login path file even when the --no-defaults option is used, unless --no-login-paths is set. This permits passwords to be specified in a safer way than on the command line even if - - no-defaults is present.
mysql_config_editor obfuscates the .mylogin.cnf file so it cannot be read as cleartext, and its contents when unobfuscated by client programs are used only in memory. In this way, passwords can be stored in a file in non-cleartext format and used later without ever needing to be exposed on the command line or in an environment variable. mysql_config_editor provides a print command for displaying the login path file contents, but even in this case, password values are masked so as never to appear in a way that other users can see them.

The obfuscation used by mysql_config_editor prevents passwords from appearing in .mylogin.cnf as cleartext and provides a measure of security by preventing inadvertent password exposure. For example, if you display a regular unobfuscated my.cnf option file on the screen, any passwords it contains are visible for anyone to see. With . mylogin. cnf, that is not true, but the obfuscation used is not likely to deter a determined attacker and you should not consider it unbreakable. A user who can gain system administration privileges on your machine to access your files could unobfuscate the .mylogin.cnf file with some effort.

The login path file must be readable and writable to the current user, and inaccessible to other users. Otherwise, mysql_config_editor ignores it, and client programs do not use it, either.

Invoke mysql_config_editor like this:
```
mysql_config_editor [program_options] command [command_options]
```


If the login path file does not exist, mysql_config_editor creates it.
Command arguments are given as follows:
- program_options consists of general mysql_config_editor options.
- command indicates what action to perform on the .mylogin.cnf login path file. For example, set writes a login path to the file, remove removes a login path, and print displays login path contents.
- command_options indicates any additional options specific to the command, such as the login path name and the values to use in the login path.

The position of the command name within the set of program arguments is significant. For example, these command lines have the same arguments, but produce different results:
```
mysql_config_editor --help set
mysql_config_editor set --help
```


The first command line displays a general mysql_config_editor help message, and ignores the set command. The second command line displays a help message specific to the set command.

Suppose that you want to establish a client login path that defines your default connection parameters, and an additional login path named remote for connecting to the MySQL server the host remote. example.com. You want to log in as follows:
- By default, to the local server with a user name and password of localuser and localpass
- To the remote server with a user name and password of remoteuser and remotepass

To set up the login paths in the .mylogin. cnf file, use the following set commands. Enter each command on a single line, and enter the appropriate passwords when prompted:
```
$> mysql_config_editor set --login-path=client
    --host=localhost --user=localuser --password
Enter password: enter password "localpass" here
$> mysql_config_editor set --login-path=remote
    --host=remote.example.com --user=remoteuser --password
Enter password: enter password "remotepass" here
```

mysql_config_editor uses the client login path by default, so the --login-path=client option can be omitted from the first command without changing its effect.

To see what mysql_config_editor writes to the .mylogin.cnf file, use the print command:
```
$> mysql_config_editor print --all
[client]
user = localuser
password = *****
host = localhost
[remote]
user = remoteuser
password = *****
host = remote.example.com
```


The print command displays each login path as a set of lines beginning with a group header indicating the login path name in square brackets, followed by the option values for the login path. Password values are masked and do not appear as cleartext.

If you do not specify - - all to display all login paths or --login-path=name to display a named login path, the print command displays the client login path by default, if there is one.

As shown by the preceding example, the login path file can contain multiple login paths. In this way, mysql_config_editor makes it easy to set up multiple "personalities" for connecting to different MySQL servers, or for connecting to a given server using different accounts. Any of these can be
selected by name later using the --login-path option when you invoke a client program. For example, to connect to the remote server, use this command:
mysql --login-path=remote
Here, mysql reads the [client] and [mysql] option groups from other option files, and the [client], [mysql], and [remote] groups from the login path file.

To connect to the local server, use this command:
mysql --login-path=client
Because mysql reads the client and mysql login paths by default, the --login-path option does not add anything in this case. That command is equivalent to this one:
mysql
Options read from the login path file take precedence over options read from other option files. Options read from login path groups appearing later in the login path file take precedence over options read from groups appearing earlier in the file.
mysql_config_editor adds login paths to the login path file in the order you create them, so you should create more general login paths first and more specific paths later. If you need to move a login path within the file, you can remove it, then recreate it to add it to the end. For example, a client login path is more general because it is read by all client programs, whereas a mysqldump login path is read only by mysqldump. Options specified later override options specified earlier, so putting the login paths in the order client, mysqldump enables mysqldump-specific options to override client options.

When you use the set command with mysql_config_editor to create a login path, you need not specify all possible option values (host name, user name, password, port, socket). Only those values given are written to the path. Any missing values required later can be specified when you invoke a client path to connect to the MySQL server, either in other option files or on the command line. Any options specified on the command line override those specified in the login path file or other option files. For example, if the credentials in the remote login path also apply for the host remote2.example.com, connect to the server on that host like this:
mysql --login-path=remote --host=remote2.example.com

\section*{mysql_config_editor General Options}
mysql_config_editor supports the following general options, which may be used preceding any command named on the command line. For descriptions of command-specific options, see mysql_config_editor Commands and Command-Specific Options.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.18 mysql_config_editor General Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --debug & Write debugging log \\
\hline --help & Display help message and exit \\
\hline --verbose & Verbose mode \\
\hline --version & Display version information and exit \\
\hline
\end{tabular}
\end{table}
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display a general help message and exit.
To see a command-specific help message, invoke mysql_config_editor as follows, where command is a command other than help:
mysql_config_editor command --help
- --debug[=debug_options], -\# debug_options

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug [=debug_options] \\
\hline Type & String \\
\hline Default Value & d: t:o \\
\hline
\end{tabular}

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: \mathrm{o}$, file_name. The default is d:t:o,/tmp/mysql_config_editor.trace.

This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- verbose \\
\hline
\end{tabular}

Verbose mode. Print more information about what the program does. This option may be helpful in diagnosing problems if an operation does not have the effect you expect.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.

\section*{mysql_config_editor Commands and Command-Specific Options}

This section describes the permitted mysql_config_editor commands, and, for each one, the command-specific options permitted following the command name on the command line.

In addition, mysql_config_editor supports general options that can be used preceding any command. For descriptions of these options, see mysql_config_editor General Options.
mysql_config_editor supports these commands:
- help

Display a general help message and exit. This command takes no following options.
To see a command-specific help message, invoke mysql_config_editor as follows, where command is a command other than help:
mysql_config_editor command --help
- print [options]

Print the contents of the login path file in unobfuscated form, with the exception that passwords are displayed as *****.

The default login path name is client if no login path is named. If both --all and --login-path are given, --all takes precedence.

The print command permits these options following the command name:
- --help, -?

Display a help message for the print command and exit.
To see a general help message, use mysql_config_editor --help.
- --all

Print the contents of all login paths in the login path file.
- --login-path=name, -G name

Print the contents of the named login path.
- remove [options]

Remove a login path from the login path file, or modify a login path by removing options from it.
This command removes from the login path only such options as are specified with the --host, -password, --port, --socket, and --user options. If none of those options are given, remove
removes the entire login path. For example, this command removes only the user option from the mypath login path rather than the entire mypath login path:
mysql_config_editor remove --login-path=mypath --user
This command removes the entire mypath login path:
mysql_config_editor remove --login-path=mypath
The remove command permits these options following the command name:
- - -help, -?

Display a help message for the remove command and exit.
To see a general help message, use mysql_config_editor --help.
- --host, -h

Remove the host name from the login path.
- --login-path=name, -G name

The login path to remove or modify. The default login path name is client if this option is not given.
- --password, -p

Remove the password from the login path.
- --port, -P

Remove the TCP/IP port number from the login path.
- --socket, -S

Remove the Unix socket file name from the login path.
- --user, -u

Remove the user name from the login path.
- --warn, -w

Warn and prompt the user for confirmation if the command attempts to remove the default login path (client) and --login-path=client was not specified. This option is enabled by default; use --skip-warn to disable it.
- reset [options]

Empty the contents of the login path file.
The reset command permits these options following the command name:
- --help, -?

Display a help message for the reset command and exit.
To see a general help message, use mysql_config_editor --help.
- set [options]

Write a login path to the login path file.
This command writes to the login path only such options as are specified with the --host, --password, --port, --socket, and --user options. If none of those options are given, mysql_config_editor writes the login path as an empty group.

The set command permits these options following the command name:
- - -help, -?

Display a help message for the set command and exit.
To see a general help message, use mysql_config_editor --help.
- --host=host_name, -h host_name

The host name to write to the login path.
- --login-path=name, -G name

The login path to create. The default login path name is client if this option is not given.
- --password, -p

Prompt for a password to write to the login path. After mysql_config_editor displays the prompt, type the password and press Enter. To prevent other users from seeing the password, mysql_config_editor does not echo it.

To specify an empty password, press Enter at the password prompt. The resulting login path written to the login path file includes a line like this:
password =
- --port=port_num, -P port_num

The TCP/IP port number to write to the login path.
- --socket=file_name,-S file_name

The Unix socket file name to write to the login path.
- --user=user_name, -u user_name

The user name to write to the login path.
- --warn, -w

Warn and prompt the user for confirmation if the command attempts to overwrite an existing login path. This option is enabled by default; use --skip-warn to disable it.

\subsection*{6.6.8 mysql_migrate_keyring - Keyring Key Migration Utility}

The mysql_migrate_keyring utility migrates keys between one keyring component and another. It supports offline and online migrations.

Invoke mysql_migrate_keyring like this (enter the command on a single line):
```
mysql_migrate_keyring
    --component-dir=dir_name
    --source-keyring=name
    --destination-keyring=name
```


\section*{[other options]}

For information about key migrations and instructions describing how to perform them using mysql_migrate_keyring and other methods, see Section 8.4.4.11, "Migrating Keys Between Keyring Keystores".
mysql_migrate_keyring supports the following options, which can be specified on the command line or in the [mysql_migrate_keyring] group of an option file. For information about option files used by MySQL programs, see Section 6.2.2.2, "Using Option Files".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.19 mysql_migrate_keyring Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --component-dir & Directory for keyring components \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --defaults-group-suffix & Option group suffix value \\
\hline --destination-keyring & Destination keyring component name \\
\hline --destination-keyring-configuration-dir & Destination keyring component configuration directory \\
\hline --get-server-public-key & Request RSA public key from server \\
\hline --help & Display help message and exit \\
\hline --host & Host on which MySQL server is located \\
\hline --login-path & Read login path options from .mylogin.cnf \\
\hline --no-defaults & Read no option files \\
\hline --no-login-paths & Do not read login paths from the login path file \\
\hline --online-migration & Migration source is an active server \\
\hline --password & Password to use when connecting to server \\
\hline --port & TCP/IP port number for connection \\
\hline --print-defaults & Print default options \\
\hline --server-public-key-path & Path name to file containing RSA public key \\
\hline --socket & Unix socket file or Windows named pipe to use \\
\hline --source-keyring & Source keyring component name \\
\hline --source-keyring-configuration-dir & Source keyring component configuration directory \\
\hline --ssl-ca & File that contains list of trusted SSL Certificate Authorities \\
\hline --ssl-capath & Directory that contains trusted SSL Certificate Authority certificate files \\
\hline --ssl-cert & File that contains X. 509 certificate \\
\hline --ssl-cipher & Permissible ciphers for connection encryption \\
\hline --ssl-crl & File that contains certificate revocation lists \\
\hline --ssl-crlpath & Directory that contains certificate revocation-list files \\
\hline --ssl-fips-mode & Whether to enable FIPS mode on client side \\
\hline --ssl-key & File that contains X. 509 key \\
\hline --ssl-mode & Desired security state of connection to server \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --ssl-session-data & File that contains SSL session data \\
\hline --ssl-session-data-continue-on-failed-reuse & Whether to establish connections if session reuse fails \\
\hline --tls-ciphersuites & Permissible TLSv1.3 ciphersuites for encrypted connections \\
\hline --tls-sni-servername & Server name supplied by the client \\
\hline --tls-version & Permissible TLS protocols for encrypted connections \\
\hline --user & MySQL user name to use when connecting to server \\
\hline --verbose & Verbose mode \\
\hline --version & Display version information and exit \\
\hline
\end{tabular}
- --help, -h

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display a help message and exit.
- --component-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --component-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory where keyring components are located. This is typically the value of the plugin_dir system variable for the local MySQL server.

\section*{Note}
--component-dir,--source-keyring, and --destinationkeyring are mandatory for all keyring migration operations performed by mysql_migrate_keyring. In addition, the source and destination components must differ, and both components must be properly configured so that mysql_migrate_keyring can load and use them.
- --defaults-extra-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Read this option file after the global option file but (on Unix) before the user option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Use only the given option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

Exception: Even with --defaults-file, client programs read .mylogin.cnf.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-group-suffix=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=str \\
\hline Type & String \\
\hline
\end{tabular}

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, mysql_migrate_keyring normally reads the [mysql_migrate_keyring] group. If this option is given as --defaults-group-suffix=_other, mysql_migrate_keyring also reads the [mysql_migrate_keyring_other] group.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --destination-keyring=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - destination - keyring=name \\
\hline Type & String \\
\hline
\end{tabular}

The destination keyring component for key migration. The format and interpretation of the option value is the same as described for the--source-keyring option.

\section*{Note}
--component-dir, --source-keyring, and --destinationkeyring are mandatory for all keyring migration operations performed by mysql_migrate_keyring. In addition, the source and destination components must differ, and both components must be properly configured so that mysql_migrate_keyring can load and use them.
- --destination-keyring-configuration-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--destination-keyring-configuration- \\
dir=dir_name
\end{tabular} \\
\hline Type & Directory name \\
\hline
\end{tabular}

This option applies only if the destination keyring component global configuration file contains "read_local_config": true, indicating that component configuration is contained in the local configuration file. The option value specifies the directory containing that local file.
- --get-server-public-key

\begin{tabular}{|l|l|} 
Type & Boolean \\
\hline
\end{tabular}

Request from the server the public key required for RSA key pair-based password exchange. This option applies to clients that authenticate with the caching_sha2_password authentication plugin. For that plugin, the server does not send the public key unless requested. This option is ignored for accounts that do not authenticate with that plugin. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If --server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

For information about the caching_sha2_password plugin, see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- --host=host_name, -h host_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - host=host_name \\
\hline Type & String \\
\hline Default Value & localhost \\
\hline
\end{tabular}

The host location of the running server that is currently using one of the key migration keystores. Migration always occurs on the local host, so the option always specifies a value for connecting to a local server, such as localhost, 127.0.0.1, ::1, or the local host IP address or host name.
- --login-path=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login- path=name \\
\hline Type & String \\
\hline
\end{tabular}

Read options from the named login path in the .mylogin. cnf login path file. A "login path" is an option group containing options that specify which MySQL server to connect to and which account to authenticate as. To create or modify a login path file, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
See--login-path for related information.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-defaults \\
\hline
\end{tabular}

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read.

The exception is that the .mylogin.cnf file is read in all cases, if it exists. This permits passwords to be specified in a safer way than on the command line even when --no-defaults is used. To create .mylogin.cnf, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --online-migration

\begin{tabular}{|l|l|}
\hline Command-Line Format & --online-migration \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

This option is mandatory when a running server is using the keyring. It tells mysql_migrate_keyring to perform an online key migration. The option has these effects:
- mysql_migrate_keyring connects to the server using any connection options specified; these options are otherwise ignored.
- After mysql_migrate_keyring connects to the server, it tells the server to pause keyring operations. When key copying is complete, mysql_migrate_keyring tells the server it can resume keyring operations before disconnecting.
- --password[=password], -p[password]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password [=password] \\
\hline Type & String \\
\hline
\end{tabular}

The password of the MySQL account used for connecting to the running server that is currently using one of the key migration keystores. The password value is optional. If not given, mysql_migrate_keyring prompts for one. If given, there must be no space between -password= or -p and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysql_migrate_keyring should not prompt for one, use the --skip-password option.
- --port=port_num, -P port_num

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - port=port_num \\
\hline Type & Numeric \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & 0 \\
\hline
\end{tabular}

For TCP/IP connections, the port number for connecting to the running server that is currently using one of the key migration keystores.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print the program name and all options that it gets from option files.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --server-public-key-path=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -server - public - key - path=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The path name to a file in PEM format containing a client-side copy of the public key required by the server for RSA key pair-based password exchange. This option applies to clients that authenticate with the sha256_password (deprecated) or caching_sha2_password authentication plugin. This option is ignored for accounts that do not authenticate with one of those plugins. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If --server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

For sha256_password (deprecated), this option applies only if MySQL was built using OpenSSL.
For information about the sha256_password and caching_sha2_password plugins, see Section 8.4.1.3, "SHA-256 Pluggable Authentication", and Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- --socket=path, -S path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -socket $=\{$ file_name $\mid$ pipe_name $\}$ \\
\hline Type & String \\
\hline
\end{tabular}

For Unix socket file or Windows named pipe connections, the socket file or named pipe for connecting to the running server that is currently using one of the key migration keystores.

On Windows, this option applies only if the server was started with the named_pipe system variable enabled to support named-pipe connections. In addition, the user making the connection must be a member of the Windows group specified by the named_pipe_full_access_group system variable.
- --source-keyring=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --source-keyring=name \\
\hline
\end{tabular}

\begin{table}
\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}
\captionsetup{labelformat=empty}
\caption{Note
--component-dir, --source-keyring, and --destinationkeyring are mandatory for all keyring migration operations performed by mysql_migrate_keyring. In addition, the source and destination components must differ, and both components must be properly configured so that mysql_migrate_keyring can load and use them.}
\end{table}

The source keyring component for key migration. This is the component library file name specified without any platform-specific extension such as .so or .dll. For example, to use the component for which the library file is component_keyring_file.so, specify the option as --sourcekeyring=component_keyring_file.

\begin{figure}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0591.jpg?height=124&width=99&top_left_y=623&top_left_x=404}
\captionsetup{labelformat=empty}
\caption{Note
--component-dir, --source-keyring, and --destinationkeyring are mandatory for all keyring migration operations performed by mysql_migrate_keyring. In addition, the source and destination components must differ, and both components must be properly configured so that mysql_migrate_keyring can load and use them.}
\end{figure}
- --source-keyring-configuration-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--source-keyring-configuration- \\
dir=dir_name
\end{tabular} \\
\hline Type & Directory name \\
\hline
\end{tabular}

This option applies only if the source keyring component global configuration file contains "read_local_config": true, indicating that component configuration is contained in the local configuration file. The option value specifies the directory containing that local file.
- --ssl*

Options that begin with --ssl specify whether to connect to the server using encryption and indicate where to find SSL keys and certificates. See Command Options for Encrypted Connections.
- --ssl-fips-mode=\{OFF|ON|STRICT\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-fips-mode=\{OFF | ON | STRICT\} \\
\hline Deprecated & Yes \\
\hline Type & Enumeration \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
ON \\
STRICT
\end{tabular} \\
\hline
\end{tabular}

Controls whether to enable FIPS mode on the client side. The --ssl-fips-mode option differs from other - $-\mathrm{ssl}-x x x$ options in that it is not used to establish encrypted connections, but rather to affect which cryptographic operations to permit. See Section 8.8, "FIPS Support".

These--ssl-fips-mode values are permitted:
- OFF: Disable FIPS mode.
- ON: Enable FIPS mode.
- STRICT: Enable "strict" FIPS mode.

\section*{Note}

If the OpenSSL FIPS Object Module is not available, the only permitted value for--ssl-fips-mode is OFF. In this case, setting--ssl-fips-mode to ON or STRICT causes the client to produce a warning at startup and to operate in non-FIPS mode.

This option is deprecated. Expect it to be removed in a future version of MySQL.
- --tls-ciphersuites=ciphersuite_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-ciphersuites=ciphersuite_list \\
\hline Type & String \\
\hline
\end{tabular}

The permissible ciphersuites for encrypted connections that use TLSv1.3. The value is a list of one or more colon-separated ciphersuite names. The ciphersuites that can be named for this option depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- --tls-sni-servername=server_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-sni-servername=server_name \\
\hline Type & String \\
\hline
\end{tabular}

When specified, the name is passed to the libmysqlclient C API library using the MYSQL_OPT_TLS_SNI_SERVERNAME option of mysql_options ( ). The server name is not casesensitive. To show which server name the client specified for the current session, if any, check the Tls_sni_server_name status variable.

Server Name Indication (SNI) is an extension to the TLS protocol (OpenSSL must be compiled using TLS extensions for this option to function). The MySQL implementation of SNI represents the clientside only.
- --tls-version=protocol_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-version=protocol_list \\
\hline Type & String \\
\hline Default Value & \begin{tabular}{l}
TLSv1, TLSv1.1, TLSv1.2, TLSv1.3 (OpenSSL 1.1.1 or higher) \\
TLSv1, TLSv1.1, TLSv1.2 (otherwise)
\end{tabular} \\
\hline
\end{tabular}

The permissible TLS protocols for encrypted connections. The value is a list of one or more commaseparated protocol names. The protocols that can be named for this option depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- --user=user_name, - u user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --user=user_name \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

The user name of the MySQL account used for connecting to the running server that is currently using one of the key migration keystores.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Verbose mode. Produce more output about what the program does.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.

\subsection*{6.6.9 mysqlbinlog - Utility for Processing Binary Log Files}

The server's binary log consists of files containing "events" that describe modifications to database contents. The server writes these files in binary format. To display their contents in text format, use the mysqlbinlog utility. You can also use mysqlbinlog to display the contents of relay log files written by a replica server in a replication setup because relay logs have the same format as binary logs. The binary log and relay log are discussed further in Section 7.4.4, "The Binary Log", and Section 19.2.4, "Relay Log and Replication Metadata Repositories".

Invoke mysqlbinlog like this:
```
mysqlbinlog [options] log_file ...
```


For example, to display the contents of the binary log file named binlog.000003, use this command:
```
mysqlbinlog binlog.000003
```


The output includes events contained in binlog. 000003. For statement-based logging, event information includes the SQL statement, the ID of the server on which it was executed, the timestamp when the statement was executed, how much time it took, and so forth. For row-based logging, the event indicates a row change rather than an SQL statement. See Section 19.2.1, "Replication Formats", for information about logging modes.

Events are preceded by header comments that provide additional information. For example:
```
# at 141
#100309 9:28:36 server id 123 end_log_pos 245
    Query thread_id=3350 exec_time=11 error_code=0
```


In the first line, the number following at indicates the file offset, or starting position, of the event in the binary log file.

The second line starts with a date and time indicating when the statement started on the server where the event originated. For replication, this timestamp is propagated to replica servers. server id is the server_id value of the server where the event originated. end_log_pos indicates where the next event starts (that is, it is the end position of the current event +1 ). thread_id indicates which thread executed the event. exec_time is the time spent executing the event, on a replication source server. On a replica, it is the difference of the end execution time on the replica minus the beginning execution time on the source. The difference serves as an indicator of how much replication lags behind the source. error_code indicates the result from executing the event. Zero means that no error occurre63

\section*{Note}

When using event groups, the file offsets of events may be grouped together and the comments of events may be grouped together. Do not mistake these grouped events for blank file offsets.

The output from mysqlbinlog can be re-executed (for example, by using it as input to mysql) to redo the statements in the log. This is useful for recovery operations after an unexpected server exit. For other usage examples, see the discussion later in this section and in Section 9.5, "Point-in-Time (Incremental) Recovery". To execute the internal-use BINLOG statements used by mysqlbinlog, the user requires the BINLOG_ADMIN privilege (or the deprecated SUPER privilege), or the REPLICATION_APPLIER privilege plus the appropriate privileges to execute each log event.

You can use mysqlbinlog to read binary log files directly and apply them to the local MySQL server. You can also read binary logs from a remote server by using the --read-from-remote-server option. To read remote binary logs, the connection parameter options can be given to indicate how to connect to the server. These options are --host, --password, --port, --protocol, --socket, and --user.

When binary log files have been encrypted, mysqlbinlog cannot read them directly, but can read them from the server using the --read-from-remote-server option. Binary log files are encrypted when the server's binlog_encryption system variable is set to ON. The SHOW BINARY LOGS statement shows whether a particular binary log file is encrypted or unencrypted. Encrypted and unencrypted binary log files can also be distinguished using the magic number at the start of the file header for encrypted log files (0xFD62696E), which differs from that used for unencrypted log files (0xFE62696E). Note that mysqlbinlog returns a suitable error if you attempt to read an encrypted binary log file directly, but older versions of mysqlbinlog do not recognise the file as a binary log file at all. For more information on binary log encryption, see Section 19.3.2, "Encrypting Binary Log Files and Relay Log Files".

When binary log transaction payloads have been compressed, mysqlbinlog automatically decompresses and decodes the transaction payloads, and prints them as it would uncompressed events. When binlog_transaction_compression is set to 0 N , transaction payloads are compressed and then written to the server's binary log file as a single event (a Transaction_payload_event). With the --verbose option, mysqlbinlog adds comments stating the compression algorithm used, the compressed payload size that was originally received, and the resulting payload size after decompression.

\section*{Note}

The end position (end_log_pos) that mysqlbinlog states for an individual event that was part of a compressed transaction payload is the same as the end position of the original compressed payload. Multiple decompressed events can therefore have the same end position.
mysqlbinlog's own connection compression does less if transaction payloads are already compressed, but still operates on uncompressed transactions and headers.

For more information on binary log transaction compression, see Section 7.4.4.5, "Binary Log Transaction Compression".

When running mysqlbinlog against a large binary log, be careful that the filesystem has enough space for the resulting files. To configure the directory that mysqlbinlog uses for temporary files, use the TMPDIR environment variable.
mysqlbinlog sets the value of pseudo_replica_mode to true before executing any SQL statements. This system variable affects the handling of XA transactions, the original_commit_timestamp replication delay timestamp and the original_server_version system variable, and unsupported SQL modes.
mysqlbinlog supports the following options, which can be specified on the command line or in the [mysqlbinlog] and [client] groups of an option file. For information about option files used by MySQL programs, see Section 6.2.2.2, "Using Option Files".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.20 mysqlbinlog Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --base64-output & Print binary log entries using base-64 encoding \\
\hline --bind-address & Use specified network interface to connect to MySQL Server \\
\hline --binlog-row-event-max-size & Binary log max event size \\
\hline --character-sets-dir & Directory where character sets are installed \\
\hline --compress & Compress all information sent between client and server \\
\hline --compression-algorithms & Permitted compression algorithms for connections to server \\
\hline --connection-server-id & Used for testing and debugging. See text for applicable default values and other particulars \\
\hline --database & List entries for just this database \\
\hline --debug & Write debugging log \\
\hline --debug-check & Print debugging information when program exits \\
\hline --debug-info & Print debugging information, memory, and CPU statistics when program exits \\
\hline --default-auth & Authentication plugin to use \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --defaults-group-suffix & Option group suffix value \\
\hline --disable-log-bin & Disable binary logging \\
\hline --exclude-gtids & Do not show any of the groups in the GTID set provided \\
\hline --force-if-open & Read binary log files even if open or not closed properly \\
\hline --force-read & If mysqlbinlog reads a binary log event that it does not recognize, it prints a warning \\
\hline --get-server-public-key & Request RSA public key from server \\
\hline --help & Display help message and exit \\
\hline --hexdump & Display a hex dump of the log in comments \\
\hline --host & Host on which MySQL server is located \\
\hline --idempotent & Cause the server to use idempotent mode while processing binary log updates from this session only \\
\hline --include-gtids & Show only the groups in the GTID set provided \\
\hline --local-load & Prepare local temporary files for LOAD DATA in the specified directory \\
\hline --login-path & Read login path options from .mylogin.cnf \\
\hline --no-defaults & Read no option files \\
\hline --no-login-paths & Do not read login paths from the login path file \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --offset & Skip the first N entries in the log \\
\hline --password & Password to use when connecting to server \\
\hline --plugin-dir & Directory where plugins are installed \\
\hline --port & TCP/IP port number for connection \\
\hline --print-defaults & Print default options \\
\hline --print-table-metadata & Print table metadata \\
\hline --protocol & Transport protocol to use \\
\hline --raw & Write events in raw (binary) format to output files \\
\hline --read-from-remote-master & Read the binary log from a MySQL replication source server rather than reading a local log file \\
\hline --read-from-remote-server & Read binary log from MySQL server rather than local log file \\
\hline --read-from-remote-source & Read the binary log from a MySQL replication source server rather than reading a local log file \\
\hline --require-row-format & Require row-based binary logging format \\
\hline --result-file & Direct output to named file \\
\hline --rewrite-db & Create rewrite rules for databases when playing back from logs written in row-based format. Can be used multiple times \\
\hline --server-id & Extract only those events created by the server having the given server ID \\
\hline --server-id-bits & Tell mysqlbinlog how to interpret server IDs in binary log when log was written by a mysqld having its server-id-bits set to less than the maximum; supported only by MySQL Cluster version of mysqlbinlog \\
\hline --server-public-key-path & Path name to file containing RSA public key \\
\hline --set-charset & Add a SET NAMES charset_name statement to the output \\
\hline --shared-memory-base-name & Shared-memory name for shared-memory connections (Windows only) \\
\hline --short-form & Display only the statements contained in the log \\
\hline --skip-gtids & Do not include the GTIDs from the binary log files in the output dump file \\
\hline --socket & Unix socket file or Windows named pipe to use \\
\hline --ssl-ca & File that contains list of trusted SSL Certificate Authorities \\
\hline --ssl-capath & Directory that contains trusted SSL Certificate Authority certificate files \\
\hline --ssl-cert & File that contains X. 509 certificate \\
\hline --ssl-cipher & Permissible ciphers for connection encryption \\
\hline --ssl-crl & File that contains certificate revocation lists \\
\hline --ssl-crlpath & Directory that contains certificate revocation-list files \\
\hline --ssl-fips-mode & Whether to enable FIPS mode on client side \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --ssl-key & File that contains X. 509 key \\
\hline --ssl-mode & Desired security state of connection to server \\
\hline --ssl-session-data & File that contains SSL session data \\
\hline --ssl-session-data-continue-on-failed-reuse & Whether to establish connections if session reuse fails \\
\hline --start-datetime & Read binary log from first event with timestamp equal to or later than datetime argument \\
\hline --start-position & Decode binary log from first event with position equal to or greater than argument \\
\hline --stop-datetime & Stop reading binary log at first event with timestamp equal to or greater than datetime argument \\
\hline --stop-never & Stay connected to server after reading last binary log file \\
\hline --stop-never-slave-server-id & Slave server ID to report when connecting to server \\
\hline --stop-position & Stop decoding binary log at first event with position equal to or greater than argument \\
\hline --tls-ciphersuites & Permissible TLSv1.3 ciphersuites for encrypted connections \\
\hline --tls-sni-servername & Server name supplied by the client \\
\hline --tls-version & Permissible TLS protocols for encrypted connections \\
\hline --to-last-log & Do not stop at the end of requested binary log from a MySQL server, but rather continue printing to end of last binary log \\
\hline --user & MySQL user name to use when connecting to server \\
\hline --verbose & Reconstruct row events as SQL statements \\
\hline --verify-binlog-checksum & Verify checksums in binary log \\
\hline --version & Display version information and exit \\
\hline --zstd-compression-level & Compression level for connections to server that use zstd compression \\
\hline
\end{tabular}
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display a help message and exit.
- --base64-output=value

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --base64-output=value & \\
\hline Type & String & \\
\hline Default Value & AUT0 & \\
\hline Valid Values & AUTO & \\
\hline & NEVER & 567 \\
\hline
\end{tabular}

This option determines when events should be displayed encoded as base-64 strings using BINLOG statements. The option has these permissible values (not case-sensitive):
- AUTO ("automatic") or UNSPEC ("unspecified") displays BINLOG statements automatically when necessary (that is, for format description events and row events). If no --base64-output option is given, the effect is the same as --base64-output=AUT0.

\section*{Note}

Automatic BINLOG display is the only safe behavior if you intend to use the output of mysqlbinlog to re-execute binary log file contents. The other option values are intended only for debugging or testing purposes because they may produce output that does not include all events in executable form.
- NEVER causes BINLOG statements not to be displayed. mysqlbinlog exits with an error if a row event is found that must be displayed using BINLOG.
- DECODE-ROWS specifies to mysqlbinlog that you intend for row events to be decoded and displayed as commented SQL statements by also specifying the --verbose option. Like NEVER, DECODE-ROWS suppresses display of BINLOG statements, but unlike NEVER, it does not exit with an error if a row event is found.

For examples that show the effect of --base64-output and --verbose on row event output, see Section 6.6.9.2, "mysqlbinlog Row Event Display".
- --bind-address=ip_address

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - bind - address=ip_address \\
\hline
\end{tabular}

On a computer having multiple network interfaces, use this option to select which interface to use for connecting to the MySQL server.
- --binlog-row-event-max-size=N

\begin{tabular}{|l|l|}
\hline Command-Line Format & --binlog-row-event-max-size=\# \\
\hline Type & Numeric \\
\hline Default Value & 4294967040 \\
\hline Minimum Value & 256 \\
\hline Maximum Value & 18446744073709547520 \\
\hline
\end{tabular}

Specify the maximum size of a row-based binary log event, in bytes. Rows are grouped into events smaller than this size if possible. The value should be a multiple of 256 . The default is 4 GB .
- --character-sets-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -character-sets-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory where character sets are installed. See Section 12.15, "Character Set Configuration".
- --compress

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -compress $[=\{$ OFF $\mid$ ON $\}]$ \\
\hline Deprecated & Yes \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Compress all information sent between the client and the server if possible. See Section 6.2.8, "Connection Compression Control".

This option is deprecated. Expect it to be removed in a future version of MySQL. See Configuring Legacy Connection Compression.
- --compression-algorithms=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --compression-algorithms=value \\
\hline Type & Set \\
\hline Default Value & uncompressed \\
\hline Valid Values & \begin{tabular}{l}
zlib \\
zstd \\
uncompressed
\end{tabular} \\
\hline
\end{tabular}

The permitted compression algorithms for connections to the server. The available algorithms are the same as for the protocol_compression_algorithms system variable. The default value is uncompressed.

For more information, see Section 6.2.8, "Connection Compression Control".
- --connection-server-id=server_id

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connection-server-id=\#] \\
\hline Type & Integer \\
\hline Default Value & 0 (1) \\
\hline Minimum Value & 0 (1) \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}
--connection-server-id specifies the server ID that mysqlbinlog reports when it connects to the server. It can be used to avoid a conflict with the ID of a replica server or another mysqlbinlog process.

If the--read-from-remote-server option is specified, mysqlbinlog reports a server ID of 0 , which tells the server to disconnect after sending the last log file (nonblocking behavior). If the - -stop-never option is also specified to maintain the connection to the server, mysqlbinlog reports a server ID of 1 by default instead of 0 , and --connection-server-id can be used to replace that server ID if required. See Section 6.6.9.4, "Specifying the mysqlbinlog Server ID".
- --database=db_name, -d db_name

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

This option causes mysqlbinlog to output entries from the binary log (local log only) that occur while $d b \_$name is been selected as the default database by USE.

The --database option for mysqlbinlog is similar to the --binlog-do-db option for mysqld, but can be used to specify only one database. If - - database is given multiple times, only the last instance is used.

The effects of this option depend on whether the statement-based or row-based logging format is in use, in the same way that the effects of --binlog-do-db depend on whether statement-based or row-based logging is in use.

Statement-based logging. The --database option works as follows:
- While $d b \_n a m e$ is the default database, statements are output whether they modify tables in db_name or a different database.
- Unless db_name is selected as the default database, statements are not output, even if they modify tables in db_name.
- There is an exception for CREATE DATABASE, ALTER DATABASE, and DROP DATABASE. The database being created, altered, or dropped is considered to be the default database when determining whether to output the statement.

Suppose that the binary log was created by executing these statements using statement-basedlogging:
```
INSERT INTO test.t1 (i) VALUES(100);
INSERT INTO db2.t2 (j) VALUES(200);
USE test;
INSERT INTO test.t1 (i) VALUES(101);
INSERT INTO t1 (i) VALUES(102);
INSERT INTO db2.t2 (j) VALUES(201);
USE db2;
INSERT INTO test.t1 (i) VALUES(103);
INSERT INTO db2.t2 (j) VALUES(202);
INSERT INTO t2 (j) VALUES(203);
```

mysqlbinlog --database=test does not output the first two INSERT statements because there is no default database. It outputs the three INSERT statements following USE test, but not the three INSERT statements following USE db 2 .
mysqlbinlog --database=db2 does not output the first two INSERT statements because there is no default database. It does not output the three INSERT statements following USE test, but does output the three INSERT statements following USE db 2 .

Row-based logging. mysqlbinlog outputs only entries that change tables belonging to db_name. The default database has no effect on this. Suppose that the binary log just described was created using row-based logging rather than statement-based logging. mysqlbinlog -database=test outputs only those entries that modify t1 in the test database, regardless of whether USE was issued or what the default database is.

If a server is running with binlog_format set to MIXED and you want it to be possible to use mysqlbinlog with the --database option, you must ensure that tables that are modified are in the database selected by USE. (In particular, no cross-database updates should be used.)

When used together with the --rewrite-db option, the --rewrite-db option is applied first; then the --database option is applied, using the rewritten database name. The order in which the options are provided makes no difference in this regard.
- --debug[=debug_options], -\# [debug_options]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --debug[=debug_options] \\
\hline Type & String \\
\hline Default Value & d:t:o,/tmp/mysqlbinlog.trace \\
\hline
\end{tabular}

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: \mathrm{o}$, file_name. The default is d:t:o,/tmp/mysqlbinlog.trace.

This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --debug-check

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug-check \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Print some debugging information when the program exits.
This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --debug-info

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug-info \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Print debugging information and memory and CPU usage statistics when the program exits.
This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --default-auth=plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - default - auth=plugin \\
\hline Type & String \\
\hline
\end{tabular}

A hint about which client-side authentication plugin to use. See Section 8.2.17, "Pluggable Authentication".
- --defaults-extra-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=file_name \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & File name \\
\hline
\end{tabular}

Read this option file after the global option file but (on Unix) before the user option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Use only the given option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

Exception: Even with --defaults-file, client programs read .mylogin.cnf.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-group-suffix=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - defaults - group - suffix=str \\
\hline Type & String \\
\hline
\end{tabular}

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, mysqlbinlog normally reads the [client] and [mysqlbinlog] groups. If this option is given as --defaults-group-suffix=_other, mysqlbinlog also reads the [client_other] and [mysqlbinlog_other] groups.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --disable-log-bin, -D

\begin{tabular}{|l|l|}
\hline Command-Line Format & --disable-log-bin \\
\hline
\end{tabular}

Disable binary logging. This is useful for avoiding an endless loop if you use the --to-lastlog option and are sending the output to the same MySQL server. This option also is useful when restoring after an unexpected exit to avoid duplication of the statements you have logged.

This option causes mysqlbinlog to include a SET sql_log_bin = 0 statement in its output to disable binary logging of the remaining output. Manipulating the session value of the sql_log_bin system variable is a restricted operation, so this option requires that you have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- --exclude-gtids=gtid_set

\begin{tabular}{|l|l|}
\hline Command-Line Format & --exclude-gtids=gtid_set \\
\hline Type & String \\
\hline
\end{tabular}

Default Value

Do not display any of the groups listed in the gtid_set.
- --force-if-open, -F

\begin{tabular}{|l|l|}
\hline Command-Line Format & --force-if-open \\
\hline
\end{tabular}

Read binary log files even if they are open or were not closed properly (IN_USE flag is set); do not fail if the file ends with a truncated event.

The IN_USE flag is set only for the binary log that is currently written by the server; if the server has crashed, the flag remains set until the server is started up again and recovers the binary log. Without this option, mysqlbinlog refuses to process a file with this flag set. Since the server may be in the process of writing the file, truncation of the last event is considered normal.
- --force-read, -f

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - force-read \\
\hline
\end{tabular}

With this option, if mysqlbinlog reads a binary log event that it does not recognize, it prints a warning, ignores the event, and continues. Without this option, mysqlbinlog stops if it reads such an event.
- --get-server-public-key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --get-server-public-key \\
\hline Type & Boolean \\
\hline
\end{tabular}

Request from the server the public key required for RSA key pair-based password exchange. This option applies to clients that authenticate with the caching_sha2_password authentication plugin. For that plugin, the server does not send the public key unless requested. This option is ignored for accounts that do not authenticate with that plugin. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If --server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

For information about the caching_sha2_password plugin, see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- - - hexdump, -H

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - hexdump \\
\hline
\end{tabular}

Display a hex dump of the log in comments, as described in Section 6.6.9.1, "mysqlbinlog Hex Dump Format". The hex output can be helpful for replication debugging.
- --host=host_name, -h host_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - host=host_name \\
\hline Type & String \\
\hline Default Value & localhost \\
\hline
\end{tabular}

Get the binary log from the MySQL server on the given host.
- --idempotent

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- idempotent \\
\hline Type & Boolean \\
\hline Default Value & true \\
\hline
\end{tabular}

Tell the MySQL Server to use idempotent mode while processing updates; this causes suppression of any duplicate-key or key-not-found errors that the server encounters in the current session while processing updates. This option may prove useful whenever it is desirable or necessary to replay one or more binary logs to a MySQL Server which may not contain all of the data to which the logs refer.

The scope of effect for this option includes the current mysqlbinlog client and session only.
- --include-gtids=gtid_set

\begin{tabular}{|l|l|}
\hline Command-Line Format & --include-gtids=gtid_set \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

Display only the groups listed in the gtid_set.
- --local-load=dir_name, -l dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- local - load=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

For data loading operations corresponding to LOAD DATA statements, mysqlbinlog extracts the files from the binary log events, writes them as temporary files to the local file system, and writes LOAD DATA LOCAL statements to cause the files to be loaded. By default, mysqlbinlog writes these temporary files to an operating system-specific directory. The --local-load option can be used to explicitly specify the directory where mysqlbinlog should prepare local temporary files.

Because other processes can write files to the default system-specific directory, it is advisable to specify the --local-load option to mysqlbinlog to designate a different directory for data files, and then designate that same directory by specifying the--load-data-local-dir option to mysql when processing the output from mysqlbinlog. For example:
```
mysqlbinlog --local-load=/my/local/data ...
    | mysql --load-data-local-dir=/my/local/data ...
```


\section*{Important}

These temporary files are not automatically removed by mysqlbinlog or any other MySQL program.
- --login-path=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --login-path=name \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

Read options from the named login path in the .mylogin. cnf login path file. A "login path" is an option group containing options that specify which MySQL server to connect to and which account to authenticate as. To create or modify a login path file, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
See--login-path for related information.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-defaults \\
\hline
\end{tabular}

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read.

The exception is that the .mylogin. cnf file is read in all cases, if it exists. This permits passwords to be specified in a safer way than on the command line even when --no-defaults is used. To create. mylogin.cnf, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --offset $=N$, -o N

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- offset $=\#$ \\
\hline Type & Numeric \\
\hline
\end{tabular}

Skip the first $N$ entries in the log.
- --open-files-limit=N

\begin{tabular}{|l|l|}
\hline Command-Line Format & --open-files-limit=\# \\
\hline Type & Numeric \\
\hline Default Value & 8 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & [platform dependent] \\
\hline
\end{tabular}

Specify the number of open file descriptors to reserve.
- --password[=password], -p[password]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password [=password] \\
\hline Type & String \\
\hline
\end{tabular}

The password of the MySQL account used for connecting to the server. The password value is optional. If not given, mysqlbinlog prompts for one. If given, there must be no space between -password= or - p and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqlbinlog should not prompt for one, use the --skip-password option.
- --plugin-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- plugin-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory in which to look for plugins. Specify this option if the --default-auth option is used to specify an authentication plugin but mysqlbinlog does not find it. See Section 8.2.17, "Pluggable Authentication".
- --port=port_num, -P port_num

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- port=port_num \\
\hline Type & Numeric \\
\hline Default Value & 3306 \\
\hline
\end{tabular}

The TCP/IP port number to use for connecting to a remote server.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- print-defaults \\
\hline
\end{tabular}

Print the program name and all options that it gets from option files.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --print-table-metadata

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-table-metadata \\
\hline
\end{tabular}

Print table related metadata from the binary log. Configure the amount of table related metadata binary logged using binlog-row-metadata.
- --protocol=\{TCP|SOCKET|PIPE|MEMORY\}

\begin{tabular}{|l|l|}
\hline Default Value & [see text] \\
\hline Valid Values & TCP \\
\hline & SOCKET \\
\hline
\end{tabular}

The transport protocol to use for connecting to the server. It is useful when the other connection parameters normally result in use of a protocol other than the one you want. For details on the permissible values, see Section 6.2.7, "Connection Transport Protocols".
- --raw

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - raw \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

By default, mysqlbinlog reads binary log files and writes events in text format. The --raw option tells mysqlbinlog to write them in their original binary format. Its use requires that --read-from-remote-server also be used because the files are requested from a server. mysqlbinlog writes one output file for each file read from the server. The --raw option can be used to make a backup of a server's binary log. With the --stop-never option, the backup is "live" because mysqlbinlog stays connected to the server. By default, output files are written in the current directory with the same names as the original log files. Output file names can be modified using the --result-file option. For more information, see Section 6.6.9.3, "Using mysqlbinlog to Back Up Binary Log Files".
- --read-from-remote-source=type

\begin{tabular}{|l|l|}
\hline Command-Line Format & --read-from-remote-source=type \\
\hline
\end{tabular}

This option reads binary logs from a MySQL server with the COM_BINLOG_DUMP or COM_BINLOG_DUMP_GTID commands by setting the option value to either BINLOG-DUMP-NONGTIDS or BINLOG-DUMP-GTIDS, respectively. If - - read-from - remote-source=BINLOG-DUMP-GTIDS is combined with--exclude-gtids, transactions can be filtered out on the source, avoiding unnecessary network traffic.

The connection parameter options are used with these options or the --read-from-remoteserver option. These options are --host, --password, --port, --protocol, --socket, and --user. If none of the remote options is specified, the connection parameter options are ignored.

The REPLICATION SLAVE privilege is required to use these options.
- --read-from-remote-master=type

\begin{tabular}{|l|l|}
\hline Command-Line Format & --read-from-remote-master=type \\
\hline Deprecated & Yes \\
\hline
\end{tabular}

Deprecated synonym for--read-from-remote-source.
- --read-from-remote-server=file_name, -R

Command-Line Format
--read-from-remote-server=file_name

Read the binary log from a MySQL server rather than reading a local log file. This option requires that the remote server be running. It works only for binary log files on the remote server and not relay log files. This accepts the binary log file name (including the numeric suffix) without the file path.

The connection parameter options are used with this option or the --read-from-remote-source option. These options are --host, --password, --port, --protocol, --socket, and --user. If neither of the remote options is specified, the connection parameter options are ignored.

The REPLICATION SLAVE privilege is required to use this option.
This option is like--read-from-remote-source=BINLOG-DUMP-NON-GTIDS.
- --result-file=name, -r name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --result-file=name \\
\hline
\end{tabular}

Without the --raw option, this option indicates the file to which mysqlbinlog writes text output. With - - raw, mysqlbinlog writes one binary output file for each log file transferred from the server, writing them by default in the current directory using the same names as the original log file. In this case, the --result-file option value is treated as a prefix that modifies output file names.
- --require-row-format

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - require - row - format \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Require row-based binary logging format for events. This option enforces row-based replication events for mysqlbinlog output. The stream of events produced with this option would be accepted by a replication channel that is secured using the REQUIRE_ROW_FORMAT option of the CHANGE REPLICATION SOURCE TO statement. binlog_format=ROW must be set on the server where the binary log was written. When you specify this option, mysqlbinlog stops with an error message if it encounters any events that are disallowed under the REQUIRE_ROW_FORMAT restrictions, including LOAD DATA INFILE instructions, creating or dropping temporary tables, INTVAR, RAND, or USER_VAR events, and non-row-based events within a DML transaction. mysqlbinlog also prints a SET @@session.require_row_format statement at the start of its output to apply the restrictions when the output is executed, and does not print the SET @@session.pseudo_thread_id statement.
- --rewrite-db='from_name->to_name'

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- rewrite-db='oldname->newname' \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & [none]
\end{tabular}

When reading from a row-based or statement-based log, rewrite all occurrences of from_name to to_name. Rewriting is done on the rows, for row-based logs, as well as on the USE clauses, for statement-based logs.

\section*{Warning}

Statements in which table names are qualified with database names are not rewritten to use the new name when using this option.

The rewrite rule employed as a value for this option is a string having the form ' from_name>to_name ' , as shown previously, and for this reason must be enclosed by quotation marks.

To employ multiple rewrite rules, specify the option multiple times, as shown here:
```
mysqlbinlog --rewrite-db='dbcurrent->dbold' --rewrite-db='dbtest->dbcurrent' \
    binlog.00001 > /tmp/statements.sql
```


When used together with the --database option, the --rewrite-db option is applied first; then --database option is applied, using the rewritten database name. The order in which the options are provided makes no difference in this regard.

This means that, for example, if mysqlbinlog is started with --rewrite-db='mydb->yourdb' --database=yourdb, then all updates to any tables in databases mydb and yourdb are included in the output. On the other hand, if it is started with --rewrite-db='mydb->yourdb ' - database=mydb, then mysqlbinlog outputs no statements at all: since all updates to mydb are first rewritten as updates to yourdb before applying the --database option, there remain no updates that match --database=mydb.
- --server-id=id

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- server - id=id \\
\hline Type & Numeric \\
\hline
\end{tabular}

Display only those events created by the server having the given server ID.
- --server-id-bits=N

\begin{tabular}{|l|l|}
\hline Command-Line Format & --server-id-bits=\# \\
\hline Type & Numeric \\
\hline Default Value & 32 \\
\hline Minimum Value & 7 \\
\hline Maximum Value & 32 \\
\hline
\end{tabular}

Use only the first $N$ bits of the server_id to identify the server. If the binary log was written by a mysqld with server-id-bits set to less than 32 and user data stored in the most significant bit, running mysqlbinlog with --server-id-bits set to 32 enables this data to be seen.

This option is supported only by the version of mysqlbinlog supplied with the NDB Cluster distribution, or built with NDB Cluster support.

\begin{tabular}{|l|l|} 
Type & File name \\
\hline
\end{tabular}

The path name to a file in PEM format containing a client-side copy of the public key required by the server for RSA key pair-based password exchange. This option applies to clients that authenticate with the sha256_password (deprecated) or caching_sha2_password authentication plugin. This option is ignored for accounts that do not authenticate with one of those plugins. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If--server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

For sha256_password (deprecated), this option applies only if MySQL was built using OpenSSL.
For information about the sha256_password and caching_sha2_password plugins, see Section 8.4.1.3, "SHA-256 Pluggable Authentication", and Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- --set-charset=charset_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --set-charset=charset_name \\
\hline Type & String \\
\hline
\end{tabular}

Add a SET NAMES charset_name statement to the output to specify the character set to be used for processing log files.
- --shared-memory-base-name=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - shared - memory - base - name=name \\
\hline Platform Specific & Windows \\
\hline
\end{tabular}

On Windows, the shared-memory name to use for connections made using shared memory to a local server. The default value is MYSQL. The shared-memory name is case-sensitive.

This option applies only if the server was started with the shared_memory system variable enabled to support shared-memory connections.
- --short-form, -s

\begin{tabular}{|l|l|}
\hline Command-Line Format & --short-form \\
\hline
\end{tabular}

Display only the statements contained in the log, without any extra information or row-based events. This is for testing only, and should not be used in production systems. It is deprecated, and you should expect it to be removed in a future release.
- --skip-gtids[=(true|false)]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-gtids[=true|false] \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Do not include the GTIDs from the binary log files in the output dump file. For example:
```
mysqlbinlog --skip-gtids binlog.000001 > /tmp/dump.sql
```

```
mysql -u root -p -e "source /tmp/dump.sql"
```


You should not normally use this option in production or in recovery, except in the specific, and rare, scenarios where the GTIDs are actively unwanted. For example, an administrator might want to duplicate selected transactions (such as table definitions) from a deployment to another, unrelated, deployment that will not replicate to or from the original. In that scenario, --skip-gtids can be used to enable the administrator to apply the transactions as if they were new, and ensure that the deployments remain unrelated. However, you should only use this option if the inclusion of the GTIDs causes a known issue for your use case.
- --socket=path, -S path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --socket=\{file_name|pipe_name $\}$ \\
\hline Type & String \\
\hline
\end{tabular}

For connections to localhost, the Unix socket file to use, or, on Windows, the name of the named pipe to use.

On Windows, this option applies only if the server was started with the named_pipe system variable enabled to support named-pipe connections. In addition, the user making the connection must be a member of the Windows group specified by the named_pipe_full_access_group system variable.
- --ssl*

Options that begin with --ssl specify whether to connect to the server using encryption and indicate where to find SSL keys and certificates. See Command Options for Encrypted Connections.
- --ssl-fips-mode=\{OFF|ON|STRICT\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-fips-mode=\{OFF|ON|STRICT\} \\
\hline Deprecated & Yes \\
\hline Type & Enumeration \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
ON \\
STRICT
\end{tabular} \\
\hline
\end{tabular}

Controls whether to enable FIPS mode on the client side. The --ssl-fips-mode option differs from other - $-\mathrm{ssl}-x x x$ options in that it is not used to establish encrypted connections, but rather to affect which cryptographic operations to permit. See Section 8.8, "FIPS Support".

These--ssl-fips-mode values are permitted:
- OFF: Disable FIPS mode.
- ON: Enable FIPS mode.
- STRICT: Enable "strict" FIPS mode.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0611.jpg?height=181&width=268&top_left_y=2654&top_left_x=402)

\section*{Note}

If the OpenSSL FIPS Object Module is not available, the only permitted value
or STRICT causes the client to produce a warning at startup and to operate in non-FIPS mode.

This option is deprecated. Expect it to be removed in a future version of MySQL.
- --start-datetime=datetime

\begin{tabular}{|l|l|}
\hline Command-Line Format & --start- datetime $=$ datetime \\
\hline Type & Datetime \\
\hline
\end{tabular}

Start reading the binary log at the first event having a timestamp equal to or later than the datetime argument. The datetime value is relative to the local time zone on the machine where you run mysqlbinlog. The value should be in a format accepted for the DATETIME or TIMESTAMP data types. For example:
mysqlbinlog --start-datetime="2005-12-25 11:25:56" binlog.000003
This option is useful for point-in-time recovery. See Section 9.5, "Point-in-Time (Incremental) Recovery".
- --start-position=N, -j N

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -start-position=\# \\
\hline Type & Numeric \\
\hline
\end{tabular}

Start decoding the binary log at the log position $N$, including in the output any events that begin at position $N$ or after. The position is a byte point in the log file, not an event counter; it needs to point to the starting position of an event to generate useful output. This option applies to the first log file named on the command line.

The maximum value supported for this option is $18446744073709551616\left(2^{64}-1\right)$, unless - - read -from-remote-server or--read-from-remote-source is also used, in which case the maximum is 4294967295.

This option is useful for point-in-time recovery. See Section 9.5, "Point-in-Time (Incremental) Recovery".
- --stop-datetime=datetime

\begin{tabular}{|l|l|}
\hline Command-Line Format & --stop-datetime=datetime \\
\hline
\end{tabular}

Stop reading the binary log at the first event having a timestamp equal to or later than the datetime argument. See the description of the --start-datetime option for information about the datetime value.

This option is useful for point-in-time recovery. See Section 9.5, "Point-in-Time (Incremental) Recovery".
- --stop-never

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Command-Line Format & - - stop-never \\
\hline 582 & Type & Boolean \\
\cline { 2 - 3 } & &
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & FALSE \\
\hline
\end{tabular}

This option is used with --read-from-remote-server. It tells mysqlbinlog to remain connected to the server. Otherwise mysqlbinlog exits when the last log file has been transferred from the server. --stop-never implies --to-last-log, so only the first log file to transfer need be named on the command line.
--stop-never is commonly used with - - raw to make a live binary log backup, but also can be used without - - raw to maintain a continuous text display of log events as the server generates them.

With --stop-never, by default, mysqlbinlog reports a server ID of 1 when it connects to the server. Use --connection-server-id to explicitly specify an alternative ID to report. It can be used to avoid a conflict with the ID of a replica server or another mysqlbinlog process. See Section 6.6.9.4, "Specifying the mysqlbinlog Server ID".
- --stop-never-slave-server-id=id

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - stop- never- slave- server- id=\# \\
\hline Type & Numeric \\
\hline Default Value & 65535 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

This option is deprecated; expect it to be removed in a future release. Use the --connection-server-id option instead to specify a server ID for mysqlbinlog to report.
- --stop-position=N

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- stop-position=\# \\
\hline Type & Numeric \\
\hline
\end{tabular}

Stop decoding the binary log at the log position $N$, excluding from the output any events that begin at position $N$ or after. The position is a byte point in the log file, not an event counter; it needs to point to a spot after the starting position of the last event you want to include in the output. The event starting before position $N$ and finishing at or after the position is the last event to be processed. This option applies to the last log file named on the command line.

This option is useful for point-in-time recovery. See Section 9.5, "Point-in-Time (Incremental) Recovery".
- --tls-ciphersuites=ciphersuite_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-ciphersuites=ciphersuite_list \\
\hline Type & String \\
\hline
\end{tabular}

The permissible ciphersuites for encrypted connections that use TLSv1.3. The value is a list of one or more colon-separated ciphersuite names. The ciphersuites that can be named for this option depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

When specified, the name is passed to the libmysqlclient C API library using the MYSQL_OPT_TLS_SNI_SERVERNAME option of mysql_options(). The server name is not casesensitive. To show which server name the client specified for the current session, if any, check the Tls_sni_server_name status variable.

Server Name Indication (SNI) is an extension to the TLS protocol (OpenSSL must be compiled using TLS extensions for this option to function). The MySQL implementation of SNI represents the clientside only.
- --tls-version=protocol_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-version=protocol_list \\
\hline Type & String \\
\hline Default Value & \begin{tabular}{l}
TLSv1, TLSv1.1, TLSv1.2, TLSv1.3 (OpenSSL 1.1.1 or higher) \\
TLSv1, TLSv1.1, TLSv1.2 (otherwise)
\end{tabular} \\
\hline
\end{tabular}

The permissible TLS protocols for encrypted connections. The value is a list of one or more commaseparated protocol names. The protocols that can be named for this option depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- --to-last-log, -t

\begin{tabular}{|l|l|}
\hline Command-Line Format & --to-last-log \\
\hline
\end{tabular}

Do not stop at the end of the requested binary log from a MySQL server, but rather continue printing until the end of the last binary log. If you send the output to the same MySQL server, this may lead to an endless loop. This option requires--read-from-remote-server.
- --user=user_name, - u user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - user=user_name, \\
\hline Type & String \\
\hline
\end{tabular}

The user name of the MySQL account to use when connecting to a remote server.
If you are using the Rewriter plugin, you should grant this user the SKIP_QUERY_REWRITE privilege.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}
verbose"), the output includes comments to indicate column data types and some metadata, and
informational log events such as row query log events if the binlog_rows_query_log_events system variable is set to TRUE.

For examples that show the effect of --base64-output and --verbose on row event output, see Section 6.6.9.2, "mysqlbinlog Row Event Display".
- --verify-binlog-checksum, -c

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verify-binlog-checksum \\
\hline
\end{tabular}

Verify checksums in binary log files.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
- --zstd-compression-level=level

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- zstd-compression-level=\# \\
\hline Type & Integer \\
\hline
\end{tabular}

The compression level to use for connections to the server that use the zstd compression algorithm. The permitted levels are from 1 to 22, with larger values indicating increasing levels of compression. The default zstd compression level is 3 . The compression level setting has no effect on connections that do not use zstd compression.

For more information, see Section 6.2.8, "Connection Compression Control".
You can pipe the output of mysqlbinlog into the mysql client to execute the events contained in the binary log. This technique is used to recover from an unexpected exit when you have an old backup (see Section 9.5, "Point-in-Time (Incremental) Recovery"). For example:
```
mysqlbinlog binlog.000001 | mysql -u root -p
```


Or:
```
mysqlbinlog binlog.[0-9]* | mysql -u root -p
```


If the statements produced by mysqlbinlog may contain BLOB values, these may cause problems when mysql processes them. In this case, invoke mysql with the --binary-mode option.

You can also redirect the output of mysqlbinlog to a text file instead, if you need to modify the statement log first (for example, to remove statements that you do not want to execute for some reason). After editing the file, execute the statements that it contains by using it as input to the mysql program:
```
mysqlbinlog binlog.000001 > tmpfile
... edit tmpfile ...
mysql -u root -p < tmpfile
```


When mysqlbinlog is invoked with the --start-position option, it displays only those events with an offset in the binary log greater than or equal to a given position (the given position must matg ${ }_{85}$ the start of one event). It also has options to stop and start when it sees an event with a given date and time. This enables you to perform point-in-time recovery using the --stop-datetime option (to be able to say, for example, "roll forward my databases to how they were today at 10:30 a.m.").

Processing multiple files. If you have more than one binary log to execute on the MySQL server, the safe method is to process them all using a single connection to the server. Here is an example that demonstrates what may be unsafe:
```
mysqlbinlog binlog.000001 | mysql -u root -p # DANGER!!
mysqlbinlog binlog.000002 | mysql -u root -p # DANGER!!
```


Processing binary logs this way using multiple connections to the server causes problems if the first log file contains a CREATE TEMPORARY TABLE statement and the second log contains a statement that uses the temporary table. When the first mysql process terminates, the server drops the temporary table. When the second mysql process attempts to use the table, the server reports "unknown table."

To avoid problems like this, use a single mysql process to execute the contents of all binary logs that you want to process. Here is one way to do so:
```
mysqlbinlog binlog.000001 binlog.000002 | mysql -u root -p
```


Another approach is to write all the logs to a single file and then process the file:
```
mysqlbinlog binlog.000001 > /tmp/statements.sql
mysqlbinlog binlog.000002 >> /tmp/statements.sql
mysql -u root -p -e "source /tmp/statements.sql"
```


You can also supply multiple binary log files to mysqlbinlog as streamed input using a shell pipe. An archive of compressed binary log files can be decompressed and provided directly to mysqlbinlog. In this example, binlog-files_1.gz contains multiple binary log files for processing. The pipeline extracts the contents of binlog-files_1.gz, pipes the binary log files to mysqlbinlog as standard input, and pipes the output of mysqlbinlog into the mysql client for execution:
```
gzip -cd binlog-files_1.gz | ./mysqlbinlog - | ./mysql -uroot -p
```


You can specify more than one archive file, for example:
```
gzip -cd binlog-files_1.gz binlog-files_2.gz | ./mysqlbinlog - | ./mysql -uroot -p
```


For streamed input, do not use --stop-position, because mysqlbinlog cannot identify the last log file to apply this option.

LOAD DATA operations. mysqlbinlog can produce output that reproduces a LOAD DATA operation without the original data file. mysqlbinlog copies the data to a temporary file and writes a LOAD DATA LOCAL statement that refers to the file. The default location of the directory where these files are written is system-specific. To specify a directory explicitly, use the --local-load option.

Because mysqlbinlog converts LOAD DATA statements to LOAD DATA LOCAL statements (that is, it adds LOCAL), both the client and the server that you use to process the statements must be configured with the LOCAL capability enabled. See Section 8.1.6, "Security Considerations for LOAD DATA LOCAL".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0616.jpg?height=122&width=108&top_left_y=2051&top_left_x=301)

\section*{Warning}

The temporary files created for LOAD DATA LOCAL statements are not automatically deleted because they are needed until you actually execute those statements. You should delete the temporary files yourself after you no longer need the statement log. The files can be found in the temporary file directory and have names like original_file_name-\#-\#.

\subsection*{6.6.9.1 mysqlbinlog Hex Dump Format}

The --hexdump option causes mysqlbinlog to produce a hex dump of the binary log contents:
mysqlbinlog --hexdump source-bin. 000001
The hex output consists of comment lines beginning with \#, so the output might look like this for the preceding command:
```
/*!40019 SET @@SESSION.max_insert_delayed_threads=0*/;
/*!50003 SET @OLD_COMPLETION_TYPE=@@COMPLETION_TYPE,COMPLETION_TYPE=0*/;
# at 4
#051024 17:24:13 server id 1 end_log_pos 98
# Position Timestamp Type Master ID Size Master Pos Flags
# 00000004 9d fc 5c 43 0f 01 00 00 00 5e 00 00 00 62 00 00 00 00 00
# 00000017 04 00 35 2e 30 2e 31 35 2d 64 65 62 75 67 2d 6c |..5.0.15.debug.l|
# 00000027 6f 67 00 00 00 00 00 00 00 00 00 00 00 00 00 00 |og............l
# 00000037 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 |..............l
# 00000047 00 00 00 00 9d fc 5c 43 13 38 0d 00 08 00 12 00 |.......C.8......।
# 00000057 04 04 04 04 12 00 00 4b 00 04 1a |.......K...|
# Start: binlog v 4, server v 5.0.15-debug-log created 051024 17:24:13
# at startup
ROLLBACK;
```


Hex dump output currently contains the elements in the following list. This format is subject to change. For more information about binary log format, see MySQL Internals: The Binary Log.
- Position: The byte position within the log file.
- Timestamp: The event timestamp. In the example shown, '9d fc 5c 43' is the representation of ${ }^{\prime} 051024$ 17:24:13' in hexadecimal.
- Type: The event type code.
- Master ID: The server ID of the replication source server that created the event.
- Size: The size in bytes of the event.
- Master Pos: The position of the next event in the original source's binary log file.
- Flags: Event flag values.

\subsection*{6.6.9.2 mysqlbinlog Row Event Display}

The following examples illustrate how mysqlbinlog displays row events that specify data modifications. These correspond to events with the WRITE_ROWS_EVENT, UPDATE_ROWS_EVENT, and DELETE_ROWS_EVENT type codes. The --base64-output=DECODE-ROWS and --verbose options may be used to affect row event output.

Suppose that the server is using row-based binary logging and that you execute the following sequence of statements:
```
CREATE TABLE t
(
    id INT NOT NULL,
    name VARCHAR(20) NOT NULL,
    date DATE NULL
) ENGINE = InnoDB;
START TRANSACTION;
INSERT INTO t VALUES(1, 'apple', NULL);
UPDATE t SET name = 'pear', date = '2009-01-01' WHERE id = 1;
DELETE FROM t WHERE id = 1;
COMMIT;
```


By default, mysqlbinlog displays row events encoded as base-64 strings using BINLOG statements. Omitting extraneous lines, the output for the row events produced by the preceding statement sequence looks like this:
```
$> mysqlbinlog log_file
...
# at 218
#080828 15:03:08 server id 1 end_log_pos 258 Write_rows: table id 17 flags: STMT_END_F
BINLOG '
```

```
fAS3SBMBAAAALAAAANoAAAAAABEAAAAAAAAABHRIc3QAAXQAAwMPCgIUAAQ=
fAS3SBcBAAAAKAAAAAIBAAAQABEAAAAAAAEAA//8AQAAAAVhcHBsZQ==
'/*!*/;
...
# at 302
#080828 15:03:08 server id 1 end_log_pos 356 Update_rows: table id 17 flags: STMT_END_F
BINLOG '
fAS3SBMBAAAALAAAAC4BAAAAABEAAAAAAAAABHRlc3QAAXQAAwMPCgIUAAQ=
fAS3SBgBAAAANgAAAGQBAAAQABEAAAAAAAEAA////AEAAAAFYXBwbGX4AQAAAARwZWFyIbIP
'/*!*/;
...
# at 400
#080828 15:03:08 server id 1 end_log_pos 442 Delete_rows: table id 17 flags: STMT_END_F
BINLOG '
fAS3SBMBAAAALAAAAJABAAAAABEAAAAAAAAABHRIc3QAAXQAAwMPCgIUAAQ=
fAS3SBkBAAAAKgAAALoBAAAQABEAAAAAAAEAA//4AQAAAARwZWFyIbIP
'/*!*/;
```


To see the row events as comments in the form of "pseudo-SQL" statements, run mysqlbinlog with the - -verbose or - v option. This output level also shows table partition information where applicable. The output contains lines beginning with \#\#\#:
```
$> mysqlbinlog -v log_file
...
# at 218
#080828 15:03:08 server id 1 end_log_pos 258 Write_rows: table id 17 flags: STMT_END_F
BINLOG '
fAS3SBMBAAAALAAAANOAAAAAABEAAAAAAAAABHRlc3QAAXQAAwMPCgIUAAQ=
fAS3SBcBAAAAKAAAAAIBAAAQABEAAAAAAAEAA//8AQAAAAVhcHBsZQ==
'/*!*/;
### INSERT INTO test.t
### SET
### @1=1
### @2='apple'
### @3=NULL
...
# at 302
#080828 15:03:08 server id 1 end_log_pos 356 Update_rows: table id 17 flags: STMT_END_F
BINLOG '
fAS3SBMBAAAALAAAAC4BAAAAABEAAAAAAAAABHRlc3QAAXQAAwMPCgIUAAQ=
fAS3SBgBAAAANgAAAGQBAAAQABEAAAAAAAEAA////AEAAAAFYXBwbGX4AQAAAARwZWFyIbIP
'/*!*/;
### UPDATE test.t
### WHERE
### @1=1
### @2='apple'
### @3=NULL
### SET
### @1=1
### @2='pear'
### @3='2009:01:01'
...
# at 400
#080828 15:03:08 server id 1 end_log_pos 442 Delete_rows: table id 17 flags: STMT_END_F
BINLOG '
fAS3SBMBAAAALAAAAJABAAAAABEAAAAAAAAABHRIc3QAAXQAAwMPCgIUAAQ=
fAS3SBkBAAAAKgAAALoBAAAQABEAAAAAAAEAA//4AQAAAARwZWFyIbIP
'/*!*/;
### DELETE FROM test.t
### WHERE
### @1=1
### @2='pear'
### @3='2009:01:01'
```


Specify - - verbose or - v twice to also display data types and some metadata for each column, and informational log events such as row query log events if the binlog_rows_query_log_events
system variable is set to TRUE. The output contains an additional comment following each column change:
```
$> mysqlbinlog -vv log_file
...
# at 218
#080828 15:03:08 server id 1 end_log_pos 258 Write_rows: table id 17 flags: STMT_END_F
BINLOG '
fAS3SBMBAAAALAAAANOAAAAAABEAAAAAAAAABHRIc3QAAXQAAwMPCgIUAAQ=
fAS3SBcBAAAAKAAAAAIBAAAQABEAAAAAAAEAA//8AQAAAAVhcHBsZQ==
'/*!*/;
### INSERT INTO test.t
### SET
### @1=1 /* INT meta=0 nullable=0 is_null=0 */
### @2='apple' /* VARSTRING(20) meta=20 nullable=0 is_null=0 */
### @3=NULL /* VARSTRING(20) meta=0 nullable=1 is_null=1 */
...
# at 302
#080828 15:03:08 server id 1 end_log_pos 356 Update_rows: table id 17 flags: STMT_END_F
BINLOG '
fAS3SBMBAAAALAAAAC4BAAAAABEAAAAAAAAABHRlc3QAAXQAAwMPCgIUAAQ=
fAS3SBgBAAAANgAAAGQBAAAQABEAAAAAAAEAA////AEAAAAFYXBwbGX4AQAAAARwZWFyIbIP
'/*!*/;
### UPDATE test.t
### WHERE
### @1=1 /* INT meta=0 nullable=0 is_null=0 */
### @2='apple' /* VARSTRING(20) meta=20 nullable=0 is_null=0 */
### @3=NULL /* VARSTRING(20) meta=0 nullable=1 is_null=1 */
### SET
### @1=1 /* INT meta=0 nullable=0 is_null=0 */
### @2='pear' /* VARSTRING(20) meta=20 nullable=0 is_null=0 */
### @3='2009:01:01' /* DATE meta=0 nullable=1 is_null=0 */
...
# at 400
#080828 15:03:08 server id 1 end_log_pos 442 Delete_rows: table id 17 flags: STMT_END_F
BINLOG '
fAS3SBMBAAAALAAAAJABAAAAABEAAAAAAAAABHRlc3QAAXQAAwMPCgIUAAQ=
fAS3SBkBAAAAKgAAALoBAAAQABEAAAAAAAEAA//4AQAAAARwZWFyIbIP
'/*!*/;
### DELETE FROM test.t
### WHERE
### @1=1 /* INT meta=0 nullable=0 is_null=0 */
### @2='pear' /* VARSTRING(20) meta=20 nullable=0 is_null=0 */
### @3='2009:01:01' /* DATE meta=0 nullable=1 is_null=0 */
```


You can tell mysqlbinlog to suppress the BINLOG statements for row events by using the -base64-output=DECODE-ROWS option. This is similar to - - base64-output=NEVER but does not exit with an error if a row event is found. The combination of --base64-output=DECODE-ROWS and --verbose provides a convenient way to see row events only as SQL statements:
```
$> mysqlbinlog -v --base64-output=DECODE-ROWS log_file
...
# at 218
#080828 15:03:08 server id 1 end_log_pos 258 Write_rows: table id 17 flags: STMT_END_F
### INSERT INTO test.t
### SET
### @1=1
### @2='apple'
### @3=NULL
...
# at 302
#080828 15:03:08 server id 1 end_log_pos 356 Update_rows: table id 17 flags: STMT_END_F
### UPDATE test.t
### WHERE
### @1=1
### @2='apple'
### @3=NULL
### SET
```

```
### @1=1
### @2='pear'
### @3='2009:01:01'
...
# at 400
#080828 15:03:08 server id 1 end_log_pos 442 Delete_rows: table id 17 flags: STMT_END_F
### DELETE FROM test.t
### WHERE
### @1=1
### @2='pear'
### @3='2009:01:01'
```


\section*{Note}

You should not suppress BINLOG statements if you intend to re-execute mysqlbinlog output.

The SQL statements produced by --verbose for row events are much more readable than the corresponding BINLOG statements. However, they do not correspond exactly to the original SQL statements that generated the events. The following limitations apply:
- The original column names are lost and replaced by $@ N$, where $N$ is a column number.
- Character set information is not available in the binary log, which affects string column display:
- There is no distinction made between corresponding binary and nonbinary string types (BINARY and CHAR, VARBINARY and VARCHAR, BLOB and TEXT). The output uses a data type of STRING for fixed-length strings and VARSTRING for variable-length strings.
- For multibyte character sets, the maximum number of bytes per character is not present in the binary log, so the length for string types is displayed in bytes rather than in characters. For example, STRING ( 4 ) is used as the data type for values from either of these column types:

CHAR(4) CHARACTER SET latin1
CHAR(2) CHARACTER SET ucs2
- Due to the storage format for events of type UPDATE_ROWS_EVENT, UPDATE statements are displayed with the WHERE clause preceding the SET clause.

Proper interpretation of row events requires the information from the format description event at the beginning of the binary log. Because mysqlbinlog does not know in advance whether the rest of the log contains row events, by default it displays the format description event using a BINLOG statement in the initial part of the output.

If the binary log is known not to contain any events requiring a BINLOG statement (that is, no row events), the--base64-output=NEVER option can be used to prevent this header from being written.

\subsection*{6.6.9.3 Using mysqlbinlog to Back Up Binary Log Files}

By default, mysqlbinlog reads binary log files and displays their contents in text format. This enables you to examine events within the files more easily and to re-execute them (for example, by using the output as input to mysql). mysqlbinlog can read log files directly from the local file system, or, with the --read-from-remote-server option, it can connect to a server and request binary log contents from that server. mysqlbinlog writes text output to its standard output, or to the file named as the value of the --result-file=file_name option if that option is given.
- mysqlbinlog Backup Capabilities
- mysqlbinlog Backup Options
- Static and Live Backups
- Output File Naming
- Example: mysqldump + mysqlbinlog for Backup and Restore
- mysqlbinlog Backup Restrictions

\section*{mysqlbinlog Backup Capabilities}
mysqlbinlog can read binary log files and write new files containing the same content-that is, in binary format rather than text format. This capability enables you to easily back up a binary log in its original format. mysqlbinlog can make a static backup, backing up a set of log files and stopping when the end of the last file is reached. It can also make a continuous ("live") backup, staying connected to the server when it reaches the end of the last log file and continuing to copy new events as they are generated. In continuous-backup operation, mysqlbinlog runs until the connection ends (for example, when the server exits) or mysqlbinlog is forcibly terminated. When the connection ends, mysqlbinlog does not wait and retry the connection, unlike a replica server. To continue a live backup after the server has been restarted, you must also restart mysqlbinlog.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0621.jpg?height=110&width=108&top_left_y=884&top_left_x=365)

\section*{Important}
mysqlbinlog can back up both encrypted and unencrypted binary log files. However, copies of encrypted binary log files that are generated using mysqlbinlog are stored in an unencrypted format.

\section*{mysqlbinlog Backup Options}

Binary log backup requires that you invoke mysqlbinlog with two options at minimum:
- The --read-from-remote-server (or - R) option tells mysqlbinlog to connect to a server and request its binary log. (This is similar to a replica server connecting to its replication source server.)
- The - - raw option tells mysqlbinlog to write raw (binary) output, not text output.

Along with - -read-from-remote-server, it is common to specify other options: --host indicates where the server is running, and you may also need to specify connection options such as--user and --password.

Several other options are useful in conjunction with - - raw:
- --stop-never: Stay connected to the server after reaching the end of the last log file and continue to read new events.
- --connection-server-id=id: The server ID that mysqlbinlog reports when it connects to a server. When --stop-never is used, the default reported server ID is 1 . If this causes a conflict with the ID of a replica server or another mysqlbinlog process, use--connection-server-id to specify an alternative server ID. See Section 6.6.9.4, "Specifying the mysqlbinlog Server ID".
- --result-file: A prefix for output file names, as described later.

\section*{Static and Live Backups}

To back up a server's binary log files with mysqlbinlog, you must specify file names that actually exist on the server. If you do not know the names, connect to the server and use the SHOW BINARY LOGS statement to see the current names. Suppose that the statement produces this output:
```
mysql> SHOW BINARY LOGS;
+----------------+-----------+-----------+
    Log_name | File_size | Encrypted |
+----------------+-----------+-----------+
| binlog.000130 | 27459 | No
| binlog.000131 | 13719 | No
| binlog.000132 | 43268 | No
+----------------+-----------+-----------+
```


With that information, you can use mysqlbinlog to back up the binary log to the current directory as follows (enter each command on a single line):
- To make a static backup of binlog. 000130 through binlog. 000132 , use either of these commands:
```
mysqlbinlog --read-from-remote-server --host=host_name --raw
    binlog.000130 binlog.000131 binlog.000132
mysqlbinlog --read-from-remote-server --host=host_name --raw
    --to-last-log binlog.000130
```


The first command specifies every file name explicitly. The second names only the first file and uses --to-last-log to read through the last. A difference between these commands is that if the server happens to open binlog. 000133 before mysqlbinlog reaches the end of binlog. 000132 , the first command does not read it, but the second command does.
- To make a live backup in which mysqlbinlog starts with binlog. 000130 to copy existing log files, then stays connected to copy new events as the server generates them:
```
mysqlbinlog --read-from-remote-server --host=host_name --raw
    --stop-never binlog.000130
```


With --stop-never, it is not necessary to specify --to-last-log to read to the last log file because that option is implied.

\section*{Output File Naming}

Without --raw, mysqlbinlog produces text output and the --result-file option, if given, specifies the name of the single file to which all output is written. With - - raw, mysqlbinlog writes one binary output file for each log file transferred from the server. By default, mysqlbinlog writes the files in the current directory with the same names as the original log files. To modify the output file names, use the --result-file option. In conjunction with --raw, the --result-file option value is treated as a prefix that modifies the output file names.

Suppose that a server currently has binary log files named binlog. 000999 and up. If you use mysqlbinlog --raw to back up the files, the --result-file option produces output file names as shown in the following table. You can write the files to a specific directory by beginning the --resultfile value with the directory path. If the --result-file value consists only of a directory name, the value must end with the pathname separator character. Output files are overwritten if they exist.

\begin{tabular}{|l|l|}
\hline- - result-file Option & Output File Names \\
\hline- -result-file=x & xbinlog. 000999 and up \\
\hline- -result-file=/tmp/ & /tmp/binlog. 000999 and up \\
\hline- -result-file=/tmp/x & /tmp/xbinlog. 000999 and up \\
\hline
\end{tabular}

\section*{Example: mysqldump + mysqlbinlog for Backup and Restore}

The following example describes a simple scenario that shows how to use mysqldump and mysqlbinlog together to back up a server's data and binary log, and how to use the backup to restore the server if data loss occurs. The example assumes that the server is running on host host_name and its first binary log file is named binlog.000999. Enter each command on a single line.

Use mysqlbinlog to make a continuous backup of the binary log:
```
mysqlbinlog --read-from-remote-server --host=host_name --raw
    --stop-never binlog.000999
```


Use mysqldump to create a dump file as a snapshot of the server's data. Use - -all-databases, - events, and --routines to back up all data, and --source-data=2 to include the current binary log coordinates in the dump file.
```
mysqldump --host=host_name --all-databases --events --routines --source-data=2> dump_file
```


Execute the mysqldump command periodically to create newer snapshots as desired.

If data loss occurs (for example, if the server unexpectedly exits), use the most recent dump file to restore the data:
```
mysql --host=host_name -u root -p < dump_file
```


Then use the binary log backup to re-execute events that were written after the coordinates listed in the dump file. Suppose that the coordinates in the file look like this:
```
-- CHANGE REPLICATION SOURCE TO SOURCE_LOG_FILE='binlog.001002', SOURCE_LOG_POS=27284;
```


If the most recent backed-up log file is named binlog. 001004, re-execute the log events like this:
```
mysqlbinlog --start-position=27284 binlog.001002 binlog.001003 binlog.001004
    | mysql --host=host_name -u root -p
```


You might find it easier to copy the backup files (dump file and binary log files) to the server host to make it easier to perform the restore operation, or if MySQL does not allow remote root access.

\section*{mysqlbinlog Backup Restrictions}

Binary log backups with mysqlbinlog are subject to these restrictions:
- mysqlbinlog does not automatically reconnect to the MySQL server if the connection is lost (for example, if a server restart occurs or there is a network outage).
- The delay for a backup is similar to the delay for a replica server.

\subsection*{6.6.9.4 Specifying the mysqlbinlog Server ID}

When invoked with the --read-from-remote-server option, mysqlbinlog connects to a MySQL server, specifies a server ID to identify itself, and requests binary log files from the server. You can use mysqlbinlog to request log files from a server in several ways:
- Specify an explicitly named set of files: For each file, mysqlbinlog connects and issues a Binlog dump command. The server sends the file and disconnects. There is one connection per file.
- Specify the beginning file and --to-last-log: mysqlbinlog connects and issues a Binlog dump command for all files. The server sends all files and disconnects.
- Specify the beginning file and --stop-never (which implies --to-last-log): mysqlbinlog connects and issues a Binlog dump command for all files. The server sends all files, but does not disconnect after sending the last one.

With --read-from-remote-server only, mysqlbinlog connects using a server ID of 0, which tells the server to disconnect after sending the last requested log file.

With --read-from-remote-server and --stop-never, mysqlbinlog connects using a nonzero server ID, so the server does not disconnect after sending the last log file. The server ID is 1 by default, but this can be changed with --connection-server-id.

Thus, for the first two ways of requesting files, the server disconnects because mysqlbinlog specifies a server ID of 0 . It does not disconnect if--stop-never is given because mysqlbinlog specifies a nonzero server ID.

\subsection*{6.6.10 mysqldumpslow - Summarize Slow Query Log Files}

The MySQL slow query log contains information about queries that take a long time to execute (see Section 7.4.5, "The Slow Query Log"). mysqldumpslow parses MySQL slow query log files and summarizes their contents.

Normally, mysqldumpslow groups queries that are similar except for the particular values of number and string data values. It "abstracts" these values to N and ' S ' when displaying summary output. To modify value abstracting behavior, use the $-a$ and $-n$ options.

Invoke mysqldumpslow like this:
```
mysqldumpslow [options] [log_file ...]
```


Example output with no options given:
```
Reading mysql slow query log from /usr/local/mysql/data/mysqld84-slow.log
Count: 1 Time=4.32s (4s) Lock=0.00s (0s) Rows=0.0 (0), root[root]@localhost
    insert into t2 select * from t1
Count: 3 Time=2.53s (7s) Lock=0.00s (0s) Rows=0.0 (0), root[root]@localhost
    insert into t2 select * from t1 limit N
Count: 3 Time=2.13s (6s) Lock=0.00s (0s) Rows=0.0 (0), root[root]@localhost
    insert into t1 select * from t1
```

mysqldumpslow supports the following options.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.21 mysqldumpslow Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline -a & Do not abstract all numbers to N and strings to 'S' \\
\hline -n & Abstract numbers with at least the specified digits \\
\hline --debug & Write debugging information \\
\hline -g & Only consider statements that match the pattern \\
\hline --help & Display help message and exit \\
\hline -h & Host name of the server in the log file name \\
\hline -i & Name of the server instance \\
\hline -I & Do not subtract lock time from total time \\
\hline -r & Reverse the sort order \\
\hline -S & How to sort output \\
\hline -t & Display only first num queries \\
\hline --verbose & Verbose mode \\
\hline
\end{tabular}
\end{table}
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display a help message and exit.
- - a

Do not abstract all numbers to N and strings to ' S '.
- --debug, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug \\
\hline
\end{tabular}

Run in debug mode.
This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- -g pattern

\begin{tabular}{|l|l|}
\hline Type & String \\
\hline
\end{tabular}

Consider only queries that match the (grep-style) pattern.
- -h host_name

\begin{tabular}{|l|l|}
\hline Type & String \\
\hline Default Value & $*$ \\
\hline
\end{tabular}

Host name of MySQL server for *-slow. log file name. The value can contain a wildcard. The default is * (match all).
- -i name

\begin{tabular}{|l|l|}
\hline Type & String \\
\hline
\end{tabular}

Name of server instance (if using mysql. server startup script).
- -1

Do not subtract lock time from total time.
- - n N

\begin{tabular}{|l|l|}
\hline Type & Numeric \\
\hline
\end{tabular}

Abstract numbers with at least $N$ digits within names.
- - $r$

Reverse the sort order.
- -s sort_type

\begin{tabular}{|l|l|}
\hline Type & String \\
\hline Default Value & at \\
\hline
\end{tabular}

How to sort the output. The value of sort_type should be chosen from the following list:
- t , at: Sort by query time or average query time
- l, al: Sort by lock time or average lock time
- r, ar: Sort by rows sent or average rows sent
- c: Sort by count

By default, mysqldumpslow sorts by average query time (equivalent to $-s$ at).
- -t N

\begin{tabular}{|l|l|}
\hline Type & Numeric \\
\hline
\end{tabular}

Display only the first $N$ queries in the output.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Verbose mode. Print more information about what the program does.

\subsection*{6.7 Program Development Utilities}

This section describes some utilities that you may find useful when developing MySQL programs.
In shell scripts, you can use the my_print_defaults program to parse option files and see what options would be used by a given program. The following example shows the output that my_print_defaults might produce when asked to show the options found in the [client] and [mysql] groups:
```
$> my_print_defaults client mysql
--port=3306
--socket=/tmp/mysql.sock
--no-auto-rehash
```


Note for developers: Option file handling is implemented in the C client library simply by processing all options in the appropriate group or groups before any command-line arguments. This works well for programs that use the last instance of an option that is specified multiple times. If you have a C or C++ program that handles multiply specified options this way but that doesn't read option files, you need add only two lines to give it that capability. Check the source code of any of the standard MySQL clients to see how to do this.

Several other language interfaces to MySQL are based on the C client library, and some of them provide a way to access option file contents. These include Perl and Python. For details, see the documentation for your preferred interface.

\subsection*{6.7.1 mysql_config - Display Options for Compiling Clients}
mysql_config provides you with useful information for compiling your MySQL client and connecting it to MySQL. It is a shell script, so it is available only on Unix and Unix-like systems.

\section*{Note}
pkg-config can be used as an alternative to mysql_config for obtaining information such as compiler flags or link libraries required to compile MySQL applications. For more information, see Building C API Client Programs Using pkg-config.
mysql_config supports the following options.
- --cflags

C Compiler flags to find include files and critical compiler flags and defines used when compiling the libmysqlclient library. The options returned are tied to the specific compiler that was used when the library was created and might clash with the settings for your own compiler. Use --include for more portable options that contain only include paths.
- --cxxflags

Like --cflags, but for C++ compiler flags.
- --include

Compiler options to find MySQL include files.
- --libs

Libraries and options required to link with the MySQL client library.
- --libs_r

Libraries and options required to link with the thread-safe MySQL client library. In MySQL 8.4, all client libraries are thread-safe, so this option need not be used. The --libs option can be used in all cases.
- --plugindir

The default plugin directory path name, defined when configuring MySQL.
- --port

The default TCP/IP port number, defined when configuring MySQL.
- --socket

The default Unix socket file, defined when configuring MySQL.
- --variable=var_name

Display the value of the named configuration variable. Permitted var_name values are pkgincludedir (the header file directory), pkglibdir (the library directory), and plugindir (the plugin directory).
- --version

Version number for the MySQL distribution.
If you invoke mysql_config with no options, it displays a list of all options that it supports, and their values:
```
$> mysql_config
Usage: ./mysql_config [OPTIONS]
Compiler: GNU 10.4.0
Options:
    --cflags [-I/usr/local/mysql/include/mysql]
    --cxxflags [-I/usr/local/mysql/include/mysql]
    --include [-I/usr/local/mysql/include/mysql]
    --libs [-L/usr/local/mysql/lib/mysql -lmysqlclient -lpthread -ldl
        -lssl -lcrypto -lresolv -lm -lrt]
    --libs_r [-L/usr/local/mysql/lib/mysql -lmysqlclient -lpthread -ldl
            -lssl -lcrypto -lresolv -lm -lrt]
    --plugindir [/usr/local/mysql/lib/plugin]
    --socket [/tmp/mysql.sock]
    --port [3306]
    --version [8.4.0]
    --variable=VAR VAR is one of:
        pkgincludedir [/usr/local/mysql/include]
        pkglibdir [/usr/local/mysql/lib]
        plugindir [/usr/local/mysql/lib/plugin]
```


You can use mysql_config within a command line using backticks to include the output that it produces for particular options. For example, to compile and link a MySQL client program, use mysql_config as follows:
```
gcc -c ˋmysql_config --cflagsˋ progname.c
gcc -o progname progname.o ˋmysql_config --libsˋ
```


\subsection*{6.7.2 my_print_defaults - Display Options from Option Files}
my_print_defaults displays the options that are present in option groups of option files. The output indicates what options are used by programs that read the specified option groups. For example, the mysqlcheck program reads the [mysqlcheck] and [client] option groups. To see what options are present in those groups in the standard option files, invoke my_print_defaults like this:
```
$> my_print_defaults mysqlcheck client
--user=myusername
--password=password
--host=localhost
```


The output consists of options, one per line, in the form that they would be specified on the command line.
my_print_defaults supports the following options.
- --help, -?

Display a help message and exit.
- --config-file=file_name, --defaults-file=file_name, -c file_name

Read only the given option file.
- --debug=debug_options, -\# debug_options

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: \mathrm{o}$, file_name. The default is d:t:o,/tmp/my_print_defaults.trace.
- --defaults-extra-file=file_name, --extra-file=file_name, -e file_name

Read this option file after the global option file but (on Unix) before the user option file.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-group-suffix=suffix, -g suffix

In addition to the groups named on the command line, read groups that have the given suffix.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --login-path=name, -l name

Read options from the named login path in the .mylogin. cnf login path file. A "login path" is an option group containing options that specify which MySQL server to connect to and which account to authenticate as. To create or modify a login path file, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-login-paths

Skips reading options from the login path file.
See--login-path for related information.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-defaults, -n

Return an empty string.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --show, -s
my_print_defaults masks passwords by default. Use this option to display passwords as cleartext.
- --verbose, -v

Verbose mode. Print more information about what the program does.
- --version, -V

Display version information and exit.

\subsection*{6.8 Miscellaneous Programs}

\subsection*{6.8.1 perror - Display MySQL Error Message Information}
perror displays the error message for MySQL or operating system error codes. Invoke perror like this:
```
perror [options] errorcode ...
perror attempts to be flexible in understanding its arguments. For example, for the ER_WRONG_VALUE_FOR_VAR error, perror understands any of these arguments: 1231, 001231, MY-1231, or MY-001231, or ER_WRONG_VALUE_FOR_VAR.
```

```
$> perror 1231
MySQL error code MY-001231 (ER_WRONG_VALUE_FOR_VAR): Variable '%-.64s'
can't be set to the value of '%-.200s'
```


If an error number is in the range where MySQL and operating system errors overlap, perror displays both error messages:
```
$> perror 1 13
OS error code 1: Operation not permitted
MySQL error code MY-000001: Can't create/write to file '%s' (OS errno %d - %s)
OS error code 13: Permission denied
MySQL error code MY-000013: Can't get stat of '%s' (OS errno %d - %s)
```


To obtain the error message for a MySQL Cluster error code, use the ndb_perror utility.
The meaning of system error messages may be dependent on your operating system. A given error code may mean different things on different operating systems.
perror supports the following options.
- --help, --info, -I, -?

Display a help message and exit.
- --silent, -s

Silent mode. Print only the error message.
- --verbose, -v

Verbose mode. Print error code and message. This is the default behavior.
- --version, -V

Display version information and exit.

\subsection*{6.9 Environment Variables}

This section lists environment variables that are used directly or indirectly by MySQL. Most of these can also be found in other places in this manual.

Options on the command line take precedence over values specified in option files and environment variables, and values in option files take precedence over values in environment variables. In many cases, it is preferable to use an option file instead of environment variables to modify the behavior of MySQL. See Section 6.2.2.2, "Using Option Files".

\begin{tabular}{|l|l|}
\hline Variable & Description \\
\hline AUTHENTICATION_KERBEROS_CLIENT_LOG & Kerberos authentication logging level. \\
\hline AUTHENTICATION_LDAP_CLIENT_LOG & Client-side LDAP authentication logging level. \\
\hline AUTHENTICATION_PAM_LOG & PAM authentication plugin debug logging settings. \\
\hline CC & The name of your C compiler (for running CMake). \\
\hline CXX & The name of your C++ compiler (for running CMake). \\
\hline CC & The name of your C compiler (for running CMake). \\
\hline DBI_USER & The default user name for Perl DBI. \\
\hline DBI_TRACE & Trace options for Perl DBI. \\
\hline HOME & The default path for the mysql history file is \$HOME/.mysql_history. \\
\hline LD_RUN_PATH & Used to specify the location of libmysqlclient.so. \\
\hline LIBMYSQL_ENABLE_CLEARTEXT_PLUGIN & Enable mysql_clear_password authentication plugin; see Section 8.4.1.4, "Client-Side Cleartext Pluggable Authentication". \\
\hline LIBMYSQL_PLUGIN_DIR & Directory in which to look for client plugins. \\
\hline LIBMYSQL_PLUGINS & Client plugins to preload. \\
\hline MYSQL_DEBUG & Debug trace options when debugging. \\
\hline MYSQL_GROUP_SUFFIX & Option group suffix value (like specifying --defaults-group-suffix). \\
\hline MYSQL_HISTFILE & The path to the mysql history file. If this variable is set, its value overrides the default for \$HOME/.mysql_history. \\
\hline MYSQL_HISTIGNORE & Patterns specifying statements that mysql should not log to \$HOME/. mysql_history, or syslog if --syslog is given. \\
\hline MYSQL_HOME & The path to the directory in which the serverspecific my. cnf file resides. \\
\hline MYSQL_HOST & The default host name used by the mysql command-line client. \\
\hline MYSQL_PS1 & The command prompt to use in the mysql command-line client. \\
\hline MYSQL_PWD & The default password when connecting to mysqld. Using this is insecure. See note following table. \\
\hline MYSQL_TCP_PORT & The default TCP/IP port number. \\
\hline MYSQL_TEST_LOGIN_FILE & The name of the .mylogin. cnf login path file. \\
\hline MYSQL_TEST_TRACE_CRASH & Whether the test protocol trace plugin crashes clients. See note following table. \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Variable & Description \\
\hline MYSQL_TEST_TRACE_DEBUG & Whether the test protocol trace plugin produces output. See note following table. \\
\hline MYSQL_UNIX_PORT & The default Unix socket file name; used for connections to localhost. \\
\hline MYSQLX_TCP_PORT & The X Plugin default TCP/IP port number. \\
\hline MYSQLX_UNIX_PORT & The X Plugin default Unix socket file name; used for connections to localhost. \\
\hline NOTIFY_SOCKET & Socket used by mysqld to communicate with systemd. \\
\hline PATH & Used by the shell to find MySQL programs. \\
\hline PKG_CONFIG_PATH & Location of mysqlclient. pc pkg-config file. See note following table. \\
\hline TMPDIR & The directory in which temporary files are created. \\
\hline TZ & This should be set to your local time zone. See Section B.3.3.7, "Time Zone Problems". \\
\hline UMASK & The user-file creation mode when creating files. See note following table. \\
\hline UMASK_DIR & The user-directory creation mode when creating directories. See note following table. \\
\hline USER & The default user name on Windows when connecting to mysqld. \\
\hline
\end{tabular}

For information about the mysql history file, see Section 6.5.1.3, "mysql Client Logging".
Use of MYSQL_PWD to specify a MySQL password must be considered extremely insecure and should not be used. Some versions of ps include an option to display the environment of running processes. On some systems, if you set MYSQL_PWD, your password is exposed to any other user who runs ps. Even on systems without such a version of ps, it is unwise to assume that there are no other methods by which users can examine process environments.

MYSQL_PWD is deprecated as of MySQL 8.4; expect it to be removed in a future version of MySQL.
MYSQL_TEST_LOGIN_FILE is the path name of the login path file (the file created by mysql_config_editor). If not set, the default value is \%APPDATA\%\MySQL\.mylogin.cnf directory on Windows and \$HOME/ . mylogin . cnf on non-Windows systems. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

The MYSQL_TEST_TRACE_DEBUG and MYSQL_TEST_TRACE_CRASH variables control the test protocol trace client plugin, if MySQL is built with that plugin enabled. For more information, see Using the Test Protocol Trace Plugin.

The default UMASK and UMASK_DIR values are 0640 and 0750, respectively. MySQL assumes that the value for UMASK or UMASK_DIR is in octal if it starts with a zero. For example, setting UMASK=0600 is equivalent to UMASK=384 because 0600 octal is 384 decimal.

The UMASK and UMASK_DIR variables, despite their names, are used as modes, not masks:
- If UMASK is set, mysqld uses (\$UMASK | 0600) as the mode for file creation, so that newly created files have a mode in the range from 0600 to 0666 (all values octal).
- If UMASK_DIR is set, mysqld uses (\$UMASK_DIR | 0700) as the base mode for directory creation, which then is AND-ed with $\sim(\sim \$$ UMASK \& 0666), so that newly created directories have a mode in the range from 0700 to 0777 (all values octal). The AND operation may remove read and write permissions from the directory mode, but not execute permissions.

See also Section B.3.3.1, "Problems with File Permissions".
It may be necessary to set PKG_CONFIG_PATH if you use pkg-config for building MySQL programs. See Building C API Client Programs Using pkg-config.

\subsection*{6.10 Unix Signal Handling in MySQL}

On Unix and Unix-like systems, a process can be the recipient of signals sent to it by the root system account or the system account that owns the process. Signals can be sent using the kill command. Some command interpreters associate certain key sequences with signals, such as Control+C to send a SIGINT signal. This section describes how the MySQL server and client programs respond to signals.
- Server Response to Signals
- Client Response to Signals

\section*{Server Response to Signals}
mysqld responds to signals as follows:
- SIGTERM causes the server to shut down. This is like executing a SHUTDOWN statement without having to connect to the server (which for shutdown requires an account that has the SHUTDOWN privilege).
- SIGHUP causes the server to reload the grant tables and to flush tables, logs, the thread cache, and the host cache. These actions are like various forms of the FLUSH statement. Sending the signal enables the flush operations to be performed without having to connect to the server, which requires a MySQL account that has privileges sufficient for those operations.
- SIGUSR1 causes the server to flush the error log, general query log, and slow query log. One use for SIGUSR1 is to implement log rotation without having to connect to the server, which requires a MySQL account that has privileges sufficient for those operations. For information about log rotation, see Section 7.4.6, "Server Log Maintenance".

The server response to SIGUSR1 is a subset of the response to SIGHUP, enabling SIGUSR1 to be used as a more "lightweight" signal that flushes certain logs without the other SIGHUP effects such as flushing the thread and host caches and writing a status report to the error log.
- SIGINT normally is ignored by the server. Starting the server with the --gdb option installs an interrupt handler for SIGINT for debugging purposes. See Section 7.9.1.4, "Debugging mysqld under gdb".

\section*{Client Response to Signals}

MySQL client programs respond to signals as follows:
- The mysql client interprets SIGINT (typically the result of typing Control+C) as instruction to interrupt the current statement if there is one, or to cancel any partial input line otherwise. This behavior can be disabled using the --sigint-ignore option to ignore SIGINT signals.
- Client programs that use the MySQL client library block SIGPIPE signals by default. These variations are possible:
- Client can install their own SIGPIPE handler to override the default behavior. See Writing C API Threaded Client Programs.
- Clients can prevent installation of SIGPIPE handlers by specifying the CLIENT_IGNORE_SIGPIPE option to mysql_real_connect ( ) at connect time. See mysql_real_connect().

