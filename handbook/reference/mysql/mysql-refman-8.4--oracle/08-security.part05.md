\section*{Audit Message Function}

This section describes the audit_api_message_emit_udf( ) function implemented by the audit_api_message_emit component.

Before using the audit message function, install the audit message component according to the instructions provided at Installing or Uninstalling the Audit Message Component.
- audit_api_message_emit_udf(component, producer, message[, key, value] ...)

Adds a message event to the audit log. Message events include component, producer, and message strings of the caller's choosing, and optionally a set of key-value pairs.

An event posted by this function is sent to all enabled plugins of audit type, each of which handles the event according to its own rules. If no plugin of audit type is enabled, posting the event has no effect.

Arguments:
- component: A string that specifies a component name.
- producer: A string that specifies a producer name.
- message: A string that specifies the event message.
- key, value: Events may include 0 or more key-value pairs that specify an arbitrary applicationprovided data map. Each key argument is a string that specifies a name for its immediately following value argument. Each value argument specifies a value for its immediately following key argument. Each value can be a string or numeric value, or NULL.

Return value:
The string OK to indicate success. An error occurs if the function fails.
Example:
```
mysql> SELECT audit_api_message_emit_udf('component_text',
        'producer_text',
        'message_text',
        'key1', 'value1',
        'key2', 123,
        'key3', NULL) AS 'Message';
+----------+
| Message |
+----------+
| OK |
+---------+
```


Additional information:
Each audit plugin that receives an event posted by audit_api_message_emit_udf()logs the event in plugin-specific format. For example, the audit_log plugin (see Section 8.4.5, "MySQL Enterprise Audit") logs message values as follows, depending on the log format configured by the audit_log_format system variable:
- JSON format (audit_log_format=JSON):
```
{
    "class": "message",
    "event": "user",
    ...
    "message_data": {
        "component": "component_text",
        "producer": "producer_text",
        "message": "message_text",
        "map": {
            "key1": "value1",
            "key2": 123,
            "key3": null
        }
    }
}
```

- New-style XML format (audit_log_format=NEW):
```
<AUDIT_RECORD>
    ...
    <NAME>Message</NAME>
    ...
<COMMAND_CLASS>user</COMMAND_CLASS>
<COMPONENT>component_text</COMPONENT>
<PRODUCER>producer_text</PRODUCER>
<MESSAGE>message_text</MESSAGE>
<MAP>
    <ELEMENT>
        <KEY>key1</KEY>
        <VALUE>Value1</VALUE>
    </ELEMENT>
    <ELEMENT>
        <KEY>key2</KEY>
        <VALUE>123</VALUE>
    </ELEMENT>
    <ELEMENT>
        <KEY>key3</KEY>
        <VALUE/>
    </ELEMENT>
</MAP>
</AUDIT_RECORD>
```

- Old-style XML format (audit_log_format=OLD):
```
<AUDIT_RECORD
    ...
    NAME="Message"
```

```
COMMAND_CLASS="user"
COMPONENT="component_text"
PRODUCER="producer_text"
MESSAGE="message_text"/>
```


\section*{Note}

Message events logged in old-style XML format do not include the keyvalue map due to representational constraints imposed by this format.

Messages posted by audit_api_message_emit_udf() have an event class of MYSQL_AUDIT_MESSAGE_CLASS and a subclass of MYSQL_AUDIT_MESSAGE_USER. (Internally generated audit messages have the same class and a subclass of MYSQL_AUDIT_MESSAGE_INTERNAL; this subclass currently is unused.) To refer to such events in audit_log filtering rules, use a class element with a name value of message. For example:
```
{
    "filter": {
        "class": {
            "name": "message"
        }
    }
}
```


Should it be necessary to distinguish user-generated and internally generated message events, test the subclass value against user or internal.

Filtering based on the contents of the key-value map is not supported.
For information about writing filtering rules, see Section 8.4.5.7, "Audit Log Filtering".

\subsection*{8.4.7 MySQL Enterprise Firewall}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1550.jpg?height=127&width=99&top_left_y=1580&top_left_x=306)

> Note
> MySQL Enterprise Firewall is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, see https://www.mysql.com/products/.

MySQL Enterprise Edition includes MySQL Enterprise Firewall, an application-level firewall that enables database administrators to permit or deny SQL statement execution based on matching against lists of accepted statement patterns. This helps harden MySQL Server against attacks such as SQL injection or attempts to exploit applications by using them outside of their legitimate query workload characteristics.

Each MySQL account registered with the firewall has its own statement allowlist, enabling protection to be tailored per account. For a given account, the firewall can operate in recording, protecting, or detecting mode, for training in the accepted statement patterns, active protection against unacceptable statements, or passive detection of unacceptable statements. The diagram illustrates how the firewall processes incoming statements in each mode.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 8.1 MySQL Enterprise Firewall Operation}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1551.jpg?height=1477&width=1253&top_left_y=317&top_left_x=349}
\end{figure}

The following sections describe the elements of MySQL Enterprise Firewall, discuss how to install and use it, and provide reference information for its elements.

\subsection*{8.4.7.1 Elements of MySQL Enterprise Firewall}

MySQL Enterprise Firewall is based on a plugin library that includes these elements:
- A server-side plugin named MYSQL_FIREWALL examines SQL statements before they execute and, based on the registered firewall profiles, renders a decision whether to execute or reject each statement.
- The MYSQL_FIREWALL plugin, along with server-side plugins named MYSQL_FIREWALL_USERS and MYSQL_FIREWALL_WHITELIST implement Performance Schema and INFORMATION_SCHEMA tables that provide views into the registered profiles.
- Profiles are cached in memory for better performance. Tables in the firewall database provide backing storage of firewall data for persistence of profiles across server restarts. The firewall database can be the mysql system database or a custom schema (see Installing MySQL Enterprise Firewall).
- Stored procedures perform tasks such as registering firewall profiles, establishing their operational mode, and managing transfer of firewall data between the cache and persistent storage.
- Administrative functions provide an API for lower-level tasks such as synchronizing the cache with persistent storage.
- System variables enable firewall configuration and status variables provide runtime operational information.
- The FIREWALL_ADMIN and FIREWALL_USER privileges enable users to administer firewall rules for any user, and their own firewall rules, respectively.
- The FIREWALL_EXEMPT privilege exempts a user from firewall restrictions. This is useful, for example, for any database administrator who configures the firewall, to avoid the possibility of a misconfiguration causing even the administrator to be locked out and unable to execute statements.

\subsection*{8.4.7.2 Installing or Uninstalling MySQL Enterprise Firewall}

MySQL Enterprise Firewall installation is a one-time operation that installs the elements described in Section 8.4.7.1, "Elements of MySQL Enterprise Firewall". Installation can be performed using a graphical interface or manually:
- On Windows, MySQL Configurator includes an option to enable MySQL Enterprise Firewall for you.
- MySQL Workbench 6.3.4 or higher can install MySQL Enterprise Firewall, enable or disable an installed firewall, or uninstall the firewall.
- Manual MySQL Enterprise Firewall installation involves running a script located in the share directory of your MySQL installation.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1552.jpg?height=124&width=108&top_left_y=1414&top_left_x=301)

\section*{Important}

Read this entire section before following its instructions. Parts of the procedure differ depending on your environment.

\section*{Note}

If installed, MySQL Enterprise Firewall involves some minimal overhead even when disabled. To avoid this overhead, do not install the firewall unless you plan to use it.

For usage instructions, see Section 8.4.7.3, "Using MySQL Enterprise Firewall". For reference information, see Section 8.4.7.4, "MySQL Enterprise Firewall Reference".
- Installing MySQL Enterprise Firewall
- Uninstalling MySQL Enterprise Firewall

\section*{Installing MySQL Enterprise Firewall}

If MySQL Enterprise Firewall is already installed from an older version of MySQL, uninstall it using the instructions given later in this section and then restart your server before installing the current version. In this case, it is also necessary to register your configuration again.

On Windows, you can use Section 2.3.2, "Configuration: Using MySQL Configurator" to install MySQL Enterprise Firewall by checking the Enable MySQL Enterprise Firewall check box from the Type and Networking tab. (Open Firewall port for network access has a different purpose. It refers to Windows Firewall and controls whether Windows blocks the TCP/IP port on which the MySQL server listens for client connections.)

To install MySQL Enterprise Firewall using MySQL Workbench, see MySQL Enterprise Firewall Interface.

To install MySQL Enterprise Firewall manually, look in the share directory of your MySQL installation and choose the script that is appropriate for your platform. The available scripts differ in the file name used to refer to the script:
- win_install_firewall.sql
- linux_install_firewall.sql

The installation script creates stored procedures and tables in the firewall database you specify when you run the script. The mysql system database is the traditional storage option, however, it is preferred that you create and use a custom schema for this purpose.

To use the mysql system database, run the script as follows from the command line. The example here uses the Linux installation script. Make the appropriate substitutions for your system.
```
$> mysql -u root -p -D mysql < linux_install_firewall.sql
Enter password: (enter root password here)
```


To create and use a custom schema with the script, do the following:
1. Start the server with the--loose-mysql-firewall-database=database-name option. Insert the name of the custom schema to be used as the firewall database.

By prefixing the option with --loose, the program does not emit an error and exit, but instead issues only a warning.
2. Invoke the MySQL client program and create the custom schema on the server.
```
mysql> CREATE DATABASE IF NOT EXISTS database-name;
```

3. Run the script, naming the custom schema as the database for MySQL Enterprise Firewall.
```
$> mysql -u root -p -D database-name < linux_install_firewall.sql
Enter password: (enter root password here)
```


Installing MySQL Enterprise Firewall either using a graphical interface or manually should enable the firewall. To verify that, connect to the server and execute this statement:
```
mysql> SHOW GLOBAL VARIABLES LIKE 'mysql_firewall_mode';
+-----------------------+-------+
| Variable_name | Value |
+----------------------+-------+
| mysql_firewall_mode | ON |
+-----------------------+-------+
```


If the plugin fails to initialize, check the server error log for diagnostic messages.

\section*{Note}

To use MySQL Enterprise Firewall in the context of source/replica replication, Group Replication, or InnoDB Cluster, you must prepare the replica nodes prior to running the installation script on the source node. This is necessary because the INSTALL PLUGIN statements in the script are not replicated.
1. On each replica node, extract the INSTALL PLUGIN statements from the installation script and execute them manually.
2. On the source node, run the installation script as described previously.

\section*{Uninstalling MySQL Enterprise Firewall}

MySQL Enterprise Firewall can be uninstalled using MySQL Workbench or manually.
To uninstall MySQL Enterprise Firewall using MySQL Workbench 6.3.4 or higher, see MySQL Enterprise Firewall Interface, in Chapter 33, MySQL Workbench.

To uninstall MySQL Enterprise Firewall at the command line, run the uninstall script located in the share directory of your MySQL installation. The example here specifies the system database, mysql.
```
$> mysql -u root -p -D mysql < uninstall_firewall.sql
Enter password: (enter root password here)
```


If you created a custom schema when you installed MySQL Enterprise Firewall, make the appropriate substitution for your system.
```
$> mysql -u root -p -D database-name < uninstall_firewall.sql
Enter password: (enter root password here)
```


This script removes the plugins, tables, functions, and stored procedures for MySQL Enterprise Firewall.

\subsection*{8.4.7.3 Using MySQL Enterprise Firewall}

Before using MySQL Enterprise Firewall, install it according to the instructions provided in Section 8.4.7.2, "Installing or Uninstalling MySQL Enterprise Firewall".

This section describes how to configure MySQL Enterprise Firewall using SQL statements. Alternatively, MySQL Workbench 6.3.4 or higher provides a graphical interface for firewall control. See MySQL Enterprise Firewall Interface.
- Enabling or Disabling the Firewall
- Scheduling Firewall Cache Reloads
- Assigning Firewall Privileges
- Firewall Concepts
- Registering Firewall Group Profiles
- Registering Firewall Account Profiles
- Monitoring the Firewall
- Migrating Account Profiles to Group Profiles

\section*{Enabling or Disabling the Firewall}

To enable or disable the firewall, set the mysql_firewall_mode system variable. By default, this variable is enabled when the firewall is installed. To control the initial firewall state explicitly, you can set the variable at server startup. For example, to enable the firewall in an option file, use these lines:
```
[mysqld]
mysql_firewall_mode=0N
```


After modifying my.cnf, restart the server to cause the new setting to take effect.
Alternatively, to set and persist the firewall setting at runtime:
```
SET PERSIST mysql_firewall_mode = OFF;
SET PERSIST mysql_firewall_mode = ON;
```


SET PERSIST sets a value for the running MySQL instance. It also saves the value, causing it to carry over to subsequent server restarts. To change a value for the running MySQL instance without having it carry over to subsequent restarts, use the GLOBAL keyword rather than PERSIST. See Section 15.7.6.1, "SET Syntax for Variable Assignment".

\section*{Scheduling Firewall Cache Reloads}

Each time the MYSQL_FIREWALL server-side plugin initializes, it loads data from these tables to its internal cache:
- firewall_whitelist
- firewall_group_allowlist
- firewall_users
- firewall_groups
- firewall_membership

Without restarting the server or reinstalling the server-side plugin, modification of data outside of the plugin is not reflected internally. The mysql_firewall_reload_interval_seconds system variable makes it possible to force memory cache reloads from tables at specified intervals. By default, the periodic interval value is set to zero, which disables reloads.

To schedule regular cache reloads, first ensure that the scheduler component is installed and enabled (see Section 7.5.5, "Scheduler Component"). To check the status of the component:
```
SHOW VARIABLES LIKE 'component_scheduler%';
+------------------------------+-------+
| Variable_name | Value
+-------------------------------+-------|
| component_scheduler.enabled | On |
+------------------------------+-------+
```


With the firewall installed, set the mysql_firewall_reload_interval_seconds global system variable at server startup to a number between 60 and the INT_MAX macro value of the platform hosting the server. Values between zero and 60 (1 through 59 ) reset to 60 . For example:
```
$> mysqld [server-options] --mysql-firewall-reload-interval-seconds=40
...
2023-08-31T17:46:35.043468Z 0 [Warning] [MY-015031] [Server] Plugin MYSQL_FIREWALL
reported: 'Invalid reload interval specified: 40. Valid values are 0 (off) or
greater than or equal to 60. Adjusting to 60.'
...
```


Alternatively, to set and persist the firewall setting at startup, precede the read-only variable name by the PERSIST_ONLY keyword or the @@PERSIST_ONLY. qualifier:
```
SET PERSIST_ONLY mysql_firewall_reload_interval_seconds = 120;
SET @@PERSIST_ONLY.mysql_firewall_reload_interval_seconds = 120;
```


After modifying the variable, restart the server to cause the new setting to take effect.

\section*{Assigning Firewall Privileges}

With the firewall installed, grant the appropriate privileges to the MySQL account or accounts to be used for administering it. The privileges depend on which firewall operations an account should be permitted to perform:
- Grant the FIREWALL_EXEMPT privilege to any account that should be exempt from firewall restrictions. This is useful, for example, for a database administrator who configures the firewall, to avoid the possibility of a misconfiguration causing even the administrator to be locked out and unable to execute statements.
- Grant the FIREWALL_ADMIN privilege to any account that should have full administrative firewall access. (Some administrative firewall functions can be invoked by accounts that have FIREWALL_ADMIN or the deprecated SUPER privilege, as indicated in the individual function descriptions.)
- Grant the FIREWALL_USER privilege to any account that should have administrative access only for its own firewall rules.
- Grant the EXECUTE privilege for the firewall stored procedures in the firewall database. These may invoke administrative functions, so stored procedure access also requires the privileges indicated
earlier that are needed for those functions. The firewall database can be the mysql system database or a custom schema (see Installing MySQL Enterprise Firewall).

\section*{Note}

The FIREWALL_EXEMPT, FIREWALL_ADMIN, and FIREWALL_USER privileges can be granted only while the firewall is installed because the MYSQL_FIREWALL plugin defines those privileges.

\section*{Firewall Concepts}

The MySQL server permits clients to connect and receives from them SQL statements to be executed. If the firewall is enabled, the server passes to it each incoming statement that does not immediately fail with a syntax error. Based on whether the firewall accepts the statement, the server executes it or returns an error to the client. This section describes how the firewall accomplishes the task of accepting or rejecting statements.
- Firewall Profiles
- Firewall Statement Matching
- Profile Operational Modes
- Firewall Statement Handling When Multiple Profiles Apply

\section*{Firewall Profiles}

The firewall uses a registry of profiles that determine whether to permit statement execution. Profiles have these attributes:
- An allowlist. The allowlist is the set of rules that defines which statements are acceptable to the profile.
- A current operational mode. The mode enables the profile to be used in different ways. For example: the profile can be placed in training mode to establish the allowlist; the allowlist can be used for restricting statement execution or intrusion detection; the profile can be disabled entirely.
- A scope of applicability. The scope indicates which client connections the profile applies to:
- The firewall supports account-based profiles such that each profile matches a particular client account (client user name and host name combination). For example, you can register one account profile for which the allowlist applies to connections originating from admin@localhost and another account profile for which the allowlist applies to connections originating from myapp@apphost.example.com.
- The firewall supports group profiles that can have multiple accounts as members, with the profile allowlist applying equally to all members. Group profiles enable easier administration and greater flexibility for deployments that require applying a given set of allowlist rules to multiple accounts.

Initially, no profiles exist, so by default, the firewall accepts all statements and has no effect on which statements MySQL accounts can execute. To apply firewall protective capabilities, explicit action is required:
- Register one or more profiles with the firewall.
- Train the firewall by establishing the allowlist for each profile; that is, the types of statements the profile permits clients to execute.
- Place the trained profiles in protecting mode to harden MySQL against unauthorized statement execution:
- MySQL associates each client session with a specific user name and host name combination. This combination is the session account.
- For each client connection, the firewall uses the session account to determine which profiles apply to handling incoming statements from the client.

The firewall accepts only statements permitted by the applicable profile allowlists.
Most firewall principles apply identically to group profiles and account profiles. The two types of profiles differ in these respects:
- An account profile allowlist applies only to a single account. A group profile allowlist applies when the session account matches any account that is a member of the group.
- To apply an allowlist to multiple accounts using account profiles, it is necessary to register one profile per account and duplicate the allowlist across each profile. This entails training each account profile individually because each one must be trained using the single account to which it applies.

A group profile allowlist applies to multiple accounts, with no need to duplicate it for each account. A group profile can be trained using any or all of the group member accounts, or training can be limited to any single member. Either way, the allowlist applies to all members.
- Account profile names are based on specific user name and host name combinations that depend on which clients connect to the MySQL server. Group profile names are chosen by the firewall administrator with no constraints other than that their length must be from 1 to 288 characters.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1557.jpg?height=104&width=97&top_left_y=1151&top_left_x=370)

> Note
> Due to the advantages of group profiles over account profiles, and because a group profile with a single member account is logically equivalent to an account profile for that account, it is recommended that all new firewall profiles be created as group profiles. Account profiles are deprecated, and subject to removal in a future MySQL version. For assistance converting existing account profiles, see Migrating Account Profiles to Group Profiles.

The profile-based protection afforded by the firewall enables implementation of strategies such as these:
- If an application has unique protection requirements, configure it to use an account not used for any other purpose and set up a group profile or account profile for that account.
- If related applications share protection requirements, associate each application with its own account, then add these application accounts as members of the same group profile. Alternatively, configure all the applications to use the same account and associate them with an account profile for that account.

\section*{Firewall Statement Matching}

Statement matching performed by the firewall does not use SQL statements as received from clients. Instead, the server converts incoming statements to normalized digest form and firewall operation uses these digests. The benefit of statement normalization is that it enables similar statements to be grouped and recognized using a single pattern. For example, these statements are distinct from each other:
```
SELECT first_name, last_name FROM customer WHERE customer_id = 1;
select first_name, last_name from customer where customer_id = 99;
SELECT first_name, last_name FROM customer WHERE customer_id = 143;
```


But all of them have the same normalized digest form:
```
SELECT ˋfirst_nameˋ , ˋlast_nameˋ FROM ˋcustomerˋ WHERE ˋcustomer_idˋ = ?
```


By using normalization, firewall allowlists can store digests that each match many different statements received from clients. For more information about normalization and digests, see Section 29.10, "Performance Schema Statement Digests and Sampling".

\section*{Warning}

Setting the max_digest_length system variable to zero disables digest production, which also disables server functionality that requires digests, such as MySQL Enterprise Firewall.

\section*{Profile Operational Modes}

Each profile registered with the firewall has its own operational mode, chosen from these values:
- OFF: This mode disables the profile. The firewall considers it inactive and ignores it.
- RECORDING: This is the firewall training mode. Incoming statements received from a client that matches the profile are considered acceptable for the profile and become part of its "fingerprint." The firewall records the normalized digest form of each statement to learn the acceptable statement patterns for the profile. Each pattern is a rule, and the union of the rules is the profile allowlist.

A difference between group and account profiles is that statement recording for a group profile can be limited to statements received from a single group member (the training member).
- PROTECTING: In this mode, the profile allows or prevents statement execution. The firewall matches incoming statements against the profile allowlist, accepting only statements that match and rejecting those that do not. After training a profile in RECORDING mode, switch it to PROTECTING mode to harden MySQL against access by statements that deviate from the allowlist. If the mysql_firewall_trace system variable is enabled, the firewall also writes rejected statements to the error log.
- DETECTING: This mode detects but not does not block intrusions (statements that are suspicious because they match nothing in the profile allowlist). In DETECTING mode, the firewall writes suspicious statements to the error log but accepts them without denying access.

When a profile is assigned any of the preceding mode values, the firewall stores the mode in the profile. Firewall mode-setting operations also permit a mode value of RESET, but this value is not stored: setting a profile to RESET mode causes the firewall to delete all rules for the profile and set its mode to OFF.

\section*{Note}

Messages written to the error log in DETECTING mode or because mysql_firewall_trace is enabled are written as Notes, which are information messages. To ensure that such messages appear in the error log and are not discarded, make sure that error-logging verbosity is sufficient to include information messages. For example, if you are using priority-based log filtering, as described in Section 7.4.2.5, "Priority-Based Error Log Filtering (log_filter_internal)", set the log_error_verbosity system variable to a value of 3.

\section*{Firewall Statement Handling When Multiple Profiles Apply}

For simplicity, later sections that describe how to set up profiles take the perspective that the firewall matches incoming statements from a client against only a single profile, either a group profile or account profile. But firewall operation can be more complex:
- A group profile can include multiple accounts as members.
- An account can be a member of multiple group profiles.
- Multiple profiles can match a given client.

The following description covers the general case of how the firewall operates, when potentially multiple profiles apply to incoming statements.

As previously mentioned, MySQL associates each client session with a specific user name and host name combination known as the session account. The firewall matches the session account against registered profiles to determine which profiles apply to handling incoming statements from the session:
- The firewall ignores inactive profiles (profiles with a mode of OFF).
- The session account matches every active group profile that includes a member having the same user and host. There can be more than one such group profile.
- The session account matches an active account profile having the same user and host, if there is one. There is at most one such account profile.

In other words, the session account can match 0 or more active group profiles, and 0 or 1 active account profiles. This means that 0,1 , or multiple firewall profiles are applicable to a given session, for which the firewall handles each incoming statement as follows:
- If there is no applicable profile, the firewall imposes no restrictions and accepts the statement.
- If there are applicable profiles, their modes determine statement handling:
- The firewall records the statement in the allowlist of each applicable profile that is in RECORDING mode.
- The firewall writes the statement to the error log for each applicable profile in DETECTING mode for which the statement is suspicious (does not match the profile allowlist).
- The firewall accepts the statement if at least one applicable profile is in RECORDING or DETECTING mode (those modes accept all statements), or if the statement matches the allowlist of at least one applicable profile in PROTECTING mode. Otherwise, the firewall rejects the statement (and writes it to the error log if the mysql_firewall_trace system variable is enabled).

With that description in mind, the next sections revert to the simplicity of the situations when a single group profile or a single account profile apply, and cover how to set up each type of profile.

\section*{Registering Firewall Group Profiles}

MySQL Enterprise Firewall supports registration of group profiles. A group profile can have multiple accounts as its members. To use a firewall group profile to protect MySQL against incoming statements from a given account, follow these steps:
1. Register the group profile and put it in RECORDING mode.
2. Add a member account to the group profile.
3. Connect to the MySQL server using the member account and execute statements to be learned. This trains the group profile and establishes the rules that form the profile allowlist.
4. Add to the group profile any other accounts that are to be group members.
5. Switch the group profile to PROTECTING mode. When a client connects to the server using any account that is a member of the group profile, the profile allowlist restricts statement execution.
6. Should additional training be necessary, switch the group profile to RECORDING mode again, update its allowlist with new statement patterns, then switch it back to PROTECTING mode.

