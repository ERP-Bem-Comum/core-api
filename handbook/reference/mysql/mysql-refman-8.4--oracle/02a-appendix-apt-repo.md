\section*{Appendix A: Adding and Configuring the MySQL APT Repository Manually}

Here are the steps for adding manually the MySQL APT repository to your system's software repository list and configuring it, without using the release packages provided by MySQL:
- Download the MySQL GPG Public key (see Section 2.1.4.2, "Signature Checking Using GnuPG" on how to do that) and save it to a file, without adding any spaces or special characters. Then, add the key to your system's GPG keyring with the following command:
```
$> sudo apt-key add path/to/signature-file
```

- Alternatively, you can download the GPG key to your APT keyring directly using the apt-key utility:
```
$> sudo apt-key adv --keyserver pgp.mit.edu --recv-keys A8D3785C
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0167.jpg?height=122&width=97&top_left_y=1274&top_left_x=404)

\section*{Note}

The KeyID for MySQL 8.0.36 and later release packages is A8D3785C, as shown above. For earlier MySQL releases, the keyID is 3A79BD29. Using an incorrect key can cause a key verification error.
- Create a file named /etc/apt/sources.list.d/mysql.list, and put into it repository entries in the following format (this is not a command to execute):
```
deb http://repo.mysql.com/apt/{debian|ubuntu}/ {bookworm|jammy} {mysql-tools|mysql-8.4-lts|mysql-8.0}
```


Pick the relevant options for your repository set up:
- Choose "debian" or "ubuntu" according to your platform.
- Choose the appropriate version name for the version of your system; examples include "bookworm" (for Debian 12) and "jammy" (for Ubuntu 22.04).
- For installing the MySQL server, client, and database common files, choose "mysql-8.4", "mysql-8.0", or "mysql-innovation" according to the MySQL series you want. To switch to another release series later, come back and adjust the entry with your new choice. This also includes access to tools such as MySQL Router and MySQL Shell.

\section*{Note}

If you already have a version of MySQL installed on your system, do not choose a lower version at this step, or it might result in an unsupported downgrade operation.
- Include "mysql-tools" to install a connector.

For example, on the Ubuntu 22.04 platform use these lines in your mysql. list files to install MySQL 8.4 and the latest MySQL Connectors from the MySQL APT repository:
```
deb http://repo.mysql.com/apt/ubuntu/ jammy mysql-8.4 mysql-tools
```

- Use the following command to get the most up-to-date package information from the MySQL APT repository:
```
sudo apt-get update
```


You have configured your system to use the MySQL APT repository and are now ready to continue with Installing MySQL with APT or Installing Additional MySQL Products and Components with APT.

\subsection*{2.5.3 Using the MySQL SLES Repository}

The MySQL SLES repository provides RPM packages for installing and managing the MySQL server, client, and other components on SUSE Enterprise Linux Server. This section contains information on obtaining and installing these packages.

\section*{Adding the MySQL SLES Repository}

Add or update the official MySQL SLES repository for your system's repository list:

\section*{Note}

The beginning part of the configuration file name, such as mysql84, describes the default MySQL series that is enabled for installation. In this case, the subrepository for MySQL 8.4 LTS is enabled by default. It also contains other subrepository versions, such as MySQL 8.0 and the MySQL Innovation Series.

\section*{New MySQL Repository Installation}

If the MySQL repository is not yet present on the system then:
1. Go to the download page for MySQL SLES repository at https://dev.mysql.com/downloads/repo/ susel.
2. Select and download the release package for your SLES version.
3. Install the downloaded release package with the following command, replacing package-name with the name of the downloaded package:
```
$> sudo rpm -Uvh package-name.rpm
```


For example, to install the SLES 15 package where \# indicates the release number within a version such as 15-1:
```
$> sudo rpm -Uvh mysql84-community-release-sl15-#.noarch.rpm
```


\section*{Update an Existing MySQL Repository Installation}

If an older version is already present then update it:
- \$> sudo zypper update mysql84-community-release
- Although this is not required for each MySQL release, it does update MySQL repository information to include the current information. For example, mysql84-community-release-sl15-7. noarch. rpm is the first SUSE 15 repository configuration file that adds the innovation release track that begins with MySQL 8.1. series.

\section*{Selecting a Release Series}

Within the MySQL SLES repository, different release series of the MySQL Community Server are hosted in different subrepositories. The subrepository for the latest bugfix series (currently MySQL 8.4) is enabled by default, and the subrepositories for all other series are disabled. Use this command to see all of the subrepositories in the MySQL SLES repository, and to see which of them are enabled or disabled:
```
$> zypper repos | grep mysql.*community
```


The innovation track is available for SLES 15 with entries such as mysql-innovation-community.
To install the latest release from a specific series, before running the installation command, make sure that the subrepository for the series you want is enabled and the subrepositories for other series are disabled. For example, on SLES 15, to disable the subrepositories for MySQL 8.4 server and tools, which are enabled by default, use the following:
```
$> sudo zypper modifyrepo -d mysql-8.4-lts-community
$> sudo zypper modifyrepo -d mysql-tools-community
```


Then, enable the subrepositories for the release series you want. For example, to enable the Innovation track on SLES 15:
```
$> sudo zypper modifyrepo -e mysql-innovation-community
$> sudo zypper modifyrepo -e mysql-tools-innovation-community
```


You should only enable a subrepository for one release series at any time.
Verify that the correct subrepositories have been enabled by running the following command and checking its output:
```
zypper repos -E | grep mysql.*community
| mysql-connectors-community | MySQL Connectors Community | Yes
| mysql-innovation-community | MySQL Innovation Release Community Server
| mysql-tools
| mysql-tools-innovation-community | MySQL Tools Innovation Community | Yes | (p) Ye
```


After that, use the following command to refresh the repository information for the enabled subrepository:
```
sudo zypper refresh
```


\section*{Installing MySQL with Zypper}

With the official MySQL repository enabled, install MySQL Server:
```
sudo zypper install mysql-community-server
```


This installs the package for the MySQL server, as well as other required packages.

\section*{Starting the MySQL Server}

Start the MySQL server with the following command:
```
$> systemctl start mysql
```


You can check the status of the MySQL server with the following command:
```
$> systemctl status mysql
```


If the operating system is systemd enabled, standard systemctl (or alternatively, service with the arguments reversed) commands such as stop, start, status, and restart should be used to manage the MySQL server service. The mysql service is enabled by default, and it starts at system reboot. See Section 2.5.9, "Managing MySQL Server with systemd" for additional information.

MySQL Server Initialization: When the server is started for the first time, the server is initialized, and the following happens (if the data directory of the server is empty when the initialization process begins):
- The SSL certificate and key files are generated in the data directory.
- The validate_password plugin is installed and enabled.
- A superuser account 'root'@'localhost' is created. A password for the superuser is set and stored in the error log file. To reveal it, use the following command:
```
$> sudo grep 'temporary password' /var/log/mysql/mysqld.log
```


Change the root password as soon as possible by logging in with the generated, temporary password and set a custom password for the superuser account:
```
$> mysql -uroot -p
mysql> ALTER USER 'root'@'localhost' IDENTIFIED BY 'MyNewPass4!';
```


\section*{Note}

MySQL's validate_password plugin is installed by default. This will require that passwords contain at least one uppercase letter, one lowercase letter, one digit, and one special character, and that the total password length is at least 8 characters.

You can stop the MySQL Server with the following command:
```
sudo systemctl stop mysql
```


\section*{Installing Additional MySQL Products and Components}

You can install more components of MySQL. List subrepositories in the MySQL SLES repository with the following command:
```
$> zypper repos | grep mysql.*community
```


Use the following command to list the packages for the MySQL components available for a certain subrepository, changing subrepo-name to the name of the subrepository you are interested in :
```
$> zypper packages subrepo-name
```


Install any packages of your choice with the following command, replacing package-name with name of the package (you might need to enable first the subrepository for the package, using the same method for selecting a subrepository for a specific release series outlined in Selecting a Release Series):
```
$> sudo zypper install package-name
```


For example, to install the MySQL benchmark suite from the subrepository for the release series you have already enabled:
```
$> sudo zypper install mysql-community-bench
```


\section*{Upgrading MySQL with the MySQL SLES Repository}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0170.jpg?height=122&width=95&top_left_y=2001&top_left_x=310)

\section*{Note}
- Before performing any update to MySQL, follow carefully the instructions in Chapter 3, Upgrading MySQL. Among other instructions discussed there, it is especially important to back up your database before the update.

Use the MySQL SLES repository to perform an in-place update (that is, replacing the old version of the server and then running the new version using the old data files) for your MySQL installation by following these steps (they assume you have installed MySQL with the MySQL SLES repository; if that is not the case, following the instructions in Replacing MySQL Installed by an RPM from Other Sources instead):

\section*{Selectingla Target Series}

During an update operation, by default, the MySQL SLES repository updates MySQL to the latest version in the release series you have chosen during installation (see Selecting a Release Series
for details), which means. For example, a bugfix series installation, such as 8.4 , will not update to an innovation series, such as 9.6. To update to another release series, you need to first disable the subrepository for the series that has been selected (by default, or by yourself) and enable the subrepository for your target series. To do that, follow the general instructions given in Selecting a Release Series.

As a general rule, to upgrade from one release series to another, go to the next series rather than skipping a series.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0171.jpg?height=102&width=104&top_left_y=632&top_left_x=420)

\section*{Important}

In-place downgrading of MySQL is not supported by the MySQL SLES repository. Follow the instructions in Chapter 4, Downgrading MySQL.

\section*{Upgrading MySQL}

Upgrade MySQL and its components by the following command:
```
$> sudo zypper update mysql-community-server
```


Alternatively, you can update MySQL by telling Zypper to update everything on your system (this might take considerably more time):
```
$> sudo zypper update
```


You can also update a specific component only. Use the following command to list all the installed packages from the MySQL SLES repository:
```
$> zypper packages -i | grep mysql-.*community
```


After identifying the package name of the component of your choice, update the package with the following command, replacing package-name with the name of the package:
```
$> sudo zypper update package-name
```


\section*{Replacing MySQL Installed by an RPM from Other Sources}

RPMs for installing the MySQL Community Server and its components can be downloaded from MySQL either from the MySQL Developer Zone, from the native software repository of SLES, or from the MySQL SLES repository. The RPMs from the those sources might be different, and they might install and configure MySQL in different ways.

If you have installed MySQL with RPMs from the MySQL Developer Zone or the native software repository of SLES and want to replace the installation using the RPM from the MySQL SLES repository, follow these steps:
1. Back up your database to avoid data loss. See Chapter 9, Backup and Recovery on how to do that.
2. Stop your MySQL Server, if it is running. If the server is running as a service, you can stop it with the following command:
```
$> systemctl stop mysql
```

3. Follow the steps given for Adding the MySQL SLES Repository.
4. Follow the steps given for Selecting a Release Series.
5. Follow the steps given for Installing MySQL with Zypper. You will be asked if you want to replace the old packages with the new ones; for example:
```
Problem: mysql-community-server-5.6.22-2.sles11.x86_64 requires mysql-community-client = 5.6.22-2.s-
    but this requirement cannot be provided uninstallable providers:
    mysql-community-client-5.6.22-2.sles11.x86_64[mysql56-community]
