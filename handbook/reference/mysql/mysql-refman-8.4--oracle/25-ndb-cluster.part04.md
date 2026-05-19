\section*{Example}

First we create an NDB table in the test database, using the CREATE TABLE statement shown here:
```
USE test;
CREATE TABLE btest (
    c0 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    C1 TEXT,
    c2 BLOB
) ENGINE=NDB;
```


Then we insert a few rows into this table, using a series of statements similar to this one:
```
INSERT INTO btest VALUES (NULL, 'x', REPEAT('x', 1000));
```


When run with --check-orphans against this table, ndb_blob_tool generates the following output:
```
$> ndb_blob_tool --check-orphans --verbose -d test btest
connected
```

```
processing 2 blobs
processing blob #0 c1 NDB$BLOB_19_1
NDB$BLOB_19_1: nextResult: res=1
total parts: 0
orphan parts: 0
processing blob #1 c2 NDB$BLOB_19_2
NDB$BLOB_19_2: nextResult: res=0
NDB$BLOB_19_2: nextResult: res=0
NDB$BLOB_19_2: nextResult: res=0
NDB$BLOB_19_2: nextResult: res=0
NDB$BLOB_19_2: nextResult: res=0
NDB$BLOB_19_2: nextResult: res=0
NDB$BLOB_19_2: nextResult: res=0
NDB$BLOB_19_2: nextResult: res=0
NDB$BLOB_19_2: nextResult: res=0
NDB$BLOB_19_2: nextResult: res=0
NDB$BLOB_19_2: nextResult: res=1
total parts: 10
orphan parts: 0
disconnected
```


The tool reports that there are no NDB BLOB column parts associated with column c1, even though c1 is a TEXT column. This is due to the fact that, in an NDB table, only the first 256 bytes of a BLOB or TEXT column value are stored inline, and only the excess, if any, is stored separately; thus, if there are no values using more than 256 bytes in a given column of one of these types, no BLOB column parts are created by NDB for this column. See Section 13.7, "Data Type Storage Requirements", for more information.

\subsection*{25.5.7 ndb_config - Extract NDB Cluster Configuration Information}

This tool extracts current configuration information for data nodes, SQL nodes, and API nodes from one of a number of sources: an NDB Cluster management node, or its config.ini or my.cnf file. By default, the management node is the source for the configuration data; to override the default, execute ndb_config with the --config-file or --mycnf option. It is also possible to use a data node as the source by specifying its node ID with --config_from_node=node_id.
ndb_config can also provide an offline dump of all configuration parameters which can be used, along with their default, maximum, and minimum values and other information. The dump can be produced in either text or XML format; for more information, see the discussion of the --configinfo and --xml options later in this section).

You can filter the results by section (DB, SYSTEM, or CONNECTIONS) using one of the options - nodes, --system, or --connections.

All options that can be used with ndb_config are shown in the following table. Additional descriptions follow the table.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- cluster-config-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --cluster-config-suffix=name \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Override defaults group suffix when reading cluster configuration sections in my.cnf; used in testing.

\section*{- --configinfo}

The --configinfo option causes ndb_config to dump a list of each NDB Cluster configuration parameter supported by the NDB Cluster distribution of which ndb_config is a part, including the following information:
- A brief description of each parameter's purpose, effects, and usage
- The section of the config.ini file where the parameter may be used
- The parameter's data type or unit of measurement
- Where applicable, the parameter's default, minimum, and maximum values
- NDB Cluster release version and build information

By default, this output is in text format. Part of this output is shown here:
```
$> ndb_config --configinfo
****** SYSTEM ******
Name (String)
Name of system (NDB Cluster)
MANDATORY
PrimaryMGMNode (Non-negative Integer)
Node id of Primary ndb_mgmd(MGM) node
Default: 0 (Min: 0, Max: 4294967039)
ConfigGenerationNumber (Non-negative Integer)
Configuration generation number
Default: 0 (Min: 0, Max: 4294967039)
****** DB ******
MaxNoOfSubscriptions (Non-negative Integer)
Max no of subscriptions (default 0 == MaxNoOfTables)
Default: 0 (Min: 0, Max: 4294967039)
MaxNoOfSubscribers (Non-negative Integer)
Max no of subscribers (default 0 == 2 * MaxNoOfTables)
Default: 0 (Min: 0, Max: 4294967039)
...
```


Use this option together with the --xml option to obtain output in XML format.
- --config-binary-file=path-to-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --config-binary-file=path/to/file \\
\hline Type & File name \\
\hline Default Value & \\
\hline
\end{tabular}

Gives the path to the management server's cached binary configuration file (ndb_nodeID_config.bin.seqno). This may be a relative or absolute path. If the management server and the ndb_config binary used reside on different hosts, you must use an absolute path.

This example demonstrates combining --config-binary-file with other ndb_config options to obtain useful output:
```
$> ndb_config --config-binary-file=../mysql-cluster/ndb_50_config.bin.1 --diff-default --type=ndbd
config of [DB] node id 5 that is different from default
CONFIG_PARAMETER,ACTUAL_VALUE,DEFAULT_VALUE
NodeId,5,(mandatory)
BackupDataDir,/local/data/8.4,(null)
```

```
DataDir,/local/data/8.4,.
DataMemory,2G,98M
FileSystemPath,/local/data/8.4,(null)
HostName,127.0.0.1,localhost
Nodegroup,0,(null)
ThreadConfig,,(null)
config of [DB] node id 6 that is different from default
CONFIG_PARAMETER,ACTUAL_VALUE,DEFAULT_VALUE
NodeId,6, (mandatory)
BackupDataDir,/local/data/8.4,(null)
DataDir,/local/data/8.4.
DataMemory,2G,98M
FileSystemPath,/local/data/8.4,(null)
HostName,127.0.0.1,localhost
Nodegroup,0,(null)
ThreadConfig,,(null)
$> ndb_config --config-binary-file=../mysql-cluster/ndb_50_config.bin.1 --diff-default --system
config of [SYSTEM] system
CONFIG_PARAMETER,ACTUAL_VALUE,DEFAULT_VALUE
Name,MC_20220906060042,(mandatory)
ConfigGenerationNumber,1,0
PrimaryMGMNode,50,0
```


The relevant portions of the config. ini file are shown here:
```
[ndbd default]
DataMemory= 2G
NoOfReplicas= 2
[ndb_mgmd]
NodeId= 50
HostName= 127.0.0.1
[ndbd]
NodeId= 5
HostName= 127.0.0.1
DataDir= /local/data/8.4
[ndbd]
NodeId= 6
HostName= 127.0.0.1
DataDir= /local/data/8.4
```


By comparing the output with the configuration file, you can see that all of the settings in the file have been written by the management server to the binary cache, and thus, applied to the cluster.
- --config-file=path-to-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --config-file=file_name \\
\hline Type & File name \\
\hline Default Value & \\
\hline
\end{tabular}

Gives the path to the cluster configuration file (config.ini). This may be a relative or absolute path. If the management server and the ndb_config binary used reside on different hosts, you must use an absolute path.
- --config_from_node=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -config-from-node=\# \\
\hline Type & Numeric \\
\hline Default Value & none \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 48 \\
\hline
\end{tabular}

Obtain the cluster's configuration data from the data node that has this ID.
If the node having this ID is not a data node, ndb_config fails with an error. (To obtain configuration data from the management node instead, simply omit this option.)
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --connections

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connections \\
\hline
\end{tabular}

Tells ndb_config to print CONNECTIONS information only-that is, information about parameters found in the [tcp], [tcp default], [shm], or [shm default] sections of the cluster configuration file (see Section 25.4.3.10, "NDB Cluster TCP/IP Connections", and Section 25.4.3.12, "NDB Cluster Shared-Memory Connections", for more information).

This option is mutually exclusive with --nodes and --system; only one of these 3 options can be used.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --diff-default

\begin{tabular}{|l|l|}
\hline Command-Line Format & --diff-default \\
\hline
\end{tabular}

Print only configuration parameters that have non-default values.
- --fields=delimiter, -f delimiter

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fields=string \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

Specifies a delimiter string used to separate the fields in the result. The default is, (the comma character).

\section*{Note}

If the delimiter contains spaces or escapes (such as \n for the linefeed character), then it must be quoted.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display help text and exit.
- --host=hostname

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - host=name \\
\hline Type & String \\
\hline
\end{tabular}

\section*{Default Value}

Specifies the host name of the node for which configuration information is to be obtained.

\section*{Note}

While the hostname localhost usually resolves to the IP address 127.0.0.1, this may not necessarily be true for all operating platforms and configurations. This means that it is possible, when localhost is used in config.ini, for ndb_config --host=localhost to fail if ndb_config is run on a different host where localhost resolves to a different address (for example, on some versions of SUSE Linux, this is 127.0 .0 .2 ). In general, for best results, you should use numeric IP addresses for all NDB Cluster configuration values relating to hosts, or verify that all NDB Cluster hosts handle localhost in the same fashion.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --mycnf

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- mycnf \\
\hline
\end{tabular}