Observe these guidelines for firewall-related account references:
- Take note of the context in which account references occur. To name an account for firewall operations, specify it as a single quoted string ('user_name@host_name'). This differs from the usual MySQL convention for statements such as CREATE USER and GRANT, for which you quote the user and host parts of an account name separately ('user_name'@'host_name').

The requirement for naming accounts as a single quoted string for firewall operations means that you cannot use accounts that have embedded @ characters in the user name.
- The firewall assesses statements against accounts represented by actual user and host names as authenticated by the server. When registering accounts in profiles, do not use wildcard characters or netmasks:
- Suppose that an account named me@\%.example.org exists and a client uses it to connect to the server from the host abc. example. org.
- The account name contains a $\%$ wildcard character, but the server authenticates the client as having a user name of me and host name of abc.example.com, and that is what the firewall sees.
- Consequently, the account name to use for firewall operations is me@abc.example.org rather than me@\%.example.org.

The following procedure shows how to register a group profile with the firewall, train the firewall to know the acceptable statements for that profile (its allowlist), use the profile to protect MySQL against execution of unacceptable statements, and add and remove group members. The example uses a group profile name of fwgrp. The example profile is presumed for use by clients of an application that accesses tables in the sakila database (available at https://dev.mysql.com/doc/index-other.html).

Use an administrative MySQL account to perform the steps in this procedure, except those steps designated for execution by member accounts of the firewall group profile. For statements executed by member accounts, the default database should be sakila. (You can use a different database by adjusting the instructions accordingly.)
1. If necessary, create the accounts that are to be members of the fwgrp group profile and grant them appropriate access privileges. Statements for one member are shown here (choose an appropriate password):

CREATE USER 'member1'@'localhost' IDENTIFIED BY 'password'; GRANT ALL ON sakila.* TO 'member1'@'localhost';
2. Use the sp_set_firewall_group_mode() stored procedure to register the group profile with the firewall and place the profile in RECORDING (training) mode:

CALL mysql.sp_set_firewall_group_mode('fwgrp', 'RECORDING');

\section*{Note}

If you have installed MySQL Enterprise Firewall in a custom schema, then make appropriate substitution for your system. For example, if the firewall is installed in the fwdb schema, then execute the stored procedures like this:

CALL fwdb.sp_set_firewall_group_mode('fwgrp', 'RECORDING');
3. Use the sp_firewall_group_enlist() stored procedure to add an initial member account for use in training the group profile allowlist:

CALL mysql.sp_firewall_group_enlist('fwgrp', 'member1@localhost');
4. To train the group profile using the initial member account, connect to the server as member 1 from the server host so that the firewall sees a session account of member1@localhost. Then execute some statements to be considered legitimate for the profile. For example:

SELECT title, release_year FROM film WHERE film_id = 1;
UPDATE actor SET last_update = NOW() WHERE actor_id = 1;
SELECT store_id, COUNT(*) FROM inventory GROUP BY store_id;
The firewall receives the statements from the member1@localhost account. Because that account is a member of the fwgrp profile, which is in RECORDING mode, the firewall interprets the statements as applicable to fwgrp and records the normalized digest form of the statements as rules in the fwgrp allowlist. Those rules then apply to all accounts that are members of fwgrp.

\section*{Note}

Until the fwgrp group profile receives statements in RECORDING mode, its allowlist is empty, which is equivalent to "deny all." No statement can match an empty allowlist, which has these implications:
- The group profile cannot be switched to PROTECTING mode. It would reject every statement, effectively prohibiting the accounts that are group members from executing any statement.
- The group profile can be switched to DETECTING mode. In this case, the profile accepts every statement but logs it as suspicious.
5. At this point, the group profile information is cached, including its name, membership, and allowlist. To see this information, query the Performance Schema firewall tables:
```
mysql> SELECT MODE FROM performance_schema.firewall_groups
    WHERE NAME = 'fwgrp';
+------------+
| MODE |
+------------+
| RECORDING |
+-----------+
mysql> SELECT * FROM performance_schema.firewall_membership
    WHERE GROUP_ID = 'fwgrp' ORDER BY MEMBER_ID;
+----------+-------------------+
| GROUP_ID | MEMBER_ID |
+----------+--------------------+
| fwgrp | member1@localhost |
+----------+-------------------+
mysql> SELECT RULE FROM performance_schema.firewall_group_allowlist
    WHERE NAME = 'fwgrp';
+--------------------------------------------------------------------------
| RULE
+--------------------------------------------------------------------------
| SELECT @@ˋversion_commentˋ LIMIT ?
| UPDATE ˋactorˋ SET ˋlast_updateˋ = NOW ( ) WHERE ˋactor_idˋ = ?
| SELECT ˋtitleˋ , ˋrelease_yearˋ FROM ˋfilmˋ WHERE ˋfilm_idˋ = ?
| SELECT ˋstore_idˋ , COUNT ( * ) FROM ˋinventoryˋ GROUP BY ˋstore_idˋ |
+--------------------------------------------------------------------------+
```


\section*{Note}

The @@version_comment rule comes from a statement sent automatically by the mysql client when you connect to the server.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1561.jpg?height=100&width=106&top_left_y=1959&top_left_x=420)

\section*{Important}

Train the firewall under conditions matching application use. For example, to determine server characteristics and capabilities, a given MySQL connector might send statements to the server at the beginning of each session. If an application normally is used through that connector, train the firewall using the connector, too. That enables those initial statements to become part of the allowlist for the group profile associated with the application.
6. Invoke sp_set_firewall_group_mode( ) again to switch the group profile to PROTECTING mode:

CALL mysql.sp_set_firewall_group_mode('fwgrp', 'PROTECTING');

\section*{Important}

Switching the group profile out of RECORDING mode synchronizes its cached data to the firewall database tables that provide persistent
underlying storage. If you do not switch the mode for a profile that is being recorded, the cached data is not written to persistent storage and is lost when the server is restarted. The firewall database can be the mysql system database or a custom schema (see Installing MySQL Enterprise Firewall).
7. Add to the group profile any other accounts that should be members:
```
CALL mysql.sp_firewall_group_enlist('fwgrp', 'member2@localhost');
CALL mysql.sp_firewall_group_enlist('fwgrp', 'member3@localhost');
CALL mysql.sp_firewall_group_enlist('fwgrp', 'member4@localhost');
```


The profile allowlist trained using the member1@localhost account now also applies to the additional accounts.
8. To verify the updated group membership, query the firewall_membership table again:
```
mysql> SELECT * FROM performance_schema.firewall_membership
    WHERE GROUP_ID = 'fwgrp' ORDER BY MEMBER_ID;
+----------+-------------------+
| GROUP_ID | MEMBER_ID |
+----------+-------------------+
| fwgrp | member1@localhost |
| fwgrp | member2@localhost
| fwgrp | member3@localhost |
| fwgrp | member4@localhost |
+----------+-------------------+
```

9. Test the group profile against the firewall by using any account in the group to execute some acceptable and unacceptable statements. The firewall matches each statement from the account against the profile allowlist and accepts or rejects it:
- This statement is not identical to a training statement but produces the same normalized statement as one of them, so the firewall accepts it:
```
mysql> SELECT title, release_year FROM film WHERE film_id = 98;
+--------------------+--------------+
| title | release_year |
+--------------------+--------------+
| BRIGHT ENCOUNTERS | 2006 |
+---------------------+--------------+
```

- These statements match nothing in the allowlist, so the firewall rejects each with an error:
```
mysql> SELECT title, release_year FROM film WHERE film_id = 98 OR TRUE;
ERROR 1045 (28000): Statement was blocked by Firewall
mysql> SHOW TABLES LIKE 'customer%';
ERROR 1045 (28000): Statement was blocked by Firewall
mysql> TRUNCATE TABLE mysql.slow_log;
ERROR 1045 (28000): Statement was blocked by Firewall
```

- If the mysql_firewall_trace system variable is enabled, the firewall also writes rejected statements to the error log. For example:
```
[Note] Plugin MYSQL_FIREWALL reported:
'ACCESS DENIED for 'member1@localhost'. Reason: No match in allowlist.
Statement: TRUNCATE TABLE ˋmysqlˋ . ˋslow_logˋ'
```


These log messages may be helpful in identifying the source of attacks, should that be necessary.
10. Should members need to be removed from the group profile, use the sp_firewall_group_delist() stored procedure rather than sp_firewall_group_enlist():
```
CALL mysql.sp_firewall_group_delist('fwgrp', 'member3@localhost');
```


The firewall group profile now is trained for member accounts. When clients connect using any account in the group and attempt to execute statements, the profile protects MySQL against statements not matched by the profile allowlist.

The procedure just shown added only one member to the group profile before training its allowlist. Doing so provides better control over the training period by limiting which accounts can add new acceptable statements to the allowlist. Should additional training be necessary, you can switch the profile back to RECORDING mode:

CALL mysql.sp_set_firewall_group_mode('fwgrp', 'RECORDING');
However, that enables any member of the group to execute statements and add them to the allowlist. To limit the additional training to a single group member, call sp_set_firewall_group_mode_and_user(), which is like sp_set_firewall_group_mode() but takes one more argument specifying which account is permitted to train the profile in RECORDING mode. For example, to enable training only by member4@localhost, do this:

CALL mysql.sp_set_firewall_group_mode_and_user('fwgrp', 'RECORDING', 'member4@localhost');
That enables additional training by the specified account without having to remove the other group members. They can execute statements, but the statements are not added to the allowlist. (Remember, however, that in RECORDING mode the other members can execute any statement.)

\section*{Note}

To avoid unexpected behavior when a particular account is specified as the training account for a group profile, always ensure that account is a member of the group.

After the additional training, set the group profile back to PROTECTING mode:
CALL mysql.sp_set_firewall_group_mode('fwgrp', 'PROTECTING');
The training account established by sp_set_firewall_group_mode_and_user()is saved in the group profile, so the firewall remembers it in case more training is needed later. Thus, if you call sp_set_firewall_group_mode() (which takes no training account argument), the current profile training account, member4@localhost, remains unchanged.

To clear the training account if it actually is desired to enable all group members to perform training in RECORDING mode, call sp_set_firewall_group_mode_and_user ( ) and pass a NULL value for the account argument:

CALL mysql.sp_set_firewall_group_mode_and_user('fwgrp', 'RECORDING', NULL);
It is possible to detect intrusions by logging nonmatching statements as suspicious without denying access. First, put the group profile in DETECTING mode:

CALL mysql.sp_set_firewall_group_mode('fwgrp', 'DETECTING');
Then, using a member account, execute a statement that does not match the group profile allowlist. In DETECTING mode, the firewall permits the nonmatching statement to execute:
```
mysql> SHOW TABLES LIKE 'customer%';
+-------------------------------+
| Tables_in_sakila (customer%) |
+-------------------------------+
| customer
| customer_list
- |
```


In addition, the firewall writes a message to the error log:
```
[Note] Plugin MYSQL_FIREWALL reported:
'SUSPICIOUS STATEMENT from 'member1@localhost'. Reason: No match in allowlist.
Statement: SHOW TABLES LIKE ?'
```


To disable a group profile, change its mode to OFF:
```
CALL mysql.sp_set_firewall_group_mode(group, 'OFF');
```


To forget all training for a profile and disable it, reset it:
```
CALL mysql.sp_set_firewall_group_mode(group, 'RESET');
```


The reset operation causes the firewall to delete all rules for the profile and set its mode to 0FF.

\section*{Registering Firewall Account Profiles}

MySQL Enterprise Firewall enables profiles to be registered that correspond to individual accounts. To use a firewall account profile to protect MySQL against incoming statements from a given account, follow these steps:
1. Register the account profile and put it in RECORDING mode.
2. Connect to the MySQL server using the account and execute statements to be learned. This trains the account profile and establishes the rules that form the profile allowlist.
3. Switch the account profile to PROTECTING mode. When a client connects to the server using the account, the account profile allowlist restricts statement execution.
4. Should additional training be necessary, switch the account profile to RECORDING mode again, update its allowlist with new statement patterns, then switch it back to PROTECTING mode.

Observe these guidelines for firewall-related account references:
- Take note of the context in which account references occur. To name an account for firewall operations, specify it as a single quoted string ('user_name@host_name'). This differs from the usual MySQL convention for statements such as CREATE USER and GRANT, for which you quote the user and host parts of an account name separately ('user_name'@'host_name').

The requirement for naming accounts as a single quoted string for firewall operations means that you cannot use accounts that have embedded @ characters in the user name.
- The firewall assesses statements against accounts represented by actual user and host names as authenticated by the server. When registering accounts in profiles, do not use wildcard characters or netmasks:
- Suppose that an account named me@\%.example.org exists and a client uses it to connect to the server from the host abc. example. org.
- The account name contains a \% wildcard character, but the server authenticates the client as having a user name of me and host name of abc.example.com, and that is what the firewall sees.
- Consequently, the account name to use for firewall operations is me@abc.example.org rather than me@\%.example.org.

The following procedure shows how to register an account profile with the firewall, train the firewall to know the acceptable statements for that profile (its allowlist), and use the profile to protect MySQL against execution of unacceptable statements by the account. The example account, fwuser@localhost, is presumed for use by an application that accesses tables in the sakila database (available at https://dev.mysql.com/doc/index-other.html).

Use an administrative MySQL account to perform the steps in this procedure, except those steps designated for execution by the fwuser@localhost account that corresponds to the account profile registered with the firewall. For statements executed using this account, the default database should be sakila. (You can use a different database by adjusting the instructions accordingly.)
1. If necessary, create the account to use for executing statements (choose an appropriate password) and grant it privileges for the sakila database:

CREATE USER 'fwuser'@'localhost' IDENTIFIED BY 'password';
GRANT ALL ON sakila.* TO 'fwuser'@'localhost';
2. Use the sp_set_firewall_mode() stored procedure to register the account profile with the firewall and place the profile in RECORDING (training) mode:

CALL mysql.sp_set_firewall_mode('fwuser@localhost', 'RECORDING');

\section*{Note}

If you have installed MySQL Enterprise Firewall in a custom schema, then make appropriate substitution for your system. For example, if the firewall is installed in the fwdb schema, then execute the stored procedures like this:

CALL fwdb.sp_set_firewall_mode('fwuser@localhost', 'RECORDING');
3. To train the registered account profile, connect to the server as fwuser from the server host so that the firewall sees a session account of fwuser@localhost. Then use the account to execute some statements to be considered legitimate for the profile. For example:

SELECT first_name, last_name FROM customer WHERE customer_id = 1;
UPDATE rental SET return_date = NOW() WHERE rental_id = 1;
SELECT get_customer_balance(1, NOW());
Because the profile is in RECORDING mode, the firewall records the normalized digest form of the statements as rules in the profile allowlist.

\section*{Note}

Until the fwuser@localhost account profile receives statements in RECORDING mode, its allowlist is empty, which is equivalent to "deny all." No statement can match an empty allowlist, which has these implications:
- The account profile cannot be switched to PROTECTING mode. It would reject every statement, effectively prohibiting the account from executing any statement.
- The account profile can be switched to DETECTING mode. In this case, the profile accepts every statement but logs it as suspicious.
4. At this point, the account profile information is cached. To see this information, query the INFORMATION_SCHEMA firewall tables:
```
mysql> SELECT MODE FROM INFORMATION_SCHEMA.MYSQL_FIREWALL_USERS
    WHERE USERHOST = 'fwuser@localhost';
+------------+
| MODE
+------------+
| RECORDING |
+------------+
mysql> SELECT RULE FROM INFORMATION_SCHEMA.MYSQL_FIREWALL_WHITELIST
    WHERE USERHOST = 'fwuser@localhost';
+------------------------------------------------------------------------------
| RULE
|
| SELECT ˋfirst_nameˋ , ˋlast_nameˋ FROM ˋcustomerˋ WHERE ˋcustomer_idˋ = ?
| SELECT ˋget_customer_balanceˋ ( ? , NOW ( ) )
| UPDATE ˋrentalˋ SET ˋreturn_dateˋ = NOW ( ) WHERE ˋrental_idˋ = ?
| SELECT @@ˋversion_commentˋ LIMIT ?
+-----------------------------------------------------------------------------
```


\section*{Note}

The @@version_comment rule comes from a statement sent automatically by the mysql client when you connect to the server.

\section*{Important}

Train the firewall under conditions matching application use. For example, to determine server characteristics and capabilities, a given MySQL connector might send statements to the server at the beginning of each session. If an application normally is used through that connector, train the firewall using the connector, too. That enables those initial statements to become part of the allowlist for the account profile associated with the application.
5. Invoke sp_set_firewall_mode( ) again, this time switching the account profile to PROTECTING mode:

CALL mysql.sp_set_firewall_mode('fwuser@localhost', 'PROTECTING');

\section*{Important}

Switching the account profile out of RECORDING mode synchronizes its cached data to the firewall database tables that provide persistent underlying storage. If you do not switch the mode for a profile that is being recorded, the cached data is not written to persistent storage and is lost when the server is restarted. The firewall database can be the mysql system database or a custom schema (see Installing MySQL Enterprise Firewall).
6. Test the account profile by using the account to execute some acceptable and unacceptable statements. The firewall matches each statement from the account against the profile allowlist and accepts or rejects it:
- This statement is not identical to a training statement but produces the same normalized statement as one of them, so the firewall accepts it:
```
mysql> SELECT first_name, last_name FROM customer WHERE customer_id = '48';
+-------------+-----------+
| first_name | last_name |
+-------------+-----------+
| ANN | EVANS |
+-------------+------------+
```

- These statements match nothing in the allowlist, so the firewall rejects each with an error:
```
mysql> SELECT first_name, last_name FROM customer WHERE customer_id = 1 OR TRUE;
ERROR 1045 (28000): Statement was blocked by Firewall
mysql> SHOW TABLES LIKE 'customer%';
ERROR 1045 (28000): Statement was blocked by Firewall
mysql> TRUNCATE TABLE mysql.slow_log;
ERROR 1045 (28000): Statement was blocked by Firewall
```

- If the mysql_firewall_trace system variable is enabled, the firewall also writes rejected statements to the error log. For example:
```
[Note] Plugin MYSQL_FIREWALL reported:
'ACCESS DENIED for fwuser@localhost. Reason: No match in allowlist.
Statement: TRUNCATE TABLE ˋmysqlˋ . ˋslow_logˋ'
```


These log messages may be helpful in identifying the source of attacks, should that be necessary.

The firewall account profile now is trained for the fwuser@localhost account. When clients connect using that account and attempt to execute statements, the profile protects MySQL against statements not matched by the profile allowlist.

It is possible to detect intrusions by logging nonmatching statements as suspicious without denying access. First, put the account profile in DETECTING mode:
```
CALL mysql.sp_set_firewall_mode('fwuser@localhost', 'DETECTING');
```


Then, using the account, execute a statement that does not match the account profile allowlist. In DETECTING mode, the firewall permits the nonmatching statement to execute:
```
mysql> SHOW TABLES LIKE 'customer%';
+-------------------------------+
| Tables_in_sakila (customer%) |
+-------------------------------+
| customer
| customer_list |
+-------------------------------+
```


In addition, the firewall writes a message to the error log:
```
[Note] Plugin MYSQL_FIREWALL reported:
'SUSPICIOUS STATEMENT from 'fwuser@localhost'. Reason: No match in allowlist.
Statement: SHOW TABLES LIKE ?'
```


To disable an account profile, change its mode to OFF:
```
CALL mysql.sp_set_firewall_mode(user, 'OFF');
```


To forget all training for a profile and disable it, reset it:
```
CALL mysql.sp_set_firewall_mode(user, 'RESET');
```


The reset operation causes the firewall to delete all rules for the profile and set its mode to 0FF.

\section*{Monitoring the Firewall}

To assess firewall activity, examine its status variables. For example, after performing the procedure shown earlier to train and protect the fwgrp group profile, the variables look like this:
```
mysql> SHOW GLOBAL STATUS LIKE 'Firewall%';
+------------------------------+-------+
| Variable_name | Value |
+-----------------------------+-------+
| Firewall_access_denied | 3 |
| Firewall_access_granted | 4
| Firewall_access_suspicious | 1
| Firewall_cached_entries | 4
+------------------------------+-------+
```


The variables indicate the number of statements rejected, accepted, logged as suspicious, and added to the cache, respectively. The Firewall_access_granted count is 4 because of the @@version_comment statement sent by the mysql client each of the three times you connected using the registered account, plus the SHOW TABLES statement that was not blocked in DETECTING mode.

\section*{Migrating Account Profiles to Group Profiles}

MySQL Enterprise Firewall supports account profiles that each apply to a single account and also group profiles that each can apply to multiple accounts. A group profile enables easier administration when the same allowlist is to be applied to multiple accounts: instead of creating one account profile per account and duplicating the allowlist across all those profiles, create a single group profile and make the accounts members of it. The group allowlist then applies to all the accounts.

A group profile with a single member account is logically equivalent to an account profile for that account, so it is possible to administer the firewall using group profiles exclusively, rather than a mix of account and group profiles. For new firewall installations, that is accomplished by uniformly creating new profiles as group profiles and avoiding account profiles.

Due to the greater flexibility offered by group profiles, it is recommended that all new firewall profiles be created as group profiles. Account profiles are deprecated, and subject to removal in a future MySQL version. For upgrades from firewall installations that already contain account profiles, MySQL

Enterprise Firewall includes a stored procedure named sp_migrate_firewall_user_to_group( ) to help you convert account profiles to group profiles. To use it, perform the following procedure as a user who has the FIREWALL_ADMIN privilege:
1. Run the firewall_profile_migration.sql script to install the sp_migrate_firewall_user_to_group( ) stored procedure. The script is located in the share directory of your MySQL installation.

Specify the same firewall database name on the command line that you previously defined for your firewall installation. The example here specifies the system database, mysql.
```
$> mysql -u root -p -D mysql < firewall_profile_migration.sql
Enter password: (enter root password here)
```


If you installed MySQL Enterprise Firewall in a custom schema, make the appropriate substitution for your system.
2. Identify which account profiles exist by querying the Information Schema MYSQL_FIREWALL_USERS table. For example:
```
mysql> SELECT USERHOST FROM INFORMATION_SCHEMA.MYSQL_FIREWALL_USERS;
+---------------------------------+
| USERHOST
+---------------------------------+
| admin@localhost
| local_client@localhost
| remote_client@abc.example.com |
+--------------------------------+
```

3. For each account profile identified by the previous step, convert it to a group profile. Replace the mysql. prefix with the actual firewall database name, if necessary:
```
CALL mysql.sp_migrate_firewall_user_to_group('admin@localhost', 'admins');
CALL mysql.sp_migrate_firewall_user_to_group('local_client@localhost', 'local_clients');
CALL mysql.sp_migrate_firewall_user_to_group('remote_client@localhost', 'remote_clients');
```


In each case, the account profile must exist and must not currently be in RECORDING mode, and the group profile must not already exist. The resulting group profile has the named account as its single enlisted member, which is also set as the group training account. The group profile operational mode is taken from the account profile operational mode.
4. (Optional) Remove sp_migrate_firewall_user_to_group( ):

DROP PROCEDURE IF EXISTS mysql.sp_migrate_firewall_user_to_group;
If you installed MySQL Enterprise Firewall in a custom schema, make the appropriate substitution for your system.

For additional details about sp_migrate_firewall_user_to_group( ), see Firewall Miscellaneous Stored Procedures.

\subsection*{8.4.7.4 MySQL Enterprise Firewall Reference}

The following sections provide a reference to MySQL Enterprise Firewall elements:
- MySQL Enterprise Firewall Tables
- MySQL Enterprise Firewall Stored Procedures
- MySQL Enterprise Firewall Administrative Functions
- MySQL Enterprise Firewall System Variables
- MySQL Enterprise Firewall Status Variables

\section*{MySQL Enterprise Firewall Tables}

MySQL Enterprise Firewall maintains profile information on a per-group and per-account basis, using tables in the firewall database for persistent storage and Information Schema and Performance Schema tables to provide views into in-memory cached data. When enabled, the firewall bases operational decisions on the cached data. The firewall database can be the mysql system database or a custom schema (see Installing MySQL Enterprise Firewall).

Tables in the firewall database are covered in this section. For information about MySQL Enterprise Firewall Information Schema and Performance Schema tables, see Section 28.7, "INFORMATION_SCHEMA MySQL Enterprise Firewall Tables", and Section 29.12.17, "Performance Schema Firewall Tables", respectively.
- Firewall Group Profile Tables
- Firewall Account Profile Tables

\section*{Firewall Group Profile Tables}

MySQL Enterprise Firewall maintains group profile information using tables in the firewall database (mysql or custom) for persistent storage and Performance Schema tables to provide views into inmemory cached data.

Each system and Performance Schema table is accessible only by accounts that have the SELECT privilege for it.

The firewall-database.firewall_groups table lists names and operational modes of registered firewall group profiles. The table has the following columns (with the corresponding Performance Schema firewall_groups table having similar but not necessarily identical columns):
- NAME

The group profile name.
- MODE

The current operational mode for the profile. Permitted mode values are OFF, DETECTING, PROTECTING, and RECORDING. For details about their meanings, see Firewall Concepts.
- USERHOST

The training account for the group profile, to be used when the profile is in RECORDING mode. The value is NULL, or a non-NULL account that has the format user_name@host_name:
- If the value is NULL, the firewall records allowlist rules for statements received from any account that is a member of the group.
- If the value is non-NULL, the firewall records allowlist rules only for statements received from the named account (which should be a member of the group).

The firewall-database.firewall_group_allowlist table lists allowlist rules of registered firewall group profiles. The table has the following columns (with the corresponding Performance Schema firewall_group_allowlist table having similar but not necessarily identical columns):
- NAME

The group profile name.
- RULE

A normalized statement indicating an acceptable statement pattern for the profile. A profile allowlist is the union of its rules.
- ID

An integer column that is a primary key for the table.
The firewall-database.firewall_membership table lists the members (accounts) of registered firewall group profiles. The table has the following columns (with the corresponding Performance Schema firewall_membership table having similar but not necessarily identical columns):
- GROUP_ID

The group profile name.
- MEMBER_ID

The name of an account that is a member of the profile.

\section*{Firewall Account Profile Tables}

MySQL Enterprise Firewall maintains account profile information using tables in the firewall database for persistent storage and INFORMATION_SCHEMA tables to provide views into in-memory cached data. The firewall database can be the mysql system database or a custom schema (see Installing MySQL Enterprise Firewall).

Each default database table is accessible only by accounts that have the SELECT privilege for it. The INFORMATION_SCHEMA tables are accessible by anyone.

These tables are deprecated, and subject to removal in a future MySQL version. See Migrating Account Profiles to Group Profiles.

The firewall-database.firewall_users table lists names and operational modes of registered firewall account profiles. The table has the following columns (with the corresponding MYSQL_FIREWALL_USERS table having similar but not necessarily identical columns):
- USERHOST

The account profile name. Each account name has the format user_name@host_name.
- MODE

The current operational mode for the profile. Permitted mode values are OFF, DETECTING, PROTECTING, RECORDING, and RESET. For details about their meanings, see Firewall Concepts.

The firewall-database.firewall_whitelist table lists allowlist rules of registered firewall account profiles. The table has the following columns (with the corresponding MYSQL_FIREWALL_WHITELIST table having similar but not necessarily identical columns):
- USERHOST

The account profile name. Each account name has the format user_name@host_name.
- RULE

A normalized statement indicating an acceptable statement pattern for the profile. A profile allowlist is the union of its rules.
- ID

An integer column that is a primary key for the table.

\section*{MySQL Enterprise Firewall Stored Procedures}

MySQL Enterprise Firewall stored procedures perform tasks such as registering profiles with the firewall, establishing their operational mode, and managing transfer of firewall data between the cache and persistent storage. These procedures invoke administrative functions that provide an API for lowerlevel tasks.

Firewall stored procedures are created in the firewall database. The firewall database can be the mysql system database or a custom schema (see Installing MySQL Enterprise Firewall).

To invoke a firewall stored procedure, either do so while the specified firewall database is the default database, or qualify the procedure name with the database name. For example, if mysql is the firewall database:

CALL mysql.sp_set_firewall_group_mode(group, mode);
In MySQL 8.4, firewall stored procedures are transactional; if an error occurs during execution of a firewall stored procedure, all changes made by it up to that point are rolled back, and an error is reported.

\section*{Note}

If you have installed MySQL Enterprise Firewall in a custom schema, then make appropriate substitution for your system. For example, if the firewall is installed in the fwdb schema, then execute the stored procedures like this:

CALL fwdb.sp_set_firewall_group_mode(group, mode);
- Firewall Group Profile Stored Procedures
- Firewall Account Profile Stored Procedures
- Firewall Miscellaneous Stored Procedures

\section*{Firewall Group Profile Stored Procedures}

These stored procedures perform management operations on firewall group profiles:
- sp_firewall_group_delist(group, user)

This stored procedure removes an account from a firewall group profile.
If the call succeeds, the change in group membership is made to both the in-memory cache and persistent storage.

Arguments:
- group: The name of the affected group profile.
- user: The account to remove, as a string in user_name@host_name format.

Example:
CALL mysql.sp_firewall_group_delist('ɡ', 'fwuser@localhost');
- sp_firewall_group_enlist(group, user)

This stored procedure adds an account to a firewall group profile. It is not necessary to register the account itself with the firewall before adding the account to the group.

If the call succeeds, the change in group membership is made to both the in-memory cache and persistent storage.

Arguments:
- group: The name of the affected group profile.
- user: The account to add, as a string in user_name@host_name format.

Example:

\footnotetext{
CALL mysql.sp_firewall_group_enlist('ɡ', 'fwuser@localhost');
}
- sp_reload_firewall_group_rules(group)

This stored procedure provides control over firewall operation for individual group profiles. The procedure uses firewall administrative functions to reload the in-memory rules for a group profile from the rules stored in the firewall-database.firewall_group_allowlist table.

Arguments:
- group: The name of the affected group profile.

Example:
CALL mysql.sp_reload_firewall_group_rules('myapp');

\section*{Warning}

This procedure clears the group profile in-memory allowlist rules before reloading them from persistent storage, and sets the profile mode to 0FF. If the profile mode was not 0FF prior to the sp_reload_firewall_group_rules( ) call, use sp_set_firewall_group_mode( ) to restore its previous mode after reloading the rules. For example, if the profile was in PROTECTING mode, that is no longer true after calling sp_reload_firewall_group_rules() and you must set it to PROTECTING again explicitly.
- sp_set_firewall_group_mode(group, mode)

This stored procedure establishes the operational mode for a firewall group profile, after registering the profile with the firewall if it was not already registered. The procedure also invokes firewall administrative functions as necessary to transfer firewall data between the cache and persistent storage. This procedure may be called even if the mysql_firewall_mode system variable is 0FF, although setting the mode for a profile has no operational effect until the firewall is enabled.

If the profile previously existed, any recording limitation for it remains unchanged. To set or clear the limitation, call sp_set_firewall_group_mode_and_user ( ) instead.

Arguments:
- group: The name of the affected group profile.
- mode: The operational mode for the profile, as a string. Permitted mode values are OFF, DETECTING, PROTECTING, and RECORDING. For details about their meanings, see Firewall Concepts.

Example:
CALL mysql.sp_set_firewall_group_mode('myapp', 'PROTECTING');
- sp_set_firewall_group_mode_and_user(group, mode, user)

This stored procedure registers a group with the firewall and establishes its operational mode, similar to sp_set_firewall_group_mode( ), but also specifies the training account to be used when the group is in RECORDING mode.

Arguments:
- group: The name of the affected group profile.
- mode: The operational mode for the profile, as a string. Permitted mode values are OFF, DETECTING, PROTECTING, and RECORDING. For details about their meanings, see Firewall Concepts.
- user: The training account for the group profile, to be used when the profile is in RECORDING mode. The value is NULL, or a non-NULL account that has the format user_name@host_name:
- If the value is NULL, the firewall records allowlist rules for statements received from any account that is a member of the group.
- If the value is non-NULL, the firewall records allowlist rules only for statements received from the named account (which should be a member of the group).

Example:
CALL mysql.sp_set_firewall_group_mode_and_user('myapp', 'RECORDING', 'myapp_user1@localhost');

\section*{Firewall Account Profile Stored Procedures}

These stored procedures perform management operations on firewall account profiles:
- sp_reload_firewall_rules(user)

This stored procedure provides control over firewall operation for individual account profiles. The procedure uses firewall administrative functions to reload the in-memory rules for an account profile from the rules stored in the firewall-database.firewall_whitelist table.

Arguments:
- user: The name of the affected account profile, as a string in user_name@host_name format.

Example:
CALL sp_reload_firewall_rules('fwuser@localhost');
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1573.jpg?height=129&width=113&top_left_y=2030&top_left_x=397)