```

```
Solution 1: replacement of mysql-client-5.5.31-0.7.10.x86_64 with mysql-community-client-5.6.22-2.sles
Solution 2: do not install mysql-community-server-5.6.22-2.sles11.x86_64
Solution 3: break mysql-community-server-5.6.22-2.sles11.x86_64 by ignoring some of its dependencies
Choose from above solutions by number or cancel [1/2/3/c] (c)
```


Choose the "replacement" option ("Solution 1" in the example) to finish your installation from the MySQL SLES repository.

\section*{Installing MySQL NDB Cluster Using the SLES Repository}
- The following instructions assume that neither the MySQL Server nor MySQL NDB Cluster has already been installed on your system; if that is not the case, remove the MySQL Server or MySQL NDB Cluster, including all its executables, libraries, configuration files, log files, and data directories, before you continue. However there is no need to remove the release package you might have used to enable the MySQL SLES repository on your system.
- The NDB Cluster Auto-Installer package has a dependency on the python2-crypto and pythonparamiko packages. Zypper can take care of this dependency if the Python repository has been enabled on your system.

\section*{Selecting the MySQL NDB Cluster Subrepository}

Within the MySQL SLES repository, the MySQL Community Server and MySQL NDB Cluster are hosted in different subrepositories. By default, the subrepository for the latest bugfix series of the MySQL Server is enabled and the subrepository for MySQL NDB Cluster is disabled. To install NDB Cluster, disable the subrepository for the MySQL Server and enable the subrepository for NDB Cluster. For example, disable the subrepository for MySQL 8.4, which is enabled by default, with the following command:
```
$> sudo zypper modifyrepo -d mysql-8.4-lts-community
```


Then, enable the subrepository for MySQL NDB Cluster:
```
$> sudo zypper modifyrepo -e mysql-cluster-8.4-community
```


Verify that the correct subrepositories have been enabled by running the following command and checking its output:
```
zypper repos -E | grep mysql.*community
| mysql-cluster-8.4-community | MySQL Cluster 8.4 Community | Yes | No
```


After that, use the following command to refresh the repository information for the enabled subrepository:
```
sudo zypper refresh
```


\section*{Installing MySQL NDB Cluster}

For a minimal installation of MySQL NDB Cluster, follow these steps:
- Install the components for SQL nodes:
```
$> sudo zypper install mysql-cluster-community-server
```


After the installation is completed, start and initialize the SQL node by following the steps given in Starting the MySQL Server.

If you choose to initialize the data directory manually using the mysqld --initialize command (see Section 2.9.1, "Initializing the Data Directory" for details), a root password is going to be generated and stored in the SQL node's error log; see Starting the MySQL Server for how to find the password, and for a few things you need to know about it.
- Install the executables for management nodes:
```
$> sudo zypper install mysql-cluster-community-management-server
```

- Install the executables for data nodes:
```
sudo zypper install mysql-cluster-community-data-node
```


To install more NDB Cluster components, see Installing Additional MySQL Products and Components.
See Section 25.3.3, "Initial Configuration of NDB Cluster" on how to configure MySQL NDB Cluster and Section 25.3.4, "Initial Startup of NDB Cluster" on how to start it for the first time.

\section*{Installing Additional MySQL NDB Cluster Products and Components}

You can use Zypper to install individual components and additional products of MySQL NDB Cluster from the MySQL SLES repository. To do that, assuming you already have the MySQL SLES repository on your system's repository list (if not, follow Step 1 and 2 of Installing MySQL NDB Cluster Using the SLES Repository), follow the same steps given in Installing Additional MySQL NDB Cluster Products and Components.
```
Note
Known issue: Currently, not all components required for running the MySQL NDB Cluster test suite are installed automatically when you install the test suite package (mysql-cluster-community-test). Install the following packages with zypper install before you run the test suite:
- mysql-cluster-community-auto-installer
- mysql-cluster-community-management-server
- mysql-cluster-community-data-node
- mysql-cluster-community-memcached
- mysql-cluster-community-java
- mysql-cluster-community-ndbclient-devel
```


\subsection*{2.5.4 Installing MySQL on Linux Using RPM Packages from Oracle}

The recommended way to install MySQL on RPM-based Linux distributions is by using the RPM packages provided by Oracle. There are two sources for obtaining them, for the Community Edition of MySQL:
- From the MySQL software repositories:
- The MySQL Yum repository (see Section 2.5.1, "Installing MySQL on Linux Using the MySQL Yum Repository" for details).
- The MySQL SLES repository (see Section 2.5.3, "Using the MySQL SLES Repository" for details).
- From the Download MySQL Community Server page in the MySQL Developer Zone.

\section*{Note}

RPM distributions of MySQL are also provided by other vendors. Be aware that they may differ from those built by Oracle in features, capabilities, and conventions (including communication setup), and that the installation instructions in this manual do not necessarily apply to them. The vendor's instructions should be consulted instead.

\section*{MySQL RPM Packages}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.10 RPM Packages for MySQL Community Edition}
\begin{tabular}{|l|l|}
\hline Package Name & Summary \\
\hline mysql-community-client & MySQL client applications and tools \\
\hline mysql-community-client-plugins & Shared plugins for MySQL client applications \\
\hline mysql-community-common & Common files for server and client libraries \\
\hline mysql-community-devel & Development header files and libraries for MySQL database client applications \\
\hline mysql-community-embedded-compat & MySQL server as an embedded library with compatibility for applications using version 18 of the library \\
\hline mysql-community-icu-data-files & MySQL packaging of ICU data files needed by MySQL regular expressions \\
\hline mysql-community-libs & Shared libraries for MySQL database client applications \\
\hline mysql-community-libs-compat & Shared compatibility libraries for previous MySQL installations; only present if previous MySQL versions are supported by the platform \\
\hline mysql-community-server & Database server and related tools \\
\hline mysql-community-server-debug & Debug server and plugin binaries \\
\hline mysql-community-test & Test suite for the MySQL server \\
\hline mysql-community & The source code RPM looks similar to mysql-community-8.4.9-1.el7.src.rpm, depending on selected OS \\
\hline Additional *debuginfo* RPMs & There are several debuginfo packages: mysql-community-client-debuginfo, mysql-community-libs-debuginfo mysql-community-server-debugdebuginfo mysql-community-server-debuginfo, and mysql-community-test-debuginfo. \\
\hline
\end{tabular}
\end{table}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.11 RPM Packages for the MySQL Enterprise Edition}
\begin{tabular}{|l|l|}
\hline Package Name & Summary \\
\hline mysql-commercial-backup & MySQL Enterprise Backup \\
\hline mysql-commercial-client & MySQL client applications and tools \\
\hline mysql-commercial-client-plugins & Shared plugins for MySQL client applications \\
\hline mysql-commercial-common & Common files for server and client libraries \\
\hline mysql-commercial-devel & Development header files and libraries for MySQL database client applications \\
\hline mysql-commercial-embedded-compat & MySQL server as an embedded library with compatibility for applications using version 18 of the library \\
\hline mysql-commercial-icu-data-files & MySQL packaging of ICU data files needed by MySQL regular expressions \\
\hline mysql-commercial-libs & Shared libraries for MySQL database client applications \\
\hline mysql-commercial-libs-compat & Shared compatibility libraries for previous MySQL installations; only present if previous MySQL \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Package Name & Summary \\
\hline & versions are supported by the platform. The version of the libraries matches the version of the libraries installed by default by the distribution you are using. \\
\hline mysql-commercial-server & Database server and related tools \\
\hline mysql-commercial-test & Test suite for the MySQL server \\
\hline Additional *debuginfo* RPMs & There are several debuginfo packages: mysql-commercial-client-debuginfo, mysql-commercial-libs-debuginfo mysql-commercial-server-debugdebuginfo mysql-commercial-server-debuginfo, and mysql-commercial-test-debuginfo. \\
\hline
\end{tabular}

The full names for the RPMs have the following syntax:
packagename-version-distribution-arch.rpm
The distribution and arch values indicate the Linux distribution and the processor type for which the package was built. See the table below for lists of the distribution identifiers:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.12 MySQL Linux RPM Package Distribution Identifiers}
\begin{tabular}{|l|l|}
\hline Distribution Value & Intended Use \\
\hline el\{version\} where \{version\} is the major Enterprise Linux version, such as el8 & EL6 (8.0), EL7, EL8, EL9, and EL10-based platforms (for example, the corresponding versions of Oracle Linux, Red Hat Enterprise Linux, and CentOS) \\
\hline fc\{version\} where \{version\} is the major Fedora version, such as fc37 & Fedora 41 and 42 \\
\hline sl5 & SUSE Linux Enterprise Server 15 \\
\hline
\end{tabular}
\end{table}

To see all files in an RPM package (for example, mysql-community-server), use the following command:
\$> rpm -qpl mysql-community-server-version-distribution-arch.rpm
The discussion in the rest of this section applies only to an installation process using the RPM packages directly downloaded from Oracle, instead of through a MySQL repository.

Dependency relationships exist among some of the packages. If you plan to install many of the packages, you may wish to download the RPM bundle tar file instead, which contains all the RPM packages listed above, so that you need not download them separately.

In most cases, you need to install the mysql-community-server, mysql-community-client, mysql-community-client-plugins, mysql-community-libs, mysql-community-icu-data-files, mysql-community-common, and mysql-community-libs-compat packages to get a functional, standard MySQL installation. To perform such a standard, basic installation, go to the folder that contains all those packages (and, preferably, no other RPM packages with similar names), and issue the following command:
\$> sudo yum install mysql-community-\{server,client,client-plugins,icu-data-files,common,libs\}-*
Replace yum with zypper for SLES, and with dnf for Fedora.
While it is much preferable to use a high-level package management tool like yum to install the packages, users who prefer direct rpm commands can replace the yum install command with the rpm -Uvh command; however, using rpm -Uvh instead makes the installation process more prone to failure, due to potential dependency issues the installation process might run into.

To install only the client programs, you can skip mysql-community-server in your list of packages to install; issue the following command:
```
$> sudo yum install mysql-community-{client,client-plugins,common,libs}-*
```


Replace yum with zypper for SLES, and with dnf for Fedora.
A standard installation of MySQL using the RPM packages result in files and resources created under the system directories, shown in the following table.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.13 MySQL Installation Layout for Linux RPM Packages from the MySQL Developer Zone}
\begin{tabular}{|l|l|}
\hline Files or Resources & Location \\
\hline Client programs and scripts & /usr/bin \\
\hline mysqld server & /usr/sbin \\
\hline Configuration file & /etc/my.cnf \\
\hline Data directory & /var/lib/mysql \\
\hline Error log file & \begin{tabular}{l}
For RHEL, Oracle Linux, CentOS or Fedora platforms: /var/log/mysqld.log \\
For SLES: /var/log/mysql/mysqld.log
\end{tabular} \\
\hline Value of secure_file_priv & /var/lib/mysql-files \\
\hline System V init script & \begin{tabular}{l}
For RHEL, Oracle Linux, CentOS or Fedora platforms: /etc/init.d/mysqld \\
For SLES: /etc/init.d/mysql
\end{tabular} \\
\hline Systemd service & \begin{tabular}{l}
For RHEL, Oracle Linux, CentOS or Fedora platforms: mysqld \\
For SLES: mysql
\end{tabular} \\
\hline Pid file & /var/run/mysql/mysqld.pid \\
\hline Socket & /var/lib/mysql/mysql.sock \\
\hline Keyring directory & /var/lib/mysql-keyring \\
\hline Unix manual pages & /usr/share/man \\
\hline Include (header) files & /usr/include/mysql \\
\hline Libraries & /usr/lib/mysql \\
\hline Miscellaneous support files (for example, error messages, and character set files) & /usr/share/mysql \\
\hline
\end{tabular}
\end{table}

The installation also creates a user named mysql and a group named mysql on the system.

\section*{Notes}
- The mysql user is created using the -r and $-\mathrm{s} / \mathrm{bin} / \mathrm{false}$ options of the useradd command, so that it does not have login permissions to your server host (see Creating the mysql User and Group for details). To switch to the mysql user on your OS, use the --shell=/bin/bash option for the su command:
```
$> su - mysql --shell=/bin/bash
```

- Installation of previous versions of MySQL using older packages might have created a configuration file named /usr/my.cnf. It is highly recommended that you examine the contents of the file and migrate the desired settings inside to the file /etc/my.cnf file, then remove /usr/my.cnf.

MySQL is NOT automatically started at the end of the installation process. For Red Hat Enterprise Linux, Oracle Linux, CentOS, and Fedora systems, use the following command to start MySQL:
```
$> systemctl start mysqld
```


For SLES systems, the command is the same, but the service name is different:
```
$> systemctl start mysql
```


If the operating system is systemd enabled, standard systemctl (or alternatively, service with the arguments reversed) commands such as stop, start, status, and restart should be used to manage the MySQL server service. The mysqld service is enabled by default, and it starts at system reboot. Notice that certain things might work differently on systemd platforms: for example, changing the location of the data directory might cause issues. See Section 2.5.9, "Managing MySQL Server with systemd" for additional information.

During an upgrade installation using RPM and DEB packages, if the MySQL server is running when the upgrade occurs then the MySQL server is stopped, the upgrade occurs, and the MySQL server is restarted. One exception: if the edition also changes during an upgrade (such as community to commercial, or vice-versa), then MySQL server is not restarted.

At the initial start up of the server, the following happens, given that the data directory of the server is empty:
- The server is initialized.
- An SSL certificate and key files are generated in the data directory.
- validate_password is installed and enabled.
- A superuser account 'root'@'localhost' is created. A password for the superuser is set and stored in the error log file. To reveal it, use the following command for RHEL, Oracle Linux, CentOS, and Fedora systems:
```
$> sudo grep 'temporary password' /var/log/mysqld.log
```


Use the following command for SLES systems:
```
$> sudo grep 'temporary password' /var/log/mysql/mysqld.log
```


The next step is to log in with the generated, temporary password and set a custom password for the superuser account:
```
$> mysql -uroot -p
mysql> ALTER USER 'root'@'localhost' IDENTIFIED BY 'MyNewPass4!';
```


Note
validate_password is installed by default. The default password policy implemented by validate_password requires that passwords contain at least one uppercase letter, one lowercase letter, one digit, and one special character, and that the total password length is at least 8 characters.

If something goes wrong during installation, you might find debug information in the error log file /var/ log/mysqld.log.

For some Linux distributions, it might be necessary to increase the limit on number of file descriptors available to mysqld. See Section B.3.2.16, "File Not Found and Similar Errors"

Installing Client Libraries from Multiple MySQL Versions. It is possible to install multiple client library versions, such as for the case that you want to maintain compatibility with older applications
linked against previous libraries. To install an older client library, use the --oldpackage option with rpm. For example, to install mysql-community-libs-5.5 on an EL6 system that has libmysqlclient. 21 from MySQL 8.0, use a command like this:
\$> rpm --oldpackage -ivh mysql-community-libs-5.5.50-2.el6.x86_64.rpm
Debug Package. A special variant of MySQL Server compiled with the debug package has been included in the server RPM packages. It performs debugging and memory allocation checks and produces a trace file when the server is running. To use that debug version, start MySQL with / usr/sbin/mysqld-debug, instead of starting it as a service or with /usr/sbin/mysqld. See Section 7.9.4, "The DBUG Package" for the debug options you can use.

\section*{Note}

The default plugin directory is /usr/lib64/mysql/plugin/debug and is configurable with plugin_dir.

Rebuilding RPMs from source SRPMs. Source code SRPM packages for MySQL are available for download. They can be used as-is to rebuild the MySQL RPMs with the standard rpmbuild tool chain.

\subsection*{2.5.5 Installing MySQL on Linux Using Debian Packages from Oracle}

Oracle provides Debian packages for installing MySQL on Debian or Debian-like Linux systems. The packages are available through two different channels:
- The MySQL APT Repository. This is the preferred method for installing MySQL on Debian-like systems, as it provides a simple and convenient way to install and update MySQL products. For details, see Section 2.5.2, "Installing MySQL on Linux Using the MySQL APT Repository".
- The MySQL Developer Zone's Download Area. For details, see Section 2.1.3, "How to Get MySQL". The following are some information on the Debian packages available there and the instructions for installing them:
- Various Debian packages are provided in the MySQL Developer Zone for installing different components of MySQL on the current Debian and Ubuntu platforms. The preferred method is to use the tarball bundle, which contains the packages needed for a basic setup of MySQL. The tarball bundles have names in the format of mysql-server_MVER-DVER_CPU.debbundle. tar. MVER is the MySQL version and DVER is the Linux distribution version. The CPU value indicates the processor type or family for which the package is built, as shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.14 MySQL Debian and Ubuntu Installation Packages CPU Identifiers}
\begin{tabular}{|l|l|}
\hline CPU Value & Intended Processor Type or Family \\
\hline i386 & Pentium processor or better, 32 bit \\
\hline amd64 & 64-bit x86 processor \\
\hline
\end{tabular}
\end{table}
- After downloading the tarball, unpack it with the following command:
```
$> tar -xvf mysql-server_MVER-DVER_CPU.deb-bundle.tar
```

- You may need to install the libaio library if it is not already present on your system:
```
sudo apt-get install libaio1
```

- Preconfigure the MySQL server package with the following command:
```
$> sudo dpkg-preconfigure mysql-community-server_*.deb
```


You are asked to provide a password for the root user for your MySQL installation. You might also be asked other questions regarding the installation.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0179.jpg?height=337&width=275&top_left_y=246&top_left_x=429)

\section*{Important}

Make sure you remember the root password you set. Users who want to set a password later can leave the password field blank in the dialogue box and just press OK; in that case, root access to the server is authenticated using the MySQL Socket Peer-Credential Authentication Plugin for connections using a Unix socket file. You can set the root password later using mysql_secure_installation.
- For a basic installation of the MySQL server, install the database common files package, the client package, the client metapackage, the server package, and the server metapackage (in that order); you can do that with a single command:
```
$> sudo dpkg -i mysql-{common,community-client-plugins,community-client-core,community-client,clier
```


There are also packages with server-core and client-core in the package names. These contain binaries only and are installed automatically by the standard packages. Installing them by themselves does not result in a functioning MySQL setup.

If you are being warned of unmet dependencies by dpkg (such as libmecab2), you can fix them using apt-get:
```
sudo apt-get -f install
```


Here are where the files are installed on the system:
- All configuration files (like my.cnf) are under /etc/mysql
- All binaries, libraries, headers, etc., are under /usr/bin and /usr/sbin
- The data directory is under /var/lib/mysql
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0179.jpg?height=126&width=99&top_left_y=1503&top_left_x=370)

\section*{Note}

Debian distributions of MySQL are also provided by other vendors. Be aware that they may differ from those built by Oracle in features, capabilities, and conventions (including communication setup), and that the instructions in this manual do not necessarily apply to installing them. The vendor's instructions should be consulted instead.

\subsection*{2.5.6 Deploying MySQL on Linux with Docker Containers}

This section explains how to deploy MySQL Server using Docker containers.
While the docker client is used in the following instructions for demonstration purposes, in general, the MySQL container images provided by Oracle work with any container tools that are compliant with the OCI 1.0 specification.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0179.jpg?height=127&width=113&top_left_y=2165&top_left_x=360)

\section*{Warning}

Before deploying MySQL with Docker containers, make sure you understand the security risks of running containers and mitigate them properly.

\subsection*{2.5.6.1 Basic Steps for MySQL Server Deployment with Docker}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0179.jpg?height=127&width=108&top_left_y=2453&top_left_x=365)

\section*{Warning}

The MySQL Docker images maintained by the MySQL team are built specifically for Linux platforms. Other platforms are not supported, and users using these MySQL Docker images on them are doing so at their own risk. See

Ithe discussion here for some known limitations for running these containers on non-Linux operating systems.
- Downloading a MySQL Server Docker Image
- Starting a MySQL Server Instance
- Connecting to MySQL Server from within the Container
- Container Shell Access
- Stopping and Deleting a MySQL Container
- Upgrading a MySQL Server Container
- More Topics on Deploying MySQL Server with Docker

\section*{Downloading a MySQL Server Docker Image}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0180.jpg?height=97&width=106&top_left_y=989&top_left_x=301)

\section*{Important}

For users of MySQL Enterprise Edition: A subscription is required to use the Docker images for MySQL Enterprise Edition. Subscriptions work by a Bring Your Own License model; see How to Buy MySQL Products and Services for details.

Downloading the server image in a separate step is not strictly necessary; however, performing this step before you create your Docker container ensures your local image is up to date. To download the MySQL Community Edition image from the Oracle Container Registry (OCR), run this command:
```
docker pull container-registry.oracle.com/mysql/community-server:tag
```


The tag is the label for the image version you want to pull (for example, 8.4 , or 9.6 , or latest). If : tag is omitted, the latest label is used, and the image for the latest GA release (which is the latest innovation release) of MySQL Community Server is downloaded.

To download the MySQL Enterprise Edition image from the OCR, you need to first accept the license agreement on the OCR and log in to the container repository with your Docker client. Follow these steps:
- Visit the OCR at https://container-registry.oracle.com/ and choose MySQL.
- Under the list of MySQL repositories, choose enterprise-server.
- If you have not signed in to the OCR yet, click the Sign in button on the right of the page, and then enter your Oracle account credentials when prompted to.
- Follow the instructions on the right of the page to accept the license agreement.
- Log in to the OCR with your container client using, for example, the docker login command:
```
# docker login container-registry.oracle.com
Username: Oracle-Account-ID
Password: password
Login successful.
```


Download the Docker image for MySQL Enterprise Edition from the OCR with this command:
```
docker pull container-registry.oracle.com/mysql/enterprise-server:tag
```


To download the MySQL Enterprise Edition image from My Oracle Support website, go onto the website, sign in to your Oracle account, and perform these steps once you are on the landing page:
- Select the Patches and Updates tab.
- Go to the Patch Search region and, on the Search tab, switch to the Product or Family (Advanced) subtab.
- Enter "MySQL Server" for the Product field, and the desired version number in the Release field.
- Use the dropdowns for additional filters to select Description-contains, and enter "Docker" in the text field.

The following figure shows the search settings for the MySQL Enterprise Edition image for MySQL Server 8.0:
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0181.jpg?height=461&width=1403&top_left_y=641&top_left_x=386)
- Click the Search button and, from the result list, select the version you want, and click the Download button.
- In the File Download dialogue box that appears, click and download the . zip file for the Docker image.

Unzip the downloaded .zip archive to obtain the tarball inside (mysql-enterprise-server-version.tar), and then load the image by running this command:
```
docker load -i mysql-enterprise-server-version.tar
```


You can list downloaded Docker images with this command:

\begin{tabular}{|l|l|l|l|l|}
\hline \multicolumn{5}{|l|}{\$> docker images} \\
\hline REPOSITORY & TAG & IMAGE ID & CREATED & SIZE \\
\hline container-registry.oracle.com/mysql/community-server & latest & 1d9c2219ff69 & 2 months ago & 496 MB \\
\hline
\end{tabular}

\section*{Starting a MySQL Server Instance}

To start a new Docker container for a MySQL Server, use the following command:
```
docker run --name=container_name --restart on-failure -d image_name:tag
```

image_name is the name of the image to be used to start the container; see Downloading a MySQL Server Docker Image for more information.

The --name option, for supplying a custom name for your server container, is optional; if no container name is supplied, a random one is generated.

The --restart option is for configuring the restart policy for your container; it should be set to the value on-failure, to enable support for server restart within a client session (which happens, for example, when the RESTART statement is executed by a client or during the configuration of an InnoDB Cluster instance). With the support for restart enabled, issuing a restart within a client session causes the server and the container to stop and then restart.

For example, to start a new Docker container for the MySQL Community Server, use this command:
```
docker run --name=mysql1 --restart on-failure -d container-registry.oracle.com/mysql/community-server:1
```


To start a new Docker container for the MySQL Enterprise Server with a Docker image downloaded from the OCR, use this command:
```
docker run --name=mysql1 --restart on-failure -d container-registry.oracle.com/mysql/enterprise-server:late
```


To start a new Docker container for the MySQL Enterprise Server with a Docker image downloaded from My Oracle Support, use this command:
```
docker run --name=mysql1 --restart on-failure -d mysql/enterprise-server:latest
```


If the Docker image of the specified name and tag has not been downloaded by an earlier docker pull or docker run command, the image is now downloaded. Initialization for the container begins, and the container appears in the list of running containers when you run the docker ps command. For example:
```
$> docker ps
CONTAINER ID IMAGE COMMAND
4cd4129b3211 container-registry.oracle.com/mysql/community-server:latest "/entrypoint.sh mysq..."
```


The container initialization might take some time. When the server is ready for use, the STATUS of the container in the output of the docker ps command changes from (health: starting) to (healthy).

The -d option used in the docker run command above makes the container run in the background. Use this command to monitor the output from the container:
```
docker logs mysql1
```


Once initialization is finished, the command's output is going to contain the random password generated for the root user; check the password with, for example, this command:
```
$> docker logs mysql1 2>&1 | grep GENERATED
GENERATED ROOT PASSWORD: Axegh3kAJyDLaRuBemecis&EShOs
```


\section*{Connecting to MySQL Server from within the Container}

Once the server is ready, you can run the mysql client within the MySQL Server container you just started, and connect it to the MySQL Server. Use the docker exec - it command to start a mysql client inside the Docker container you have started, like the following:
```
docker exec -it mysql1 mysql -uroot -p
```


When asked, enter the generated root password (see the last step in Starting a MySQL Server Instance above on how to find the password). Because the MYSQL_ONETIME_PASSWORD option is true by default, after you have connected a mysql client to the server, you must reset the server root password by issuing this statement:
```
mysql> ALTER USER 'root'@'localhost' IDENTIFIED BY 'password';
```


Substitute password with the password of your choice. Once the password is reset, the server is ready for use.

\section*{Container Shell Access}

To have shell access to your MySQL Server container, use the docker exec - it command to start a bash shell inside the container:
```
$> docker exec -it mysql1 bash
bash-4.2#
```


You can then run Linux commands inside the container. For example, to view contents in the server's data directory inside the container, use this command:
```
bash-4.2# ls /var/lib/mysql
auto.cnf ca.pem client-key.pem ib_logfile0 ibdata1 mysql mysql.sock.lock private_key.pe
ca-key.pem client-cert.pem ib_buffer_pool ib_logfile1 ibtmp1 mysql.sock performance_schema public_k
```


\section*{Stopping and Deleting a MySQL Container}

To stop the MySQL Server container we have created, use this command:
```
docker stop mysql1
```

docker stop sends a SIGTERM signal to the mysqld process, so that the server is shut down gracefully.

Also notice that when the main process of a container (mysqld in the case of a MySQL Server container) is stopped, the Docker container stops automatically.

To start the MySQL Server container again:
```
docker start mysql1
```


To stop and start again the MySQL Server container with a single command:
```
docker restart mysql1
```


To delete the MySQL container, stop it first, and then use the docker rm command:
```
docker stop mysql1
docker rm mysql1
```


If you want the Docker volume for the server's data directory to be deleted at the same time, add the v option to the docker rm command.

\section*{Upgrading a MySQL Server Container}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0183.jpg?height=117&width=106&top_left_y=1279&top_left_x=365)

\section*{Important}
- Before performing any upgrade to MySQL, follow carefully the instructions in Chapter 3, Upgrading MySQL. Among other instructions discussed there, it is especially important to back up your database before the upgrade.
- The instructions in this section require that the server's data and configuration have been persisted on the host. See Persisting Data and Configuration Changes for details.

Follow these steps to upgrade a Docker installation of MySQL 8.4 to 9.6:
- Stop the MySQL 8.4 server (container name is mysql84 in this example):
```
docker stop mysql84
```

- Download the MySQL 9.6 Server Docker image. See instructions in Downloading a MySQL Server Docker Image. Make sure you use the right tag for MySQL 9.6.
- Start a new MySQL 9.6 Docker container (named mysql96 in this example) with the old server data and configuration (with proper modifications if needed-see Chapter 3, Upgrading MySQL) that have been persisted on the host (by bind-mounting in this example). For the MySQL Community Server, run this command:
```
docker run --name=mysq184 \
    --mount type=bind,src=/path-on-host-machine/my.cnf,dst=/etc/my.cnf \
    --mount type=bind,src=/path-on-host-machine/datadir,dst=/var/lib/mysql \
    -d container-registry.oracle.com/mysql/community-server:9.6
```


If needed, adjust container-registry.oracle.com/mysql/community-server to the correct image name-for example, replace it with container-registry.oracle.com/mysql/ enterprise-server for MySQL Enterprise Edition images downloaded from the OCR, or mysql/ enterprise-server for MySQL Enterprise Edition images downloaded from My Oracle Support.
- Wait for the server to finish startup. You can check the status of the server using the docker ps command (see Starting a MySQL Server Instance for how to do that).

Follow the same steps for upgrading within the 9.6 series (that is, from release $9.6 . x$ to $9.6 . y$ ): stop the original container, and start a new one with a newer image on the old server data and configuration. If you used the 9.6 or the latest tag when starting your original container and there is now a new MySQL 9.6 release you want to upgrade to it, you must first pull the image for the new release with the command:
docker pull container-registry.oracle.com/mysql/community-server:9.6
You can then upgrade by starting a new container with the same tag on the old data and configuration (adjust the image name if you are using the MySQL Enterprise Edition; see Downloading a MySQL Server Docker Image):
```
docker run --name=mysq184new \
    --mount type=bind,src=/path-on-host-machine/my.cnf,dst=/etc/my.cnf \
    --mount type=bind,src=/path-on-host-machine/datadir,dst=/var/lib/mysql \
    -d container-registry.oracle.com/mysql/community-server:9.6
```


\section*{More Topics on Deploying MySQL Server with Docker}

For more topics on deploying MySQL Server with Docker like server configuration, persisting data and configuration, server error log, and container environment variables, see Section 2.5.6.2, "More Topics on Deploying MySQL Server with Docker".

\subsection*{2.5.6.2 More Topics on Deploying MySQL Server with Docker}

\section*{Note}

Most of the following sample commands have container -registry.oracle.com/mysql/community-server as the Docker image being used (like with the docker pull and docker run commands); change that if your image is from another repository-for example, replace it with container-registry.oracle.com/mysql/enterprise-server for MySQL Enterprise Edition images downloaded from the Oracle Container Registry (OCR), or mysql/enterprise-server for MySQL Enterprise Edition images downloaded from My Oracle Support.
- The Optimized MySQL Installation for Docker
- Configuring the MySQL Server
- Persisting Data and Configuration Changes
- Running Additional Initialization Scripts
- Connect to MySQL from an Application in Another Docker Container
- Server Error Log
- Using MySQL Enterprise Backup with Docker
- Using mysqldump with Docker
- Known Issues
- Docker Environment Variables

\section*{The Optimized MySQL Installation for Docker}

Docker images for MySQL are optimized for code size, which means they only include crucial components that are expected to be relevant for the majority of users who run MySQL instances in Docker containers. A MySQL Docker installation is different from a common, non-Docker installation in the following aspects:
- Only a limited number of binaries are included.
- All binaries are stripped; they contain no debug information.

> Warning
> Any software updates or installations users perform to the Docker container (including those for MySQL components) may conflict with the optimized MySQL installation created by the Docker image. Oracle does not provide support for MySQL products running in such an altered container, or a container created from an altered Docker image.

\section*{Configuring the MySQL Server}

When you start the MySQL Docker container, you can pass configuration options to the server through the docker run command. For example:
```
docker run --name mysql1 -d container-registry.oracle.com/mysql/community-server:tag --character-set-se
```


The command starts the MySQL Server with utf8mb4 as the default character set and utf8mb4_col as the default collation for databases.

Another way to configure the MySQL Server is to prepare a configuration file and mount it at the location of the server configuration file inside the container. See Persisting Data and Configuration Changes for details.

\section*{Persisting Data and Configuration Changes}

Docker containers are in principle ephemeral, and any data or configuration are expected to be lost if the container is deleted or corrupted (see discussions here). Docker volumes provides a mechanism to persist data created inside a Docker container. At its initialization, the MySQL Server container creates a Docker volume for the server data directory. The JSON output from the docker inspect command on the container includes a Mount key, whose value provides information on the data directory volume:
```
$> docker inspect mysql1
...
    "Mounts": [
            {
                "Type": "volume",
                "Name": "4f2d463cfc4bdd4baebcb098c97d7da3337195ed2c6572bc0b89f7e845d27652",
                "Source": "/var/lib/docker/volumes/4f2d463cfc4bdd4baebcb098c97d7da3337195ed2c6572bc0b89
                "Destination": "/var/lib/mysql",
                "Driver": "local",
                "Mode": "",
                "RW": true,
                "Propagation": ""
            }
        ],
...
```


The output shows that the source directory /var/lib/docker/ volumes/4f2d463cfc4bdd4baebcb098c97d7da3337195ed2c6572bc0b89f7e845d27652/ _data, in which data is persisted on the host, has been mounted at /var/lib/mysql, the server data directory inside the container.

Another way to preserve data is to bind-mount a host directory using the --mount option when creating the container. The same technique can be used to persist the configuration of the server. The following command creates a MySQL Server container and bind-mounts both the data directory and the server configuration file:
```
docker run --name=mysql1 \
--mount type=bind,src=/path-on-host-machine/my.cnf,dst=/etc/my.cnf \
--mount type=bind,src=/path-on-host-machine/datadir,dst=/var/lib/mysql \
-d container-registry.oracle.com/mysql/community-server:tag
```


The command mounts path-on-host-machine/my.cnf at /etc/my.cnf (the server configuration file inside the container), and path-on-host-machine/datadir at /var/lib/mysql (the data directory inside the container). The following conditions must be met for the bind-mounting to work:
- The configuration file path-on-host-machine/my.cnf must already exist, and it must contain the specification for starting the server by the user mysql:
```
[mysqld]
user=mysql
```


You can also include other server configuration options in the file.
- The data directory path-on-host-machine/datadir must already exist. For server initialization to happen, the directory must be empty. You can also mount a directory prepopulated with data and start the server with it; however, you must make sure you start the Docker container with the same configuration as the server that created the data, and any host files or directories required are mounted when starting the container.

\section*{Running Additional Initialization Scripts}

If there are any . sh or . sql scripts you want to run on the database immediately after it has been created, you can put them into a host directory and then mount the directory at /docker -entrypoint-initdb.d/ inside the container. For example:
```
docker run --name=mysql1 \
--mount type=bind,src=/path-on-host-machine/scripts/,dst=/docker-entrypoint-initdb.d/ \
-d container-registry.oracle.com/mysql/community-server:tag
```


\section*{Connect to MySQL from an Application in Another Docker Container}

By setting up a Docker network, you can allow multiple Docker containers to communicate with each other, so that a client application in another Docker container can access the MySQL Server in the server container. First, create a Docker network:
```
docker network create my-custom-net
```


Then, when you are creating and starting the server and the client containers, use the --network option to put them on network you created. For example:
```
docker run --name=mysql1 --network=my-custom-net -d container-registry.oracle.com/mysql/community-server
docker run --name=myapp1 --network=my-custom-net -d myapp
```


The myapp1 container can then connect to the mysql1 container with the mysql1 hostname and vice versa, as Docker automatically sets up a DNS for the given container names. In the following example, we run the mysql client from inside the myapp1 container to connect to host mysql1 in its own container:
```
docker exec -it myapp1 mysql --host=mysql1 --user=myuser --password
```


For other networking techniques for containers, see the Docker container networking section in the Docker Documentation.

\section*{Server Error Log}

When the MySQL Server is first started with your server container, a server error log is NOT generated if either of the following conditions is true:
- A server configuration file from the host has been mounted, but the file does not contain the system variable log_error (see Persisting Data and Configuration Changes on bind-mounting a server configuration file).
- A server configuration file from the host has not been mounted, but the Docker environment variable MYSQL_LOG_CONSOLE is true (which is the variable's default state for MySQL 8.4 server
containers). The MySQL Server's error log is then redirected to stderr, so that the error log goes into the Docker container's log and is viewable using the docker logs mysqld-container command.

To make MySQL Server generate an error log when either of the two conditions is true, use the -log-error option to configure the server to generate the error log at a specific location inside the container. To persist the error log, mount a host file at the location of the error log inside the container as explained in Persisting Data and Configuration Changes. However, you must make sure your MySQL Server inside its container has write access to the mounted host file.

\section*{Using MySQL Enterprise Backup with Docker}

MySQL Enterprise Backup is a commercially-licensed backup utility for MySQL Server, available with MySQL Enterprise Edition. MySQL Enterprise Backup is included in the Docker installation of MySQL Enterprise Edition.

In the following example, we assume that you already have a MySQL Server running in a Docker container (see Section 2.5.6.1, "Basic Steps for MySQL Server Deployment with Docker" on how to start a MySQL Server instance with Docker). For MySQL Enterprise Backup to back up the MySQL Server, it must have access to the server's data directory. This can be achieved by, for example, bindmounting a host directory on the data directory of the MySQL Server when you start the server:
```
docker run --name=mysqlserver \
--mount type=bind,src=/path-on-host-machine/datadir/,dst=/var/lib/mysql \
-d mysql/enterprise-server:8.4
```


With this command, the MySQL Server is started with a Docker image of the MySQL Enterprise Edition, and the host directory /path-on-host-machine/datadir/ has been mounted onto the server's data directory (/var/lib/mysql) inside the server container. We also assume that, after the server has been started, the required privileges have also been set up for MySQL Enterprise Backup to access the server (see Grant MySQL Privileges to Backup Administrator, for details). Use the following steps to back up and restore a MySQL Server instance.

To back up a MySQL Server instance running in a Docker container using MySQL Enterprise Backup with Docker, follow the steps listed here:
1. On the same host where the MySQL Server container is running, start another container with an image of MySQL Enterprise Edition to perform a back up with the MySQL Enterprise Backup command backup-to-image. Provide access to the server's data directory using the bind mount we created in the last step. Also, mount a host directory (/path-on-host-machine/backups/ in this example) onto the storage folder for backups in the container (/data/backups in the example) to persist the backups we are creating. Here is a sample command for this step, in which MySQL Enterprise Backup is started with a Docker image downloaded from My Oracle Support:
```
$> docker run \
--mount type=bind,src=/path-on-host-machine/datadir/,dst=/var/lib/mysql \
--mount type=bind,src=/path-on-host-machine/backups/,dst=/data/backups \
--rm mysql/enterprise-server:8.4 \
mysqlbackup -umysqlbackup -ppassword --backup-dir=/tmp/backup-tmp --with-timestamp \
--backup-image=/data/backups/db.mbi backup-to-image
```


It is important to check the end of the output by mysqlbackup to make sure the backup has been completed successfully.
2. The container exits once the backup job is finished and, with the --rm option used to start it, it is removed after it exits. An image backup has been created, and can be found in the host directory mounted in the last step for storing backups, as shown here:
```
$> ls /tmp/backups
db.mbi
```


To restore a MySQL Server instance in a Docker container using MySQL Enterprise Backup with Docker, follow the steps listed here:
1. Stop the MySQL Server container, which also stops the MySQL Server running inside:
```
docker stop mysqlserver
```

2. On the host, delete all contents in the bind mount for the MySQL Server data directory:
```
rm -rf /path-on-host-machine/datadir/*
```

3. Start a container with an image of MySQL Enterprise Edition to perform the restore with the MySQL Enterprise Backup command copy-back-and-apply-log. Bind-mount the server's data directory and the storage folder for the backups, like what we did when we backed up the server:
```
$> docker run \
--mount type=bind,src=/path-on-host-machine/datadir/,dst=/var/lib/mysql \
--mount type=bind,src=/path-on-host-machine/backups/,dst=/data/backups \
--rm mysql/enterprise-server:8.4 \
mysqlbackup --backup-dir=/tmp/backup-tmp --with-timestamp \
--datadir=/var/lib/mysql --backup-image=/data/backups/db.mbi copy-back-and-apply-log
mysqlbackup completed OK! with 3 warnings
```


The container exits with the message " mysqlbackup completed OK!" once the backup job is finished and, with the --rm option used when starting it, it is removed after it exits.
4. Restart the server container, which also restarts the restored server, using the following command:
```
docker restart mysqlserver
```


Or, start a new MySQL Server on the restored data directory, as shown here:
```
docker run --name=mysqlserver2 \
--mount type=bind,src=/path-on-host-machine/datadir/,dst=/var/lib/mysql \
-d mysql/enterprise-server:8.4
```


Log on to the server to check that the server is running with the restored data.

\section*{Using mysqldump with Docker}

Besides using MySQL Enterprise Backup to back up a MySQL Server running in a Docker container, you can perform a logical backup of your server by using the mysqldump utility, run inside a Docker container.

The following instructions assume that you already have a MySQL Server running in a Docker container and, when the container was first started, a host directory /path-on-host-machine/ datadir/ has been mounted onto the server's data directory /var/lib/mysql (see bind-mounting a host directory on the data directory of the MySQL Server for details), which contains the Unix socket file by which mysqldump and mysql can connect to the server. We also assume that, after the server has been started, a user with the proper privileges (admin in this example) has been created, with which mysqldump can access the server. Use the following steps to back up and restore MySQL Server data:

\section*{Backing up MySQL Server data using mysqldump with Docker:}
1. On the same host where the MySQL Server container is running, start another container with an image of MySQL Server to perform a backup with the mysqldump utility (see documentation of the utility for its functionality, options, and limitations). Provide access to the server's data directory by bind mounting /path-on-host-machine/datadir/. Also, mount a host directory (/path-on-host-machine/backups/in this example) onto a storage folder for backups inside the container (/data/backups is used in this example) to persist the backups you are creating. Here is a sample command for backing up all databases on the server using this setup:
```
$> docker run --entrypoint "/bin/sh" \
--mount type=bind,src=/path-on-host-machine/datadir/,dst=/var/lib/mysql \
--mount type=bind,src=/path-on-host-machine/backups/,dst=/data/backups \
```

```
--rm container-registry.oracle.com/mysql/community-server:8.4 \
-c "mysqldump -uadmin --password='password' --all-databases > /data/backups/all-databases.sql"
```


In the command, the --entrypoint option is used so that the system shell is invoked after the container is started, and the -c option is used to specify the mysqldump command to be run in the shell, whose output is redirected to the file all-databases.sql in the backup directory.
2. The container exits once the backup job is finished and, with the --rm option used to start it, it is removed after it exits. A logical backup been created, and can be found in the host directory mounted for storing the backup, as shown here:
```
$> ls /path-on-host-machine/backups/
all-databases.sql
```


Restoring MySQL Server data using mysqldump with Docker:
1. Make sure you have a MySQL Server running in a container, onto which you want your backed-up data to be restored.
2. Start a container with an image of MySQL Server to perform the restore with a mysql client. Bindmount the server's data directory, as well as the storage folder that contains your backup:
```
$> docker run \
--mount type=bind,src=/path-on-host-machine/datadir/,dst=/var/lib/mysql \
--mount type=bind,src=/path-on-host-machine/backups/,dst=/data/backups \
--rm container-registry.oracle.com/mysql/community-server:8.4 \
mysql -uadmin --password='password' -e "source /data/backups/all-databases.sql"
```


The container exits once the backup job is finished and, with the --rm option used when starting it, it is removed after it exits.
3. Log on to the server to check that the restored data is now on the server.

\section*{Known Issues}
- When using the server system variable audit_log_file to configure the audit log file name, use the loose option modifier with it; otherwise, Docker cannot start the server.

\section*{Docker Environment Variables}

When you create a MySQL Server container, you can configure the MySQL instance by using the -env option (short form -e) and specifying one or more environment variables. No server initialization is performed if the mounted data directory is not empty, in which case setting any of these variables has no effect (see Persisting Data and Configuration Changes), and no existing contents of the directory, including server settings, are modified during container startup.

Environment variables which can be used to configure a MySQL instance are listed here:
- The boolean variables including MYSQL_RANDOM_ROOT_PASSWORD, MYSQL_ONETIME_PASSWORD, MYSQL_ALLOW_EMPTY_PASSWORD, and MYSQL_LOG_CONSOLE are made true by setting them with any strings of nonzero lengths. Therefore, setting them to, for example, "0", "false", or "no" does not make them false, but actually makes them true. This is a known issue.
- MYSQL_RANDOM_ROOT_PASSWORD: When this variable is true (which is its default state, unless MYSQL_ROOT_PASSWORD is set or MYSQL_ALLOW_EMPTY_PASSWORD is set to true), a random password for the server's root user is generated when the Docker container is started. The password is printed to stdout of the container and can be found by looking at the container's log (see Starting a MySQL Server Instance).
- MYSQL_ONETIME_PASSWORD: When the variable is true (which is its default state, unless MYSQL_ROOT_PASSWORD is set or MYSQL_ALLOW_EMPTY_PASSWORD is set to true), the root user's password is set as expired and must be changed before MySQL can be used normally.
- MYSQL_DATABASE: This variable allows you to specify the name of a database to be created on image startup. If a user name and a password are supplied with MYSQL_USER and MYSQL_PASSWORD, the user is created and granted superuser access to this database (corresponding to GRANT ALL). The specified database is created by a CREATE DATABASE IF NOT EXIST statement, so that the variable has no effect if the database already exists.
- MYSQL_USER, MYSQL_PASSWORD: These variables are used in conjunction to create a user and set that user's password, and the user is granted superuser permissions for the database specified by the MYSQL_DATABASE variable. Both MYSQL_USER and MYSQL_PASSWORD are required for a user to be created-if any of the two variables is not set, the other is ignored. If both variables are set but MYSQL_DATABASE is not, the user is created without any privileges.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0190.jpg?height=127&width=99&top_left_y=721&top_left_x=342)

\section*{Note}

There is no need to use this mechanism to create the root superuser, which is created by default with the password set by either one of the mechanisms discussed in the descriptions for MYSQL_ROOT_PASSWORD and MYSQL_RANDOM_ROOT_PASSWORD, unless MYSQL_ALLOW_EMPTY_PASSWORD is true.
- MYSQL_ROOT_HOST: By default, MySQL creates the 'root'@'localhost' account. This account can only be connected to from inside the container as described in Connecting to MySQL Server from within the Container. To allow root connections from other hosts, set this environment variable. For example, the value 172.17.0.1, which is the default Docker gateway IP, allows connections from the host machine that runs the container. The option accepts only one entry, but wildcards are allowed (for example, MYSQL_ROOT_HOST=172 . * . * . * or MYSQL_ROOT_HOST=\%).
- MYSQL_LOG_CONSOLE: When the variable is true (which is its default state for MySQL 8.4 server containers), the MySQL Server's error log is redirected to stderr, so that the error log goes into the Docker container's log and is viewable using the docker logs mysqld-container command.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0190.jpg?height=127&width=101&top_left_y=1466&top_left_x=340)

\section*{Note}

The variable has no effect if a server configuration file from the host has been mounted (see Persisting Data and Configuration Changes on bind-mounting a configuration file).
- MYSQL_ROOT_PASSWORD: This variable specifies a password that is set for the MySQL root account.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0190.jpg?height=127&width=113&top_left_y=1763&top_left_x=333)

\section*{Warning}

Setting the MySQL root user password on the command line is insecure. As an alternative to specifying the password explicitly, you can set the variable with a container file path for a password file, and then mount a file from your host that contains the password at the container file path. This is still not very secure, as the location of the password file is still exposed. It is preferable to use the default settings of MYSQL_RANDOM_ROOT_PASSWORD and MYSQL_ONETIME_PASSWORD both being true.
- MYSQL_ALLOW_EMPTY_PASSWORD. Set it to true to allow the container to be started with a blank password for the root user.

\section*{Warning}

Setting this variable to true is insecure, because it is going to leave your MySQL instance completely unprotected, allowing anyone to gain complete superuser access. It is preferable to use the default settings of MYSQL_RANDOM_ROOT_PASSWORD and MYSQL_ONETIME_PASSWORD both being true.

\subsection*{2.5.6.3 Deploying MySQL on Windows and Other Non-Linux Platforms with Docker}

\section*{Warning}

The MySQL Docker images provided by Oracle are built specifically for Linux platforms. Other platforms are not supported, and users running the MySQL Docker images from Oracle on them are doing so at their own risk. This section discusses some known issues for the images when used on non-Linux platforms.

Known Issues for using the MySQL Server Docker images from Oracle on Windows include:
- If you are bind-mounting on the container's MySQL data directory (see Persisting Data and Configuration Changes for details), you have to set the location of the server socket file with the socket option to somewhere outside of the MySQL data directory; otherwise, the server fails to start. This is because the way Docker for Windows handles file mounting does not allow a host file from being bind-mounted on the socket file.

\subsection*{2.5.7 Installing MySQL on Linux from the Native Software Repositories}

Many Linux distributions include a version of the MySQL server, client tools, and development components in their native software repositories and can be installed with the platforms' standard package management systems. This section provides basic instructions for installing MySQL using those package management systems.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0191.jpg?height=127&width=108&top_left_y=1210&top_left_x=365)

\section*{Important}

Native packages are often several versions behind the currently available release. You are also normally unable to install development milestone releases (DMRs), since these are not usually made available in the native repositories. Before proceeding, we recommend that you check out the other installation options described in Section 2.5, "Installing MySQL on Linux".

Distribution specific instructions are shown below:

\section*{- Red Hat Linux, Fedora, CentOS}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0191.jpg?height=126&width=101&top_left_y=1704&top_left_x=404)

\section*{Note}

For a number of Linux distributions, you can install MySQL using the MySQL Yum repository instead of the platform's native software repository. See Section 2.5.1, "Installing MySQL on Linux Using the MySQL Yum Repository" for details.

For Red Hat and similar distributions, the MySQL distribution is divided into a number of separate packages, mysql for the client tools, mysql-server for the server and associated tools, and mysql-libs for the libraries. The libraries are required if you want to provide connectivity from different languages and environments such as Perl, Python and others.

To install, use the yum command to specify the packages that you want to install. For example:
```
#> yum install mysql mysql-server mysql-libs mysql-server
Loaded plugins: presto, refresh-packagekit
Setting up Install Process
Resolving Dependencies
--> Running transaction check
---> Package mysql.x86_64 0:5.1.48-2.fc13 set to be updated
---> Package mysql-libs.x86_64 0:5.1.48-2.fc13 set to be updated
---> Package mysql-server.x86_64 0:5.1.48-2.fc13 set to be updated
--> Processing Dependency: perl-DBD-MySQL for package: mysql-server-5.1.48-2.fc13.x86_64
--> Running transaction check
---> Package perl-DBD-MySQL.x86_64 0:4.017-1.fc13 set to be updated
--> Finished Dependency Resolution
```


Installing MySQL on Linux from the Native Software Repositories
```
Dependencies Resolved

\begin{tabular}{|l|l|l|l|l|}
\hline Package & Arch & Version & Repository & Size \\
\hline \multicolumn{5}{|l|}{Installing:} \\
\hline mysql & x86_64 & 5.1.48-2.fc13 & updates & 889 k \\
\hline mysql-libs & x86_64 & 5.1.48-2.fc13 & updates & 1.2 M \\
\hline mysql-server & x86_64 & 5.1.48-2.fc13 & updates & 8.1 M \\
\hline \multicolumn{5}{|l|}{Installing for dependencies:} \\
\hline perl-DBD-MySQL & x86_64 & 4.017-1.fc13 & updates & 136 k \\
\hline
\end{tabular}
Transaction Summary
Install 4 Package(s)
Upgrade 0 Package(s)
Total download size: 10 M
Installed size: 30 M
Is this ok [y/N]: y
Downloading Packages:
Setting up and reading Presto delta metadata
Processing delta metadata
Package(s) data still to download: 10 M
(1/4): mysql-5.1.48-2.fc13.x86_64.rpm |889 kB 00:04
(2/4): mysql-libs-5.1.48-2.fc13.x86_64.rpm | 1.2 MB 00:06
(3/4): mysql-server-5.1.48-2.fc13.x86_64.rpm | 8.1 MB 00:40
(4/4): perl-DBD-MySQL-4.017-1.fc13.x86_64.rpm |136 kB 00:00
Total \textbf{00 kB/s | 10 MB 00:52}
Running rpm_check_debug
Running Transaction Test
Transaction Test Succeeded
Running Transaction
    Installing : mysql-libs-5.1.48-2.fc13.x86_64 1/4
    Installing : mysql-5.1.48-2.fc13.x86_64 2/4
    Installing : perl-DBD-MySQL-4.017-1.fc13.x86_64 3/4
    Installing : mysql-server-5.1.48-2.fc13.x86_64 4/4
Installed:
    mysql.x86_64 0:5.1.48-2.fc13 mysql-libs.x86_64 0:5.1.48-2.fc13
    mysql-server.x86_64 0:5.1.48-2.fc13
Dependency Installed:
    perl-DBD-MySQL.x86_64 0:4.017-1.fc13
Complete!
```


MySQL and the MySQL server should now be installed. A sample configuration file is installed into / etc/my.cnf. To start the MySQL server use systemctl:
```
$> systemctl start mysqld
```


The database tables are automatically created for you, if they do not already exist. You should, however, run mysql_secure_installation to set the root passwords on your server.

\section*{- Debian, Ubuntu, Kubuntu}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0192.jpg?height=122&width=95&top_left_y=2202&top_left_x=342)

\section*{Note}

For supported Debian and Ubuntu versions, MySQL can be installed using the MySQL APT Repository instead of the platform's native software repository. See Section 2.5.2, "Installing MySQL on Linux Using the MySQL APT Repository" for details.

On Debian and related distributions, there are two packages for MySQL in their software repositories, mysql-client and mysql-server, for the client and server components respectively. You should specify an explicit version, for example mysql-client-5.1, to ensure that you install the version of MySQL that you want.

To download and install, including any dependencies, use the apt-get command, specifying the packages that you want to install.

\section*{Note}

Before installing, make sure that you update your apt-get index files to ensure you are downloading the latest available version.

\section*{Note}

The apt-get command installs a number of packages, including the MySQL server, in order to provide the typical tools and application environment. This can mean that you install a large number of packages in addition to the main MySQL package.

During installation, the initial database is created, and you are prompted for the MySQL root password (and confirmation). A configuration file is created in /etc/mysql/my.cnf. An init script is created in /etc/init.d/mysql.

The server should already be started. You can manually start and stop the server using:
```
#> service mysql [start|stop]
```


The service is automatically added to the 2,3 and 4 run levels, with stop scripts in the single, shutdown and restart levels.

\subsection*{2.5.8 Installing MySQL on Linux with Juju}

The Juju deployment framework supports easy installation and configuration of MySQL servers. For instructions, see https://jujucharms.com/mysql/.

\subsection*{2.5.9 Managing MySQL Server with systemd}

If you install MySQL using an RPM or Debian package on the following Linux platforms, server startup and shutdown is managed by systemd:
- RPM package platforms:
- Enterprise Linux variants version 7 and higher
- SUSE Linux Enterprise Server 12 and higher
- Fedora 29 and higher
- Debian family platforms:
- Debian platforms
- Ubuntu platforms

If you install MySQL from a generic binary distribution on a platform that uses systemd, you can manually configure systemd support for MySQL following the instructions provided in the postinstallation setup section of the MySQL 8.4 Secure Deployment Guide.

If you install MySQL from a source distribution on a platform that uses systemd, obtain systemd support for MySQL by configuring the distribution using the - DWITH_SYSTEMD=1 CMake option. See Section 2.8.7, "MySQL Source-Configuration Options".

The following discussion covers these topics:
- Overview of systemd
- Configuring systemd for MySQL
- Configuring Multiple MySQL Instances Using systemd
- Migrating from mysqld_safe to systemd

\section*{Note}

On platforms for which systemd support for MySQL is installed, scripts such as mysqld_safe and the System V initialization script are unnecessary and are not installed. For example, mysqld_safe can handle server restarts, but systemd provides the same capability, and does so in a manner consistent with management of other services rather than by using an application-specific program.

One implication of the non-use of mysqld_safe on platforms that use systemd for server management is that use of [mysqld_safe] or [safe_mysqld] sections in option files is not supported and might lead to unexpected behavior.

Because systemd has the capability of managing multiple MySQL instances on platforms for which systemd support for MySQL is installed, mysqld_multi and mysqld_multi.server are unnecessary and are not installed.

\section*{Overview of systemd}
systemd provides automatic MySQL server startup and shutdown. It also enables manual server management using the systemctl command. For example:
\$> systemctl \{start|stop|restart|status\} mysqld
Alternatively, use the service command (with the arguments reversed), which is compatible with System V systems:
\$> service mysqld \{start|stop|restart|status\}

\section*{Note}

For the systemctl command (and the alternative service command), if the MySQL service name is not mysqld then use the appropriate name. For example, use mysql rather than mysqld on Debian-based and SLES systems.

Support for systemd includes these files:
- mysqld.service (RPM platforms), mysql.service (Debian platforms): systemd service unit configuration file, with details about the MySQL service.
- mysqld@.service (RPM platforms), mysql@.service (Debian platforms): Like mysqld. service or mysql. service, but used for managing multiple MySQL instances.
- mysqld.tmpfiles.d: File containing information to support the tmpfiles feature. This file is installed under the name mysql.conf.
- mysqld_pre_systemd (RPM platforms), mysql-system-start (Debian platforms): Support script for the unit file. This script assists in creating the error log file only if the log location matches a pattern (/var/log/mysql*. log for RPM platforms, /var/log/mysql/*.log for Debian platforms). In other cases, the error log directory must be writable or the error log must be present and writable for the user running the mysqld process.

\section*{Configuring systemd for MySQL}

To add or change systemd options for MySQL, these methods are available:
- Use a localized systemd configuration file.
- Arrange for systemd to set environment variables for the MySQL server process.
- Set the MYSQLD_OPTS systemd variable.

To use a localized systemd configuration file, create the /etc/systemd/system/ mysqld.service.d directory if it does not exist. In that directory, create a file that contains a [Service] section listing the desired settings. For example:
```
[Service]
LimitNOFILE=max_open_files
Nice=nice_level
LimitCore=core_file_limit
Environment="LD_PRELOAD=/path/to/malloc/library"
Environment="TZ=time_zone_setting"
```


The discussion here uses override.conf as the name of this file. Newer versions of systemd support the following command, which opens an editor and permits you to edit the file:
```
systemctl edit mysqld # RPM platforms
systemctl edit mysql # Debian platforms
```


Whenever you create or change override.conf, reload the systemd configuration, then tell systemd to restart the MySQL service:
```
systemctl daemon-reload
systemctl restart mysqld # RPM platforms
systemctl restart mysql # Debian platforms
```


With systemd, the override.conf configuration method must be used for certain parameters, rather than settings in a [mysqld], [mysqld_safe], or [safe_mysqld] group in a MySQL option file:
- For some parameters, override.conf must be used because systemd itself must know their values and it cannot read MySQL option files to get them.
- Parameters that specify values otherwise settable only using options known to mysqld_safe must be specified using systemd because there is no corresponding mysqld parameter.

For additional information about using systemd rather than mysqld_safe, see Migrating from mysqld_safe to systemd.

You can set the following parameters in override.conf:
- To set the number of file descriptors available to the MySQL server, use LimitNOFILE in override.conf rather than the open_files_limit system variable for mysqld or - -open-files-limit option for mysqld_safe.
- To set the maximum core file size, use LimitCore in override.conf rather than the --core-file-size option for mysqld_safe.
- To set the scheduling priority for the MySQL server, use Nice in override.conf rather than the --nice option for mysqld_safe.

Some MySQL parameters are configured using environment variables:
- LD_PRELOAD: Set this variable if the MySQL server should use a specific memory-allocation library.
- NOTIFY_SOCKET: This environment variable specifies the socket that mysqld uses to communicate notification of startup completion and service status change with systemd. It is set by systemd when the mysqld service is started. The mysqld service reads the variable setting and writes to the defined location.

In MySQL 8.4, mysqld uses the Type=notify process startup type. (Type=forking was used in MySQL 5.7.) With Type=notify, systemd automatically configures a socket file and exports the path to the NOTIFY_SOCKET environment variable.
- TZ: Set this variable to specify the default time zone for the server.

There are multiple ways to specify environment variable values for use by the MySQL server process managed by systemd:
- Use Environment lines in the override.conf file. For the syntax, see the example in the preceding discussion that describes how to use this file.
- Specify the values in the /etc/sysconfig/mysql file (create the file if it does not exist). Assign values using the following syntax:
```
LD_PRELOAD=/path/to/malloc/library
TZ=time_zone_setting
```


After modifying /etc/sysconfig/mysql, restart the server to make the changes effective:
```
systemctl restart mysqld # RPM platforms
systemctl restart mysql # Debian platforms
```


To specify options for mysqld without modifying systemd configuration files directly, set or unset the MYSQLD_OPTS systemd variable. For example:
```
systemctl set-environment MYSQLD_OPTS="--general_log=1"
systemctl unset-environment MYSQLD_OPTS
```


MYSQLD_OPTS can also be set in the /etc/sysconfig/mysql file.
After modifying the systemd environment, restart the server to make the changes effective:
```
systemctl restart mysqld # RPM platforms
systemctl restart mysql # Debian platforms
```


For platforms that use systemd, the data directory is initialized if empty at server startup. This might be a problem if the data directory is a remote mount that has temporarily disappeared: The mount point would appear to be an empty data directory, which then would be initialized as a new data directory. To suppress this automatic initialization behavior, specify the following line in the /etc/sysconfig/ mysql file (create the file if it does not exist):
```
NO_INIT=true
```


\section*{Configuring Multiple MySQL Instances Using systemd}

This section describes how to configure systemd for multiple instances of MySQL.

\section*{Note \\ Because systemd has the capability of managing multiple MySQL instances on platforms for which systemd support is installed, mysqld_multi and mysqld_multi.server are unnecessary and are not installed.}

To use multiple-instance capability, modify the my.cnf option file to include configuration of key options for each instance. These file locations are typical:
- /etc/my.cnf or /etc/mysql/my.cnf (RPM platforms)
- /etc/mysql/mysql.conf.d/mysqld.cnf (Debian platforms)

For example, to manage two instances named replica01 and replica02, add something like this to the option file:

RPM platforms:
```
[mysqld@replica01]
datadir=/var/lib/mysql-replica01
socket=/var/lib/mysql-replica01/mysql.sock
port=3307
log-error=/var/log/mysqld-replica01.log
```

```
[mysqld@replica02]
datadir=/var/lib/mysql-replica02
socket=/var/lib/mysql-replica02/mysql.sock
port=3308
log-error=/var/log/mysqld-replica02.log
```


\section*{Debian platforms:}
```
[mysqld@replica01]
datadir=/var/lib/mysql-replica01
socket=/var/lib/mysql-replica01/mysql.sock
port=3307
log-error=/var/log/mysql/replica01.log
[mysqld@replica02]
datadir=/var/lib/mysql-replica02
socket=/var/lib/mysql-replica02/mysql.sock
port=3308
log-error=/var/log/mysql/replica02.log
```


The replica names shown here use @ as the delimiter because that is the only delimiter supported by systemd.

Instances then are managed by normal systemd commands, such as:
```
systemctl start mysqld@replica01
systemctl start mysqld@replica02
```


To enable instances to run at boot time, do this:
```
systemctl enable mysqld@replica01
systemctl enable mysqld@replica02
```


Use of wildcards is also supported. For example, this command displays the status of all replica instances:
```
systemctl status 'mysqld@replica*'
```


For management of multiple MySQL instances on the same machine, systemd automatically uses a different unit file:
- mysqld@.service rather than mysqld.service (RPM platforms)
- mysql@.service rather than mysql.service (Debian platforms)

In the unit file, $\%$ I and $\%$ i reference the parameter passed in after the @ marker and are used to manage the specific instance. For a command such as this:
```
systemctl start mysqld@replica01
```

systemd starts the server using a command such as this:
```
mysqld --defaults-group-suffix=@%I ...
```


The result is that the [server], [mysqld], and [mysqld@replica01] option groups are read and used for that instance of the service.

\section*{Note}

On Debian platforms, AppArmor prevents the server from reading or writing / var/lib/mysql-replica*, or anything other than the default locations. To address this, you must customize or disable the profile in /etc/apparmor.d/ usr.sbin.mysqld.

\section*{Note}

On Debian platforms, the packaging scripts for MySQL uninstallation cannot currently handle mysqld@instances. Before removing or upgrading the package, you must stop any extra instances manually first.

\section*{Migrating from mysqld_safe to systemd}

Because mysqld_safe is not installed on platforms that use systemd to manage MySQL, options previously specified for that program (for example, in an [mysqld_safe] or [safe_mysqld] option group) must be specified another way:
- Some mysqld_safe options are also understood by mysqld and can be moved from the [mysqld_safe] or [safe_mysqld] option group to the [mysqld] group. This does not include --pid-file, --open-files-limit, or --nice. To specify those options, use the override.conf systemd file, described previously.

\section*{Note}

On systemd platforms, use of [mysqld_safe] and [safe_mysqld] option groups is not supported and may lead to unexpected behavior.
- For some mysqld_safe options, there are alternative mysqld procedures. For example, the mysqld_safe option for enabling syslog logging is --syslog, which is deprecated. To write error log output to the system log, use the instructions at Section 7.4.2.8, "Error Logging to the System Log".
- mysqld_safe options not understood by mysqld can be specified in override.conf or environment variables. For example, with mysqld_safe, if the server should use a specific memory allocation library, this is specified using the--malloc-lib option. For installations that manage the server with systemd, arrange to set the LD_PRELOAD environment variable instead, as described previously.

\subsection*{2.6 Installing MySQL Using Unbreakable Linux Network (ULN)}

Linux supports a number of different solutions for installing MySQL, covered in Section 2.5, "Installing MySQL on Linux". One of the methods, covered in this section, is installing from Oracle's Unbreakable Linux Network (ULN). You can find information about Oracle Linux and ULN under http:// linux.oracle.com/.

To use ULN, you need to obtain a ULN login and register the machine used for installation with ULN. This is described in detail in the ULN FAQ. The page also describes how to install and update packages.

Both Community and Commercial packages are supported, and each offers three MySQL channels:
- Server: MySQL Server
- Connectors: MySQL Connector/C++, MySQL Connector/J, MySQL Connector/ODBC, and MySQL Connector/Python.
- Tools: MySQL Router, MySQL Shell, and MySQL Workbench

The Community channels are available to all ULN users.
Accessing commercial MySQL ULN packages at oracle.linux.com requires you to provide a CSI with a valid commercial license for MySQL (Enterprise or Standard). As of this writing, valid purchases are 60944, 60945, 64911, and 64912. The appropriate CSI makes commercial MySQL subscription channels available in your ULN GUI interface.

Once MySQL has been installed using ULN, you can find information on starting and stopping the server, and more, at Section 2.5.7, "Installing MySQL on Linux from the Native Software Repositories", particularly under Section 2.5.4, "Installing MySQL on Linux Using RPM Packages from Oracle".

If you are changing your package source to use ULN and not changing which build of MySQL you are using, then back up your data, remove your existing binaries, and replace them with those from ULN. If a change of build is involved, we recommend the backup be a dump (from mysqldump or MySQL Shell's backup utility) just in case you need to rebuild your data after the new binaries are in place.

If this shift to ULN crosses a version boundary, consult this section before proceeding: Chapter 3, Upgrading MySQL.

\subsection*{2.7 Installing MySQL on Solaris}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0199.jpg?height=123&width=101&top_left_y=450&top_left_x=367&polygon=46,0,99,2,101,4,101,123,0,123,0,121,16,4,19,2,32,0)

\section*{Note}

MySQL 8.4 supports Solaris 11.4 and higher

MySQL on Solaris is available in a number of different formats.
- For information on installing using the native Solaris PKG format, see Section 2.7.1, "Installing MySQL on Solaris Using a Solaris PKG".
- To use a standard tar binary installation, use the notes provided in Section 2.2, "Installing MySQL on Unix/Linux Using Generic Binaries". Check the notes and hints at the end of this section for Solaris specific notes that you may need before or after installation.

To obtain a binary MySQL distribution for Solaris in tarball or PKG format, https://dev.mysql.com/ downloads/mysql/8.4.html.

Additional notes to be aware of when installing and using MySQL on Solaris:
- If you want to use MySQL with the mysql user and group, use the groupadd and useradd commands:
```
groupadd mysql
useradd -g mysql -s /bin/false mysql
```

- If you install MySQL using a binary tarball distribution on Solaris, because the Solaris tar cannot handle long file names, use GNU tar (gtar) to unpack the distribution. If you do not have GNU tar on your system, install it with the following command:
```
pkg install archiver/gnu-tar
```

- You should mount any file systems on which you intend to store InnoDB files with the forcedirectio option. (By default mounting is done without this option.) Failing to do so causes a significant drop in performance when using the InnoDB storage engine on this platform.
- If you would like MySQL to start automatically, you can copy support-files/mysql.server to / etc/init.d and create a symbolic link to it named /etc/rc3.d/S99mysql.server.
- If too many processes try to connect very rapidly to mysqld, you should see this error in the MySQL log:

Error in accept: Protocol error
You might try starting the server with the --back_log=50 option as a workaround for this.
- To configure the generation of core files on Solaris you should use the coreadm command. Because of the security implications of generating a core on a setuid ( ) application, by default, Solaris does not support core files on setuid ( ) programs. However, you can modify this behavior using coreadm. If you enable setuid ( ) core files for the current user, they are generated using mode 600 and are owned by the superuser.

\subsection*{2.7.1 Installing MySQL on Solaris Using a Solaris PKG}

You can install MySQL on Solaris using a binary package of the native Solaris PKG format instead of the binary tarball distribution.

To use this package, download the corresponding mysql-VERSION-solaris11PLATFORM. pkg. gz file, then uncompress it. For example:
```
$> gunzip mysql-8.4.9-solaris11-x86_64.pkg.gz
```


To install a new package, use pkgadd and follow the onscreen prompts. You must have root privileges to perform this operation:
```
$> pkgadd -d mysql-8.4.9-solaris11-x86_64.pkg
The following packages are available:
    1 mysql MySQL Community Server (GPL)
        (i86pc) 8.4.9
Select package(s) you wish to process (or 'all' to process
all packages). (default: all) [?,??,q]:
```


The PKG installer installs all of the files and tools needed, and then initializes your database if one does not exist. To complete the installation, you should set the root password for MySQL as provided in the instructions at the end of the installation. Alternatively, you can run the mysql_secure_installation script that comes with the installation.

By default, the PKG package installs MySQL under the root path /opt/mysql. You can change only the installation root path when using pkgadd, which can be used to install MySQL in a different Solaris zone. If you need to install in a specific directory, use a binary tar file distribution.

The pkg installer copies a suitable startup script for MySQL into /etc/init.d/mysql. To enable MySQL to startup and shutdown automatically, you should create a link between this file and the init script directories. For example, to ensure safe startup and shutdown of MySQL you could use the following commands to add the right links:
```
$> ln /etc/init.d/mysql /etc/rc3.d/S91mysql
$> ln /etc/init.d/mysql /etc/rc0.d/K02mysql
```


To remove MySQL, the installed package name is mysql. You can use this in combination with the pkgrm command to remove the installation.

To upgrade when using the Solaris package file format, you must remove the existing installation before installing the updated package. Removal of the package does not delete the existing database information, only the server, binaries and support files. The typical upgrade sequence is therefore:
```
$> mysqladmin shutdown
$> pkgrm mysql
$> pkgadd -d mysql-8.4.9-solaris11-x86_64.pkg
$> mysqld_safe &
```


You should check the notes in Chapter 3, Upgrading MySQL before performing any upgrade.

\subsection*{2.8 Installing MySQL from Source}

Building MySQL from the source code enables you to customize build parameters, compiler optimizations, and installation location. For a list of systems on which MySQL is known to run, see https://www.mysql.com/support/supportedplatforms/database.html.

Before you proceed with an installation from source, check whether Oracle produces a precompiled binary distribution for your platform and whether it works for you. We put a great deal of effort into ensuring that our binaries are built with the best possible options for optimal performance. Instructions for installing binary distributions are available in Section 2.2, "Installing MySQL on Unix/Linux Using Generic Binaries".

If you are interested in building MySQL from a source distribution using build options the same as or similar to those use by Oracle to produce binary distributions on your platform, obtain a binary distribution, unpack it, and look in the docs/INFO_BIN file, which contains information about how that MySQL distribution was configured and compiled.

\section*{Warning}

Building MySQL with nonstandard options may lead to reduced functionality, performance, or security.

The MySQL source code contains internal documentation written using Doxygen. The generated Doxygen content is available at https://dev.mysql.com/doc/index-other.html. It is also possible to generate this content locally from a MySQL source distribution using the instructions at Section 2.8.10, "Generating MySQL Doxygen Documentation Content".

\subsection*{2.8.1 Source Installation Methods}

There are two methods for installing MySQL from source:
- Use a standard MySQL source distribution. To obtain a standard distribution, see Section 2.1.3, "How to Get MySQL". For instructions on building from a standard distribution, see Section 2.8.4, "Installing MySQL Using a Standard Source Distribution".

Standard distributions are available as compressed tar files, Zip archives, or RPM packages. Distribution files have names of the form mysql-VERSION.tar.gz, mysql-VERSION.zip, or mysql-VERSION.rpm, where VERSION is a number like 8.4.9. File names for source distributions can be distinguished from those for precompiled binary distributions in that source distribution names are generic and include no platform name, whereas binary distribution names include a platform name indicating the type of system for which the distribution is intended (for example, pc-linuxi686 or winx64).
- Use a MySQL development tree. For information on building from one of the development trees, see Section 2.8.5, "Installing MySQL Using a Development Source Tree".

\subsection*{2.8.2 Source Installation Prerequisites}

Installation of MySQL from source requires several development tools. Some of these tools are needed no matter whether you use a standard source distribution or a development source tree. Other tool requirements depend on which installation method you use.

To install MySQL from source, the following system requirements must be satisfied, regardless of installation method:
- CMake, which is used as the build framework on all platforms. CMake can be downloaded from http:// www.cmake.org.
- A good make program. Although some platforms come with their own make implementations, it is highly recommended that you use GNU make 3.75 or later. It may already be available on your system as gmake. GNU make is available from http://www.gnu.org/software/make/.

On Unix-like systems, including Linux, you can check your system's version of make like this:
```
$> make --version
GNU Make 4.2.1
```

- MySQL 8.4 source code permits use of $\mathrm{C}++17$ features. To enable the necessary level of $\mathrm{C}++17$ support across all supported platforms, the following minimum compiler versions apply:
- Linux: GCC 10 or Clang 12
- macOS: XCode 10
- Solaris: (Prior to MySQL 8.4.4) GCC 10; (MySQL 8.4.4 and later) GCC 11.4
- Windows: Visual Studio 2019
- Building MySQL on Windows requires Windows version 10 or later. (MySQL binaries built on recent versions of Windows can generally be run on older versions.) You can determine the Windows version by executing WMIC. exe os get version in the Windows Command Prompt.
- The MySQL C API requires a C++ or C99 compiler to compile.
- An SSL library is required for support of encrypted connections, entropy for random number generation, and other encryption-related operations. By default, the build uses the OpenSSL library installed on the host system. To specify the library explicitly, use the WITH_SSL option when you invoke CMake. For additional information, see Section 2.8.6, "Configuring SSL Library Support".
- The Boost C++ libraries are required to build MySQL (but not to use it). In MySQL 8.3 and later, these libraries are always bundled with the MySQL source.
- The ncurses library.
- Sufficient free memory. If you encounter build errors such as internal compiler error when compiling large source files, it may be that you have too little memory. If compiling on a virtual machine, try increasing the memory allocation.
- Perl is needed if you intend to run test scripts. Most Unix-like systems include Perl. For Windows, you can use ActiveState Perl. or Strawberry Perl.

To install MySQL from a standard source distribution, one of the following tools is required to unpack the distribution file:
- For a .tar.gz compressed tar file: GNU gunzip to uncompress the distribution and a reasonable tar to unpack it. If your tar program supports the $z$ option, it can both uncompress and unpack the file.

GNU tar is known to work. The standard tar provided with some operating systems is not able to unpack the long file names in the MySQL distribution. You should download and install GNU tar, or if available, use a preinstalled version of GNU tar. Usually this is available as gnutar, gtar, or as tar within a GNU or Free Software directory, such as /usr/sfw/bin or /usr/local/bin. GNU tar is available from https://www.gnu.org/software/tar/.
- For a .zip Zip archive: WinZip or another tool that can read .zip files.
- For an . rpm RPM package: The rpmbuild program used to build the distribution unpacks it.

To install MySQL from a development source tree, the following additional tools are required:
- The Git revision control system is required to obtain the development source code. GitHub Help provides instructions for downloading and installing Git on different platforms.
- bison 2.1 or later, available from http://www.gnu.org/software/bison/. (Version 1 is no longer supported.) Use the latest version of bison where possible; if you experience problems, upgrade to a later version, rather than revert to an earlier one.
bison is available from http://www.gnu.org/software/bison/. bison for Windows can be downloaded from http://gnuwin32.sourceforge.net/packages/bison.htm. Download the package labeled "Complete package, excluding sources". On Windows, the default location for bison is the C: \Program Files\GnuWin32 directory. Some utilities may fail to find bison because of the space in the directory name. Also, Visual Studio may simply hang if there are spaces in the path. You can resolve these problems by installing into a directory that does not contain a space (for example C: \GnuWin32).
- On Solaris Express, m4 must be installed in addition to bison. m4 is available from http:// www.gnu.org/software/m4/.

\section*{Note}

If you have to install any programs, modify your PATH environment variable to include any directories in which the programs are located. See Section 6.2.9, "Setting Environment Variables".

If you run into problems and need to file a bug report, please use the instructions in Section 1.6, "How to Report Bugs or Problems".

\subsection*{2.8.3 MySQL Layout for Source Installation}

By default, when you install MySQL after compiling it from source, the installation step installs files under /usr/local/mysql. The component locations under the installation directory are the same as for binary distributions. See Table 2.3, "MySQL Installation Layout for Generic Unix/Linux Binary Package", and MySQL Installation Layout on Microsoft Windows. To configure installation locations different from the defaults, use the options described at Section 2.8.7, "MySQL Source-Configuration Options".

\subsection*{2.8.4 Installing MySQL Using a Standard Source Distribution}

To install MySQL from a standard source distribution:
1. Verify that your system satisfies the tool requirements listed at Section 2.8.2, "Source Installation Prerequisites".
2. Obtain a distribution file using the instructions in Section 2.1.3, "How to Get MySQL".
3. Configure, build, and install the distribution using the instructions in this section.
4. Perform postinstallation procedures using the instructions in Section 2.9, "Postinstallation Setup and Testing".

MySQL uses CMake as the build framework on all platforms. The instructions given here should enable you to produce a working installation. For additional information on using CMake to build MySQL, see How to Build MySQL Server with CMake.

If you start from a source RPM, use the following command to make a binary RPM that you can install. If you do not have rpmbuild, use rpm instead.
```
$> rpmbuild --rebuild --clean MySQL-VERSION.src.rpm
```


The result is one or more binary RPM packages that you install as indicated in Section 2.5.4, "Installing MySQL on Linux Using RPM Packages from Oracle".

The sequence for installation from a compressed tar file or Zip archive source distribution is similar to the process for installing from a generic binary distribution (see Section 2.2, "Installing MySQL on Unix/ Linux Using Generic Binaries"), except that it is used on all platforms and includes steps to configure and compile the distribution. For example, with a compressed tar file source distribution on Unix, the basic installation command sequence looks like this:
```
# Preconfiguration setup
$> groupadd mysql
$> useradd -r -g mysql -s /bin/false mysql
# Beginning of source-build specific instructions
$> tar zxvf mysql-VERSION.tar.gz
$> cd mysql-VERSION
$> mkdir bld
$> cd bld
$> cmake ..
$> make
$> make install
# End of source-build specific instructions
# Postinstallation setup
$> cd /usr/local/mysql
$> mkdir mysql-files
$> chown mysql:mysql mysql-files
$> chmod 750 mysql-files
$> bin/mysqld --initialize --user=mysql
$> bin/mysqld_safe --user=mysql &
# Next command is optional
$> cp support-files/mysql.server /etc/init.d/mysql.server
```


A more detailed version of the source-build specific instructions is shown following.

\section*{Note}

The procedure shown here does not set up any passwords for MySQL accounts. After following the procedure, proceed to Section 2.9, "Postinstallation Setup and Testing", for postinstallation setup and testing.
- Perform Preconfiguration Setup
- Obtain and Unpack the Distribution
- Configure the Distribution
- Build the Distribution
- Install the Distribution
- Perform Postinstallation Setup

\section*{Perform Preconfiguration Setup}

On Unix, set up the mysql user that owns the database directory and that should be used to run and execute the MySQL server, and the group to which this user belongs. For details, see Create a mysql User and Group. Then perform the following steps as the mysql user, except as noted.

\section*{Obtain and Unpack the Distribution}

Pick the directory under which you want to unpack the distribution and change location into it.
Obtain a distribution file using the instructions in Section 2.1.3, "How to Get MySQL".
Unpack the distribution into the current directory:
- To unpack a compressed tar file, tar can decompress and unpack the distribution if it has z option support:
```
$> tar zxvf mysql-VERSION.tar.gz
```


If your tar does not have $z$ option support, use gunzip to decompress the distribution and tar to unpack it:
```
$> gunzip < mysql-VERSION.tar.gz | tar xvf -
```


Alternatively, CMake can decompress and unpack the distribution:
```
$> cmake -E tar zxvf mysql-VERSION.tar.gz
```

- To unpack a Zip archive, use WinZip or another tool that can read . zip files.

Unpacking the distribution file creates a directory named mysql-VERSION.

\section*{Configure the Distribution}

Change location into the top-level directory of the unpacked distribution:
```
$> cd mysql-VERSION
```


Build outside of the source tree to keep the tree clean. If the top-level source directory is named mysql-src under your current working directory, you can build in a directory named build at the same level. Create the directory and go there:
```
$> mkdir bld
$> cd bld
```


Configure the build directory. The minimum configuration command includes no options to override configuration defaults:
```
$> cmake ../mysql-src
```


The build directory need not be outside the source tree. For example, you can build in a directory named build under the top-level source tree. To do this, starting with mysql-src as your current working directory, create the directory build and then go there:
```
$> mkdir build
$> cd build
```


Configure the build directory. The minimum configuration command includes no options to override configuration defaults:
```
$> cmake ..
```


If you have multiple source trees at the same level (for example, to build multiple versions of MySQL), the second strategy can be advantageous. The first strategy places all build directories at the same level, which requires that you choose a unique name for each. With the second strategy, you can use the same name for the build directory within each source tree. The following instructions assume this second strategy.

On Windows, specify the development environment. For example, the following commands configure MySQL for 32-bit or 64-bit builds, respectively:
```
$> cmake .. -G "Visual Studio 12 2013"
$> cmake .. -G "Visual Studio 12 2013 Win64"
```


On macOS, to use the Xcode IDE:
```
$> cmake .. -G Xcode
```


When you run Cmake, you might want to add options to the command line. Here are some examples:
- -DBUILD_CONFIG=mysql_release: Configure the source with the same build options used by Oracle to produce binary distributions for official MySQL releases.
- - DCMAKE_INSTALL_PREFIX=dir_name: Configure the distribution for installation under a particular location.
- -DCPACK_MONOLITHIC_INSTALL=1: Cause make package to generate a single installation file rather than multiple files.
- - DWITH_DEBUG=1: Build the distribution with debugging support.

For a more extensive list of options, see Section 2.8.7, "MySQL Source-Configuration Options".
To list the configuration options, use one of the following commands:
```
$> cmake .. -L # overview
$> cmake .. -LH # overview with help text
$> cmake .. -LAH # all params with help text
$> ccmake .. # interactive display
```


If CMake fails, you might need to reconfigure by running it again with different options. If you do reconfigure, take note of the following:
- If CMake is run after it has previously been run, it may use information that was gathered during its previous invocation. This information is stored in CMakeCache.txt. When CMake starts, it looks for that file and reads its contents if it exists, on the assumption that the information is still correct. That assumption is invalid when you reconfigure.
- Each time you run CMake, you must run make again to recompile. However, you may want to remove old object files from previous builds first because they were compiled using different configuration options.

To prevent old object files or configuration information from being used, run these commands in the build directory on Unix before re-running CMake:
```
$> make clean
$> rm CMakeCache.txt
```


Or, on Windows:
```
$> devenv MySQL.sln /clean
$> del CMakeCache.txt
```


Before asking on the MySQL Community Slack, check the files in the CMakeFiles directory for useful information about the failure. To file a bug report, please use the instructions in Section 1.6, "How to Report Bugs or Problems".

\section*{Build the Distribution}

On Unix:
```
$> make
$> make VERBOSE=1
```


The second command sets VERBOSE to show the commands for each compiled source.
Use gmake instead on systems where you are using GNU make and it has been installed as gmake.
On Windows:
```
$> devenv MySQL.sln /build RelWithDebInfo
```


If you have gotten to the compilation stage, but the distribution does not build, see Section 2.8.8, "Dealing with Problems Compiling MySQL", for help. If that does not solve the problem, please enter it into our bugs database using the instructions given in Section 1.6, "How to Report Bugs or Problems". If you have installed the latest versions of the required tools, and they crash trying to process our configuration files, please report that also. However, if you get a command not found error or a similar problem for required tools, do not report it. Instead, make sure that all the required tools are installed and that your PATH variable is set correctly so that your shell can find them.

\section*{Install the Distribution}

On Unix:
```
$> make install
```


This installs the files under the configured installation directory (by default, /usr/local/mysql). You might need to run the command as root.

To install in a specific directory, add a DESTDIR parameter to the command line:
```
$> make install DESTDIR="/opt/mysql"
```


Alternatively, generate installation package files that you can install where you like:
```
$> make package
```


This operation produces one or more .tar.gz files that can be installed like generic binary distribution packages. See Section 2.2, "Installing MySQL on Unix/Linux Using Generic Binaries". If you run CMake with -DCPACK_MONOLITHIC_INSTALL=1, the operation produces a single file. Otherwise, it produces multiple files.

On Windows, generate the data directory, then create a . zip archive installation package:
\$> devenv MySQL.sln /build RelWithDebInfo /project initial_database
\$> devenv MySQL.sln /build RelWithDebInfo /project package
You can install the resulting . zip archive where you like. See Section 2.3.3, "Configuration: Manually".

\section*{Perform Postinstallation Setup}

The remainder of the installation process involves setting up the configuration file, creating the core databases, and starting the MySQL server. For instructions, see Section 2.9, "Postinstallation Setup and Testing".

\section*{Note}

The accounts that are listed in the MySQL grant tables initially have no passwords. After starting the server, you should set up passwords for them using the instructions in Section 2.9, "Postinstallation Setup and Testing".

\subsection*{2.8.5 Installing MySQL Using a Development Source Tree}

This section describes how to install MySQL from the latest development source code, which is hosted on GitHub. To obtain the MySQL Server source code from this repository hosting service, you can set up a local MySQL Git repository.

On GitHub, MySQL Server and other MySQL projects are found on the MySQL page. The MySQL Server project is a single repository that contains branches for several MySQL series.
- Prerequisites for Installing from Development Source
- Setting Up a MySQL Git Repository

\section*{Prerequisites for Installing from Development Source}

To install MySQL from a development source tree, your system must satisfy the tool requirements listed at Section 2.8.2, "Source Installation Prerequisites".

\section*{Setting Up a MySQL Git Repository}

To set up a MySQL Git repository on your machine:
1. Clone the MySQL Git repository to your machine. The following command clones the MySQL Git repository to a directory named mysql-server. The initial download may take some time to complete, depending on the speed of your connection.
```
$> git clone https://github.com/mysql/mysql-server.git
Cloning into 'mysql-server'...
remote: Counting objects: 1198513, done.
remote: Total 1198513 (delta 0), reused 0 (delta 0), pack-reused 1198513
Receiving objects: 100% (1198513/1198513), 1.01 GiB | 7.44 MiB/s, done.
Resolving deltas: 100% (993200/993200), done.
Checking connectivity... done.
Checking out files: 100% (25510/25510), done.
```

2. When the clone operation completes, the contents of your local MySQL Git repository appear similar to the following:
```
~> cd mysql-server
~/mysql-server> ls
client extra mysys storage
cmake include packaging strings
CMakeLists.txt INSTALL plugin support-files
components libbinlogevents README testclients
config.h.cmake libchangestreams router unittest
configure.cmake libmysql run_doxygen.cmake utilities
Docs libservices scripts VERSION
Doxyfile-ignored LICENSE share vio
Doxyfile.in man sql win
```

doxygen_resources mysql-test sql-common
3. Use the git branch - $r$ command to view the remote tracking branches for the MySQL repository.
```
~/mysql-server> git branch -r
    origin/5.7
    origin/8.0
    origin/HEAD -> origin/trunk
    origin/cluster-7.4
    origin/cluster-7.5
    origin/cluster-7.6
    origin/trunk
```

4. To view the branch that is checked out in your local repository, issue the git branch command. When you clone the MySQL Git repository, the latest MySQL branch is checked out automatically. The asterisk identifies the active branch.
```
~/mysql-server$ git branch
* trunk
```

5. To check out an earlier MySQL branch, run the git checkout command, specifying the branch name. For example, to check out the MySQL 8.0 branch:
```
~/mysql-server$ git checkout 8.0
Checking out files: 100% (9600/9600), done.
Branch 8.0 set up to track remote branch 8.0 from origin.
Switched to a new branch '8.0'
```

6. To obtain changes made after your initial setup of the MySQL Git repository, switch to the branch you want to update and issue the git pull command:
```
~/mysql-server$ git checkout trunk
~/mysql-server$ git pull
```


To examine the commit history, use the git log command:
```
~/mysql-server$ git log
```


You can also browse commit history and source code on the GitHub MySQL site.
If you see changes or code that you have a question about, ask on MySQL Community Slack.
7. After you have cloned the MySQL Git repository and have checked out the branch you want to build, you can build MySQL Server from the source code. Instructions are provided in Section 2.8.4, "Installing MySQL Using a Standard Source Distribution", except that you skip the part about obtaining and unpacking the distribution.

Be careful about installing a build from a distribution source tree on a production machine. The installation command may overwrite your live release installation. If you already have MySQL installed and do not want to overwrite it, run CMake with values for the CMAKE_INSTALL_PREFIX, MYSQL_TCP_PORT, and MYSQL_UNIX_ADDR options different from those used by your production server. For additional information about preventing multiple servers from interfering with each other, see Section 7.8, "Running Multiple MySQL Instances on One Machine".

Play hard with your new installation. For example, try to make new features crash. Start by running make test. See The MySQL Test Suite.

\subsection*{2.8.6 Configuring SSL Library Support}

An SSL library is required for support of encrypted connections, entropy for random number generation, and other encryption-related operations.

If you compile MySQL from a source distribution, CMake configures the distribution to use the installed OpenSSL library by default.

To compile using OpenSSL, use this procedure:
1. Ensure that OpenSSL 1.0 .1 or newer is installed on your system. If the installed OpenSSL version is older than 1.0.1, CMake produces an error at MySQL configuration time. If it is necessary to obtain OpenSSL, visit http://www.openssl.org.
2. The WITH_SSL CMake option determines which SSL library to use for compiling MySQL (see Section 2.8.7, "MySQL Source-Configuration Options"). The default is - DWITH_SSL=system, which uses OpenSSL. To make this explicit, specify that option. For example:
```
cmake . -DWITH_SSL=system
```


That command configures the distribution to use the installed OpenSSL library. Alternatively, to explicitly specify the path name to the OpenSSL installation, use the following syntax. This can be useful if you have multiple versions of OpenSSL installed, to prevent CMake from choosing the wrong one:
```
cmake . -DWITH_SSL=path_name
```


Alternative OpenSSL system packages are supported by using WITH_SSL=openssl11 on EL7 or WITH_SSL=openssl3 on EL8. Authentication plugins, such as LDAP and Kerberos, are disabled since they do not support these alternative versions of OpenSSL.
3. Compile and install the distribution.

To check whether a mysqld server supports encrypted connections, examine the value of the tls_version system variable:
```
mysql> SHOW VARIABLES LIKE 'tls_version';
+----------------+-----------------+
| Variable_name | Value |
+----------------+-----------------+
| tls_version | TLSv1.2,TLSv1.3 |
+----------------+-----------------+
```


If the value contains TLS versions then the server supports encrypted connections, otherwise it does not.

For additional information, see Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".

\subsection*{2.8.7 MySQL Source-Configuration Options}

The CMake program provides a great deal of control over how you configure a MySQL source distribution. Typically, you do this using options on the CMake command line. For information about options supported by CMake, run either of these commands in the top-level source directory:
```
$> cmake . -LH
$> ccmake .
```


You can also affect CMake using certain environment variables. See Section 6.9, "Environment Variables".

For boolean options, the value may be specified as 1 or ON to enable the option, or as 0 or OFF to disable the option.

Many options configure compile-time defaults that can be overridden at server startup. For example, the CMAKE_INSTALL_PREFIX, MYSQL_TCP_PORT, and MYSQL_UNIX_ADDR options that configure the default installation base directory location, TCP/IP port number, and Unix socket file can be changed at server startup with the --basedir, --port, and --socket options for mysqld. Where applicable, configuration option descriptions indicate the corresponding mysqld startup option.

The following sections provide more information about CMake options.
- CMake Option Reference
- General Options
- Installation Layout Options
- Storage Engine Options
- Feature Options
- Compiler Flags
- CMake Options for Compiling NDB Cluster

\section*{CMake Option Reference}

The following table shows the available CMake options. In the Default column, PREFIX stands for the value of the CMAKE_INSTALL_PREFIX option, which specifies the installation base directory. This value is used as the parent location for several of the installation subdirectories.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.15 MySQL Source-Configuration Option Reference (CMake)}
\begin{tabular}{|l|l|l|}
\hline Formats & Description & Default \\
\hline ADD_GDB_INDEX & Whether to enable generation of .gdb_index section in binaries & \\
\hline BUILD_CONFIG & Use same build options as official releases & \\
\hline BUNDLE_RUNTIME_LIBRARIES & Bundle runtime libraries with server MSI and Zip packages for Windows & OFF \\
\hline CMAKE_BUILD_TYPE & Type of build to produce & RelWithDebInfo \\
\hline CMAKE_CXX_FLAGS & Flags for C++ Compiler & \\
\hline CMAKE_C_FLAGS & Flags for C Compiler & \\
\hline CMAKE_INSTALL_PREFIX & Installation base directory & /usr/local/mysql \\
\hline COMPILATION_COMMENT & Comment about compilation environment & \\
\hline COMPILATION_COMMENT_SERVE & Comment about compilation environment for use by mysqld & \\
\hline COMPRESS_DEBUG_SECTIONS & Compress debug sections of binary executables & OFF \\
\hline CPACK_MONOLITHIC_INSTALL & Whether package build produces single file & OFF \\
\hline DEFAULT_CHARSET & The default server character set & utf8mb4 \\
\hline DEFAULT_COLLATION & The default server collation & utf8mb4_0900_ai_ci \\
\hline DISABLE_PSI_COND & Exclude Performance Schema condition instrumentation & OFF \\
\hline DISABLE_PSI_DATA_LOCK & Exclude the performance schema data lock instrumentation & OFF \\
\hline DISABLE_PSI_ERROR & Exclude the performance schema server error instrumentation & OFF \\
\hline DISABLE_PSI_FILE & Exclude Performance Schema file instrumentation & OFF \\
\hline DISABLE_PSI_IDLE & Exclude Performance Schema idle instrumentation & OFF \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Formats & Description & Default \\
\hline DISABLE_PSI_MEMORY & Exclude Performance Schema memory instrumentation & OFF \\
\hline DISABLE_PSI_METADATA & Exclude Performance Schema metadata instrumentation & OFF \\
\hline DISABLE_PSI_MUTEX & Exclude Performance Schema mutex instrumentation & OFF \\
\hline DISABLE_PSI_PS & Exclude the performance schema prepared statements & OFF \\
\hline DISABLE_PSI_RWLOCK & Exclude Performance Schema rwlock instrumentation & OFF \\
\hline DISABLE_PSI_SOCKET & Exclude Performance Schema socket instrumentation & OFF \\
\hline DISABLE_PSI_SP & Exclude Performance Schema stored program instrumentation & OFF \\
\hline DISABLE_PSI_STAGE & Exclude Performance Schema stage instrumentation & OFF \\
\hline DISABLE_PSI_STATEMENT & Exclude Performance Schema statement instrumentation & OFF \\
\hline DISABLE_PSI_STATEMENT_DIG & EXCIude Performance Schema statements_digest instrumentation & OFF \\
\hline DISABLE_PSI_TABLE & Exclude Performance Schema table instrumentation & OFF \\
\hline DISABLE_PSI_THREAD & Exclude the performance schema thread instrumentation & OFF \\
\hline DISABLE_PSI_TRANSACTION & Exclude the performance schema transaction instrumentation & OFF \\
\hline ENABLED_LOCAL_INFILE & Whether to enable LOCAL for LOAD DATA & OFF \\
\hline ENABLED_PROFILING & Whether to enable query profiling code & ON \\
\hline ENABLE_EXPERIMENTAL_SYSVA & Whether to enabled experimental InnoDB system variables & OFF \\
\hline ENABLE_GCOV & Whether to include gcov support & \\
\hline ENABLE_GPROF & Enable gprof (optimized Linux builds only) & OFF \\
\hline FORCE_COLORED_OUTPUT & Whether to colorize compiler output & OFF \\
\hline FORCE_INSOURCE_BUILD & Whether to force an in-source build & OFF \\
\hline FORCE_UNSUPPORTED_COMPILE & */ compilers & OFF \\
\hline FPROFILE_GENERATE & Whether to generate profile guided optimization data & OFF \\
\hline FPROFILE_USE & Whether to use profile guided optimization data & OFF \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Formats & Description & Default \\
\hline HAVE_PSI_MEMORY_INTERFACE & Enable performance schema memory tracing module for memory allocation functions used in dynamic storage of overaligned types & OFF \\
\hline IGNORE_AIO_CHECK & With DBUILD_CONFIG=mysql_release, ignore libaio check & OFF \\
\hline INSTALL_BINDIR & User executables directory & PREFIX/bin \\
\hline INSTALL_DOCDIR & Documentation directory & PREFIX/docs \\
\hline INSTALL_DOCREADMEDIR & README file directory & PREFIX \\
\hline INSTALL_INCLUDEDIR & Header file directory & PREFIX/include \\
\hline INSTALL_INFODIR & Info file directory & PREFIX/docs \\
\hline INSTALL_LAYOUT & Select predefined installation layout & STANDALONE \\
\hline INSTALL_LIBDIR & Library file directory & PREFIX/lib \\
\hline INSTALL_MANDIR & Manual page directory & PREFIX/man \\
\hline INSTALL_MYSQLSHAREDIR & Shared data directory & PREFIX/share \\
\hline INSTALL_MYSQLTESTDIR & mysql-test directory & PREFIX/mysql-test \\
\hline INSTALL_PKGCONFIGDIR & Directory for mysqlclient.pc pkgconfig file & INSTALL_LIBDIR/pkgconfig \\
\hline INSTALL_PLUGINDIR & Plugin directory & PREFIX/lib/plugin \\
\hline INSTALL_PRIV_LIBDIR & Installation private library directory & \\
\hline INSTALL_SBINDIR & Server executable directory & PREFIX/bin \\
\hline INSTALL_SECURE_FILE_PRIVD & Isecure_file_priv default value & platform specific \\
\hline INSTALL_SHAREDIR & aclocal/mysql.m4 installation directory & PREFIX/share \\
\hline INSTALL_STATIC_LIBRARIES & Whether to install static libraries & ON \\
\hline INSTALL_SUPPORTFILESDIR & Extra support files directory & PREFIX/support-files \\
\hline LINK_RANDOMIZE & Whether to randomize order of symbols in mysqld binary & OFF \\
\hline LINK_RANDOMIZE_SEED & Seed value for LINK_RANDOMIZE option & mysql \\
\hline MAX_INDEXES & Maximum indexes per table & 64 \\
\hline MSVC_CPPCHECK & Enable MSVC code analysis. & ON \\
\hline MUTEX_TYPE & InnoDB mutex type & event \\
\hline MYSQLX_TCP_PORT & TCP/IP port number used by X Plugin & 33060 \\
\hline MYSQLX_UNIX_ADDR & Unix socket file used by X Plugin & /tmp/mysqlx.sock \\
\hline MYSQL_DATADIR & Data directory & \\
\hline MYSQL_MAINTAINER_MODE & Whether to enable MySQL maintainer-specific development environment & OFF \\
\hline MYSQL_PROJECT_NAME & Windows/macOS project name & MySQL \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Formats & Description & Default \\
\hline MYSQL_TCP_PORT & TCP/IP port number & 3306 \\
\hline MYSQL_UNIX_ADDR & Unix socket file & /tmp/mysql.sock \\
\hline NDB_UTILS_LINK_DYNAMIC & Cause NDB tools to be dynamically linked to ndbclient & \\
\hline ODBC_INCLUDES & ODBC includes directory & \\
\hline ODBC_LIB_DIR & ODBC library directory & \\
\hline OPTIMIZER_TRACE & Whether to support optimizer tracing & \\
\hline OPTIMIZE_SANITIZER_BUILDS & Whether to optimize sanitizer builds & ON \\
\hline REPRODUCIBLE_BUILD & Take extra care to create a build result independent of build location and time & \\
\hline SHOW_SUPPRESSED_COMPILER & WARAtheG to show suppressed compiler warnings and not fail with -Werror. & OFF \\
\hline SYSCONFDIR & Option file directory & \\
\hline SYSTEMD_PID_DIR & Directory for PID file under systemd & /var/run/mysqld \\
\hline SYSTEMD_SERVICE_NAME & Name of MySQL service under systemd & mysqld \\
\hline TMPDIR & tmpdir default value & \\
\hline WIN_DEBUG_NO_INLINE & Whether to disable function inlining & OFF \\
\hline WITHOUT_SERVER & Do not build the server; internal use only & OFF \\
\hline WITHOUT_xxx_STORAGE_ENGIN & Exclude storage engine xxx from build & \\
\hline WITH_ANT & Path to Ant for building GCS Java wrapper & \\
\hline WITH_ASAN & Enable AddressSanitizer & OFF \\
\hline WITH_ASAN_SCOPE & Enable AddressSanitizer -fsanitize-address-use-afterscope Clang flag & OFF \\
\hline WITH_AUTHENTICATION_CLIEN & Enabled astomatically if any corresponding server authentication plugins are built & \\
\hline WITH_AUTHENTICATION_LDAP & Whether to report error if LDAP authentication plugins cannot be built & OFF \\
\hline WITH_AUTHENTICATION_PAM & Build PAM authentication plugin & OFF \\
\hline WITH_AWS_SDK & Location of Amazon Web Services software development kit & \\
\hline WITH_BUILD_ID & On Linux systems, generate a unique build ID & ON \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Formats & Description & Default \\
\hline WITH_CLASSPATH & Classpath to use when building MySQL Cluster Connector for Java. Default is an empty string. & \\
\hline WITH_CLIENT_PROTOCOL_TRAC & Butild client-side protocol tracing framework & ON \\
\hline WITH_CURL & Location of curl library & \\
\hline WITH_DEBUG & Whether to include debugging support & OFF \\
\hline WITH_DEFAULT_COMPILER_OPT & Whether to use default compiler options & ON \\
\hline WITH_DEVELOPER_ENTITLEMEN & Whether to add the 'get-task-allow' entitlement to all executables on macOS to generate a core dump in the event of an unexpected server halt & OFF \\
\hline WITH_EDITLINE & Which libedit/editline library to use & bundled \\
\hline WITH_ERROR_INSERT & Enable error injection in the NDB storage engine. Should not be used for building binaries intended for production. & OFF \\
\hline WITH_ICU & Type of ICU support & bundled \\
\hline WITH_INNODB_EXTRA_DEBUG & Whether to include extra debugging support for InnoDB. & OFF \\
\hline WITH_JEMALLOC & Whether to link with -ljemalloc & OFF \\
\hline WITH_LD & Whether to use the LLVM Ild or mold linker & \\
\hline WITH_LIBEVENT & Which libevent library to use & bundled \\
\hline WITH_LIBWRAP & Whether to include libwrap (TCP wrappers) support & OFF \\
\hline WITH_LOCK_ORDER & Whether to enable LOCK_ORDER tooling & OFF \\
\hline WITH_LSAN & Whether to run LeakSanitizer, without AddressSanitizer & OFF \\
\hline WITH_LTO & Enable link-time optimizer & OFF \\
\hline WITH_LZ4 & Type of LZ4 library support & bundled \\
\hline WITH_MECAB & Compiles MeCab & \\
\hline WITH_MSAN & Enable MemorySanitizer & OFF \\
\hline WITH_MSCRT_DEBUG & Enable Visual Studio CRT memory leak tracing & OFF \\
\hline WITH_MYSQLX & Whether to disable X Protocol & ON \\
\hline WITH_NDB & Build MySQL NDB Cluster, including NDB storage engine and all NDB programs & OFF \\
\hline WITH_NDBAPI_EXAMPLES & Build API example programs. & OFF \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Formats & Description & Default \\
\hline WITH_NDBCLUSTER & NDB 8.0.30 and earlier: Build NDB storage engine. NDB 8.0.31 and later: Deprecated; use WITH_NDB instead & OFF \\
\hline WITH_NDBCLUSTER_STORAGE_E & Próld for NDB 8.0.31, this was for internal use only. NDB 8.0.31 and later: toggles (only) inclusion of NDBCLUSTER storage engine & ON \\
\hline WITH_NDBMTD & Build multithreaded data node binary & ON \\
\hline WITH_NDB_DEBUG & Produce a debug build for testing or troubleshooting. & OFF \\
\hline WITH_NDB_JAVA & Enable building of Java and ClusterJ support. Enabled by default. Supported in MySQL Cluster only. & ON \\
\hline WITH_NDB_PORT & Default port used by a management server built with this option. If this option was not used to build it, the management server's default port is 1186. & [none] \\
\hline WITH_NDB_TEST & Include NDB API test programs. & OFF \\
\hline WITH_NDB_TLS_SEARCH_PATH & Default path used by NDB programs to search for TLS certificate and key files. & \$HOME/ndb-tls \\
\hline WITH_NUMA & Set NUMA memory allocation policy & \\
\hline WITH_PACKAGE_FLAGS & For flags typically used for RPM/ DEB packages, whether to add them to standalone builds on those platforms & \\
\hline WITH_PROTOBUF & Which Protocol Buffers package to use & bundled \\
\hline WITH_RAPID & Whether to build rapid development cycle plugins & ON \\
\hline WITH_RAPIDJSON & Type of RapidJSON support & bundled \\
\hline WITH_ROUTER & Whether to build MySQL Router & ON \\
\hline WITH_SASL & Internal use only & \\
\hline WITH_SHOW_PARSE_TREE & Support for SHOW PARSE_TREE debugging statement & \\
\hline WITH_SSL & Type of SSL support & system \\
\hline WITH_SYSTEMD & Enable installation of systemd support files & OFF \\
\hline WITH_SYSTEMD_DEBUG & Enable additional systemd debug information & OFF \\
\hline WITH_SYSTEM_LIBS & Set system value of library options not set explicitly & OFF \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Formats & Description & Default \\
\hline WITH_TCMALLOC & Whether to link with -Itcmalloc. BUNDLED is supported on Linux only & OFF \\
\hline WITH_TEST_TRACE_PLUGIN & Build test protocol trace plugin & OFF \\
\hline WITH_TSAN & Enable ThreadSanitizer & OFF \\
\hline WITH_UBSAN & Enable Undefined Behavior Sanitizer & OFF \\
\hline WITH_UNIT_TESTS & Compile MySQL with unit tests & ON \\
\hline WITH_UNIXODBC & Enable unixODBC support & OFF \\
\hline WITH_VALGRIND & Whether to compile in Valgrind header files & OFF \\
\hline WITH_WIN_JEMALLOC & Path to directory containing jemalloc.dll & \\
\hline WITH_ZLIB & Type of zlib support & bundled \\
\hline WITH_ZSTD & Type of zstd support & bundled \\
\hline WITH_xxx_STORAGE_ENGINE & Compile storage engine xxx statically into server & \\
\hline
\end{tabular}

\section*{General Options}
- -DBUILD_CONFIG=mysql_release

This option configures a source distribution with the same build options used by Oracle to produce binary distributions for official MySQL releases.
- -DWITH_BUILD_ID=bool

On Linux systems, generates a unique build ID which is used as the value of the build_id system variable and written to the MySQL server log on startup. Set this option to OFF to disable this feature.

This option has no effect on platforms other than Linux.
- -DBUNDLE_RUNTIME_LIBRARIES=bool

Whether to bundle runtime libraries with server MSI and Zip packages for Windows.
- - DCMAKE_BUILD_TYPE=type

The type of build to produce:
- RelWithDebInfo: Enable optimizations and generate debugging information. This is the default MySQL build type.
- Release: Enable optimizations but omit debugging information to reduce the build size.
- Debug: Disable optimizations and generate debugging information. This build type is also used if the WITH_DEBUG option is enabled. That is, - DWITH_DEBUG=1 has the same effect as DCMAKE_BUILD_TYPE=Debug.

The option values None and MinSizeRel are not supported.
- -DCPACK_MONOLITHIC_INSTALL=bool

This option affects whether the make package operation produces multiple installation package files or a single file. If disabled, the operation produces multiple installation package files, which may
be useful if you want to install only a subset of a full MySQL installation. If enabled, it produces a single file for installing everything.
- -DFORCE_INSOURCE_BUILD=bool

Defines whether to force an in-source build. Out-of-source builds are recommended, as they permit multiple builds from the same source, and cleanup can be performed quickly by removing the build directory. To force an in-source build, invoke CMake with -DFORCE_INSOURCE_BUILD=ON.
- - DFORCE_COLORED_OUTPUT=bool

Defines whether to enable colorized compiler output for gcc and clang when compiling on the command line. Defaults to OFF.

\section*{Installation Layout Options}

The CMAKE_INSTALL_PREFIX option indicates the base installation directory. Other options with names of the form INSTALL_xxx that indicate component locations are interpreted relative to the prefix and their values are relative pathnames. Their values should not include the prefix.
- -DCMAKE_INSTALL_PREFIX=dir_name

The installation base directory.
This value can be set at server startup using the - - basedir option.
- - DINSTALL_BINDIR=dir_name

Where to install user programs.
- - DINSTALL_DOCDIR=dir_name

Where to install documentation.
- -DINSTALL_DOCREADMEDIR=dir_name

Where to install README files.
- -DINSTALL_INCLUDEDIR=dir_name

Where to install header files.
- -DINSTALL_INFODIR=dir_name

Where to install Info files.
- - DINSTALL_LAYOUT=name

Select a predefined installation layout:
- STANDALONE: Same layout as used for .tar.gz and . zip packages. This is the default.
- RPM: Layout similar to RPM packages.
- SVR4: Solaris package layout.
- DEB: DEB package layout (experimental).

You can select a predefined layout but modify individual component installation locations by specifying other options. For example:

The INSTALL_LAYOUT value determines the default value of the secure_file_priv system variable. See the description of this variable in Section 7.1.8, "Server System Variables".
- -DINSTALL_LIBDIR=dir_name

Where to install library files.
- - DINSTALL_MANDIR=dir_name

Where to install manual pages.
- - DINSTALL_MYSQLSHAREDIR=dir_name

Where to install shared data files.
- - DINSTALL_MYSQLTESTDIR=dir_name

Where to install the mysql-test directory. To suppress installation of this directory, explicitly set the option to the empty value (-DINSTALL_MYSQLTESTDIR=).
- -DINSTALL_PKGCONFIGDIR=dir_name

The directory in which to install the mysqlclient. pc file for use by pkg-config. The default value is INSTALL_LIBDIR/pkgconfig, unless INSTALL_LIBDIR ends with /mysql, in which case that is removed first.
- - DINSTALL_PLUGINDIR=dir_name

The location of the plugin directory.
This value can be set at server startup with the --plugin_dir option.
- -DINSTALL_PRIV_LIBDIR=dir_name

The location of the dynamic library directory.
Default location. For RPM builds, this is /usr/lib64/mysql/private/, for DEB it is /usr/ lib/mysql/private/, and for TAR it is lib/private/.

Protobuf. Because this is a private location, the loader (such as ld-linux. so on Linux) may not find the libprotobuf . so files without help. To guide the loader, RPATH=\$ORIGIN/ . . / \$INSTALL_PRIV_LIBDIR is added to mysqld and mysqlxtest. This works for most cases but when using the Resource Group feature, mysqld is setsuid, and the loader ignores any RPATH which contains $\$$ ORIGIN. To overcome this, an explicit full path to the directory is set in the DEB and RPM versions of mysqld, since the target destination is known. For tarball installs, patching of mysqld with a tool like patchelf is required.
- -DINSTALL_SBINDIR=dir_name

Where to install the mysqld server.
- -DINSTALL_SECURE_FILE_PRIVDIR=dir_name

The default value for the secure_file_priv system variable. The default value is platform specific and depends on the value of the INSTALL_LAYOUT CMake option; see the description of the secure_file_priv system variable in Section 7.1.8, "Server System Variables".
- - DINSTALL_SHAREDIR=dir_name

Where to install aclocal/mysql.m4.
- - DINSTALL_STATIC_LIBRARIES=bool

Whether to install static libraries. The default is ON. If set to OFF, these library files are not installed: libmysqlclient.a, libmysqlservices.a.
- - DINSTALL_SUPPORTFILESDIR=dir_name

Where to install extra support files.
- -DLINK_RANDOMIZE=bool

Whether to randomize the order of symbols in the mysqld binary. The default is 0FF. This option should be enabled only for debugging purposes.
- -DLINK_RANDOMIZE_SEED=val

Seed value for the LINK_RANDOMIZE option. The value is a string. The default is mysql, an arbitrary choice.
- - DMYSQL_DATADIR=dir_name

The location of the MySQL data directory.
This value can be set at server startup with the --datadir option.
- -DODBC_INCLUDES=dir_name

The location of the ODBC includes directory, which may be used while configuring Connector/ODBC.
- -DODBC_LIB_DIR=dir_name

The location of the ODBC library directory, which may be used while configuring Connector/ODBC.
- -DSYSCONFDIR=dir_name

The default my. cnf option file directory.
This location cannot be set at server startup, but you can start the server with a given option file using the --defaults-file=file_name option, where file_name is the full path name to the file.
- -DSYSTEMD_PID_DIR=dir_name

The name of the directory in which to create the PID file when MySQL is managed by systemd. The default is /var/run/mysqld; this might be changed implicitly according to the INSTALL_LAYOUT value.

This option is ignored unless WITH_SYSTEMD is enabled.
- - DSYSTEMD_SERVICE_NAME=name

The name of the MySQL service to use when MySQL is managed by systemd. The default is mysqld; this might be changed implicitly according to the INSTALL_LAYOUT value.

This option is ignored unless WITH_SYSTEMD is enabled.
- -DTMPDIR=dir_name

The default location to use for the tmpdir system variable. If unspecified, the value defaults to P_tmpdir in <stdio.h>.

\section*{Storage Engine Options}

Storage engines are built as plugins. You can build a plugin as a static module (compiled into the server) or a dynamic module (built as a dynamic library that must be installed into the server using the

INSTALL PLUGIN statement or the --plugin-load option before it can be used). Some plugins might not support static or dynamic building.

The InnoDB, MyISAM, MERGE, MEMORY, and CSV engines are mandatory (always compiled into the server) and need not be installed explicitly.

To compile a storage engine statically into the server, use -DWITH_engine_STORAGE_ENGINE=1. Some permissible engine values are ARCHIVE, BLACKHOLE, EXAMPLE, and FEDERATED. Examples:
-DWITH_ARCHIVE_STORAGE_ENGINE=1
-DWITH_BLACKHOLE_STORAGE_ENGINE=1
To build MySQL with support for NDB Cluster, use the WITH_NDB option.

\section*{Note}

It is not possible to compile without Performance Schema support. If it is desired to compile without particular types of instrumentation, that can be done with the following CMake options:
```
DISABLE_PSI_COND
DISABLE_PSI_DATA_LOCK
DISABLE_PSI_ERROR
DISABLE_PSI_FILE
DISABLE_PSI_IDLE
DISABLE_PSI_MEMORY
DISABLE_PSI_METADATA
DISABLE_PSI_MUTEX
DISABLE_PSI_PS
DISABLE_PSI_RWLOCK
DISABLE_PSI_SOCKET
DISABLE_PSI_SP
DISABLE_PSI_STAGE
DISABLE_PSI_STATEMENT
DISABLE_PSI_STATEMENT_DIGEST
DISABLE_PSI_TABLE
DISABLE_PSI_THREAD
DISABLE_PSI_TRANSACTION
```


For example, to compile without mutex instrumentation, configure MySQL using -DDISABLE_PSI_MUTEX=1.

To exclude a storage engine from the build, use - DWITH_engine_STORAGE_ENGINE=0. Examples:
```
-DWITH_ARCHIVE_STORAGE_ENGINE=0
-DWITH_EXAMPLE_STORAGE_ENGINE=0
-DWITH_FEDERATED_STORAGE_ENGINE=0
```


It is also possible to exclude a storage engine from the build using DWITHOUT_engine_STORAGE_ENGINE=1 (but - DWITH_engine_STORAGE_ENGINE=0 is preferred). Examples:
-DWITHOUT_ARCHIVE_STORAGE_ENGINE=1
-DWITHOUT_EXAMPLE_STORAGE_ENGINE=1
-DWITHOUT_FEDERATED_STORAGE_ENGINE=1
If neither -DWITH_engine_STORAGE_ENGINE nor -DWITHOUT_engine_STORAGE_ENGINE are specified for a given storage engine, the engine is built as a shared module, or excluded if it cannot be built as a shared module.

\section*{Feature Options}
- -DADD_GDB_INDEX=bool

This option determines whether to enable generation of a .gdb_index section in binaries, which makes loading them in a debugger faster. The option is disabled by default. lld linker is used, and is disabled by It has no effect if a linker other than lld or GNU gold is used.
- -DCOMPILATION_COMMENT=string

A descriptive comment about the compilation environment. While mysqld uses COMPILATION_COMMENT_SERVER, other programs use COMPILATION_COMMENT.
- - DCOMPRESS_DEBUG_SECTIONS=bool

Whether to compress the debug sections of binary executables (Linux only). Compressing executable debug sections saves space at the cost of extra CPU time during the build process.

The default is OFF. If this option is not set explicitly but the COMPRESS_DEBUG_SECTIONS environment variable is set, the option takes its value from that variable.
- -DCOMPILATION_COMMENT_SERVER=string

A descriptive comment about the compilation environment for use by mysqld (for example, to set the version_comment system variable). Programs other than the server use COMPILATION_COMMENT.
- -DDEFAULT_CHARSET=charset_name

The server character set. By default, MySQL uses the utf8mb4 character set.
charset_name may be one of binary, armscii8, ascii, big5, cp1250, cp1251, cp1256, cp1257, cp850, cp852, cp866, cp932, dec8, eucjpms, euckr, gb2312, gbk, geostd8, greek, hebrew, hp8, keybcs2, koi8r, koi8u, latin1, latin2, latin5, latin7, macce, macroman, sjis, swe7, tis620, ucs2, ujis, utf8mb3, utf8mb4, utf16, utf16le, utf32.

This value can be set at server startup with the --character-set-server option.
- -DDEFAULT_COLLATION=collation_name

The server collation. By default, MySQL uses utf8mb4_0900_ai_ci. Use the SHOW COLLATION statement to determine which collations are available for each character set.

This value can be set at server startup with the --collation_server option.
- - DDISABLE_PSI_COND=bool

Whether to exclude the Performance Schema condition instrumentation. The default is OFF (include).
- -DDISABLE_PSI_FILE=bool

Whether to exclude the Performance Schema file instrumentation. The default is OFF (include).
- -DDISABLE_PSI_IDLE=bool

Whether to exclude the Performance Schema idle instrumentation. The default is OFF (include).
- - DDISABLE_PSI_MEMORY=bool

Whether to exclude the Performance Schema memory instrumentation. The default is OFF (include).
- - DDISABLE_PSI_METADATA=bool

Whether to exclude the Performance Schema metadata instrumentation. The default is OFF (include).
- -DDISABLE_PSI_MUTEX=bool

Whether to exclude the Performance Schema mutex instrumentation. The default is OFF (include).
- -DDISABLE_PSI_RWLOCK=bool

Whether to exclude the Performance Schema rwlock instrumentation. The default is OFF (include).
- - DDISABLE_PSI_SOCKET=bool

Whether to exclude the Performance Schema socket instrumentation. The default is OFF (include).
- - DDISABLE_PSI_SP=bool

Whether to exclude the Performance Schema stored program instrumentation. The default is OFF (include).
- - DDISABLE_PSI_STAGE=bool

Whether to exclude the Performance Schema stage instrumentation. The default is OFF (include).
- -DDISABLE_PSI_STATEMENT=bool

Whether to exclude the Performance Schema statement instrumentation. The default is OFF (include).
- - DDISABLE_PSI_STATEMENT_DIGEST=bool

Whether to exclude the Performance Schema statement digest instrumentation. The default is OFF (include).
- - DDISABLE_PSI_TABLE=bool

Whether to exclude the Performance Schema table instrumentation. The default is OFF (include).
- - DDISABLE_PSI_PS=bool

Exclude the Performance Schema prepared statements instances instrumentation. The default is OFF (include).
- - DDISABLE_PSI_THREAD=bool

Exclude the Performance Schema thread instrumentation. The default is OFF (include).
Only disable threads when building without any instrumentation, because other instrumentations have a dependency on threads.
- - DDISABLE_PSI_TRANSACTION=bool

Exclude the Performance Schema transaction instrumentation. The default is OFF (include).
- -DDISABLE_PSI_DATA_LOCK=bool

Exclude the performance schema data lock instrumentation. The default is OFF (include).
- -DDISABLE_PSI_ERROR=bool

Exclude the performance schema server error instrumentation. The default is OFF (include).
- - DENABLE_EXPERIMENTAL_SYSVARS=bool

Whether to enable experimental InnoDB system variables. Experimental system variables are intended for those engaged in MySQL development, should only be used in a development or test environment, and may be removed without notice in a future MySQL release. For information about experimental system variables, refer to /storage/innobase/handler/ha_innodb.cc in the MySQL source tree. Experimental system variables can be identified by searching for "PLUGIN_VAR_EXPERIMENTAL".
- - DENABLE_GCOV=bool

Whether to include gcov support (Linux only).
- - DENABLE_GPROF=bool

Whether to enable gprof (optimized Linux builds only).
- - DENABLED_LOCAL_INFILE=bool

This option controls the compiled-in default LOCAL capability for the MySQL client library. Clients that make no explicit arrangements therefore have LOCAL capability disabled or enabled according to the ENABLED_LOCAL_INFILE setting specified at MySQL build time.

By default, the client library in MySQL binary distributions is compiled with ENABLED_LOCAL_INFILE disabled. If you compile MySQL from source, configure it with ENABLED_LOCAL_INFILE disabled or enabled based on whether clients that make no explicit arrangements should have LOCAL capability disabled or enabled, respectively.

ENABLED_LOCAL_INFILE controls the default for client-side LOCAL capability. For the server, the local_infile system variable controls server-side LOCAL capability. To explicitly cause the server to refuse or permit LOAD DATA LOCAL statements (regardless of how client programs and libraries are configured at build time or runtime), start mysqld with--local-infile disabled or enabled, respectively. local_infile can also be set at runtime. See Section 8.1.6, "Security Considerations for LOAD DATA LOCAL".
- - DENABLED_PROFILING=bool

Whether to enable query profiling code (for the SHOW PROFILE and SHOW PROFILES statements).
- -DFORCE_UNSUPPORTED_COMPILER=bool

By default, CMake checks for minimum versions of supported compilers; to disable this check, use DFORCE_UNSUPPORTED_COMPILER=ON.
- - DFPROFILE_GENERATE=bool

Whether to generate profile guided optimization (PGO) data. This option is available for experimenting with PGO with GCC. See cmake/fprofile.cmake in the MySQL source distribution for information about using FPROFILE_GENERATE and FPROFILE_USE. These options have been tested with GCC 8 and 9.
- - DFPROFILE_USE=bool

Whether to use profile guided optimization (PGO) data. This option is available for experimenting with PGO with GCC. See the cmake/fprofile.cmake file in a MySQL source distribution for information about using FPROFILE_GENERATE and FPROFILE_USE. These options have been tested with GCC 8 and 9.

Enabling FPROFILE_USE also enables WITH_LTO.
- - DHAVE_PSI_MEMORY_INTERFACE=bool

Whether to enable the performance schema memory tracing module for memory allocation functions (ut::aligned_name library functions) used in dynamic storage of over-aligned types.
- -DIGNORE_AIO_CHECK=bool

If the -DBUILD_CONFIG=mysql_release option is given on Linux, the libaio library must be linked in by default. If you do not have libaio or do not want to install it, you can suppress the check for it by specifying - DIGNORE_AIO_CHECK=1.
- -DMAX_INDEXES=num

The maximum number of indexes per table. The default is 64 . The maximum is 255 . Values smaller than 64 are ignored and the default of 64 is used.
- - DMYSQL_MAINTAINER_MODE=bool

Whether to enable a MySQL maintainer-specific development environment. If enabled, this option causes compiler warnings to become errors.
- - DWITH_DEVELOPER_ENTITLEMENTS=bool

Whether to add the get-task-allow entitlement to all executables to generate a core dump in the event of an unexpected server halt.

On macOS 11+, core dumps are limited to processes with the com.apple.security.get-taskallow entitlement, which this CMake option enables. The entitlement allows other processes to attach and read/modify the processes memory, and allows --core-file to function as expected.
- - DMUTEX_TYPE=type

The mutex type used by InnoDB. Options include:
- event: Use event mutexes. This is the default value and the original InnoDB mutex implementation.
- sys: Use POSIX mutexes on UNIX systems. Use CRITICAL_SECTION objects on Windows, if available.
- futex: Use Linux futexes instead of condition variables to schedule waiting threads.
- - DMYSQLX_TCP_PORT=port_num

The port number on which X Plugin listens for TCP/IP connections. The default is 33060 .
This value can be set at server startup with the mysqlx_port system variable.
- -DMYSQLX_UNIX_ADDR=file_name

The Unix socket file path on which the server listens for X Plugin socket connections. This must be an absolute path name. The default is /tmp/mysqlx. sock.

This value can be set at server startup with the mysqlx_port system variable.
- - DMYSQL_PROJECT_NAME=name

For Windows or macOS, the project name to incorporate into the project file name.
- - DMYSQL_TCP_PORT=port_num

The port number on which the server listens for TCP/IP connections. The default is 3306.
This value can be set at server startup with the --port option.
- -DMYSQL_UNIX_ADDR=file_name

The Unix socket file path on which the server listens for socket connections. This must be an absolute path name. The default is / tmp/mysql.sock.

This value can be set at server startup with the --socket option.
- - DOPTIMIZER_TRACE=bool

Whether to support optimizer tracing. See Section 10.15, "Tracing the Optimizer".
- - DREPRODUCIBLE_BUILD=bool

For builds on Linux systems, this option controls whether to take extra care to create a build result independent of build location and time.

This option defaults to 0N for RelWithDebInfo builds.
- -DSHOW_SUPPRESSED_COMPILER_WARNINGS=bool

Show suppressed compiler warnings, and do so without failing with -Werror. Defaults to OFF.
- -DWIN_DEBUG_NO_INLINE=bool

Whether to disable function inlining on Windows. The default is OFF (inlining enabled).
- - DWITH_LD=string

CMake uses the standard linker by default. Optionally pass in lld or mold to specify an alternative linker. mold must be version 2 or newer.

This option can be used on Linux-based systems other than Enterprise Linux, which always uses the ld linker.

\section*{Note}

Previously, the option USE_LD_LLD could be used to enable (the default) or disable explicitly the LLVM 11d linker for Clang. In MySQL 8.3, USE_LD_LLD has been removed.
- - DWITH_ANT=path_name

Set the path to Ant, required when building GCS Java wrapper. Set WITH_ANT to the path of a directory where the Ant tarball or unpacked archive is saved. When WITH_ANT is not set, or is set with the special value system, the build process assumes a binary ant exists in \$PATH.
- - DWITH_ASAN=bool

Whether to enable the AddressSanitizer, for compilers that support it. The default is 0FF.
- - DWITH_ASAN_SCOPE=bool

Whether to enable the AddressSanitizer-fsanitize-address-use-after-scope Clang flag for use-after-scope detection. The default is off. To use this option, -DWITH_ASAN must also be enabled.
- - DWITH_AUTHENTICATION_CLIENT_PLUGINS=bool

This option is enabled automatically if any corresponding server authentication plugins are built. Its value thus depends on other CMake options and it should not be set explicitly.
- - DWITH_AUTHENTICATION_LDAP=bool

Whether to report an error if the LDAP authentication plugins cannot be built:
- If this option is disabled (the default), the LDAP plugins are built if the required header files and libraries are found. If they are not, CMake displays a note about it.
- If this option is enabled, a failure to find the required header file and libraries causes CMake to produce an error, preventing the server from being built.
- - DWITH_AUTHENTICATION_PAM=bool

Whether to build the PAM authentication plugin, for source trees that include this plugin. (See Section 8.4.1.5, "PAM Pluggable Authentication".) If this option is specified and the plugin cannot be compiled, the build fails.
- - DWITH_AWS_SDK=path_name

The location of the Amazon Web Services software development kit.
- - DWITH_CLIENT_PROTOCOL_TRACING=bool

Whether to build the client-side protocol tracing framework into the client library. By default, this option is enabled.

For information about writing protocol trace client plugins, see Writing Protocol Trace Plugins.
See also the WITH_TEST_TRACE_PLUGIN option.
- - DWITH_CURL=curl_type

The location of the curl library. curl_type can be system (use the system curl library), a path name to the curl library, no|off|none to disable curl support, or bundled to use the bundled curl distribution in extra/curl/.
- - DWITH_DEBUG=bool

Whether to include debugging support.
Configuring MySQL with debugging support enables you to use the --debug="d,parser_debug" option when you start the server. This causes the Bison parser that is used to process SQL statements to dump a parser trace to the server's standard error output. Typically, this output is written to the error log.

Sync debug checking for the InnoDB storage engine is defined under UNIV_DEBUG and is available when debugging support is compiled in using the WITH_DEBUG option. When debugging support is compiled in, the innodb_sync_debug configuration option can be used to enable or disable InnoDB sync debug checking.

Enabling WITH_DEBUG also enables Debug Sync. This facility is used for testing and debugging. When compiled in, Debug Sync is disabled by default at runtime. To enable it, start mysqld with the --debug-sync-timeout $=N$ option, where $N$ is a timeout value greater than 0 . (The default value is 0 , which disables Debug Sync.) $N$ becomes the default timeout for individual synchronization points.

Sync debug checking for the InnoDB storage engine is available when debugging support is compiled in using the WITH_DEBUG option.

For a description of the Debug Sync facility and how to use synchronization points, see MySQL Internals: Test Synchronization.
- - DWITH_EDITLINE=value

Which libedit/editline library to use. The permitted values are bundled (the default) and system.
- -DWITH_ICU=\{icu_type|path_name\}

MySQL uses International Components for Unicode (ICU) to support regular expression operations. The WITH_ICU option indicates the type of ICU support to include or the path name to the ICU installation to use.
- icu_type can be one of the following values:
- bundled: Use the ICU library bundled with the distribution. This is the default, and is the only supported option for Windows.
- system: Use the system ICU library.
- path_name is the path name to the ICU installation to use. This can be preferable to using the icu_type value of system because it can prevent CMake from detecting and using an older or incorrect ICU version installed on the system. (Another permitted way to do the same thing is to set WITH_ICU to system and set the CMAKE_PREFIX_PATH option to path_name.)
- - DWITH_INNODB_EXTRA_DEBUG=bool

Whether to include extra InnoDB debugging support.
Enabling WITH_INNODB_EXTRA_DEBUG turns on extra InnoDB debug checks. This option can only be enabled when WITH_DEBUG is enabled.
- - DWITH_JEMALLOC=bool

Whether to link with -ljemalloc. If enabled, built-in malloc(), calloc(), realloc(), and free( ) routines are disabled. The default is OFF.

WITH_JEMALLOC and WITH_TCMALLOC are mutually exclusive.
- - DWITH_LIBEVENT=string

Which libevent library to use. Permitted values are bundled (default) and system. If system is specified and no system libevent library can be found, an error occurs regardless, and the bundled libevent is not used.

The libevent library is required by X Plugin and MySQL Router.
- - DWITH_LIBWRAP=bool

Whether to include libwrap (TCP wrappers) support.
- - DWITH_LOCK_ORDER=bool

Whether to enable LOCK_ORDER tooling. By default, this option is disabled and server builds contain no tooling. If tooling is enabled, the LOCK_ORDER tool is available and can be used as described in Section 7.9.3, "The LOCK_ORDER Tool".

\section*{Note}

With the WITH_LOCK_ORDER option enabled, MySQL builds require the flex program.
- - DWITH_LSAN=bool

Whether to run LeakSanitizer, without AddressSanitizer. The default is OFF.
- - DWITH_LTO=bool

Whether to enable the link-time optimizer, if the compiler supports it. The default is OFF unless FPROFILE_USE is enabled.
- - DWITH_LZ4=lz4_type

The WITH_LZ4 option indicates the source of zlib support:
- bundled: Use the lz4 library bundled with the distribution. This is the default.
- system: Use the system lz4 library.
- -DWITH_MECAB=\{disabled|system|path_name\}

Use this option to compile the MeCab parser. If you have installed MeCab to its default installation directory, set -DWITH_MECAB=system. The system option applies to MeCab installations performed from source or from binaries using a native package management utility. If you installed MeCab to a custom installation directory, specify the path to the MeCab installation, for example, DWITH_MECAB=/opt/mecab. If the system option does not work, specifying the MeCab installation path should work in all cases.

For related information, see Section 14.9.9, "MeCab Full-Text Parser Plugin".
- - DWITH_MSAN=bool

Whether to enable MemorySanitizer, for compilers that support it. The default is off.
For this option to have an effect if enabled, all libraries linked to MySQL must also have been compiled with the option enabled.
- - DWITH_MSCRT_DEBUG=bool

Whether to enable Visual Studio CRT memory leak tracing. The default is OFF.
- -DMSVC_CPPCHECK=bool

Whether to enable MSVC code analysis. The default is 0 N .
- - DWITH_MYSQLX=bool

Whether to build with support for X Plugin. The default is 0N. See Chapter 22, Using MySQL as a Document Store.
- - DWITH_NUMA=bool

Explicitly set the NUMA memory allocation policy. CMake sets the default WITH_NUMA value based on whether the current platform has NUMA support. For platforms without NUMA support, CMake behaves as follows:
- With no NUMA option (the normal case), CMake continues normally, producing only this warning: NUMA library missing or required version not available.
- With - DWITH_NUMA=ON, CMake aborts with this error: NUMA library missing or required version not available.
- - DWITH_PACKAGE_FLAGS=bool

For flags typically used for RPM and Debian packages, whether to add them to standalone builds on those platforms. The default is 0N for nondebug builds.
- - DWITH_PROTOBUF=protobuf_type

Which Protocol Buffers package to use. protobuf_type can be one of the following values:
- bundled: Use the package bundled with the distribution. This is the default. Optionally use INSTALL_PRIV_LIBDIR to modify the dynamic Protobuf library directory.
- system: Use the package installed on the system.

Other values are ignored, with a fallback to bundled.
- - DWITH_RAPID=bool

Whether to build the rapid development cycle plugins. When enabled, a rapid directory is created in the build tree containing these plugins. When disabled, no rapid directory is created in the build tree. The default is ON, unless the rapid directory is removed from the source tree, in which case the default becomes OFF.
- -DWITH_RAPIDJSON=rapidjson_type

The type of RapidJSON library support to include. rapidjson_type can be one of the following values:
- bundled: Use the RapidJSON library bundled with the distribution. This is the default.
- system: Use the system RapidJSON library. Version 1.1.0 or later is required.
- - DWITH_ROUTER=bool

Whether to build MySQL Router. The default is ON.
- -DWITH_SASL=value

Internal use only. Not supported on Windows.
- -DWITH_SSL=\{ssl_type|path_name\}

For support of encrypted connections, entropy for random number generation, and other encryptionrelated operations, MySQL must be built using an SSL library. This option specifies which SSL library to use.
- ssl_type can be one of the following values:
- system: Use the system OpenSSL library. This is the default.

On macOS and Windows, using system configures MySQL to build as if CMake was invoked with path_name points to a manually installed OpenSSL library. This is because they do not have system SSL libraries. On macOS, brew install openss/ installs to /usr/local/opt/ openssl so that system can find it. On Windows, it checks \%ProgramFiles\%/OpenSSL, \%ProgramFiles\%/OpenSSL-Win32, \%ProgramFiles\%/OpenSSL-Win64, C:/OpenSSL, C:/OpenSSL-Win32, and C:/OpenSSL-Win64.
- yes: This is a synonym for system.
- opensslversion: Use an alternate OpenSSL system package such as openssl11 on EL7, or openssl3 (or openssl3-fips) on EL8.

Authentication plugins, such as LDAP and Kerberos, are disabled as they do not support these alternative versions of OpenSSL.
- path_name is the path name to the OpenSSL installation to use. This can be preferable to using the ssl_type value system because it can prevent CMake from detecting and using an older or
incorrect OpenSSL version installed on the system. (Another permitted way to do the same thing is to set WITH_SSL to system and set the CMAKE_PREFIX_PATH option to path_name.)

For additional information about configuring the SSL library, see Section 2.8.6, "Configuring SSL Library Support".
- - DWITH_SHOW_PARSE_TREE=bool

Enables support for SHOW PARSE_TREE in the server, used in development and debugging only. Not used for release builds or supported in production.
- - DWITH_SYSTEMD=bool

Whether to enable installation of systemd support files. By default, this option is disabled. When enabled, systemd support files are installed, and scripts such as mysqld_safe and the System V initialization script are not installed. On platforms where systemd is not available, enabling WITH_SYSTEMD results in an error from CMake.

When the server was built using this option, MySQL includes all systemd messages in the server's error log (see Section 7.4.2, "The Error Log").

For more information about using systemd, see Section 2.5.9, "Managing MySQL Server with systemd". That section also includes information about specifying options otherwise specified in [mysqld_safe] option groups. Because mysqld_safe is not installed when systemd is used, such options must be specified another way.
- - DWITH_SYSTEM_LIBS=bool

This option serves as an "umbrella" option to set the system value of any of the following CMake options that are not set explicitly: WITH_CURL, WITH_EDITLINE, WITH_ICU, WITH_LIBEVENT, WITH_LZ4, WITH_LZMA, WITH_PROTOBUF, WITH_RE2, WITH_SSL, WITH_ZLIB, WITH_ZSTD.
- - DWITH_SYSTEMD_DEBUG=bool

Whether to produce additional systemd debugging information, for platforms on which systemd is used to run MySQL. The default is OFF.
- - DWITH_TCMALLOC=bool

Whether to link with -ltcmalloc. If enabled, built-in malloc(), calloc(), realloc(), and free( ) routines are disabled. The default is OFF.

Beginning with MySQL 8.4.1, a tcmalloc library is included in the source; you can cause the build to use the bundled version by setting this option to BUNDLED. BUNDLED is supported on Linux systems only.

WITH_TCMALLOC and WITH_JEMALLOC are mutually exclusive.
- - DWITH_TEST_TRACE_PLUGIN=bool

Whether to build the test protocol trace client plugin (see Using the Test Protocol Trace Plugin). By default, this option is disabled. Enabling this option has no effect unless the WITH_CLIENT_PROTOCOL_TRACING option is enabled. If MySQL is configured with both options enabled, the libmysqlclient client library is built with the test protocol trace plugin built in, and all the standard MySQL clients load the plugin. However, even when the test plugin is enabled, it has no effect by default. Control over the plugin is afforded using environment variables; see Using the Test Protocol Trace Plugin.

Note
Do not enable the WITH_TEST_TRACE_PLUGIN option if you want to use your own protocol trace plugins because only one such plugin can be loaded
> at a time and an error occurs for attempts to load a second one. If you have already built MySQL with the test protocol trace plugin enabled to see how it works, you must rebuild MySQL without it before you can use your own plugins.

For information about writing trace plugins, see Writing Protocol Trace Plugins.
- - DWITH_TSAN=bool

Whether to enable the ThreadSanitizer, for compilers that support it. The default is off.
- - DWITH_UBSAN=bool

Whether to enable the Undefined Behavior Sanitizer, for compilers that support it. The default is off.
- - DWITH_UNIT_TESTS=\{ON|OFF\}

If enabled, compile MySQL with unit tests. The default is ON unless the server is not being compiled.
- - DWITH_UNIXODBC=1

Enables unixODBC support, for Connector/ODBC.
- - DWITH_VALGRIND=bool

Whether to compile in the Valgrind header files, which exposes the Valgrind API to MySQL code. The default is 0FF.

To generate a Valgrind-aware debug build, - DWITH_VALGRIND=1 normally is combined with DWITH_DEBUG=1. See Building Debug Configurations.
- - DWITH_WIN_JEMALLOC=string

On Windows, pass in a path to a directory containing jemalloc.dll to enable jemalloc functionality. The build system copies jemalloc.dll to the same directory as mysqld.exe and/ or mysqld-debug.exe and utilizes it for memory management operations. Standard memory functions are used if jemalloc.dll is not found or does not export the required functions. An INFORMATION level log message records whether or not jemalloc is found and used.

This option is enabled for official MySQL binaries for Windows.
- -DWITH_ZLIB=zlib_type

Some features require that the server be built with compression library support, such as the COMPRESS( ) and UNCOMPRESS( ) functions, and compression of the client/server protocol. The WITH_ZLIB option indicates the source of zlib support:

The minimum supported version of zlib is 1.2.13.
- bundled: Use the zlib library bundled with the distribution. This is the default.
- system: Use the system zlib library.
- - DWITH_ZSTD=zstd_type

Connection compression using the zstd algorithm (see Section 6.2.8, "Connection Compression Control") requires that the server be built with zstd library support. The WITH_ZSTD option indicates the source of zstd support:
- bundled: Use the zstd library bundled with the distribution. This is the default.
- system: Use the system zstd library.
- - DWITHOUT_SERVER=bool

Whether to build without MySQL Server. The default is OFF, which does build the server.
This is considered an experimental option; it is preferred to build with the server.
This option also prevents building of the NDB storage engine or any NDB binaries including management and data node programs.

\section*{Compiler Flags}
- -DCMAKE_C_FLAGS="flags"

Flags for the C compiler.
- -DCMAKE_CXX_FLAGS="flags"

Flags for the C++ compiler.
- - DWITH_DEFAULT_COMPILER_OPTIONS=bool

Whether to use the flags from cmake/build_configurations/compiler_options.cmake.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0232.jpg?height=124&width=101&top_left_y=1103&top_left_x=340)

