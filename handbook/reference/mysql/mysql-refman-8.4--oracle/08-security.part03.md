\section*{Device Unregistration for WebAuthn}

It is possible to unregister FIDO/FIDO2 devices associated with a MySQL account. This might be desirable or necessary under multiple circumstances:
- A FIDO/FIDO2 device is to be replaced with a different device. The previous device must be unregistered and the new device registered.

In this case, the account owner or any user who has the CREATE USER privilege can unregister the device. The account owner can register the new device.
- A FIDO/FIDO2 device is reset or lost. Authentication attempts will fail until the current device is unregistered and a new registration is performed.

In this case, the account owner, being unable to authenticate, cannot unregister the current device and must contact the DBA (or any user who has the CREATE USER privilege) to do so. Then the account owner can reregister the reset device or register a new device.

Unregistering a FIDO/FIDO2 device can be done by the account owner or by any user who has the CREATE USER privilege. Use this syntax:

ALTER USER user \{2 | 3\} FACTOR UNREGISTER;
To re-register a device or perform a new registration, refer to the instructions in Using WebAuthn Authentication.

\section*{How WebAuthn Authentication of MySQL Users Works}

This section provides an overview of how MySQL and WebAuthn work together to authenticate MySQL users. For examples showing how to set up MySQL accounts to use the WebAuthn authentication plugins, see Using WebAuthn Authentication.

An account that uses WebAuthn authentication must perform an initial device registration step before it can connect to the server. After the device has been registered, authentication can proceed. WebAuthn device registration process is as follows:
1. The server sends a random challenge, user ID, and relying party ID (which uniquely identifies a server) to the client in JSON format. The relying party ID is defined by the authentication_webauthn_rp_id system variable. The default value is mysql.com.
2. The client receives that information and sends it to the client-side WebAuthn authentication plugin, which in turn provides it to the FIDO/FIDO2 device. Client also sends 1-byte capability, with RESIDENT_KEYS bit set to ON (if it is FIDO2 device) or OFF.
3. After the user has performed the appropriate device action (for example, touching the device or performing a biometric scan) the FIDO/FIDO2 device generates a public/private key pair, a key handle, an X. 509 certificate, and a signature, which is returned to the server.
4. The server-side WebAuthn authentication plugin verifies the signature. With successful verification, the server stores the credential ID (for FIDO devices only) and public key in the mysql. user system table.

After registration has been performed successfully, WebAuthn authentication follows this process:
1. The server sends a random challenge, user ID, relying party ID and credentials to the client. The challenge is converted to URL-safe Base64 format.
2. The client sends the same information to the device. The client queries the device to check if it supports Client-to-Authenticator Protocols (CTAP2) protocol. CTAP2 support indicates that the device is FIDO2-protocol aware.
3. The FIDO/FIDO2 device prompts the user to perform the appropriate device action, based on the selection made during registration.

If the device is FIDO2-protocol aware, the device signs with all private keys available in the device for a given RP ID. Optionally, it may prompt user to pick one from the list as well. If the device is not FIDO2 capable, it fetches the right private key.
4. This action unlocks the private key and the challenge is signed.
5. This signed challenge is returned to the server.
6. The server-side WebAuthn authentication plugin verifies the signature with the public key and responds to indicate authentication success or failure.

\subsection*{8.4.1.12 Test Pluggable Authentication}

MySQL includes a test plugin that checks account credentials and logs success or failure to the server error log. This is a loadable plugin (not built in) and must be installed prior to use.

The test plugin source code is separate from the server source, unlike the built-in native plugin, so it can be examined as a relatively simple example demonstrating how to write a loadable authentication plugin.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1365.jpg?height=106&width=99&top_left_y=541&top_left_x=370)

\section*{Note}

This plugin is intended for testing and development purposes, and is not for use in production environments or on servers that are exposed to public networks.

The following table shows the plugin and library file names. The file name suffix might differ on your system. The file must be located in the directory named by the plugin_dir system variable.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.27 Plugin and Library Names for Test Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin & test_plugin_server \\
\hline Client-side plugin & auth_test_plugin \\
\hline Library file & auth_test_plugin .so \\
\hline
\end{tabular}
\end{table}

The following sections provide installation and usage information specific to test pluggable authentication:
- Installing Test Pluggable Authentication
- Uninstalling Test Pluggable Authentication
- Using Test Pluggable Authentication

For general information about pluggable authentication in MySQL, see Section 8.2.17, "Pluggable Authentication".

\section*{Installing Test Pluggable Authentication}

This section describes how to install the server-side test authentication plugin. For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

To load the plugin at server startup, use the --plugin-load-add option to name the library file that contains it. With this plugin-loading method, the option must be given each time the server starts. For example, put these lines in the server my. cnf file, adjusting the . so suffix for your platform as necessary:
[mysqld]
plugin-load-add=auth_test_plugin.so
After modifying my.cnf, restart the server to cause the new settings to take effect.
Alternatively, to load the plugin at runtime, use this statement, adjusting the . so suffix for your platform as necessary:

INSTALL PLUGIN test_plugin_server SONAME 'auth_test_plugin.so';
INSTALL PLUGIN loads the plugin immediately, and also registers it in the mysql.plugins system table to cause the server to load it for each subsequent normal startup without the need for - -plugin-load-add.

To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME LIKE '%test_plugin%';
+----------------------+---------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+----------------------+---------------+
| test_plugin_server | ACTIVE |
+----------------------+---------------+
```


If the plugin fails to initialize, check the server error log for diagnostic messages.
To associate MySQL accounts with the test plugin, see Using Test Pluggable Authentication.

\section*{Uninstalling Test Pluggable Authentication}

The method used to uninstall the test authentication plugin depends on how you installed it:
- If you installed the plugin at server startup using a --plugin-load-add option, restart the server without the option.
- If you installed the plugin at runtime using an INSTALL PLUGIN statement, it remains installed across server restarts. To uninstall it, use UNINSTALL PLUGIN:
```
UNINSTALL PLUGIN test_plugin_server;
```


\section*{Using Test Pluggable Authentication}

To use the test authentication plugin, create an account and name that plugin in the IDENTIFIED WITH clause:
```
CREATE USER 'testuser'@'localhost'
IDENTIFIED WITH test_plugin_server
BY 'testpassword';
```


The test authentication plugin also requires creating a proxy user as follows:
```
CREATE USER testpassword@localhost;
GRANT PROXY ON testpassword@localhost TO testuser@localhost;
```


Then provide the --user and --password options for that account when you connect to the server. For example:
```
$> mysql --user=testuser --password
Enter password: testpassword
```


The plugin fetches the password as received from the client and compares it with the value stored in the authentication_string column of the account row in the mysql. user system table. If the two values match, the plugin returns the authentication_string value as the new effective user ID.

You can look in the server error log for a message indicating whether authentication succeeded (notice that the password is reported as the "user"):
```
[Note] Plugin test_plugin_server reported:
'successfully authenticated user testpassword'
```


\subsection*{8.4.1.13 Pluggable Authentication System Variables}

These variables are unavailable unless the appropriate server-side plugin is installed:
- authentication_ldap_sasl for system variables with names of the form authentication_ldap_sasl_xxx
- authentication_ldap_simple for system variables with names of the form authentication_ldap_simple_xxx

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.28 Authentication Plugin System Variable Summary}
\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline authentication & Kesberos_services_key_tab & & Yes & & Global & No \\
\hline authentication & Kesberos_services_principal & & Yes & & Global & Yes \\
\hline authentication & & Yesp_sasl_autYersethod_nam & 1æes & & Global & Yes \\
\hline authentication & Yesp_sasl_bind_dsase_dn & & Yes & & Global & Yes \\
\hline authentication & Ydsp_sasl_bind\&sot_dn & & Yes & & Global & Yes \\
\hline authentication & Ydesp_sasl_bindyesot_pwd & & Yes & & Global & Yes \\
\hline authentication & Ydsp_sasl_ca_pesh & & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Yesp_sasl_conhest_timeout} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Yesp_sasl_grovy essearch_attr} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Yesp_sasl_grouy essearch_filt} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|l|}{Yesp__sasl_init_Yeesol_size} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|l|}{Ydesp_sasl_log_Ystatus} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|l|}{Y(45p_sasl_maX_qsool_size} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|l|}{Ydesp_sasl_refeYes} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Yesp_sasl_resporse_timeou} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|l|}{Ydsp_sasl_servers host} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|l|}{Yesp_sasl_serversport} & Yes & & Global & Yes \\
\hline authentication & Yesp_sasl_tls & Yes & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Ydsp_sasl_user_esearch_attr} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Yesp_simple_alies_method_r} & HADS & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Yesp_simple_błes_base_dn} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|l|}{Yesp_simple_bYies_root_dn} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Ydsp_simple_bYires_root_pwd} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|l|}{Ydsp_simple_ckepath} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Yesp_simple_cyerect_timeo} & YYes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Yesp_simple_gY@sp_search} & attes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Ycsp_simple_gY@sp_search} & fittes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Yesp_simple_intespool_size} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|l|}{Yesp_simple_ldgesstatus} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Yesp_simple_nYæs_pool_size} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|l|}{Ydsp_simple_rèfesral} & Yes & & Global & Yes \\
\hline authentication & \multicolumn{2}{|c|}{Yesp_simple_r\&sisonse_time} & kies & & Global & Yes \\
\hline authentication & Ydsp_simple_s & sceser_host & Yes & & Global & Yes \\
\hline authentication & Yesp_simple_s & sweser_port & Yes & & Global & Yes \\
\hline authentication & Yesp_simple_t & Itres & Yes & & Global & Yes \\
\hline authentication & Ydsp_simple_u & uSes_search_a & tres & & Global & Yes \\
\hline authentication & Yesticy & Yes & Yes & & Global & Yes \\
\hline authentication & Yesbauthn_rp & Iddes & Yes & & Global & Yes \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline authentication_Yerdows_log_nesl & Yes & & Global & No \\
\hline authentication_Yerdows_use_Yesicipal_namyes & & & Global & No \\
\hline
\end{tabular}
- authentication_kerberos_service_key_tab

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-kerberos-service-key-tab=file_name \\
\hline System Variable & authentication_kerberos_service_key_tab \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & datadir/mysql.keytab \\
\hline
\end{tabular}

The name of the server-side key-table ("keytab") file containing Kerberos service keys to authenticate MySQL service tickets received from clients. The file name should be given as an absolute path name. If this variable is not set, the default is mysql. keytab in the data directory.

The file must exist and contain a valid key for the service principal name (SPN) or authentication of clients will fail. (The SPN and same key also must be created in the Kerberos server.) The file may contain multiple service principal names and their respective key combinations.

The file must be generated by the Kerberos server administrator and be copied to a location accessible by the MySQL server. The file can be validated to make sure that it is correct and was copied properly using this command:
klist -k file_name
For information about keytab files, see https://web.mit.edu/kerberos/krb5-latest/doc/basic/ keytab_def.html.
- authentication_kerberos_service_principal

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-kerberos-serviceprincipal=name \\
\hline System Variable & authentication_kerberos_service_principal \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & mysql/host_name@realm_name \\
\hline
\end{tabular}

The Kerberos service principal name (SPN) that the MySQL server sends to clients.
The value is composed from the service name (mysql), a host name, and a realm name. The default value is mysql/host_name@realm_name. The realm in the service principal name enables retrieving the exact service key.

To use a nondefault value, set the value using the same format. For example, to use a host name of krbauth.example.com and a realm of MYSQL. LOCAL,
set authentication_kerberos_service_principal to mysql/ krbauth.example.com@MYSQL. LOCAL.

The service principal name and service key must already be present in the database managed by the KDC server.

There can be service principal names that differ only by realm name.
- authentication_ldap_sasl_auth_method_name

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-auth-method-name=value & \\
\hline System Variable & authentication_ldap_sasl_auth_method_name & \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & String & \\
\hline Default Value & SCRAM-SHA-1 & \\
\hline Valid Values & \begin{tabular}{l}
SCRAM-SHA-1 \\
SCRAM-SHA-256 \\
GSSAPI
\end{tabular} & \\
\hline
\end{tabular}

For SASL LDAP authentication, the authentication method name. Communication between the authentication plugin and the LDAP server occurs according to this authentication method to ensure password security.

These authentication method values are permitted:
- SCRAM-SHA-1: Use a SASL challenge-response mechanism.

The client-side authentication_ldap_sasl_client plugin communicates with the SASL server, using the password to create a challenge and obtain a SASL request buffer, then passes this buffer to the server-side authentication_ldap_sasl plugin. The client-side and serverside SASL LDAP plugins use SASL messages for secure transmission of credentials within the LDAP protocol, to avoid sending the cleartext password between the MySQL client and server.
- SCRAM-SHA-256: Use a SASL challenge-response mechanism.

This method is similar to SCRAM-SHA-1, but is more secure. It requires an OpenLDAP server built using Cyrus SASL 2.1.27 or higher.
- GSSAPI: Use Kerberos, a passwordless and ticket-based protocol.

GSSAPI/Kerberos is supported as an authentication method for MySQL clients and servers only on Linux. It is useful in Linux environments where applications access LDAP using Microsoft Active Directory, which has Kerberos enabled by default.

The client-side authentication_ldap_sasl_client plugin obtains a service ticket using the ticket-granting ticket (TGT) from Kerberos, but does not use LDAP services directly. The serverside authentication_ldap_sasl plugin routes Kerberos messages between the client-side plugin and the LDAP server. Using the credentials thus obtained, the server-side plugin then communicates with the LDAP server to interpret LDAP authentication messages and retrieve LDAP groups.
- authentication_ldap_sasl_bind_base_dn

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-bind-base-dn=value \\
\hline System Variable & authentication_ldap_sasl_bind_base_dn \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

For SASL LDAP authentication, the base distinguished name (DN). This variable can be used to limit the scope of searches by anchoring them at a certain location (the "base") within the search tree.

Suppose that members of one set of LDAP user entries each have this form:
uid=user_name,ou=People,dc=example,dc=com
And that members of another set of LDAP user entries each have this form:
uid=user_name,ou=Admin,dc=example,dc=com
Then searches work like this for different base DN values:
- If the base DN is ou=People, dc=example, dc=com: Searches find user entries only in the first set.
- If the base DN is ou=Admin, dc=example, dc=com: Searches find user entries only in the second set.
- If the base DN is ou=dc=example, dc=com: Searches find user entries in the first or second set.

In general, more specific base DN values result in faster searches because they limit the search scope more.
- authentication_ldap_sasl_bind_root_dn

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-bind-root-dn=value \\
\hline System Variable & authentication_ldap_sasl_bind_root_dn \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

For SASL LDAP authentication, the root distinguished name (DN). This variable is used in conjunction with authentication_ldap_sasl_bind_root_pwd as the credentials for authenticating to the LDAP server for the purpose of performing searches. Authentication uses either one or two LDAP bind operations, depending on whether the MySQL account names an LDAP user DN:
- If the account does not name a user DN: authentication_ldap_sasl performs an initial LDAP binding using authentication_ldap_sasl_bind_root_dn and authentication_ldap_sasl_bind_root_pwd. (These are both empty by default, so
if they are not set, the LDAP server must permit anonymous connections.) The resulting bind LDAP handle is used to search for the user DN, based on the client user name. authentication_ldap_sasl performs a second bind using the user DN and client-supplied password.
- If the account does name a user DN: The first bind operation is unnecessary in this case. authentication_ldap_sasl performs a single bind using the user DN and client-supplied password. This is faster than if the MySQL account does not specify an LDAP user DN.
- authentication_ldap_sasl_bind_root_pwd

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-bind-root-pwd=value \\
\hline System Variable & authentication_ldap_sasl_bind_root_pwd \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

For SASL LDAP authentication, the password for the root distinguished name. This variable is used in conjunction with authentication_ldap_sasl_bind_root_dn. See the description of that variable.
- authentication_ldap_sasl_ca_path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-capath=value \\
\hline System Variable & authentication_ldap_sasl_ca_path \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

For SASL LDAP authentication, the absolute path of the certificate authority file. Specify this file if it is desired that the authentication plugin perform verification of the LDAP server certificate.

\section*{Note}

In addition to setting the authentication_ldap_sasl_ca_path variable to the file name, you must add the appropriate certificate authority certificates to the file and enable the authentication_ldap_sasl_tls system variable. These variables can be set to override the default OpenLDAP TLS configuration; see LDAP Pluggable Authentication and Idap.conf
- authentication_ldap_sasl_connect_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-connecttimeout=\# \\
\hline System Variable & authentication_ldap_sasl_connect_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes 1341 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 30 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

Specifies the time (in seconds) that MySQL server waits to connect to the LDAP server using TCP.
When a MySQL account authenticates using LDAP, MySQL server attempts to establish a TCP connection with the LDAP server, which it uses to send an LDAP bind request over the connection. If the LDAP server does not respond to TCP handshake after a configured amount of time, MySQL abandons the TCP handshake attempt and emits an error message. If the timeout setting is zero, MySQL server ignores this system variable setting. For more information, see Setting Timeouts for LDAP Pluggable Authentication.

\section*{Note}

If you set this variable to a timeout value that is greater than the host system's default value, the shorter system timeout is used.
- authentication_ldap_sasl_group_search_attr

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-group-search-attr=value & \\
\hline System Variable & authentication_ldap_sasl_group_search_attr & \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & String & \\
\hline Default Value & cn & \\
\hline
\end{tabular}

For SASL LDAP authentication, the name of the attribute that specifies group names in LDAP directory entries. If authentication_ldap_sasl_group_search_attr has its default value of cn, searches return the cn value as the group name. For example, if an LDAP entry with a uid value of user1 has a cn attribute of mygroup, searches for user1 return mygroup as the group name.

This variable should be the empty string if you want no group or proxy authentication.
If the group search attribute is isMember 0f, LDAP authentication directly retrieves the user attribute isMemberOf value and assigns it as group information. If the group search attribute is not isMemberOf, LDAP authentication searches for all groups where the user is a member. (The latter is the default behavior.) This behavior is based on how LDAP group information can be stored two ways: 1) A group entry can have an attribute named memberUid or member with a value that is a user name; 2) A user entry can have an attribute named isMemberOf with values that are group names.
- authentication_ldap_sasl_group_search_filter

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- -authentication-ldap-sasl-group- \\
search-filter=value
\end{tabular} \\
\hline System Variable & authentication_ldap_sasl_group_search_filter \\
\hline Scope & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & (|(\&(objectClass=posixGroup) (memberUid=\%s))(\&(objectClass=group) (member=\%s))) \\
\hline
\end{tabular}

For SASL LDAP authentication, the custom group search filter.
The search filter value can contain \{UA\} and \{UD\} notation to represent the user name and the full user DN. For example, \{UA\} is replaced with a user name such as "admin", whereas \{UD\} is replaced with a use full DN such as "uid=admin, ou=People,dc=example,dc=com". The following value is the default, which supports both OpenLDAP and Active Directory:
```
(|(&(objectClass=posixGroup)(memberUid={UA}))
    (&(objectClass=group)(member={UD})))