\section*{Warning}

This procedure clears the account profile in-memory allowlist rules before reloading them from persistent storage, and sets the profile mode to OFF. If the profile mode was not 0FF prior to the sp_reload_firewall_rules() call, use sp_set_firewall_mode( ) to restore its previous mode after reloading the rules. For example, if the profile was in PROTECTING mode, that is no longer true after calling sp_reload_firewall_rules() and you must set it to PROTECTING again explicitly.

This procedure is deprecated, and subject to removal in a future MySQL version. See Migrating Account Profiles to Group Profiles.
- sp_set_firewall_mode(user, mode)

This stored procedure establishes the operational mode for a firewall account profile, after registering the profile with the firewall if it was not already registered. The procedure also invokes firewall
administrative functions as necessary to transfer firewall data between the cache and persistent storage. This procedure may be called even if the mysql_firewall_mode system variable is 0FF, although setting the mode for a profile has no operational effect until the firewall is enabled.

Arguments:
- user: The name of the affected account profile, as a string in user_name@host_name format.
- mode: The operational mode for the profile, as a string. Permitted mode values are OFF, DETECTING, PROTECTING, RECORDING, and RESET. For details about their meanings, see Firewall Concepts.

Switching an account profile to any mode but RECORDING synchronizes its firewall cache data to the firewall database tables that provide persistent underlying storage (mysql or custom). Switching the mode from OFF to RECORDING reloads the allowlist from the firewalldatabase.firewall_whitelist table into the cache.

If an account profile has an empty allowlist, its mode cannot be set to PROTECTING because the profile would reject every statement, effectively prohibiting the account from executing statements. In response to such a mode-setting attempt, the firewall produces a diagnostic message that is returned as a result set rather than as an SQL error:
```
mysql> CALL sp_set_firewall_mode('a@b','PROTECTING');
+--------------------------------------------------------------------------
| set_firewall_mode(arg_userhost, arg_mode) |
+-------------------------------------------------------------------------
| ERROR: PROTECTING mode requested for a@b but the allowlist is empty. |
+--------------------------------------------------------------------------
```


This procedure is deprecated, and subject to removal in a future MySQL version. See Migrating Account Profiles to Group Profiles.

\section*{Firewall Miscellaneous Stored Procedures}

These stored procedures perform miscellaneous firewall management operations.
- sp_migrate_firewall_user_to_group(user, group)

The sp_migrate_firewall_user_to_group( ) stored procedure converts a firewall account profile to a group profile with the account as its single enlisted member. Run the firewall_profile_migration.sql script to install it. The conversion procedure is discussed in Migrating Account Profiles to Group Profiles.

This routine requires the FIREWALL_ADMIN privilege.
Arguments:
- user: The name of the account profile to convert to a group profile, as a string in user_name@host_name format. The account profile must exist, and must not currently be in RECORDING mode.
- group: The name of the new group profile, which must not already exist. The new group profile has the named account as its single enlisted member, and that member is set as the group training account. The group profile operational mode is taken from the account profile operational mode.

Example:
CALL sp_migrate_firewall_user_to_group('fwuser@localhost', 'mygroup);

\section*{MySQL Enterprise Firewall Administrative Functions}

MySQL Enterprise Firewall administrative functions provide an API for lower-level tasks such as synchronizing the firewall cache with the underlying system tables.

Under normal operation, these functions are invoked by the firewall stored procedures, not directly by users. For that reason, these function descriptions do not include details such as information about their arguments and return types.
- Firewall Group Profile Functions
- Firewall Account Profile Functions
- Firewall Miscellaneous Functions

\section*{Firewall Group Profile Functions}

These functions perform management operations on firewall group profiles:
- firewall_group_delist(group, user)

This function removes an account from a group profile. It requires the FIREWALL_ADMIN privilege.
Example:
SELECT firewall_group_delist('ɡ', 'fwuser@localhost');
- firewall_group_enlist(group, user)

This function adds an account to a group profile. It requires the FIREWALL_ADMIN privilege.
It is not necessary to register the account itself with the firewall before adding the account to the group.

Example:
SELECT firewall_group_enlist('ɡ', 'fwuser@localhost');
- read_firewall_group_allowlist(group, rule)

This aggregate function updates the recorded-statement cache for the named group profile through a SELECT statement on the firewall-database.firewall_group_allowlist table. It requires the FIREWALL_ADMIN privilege.

Example:
```
SELECT read_firewall_group_allowlist('my_fw_group', fgw.rule)
FROM mysql.firewall_group_allowlist AS fgw
WHERE NAME = 'my_fw_group';
```

- read_firewall_groups(group, mode, user)

This aggregate function updates the firewall group profile cache through a SELECT statement on the firewall-database.firewall_groups table. It requires the FIREWALL_ADMIN privilege.

Example:
```
SELECT read_firewall_groups('g', 'RECORDING', 'fwuser@localhost')
FROM mysql.firewall_groups;
```

- set_firewall_group_mode(group, mode[, user])

This function manages the group profile cache, establishes the profile operational mode, and optionally specifies the profile training account. It requires the FIREWALL_ADMIN privilege.

If the optional user argument is not given, any previous user setting for the profile remains unchanged. To change the setting, call the function with a third argument.

If the optional user argument is given, it specifies the training account for the group profile, to be used when the profile is in RECORDING mode. The value is NULL, or a non-NULL account that has the format user_name@host_name:
- If the value is NULL, the firewall records allowlist rules for statements received from any account that is a member of the group.
- If the value is non-NULL, the firewall records allowlist rules only for statements received from the named account (which should be a member of the group).

Example:
```
SELECT set_firewall_group_mode('g', 'DETECTING');
```


\section*{Firewall Account Profile Functions}

These functions perform management operations on firewall account profiles:
- read_firewall_users(user, mode)

This aggregate function updates the firewall account profile cache through a SELECT statement on the firewall-database.firewall_users table. It requires the FIREWALL_ADMIN privilege or the deprecated SUPER privilege.

Example:
```
SELECT read_firewall_users('fwuser@localhost', 'RECORDING')
FROM mysql.firewall_users;
```


This function is deprecated, and subject to removal in a future MySQL version. See Migrating Account Profiles to Group Profiles.
- read_firewall_whitelist(user, rule)

This aggregate function updates the recorded-statement cache for the named account profile through a SELECT statement on the firewall-database.firewall_whitelist table. It requires the FIREWALL_ADMIN privilege or the deprecated SUPER privilege.

Example:
```
SELECT read_firewall_whitelist('fwuser@localhost', fw.rule)
FROM mysql.firewall_whitelist AS fw
WHERE USERHOST = 'fwuser@localhost';
```


This function is deprecated, and subject to removal in a future MySQL version. See Migrating Account Profiles to Group Profiles.
- set_firewall_mode(user, mode)

This function manages the account profile cache and establishes the profile operational mode. It requires the FIREWALL_ADMIN privilege or the deprecated SUPER privilege.

Example:
```
SELECT set_firewall_mode('fwuser@localhost', 'RECORDING');
```


This function is deprecated, and subject to removal in a future MySQL version. See Migrating Account Profiles to Group Profiles.

\section*{Firewall Miscellaneous Functions}

These functions perform miscellaneous firewall operations:
- mysql_firewall_flush_status()

This function resets several firewall status variables to 0 :
- Firewall_access_denied
- Firewall_access_granted
- Firewall_access_suspicious

This function requires the FIREWALL_ADMIN privilege or the deprecated SUPER privilege.
Example:
SELECT mysql_firewall_flush_status();
- normalize_statement(stmt)

This function normalizes an SQL statement into the digest form used for allowlist rules. It requires the FIREWALL_ADMIN privilege or the deprecated SUPER privilege.

Example:
SELECT normalize_statement('SELECT * FROM t1 WHERE c1 > 2');

\section*{Note}

The same digest functionality is available outside firewall context using the STATEMENT_DIGEST_TEXT( ) SQL function.

\section*{MySQL Enterprise Firewall System Variables}

MySQL Enterprise Firewall supports the following system variables. Use them to configure firewall operation. These variables are unavailable unless the firewall is installed (see Section 8.4.7.2, "Installing or Uninstalling MySQL Enterprise Firewall").
- mysql_firewall_database

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysql-firewall-database[=value] \\
\hline System Variable & mysql_firewall_database \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & mysql \\
\hline
\end{tabular}

Specifies the database from which MySQL Enterprise Firewall reads data. Typically, the MYSQL_FIREWALL server-side plugin stores its internal data (tables, stored procedures, and functions) in the mysql system database, but you can create and use a custom schema instead (see Installing MySQL Enterprise Firewall). This variable permits specifying an alternative database name at startup.
- mysql_firewall_mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysql-firewall-mode[=\{OFF|ON\}] \\
\hline System Variable & mysql_firewall_mode \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Whether MySQL Enterprise Firewall is enabled (the default) or disabled.
- mysql_firewall_reload_interval_seconds

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysql-firewall-reload-intervalseconds[=value] \\
\hline System Variable & mysql_firewall_reload_interval_seconds \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 60 (unless 0: OFF) \\
\hline Maximum Value & INT_MAX \\
\hline Unit & seconds \\
\hline
\end{tabular}

Specifies the interval (in seconds) that the server-side plugin uses to reload its internal cache from firewall tables. When mysql_firewall_reload_interval_seconds has a value of zero (the default), no periodic reloading of data from tables occurs at runtime. Values between 0 and 60 ( 1 to 59) are not acknowledged by the plugin. Instead, these values adjust to 60 automatically.

This variable requires that the scheduler component be enabled (ON). For more information, see Scheduling Firewall Cache Reloads.
- mysql_firewall_trace

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysql-firewall-trace[=\{OFF|ON\}] \\
\hline System Variable & mysql_firewall_trace \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Whether the MySQL Enterprise Firewall trace is enabled or disabled (the default). When mysql_firewall_trace is enabled, for PROTECTING mode, the firewall writes rejected statements to the error log.

\section*{MySQL Enterprise Firewall Status Variables}

MySQL Enterprise Firewall supports the following status variables. Use them to obtain information about firewall operational status. These variables are unavailable unless the firewall is installed (see Section 8.4.7.2, "Installing or Uninstalling MySQL Enterprise Firewall"). Firewall status variables are set to 0 whenever the MYSQL_FIREWALL plugin is installed or the server is started. Many of them are reset to zero by the mysql_firewall_flush_status() function (see MySQL Enterprise Firewall Administrative Functions).
- Firewall_access_denied

The number of statements rejected by MySQL Enterprise Firewall.
- Firewall_access_granted

The number of statements accepted by MySQL Enterprise Firewall.
- Firewall_access_suspicious

The number of statements logged by MySQL Enterprise Firewall as suspicious for users who are in DETECTING mode.
- Firewall_cached_entries

The number of statements recorded by MySQL Enterprise Firewall, including duplicates.

\subsection*{8.5 MySQL Enterprise Data Masking and De-Identification}

\section*{Note}

MySQL Enterprise Data Masking and De-Identification is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, https://www.mysql.com/products/.

MySQL Enterprise Edition provides data masking and de-identification capabilities:
- Transformation of existing data to mask it and remove identifying characteristics, such as changing all digits of a credit card number but the last four to ' X ' characters.
- Generation of random data, such as email addresses and payment card numbers.
- Substitution of data by data from dictionaries stored in the database. The dictionaries are easily replicated in a standard way. Administration is restricted to authorized users who are granted special privileges so that only they can create and modify the dictionaries.

\section*{Note}

MySQL Enterprise Data Masking and De-Identification was implemented originally in MySQL as a plugin library. As of MySQL 8.4, MySQL Enterprise Edition also provides components to access data masking and de-identification capabilities. For information about the similarities and differences, see Table 8.45, "Comparison Between Data-Masking Components and Plugin Elements".

If you are using MySQL Enterprise Data Masking and De-Identification for the first time, consider installing the components for access to the ongoing enhancements only available with component infrastructure.

The way that applications use these capabilities depends on the purpose for which the data is used and who accesses it:
- Applications that use sensitive data may protect it by performing data masking and permitting use of partially masked data for client identification. Example: A call center may ask for clients to provide their last four Social Security Number digits.
- Applications that require properly formatted data, but not necessarily the original data, can synthesize sample data. Example: An application developer who is testing data validators but has no access to original data may synthesize random data with the same format.
- Applications that must substitute a real name with a dictionary term to protect to protect sensitive information, but still provide realistic content to application users. Example: A user in training who is restricted from viewing addresses gets a random term from dictionary city names instead of the real city name. A variant of this scenario may be that the real city name is replaced only if it exists in usa_city_names.

\section*{Example 1:}

Medical research facilities can hold patient data that comprises a mix of personal and medical data. This may include genetic sequences (long strings), test results stored in JSON format, and other data types. Although the data may be used mostly by automated analysis software, access to genome data or test results of particular patients is still possible. In such cases, data masking should be used to render this information not personally identifiable.

Example 2:
A credit card processor company provides a set of services using sensitive data, such as:
- Processing a large number of financial transactions per second.
- Storing a large amount of transaction-related data.
- Protecting transaction-related data with strict requirements for personal data.
- Handling client complaints about transactions using reversible or partially masked data.

A typical transaction may include many types of sensitive information, including:
- Credit card number.
- Transaction type and amount.
- Merchant type.
- Transaction cryptogram (to confirm transaction legitimacy).
- Geolocation of GPS-equipped terminal (for fraud detection).

Those types of information may then be joined within a bank or other card-issuing financial institution with client personal data, such as:
- Full client name (either person or company).
- Address.
- Date of birth.
- Social Security number.
- Email address.
- Phone number.

Various employee roles within both the card processing company and the financial institution require access to that data. Some of these roles may require access only to masked data. Other roles may require access to the original data on a case-to-case basis, which is recorded in audit logs.

Masking and de-identification are core to regulatory compliance, so MySQL Enterprise Data Masking and De-Identification can help application developers satisfy privacy requirements:
- PCI-DSS: Payment Card Data.
- HIPAA: Privacy of Health Data, Health Information Technology for Economic and Clinical Health Act (HITECH Act).
- EU General Data Protection Directive (GDPR): Protection of Personal Data.
- Data Protection Act (UK): Protection of Personal Data.
- Sarbanes Oxley, GLBA, The USA Patriot Act, Identity Theft and Assumption Deterrence Act of 1998.
- FERPA - Student Data, NASD, CA SB1386 and AB 1950, State Data Protection Laws, Basel II.

The following sections describe the elements of MySQL Enterprise Data Masking and De-Identification, discuss how to install and use it, and provide reference information for its elements.

\subsection*{8.5.1 Data-Masking Components Versus the Data-Masking Plugin}

Previously, MySQL enabled masking and de-identification capabilities using a server-side plugin, but transitioned to use the component infrastructure as an alternative implementation. The following table briefly compares MySQL Enterprise Data Masking and De-Identification components and the plugin library to provide an overview of their differences. It may assist you in making the transition from the plugin to components.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.45 Comparison Between Data-Masking Components and Plugin Elements}
\begin{tabular}{|l|l|l|}
\hline Category & Components & Plugin \\
\hline Interface & Service functions, loadable functions & Loadable functions \\
\hline Support for multibyte character sets & Yes, for generalpurpose masking functions & No \\
\hline General-purpose masking functions & mask_inner(), mask_outer() & mask_inner(), mask_outer() \\
\hline Masking of specific types & PAN, SSN, IBAN, UUID, Canada SIN, UK NIN & PAN, SSN \\
\hline Random generation, specific types & email, US phone, PAN, SSN, IBAN, UUID, Canada SIN, UK NIN & email, US phone, PAN, SSN \\
\hline Random generation of integer from given range & Yes & Yes \\
\hline Persisting substitution dictionaries & Database & File \\
\hline Privilege to manage dictionaries & Dedicated privilege & FILE \\
\hline Automated loadable-function registration/ deregistration during installation/uninstallation & Yes & No \\
\hline Enhancements to existing functions & More arguments added to the gen_rnd_email() function & N/A \\
\hline
\end{tabular}
\end{table}

\subsection*{8.5.2 MySQL Enterprise Data Masking and De-Identification Components}

MySQL Enterprise Data Masking and De-Identification implements these elements:
- A table for persistent storage of dictionaries and terms.
- A component named component_masking that implements masking functionality and exposes it as service interface for developers.

Developers who wish to incorporate the same service functions used by component_masking should consult the internal\components\masking\component_masking.h file in a MySQL source distribution or https://dev.mysql.com/doc/dev/mysql-server/latest.
- A component named component_masking_functions that provides loadable functions.

The set of loadable functions enables an SQL-level API for performing masking and de-identification operations. Some of the functions require the MASKING_DICTIONARIES_ADMIN dynamic privilege.

\subsection*{8.5.2.1 MySQL Enterprise Data Masking and De-Identification Component Installation}

Components provide expanded access to MySQL Enterprise Data Masking and De-Identification functionality. Previously, MySQL implemented masking and de-identification capabilities as a plugin library file containing a plugin and several loadable functions. Before you begin the component installation, remove the data_masking plugin and all of its loadable functions to avoid conflicts. For instructions, see Section 8.5.3.1, "MySQL Enterprise Data Masking and De-Identification Plugin Installation".