Read configuration data from the my.cnf file.
- --ndb-connectstring=connection_string, -c connection_string

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Specifies the connection string to use in connecting to the management server. The format for the connection string is the same as described in Section 25.4.3.3, "NDB Cluster Connection Strings", and defaults to localhost: 1186 .
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgmd-host=connection_string \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - tls - search - path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb-tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb-tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$ \mathrm{HOME} / \mathrm{ndb}$ - tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --nodeid=node_id

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - nodeid=\# \\
\hline Type & Integer \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Specify the node ID of the node for which configuration information is to be obtained.
- --nodes

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - nodes \\
\hline
\end{tabular}

Tells ndb_config to print information relating only to parameters defined in an [ndbd] or [ndbd default] section of the cluster configuration file (see Section 25.4.3.6, "Defining NDB Cluster Data Nodes").

This option is mutually exclusive with --connections and --system; only one of these 3 options can be used.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --query=query-options, -q query-options

\begin{tabular}{|l|l|}
\hline Command-Line Format & --query=string \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

This is a comma-delimited list of query options-that is, a list of one or more node attributes to be returned. These include nodeid (node ID), type (node type-that is, ndbd, mysqld, or ndb_mgmd), and any configuration parameters whose values are to be obtained.

For example, --query=nodeid, type, datamemory, datadir returns the node ID, node type, DataMemory, and DataDir for each node.

\section*{Note}

If a given parameter is not applicable to a certain type of node, than an empty string is returned for the corresponding value. See the examples later in this section for more information.
- --query-all, -a

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - query-all \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