Note
All optimization flags are carefully chosen and tested by the MySQL build team. Overriding them can lead to unexpected results and is done at your own risk.
- -DOPTIMIZE_SANITIZER_BUILDS=bool

Whether to add-01 - fno-inline to sanitizer builds. The default is ON.
To specify your own C and C++ compiler flags, for flags that do not affect optimization, use the CMAKE_C_FLAGS and CMAKE_CXX_FLAGS CMake options.

When providing your own compiler flags, you might want to specify CMAKE_BUILD_TYPE as well.
For example, to create a 32 -bit release build on a 64 -bit Linux machine, do this:
```
$> mkdir build
$> cd build
$> cmake .. -DCMAKE_C_FLAGS=-m32 \
    -DCMAKE_CXX_FLAGS=-m32 \
    -DCMAKE_BUILD_TYPE=RelWithDebInfo
```


If you set flags that affect optimization (- Onumber), you must set the CMAKE_C_FLAGS_build_type and/or CMAKE_CXX_FLAGS_build_type options, where build_type corresponds to the CMAKE_BUILD_TYPE value. To specify a different optimization for the default build type (RelWithDebInfo) set the CMAKE_C_FLAGS_RELWITHDEBINFO and CMAKE_CXX_FLAGS_RELWITHDEBINFO options. For example, to compile on Linux with -03 and with debug symbols, do this:
```
$> cmake .. -DCMAKE_C_FLAGS_RELWITHDEBINFO="-03 -g" \
    -DCMAKE_CXX_FLAGS_RELWITHDEBINFO="-03 -g"
```