MySQL Enterprise Data Masking and De-Identification database table and components are:
- masking_dictionaries table

Purpose: A table that provides persistent storage for masking dictionaries and terms. While the mysql system schema is the traditional storage option, creating a dedicated schema for this purpose is also permitted. A dedicated schema might be preferable for these reasons:
- The mysql system schema is not backed up by a logical backup, such as mysqldump or load operations.
- A dedicated schema makes outbound replication easier.
- A user or role requires no mysql schema privileges when preforming related data-masking tasks in the dedicated schema.
- component_masking component

Purpose: The component implements the core of the masking functionality and exposes it as services.

URN: file://component_masking
- component_masking_functions component

Purpose: The component exposes all functionality of the component_masking component as loadable functions. Some of the functions require the MASKING_DICTIONARIES_ADMIN dynamic privilege.

URN: file://component_masking_functions
If the components and functions are used on a replication source server, install them on all replica servers as well to avoid replication issues. While the components are loaded, information about them is available as described in Section 7.5.2, "Obtaining Component Information". For general information about installing or uninstalling components, see Section 7.5.1, "Installing and Uninstalling Components".

MySQL Enterprise Data Masking and De-Identification supports these setup and removal procedures:
- Install Using the mysql System Schema
- Install Using a Dedicated Schema
- Uninstall MySQL Enterprise Data Masking and De-Identification Components

\section*{Install Using the mysql System Schema}

\section*{Note}

Consider using a dedicated schema to store data-masking dictionaries (see Install Using a Dedicated Schema).

To set up MySQL Enterprise Data Masking and De-Identification:
1. Run masking_functions_install.sql to add the masking_dictionaries table to the mysql schema and install the components. The script is located in the share directory of your MySQL installation.
```
$> mysql -u root -p -D mysql < [path/]masking_functions_install.sql
Enter password: (enter root password here)
```


\section*{Install Using a Dedicated Schema}

To set up MySQL Enterprise Data Masking and De-Identification:
1. Create a database to store the masking_dictionaries table. For example, to use mask_db as the database name, execute this statement:
```
$> mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS mask_db"
Enter password: (enter root password here)
```

2. Run masking_functions_install.sql to add the masking_dictionaries table to the mask_db schema and install the components. The script is located in the share directory of your MySQL installation.
```
$> mysql -u root -p -D mask_db < [path/]masking_functions_install.sql
Enter password: (enter root password here)
```

3. Set and persist the mask_db schema at startup by preceding the component_masking.masking_database read-only variable name by the PERSIST_ONLY keyword.
```
$> mysql -u root -p -e "SET PERSIST_ONLY component_masking.masking_database=mask_db"
Enter password: (enter root password here)
```


After modifying the variable, restart the server to cause the new setting to take effect.

\section*{Uninstall MySQL Enterprise Data Masking and De-Identification Components}

To remove MySQL Enterprise Data Masking and De-Identification when using the mysql system schema:
1. Run masking_functions_uninstall.sql to remove the masking_dictionaries table from the appropriate schema and uninstall the components. The script is located in the share directory of your MySQL installation. The example here specifies the mysql database.
```
$> mysql -u root -p -D mysql < [path/]masking_functions_uninstall.sql
Enter password: (enter root password here)
```


To remove MySQL Enterprise Data Masking and De-Identification when using a dedicated schema:
1. Run masking_functions_uninstall.sql to remove the masking_dictionaries table from the appropriate schema and uninstall the components. The script is located in the share directory of your MySQL installation. The example here specifies the mask_db database.
```
$> mysql -u root -p -D mask_db < [path/]masking_functions_uninstall.sql
Enter password: (enter root password here)
```

2. Stop persisting the component_masking.masking_database variable.
```
$> mysql -u root -p -e "RESET PERSIST component_masking.masking_database"
Enter password: (enter root password here)
```

3. [Optional] Drop the dedicated schema to ensure that it is not used for other purposes.
```
DROP DATABASE mask_db;
```


\section*{8．5．2．2 Using MySQL Enterprise Data Masking and De－Identification Components}

Before using MySQL Enterprise Data Masking and De－Identification，install it according to the instructions provided at Section 8．5．2．1，＂MySQL Enterprise Data Masking and De－Identification Component Installation＂．

To use MySQL Enterprise Data Masking and De－Identification in applications，invoke the functions that are appropriate for the operations you wish to perform．For detailed function descriptions， see Section 8．5．2．4，＂MySQL Enterprise Data Masking and De－Identification Component Function Descriptions＂．This section demonstrates how to use the functions to carry out some representative tasks．It first presents an overview of the available functions，followed by some examples of how the functions might be used in real－world context：
－Masking Data to Remove Identifying Characteristics
－Generating Random Data with Specific Characteristics
－Generating Random Data Using Dictionaries
－Using Masked Data for Customer Identification
－Creating Views that Display Masked Data

\section*{Masking Data to Remove Identifying Characteristics}

MySQL provides general－purpose masking component functions that mask arbitrary strings，and special－purpose masking functions that mask specific types of values．

\section*{General－Purpose Masking Component Functions}
mask＿inner（ ）and mask＿outer（ ）are general－purpose functions that mask parts of arbitrary strings based on position within the string．Both functions support an input string that is encoded in any character set：
－mask＿inner（ ）masks the interior of its string argument，leaving the ends unmasked．Other arguments specify the sizes of the unmasked ends．
```
mysql> SELECT mask_inner('This is a string', 5, 1);
+----------------------------------------+
| mask_inner('This is a string', 5, 1) |
+----------------------------------------+
| This xxxxxxxxxxg
+----------------------------------------+
mysql> SELECT mask_inner('This is a string', 1, 5);
+----------------------------------------+
| mask_inner('This is a string', 1, 5) |
+----------------------------------------+
| Txxxxxxxxxxtring
+-----------------------------------------+
mysql> SELECT mask_inner("かすみがうら市", 3, 1);
+-----------------------------------+
| mask_inner("かすみがうら市", 3, 1) |
+-------------------------------------
| かすみXXX市 |
+------------------------------------+
mysql> SELECT mask_inner("かすみがうら市", 1, 3);
+------------------------------------+
| mask_inner("かすみがうら市", 1, 3) |
+-----------------------------------+
| かxxxうら市 |
+------------------------------------+
```

－mask＿outer（）does the reverse，masking the ends of its string argument，leaving the interior unmasked．Other arguments specify the sizes of the masked ends．
```
mysql> SELECT mask_outer('This is a string', 5, 1);
+----------------------------------------+
```

```
| mask_outer('This is a string', 5, 1) |
+----------------------------------------+
| XXXXXis a strinX |
+----------------------------------------+
mysql> SELECT mask_outer('This is a string', 1, 5);
+----------------------------------------+
| mask_outer('This is a string', 1, 5) |
+----------------------------------------+
| Xhis is a sXXXXX |
+----------------------------------------+
```


By default，mask＿inner（ ）and mask＿outer（ ）use＇ X ＇as the masking character，but permit an optional masking－character argument：
```
mysql> SELECT mask_inner('This is a string', 5, 1, '*');
+--------------------------------------------+
| mask_inner('This is a string', 5, 1, '*') |
+--------------------------------------------
| This **********g |
+--------------------------------------------+
mysql> SELECT mask_inner("かすみがうら市", 2, 2, "#");
+----------------------------------------+
| mask_inner("かすみがうら市", 2, 2, "#") |
+----------------------------------------+
| かす###ら市 |
+----------------------------------------+
```


\section*{Special－Purpose Masking Component Functions}

Other masking functions expect a string argument representing a specific type of value and mask it to remove identifying characteristics．

\section*{Note}

The examples here supply function arguments using the random value generation functions that return the appropriate type of value．For more information about generation functions，see Generating Random Data with Specific Characteristics．

Payment card Primary Account Number masking．Masking functions provide strict and relaxed masking of Primary Account numbers．
－mask＿pan（）masks all but the last four digits of the number：
```
mysql> SELECT mask_pan(gen_rnd_pan());
+---------------------------+
| mask_pan(gen_rnd_pan()) |
+---------------------------+
| xxxxxxxxxxxx2461 |
+---------------------------+
```

－mask＿pan＿relaxed（ ）is similar but does not mask the first six digits that indicate the payment card issuer unmasked：
```
mysql> SELECT mask_pan_relaxed(gen_rnd_pan());
+----------------------------------+
| mask_pan_relaxed(gen_rnd_pan()) |
+-----------------------------------+
| 770630XXXXXX0807 |
```


International Bank Account Number masking．mask＿iban（）masks all but the first two letters （denoting the country）of the number：
```
mysql> SELECT mask_iban(gen_rnd_iban());
+----------------------------+
| mask_iban(gen_rnd_iban()) |
+-----------------------------+
| ZZ** **** **** **** |
```


\section*{Universally Unique Identifier masking. mask_uuid ( ) masks all meaningful characters:}
```
mysql> SELECT mask_uuid(gen_rnd_uuid());
+----------------------------------------
| mask_uuid(gen_rnd_uuid()) |
+---------------------------------------+
| ********_****_****__****_************* |
+----------------------------------------+
```


US Social Security Number masking. mask_ssn( ) masks all but the last four digits of the number:
```
mysql> SELECT mask_ssn(gen_rnd_ssn());
+---------------------------+
| mask_ssn(gen_rnd_ssn()) |
+---------------------------+
| *** - **-1723 |
+---------------------------+
```


Canada Social Insurance Number masking. mask_canada_sin() masks meaningful digits of the number:
```
mysql> SELECT mask_canada_sin(gen_rnd_canada_sin());
+-----------------------------------------+
| mask_canada_sin(gen_rnd_canada_sin()) |
+-----------------------------------------+
| XXX-XXX-XXX | +
```


United Kingdom National Insurance Number masking. mask_uk_nin( ) masks all but the first two digits of the number:
```
mysql> SELECT mask_uk_nin(gen_rnd_uk_nin());
+--------------------------------+
| mask_uk_nin(gen_rnd_uk_nin()) |
+--------------------------------+
| ZH******* |
+--------------------------------+
```


\section*{Generating Random Data with Specific Characteristics}

Several component functions generate random values. These values can be used for testing, simulation, and so forth.
gen_range( ) returns a random integer selected from a given range:
```
mysql> SELECT gen_range(1, 10);
+-------------------+
| gen_range(1, 10) |
+-------------------+
| 6
+-------------------+
```

gen_rnd_canada_sin( ) returns a random Canadian Social Insurance Number (SIN).
Because it cannot be guaranteed that the number generated has not been assigned, the result of gen_rnd_canada_sin( ) should never be displayed (except possibly in testing). For display in userfacing applications, always employ a masking function such as mask_canada_sin( ), as shown here:
```
mysql> SELECT mask_canada_sin( gen_rnd_canada_sin() );
+-------------------------------------------
| mask_canada_sin( gen_rnd_canada_sin() ) |
+-------------------------------------------+
| xxx-xxx-xxx |
+-------------------------------------------+
```

gen_rnd_email( ) returns a random email address with a specified number of digits for the name and surname parts in the specified domain, mynet.com in the following example:
```
mysql> SELECT gen_rnd_email(6, 8, 'mynet.com');
+------------------------------------+
| gen_rnd_email(6, 8, 'mynet.com') |
+------------------------------------+
| txdona.uamdqvum@mynet.com |
```

gen_rnd_iban( ) returns a number chosen from a range not used for legitimate numbers:
```
mysql> SELECT gen_rnd_iban('XO', 24);
+---------------------------------+
| gen_rnd_iban('XO', 24) |
+--------------------------------+
| X025 SL7A PGQR B9NN 6IVB RFE8 |
+--------------------------------+
```

gen_rnd_pan( ) returns a random payment card Primary Account Number (PAN).
Because it cannot be guaranteed that the number generated is not assigned to a legitimate payment account, the result of gen_rnd_pan ( ) should never be displayed, other than for testing purposes. For display in applications, always employ a masking function such as mask_pan() or mask_pan_relaxed( ). We show such use of the latter function with gen_rnd_pan( ) here:
```
mysql> SELECT mask_pan_relaxed( gen_rnd_pan() );
+------------------------------------+
| mask_pan_relaxed( gen_rnd_pan() ) |
+------------------------------------+
| 707064XXXXXX4850 |
+------------------------------------+
```

gen_rnd_ssn( ) returns a random US Social Security Number whose first part is chosen from a range not used for legitimate numbers:
```
mysql> SELECT gen_rnd_ssn();
+----------------+
| gen_rnd_ssn() |
+----------------+
| 912-45-1615 |
+----------------+
```

gen_rnd_uk_nin( ) returns a random UK National Insurance Number (NIN).
Because it cannot be guaranteed that the number generated has not been assigned, the result of gen_rnd_uk_nin( ) should never be displayed (except possibly in testing). For display in user-facing applications, always employ a masking function such as mask_uk_nin( ), as shown here:
```
mysql> SELECT mask_uk_nin( gen_rnd_uk_nin() );
+----------------------------------+
| mask_uk_nin( gen_rnd_uk_nin() ) |
+----------------------------------+
| OE******* |
+----------------------------------+
```

gen_rnd_us_phone ( ) returns a random US phone number in the 555 area code not used for legitimate numbers:
```
mysql> SELECT gen_rnd_us_phone();
+----------------------+
| gen_rnd_us_phone() |
+---------------------+
| 1-555-747-5627 |
+---------------------+
```

gen_rnd_uuid ( ) returns a number chosen from a range not used for legitimate identifiers:
```
mysql> SELECT gen_rnd_uuid();
+----------------------------------------+
| gen_rnd_uuid() |
+----------------------------------------+
| 68946384-6880-3150-6889-928076732539 |
```

+--------------------------------------+

\section*{Generating Random Data Using Dictionaries}

MySQL Enterprise Data Masking and De-Identification enables dictionaries to be used as sources of random values called terms. To use a dictionary, it must first be added to the masking_dictionaries system table and given a name. The dictionaries are read from the table and loaded to the cache during initialization of the components (on server startup). Terms then can then be added, removed, and selected from dictionaries and used as random values or as replacements for other values.

\section*{Note}

Always edit dictionaries using dictionary administration functions rather than modifying the table directly. If you manipulate the table manually, the dictionary cache becomes inconsistent with the table.

A valid masking_dictionaries table has these characteristics:
- An administrator created the masking_dictionaries system table in the mysql schema as follows:
```
CREATE TABLE IF NOT EXISTS
masking_dictionaries(
    Dictionary VARCHAR(256) NOT NULL,
    Term VARCHAR(256) NOT NULL,
    UNIQUE INDEX dictionary_term_idx (Dictionary, Term),
    INDEX dictionary_idx (Dictionary)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;
```

- MASKING_DICTIONARY_ADMIN privilege is required to add and remove terms, or to remove an entire dictionary.
- The table may contain multiple dictionaries and their terms.
- Any user account can view the dictionaries. Given enough queries, all of the terms in dictionaries are retrievable. Avoid adding sensitive data to the dictionary table.

Suppose that a dictionary named DE_cities includes these city names in Germany:
```
Berlin
Munich
Bremen
```


Use masking_dictionary_term_add ( ) to assign a dictionary name and one term:
```
mysql> SELECT masking_dictionary_term_add('DE_Cities', 'Berlin');
+------------------------------------------------------+
| masking_dictionary_term_add('DE_Cities', 'Berlin') |
+-------------------------------------------------------
| 1 |
+--------------------------------------------------------
mysql> SELECT masking_dictionary_term_add('DE_Cities', 'Munich');
+------------------------------------------------------+
| masking_dictionary_term_add('DE_Cities', 'Munich') |
+-------------------------------------------------------
| 1 |
+--------------------------------------------------------
mysql> SELECT masking_dictionary_term_add('DE_Cities', 'Bremen');
+-------------------------------------------------------
| masking_dictionary_term_add('DE_Cities', 'Bremen') |
+-------------------------------------------------------
| 1 |
+-------------------------------------------------------
```


Also suppose that a dictionary named US_Cities contains these city names in the United States:
```
Houston
Phoenix
```

```
Detroit
mysql> SELECT masking_dictionary_term_add('US_Cities', 'Houston');
+--------------------------------------------------------
| masking_dictionary_term_add('US_Cities', 'Houston') |
+--------------------------------------------------------
| 1 |
+------------------------------------------------------+
mysql> SELECT masking_dictionary_term_add('US_Cities', 'Phoenix');
+--------------------------------------------------------
| masking_dictionary_term_add('US_Cities', 'Phoenix') |
+--------------------------------------------------------
| 1 |
+------------------------------------------------------+
mysql> SELECT masking_dictionary_term_add('US_Cities', 'Detroit');
+--------------------------------------------------------
| masking_dictionary_term_add('US_Cities', 'Detroit') |
+--------------------------------------------------------
| 1 |
+-------------------------------------------------------
```


To select a random term from a dictionary, use gen_dictionary( ):
```
mysql> SELECT gen_dictionary('DE_Cities');
+------------------------------+
| gen_dictionary('DE_Cities') |
+------------------------------+
| Berlin |
+------------------------------+
mysql> SELECT gen_dictionary('US_Cities');
+------------------------------+
    gen_dictionary('US_Cities') |
+------------------------------+
    Phoenix |
+------------------------------+
```


To select a random term from multiple dictionaries, randomly select one of the dictionaries, then select a term from it:
```
mysql> SELECT gen_dictionary(ELT(gen_range(1,2), 'DE_Cities', 'US_Cities'));
+------------------------------------------------------------------
| gen_dictionary(ELT(gen_range(1,2), 'DE_Cities', 'US_Cities')) |
+------------------------------------------------------------------
| Detroit |
+-------------------------------------------------------------------
mysql> SELECT gen_dictionary(ELT(gen_range(1,2), 'DE_Cities', 'US_Cities'));
+------------------------------------------------------------------
| gen_dictionary(ELT(gen_range(1,2), 'DE_Cities', 'US_Cities')) |
+------------------------------------------------------------------
| Bremen |
```


The gen_blocklist ( ) function enables a term from one dictionary to be replaced by a term from another dictionary, which effects masking by substitution. Its arguments are the term to replace, the dictionary in which the term appears, and the dictionary from which to choose a replacement. For example, to substitute a US city for a German city, or vice versa, use gen_blocklist ( ) like this:
```
mysql> SELECT gen_blocklist('Munich', 'DE_Cities', 'US_Cities');
+-------------------------------------------------------
| gen_blocklist('Munich', 'DE_Cities', 'US_Cities') |
+------------------------------------------------------+
+------------------------------------------------------
mysql> SELECT gen_blocklist('El Paso', 'US_Cities', 'DE_Cities');
+-------------------------------------------------------
| gen_blocklist('El Paso', 'US_Cities', 'DE_Cities') |
+--------------------------------------------------------
| Bremen |
+--------------------------------------------------------
```


If the term to replace is not in the first dictionary, gen_blocklist ( ) returns it unchanged:
```
mysql> SELECT gen_blocklist('Moscow', 'DE_Cities', 'US_Cities');
+-----------------------------------------------------+
| gen_blocklist('Moscow', 'DE_Cities', 'US_Cities') |
+-------------------------------------------------------
| Moscow |
+------------------------------------------------------+
```


\section*{Using Masked Data for Customer Identification}

At customer-service call centers, one common identity verification technique is to ask customers to provide their last four Social Security Number (SSN) digits. For example, a customer might say her name is Joanna Bond and that her last four SSN digits are 0007.

Suppose that a customer table containing customer records has these columns:
- id: Customer ID number.
- first_name: Customer first name.
- last_name: Customer last name.
- ssn: Customer Social Security Number.

For example, the table might be defined as follows:
```
CREATE TABLE customer
(
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(40),
    last_name VARCHAR(40),
    ssn VARCHAR(11)
);
```


The application used by customer-service representatives to check the customer SSN might execute a query like this:
```
mysql> SELECT id, ssn
    -> FROM customer
    -> WHERE first_name = 'Joanna' AND last_name = 'Bond';
+-----+-------------+
| id | ssn |
+-----+--------------+
| 786 | 906-39-0007 |
+-----+--------------+
```


However, that exposes the SSN to the customer-service representative, who has no need to see anything but the last four digits. Instead, the application can use this query to display only the masked SSN:
```
mysql> SELECT id, mask_ssn(CONVERT(ssn USING binary)) AS masked_ssn
        -> FROM customer
        -> WHERE first_name = 'Joanna' AND last_name = 'Bond';
+-----+-------------+
| id | masked_ssn |
+-----+--------------+
| 786 | ***_**-0007 |
+-----+--------------+
```


Now the representative sees only what is necessary, and customer privacy is preserved.
Why was the CONVERT( ) function used for the argument to mask_ssn( )? Because mask_ssn( ) requires an argument of length 11 . Thus, even though $s s n$ is defined as $\operatorname{VARCHAR}(11)$, if the ssn column has a multibyte character set, it may appear to be longer than 11 bytes when passed to a loadable function, and returns NULL while logging the error. Converting the value to a binary string ensures that the function sees an argument of length 11.

A similar technique may be needed for other data masking functions when string arguments do not have a single-byte character set.

\section*{Creating Views that Display Masked Data}

If masked data from a table is used for multiple queries, it may be convenient to define a view that produces masked data. That way, applications can select from the view without performing masking in individual queries.

For example, a masking view on the customer table from the previous section can be defined like this:
```
CREATE VIEW masked_customer AS
SELECT id, first_name, last_name,
mask_ssn(CONVERT(ssn USING binary)) AS masked_ssn
FROM customer;
```


Then the query to look up a customer becomes simpler but still returns masked data:
```
mysql> SELECT id, masked_ssn
mysql> FROM masked_customer
mysql> WHERE first_name = 'Joanna' AND last_name = 'Bond';
+-----+--------------+
| id | masked_ssn |
+-----+--------------+
| 786 | ***_**-0007 |
+------+--------------+
```


\subsection*{8.5.2.3 MySQL Enterprise Data Masking and De-Identification Component Function Reference}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.46 MySQL Enterprise Data Masking and De-Identification Component Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline gen_blocklist() & Perform dictionary term replacement \\
\hline gen_dictionary() & Return random term from dictionary \\
\hline gen_range() & Generate random number within range \\
\hline gen_rnd_canada_sin() & Generate random Canada Social Insurance Number \\
\hline gen_rnd_email() & Generate random email address \\
\hline gen_rnd_iban() & Generate random International Bank Account Number \\
\hline gen_rnd_pan ( ) & Generate random payment card Primary Account Number \\
\hline gen_rnd_ssn() & Generate random US Social Security Number \\
\hline gen_rnd_uk_nin() & Generate random United Kingdom National Insurance Number \\
\hline gen_rnd_us_phone() & Generate random US phone number \\
\hline gen_rnd_uuid() & Generate random Universally Unique Identifier \\
\hline mask_canada_sin() & Mask Canada Social Insurance Number \\
\hline mask_iban() & Mask International Bank Account Number \\
\hline mask_inner() & Mask interior part of string \\
\hline mask_outer() & Mask left and right parts of string \\
\hline mask_pan( ) & Mask payment card Primary Account Number part of string \\
\hline mask_pan_relaxed() & Mask payment card Primary Account Number part of string \\
\hline mask_ssn() & Mask US Social Security Number \\
\hline mask_uk_nin() & Mask United Kingdom National Insurance Number \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline mask_uuid() & Mask Universally Unique Identifier part of string \\
\hline masking_dictionaries_flush() & Cause masking_dictionaries cache to be reloaded from table \\
\hline masking_dictionary_remove() & Remove dictionary from the database table \\
\hline masking_dictionary_term_add() & Add new term to the dictionary \\
\hline masking_dictionary_term_remove() & Remove existing term from the dictionary \\
\hline
\end{tabular}

\subsection*{8.5.2.4 MySQL Enterprise Data Masking and De-Identification Component Function Descriptions}

The MySQL Enterprise Data Masking and De-Identification components includes several functions, which may be grouped into these categories:
- Data Masking Component Functions
- Random Data Generation Component Functions
- Dictionary Masking Administration Component Functions
- Dictionary Generating Component Functions

\section*{Data Masking Component Functions}

Each component function in this section performs a masking operation on its string argument and returns the masked result.
- mask_canada_sin(str [, mask_char])

Masks a Canada Social Insurance Number (SIN) and returns the number with all meaningful digits replaced by ' $X$ ' characters. An optional masking character can be specified.

Arguments:
- str: The string to mask. The accepted formats are:
- Nine non-separated digits.
- Nine digits grouped in pattern: $x x x-x x x-x x x($ ' - ' is any separator character).

This argument is converted to the utf8mb4 character set.
- mask_char: (Optional) The single character to use for masking. The default is ' X ' if mask_char is not given.

Return value:
The masked Canada SIN as a string encoded in the utf8mb4 character set, an error if the argument is not the correct length, or NULL if str is in incorrect format or contains a multibyte character.