```


In some cases for the user scenario, member 0 f is a simple user attribute that holds no group information. For additional flexibility, an optional \{GA\} prefix can be used with the group search attribute. Any group attribute with a \{GA\} prefix is treated as a user attribute having group names. For example, with a value of \{GA\}MemberOf, if the group value is the DN, the first attribute value from the group DN is returned as the group name.
- authentication_ldap_sasl_init_pool_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-init-pool-size=\# \\
\hline System Variable & authentication_ldap_sasl_init_pool_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 32767 \\
\hline Unit & connections \\
\hline
\end{tabular}

For SASL LDAP authentication, the initial size of the pool of connections to the LDAP server. Choose the value for this variable based on the average number of concurrent authentication requests to the LDAP server.

The plugin uses authentication_ldap_sasl_init_pool_size and authentication_ldap_sasl_max_pool_size together for connection-pool management:
- When the authentication plugin initializes, it creates
authentication_ldap_sasl_init_pool_size connections, unless authentication_ldap_sasl_max_pool_size=0 to disable pooling.
- If the plugin receives an authentication request when there are no free connections in the current connection pool, the plugin can create a new connection, up to the maximum connection pool size given by authentication_ldap_sasl_max_pool_size.
- If the plugin receives a request when the pool size is already at its maximum and there are no free connections, authentication fails.
- When the plugin unloads, it closes all pooled connections.

Changes to plugin system variable settings may have no effect on connections already in the pool. For example, modifying the LDAP server host, port, or TLS settings does not affect existing connections. However, if the original variable values were invalid and the connection pool could not be initialized, the plugin attempts to reinitialize the pool for the next LDAP request. In this case, the new system variable values are used for the reinitialization attempt.

If authentication_ldap_sasl_max_pool_size=0 to disable pooling, each LDAP connection opened by the plugin uses the values the system variables have at that time.
- authentication_ldap_sasl_log_status

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-logstatus=\# \\
\hline System Variable & authentication_ldap_sasl_log_status \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 6 \\
\hline
\end{tabular}

For SASL LDAP authentication, the logging level for messages written to the error log. The following table shows the permitted level values and their meanings.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.29 Log Levels for authentication_ldap_sasl_log_status}
\begin{tabular}{|l|l|}
\hline Option Value & Types of Messages Logged \\
\hline 1 & No messages \\
\hline 2 & Error messages \\
\hline 3 & Error and warning messages \\
\hline 4 & Error, warning, and information messages \\
\hline 5 & Same as previous level plus debugging messages from MySQL \\
\hline 6 & Same as previous level plus debugging messages from LDAP library \\
\hline
\end{tabular}
\end{table}

On the client side, messages can be logged to the standard output by setting the AUTHENTICATION_LDAP_CLIENT_LOG environment variable. The permitted and default values are the same as for authentication_ldap_sasl_log_status.

The AUTHENTICATION_LDAP_CLIENT_LOG environment variable applies only to SASL LDAP authentication. It has no effect for simple LDAP authentication because the client plugin in that case is mysql_clear_password, which knows nothing about LDAP operations.
- authentication_ldap_sasl_max_pool_size

\begin{tabular}{|l|l|}
\hline System Variable & authentication_ldap_sasl_max_pool_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 32767 \\
\hline Unit & connections \\
\hline
\end{tabular}

For SASL LDAP authentication, the maximum size of the pool of connections to the LDAP server. To disable connection pooling, set this variable to 0 .

This variable is used in conjunction with authentication_ldap_sasl_init_pool_size. See the description of that variable.
- authentication_ldap_sasl_referral

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-saslreferral[=\{OFF|ON\}] \\
\hline System Variable & authentication_ldap_sasl_referral \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

For SASL LDAP authentication, whether to enable LDAP search referral. See LDAP Search Referral.
This variable can be set to override the default OpenLDAP referral configuration; see LDAP Pluggable Authentication and Idap.conf
- authentication_ldap_sasl_response_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-responsetimeout=\# \\
\hline System Variable & authentication_ldap_sasl_response_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 30 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31536000 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Unit & seconds \\
\hline
\end{tabular}

Specifies the time (in seconds) that MySQL server waits for the LDAP server to response to an LDAP bind request.

When a MySQL account authenticates using LDAP, MySQL server sends an LDAP bind request to the LDAP server. If the LDAP server does not respond to the request after a configured amount of time, MySQL abandons the request and emits an error message. If the timeout setting is zero, MySQL server ignores this system variable setting. For more information, see Setting Timeouts for LDAP Pluggable Authentication.
- authentication_ldap_sasl_server_host

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-serverhost=host_name \\
\hline System Variable & authentication_ldap_sasl_server_host \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The LDAP server host for SASL LDAP authentication; this can be a host name or IP address.
- authentication_ldap_sasl_server_port

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-serverport=port_num \\
\hline System Variable & authentication_ldap_sasl_server_port \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 389 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 32376 \\
\hline
\end{tabular}

For SASL LDAP authentication, the LDAP server TCP/IP port number.
If the LDAP port number is configured as 636 or 3269 , the plugin uses LDAPS (LDAP over SSL) instead of LDAP. (LDAPS differs from startTLS.)
- authentication_ldap_sasl_tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-sasltls[=\{OFF|ON\}] \\
\hline System Variable & authentication_ldap_sasl_tls \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

Default Value

For SASL LDAP authentication, whether connections by the plugin to the LDAP server are secure. If this variable is enabled, the plugin uses TLS to connect securely to the LDAP server. This variable can be set to override the default OpenLDAP TLS configuration; see LDAP Pluggable Authentication and Idap.conf If you enable this variable, you may also wish to set the authentication_ldap_sasl_ca_path variable.

MySQL LDAP plugins support the StartTLS method, which initializes TLS on top of a plain LDAP connection.

LDAPS can be used by setting the authentication_ldap_sasl_server_port system variable.
- authentication_ldap_sasl_user_search_attr

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --authentication-ldap-sasl-user-search-attr=value & \\
\hline System Variable & authentication_ldap_sasl_user_search_attr & \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & String & \\
\hline Default Value & uid & \\
\hline
\end{tabular}

For SASL LDAP authentication, the name of the attribute that specifies user names in LDAP directory entries. If a user distinguished name is not provided, the authentication plugin searches for the name using this attribute. For example, if the authentication_ldap_sasl_user_search_attr value is uid, a search for the user name user1 finds entries with a uid value of user1.
- authentication_ldap_simple_auth_method_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-authmethod - name=value \\
\hline System Variable & authentication_ldap_simple_auth_method_name \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & SIMPLE \\
\hline Valid Values & SIMPLE \\
\hline
\end{tabular}

For simple LDAP authentication, the authentication method name. Communication between the authentication plugin and the LDAP server occurs according to this authentication method.

> Note
> For all simple LDAP authentication methods, it is recommended to also set TLS parameters to require that communication with the LDAP server take place over secure connections.

These authentication method values are permitted:
- SIMPLE: Use simple LDAP authentication. This method uses either one or two LDAP bind operations, depending on whether the MySQL account names an LDAP user distinguished name. See the description of authentication_ldap_simple_bind_root_dn.
- AD-FOREST: A variation on SIMPLE, such that authentication searches all domains in the Active Directory forest, performing an LDAP bind to each Active Directory domain until the user is found in some domain.
- authentication_ldap_simple_bind_base_dn

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-bind-base-dn=value \\
\hline System Variable & authentication_ldap_simple_bind_base_dn \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

For simple LDAP authentication, the base distinguished name (DN). This variable can be used to limit the scope of searches by anchoring them at a certain location (the "base") within the search tree.

Suppose that members of one set of LDAP user entries each have this form:
uid=user_name,ou=People,dc=example,dc=com
And that members of another set of LDAP user entries each have this form:
uid=user_name,ou=Admin,dc=example,dc=com
Then searches work like this for different base DN values:
- If the base DN is ou=People, dc=example, dc=com: Searches find user entries only in the first set.
- If the base DN is ou=Admin, dc=example, dc=com: Searches find user entries only in the second set.
- If the base DN is ou=dc=example, dc=com: Searches find user entries in the first or second set.

In general, more specific base DN values result in faster searches because they limit the search scope more.
- authentication_ldap_simple_bind_root_dn

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-bind-root-dn=value \\
\hline System Variable & authentication_ldap_simple_bind_root_dn \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

For simple LDAP authentication, the root distinguished name (DN). This variable is used in conjunction with authentication_ldap_simple_bind_root_pwd as the credentials for authenticating to the LDAP server for the purpose of performing searches. Authentication uses either one or two LDAP bind operations, depending on whether the MySQL account names an LDAP user DN:
- If the account does not name a user DN: authentication_ldap_simple performs an initial LDAP binding using authentication_ldap_simple_bind_root_dn and authentication_ldap_simple_bind_root_pwd. (These are both empty by default, so if they are not set, the LDAP server must permit anonymous connections.) The resulting bind LDAP handle is used to search for the user DN, based on the client user name. authentication_ldap_simple performs a second bind using the user DN and client-supplied password.
- If the account does name a user DN: The first bind operation is unnecessary in this case. authentication_ldap_simple performs a single bind using the user DN and client-supplied password. This is faster than if the MySQL account does not specify an LDAP user DN.
- authentication_ldap_simple_bind_root_pwd

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-bind-root-pwd=value & \\
\hline System Variable & authentication_ldap_simple_bind_root_pwd & \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & String & \\
\hline Default Value & NULL & \\
\hline
\end{tabular}

For simple LDAP authentication, the password for the root distinguished name. This variable is used in conjunction with authentication_ldap_simple_bind_root_dn. See the description of that variable.
- authentication_ldap_simple_ca_path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-capath=value \\
\hline System Variable & authentication_ldap_simple_ca_path \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

For simple LDAP authentication, the absolute path of the certificate authority file. Specify this file if it is desired that the authentication plugin perform verification of the LDAP server certificate.

> Note
> In addition to setting the authentication_ldap_simple_ca_path variable to the file name, you must add the appropriate certificate authority certificates to the file and enable the authentication_ldap_simple_tls system variable. These variables can be set to override the default OpenLDAP TLS configuration; see LDAP Pluggable Authentication and Idap.conf
- authentication_ldap_simple_connect_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-connect-timeout=\# \\
\hline System Variable & authentication_ldap_simple_connect_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 30 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

Specifies the time (in seconds) that MySQL server waits to connect to the LDAP server using TCP.
When a MySQL account authenticates using LDAP, MySQL server attempts to establish a TCP connection with the LDAP server, which it uses to send an LDAP bind request over the connection. If the LDAP server does not respond to TCP handshake after a configured amount of time, MySQL abandons the TCP handshake attempt and emits an error message. If the timeout setting is zero, MySQL server ignores this system variable setting. For more information, see Setting Timeouts for LDAP Pluggable Authentication.

\section*{Note}

If you set this variable to a timeout value that is greater than the host system's default value, the shorter system timeout is used.
- authentication_ldap_simple_group_search_attr

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-group-search-attr=value \\
\hline System Variable & authentication_ldap_simple_group_search_attr \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & cn \\
\hline
\end{tabular}

For simple LDAP authentication, the name of the attribute that specifies group names in LDAP directory entries. If authentication_ldap_simple_group_search_attr has its default value of cn, searches return the cn value as the group name. For example, if an LDAP entry with a uid value of user1 has a cn attribute of mygroup, searches for user1 return mygroup as the group name.

If the group search attribute is isMember Of, LDAP authentication directly retrieves the user attribute isMemberOf value and assigns it as group information. If the group search attribute is not isMemberOf, LDAP authentication searches for all groups where the user is a member. (The latter is the default behavior.) This behavior is based on how LDAP group information can be stored two ways: 1) A group entry can have an attribute named memberUid or member with a value that is a user name; 2) A user entry can have an attribute named isMember 0f with values that are group names.
- authentication_ldap_simple_group_search_filter

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-group-search-filter=value & \multirow[b]{2}{*}{ch_fil} \\
\hline System Variable & authentication_ldap_simple_group_sear & \\
\hline Scope & Global & \multirow{5}{*}{} \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & String & \\
\hline Default Value & (|(\&(objectClass=posixGroup) (memberUid=\%s))(\&(objectClass=group) (member=\%s )) ) & \\
\hline
\end{tabular}

For simple LDAP authentication, the custom group search filter.
The search filter value can contain \{UA\} and \{UD\} notation to represent the user name and the full user DN. For example, \{UA\} is replaced with a user name such as "admin", whereas \{UD\} is replaced with a use full DN such as "uid=admin, ou=People,dc=example,dc=com". The following value is the default, which supports both OpenLDAP and Active Directory:
(|(\&(objectClass=posixGroup)(memberUid=\{UA\}))
(\&(objectClass=group)(member=\{UD\})))
In some cases for the user scenario, member 0 f is a simple user attribute that holds no group information. For additional flexibility, an optional \{GA\} prefix can be used with the group search attribute. Any group attribute with a \{GA\} prefix is treated as a user attribute having group names. For example, with a value of \{GA\}MemberOf, if the group value is the DN, the first attribute value from the group DN is returned as the group name.
- authentication_ldap_simple_init_pool_size

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-init-pool-size=\# & \\
\hline System Variable & authentication_ldap_simple_init_pool & size \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Integer & \\
\hline Default Value & 10 & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Minimum Value & 0 \\
\hline Maximum Value & 32767 \\
\hline Unit & connections \\
\hline
\end{tabular}

For simple LDAP authentication, the initial size of the pool of connections to the LDAP server. Choose the value for this variable based on the average number of concurrent authentication requests to the LDAP server.

The plugin uses authentication_ldap_simple_init_pool_size and authentication_ldap_simple_max_pool_size together for connection-pool management:
- When the authentication plugin initializes, it creates
authentication_ldap_simple_init_pool_size connections, unless authentication_ldap_simple_max_pool_size=0 to disable pooling.
- If the plugin receives an authentication request when there are no free connections in the current connection pool, the plugin can create a new connection, up to the maximum connection pool size given by authentication_ldap_simple_max_pool_size.
- If the plugin receives a request when the pool size is already at its maximum and there are no free connections, authentication fails.
- When the plugin unloads, it closes all pooled connections.

Changes to plugin system variable settings may have no effect on connections already in the pool. For example, modifying the LDAP server host, port, or TLS settings does not affect existing connections. However, if the original variable values were invalid and the connection pool could not be initialized, the plugin attempts to reinitialize the pool for the next LDAP request. In this case, the new system variable values are used for the reinitialization attempt.

If authentication_ldap_simple_max_pool_size=0 to disable pooling, each LDAP connection opened by the plugin uses the values the system variables have at that time.
- authentication_ldap_simple_log_status

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-logstatus=\# \\
\hline System Variable & authentication_ldap_simple_log_status \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 6 \\
\hline
\end{tabular}

For simple LDAP authentication, the logging level for messages written to the error log. The following table shows the permitted level values and their meanings.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.30 Log Levels for authentication_ldap_simple_log_status}
\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Option Value & Types of Messages Logged \\
\cline { 2 - 3 } & 1 & No messages \\
\hline 1352 & 2 & Error messages \\
\cline { 2 - 3 } & &
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Value & Types of Messages Logged \\
\hline 3 & Error and warning messages \\
\hline 4 & Error, warning, and information messages \\
\hline 5 & Same as previous level plus debugging messages from MySQL \\
\hline 6 & Same as previous level plus debugging messages from LDAP library \\
\hline
\end{tabular}
- authentication_ldap_simple_max_pool_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-max-pool-size=\# \\
\hline System Variable & authentication_ldap_simple_max_pool_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 32767 \\
\hline Unit & connections \\
\hline
\end{tabular}

For simple LDAP authentication, the maximum size of the pool of connections to the LDAP server. To disable connection pooling, set this variable to 0 .

This variable is used in conjunction with authentication_ldap_simple_init_pool_size. See the description of that variable.
- authentication_ldap_simple_referral

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simplereferral[=\{OFF|ON\}] \\
\hline System Variable & authentication_ldap_simple_referral \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

For simple LDAP authentication, whether to enable LDAP search referral. See LDAP Search Referral.
- authentication_ldap_simple_response_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-response-timeout=\# \\
\hline System Variable & authentication_ldap_simple_response_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Type & Integer \\
\hline Default Value & 30 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

Specifies the time (in seconds) that MySQL server waits for the LDAP server to response to an LDAP bind request.

When a MySQL account authenticates using LDAP, MySQL server sends an LDAP bind request to the LDAP server. If the LDAP server does not respond to the request after a configured amount of time, MySQL abandons the request and emits an error message. If the timeout setting is zero, MySQL server ignores this system variable setting. For more information, see Setting Timeouts for LDAP Pluggable Authentication.
- authentication_ldap_simple_server_host

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-serverhost=host_name \\
\hline System Variable & authentication_ldap_simple_server_host \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

For simple LDAP authentication, the LDAP server host. The permitted values for this variable depend on the authentication method:
- For authentication_ldap_simple_auth_method_name=SIMPLE: The LDAP server host can be a host name or IP address.
- For authentication_ldap_simple_auth_method_name=AD - FOREST. The LDAP server host can be an Active Directory domain name. For example, for an LDAP server URL of ldap :// example.mem.local:389, the domain name can be mem.local.

An Active Directory forest setup can have multiple domains (LDAP server IPs), which can be discovered using DNS. On Unix and Unix-like systems, some additional setup may be required to
configure your DNS server with SRV records that specify the LDAP servers for the Active Directory domain. For information about DNS SRV, see RFC 2782.

Suppose that your configuration has these properties:
- The name server that provides information about Active Directory domains has IP address 10.172.166.100.
- The LDAP servers have names ldap1.mem.local through ldap3.mem.local and IP addresses 10.172.166.101 through 10.172.166.103.

You want the LDAP servers to be discoverable using SRV searches. For example, at the command line, a command like this should list the LDAP servers:
```
host -t SRV _ldap._tcp.mem.local
```


Perform the DNS configuration as follows:
1. Add a line to /etc/resolv.conf to specify the name server that provides information about Active Directory domains:
nameserver 10.172.166.100
2. Configure the appropriate zone file for the name server with SRV records for the LDAP servers:
```
ldap._tcp.mem.local. 86400 IN SRV 0 100 389 ldap1.mem.local.
ldap._tcp.mem.local. 86400 IN SRV 0 100 389 ldap2.mem.local.
ldap._tcp.mem.local. 86400 IN SRV 0 100 389 ldap3.mem.local.
```

3. It may also be necessary to specify the IP address for the LDAP servers in /etc/hosts if the server host cannot be resolved. For example, add lines like this to the file:
```
10.172.166.101 ldap1.mem.local
10.172.166.102 ldap2.mem.local
10.172.166.103 ldap3.mem.local
```


With the DNS configured as just described, the server-side LDAP plugin can discover the LDAP servers and tries to authenticate in all domains until authentication succeeds or there are no more servers.

Windows needs no such settings as just described. Given the LDAP server host in the authentication_ldap_simple_server_host value, the Windows LDAP library searches all domains and attempts to authenticate.
- authentication_ldap_simple_server_port

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-serverport=port_num \\
\hline System Variable & authentication_ldap_simple_server_port \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 389 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 32376 \\
\hline
\end{tabular}

For simple LDAP authentication, the LDAP server TCP/IP port number.
If the LDAP port number is configured as 636 or 3269 , the plugin uses LDAPS (LDAP over SSL) instead of LDAP. (LDAPS differs from startTLS.)
- authentication_ldap_simple_tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simpletls[=\{OFF|ON\}] \\
\hline System Variable & authentication_ldap_simple_tls \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

For simple LDAP authentication, whether connections by the plugin to the LDAP server are secure. If this variable is enabled, the plugin uses TLS to connect securely to the LDAP server. This variable can be set to override the default OpenLDAP TLS configuration; see LDAP Pluggable Authentication and Idap.conf If you enable this variable, you may also wish to set the authentication_ldap_simple_ca_path variable.

MySQL LDAP plugins support the StartTLS method, which initializes TLS on top of a plain LDAP connection.

LDAPS can be used by setting the authentication_ldap_simple_server_port system variable.
- authentication_ldap_simple_user_search_attr

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-ldap-simple-user-search-attr=value \\
\hline System Variable & authentication_ldap_simple_user_search_attr \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & uid \\
\hline
\end{tabular}

For simple LDAP authentication, the name of the attribute that specifies user names in LDAP directory entries. If a user distinguished name is not provided, the authentication plugin searches for the name using this attribute. For example, if the authentication_ldap_simple_user_search_attr value is uid, a search for the user name user1 finds entries with a uid value of user1.
- authentication_webauthn_rp_id

\begin{tabular}{|l|l|l|}
\hline \multirow{2}{*}{} & Command-Line Format & --authentication-webauthn-rpid=value \\
\hline & System Variable & authentication_webauthn_rp_id \\
\hline 1356 & Scope & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable specifies the relying party ID used for server-side plugin installation, device registration, and WebAuthn authentication. If WebAuthn authentication is attempted and this value is not the one expected by the device, the device assumes that it is not talking to the correct server and an error occurs. The maximum value length is 255 characters.

\subsection*{8.4.2 Connection Control Plugins}

MySQL Server includes a plugin library that enables administrators to introduce an increasing delay in server response to connection attempts after a configurable number of consecutive failed attempts. This capability provides a deterrent that slows down brute force attacks against MySQL user accounts. The plugin library contains two plugins:
- CONNECTION_CONTROL checks incoming connection attempts and adds a delay to server responses as necessary. This plugin also exposes system variables that enable its operation to be configured and a status variable that provides rudimentary monitoring information.

The CONNECTION_CONTROL plugin uses the audit plugin interface (see Writing Audit Plugins). To collect information, it subscribes to the MYSQL_AUDIT_CONNECTION_CLASSMASK event class, and processes MYSQL_AUDIT_CONNECTION_CONNECT and MYSQL_AUDIT_CONNECTION_CHANGE_USER subevents to check whether the server should introduce a delay before responding to connection attempts.
- CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS implements an INFORMATION_SCHEMA table that exposes more detailed monitoring information for failed connection attempts. For more information about this table, see Section 28.6.2, "The INFORMATION_SCHEMA CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS Table".

The following sections provide information about connection control plugin installation and configuration.

\subsection*{8.4.2.1 Connection Control Plugin Installation}

This section describes how to install the connection control plugins, CONNECTION_CONTROL and CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS. For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

The plugin library file base name is connection_control. The file name suffix differs per platform (for example, . so for Unix and Unix-like systems, . dll for Windows).

To load the plugins at server startup, use the --plugin-load-add option to name the library file that contains them. With this plugin-loading method, the option must be given each time the server starts. For example, put these lines in the server my.cnf file, adjusting the . so suffix for your platform as necessary:
```
[mysqld]
plugin-load-add=connection_control.so
```


After modifying my.cnf, restart the server to cause the new settings to take effect.
Alternatively, to load the plugins at runtime, use these statements, adjusting the . so suffix for your platform as necessary:
```
INSTALL PLUGIN CONNECTION_CONTROL
    SONAME 'connection_control.so';
```


INSTALL PLUGIN CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS
SONAME 'connection_control.so';
INSTALL PLUGIN loads the plugin immediately, and also registers it in the mysql.plugins system table to cause the server to load it for each subsequent normal startup without the need for - -plugin-load-add.

To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME LIKE 'connection%';
+-------------------------------------------+----------------
| PLUGIN_NAME | PLUGIN_STATUS
+--------------------------------------------+----------------
| CONNECTION_CONTROL | ACTIVE
| CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS | ACTIVE
```


If a plugin fails to initialize, check the server error log for diagnostic messages.
If the plugins have been previously registered with INSTALL PLUGIN or are loaded with --plugin-load-add, you can use the --connection-control and --connection-control-failed-login-attempts options at server startup to control plugin activation. For example, to load the plugins at startup and prevent them from being removed at runtime, use these options:
```
[mysqld]
plugin-load-add=connection_control.so
connection-control=FORCE_PLUS_PERMANENT
connection-control-failed-login-attempts=FORCE_PLUS_PERMANENT
```


If it is desired to prevent the server from running without a given connection control plugin, use an option value of FORCE or FORCE_PLUS_PERMANENT to force server startup to fail if the plugin does not initialize successfully.

\section*{Note}

It is possible to install one plugin without the other, but both must be installed for full connection control capability. In particular, installing only the CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS plugin is of little use because, without the CONNECTION_CONTROL plugin to provide the data that populates the CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS table, the table is always empty.
- Connection Delay Configuration
- Connection Failure Assessment
- Connection Failure Monitoring

\section*{Connection Delay Configuration}

To enable configuring its operation, the CONNECTION_CONTROL plugin exposes these system variables:
- connection_control_failed_connections_threshold: The number of consecutive failed connection attempts permitted to accounts before the server adds a delay for subsequent connection attempts. To disable failed-connection counting, set connection_control_failed_connections_threshold to zero.
- connection_control_min_connection_delay: The minimum delay in milliseconds for connection failures above the threshold.
- connection_control_max_connection_delay: The maximum delay in milliseconds for connection failures above the threshold.

If connection_control_failed_connections_threshold is nonzero, failed-connection counting is enabled and has these properties:
- The delay is zero up through connection_control_failed_connections_threshold consecutive failed connection attempts.
- Thereafter, the server adds an increasing delay for subsequent consecutive attempts, until a successful connection occurs. The initial unadjusted delays begin at 1000 milliseconds ( 1 second) and increase by 1000 milliseconds per attempt. That is, once delay has been activated for an account, the unadjusted delays for subsequent failed attempts are 1000 milliseconds, 2000 milliseconds, 3000 milliseconds, and so forth.
- The actual delay experienced by a client is the unadjusted delay, adjusted to lie within the values of the connection_control_min_connection_delay and connection_control_max_connection_delay system variables, inclusive.
- Once delay has been activated for an account, the first successful connection thereafter by the account also experiences a delay, but failure counting is reset for subsequent connections.

For example, with the default connection_control_failed_connections_threshold value of 3 , there is no delay for the first three consecutive failed connection attempts by an account. The actual adjusted delays experienced by the account for the fourth and subsequent failed connections depend on the connection_control_min_connection_delay and connection_control_max_connection_delay values:
- If connection_control_min_connection_delay and connection_control_max_connection_delay are 1000 and 20000, the adjusted delays are the same as the unadjusted delays, up to a maximum of 20000 milliseconds. The fourth and subsequent failed connections are delayed by 1000 milliseconds, 2000 milliseconds, 3000 milliseconds, and so forth.
- If connection_control_min_connection_delay and connection_control_max_connection_delay are 1500 and 20000, the adjusted delays for the fourth and subsequent failed connections are 1500 milliseconds, 2000 milliseconds, 3000 milliseconds, and so forth, up to a maximum of 20000 milliseconds.
- If connection_control_min_connection_delay and connection_control_max_connection_delay are 2000 and 3000, the adjusted delays for the fourth and subsequent failed connections are 2000 milliseconds, 2000 milliseconds, and 3000 milliseconds, with all subsequent failed connections also delayed by 3000 milliseconds.

You can set the CONNECTION_CONTROL system variables at server startup or runtime. Suppose that you want to permit four consecutive failed connection attempts before the server starts delaying its responses, with a minimum delay of 2000 milliseconds. To set the relevant variables at server startup, put these lines in the server my. cnf file:
```
[mysqld]
plugin-load-add=connection_control.so
connection-control-failed-connections-threshold=4
connection-control-min-connection-delay=2000
```


To set and persist the variables at runtime, use these statements:
```
SET PERSIST connection_control_failed_connections_threshold = 4;
SET PERSIST connection_control_min_connection_delay = 2000;
```


SET PERSIST sets a value for the running MySQL instance. It also saves the value, causing it to carry over to subsequent server restarts. To change a value for the running MySQL instance without having it carry over to subsequent restarts, use the GLOBAL keyword rather than PERSIST. See Section 15.7.6.1, "SET Syntax for Variable Assignment".

The connection_control_min_connection_delay and connection_control_max_connection_delay system variables both have minimum and
maximum values of 1000 and 2147483647 . In addition, the permitted range of values of each variable also depends on the current value of the other:
- connection_control_min_connection_delay cannot be set greater than the current value of connection_control_max_connection_delay.
- connection_control_max_connection_delay cannot be set less than the current value of connection_control_min_connection_delay.

Thus, to make the changes required for some configurations, you might need to set the variables in a specific order. Suppose that the current minimum and maximum delays are 1000 and 2000, and that you want to set them to 3000 and 5000 . You cannot first set connection_control_min_connection_delay to 3000 because that is greater than the current connection_control_max_connection_delay value of 2000. Instead, set connection_control_max_connection_delay to 5000, then set connection_control_min_connection_delay to 3000.

\section*{Connection Failure Assessment}

When the CONNECTION_CONTROL plugin is installed, it checks connection attempts and tracks whether they fail or succeed. For this purpose, a failed connection attempt is one for which the client user and host match a known MySQL account but the provided credentials are incorrect, or do not match any known account.

Failed-connection counting is based on the user/host combination for each connection attempt. Determination of the applicable user name and host name takes proxying into account and occurs as follows:
- If the client user proxies another user, the account for failed-connection counting is the proxying user, not the proxied user. For example, if external_user@example.com proxies proxy_user@example.com, connection counting uses the proxying user, external_user@example.com, rather than the proxied user, proxy_user@example.com. Both external_user@example.com and proxy_user@example.com must have valid entries in the mysql. user system table and a proxy relationship between them must be defined in the mysql.proxies_priv system table (see Section 8.2.19, "Proxy Users").
- If the client user does not proxy another user, but does match a mysql.user entry, counting uses the CURRENT_USER( ) value corresponding to that entry. For example, if a user user 1 connecting from a host host1.example.com matches a user1@host1.example.com entry, counting uses user1@host1.example.com. If the user matches a user1@\%.example.com, user1@\%.com, or user1@\% entry instead, counting uses user1@\%.example.com, user1@\%.com, or user1@\%, respectively.

For the cases just described, the connection attempt matches some mysql. user entry, and whether the request succeeds or fails depends on whether the client provides the correct authentication credentials. For example, if the client presents an incorrect password, the connection attempt fails.

If the connection attempt matches no mysql. user entry, the attempt fails. In this case, no CURRENT_USER( ) value is available and connection-failure counting uses the user name provided by the client and the client host as determined by the server. For example, if a client attempts to connect as user user2 from host host2. example.com, the user name part is available in the client request and the server determines the host information. The user/host combination used for counting is user2@host2.example.com.

\section*{Note}

The server maintains information about which client hosts can possibly connect to the server (essentially the union of host values for mysql. user entries). If a client attempts to connect from any other host, the server rejects the attempt at an early stage of connection setup:

ERROR 1130 (HY000): Host 'host_name' is not

\section*{allowed to connect to this MySQL server}

Because this type of rejection occurs so early, CONNECTION_CONTROL does not see it, and does not count it.

\section*{Connection Failure Monitoring}

To monitor failed connections, use these information sources:
- The Connection_control_delay_generated status variable indicates the number of times the server added a delay to its response to a failed connection attempt. This does not count attempts that occur before reaching the threshold defined by the connection_control_failed_connections_threshold system variable.
- The INFORMATION_SCHEMA CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS table provides information about the current number of consecutive failed connection attempts per account (user/ host combination). This counts all failed attempts, regardless of whether they were delayed.

Assigning a value to connection_control_failed_connections_threshold at runtime has these effects:
- All accumulated failed-connection counters are reset to zero.
- The Connection_control_delay_generated status variable is reset to zero.
- The CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS table becomes empty.

\subsection*{8.4.2.2 Connection Control Plugin System and Status Variables}

This section describes the system and status variables that the CONNECTION_CONTROL plugin provides to enable its operation to be configured and monitored.
- Connection Control Plugin System Variables
- Connection Control Plugin Status Variables

\section*{Connection Control Plugin System Variables}

If the CONNECTION_CONTROL plugin is installed, it exposes these system variables:
- connection_control_failed_connections_threshold

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --connection-control-failed-connections-threshold=\# & \\
\hline System Variable & connection_control_failed_connections_thres & \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Integer & \\
\hline Default Value & 3 & \\
\hline Minimum Value & 0 & \\
\hline Maximum Value & 2147483647 & \\
\hline
\end{tabular}

The number of consecutive failed connection attempts permitted to accounts before the server adds a delay for subsequent connection attempts:
- If the variable has a nonzero value $N$, the server adds a delay beginning with consecutive failed attempt $N+1$. If an account has reached the point where connection responses are delayed, a delay also occurs for the next subsequent successful connection.
- Setting this variable to zero disables failed-connection counting. In this case, the server never adds delays.

For information about how connection_control_failed_connections_threshold interacts with other connection control system and status variables, see Section 8.4.2.1, "Connection Control Plugin Installation".
- connection_control_max_connection_delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connection-control-max-connectiondelay=\# \\
\hline System Variable & connection_control_max_connection_delay \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2147483647 \\
\hline Minimum Value & 1000 \\
\hline Maximum Value & 2147483647 \\
\hline Unit & milliseconds \\
\hline
\end{tabular}

The maximum delay in milliseconds for server response to failed connection attempts, if connection_control_failed_connections_threshold is greater than zero.