\section*{CMake Options for Compiling NDB Cluster}

To compile with support for NDB Cluster, you can use - DWITH_NDB, which causes the build to include the NDB storage engine and all NDB programs. This option is enabled by default. To prevent building of the NDB storage engine plugin, use - DWITH_NDBCLUSTER_STORAGE_ENGINE=0FF. Other aspects of the build can be controlled using the other options listed in this section.

The following options apply when building the MySQL sources with NDB Cluster support.
- - DNDB_UTILS_LINK_DYNAMIC=\{ON|OFF\}

Controls whether NDB utilities such as ndb_drop_table are linked with ndbclient statically (OFF) or dynamically (ON); OFF (static linking) is the default. Normally static linking is used when building these to avoid problems with LD_LIBRARY_PATH, or when multiple versions of ndbclient are installed. This option is intended for creating Docker images and possibly other cases in which the target environment is subject to precise control and it is desirable to reduce image size.
- - DWITH_CLASSPATH=path

Sets the classpath for building MySQL NDB Cluster Connector for Java. The default is empty. This option is ignored if - DWITH_NDB_JAVA=0FF is used.
- - DWITH_ERROR_INSERT=\{ON|OFF\}

Enables error injection in the NDB kernel. For testing only; not intended for use in building production binaries. The default is OFF.
- - DWITH_NDB=\{ON|OFF\}