Example:
```
mysql> SELECT mask_canada_sin('046-454-286'), mask_canada_sin('abcdefijk');
+----------------------------------+-------------------------------
| mask_canada_sin('046-454-286') | mask_canada_sin('abcdefijk') |
+----------------------------------+--------------------------------
| XXX-XXX-XXX | xxxxxxxxx |
+----------------------------------+-------------------------------
mysql> SELECT mask_canada_sin('909');
ERROR 1123 (HY000): Can't initialize function 'mask_canada_sin'; Argument 0 is too short.
mysql> SELECT mask_canada_sin('046-454-286-909');
```


ERROR 1123 (HY000): Can't initialize function 'mask_canada_sin'; Argument 0 is too long.
```
mask_iban(str [, mask_char])
```


Masks an International Bank Account Number (IBAN) and returns the number with all but the first two letters (denoting the country) replaced by ' * ' characters. An optional masking character can be specified.

\section*{Arguments:}
- str: The string to mask. Each country can have a different national routing or account numbering system, with a minimum of 13 and a maximum of 34 alphanumeric ASCII characters. The accepted formats are:
- Non-separated characters.
- Character grouped by four, except the last group, and separated by space or any other separator character (for example: xxxx-xxxx-xxxx-xx).

This argument is converted to the utf8mb4 character set.
- mask_char: (Optional) The single character to use for masking. The default is ' * ' if mask_char is not given.

Return value:
The masked International Bank Account Number as a string encoded in the utf8mb4 character set, an error if the argument is not the correct length, or NULL if str is in incorrect format or contains a multibyte character.

Example:
```
mysql> SELECT mask_iban('IE12 BOFI 9000 0112 3456 78'), mask_iban('abcdefghijk');
+-------------------------------------------+----------------------------
| mask_iban('IE12 BOFI 9000 0112 3456 78') | mask_iban('abcdefghijk') |
+---------------------------------------------+----------------------------
| IE** **** **** **** **** ** | ab********* |
+--------------------------------------------+----------------------------
mysql> SELECT mask_iban('909');
ERROR 1123 (HY000): Can't initialize function 'mask_iban'; Argument 0 is too short.
mysql> SELECT mask_iban('IE12 BOFI 9000 0112 3456 78 IE12 BOFI 9000 0112 3456 78');
ERROR 1123 (HY000): Can't initialize function 'mask_iban'; Argument 0 is too long.
```

mask_inner(str, margin1, margin2 [, mask_char])

Masks the interior part of a string, leaving the ends untouched, and returns the result. An optional masking character can be specified.
mask_inner supports all character sets.

\section*{Arguments:}
- str: The string to mask. This argument is converted to the utf8mb4 character set.
- margin1: A nonnegative integer that specifies the number of characters on the left end of the string to remain unmasked. If the value is 0 , no left end characters remain unmasked.
- margin2: A nonnegative integer that specifies the number of characters on the right end of the string to remain unmasked. If the value is 0 , no right end characters remain unmasked.
- mask_char: (Optional) The single character to use for masking. The default is ' X ' if mask_char is not given.

Return value:

The masked string encoded in the same character set used for str, or an error if either margin is negative.

If the sum of the margin values is larger than the argument length, no masking occurs and the argument is returned unchanged.

\section*{Note}

The function is optimized to work faster for single byte strings (having equal byte length and character length). For example, the utf8mb4 character set uses only one byte for ASCII characters, so the function processes strings containing only ASCII characters as single-byte character strings.

\section*{Example:}
```
mysql> SELECT mask_inner('abcdef', 1, 2), mask_inner('abcdef',0, 5);
+------------------------------+---------------------------
| mask_inner('abcdef', 1, 2) | mask_inner('abcdef',0, 5) |
+-----------------------------+---------------------------
| aXXXef | Xbcdef |
+------------------------------+----------------------------
mysql> SELECT mask_inner('abcdef', 1, 2, '*'), mask_inner('abcdef',0, 5, '#');
+-----------------------------------+---------------------------------
| mask_inner('abcdef', 1, 2, '*') | mask_inner('abcdef',0, 5, '#') |
+-----------------------------------+----------------------------------
| a***ef | #bcdef |
+-----------------------------------+--------------------------------
```

mask_outer(str, margin1, margin2 [, mask_char])
Masks the left and right ends of a string, leaving the interior unmasked, and returns the result. An optional masking character can be specified.
mask_outer supports all character sets.
Arguments:
- str: The string to mask. This argument is converted to the utf8mb4 character set.
- margin1: A nonnegative integer that specifies the number of characters on the left end of the string to mask. If the value is 0 , no left end characters are masked.
- margin2: A nonnegative integer that specifies the number of characters on the right end of the string to mask. If the value is 0 , no right end characters are masked.
- mask_char: (Optional) The single character to use for masking. The default is ' X ' if mask_char is not given.

Return value:
The masked string encoded in the same character set used for str, or an error if either margin is negative.

If the sum of the margin values is larger than the argument length, the entire argument is masked.

\section*{Note}

The function is optimized to work faster for single byte strings (having equal byte length and character length). For example, the utf8mb4 character set uses only one byte for ASCII characters, so the function processes strings containing only ASCII characters as single-byte character strings.

Example:
```
mysql> SELECT mask_outer('abcdef', 1, 2), mask_outer('abcdef',0, 5);
+-----------------------------+----------------------------
| mask_outer('abcdef', 1, 2) | mask_outer('abcdef',0, 5) |
+------------------------------+----------------------------
| XbcdXX | aXXXXX |
+------------------------------+----------------------------
mysql> SELECT mask_outer('abcdef', 1, 2, '*'), mask_outer('abcdef',0, 5, '#');
+-----------------------------------+-----------------------------------
| mask_outer('abcdef', 1, 2, '*') | mask_outer('abcdef',0, 5, '#') |
+-----------------------------------+---------------------------------
| *bcd** | a##### |
+-----------------------------------+--------------------------------
```

- mask_pan(str [, mask_char])

Masks a payment card Primary Account Number (PAN) and returns the number with all but the last four digits replaced by ' $X$ ' characters. An optional masking character can be specified.

\section*{Arguments:}
- str: The string to mask. The string must contain a minimum of 14 and a maximum of 19 alphanumeric characters. This argument is converted to the utf8mb4 character set.
- mask_char: (Optional) The single character to use for masking. The default is ' X ' if mask_char is not given.

Return value:
The masked payment number as a string encoded in the utf8mb4 character set, an error if the argument is not the correct length, or NULL if str is in incorrect format or contains a multibyte character.

\section*{Example:}
```
mysql> SELECT mask_pan(gen_rnd_pan());
+---------------------------+
| mask_pan(gen_rnd_pan()) |
+---------------------------+
| XXXXXXXXXXXX9102 |
+---------------------------+
mysql> SELECT mask_pan(gen_rnd_pan(19));
+-----------------------------+
| mask_pan(gen_rnd_pan(19)) |
+-----------------------------+
| xxxxxxxxxxxxxxx8268 |
+----------------------------+
mysql> SELECT mask_pan('a*Z');
ERROR 1123 (HY000): Can't initialize function 'mask_pan'; Argument 0 is too short.
```

- mask_pan_relaxed(str)

Masks a payment card Primary Account Number and returns the number with all but the first six and last four digits replaced by ' $X$ ' characters. The first six digits indicate the payment card issuer. An optional masking character can be specified.

Arguments:
- str: The string to mask. The string must be a suitable length for the Primary Account Number, but is not otherwise checked. This argument is converted to the utf8mb4 character set.
- mask_char: (Optional) The single character to use for masking. The default is ' X ' if mask_char is not given.

Return value:
The masked payment number as a string encoded in the utf8mb4 character set, an error if the argument is not the correct length, or NULL if str is in incorrect format or contains a multibyte character.

Example:
```
mysql> SELECT mask_pan_relaxed(gen_rnd_pan());
+----------------------------------+
| mask_pan_relaxed(gen_rnd_pan()) |
+-----------------------------------+
| 551279XXXXXX3108 |
+-----------------------------------+
mysql> SELECT mask_pan_relaxed(gen_rnd_pan(19));
+------------------------------------+
| mask_pan_relaxed(gen_rnd_pan(19)) |
+-------------------------------------
| 462634XXXXXXXXX6739 |
+------------------------------------+
mysql> SELECT mask_pan_relaxed('a*Z');
ERROR 1123 (HY000): Can't initialize function 'mask_pan_relaxed'; Argument 0 is too short.
```

mask_ssn(str [, mask_char])
Masks a US Social Security Number (SSN) and returns the number with all but the last four digits replaced by ' * ' characters. An optional masking character can be specified.

Arguments:
- str: The string to mask. The accepted formats are:
- Nine non-separated digits.
- Nine digits grouped in pattern: $\mathrm{xxx}-\mathrm{xx}-\mathrm{xxxx}$ (' - ' is any separator character).

This argument is converted to the utf 8 mb 4 character set.
- mask_char: (Optional) The single character to use for masking. The default is ' * ' if mask_char is not given.

Return value:
The masked Social Security Number as a string encoded in the utf8mb4 character set, an error if the argument is not the correct length, or NULL if str is in incorrect format or contains a multibyte character.

Example:
```
mysql> SELECT mask_ssn('909-63-6922'), mask_ssn('cdefghijk');
```

```
+--------------------------+--------------------------
| mask_ssn('909-63-6922') | mask_ssn('cdefghijk') |
+---------------------------+-------------------------+
| ***_**-6922 | *******hijk |
+---------------------------+--------------------------
mysql> SELECT mask_ssn('909');
ERROR 1123 (HY000): Can't initialize function 'mask_ssn'; Argument 0 is too short.
mysql> SELECT mask_ssn('123456789123456789');
ERROR 1123 (HY000): Can't initialize function 'mask_ssn'; Argument 0 is too long.
```

mask_uk_nin(str [, mask_char])
Masks a United Kingdom National Insurance Number (UK NIN) and returns the number with all but the first two digits replaced by ' * ' characters. An optional masking character can be specified.

\section*{Arguments:}
- str: The string to mask. The accepted formats are:
- Nine non-separated digits.
- Nine digits grouped in pattern: $x x x-x x-x x x x($ ' - ' is any separator character).
- Nine digits grouped in pattern: $\mathrm{xx}-\mathrm{xxxxxx}-\mathrm{x}$ (' - ' is any separator character).

This argument is converted to the utf8mb4 character set.
- mask_char: (Optional) The single character to use for masking. The default is ' * ' if mask_char is not given.

\section*{Return value:}

The masked UK NIN as a string encoded in the utf8mb4 character set, an error if the argument is not the correct length, or NULL if str is in incorrect format or contains a multibyte character.

\section*{Example:}
```
mysql> SELECT mask_uk_nin('QQ 12 34 56 C'), mask_uk_nin('abcdefghi');
+--------------------------------+---------------------------
| mask_uk_nin('QQ 12 34 56 C') | mask_uk_nin('abcdefghi') |
+--------------------------------+---------------------------
| QQ ** ** ** * | ab******* |
+--------------------------------+---------------------------
mysql> SELECT mask_uk_nin('909');
ERROR 1123 (HY000): Can't initialize function 'mask_uk_nin'; Argument 0 is too short.
mysql> SELECT mask_uk_nin('abcdefghijk');
ERROR 1123 (HY000): Can't initialize function 'mask_uk_nin'; Argument 0 is too long.
```

- mask_uuid(str [, mask_char])

Masks a Universally Unique Identifier (UUID) and returns the number with all meaningful characters replaced by ' * ' characters. An optional masking character can be specified.

\section*{Arguments:}
- str: The string to mask. The accepted format is xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx in which ' $X$ ' is any digit and ' - ' is any separator character This argument is converted to the utf 8 mb 4 character set.
- mask_char: (Optional) The single character to use for masking. The default is ' * ' if mask_char is not given.

Return value:
The masked UUID as a string encoded in the utf 8 mb 4 character set, an error if the argument is not the correct length, or NULL if $s t r$ is in incorrect format or contains a multibyte character.

\section*{Example:}
```
mysql> SELECT mask_uuid(gen_rnd_uuid());
+----------------------------------------+
| mask_uuid(gen_rnd_uuid()) |
+----------------------------------------+
| ********_****_****_****_************* |
+----------------------------------------+
mysql> SELECT mask_uuid('909');
ERROR 1123 (HY000): Can't initialize function 'mask_uuid'; Argument 0 is too short.
mysql> SELECT mask_uuid('123e4567-e89b-12d3-a456-426614174000-123e4567-e89b-12d3');
ERROR 1123 (HY000): Can't initialize function 'mask_uuid'; Argument 0 is too long.
```


\section*{Random Data Generation Component Functions}

The component functions in this section generate random values for different types of data. When possible, generated values have characteristics reserved for demonstration or test values, to avoid having them mistaken for legitimate data. For example, gen_rnd_us_phone( ) returns a US phone number that uses the 555 area code, which is not assigned to phone numbers in actual use. Individual function descriptions describe any exceptions to this principle.
- gen_range(lower, upper)

Generates a random number chosen from a specified range.
Arguments:
- lower: An integer that specifies the lower boundary of the range.
- upper: An integer that specifies the upper boundary of the range, which must not be less than the lower boundary.

Return value:
A random integer (encoded in the utf8mb4 character set) in the range from lower to upper, inclusive, or NULL if the upper argument is less than lower.

\section*{Note}

For better quality of random values, use RAND ( ) instead of this function.

\section*{Example:}
```
mysql> SELECT gen_range(100, 200), gen_range(-1000, -800);
```

```
+-----------------------+------------------------
| gen_range(100, 200) | gen_range(-1000, -800) |
+----------------------+-------------------------
| 177 | -917 |
+----------------------+-------------------------
mysql> SELECT gen_range(1, 0);
+------------------+
| gen_range(1, 0) |
+------------------+
| NULL |
+------------------+
```

- gen_rnd_canada_sin()

Generates a random Canada Social Insurance Number (SIN) in AAA-BBB-CCC format. The generated number passes the Luhn check algorithm, which ensures the consistency of this number.

\section*{Warning}

Values returned from gen_rnd_canada_sin( ) should be used only for test purposes, and are not suitable for publication. There is no way to guarantee that a given return value is not assigned to a legitimate Canada SIN. Should it be necessary to publish a gen_rnd_canada_sin( ) result, consider masking it with mask_canada_sin( ).

\section*{Arguments:}

None.

\section*{Return value:}

A random Canada SIN as a string encoded in the utf8mb4 character set.
Example:
```
mysql> SELECT mask_canada_sin( gen_rnd_canada_sin() );
+-----------------------------------------+
| mask_canada_sin( gen_rnd_canada_sin() ) |
+------------------------------------------+
| xxx-xxx-xxx |
+------------------------------------------+
```

- gen_rnd_email(name_size, surname_size, domain)

Generates a random email address in the form of random_name.random_surname@domain.

\section*{Arguments:}
- name_size: (Optional) An integer that specifies the number of characters in the name part of an address. The default is five if name_size is not given.
- surname_size: (Optional) An integer that specifies the number of characters in the surname part of an address. The default is seven if surname_size is not given.
- domain: (Optional) A string that specifies the domain part of the address. The default is example.com if domain is not given.

Return value:
A random email address as a string encoded in the utf8mb4 character set.

\section*{Example:}
```
mysql> SELECT gen_rnd_email(name_size = 4, surname_size = 5, domain = 'mynet.com');
```

```
| gen_rnd_email(name_size = 4, surname_size = 5, domain = 'mynet.com') |
+--------------------------------------------------------------------------
| lsoy.qwupp@mynet.com |
+---------------------------------------------------------------------------
mysql> SELECT gen_rnd_email();
+-----------------------------+
| gen_rnd_email() |
+----------------------------+
| ijocv.mwvhhuf@example.com |
+----------------------------+
```

- gen_rnd_iban([country, size])

Generates a random International Bank Account Number (IBAN) in AAAA BBBB CCCC DDDD format. The generated string starts with a two-character country code, two check digits computed according to the IBAN specification and random alphanumeric characters up to the required size.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1600.jpg?height=126&width=113&top_left_y=868&top_left_x=333)

\section*{Warning}

Values returned from gen_rnd_iban( ) should be used only for test purposes, and are not suitable for publication if used with a valid country code. There is no way to guarantee that a given return value is not assigned to a legitimate bank account. Should it be necessary to publish a gen_rnd_iban( ) result, consider masking it with mask_iban( ).

Arguments:
- country: (Optional) Two-character country code; default value is ZZ
- size: (Optional) Number of meaningful characters; default 16 , minimum 15, maximum 34

Return value:
A random IBAN as a string encoded in the utf 8 mb 4 character set.

\section*{Example:}
```
mysql> SELECT gen_rnd_iban();
+------------------------------+
| gen_rnd_iban() |
+-----------------------------+
| ZZ79 3K2J WNH9 1V0DI |
+-----------------------------+
```

- gen_rnd_pan([size])

Generates a random payment card Primary Account Number. The number passes the Luhn check (an algorithm that performs a checksum verification against a check digit).

\section*{Warning}

Values returned from gen_rnd_pan ( ) should be used only for test purposes, and are not suitable for publication. There is no way to guarantee that a given return value is not assigned to a legitimate payment account.

\section*{Should it be necessary to publish a gen_rnd_pan ( ) result, consider}
masking it with mask_pan() or mask_pan_relaxed( ).

\section*{Arguments:}
- size: (Optional) An integer that specifies the size of the result. The default is 16 if size is not given. If given, size must be an integer in the range from 12 to 19.

Return value:
A random payment number as a string, or an error if a size argument outside the permitted range is given.

\section*{Example:}
```
mysql> SELECT mask_pan(gen_rnd_pan());
+---------------------------+
| mask_pan(gen_rnd_pan()) |
+---------------------------+
| XXXXXXXXXXXX5805 |
+---------------------------+
mysql> SELECT mask_pan(gen_rnd_pan(19));
+----------------------------+
| mask_pan(gen_rnd_pan(19)) |
+----------------------------+
| XXXXXXXXXXXXXXX5067 |
+-----------------------------+
mysql> SELECT mask_pan_relaxed(gen_rnd_pan());
+----------------------------------+
| mask_pan_relaxed(gen_rnd_pan()) |
+----------------------------------+
| 398403XXXXXX9547
+-----------------------------------+
mysql> SELECT mask_pan_relaxed(gen_rnd_pan(19));
+------------------------------------+
| mask_pan_relaxed(gen_rnd_pan(19)) |
+-------------------------------------+
| 578416XXXXXXXXX6509 |
+------------------------------------+
mysql> SELECT gen_rnd_pan(20);
ERROR 1123 (HY000): Can't initialize function 'gen_rnd_pan'; Maximal value of
argument 0 is 20.
```

```
gen_rnd_ssn()
```


Generates a random US Social Security Number in AAA-BB-CCCC format. The AAA part is greater than 900 , which is outside the range used for legitimate social security numbers.

\section*{Arguments:}

None.

\section*{Return value:}

A random Social Security Number as a string encoded in the utf8mb4 character set.

\section*{Example:}
```
mysql> SELECT gen_rnd_ssn();
+----------------+
| gen_rnd_ssn() |
+----------------+
| 951-26-0058 |
+----------------+
```

- gen_rnd_uk_nin( )

Generates a random United Kingdom National Insurance Number (UK NIN) in nine-character format. NIN starts with two character prefix randomly selected from the set of valid prefixes, six random numbers, and one character suffix randomly selected from the set of valid suffixes.

\section*{Warning}

Values returned from gen_rnd_uk_nin( ) should be used only for test purposes, and are not suitable for publication. There is no way to guarantee that a given return value is not assigned to a legitimate NIN. Should it be necessary to publish a gen_rnd_uk_nin ( ) result, consider masking it with mask_uk_nin().

Arguments:
None.
Return value:
A random UK NIN as a string encoded in the utf8mb4 character set.
Example:
```
mysql> SELECT mask_uk_nin( gen_rnd_uk_nin() );
+----------------------------------+
| mask_uk_nin( gen_rnd_uk_nin() ) |
+----------------------------------+
| JE******* |
+----------------------------------+
```

- gen_rnd_us_phone( )

Generates a random US phone number in 1-555-AAA-BBBB format. The 555 area code is not used for legitimate phone numbers.

Arguments:
None.
Return value:
A random US phone number as a string encoded in the utf8mb4 character set.
Example:
```
mysql> SELECT gen_rnd_us_phone();
+---------------------+
| gen_rnd_us_phone() |
+---------------------+
| 1-555-682-5423 |
+---------------------+
```

- gen_rnd_uuid()

Generates a random Universally Unique Identifier (UUID) segmented with dashes.
Arguments:
None.
Return value:
A random UUID as a string encoded in the utf8mb4 character set.
Example:
```
mysql> SELECT gen_rnd_uuid();
+----------------------------------------+
| gen_rnd_uuid() |
+----------------------------------------+
| 123e4567-e89b-12d3-a456-426614174000 |
+----------------------------------------+
```


\section*{Dictionary Masking Administration Component Functions}

The component functions in this section manipulate dictionaries of terms and perform administrative masking operations based on them. All of these functions require the MASKING_DICTIONARIES_ADMIN privilege.

When a dictionary of terms is created, it becomes part of the dictionary registry and is assigned a name to be used by other dictionary functions.
- masking_dictionaries_flush()

Flush the data from the masking dictionaries table to the memory cache. Requires the MASKING_DICTIONARIES_ADMIN privilege.
- masking_dictionary_remove(dictionary_name)

Removes a dictionary and all of its terms from the dictionary registry. This function requires the MASKING_DICTIONARIES_ADMIN privilege.

Arguments:
- dictionary_name: A string that names the dictionary to remove from the dictionary table. This argument is converted to the utf 8 mb 4 character set.

Return value:
A string that indicates whether the remove operation succeeded. 1 indicates success. NULL indicates the dictionary name is not found.

Example:
```
mysql> SELECT masking_dictionary_remove('mydict');
+---------------------------------------+
| masking_dictionary_remove('mydict') |
+--------------------------------------+
| 1 |
+--------------------------------------+
mysql> SELECT masking_dictionary_remove('no-such-dict');
+--------------------------------------------+
| masking_dictionary_remove('no-such-dict') |
+----------------------------------------------
| NULL |
+----------------------------------------------
```

- masking_dictionary_term_add(dictionary_name, term_name)

Adds one term to the named dictionary. This function requires the MASKING_DICTIONARIES_ADMIN privilege.

\section*{Important}

Dictionaries and their terms are persisted to a table in the mysql schema. All of the terms in a dictionary are accessible to any user account if that user executes gen_dictionary( ) repeatedly. Avoid adding sensitive information to dictionaries.

Each term is defined by a named dictionary. masking_dictionary_term_add( ) permits you to add one dictionary term at a time.

Arguments:
- dictionary_name: A string that provides a name for the dictionary. This argument is converted to the utf8mb4 character set.
- term_name: A string that specifies the term name in the dictionary table. This argument is converted to the utf8mb4 character set.

Return value:
A string that indicates whether the add term operation succeeded. 1 indicates success. NULL indicates failure. Term add failure can occur for several reasons, including:
- A term with the given name is already added.
- The dictionary name is not found.

Example:
```
mysql> SELECT masking_dictionary_term_add('mydict','newterm');
+---------------------------------------------------+
| masking_dictionary_term_add('mydict','newterm') |
+----------------------------------------------------
| 1 |
+----------------------------------------------------+
mysql> SELECT masking_dictionary_term_add('mydict','');
+-------------------------------------------
| masking_dictionary_term_add('mydict','') |
+-------------------------------------------
| NULL |
+--------------------------------------------+
```

- masking_dictionary_term_remove(dictionary_name, term_name)

Removes one term from the named dictionary. This function requires the MASKING_DICTIONARIES_ADMIN privilege.

Arguments:
- dictionary_name: A string that provides a name for the dictionary. This argument is converted to the utf8mb4 character set.
- term_name: A string that specifies the term name in the dictionary table. This argument is converted to the utf8mb4 character set.

Return value:
A string that indicates whether the remove term operation succeeded. 1 indicates success. NULL indicates failure. Term remove failure can occur for several reasons, including:
- A term with the given name is not found.
- The dictionary name is not found.

Example:
```
mysql> SELECT masking_dictionary_term_add('mydict','newterm');
+---------------------------------------------------+
| masking_dictionary_term_add('mydict','newterm') |
+---------------------------------------------------+
| 1 |
+----------------------------------------------------
mysql> SELECT masking_dictionary_term_remove('mydict','');
+----------------------------------------------
| masking_dictionary_term_remove('mydict','') |
+-----------------------------------------------
| NULL |
+----------------------------------------------
```


\section*{Dictionary Generating Component Functions}

The component functions in this section manipulate dictionaries of terms and perform generating operations based on them.