For information about how connection_control_max_connection_delay interacts with other connection control system and status variables, see Section 8.4.2.1, "Connection Control Plugin Installation".
- connection_control_min_connection_delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connection-control-min-connectiondelay=\# \\
\hline System Variable & connection_control_min_connection_delay \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1000 \\
\hline Minimum Value & 1000 \\
\hline Maximum Value & 2147483647 \\
\hline Unit & milliseconds \\
\hline
\end{tabular}

The minimum delay in milliseconds for server response to failed connection attempts, if connection_control_failed_connections_threshold is greater than zero.

For information about how connection_control_min_connection_delay interacts with other connection control system and status variables, see Section 8.4.2.1, "Connection Control Plugin Installation".

\section*{Connection Control Plugin Status Variables}

If the CONNECTION_CONTROL plugin is installed, it exposes this status variable:
- Connection_control_delay_generated

The number of times the server added a delay to its response to a failed connection attempt. This does not count attempts that occur before reaching the threshold defined by the connection_control_failed_connections_threshold system variable.

This variable provides a simple counter. For more detailed connection control monitoring information, examine the INFORMATION_SCHEMA CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS table; see Section 28.6.2, "The INFORMATION_SCHEMA CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS Table".

Assigning a value to connection_control_failed_connections_threshold at runtime resets Connection_control_delay_generated to zero.

\subsection*{8.4.3 The Password Validation Component}

The validate_password component serves to improve security by requiring account passwords and enabling strength testing of potential passwords. This component exposes system variables that enable you to configure password policy, and status variables for component monitoring.

The validate_password component implements these capabilities:
- For SQL statements that assign a password supplied as a cleartext value, validate_password checks the password against the current password policy and rejects the password if it is weak (the statement returns an ER_NOT_VALID_PASSWORD error). This applies to the ALTER USER, CREATE USER, and SET PASSWORD statements.
- For CREATE USER statements, validate_password requires that a password be given, and that it satisfies the password policy. This is true even if an account is locked initially because otherwise unlocking the account later would cause it to become accessible without a password that satisfies the policy.
- validate_password implements a VALIDATE_PASSWORD_STRENGTH( ) SQL function that assesses the strength of potential passwords. This function takes a password argument and returns an integer from 0 (weak) to 100 (strong).

\section*{Note}

For statements that assign or modify account passwords (ALTER USER, CREATE USER, and SET PASSWORD), the validate_password capabilities described here apply only to accounts that use an authentication plugin that stores credentials internally to MySQL. For accounts that use plugins that perform authentication against a credentials system external to MySQL, password management must be handled externally against that system as well. For more information about internal credentials storage, see Section 8.2.15, "Password Management".

The preceding restriction does not apply to use of the VALIDATE_PASSWORD_STRENGTH( ) function because it does not affect accounts directly.

Examples:
- validate_password checks the cleartext password in the following statement. Under the default password policy, which requires passwords to be at least 8 characters long, the password is weak and the statement produces an error:
```
mysql> ALTER USER USER() IDENTIFIED BY 'abc';
ERROR 1819 (HY000): Your password does not satisfy the current
policy requirements
```

- Passwords specified as hashed values are not checked because the original password value is not available for checking:
```
mysql> ALTER USER 'jeffrey'@'localhost'
    IDENTIFIED WITH mysql_native_password
    AS '*0D3CED9BEC10A777AEC23CCC353A8C08A633045E';
Query OK, 0 rows affected (0.01 sec)
```

- This account-creation statement fails, even though the account is locked initially, because it does not include a password that satisfies the current password policy:
```
mysql> CREATE USER 'juanita'@'localhost' ACCOUNT LOCK;
ERROR 1819 (HY000): Your password does not satisfy the current
policy requirements
```

- To check a password, use the VALIDATE_PASSWORD_STRENGTH( ) function:
```
mysql> SELECT VALIDATE_PASSWORD_STRENGTH('weak');
+---------------------------------------+
| VALIDATE_PASSWORD_STRENGTH('weak') |
+--------------------------------------+
| 25 |
+--------------------------------------+
mysql> SELECT VALIDATE_PASSWORD_STRENGTH('lessweak$_@123');
+-------------------------------------------------
| VALIDATE_PASSWORD_STRENGTH('lessweak$_@123') |
+------------------------------------------------
| 50 |
+----------------------------------------------+
mysql> SELECT VALIDATE_PASSWORD_STRENGTH('N0Tweak$_@123!');
+------------------------------------------------+
| VALIDATE_PASSWORD_STRENGTH('N0Tweak$_@123!') |
+-------------------------------------------------
| 100
+----------------------------------------------+
```


To configure password checking, modify the system variables having names of the form validate_password.xxx; these are the parameters that control password policy. See Section 8.4.3.2, "Password Validation Options and Variables".

If validate_password is not installed, the validate_password. $x x x$ system variables are not available, passwords in statements are not checked, and the VALIDATE_PASSWORD_STRENGTH( ) function always returns 0. For example, without the plugin installed, accounts can be assigned passwords shorter than 8 characters, or no password at all.

Assuming that validate_password is installed, it implements three levels of password checking: LOW, MEDIUM, and STRONG. The default is MEDIUM; to change this, modify the value of validate_password.policy. The policies implement increasingly strict password tests. The following descriptions refer to default parameter values, which can be modified by changing the appropriate system variables.
- LOW policy tests password length only. Passwords must be at least 8 characters long. To change this length, modify validate_password.length.
- MEDIUM policy adds the conditions that passwords must contain at least 1 numeric character, 1 lowercase character, 1 uppercase character, and 1 special (nonalphanumeric) character. To change these values, modify validate_password.number_count, validate_password.mixed_case_count, and validate_password.special_char_count.
- STRONG policy adds the condition that password substrings of length 4 or longer must not match words in the dictionary file, if one has been specified. To specify the dictionary file, modify validate_password.dictionary_file.

In addition, validate_password supports the capability of rejecting passwords that match the user name part of the effective user account for the current session, either forward
or in reverse. To provide control over this capability, validate_password exposes a validate_password.check_user_name system variable, which is enabled by default.

\subsection*{8.4.3.1 Password Validation Component Installation and Uninstallation}

This section describes how to install and uninstall the validate_password password-validation component. For general information about installing and uninstalling components, see Section 7.5, "MySQL Components".

> Note
> If you install MySQL 8.4 using the MySQL Yum repository, MySQL SLES Repository, or RPM packages provided by Oracle, the validate_password component is enabled by default after you start your MySQL Server for the first time.

> Upgrades to MySQL 8.4 from 8.3 using Yum or RPM packages leave the validate_password plugin in place. To make the transition from the validate_password plugin to the validate_password component, see Section 8.4.3.3, "Transitioning to the Password Validation Component".

To be usable by the server, the component library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

To install the validate_password component, use this statement:
```
INSTALL COMPONENT 'file://component_validate_password';
```


Component installation is a one-time operation that need not be done per server startup. INSTALL COMPONENT loads the component, and also registers it in the mysql.component system table to cause it to be loaded during subsequent server startups.

To uninstall the validate_password component, use this statement:
```
UNINSTALL COMPONENT 'file://component_validate_password';
```


UNINSTALL COMPONENT unloads the component, and unregisters it from the mysql.component system table to cause it not to be loaded during subsequent server startups.

\subsection*{8.4.3.2 Password Validation Options and Variables}

This section describes the system and status variables that validate_password provides to enable its operation to be configured and monitored.
- Password Validation Component System Variables
- Password Validation Component Status Variables
- Password Validation Plugin Options
- Password Validation Plugin System Variables
- Password Validation Plugin Status Variables

\section*{Password Validation Component System Variables}

If the validate_password component is enabled, it exposes several system variables that enable configuration of password checking:
```
mysql> SHOW VARIABLES LIKE 'validate_password.%';
+---------------------------------------------------+--------+
| Variable_name | Value |
+---------------------------------------------------+-------+
```

```
| validate_password.changed_characters_percentage | 0
| validate_password.check_user_name | ON
| validate_password.dictionary_file |
| validate_password.length | 8
| validate_password.mixed_case_count | 1
| validate_password.number_count | 1
| validate_password.policy | MEDIUM
| validate_password.special_char_count | 1
+--------------------------------------------------+-------+
```


To change how passwords are checked, you can set these system variables at server startup or at runtime. The following list describes the meaning of each variable.
- validate_password.changed_characters_percentage

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --validate-password.changed-characters-percentage[=value] & \multirow{9}{*}{percentag} \\
\hline System Variable & validate_password.changed_characters_ & \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Integer & \\
\hline Default Value & 0 & \\
\hline Minimum Value & 0 & \\
\hline Maximum Value & 100 & \\
\hline
\end{tabular}

Indicates the minimum number of characters, as a percentage of all characters, in a password that a user must change before validate_password accepts a new password for the user's own account. This applies only when changing an existing password, and has no effect when setting a user account's initial password.

This variable is not available unless validate_password is installed.
By default, validate_password.changed_characters_percentage permits all of the characters from the current password to be reused in the new password. The range of valid percentages is 0 to 100 . If set to 100 percent, all of the characters from the current password are rejected, regardless of the casing. Characters ' $a b c$ ' and ' $A B C$ ' are considered to be the same characters. If validate_password rejects the new password, it reports an error indicating the minimum number of characters that must differ.

If the ALTER USER statement does not provide the existing password in a REPLACE clause, this variable is not enforced. Whether the REPLACE clause is required is subject to the password verification policy as it applies to a given account. For an overview of the policy, see Password Verification-Required Policy.
- validate_password.check_user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password.check-username [=\{OFF | ON\}] \\
\hline System Variable & validate_password.check_user_name \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Whether validate_password compares passwords to the user name part of the effective user account for the current session and rejects them if they match. This variable is unavailable unless validate_password is installed.

By default, validate_password.check_user_name is enabled. This variable controls user name matching independent of the value of validate_password.policy.

When validate_password.check_user_name is enabled, it has these effects:
- Checking occurs in all contexts for which validate_password is invoked, which includes use of statements such as ALTER USER or SET PASSWORD to change the current user's password, and invocation of functions such as VALIDATE_PASSWORD_STRENGTH( ).
- The user names used for comparison are taken from the values of the USER( ) and CURRENT_USER( ) functions for the current session. An implication is that a user who has sufficient privileges to set another user's password can set the password to that user's name, and cannot set that user' password to the name of the user executing the statement. For example, 'root'@'localhost' can set the password for 'jeffrey'@'localhost' to 'jeffrey', but cannot set the password to 'root.
- Only the user name part of the USER( ) and CURRENT_USER( ) function values is used, not the host name part. If a user name is empty, no comparison occurs.
- If a password is the same as the user name or its reverse, a match occurs and the password is rejected.
- User-name matching is case-sensitive. The password and user name values are compared as binary strings on a byte-by-byte basis.
- If a password matches the user name, VALIDATE_PASSWORD_STRENGTH( ) returns 0 regardless of how other validate_password system variables are set.
- validate_password.dictionary_file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password.dictionaryfile=file_name \\
\hline System Variable & validate_password.dictionary_file \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

The path name of the dictionary file that validate_password uses for checking passwords. This variable is unavailable unless validate_password is installed.

By default, this variable has an empty value and dictionary checks are not performed. For dictionary checks to occur, the variable value must be nonempty. If the file is named as a relative path, it is interpreted relative to the server data directory. File contents should be lowercase, one word per line. Contents are treated as having a character set of utf 8 mb 3 . The maximum permitted file size is 1 MB .

For the dictionary file to be used during password checking, the password policy must be set to 2 (STRONG); see the description of the validate_password.policy system variable. Assuming
that is true, each substring of the password of length 4 up to 100 is compared to the words in the dictionary file. Any match causes the password to be rejected. Comparisons are not case-sensitive.

For VALIDATE_PASSWORD_STRENGTH( ), the password is checked against all policies, including STRONG, so the strength assessment includes the dictionary check regardless of the validate_password.policy value.
validate_password.dictionary_file can be set at runtime and assigning a value causes the named file to be read without a server restart.
- validate_password.length

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password.length=\# \\
\hline System Variable & validate_password.length \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

The minimum number of characters that validate_password requires passwords to have. This variable is unavailable unless validate_password is installed.

The validate_password.length minimum value is a function of several other related system variables. The value cannot be set less than the value of this expression:
```
validate_password.number_count
+ validate_password.special_char_count
+ (2 * validate_password.mixed_case_count)
```


If validate_password adjusts the value of validate_password.length due to the preceding constraint, it writes a message to the error log.
- validate_password.mixed_case_count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password.mixed-casecount=\# \\
\hline System Variable & validate_password.mixed_case_count \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

The minimum number of lowercase and uppercase characters that validate_password requires passwords to have if the password policy is MEDIUM or stronger. This variable is unavailable unless validate_password is installed.

For a given validate_password.mixed_case_count value, the password must have that many lowercase characters, and that many uppercase characters.
- validate_password.number_count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password.number-count=\# \\
\hline System Variable & validate_password.number_count \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

The minimum number of numeric (digit) characters that validate_password requires passwords to have if the password policy is MEDIUM or stronger. This variable is unavailable unless validate_password is installed.
- validate_password.policy

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password.policy=value \\
\hline System Variable & validate_password.policy \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & 1 \\
\hline Valid Values & \begin{tabular}{l}
0 \\
1 \\
2
\end{tabular} \\
\hline
\end{tabular}

The password policy enforced by validate_password. This variable is unavailable unless validate_password is installed.
validate_password.policy affects how validate_password uses its other policysetting system variables, except for checking passwords against user names, which is controlled independently by validate_password.check_user_name.

The validate_password.policy value can be specified using numeric values $0,1,2$, or the corresponding symbolic values LOW, MEDIUM, STRONG. The following table describes the tests performed for each policy. For the length test, the required length is the value of the validate_password.length system variable. Similarly, the required values for the other tests are given by other validate_password. $x x x$ variables.

\begin{tabular}{|l|l|}
\hline Policy & Tests Performed \\
\hline 0 or LOW & Length \\
\hline 1 or MEDIUM & Length; numeric, lowercase/uppercase, and special characters \\
\hline 2 or STRONG & Length; numeric, lowercase/uppercase, and special characters; dictionary file \\
\hline
\end{tabular}
- validate_password.special_char_count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password.special-charcount=\# \\
\hline System Variable & validate_password.special_char_count \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

The minimum number of nonalphanumeric characters that validate_password requires passwords to have if the password policy is MEDIUM or stronger. This variable is unavailable unless validate_password is installed.

\section*{Password Validation Component Status Variables}

If the validate_password component is enabled, it exposes status variables that provide operational information:
```
mysql> SHOW STATUS LIKE 'validate_password.%';
+-------------------------------------------------+-----------------------
| Variable_name | Value |
+-------------------------------------------------+-----------------------
| validate_password.dictionary_file_last_parsed | 2019-10-03 08:33:49
| validate_password.dictionary_file_words_count | 1902 |
```


The following list describes the meaning of each status variable.
- validate_password.dictionary_file_last_parsed

When the dictionary file was last parsed. This variable is unavailable unless validate_password is installed.
- validate_password.dictionary_file_words_count

The number of words read from the dictionary file. This variable is unavailable unless validate_password is installed.

\section*{Password Validation Plugin Options}

\section*{Note}

In MySQL 8.4, the validate_password plugin was reimplemented as the validate_password component. The validate_password plugin is deprecated; expect it to be removed in a future version of MySQL. Consequently, its options are also deprecated, and you should expect them to be removed as well. MySQL installations that use the plugin should make the transition to using the component instead. See Section 8.4.3.3, "Transitioning to the Password Validation Component".

To control activation of the validate_password plugin, use this option:
- --validate-password[=value]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password[=value] \\
\hline Type & Enumeration \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & ON \\
\hline \multirow[t]{4}{*}{Valid Values} & ON \\
\hline & OFF \\
\hline & FORCE \\
\hline & FORCE_PLUS_PERMANENT \\
\hline
\end{tabular}

This option controls how the server loads the deprecated validate_password plugin at startup. The value should be one of those available for plugin-loading options, as described in Section 7.6.1, "Installing and Uninstalling Plugins". For example, --validatepassword=FORCE_PLUS_PERMANENT tells the server to load the plugin at startup and prevents it from being removed while the server is running.

This option is available only if the validate_password plugin has been previously registered with INSTALL PLUGIN or is loaded with --plugin-load-add. See Section 8.4.3.1, "Password Validation Component Installation and Uninstallation".

\section*{Password Validation Plugin System Variables}

\section*{Note}

In MySQL 8.4, the validate_password plugin was reimplemented as the validate_password component. The validate_password plugin is deprecated; expect it to be removed in a future version of MySQL. Consequently, its system variables are also deprecated and you should expect them to be removed as well. Use the corresponding system variables of the validate_password component instead; see Password Validation Component System Variables. MySQL installations that use the plugin should make the transition to using the component instead. See Section 8.4.3.3, "Transitioning to the Password Validation Component".
- validate_password_check_user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -validate-password-check-username[=\{OFF|ON\}] \\
\hline System Variable & validate_password_check_user_name \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

This validate_password plugin system variable is deprecated; expect it to be removed in a future version of MySQL. Use the corresponding validate_password.check_user_name system variable of the validate_password component instead.
- validate_password_dictionary_file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password-dictionaryfile=file_name \\
\hline System Variable & validate_password_dictionary_file \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

This validate_password plugin system variable is deprecated; expect it to be removed in a future version of MySQL. Use the corresponding validate_password.dictionary_file system variable of the validate_password component instead.
- validate_password_length

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password-length=\# \\
\hline System Variable & validate_password_length \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

This validate_password plugin system variable is deprecated; expect it to be removed in a future version of MySQL. Use the corresponding validate_password.length system variable of the validate_password component instead.
- validate_password_mixed_case_count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password-mixed-casecount=\# \\
\hline System Variable & validate_password_mixed_case_count \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

This validate_password plugin system variable is deprecated; expect it to be removed in a future version of MySQL. Use the corresponding validate_password.mixed_case_count system variable of the validate_password component instead.
- validate_password_number_count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password-number-count=\# \\
\hline System Variable & validate_password_number_count \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline
\end{tabular}
\begin{tabular}{|l|l|}
\hline Minimum Value & 0
\end{tabular}
This validate_password plugin system variable is deprecated; expect it to be removed in a future version of MySQL. Use the corresponding validate_password.number_count system variable of the validate_password component instead.
- validate_password_policy

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password-policy=value \\
\hline System Variable & validate_password_policy \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & 1 \\
\hline Valid Values & \begin{tabular}{l}
0 \\
1 \\
2
\end{tabular} \\
\hline
\end{tabular}

This validate_password plugin system variable is deprecated; expect it to be removed in a future version of MySQL. Use the corresponding validate_password.policy system variable of the validate_password component instead.
- validate_password_special_char_count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-password-special-charcount=\# \\
\hline System Variable & validate_password_special_char_count \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

This validate_password plugin system variable is deprecated; expect it to be removed in a future version of MySQL. Use the corresponding validate_password.special_char_count system variable of the validate_password component instead.

\section*{Password Validation Plugin Status Variables}

> Note
> In MySQL 8.4, the validate_password plugin was reimplemented as the validate_password component. The validate_password plugin is deprecated; expect it to be removed in a future version of MySQL. Consequently, its status variables are also deprecated; expect it to be removed. Use the corresponding status variables of the validate_password component; see Password Validation Component Status Variables. MySQL installations that use the plugin should make the transition to using the component instead. See Section 8.4.3.3, "Transitioning to the Password Validation Component".
- validate_password_dictionary_file_last_parsed

This validate_password plugin status variable is deprecated; expect it to be removed in a future version of MySQL. Use the corresponding validate_password.dictionary_file_last_parsed status variable of the validate_password component instead.
- validate_password_dictionary_file_words_count

This validate_password plugin status variable is deprecated; expect it to be removed in a future version of MySQL. Use the corresponding validate_password.dictionary_file_words_count status variable of the validate_password component instead.

\subsection*{8.4.3.3 Transitioning to the Password Validation Component}

\section*{Note}

In MySQL 8.4, the validate_password plugin was reimplemented as the validate_password component. The validate_password plugin is deprecated; expect it to be removed in a future version of MySQL.

MySQL installations that currently use the validate_password plugin should make the transition to using the validate_password component instead. To do so, use the following procedure. The procedure installs the component before uninstalling the plugin, to avoid having a time window during which no password validation occurs. (The component and plugin can be installed simultaneously. In this case, the server attempts to use the component, falling back to the plugin if the component is unavailable.)
1. Install the validate_password component:

INSTALL COMPONENT 'file://component_validate_password';
2. Test the validate_password component to ensure that it works as expected. If you need to set any validate_password. $x x x$ system variables, you can do so at runtime using SET GLOBAL. (Any option file changes that must be made are performed in the next step.)
3. Adjust any references to the plugin system and status variables to refer to the corresponding component system and status variables. Suppose that previously you had configured the plugin at startup using an option file like this:
```
[mysqld]
validate-password=FORCE_PLUS_PERMANENT
validate_password_dictionary_file=/usr/share/dict/words
validate_password_length=10
validate_password_number_count=2
```


Those settings are appropriate for the plugin, but must be modified to apply to the component. To adjust the option file, omit the --validate-password option (it applies only to the plugin, not the component), and modify the system variable references from no-dot names appropriate for the plugin to dotted names appropriate for the component:
```
[mysqld]
validate_password.dictionary_file=/usr/share/dict/words
validate_password.length=10
validate_password.number_count=2
```


Similar adjustments are needed for applications that refer at runtime to validate_password plugin system and status variables. Change the no-dot plugin variable names to the corresponding dotted component variable names.
4. Uninstall the validate_password plugin:

UNINSTALL PLUGIN validate_password;

If the validate_password plugin is loaded at server startup using a --plugin-load or --plugin-load-add option, omit that option from the server startup procedure. For example, if the option is listed in a server option file, remove it from the file.
5. Restart the server.

\subsection*{8.4.4 The MySQL Keyring}

MySQL Server supports a keyring that enables internal server components and plugins to securely store sensitive information for later retrieval. The implementation comprises these elements:
- Keyring components and plugins that manage a backing store or communicate with a storage back end. Keyring use involves installing one from among the available components and plugins. Keyring components and plugins both manage keyring data but are configured differently and may have operational differences (see Section 8.4.4.1, "Keyring Components Versus Keyring Plugins").

These keyring components are available:
- component_keyring_file: Stores keyring data in a file local to the server host. Available in MySQL Community Edition and MySQL Enterprise Edition distributions. See Section 8.4.4.4, "Using the component_keyring_file File-Based Keyring Component".
- component_keyring_encrypted_file: Stores keyring data in an encrypted, passwordprotected file local to the server host. Available in MySQL Enterprise Edition distributions. See Section 8.4.4.5, "Using the component_keyring_encrypted_file Encrypted File-Based Keyring Component".
- component_keyring_oci: Stores keyring data in the Oracle Cloud Infrastructure Vault. Available in MySQL Enterprise Edition distributions. See Section 8.4.4.9, "Using the Oracle Cloud Infrastructure Vault Keyring Component".

These keyring plugins are available:
- keyring_okv: A KMIP 1.1 plugin for use with KMIP-compatible back end keyring storage products such as Oracle Key Vault and Gemalto SafeNet KeySecure Appliance. Available in MySQL Enterprise Edition distributions. See Section 8.4.4.6, "Using the keyring_okv KMIP Plugin".
- keyring_aws: Communicates with the Amazon Web Services Key Management Service for key generation and uses a local file for key storage. Available in MySQL Enterprise Edition distributions. See Section 8.4.4.7, "Using the keyring_aws Amazon Web Services Keyring Plugin".
- keyring_hashicorp: Communicates with HashiCorp Vault for back end storage. Available in MySQL Enterprise Edition distributions. See Section 8.4.4.8, "Using the HashiCorp Vault Keyring Plugin".
- A keyring service interface for keyring key management. This service is accessible at two levels:
- SQL interface: In SQL statements, call the functions described in Section 8.4.4.12, "GeneralPurpose Keyring Key-Management Functions".
- C interface: In C -language code, call the keyring service functions described in Section 7.6.9.2, "The Keyring Service".
- Key metadata access:
- The Performance Schema keyring_keys table exposes metadata for keys in the keyring. Key metadata includes key IDs, key owners, and backend key IDs. The keyring_keys table does not expose any sensitive keyring data such as key contents. See Section 29.12.18.2, "The keyring_keys table".
- The Performance Schema keyring_component_status table provides status information about the keyring component in use, if one is installed. See Section 29.12.18.1, "The keyring_component_status Table".
- A key migration capability. MySQL supports migration of keys between keystores, enabling DBAs to switch a MySQL installation from one keystore to another. See Section 8.4.4.11, "Migrating Keys Between Keyring Keystores".
- The implementation of keyring plugins is revised to use the component infrastructure. This is facilitated using the built-in plugin named daemon_keyring_proxy_plugin that acts as a bridge between the plugin and component service APIs. See Section 7.6.8, "The Keyring Proxy Bridge Plugin".

\section*{Warning}

For encryption key management, the component_keyring_file and component_keyring_encrypted_file components are not intended as a regulatory compliance solution. Security standards such as PCI, FIPS, and others require use of key management systems to secure, manage, and protect encryption keys in key vaults or hardware security modules (HSMs).

Within MySQL, keyring service consumers include:
- The InnoDB storage engine uses the keyring to store its key for tablespace encryption. See Section 17.13, "InnoDB Data-at-Rest Encryption".
- MySQL Enterprise Audit uses the keyring to store the audit log file encryption password. See Encrypting Audit Log Files.
- Binary log and relay log management supports keyring-based encryption of log files. With log file encryption activated, the keyring stores the keys used to encrypt passwords for the binary log files and relay log files. See Section 19.3.2, "Encrypting Binary Log Files and Relay Log Files".
- The master key to decrypt the file key that decrypts the persisted values of sensitive system variables is stored in the keyring. A keyring component must be enabled on the MySQL Server instance to support secure storage for persisted system variable values, rather than a keyring plugin, which do not support the function. See Persisting Sensitive System Variables.

For general keyring installation instructions, see Section 8.4.4.2, "Keyring Component Installation", and Section 8.4.4.3, "Keyring Plugin Installation". For installation and configuration information specific to a given keyring component or plugin, see the section describing it.