Build MySQL NDB Cluster; build the NDB plugin and all NDB Cluster programs.
- - DWITH_NDBAPI_EXAMPLES=\{ON|OFF\}

Build NDB API example programs in storage/ndb/ndbapi-examples/. See NDB API Examples, for information about these.
- - DWITH_NDBCLUSTER_STORAGE_ENGINE=\{ON|OFF\}

Controls (only) whether the NDBCLUSTER storage engine is included in the build; WITH_NDB enables this option automatically, so it is recommended that you use WITH_NDB instead.
- - DWITH_NDBCLUSTER=\{ON|OFF\} (DEPRECATED)

Build and link in support for the NDB storage engine in mysqld.
This option is deprecated and subject to eventual removal; use WITH_NDB instead.
- - DWITH_NDBMTD=\{ON|OFF\}

Build the multithreaded data node executable ndbmtd. The default is ON.
- - DWITH_NDB_DEBUG=\{ON|OFF\}

Enable building the debug versions of the NDB Cluster binaries. This is OFF by default.
- - DWITH_NDB_JAVA=\{ON | OFF \}

Enable building NDB Cluster with Java support, including support for ClusterJ (see MySQL NDB Cluster Connector for Java).

This option is ON by default. If you do not wish to compile NDB Cluster with Java support, you must disable it explicitly by specifying - DWITH_NDB_JAVA=OFF when running CMake. Otherwise, if Java cannot be found, configuration of the build fails.
- - DWITH_NDB_PORT=port