When a dictionary of terms is created, it becomes part of the dictionary registry and is assigned a name to be used by other dictionary functions.
- gen_blocklist(str, from_dictionary_name, to_dictionary_name)

Replaces a term present in one dictionary with a term from a second dictionary and returns the replacement term. This masks the original term by substitution.

Arguments:
- term: A string that indicates the term to replace. This argument is converted to the utf 8 mb 4 character set.
- from_dictionary_name: A string that names the dictionary containing the term to replace. This argument is converted to the utf 8 mb 4 character set.
- to_dictionary_name: A string that names the dictionary from which to choose the replacement term. This argument is converted to the utf 8 mb 4 character set.

Return value:

A string encoded in the utf8mb4 character set randomly chosen from to_dictionary_name as a replacement for term, or term if it does not appear in from_dictionary_name, or an error if either dictionary name is not in the dictionary registry.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1606.jpg?height=129&width=103&top_left_y=411&top_left_x=338)

Note
If the term to replace appears in both dictionaries, it is possible for the return value to be the same term.

Example:
```
mysql> SELECT gen_blocklist('Berlin', 'DE_Cities', 'US_Cities');
+------------------------------------------------------
| gen_blocklist('Berlin', 'DE_Cities', 'US_Cities') |
+------------------------------------------------------
| Phoenix
+-----------------------------------------------------
```

- gen_dictionary(dictionary_name)

Returns a random term from a dictionary.
Arguments:
- dictionary_name: A string that names the dictionary from which to choose the term. This argument is converted to the utf 8 mb 4 character set.

Return value:
A random term from the dictionary as a string encoded in the utf8mb4 character set, or NULL if the dictionary name is not in the dictionary registry.

\section*{Example:}
```
mysql> SELECT gen_dictionary('mydict');
+----------------------------+
| gen_dictionary('mydict') |
+---------------------------+
| My term |
+---------------------------+
mysql> SELECT gen_dictionary('no-such-dict');
ERROR 1123 (HY000): Can't initialize function 'gen_dictionary'; Cannot access
dictionary, check if dictionary name is valid.
```


\subsection*{8.5.2.5 MySQL Enterprise Data Masking and De-Identification Component Variables}

The MySQL Enterprise Data Masking and De-Identification components support the following system variables. Use these variables to configure related component operations. Variables are unavailable unless the appropriate MySQL Enterprise Data Masking and De-Identification components are installed (see Section 8.5.2.1, "MySQL Enterprise Data Masking and De-Identification Component Installation").
- component_masking.dictionaries_flush_interval_seconds

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --component-masking.dictionaries-flush-interval-seconds=\# & \multirow{6}{*}{interval} \\
\hline System Variable & component_masking.dictionaries_flush_ & \\
\hline Scope & Global & \\
\hline Dynamic & No & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Integer & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & 0 \\
\hline Minimum Value & 60 \\
\hline Maximum Value (Unix) & 18446744073709551615 \\
\hline Maximum Value (Windows) & 4294967295 \\
\hline Unit & seconds \\
\hline
\end{tabular}

Sets the interval, in seconds, to wait before attempting to schedule another flush of the data masking dictionaries table to the memory data masking dictionaries cache following a restart or previous execution. The value is handled as listed here:
- 0 : No flushing
- 1-59 inclusive: Round up to 60 , with a warning
- >= 60 : Wait this many seconds to perform flush
- component_masking.masking_database

\begin{tabular}{|l|l|}
\hline Command-Line Format & --component-masking.maskingdatabase[=value] \\
\hline System Variable & component_masking.masking_database \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & mysql \\
\hline
\end{tabular}

Specifies the database to use for data masking dictionaries at server startup. This variable is read only.

Use this variable to set and persist a schema other than the default value (mysql). For additional information about setting up the data-masking components to use an alternative location for the data-masking table, see Install Using a Dedicated Schema. For general guidelines about using the PERSIST ONLY keyword, see Section 15.7.6.1, "SET Syntax for Variable Assignment".

\subsection*{8.5.3 MySQL Enterprise Data Masking and De-Identification Plugin}

MySQL Enterprise Data Masking and De-Identification is based on a plugin library that implements these elements:
- A server-side plugin named data_masking.
- A set of loadable functions provides an SQL-level API for performing masking and de-identification operations. Some of these functions require the SUPER privilege.

\subsection*{8.5.3.1 MySQL Enterprise Data Masking and De-Identification Plugin Installation}

This section describes how to install or uninstall MySQL Enterprise Data Masking and De-Identification, which is implemented as a plugin library file containing a plugin and several loadable functions. For general information about installing or uninstalling plugins and loadable functions, see Section 7.6.1, "Installing and Uninstalling Plugins", and Section 7.7.1, "Installing and Uninstalling Loadable Functions".

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

The plugin library file base name is data_masking. The file name suffix differs per platform (for example, . so for Unix and Unix-like systems, . dll for Windows).

To install the MySQL Enterprise Data Masking and De-Identification plugin and functions, use the INSTALL PLUGIN and CREATE FUNCTION statements, adjusting the .so suffix for your platform as necessary:
```
INSTALL PLUGIN data_masking SONAME 'data_masking.so';
CREATE FUNCTION gen_blocklist RETURNS STRING
    SONAME 'data_masking.so';
CREATE FUNCTION gen_dictionary RETURNS STRING
    SONAME 'data_masking.so';
CREATE FUNCTION gen_dictionary_drop RETURNS STRING
    SONAME 'data_masking.so';
CREATE FUNCTION gen_dictionary_load RETURNS STRING
    SONAME 'data_masking.so';
CREATE FUNCTION gen_range RETURNS INTEGER
    SONAME 'data_masking.so';
CREATE FUNCTION gen_rnd_email RETURNS STRING
    SONAME 'data_masking.so';
CREATE FUNCTION gen_rnd_pan RETURNS STRING
    SONAME 'data_masking.so';
CREATE FUNCTION gen_rnd_ssn RETURNS STRING
    SONAME 'data_masking.so';
CREATE FUNCTION gen_rnd_us_phone RETURNS STRING
    SONAME 'data_masking.so';
CREATE FUNCTION mask_inner RETURNS STRING
    SONAME 'data_masking.so';
CREATE FUNCTION mask_outer RETURNS STRING
    SONAME 'data_masking.so';
CREATE FUNCTION mask_pan RETURNS STRING
    SONAME 'data_masking.so';
CREATE FUNCTION mask_pan_relaxed RETURNS STRING
    SONAME 'data_masking.so';
CREATE FUNCTION mask_ssn RETURNS STRING
    SONAME 'data_masking.so';
```


If the plugin and functions are used on a replication source server, install them on all replica servers as well to avoid replication issues.

Once installed as just described, the plugin and functions remain installed until uninstalled. To remove them, use the UNINSTALL PLUGIN and DROP FUNCTION statements:
```
UNINSTALL PLUGIN data_masking;
DROP FUNCTION gen_blocklist;
DROP FUNCTION gen_dictionary;
DROP FUNCTION gen_dictionary_drop;
DROP FUNCTION gen_dictionary_load;
DROP FUNCTION gen_range;
DROP FUNCTION gen_rnd_email;
DROP FUNCTION gen_rnd_pan;
DROP FUNCTION gen_rnd_ssn;
DROP FUNCTION gen_rnd_us_phone;
DROP FUNCTION mask_inner;
DROP FUNCTION mask_outer;
DROP FUNCTION mask_pan;
DROP FUNCTION mask_pan_relaxed;
DROP FUNCTION mask_ssn;
```


\subsection*{8.5.3.2 Using the MySQL Enterprise Data Masking and De-Identification Plugin}

Before using MySQL Enterprise Data Masking and De-Identification, install it according to the instructions provided at Section 8.5.3.1, "MySQL Enterprise Data Masking and De-Identification Plugin Installation".

To use MySQL Enterprise Data Masking and De-Identification in applications, invoke the functions that are appropriate for the operations you wish to perform. For detailed function descriptions, see Section 8.5.3.4, "MySQL Enterprise Data Masking and De-Identification Plugin Function Descriptions". This section demonstrates how to use the functions to carry out some representative tasks. It first
presents an overview of the available functions, followed by some examples of how the functions might be used in real-world context:
- Masking Data to Remove Identifying Characteristics
- Generating Random Data with Specific Characteristics
- Generating Random Data Using Dictionaries
- Using Masked Data for Customer Identification
- Creating Views that Display Masked Data

\section*{Masking Data to Remove Identifying Characteristics}

MySQL provides general-purpose masking functions that mask arbitrary strings, and special-purpose masking functions that mask specific types of values.

\section*{General-Purpose Masking Functions}
mask_inner ( ) and mask_outer ( ) are general-purpose functions that mask parts of arbitrary strings based on position within the string:
- mask_inner ( ) masks the interior of its string argument, leaving the ends unmasked. Other arguments specify the sizes of the unmasked ends.
```
mysql> SELECT mask_inner('This is a string', 5, 1);
+----------------------------------------+
| mask_inner('This is a string', 5, 1) |
+----------------------------------------+
| This xxxxxxxxxxg |
+----------------------------------------+
mysql> SELECT mask_inner('This is a string', 1, 5);
+----------------------------------------+
| mask_inner('This is a string', 1, 5) |
+----------------------------------------+
| Txxxxxxxxxxtring
```

- mask_outer ( ) does the reverse, masking the ends of its string argument, leaving the interior unmasked. Other arguments specify the sizes of the masked ends.
```
mysql> SELECT mask_outer('This is a string', 5, 1);
+----------------------------------------+
| mask_outer('This is a string', 5, 1) |
+----------------------------------------+
| XXXXXis a strinX |
+----------------------------------------+
mysql> SELECT mask_outer('This is a string', 1, 5);
+----------------------------------------+
| mask_outer('This is a string', 1, 5) |
+----------------------------------------+
| Xhis is a sXXXXX |
+----------------------------------------+
```


By default, mask_inner ( ) and mask_outer ( ) use ' X ' as the masking character, but permit an optional masking-character argument:
```
mysql> SELECT mask_inner('This is a string', 5, 1, '*');
+--------------------------------------------
| mask_inner('This is a string', 5, 1, '*') |
+---------------------------------------------
| This **********g |
+--------------------------------------------
mysql> SELECT mask_outer('This is a string', 5, 1, '#');
+--------------------------------------------+
| mask_outer('This is a string', 5, 1, '#') |
+---------------------------------------------
| #####is a strin#
```

+-----------------------------------------------+

\section*{Special-Purpose Masking Functions}

Other masking functions expect a string argument representing a specific type of value and mask it to remove identifying characteristics.

\section*{Note}

The examples here supply function arguments using the random value generation functions that return the appropriate type of value. For more information about generation functions, see Generating Random Data with Specific Characteristics.

Payment card Primary Account Number masking. Masking functions provide strict and relaxed masking of Primary Account Numbers.
- mask_pan( ) masks all but the last four digits of the number:
```
mysql> SELECT mask_pan(gen_rnd_pan());
+---------------------------+
| mask_pan(gen_rnd_pan()) |
+---------------------------+
| XXXXXXXXXXXX2461 |
+---------------------------+
```

- mask_pan_relaxed( ) is similar but does not mask the first six digits that indicate the payment card issuer unmasked:
```
mysql> SELECT mask_pan_relaxed(gen_rnd_pan());
+----------------------------------+
| mask_pan_relaxed(gen_rnd_pan()) |
+----------------------------------+
| 770630XXXXXX0807
+---------------------
```


US Social Security number masking. mask_ssn() masks all but the last four digits of the number:
```
mysql> SELECT mask_ssn(gen_rnd_ssn());
+---------------------------+
| mask_ssn(gen_rnd_ssn()) |
+---------------------------+
| XXX-XX-1723
+---------------------------+
```


\section*{Generating Random Data with Specific Characteristics}

Several functions generate random values. These values can be used for testing, simulation, and so forth.
gen_range( ) returns a random integer selected from a given range:
```
mysql> SELECT gen_range(1, 10);
+-------------------+
| gen_range(1, 10) |
+-------------------+
|6 |
+-------------------+
```

gen_rnd_email( ) returns a random email address in the example.com domain:
```
mysql> SELECT gen_rnd_email();
+-----------------------------+
| gen_rnd_email() |
+-----------------------------+
| ayxnq.xmkpvvy@example.com |
+----------------------------+
```

gen_rnd_pan( ) returns a random payment card Primary Account Number:
```
mysql> SELECT gen_rnd_pan();
```

(The gen_rnd_pan( ) function result is not shown because its return values should be used only for testing purposes, and not for publication. It cannot be guaranteed the number is not assigned to a legitimate payment account.)
gen_rnd_ssn( ) returns a random US Social Security number with the first and second parts each chosen from a range not used for legitimate numbers:
```
mysql> SELECT gen_rnd_ssn();
+----------------+
| gen_rnd_ssn() |
+----------------+
| 912-45-1615 |
+----------------+
```

gen_rnd_us_phone ( ) returns a random US phone number in the 555 area code not used for legitimate numbers:
```
mysql> SELECT gen_rnd_us_phone();
+----------------------+
| gen_rnd_us_phone() |
+---------------------+
| 1-555-747-5627 |
+---------------------+
```


\section*{Generating Random Data Using Dictionaries}

MySQL Enterprise Data Masking and De-Identification enables dictionaries to be used as sources of random values. To use a dictionary, it must first be loaded from a file and given a name. Each loaded dictionary becomes part of the dictionary registry. Items then can be selected from registered dictionaries and used as random values or as replacements for other values.

A valid dictionary file has these characteristics:
- The file contents are plain text, one term per line.
- Empty lines are ignored.
- The file must contain at least one term.

Suppose that a file named de_cities.txt contains these city names in Germany:
```
Berlin
Munich
Bremen
```


Also suppose that a file named us_cities.txt contains these city names in the United States:
```
Chicago
Houston
Phoenix
El Paso
Detroit
```


Assume that the secure_file_priv system variable is set to /usr/local/mysql/mysql-files. In that case, copy the dictionary files to that directory so that the MySQL server can access them. Then use gen_dictionary_load( ) to load the dictionaries into the dictionary registry and assign them names:
```
mysql> SELECT gen_dictionary_load('/usr/local/mysql/mysql-files/de_cities.txt', 'DE_Cities');
+--------------------------------------------------------------------------------
| gen_dictionary_load('/usr/local/mysql/mysql-files/de_cities.txt', 'DE_Cities') |
+--------------------------------------------------------------------------------
| Dictionary load success
+--------------------------------------------------------------------------------
```

```
mysql> SELECT gen_dictionary_load('/usr/local/mysql/mysql-files/us_cities.txt', 'US_Cities');
+-------------------------------------------------------------------------------
| gen_dictionary_load('/usr/local/mysql/mysql-files/us_cities.txt', 'US_Cities') |
+--------------------------------------------------------------------------------
    Dictionary load success
+----------------------------l
```


To select a random term from a dictionary, use gen_dictionary( ):
```
mysql> SELECT gen_dictionary('DE_Cities');
+------------------------------+
| gen_dictionary('DE_Cities') |
+------------------------------+
| Berlin
+------------------------------+
mysql> SELECT gen_dictionary('US_Cities');
+-------------------------------+
| gen_dictionary('US_Cities') |
+------------------------------+
+------------------------------+
```


To select a random term from multiple dictionaries, randomly select one of the dictionaries, then select a term from it:
```
mysql> SELECT gen_dictionary(ELT(gen_range(1,2), 'DE_Cities', 'US_Cities'));
+-------------------------------------------------------------------
| gen_dictionary(ELT(gen_range(1,2), 'DE_Cities', 'US_Cities')) |
+-------------------------------------------------------------------
| Detroit
+------------------------------------------------------------------
mysql> SELECT gen_dictionary(ELT(gen_range(1,2), 'DE_Cities', 'US_Cities'));
+--------------------------------------------------------------------
| gen_dictionary(ELT(gen_range(1,2), 'DE_Cities', 'US_Cities')) |
+------------------------------------------------------------------+
```


The gen_blocklist ( ) function enables a term from one dictionary to be replaced by a term from another dictionary, which effects masking by substitution. Its arguments are the term to replace, the dictionary in which the term appears, and the dictionary from which to choose a replacement. For example, to substitute a US city for a German city, or vice versa, use gen_blocklist ( ) like this:
```
mysql> SELECT gen_blocklist('Munich', 'DE_Cities', 'US_Cities');
+------------------------------------------------------
| gen_blocklist('Munich', 'DE_Cities', 'US_Cities') |
+-------------------------------------------------------
| Houston |
+-----------------------------------------------------+
mysql> SELECT gen_blocklist('El Paso', 'US_Cities', 'DE_Cities');
+-------------------------------------------------------
| gen_blocklist('El Paso', 'US_Cities', 'DE_Cities') |
+--------------------------------------------------------
| Bremen |
```


If the term to replace is not in the first dictionary, gen_blocklist ( ) returns it unchanged:
```
mysql> SELECT gen_blocklist('Moscow', 'DE_Cities', 'US_Cities');
+-------------------------------------------------------
| gen_blocklist('Moscow', 'DE_Cities', 'US_Cities') |
+-------------------------------------------------------+
| Moscow +---------------------------------------------------+
```


\section*{Using Masked Data for Customer Identification}

At customer-service call centers, one common identity verification technique is to ask customers to provide their last four Social Security number (SSN) digits. For example, a customer might say her name is Joanna Bond and that her last four SSN digits are 0007.

Suppose that a customer table containing customer records has these columns:
- id: Customer ID number.
- first_name: Customer first name.
- last_name: Customer last name.
- ssn: Customer Social Security number.

For example, the table might be defined as follows:
```
CREATE TABLE customer
(
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(40),
    last_name VARCHAR(40),
    ssn VARCHAR(11)
);
```


The application used by customer-service representatives to check the customer SSN might execute a query like this:
```
mysql> SELECT id, ssn
    -> FROM customer
    -> WHERE first_name = 'Joanna' AND last_name = 'Bond';
+-----+-------------+
| id | ssn |
+-----+-------------+
| 786 | 906-39-0007 |
+-----+-------------+
```


However, that exposes the SSN to the customer-service representative, who has no need to see anything but the last four digits. Instead, the application can use this query to display only the masked SSN:
```
mysql> SELECT id, mask_ssn(CONVERT(ssn USING binary)) AS masked_ssn
    -> FROM customer
    -> WHERE first_name = 'Joanna' AND last_name = 'Bond';
+-----+-------------+
| id | masked_ssn |
+-----+-------------+
| 786 | XXX-XX-0007 |
+-----+-------------+
```


Now the representative sees only what is necessary, and customer privacy is preserved.
Why was the CONVERT( ) function used for the argument to mask_ssn( )? Because mask_ssn( ) requires an argument of length 11 . Thus, even though ssn is defined as $\operatorname{VARCHAR}(11)$, if the ssn column has a multibyte character set, it may appear to be longer than 11 bytes when passed to a loadable function, and an error occurs. Converting the value to a binary string ensures that the function sees an argument of length 11.

A similar technique may be needed for other data masking functions when string arguments do not have a single-byte character set.

\section*{Creating Views that Display Masked Data}

If masked data from a table is used for multiple queries, it may be convenient to define a view that produces masked data. That way, applications can select from the view without performing masking in individual queries.

For example, a masking view on the customer table from the previous section can be defined like this:
```
CREATE VIEW masked_customer AS
SELECT id, first_name, last_name,
mask_ssn(CONVERT(ssn USING binary)) AS masked_ssn
FROM customer;
```


Then the query to look up a customer becomes simpler but still returns masked data:
```
mysql> SELECT id, masked_ssn
mysql> FROM masked_customer
mysql> WHERE first_name = 'Joanna' AND last_name = 'Bond';
+-----+--------------+
| id | masked_ssn |
+-----+--------------+
| 786 | XXX-XX-0007 |
+-----+--------------+
```


\subsection*{8.5.3.3 MySQL Enterprise Data Masking and De-Identification Plugin Function Reference}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.47 MySQL Enterprise Data Masking and De-Identification Plugin Functions}
\begin{tabular}{|l|l|l|}
\hline Name & Description & Deprecated \\
\hline gen_blacklist() & Perform dictionary term replacement & Yes \\
\hline gen_blocklist() & Perform dictionary term replacement & \\
\hline gen_dictionary_drop() & Remove dictionary from registry & \\
\hline gen_dictionary_load() & Load dictionary into registry & \\
\hline gen_dictionary() & Return random term from dictionary & \\
\hline gen_range() & Generate random number within range & \\
\hline gen_rnd_email() & Generate random email address & \\
\hline gen_rnd_pan() & Generate random payment card Primary Account Number & \\
\hline gen_rnd_ssn() & Generate random US Social Security Number & \\
\hline gen_rnd_us_phone() & Generate random US phone number & \\
\hline mask_inner() & Mask interior part of string & \\
\hline mask_outer() & Mask left and right parts of string & \\
\hline mask_pan() & Mask payment card Primary Account Number part of string & \\
\hline mask_pan_relaxed () & Mask payment card Primary Account Number part of string & \\
\hline mask_ssn() & Mask US Social Security Number & \\
\hline
\end{tabular}
\end{table}

\subsection*{8.5.3.4 MySQL Enterprise Data Masking and De-Identification Plugin Function Descriptions}

The MySQL Enterprise Data Masking and De-Identification plugin library includes several functions, which may be grouped into these categories:
- Data Masking Plugin Functions
- Random Data Generation Plugin Functions
- Random Data Dictionary-Based Plugin Functions

These functions support the single-byte latin1 character set for string arguments and return values. If a string return value should be in a different character set, convert it. The following example shows how to convert the result of gen_rnd_email( ) to the utf8mb4 character set:
```
SET @email = CONVERT(gen_rnd_email() USING utf8mb4);
```


It may also be necessary to convert string arguments, as illustrated in Using Masked Data for Customer Identification.

If a MySQL Enterprise Data Masking and De-Identification function is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the - -binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".

\section*{Data Masking Plugin Functions}

Each plugin function in this section performs a masking operation on its string argument and returns the masked result.
- mask_inner(str, margin1, margin2 [, mask_char])

Masks the interior part of a string, leaving the ends untouched, and returns the result. An optional masking character can be specified.

Arguments:
- str: The string to mask.
- margin1: A nonnegative integer that specifies the number of characters on the left end of the string to remain unmasked. If the value is 0 , no left end characters remain unmasked.
- margin2: A nonnegative integer that specifies the number of characters on the right end of the string to remain unmasked. If the value is 0 , no right end characters remain unmasked.
- mask_char: (Optional) The single character to use for masking. The default is ' X ' if mask_char is not given.

The masking character must be a single-byte character. Attempts to use a multibyte character produce an error.

\section*{Return value:}

The masked string, or NULL if either margin is negative.
If the sum of the margin values is larger than the argument length, no masking occurs and the argument is returned unchanged.

\section*{Example:}
```
mysql> SELECT mask_inner('abcdef', 1, 2), mask_inner('abcdef',0, 5);
+------------------------------+----------------------------
| mask_inner('abcdef', 1, 2) | mask_inner('abcdef',0, 5) |
+------------------------------+----------------------------
| aXXXef | Xbcdef |
+------------------------------+----------------------------
mysql> SELECT mask_inner('abcdef', 1, 2, '*'), mask_inner('abcdef',0, 5, '#');
+------------------------------------+----------------------------------
| mask_inner('abcdef', 1, 2, '*') | mask_inner('abcdef',0, 5, '#') |
+-----------------------------------+---------------------------------
| a***ef | #bcdef |
+-----------------------------------+--------------------------------
```

- mask_outer(str, margin1, margin2 [, mask_char])

Masks the left and right ends of a string, leaving the interior unmasked, and returns the result. An optional masking character can be specified.

\section*{Arguments:}
- str: The string to mask.
- margin1: A nonnegative integer that specifies the number of characters on the left end of the string to mask. If the value is 0 , no left end characters are masked.
- margin2: A nonnegative integer that specifies the number of characters on the right end of the string to mask. If the value is 0 , no right end characters are masked.
- mask_char:(Optional) The single character to use for masking. The default is ' X ' if mask_char is not given.

The masking character must be a single-byte character. Attempts to use a multibyte character produce an error.

Return value:
The masked string, or NULL if either margin is negative.
If the sum of the margin values is larger than the argument length, the entire argument is masked.

\section*{Example:}
```
mysql> SELECT mask_outer('abcdef', 1, 2), mask_outer('abcdef',0, 5);
+------------------------------+----------------------------
| mask_outer('abcdef', 1, 2) | mask_outer('abcdef',0, 5) |
+-------------------------------+---------------------------
| XbcdXX | aXXXXX |
+-------------------------------+----------------------------
mysql> SELECT mask_outer('abcdef', 1, 2, '*'), mask_outer('abcdef',0, 5, '#');
+------------------------------------+----------------------------------
| mask_outer('abcdef', 1, 2, '*') | mask_outer('abcdef',0, 5, '#') |
+-----------------------------------+---------------------------------
| *bcd** | a##### |
+-----------------------------------+--------------------------------
```