For information about using the keyring functions, see Section 8.4.4.12, "General-Purpose Keyring Key-Management Functions".

Keyring components, plugins, and functions access a keyring service that provides the interface to the keyring. For information about accessing this service and writing keyring plugins, see Section 7.6.9.2, "The Keyring Service", and Writing Keyring Plugins.

\subsection*{8.4.4.1 Keyring Components Versus Keyring Plugins}

The MySQL Keyring originally implemented keystore capabilities using server plugins, but began transitioning to use the component infrastructure. This section briefly compares keyring components and plugins to provide an overview of their differences. It may assist you in making the transition from plugins to components, or, if you are just beginning to use the keyring, assist you in choosing whether to use a component versus using a plugin.
- Keyring plugin loading uses the --early-plugin-load option. Keyring component loading uses a manifest.
- Keyring plugin configuration is based on plugin-specific system variables. For keyring components, no system variables are used. Instead, each component has its own configuration file.
- Keyring components have fewer restrictions than keyring plugins with respect to key types and lengths. See Section 8.4.4.10, "Supported Keyring Key Types and Lengths".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1407.jpg?height=109&width=101&top_left_y=374&top_left_x=402)

\section*{Note \\ component_keyring_oci can generate keys of type AES with a size of 16, 24 , or 32 bytes only.}
- Keyring components support secure storage for persisted system variable values, whereas keyring plugins do not support the function.

A keyring component must be enabled on the MySQL server instance to support secure storage for persisted system variable values. The sensitive data that can be protected in this way includes items such as private keys and passwords that appear in the values of system variables. In the operating system file where persisted system variables are stored, the names and values of sensitive system variables are stored in an encrypted format, along with a generated file key to decrypt them. The generated file key is in turn encrypted using a master key that is stored in a keyring. See Persisting Sensitive System Variables.

\subsection*{8.4.4.2 Keyring Component Installation}

Keyring service consumers require that a keyring component or plugin be installed:
- To use a keyring component, begin with the instructions here.
- To use a keyring plugin instead, begin with Section 8.4.4.3, "Keyring Plugin Installation".
- If you intend to use keyring functions in conjunction with the chosen keyring component or plugin, install the functions after installing that component or plugin, using the instructions in Section 8.4.4.12, "General-Purpose Keyring Key-Management Functions".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1407.jpg?height=109&width=99&top_left_y=1436&top_left_x=370)

> Note
> Only one keyring component or plugin should be enabled at a time. Enabling multiple keyring components or plugins is unsupported and results may not be as anticipated.

MySQL provides these keyring component choices:
- component_keyring_file: Stores keyring data in a file local to the server host. Available in MySQL Community Edition and MySQL Enterprise Edition distributions.
- component_keyring_encrypted_file: Stores keyring data in an encrypted, passwordprotected file local to the server host. Available in MySQL Enterprise Edition distributions.
- component_keyring_oci: Stores keyring data in the Oracle Cloud Infrastructure Vault. Available in MySQL Enterprise Edition distributions.

To be usable by the server, the component library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

A keyring component or plugin must be loaded early during the server startup sequence so that other components can access it as necessary during their own initialization. For example, the InnoDB storage engine uses the keyring for tablespace encryption, so a keyring component or plugin must be loaded and available prior to InnoDB initialization.

\section*{Note}

A keyring component must be enabled on the MySQL server instance if you need to support secure storage for persisted system variable values. The keyring plugin does not support the function. See Persisting Sensitive System Variables.

Unlike keyring plugins, keyring components are not loaded using the --early-plugin-load server option or configured using system variables. Instead, the server determines which keyring component to load during startup using a manifest, and the loaded component consults its own configuration file when it initializes. Therefore, to install a keyring component, you must:
1. Write a manifest that tells the server which keyring component to load.
2. Write a configuration file for that keyring component.

The first step in installing a keyring component is writing a manifest that indicates which component to load. During startup, the server reads either a global manifest file, or a global manifest file paired with a local manifest file:
- The server attempts to read its global manifest file from the directory where the server is installed.
- If the global manifest file indicates use of a local manifest file, the server attempts to read its local manifest file from the data directory.
- Although global and local manifest files are located in different directories, the file name is mysqld.my in both locations.
- It is not an error for a manifest file not to exist. In this case, the server attempts no component loading associated with the file.

Local manifest files permit setting up component loading for multiple instances of the server, such that loading instructions for each server instance are specific to a given data directory instance. This enables different MySQL instances to use different keyring components.

Server manifest files have these properties:
- A manifest file must be in valid JSON format.
- A manifest file permits these items:
- "read_local_manifest": This item is permitted only in the global manifest file. If the item is not present, the server uses only the global manifest file. If the item is present, its value is true or false, indicating whether the server should read component-loading information from the local manifest file.

If the "read_local_manifest" item is present in the global manifest file along with other items, the server checks the "read_local_manifest" item value first:
- If the value is false, the server processes the other items in the global manifest file and ignores the local manifest file.
- If the value is true, the server ignores the other items in the global manifest file and attempts to read the local manifest file.
- "components": This item indicates which component to load. The item value is a string that specifies a valid component URN, such as "file://component_keyring_file". A component URN begins with file:// and indicates the base name of the library file located in the MySQL plugin directory that implements the component.
- Server access to a manifest file should be read only. For example, a mysqld. my server manifest file may be owned by root and be read/write to root, but should be read only to the account used to run the MySQL server. If the manifest file is found during startup to be read/write to that account, the server writes a warning to the error log suggesting that the file be made read only.
- The database administrator has the responsibility for creating any manifest files to be used, and for ensuring that their access mode and contents are correct. If an error occurs, server startup fails and the administrator must correct any issues indicated by diagnostics in the server error log.

Given the preceding manifest file properties, to configure the server to load component_keyring_file, create a global manifest file named mysqld.my in the mysqld installation directory, and optionally create a local manifest file, also named mysqld.my, in the data directory. The following instructions describe how to load component_keyring_file. To load a different keyring component, substitute its name for component_keyring_file.
- To use a global manifest file only, the file contents look like this:
```
{
    "components": "file://component_keyring_file"
}
```


Create this file in the directory where mysqld is installed.
- Alternatively, to use a global and local manifest file pair, the global file looks like this:
```
{
    "read_local_manifest": true
}
```


Create this file in the directory where mysqld is installed.
The local file looks like this:
```
{
    "components": "file://component_keyring_file"
}
```


Create this file in the data directory.
With the manifest in place, proceed to configuring the keyring component. To do this, check the notes for your chosen keyring component for configuration instructions specific to that component:
- component_keyring_file: Section 8.4.4.4, "Using the component_keyring_file File-Based Keyring Component".
- component_keyring_encrypted_file: Section 8.4.4.5, "Using the component_keyring_encrypted_file Encrypted File-Based Keyring Component".
- component_keyring_oci: Section 8.4.4.9, "Using the Oracle Cloud Infrastructure Vault Keyring Component".

After performing any component-specific configuration, start the server. Verify component installation by examining the Performance Schema keyring_component_status table:
```
mysql> SELECT * FROM performance_schema.keyring_component_status;
+-----------------------+---------------------------------------------------
| STATUS_KEY | STATUS_VALUE |
+-----------------------+---------------------------------------------------
| Component_name | component_keyring_file
| Author | Oracle Corporation
| License | GPL
| Implementation_name | component_keyring_file
| Version |1.0
| Component_status | Active
| Data_file | /usr/local/mysql/keyring/component_keyring_file
| Read_only | No |
```


A Component_status value of Active indicates that the component initialized successfully.
If the component cannot be loaded, server startup fails. Check the server error log for diagnostic messages. If the component loads but fails to initialize due to configuration problems, the server starts but the Component_status value is Disabled. Check the server error log, correct the configuration issues, and use the ALTER INSTANCE RELOAD KEYRING statement to reload the configuration.

Keyring components should be loaded only by using a manifest file, not by using the INSTALL COMPONENT statement. Keyring components loaded using that statement may be available too late in the server startup sequence for certain components that use the keyring, such as InnoDB, because they are registered in the mysql.component system table and loaded automatically for subsequent server restarts. But mysql. component is an InnoDB table, so any components named in it can be loaded during startup only after InnoDB initialization.

If no keyring component or plugin is available when a component tries to access the keyring service, the service cannot be used by that component. As a result, the component may fail to initialize or may initialize with limited functionality. For example, if InnoDB finds that there are encrypted tablespaces when it initializes, it attempts to access the keyring. If the keyring is unavailable, InnoDB can access only unencrypted tablespaces.

\subsection*{8.4.4.3 Keyring Plugin Installation}