Causes the NDB Cluster management server (ndb_mgmd) that is built to use this port by default. If this option is unset, the resulting management server tries to use port 1186 by default.
- - DWITH_NDB_TEST=\{ON|OFF\}

If enabled, include a set of NDB API test programs. The default is OFF.
- - DWITH_NDB_TLS_SEARCH_PATH=path

Set the default path searched by ndb_sign_keys and other NDB programs for TLS certificate and key files.

The default for Windows platforms is \$HOMEDIR/ndb-tls; for other platforms, such as Linux, it is \$HOME/ndb-tls.

\subsection*{2.8.8 Dealing with Problems Compiling MySQL}

The solution to many problems involves reconfiguring. If you do reconfigure, take note of the following:
- If CMake is run after it has previously been run, it may use information that was gathered during its previous invocation. This information is stored in CMakeCache.txt. When CMake starts, it looks for that file and reads its contents if it exists, on the assumption that the information is still correct. That assumption is invalid when you reconfigure.
- Each time you run CMake, you must run make again to recompile. However, you may want to remove old object files from previous builds first because they were compiled using different configuration options.

To prevent old object files or configuration information from being used, run the following commands before re-running CMake:

On Unix:
```
$> make clean
$> rm CMakeCache.txt
```


On Windows:
```
$> devenv MySQL.sln /clean
$> del CMakeCache.txt
```