mask_pan(str)
Masks a payment card Primary Account Number and returns the number with all but the last four digits replaced by ' $X$ ' characters.

Arguments:
- str: The string to mask. The string must be a suitable length for the Primary Account Number, but is not otherwise checked.

Return value:
The masked payment number as a string. If the argument is shorter than required, it is returned unchanged.

\section*{Example:}
```
mysql> SELECT mask_pan(gen_rnd_pan());
+---------------------------+
| mask_pan(gen_rnd_pan()) |
+---------------------------+
| xxxxxxxxxxxx9102 |
+---------------------------+
mysql> SELECT mask_pan(gen_rnd_pan(19));
+-----------------------------+
| mask_pan(gen_rnd_pan(19)) |
+-----------------------------+
| XXXXXXXXXXXXXXX8268 |
+-----------------------------+
mysql> SELECT mask_pan('a*Z');
```

```
+------------------+
| mask_pan('a*Z') |
+------------------+
| a*z |
+------------------+
```

- mask_pan_relaxed(str)

Masks a payment card Primary Account Number and returns the number with all but the first six and last four digits replaced by ' $X$ ' characters. The first six digits indicate the payment card issuer.

\section*{Arguments:}
- str: The string to mask. The string must be a suitable length for the Primary Account Number, but is not otherwise checked.

Return value:
The masked payment number as a string. If the argument is shorter than required, it is returned unchanged.

Example:
```
mysql> SELECT mask_pan_relaxed(gen_rnd_pan());
+----------------------------------+
| mask_pan_relaxed(gen_rnd_pan()) |
+-----------------------------------+
| 551279XXXXXX3108 |
+-----------------------------------+
mysql> SELECT mask_pan_relaxed(gen_rnd_pan(19));
+------------------------------------+
| mask_pan_relaxed(gen_rnd_pan(19)) |
+-------------------------------------+
| 462634XXXXXXXXX6739 |
+-------------------------------------+
mysql> SELECT mask_pan_relaxed('a*Z');
+---------------------------+
| mask_pan_relaxed('a*Z') |
+---------------------------+
| a*z |
+---------------------------+
```

mask_ssn(str)
Masks a US Social Security number and returns the number with all but the last four digits replaced by ' X ' characters.

\section*{Arguments:}
- str: The string to mask. The string must be 11 characters long.

Return value:
The masked Social Security number as a string, or an error if the argument is not the correct length.

\section*{Example:}
```
mysql> SELECT mask_ssn('909-63-6922'), mask_ssn('abcdefghijk');
+---------------------------+-------------------------+
| mask_ssn('909-63-6922') | mask_ssn('abcdefghijk') |
+---------------------------+-------------------------+
| XXX-XX-6922 | XXX-XX-hijk |
+---------------------------+-------------------------+
mysql> SELECT mask_ssn('909');
ERROR 1123 (HY000): Can't initialize function 'mask_ssn'; MASK_SSN: Error:
String argument width too small
mysql> SELECT mask_ssn('123456789123456789');
```


ERROR 1123 (HY000): Can't initialize function 'mask_ssn'; MASK_SSN: Error:
String argument width too large

\section*{Random Data Generation Plugin Functions}

The plugin functions in this section generate random values for different types of data. When possible, generated values have characteristics reserved for demonstration or test values, to avoid having them mistaken for legitimate data. For example, gen_rnd_us_phone( ) returns a US phone number that uses the 555 area code, which is not assigned to phone numbers in actual use. Individual function descriptions describe any exceptions to this principle.
- gen_range(lower, upper)

Generates a random number chosen from a specified range.
Arguments:
- lower: An integer that specifies the lower boundary of the range.
- upper: An integer that specifies the upper boundary of the range, which must not be less than the lower boundary.

Return value:
A random integer in the range from lower to upper, inclusive, or NULL if the upper argument is less than lower.

Example:
```
mysql> SELECT gen_range(100, 200), gen_range(-1000, -800);
+----------------------+------------------------+
| gen_range(100, 200) | gen_range(-1000, -800) |
+----------------------+------------------------
| 177 | -917 |
+----------------------+------------------------
mysql> SELECT gen_range(1, 0);
+------------------+
| gen_range(1, 0) |
+------------------+
| NULL |
+------------------+
```

- gen_rnd_email()

Generates a random email address in the example.com domain.
Arguments:
None.
Return value:
A random email address as a string.
Example:
```
mysql> SELECT gen_rnd_email();
+-----------------------------+
| gen_rnd_email() |
+----------------------------+
| ijocv.mwvhhuf@example.com |
+-----------------------------+
```

- gen_rnd_pan([size])

Generates a random payment card Primary Account Number. The number passes the Luhn check (an algorithm that performs a checksum verification against a check digit).

\section*{Warning}

Values returned from gen_rnd_pan( ) should be used only for test purposes, and are not suitable for publication. There is no way to guarantee that a given return value is not assigned to a legitimate payment account. Should it be necessary to publish a gen_rnd_pan ( ) result, consider masking it with mask_pan() or mask_pan_relaxed( ).

\section*{Arguments:}
- size: (Optional) An integer that specifies the size of the result. The default is 16 if size is not given. If given, size must be an integer in the range from 12 to 19.

Return value:
A random payment number as a string, or NULL if a size argument outside the permitted range is given.

\section*{Example:}
```
mysql> SELECT mask_pan(gen_rnd_pan());
+---------------------------+
| mask_pan(gen_rnd_pan()) |
+---------------------------+
| xxxxxxxxxxxx5805 |
+---------------------------+
mysql> SELECT mask_pan(gen_rnd_pan(19));
+-----------------------------+
| mask_pan(gen_rnd_pan(19)) |
+-----------------------------+
| xxxxxxxxxxxxxxx5067 |
+-----------------------------+
mysql> SELECT mask_pan_relaxed(gen_rnd_pan());
+----------------------------------+
| mask_pan_relaxed(gen_rnd_pan()) |
+----------------------------------+
| 398403XXXXXX9547 |
+----------------------------------+
mysql> SELECT mask_pan_relaxed(gen_rnd_pan(19));
+------------------------------------+
| mask_pan_relaxed(gen_rnd_pan(19)) |
+-------------------------------------+
| 578416XXXXXXXXX6509 |
+------------------------------------+
mysql> SELECT gen_rnd_pan(11), gen_rnd_pan(20);
+------------------+-----------------+
| gen_rnd_pan(11) | gen_rnd_pan(20) |
+------------------+-----------------+
| NULL | NULL |
+------------------+-----------------+
```

- gen_rnd_ssn()

Generates a random US Social Security number in $A A A$ - BB - CCCC format. The AAA part is greater than 900 and the $B B$ part is less than 70 , which are characteristics not used for legitimate Social Security numbers.

Arguments:
None.
Return value:
A random Social Security number as a string.
Example:
```
mysql> SELECT gen_rnd_ssn();
+----------------+
| gen_rnd_ssn() |
+----------------+
| 951-26-0058 |
+----------------+
```

- gen_rnd_us_phone( )

Generates a random US phone number in 1-555-AAA-BBBB format. The 555 area code is not used for legitimate phone numbers.

Arguments:
None.
Return value:
A random US phone number as a string.
Example:
```
mysql> SELECT gen_rnd_us_phone();
+---------------------+
| gen_rnd_us_phone() |
+---------------------+
| 1-555-682-5423 |
+---------------------+
```


\section*{Random Data Dictionary-Based Plugin Functions}

The plugin functions in this section manipulate dictionaries of terms and perform generation and masking operations based on them. Some of these functions require the SUPER privilege.

When a dictionary is loaded, it becomes part of the dictionary registry and is assigned a name to be used by other dictionary functions. Dictionaries are loaded from plain text files containing one term per line. Empty lines are ignored. To be valid, a dictionary file must contain at least one nonempty line.
- gen_blacklist(str, dictionary_name, replacement_dictionary_name)

Replaces a term present in one dictionary with a term from a second dictionary and returns the replacement term. This masks the original term by substitution. This function is deprecated; use gen_blocklist () instead.
- gen_blocklist(str, dictionary_name, replacement_dictionary_name)

Replaces a term present in one dictionary with a term from a second dictionary and returns the replacement term. This masks the original term by substitution. This function serves as a replacement for the deprecated gen_blacklist () function.

\section*{Arguments:}
- str: A string that indicates the term to replace.
- dictionary_name: A string that names the dictionary containing the term to replace.
- replacement_dictionary_name: A string that names the dictionary from which to choose the replacement term.

\section*{Return value:}

A string randomly chosen from replacement_dictionary_name as a replacement for str, or str if it does not appear in dictionary_name, or NULL if either dictionary name is not in the dictionary registry.

If the term to replace appears in both dictionaries, it is possible for the return value to be the same term.

\section*{Example:}
```
mysql> SELECT gen_blocklist('Berlin', 'DE_Cities', 'US_Cities');
+------------------------------------------------------
| gen_blocklist('Berlin', 'DE_Cities', 'US_Cities') |
+------------------------------------------------------
| Phoenix |
+-----------------------------------------------------+
```

- gen_dictionary(dictionary_name)

Returns a random term from a dictionary.

\section*{Arguments:}
- dictionary_name: A string that names the dictionary from which to choose the term.

Return value:
A random term from the dictionary as a string, or NULL if the dictionary name is not in the dictionary registry.

\section*{Example:}
```
mysql> SELECT gen_dictionary('mydict');
+----------------------------+
| gen_dictionary('mydict') |
+----------------------------+
| My term
+--------------------------+
mysql> SELECT gen_dictionary('no-such-dict');
+---------------------------------+
| gen_dictionary('no-such-dict') |
+---------------------------------+
| NULL
+---------------------------------+
```

- gen_dictionary_drop(dictionary_name)

Removes a dictionary from the dictionary registry.
This function requires the SUPER privilege.
Arguments:
- dictionary_name: A string that names the dictionary to remove from the dictionary registry.

Return value:
A string that indicates whether the drop operation succeeded. Dictionary removed indicates success. Dictionary removal error indicates failure.

\section*{Example:}
```
mysql> SELECT gen_dictionary_drop('mydict');
+--------------------------------+
| gen_dictionary_drop('mydict') |
+---------------------------------+
| Dictionary removed |
+---------------------------------+
mysql> SELECT gen_dictionary_drop('no-such-dict');
+--------------------------------------+
| gen_dictionary_drop('no-such-dict') |
+--------------------------------------+
| Dictionary removal error |
+--------------------------------------+
```

- gen_dictionary_load(dictionary_path, dictionary_name)

Loads a file into the dictionary registry and assigns the dictionary a name to be used with other functions that require a dictionary name argument.

This function requires the SUPER privilege.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1623.jpg?height=168&width=273&top_left_y=497&top_left_x=399)

\section*{Important}

Dictionaries are not persistent. Any dictionary used by applications must be loaded for each server startup.

Once loaded into the registry, a dictionary is used as is, even if the underlying dictionary file changes. To reload a dictionary, first drop it with gen_dictionary_drop( ), then load it again with gen_dictionary_load().

\section*{Arguments:}
- dictionary_path: A string that specifies the path name of the dictionary file.
- dictionary_name: A string that provides a name for the dictionary.

Return value:
A string that indicates whether the load operation succeeded. Dictionary load success indicates success. Dictionary load error indicates failure. Dictionary load failure can occur for several reasons, including:
- A dictionary with the given name is already loaded.
- The dictionary file is not found.
- The dictionary file contains no terms.
- The secure_file_priv system variable is set and the dictionary file is not located in the directory named by the variable.

\section*{Example:}
```
mysql> SELECT gen_dictionary_load('/usr/local/mysql/mysql-files/mydict','mydict');
+-----------------------------------------------------------------------
| gen_dictionary_load('/usr/local/mysql/mysql-files/mydict','mydict') |
+-------------------------------------------------------------------------
| Dictionary load success
+-------------------------------------------------------------------------
mysql> SELECT gen_dictionary_load('/dev/null','null');
+------------------------------------------+
| gen_dictionary_load('/dev/null','null') |
+------------------------------------------
| Dictionary load error
+----------------------------------------+
```


\subsection*{8.6 MySQL Enterprise Encryption}

\section*{Note}

MySQL Enterprise Encryption is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, https://www.mysql.com/products/.

MySQL Enterprise Edition includes a set of encryption functions that expose OpenSSL capabilities at the SQL level. The functions enable Enterprise applications to perform the following operations:
- Implement added data protection using public-key asymmetric cryptography
- Create public and private keys and digital signatures
- Perform asymmetric encryption and decryption
- Use cryptographic hashing for digital signing and data verification and validation

These functions are provided by the MySQL component_enterprise_encryption component.

\subsection*{8.6.1 MySQL Enterprise Encryption Installation and Upgrading}

The functions are provided by a MySQL component component_enterprise_encryption, and installing the component installs all of the functions.

MySQL Enterprise Encryption functions are provided by the MySQL component_enterprise_encryption component. For upgrade information, see Upgrading MySQL Enterprise Encryption.

If you are upgrading from a release prior to MySQL 8.0.30: Before installing the component, unload any legacy functions using the DROP FUNCTION statement:
```
DROP FUNCTION asymmetric_decrypt;
DROP FUNCTION asymmetric_derive;
DROP FUNCTION asymmetric_encrypt;
DROP FUNCTION asymmetric_sign;
DROP FUNCTION asymmetric_verify;
DROP FUNCTION create_asymmetric_priv_key;
DROP FUNCTION create_asymmetric_pub_key;
DROP FUNCTION create_dh_parameters;
DROP FUNCTION create_digest;
```


The function names must be specified in lowercase. The statements require the DROP privilege for the mysql database.

To install the component, issue this INSTALL COMPONENT statement:
INSTALL COMPONENT "file://component_enterprise_encryption";
INSTALL COMPONENT requires the INSERT privilege for the mysql.component system table because it adds a row to that table to register the component. To verify that the component has been installed, issue the statement shown here:

SELECT * FROM mysql.component;
Components listed in mysql. component are loaded by the loader service during the startup sequence.

If you need to uninstall the component, issue an UNINSTALL COMPONENT statement:
UNINSTALL COMPONENT "file://component_enterprise_encryption";
Uninstalling the component uninstalls all of the functions. For more details, see Section 7.5.1, "Installing and Uninstalling Components".

\section*{Note}

Installing the component installs all of its functions, so you do not need to create them using CREATE FUNCTION statements as in older releases of MySQL.

When you have installed the component, if you want the component functions to support decryption and verification for content produced by legacy functions, set the enterprise_encryption.rsa_support_legacy_padding system variable to ON. Also, if you want to change the maximum length allowed for the RSA keys generated by the component functions, use the enterprise_encryption.maximum_rsa_key_size system variable to set an appropriate maximum. For configuration information, see Section 8.6.2, "Configuring MySQL Enterprise Encryption".

\subsection*{8.6.2 Configuring MySQL Enterprise Encryption}

MySQL Enterprise Encryption lets you limit keys to a length that provides adequate security for your requirements while balancing this with resource usage. You can also configure the functions provided by the component_enterprise_encryption component to support decryption and verification for content produced by the old openssl_udf shared library functions.

\section*{Decryption Support By Component Functions For Legacy Functions}

By default, the functions provided by the component_enterprise_encryption component do not decrypt encrypted text, or verify signatures, that were produced by the legacy functions provided in earlier releases by the openssl_udf shared library. The component functions assume that encrypted text uses the RSAES-OAEP padding scheme, and signatures use the RSASSA-PSS signature scheme. However, encrypted text produced by the legacy functions uses the RSAES-PKCS1-v1_5 padding scheme, and signatures produced by the legacy functions use the RSASSA-PKCS1-v1_5 signature scheme.

If you want the component functions to support content produced by the legacy functions, set the enterprise_encryption.rsa_support_legacy_padding system variable to ON. This variable is available when the component is installed. When you set it to 0N, the component functions first attempt to decrypt or verify content assuming it has their normal schemes. If that does not work, they also attempt to decrypt or verify the content assuming it has the schemes used by the old functions. This behavior is not the default because it increases the time taken to process content that cannot be decrypted or verified at all. If you are not handling content produced by the old functions, let the system variable default to OFF.

\section*{Key Length Limits}

The amount of CPU resources required by MySQL Enterprise Encryption's key generation functions increases as the key length increases. For some installations, this might result in unacceptable CPU usage if applications frequently generate excessively long keys.

The functions provided by the component_enterprise_encryption component have a minimum key length of 2048 bits for RSA keys, which is in line with current best practice for minimum key lengths. The enterprise_encryption.maximum_rsa_key_size system variable specifies the maximum key size.

\subsection*{8.6.3 MySQL Enterprise Encryption Usage and Examples}

To use MySQL Enterprise Encryption in applications, invoke the functions that are appropriate for the operations you wish to perform. This section demonstrates how to carry out some representative tasks.

MySQL Enterprise Encryption functions are provided by a MySQL component component_enterprise_encryption. For information about these functions, see Section 8.6.4, "MySQL Enterprise Encryption Function Reference".

The following general considerations apply when choosing key lengths and encryption algorithms:
- The strength of encryption for private and public keys increases with the key size, but the time for key generation increases as well.
- Component functions support RSA keys only.
- Asymmetric encryption functions consume more resources compared to symmetric functions. They are good for encrypting small amounts of data and creating and verifying signatures. For encrypting large amounts of data, symmetric encryption functions are faster. MySQL Server provides the AES_ENCRYPT( ) and AES_DECRYPT ( ) functions for symmetric encryption.

Key string values can be created at runtime and stored into a variable or table using SET, SELECT, or INSERT, as shown here:
```
SET @priv1 = create_asymmetric_priv_key('RSA', 2048);
```

```
SELECT create_asymmetric_priv_key('RSA', 2048) INTO @priv2;
INSERT INTO t (key_col) VALUES(create_asymmetric_priv_key('RSA', 1024));
```


Key string values stored in files can be read using the LOAD_FILE( ) function by users who have the FILE privilege. Digest and signature strings can be handled similarly.
- Create a private/public key pair
- Use the public key to encrypt data and the private key to decrypt it
- Generate a digest from a string
- Use the digest with a key pair

\section*{Create a private/public key pair}

This example works with both the component functions and the legacy functions:
```
-- Encryption algorithm
SET @algo = 'RSA';
-- Key length in bits; make larger for stronger keys
SET @key_len = 2048;
-- Create private key
SET @priv = create_asymmetric_priv_key(@algo, @key_len);
-- Derive corresponding public key from private key, using same algorithm
SET @pub = create_asymmetric_pub_key(@algo, @priv);
```


You can use the key pair to encrypt and decrypt data or to sign and verify data.

\section*{Use the public key to encrypt data and the private key to decrypt it}

This example works with both the component functions and the legacy functions. In both cases, the members of the key pair must be RSA keys:
```
SET @ciphertext = asymmetric_encrypt(@algo, 'My secret text', @pub);
SET @plaintext = asymmetric_decrypt(@algo, @ciphertext, @priv);
```


\section*{Generate a digest from a string}

This example works with both the component functions and the legacy functions:
```
-- Digest type
SET @dig_type = 'SHA512';
-- Generate digest string
SET @dig = create_digest(@dig_type, 'My text to digest');
```


\section*{Use the digest with a key pair}

The key pair can be used to sign data, then verify that the signature matches the digest. This example works with both the component functions and the legacy functions:
```
-- Encryption algorithm; keys must
-- have been created using same algorithm
SET @algo = 'RSA';
-- Digest algorithm to sign the data
SET @dig_type = 'SHA512';
-- Generate signature for digest and verify signature against digest
SET @sig = asymmetric_sign(@algo, @dig, @priv, @dig_type);
-- Verify signature against digest
SET @verf = asymmetric_verify(@algo, @dig, @sig, @pub, @dig_type);
```


For the legacy functions, signatures require a digest. For the component functions, signatures do not require a digest, and can use any data string. The digest type in these functions refers to the algorithm that is used to sign the data, not the algorithm that was used to create the original input for the signature. This example is for the component functions:
```
-- Encryption algorithm; keys must
-- have been created using same algorithm
SET @algo = 'RSA';
-- Arbitrary text string for signature
SET @text = repeat('j', 256);
-- Digest algorithm to sign the data
SET @dig_type = 'SHA512';
-- Generate signature for digest and verify signature against digest
SET @sig = asymmetric_sign(@algo, @text, @priv, @dig_type);
-- Verify signature against digest
SET @verf = asymmetric_verify(@algo, @text, @sig, @pub, @dig_type);
```


\subsection*{8.6.4 MySQL Enterprise Encryption Function Reference}

MySQL Enterprise Encryption functions are provided by the MySQL component_enterprise_encryption component. See Section 8.6.5, "MySQL Enterprise Encryption Component Function Descriptions".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.48 MySQL Enterprise Encryption Functions}
\begin{tabular}{|l|l|}
\hline Name & Description \\
\hline asymmetric_decrypt() & Decrypt ciphertext using private or public key \\
\hline asymmetric_derive() & Derive symmetric key from asymmetric keys \\
\hline asymmetric_encrypt() & Encrypt cleartext using private or public key \\
\hline asymmetric_sign() & Generate signature from digest \\
\hline asymmetric_verify() & Verify that signature matches digest \\
\hline create_asymmetric_priv_key() & Create private key \\
\hline create_asymmetric_pub_key() & Create public key \\
\hline create_dh_parameters() & Generate shared DH secret \\
\hline create_digest() & Generate digest from string \\
\hline
\end{tabular}
\end{table}

\subsection*{8.6.5 MySQL Enterprise Encryption Component Function Descriptions}

MySQL Enterprise Encryption functions have these general characteristics:
- For arguments of the wrong type or an incorrect number of arguments, each function returns an error.
- If the arguments are not suitable to permit a function to perform the requested operation, it returns NULL or 0 as appropriate. This occurs, for example, if a function does not support a specified algorithm, a key length is too short or long, or a string expected to be a key string in PEM format is not a valid key.
- The underlying SSL library takes care of randomness initialization.

The component functions only support the RSA encryption algorithm.
For additional examples and discussion, see Section 8.6.3, "MySQL Enterprise Encryption Usage and Examples".
- asymmetric_decrypt(algorithm, data_str, priv_key_str)

Decrypts an encrypted string using the given algorithm and key string, and returns the resulting plaintext as a binary string. If decryption fails, the result is NULL.

For the legacy version of this function in use before MySQL 8.0.29, see MySQL Enterprise Encryption Legacy Function Descriptions.

By default, the component_enterprise_encryption function assumes that encrypted text uses the RSAES-OAEP padding scheme. The function supports decryption for content encrypted by the old openssl_udf shared library functions if the system variable enterprise_encryption.rsa_support_legacy_padding is set to ON (the default is OFF). When this is ON, the function also supports the RSAES-PKCS1-v1_5 padding scheme, as used by the old openssl_udf shared library functions. When the variable is set to OFF, content encrypted by the legacy functions cannot be decrypted, and the function returns null output for such content.
algorithm is the encryption algorithm used to create the key. The supported algorithm value is 'RSA'.
data_str is the encrypted string to decrypt, which was encrypted with asymmetric_encrypt().
priv_key_str is a valid PEM encoded RSA private key. For successful decryption, the key string must correspond to the public key string used with asymmetric_encrypt () to produce the encrypted string. The asymmetric_encrypt ( ) component function only supports encryption using a public key, so decryption takes place with the corresponding private key.

For a usage example, see the description of asymmetric_encrypt ( ).
- asymmetric_encrypt(algorithm, data_str, pub_key_str)

Encrypts a string using the given algorithm and key string, and returns the resulting ciphertext as a binary string. If encryption fails, the result is NULL.

For the legacy version of this function in use before MySQL 8.0.29, see MySQL Enterprise Encryption Legacy Function Descriptions.
algorithm is the encryption algorithm used to create the key. The supported algorithm value is 'RSA'.
data_str is the string to encrypt. The length of this string cannot be greater than the key string length in bytes, minus 42 (to account for the padding).
pub_key_str is a valid PEM encoded RSA public key. The asymmetric_encrypt ( ) component function only supports encryption using a public key.

To recover the original unencrypted string, pass the encrypted string to asymmetric_decrypt ( ), along with the other part of the key pair used for encryption, as in the following example:
```
-- Generate private/public key pair
SET @priv = create_asymmetric_priv_key('RSA', 2048);
SET @pub = create_asymmetric_pub_key('RSA', @priv);
-- Encrypt using public key, decrypt using private key
SET @ciphertext = asymmetric_encrypt('RSA', 'The quick brown fox', @pub);
SET @plaintext = asymmetric_decrypt('RSA', @ciphertext, @priv);
```


Suppose that:
```
SET @s = a string to be encrypted
SET @priv = a valid private RSA key string in PEM format
SET @pub = the corresponding public RSA key string in PEM format
```


Then these identity relationships hold:
```
asymmetric_decrypt('RSA', asymmetric_encrypt('RSA', @s, @pub), @priv) = @s
```