Keyring service consumers require that a keyring component or plugin be installed:
- To use a keyring plugin, begin with the instructions here. (Also, for general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".)
- To use a keyring component instead, begin with Section 8.4.4.2, "Keyring Component Installation".
- If you intend to use keyring functions in conjunction with the chosen keyring component or plugin, install the functions after installing that component or plugin, using the instructions in Section 8.4.4.12, "General-Purpose Keyring Key-Management Functions".

\section*{Note}

Only one keyring component or plugin should be enabled at a time. Enabling multiple keyring components or plugins is unsupported and results may not be as anticipated.

A keyring component must be enabled on the MySQL Server instance if you need to support secure storage for persisted system variable values, rather than a keyring plugin, which do not support the function. See Persisting Sensitive System Variables.

MySQL provides these keyring plugin choices:
- keyring_okv: A KMIP 1.1 plugin for use with KMIP-compatible back end keyring storage products such as Oracle Key Vault and Gemalto SafeNet KeySecure Appliance. Available in MySQL Enterprise Edition distributions.
- keyring_aws: Communicates with the Amazon Web Services Key Management Service as a back end for key generation and uses a local file for key storage. Available in MySQL Enterprise Edition distributions.
- keyring_hashicorp: Communicates with HashiCorp Vault for back end storage. Available in MySQL Enterprise Edition distributions.

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

A keyring component or plugin must be loaded early during the server startup sequence so that other components can access it as necessary during their own initialization. For example, the InnoDB storage engine uses the keyring for tablespace encryption, so a keyring component or plugin must be loaded and available prior to InnoDB initialization.

Installation for each keyring plugin is similar. The following instructions describe how to install keyring_okv. To use a different keyring plugin, substitute its name for keyring_okv.

The keyring_okv plugin library file base name is keyring_okv. The file name suffix differs per platform (for example, . so for Unix and Unix-like systems, . dll for Windows).

To load the plugin, use the --early-plugin-load option to name the plugin library file that contains it. For example, on platforms where the plugin library file suffix is . so, use these lines in the server my.cnf file, adjusting the .so suffix for your platform as necessary:
```
[mysqld]
early-plugin-load=keyring_okv.so
```


Before starting the server, check the notes for your chosen keyring plugin for configuration instructions specific to that plugin:
- keyring_okv: Section 8.4.4.6, "Using the keyring_okv KMIP Plugin".
- keyring_aws: Section 8.4.4.7, "Using the keyring_aws Amazon Web Services Keyring Plugin"
- keyring_hashicorp: Section 8.4.4.8, "Using the HashiCorp Vault Keyring Plugin"

After performing any plugin-specific configuration, start the server. Verify plugin installation by examining the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
        FROM INFORMATION_SCHEMA.PLUGINS
        WHERE PLUGIN_NAME LIKE 'keyring%';
+---------------+---------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+---------------+---------------+
| keyring_okv | ACTIVE |
+---------------+---------------+
```


If the plugin fails to initialize, check the server error log for diagnostic messages.
Plugins can be loaded by methods other than --early-plugin-load, such as the --plugin-load or --plugin-load-add option or the INSTALL PLUGIN statement. However, keyring plugins loaded using those methods may be available too late in the server startup sequence for certain components that use the keyring, such as InnoDB:
- Plugin loading using --plugin-load or --plugin-load-add occurs after InnoDB initialization.
- Plugins installed using INSTALL PLUGIN are registered in the mysql.plugin system table and loaded automatically for subsequent server restarts. However, because mysql.plugin is an InnoDB table, any plugins named in it can be loaded during startup only after InnoDB initialization.

If no keyring component or plugin is available when a component tries to access the keyring service, the service cannot be used by that component. As a result, the component may fail to initialize or may initialize with limited functionality. For example, if InnoDB finds that there are encrypted tablespaces when it initializes, it attempts to access the keyring. If the keyring is unavailable, InnoDB can access only unencrypted tablespaces. To ensure that InnoDB can access encrypted tablespaces as well, use --early-plugin-load to load the keyring plugin.

\subsection*{8.4.4.4 Using the component_keyring_file File-Based Keyring Component}

The component_keyring_file keyring component stores keyring data in a file local to the server host.

\footnotetext{
Warning
For encryption key management, the component_keyring_file and component_keyring_encrypted_file components are not intended as a regulatory compliance solution. Security standards such as PCI, FIPS, and others require use of key management systems to secure, manage, and protect encryption keys in key vaults or hardware security modules (HSMs).
}

To use component_keyring_file for keystore management in the most common scenario, create two files: a manifest file that tells the server to load component_keyring_file, and a configuration file that specifies where to store the keys. Both files should be readable only by the appropriate user that runs the server, typically mysql.

The manifest file must be named mysqld. my and added to the same directory where mysqld is installed. The file looks like this:
```
{
    "components": "file://component_keyring_file"
}
```


The configuration file must be named component_keyring_file.cnf and added to the plugin directory. It contains the path to the file where the server stores keys:
```
{
    "path": "/usr/local/mysql/keyring/component_keyring_file.keys",
    "read_only": false
}
```


After adding the two files, restart mysqld. Verify component installation by examining the Performance Schema keyring_component_status table:
mysql> SELECT * FROM performance_schema.keyring_component_status;
A Component_status value of Active indicates that the component initialized successfully.
If the server startup fails or the Component_status value is Disabled, check the server error log.
For more details and to review other scenarios, see Section 8.4.4.2, "Keyring Component Installation" and Configuration Notes.
- Configuration Notes
- Keyring Component Usage

\section*{Configuration Notes}

When it initializes, component_keyring_file reads either a global configuration file, or a global configuration file paired with a local configuration file:
- The component attempts to read its global configuration file from the directory where the component library file is installed (that is, the server plugin directory).
- If the global configuration file indicates use of a local configuration file, the component attempts to read its local configuration file from the data directory.
- Although global and local configuration files are located in different directories, the file name is component_keyring_file.cnf in both locations.
- It is an error for no configuration file to exist. component_keyring_file cannot initialize without a valid configuration.

Local configuration files permit setting up multiple server instances to use component_keyring_file, such that component configuration for each server instance is specific to a given data directory instance. This enables the same keyring component to be used with a distinct data file for each instance.
component_keyring_file configuration files have these properties:
- A configuration file must be in valid JSON format.
- A configuration file must have the appropriate file permission that allows MySQL to read it. Since the file contains sensitive information, it should be set to world readable.
- A configuration file permits these configuration items:
- "read_local_config": This item is permitted only in the global configuration file. If the item is not present, the component uses only the global configuration file. If the item is present, its value is true or false, indicating whether the component should read configuration information from the local configuration file.

If the "read_local_config" item is present in the global configuration file along with other items, the component checks the "read_local_config" item value first:
- If the value is false, the component processes the other items in the global configuration file and ignores the local configuration file.
- If the value is true, the component ignores the other items in the global configuration file and attempts to read the local configuration file.
- "path": The item value is a string that names the file to use for storing keyring data. The file should be named using an absolute path, not a relative path. This item is mandatory in the configuration. If not specified, component_keyring_file initialization fails.
- "read_only": The item value indicates whether the keyring data file is read only. The item value is true (read only) or false (read/write). This item is mandatory in the configuration. If not specified, component_keyring_file initialization fails.
- The database administrator has the responsibility for creating any configuration files to be used, and for ensuring that their contents are correct. If an error occurs, server startup fails and the administrator must correct any issues indicated by diagnostics in the server error log.

Given the preceding configuration file properties, to configure component_keyring_file, create a global configuration file named component_keyring_file.cnf in the directory where the component_keyring_file library file is installed, and optionally create a local configuration file, also named component_keyring_file.cnf, in the data directory. The following instructions assume that a keyring data file named /usr/local/mysql/keyring/component_keyring_file.keys is to be used in read/write fashion.

> Note
> For Windows systems, the path to the /usr/local/mysql/keyring/ component_keyring_file.keys file can be in C: \ProgramData. It should not be in C: \Program Files.
- To use a global configuration file only, the file contents look like this:
```
{
    "path": "/usr/local/mysql/keyring/component_keyring_file.keys",
    "read_only": false
}
```


Create this file in the directory where the component_keyring_file library file is installed.
This path must not point to or include the MySQL data directory. The path must be readable and writable by the system MySQL user (Windows: NETWORK SERVICES; Linux: mysql user; MacOS: _mysql user). It should not be accessible to other users.
- Alternatively, to use a global and local configuration file pair, the global file looks like this:
```
{
    "read_local_config": true
}
```


Create this file in the directory where the component_keyring_file library file is installed.
The local file looks like this:
```
{
    "path": "/usr/local/mysql/keyring/component_keyring_file.keys",
    "read_only": false
}
```


This path must not point to or include the MySQL data directory. The path must be readable and writable by the system MySQL user (Windows: NETWORK SERVICES; Linux: mysql user; MacOS: _mysql user). It should not be accessible to other users.

\section*{Keyring Component Usage}

Keyring operations are transactional: component_keyring_file uses a backup file during write operations to ensure that it can roll back to the original file if an operation fails. The backup file has the same name as the data file with a suffix of .backup.
component_keyring_file supports the functions that comprise the standard MySQL Keyring service interface. Keyring operations performed by those functions are accessible in SQL statements as described in Section 8.4.4.12, "General-Purpose Keyring Key-Management Functions".

Example:
```
SELECT keyring_key_generate('MyKey', 'AES', 32);
SELECT keyring_key_remove('MyKey');
```


For information about the characteristics of key values permitted by component_keyring_file, see Section 8.4.4.10, "Supported Keyring Key Types and Lengths".

\subsection*{8.4.4.5 Using the component_keyring_encrypted_file Encrypted File-Based Keyring Component}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1414.jpg?height=120&width=99&top_left_y=1427&top_left_x=306)

\section*{Note}
component_keyring_encrypted_file is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, see https://www.mysql.com/products/.

The component_keyring_encrypted_file keyring component stores keyring data in an encrypted, password-protected file local to the server host.

\section*{Warning}

For encryption key management, the component_keyring_file and component_keyring_encrypted_file components are not intended as a regulatory compliance solution. Security standards such as PCI, FIPS, and others require use of key management systems to secure, manage, and protect encryption keys in key vaults or hardware security modules (HSMs).

To use component_keyring_encrypted_file for keystore management in the most common scenario, create two files: a manifest file that tells the server to load component_keyring_encrypted_file, and a configuration file that specifies where to store the keys. Both files should be readable only by the appropriate user that runs the server, typically mysql.

The manifest file must be named mysqld . my and added to the same directory where mysqld is installed. The file looks like this:
```
{
    "components": "file://component_keyring_encrypted_file"
}
```


The configuration file must be named component_keyring_encrypted_file.cnf and added to the plugin directory. It contains the path to the file where the server stores keys:
```
{
    "path": "/usr/local/mysql/keyring/component_keyring_encrypted_file.keys",
    "password": "password",
    "read_only": false
}
```


After adding the two files, restart mysqld. Verify component installation by examining the Performance Schema keyring_component_status table:
```
mysql> SELECT * FROM performance_schema.keyring_component_status;
```


A Component_status value of Active indicates that the component initialized successfully.
If the server startup fails or the Component_status value is Disabled, check the server error log.
For more details and to review other scenarios, see Section 8.4.4.2, "Keyring Component Installation" and Configuration Notes.
- Configuration Notes
- Encrypted Keyring Component Usage

\section*{Configuration Notes}

When it initializes, component_keyring_encrypted_file reads either a global configuration file, or a global configuration file paired with a local configuration file:
- The component attempts to read its global configuration file from the directory where the component library file is installed (that is, the server plugin directory).
- If the global configuration file indicates use of a local configuration file, the component attempts to read its local configuration file from the data directory.
- Although global and local configuration files are located in different directories, the file name is component_keyring_encrypted_file.cnf in both locations.
- If component_keyring_encrypted_file cannot find the configuration file, an error results, and the component cannot initialize.

Local configuration files permit setting up multiple server instances to use component_keyring_encrypted_file, such that component configuration for each server instance is specific to a given data directory instance. This enables the same keyring component to be used with a distinct data file for each instance.
component_keyring_encrypted_file configuration files have these properties:
- A configuration file must be in valid JSON format.
- A configuration file must have the appropriate file permission that allows MySQL to read it. Since the file contains sensitive information, it should be set to world readable.
- A configuration file permits these configuration items:
- "read_local_config": This item is permitted only in the global configuration file. If the item is not present, the component uses only the global configuration file. If the item is present, its value is true or false, indicating whether the component should read configuration information from the local configuration file.

If the "read_local_config" item is present in the global configuration file along with other items, the component checks the "read_local_config" item value first:
- If the value is false, the component processes the other items in the global configuration file and ignores the local configuration file.
- If the value is true, the component ignores the other items in the global configuration file and attempts to read the local configuration file.
- "path": The item value is a string that names the file to use for storing keyring data. The file should be named using an absolute path, not a relative path. This item is mandatory in the configuration. If not specified, component_keyring_encrypted_file initialization fails.
- "password": The item value is a string that specifies the password for accessing the data file. This item is mandatory in the configuration. If not specified, component_keyring_encrypted_file initialization fails.
- "read_only": The item value indicates whether the keyring data file is read only. The item value is true (read only) or false (read/write). This item is mandatory in the configuration. If not specified, component_keyring_encrypted_file initialization fails.
- The database administrator has the responsibility for creating any configuration files to be used, and for ensuring that their contents are correct. If an error occurs, server startup fails and the administrator must correct any issues indicated by diagnostics in the server error log.
- Any configuration file that stores a password should have a restrictive mode and be accessible only to the account used to run the MySQL server.

Given the preceding configuration file properties, to configure component_keyring_encrypted_file, create a global configuration file named component_keyring_encrypted_file.cnf in the directory where the component_keyring_encrypted_file library file is installed, and optionally create a local configuration file, also named component_keyring_encrypted_file.cnf, in the data directory. The following instructions assume that a keyring data file named /usr/local/mysql/keyring/ component_keyring_encrypted_file.keys is to be used in read/write fashion. You must also choose a password.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1416.jpg?height=125&width=99&top_left_y=1468&top_left_x=306)

> Note
> For Windows systems, the path to the /usr/local/mysql/keyring/ component_keyring_encrypted_file.keys file can be in C: \ProgramData. It should not be in C: \Program Files.
- To use a global configuration file only, the file contents look like this:
```
{
    "path": "/usr/local/mysql/keyring/component_keyring_encrypted_file.keys",
    "password": "password",
    "read_only": false
}
```


Create this file in the directory where the component_keyring_encrypted_file library file is installed.

This path must not point to or include the MySQL data directory. The path must be readable and writable by the system MySQL user (Windows: NETWORK SERVICES; Linux: mysql user; MacOS: _mysql user). It should not be accessible to other users.
- Alternatively, to use a global and local configuration file pair, the global file looks like this:
```
{
    "read_local_config": true
}
```


Create this file in the directory where the component_keyring_encrypted_file library file is installed.

The local file looks like this:
```
{
    "path": "/usr/local/mysql/keyring/component_keyring_encrypted_file.keys",
    "password": "password",
    "read_only": false
}
```


This path must not point to or include the MySQL data directory. The path must be readable and writable by the system MySQL user (Windows: NETWORK SERVICES; Linux: mysql user; MacOS: _mysql user). It should not be accessible to other users.

\section*{Encrypted Keyring Component Usage}

Keyring operations are transactional: component_keyring_encrypted_file uses a backup file during write operations to ensure that it can roll back to the original file if an operation fails. The backup file has the same name as the data file with a suffix of .backup.
component_keyring_encrypted_file supports the functions that comprise the standard MySQL Keyring service interface. Keyring operations performed by those functions are accessible in SQL statements as described in Section 8.4.4.12, "General-Purpose Keyring Key-Management Functions".

Example:
SELECT keyring_key_generate('MyKey', 'AES', 32);
SELECT keyring_key_remove('MyKey');
For information about the characteristics of key values permitted by
component_keyring_encrypted_file, see Section 8.4.4.10, "Supported Keyring Key Types and Lengths".

\subsection*{8.4.4.6 Using the keyring_okv KMIP Plugin}

\section*{Note}

The keyring_okv plugin is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, see https://www.mysql.com/products/.

The Key Management Interoperability Protocol (KMIP) enables communication of cryptographic keys between a key management server and its clients. The keyring_okv keyring plugin uses the KMIP 1.1 protocol to communicate securely as a client of a KMIP back end. Keyring material is generated exclusively by the back end, not by keyring_okv. The plugin works with these KMIP-compatible products:
- Oracle Key Vault
- Gemalto SafeNet KeySecure Appliance
- Townsend Alliance Key Manager
- Entrust KeyControl

Each MySQL Server instance must be registered separately as a client for KMIP. If two or more MySQL Server instances use the same set of credentials, they can interfere with each other's functioning.

The keyring_okv plugin supports the functions that comprise the standard MySQL Keyring service interface. Keyring operations performed by those functions are accessible at two levels:
- SQL interface: In SQL statements, call the functions described in Section 8.4.4.12, "General-Purpose Keyring Key-Management Functions".
- C interface: In C -language code, call the keyring service functions described in Section 7.6.9.2, "The Keyring Service".

Example (using the SQL interface):
```
SELECT keyring_key_generate('MyKey', 'AES', 32);
SELECT keyring_key_remove('MyKey');
```


For information about the characteristics of key values permitted by keyring_okv, Section 8.4.4.10, "Supported Keyring Key Types and Lengths".

To install keyring_okv, use the general instructions found in Section 8.4.4.3, "Keyring Plugin Installation", together with the configuration information specific to keyring_okv found here.
- General keyring_okv Configuration
- Configuring keyring_okv for Oracle Key Vault
- Configuring keyring_okv for Gemalto SafeNet KeySecure Appliance
- Configuring keyring_okv for Townsend Alliance Key Manager
- Configuring keyring_okv for Entrust KeyControl
- Password-Protecting the keyring_okv Key File

\section*{General keyring_okv Configuration}

Regardless of which KMIP back end the keyring_okv plugin uses for keyring storage, the keyring_okv_conf_dir system variable configures the location of the directory used by keyring_okv for its support files. The default value is empty, so you must set the variable to name a properly configured directory before the plugin can communicate with the KMIP back end. Unless you do so, keyring_okv writes a message to the error log during server startup that it cannot communicate:
[Warning] Plugin keyring_okv reported: 'For keyring_okv to be initialized, please point the keyring_okv_conf_dir variable to a directory containing Oracle Key Vault configuration file and ssl materials'

The keyring_okv_conf_dir variable must name a directory that contains the following items:
- okvclient.ora: A file that contains details of the KMIP back end with which keyring_okv communicates.
- ssl: A directory that contains the certificate and key files required to establish a secure connection with the KMIP back end: CA. pem, cert. pem, and key. pem. If the key file is password-protected, the ssl directory can contain a single-line text file named password.txt containing the password needed to decrypt the key file.

Both the okvclient. ora file and ssl directory with the certificate and key files are required for keyring_okv to work properly. The procedure used to populate the configuration directory with these files depends on the KMIP back end used with keyring_okv, as described elsewhere.

The configuration directory used by keyring_okv as the location for its support files should have a restrictive mode and be accessible only to the account used to run the MySQL server. For example, on Unix and Unix-like systems, to use the /usr/local/mysql/mysql-keyring-okv directory, the following commands (executed as root) create the directory and set its mode and ownership:
```
cd /usr/local/mysql
mkdir mysql-keyring-okv
chmod 750 mysql-keyring-okv
chown mysql mysql-keyring-okv
chgrp mysql mysql-keyring-okv
```


To be usable during the server startup process, keyring_okv must be loaded using the - -early-plugin-load option. Also, set the keyring_okv_conf_dir system variable to tell keyring_okv where to find its configuration directory. For example, use these lines in the server my. cnf file, adjusting the . so suffix and directory location for your platform as necessary:
[mysqld]
early-plugin-load=keyring_okv.so
keyring_okv_conf_dir=/usr/local/mysql/mysql-keyring-okv
For additional information about keyring_okv_conf_dir, see Section 8.4.4.16, "Keyring System Variables".

\section*{Configuring keyring_okv for Oracle Key Vault}

The discussion here assumes that you are familiar with Oracle Key Vault. Some pertinent information sources:
- Oracle Key Vault site
- Oracle Key Vault documentation

In Oracle Key Vault terminology, clients that use Oracle Key Vault to store and retrieve security objects are called endpoints. To communicate with Oracle Key Vault, it is necessary to register as an endpoint and enroll by downloading and installing endpoint support files. Note that you must register a separate endpoint for each MySQL Server instance. If two or more MySQL Server instances use the same endpoint, they can interfere with each other's functioning.

The following procedure briefly summarizes the process of setting up keyring_okv for use with Oracle Key Vault:
1. Create the configuration directory for the keyring_okv plugin to use.
2. Register an endpoint with Oracle Key Vault to obtain an enrollment token.
3. Use the enrollment token to obtain the okvclient.jar client software download.
4. Install the client software to populate the keyring_okv configuration directory that contains the Oracle Key Vault support files.

To get more information about these steps, see Enrolling and Upgrading Endpoints for Oracle Key Vault. The information references Oracle Database, but you can follow the same steps for MySQL.

Use the following procedure to configure keyring_okv and Oracle Key Vault to work together. This description only summarizes how to interact with Oracle Key Vault. For details, visit the Oracle Key Vault site and consult the Oracle Key Vault Administrator's Guide .
1. Create the configuration directory that contains the Oracle Key Vault support files, and make sure that the keyring_okv_conf_dir system variable is set to name that directory (for details, see General keyring_okv Configuration).
2. Log in to the Oracle Key Vault management console as a user who has the System Administrator role.
3. Select the Endpoints tab to arrive at the Endpoints page. On the Endpoints page, click Add.
4. Provide the required endpoint information and click Register. The endpoint type should be Other. Successful registration results in an enrollment token.
5. Log out from the Oracle Key Vault server.
6. Connect again to the Oracle Key Vault server, this time without logging in. Use the endpoint enrollment token to enroll and request the okvclient.jar software download. Save this file to your system.
7. Install the okvclient. jar file using the following command (you must have JDK 1.4 or higher):
```
java -jar okvclient.jar -d dir_name [-v]
```


The directory name following the - $d$ option is the location in which to install extracted files. The -v option, if given, causes log information to be produced that may be useful if the command fails.

When the command asks for an Oracle Key Vault endpoint password, do not provide one. Instead, press Enter. (The result is that no password is required when the endpoint connects to Oracle Key Vault.)

The preceding command produces an okvclient. ora file, which should be in this location under the directory named by the - d option in the preceding java -jar command:
install_dir/conf/okvclient.ora
The expected file contents include lines that look like this:
SERVER=host_ip:port_num
STANDBY_SERVER=host_ip:port_num
The SERVER variable is mandatory, and the STANDBY_SERVER variable is optional. The keyring_okv plugin attempts to communicate with the server running on the host named by the SERVER variable and falls back to STANDBY_SERVER if that fails.

\section*{Note}

If the existing file is not in this format, then create a new file with the lines shown in the previous example. Also, consider backing up the okvclient. ora file before you run the okvutil command. Restore the file as needed.

You can specify more than one standby server (up to a maximum of 64). If you do, the keyring_okv plugin iterates over them until it can establish a connection, and fails if it cannot. To add extra standby servers, edit the okvclient. ora file to specify the IP addresses and port numbers of the servers as a comma-separated list in the value of the STANDBY_SERVER variable. For example:

STANDBY_SERVER=host_ip:port_num,host_ip:port_num,host_ip:port_num,host_ip:port_num
Ensure that the list of standby servers is kept short, accurate, and up to date, and servers that are no longer valid are removed. There is a 20-second wait for each connection attempt, so the presence of a long list of invalid servers can significantly affect the keyring_okv plugin's connection time and therefore the server startup time.
8. Go to the Oracle Key Vault installer directory and test the setup by running this command:
okvutil/bin/okvutil list
The output should look something like this:
```
Unique ID Type Identifier
255AB8DE-C97F-482C-E053-0100007F28B9 Symmetric Key -
264BF6E0-A20E-7C42-E053-0100007FB29C Symmetric Key -
```


For a fresh Oracle Key Vault server (a server without any key in it), the output looks like this instead, to indicate that there are no keys in the vault:
no objects found
9. Use this command to extract the ssl directory containing SSL materials from the okvclient.jar file:
jar xf okvclient.jar ssl
10. Copy the Oracle Key Vault support files (the okvclient. ora file and the ssl directory) into the configuration directory.
11. (Optional) If you wish to password-protect the key file, use the instructions in Password-Protecting the keyring_okv Key File.

After completing the preceding procedure, restart the MySQL server. It loads the keyring_okv plugin and keyring_okv uses the files in its configuration directory to communicate with Oracle Key Vault.

\section*{Configuring keyring_okv for Gemalto SafeNet KeySecure Appliance}

Gemalto SafeNet KeySecure Appliance uses the KMIP protocol (version 1.1 or 1.2). The keyring_okv keyring plugin (which supports KMIP 1.1) can use KeySecure as its KMIP back end for keyring storage.

Use the following procedure to configure keyring_okv and KeySecure to work together. The description only summarizes how to interact with KeySecure. For details, consult the section named Add a KMIP Server in the KeySecure User Guide.
1. Create the configuration directory that contains the KeySecure support files, and make sure that the keyring_okv_conf_dir system variable is set to name that directory (for details, see General keyring_okv Configuration).
2. In the configuration directory, create a subdirectory named ssl to use for storing the required SSL certificate and key files.
3. In the configuration directory, create a file named okvclient. ora. It should have following format:
```
SERVER=host_ip:port_num
STANDBY_SERVER=host_ip:port_num
```


For example, if KeySecure is running on host 198.51.100.20 and listening on port 9002, and also running on alternative host 203.0.113.125 and listening on port 8041, the okvclient. ora file looks like this:
```
SERVER=198.51.100.20:9002
STANDBY_SERVER=203.0.113.125:8041
```


You can specify more than one standby server (up to a maximum of 64). If you do, the keyring_okv plugin iterates over them until it can establish a connection, and fails if it cannot. To add extra standby servers, edit the okvclient. ora file to specify the IP addresses and port numbers of the servers as a comma-separated list in the value of the STANDBY_SERVER variable. For example:
```
STANDBY_SERVER=host_ip:port_num,host_ip:port_num,host_ip:port_num,host_ip:port_num
```


Ensure that the list of standby servers is kept short, accurate, and up to date, and servers that are no longer valid are removed. There is a 20-second wait for each connection attempt, so the presence of a long list of invalid servers can significantly affect the keyring_okv plugin's connection time and therefore the server startup time.
4. Connect to the KeySecure Management Console as an administrator with credentials for Certificate Authorities access.
5. Navigate to Security $\gg$ Local CAs and create a local certificate authority (CA).
6. Go to Trusted CA Lists. Select Default and click on Properties. Then select Edit for Trusted Certificate Authority List and add the CA just created.
7. Download the CA and save it in the ssl directory as a file named CA. pem.
8. Navigate to Security $\gg$ Certificate Requests and create a certificate. Then you can download a compressed tar file containing certificate PEM files.
9. Extract the PEM files from in the downloaded file. For example, if the file name is csr_w_pk_pkcs8.gz, decompress and unpack it using this command:
tar zxvf csr_w_pk_pkcs8.gz
Two files result from the extraction operation: certificate_request.pem and private_key_pkcs8.pem.
10. Use this openssl command to decrypt the private key and create a file named key. pem:
openssl pkcs8 -in private_key_pkcs8.pem -out key.pem
11. Copy the key. pem file into the ssl directory.
12. Copy the certificate request in certificate_request.pem into the clipboard.
13. Navigate to Security >> Local CAs. Select the same CA that you created earlier (the one you downloaded to create the CA. pem file), and click Sign Request. Paste the Certificate Request from the clipboard, choose a certificate purpose of Client (the keyring is a client of KeySecure), and click Sign Request. The result is a certificate signed with the selected CA in a new page.
14. Copy the signed certificate to the clipboard, then save the clipboard contents as a file named cert.pem in the ssl directory.
15. (Optional) If you wish to password-protect the key file, use the instructions in Password-Protecting the keyring_okv Key File.

After completing the preceding procedure, restart the MySQL server. It loads the keyring_okv plugin and keyring_okv uses the files in its configuration directory to communicate with KeySecure.

\section*{Configuring keyring_okv for Townsend Alliance Key Manager}

Townsend Alliance Key Manager uses the KMIP protocol. The keyring_okv keyring plugin can use Alliance Key Manager as its KMIP back end for keyring storage. For additional information, see Alliance Key Manager for MySQL.

\section*{Configuring keyring_okv for Entrust KeyControl}

Entrust KeyControl uses the KMIP protocol. The keyring_okv keyring plugin can use Entrust KeyControl as its KMIP back end for keyring storage. For additional information, see the Oracle MySQL and Entrust KeyControl with nShield HSM Integration Guide.

\section*{Password-Protecting the keyring_okv Key File}

You can optionally protect the key file with a password and supply a file containing the password to enable the key file to be decrypted. To so do, change location to the ssl directory and perform these steps:
1. Encrypt the key. pem key file. For example, use a command like this, and enter the encryption password at the prompts:
```
$> openssl rsa -des3 -in key.pem -out key.pem.new
Enter PEM pass phrase:
Verifying - Enter PEM pass phrase:
```

2. Save the encryption password in a single-line text file named password.txt in the ssl directory.
3. Verify that the encrypted key file can be decrypted using the following command. The decrypted file should display on the console:
```
$> openssl rsa -in key.pem.new -passin file:password.txt
```

4. Remove the original key. pem file and rename key. pem. new to key. pem.
5. Change the ownership and access mode of new key.pem file and password.txt file as necessary to ensure that they have the same restrictions as other files in the ssl directory.

\subsection*{8.4.4.7 Using the keyring_aws Amazon Web Services Keyring Plugin}

\section*{Note}

The keyring_aws plugin is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, see https://www.mysql.com/products/.

The keyring_aws keyring plugin communicates with the Amazon Web Services Key Management Service (AWS KMS) as a back end for key generation and uses a local file for key storage. All keyring material is generated exclusively by the AWS server, not by keyring_aws.

MySQL Enterprise Edition can work with keyring_aws on Red Hat Enterprise Linux, SUSE Linux Enterprise Server, Debian, Ubuntu, macOS, and Windows. MySQL Enterprise Edition does not support the use of keyring_aws on these platforms:
- EL6
- Generic Linux (glibc2.12)
- SLES 12 (with versions after MySQL Server 5.7)
- Solaris

The discussion here assumes that you are familiar with AWS in general and KMS in particular. Some pertinent information sources:
- AWS site
- KMS documentation

The following sections provide configuration and usage information for the keyring_aws keyring plugin:
- keyring_aws Configuration
- keyring_aws Operation
- keyring_aws Credential Changes

\section*{keyring_aws Configuration}

To install keyring_aws, use the general instructions found in Section 8.4.4.3, "Keyring Plugin Installation", together with the plugin-specific configuration information found here.

The plugin library file contains the keyring_aws plugin and two loadable functions, keyring_aws_rotate_cmk() and keyring_aws_rotate_keys().

To configure keyring_aws, you must obtain a secret access key that provides credentials for communicating with AWS KMS and write it to a configuration file:
1. Create an AWS KMS account.
2. Use AWS KMS to create a secret access key ID and secret access key. The access key serves to verify your identity and that of your applications.
3. Use the AWS KMS account to create a KMS key ID. At MySQL startup, set the keyring_aws_cmk_id system variable to the CMK ID value. This variable is mandatory and there is no default. (Its value can be changed at runtime if desired using SET GLOBAL.)
4. If necessary, create the directory in which the configuration file should be located. The directory should have a restrictive mode and be accessible only to the account used to run the MySQL server. For example, on many Unix and Unix-like systems, such as Oracle Enterprise Linux,
to use /usr/local/mysql/mysql-keyring/keyring_aws_conf as the file name, the following commands (executed as root) create its parent directory and set the directory mode and ownership:
```
$> cd /usr/local/mysql
$> mkdir mysql-keyring
$> chmod 750 mysql-keyring
$> chown mysql mysql-keyring
$> chgrp mysql mysql-keyring
```


At MySQL startup, set the keyring_aws_conf_file system variable to /usr/local/mysql/ mysql-keyring/keyring_aws_conf to indicate the configuration file location to the server.

The location of the configuration file may vary according to Linux distribution; the directory for this file may also already be provided by a system module or other application such as AppArmor. For example, under AppArmor on recent editions of Ubuntu Linux, the keyring directory is specified as /var/lib/mysql-keyring. See Ubuntu Server: AppArmor for more information about using AppArmor on Ubuntu systems; see also this example MySQL configuration file. For other operating platforms, see the system documentation for guidance.
5. Prepare the keyring_aws configuration file, which should contain two lines:
- Line 1: The secret access key ID
- Line 2: The secret access key

For example, if the key ID is wwwwwwwwwwwwwEXAMPLE and the key is $x x x x x x x x x x x x x /$ yyyyyyy/zzzzzzzzEXAMPLEKEY, the configuration file looks like this:
```
WWWWWWWWWWWWWEXAMPLE
xxxxxxxxxxxxx/yyyyyyy/zzzzzzzzEXAMPLEKEY
```


To be usable during the server startup process, keyring_aws must be loaded using the - -early-plugin-load option. The keyring_aws_cmk_id system variable is mandatory and configures the KMS key ID obtained from the AWS KMS server. The keyring_aws_conf_file and keyring_aws_data_file system variables optionally configure the locations of the files used by the keyring_aws plugin for configuration information and data storage. The file location variable default values are platform specific. To configure the locations explicitly, set the variable values at startup. For example, use these lines in the server my.cnf file, adjusting the. so suffix and file locations for your platform as necessary:
```
[mysqld]
early-plugin-load=keyring_aws.so
keyring_aws_cmk_id='arn:aws:kms:us-west-2:111122223333:key/abcd1234-ef56-ab12-cd34-ef56abcd1234'
keyring_aws_conf_file=/usr/local/mysql/mysql-keyring/keyring_aws_conf
keyring_aws_data_file=/usr/local/mysql/mysql-keyring/keyring_aws_data
```


For the keyring_aws plugin to start successfully, the configuration file must exist and contain valid secret access key information, initialized as described previously. The storage file need not exist. If it does not, keyring_aws attempts to create it (as well as its parent directory, if necessary).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1424.jpg?height=120&width=106&top_left_y=2158&top_left_x=301)

\section*{Important}

The default AWS region is us-east-1. For any other region, you must also set keyring_aws_region explicitly in my.cnf.

For additional information about the system variables used to configure the keyring_aws plugin, see Section 8.4.4.16, "Keyring System Variables".

Start the MySQL server and install the functions associated with the keyring_aws plugin. This is a one-time operation, performed by executing the following statements, adjusting the . so suffix for your platform as necessary:

CREATE FUNCTION keyring_aws_rotate_cmk RETURNS INTEGER
```
    SONAME 'keyring_aws.so';
CREATE FUNCTION keyring_aws_rotate_keys RETURNS INTEGER
    SONAME 'keyring_aws.so';
```


For additional information about the keyring_aws functions, see Section 8.4.4.13, "Plugin-Specific Keyring Key-Management Functions".

\section*{keyring_aws Operation}

At plugin startup, the keyring_aws plugin reads the AWS secret access key ID and key from its configuration file. It also reads any encrypted keys contained in its storage file into its in-memory cache.

During operation, keyring_aws maintains encrypted keys in the in-memory cache and uses the storage file as local persistent storage. Each keyring operation is transactional: keyring_aws either successfully changes both the in-memory key cache and the keyring storage file, or the operation fails and the keyring state remains unchanged.

To ensure that keys are flushed only when the correct keyring storage file exists, keyring_aws stores a SHA-256 checksum of the keyring in the file. Before updating the file, the plugin verifies that it contains the expected checksum.

The keyring_aws plugin supports the functions that comprise the standard MySQL Keyring service interface. Keyring operations performed by these functions are accessible at two levels:
- SQL interface: In SQL statements, call the functions described in Section 8.4.4.12, "General-Purpose Keyring Key-Management Functions".
- C interface: In C -language code, call the keyring service functions described in Section 7.6.9.2, "The Keyring Service".

Example (using the SQL interface):
```
SELECT keyring_key_generate('MyKey', 'AES', 32);
SELECT keyring_key_remove('MyKey');
```


In addition, the keyring_aws_rotate_cmk() and keyring_aws_rotate_keys() functions "extend" the keyring plugin interface to provide AWS-related capabilities not covered by the standard keyring service interface. These capabilities are accessible only by calling these functions using SQL. There are no corresponding C-language key service functions.

For information about the characteristics of key values permitted by keyring_aws, see Section 8.4.4.10, "Supported Keyring Key Types and Lengths".

\section*{keyring_aws Credential Changes}

Assuming that the keyring_aws plugin has initialized properly at server startup, it is possible to change the credentials used for communicating with AWS KMS:
1. Use AWS KMS to create a new secret access key ID and secret access key.
2. Store the new credentials in the configuration file (the file named by the keyring_aws_conf_file system variable). The file format is as described previously.
3. Reinitialize the keyring_aws plugin so that it re-reads the configuration file. Assuming that the new credentials are valid, the plugin should initialize successfully.

There are two ways to reinitialize the plugin:
- Restart the server. This is simpler and has no side effects, but is not suitable for installations that require minimal server downtime with as few restarts as possible.
- Reinitialize the plugin without restarting the server by executing the following statements, adjusting the . so suffix for your platform as necessary:

UNINSTALL PLUGIN keyring_aws;
INSTALL PLUGIN keyring_aws SONAME 'keyring_aws.so';

\section*{Note}

In addition to loading a plugin at runtime, INSTALL PLUGIN has the side effect of registering the plugin it in the mysql.plugin system table. Because of this, if you decide to stop using keyring_aws, it is not sufficient to remove the --early-plugin-load option from the set of options used to start the server. That stops the plugin from loading early, but the server still attempts to load it when it gets to the point in the startup sequence where it loads the plugins registered in mysql.plugin.

Consequently, if you execute the UNINSTALL PLUGIN plus INSTALL PLUGIN sequence just described to change the AWS KMS credentials, then to stop using keyring_aws, it is necessary to execute UNINSTALL PLUGIN again to unregister the plugin in addition to removing the --early-plugin-load option.

\subsection*{8.4.4.8 Using the HashiCorp Vault Keyring Plugin}

\section*{Note}

The keyring_hashicorp plugin is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, see https://www.mysql.com/products/.

The keyring_hashicorp keyring plugin communicates with HashiCorp Vault for back end storage. The plugin supports HashiCorp Vault AppRole authentication. No key information is permanently stored in MySQL server local storage. (An optional in-memory key cache may be used as intermediate storage.) Random key generation is performed on the MySQL server side, with the keys subsequently stored to Hashicorp Vault.

The keyring_hashicorp plugin supports the functions that comprise the standard MySQL Keyring service interface. Keyring operations performed by those functions are accessible at two levels:
- SQL interface: In SQL statements, call the functions described in Section 8.4.4.12, "General-Purpose Keyring Key-Management Functions".
- C interface: In C -language code, call the keyring service functions described in Section 7.6.9.2, "The Keyring Service".

Example (using the SQL interface):
```
SELECT keyring_key_generate('MyKey', 'AES', 32);
SELECT keyring_key_remove('MyKey');
```


For information about the characteristics of key values permitted by keyring_hashicorp, see Section 8.4.4.10, "Supported Keyring Key Types and Lengths".

To install keyring_hashicorp, use the general instructions found in Section 8.4.4.3, "Keyring Plugin Installation", together with the configuration information specific to keyring_hashicorp found here. Plugin-specific configuration includes preparation of the certificate and key files needed for connecting to HashiCorp Vault, as well as configuring HashiCorp Vault itself. The following sections provide the necessary instructions.
- Certificate and Key Preparation
- HashiCorp Vault Setup
- keyring_hashicorp Configuration

\section*{Certificate and Key Preparation}

The keyring_hashicorp plugin requires a secure connection to the HashiCorp Vault server, employing the HTTPS protocol. A typical setup includes a set of certificate and key files:
- company.crt: A custom CA certificate belonging to the organization. This file is used both by HashiCorp Vault server and the keyring_hashicorp plugin.
- vault . key: The private key of the HashiCorp Vault server instance. This file is used by HashiCorp Vault server.
- vault.crt: The certificate of the HashiCorp Vault server instance. This file must be signed by the organization CA certificate.

The following instructions describe how to create the certificate and key files using OpenSSL. (If you already have those files, proceed to HashiCorp Vault Setup.) The instructions as shown apply to Linux platforms and may require adjustment for other platforms.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1427.jpg?height=97&width=106&top_left_y=950&top_left_x=365)

\section*{Important}

Certificates generated by these instructions are self-signed, which may not be very secure. After you gain experience using such files, consider obtaining certificate/key material from a registered certificate authority.
1. Prepare the company and HashiCorp Vault server keys.

Use the following commands to generate the key files:
```
openssl genrsa -aes256 -out company.key 4096
openssl genrsa -aes256 -out vault.key 2048
```


The commands produce files holding the company private key (company. key) and the Vault server private key (vault . key). The keys are randomly generated RSA keys of 4,096 and 2,048 bits, respectively.

Each command prompts for a password. For testing purposes, the password is not required. To disable it, omit the -aes256 argument.

The key files hold sensitive information and should be stored in a secure location. The password (also sensitive) is required later, so write it down and store it in a secure location.
(Optional) To check key file content and validity, use the following commands:
```
openssl rsa -in company.key -check
openssl rsa -in vault.key -check
```

2. Create the company CA certificate.

Use the following command to create a company CA certificate file named company.crt that is valid for 365 days (enter the command on a single line):
```
openssl req -x509 -new -nodes -key company.key
    -sha256 -days 365 -out company.crt
```


If you used the - aes256 argument to perform key encryption during key generation, you are prompted for the company key password during CA certificate creation. You are also prompted for information about the certificate holder (that is, you or your company), as shown here:
```
Country Name (2 letter code) [AU]:
State or Province Name (full name) [Some-State]:
Locality Name (eg, city) []:
Organization Name (eg, company) [Internet Widgits Pty Ltd]:
Organizational Unit Name (eg, section) []:
Common Name (e.g. server FQDN or YOUR name) []:
Email Address []:
```


Answer the prompts with appropriate values.
3. Create a certificate signing request.

To create a HashiCorp Vault server certificate, a Certificate Signing Request (CSR) must be prepared for the newly created server key. Create a configuration file named request.conf containing the following lines. If the HashiCorp Vault server does not run on the local host, substitute appropriate CN and IP values, and make any other changes required.
```
[req]
distinguished_name = vault
x509_entensions = v3_req
prompt = no
[vault]
C = US
ST = CA
L = RWC
O = Company
CN = 127.0.0.1
[v3_req]
subjectAltName = @alternatives
authorityKeyIdentifier = keyid,issuer
basicConstraints = CA:TRUE
[alternatives]
IP = 127.0.0.1
```


Use this command to create the signing request:
```
openssl req -new -key vault.key -config request.conf -out request.csr
```


The output file (request.csr) is an intermediate file that serves as input for creation of the server certificate.
4. Create the HashiCorp Vault server certificate.

Sign the combined information from the HashiCorp Vault server key (vault . key) and the CSR (request.csr) with the company certificate (company.crt) to create the HashiCorp Vault server certificate (vault.crt). Use the following command to do this (enter the command on a single line):
```
openssl x509 -req -in request.csr
    -CA company.crt -CAkey company.key -CAcreateserial
    -out vault.crt -days 365 -sha256
```


To make the vault.crt server certificate useful, append the contents of the company.crt company certificate to it. This is required so that the company certificate is delivered along with the server certificate in requests.
```
cat company.crt >> vault.crt
```


If you display the contents of the vault.crt file, it should look like this:
```
-----BEGIN CERTIFICATE-----
... content of HashiCorp Vault server certificate ...
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
... content of company certificate ...
-----END CERTIFICATE-----
```


\section*{HashiCorp Vault Setup}

The following instructions describe how to create a HashiCorp Vault setup that facilitates testing the keyring_hashicorp plugin.

\section*{Important}

A test setup is similar to a production setup, but production use of HashiCorp Vault entails additional security considerations such as use of non-self-signed certificates and storing the company certificate in the system trust store. You must implement whatever additional security steps are needed to satisfy your operational requirements.

These instructions assume availability of the certificate and key files created in Certificate and Key Preparation. See that section if you do not have those files.
1. Fetch the HashiCorp Vault binary.

Download the HashiCorp Vault binary appropriate for your platform from https://www.vaultproject.io/ downloads.html.

Extract the content of the archive to produce the executable vault command, which is used to perform HashiCorp Vault operations. If necessary, add the directory where you install the command to the system path.
(Optional) HashiCorp Vault supports autocomplete options that make it easier to use. For more information, see https://learn.hashicorp.com/vault/getting-started/install\#command-completion.
2. Create the HashiCorp Vault server configuration file.

Prepare a configuration file named config. hcl with the following content. For the tls_cert_file, tls_key_file, and path values, substitute path names appropriate for your system.
```
listener "tcp" {
    address="127.0.0.1:8200"
    tls_cert_file="/home/username/certificates/vault.crt"
    tls_key_file="/home/username/certificates/vault.key"
}
storage "file" {
    path = "/home/username/vaultstorage/storage"
}
ui = true
```

3. Start the HashiCorp Vault server.

To start the Vault server, use the following command, where the -config option specifies the path to the configuration file just created:
```
vault server -config=config.hcl
```


During this step, you may be prompted for a password for the Vault server private key stored in the vault. key file.

The server should start, displaying some information on the console (IP, port, and so forth).
So that you can enter the remaining commands, put the vault server command in the background or open another terminal before continuing.
4. Initialize the HashiCorp Vault server.

\section*{Note}

The operations described in this step are required only when starting Vault the first time, to obtain the unseal key and root token. Subsequent Vault instance restarts require only unsealing using the unseal key.

Issue the following commands (assuming Bourne shell syntax):
```
export VAULT_SKIP_VERIFY=1
vault operator init -n 1 -t 1
```


The first command enables the vault command to temporarily ignore the fact that no company certificate has been added to the system trust store. It compensates for the fact that our self-signed CA is not added to that store. (For production use, such a certificate should be added.)

The second command creates a single unseal key with a requirement for a single unseal key to be present for unsealing. (For production use, an instance would have multiple unseal keys with up to that many keys required to be entered to unseal it. The unseal keys should be delivered to key custodians within the company. Use of a single key might be considered a security issue because that permits the vault to be unsealed by a single key custodian.)

Vault should reply with information about the unseal key and root token, plus some additional text (the actual unseal key and root token values differ from those shown here):
```
...
Unseal Key 1: I2xwcFQc89200Nt2pBiRNlnkHzTUrWS+JybL39BjcOE=
Initial Root Token: s.vTvXeo3tPEYehfcd9WH7oUKz
...
```


Store the unseal key and root token in a secure location.
5. Unseal the HashiCorp Vault server.

Use this command to unseal the Vault server:
```
vault operator unseal
```


When prompted to enter the unseal key, use the key obtained previously during Vault initialization.
Vault should produce output indicating that setup is complete and the vault is unsealed.
6. Log in to the HashiCorp Vault server and verify its status.

Prepare the environment variables required for logging in as root:
```
vault login s.vTvXeo3tPEYehfcd9WH7oUKz
```


For the token value in that command, substitute the content of the root token obtained previously during Vault initialization.

Verify the Vault server status:
```
vault status
```


The output should contain these lines (among others):
```
Initialized true
Sealed false
...
```

7. Set up HashiCorp Vault authentication and storage.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1431.jpg?height=182&width=266&top_left_y=326&top_left_x=424)

\section*{Note}

The operations described in this step are needed only the first time the Vault instance is run. They need not be repeated afterward.

Enable the AppRole authentication method and verify that it is in the authentication method list:
```
vault auth enable approle
vault auth list
```


Enable the Vault KeyValue storage engine:
```
vault secrets enable -version=1 kv
```


Create and set up a role for use with the keyring_hashicorp plugin (enter the command on a single line):
```
vault write auth/approle/role/mysql token_num_uses=0
    token_ttl=20m token_max_ttl=30m secret_id_num_uses=0
```

8. Add an AppRole security policy.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1431.jpg?height=127&width=100&top_left_y=1192&top_left_x=424)

\section*{Note}

The operations described in this step are needed only the first time the Vault instance is run. They need not be repeated afterward.

Prepare a policy that to permit the previously created role to access appropriate secrets. Create a new file named mysql. hcl with the following content:
```
path "kv/mysql/*" {
    capabilities = ["create", "read", "update", "delete", "list"]
}
```


\section*{Note}
kv/mysql/ in this example may need adjustment per your local installation policies and security requirements. If so, make the same adjustment wherever else kv/mysql/ appears in these instructions.

Import the policy file to the Vault server to create a policy named mysql-policy, then assign the policy to the new role:
```
vault policy write mysql-policy mysql.hcl
vault write auth/approle/role/mysql policies=mysql-policy
```


Obtain the ID of the newly created role and store it in a secure location:
```
vault read auth/approle/role/mysql/role-id
```


Generate a secret ID for the role and store it in a secure location:
```
vault write -f auth/approle/role/mysql/secret-id
```


After these AppRole role ID and secret ID credentials are generated, they are expected to remain valid indefinitely. They need not be generated again and the keyring_hashicorp plugin can be configured with them for use on an ongoing basis. For more information about AuthRole authentication, visit https://www.vaultproject.io/docs/auth/approle.html.

\section*{keyring_hashicorp Configuration}

The plugin library file contains the keyring_hashicorp plugin and a loadable function, keyring_hashicorp_update_config(). When the plugin initializes and terminates, it automatically loads and unloads the function. There is no need to load and unload the function manually.

The keyring_hashicorp plugin supports the configuration parameters shown in the following table. To specify these parameters, assign values to the corresponding system variables.

\begin{tabular}{|l|l|l|}
\hline Configuration Parameter & System Variable & Mandatory \\
\hline HashiCorp Server URL & keyring_hashicorp_server & INol \\
\hline AppRole role ID & keyring_hashicorp_role_id & Yes \\
\hline AppRole secret ID & keyring_hashicorp_secret & ixtes \\
\hline Store path & keyring_hashicorp_store_p & Ates \\
\hline Authorization Path & keyring_hashicorp_auth_pa & No \\
\hline CA certificate file path & keyring_hashicorp_ca_path & No \\
\hline Cache control & keyring_hashicorp_caching & No \\
\hline
\end{tabular}

To be usable during the server startup process, keyring_hashicorp must be loaded using the -early-plugin-load option. As indicated by the preceding table, several plugin-related system variables are mandatory and must also be set. For example, use these lines in the server my.cnf file, adjusting the . so suffix and file locations for your platform as necessary:
```
[mysqld]
early-plugin-load=keyring_hashicorp.so
keyring_hashicorp_role_id='ee3b495c-d0c9-11e9-8881-8444c71c32aa'
keyring_hashicorp_secret_id='0512af29-d0ca-11e9-95ee-0010e00dd718'
keyring_hashicorp_store_path='/v1/kv/mysql'
keyring_hashicorp_auth_path='/v1/auth/approle/login'
```


> Note
> Per the HashiCorp documentation, all API routes are prefixed with a protocol version (which you can see in the preceding example as /v1/ in the keyring_hashicorp_store_path and keyring_hashicorp_auth_path values). If HashiCorp develops new protocol versions, it may be necessary to change /v1/ to something else in your configuration.

MySQL Server authenticates against HashiCorp Vault using AppRole authentication. Successful authentication requires that two secrets be provided to Vault, a role ID and a secret ID, which are similar in concept to user name and password. The role ID and secret ID values to use are those obtained during the HashiCorp Vault setup procedure performed previously. To specify the two IDs, assign their respective values to the keyring_hashicorp_role_id and keyring_hashicorp_secret_id system variables. The setup procedure also results in a store path of /v1/kv/mysql, which is the value to assign to keyring_hashicorp_commit_store_path.

At plugin initialization time, keyring_hashicorp attempts to connect to the HashiCorp Vault server using the configuration values. If the connection is successful, the plugin stores the values in corresponding system variables that have _commit_ in their name. For example, upon successful connection, the plugin stores the values of keyring_hashicorp_role_id and keyring_hashicorp_store_path in keyring_hashicorp_commit_role_id and keyring_hashicorp_commit_store_path.

Reconfiguration at runtime can be performed with the assistance of the keyring_hashicorp_update_config() function:
1. Use SET statements to assign the desired new values to the configuration system variables shown in the preceding table. These assignments in themselves have no effect on ongoing plugin operation.
2. Invoke keyring_hashicorp_update_config() to cause the plugin to reconfigure and reconnect to the HashiCorp Vault server using the new variable values.
3. If the connection is successful, the plugin stores the updated configuration values in corresponding system variables that have _commit_ in their name.

For example, if you have reconfigured HashiCorp Vault to listen on port 8201 rather than the default 8200, reconfigure keyring_hashicorp like this:
```
mysql> SET GLOBAL keyring_hashicorp_server_url = 'https://127.0.0.1:8201';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT keyring_hashicorp_update_config();
+----------------------------------------+
| keyring_hashicorp_update_config() |
+----------------------------------------+
| Configuration update was successful. |
+----------------------------------------+
1 row in set (0.03 sec)
```


If the plugin is not able to connect to HashiCorp Vault during initialization or reconfiguration and there was no existing connection, the _commit_ system variables are set to 'Not committed ' for stringvalued variables, and OFF for Boolean-valued variables. If the plugin is not able to connect but there was an existing connection, that connection remains active and the _commit_ variables reflect the values used for it.

\section*{Note}

If you do not set the mandatory system variables at server startup, or if some other plugin initialization error occurs, initialization fails. In this case, you can use the runtime reconfiguration procedure to initialize the plugin without restarting the server.

For additional information about the keyring_hashicorp plugin-specific system variables and function, see Section 8.4.4.16, "Keyring System Variables", and Section 8.4.4.13, "Plugin-Specific Keyring Key-Management Functions".

\subsection*{8.4.4.9 Using the Oracle Cloud Infrastructure Vault Keyring Component}

\section*{Note}

The Oracle Cloud Infrastructure Vault keyring component is included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, see https://www.mysql.com/products/.
component_keyring_oci is part of the component infrastructure that communicates with Oracle Cloud Infrastructure Vault for back end storage. No key information is permanently stored in MySQL server local storage. All keys are stored in Oracle Cloud Infrastructure Vault, making this component well suited for Oracle Cloud Infrastructure MySQL customers for management of their MySQL Enterprise Edition keys.
component_keyring_oci replaces the keyring_oci plugin (now removed), and makes use of the component infrastructure. For more information, see Keyring Components Versus Keyring Plugins.

\section*{Note}

Only one keyring component or plugin should be enabled at a time. Enabling multiple keyring components or plugins is unsupported and results may not be as anticipated.

To use component_keyring_oci for keystore management, you must:
1. Write a manifest that tells the server to load component_keyring_oci, as described in Section 8.4.4.2, "Keyring Component Installation".
2. Write a configuration file for component_keyring_oci, as described here.
- Configuration Notes
- Verify the Component Installation
- Vault Keyring Component Usage

\section*{Configuration Notes}

When it initializes, component_keyring_oci reads either a global configuration file, or a global configuration file paired with a local configuration file:
- The component attempts to read its global configuration file from the directory where the component library file is installed (that is, the server plugin directory).
- If the global configuration file indicates use of a local configuration file, the component attempts to read its local configuration file from the data directory.
- Although global and local configuration files are located in different directories, the file name is component_keyring_oci.cnf in both locations.
- It is an error for no configuration file to exist. component_keyring_oci cannot initialize without a valid configuration.

Local configuration files permit setting up multiple server instances to use component_keyring_oci, such that component configuration for each server instance is specific to a given data directory instance. This enables the same keyring component to be used with a distinct Oracle Cloud Infrastructure Vault for each instance.

You are assumed to be familiar with Oracle Cloud Infrastructure concepts, but the following documentation may be helpful when setting up resources to be used by component_keyring_oci:
- Overview of Vault
- Required Keys and OCIDs
- Managing Keys
- Managing Compartments
- Managing Vaults
- Managing Secrets
component_keyring_oci configuration files have these properties:
- A configuration file must be in valid JSON format.
- A configuration file must have the appropriate file permission that allows MySQL to read it. Since the file contains sensitive information, it should be set to world readable.
- A configuration file permits these configuration items:
- "read_local_config": This item is permitted only in the global configuration file. If the item is not present, the component uses only the global configuration file. If the item is present, its value is true or false, indicating whether the component should read configuration information from the local configuration file.

If the "read_local_config" item is present in the global configuration file along with other items, the component checks the "read_local_config" item value first:
- If the value is false, the component processes the other items in the global configuration file and ignores the local configuration file.
- If the value is true, the component ignores the other items in the global configuration file and attempts to read the local configuration file.
- "user": The OCID of the Oracle Cloud Infrastructure user that component_keyring_oci uses for connections. Prior to using component_keyring_oci, the user account must exist and be granted access to use the configured Oracle Cloud Infrastructure tenancy, compartment, and vault resources. To obtain the user OCID from the Console, use the instructions at Required Keys and OCIDs.

This value is mandatory.
- "tenancy": The OCID of the Oracle Cloud Infrastructure tenancy that component_keyring_oci uses as the location of the MySQL compartment. Prior to using component_keyring_oci, you must create a tenancy if it does not exist. To obtain the tenancy OCID from the Console, use the instructions at Required Keys and OCIDs.

This value is mandatory.
- "compartment": The OCID of the tenancy compartment that component_keyring_oci uses as the location of the MySQL keys. Prior to using component_keyring_oci, you must create a MySQL compartment or subcompartment if it does not exist. This compartment should contain no vault keys or vault secrets. It should not be used by systems other than MySQL Keyring. For information about managing compartments and obtaining the OCID, see Managing Compartments.

This value is mandatory.
- "virtual_vault": The OCID of the Oracle Cloud Infrastructure Vault that component_keyring_oci uses for encryption operations. Prior to using component_keyring_oci, you must create a new vault in the MySQL compartment if it does not exist. (Alternatively, you can reuse an existing vault that is in a parent compartment of the MySQL compartment.) Compartment users can see and use only the keys in their respective compartments. For information about creating a vault and obtaining the vault OCID, see Managing Vaults.

This value is mandatory.
- "encryption_endpoint": The endpoint of the Oracle Cloud Infrastructure encryption server that component_keyring_oci uses for generating encrypted or encoded information (ciphertext) for new keys. The encryption endpoint is vault specific and Oracle Cloud Infrastructure assigns it at vault-creation time. To obtain the endpoint OCID, view the configuration details for your keyring_oci vault, using the instructions at Managing Vaults.

This value is mandatory.
- "management_endpoint": The endpoint of the Oracle Cloud Infrastructure key management server that component_keyring_oci uses for listing existing keys. The key management endpoint is vault specific and Oracle Cloud Infrastructure assigns it at vault-creation time. To obtain the endpoint OCID, view the configuration details for your keyring_oci vault, using the instructions at Managing Vaults.

This value is mandatory.
- "vaults_endpoint": The endpoint of the Oracle Cloud Infrastructure vaults server that component_keyring_oci uses for obtaining the value of secrets. The vaults endpoint is vault specific and Oracle Cloud Infrastructure assigns it at vault-creation time. To obtain the endpoint

OCID, view the configuration details for your keyring_oci vault, using the instructions at Managing Vaults.

This value is mandatory.
- "secrets_endpoint": The endpoint of the Oracle Cloud Infrastructure secrets server that component_keyring_oci uses for listing, creating, and retiring secrets. The secrets endpoint is vault specific and Oracle Cloud Infrastructure assigns it at vault-creation time. To obtain the endpoint OCID, view the configuration details for your keyring_oci vault, using the instructions at Managing Vaults.

This value is mandatory.
- "master_key": The OCID of the Oracle Cloud Infrastructure master encryption key that component_keyring_oci uses for encryption of secrets. Prior to using component_keyring_oci, you must create a cryptographic key for the Oracle Cloud Infrastructure compartment if it does not exist. Provide a MySQL-specific name for the generated key and do not use it for other purposes. For information about key creation, see Managing Keys.

This value is mandatory.
- "key_file": The path name of the file containing the RSA private key that component_keyring_oci uses for Oracle Cloud Infrastructure authentication. You must also upload the corresponding RSA public key using the Console. The Console displays the key fingerprint value, which you can use to set the "key_fingerprint" value. For information about generating and uploading API keys, see Required Keys and OCIDs.

This value is mandatory.
- "key_fingerprint": The fingerprint of the RSA private key that component_keyring_oci uses for Oracle Cloud Infrastructure authentication. To obtain the key fingerprint while creating the API keys, execute this command:
openssl rsa -pubout -outform DER -in ~/.oci/oci_api_key.pem | openssl md5 -c
Alternatively, obtain the fingerprint from the Console, which automatically displays the fingerprint when you upload the RSA public key. For information about obtaining key fingerprints, see Required Keys and OCIDs.

This value is mandatory.
- "ca_certificate": The path name of the CA certificate bundle file that
component_keyring_oci component uses for Oracle Cloud Infrastructure certificate verification. The file contains one or more certificates for peer verification. If no file is specified, the default CA bundle installed on the system is used. If the value is set to disabled (case-sensitive), component_keyring_oci performs no certificate verification.

On Windows systems, this should be set to disabled, or to the path to a CA certificate bundle file.

Given the preceding configuration file properties, to configure component_keyring_oci, create a global configuration file named component_keyring_oci.cnf in the directory where the component_keyring_oci library file is installed, and optionally create a local configuration file, also named component_keyring_oci.cnf, in the data directory.

\section*{Verify the Component Installation}

After performing any component-specific configuration, start the server. Verify component installation by examining the Performance Schema keyring_component_status table:
```
mysql> SELECT * FROM performance_schema.keyring_component_status;
```

```
+-----------------------+---------------------------------------------------------------------+
+----------------------+----------------------------------------------------------------------
| Component_name | component_keyring_oci
| Author | Oracle Corporation
| License | PROPRIETARY
| Implementation_name | component_keyring_oci
| Version | 1.0
| Component_status | Active
| user | ocid1.user.oc1..aaaaaaaasqly<...>
| tenancy | ocid1.tenancy.oc1..aaaaaaaai<...>
| compartment | ocid1.compartment.oc1..aaaaaaaah2swh<...>
| virtual_vault | ocid1.vault.oc1.iad.bbo5xyzkaaeuk.abuwcljtmvxp4r<...>
| master_key | ocid1.key.oc1.iad.bbo5xyzkaaeuk.abuwcljrbsrewgap<...>
| encryption_endpoint | bbo5xyzkaaeuk-crypto.kms.us-<...>
| management_endpoint | bbo5xyzkaaeuk-management.kms.us-<...>
| vaults_endpoint | vaults.us-<...>
| secrets_endpoint | secrets.vaults.us-<...>
| key_file | ~/.oci/oci_api_key.pem
| key_fingerprint | ca:7c:e1:fa:86:b6:40:af:39:d6<...>
| ca_certificate | disabled
```


A Component_status value of Active indicates that the component initialized successfully.
If the component cannot be loaded, server startup fails. Check the server error log for diagnostic messages. If the component loads but fails to initialize due to configuration problems, the server starts but the Component_status value is Disabled. Check the server error log, correct the configuration issues, and use the ALTER INSTANCE RELOAD KEYRING statement to reload the configuration.

It is possible to query MySQL server for the list of existing keys. To see which keys exist, examine the Performance Schema keyring_keys table.
```
mysql> SELECT * FROM performance_schema.keyring_keys;
+-------------------------------+--------------+----------------
    KEY_ID | KEY_OWNER | BACKEND_KEY_ID |
+-------------------------------+--------------+-----------------
    audit_log-20210322T130749-1 |
    MyKey | me@localhost |
    YourKey | me@localhost
+-------------------------------+--------------+---------------+
```


\section*{Vault Keyring Component Usage}
component_keyring_oci supports the functions that comprise the standard MySQL Keyring service interface. Keyring operations performed by those functions are accessible in SQL statements as described in Section 8.4.4.12, "General-Purpose Keyring Key-Management Functions".

Example:
```
SELECT keyring_key_generate('MyKey', 'AES', 32);
SELECT keyring_key_remove('MyKey');
```


For information about the characteristics of key values permitted by component_keyring_oci, see Section 8.4.4.10, "Supported Keyring Key Types and Lengths".

\subsection*{8.4.4.10 Supported Keyring Key Types and Lengths}

MySQL Keyring supports keys of different types (encryption algorithms) and lengths:
- The available key types depend on which keyring plugin is installed.
- The permitted key lengths are subject to multiple factors:
- General keyring loadable-function interface limits (for keys managed using one of the keyring functions described in Section 8.4.4.12, "General-Purpose Keyring Key-Management Functions"), or limits from back end implementations. These length limits can vary by key operation type.
- In addition to the general limits, individual keyring plugins may impose restrictions on key lengths per key type.

Table 8.31, "General Keyring Key Length Limits" shows the general key-length limits. (The lower limits for keyring_aws are imposed by the AWS KMS interface, not the keyring functions.) For keyring plugins, Table 8.32, "Keyring Plugin Key Types and Lengths" shows the key types each keyring plugin permits, as well as any plugin-specific key-length restrictions. For most keyring components, the general key-length limits apply and there are no key-type restrictions.

\section*{Note}
component_keyring_oci can generate keys of type AES with a size of 16, 24 , or 32 bytes only.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.31 General Keyring Key Length Limits}
\begin{tabular}{|l|l|}
\hline Key Operation & Maximum Key Length \\
\hline Generate key & 16,384 bytes (2,048 previously); 1,024 for keyring_aws \\
\hline Store key & 16,384 bytes (2,048 previously); 4,096 for keyring_aws \\
\hline Fetch key & 16,384 bytes (2,048 previously); 4,096 for keyring_aws \\
\hline
\end{tabular}
\end{table}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.32 Keyring Plugin Key Types and Lengths}
\begin{tabular}{|l|l|l|}
\hline Plugin Name & Permitted Key Type & Plugin-Specific Length Restrictions \\
\hline keyring_aws & \begin{tabular}{l}
AES \\
SECRET
\end{tabular} & \begin{tabular}{l}
16, 24, or 32 bytes \\
None
\end{tabular} \\
\hline keyring_hashicorp & \begin{tabular}{l}
AES \\
DSA \\
RSA \\
SECRET
\end{tabular} & \begin{tabular}{l}
None \\
None \\
None \\
None
\end{tabular} \\
\hline keyring_okv & \begin{tabular}{l}
AES \\
SECRET
\end{tabular} & \begin{tabular}{l}
16, 24, or 32 bytes \\
None
\end{tabular} \\
\hline
\end{tabular}
\end{table}

The SECRET key type is intended for general-purpose storage of sensitive data using the MySQL keyring, and is supported by most keyring components and keyring plugins. The keyring encrypts and decrypts SECRET data as a byte stream upon storage and retrieval.

Example keyring operations involving the SECRET key type:
```
SELECT keyring_key_generate('MySecret1', 'SECRET', 20);
SELECT keyring_key_remove('MySecret1');
SELECT keyring_key_store('MySecret2', 'SECRET', 'MySecretData');
SELECT keyring_key_fetch('MySecret2');
SELECT keyring_key_length_fetch('MySecret2');
SELECT keyring_key_type_fetch('MySecret2');
SELECT keyring_key_remove('MySecret2');
```


\subsection*{8.4.4.11 Migrating Keys Between Keyring Keystores}

A keyring migration copies keys from one keystore to another, enabling a DBA to switch a MySQL installation to a different keystore. A successful migration operation has this result:
- The destination keystore contains the keys it had prior to the migration, plus the keys from the source keystore.
- The source keystore remains the same before and after the migration (because keys are copied, not moved).

If a key to be copied already exists in the destination keystore, an error occurs and the destination keystore is restored to its premigration state.

The keyring manages keystores using keyring components and keyring plugins. This pertains to migration strategy because the way in which the source and destination keystores are managed determines the procedure for performing a given type of key migration:
- Migration from one keyring plugin to another: The MySQL server has an operational mode that provides this capability.
- Migration from a keyring plugin to a keyring component: The MySQL server has an operational mode that provides this capability.
- Migration from one keyring component to another: The mysql_migrate_keyring utility provides this capability.
- Migration from a keyring component to a keyring plugin: The MySQL server has an operational mode that provides this capability.

The following sections discuss the characteristics of offline and online migrations and describe how to perform migrations.
- Offline and Online Key Migrations
- Key Migration Using a Migration Server
- Key Migration Using the mysql_migrate_keyring Utility
- Key Migration Involving Multiple Running Servers

\section*{Offline and Online Key Migrations}

A key migration is either offline or online:
- Offline migration: For use when you are sure that no running server on the local host is using the source or destination keystore. In this case, the migration operation can copy keys from the source keystore to the destination without the possibility of a running server modifying keystore content during the operation.
- Online migration: For use when a running server on the local host is using the source keystore. In this case, care must be taken to prevent that server from updating keystores during the migration. This involves connecting to the running server and instructing it to pause keyring operations so that keys can be copied safely from the source keystore to the destination. When key copying is complete, the running server is permitted to resume keyring operations.

When you plan a key migration, use these points to decide whether it should be offline or online:
- Do not perform offline migration involving a keystore that is in use by a running server.
- Pausing keyring operations during an online migration is accomplished by connecting to the running server and setting its global keyring_operations system variable to OFF before key copying and ON after key copying. This has several implications:
- keyring_operations was introduced in MySQL 5.7.21, so online migration is possible only if the running server is from MySQL 5.7.21 or higher. If the running server is older, you must stop it, perform an offline migration, and restart it. All migration instructions elsewhere that refer to keyring_operations are subject to this condition.
- The account used to connect to the running server must have the privileges required to modify keyring_operations. These privileges are ENCRYPTION_KEY_ADMIN in addition to either SYSTEM_VARIABLES_ADMIN or the deprecated SUPER privilege.
- If an online migration operation exits abnormally (for example, if it is forcibly terminated), it is possible for keyring_operations to remain disabled on the running server, leaving it unable to perform keyring operations. In this case, it may be necessary to connect to the running server and enable keyring_operations manually using this statement:
```
SET GLOBAL keyring_operations = ON;
```

- Online key migration provides for pausing keyring operations on a single running server. To perform a migration if multiple running servers are using the keystores involved, use the procedure described at Key Migration Involving Multiple Running Servers.

\section*{Key Migration Using a Migration Server}

\section*{Note}

Online key migration using a migration server is only supported if the running server allows socket connections or TCP/IP connections using TLS; it is not supported when, for example, the server is running on a Windows platform and only allows shared memory connections.

A MySQL server becomes a migration server if invoked in a special operational mode that supports key migration. A migration server does not accept client connections. Instead, it runs only long enough to migrate keys, then exits. A migration server reports errors to the console (the standard error output).

A migration server supports these migration types:
- Migration from one keyring plugin to another.
- Migration from a keyring plugin to a keyring component.
- Migration from a keyring component to a keyring plugin.

A migration server does not support migration from one keyring component to another. For that type of migration, see Key Migration Using the mysql_migrate_keyring Utility.

To perform a key migration operation using a migration server, determine the key migration options required to specify which keyring plugins or components are involved, and whether the migration is offline or online:
- To indicate the source keyring plugin and the destination keyring plugin or component, specify these options:
- --keyring-migration-source: The source keyring component or plugin that manages the keys to be migrated.
- --keyring-migration-destination: The destination keyring plugin or component to which the migrated keys are to be copied.
- --keyring-migration-to-component: This option is required if the destination is a keyring component.
- --keyring-migration-from-component: This option is required if the source is a keyring component.

The --keyring-migration-source and --keyring-migration-destination options signify to the server that it should run in key migration mode. For key migration operations, both options are mandatory. Each plugin or component is specified using the name of its library file,
including any platform-specific extension such as .so or .dll. The source and destination must differ, and the migration server must support them both.
- For an offline migration, no additional key migration options are needed.
- For an online migration, some running server currently is using the source or destination keystore. To invoke the migration server, specify additional key migration options that indicate how to connect to the running server. This is necessary so that the migration server can connect to the running server and tell it to pause keyring use during the migration operation.

Use of any of the following options signifies an online migration:
- --keyring-migration-host: The host where the running server is located. This is always the local host because the migration server can migrate keys only between keystores managed by local plugins and components.
- --keyring-migration-user, --keyring-migration-password: The account credentials to use to connect to the running server.
- --keyring-migration-port: For TCP/IP connections, the port number to connect to on the running server.
- --keyring-migration-socket: For Unix socket file or Windows named pipe connections, the socket file or named pipe to connect to on the running server.

For additional details about the key migration options, see Section 8.4.4.15, "Keyring Command Options".

Start the migration server with key migration options indicating the source and destination keystores and whether the migration is offline or online, possibly with other options. Keep the following considerations in mind:
- Other server options might be required; other non-keyring options may be required as well. One way to specify these options is by using--defaults-file to name an option file that contains the required options.
- The migration server must not start up with its own keyring. This means that --defaults-file must not point to the same options file that is used to start the running server if it contains a line such as early-plugin-load=keyring_file.so. Instead, it must point to a separate file that only contains options relevant to the migration.
- If migrating from a plugin to a component:
- The migration only works with a global component . cnf file. The migration does not work with a local config file and a global config file that attempts to read_local_config. If there are multiple instances running on the same machine, the global config file must be updated appropriately to migrate every individual key.
- The component manifest file (mysqld.my) must not be present in the bin directory. However, the component configuration (for example, component_keyring_file.cnf) should be present in the plugin directory, so that the new keyring can be populated. After the migration is complete, add the manifest file to the directory and restart the MySQL server, so that the server starts using the new keyring.
- The migration server expects path name option values to be full paths. Relative path names may not be resolved as you expect.
- The user who invokes a server in key-migration mode must not be the root operating system user, unless the --user option is specified with a non-root user name to run the server as that user.
- The user a server in key-migration mode runs as must have permission to read and write any local keyring files, such as the data file for a file-based plugin.

If you invoke the migration server from a system account different from that normally used to run MySQL, it might create keyring directories or files that are inaccessible to the server during normal operation. Suppose that mysqld normally runs as the mysql operating system user, but you invoke the migration server while logged in as isabel. Any new directories or files created by the migration server are owned by isabel. Subsequent startup fails when a server run as the mysql operating system user attempts to access file system objects owned by isabel.

To avoid this issue, start the migration server as the root operating system user and provide a -user=user_name option, where user_name is the system account normally used to run MySQL. Alternatively, after the migration, examine the keyring-related file system objects and change their ownership and permissions if necessary using chown, chmod, or similar commands, so that the objects are accessible to the running server.

Example command line for offline migration between two keyring plugins (enter the command on a single line):
```
mysqld --defaults-file=/usr/local/mysql/etc/my.cnf
    --keyring-migration-source=keyring_okv.so
    --keyring-migration-destination=keyring_aws.so
```


Example command line for online migration between two keyring plugins:
```
mysqld --defaults-file=/usr/local/mysql/etc/my.cnf
    --keyring-migration-source=keyring_okv.so
    --keyring-migration-destination=keyring_aws.so
    --keyring-migration-host=127.0.0.1
    --keyring-migration-user=root
    --keyring-migration-password=root_password
```


To perform a migration when the destination is a keyring component rather than a keyring plugin, specify the --keyring-migration-to-component option, and name the component as the value of the --keyring-migration-destination option.

Example command line for offline migration from a keyring plugin to a keyring component:
```
mysqld --defaults-file=/usr/local/mysql/etc/my.cnf
    --keyring-migration-to-component
    --keyring-migration-source=keyring_okv.so
    --keyring-migration-destination=component_keyring_encrypted_file.so
```


Notice that in this case, no keyring_encrypted_file_password value is specified. The password for the component data file is listed in the component configuration file.

Example command line for online migration from a keyring plugin to a keyring component:
```
mysqld --defaults-file=/usr/local/mysql/etc/my.cnf
    --keyring-migration-to-component
    --keyring-migration-source=keyring_okv.so
    --keyring-migration-destination=component_keyring_encrypted_file.so
    --keyring-migration-host=127.0.0.1
    --keyring-migration-user=root
    --keyring-migration-password=root_password
```


To perform a migration when the source is a keyring component rather than a keyring plugin, specify the --keyring-migration-from-component option, and name the component as the value of the --keyring-migration-source option.

Example command line for offline migration from a keyring component to a keyring plugin:
```
mysqld --defaults-file=/usr/local/mysql/etc/my.cnf
    --keyring-migration-from-component
    --keyring-migration-source=component_keyring_file.so
    --keyring-migration-destination=keyring_okv.so
    --keyring-okv-conf-dir=/usr/local/mysql/mysql-keyring-okv
```


Example command line for online migration from a keyring component to a keyring plugin:
```
mysqld --defaults-file=/usr/local/mysql/etc/my.cnf
    --keyring-migration-from-component
    --keyring-migration-source=component_keyring_file.so
    --keyring-migration-destination=keyring_okv.so
    --keyring-okv-conf-dir=/usr/local/mysql/mysql-keyring-okv
    --keyring-migration-host=127.0.0.1
    --keyring-migration-user=root
    --keyring-migration-password=root_password
```


The key migration server performs a migration operation as follows:
1. (Online migration only) Connect to the running server using the connection options.
2. (Online migration only) Disable keyring_operations on the running server.
3. Load the keyring plugin or component libraries for the source and destination keystores.
4. Copy keys from the source keystore to the destination.
5. Unload the keyring plugin or component libraries for the source and destination keystores.
6. (Online migration only) Enable keyring_operations on the running server.
7. (Online migration only) Disconnect from the running server.

If an error occurs during key migration, the destination keystore is restored to its premigration state.
After a successful online key migration operation, the running server might need to be restarted:
- If the running server was using the source keystore before the migration and should continue to use it after the migration, it need not be restarted after the migration.
- If the running server was using the destination keystore before the migration and should continue to use it after the migration, it should be restarted after the migration to load all keys migrated into the destination keystore.
- If the running server was using the source keystore before the migration but should use the destination keystore after the migration, it must be reconfigured to use the destination keystore and restarted. In this case, be aware that although the running server is paused from modifying the source keystore during the migration itself, it is not paused during the interval between the migration and the subsequent restart. Care should be taken that the server does not modify the source keystore during this interval because any such changes will not be reflected in the destination keystore.

\section*{Key Migration Using the mysql_migrate_keyring Utility}

The mysql_migrate_keyring utility migrates keys from one keyring component to another. It does not support migrations involving keyring plugins. For that type of migration, use a MySQL server operating in key migration mode; see Key Migration Using a Migration Server.

To perform a key migration operation using mysql_migrate_keyring, determine the key migration options required to specify which keyring components are involved, and whether the migration is offline or online:
- To indicate the source and destination keyring components and their location, specify these options:
- --source-keyring: The source keyring component that manages the keys to be migrated.
- --destination-keyring: The destination keyring component to which the migrated keys are to be copied.
- --component-dir: The directory containing keyring component library files. This is typically the value of the plugin_dir system variable for the local MySQL server.

All three options are mandatory. Each keyring component name is a component library file name specified without any platform-specific extension such as .so or .dll. For example, to use the component for which the library file is component_keyring_file.so, specify the option as -source-keyring=component_keyring_file. The source and destination must differ, and mysql_migrate_keyring must support them both.
- For an offline migration, no additional options are needed.
- For an online migration, some running server currently is using the source or destination keystore. In this case, specify the--online-migration option to signify an online migration. In addition, specify connection options indicating how to connect to the running server, so that mysql_migrate_keyring can connect to it and tell it to pause keyring use during the migration operation.

The --online-migration option is commonly used in conjunction with connection options such as these:
- - - host: The host where the running server is located. This is always the local host because mysql_migrate_keyring can migrate keys only between keystores managed by local components.
- --user, --password: The account credentials to use to connect to the running server.
- - - port: For TCP/IP connections, the port number to connect to on the running server.
- --socket: For Unix socket file or Windows named pipe connections, the socket file or named pipe to connect to on the running server.

For descriptions of all available options, see Section 6.6.8, "mysql_migrate_keyring - Keyring Key Migration Utility".

Start mysql_migrate_keyring with options indicating the source and destination keystores and whether the migration is offline or online, possibly with other options. Keep the following considerations in mind:
- The user who invokes mysql_migrate_keyring must not be the root operating system user.
- The user who invokes mysql_migrate_keyring must have permission to read and write any local keyring files, such as the data file for a file-based plugin.

If you invoke mysql_migrate_keyring from a system account different from that normally used to run MySQL, it might create keyring directories or files that are inaccessible to the server during normal operation. Suppose that mysqld normally runs as the mysql operating system user, but you invoke mysql_migrate_keyring while logged in as isabel. Any new directories or files created by mysql_migrate_keyring are owned by isabel. Subsequent startup fails when a server run as the mysql operating system user attempts to access file system objects owned by isabel.

To avoid this issue, invoke mysql_migrate_keyring as the mysql operating system user. Alternatively, after the migration, examine the keyring-related file system objects and change their ownership and permissions if necessary using chown, chmod, or similar commands, so that the objects are accessible to the running server.

Suppose that you want to migrate keys from component_keyring_file to component_keyring_encrypted_file, and that the local server stores its keyring component library files in /usr/local/mysql/lib/plugin.

If no running server is using the keyring, an offline migration is permitted. Invoke mysql_migrate_keyring like this (enter the command on a single line):
```
mysql_migrate_keyring
    --component-dir=/usr/local/mysql/lib/plugin
```

```
--source-keyring=component_keyring_file
--destination-keyring=component_keyring_encrypted_file
```


If a running server is using the keyring, you must perform an online migration instead. In this case, the --online-migration option must be given, along with any connection options required to specify which server to connect to and the MySQL account to use.

The following command performs an online migration. It connects to the local server using a TCP/IP connection and the admin account. The command prompts for a password, which you should enter when prompted:
```
mysql_migrate_keyring
    --component-dir=/usr/local/mysql/lib/plugin
    --source-keyring=component_keyring_file
    --destination-keyring=component_keyring_encrypted_file
    --online-migration --host=127.0.0.1 --user=admin --password
```

mysql_migrate_keyring performs a migration operation as follows:
1. (Online migration only) Connect to the running server using the connection options.
2. (Online migration only) Disable keyring_operations on the running server.
3. Load the keyring component libraries for the source and destination keystores.
4. Copy keys from the source keystore to the destination.
5. Unload the keyring component libraries for the source and destination keystores.
6. (Online migration only) Enable keyring_operations on the running server.
7. (Online migration only) Disconnect from the running server.

If an error occurs during key migration, the destination keystore is restored to its premigration state.
After a successful online key migration operation, the running server might need to be restarted:
- If the running server was using the source keystore before the migration and should continue to use it after the migration, it need not be restarted after the migration.
- If the running server was using the destination keystore before the migration and should continue to use it after the migration, it should be restarted after the migration to load all keys migrated into the destination keystore.
- If the running server was using the source keystore before the migration but should use the destination keystore after the migration, it must be reconfigured to use the destination keystore and restarted. In this case, be aware that although the running server is paused from modifying the source keystore during the migration itself, it is not paused during the interval between the migration and the subsequent restart. Care should be taken that the server does not modify the source keystore during this interval because any such changes will not be reflected in the destination keystore.

\section*{Key Migration Involving Multiple Running Servers}

Online key migration provides for pausing keyring operations on a single running server. To perform a migration if multiple running servers are using the keystores involved, use this procedure:
1. Connect to each running server manually and set keyring_operations=0FF. This ensures that no running server is using the source or destination keystore and satisfies the required condition for offline migration.
2. Use a migration server or mysql_migrate_keyring to perform an offline key migration for each paused server.
3. Connect to each running server manually and set keyring_operations=ON.

All running servers must support the keyring_operations system variable. Any server that does not must be stopped before the migration and restarted after.

\subsection*{8.4.4.12 General-Purpose Keyring Key-Management Functions}

MySQL Server supports a keyring service that enables internal components and plugins to store sensitive information securely for later retrieval.

MySQL Server also includes an SQL interface for keyring key management, implemented as a set of general-purpose functions that access the capabilities provided by the internal keyring service. The keyring functions are contained in a plugin library file, which also contains a keyring_udf plugin that must be enabled prior to function invocation. For these functions to be used, a keyring plugin such as keyring_okv, or a keyring component such as component_keyring_file or component_keyring_encrypted_file, must be enabled.

The functions described here are general-purpose and intended for use with any keyring component or plugin. A given keyring component or plugin may also provide functions of its own that are intended for use only with that component or plugin; see Section 8.4.4.13, "Plugin-Specific Keyring KeyManagement Functions".

The following sections provide installation instructions for the keyring functions and demonstrate how to use them. For general keyring information, see Section 8.4.4, "The MySQL Keyring".
- Installing or Uninstalling General-Purpose Keyring Functions
- Using General-Purpose Keyring Functions
- General-Purpose Keyring Function Reference

\section*{Installing or Uninstalling General-Purpose Keyring Functions}

This section describes how to install or uninstall the keyring functions, which are implemented in a plugin library file that also contains a keyring_udf plugin. For general information about installing or uninstalling plugins and loadable functions, see Section 7.6.1, "Installing and Uninstalling Plugins", and Section 7.7.1, "Installing and Uninstalling Loadable Functions".

The keyring functions enable keyring key management operations, but the keyring_udf plugin must also be installed because the functions do not work correctly without it. Attempts to use the functions without the keyring_udf plugin result in an error.

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

The plugin library file base name is keyring_udf. The file name suffix differs per platform (for example, . so for Unix and Unix-like systems, . dll for Windows).

To install the keyring_udf plugin and the keyring functions, use the INSTALL PLUGIN and CREATE FUNCTION statements, adjusting the . so suffix for your platform as necessary:
```
INSTALL PLUGIN keyring_udf SONAME 'keyring_udf.so';
CREATE FUNCTION keyring_key_generate RETURNS INTEGER
    SONAME 'keyring_udf.so';
CREATE FUNCTION keyring_key_fetch RETURNS STRING
    SONAME 'keyring_udf.so';
CREATE FUNCTION keyring_key_length_fetch RETURNS INTEGER
    SONAME 'keyring_udf.so';
CREATE FUNCTION keyring_key_type_fetch RETURNS STRING
    SONAME 'keyring_udf.so';
CREATE FUNCTION keyring_key_store RETURNS INTEGER
    SONAME 'keyring_udf.so';
CREATE FUNCTION keyring_key_remove RETURNS INTEGER
    SONAME 'keyring_udf.so';
```


If the plugin and functions are used on a source replication server, install them on all replicas as well to avoid replication issues.

Once installed as just described, the plugin and functions remain installed until uninstalled. To remove them, use the UNINSTALL PLUGIN and DROP FUNCTION statements:
```
UNINSTALL PLUGIN keyring_udf;
DROP FUNCTION keyring_key_generate;
DROP FUNCTION keyring_key_fetch;
DROP FUNCTION keyring_key_length_fetch;
DROP FUNCTION keyring_key_type_fetch;
DROP FUNCTION keyring_key_store;
DROP FUNCTION keyring_key_remove;
```


\section*{Using General-Purpose Keyring Functions}

Before using the keyring general-purpose functions, install them according to the instructions provided in Installing or Uninstalling General-Purpose Keyring Functions.

The keyring functions are subject to these constraints:
- To use any keyring function, the keyring_udf plugin must be enabled. Otherwise, an error occurs:
```
ERROR 1123 (HY000): Can't initialize function 'keyring_key_generate';
This function requires keyring_udf plugin which is not installed.
Please install
```


To install the keyring_udf plugin, see Installing or Uninstalling General-Purpose Keyring Functions.
- The keyring functions invoke keyring service functions (see Section 7.6.9.2, "The Keyring Service"). The service functions in turn use whatever keyring plugin is installed (for example, keyring_okv). Therefore, to use any keyring function, some underlying keyring plugin must be enabled. Otherwise, an error occurs:
```
ERROR 3188 (HY000): Function 'keyring_key_generate' failed because
underlying keyring service returned an error. Please check if a
keyring plugin is installed and that provided arguments are valid
for the keyring you are using.
```


To install a keyring plugin, see Section 8.4.4.3, "Keyring Plugin Installation".
- A user must possess the global EXECUTE privilege to use any keyring function. Otherwise, an error occurs:
```
ERROR 1123 (HY000): Can't initialize function 'keyring_key_generate';
The user is not privileged to execute this function. User needs to
have EXECUTE
```


To grant the global EXECUTE privilege to a user, use this statement:
```
GRANT EXECUTE ON *.* TO user;
```


Alternatively, should you prefer to avoid granting the global EXECUTE privilege while still permitting users to access specific key-management operations, "wrapper" stored programs can be defined (a technique described later in this section).
- A key stored in the keyring by a given user can be manipulated later only by the same user. That is, the value of the CURRENT_USER( ) function at the time of key manipulation must have the same value as when the key was stored in the keyring. (This constraint rules out the use of the keyring functions for manipulation of instance-wide keys, such as those created by InnoDB to support tablespace encryption.)

To enable multiple users to perform operations on the same key, "wrapper" stored programs can be defined (a technique described later in this section).
- Keyring functions support the key types and lengths supported by the underlying keyring plugin. For information about keys specific to a particular keyring plugin, see Section 8.4.4.10, "Supported Keyring Key Types and Lengths".

To create a new random key and store it in the keyring, call keyring_key_generate( ), passing to it an ID for the key, along with the key type (encryption method) and its length in bytes. The following call creates a 2,048-bit DSA-encrypted key named MyKey:
```
mysql> SELECT keyring_key_generate('MyKey', 'DSA', 256);
+---------------------------------------------+
| keyring_key_generate('MyKey', 'DSA', 256) |
+---------------------------------------------
| 1 |
```


A return value of 1 indicates success. If the key cannot be created, the return value is NULL and an error occurs. One reason this might be is that the underlying keyring plugin does not support the specified combination of key type and key length; see Section 8.4.4.10, "Supported Keyring Key Types and Lengths".

To be able to check the return type regardless of whether an error occurs, use SELECT ... INTO @var_name and test the variable value:
```
mysql> SELECT keyring_key_generate('', '', -1) INTO @x;
ERROR 3188 (HY000): Function 'keyring_key_generate' failed because
underlying keyring service returned an error. Please check if a
keyring plugin is installed and that provided arguments are valid
for the keyring you are using.
mysql> SELECT @x;
+------+
| @x |
+------+
| NULL |
+------+
mysql> SELECT keyring_key_generate('x', 'AES', 16) INTO @x;
mysql> SELECT @x;
+------+
| @x |
+------+
| 1 |
+------+
```


This technique also applies to other keyring functions that for failure return a value and an error.
The ID passed to keyring_key_generate() provides a means by which to refer to the key in subsequent functions calls. For example, use the key ID to retrieve its type as a string or its length in bytes as an integer:
```
mysql> SELECT keyring_key_type_fetch('MyKey');
+----------------------------------+
| keyring_key_type_fetch('MyKey') |
+-----------------------------------+
| DSA |
+-----------------------------------+
mysql> SELECT keyring_key_length_fetch('MyKey');
+-------------------------------------+
| keyring_key_length_fetch('MyKey') |
+-------------------------------------+
| 256 |
+------------------------------------
```


To retrieve a key value, pass the key ID to keyring_key_fetch( ). The following example uses HEX( ) to display the key value because it may contain nonprintable characters. The example also uses a short key for brevity, but be aware that longer keys provide better security:
```
mysql> SELECT keyring_key_generate('MyShortKey', 'DSA', 8);
+------------------------------------------------+
    keyring_key_generate('MyShortKey', 'DSA', 8) |
+------------------------------------------------
```

```
| 1 |
mysql> SELECT HEX(keyring_key_fetch('MyShortKey'));
+----------------------------------------+
| HEX(keyring_key_fetch('MyShortKey')) |
+----------------------------------------+
| 1DB3B0FC3328A24C |
+----------------------------------------+
```


Keyring functions treat key IDs, types, and values as binary strings, so comparisons are case-sensitive. For example, IDs of MyKey and mykey refer to different keys.

To remove a key, pass the key ID to keyring_key_remove( ):
```
mysql> SELECT keyring_key_remove('MyKey');
+-------------------------------+
| keyring_key_remove('MyKey') |
+-------------------------------+
| 1 |
+-------------------------------+
```


To obfuscate and store a key that you provide, pass the key ID, type, and value to keyring_key_store():
```
mysql> SELECT keyring_key_store('AES_key', 'AES', 'Secret string');
+---------------------------------------------------------
| keyring_key_store('AES_key', 'AES', 'Secret string') |
+---------------------------------------------------------
| 1 |
+--------------------------------------------------------
```


As indicated previously, a user must have the global EXECUTE privilege to call keyring functions, and the user who stores a key in the keyring initially must be the same user who performs subsequent operations on the key later, as determined from the CURRENT_USER( ) value in effect for each function call. To permit key operations to users who do not have the global EXECUTE privilege or who may not be the key "owner," use this technique:
1. Define "wrapper" stored programs that encapsulate the required key operations and have a DEFINER value equal to the key owner.
2. Grant the EXECUTE privilege for specific stored programs to the individual users who should be able to invoke them.
3. If the operations implemented by the wrapper stored programs do not include key creation, create any necessary keys in advance, using the account named as the DEFINER in the stored program definitions.

This technique enables keys to be shared among users and provides to DBAs more fine-grained control over who can do what with keys, without having to grant global privileges.

The following example shows how to set up a shared key named SharedKey that is owned by the DBA, and a get_shared_key( ) stored function that provides access to the current key value. The value can be retrieved by any user with the EXECUTE privilege for that function, which is created in the key_schema schema.

From a MySQL administrative account ('root'@'localhost' in this example), create the administrative schema and the stored function to access the key:
```
mysql> CREATE SCHEMA key_schema;
mysql> CREATE DEFINER = 'root'@'localhost'
    FUNCTION key_schema.get_shared_key()
    RETURNS BLOB READS SQL DATA
    RETURN keyring_key_fetch('SharedKey');
```


From the administrative account, ensure that the shared key exists:
```
mysql> SELECT keyring_key_generate('SharedKey', 'DSA', 8);
+-----------------------------------------------+
| keyring_key_generate('SharedKey', 'DSA', 8) |
+------------------------------------------------
| 1 |
+-----------------------------------------------+
```


From the administrative account, create an ordinary user account to which key access is to be granted:
```
mysql> CREATE USER 'key_user'@'localhost'
    IDENTIFIED BY 'key_user_pwd';
```


From the key_user account, verify that, without the proper EXECUTE privilege, the new account cannot access the shared key:
```
mysql> SELECT HEX(key_schema.get_shared_key());
ERROR 1370 (42000): execute command denied to user 'key_user'@'localhost'
for routine 'key_schema.get_shared_key'
```


From the administrative account, grant EXECUTE to key_user for the stored function:
```
mysql> GRANT EXECUTE ON FUNCTION key_schema.get_shared_key
    TO 'key_user'@'localhost';
```


From the key_user account, verify that the key is now accessible:
```
mysql> SELECT HEX(key_schema.get_shared_key());
+-------------------------------------+
| HEX(key_schema.get_shared_key()) |
+------------------------------------+
| 9BAFB9E75CEEB013 |
+------------------------------------+
```


\section*{General-Purpose Keyring Function Reference}

For each general-purpose keyring function, this section describes its purpose, calling sequence, and return value. For information about the conditions under which these functions can be invoked, see Using General-Purpose Keyring Functions.
- keyring_key_fetch(key_id)

Given a key ID, deobfuscates and returns the key value.
Arguments:
- key_id: A string that specifies the key ID.

Return value:
Returns the key value as a string for success, NULL if the key does not exist, or NULL and an error for failure.

\section*{Note}

Key values retrieved using keyring_key_fetch() are subject to the general keyring function limits described in Section 8.4.4.10, "Supported Keyring Key Types and Lengths". A key value longer than that length can be stored using a keyring service function (see Section 7.6.9.2, "The Keyring Service"), but if retrieved using keyring_key_fetch( ) is truncated to the general keyring function limit.

Example:
```
mysql> SELECT keyring_key_generate('RSA_key', 'RSA', 16);
+----------------------------------------------+
```

```
| keyring_key_generate('RSA_key', 'RSA', 16) |
+----------------------------------------------
| 1 |
+----------------------------------------------+
mysql> SELECT HEX(keyring_key_fetch('RSA_key'));
+-------------------------------------+
| HEX(keyring_key_fetch('RSA_key')) |
+------------------------------------+
| 91C2253B696064D3556984B6630F891A |
+-------------------------------------+
mysql> SELECT keyring_key_type_fetch('RSA_key');
+------------------------------------+
| keyring_key_type_fetch('RSA_key') |
+------------------------------------+
| RSA |
+------------------------------------+
mysql> SELECT keyring_key_length_fetch('RSA_key');
+---------------------------------------+
| keyring_key_length_fetch('RSA_key') |
+--------------------------------------+
| 16 |
+--------------------------------------+
```


The example uses HEX( ) to display the key value because it may contain nonprintable characters. The example also uses a short key for brevity, but be aware that longer keys provide better security.
keyring_key_generate(key_id, key_type, key_length)
Generates a new random key with a given ID, type, and length, and stores it in the keyring. The type and length values must be consistent with the values supported by the underlying keyring plugin. See Section 8.4.4.10, "Supported Keyring Key Types and Lengths".

Arguments:
- key_id: A string that specifies the key ID.
- key_type: A string that specifies the key type.
- key_length: An integer that specifies the key length in bytes.

Return value:
Returns 1 for success, or NULL and an error for failure.
Example:
```
mysql> SELECT keyring_key_generate('RSA_key', 'RSA', 384);
+----------------------------------------------+
| keyring_key_generate('RSA_key', 'RSA', 384) |
+------------------------------------------------+
| +--------------------------------------------+
```

- keyring_key_length_fetch(key_id)

Given a key ID, returns the key length.
Arguments:
- key_id: A string that specifies the key ID.

Return value:
Returns the key length in bytes as an integer for success, NULL if the key does not exist, or NULL and an error for failure.

Example:

See the description of keyring_key_fetch().
- keyring_key_remove(key_id)

Removes the key with a given ID from the keyring.
Arguments:
- key_id: A string that specifies the key ID.

Return value:
Returns 1 for success, or NULL for failure.
Example:
```
mysql> SELECT keyring_key_remove('AES_key');
+---------------------------------+
| keyring_key_remove('AES_key') |
+--------------------------------+
| 1 |
+---------------------------------+
```

- keyring_key_store(key_id, key_type, key)

Obfuscates and stores a key in the keyring.
Arguments:
- key_id: A string that specifies the key ID.
- key_type: A string that specifies the key type.
- key: A string that specifies the key value.

Return value:
Returns 1 for success, or NULL and an error for failure.
Example:
```
mysql> SELECT keyring_key_store('new key', 'DSA', 'My key value');
+-------------------------------------------------------+
| keyring_key_store('new key', 'DSA', 'My key value') |
+-------------------------------------------------------
| 1 |
+-------------------------------------------------------
```

- keyring_key_type_fetch(key_id)

Given a key ID, returns the key type.
Arguments:
- key_id: A string that specifies the key ID.

Return value:
Returns the key type as a string for success, NULL if the key does not exist, or NULL and an error for failure.

Example:
See the description of keyring key fetch().

\subsection*{8.4.4.13 Plugin-Specific Keyring Key-Management Functions}

For each keyring plugin-specific function, this section describes its purpose, calling sequence, and return value. For information about general-purpose keyring functions, see Section 8.4.4.12, "GeneralPurpose Keyring Key-Management Functions".
- keyring_aws_rotate_cmk()

Associated keyring plugin: keyring_aws
keyring_aws_rotate_cmk ( ) rotates the AWS KMS key. Rotation changes only the key that AWS KMS uses for subsequent data key-encryption operations. AWS KMS maintains previous CMK versions, so keys generated using previous CMKs remain decryptable after rotation.

Rotation changes the CMK value used inside AWS KMS but does not change the ID used to refer to it, so there is no need to change the keyring_aws_cmk_id system variable after calling keyring_aws_rotate_cmk().

This function requires the SUPER privilege.
Arguments:
None.

Return value:
Returns 1 for success, or NULL and an error for failure.
- keyring_aws_rotate_keys()

Associated keyring plugin: keyring_aws
keyring_aws_rotate_keys() rotates keys stored in the keyring_aws storage file named by the keyring_aws_data_file system variable. Rotation sends each key stored in the file to AWS KMS for re-encryption using the value of the keyring_aws_cmk_id system variable as the CMK value, and stores the new encrypted keys in the file.
keyring_aws_rotate_keys ( ) is useful for key re-encryption under these circumstances:
- After rotating the CMK; that is, after invoking the keyring_aws_rotate_cmk( ) function.
- After changing the keyring_aws_cmk_id system variable to a different key value.

This function requires the SUPER privilege.
Arguments:
None.
Return value:
Returns 1 for success, or NULL and an error for failure.
- keyring_hashicorp_update_config()

Associated keyring plugin: keyring_hashicorp
When invoked, the keyring_hashicorp_update_config() function causes keyring_hashicorp to perform a runtime reconfiguration, as described in keyring_hashicorp Configuration.

This function requires the SYSTEM_VARIABLES_ADMIN privilege because it modifies global system variables.

Arguments:
None.
Return value:
Returns the string 'Configuration update was successful.' for success, or 'Configuration update failed.' for failure.

\subsection*{8.4.4.14 Keyring Metadata}

This section describes sources of information about keyring use.
To see whether a keyring plugin is loaded, check the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME LIKE 'keyring%';
+--------------+----------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+--------------+----------------+
| keyring_okv | ACTIVE |
+--------------+---------------+
```


To see which keys exist, check the Performance Schema keyring_keys table:
```
mysql> SELECT * FROM performance_schema.keyring_keys;
+-------------------------------+--------------+----------------

\begin{tabular}{|l|l|l|}
\hline KEY_ID & KEY_OWNER & BACKEND_KEY_ID | \\
\hline audit_log-20210322T130749-1 MyKey YourKey & me@localhost me@localhost & \\
\hline
\end{tabular}
```


To see whether a keyring component is loaded, check the Performance Schema keyring_component_status table. For example:
```
mysql> SELECT * FROM performance_schema.keyring_component_status;
+-----------------------+---------------------------------------------------
| STATUS_KEY | STATUS_VALUE |
+-----------------------+---------------------------------------------------
| Component_name | component_keyring_file
| Author | Oracle Corporation
| License | GPL
| Implementation_name | component_keyring_file
| Version | 1.0
| Component_status | Active
| Data_file | /usr/local/mysql/keyring/component_keyring_file
| Read_only | No | +
```


A Component_status value of Active indicates that the component initialized successfully. If the component loaded but failed to initialize, the value is Disabled.

\subsection*{8.4.4.15 Keyring Command Options}

MySQL supports the following keyring-related command-line options:
- --keyring-migration-destination=plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--keyring-migration- \\
destination=plugin_name
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

The destination keyring plugin or component for key migration. See Section 8.4.4.11, "Migrating Keys Between Keyring Keystores". The option value interpretation depends on whether --keyring-migration-to-component or--keyring-migration-from-component is specified:
- If --keyring-migration-to-component is used, the option value is a keyring plugin, interpreted the same way as for--keyring-migration-source.
- If --keyring-migration-to-component is used, the option value is a keyring component, specified as the component library name in the plugin directory, including any platform-specific extension such as . so or . dll.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1455.jpg?height=223&width=270&top_left_y=785&top_left_x=402)