If you build outside of the source tree, remove and recreate your build directory before re-running CMake. For instructions on building outside of the source tree, see How to Build MySQL Server with CMake.

On some systems, warnings may occur due to differences in system include files. The following list describes other problems that have been found to occur most often when compiling MySQL:
- To define which C and C++ compilers to use, you can define the CC and CXX environment variables. For example:
```
$> CC=gcc
$> CXX=g++
$> export CC CXX
```


While this can be done on the command line, as just shown, you may prefer to define these values in a build script, in which case the export command is not needed.

To specify your own C and C++ compiler flags, use the CMAKE_C_FLAGS and CMAKE_CXX_FLAGS CMake options. See Compiler Flags.

To see what flags you might need to specify, invoke mysql_config with the --cflags and -cxxflags options.
- To see what commands are executed during the compile stage, after using CMake to configure MySQL, run make VERBOSE=1 rather than just make.
- If compilation fails, check whether the MYSQL_MAINTAINER_MODE option is enabled. This mode causes compiler warnings to become errors, so disabling it may enable compilation to proceed.
- If your compile fails with errors such as any of the following, you must upgrade your version of make to GNU make:
```
make: Fatal error in reader: Makefile, line 18:
Badly formed macro assignment
```


Or:
make: file ˋMakefile' line 18: Must be a separator (:
Or:
pthread.h: No such file or directory

Solaris and FreeBSD are known to have troublesome make programs.
GNU make 3.75 is known to work.
- The sql_yacc.cc file is generated from sql_yacc.yy. Normally, the build process does not need to create sql_yacc.cc because MySQL comes with a pregenerated copy. However, if you do need to re-create it, you might encounter this error:
"sql_yacc.yy", line $x x x$ fatal: default action causes potential...
This is a sign that your version of yacc is deficient. You probably need to install a recent version of bison (the GNU version of yacc) and use that instead.

Versions of bison older than 1.75 may report this error:
sql_yacc.yy:\#\#\#\#\#: fatal error: maximum table size (32767) exceeded
The maximum table size is not actually exceeded; the error is caused by bugs in older versions of bison.

For information about acquiring or updating tools, see the system requirements in Section 2.8, "Installing MySQL from Source".

\subsection*{2.8.9 MySQL Configuration and Third-Party Tools}

Third-party tools that need to determine the MySQL version from the MySQL source can read the MYSQL_VERSION file in the top-level source directory. The file lists the pieces of the version separately. For example, if the version is MySQL 8.4.0, the file looks like this:
```
MYSQL_VERSION_MAJOR=8
MYSQL_VERSION_MINOR=4
MYSQL_VERSION_PATCH=0
MYSQL_VERSION_EXTRA="INNOVATION"
```


To construct a five-digit number from the version components, use this formula:
```
MYSQL_VERSION_MAJOR*10000 + MYSQL_VERSION_MINOR*100 + MYSQL_VERSION_PATCH
```


\subsection*{2.8.10 Generating MySQL Doxygen Documentation Content}

The MySQL source code contains internal documentation written using Doxygen. The generated Doxygen content is available at https://dev.mysql.com/doc/index-other.html. It is also possible to generate this content locally from a MySQL source distribution using the following procedure:
1. Install doxygen 1.9.2 or later. Distributions are available here at http://www.doxygen.nl/.

After installing doxygen, verify the version number:
```
$> doxygen --version
```


\subsection*{1.9.2}
2. Install PlantUML.

When you install PlantUML on Windows (tested on Windows 10), you must run it at least once as administrator so it creates the registry keys. Open an administrator console and run this command:
```
$> java -jar path-to-plantuml.jar
```


The command should open a GUI window and return no errors on the console.
3. Set the PLANTUML_JAR_PATH environment to the location where you installed PlantUML. For example:
```
$> export PLANTUML_JAR_PATH=path-to-plantuml.jar
```

4. Install the Graphviz dot command.

After installing Graphviz, verify dot availability. For example:
```
$> which dot
/usr/bin/dot
$> dot -V
dot - graphviz version 2.40.1 (20161225.0304)
```

5. Change location to the top-level directory of your MySQL source distribution and do the following:

First, execute cmake:
```
$> cd mysql-source-directory
$> mkdir build
$> cd build
$> cmake ..
```


Next, generate the doxygen documentation:
```
$> make doxygen
```


Inspect the error log, which is available in the doxyerror.log file in the top-level directory. Assuming that the build executed successfully, view the generated output using a browser. For example:
```
$> firefox doxygen/html/index.html
```


\subsection*{2.9 Postinstallation Setup and Testing}

This section discusses tasks that you should perform after installing MySQL:
- If necessary, initialize the data directory and create the MySQL grant tables. For some MySQL installation methods, data directory initialization may be done for you automatically:
- Windows installation operations performed by the MSI installer and MySQL Configurator.
- Installation on Linux using a server RPM or Debian distribution from Oracle.
- Installation using the native packaging system on many platforms, including Debian Linux, Ubuntu Linux, Gentoo Linux, and others.
- Installation on macOS using a DMG distribution.

For other platforms and installation types, you must initialize the data directory manually. These include installation from generic binary and source distributions on Unix and Unix-like system, and installation from a ZIP Archive package on Windows. For instructions, see Section 2.9.1, "Initializing the Data Directory".
- Start the server and make sure that it can be accessed. For instructions, see Section 2.9.2, "Starting the Server", and Section 2.9.3, "Testing the Server".
- Assign passwords to the initial root account in the grant tables, if that was not already done during data directory initialization. Passwords prevent unauthorized access to the MySQL server. For instructions, see Section 2.9.4, "Securing the Initial MySQL Account".
- Optionally, arrange for the server to start and stop automatically when your system starts and stops. For instructions, see Section 2.9.5, "Starting and Stopping MySQL Automatically".
- Optionally, populate time zone tables to enable recognition of named time zones. For instructions, see Section 7.1.15, "MySQL Server Time Zone Support".

When you are ready to create additional user accounts, you can find information on the MySQL access control system and account management in Section 8.2, "Access Control and Account Management".

\subsection*{2.9.1 Initializing the Data Directory}

After MySQL is installed, the data directory must be initialized, including the tables in the mysql system schema:
- For some MySQL installation methods, data directory initialization is automatic, as described in Section 2.9, "Postinstallation Setup and Testing".
- For other installation methods, you must initialize the data directory manually. These include installation from generic binary and source distributions on Unix and Unix-like systems, and installation from a ZIP Archive package on Windows.

This section describes how to initialize the data directory manually for MySQL installation methods for which data directory initialization is not automatic. For some suggested commands that enable testing whether the server is accessible and working properly, see Section 2.9.3, "Testing the Server".

> Note
> The default authentication plugin is caching_sha2_password, and the 'root'@'localhost' administrative account uses caching_sha2_password by default.
> mysql_native_password (the default authentication plugin prior to MySQL 8.0) is still supported but disabled by default as of MySQL 8.4.0 and removed as of MySQL 9.0.0.
- Data Directory Initialization Overview
- Data Directory Initialization Procedure
- Server Actions During Data Directory Initialization
- Post-Initialization root Password Assignment

\section*{Data Directory Initialization Overview}

In the examples shown here, the server is intended to run under the user ID of the mysql login account. Either create the account if it does not exist (see Create a mysql User and Group), or substitute the name of a different existing login account that you plan to use for running the server.
1. Change location to the top-level directory of your MySQL installation, which is typically /usr/ local/mysql (adjust the path name for your system as necessary):
cd /usr/local/mysql
Within this directory you can find several files and subdirectories, including the bin subdirectory that contains the server, as well as client and utility programs.
2. The secure_file_priv system variable limits import and export operations to a specific directory. Create a directory whose location can be specified as the value of that variable:
mkdir mysql-files
Grant directory user and group ownership to the mysql user and mysql group, and set the directory permissions appropriately:
chown mysql:mysql mysql-files
chmod 750 mysql-files
3. Use the server to initialize the data directory, including the mysql schema containing the initial MySQL grant tables that determine how users are permitted to connect to the server. For example:
bin/mysqld --initialize --user=mysql
For important information about the command, especially regarding command options you might use, see Data Directory Initialization Procedure. For details about how the server performs initialization, see Server Actions During Data Directory Initialization.

Typically, data directory initialization need be done only after you first install MySQL. (For upgrades to an existing installation, perform the upgrade procedure instead; see Chapter 3, Upgrading MySQL.) However, the command that initializes the data directory does not overwrite any existing mysql schema tables, so it is safe to run in any circumstances.
4. In the absence of any option files, the server starts with its default settings. (See Section 7.1.2, "Server Configuration Defaults".) To explicitly specify options that the MySQL server should use at startup, put them in an option file such as /etc/my.cnf or/etc/mysql/my.cnf. (See Section 6.2.2.2, "Using Option Files".) For example, you can use an option file to set the secure_file_priv system variable.
5. To arrange for MySQL to start without manual intervention at system boot time, see Section 2.9.5, "Starting and Stopping MySQL Automatically".
6. Data directory initialization creates time zone tables in the mysql schema but does not populate them. To do so, use the instructions in Section 7.1.15, "MySQL Server Time Zone Support".

\section*{Data Directory Initialization Procedure}

Change location to the top-level directory of your MySQL installation, which is typically /usr/local/ mysql (adjust the path name for your system as necessary):
cd /usr/local/mysql
To initialize the data directory, invoke mysqld with the --initialize or --initialize-insecure option, depending on whether you want the server to generate a random initial password for the 'root'@'localhost' account, or to create that account with no password:
- Use --initialize for "secure by default" installation (that is, including generation of a random initial root password). In this case, the password is marked as expired and you must choose a new one.
- With --initialize-insecure, no root password is generated. This is insecure; it is assumed that you intend to assign a password to the account in a timely fashion before putting the server into production use.

For instructions on assigning a new 'root'@'localhost' password, see Post-Initialization root Password Assignment.

\section*{Note}

The server writes any messages (including any initial password) to its standard error output. This may be redirected to the error log, so look there if you do not
see the messages on your screen. For information about the error log, including where it is located, see Section 7.4.2, "The Error Log".

On Windows, use the --console option to direct messages to the console.
On Unix and Unix-like systems, it is important for the database directories and files to be owned by the mysql login account so that the server has read and write access to them when you run it later. To ensure this, start mysqld from the system root account and include the --user option as shown here:
```
bin/mysqld --initialize --user=mysql
bin/mysqld --initialize-insecure --user=mysql
```


Alternatively, execute mysqld while logged in as mysql, in which case you can omit the --user option from the command.

On Windows, use one of these commands:
```
bin\mysqld --initialize --console
bin\mysqld --initialize-insecure --console
```


\section*{Note}

Data directory initialization might fail if required system libraries are missing. For example, you might see an error like this:
```
bin/mysqld: error while loading shared libraries:
libnuma.so.1: cannot open shared object file:
No such file or directory
```


If this happens, you must install the missing libraries manually or with your system's package manager. Then retry the data directory initialization command.

It might be necessary to specify other options such as - - basedir or - - datadir if mysqld cannot identify the correct locations for the installation directory or data directory. For example (enter the command on a single line):
```
bin/mysqld --initialize --user=mysql
    --basedir=/opt/mysql/mysql
    --datadir=/opt/mysql/mysql/data
```


Alternatively, put the relevant option settings in an option file and pass the name of that file to mysqld. For Unix and Unix-like systems, suppose that the option file name is /opt/mysql/mysql/etc/ my.cnf. Put these lines in the file:
```
[mysqld]
basedir=/opt/mysql/mysql
datadir=/opt/mysql/mysql/data
```


Then invoke mysqld as follows (enter the command on a single line, with the --defaults-file option first):
```
bin/mysqld --defaults-file=/opt/mysql/mysql/etc/my.cnf
    --initialize --user=mysql
```


On Windows, suppose that C: \my.ini contains these lines:
```
[mysqld]
basedir=C:\\Program Files\\MySQL\\MySQL Server 8.4
datadir=D:\\MySQLdata
```


Then invoke mysqld as follows (again, you should enter the command on a single line, with the --defaults-file option first):
```
bin\mysqld --defaults-file=C:\my.ini
```

```
--initialize --console
```


\section*{Important}

When initializing the data directory, you should not specify any options other than those used for setting directory locations such as - - basedir or datadir, and the --user option if needed. Options to be employed by the MySQL server during normal use can be set when restarting it following initialization. See the description of the --initialize option for further information.

\section*{Server Actions During Data Directory Initialization}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0240.jpg?height=122&width=99&top_left_y=776&top_left_x=306)

\section*{Note}

The data directory initialization sequence performed by the server does not substitute for the actions performed by mysql_secure_installation.

When invoked with the --initialize or --initialize-insecure option, mysqld performs the following actions during the data directory initialization sequence:
1. The server checks for the existence of the data directory as follows:
- If no data directory exists, the server creates it.
- If the data directory exists but is not empty (that is, it contains files or subdirectories), the server exits after producing an error message:
[ERROR] --initialize specified but the data directory exists. Aborting.
In this case, remove or rename the data directory and try again.
An existing data directory is permitted to be nonempty if every entry has a name that begins with a period (.).
2. Within the data directory, the server creates the mysql system schema and its tables, including the data dictionary tables, grant tables, time zone tables, and server-side help tables. See Section 7.3, "The mysql System Schema".
3. The server initializes the system tablespace and related data structures needed to manage InnoDB tables.

\section*{Note}

After mysqld sets up the InnoDB system tablespace, certain changes to tablespace characteristics require setting up a whole new instance. Qualifying changes include the file name of the first file in the system tablespace and the number of undo logs. If you do not want to use the default values, make sure that the settings for the innodb_data_file_path and innodb_log_file_size configuration parameters are in place in the MySQL configuration file before running mysqld. Also make sure to specify as necessary other parameters that affect the creation and location of InnoDB files, such as innodb_data_home_dir and innodb_log_group_home_dir.