```
- asymmetric_sign(algorithm, text, priv_key_str, digest_type)
```


Signs a digest string or data string using a private key, and returns the signature as a binary string. If signing fails, the result is NULL.

For the legacy version of this function in use before MySQL 8.0.29, see MySQL Enterprise Encryption Legacy Function Descriptions.
algorithm is the encryption algorithm used to create the key. The supported algorithm value is 'RSA'.
text is a data string or digest string. The function accepts digests but does not require them, as it is also capable of handling data strings of an arbitrary length. A digest string can be generated by calling create_digest().
priv_key_str is the private key string to use for signing the digest string. It must be a valid PEM encoded RSA private key.
digest_type is the algorithm to be used to sign the data. The supported digest_type values are 'SHA224', 'SHA256', 'SHA384', and 'SHA512' when OpenSSL 1.0.1 is in use. If OpenSSL 1.1.1 is in use, the additional digest_type values 'SHA3-224', 'SHA3-256', 'SHA3-384', and 'SHA3-512' are available.

For a usage example, see the description of asymmetric_verify().
- asymmetric_verify(algorithm, text, sig_str, pub_key_str, digest_type)

Verifies whether the signature string matches the digest string, and returns 1 or 0 to indicate whether verification succeeded or failed. If verification fails, the result is NULL.

By default, the component_enterprise_encryption function assumes that signatures use the RSASSA-PSS signature scheme. The function supports verification for signatures produced by the old openssl_udf shared library functions if the system variable enterprise_encryption.rsa_support_legacy_padding is set to ON (the default is OFF). When this is ON, the function also supports the RSASSA-PKCS1-v1_5 signature scheme, as used by the old openssl_udf shared library functions; when it is 0FF, signatures produced by the legacy functions cannot be verified, and the function returns null output for such content.
algorithm is the encryption algorithm used to create the key. The supported algorithm value is 'RSA'.
text is a data string or digest string. The component function accepts digests but does not require them, as it is also capable of handling data strings of an arbitrary length. A digest string can be generated by calling create_digest ().
sig_str is the signature string to be verified. A signature string can be generated by calling asymmetric_sign().
pub_key_str is the public key string of the signer. It corresponds to the private key passed to asymmetric_sign( ) to generate the signature string. It must be a valid PEM encoded RSA public key.
digest_type is the algorithm that was used to sign the data. The supported digest_type values are 'SHA224', 'SHA256', 'SHA384', and 'SHA512' when OpenSSL 1.0.1 is in use. If OpenSSL 1.1.1 is in use, the additional digest_type values 'SHA3-224', 'SHA3-256', 'SHA3-384', and 'SHA3-512' are available.
```
-- Set the encryption algorithm and digest type
SET @algo = 'RSA';
SET @dig_type = 'SHA512';
-- Create private/public key pair
```

```
SET @priv = create_asymmetric_priv_key(@algo, 2048);
SET @pub = create_asymmetric_pub_key(@algo, @priv);
-- Generate digest from string
SET @dig = create_digest(@dig_type, 'The quick brown fox');
-- Generate signature for digest and verify signature against digest
SET @sig = asymmetric_sign(@algo, @dig, @priv, @dig_type);
SET @verf = asymmetric_verify(@algo, @dig, @sig, @pub, @dig_type);
```

- create_asymmetric_priv_key(algorithm, key_length)

Creates a private key using the given algorithm and key length, and returns the key as a binary string in PEM format. The key is in PKCS \#8 format. If key generation fails, the result is NULL.

For the legacy version of this function in use before MySQL 8.0.29, see MySQL Enterprise Encryption Legacy Function Descriptions.
algorithm is the encryption algorithm used to create the key. The supported algorithm value is 'RSA'.
key_length is the key length in bits. If you exceed the maximum allowed key length or specify less than the minimum, key generation fails and the result is null output. The minimum allowed key length in bits is 2048. The maximum allowed key length is the value of the enterprise_encryption.maximum_rsa_key_size system variable, which defaults to 4096. It has a maximum setting of 16384, which is the maximum key length allowed for the RSA algorithm. See Section 8.6.2, "Configuring MySQL Enterprise Encryption".

\section*{Note \\ Generating longer keys can consume significant CPU resources. Limiting the key length using the enterprise_encryption.maximum_rsa_key_size system variable lets you provide adequate security for your requirements while balancing this with resource usage.}

This example creates a 2048-bit RSA private key, then derives a public key from the private key:
```
SET @priv = create_asymmetric_priv_key('RSA', 2048);
SET @pub = create_asymmetric_pub_key('RSA', @priv);
```

- create_asymmetric_pub_key(algorithm, priv_key_str)

Derives a public key from the given private key using the given algorithm, and returns the key as a binary string in PEM format. The key is in PKCS \#8 format. If key derivation fails, the result is NULL.

For the legacy version of this function in use before MySQL 8.0.29, see MySQL Enterprise Encryption Legacy Function Descriptions.
algorithm is the encryption algorithm used to create the key. The supported algorithm value is 'RSA'.
priv_key_str is a valid PEM encoded RSA private key.
For a usage example, see the description of create_asymmetric_priv_key( ).
- create_digest(digest_type, str)

Creates a digest from the given string using the given digest type, and returns the digest as a binary string. If digest generation fails, the result is NULL.

For the legacy version of this function in use before MySQL 8.0.29, see MySQL Enterprise Encryption Legacy Function Descriptions.

The resulting digest string is suitable for use with asymmetric_sign() and asymmetric_verify(). The component versions of these functions accept digests but do not require them, as they are capable of handling data of an arbitrary length.
digest_type is the digest algorithm to be used to generate the digest string. The supported digest_type values are 'SHA224', 'SHA256', 'SHA384', and 'SHA512' when OpenSSL 1.0.1 is in use. If OpenSSL 1.1.1 is in use, the additional digest_type values 'SHA3-224', 'SHA3-256', 'SHA3-384', and 'SHA3-512' are available.
$s t r$ is the non-null data string for which the digest is to be generated.
SET @dig = create_digest('SHA512', 'The quick brown fox');

\subsection*{8.7 SELinux}

Security-Enhanced Linux (SELinux) is a mandatory access control (MAC) system that implements access rights by applying a security label referred to as an SELinux context to each system object. SELinux policy modules use SELinux contexts to define rules for how processes, files, ports, and other system objects interact with each other. Interaction between system objects is only permitted if a policy rule allows it.

An SELinux context (the label applied to a system object) has the following fields: user, role, type, and security level. Type information rather than the entire SELinux context is used most commonly to define rules for how processes interact with other system objects. MySQL SELinux policy modules, for example, define policy rules using type information.

You can view SELinux contexts using operating system commands such as ls and ps with the -Z option. Assuming that SELinux is enabled and a MySQL Server is running, the following commands show the SELinux context for the mysqld process and MySQL data directory:
mysqld process:
```
$> ps -eZ | grep mysqld
system_u:system_r:mysqld_t:s0 5924 ? 00:00:03 mysqld
```


MySQL data directory:
```
$> cd /var/lib
$> ls -Z | grep mysql
system_u:object_r:mysqld_db_t:s0 mysql
```

where:
- system_u is an SELinux user identity for system processes and objects.
- system_r is an SELinux role used for system processes.
- objects_r is an SELinux role used for system objects.
- mysqld_t is the type associated with the mysqld process.
- mysqld_db_t is the type associated with the MySQL data directory and its files.
- s0 is the security level.

For more information about interpreting SELinux contexts, refer to your distribution's SELinux documentation.

\subsection*{8.7.1 Check if SELinux is Enabled}

SELinux is enabled by default on some Linux distributions including Oracle Linux, RHEL, CentOS, and Fedora. Use the sestatus command to determine if SELinux is enabled on your distribution:
```
$> sestatus
SELinux status: enabled
SELinuxfs mount: /sys/fs/selinux
SELinux root directory: /etc/selinux
Loaded policy name: targeted
Current mode: enforcing
Mode from config file: enforcing
Policy MLS status: enabled
Policy deny_unknown status: allowed
Memory protection checking: actual (secure)
Max kernel policy version: 31
```


If SELinux is disabled or the sestatus command is not found, refer to your distribution's SELinux documentation for guidance before enabling SELinux.

\subsection*{8.7.2 Changing the SELinux Mode}

SELinux supports enforcing, permissive, and disabled modes. Enforcing mode is the default. Permissive mode allows operations that are not permitted in enforcing mode and logs those operations to the SELinux audit log. Permissive mode is typically used when developing policies or troubleshooting. In disabled mode, polices are not enforced, and contexts are not applied to system objects, which makes it difficult to enable SELinux later.

To view the current SELinux mode, use the sestatus command mentioned previously or the getenforce utility.
```
$> getenforce
Enforcing
```


To change the SELinux mode, use the setenforce utility:
```
$> setenforce 0
$> getenforce
Permissive
```

```
$> setenforce 1
$> getenforce
Enforcing
```


Changes made with setenforce are lost when you restart the system. To permanently change the SELinux mode, edit the /etc/selinux/config file and restart the system.

\subsection*{8.7.3 MySQL Server SELinux Policies}

MySQL Server SELinux policy modules are typically installed by default. You can view installed modules using the semodule - l command. MySQL Server SELinux policy modules include:
- mysqld_selinux
- mysqld_safe_selinux

For information about MySQL Server SELinux policy modules, refer to the SELinux manual pages. The manual pages provide information about types and Booleans associated with the MySQL service. Manual pages are named in the service-name_selinux format.
```
man mysqld_selinux
```


If SELinux manual pages are not available, refer to your distribution's SELinux documentation for information about how to generate manual pages using the sepolicy manpage utility.

\subsection*{8.7.4 SELinux File Context}

The MySQL Server reads from and writes to many files. If the SELinux context is not set correctly for these files, access to the files could be denied.

The instructions that follow use the semanage binary to manage file context; on RHEL, it's part of the policycoreutils-python-utils package:
```
yum install -y policycoreutils-python-utils
```


After installing the semanage binary, you can list MySQL file contexts using semanage with the fcontext option.
```
semanage fcontext -l | grep -i mysql
```


\section*{Setting the MySQL Data Directory Context}

The default data directory location is /var/lib/mysql/; and the SELinux context used is mysqld_db_t.

If you edit the configuration file to use a different location for the data directory, or for any of the files normally in the data directory (such as the binary logs), you may need to set the context for the new location. For example:
```
semanage fcontext -a -t mysqld_db_t "/path/to/my/custom/datadir(/.*)?"
restorecon -Rv /path/to/my/custom/datadir
semanage fcontext -a -t mysqld_db_t "/path/to/my/custom/logdir(/.*)?"
restorecon -Rv /path/to/my/custom/logdir
```


\section*{Setting the MySQL Error Log File Context}

The default location for RedHat RPMs is /var/log/mysqld.log; and the SELinux context type used is mysqld_log_t.

If you edit the configuration file to use a different location, you may need to set the context for the new location. For example:
```
semanage fcontext -a -t mysqld_log_t "/path/to/my/custom/error.log"
restorecon -Rv /path/to/my/custom/error.log
```


\section*{Setting the PID File Context}

The default location for the PID file is /var/run/mysqld/mysqld.pid; and the SELinux context type used is mysqld_var_run_t.

If you edit the configuration file to use a different location, you may need to set the context for the new location. For example:
```
semanage fcontext -a -t mysqld_var_run_t "/path/to/my/custom/pidfile/directory/.*?"
restorecon -Rv /path/to/my/custom/pidfile/directory
```


\section*{Setting the Unix Domain Socket Context}

The default location for the Unix domain socket is /var/lib/mysql/mysql.sock; and the SELinux context type used is mysqld_var_run_t.

If you edit the configuration file to use a different location, you may need to set the context for the new location. For example:
```
semanage fcontext -a -t mysqld_var_run_t "/path/to/my/custom/mysql\.sock"
```

restorecon -Rv /path/to/my/custom/mysql.sock

\section*{Setting the secure_file_priv Directory Context}

For MySQL versions since 5.6.34, 5.7.16, and 8.0.11.
Installing the MySQL Server RPM creates a /var/lib/mysql-files/ directory but does not set the SELinux context for it. The /var/lib/mysql-files/ directory is intended to be used for operations such as SELECT ... INTO OUTFILE.

If you enabled the use of this directory by setting secure_file_priv, you may need to set the context like so:
semanage fcontext -a -t mysqld_db_t "/var/lib/mysql-files/(/.*)?"
restorecon -Rv /var/lib/mysql-files
Edit this path if you used a different location. For security purposes, this directory should never be within the data directory.

For more information about this variable, see the secure_file_priv documentation.

\subsection*{8.7.5 SELinux TCP Port Context}

The instructions that follow use the semanage binary to manage port context; on RHEL, it's part of the policycoreutils-python-utils package:
yum install -y policycoreutils-python-utils
After installing the semanage binary, you can list ports defined with the mysqld_port_t context using semanage with the port option.
```
$> semanage port -l | grep mysqld
mysqld_port_t tcp 1186, 3306, 63132-63164
```


\subsection*{8.7.5.1 Setting the TCP Port Context for mysqld}

The default TCP port for mysqld is 3306; and the SELinux context type used is mysqld_port_t.
If you configure mysqld to use a different TCP port, you may need to set the context for the new port. For example to define the SELinux context for a non-default port such as port 3307:
semanage port -a -t mysqld_port_t -p tcp 3307
To confirm that the port is added:
```
$> semanage port -l | grep mysqld
mysqld_port_t tcp 3307, 1186, 3306, 63132-63164
```


\subsection*{8.7.5.2 Setting the TCP Port Context for MySQL Features}

If you enable certain MySQL features, you might need to set the SELinux TCP port context for additional ports used by those features. If ports used by MySQL features do not have the correct SELinux context, the features might not function correctly.

The following sections describe how to set port contexts for MySQL features. Generally, the same method can be used to set the port context for any MySQL features. For information about ports used by MySQL features, refer to the MySQL Port Reference.

For MySQL 8.4, enabling mysql_connect_any is not required or recommended.
setsebool -P mysql_connect_any=ON

\section*{Setting the TCP Port Context for Group Replication}

If SELinux is enabled, you must set the port context for the Group Replication communication port, which is defined by the group_replication_local_address variable. mysqld must be able to bind to the Group Replication communication port and listen there. InnoDB Cluster relies on Group Replication so this applies equally to instances used in a cluster. To view ports currently used by MySQL, issue:
```
semanage port -l | grep mysqld
```


Assuming the Group Replication communication port is 33061, set the port context by issuing:
```
semanage port -a -t mysqld_port_t -p tcp 33061
```


\section*{Setting the TCP Port Context for Document Store}

If SELinux is enabled, you must set the port context for the communication port used by X Plugin, which is defined by the mysqlx_port variable. mysqld must be able to bind to the X Plugin communication port and listen there.

Assuming the X Plugin communication port is 33060, set the port context by issuing:
```
semanage port -a -t mysqld_port_t -p tcp 33060
```


\section*{Setting the TCP Port Context for MySQL Router}

If SELinux is enabled, you must set the port context for the communication ports used by MySQL Router. Assuming the additional communication ports used by MySQL Router are the default 6446, 6447, 64460 and 64470, on each instance set the port context by issuing:
```
semanage port -a -t mysqld_port_t -p tcp 6446
semanage port -a -t mysqld_port_t -p tcp 6447
semanage port -a -t mysqld_port_t -p tcp 64460
semanage port -a -t mysqld_port_t -p tcp 64470
```


\subsection*{8.7.6 Troubleshooting SELinux}

Troubleshooting SELinux typically involves placing SELinux into permissive mode, rerunning problematic operations, checking for access denial messages in the SELinux audit log, and placing SELinux back into enforcing mode after problems are resolved.

To avoid placing the entire system into permissive mode using setenforce, you can permit only the MySQL service to run permissively by placing its SELinux domain (mysqld_t) into permissive mode using the semanage command:
semanage permissive -a mysqld_t
When you are finished troubleshooting, use this command to place the mysqld_t domain back into enforcing mode:
```
semanage permissive -d mysqld_t
```


SELinux writes logs for denied operations to /var/log/audit/audit.log. You can check for denials by searching for "denied" messages.
```
grep "denied" /var/log/audit/audit.log
```


The following sections describes a few common areas where SELinux-related issues may be encountered.

\section*{File Contexts}

If a MySQL directory or file has an incorrect SELinux context, access may be denied. This issue can occur if MySQL is configured to read from or write to a non-default directory or file. For example, if you
configure MySQL to use a non-default data directory, the directory may not have the expected SELinux context.

Attempting to start the MySQL service on a non-default data directory with an invalid SELinux context causes the following startup failure.
```
$> systemctl start mysql.service
Job for mysqld.service failed because the control process exited with error code.
See "systemctl status mysqld.service" and "journalctl -xe" for details.
```


In this case, a "denial" message is logged to /var/log/audit/audit.log:
```
$> grep "denied" /var/log/audit/audit.log
type=AVC msg=audit(1587133719.786:194): avc: denied { write } for pid=7133 comm="mysqld"
name="mysql" dev="dm-0" ino=51347078 scontext=system_u:system_r:mysqld_t:s0
tcontext=unconfined_u:object_r:default_t:s0 tclass=dir permissive=0
```


For information about setting the proper SELinux context for MySQL directories and files, see Section 8.7.4, "SELinux File Context".

\section*{Port Access}

SELinux expects services such as MySQL Server to use specific ports. Changing ports without updating the SELinux policies may cause a service failure.

The mysqld_port_t port type defines the ports that the MySQL listens on. If you configure the MySQL Server to use a non-default port, such as port 3307, and do not update the policy to reflect the change, the MySQL service fails to start:
```
$> systemctl start mysqld.service
Job for mysqld.service failed because the control process exited with error code.
See "systemctl status mysqld.service" and "journalctl -xe" for details.
```


In this case, a denial message is logged to /var/log/audit/audit.log:
```
$> grep "denied" /var/log/audit/audit.log
type=AVC msg=audit(1587134375.845:198): avc: denied { name_bind } for pid=7340
comm="mysqld" src=3307 scontext=system_u:system_r:mysqld_t:s0
tcontext=system_u:object_r:unreserved_port_t:s0 tclass=tcp_socket permissive=0
```


For information about setting the proper SELinux port context for MySQL, see Section 8.7.5, "SELinux TCP Port Context". Similar port access issues can occur when enabling MySQL features that use ports that are not defined with the required context. For more information, see Section 8.7.5.2, "Setting the TCP Port Context for MySQL Features".

\section*{Application Changes}

SELinux may not be aware of application changes. For example, a new release, an application extension, or a new feature may access system resources in a way that is not permitted by SELinux, resulting in access denials. In such cases, you can use the audit2allow utility to create custom policies to permit access where it is required. The typical method for creating custom policies is to change the SELinux mode to permissive, identify access denial messages in the SELinux audit log, and use the audit2allow utility to create custom policies to permit access.

For information about using the audit2allow utility, refer to your distribution's SELinux documentation.

If you encounter access issues for MySQL that you believe should be handled by standard MySQL SELinux policy modules, please open a bug report in your distribution's bug tracking system.

\subsection*{8.8 FIPS Support}

MySQL supports FIPS mode when a supported OpenSSL library and FIPS Object Module are available on the host system.

FIPS mode on the server side applies to cryptographic operations performed by the server. This includes replication (source/replica and Group Replication) and X Plugin, which run within the server. FIPS mode also applies to attempts by clients to connect to the server.

The following sections describe FIPS mode and how to take advantage of it within MySQL:
- FIPS Overview
- System Requirements for FIPS Mode in MySQL
- Enabling FIPS Mode in MySQL

\section*{FIPS Overview}

Federal Information Processing Standards 140-2 (FIPS 140-2) describes a security standard that can be required by Federal (US Government) agencies for cryptographic modules used to protect sensitive or valuable information. To be considered acceptable for such Federal use, a cryptographic module must be certified for FIPS 140-2. If a system intended to protect sensitive data lacks the proper FIPS 140-2 certificate, Federal agencies cannot purchase it.

Products such as OpenSSL can be used in FIPS mode, although the OpenSSL library itself is not validated for FIPS. Instead, the OpenSSL library is used with the OpenSSL FIPS Object Module to enable OpenSSL-based applications to operate in FIPS mode.

For general information about FIPS and its implementation in OpenSSL, these references may be helpful:
- National Institute of Standards and Technology FIPS PUB 140-2
- OpenSSL FIPS 140-2 Security Policy
- fips_module manual page
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1637.jpg?height=125&width=104&top_left_y=1541&top_left_x=365)

\section*{Important}

FIPS mode imposes conditions on cryptographic operations such as restrictions on acceptable encryption algorithms or requirements for longer key lengths. For OpenSSL, the exact FIPS behavior depends on the OpenSSL version.

\section*{System Requirements for FIPS Mode in MySQL}

For MySQL to support FIPS mode, these system requirements must be satisfied:
1. MySQL must be compiled with an OpenSSL version that is certified for use with FIPS. OpenSSL 1.0.2 and OpenSSL 3.0 are certified, but OpenSSL 1.1.1 is not. Binary distributions for recent versions of MySQL are compiled using OpenSSL 3.0 on some platforms, which means they are not certified for FIPS. This means you have the following options, depending on system and MySQL configuration:
- Use a system that has OpenSSL 3.0 and the required FIPS object module. In this case, you can enable FIPS mode for MySQL if you use a binary distribution compiled using OpenSSL 3.0, or compile MySQL from source using OpenSSL 3.0.

For general information about upgrading to OpenSSL 3.0, see OpenSSL 3.0 Migration Guide.
- Use a system that has OpenSSL 1.1.1 or higher. In this case, you can install MySQL using binary packages, and you can use the TLS v1.3 protocol and ciphersuites, in addition to other already supported TLS protocols. However, you cannot enable FIPS mode for MySQL.
- Use a system that has OpenSSL 1.0.2 and the required FIPS Object Module. In this case, you can enable FIPS mode for MySQL if you use a binary distribution compiled using OpenSSL
1.0.2, or compile MySQL from source using OpenSSL 1.0.2. In this case, you cannot use the TLS v1.3 protocol or ciphersuites, which require OpenSSL 1.1.1 or 3.0. In addition, you should be aware that OpenSSL 1.0.2 reached end of life status in 2019, and that all operating platforms embedding OpenSSL 1.1.1 reach their end of life in 2024.
2. At runtime, the OpenSSL library and OpenSSL FIPS Object Module must be available as shared (dynamically linked) objects.

\section*{Enabling FIPS Mode in MySQL}

To determine whether MySQL is running on a system with FIPS mode enabled, check the value of the ssl_fips_mode server system variable using an SQL statement such as SHOW VARIABLES LIKE ${ }^{\prime} \% f_{i p s}{ }^{\prime}$ or SELECT @@ssl_fips_mode. If the value of this variable is 1 (ON) or 2 (STRICT), FIPS mode is enabled for OpenSSL; if it is 0 (OFF), FIPS mode is not available.

\section*{Important}

In general, STRICT imposes more restrictions than ON, but MySQL itself has no FIPS-specific code other than to specify the FIPS mode value to OpenSSL. The exact behavior of FIPS mode for ON or STRICT depends on the OpenSSL version. For details, refer to the fips_module manpage (see FIPS Overview).

FIPS mode on the server side applies to cryptographic operations performed by the server, including those performed by MySQL Replication (including Group Replication) and X Plugin, which run within the server.

FIPS mode also applies to attempts by clients to connect to the server. When enabled, on either the client or server side, it restricts which of the supported encryption ciphers can be chosen. However, enabling FIPS mode does not require that an encrypted connection must be used, or that user credentials must be encrypted. For example, if FIPS mode is enabled, stronger cryptographic algorithms are required. In particular, MD5 is restricted, so trying to establish an encrypted connection using an encryption cipher such as RC4-MD5 does not work. But there is nothing about FIPS mode that prevents establishing an unencrypted connection. (To do that, you can use the REQUIRE clause for CREATE USER or ALTER USER for specific user accounts, or set the require_secure_transport system variable to affect all accounts.)

If FIPS mode is required, it is recommended to use an operating platforms that includes it; if it does, you can (and should) use it. If your platform does not include FIPS, you have two options:
- Migrate to a platform which has FIPS OpenSSL support.
- Build the OpenSSL library and FIPS object module from source, using the instructions from the fips_module manpage (see FIPS Overview).

\section*{Note}

If the OpenSSL FIPS Object Module is not available, the only permitted value for ssl_fips_mode and --ssl-fips-mode is OFF. An error occurs for attempts to set the FIPS mode to a different value.

If FIPS mode is required, it is recommended to use an operating platform that includes it; if it does, you can (and should) use it. If your platform does not include FIPS, you have two options:
- Migrate to a platform which has FIPS OpenSSL support.
- Build the OpenSSL library and FIPS object module from source, using the instructions from the fips_module manpage (see FIPS Overview).