\section*{Note}
--keyring-migration-source and --keyring-migrationdestination are mandatory for all keyring migration operations. The source and destination must differ, and the migration server must support both.
- --keyring-migration-from-component

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--keyring-migration-from- \\
component $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$
\end{tabular} \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Indicates that a key migration is from a keyring component to a keyring plugin. This option makes it possible to migrate keys from a keyring component to a keyring plugin.

For migration from a keyring plugin to a keyring component, use the --keyring-migration-to-component option. For key migration from one keyring component to another, use the mysql_migrate_keyring utility. See Section 8.4.4.11, "Migrating Keys Between Keyring Keystores".
- --keyring-migration-host=host_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- keyring-migration-host=host_name \\
\hline Type & String \\
\hline Default Value & localhost \\
\hline
\end{tabular}

The host location of the running server that is currently using one of the key migration keystores. See Section 8.4.4.11, "Migrating Keys Between Keyring Keystores". Migration always occurs on the local host, so the option always specifies a value for connecting to a local server, such as localhost, 127.0.0.1,: :1, or the local host IP address or host name.
- --keyring-migration-password[=password]

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--keyring-migration- \\
password[=password]
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

The password of the MySQL account used for connecting to the running server that is currently using one of the key migration keystores. See Section 8.4.4.11, "Migrating Keys Between Keyring Keystores".