Returns a comma-delimited list of all query options (node attributes; note that this list is a single string.
- --rows=separator, -r separator

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- rows=string \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

Specifies a separator string used to separate the rows in the result. The default is a space character.

\section*{Note}

If the separator contains spaces or escapes (such as \n for the linefeed character), then it must be quoted.
- --system

\begin{tabular}{|l|l|}
\hline Command-Line Format & --system \\
\hline
\end{tabular}

Tells ndb_config to print SYSTEM information only. This consists of system variables that cannot be changed at run time; thus, there is no corresponding section of the cluster configuration file for them. They can be seen (prefixed with ****** SYSTEM ******) in the output of ndb_config -configinfo.

This option is mutually exclusive with --nodes and --connections; only one of these 3 options can be used.
- --type=node_type

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - type=name \\
\hline Type & Enumeration \\
\hline Default Value & [none] \\
\hline Valid Values & \begin{tabular}{l}
ndbd \\
mysqld \\
ndb_mgmd
\end{tabular} \\
\hline
\end{tabular}

Filters results so that only configuration values applying to nodes of the specified node_type (ndbd, mysqld, or ndb_mgmd) are returned.
- --usage, --help, or -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Causes ndb_config to print a list of available options, and then exit.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Causes ndb_config to print a version information string, and then exit.
- --configinfo --xml

\begin{tabular}{|l|l|}
\hline Command-Line Format & --configinfo --xml \\
\hline
\end{tabular}

Cause ndb_config --configinfo to provide output as XML by adding this option. A portion of such output is shown in this example:
```
$> ndb_config --configinfo --xml
<configvariables protocolversion="1" ndbversionstring="5.7.44-ndb-7.5.36"
                ndbversion="460032" ndbversionmajor="7" ndbversionminor="5"
                ndbversionbuild="0">
    <section name="SYSTEM">
        <param name="Name" comment="Name of system (NDB Cluster)" type="string"
            mandatory="true"/>
        <param name="PrimaryMGMNode" comment="Node id of Primary ndb_mgmd(MGM) node"
            type="unsigned" default="0" min="0" max="4294967039"/>
```

```
        <param name="ConfigGenerationNumber" comment="Configuration generation number"
            type="unsigned" default="0" min="0" max="4294967039"/>
    </section>
    <section name="MYSQLD" primarykeys="NodeId">
        <param name="wan" comment="Use WAN TCP setting as default" type="bool"
            default="false"/>
        <param name="HostName" comment="Name of computer for this node"
            type="string" default=""/>
        <param name="Id" comment="NodeId" type="unsigned" mandatory="true"
            min="1" max="255" deprecated="true"/>
        <param name="NodeId" comment="Number identifying application node (mysqld(API))"
            type="unsigned" mandatory="true" min="1" max="255"/>
        <param name="ExecuteOnComputer" comment="HostName" type="string"
            deprecated="true"/>
        ...
    </section>
    ...
</configvariables>
```


\section*{Note}

Normally, the XML output produced by ndb_config --configinfo --xml is formatted using one line per element; we have added extra whitespace in the previous example, as well as the next one, for reasons of legibility. This should not make any difference to applications using this output, since most XML processors either ignore nonessential whitespace as a matter of course, or can be instructed to do so.

The XML output also indicates when changing a given parameter requires that data nodes be restarted using the --initial option. This is shown by the presence of an initial="true" attribute in the corresponding <param> element. In addition, the restart type (system or node) is also shown; if a given parameter requires a system restart, this is indicated by the presence of a restart="system" attribute in the corresponding <param> element. For example, changing the value set for the Diskless parameter requires a system initial restart, as shown here (with the restart and initial attributes highlighted for visibility):
```
<param name="Diskless" comment="Run wo/ disk" type="bool" default="false"
    restart="system" initial="true"/>
```


Currently, no initial attribute is included in the XML output for <param> elements corresponding to parameters which do not require initial restarts; in other words, initial="false" is the default, and the value false should be assumed if the attribute is not present. Similarly, the default restart type is node (that is, an online or "rolling" restart of the cluster), but the restart attribute is included only if the restart type is system (meaning that all cluster nodes must be shut down at the same time, then restarted).

Deprecated parameters are indicated in the XML output by the deprecated attribute, as shown here:
```
<param name="NoOfDiskPagesToDiskAfterRestartACC" comment="DiskCheckpointSpeed"
    type="unsigned" default="20" min="1" max="4294967039" deprecated="true"/>
```


In such cases, the comment refers to one or more parameters that supersede the deprecated parameter. Similarly to initial, the deprecated attribute is indicated only when the parameter is deprecated, with deprecated="true", and does not appear at all for parameters which are not deprecated. (Bug \#21127135)

Parameters that are required are indicated with mandatory="true", as shown here:
```
<param name="NodeId"
    comment="Number identifying application node (mysqld(API))"
```

type="unsigned" mandatory="true" min="1" max="255"/>

In much the same way that the initial or deprecated attribute is displayed only for a parameter that requires an initial restart or that is deprecated, the mandatory attribute is included only if the given parameter is actually required.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4180.jpg?height=102&width=103&top_left_y=504&top_left_x=338)

\section*{Important}

The --xml option can be used only with the --configinfo option. Using --xml without --configinfo fails with an error.

Unlike the options used with this program to obtain current configuration data, --configinfo and --xml use information obtained from the NDB Cluster sources when ndb_config was compiled. For this reason, no connection to a running NDB Cluster or access to a config. ini or my.cnf file is required for these two options.

Combining other ndb_config options (such as --query or --type) with --configinfo (with or without the --xml option is not supported. Currently, if you attempt to do so, the usual result is that all other options besides --configinfo or --xml are simply ignored. However, this behavior is not guaranteed and is subject to change at any time. In addition, since ndb_config, when used with the --configinfo option, does not access the NDB Cluster or read any files, trying to specify additional options such as --ndb-connectstring or --config-file with --configinfo serves no purpose.

\section*{Examples}
1. To obtain the node ID and type of each node in the cluster:
```
$> ./ndb_config --query=nodeid,type --fields=':' --rows='\n'
1:ndbd
2:ndbd
3:ndbd
4:ndbd
5:ndb_mgmd
6:mysqld
7:mysqld
8:mysqld
9:mysqld
```


In this example, we used the --fields options to separate the ID and type of each node with a colon character (:), and the --rows options to place the values for each node on a new line in the output.
2. To produce a connection string that can be used by data, SQL, and API nodes to connect to the management server:
```
$> ./ndb_config --config-file=usr/local/mysql/cluster-data/config.ini \
--query=hostname,portnumber --fields=: --rows=, --type=ndb_mgmd
198.51.100.179:1186
```

3. This invocation of ndb_config checks only data nodes (using the --type option), and shows the values for each node's ID and host name, as well as the values set for its DataMemory and DataDir parameters:
```
$> ./ndb_config --type=ndbd --query=nodeid,host,datamemory,datadir -f ' : ' -r '\n'
1 : 198.51.100.193 : 83886080 : /usr/local/mysql/cluster-data
2 : 198.51.100.112 : 83886080 : /usr/local/mysql/cluster-data
3 : 198.51.100.176 : 83886080 : /usr/local/mysql/cluster-data
4: 198.51.100.119 : 83886080 : /usr/local/mysql/cluster-data
```


In this example, we used the short options $-f$ and $-r$ for setting the field delimiter and row separator, respectively, as well as the short option - $q$ to pass a list of parameters to be obtained.
4. To exclude results from any host except one in particular, use the --host option:
```
$> ./ndb_config --host=198.51.100.176 -f : -r '\n' -q id,type
3:ndbd
5:ndb_mgmd
```


In this example, we also used the short form $-q$ to determine the attributes to be queried.
Similarly, you can limit results to a node with a specific ID using the --nodeid option.

\subsection*{25.5.8 ndb_delete_all — Delete All Rows from an NDB Table}
ndb_delete_all deletes all rows from the given NDB table. In some cases, this can be much faster than DELETE or even TRUNCATE TABLE.

\section*{Usage}
ndb_delete_all -c connection_string tbl_name -d db_name
This deletes all rows from the table named $t b l \_n a m e$ in the database named $d b \_n a m e$. It is exactly equivalent to executing TRUNCATE db_name.tbl_name in MySQL.

Options that can be used with ndb_delete_all are shown in the following table. Additional descriptions follow the table.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --database, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - database=name \\
\hline Type & String \\
\hline Default Value & TEST_DB \\
\hline
\end{tabular}

Name of the database containing the table to delete from.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=path \\
\hline Type & String \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --diskscan

\begin{tabular}{|l|l|}
\hline Command-Line Format & --diskscan \\
\hline
\end{tabular}

Run a disk scan.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display help text and exit.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login - path=path \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & [none] \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;]
[host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb -mgmd - host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - tls - search - path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb - tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb - tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --transactional, -t

Use of this option causes the delete operation to be performed as a single transaction.

\section*{Warning}

With very large tables, using this option may cause the number of operations available to the cluster to be exceeded.
- --tupscan

Run a tuple scan.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - - help.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.

\subsection*{25.5.9 ndb_desc — Describe NDB Tables}
ndb_desc provides a detailed description of one or more NDB tables.

\section*{Usage}
```
ndb_desc -c connection_string tbl_name -d db_name [options]
ndb_desc -c connection_string index_name -d db_name -t tbl_name
```


Additional options that can be used with ndb_desc are listed later in this section.

\section*{Sample Output}

MySQL table creation and population statements:
```
USE test;
CREATE TABLE fish (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(20) NOT NULL,
    length_mm INT NOT NULL,
    weight_gm INT NOT NULL,
    PRIMARY KEY pk (id),
    UNIQUE KEY uk (name)
) ENGINE=NDB;
INSERT INTO fish VALUES
    (NULL, 'guppy', 35, 2), (NULL, 'tuna', 2500, 150000),
    (NULL, 'shark', 3000, 110000), (NULL, 'manta ray', 1500, 50000),
    (NULL, 'grouper', 900, 125000), (NULL ,'puffer', 250, 2500);
```


Output from ndb_desc:
```
$> ./ndb_desc -c localhost fish -d test -p
-- fish --
Version: 2
Fragment type: HashMapPartition
K Value: 6
Min load factor: 78
Max load factor: 80
Temporary table: no
Number of attributes: 4
Number of primary keys: 1
Length of frm data: 337
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
Table options:
HashMap: DEFAULT-HASHMAP-3840-2
-- Attributes --
id Int PRIMARY KEY DISTRIBUTION KEY AT=FIXED ST=MEMORY AUTO_INCR
name Varchar(20;latin1_swedish_ci) NOT NULL AT=SHORT_VAR ST=MEMORY DYNAMIC
length_mm Int NOT NULL AT=FIXED ST=MEMORY DYNAMIC
weight_gm Int NOT NULL AT=FIXED ST=MEMORY DYNAMIC
-- Indexes --
PRIMARY KEY(id) - UniqueHashIndex
PRIMARY(id) - OrderedIndex
uk(name) - OrderedIndex
uk$unique(name) - UniqueHashIndex
-- Per partition info --

\begin{tabular}{llllll} 
Partition & Row count & Commit count & Frag fixed memory & Frag varsized memory & Ext \\
0 & 2 & 2 & 32768 & 32768 & 0
\end{tabular}
```

\begin{tabular}{lllll|l}
1 & 4 & 32768 & 32768 & 0
\end{tabular}
Information about multiple tables can be obtained in a single invocation of ndb_desc by using their names, separated by spaces. All of the tables must be in the same database.

You can obtain additional information about a specific index using the --table (short form: - t) option and supplying the name of the index as the first argument to ndb_desc, as shown here:
```
$> ./ndb_desc uk -d test -t fish
-- uk --
Version: 2
Base table: fish
Number of attributes: 1
Logging: 0
Index type: OrderedIndex
Index status: Retrieved
-- Attributes --
name Varchar(20;latin1_swedish_ci) NOT NULL AT=SHORT_VAR ST=MEMORY
-- IndexTable 10/uk --
Version: 2
Fragment type: FragUndefined
K Value: 6
Min load factor: 78
Max load factor: 80
Temporary table: yes
Number of attributes: 2
Number of primary keys: 1
Length of frm data: 0
Max Rows: 0
Row Checksum: 1
Row GCI: 1
SingleUserMode: 2
ForceVarPart: 0
PartitionCount: 2
FragmentCount: 2
FragmentCountType: ONE_PER_LDM_PER_NODE
ExtraRowGciBits: 0
ExtraRowAuthorBits: 0
TableStatus: Retrieved
Table options:
-- Attributes --
name Varchar(20;latin1_swedish_ci) NOT NULL AT=SHORT_VAR ST=MEMORY
NDB$TNODE Unsigned [64] PRIMARY KEY DISTRIBUTION KEY AT=FIXED ST=MEMORY
-- Indexes --
PRIMARY KEY(NDB$TNODE) - UniqueHashIndex
```


When an index is specified in this way, the --extra-partition-info and--extra-node-info options have no effect.

The Version column in the output contains the table's schema object version. For information about interpreting this value, see NDB Schema Object Versions.

Three of the table properties that can be set using NDB_TABLE comments embedded in CREATE TABLE and ALTER TABLE statements are also visible in ndb_desc output. The table's FRAGMENT_COUNT_TYPE is always shown in the FragmentCountType column. READ_ONLY and FULLY_REPLICATED, if set to 1 , are shown in the Table options column. You can see this after executing the following ALTER TABLE statement in the mysql client:
```
mysql> ALTER TABLE fish COMMENT='NDB_TABLE=READ_ONLY=1,FULLY_REPLICATED=1';
1 row in set, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
+---------+-------+---------------------------------------------------------------------------------------
|
+
| Warning | 1296 | Got error 4503 'Table property is FRAGMENT_COUNT_TYPE=ONE_PER_LDM_PER_NODE but not in cc
+---------+-------+---------------------------------------------------------------------------------------
1 row in set (0.00 sec)
```


The warning is issued because READ_ONLY=1 requires that the table's fragment count type is (or be set to) ONE_PER_LDM_PER_NODE_GROUP; NDB sets this automatically in such cases. You can check that the ALTER TABLE statement has the desired effect using SHOW CREATE TABLE:
```
mysql> SHOW CREATE TABLE fish\G
************************** 1. row
        Table: fish
Create Table: CREATE TABLE ˋfishˋ (
    ˋidˋ int(11) NOT NULL AUTO_INCREMENT,
    ˋnameˋ varchar(20) NOT NULL,
    ˋlength_mmˋ int(11) NOT NULL,
    ˋweight_gmˋ int(11) NOT NULL,
    PRIMARY KEY (ˋidˋ),
    UNIQUE KEY ˋukˋ (ˋnameˋ)
) ENGINE=ndbcluster DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='NDB_TABLE=READ_BACKUP=1,FULLY_REPLICATED=1'
1 row in set (0.01 sec)
```


Because FRAGMENT_COUNT_TYPE was not set explicitly, its value is not shown in the comment text printed by SHOW CREATE TABLE. ndb_desc, however, displays the updated value for this attribute. The Table options column shows the binary properties just enabled. You can see this in the output shown here (emphasized text):
```
$> ./ndb_desc -c localhost fish -d test -p
-- fish --
Version: 4
Fragment type: HashMapPartition
K Value: 6
Min load factor: 78
Max load factor: 80
Temporary table: no
Number of attributes: 4
Number of primary keys: 1
Length of frm data: 380
Max Rows: 0
Row Checksum: 1
Row GCI: 1
SingleUserMode: 0
ForceVarPart: 1
PartitionCount: 1
FragmentCount: 1
FragmentCountType: ONE_PER_LDM_PER_NODE_GROUP
ExtraRowGciBits: 0
ExtraRowAuthorBits: 0
TableStatus: Retrieved
Table options: readbackup, fullyreplicated
HashMap: DEFAULT-HASHMAP-3840-1
-- Attributes --
id Int PRIMARY KEY DISTRIBUTION KEY AT=FIXED ST=MEMORY AUTO_INCR
name Varchar(20;latin1_swedish_ci) NOT NULL AT=SHORT_VAR ST=MEMORY DYNAMIC
length_mm Int NOT NULL AT=FIXED ST=MEMORY DYNAMIC
weight_gm Int NOT NULL AT=FIXED ST=MEMORY DYNAMIC
-- Indexes --
PRIMARY KEY(id) - UniqueHashIndex
PRIMARY(id) - OrderedIndex
uk(name) - OrderedIndex
uk$unique(name) - UniqueHashIndex
-- Per partition info --
Partition Row count Commit count Frag fixed memory Frag varsized memory Extent
```


For more information about these table properties, see Section 15.1.20.12, "Setting NDB Comment Options".

The Extent_space and Free extent_space columns are applicable only to NDB tables having columns on disk; for tables having only in-memory columns, these columns always contain the value 0.

To illustrate their use, we modify the previous example. First, we must create the necessary Disk Data objects, as shown here:

\footnotetext{
CREATE LOGFILE GROUP lg_1
}
```
    ADD UNDOFILE 'undo_1.log'
    INITIAL_SIZE 16M
    UNDO_BUFFER_SIZE 2M
    ENGINE NDB;
ALTER LOGFILE GROUP lg_1
    ADD UNDOFILE 'undo_2.log'
    INITIAL_SIZE 12M
    ENGINE NDB;
CREATE TABLESPACE ts_1
    ADD DATAFILE 'data_1.dat'
    USE LOGFILE GROUP lg_1
    INITIAL_SIZE 32M
    ENGINE NDB;
ALTER TABLESPACE ts_1
    ADD DATAFILE 'data_2.dat'
    INITIAL_SIZE 48M
    ENGINE NDB;
```

(For more information on the statements just shown and the objects created by them, see Section 25.6.11.1, "NDB Cluster Disk Data Objects", as well as Section 15.1.16, "CREATE LOGFILE GROUP Statement", and Section 15.1.21, "CREATE TABLESPACE Statement".)

Now we can create and populate a version of the fish table that stores 2 of its columns on disk (deleting the previous version of the table first, if it already exists):
```
DROP TABLE IF EXISTS fish;
CREATE TABLE fish (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(20) NOT NULL,
    length_mm INT NOT NULL,
    weight_gm INT NOT NULL,
    PRIMARY KEY pk (id),
    UNIQUE KEY uk (name)
) TABLESPACE ts_1 STORAGE DISK
ENGINE=NDB;
INSERT INTO fish VALUES
    (NULL, 'guppy', 35, 2), (NULL, 'tuna', 2500, 150000),
    (NULL, 'shark', 3000, 110000), (NULL, 'manta ray', 1500, 50000),
    (NULL, 'grouper', 900, 125000), (NULL ,'puffer', 250, 2500);
```


When run against this version of the table, ndb_desc displays the following output:
```
$> ./ndb_desc -c localhost fish -d test -p
-- fish --
Version: 1
Fragment type: HashMapPartition
K Value: 6
Min load factor: 78
Max load factor: 80
Temporary table: no
Number of attributes: 4
Number of primary keys: 1
Length of frm data: 1001
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
```

```
HashMap: DEFAULT-HASHMAP-3840-2
Tablespace id: 16
Tablespace: ts_1
-- Attributes --
id Int PRIMARY KEY DISTRIBUTION KEY AT=FIXED ST=MEMORY AUTO_INCR
name Varchar(80;utf8mb4_0900_ai_ci) NOT NULL AT=SHORT_VAR ST=MEMORY
length_mm Int NOT NULL AT=FIXED ST=DISK
weight_gm Int NOT NULL AT=FIXED ST=DISK
-- Indexes --
PRIMARY KEY(id) - UniqueHashIndex
PRIMARY(id) - OrderedIndex
uk(name) - OrderedIndex
uk$unique(name) - UniqueHashIndex
-- Per partition info --

\begin{tabular}{llllll} 
Partition & Row count & Commit count & Frag fixed memory & Frag varsized memory & Extent \\
0 & 2 & 2 & 32768 & 32768 & 1048576 \\
1 & 4 & 4 & 32768 & 32768 & 1048576
\end{tabular}
```


This means that 1048576 bytes are allocated from the tablespace for this table on each partition, of which 1044440 bytes remain free for additional storage. In other words, $1048576-1044440=4136$ bytes per partition is currently being used to store the data from this table's disk-based columns. The number of bytes shown as Free extent_space is available for storing on-disk column data from the fish table only; for this reason, it is not visible when selecting from the Information Schema FILES table.

Tablespace id and Tablespace are also displayed for Disk Data tables.
For fully replicated tables, ndb_desc shows only the nodes holding primary partition fragment replicas; nodes with copy fragment replicas (only) are ignored. You can obtain such information, using the mysql client, from the table_distribution_status, table_fragments, table_info, and table_replicas tables in the ndbinfo database.

All options that can be used with ndb_desc are shown in the following table. Additional descriptions follow the table.
- --auto-inc, -a

Show the next value for a table's AUTO_INCREMENT column, if it has one.
- --blob-info, -b

Include information about subordinate BLOB and TEXT columns.
Use of this option also requires the use of the --extra-partition-info (-p) option.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --context, -x

Show additional contextual information for the table such as schema, database name, table name, and the table's internal ID.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --database=db_name, -d

Specify the database in which the table should be found.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --extra-node-info, -n

Include information about the mappings between table partitions and the data nodes upon which they reside. This information can be useful for verifying distribution awareness mechanisms and supporting more efficient application access to the data stored in NDB Cluster.

Use of this option also requires the use of the --extra-partition-info (-p) option.
- --extra-partition-info, -p

Print additional information about the table's partitions.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display help text and exit.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connect string for connecting to ndb_mgmd. Syntax: [nodeid=id;]
[host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgmd-host=connection_string \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - tls - search - path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb - tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb - tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --retries=\#, -r

Try to connect this many times before giving up. One connect attempt is made per second.
- --table=tbl_name, -t

Specify the table in which to look for an index.
- --unqualified, -u

Use unqualified table names.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as --help.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
Table indexes listed in the output are ordered by ID.

\subsection*{25.5.10 ndb_drop_index - Drop Index from an NDB Table}
ndb_drop_index drops the specified index from an NDB table. It is recommended that you use this utility only as an example for writing NDB API applications-see the Warning later in this section for details.

\section*{Usage}
ndb_drop_index -c connection_string table_name index -d db_name
The statement shown above drops the index named index from the table in the database.
Options that can be used with ndb_drop_index are shown in the following table. Additional descriptions follow the table.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -connect - retry-delay=\# \\
\hline Type & Integer \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --database, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - database=name \\
\hline Type & String \\
\hline Default Value & TEST_DB \\
\hline
\end{tabular}

Name of the database in which the table resides.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display help text and exit.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;]
[host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-mgmd-host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|l|}
\cline { 2 - 3 } & Command-Line Format & - - ndb - nodeid=\# \\
\cline { 2 - 3 } & Type & Integer \\
\hline & Default Value & {$[$ none $]$} \\
\cline { 2 - 3 } &
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - tls - search - path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb - tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb - tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - -help.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.

\section*{Warning}

Operations performed on Cluster table indexes using the NDB API are not visible to MySQL and make the table unusable by a MySQL server. If you use this program to drop an index, then try to access the table from an SQL node,
```
$> ./ndb_drop_index -c localhost dogs ix -d ctest1
Dropping index dogs/idx...OK
$> ./mysql -u jon -p ctest1
Enter password: *******
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A
Welcome to the MySQL monitor. Commands end with ; or \g.
Your MySQL connection id is 7 to server version: 5.7.44-ndb-7.5.36
Type 'help;' or '\h' for help. Type '\c' to clear the buffer.
mysql> SHOW TABLES;
+-------------------+
| Tables_in_ctest1 |
+-------------------+
| a
| bt1
| bt2
| dogs
| employees
| fish
+-------------------+
6 rows in set (0.00 sec)
mysql> SELECT * FROM dogs;
ERROR 1296 (HY000): Got error 4243 'Index not found' from NDBCLUSTER
```


In such a case, your only option for making the table available to MySQL again is to drop the table and re-create it. You can use either the SQL statementDROP TABLE or the ndb_drop_table utility (see Section 25.5.11, "ndb_drop_table - Drop an NDB Table") to drop the table.

\subsection*{25.5.11 ndb_drop_table - Drop an NDB Table}
ndb_drop_table drops the specified NDB table. (If you try to use this on a table created with a storage engine other than NDB, the attempt fails with the error 723: No such table exists.) This operation is extremely fast; in some cases, it can be an order of magnitude faster than using a MySQL DROP TABLE statement on an NDB table.

\section*{Usage}
ndb_drop_table -c connection_string tbl_name -d db_name
Options that can be used with ndb_drop_table are shown in the following table. Additional descriptions follow the table.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --database, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - database=name \\
\hline Type & String \\
\hline Default Value & TEST_DB \\
\hline
\end{tabular}

Name of the database in which the table resides.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & [none] \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display help text and exit.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;]
[host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-mgmd-host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb-tls-search-path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb-tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb-tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - - help.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.

\subsection*{25.5.12 ndb_error_reporter — NDB Error-Reporting Utility}
ndb_error_reporter creates an archive from data node and management node log files that can be used to help diagnose bugs or other problems with a cluster. It is highly recommended that you make use of this utility when filing reports of bugs in NDB Cluster.

Options that can be used with ndb_error_reporter are shown in the following table. Additional descriptions follow the table.

\section*{Usage}
ndb_error_reporter path/to/config-file [username] [options]
This utility is intended for use on a management node host, and requires the path to the management host configuration file (usually named config.ini). Optionally, you can supply the name of a user that is able to access the cluster's data nodes using SSH, to copy the data node log files. ndb_error_reporter then includes all of these files in archive that is created in the same directory in which it is run. The archive is named ndb_error_report_YYYYMMDDhhmmss.tar.bz2, where YYYYMMDDhhmmss is a datetime string.
ndb_error_reporter also accepts the options listed here:
- --connection-timeout=timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connection-timeout=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline
\end{tabular}

Wait this many seconds when trying to connect to nodes before timing out.
- --dry-scp

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- dry-scp \\
\hline
\end{tabular}

Run ndb_error_reporter without using scp from remote hosts. Used for testing only.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display help text and exit.
- --fs

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fs \\
\hline
\end{tabular}

Copy the data node file systems to the management host and include them in the archive.
Because data node file systems can be extremely large, even after being compressed, we ask that you please do not send archives created using this option to Oracle unless you are specifically requested to do so.
- --skip-nodegroup=nodegroup_id

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - connection - timeout=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline
\end{tabular}

Skip all nodes belong to the node group having the supplied node group ID.

\subsection*{25.5.13 ndb_import - Import CSV Data Into NDB}
ndb_import imports CSV-formatted data, such as that produced by mysqldump - -tab, directly into NDB using the NDB API. ndb_import requires a connection to an NDB management server (ndb_mgmd) to function; it does not require a connection to a MySQL Server.

\section*{Usage}
ndb_import db_name file_name options
ndb_import requires two arguments. $d b \_n$ ame is the name of the database where the table into which to import the data is found; file_name is the name of the CSV file from which to read the data; this must include the path to this file if it is not in the current directory. The name of the file must match that of the table; the file's extension, if any, is not taken into consideration. Options supported by ndb_import include those for specifying field separators, escapes, and line terminators, and are described later in this section.
ndb_import rejects any empty lines which it reads from the CSV file, except when importing a single column, in which case an empty value can be used as the column value. ndb_import handles this in the same manner as a LOAD DATA statement does.
ndb_import must be able to connect to an NDB Cluster management server; for this reason, there must be an unused [api] slot in the cluster config.ini file.

To duplicate an existing table that uses a different storage engine, such as InnoDB, as an NDB table, use the mysql client to perform a SELECT INTO OUTFILE statement to export the existing table to a CSV file, then to execute a CREATE TABLE LIKE statement to create a new table having the same structure as the existing table, then perform ALTER TABLE ... ENGINE=NDB on the new table; after this, from the system shell, invoke ndb_import to load the data into the new NDB table. For example, an existing InnoDB table named myinnodb_table in a database named myinnodb can be exported into an NDB table named myndb_table in a database named myndb as shown here, assuming that you are already logged in as a MySQL user with the appropriate privileges:
1. In the mysql client:
```
mysql> USE myinnodb;
mysql> SELECT * INTO OUTFILE '/tmp/myndb_table.csv'
    > FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY '\\'
    > LINES TERMINATED BY '\n'
    > FROM myinnodbtable;
mysql> CREATE DATABASE myndb;
mysql> USE myndb;
mysql> CREATE TABLE myndb_table LIKE myinnodb.myinnodb_table;
mysql> ALTER TABLE myndb_table ENGINE=NDB;
mysql> EXIT;
Bye
$>
```


Once the target database and table have been created, a running mysqld is no longer required. You can stop it using mysqladmin shutdown or another method before proceeding, if you wish.
2. In the system shell:
```
# if you are not already in the MySQL bin directory:
$> cd path-to-mysql-bin-dir
```

```
$> ndb_import myndb /tmp/myndb_table.csv --fields-optionally-enclosed-by='"' \
    --fields-terminated-by="," --fields-escaped-by='\\'
```


The output should resemble what is shown here:
```
job-1 import myndb.myndb_table from /tmp/myndb_table.csv
job-1 [running] import myndb.myndb_table from /tmp/myndb_table.csv
job-1 [success] import myndb.myndb_table from /tmp/myndb_table.csv
job-1 imported 19984 rows in 0h0m9s at 2277 rows/s
jobs summary: defined: 1 run: 1 with success: 1 with failure: 0
$>
```


All options that can be used with ndb_import are shown in the following table. Additional descriptions follow the table.
- --abort-on-error

\begin{tabular}{|l|l|}
\hline Command-Line Format & --abort-on-error \\
\hline
\end{tabular}

Dump core on any fatal error; used for debugging only.
- --ai-increment=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ai-increment=\# \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

For a table with a hidden primary key, specify the autoincrement increment, like the auto_increment_increment system variable does in the MySQL Server.
- --ai-offset=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ai-offset=\# \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

For a table with hidden primary key, specify the autoincrement offset. Similar to the auto_increment_offset system variable.
- --ai-prefetch-sz=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ai-prefetch-sz=\# \\
\hline Type & Integer \\
\hline Default Value & 1024 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

For a table with a hidden primary key, specify the number of autoincrement values that are prefetched. Behaves like the ndb_autoincrement_prefetch_sz system variable does in the MySQL Server.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connections=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connections=\# \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Number of cluster connections to create.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --continue

\begin{tabular}{|l|l|}
\hline Command-Line Format & --continue \\
\hline
\end{tabular}

When a job fails, continue to the next job.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --csvopt=string

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -csvopt=opts \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Provides a shortcut method for setting typical CSV import options. The argument to this option is a string consisting of one or more of the following parameters:
- c: Fields terminated by comma
- d: Use defaults, except where overridden by another parameter
- n : Lines terminated by $\backslash \mathrm{n}$
- q: Fields optionally enclosed by double quote characters (")
- r: Line terminated by \r

The order of parameters used in the argument to this option is handled such that the rightmost parameter always takes precedence over any potentially conflicting parameters which have already been used in the same argument value. This also applies to any duplicate instances of a given parameter.

This option is intended for use in testing under conditions in which it is difficult to transmit escapes or quotation marks.
- --db-workers=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --db-workers=\# \\
\hline Type & Integer \\
\hline Default Value & 4 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Number of threads, per data node, executing database operations.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=path \\
\hline Type & String \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --errins-type=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --errins-type=name \\
\hline Type & Enumeration \\
\hline Default Value & [none] \\
\hline Valid Values & \begin{tabular}{l}
stopjob \\
stopall \\
sighup \\
sigint \\
list
\end{tabular} \\
\hline
\end{tabular}

Error insert type; use list as the name value to obtain all possible values. This option is used for testing purposes only.
- --errins-delay=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --errins-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 1000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & ms \\
\hline
\end{tabular}

Error insert delay in milliseconds; random variation is added. This option is used for testing purposes only.
- --fields-enclosed-by=char

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fields - enclosed - by=char \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

This works in the same way as the FIELDS ENCLOSED BY option does for the LOAD DATA statement, specifying a character to be interpreted as quoting field values. For CSV input, this is the same as --fields-optionally-enclosed-by.
- --fields-escaped-by=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fields - escaped - by=char \\
\hline Type & String \\
\hline Default Value & $\backslash$ \\
\hline
\end{tabular}

Specify an escape character in the same way as the FIELDS ESCAPED BY option does for the SQL LOAD DATA statement.
- --fields-optionally-enclosed-by=char

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fields-optionally-enclosed-by=char \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

This works in the same way as the FIELDS OPTIONALLY ENCLOSED BY option does for the LOAD DATA statement, specifying a character to be interpreted as optionally quoting field values. For CSV input, this is the same as --fields-enclosed-by.
- --fields-terminated-by=char

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fields - terminated - by=char \\
\hline Type & String \\
\hline Default Value & $\backslash t$ \\
\hline
\end{tabular}

This works in the same way as the FIELDS TERMINATED BY option does for the LOAD DATA statement, specifying a character to be interpreted as the field separator.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display help text and exit.
- --idlesleep=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --idlesleep=\# \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & ms \\
\hline
\end{tabular}

Number of milliseconds to sleep waiting for more work to perform.
- --idlespin=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --idlespin=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Number of times to retry before sleeping.
- --ignore-lines=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ignore - lines $=\#$ \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 4294967295 \\
\hline
\end{tabular}

Cause ndb_import to ignore the first \# lines of the input file. This can be employed to skip a file header that does not contain any data.
- --input-type=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --input-type=name \\
\hline Type & Enumeration \\
\hline Default Value & csv \\
\hline Valid Values & \begin{tabular}{l}
random \\
csv
\end{tabular} \\
\hline
\end{tabular}

Set the type of input type. The default is csv; random is intended for testing purposes only. .
- --input-workers=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --input-workers=\# \\
\hline Type & Integer \\
\hline Default Value & 4 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Set the number of threads processing input.
- --keep-state

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - keep-state \\
\hline
\end{tabular}

By default, ndb_import removes all state files (except non-empty * . rej files) when it completes a job. Specify this option (nor argument is required) to force the program to retain all state files instead.
- --lines-terminated-by=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- lines - terminated - by=char \\
\hline Type & String \\
\hline Default Value & \n \\
\hline
\end{tabular}

This works in the same way as the LINES TERMINATED BY option does for the LOAD DATA statement, specifying a character to be interpreted as end-of-line.
---log-level=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-level=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2 \\
\hline
\end{tabular}

Performs internal logging at the given level. This option is intended primarily for internal and development use.

In debug builds of NDB only, the logging level can be set using this option to a maximum of 4 .
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --max-rows=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-rows=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Import only this number of input data rows; the default is 0 , which imports all rows.
- --missing-ai-column

\begin{tabular}{|l|l|}
\hline Command-Line Format & --missing-ai-column='name' \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

This option can be employed when importing a single table, or multiple tables. When used, it indicates that the CSV file being imported does not contain any values for an AUTO_INCREMENT column, and that ndb_import should supply them; if the option is used and the AUTO_INCREMENT column contains any values, the import operation cannot proceed.
- --monitor=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --monitor=\# \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Periodically print the status of a running job if something has changed (status, rejected rows, temporary errors). Set to 0 to disable this reporting. Setting to 1 prints any change that is seen. Higher values reduce the frequency of this status reporting.
- --ndb-connectstring

\begin{tabular}{|l|l|} 
Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;] [host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb -mgmd - host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - tls - search - path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb-tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb-tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator.

A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-asynch

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - asynch \\
\hline
\end{tabular}

Run database operations as batches, in single transactions.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --no-hint

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - hint \\
\hline
\end{tabular}

Do not use distribution key hinting to select a data node.
- --opbatch=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --opbatch=\# \\
\hline Type & Integer \\
\hline Default Value & 256 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Set a limit on the number of operations (including blob operations), and thus the number of asynchronous transactions, per execution batch.
- --opbytes=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --opbytes=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Set a limit on the number of bytes per execution batch. Use 0 for no limit.
- --output-type=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - output - type=name \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Enumeration \\
\hline Default Value & ndb \\
\hline Valid Values & null \\
\hline
\end{tabular}

Set the output type. ndb is the default. null is used only for testing.
- --output-workers=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --output-workers=\# \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Set the number of threads processing output or relaying database operations.
- --pagesize=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - pagesize=\# \\
\hline Type & Integer \\
\hline Default Value & 4096 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Align I/O buffers to the given size.
- --pagecnt=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -pagecnt=\# \\
\hline Type & Integer \\
\hline Default Value & 64 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Set the size of I/O buffers as multiple of page size. The CSV input worker allocates buffer that is doubled in size.
- --polltimeout=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --polltimeout=\# \\
\hline Type & Integer \\
\hline Default Value & 1000 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & ms \\
\hline
\end{tabular}

Set a timeout per poll for completed asynchronous transactions; polling continues until all polls are completed, or until an error occurs.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --rejects=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rejects=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Limit the number of rejected rows (rows with permanent errors) in the data load. The default is 0 , which means that any rejected row causes a fatal error. Any rows causing the limit to be exceeded are added to the . rej file.

The limit imposed by this option is effective for the duration of the current run. A run restarted using - - resume is considered a "new" run for this purpose.
- --resume

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - resume \\
\hline
\end{tabular}

If a job is aborted (due to a temporary db error or when interrupted by the user), resume with any rows not yet processed.
- --rowbatch=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rowbatch=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & rows \\
\hline
\end{tabular}

Set a limit on the number of rows per row queue. Use 0 for no limit.
- --rowbytes=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - rowbytes=\# \\
\hline Type & Integer \\
\hline Default Value & 262144 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Set a limit on the number of bytes per row queue. Use 0 for no limit.
- --stats

\begin{tabular}{|l|l|}
\hline Command-Line Format & --stats \\
\hline
\end{tabular}

Save information about options related to performance and other internal statistics in files named *. sto and *.stt. These files are always kept on successful completion (even if --keep-state is not also specified).
- --state-dir=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --state-dir=path \\
\hline Type & String \\
\hline Default Value &. \\
\hline
\end{tabular}

Where to write the state files (tbl_name.map, tbl_name.rej, tbl_name.res, and tbl_name.stt) produced by a run of the program; the default is the current directory.
- --table=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - table=name \\
\hline Type & String \\
\hline Default Value & [input file base name] \\
\hline
\end{tabular}

By default, ndb_import attempts to import data into a table whose name is the base name of the CSV file from which the data is being read. You can override the choice of table name by specifying it with the --table option (short form - t).
- --tempdelay=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - tempdelay=\# \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & ms \\
\hline
\end{tabular}

Number of milliseconds to sleep between temporary errors.
- --temperrors=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - temperrors=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Number of times a transaction can fail due to a temporary error, per execution batch. The default is 0 , which means that any temporary error is fatal. Temporary errors do not cause any rows to be added to the .rej file.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- verbose $[=\#]$ \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & false \\
\hline
\end{tabular}

Enable verbose output.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - -help.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
As with LOAD DATA, options for field and line formatting much match those used to create the CSV file, whether this was done using SELECT INTO ... OUTFILE, or by some other means. There is no equivalent to the LOAD DATA statement STARTING WITH option.

\subsection*{25.5.14 ndb_index_stat - NDB Index Statistics Utility}
ndb_index_stat provides per-fragment statistical information about indexes on NDB tables. This includes cache version and age, number of index entries per partition, and memory consumption by indexes.

\section*{Usage}

To obtain basic index statistics about a given NDB table, invoke ndb_index_stat as shown here, with the name of the table as the first argument and the name of the database containing this table specified immediately following it, using the --database (-d) option:
```
ndb_index_stat table -d database
```


In this example, we use ndb_index_stat to obtain such information about an NDB table named mytable in the test database:
```
$> ndb_index_stat -d test mytable
table:City index:PRIMARY fragCount:2
sampleVersion:3 loadTime:1399585986 sampleCount:1994 keyBytes:7976
query cache: valid:1 sampleCount:1994 totalBytes:27916
times in ms: save: 7.133 sort: 1.974 sort per sample: 0.000
```

sampleVersion is the version number of the cache from which the statistics data is taken. Running ndb_index_stat with the --update option causes sampleVersion to be incremented.
loadTime shows when the cache was last updated. This is expressed as seconds since the Unix Epoch.
sampleCount is the number of index entries found per partition. You can estimate the total number of entries by multiplying this by the number of fragments (shown as fragCount).
sampleCount can be compared with the cardinality of SHOW INDEX or INFORMATION_SCHEMA. STATISTICS, although the latter two provide a view of the table as a whole, while ndb_index_stat provides a per-fragment average.
keyBytes is the number of bytes used by the index. In this example, the primary key is an integer, which requires four bytes for each index, so keyBytes can be calculated in this case as shown here:
```
keyBytes = sampleCount * (4 bytes per index) = 1994 * 4 = 7976
```


This information can also be obtained using the corresponding column definitions from INFORMATION_SCHEMA. COLUMNS (this requires a MySQL Server and a MySQL client application).
totalBytes is the total memory consumed by all indexes on the table, in bytes.
Timings shown in the preceding examples are specific to each invocation of ndb_index_stat.
The --verbose option provides some additional output, as shown here:
```
$> ndb_index_stat -d test mytable --verbose
random seed 1337010518
connected
loop 1 of 1
table:mytable index:PRIMARY fragCount:4
sampleVersion:2 loadTime:1336751773 sampleCount:0 keyBytes:0
read stats
query cache created
query cache: valid:1 sampleCount:0 totalBytes:0
times in ms: save: 20.766 sort: 0.001
disconnected
$>
```


If the output from the program is empty, this may indicate that no statistics yet exist. To force them to be created (or updated if they already exist), invoke ndb_index_stat with the --update option, or execute ANALYZE TABLE on the table in the mysql client.

\section*{Options}

The following table includes options that are specific to the NDB Cluster ndb_index_stat utility. Additional descriptions are listed following the table.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & [none] \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --database=name, -d name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --database=name \\
\hline Type & String \\
\hline Default Value & [none] \\
\hline Minimum Value & \\
\hline Maximum Value & \\
\hline
\end{tabular}

The name of the database that contains the table being queried.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=path \\
\hline Type & String \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --delete

\begin{tabular}{|l|l|}
\hline Command-Line Format & --delete \\
\hline
\end{tabular}

Delete the index statistics for the given table, stopping any auto-update that was previously configured.
- --dump

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - dump \\
\hline
\end{tabular}

Dump the contents of the query cache.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display help text and exit.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login - path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --loops=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --loops=\# \\
\hline Type & Numeric \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & MAX_INT \\
\hline
\end{tabular}

Repeat commands this number of times (for use in testing).
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- - ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;] [host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgmd-host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb-tls-search-path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb-tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb-tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --query=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -query=\# \\
\hline Type & Numeric \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & MAX_INT \\
\hline
\end{tabular}

Perform random range queries on first key attribute (must be int unsigned).
- --sys-drop

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sys-drop \\
\hline
\end{tabular}

Drop all statistics tables and events in the NDB kernel. This causes all statistics to be lost.
- --sys-create

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sys-create \\
\hline
\end{tabular}

Create all statistics tables and events in the NDB kernel. This works only if none of them exist previously.
- --sys-create-if-not-exist

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sys-create-if-not-exist \\
\hline
\end{tabular}

Create any NDB system statistics tables or events (or both) that do not already exist when the program is invoked.
- --sys-create-if-not-valid

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sys-create-if-not-valid \\
\hline
\end{tabular}

Create any NDB system statistics tables or events that do not already exist, after dropping any that are invalid.
- --sys-check

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sys-check \\
\hline
\end{tabular}

Verify that all required system statistics tables and events exist in the NDB kernel.
- --sys-skip-tables

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sys-skip-tables \\
\hline
\end{tabular}

Do not apply any --sys - * options to any statistics tables.
- --sys-skip-events

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sys-skip-events \\
\hline
\end{tabular}

Do not apply any --sys - * options to any events.
- --update

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - update \\
\hline
\end{tabular}

Update the index statistics for the given table, and restart any auto-update that was previously configured.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - -help.
- --verbose

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Turn on verbose output.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
ndb_index_stat system options. The following options are used to generate and update the statistics tables in the NDB kernel. None of these options can be mixed with statistics options (see ndb_index_stat statistics options).
- --sys-drop
- --sys-create
- --sys-create-if-not-exist
- --sys-create-if-not-valid
- --sys-check
- --sys-skip-tables
- --sys-skip-events
ndb_index_stat statistics options. The options listed here are used to generate index statistics.
They work with a given table and database. They cannot be mixed with system options (see ndb_index_stat system options).
- --database
- --delete
- --update
- - - dump
- --query

\subsection*{25.5.15 ndb_move_data - NDB Data Copy Utility}

\section*{Usage}

The program is invoked with the names of the source and target tables; either or both of these may be qualified optionally with the database name. Both tables must use the NDB storage engine.
ndb_move_data options source target
Options that can be used with ndb_move_data are shown in the following table. Additional descriptions follow the table.
- --abort-on-error

\begin{tabular}{|l|l|}
\hline Command-Line Format & --abort-on-error \\
\hline
\end{tabular}

Dump core on permanent error (debug option).
- --character-sets-dir=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Directory where character sets are.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --database=dbname, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - database=name \\
\hline Type & String \\
\hline Default Value & TEST_DB \\
\hline
\end{tabular}

Name of the database in which the table is found.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - defaults - file=path \\
\hline Type & String \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --drop-source

\begin{tabular}{|l|l|}
\hline Command-Line Format & --drop-source \\
\hline
\end{tabular}

Drop source table after all rows have been moved.
- --error-insert

\begin{tabular}{|l|l|}
\hline Command-Line Format & --error-insert \\
\hline
\end{tabular}

Insert random temporary errors (testing option).
- --exclude-missing-columns

\begin{tabular}{|l|l|}
\hline Command-Line Format & --exclude-missing-columns \\
\hline
\end{tabular}

Ignore extra columns in source or target table.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display help text and exit.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login - path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --lossy-conversions, -l

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lossy-conversions \\
\hline
\end{tabular}

Allow attribute data to be truncated when converted to a smaller type.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- - ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;] [host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-mgmd-host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use --skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb-tls-search-path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb-tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb-tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --promote-attributes, -A

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- promote-attributes \\
\hline
\end{tabular}

Allow attribute data to be converted to a larger type.

\begin{tabular}{|l|l|} 
Type & String \\
\hline Default Value & $0,1000,60000$ \\
\hline
\end{tabular}

Specify tries on temporary errors. Format is $x[, y[, z]]$ where $x=$ max tries $(0=$ no limit $)$, $y=$ min delay (ms), $z=$ max delay (ms).
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - - help.
- --verbose

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Enable verbose messages.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.

\subsection*{25.5.16 ndb_perror — Obtain NDB Error Message Information}
ndb_perror shows information about an NDB error, given its error code. This includes the error message, the type of error, and whether the error is permanent or temporary. This is intended as a drop-in replacement for perror--ndb, which is no longer supported.

\section*{Usage}
ndb_perror [options] error_code
ndb_perror does not need to access a running NDB Cluster, or any nodes (including SQL nodes). To view information about a given NDB error, invoke the program, using the error code as an argument, like this:
\$> ndb_perror 323
NDB error code 323: Invalid nodegroup id, nodegroup already existing: Permanent error: Application error
To display only the error message, invoke ndb_perror with the --silent option (short form -s), as shown here:
\$> ndb_perror -s 323
Invalid nodegroup id, nodegroup already existing: Permanent error: Application error
Like perror, ndb_perror accepts multiple error codes:
\$> ndb_perror 3211001
NDB error code 321: Invalid nodegroup id: Permanent error: Application error
NDB error code 1001: Illegal connect string
Additional program options for ndb_perror are described later in this section.
ndb_perror replaces perror - - ndb, which is no longer supported by NDB Cluster. To make substitution easier in scripts and other applications that might depend on perror for obtaining NDB error information, ndb_perror supports its own "dummy" --ndb option, which does nothing.

The following table includes all options that are specific to the NDB Cluster program ndb_perror. Additional descriptions follow the table.

\section*{Additional Options}
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display program help text and exit.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- -login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --ndb

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb \\
\hline
\end{tabular}

For compatibility with applications depending on old versions of perror that use that program's - ndb option. The option when used with ndb_perror does nothing, and is ignored by it.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --silent, -s

\begin{tabular}{|l|l|}
\hline Command-Line Format & --silent \\
\hline
\end{tabular}

Show error message only.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Print program version information and exit.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Verbose output; disable with --silent.

\subsection*{25.5.17 ndb_print_backup_file - Print NDB Backup File Contents}
ndb_print_backup_file obtains diagnostic information from a cluster backup file.

\section*{Usage}
ndb_print_backup_file [-P password] file_name
file_name is the name of a cluster backup file. This can be any of the files (.Data,.ctl, or.log file) found in a cluster backup directory. These files are found in the data node's backup directory under the subdirectory BACKUP - \#, where \# is the sequence number for the backup. For more information about cluster backup files and their contents, see Section 25.6.8.1, "NDB Cluster Backup Concepts".

Like ndb_print_schema_file and ndb_print_sys_file (and unlike most of the other NDB utilities that are intended to be run on a management server host or to connect to a management server) ndb_print_backup_file must be run on a cluster data node, since it accesses the data node file system directly. Because it does not make use of the management server, this utility can be used when the management server is not running, and even when the cluster has been completely shut down.

This program can also be used to read undo log files.

\section*{Options}
ndb_print_backup_file supports the options described in the following list.
- --backup-key, -K

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - backup - key=key \\
\hline
\end{tabular}

Specify the key needed to decrypt an encrypted backup.
- --backup-key-from-stdin

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - backup-key-from-stdin \\
\hline
\end{tabular}

Allow input of the decryption key from standard input, similar to entering a password after invoking mysql --password with no password supplied.
- --backup-password

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - backup-password=password \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Specify the password needed to decrypt an encrypted backup.
- --backup-password-from-stdin

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - backup-password-from-stdin \\
\hline
\end{tabular}

Allow input of the password from standard input, similar to entering a password after invoking mysql --password with no password supplied.
- --control-directory-number

\begin{tabular}{|l|l|}
\hline Command-Line Format & --control-directory-number $=\#$ \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline
\end{tabular}

Control file directory number. Used together with --print-restored-rows.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=path \\
\hline Type & String \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --fragment-id

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fragment - id $=\#$ \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Integer \\
\hline Default Value & 0 \\
\hline
\end{tabular}

Fragment ID. Used together with - - print-restored-rows.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -help \\
& - -usage \\
\hline
\end{tabular}

Print program usage information.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login - path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --no-print-rows

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - print - rows \\
\hline
\end{tabular}

Do not include rows in output.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --print-header-words

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - print-header-words \\
\hline
\end{tabular}

Include header words in output.
- --print-restored-rows

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-restored-rows \\
\hline
\end{tabular}

Include restored rows in output, using the file LCP/c/TtFf.ctl, for which the values are set as follows:
- $c$ is the control file number set using--control-directory-number
- $t$ is the table ID set using--table-id
- $f$ is the fragment ID set using --fragment-id
- --print-rows

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - print - rows \\
\hline
\end{tabular}

Print rows. This option is enabled by default; to disable it, use --no-print-rows.
- --print-rows-per-page

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - print - rows - per - page \\
\hline
\end{tabular}

Print rows per page.
- --rowid-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - rowid - file=path \\
\hline Type & File name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

File to check for row ID.
- --show-ignored-rows

\begin{tabular}{|l|l|}
\hline Command-Line Format & --show-ignored-rows \\
\hline
\end{tabular}

Show ignored rows.
- --table-id

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - table - id=\# \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Table ID. Used together with - - print - restored - rows.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - - help.
- --verbose

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- verbose $[=\#]$ \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline
\end{tabular}

Verbosity level of output. A greater value indicates increased verbosity.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.

\subsection*{25.5.18 ndb_print_file - Print NDB Disk Data File Contents}
ndb_print_file obtains information from an NDB Cluster Disk Data file.

\section*{Usage}
ndb_print_file [-v] [-q] file_name+
file_name is the name of an NDB Cluster Disk Data file. Multiple filenames are accepted, separated by spaces.

Like ndb_print_schema_file and ndb_print_sys_file (and unlike most of the other NDB utilities that are intended to be run on a management server host or to connect to a management server) ndb_print_file must be run on an NDB Cluster data node, since it accesses the data node file system directly. Because it does not make use of the management server, this utility can be used when the management server is not running, and even when the cluster has been completely shut down.

\section*{Options}
ndb_print_file supports the following options:
- --file-key, -K

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- file-key=hex_data \\
\hline
\end{tabular}

Supply file system encryption or decryption key from stdin, tty, or a my.cnf file.
- --file-key-from-stdin

\begin{tabular}{|l|l|}
\hline Command-Line Format & --file-key-from-stdin \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline Valid Values & TRUE \\
\hline
\end{tabular}

Supply file system encryption or decryption key from stdin.
- --help, -h, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Print help message and exit.
- --quiet, -q

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - quiet \\
\hline
\end{tabular}

Suppress output (quiet mode).
- --usage, - ?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Print help message and exit.
- - -verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Make output verbose.
- --version, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Print version information and exit.
For more information, see Section 25.6.11, "NDB Cluster Disk Data Tables".

\subsection*{25.5.19 ndb_print_frag_file — Print NDB Fragment List File Contents}
ndb_print_frag_file obtains information from a cluster fragment list file. It is intended for use in helping to diagnose issues with data node restarts.

\section*{Usage}
ndb_print_frag_file file_name
file_name is the name of a cluster fragment list file, which matches the pattern SX. FragList, where $X$ is a digit in the range $2-9$ inclusive, and are found in the data node file system of the data node having the node ID nodeid, in directories named ndb_nodeid_fs/DN/DBDIH/, where $N$ is 1 or 2 . Each fragment file contains records of the fragments belonging to each NDB table. For more information about cluster fragment files, see NDB Cluster Data Node File System Directory.

Like ndb_print_backup_file, ndb_print_sys_file, and ndb_print_schema_file (and unlike most of the other NDB utilities that are intended to be run on a management server host or to connect to a management server), ndb_print_frag_file must be run on a cluster data node, since it accesses the data node file system directly. Because it does not make use of the management server, this utility can be used when the management server is not running, and even when the cluster has been completely shut down.

\section*{Additional Options}

None.

\section*{Sample Output}
```
$> ndb_print_frag_file /usr/local/mysqld/data/ndb_3_fs/D1/DBDIH/S2.FragList
Filename: /usr/local/mysqld/data/ndb_3_fs/D1/DBDIH/S2.FragList with size 8192
noOfPages = 1 noOfWords = 182
Table Data
Num Frags: 2 NoOfReplicas: 2 hashpointer: 4294967040
kvalue: 6 mask: 0x00000000 method: HashMap
Storage is on Logged and checkpointed, survives SR
------ Fragment with FragId: 0 --------
Preferred Primary: 2 numStoredReplicas: 2 numOldStoredReplicas: 0 distKey: 0 LogPartId: 0
-------Stored Replica----------
Replica node is: 2 initialGci: 2 numCrashedReplicas = 0 nextLcpNo = 1
LcpNo[0]: maxGciCompleted: 1 maxGciStarted: 2 lcpId: 1 lcpStatus: valid
LcpNo[1]: maxGciCompleted: 0 maxGciStarted: 0 lcpId: 0 lcpStatus: invalid
-------Stored Replica----------
Replica node is: 3 initialGci: 2 numCrashedReplicas = 0 nextLcpNo = 1
LcpNo[0]: maxGciCompleted: 1 maxGciStarted: 2 lcpId: 1 lcpStatus: valid
LcpNo[1]: maxGciCompleted: 0 maxGciStarted: 0 lcpId: 0 lcpStatus: invalid
------ Fragment with FragId: 1 --------
Preferred Primary: 3 numStoredReplicas: 2 numOldStoredReplicas: 0 distKey: 0 LogPartId: 1
-------Stored Replica----------
Replica node is: 3 initialGci: 2 numCrashedReplicas = 0 nextLcpNo = 1
LcpNo[0]: maxGciCompleted: 1 maxGciStarted: 2 lcpId: 1 lcpStatus: valid
LcpNo[1]: maxGciCompleted: 0 maxGciStarted: 0 lcpId: 0 lcpStatus: invalid
-------Stored Replica----------
Replica node is: 2 initialGci: 2 numCrashedReplicas = 0 nextLcpNo = 1
```


LcpNo[0]: maxGciCompleted: 1 maxGciStarted: 2 lcpId: 1 lcpStatus: valid
LcpNo[1]: maxGciCompleted: 0 maxGciStarted: 0 lcpId: 0 lcpStatus: invalid

\subsection*{25.5.20 ndb_print_schema_file — Print NDB Schema File Contents}
ndb_print_schema_file obtains diagnostic information from a cluster schema file.

\section*{Usage}
ndb_print_schema_file file_name
file_name is the name of a cluster schema file. For more information about cluster schema files, see NDB Cluster Data Node File System Directory.

Like ndb_print_backup_file and ndb_print_sys_file (and unlike most of the other NDB utilities that are intended to be run on a management server host or to connect to a management server) ndb_print_schema_file must be run on a cluster data node, since it accesses the data node file system directly. Because it does not make use of the management server, this utility can be used when the management server is not running, and even when the cluster has been completely shut down.

\section*{Additional Options}

None.

\subsection*{25.5.21 ndb_print_sys_file - Print NDB System File Contents}
ndb_print_sys_file obtains diagnostic information from an NDB Cluster system file.

\section*{Usage}
ndb_print_sys_file file_name
file_name is the name of a cluster system file (sysfile). Cluster system files are located in a data node's data directory (DataDir); the path under this directory to system files matches the pattern ndb_\#_fs/D\#/DBDIH/P\#. sysfile. In each case, the \# represents a number (not necessarily the same number). For more information, see NDB Cluster Data Node File System Directory.

Like ndb_print_backup_file and ndb_print_schema_file (and unlike most of the other NDB utilities that are intended to be run on a management server host or to connect to a management server) ndb_print_backup_file must be run on a cluster data node, since it accesses the data node file system directly. Because it does not make use of the management server, this utility can be used when the management server is not running, and even when the cluster has been completely shut down.

\section*{Additional Options}

None.

\subsection*{25.5.22 ndb_redo_log_reader - Check and Print Content of Cluster Redo Log}

Reads a redo log file, checking it for errors, printing its contents in a human-readable format, or both. ndb_redo_log_reader is intended for use primarily by NDB Cluster developers and Support personnel in debugging and diagnosing problems.

This utility remains under development, and its syntax and behavior are subject to change in future NDB Cluster releases.

The C++ source files for ndb_redo_log_reader can be found in the directory /storage/ndb/src/ kernel/blocks/dblqh/redoLogReader.

Options that can be used with ndb_redo_log_reader are shown in the following table. Additional descriptions follow the table.