If those options are in your configuration file but that file is not in a location that MySQL reads by default, specify the file location using the - -defaults-extra-file option when you run mysqld.
4. The server creates a 'root'@'localhost' superuser account and other reserved accounts (see Section 8.2.9, "Reserved Accounts"). Some reserved accounts are locked and cannot be used by
clients, but 'root'@'localhost' is intended for administrative use and you should assign it a password.

Server actions with respect to a password for the 'root'@'localhost' account depend on how you invoke it:
- With --initialize but not --initialize-insecure, the server generates a random password, marks it as expired, and writes a message displaying the password:
```
[Warning] A temporary password is generated for root@localhost:
iTag*AfrH5ej
```

- With --initialize-insecure, (either with or without --initialize because --initialize-insecure implies --initialize), the server does not generate a password or mark it expired, and writes a warning message:
```
[Warning] root@localhost is created with an empty password ! Please
consider switching off the --initialize-insecure option.
```


For instructions on assigning a new 'root'@'localhost' password, see Post-Initialization root Password Assignment.
5. The server populates the server-side help tables used for the HELP statement (see Section 15.8.3, "HELP Statement"). The server does not populate the time zone tables. To do so manually, see Section 7.1.15, "MySQL Server Time Zone Support".
6. If the init_file system variable was given to name a file of SQL statements, the server executes the statements in the file. This option enables you to perform custom bootstrapping sequences.

When the server operates in bootstrap mode, some functionality is unavailable that limits the statements permitted in the file. These include statements that relate to account management (such as CREATE USER or GRANT), replication, and global transaction identifiers.
7. The server exits.

\section*{Post-Initialization root Password Assignment}

After you initialize the data directory by starting the server with --initialize or --initializeinsecure, start the server normally (that is, without either of those options) and assign the 'root'@'localhost' account a new password:
1. Start the server. For instructions, see Section 2.9.2, "Starting the Server".
2. Connect to the server:
- If you used --initialize but not --initialize-insecure to initialize the data directory, connect to the server as root:
mysql -u root -p
Then, at the password prompt, enter the random password that the server generated during the initialization sequence:

Enter password: (enter the random root password here)
Look in the server error log if you do not know this password.
- If you used - - initialize-insecure to initialize the data directory, connect to the server as root without a password:
mysql -u root --skip-password
3. After connecting, use an ALTER USER statement to assign a new root password:
```
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root-password';
```


See also Section 2.9.4, "Securing the Initial MySQL Account".

\section*{Note}

Attempts to connect to the host 127.0.0.1 normally resolve to the localhost account. However, this fails if the server is run with skip_name_resolve enabled. If you plan to do that, make sure that an account exists that can accept a connection. For example, to be able to connect as root using -host=127.0.0.1 or --host=: : 1 , create these accounts:

CREATE USER 'root'@'127.0.0.1' IDENTIFIED BY 'root-password'; CREATE USER 'root'@'::1' IDENTIFIED BY 'root-password';

It is possible to put those statements in a file to be executed using the init_file system variable, as discussed in Server Actions During Data Directory Initialization.

\subsection*{2.9.2 Starting the Server}

This section describes how start the server on Unix and Unix-like systems. (For Windows, see Section 2.3.3.5, "Starting the Server for the First Time".) For some suggested commands that you can use to test whether the server is accessible and working properly, see Section 2.9.3, "Testing the Server".

Start the MySQL server like this if your installation includes mysqld_safe:
```
$> bin/mysqld_safe --user=mysql &
```


\section*{Note}

For Linux systems on which MySQL is installed using RPM packages, server startup and shutdown is managed using systemd rather than mysqld_safe, and mysqld_safe is not installed. See Section 2.5.9, "Managing MySQL Server with systemd".

Start the server like this if your installation includes systemd support:
```
$> systemctl start mysqld
```


Substitute the appropriate service name if it differs from mysqld (for example, mysql on SLES systems).

It is important that the MySQL server be run using an unprivileged (non-root) login account. To ensure this, run mysqld_safe as root and include the --user option as shown. Otherwise, you should execute the program while logged in as mysql, in which case you can omit the --user option from the command.

For further instructions for running MySQL as an unprivileged user, see Section 8.1.5, "How to Run MySQL as a Normal User".

If the command fails immediately and prints mysqld ended, look for information in the error log (which by default is the host_name. err file in the data directory).

If the server is unable to access the data directory it starts or read the grant tables in the mysql schema, it writes a message to its error log. Such problems can occur if you neglected to create the grant tables by initializing the data directory before proceeding to this step, or if you ran the command that initializes the data directory without the --user option. Remove the data directory and run the command with the--user option.

If you have other problems starting the server, see Section 2.9.2.1, "Troubleshooting Problems Starting the MySQL Server". For more information about mysqld_safe, see Section 6.3.2, "mysqld_safe - MySQL Server Startup Script". For more information about systemd support, see Section 2.5.9, "Managing MySQL Server with systemd".

\subsection*{2.9.2.1 Troubleshooting Problems Starting the MySQL Server}

This section provides troubleshooting suggestions for problems starting the server. For additional suggestions for Windows systems, see Section 2.3.4, "Troubleshooting a Microsoft Windows MySQL Server Installation".

If you have problems starting the server, here are some things to try:
- Check the error log to see why the server does not start. Log files are located in the data directory (typically C: \Program Files\MySQL\MySQL Server 8.4\data on Windows, /usr/local/ mysql/data for a Unix/Linux binary distribution, and /usr/local/var for a Unix/Linux source distribution). Look in the data directory for files with names of the form host_name. err and host_name.log, where host_name is the name of your server host. Then examine the last few lines of these files. Use tail to display them:
\$> tail host_name.err
\$> tail host_name.log
- Specify any special options needed by the storage engines you are using. You can create a my.cnf file and specify startup options for the engines that you plan to use. If you are going to use storage engines that support transactional tables (InnoDB, NDB), be sure that you have them configured the way you want before starting the server. If you are using InnoDB tables, see Section 17.8, "InnoDB Configuration" for guidelines and Section 17.14, "InnoDB Startup Options and System Variables" for option syntax.

Although storage engines use default values for options that you omit, Oracle recommends that you review the available options and specify explicit values for any options whose defaults are not appropriate for your installation.
- Make sure that the server knows where to find the data directory. The mysqld server uses this directory as its current directory. This is where it expects to find databases and where it expects to write log files. The server also writes the pid (process ID) file in the data directory.

The default data directory location is hardcoded when the server is compiled. To determine what the default path settings are, invoke mysqld with the --verbose and --help options. If the data directory is located somewhere else on your system, specify that location with the --datadir option to mysqld or mysqld_safe, on the command line or in an option file. Otherwise, the server does not work properly. As an alternative to the --datadir option, you can specify mysqld the location of the base directory under which MySQL is installed with the --basedir, and mysqld looks for the data directory there.

To check the effect of specifying path options, invoke mysqld with those options followed by the -verbose and - - help options. For example, if you change location to the directory where mysqld is installed and then run the following command, it shows the effect of starting the server with a base directory of/usr/local:
```
$> ./mysqld --basedir=/usr/local --verbose --help
```


You can specify other options such as --datadir as well, but --verbose and --help must be the last options.

Once you determine the path settings you want, start the server without --verbose and --help.
If mysqld is currently running, you can find out what path settings it is using by executing this command:
```
$> mysqladmin variables
```


Or:
\$> mysqladmin -h host_name variables
host_name is the name of the MySQL server host.
- Make sure that the server can access the data directory. The ownership and permissions of the data directory and its contents must allow the server to read and modify them.

If you get Errcode 13 (which means Permission denied) when starting mysqld, this means that the privileges of the data directory or its contents do not permit server access. In this case, you change the permissions for the involved files and directories so that the server has the right to use them. You can also start the server as root, but this raises security issues and should be avoided.

Change location to the data directory and check the ownership of the data directory and its contents to make sure the server has access. For example, if the data directory is /usr/local/mysql/var, use this command:
\$> ls -la /usr/local/mysql/var
If the data directory or its files or subdirectories are not owned by the login account that you use for running the server, change their ownership to that account. If the account is named mysql, use these commands:
\$> chown -R mysql /usr/local/mysql/var
\$> chgrp -R mysql /usr/local/mysql/var
Even with correct ownership, MySQL might fail to start up if there is other security software running on your system that manages application access to various parts of the file system. In this case, reconfigure that software to enable mysqld to access the directories it uses during normal operation.
- Verify that the network interfaces the server wants to use are available.

If either of the following errors occur, it means that some other program (perhaps another mysqld server) is using the TCP/IP port or Unix socket file that mysqld is trying to use:

Can't start server: Bind on TCP/IP port: Address already in use
Can't start server: Bind on unix socket...
Use ps to determine whether you have another mysqld server running. If so, shut down the server before starting mysqld again. (If another server is running, and you really want to run multiple servers, you can find information about how to do so in Section 7.8, "Running Multiple MySQL Instances on One Machine".)

If no other server is running, execute the command telnet your_host_name tcp_ip_port_number. (The default MySQL port number is 3306 .) Then press Enter a couple of times. If you do not get an error message like telnet: Unable to connect to remote host: Connection refused, some other program is using the TCP/IP port that mysqld is trying to use. Track down what program this is and disable it, or tell mysqld to listen to a different port with the --port option. In this case, specify the same non-default port number for client programs when connecting to the server using TCP/IP.

Another reason the port might be inaccessible is that you have a firewall running that blocks connections to it. If so, modify the firewall settings to permit access to the port.

If the server starts but you cannot connect to it, make sure that you have an entry in /etc/hosts that looks like this:
127.0.0.1 localhost
- If you cannot get mysqld to start, try to make a trace file to find the problem by using the --debug option. See Section 7.9.4, "The DBUG Package".

\subsection*{2.9.3 Testing the Server}

After the data directory is initialized and you have started the server, perform some simple tests to make sure that it works satisfactorily. This section assumes that your current location is the MySQL installation directory and that it has a bin subdirectory containing the MySQL programs used here. If that is not true, adjust the command path names accordingly.

Alternatively, add the bin directory to your PATH environment variable setting. That enables your shell (command interpreter) to find MySQL programs properly, so that you can run a program by typing only its name, not its path name. See Section 6.2.9, "Setting Environment Variables".

Use mysqladmin to verify that the server is running. The following commands provide simple tests to check whether the server is up and responding to connections:
```
$> bin/mysqladmin version
$> bin/mysqladmin variables
```


If you cannot connect to the server, specify a - u root option to connect as root. If you have assigned a password for the root account already, you'll also need to specify - p on the command line and enter the password when prompted. For example:
```
$> bin/mysqladmin -u root -p version
Enter password: (enter root password here)
```


The output from mysqladmin version varies slightly depending on your platform and version of MySQL, but should be similar to that shown here:
```
$> bin/mysqladmin version
mysqladmin Ver 14.12 Distrib 8.4.9, for pc-linux-gnu on i686
...
Server version 8.4.9
Protocol version 10
Connection Localhost via UNIX socket
UNIX socket /var/lib/mysql/mysql.sock
Uptime: 14 days 5 hours 5 min 21 sec
Threads: 1 Questions: 366 Slow queries: 0
Opens: 0 Flush tables: 1 Open tables: 19
Queries per second avg: 0.000
```


To see what else you can do with mysqladmin, invoke it with the - - help option.
Verify that you can shut down the server (include a -p option if the root account has a password already):
```
$> bin/mysqladmin -u root shutdown
```


Verify that you can start the server again. Do this by using mysqld_safe or by invoking mysqld directly. For example:
```
$> bin/mysqld_safe --user=mysql &
```


If mysqld_safe fails, see Section 2.9.2.1, "Troubleshooting Problems Starting the MySQL Server".
Run some simple tests to verify that you can retrieve information from the server. The output should be similar to that shown here.

Use mysqlshow to see what databases exist:
```
$> bin/mysqlshow
+---------------------+
| Databases |
+---------------------+
| information_schema |
```

```
mysql
| performance_schema
| sys
+---------------------+
```


The list of installed databases may vary, but always includes at least mysql and information_schema.

If you specify a database name, mysqlshow displays a list of the tables within the database:
```
$> bin/mysqlshow mysql
Database: mysql
+-----------------------------+
| Tables |
+----------------------------+
| columns_priv
| component
| db
| default_roles
| engine_cost
| func
| general_log
| global_grants
| gtid_executed
| help_category
| help_keyword
| help_relation
| help_topic
| innodb_index_stats
| innodb_table_stats
| ndb_binlog_index
| password_history
| plugin
| procs_priv
| proxies_priv
| role_edges
| server_cost
| servers
| slave_master_info
| slave_relay_log_info
| slave_worker_info
| slow_log
| tables_priv
| time_zone
| time_zone_leap_second
| time_zone_name
| time_zone_transition
| time_zone_transition_type
| user
```


Use the mysql program to select information from a table in the mysql schema:
```
$> bin/mysql -e "SELECT User, Host, plugin FROM mysql.user" mysql
+------+-----------+----------------------+
| User | Host | plugin |
+------+-----------+-----------------------+
| root | localhost | caching_sha2_password |
+------+-----------+----------------------+
```


At this point, your server is running and you can access it. To tighten security if you have not yet assigned a password to the initial account, follow the instructions in Section 2.9.4, "Securing the Initial MySQL Account".

For more information about mysql, mysqladmin, and mysqlshow, see Section 6.5.1, "mysql — The MySQL Command-Line Client", Section 6.5.2, "mysqladmin - A MySQL Server Administration Program", and Section 6.5.6, "mysqlshow - Display Database, Table, and Column Information".

\subsection*{2.9.4 Securing the Initial MySQL Account}

The MySQL installation process involves initializing the data directory, including the grant tables in the mysql system schema that define MySQL accounts. For details, see Section 2.9.1, "Initializing the Data Directory".

This section describes how to assign a password to the initial root account created during the MySQL installation procedure, if you have not already done so.

\section*{Note}

Alternative means for performing the process described in this section:
- On Windows, you can perform the process during installation with MySQL Configurator (see Section 2.3.2, "Configuration: Using MySQL Configurator").
- On all platforms, the MySQL distribution includes mysql_secure_installation, a command-line utility that automates much of the process of securing a MySQL installation.
- On all platforms, MySQL Workbench is available and offers the ability to manage user accounts (see Chapter 33, MySQL Workbench ).

A password may already be assigned to the initial account under these circumstances:
- On Windows, installations performed using the MSI installer and MySQL Configurator give you the option of assigning a password.
- Installation using the macOS installer generates an initial random password, which the installer displays to the user in a dialog box.
- Installation using RPM packages generates an initial random password, which is written to the server error log.
- Installations using Debian packages give you the option of assigning a password.
- For data directory initialization performed manually using mysqld --initialize, mysqld generates an initial random password, marks it expired, and writes it to the server error log. See Section 2.9.1, "Initializing the Data Directory".

The mysql. user grant table defines the initial MySQL user account and its access privileges. Installation of MySQL creates only a 'root '@'localhost' superuser account that has all privileges and can do anything. If the root account has an empty password, your MySQL installation is unprotected: Anyone can connect to the MySQL server as root without a password and be granted all privileges.

The 'root'@'localhost' account also has a row in the mysql.proxies_priv table that enables granting the PROXY privilege for ' ' @ ' ' , that is, for all users and all hosts. This enables root to set up proxy users, as well as to delegate to other accounts the authority to set up proxy users. See Section 8.2.19, "Proxy Users".

To assign a password for the initial MySQL root account, use the following procedure. Replace root-password in the examples with the password that you want to use.

Start the server if it is not running. For instructions, see Section 2.9.2, "Starting the Server".
The initial root account may or may not have a password. Choose whichever of the following procedures applies:
- If the root account exists with an initial random password that has been expired, connect to the server as root using that password, then choose a new password. This is the case if the data directory was initialized using mysqld --initialize, either manually or using an installer that
does not give you the option of specifying a password during the install operation. Because the password exists, you must use it to connect to the server. But because the password is expired, you cannot use the account for any purpose other than to choose a new password, until you do choose one.
1. If you do not know the initial random password, look in the server error log.
2. Connect to the server as root using the password:
```
$> mysql -u root -p
Enter password: (enter the random root password here)
```

3. Choose a new password to replace the random password:
```
mysql> ALTER USER 'root'@'localhost' IDENTIFIED BY 'root-password';
```

- If the root account exists but has no password, connect to the server as root using no password, then assign a password. This is the case if you initialized the data directory using mysqld --initialize-insecure.
1. Connect to the server as root using no password:
```
$> mysql -u root --skip-password
```

2. Assign a password:
```
mysql> ALTER USER 'root'@'localhost' IDENTIFIED BY 'root-password';
```


After assigning the root account a password, you must supply that password whenever you connect to the server using the account. For example, to connect to the server using the mysql client, use this command:
```
$> mysql -u root -p
Enter password: (enter root password here)
```


To shut down the server with mysqladmin, use this command:
```
$> mysqladmin -u root -p shutdown
Enter password: (enter root password here)
```


\section*{Note}

For additional information about setting passwords, see Section 8.2.14, "Assigning Account Passwords". If you forget your root password after setting it, see Section B.3.3.2, "How to Reset the Root Password".

To set up additional accounts, see Section 8.2.8, "Adding Accounts, Assigning Privileges, and Dropping Accounts".

\subsection*{2.9.5 Starting and Stopping MySQL Automatically}

This section discusses methods for starting and stopping the MySQL server.
Generally, you start the mysqld server in one of these ways:
- Invoke mysqld directly. This works on any platform.
- On Windows, you can set up a MySQL service that runs automatically when Windows starts. See Section 2.3.3.8, "Starting MySQL as a Windows Service".
- On Unix and Unix-like systems, you can invoke mysqld_safe, which tries to determine the proper options for mysqld and then runs it with those options. See Section 6.3.2, "mysqld_safe - MySQL Server Startup Script".
- On Linux systems that support systemd, you can use it to control the server. See Section 2.5.9, "Managing MySQL Server with systemd".
- On systems that use System V-style run directories (that is, /etc/init.d and run-level specific directories), invoke mysql. server. This script is used primarily at system startup and shutdown. It usually is installed under the name mysql. The mysql. server script starts the server by invoking mysqld_safe. See Section 6.3.3, "mysql.server - MySQL Server Startup Script".
- On macOS, install a launchd daemon to enable automatic MySQL startup at system startup. The daemon starts the server by invoking mysqld_safe. For details, see Section 2.4.3, "Installing and Using the MySQL Launch Daemon". A MySQL Preference Pane also provides control for starting and stopping MySQL through the System Preferences. See Section 2.4.4, "Installing and Using the MySQL Preference Pane".
- On Solaris, use the service management framework (SMF) system to initiate and control MySQL startup.
systemd, the mysqld_safe and mysql. server scripts, Solaris SMF, and the macOS Startup Item (or MySQL Preference Pane) can be used to start the server manually, or automatically at system startup time. systemd, mysql. server, and the Startup Item also can be used to stop the server.

The following table shows which option groups the server and startup scripts read from option files.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.16 MySQL Startup Scripts and Supported Server Option Groups}
\begin{tabular}{|l|l|}
\hline Script & Option Groups \\
\hline mysqld & [mysqld], [server], [mysqld-major_version] \\
\hline mysqld_safe & [mysqld], [server], [mysqld_safe] \\
\hline mysql.server & [mysqld], [mysql.server], [server] \\
\hline
\end{tabular}
\end{table}
[mysqld-major_version] means that groups with names like [mysqld-8.3] and [mysqld-8.4] are read by servers having versions 8.3.x, 8.4.x, and so forth. This feature can be used to specify options that can be read only by servers within a given release series.

For backward compatibility, mysql. server also reads the [mysql_server] group and mysqld_safe also reads the [safe_mysqld] group. To be current, you should update your option files to use the [mysql. server] and [mysqld_safe] groups instead.

For more information on MySQL configuration files and their structure and contents, see Section 6.2.2.2, "Using Option Files".

\subsection*{2.10 Perl Installation Notes}

The Perl DBI module provides a generic interface for database access. You can write a DBI script that works with many different database engines without change. To use DBI, you must install the DBI module, as well as a DataBase Driver (DBD) module for each type of database server you want to access. For MySQL, this driver is the DBD : : mysql module.

> Note
> Perl support is not included with MySQL distributions. You can obtain the necessary modules from http://search.cpan.org for Unix, or by using the ActiveState ppm program on Windows. The following sections describe how to do this.

The DBI/DBD interface requires Perl 5.6.0, and 5.6.1 or later is preferred. DBI does not work if you have an older version of Perl. You should use DBD : : mysql 4.009 or higher. Although earlier versions are available, they do not support the full functionality of MySQL 8.4.

\subsection*{2.10.1 Installing Perl on Unix}

MySQL Perl support requires that you have installed MySQL client programming support (libraries and header files). Most installation methods install the necessary files. If you install MySQL from RPM files on Linux, be sure to install the developer RPM as well. The client programs are in the client RPM, but client programming support is in the developer RPM.

The files you need for Perl support can be obtained from the CPAN (Comprehensive Perl Archive Network) at http://search.cpan.org.

The easiest way to install Perl modules on Unix is to use the CPAN module. For example:
```
$> perl -MCPAN -e shell
cpan> install DBI
cpan> install DBD::mysql
```


The DBD : : mysql installation runs a number of tests. These tests attempt to connect to the local MySQL server using the default user name and password. (The default user name is your login name on Unix, and ODBC on Windows. The default password is "no password.") If you cannot connect to the server with those values (for example, if your account has a password), the tests fail. You can use force install DBD: :mysql to ignore the failed tests.

DBI requires the Data: : Dumper module. It may be installed; if not, you should install it before installing DBI.

It is also possible to download the module distributions in the form of compressed tar archives and build the modules manually. For example, to unpack and build a DBI distribution, use a procedure such as this:
1. Unpack the distribution into the current directory:
```
$> gunzip < DBI-VERSION.tar.gz | tar xvf -
```


This command creates a directory named DBI-VERSION.
2. Change location into the top-level directory of the unpacked distribution:
```
$> cd DBI-VERSION
```

3. Build the distribution and compile everything:
```
$> perl Makefile.PL
$> make
$> make test
$> make install
```


The make test command is important because it verifies that the module is working. Note that when you run that command during the DBD : : mysql installation to exercise the interface code, the MySQL server must be running or the test fails.

It is a good idea to rebuild and reinstall the DBD : : mysql distribution whenever you install a new release of MySQL. This ensures that the latest versions of the MySQL client libraries are installed correctly.

If you do not have access rights to install Perl modules in the system directory or if you want to install local Perl modules, the following reference may be useful: http://learn.perl.org/faq/perlfaq8.html\#How-do-I-keep-my-own-module-library-directory-

\subsection*{2.10.2 Installing ActiveState Perl on Windows}

On Windows, you should do the following to install the MySQL DBD module with ActiveState Perl:
1. Get ActiveState Perl from http://www.activestate.com/Products/ActivePerl/and install it.
2. Open a console window.
3. If necessary, set the HTTP_proxy variable. For example, you might try a setting like this:

C: \> set HTTP_proxy=my.proxy.com:3128
4. Start the PPM program:

C:\> C:\perl\bin\ppm.pl
5. If you have not previously done so, install DBI:
ppm> install DBI
6. If this succeeds, run the following command:
ppm> install DBD-mysql
This procedure should work with ActiveState Perl 5.6 or higher.
If you cannot get the procedure to work, you should install the ODBC driver instead and connect to the MySQL server through ODBC:
use DBI;
\$dbh= DBI->connect("DBI:ODBC:\$dsn",\$user,\$password) ||
die "Got error \$DBI::errstr when connecting to \$dsn\n";

\subsection*{2.10.3 Problems Using the Perl DBI/DBD Interface}

If Perl reports that it cannot find the . . /mysql/mysql.so module, the problem is probably that Perl cannot locate the libmysqlclient. so shared library. You should be able to fix this problem by one of the following methods:
- Copy libmysqlclient. so to the directory where your other shared libraries are located (probably /usr/lib or /lib).
- Modify the - L options used to compile DBD : : mysql to reflect the actual location of libmysqlclient.so.
- On Linux, you can add the path name of the directory where libmysqlclient . so is located to the /etc/ld.so.conf file.
- Add the path name of the directory where libmysqlclient. so is located to the LD_RUN_PATH environment variable. Some systems use LD_LIBRARY_PATH instead.

Note that you may also need to modify the - L options if there are other libraries that the linker fails to find. For example, if the linker cannot find libc because it is in /lib and the link command specifies L/usr/lib, change the - L option to - L/lib or add - L/lib to the existing link command.

If you get the following errors from DBD: : mysql, you are probably using gcc (or using an old binary compiled with gcc):
/usr/bin/perl: can't resolve symbol '__moddi3'
/usr/bin/perl: can't resolve symbol '__divdi3'
Add -L/usr/lib/gcc-lib/... -lgcc to the link command when the mysql. so library gets built (check the output from make for mysql. so when you compile the Perl client). The -L option should specify the path name of the directory where libgcc . a is located on your system.

Another cause of this problem may be that Perl and MySQL are not both compiled with gcc. In this case, you can solve the mismatch by compiling both with gcc.