The password value is optional. If not given, the server prompts for one. If given, there must be no space between --keyring-migration-password= and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. See Section 8.1.2.1, "End-User Guidelines for Password Security". You can use an option file to avoid giving the password on the command line. In this case, the file should have a restrictive mode and be accessible only to the account used to run the migration server.
- --keyring-migration-port=port_num

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-migration-port=port_num \\
\hline Type & Numeric \\
\hline Default Value & 3306 \\
\hline
\end{tabular}

For TCP/IP connections, the port number for connecting to the running server that is currently using one of the key migration keystores. See Section 8.4.4.11, "Migrating Keys Between Keyring Keystores".
- --keyring-migration-socket=path

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- - keyring-migration- \\
socket=\{file_name|pipe_name $\}$
\end{tabular} \\
\hline Type & String \\
\hline
\end{tabular}

For Unix socket file or Windows named pipe connections, the socket file or named pipe for connecting to the running server that is currently using one of the key migration keystores. See Section 8.4.4.11, "Migrating Keys Between Keyring Keystores".
- --keyring-migration-source=plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- - keyring-migration - \\
source=plugin_name
\end{tabular} \\
\hline Type & String \\
\hline
\end{tabular}

The source keyring plugin for key migration. See Section 8.4.4.11, "Migrating Keys Between Keyring Keystores".

The option value is similar to that for --plugin-load, except that only one plugin library can be specified. The value is given as plugin_library or name=plugin_library, where plugin_library is the name of a library file that contains plugin code, and name is the name of a plugin to load. If a plugin library is named without any preceding plugin name, the server loads all plugins in the library. With a preceding plugin name, the server loads only the named plugin from the library. The server looks for plugin library files in the directory named by the plugin_dir system variable.

\section*{Note}
--keyring-migration-source and --keyring-migrationdestination are mandatory for all keyring migration operations. The source and destination plugins must differ, and the migration server must support both plugins.
- --keyring-migration-to-component

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - keyring-migration-to- \\
component [=\{OFF|ON\}]
\end{tabular} \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Indicates that a key migration is from a keyring plugin to a keyring component. This option makes it possible to migrate keys from a keyring plugin to a keyring component.

For migration from a keyring component to a keyring plugin, use the --keyring-migration-from-component option. For key migration from one keyring component to another, use the mysql_migrate_keyring utility. See Section 8.4.4.11, "Migrating Keys Between Keyring Keystores".
- --keyring-migration-user=user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - keyring-migration-user=user_name \\
\hline Type & String \\
\hline
\end{tabular}

The user name of the MySQL account used for connecting to the running server that is currently using one of the key migration keystores. See Section 8.4.4.11, "Migrating Keys Between Keyring Keystores".

\subsection*{8.4.4.16 Keyring System Variables}

MySQL Keyring plugins support the following system variables. Use them to configure keyring plugin operation. These variables are unavailable unless the appropriate keyring plugin is installed (see Section 8.4.4.3, "Keyring Plugin Installation").
- keyring_aws_cmk_id

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-aws-cmk-id=value \\
\hline System Variable & keyring_aws_cmk_id \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The KMS key ID obtained from the AWS KMS server and used by the keyring_aws plugin. This variable is unavailable unless that plugin is installed.

This variable is mandatory. If not specified, keyring_aws initialization fails.
- keyring_aws_conf_file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-aws-conf-file=file_name \\
\hline System Variable & keyring_aws_conf_file \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & platform specific \\
\hline
\end{tabular}

The location of the configuration file for the keyring_aws plugin. This variable is unavailable unless that plugin is installed.

At plugin startup, keyring_aws reads the AWS secret access key ID and key from the configuration file. For the keyring_aws plugin to start successfully, the configuration file must exist and contain valid secret access key information, initialized as described in Section 8.4.4.7, "Using the keyring_aws Amazon Web Services Keyring Plugin".

The default file name is keyring_aws_conf, located in the default keyring file directory.
- keyring_aws_data_file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-aws-data-file \\
\hline System Variable & keyring_aws_data_file \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & platform specific \\
\hline
\end{tabular}

The location of the storage file for the keyring_aws plugin. This variable is unavailable unless that plugin is installed.

At plugin startup, if the value assigned to keyring_aws_data_file specifies a file that does not exist, the keyring_aws plugin attempts to create it (as well as its parent directory, if necessary). If the file does exist, keyring_aws reads any encrypted keys contained in the file into its in-memory cache. keyring_aws does not cache unencrypted keys in memory.

The default file name is keyring_aws_data, located in the default keyring file directory.
- keyring_aws_region

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-aws-region=value \\
\hline System Variable & keyring_aws_region \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & us-east-1 \\
\hline Valid Values & \begin{tabular}{l}
af-south-1 \\
ap-east-1 \\
ap-northeast-1 \\
ap-northeast-2 \\
ap-northeast-3 \\
ap-south-1 \\
ap-southeast-1 \\
ap-southeast-2
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline & \begin{tabular}{l}
ca-central-1 \\
cn-north-1 \\
cn-northwest-1 \\
eu-central-1 \\
eu-north-1 \\
eu-south-1 \\
eu-west-1 \\
eu-west-2 \\
eu-west-3 \\
me-south-1 \\
sa-east-1 \\
us-east-1 \\
us-east-2 \\
us-gov-east-1 \\
us-iso-east-1 \\
us-iso-west-1 \\
us-isob-east-1 \\
us-west-1 \\
us-west-2
\end{tabular} \\
\hline
\end{tabular}

The AWS region for the keyring_aws plugin. This variable is unavailable unless that plugin is installed.

If not set, the AWS region defaults to us-east-1. Thus, for any other region, this variable must be set explicitly.
- keyring_hashicorp_auth_path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-hashicorp-auth-path=value \\
\hline System Variable & keyring_hashicorp_auth_path \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & /v1/auth/approle/login \\
\hline
\end{tabular}

The authentication path where AppRole authentication is enabled within the HashiCorp Vault server, for use by the keyring_hashicorp plugin. This variable is unavailable unless that plugin is installed.
- keyring_hashicorp_ca_path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-hashicorp-capath=file_name \\
\hline System Variable & keyring_hashicorp_ca_path \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & empty string \\
\hline
\end{tabular}

The absolute path name of a local file accessible to the MySQL server that contains a properly formatted TLS certificate authority for use by the keyring_hashicorp plugin. This variable is unavailable unless that plugin is installed.

If this variable is not set, the keyring_hashicorp plugin opens an HTTPS connection without using server certificate verification, and trusts any certificate delivered by the HashiCorp Vault server. For this to be safe, it must be assumed that the Vault server is not malicious and that no man-in-themiddle attack is possible. If those assumptions are invalid, set keyring_hashicorp_ca_path to the path of a trusted CA certificate. (For example, for the instructions in Certificate and Key Preparation, this is the company.crt file.)
- keyring_hashicorp_caching

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-hashicorp-caching[=\{0FF| ON\}] \\
\hline System Variable & keyring_hashicorp_caching \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Whether to enable the optional in-memory key cache used by the keyring_hashicorp plugin to cache keys from the HashiCorp Vault server. This variable is unavailable unless that plugin is installed. If the cache is enabled, the plugin populates it during initialization. Otherwise, the plugin populates only the key list during initialization.

Enabling the cache is a compromise: It improves performance, but maintains a copy of sensitive key information in memory, which may be undesirable for security purposes.
- keyring_hashicorp_commit_auth_path

\begin{tabular}{|l|l|}
\hline System Variable & keyring_hashicorp_commit_auth_path \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable is associated with keyring_hashicorp_auth_path, from which it takes its value during keyring_hashicorp plugin initialization. This variable is unavailable unless that plugin is installed. It reflects the "committed" value actually used for plugin operation if initialization succeeds. For additional information, see keyring_hashicorp Configuration.
- keyring_hashicorp_commit_ca_path

\begin{tabular}{|l|l|}
\hline System Variable & keyring_hashicorp_commit_ca_path \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable is associated with keyring_hashicorp_ca_path, from which it takes its value during keyring_hashicorp plugin initialization. This variable is unavailable unless that plugin is installed. It reflects the "committed" value actually used for plugin operation if initialization succeeds. For additional information, see keyring_hashicorp Configuration.
- keyring_hashicorp_commit_caching

\begin{tabular}{|l|l|}
\hline System Variable & keyring_hashicorp_commit_caching \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable is associated with keyring_hashicorp_caching, from which it takes its value during keyring_hashicorp plugin initialization. This variable is unavailable unless that plugin is installed. It reflects the "committed" value actually used for plugin operation if initialization succeeds. For additional information, see keyring_hashicorp Configuration.
- keyring_hashicorp_commit_role_id

\begin{tabular}{|l|l|}
\hline System Variable & keyring_hashicorp_commit_role_id \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable is associated with keyring_hashicorp_role_id, from which it takes its value during keyring_hashicorp plugin initialization. This variable is unavailable unless that plugin is installed. It reflects the "committed" value actually used for plugin operation if initialization succeeds. For additional information, see keyring_hashicorp Configuration.
- keyring_hashicorp_commit_server_url

\begin{tabular}{|l|l|}
\hline System Variable & keyring_hashicorp_commit_server_url \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable is associated with keyring_hashicorp_server_url, from which it takes its value during keyring_hashicorp plugin initialization. This variable is unavailable unless that plugin is installed. It reflects the "committed" value actually used for plugin operation if initialization succeeds. For additional information, see keyring_hashicorp Configuration.
- keyring_hashicorp_commit_store_path

\begin{tabular}{|l|l|}
\hline System Variable & keyring_hashicorp_commit_store_path \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable is associated with keyring_hashicorp_store_path, from which it takes its value during keyring_hashicorp plugin initialization. This variable is unavailable unless that plugin is installed. It reflects the "committed" value actually used for plugin operation if initialization succeeds. For additional information, see keyring_hashicorp Configuration.
- keyring_hashicorp_role_id

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-hashicorp-role-id=value \\
\hline System Variable & keyring_hashicorp_role_id \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & empty string \\
\hline
\end{tabular}

The HashiCorp Vault AppRole authentication role ID, for use by the keyring_hashicorp plugin. This variable is unavailable unless that plugin is installed. The value must be in UUID format.

This variable is mandatory. If not specified, keyring_hashicorp initialization fails.
- keyring_hashicorp_secret_id

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-hashicorp-secret-id=value \\
\hline System Variable & keyring_hashicorp_secret_id \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & empty string \\
\hline
\end{tabular}

The HashiCorp Vault AppRole authentication secret ID, for use by the keyring_hashicorp plugin. This variable is unavailable unless that plugin is installed. The value must be in UUID format.

This variable is mandatory. If not specified, keyring_hashicorp initialization fails.
The value of this variable is sensitive, so its value is masked by * characters when displayed.
- keyring_hashicorp_server_url

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-hashicorp-server-url=value \\
\hline System Variable & keyring_hashicorp_server_url \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline Default Value & https://127.0.0.1:8200 \\
\hline
\end{tabular}

The HashiCorp Vault server URL, for use by the keyring_hashicorp plugin. This variable is unavailable unless that plugin is installed. The value must begin with https://.
- keyring_hashicorp_store_path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-hashicorp-store-path=value \\
\hline System Variable & keyring_hashicorp_store_path \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & empty string \\
\hline
\end{tabular}

A store path within the HashiCorp Vault server that is writeable when appropriate AppRole credentials are provided by the keyring_hashicorp plugin. This variable is unavailable unless that plugin is installed. To specify the credentials, set the keyring_hashicorp_role_id and keyring_hashicorp_secret_id system variables (for example, as shown in keyring_hashicorp Configuration).

This variable is mandatory. If not specified, keyring_hashicorp initialization fails.
- keyring_okv_conf_dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keyring-okv-conf-dir=dir_name \\
\hline System Variable & keyring_okv_conf_dir \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & empty string \\
\hline
\end{tabular}

The path name of the directory that stores configuration information used by the keyring_okv plugin. This variable is unavailable unless that plugin is installed. The location should be a directory considered for use only by the keyring_okv plugin. For example, do not locate the directory under the data directory.

The default keyring_okv_conf_dir value is empty. For the keyring_okv plugin to be able to access Oracle Key Vault, the value must be set to a directory that contains Oracle Key Vault configuration and SSL materials. For instructions on setting up this directory, see Section 8.4.4.6, "Using the keyring_okv KMIP Plugin".

The directory should have a restrictive mode and be accessible only to the account used to run the MySQL server. For example, on Unix and Unix-like systems, to use the /usr/local/mysql/ mysql-keyring-okv directory, the following commands (executed as root) create the directory and set its mode and ownership:
```
cd /usr/local/mysql
mkdir mysql-keyring-okv
chmod 750 mysql-keyring-okv
chown mysql mysql-keyring-okv
```

chgrp mysql mysql-keyring-okv
If the value assigned to keyring_okv_conf_dir specifies a directory that does not exist, or that does not contain configuration information that enables a connection to Oracle Key Vault to be established, keyring_okv writes an error message to the error log. If an attempted runtime assignment to keyring_okv_conf_dir results in an error, the variable value and keyring operation remain unchanged.
- keyring_operations

\begin{tabular}{|l|l|}
\hline System Variable & keyring_operations \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Whether keyring operations are enabled. This variable is used during key migration operations. See Section 8.4.4.11, "Migrating Keys Between Keyring Keystores". The privileges required to modify this variable are ENCRYPTION_KEY_ADMIN in addition to either SYSTEM_VARIABLES_ADMIN or the deprecated SUPER privilege.

\subsection*{8.4.5 MySQL Enterprise Audit}

> Note
> MySQL Enterprise Audit is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, see https:// www.mysql.com/products/.

MySQL Enterprise Edition includes MySQL Enterprise Audit, implemented using a server plugin named audit_log. MySQL Enterprise Audit uses the open MySQL Audit API to enable standard, policybased monitoring, logging, and blocking of connection and query activity executed on specific MySQL servers. Designed to meet the Oracle audit specification, MySQL Enterprise Audit provides an out of box, easy to use auditing and compliance solution for applications that are governed by both internal and external regulatory guidelines.

When installed, the audit plugin enables MySQL Server to produce a log file containing an audit record of server activity. The log contents include when clients connect and disconnect, and what actions they perform while connected, such as which databases and tables they access. You can add statistics for the time and size of each query to detect outliers.

By default, MySQL Enterprise Audit uses tables in the mysql system database for persistent storage of filter and user account data. To use a different database, set the audit_log_database system variable at server startup.

After you install the audit plugin (see Section 8.4.5.2, "Installing or Uninstalling MySQL Enterprise Audit"), it writes an audit log file. By default, the file is named audit. log in the server data directory. To change the name of the file, set the audit_log_file system variable at server startup.

By default, audit log file contents are written in new-style XML format, without compression or encryption. To select the file format, set the audit_log_format system variable at server startup. For details on file format and contents, see Section 8.4.5.4, "Audit Log File Formats".

For more information about controlling how logging occurs, including audit log file naming and format selection, see Section 8.4.5.5, "Configuring Audit Logging Characteristics". To perform filtering of audited events, see Section 8.4.5.7, "Audit Log Filtering". For descriptions of the parameters used to configure the audit log plugin, see Audit Log Options and Variables.

If the audit log plugin is enabled, the Performance Schema (see Chapter 29, MySQL Performance Schema) has instrumentation for it. To identify the relevant instruments, use this query:
```
SELECT NAME FROM performance_schema.setup_instruments
WHERE NAME LIKE '%/alog/%';
```


\subsection*{8.4.5.1 Elements of MySQL Enterprise Audit}

MySQL Enterprise Audit is based on the audit log plugin and related elements:
- A server-side plugin named audit_log examines auditable events and determines whether to write them to the audit log.
- A set of functions enables manipulation of filtering definitions that control logging behavior, the encryption password, and log file reading.
- Tables in the mysql system database provide persistent storage of filter and user account data, unless you set the audit_log_database system variable at server startup to specify a different database.
- System variables enable audit log configuration and status variables provide runtime operational information.
- The AUDIT_ADMIN privilege enable users to administer the audit log, and the AUDIT_ABORT_EXEMPT privilege enables system users to execute queries that would otherwise be blocked by an "abort" item in the audit log filter.

\subsection*{8.4.5.2 Installing or Uninstalling MySQL Enterprise Audit}

This section describes how to install or uninstall MySQL Enterprise Audit, which is implemented using the audit log plugin and related elements described in Section 8.4.5.1, "Elements of MySQL Enterprise Audit". For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

Plugin upgrades are not automatic when you upgrade a MySQL installation and some plugin loadable functions must be loaded manually (see Installing Loadable Functions). Alternatively, you can reinstall the plugin after upgrading MySQL to load new functions.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1465.jpg?height=127&width=111&top_left_y=1781&top_left_x=360)

\section*{Important}

Read this entire section before following its instructions. Parts of the procedure differ depending on your environment.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1465.jpg?height=127&width=99&top_left_y=1987&top_left_x=370)

