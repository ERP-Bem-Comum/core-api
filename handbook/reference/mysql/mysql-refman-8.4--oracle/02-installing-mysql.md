\section*{Chapter 2 Installing MySQL}
Table of Contents
2.1 General Installation Guidance ..... 57
2.1.1 Supported Platforms ..... 57
2.1.2 Which MySQL Version and Distribution to Install ..... 57
2.1.3 How to Get MySQL ..... 58
2.1.4 Verifying Package Integrity Using MD5 Checksums or GnuPG ..... 59
2.1.5 Installation Layouts ..... 74
2.1.6 Compiler-Specific Build Characteristics ..... 75
2.2 Installing MySQL on Unix/Linux Using Generic Binaries ..... 75
2.3 Installing MySQL on Microsoft Windows ..... 78
2.3.1 Choosing an Installation Package ..... 81
2.3.2 Configuration: Using MySQL Configurator ..... 82
2.3.3 Configuration: Manually ..... 100
2.3.4 Troubleshooting a Microsoft Windows MySQL Server Installation ..... 108
2.3.5 Windows Postinstallation Procedures ..... 109
2.3.6 Windows Platform Restrictions ..... 111
2.4 Installing MySQL on macOS ..... 113
2.4.1 General Notes on Installing MySQL on macOS ..... 113
2.4.2 Installing MySQL on macOS Using Native Packages ..... 114
2.4.3 Installing and Using the MySQL Launch Daemon ..... 116
2.4.4 Installing and Using the MySQL Preference Pane ..... 119
2.5 Installing MySQL on Linux ..... 123
2.5.1 Installing MySQL on Linux Using the MySQL Yum Repository ..... 124
2.5.2 Installing MySQL on Linux Using the MySQL APT Repository ..... 129
2.5.3 Using the MySQL SLES Repository ..... 138
2.5.4 Installing MySQL on Linux Using RPM Packages from Oracle ..... 143
2.5.5 Installing MySQL on Linux Using Debian Packages from Oracle ..... 148
2.5.6 Deploying MySQL on Linux with Docker Containers ..... 149
2.5.7 Installing MySQL on Linux from the Native Software Repositories ..... 161
2.5.8 Installing MySQL on Linux with Juju ..... 163
2.5.9 Managing MySQL Server with systemd ..... 163
2.6 Installing MySQL Using Unbreakable Linux Network (ULN) ..... 168
2.7 Installing MySQL on Solaris ..... 169
2.7.1 Installing MySQL on Solaris Using a Solaris PKG ..... 169
2.8 Installing MySQL from Source ..... 170
2.8.1 Source Installation Methods ..... 171
2.8.2 Source Installation Prerequisites ..... 171
2.8.3 MySQL Layout for Source Installation ..... 173
2.8.4 Installing MySQL Using a Standard Source Distribution ..... 173
2.8.5 Installing MySQL Using a Development Source Tree ..... 177
2.8.6 Configuring SSL Library Support ..... 178
2.8.7 MySQL Source-Configuration Options ..... 179
2.8.8 Dealing with Problems Compiling MySQL ..... 204
2.8.9 MySQL Configuration and Third-Party Tools ..... 205
2.8.10 Generating MySQL Doxygen Documentation Content ..... 205
2.9 Postinstallation Setup and Testing ..... 206
2.9.1 Initializing the Data Directory ..... 207
2.9.2 Starting the Server ..... 212
2.9.3 Testing the Server ..... 215
2.9.4 Securing the Initial MySQL Account ..... 216
2.9.5 Starting and Stopping MySQL Automatically ..... 218
2.10 Perl Installation Notes ..... 219
2.10.1 Installing Perl on Unix ..... 220
2.10.2 Installing ActiveState Perl on Windows ..... 220
2.10.3 Problems Using the Perl DBI/DBD Interface ..... 221

This chapter describes how to obtain and install MySQL. A summary of the procedure follows and later sections provide the details. If you plan to upgrade an existing version of MySQL to a newer version rather than install MySQL for the first time, see Chapter 3, Upgrading MySQL, for information about upgrade procedures and about issues that you should consider before upgrading.

If you are interested in migrating to MySQL from another database system, see Section A.8, "MySQL 8.4 FAQ: Migration", which contains answers to some common questions concerning migration issues.

Installation of MySQL generally follows the steps outlined here:

\section*{1. Determine whether MySQL runs and is supported on your platform.}

Please note that not all platforms are equally suitable for running MySQL, and that not all platforms on which MySQL is known to run are officially supported by Oracle Corporation. For information about those platforms that are officially supported, see https://www.mysql.com/support/ supportedplatforms/database.html on the MySQL website.

\section*{2. Choose which track to install.}

MySQL offers an LTS series, such as MySQL 8.4, and an Innovation series. They address different use cases as described at Section 1.3, "MySQL Releases: Innovation and LTS".

\section*{3. Choose which distribution to install.}

Several versions of MySQL are available, and most are available in several distribution formats. You can choose from pre-packaged distributions containing binary (precompiled) programs or source code. When in doubt, use a binary distribution. Oracle also provides access to the MySQL source code for those who want to see recent developments and test new code. To determine which version and type of distribution you should use, see Section 2.1.2, "Which MySQL Version and Distribution to Install".

\section*{4. Download the distribution that you want to install.}

For instructions, see Section 2.1.3, "How to Get MySQL". To verify the integrity of the distribution, use the instructions in Section 2.1.4, "Verifying Package Integrity Using MD5 Checksums or GnuPG".

\section*{5. Install the distribution.}

To install MySQL from a binary distribution, use the instructions in Section 2.2, "Installing MySQL on Unix/Linux Using Generic Binaries". Alternatively, use the Secure Deployment Guide, which provides procedures for deploying a generic binary distribution of MySQL Enterprise Edition Server with features for managing the security of your MySQL installation.

To install MySQL from a source distribution or from the current development source tree, use the instructions in Section 2.8, "Installing MySQL from Source".

\section*{6. Perform any necessary postinstallation setup.}

After installing MySQL, see Section 2.9, "Postinstallation Setup and Testing", for information about making sure the MySQL server is working properly. Also refer to the information provided in Section 2.9.4, "Securing the Initial MySQL Account". This section describes how to secure the initial MySQL root user account, which has no password until you assign one. The section applies whether you install MySQL using a binary or source distribution.
7. If you want to run the MySQL benchmark scripts, Perl support for MySQL must be available. See Section 2.10, "Perl Installation Notes".

Instructions for installing MySQL on different platforms and environments is available on a platform by platform basis:

\section*{- Unix, Linux}

For instructions on installing MySQL on most Linux and Unix platforms using a generic binary (for example, a .tar. gz package), see Section 2.2, "Installing MySQL on Unix/Linux Using Generic Binaries".

For information on building MySQL entirely from the source code distributions or the source code repositories, see Section 2.8, "Installing MySQL from Source"

For specific platform help on installation, configuration, and building from source see the corresponding platform section:
- Linux, including notes on distribution specific methods, see Section 2.5, "Installing MySQL on Linux".
- IBM AIX, see Section 2.7, "Installing MySQL on Solaris".

\section*{- Microsoft Windows}

For instructions on installing MySQL on Microsoft Windows, using either the MSI installer or Zipped binary, see Section 2.3, "Installing MySQL on Microsoft Windows".

For details and instructions on building MySQL from source code, see Section 2.8, "Installing MySQL from Source".

\section*{- macOS}

For installation on macOS, including using both the binary package and native PKG formats, see Section 2.4, "Installing MySQL on macOS".

For information on making use of an macOS Launch Daemon to automatically start and stop MySQL, see Section 2.4.3, "Installing and Using the MySQL Launch Daemon".

For information on the MySQL Preference Pane, see Section 2.4.4, "Installing and Using the MySQL Preference Pane".

\subsection*{2.1 General Installation Guidance}

The immediately following sections contain the information necessary to choose, download, and verify your distribution. The instructions in later sections of the chapter describe how to install the distribution that you choose. For binary distributions, see the instructions at Section 2.2, "Installing MySQL on Unix/Linux Using Generic Binaries" or the corresponding section for your platform if available. To build MySQL from source, use the instructions in Section 2.8, "Installing MySQL from Source".

\subsection*{2.1.1 Supported Platforms}

MySQL platform support evolves over time; please refer to https://www.mysql.com/support/ supportedplatforms/database.html for the latest updates. To learn more about MySQL Support, see https://www.mysql.com/support/.

\subsection*{2.1.2 Which MySQL Version and Distribution to Install}

When preparing to install MySQL, decide which version and distribution format (binary or source) to use.

First, decide whether to install from an LTS series like MySQL 8.4, or install from an Innovation series like MySQL 9.6. Both tracks include bug fixes while innovation releases includes the latest new features and changes. For additional details, see Section 1.3, "MySQL Releases: Innovation and LTS".

The naming scheme in MySQL 8.4 uses release names that consist of three numbers and an optional suffix (for example, mysql-8.4.0). The numbers within the release name are interpreted as follows:
- The first number ( $\mathbf{8}$ ) is the major version number.
- The second number (4) is the minor version number. The minor version number does not change for an LTS series, but it does change for an Innovation series.
- The third number ( $\mathbf{0}$ ) is the version number within an LTS series. This is incremented for each new LTS release, but is likely always 0 for innovation releases.

After choosing which MySQL version to install, decide which distribution format to install for your operating system. For most use cases, a binary distribution is the right choice. Binary distributions are available in native format for many platforms, such as RPM packages for Linux or DMG packages for macOS. Distributions are also available in more generic formats such as Zip archives or compressed tar files. On Windows, you might use an MSI to install a binary distribution.

Under some circumstances, it may be preferable to install MySQL from a source distribution:
- You want to install MySQL at some explicit location. The standard binary distributions are ready to run at any installation location, but you might require even more flexibility to place MySQL components where you want.
- You want to configure mysqld with features that might not be included in the standard binary distributions. Here is a list of the most common extra options used to ensure feature availability:
- - DWITH_LIBWRAP=1 for TCP wrappers support.
- - DWITH_ZLIB=\{system|bundled\} for features that depend on compression
- - DWITH_DEBUG=1 for debugging support

For additional information, see Section 2.8.7, "MySQL Source-Configuration Options".
- You want to configure mysqld without some features that are included in the standard binary distributions.
- You want to read or modify the C and $\mathrm{C}++$ code that makes up MySQL. For this purpose, obtain a source distribution.
- Source distributions contain more tests and examples than binary distributions.

\subsection*{2.1.3 How to Get MySQL}

Check our downloads page at https://dev.mysql.com/downloads/ for information about the current version of MySQL and for downloading instructions.

For RPM-based Linux platforms that use Yum as their package management system, MySQL can be installed using the MySQL Yum Repository. See Section 2.5.1, "Installing MySQL on Linux Using the MySQL Yum Repository" for details.

For Debian-based Linux platforms, MySQL can be installed using the MySQL APT Repository. See Section 2.5.2, "Installing MySQL on Linux Using the MySQL APT Repository" for details.

For SUSE Linux Enterprise Server (SLES) platforms, MySQL can be installed using the MySQL SLES Repository. See Section 2.5.3, "Using the MySQL SLES Repository" for details.

To obtain the latest development source, see Section 2.8.5, "Installing MySQL Using a Development Source Tree".

\subsection*{2.1.4 Verifying Package Integrity Using MD5 Checksums or GnuPG}

After downloading the MySQL package that suits your needs and before attempting to install it, make sure that it is intact and has not been tampered with. There are three means of integrity checking:
- MD5 checksums
- Cryptographic signatures using GnuPG, the GNU Privacy Guard
- For RPM packages, the built-in RPM integrity verification mechanism

The following sections describe how to use these methods.
If you notice that the MD5 checksum or GPG signatures do not match, first try to download the respective package one more time, perhaps from another mirror site.

\subsection*{2.1.4.1 Verifying the MD5 Checksum}

After you have downloaded a MySQL package, you should make sure that its MD5 checksum matches the one provided on the MySQL download pages. Each package has an individual checksum that you can verify against the package that you downloaded. The correct MD5 checksum is listed on the downloads page for each MySQL product; you should compare it against the MD5 checksum of the file (product) that you download.

Each operating system and setup offers its own version of tools for checking the MD5 checksum. Typically the command is named md5sum, or it may be named md5, and some operating systems do not ship it at all. On Linux, it is part of the GNU Text Utilities package, which is available for a wide range of platforms. You can also download the source code from http://www.gnu.org/software/textutils/. If you have OpenSSL installed, you can use the command openssl md5 package_name instead. A Windows implementation of the md5 command line utility is available from http://www.fourmilab.ch/ md5/. winMd5Sum is a graphical MD5 checking tool that can be obtained from http://www.nullriver.com/ index/products/winmd5sum. Our Microsoft Windows examples assume the name md5.exe.

Linux and Microsoft Windows examples:
```
$> md5sum mysql-standard-8.4.9-linux-i686.tar.gz
aaab65abbec64d5e907dcd41b8699945 mysql-standard-8.4.9-linux-i686.tar.gz
$> md5.exe mysql-installer-community-8.4.9.msi
aaab65abbec64d5e907dcd41b8699945 mysql-installer-community-8.4.9.msi
```


You should verify that the resulting checksum (the string of hexadecimal digits) matches the one displayed on the download page immediately below the respective package.

\section*{Note}

Make sure to verify the checksum of the archive file (for example, the .zip, .tar.gz, or . msi file) and not of the files that are contained inside of the archive. In other words, verify the file before extracting its contents.

\subsection*{2.1.4.2 Signature Checking Using GnuPG}

Another method of verifying the integrity and authenticity of a package is to use cryptographic signatures. This is more reliable than using MD5 checksums, but requires more work.

We sign MySQL downloadable packages with GnuPG (GNU Privacy Guard). GnuPG is an Open Source alternative to the well-known Pretty Good Privacy (PGP) by Phil Zimmermann. Most Linux distributions ship with GnuPG installed by default. Otherwise, see http://www.gnupg.org/ for more information about GnuPG and how to obtain and install it.

To verify the signature for a specific package, you first need to obtain a copy of our public GPG build key, which you can download from http://pgp.mit.edu/. The key that you want to obtain is named
mysql-build@oss.oracle.com. The keyID for MySQL 8.0.44 packages and higher, MySQL 8.4.7 and higher, and MySQL 9.5.0 and higher is B7B3B788A8D3785C. After obtaining this key, you should compare it with the key following value before using it verify MySQL packages. Alternatively, you can copy and paste the key directly from the text below.

\section*{Note}

The public GPG build key for earlier MySQL release packages (keyID A8D3785C, 5072E1F5 or 3A79BD29), see Section 2.1.4.5, "GPG Public Build Key for Archived Packages".
-----BEGIN PGP PUBLIC KEY BLOCK-----
mQINBGU2rNoBEACSi5t0nL6/Hj3d0PwsbdnbY+SqLUIZ3uWZQm6tsNhvTnahvPPZ BGd199iWYTt2KmXp0KeN2s9pmLKkGAbacQP1RqzMFnoHawSMf0qTUVjAvhnI4+qz MDjTNSBq9fa3nHmOYxownnrRkpiQUM/yD7/JmVENgwWb6akZeGYrXch9jd4XV3t8 OD6TGzTedTki0TDNr6YZYhC7jUm9fK9Zs299pzOXSxRRNGd+3H9gbXizrBu4L/3l UrNf//rM70vV9Ho7u9YYyAQ3L3+0ABK9FKHNhrpi8Q0cbhvWkD4oCKJ+YZ54XrOG 0YTg/YUAs5/3//FATI1sWdtLjJ5pSb0onV3LIbarRTN8lC4Le/5kd3lcot9J8b3E MXL5p90GW7wBfmNVRSUI74Vmwt+v9gyp0Hd0keRCUn8lo/1V0YD9i92KsE+/IqoY Tjnya/5kX41jB8vr1ebkHFuJ404+G6ETd0owwxq64jLIcsp/GBZHGU0RKKAo9DRL H7rpQ7PVlnw8TDNlOtWt5EJlBXFcPL+NgWbqkADAyA/XSNeWlqonvPlYfmasnAHA pMd9NhPQhC7hJTjCiAwG8UyWpV8Dj07DHFQ5xBbkTnKH2OrJtguPqSNYtTASbsWz 09S8ujoTDXFT17NbFM2dMIiq0a4VQB3SzH13H2io9Cbg/TzJrJGmwgoXgwARAQAB tDZNeVNRTCBSZWxlYXNlIEVuZ2luZWVyaW5nIDxteXNxbC1idWlsZEBvc3Mub3Jh Y2xlLmNvbT6JAlQEEwEIAD4CGwMFCwkIBwIGFQoJCAsCBBYCAwECHgECF4AWIQS8 pDQXw7SF3RK0xtS3s7eIqNN4XAUCaPoZowUJB4XTyQAKCRC3s7eIqNN4XAIED/9F 8cSgF+VHilpXe8gSTbVn5sNRnAsIYgMonsGqsrzUOv+3Gy4+e4guhRLe3m1PpQJq yIQ/upbGptP48YsIY8ix2pyzYr1dB8W1TcNUYcQvTdb8/Exd1nDpLzdwoil7b5W2 r3jpsor/b1cou7vju/ObBbkU5xai4waCMq091lp3ePQTJBa1RwV01taryGZJa2xR Ke7k1lwdWINALICIQ0aSfy3Q24lWlj0CRiDxAE7UdbtBaqyr5omqUnOXR5kZdnOf jyAbsofMuQNSLTUg1hoSunp91lv/ayeaCu54qkmkqG8U5gKUDNnYhLTIto7uf2A8 6Ufr2/P1hiJ6MzvHKEI+xtvalKDm5M+/kwSXTnT4e2ERJ0eBnfxwfJlThcYCWOsy M1jyRaFqXYKxF+r/bfvXga/C+n7VbDEV9VdXfTEjDiSjoeLzaNkNNaDqrp5k4VSk ekeGluOhYdXOiBI2oSDAP2dvIcpQYuQIrU3TW2YHRLhrN57IaTeFYCA7ij6k8GdQ YL15Hub9SavhMQ1qwLTLRp0QeKTvw2y1cZ9yJD3rih3NZq0Ul3rZe17TfDG+TX6n 57mBk2z0zmNGuqLirQr6TUUM0Fvl26Zael5w4n5wRKsUdj3/GjchMGWLlu52s+0M KuB9nNowTIejuhT57x7H67Ho88eIZaWmFC9psvCHJLkCDQRINqzaARAAsdvBo8WR qZ5WVVk61ReD8b6Zx83eJUkV254YX9zn5t8KDRjYOySwS75mJIaZLsv0YQjJk+5r t10tejyCrJIFo9CMvCmjUKtVbgmhfS5+fUDRrYCEZBBSa0Dvn68EBLiHugr+SPXF 6o1hXEUqdMCpB6oVp6X45JVQroCKIH5vsCtw2jU8S2/IjjV0V+E/zitGCiZaoZ1f 6NG7ozyFep1CSAReZu/sssk0pCLlfCebRd9Rz3QjSrQhWYuJa+eJmiF4oahnpUGk txMD632I9aG+IMfjtNJNtX32MbO+Se+cCtVc3cxSa/pR+89a3cb9IBA5tFF2Qoek hqo/1mmLi93Xn6uDUh15tVxTnB217dBT27tw+p0hjd9hXZRQbrIZUTyh3+8EMfmA jNSIeR+th86xRd9XFRr9E0qrydnALOUr9cT7TfXWGEkFvn6ljQX7f4RvjJOTbc4j JgVFyu8K+VU6u1NnFJgDiNGsWvnYxAf7gDDbUSXEuC2anhWvxPvpLGmsspngge4y l+3nv+UqZ9sm6LCebR/7UZ67tYz3p6xzAOVgYsYcxoIUuEZXjHQtsYfTZZhrjUWB J09jrMvlKUHLnS437SLbgoXVYZmcqwAWpVNOLZf+fFm4IE5aGBG5Dho2CZ6ujngW 9Zkn98T1d4N0MEwwXa2V6T1ijzcqD7GApZUAEQEAAYkCPAQYAQgAJgIbDBYhBLyk NBfDtIXdEo7G1Lezt4io03hcBQJo+hmtBQkHhdPTAAoJELezt4io03hc0TAP/2Js Mj7a1xIeWN35+lvnsVE1t68hhipLU00/Cj7pV8QsBUlIrs9u6cQ2Qzz5VGTHTd6Y hrX5xsPP8TUh50DWBx74IeFf8o5WxKlZ3eH0Wn00096qNKW5BpQRsWNjF1kBWx6l nSyduMZRUTV4+2EeEciwXiBDP15kHqW/Q7bGoV0YokwF1CC2igdCmHM+MY97Fpt8 cbzakl8kp2U4Z+fJ9oX467FF355pnEAx00msZqjgyxolP/EcgIiqufzuRSYXk8te RsaC7elR+Bpi51CBgy19EIEpoX/PfIBN3buEbb5zwMNL0PGw6b44oams6P5cMpbz GWikFGnDJyikVXIJuvaQdAQv7xMBvYU7HcLiYcM4Pt9uVGNEU321QIovFLhx/vH5 7Df+Fxx8FfHFP3MjVPzmldGHL67tUvquCTSxB/8fwEfA4b5abZwNy3E10DYhL4w5 PjzXl4/kbnVpZwtuyS5qMNg9n6cEWiSo15ldzV5iHTyprXx3Rh06krpJUFAcbCEw r2LmI2XYZguvGCSFm3LCuf4g7GDJ1u3RAtivCNCQ4sVgTLPoCNGW90Unf44s3vzm WDREXgkzSZthslxJHPE5y3Kh0qM1jQSuN+VNVHLGriOaOlYRtZoGGStONYhlBCoJ udMv77etKsN/mPdhJotVLMUpzeespcu5G2qqc5zt $=6 \mathrm{wRS}$
```
-----END PGP PUBLIC KEY BLOCK-----
```


To import the build key into your personal public GPG keyring, use gpg --import. For example, if you have saved the key in a file named mysql_pubkey. asc, the import command looks like this:
```
$> gpg --import mysql_pubkey.asc
gpg: key B7B3B788A8D3785C: public key "MySQL Release Engineering
<mysql-build@oss.oracle.com>" imported
```

```
gpg: Total number processed: 1
gpg: imported: 1
```


You can also download the key from the public keyserver using the public key id, A8D3785C:
```
$> gpg --recv-keys B7B3B788A8D3785C
gpg: requesting key B7B3B788A8D3785C from hkp server keys.gnupg.net
gpg: key B7B3B788A8D3785C: "MySQL Release Engineering <mysql-build@oss.oracle.com>"
1 new user ID
gpg: key B7B3B788A8D3785C: "MySQL Release Engineering <mysql-build@oss.oracle.com>"
53 new signatures
gpg: no ultimately trusted keys found
gpg: Total number processed: 1
gpg: new user IDs: 1
gpg: new signatures: 53
```


If you want to import the key into your RPM configuration to validate RPM install packages, you should be able to import the key directly:
\$> rpm --import mysql_pubkey.asc
If you experience problems or require RPM specific information, see Section 2.1.4.4, "Signature Checking Using RPM".

After you have downloaded and imported the public build key, download your desired MySQL package and the corresponding signature, which also is available from the download page. The signature file has the same name as the distribution file with an . asc extension, as shown by the examples in the following table.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.1 MySQL Package and Signature Files for Source files}
\begin{tabular}{|l|l|}
\hline File Type & File Name \\
\hline Distribution file & mysql-8.4.9-linux-glibc2.28x86_64.tar.xz \\
\hline Signature file & mysql-8.4.9-linux-glibc2.28x86_64.tar.xz.asc \\
\hline
\end{tabular}
\end{table}

Make sure that both files are stored in the same directory and then run the following command to verify the signature for the distribution file:
```
$> gpg --verify package_name.asc
```


If the downloaded package is valid, you should see a Good signature message similar to this:
```
$> gpg --verify mysql-8.4.9-linux-glibc2.28-x86_64.tar.xz.asc
gpg: Signature made Fri 15 Dec 2023 06:55:13 AM EST
gpg: using RSA key BCA43417C3B485DD128EC6D4B7B3B788A8D3785C
gpg: Good signature from "MySQL Release Engineering <mysql-build@oss.oracle.com>"
```


The Good signature message indicates that the file signature is valid, when compared to the signature listed on our site. But you might also see warnings, like so:
```
$> gpg --verify mysql-8.4.9-linux-glibc2.28-x86_64.tar.xz.asc
gpg: Signature made Fri 15 Dec 2023 06:55:13 AM EST
gpg: using RSA key BCA43417C3B485DD128EC6D4B7B3B788A8D3785C
gpg: Good signature from "MySQL Release Engineering <mysql-build@oss.oracle.com>"
gpg: WARNING: This key is not certified with a trusted signature!
gpg: There is no indication that the signature belongs to the owner.
Primary key fingerprint: BCA4 3417 C3B4 85DD 128E C6D4 B7B3 B788 A8D3 785C
```


That is normal, as they depend on your setup and configuration. Here are explanations for these warnings:
- gpg: no ultimately trusted keys found: This means that the specific key is not "ultimately trusted" by you or your web of trust, which is okay for the purposes of verifying file signatures.
- WARNING: This key is not certified with a trusted signature! There is no indication that the signature belongs to the owner.: This refers to your level of trust in your belief that you possess our real public key. This is a personal decision. Ideally, a MySQL developer would hand you the key in person, but more commonly, you downloaded it. Was the download tampered with? Probably not, but this decision is up to you. Setting up a web of trust is one method for trusting them.

See the GPG documentation for more information on how to work with public keys.

\subsection*{2.1.4.3 Signature Checking Using Gpg4win for Windows}

The Section 2.1.4.2, "Signature Checking Using GnuPG" section describes how to verify MySQL downloads using GPG. That guide also applies to Microsoft Windows, but another option is to use a GUI tool like Gpg4win. You may use a different tool but our examples are based on Gpg4win, and utilize its bundled Kleopatra GUI.

Download and install Gpg4win, load Kleopatra, and add the MySQL Release Engineering certificate. Do this by clicking File, Lookup on Server. Type "Mysql Release Engineering" into the search box and press Search.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 2.1 Kleopatra: Lookup on Server Wizard: Finding a Certificate}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0092.jpg?height=873&width=1570&top_left_y=1263&top_left_x=285}
\end{figure}

Select the "MySQL Release Engineering" certificate. The Key-ID must reference "3A79 BD29", or choose Details... to confirm the certificate is valid. Now, import it by clicking Import. When the import dialog is displayed, choose Okay, and this certificate should now be listed under the Imported Certificates tab.

Next, grant trust to the certificate. Select our certificate, then from the main menu select Certificates, Change Certification Power, and click Grant Power.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 2.2 Kleopatra: Grant Certification Power for MySQL Release Engineering}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0093.jpg?height=844&width=1598&top_left_y=301&top_left_x=351}
\end{figure}

Next, verify the downloaded MySQL package file. This requires files for both the packaged file, and the signature. The signature file must have the same name as the packaged file but with an appended . asc extension, as shown by the example in the following table. The signature is linked to on the downloads page for each MySQL product. You must create the . asc file with this signature.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.2 MySQL Package and Signature Files for MySQL Server MSI for Microsoft Windows}
\begin{tabular}{|l|l|}
\hline File Type & File Name \\
\hline Distribution file & mysql-8.4.9-winx64.msi \\
\hline Signature file & mysql-8.4.9-winx64.msi.asc \\
\hline
\end{tabular}
\end{table}

Make sure that both files are stored in the same directory and then run the following command to verify the signature for the distribution file. Load the dialog from File, Decrypt/Verify Files..., and then choose the . asc file.

The two most common results look like the following figures; and although the "The data could not be verified." warning looks problematic, the file check passed with success. For additional information on what this warning means, click Show Audit Log and compare it to Section 2.1.4.2, "Signature Checking Using GnuPG". You may now execute the MSI file.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 2.3 Kleopatra: the Decrypt and Verify Results Dialog: Success}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0093.jpg?height=599&width=1267&top_left_y=2067&top_left_x=349}
\end{figure}

Seeing an error such as Verification failed: No Data. means the file is invalid. Do not execute the MSI file if you see this error.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 2.4 Kleopatra: the Decrypt and Verify Results Dialog: Bad}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0094.jpg?height=520&width=1269&top_left_y=406&top_left_x=283}
\end{figure}

\subsection*{2.1.4.4 Signature Checking Using RPM}

For RPM packages, there is no separate signature. RPM packages have a built-in GPG signature and MD5 checksum. You can verify a package by running the following command:
```
$> rpm --checksig package_name.rpm
```


Example:
```
$> rpm --checksig mysql-community-server-8.4.9-1.el8.x86_64.rpm
mysql-community-server-8.4.9-1.el8.x86_64.rpm: digests signatures OK
```


\section*{Note}

If you are using RPM 4.1 and it complains about (GPG) NOT OK (MISSING KEYS: GPG\#a8d3785c), even though you have imported the MySQL public build key into your own GPG keyring, you need to import the key into the RPM keyring first. RPM 4.1 no longer uses your personal GPG keyring (or GPG itself). Rather, RPM maintains a separate keyring because it is a system-wide application and a user's GPG public keyring is a user-specific file. To import the MySQL public key into the RPM keyring, first obtain the key, then use rpm -import to import the key. For example:
```
$> gpg --export -a a8d3785c > a8d3785c.asc
$> rpm --import a8d3785c.asc
```


Alternatively, rpm also supports loading the key directly from a URL:
```
$> rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023
```


You can also obtain the MySQL public key from this manual page: Section 2.1.4.2, "Signature Checking Using GnuPG".

\subsection*{2.1.4.5 GPG Public Build Key for Archived Packages}

The following GPG public build key (keyID 3A79BD29) can be used to verify the authenticity and integrity of MySQL packages versions 8.0.28 through 8.0.35, 8.1.0, and 8.2.0. For signature checking instructions, see Section 2.1.4.2, "Signature Checking Using GnuPG". It expired on December 14, 2023.

\section*{GPG Public Build Key for MySQL 8.0.36 through 8.0.43, and 8.3.0 through 8.4.6, and 9.0.0 through 9.4.0 Packages}
```
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: SKS 1.1.6
Comment: Hostname: pgp.mit.edu
```

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 oTQoHdCxj@4ELkzrezNWGM+YwbSKrR2LoXR8zf2tBFzc2/T198V0+68f/eCvkvqCu0tq4392 Ps23j9W3r5XG+GDOwDsx0gl0E+Qkw07pwdJctA6efsmnRkjF2YV00N9MiJA1tc8NbNXpEEHJ Z7F8Ri5cpQrGUz/AY0eae2b7QefyP4rpUELpMZPjc8Px39Fe1DzRbT+5E19TZbrpbwlSYs1i CzS5YGFmpCRyZcLKXo3zS6N22+82cnRBSPPipi06WaQawcVMlQ01SX0giB+3/DryfN9VuIYd 1EWCGQa300MVu6o5KVHwPg19R1P6xPZhurkDpAd0b1s4fFxin+MdxwmG7RslZA9CXRPpzo7/ fCMW8sYOH15DP+YfUckoEreBt+zezBxbIX2CGGWEV9v3UBXadRtwxYQ6sN9bqW4jm1b41vNA 17b6CVH6sVgtU3eN+5Y9an1e5jLD6kFYx+0IeqIIId/TEqwS61csY9aav4j4KLOZFCGNU0FV ji7NQewSpepTcJwfJDOzmtiDP4vol1ApJGLRwZZZ9PB6wsOgDOoP6sr0YrDI/NNX2RyXXbgl nQ1yJZVSH3/3eo6knG2qTthUKHCRDNKdy9Qqc1x4WWWtSRjh+zX8AvJK2q1rVLH2/3ilxe9w cAZUlaj3id3TxquAlud4lWDz
=h5nH

\section*{GPG Public Build Key for MySQL 8.0.28 through 8.0.35, and 8.1.0/8.2.0 Packages}
-----BEGIN PGP PUBLIC KEY BLOCK-----
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 2z9f2agPK1H32c69RLoA@mHRe7Wkv4izeJUc5tumUY@e80jdenZZjT3hjLh6tM+m rp2oWnQIoed4LxUw1dhMOj0rYXv6laLGJ1FsW5eSke7ohBLcfBBTKnMCBohROHy2 E63Wggfsdn3UYzfqZ8cfbXetkXuLS/OM3MXbiNjg+ElYzjgWrkayu7yLakZx+mx6 sHPIJYm2hzkniMG29d5mG17ZT9emP9b+CfqGUxoXJkjs0gnDl44bwGJ0dmIBu3aj VAaHODXyY/zdDMGjskfEYbNXCAY2FRZSE58tgTvPKD++Kd2KGplMU2EIFT7JYfKh HAB5DGMk×92HUMidsTSKHe+QnnnoFmu4gnmDU31i
=Xqbo
-----END PGP PUBLIC KEY BLOCK-----
The following GPG public build key (keyID 5072E1F5) can be used to verify the authenticity and integrity of MySQL 8.0.27 packages and earlier. For signature checking instructions, see Section 2.1.4.2, "Signature Checking Using GnuPG".

\section*{GPG Public Build Key for MySQL 8.0.27 Packages and Earlier}
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: SKS 1.1.6
Comment: Hostname: pgp.mit.edu
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@NvXqCFfTgmOSc4qz98+Lzuu8qQH9DEl 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

\section*{Verifying Package Integrity Using MD5 Checksums or GnuPG}

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 U93/QIG6M2SNsmnPgSZWYV4Y5/G7Xxyj@Fc3gNjjjGGP61CBR01W6rgNPn35sZ9GYCZcG1QA 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

\section*{Verifying Package Integrity Using MD5 Checksums or GnuPG}

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 OaZHgbFRQJO6F++90Mj 9WAgeqGxyEhAlFIxFw4Cuul80ZAUIfq7YISnpkg2Tm/Q0SRRDJE4i /7WJE/HVMB0Rf9KJXuk2BJ1RIpQz8Cf+GVZ5aGIlXdM58QknprnollxoTKhrE74rAGHW7nRD xIxOoP8odiXbLzn//g2m123usqncCKWZONDdVupax3RQ7xsIuFc9Kx4OtjwPQftziQFOBBAB CAA4FiEE6hBKAqPbygqOC7fUwpbDMFwG9MsFA18u+m8aFIAAAAAADQAEcmVtQGdudXBnLm9y Z2FubmkACgkQwpbDMFwG9MsIvggAhRfd2Z5WLR6hGxOHu+A+ysjX6xKjcqshCYr8jRuOflFN vxugQQoFM5pQr15TyhokaU78aDUoIbLnKcxxmH1l4hXxcRtg/9Y22TidOVN4jjNbc69KvCC4 uANYuAJaI3o5fb1jv8Lx820iRDMhtRqyTdSGdU5//8X5FXCt+HhhzpSNoNtpxyhsKP0PAWao zuETqvxy7t0uy0f10TbZLI5nb52DxjBdZ1ThnJ2L9RwR2nSGhxjhTFg8LrZWgWNtY5HG+vk9 qbCwaC6ovNJ0G98i0DMrlbyGCbxa4Rv332n1xPfl/EPYWmNPlMu0V3bSCqxVa5u3etA5fw3r qIm333vgFIkBswQQAQoAHRYhBJTatFFgHAZYHkTw9GcRGDP/RljgBQJa7LubAAoJEGcRGDP/ RljgNu8L/jN8j4HSggpnzJ0+3dFjVg7FUHJF6BZ84tv9huhmyrByaIrEfFf9ARn80izKgdpC /wJT1+KXarvsxdnEDlYSat3HS/sEw3BmZjAeTwPi0ShloiSjYgYRbg3irDskqUHML4hhvMx0 x9nZIag2XoSSH7kPEd5jOb8cd7jJeoGg6Z9Z9lMHuyqTGi0T/EbnhjQfVTxWkSkcDvdxbSuW D96mvZrbRnrMebXKkISb0uVUn3/o11iUo9jXs+Q/03Tb9i0H3eOliP1kcB/kggu9xblIPM+J VaK5Z+zAVLPKTQJi+sP/ayEux0xZzfbZ96WERnzT4E7Wwv8MvaLbybtID280y9YoBBYv7CrC tyfrHh1t4v2AedRSZcTPKAaQ5NtLAvIdex0k0vvofaGi+7nmgV00vCZFBSXetvBMZkCapW09 vF7wcahaXpF+0Spl9vE2JiesST7uQobCUm1EjxJP0vMDc01vIfJHlbIhB/f3PE3rXZIzYTdL s3Kb4OONaUfNy9jYtYkCHAQQAQIABgUCVJqcUgAKCRB3MepTnaVyot2+D/9wAQ+p03lVMpYS gMWMNLgjq3z7QrN@NYNpxUXAonxECjUzZKSUPGci+fPKxl3ZUenk+ruLgtgJmjmUOR6u1Dov BpDFzhfqbIpjgtMDrnY5sWqxJ+CH2Rb5okEEDJ5qE9DwIMP5iXbf4xjnBOyPiq3sp983PLvy 8ttidWe9FDf8JuhWLHRJHODQjc6LufcHSWKG9fLmCjL2KSPNl696MwR+N95EKCivLL2P1G8c f08Xd8lW1S0cJLh/6TEuZtAnVeo0NUOGUXOPPyhTPP/xhfLeKbkxjtm6rg/jBaIjuuQgUyNN hKnP96/GRWWRHvio6eBPalhUcvImSrCHnqLRpdyMxmK67ZzKZS3YsH0ixozJYE0mNevZ2hEY wB+05HllqK22YwvJnCLH2ZZWTu2TCUjGZP8hbo2nSoyENlxZio9Gl/v4ypjdlgwrjnnZvxoM yOFeuc47AuzP5QjhtlrWv12C4hYi3YLZvkLVFD0CxAE/CDuHk/4eFG4UC4Mor6+BXwVG7NEl 4qQWrAHjLQ2/sHMpsUqY/5X7+StG/78PLP0HP+PIBCDDTa7W0+6kf0EaGVHKW43IIkVNI2Ps b44tTT+Xhc2mHk44LuzL4Axlywv+CxP9NcKLNFwK4Ck1M8Np6cAKlu+Dw6gjOY1aGHgtdsBQ cIqZj/+ETD0+9NkDXEoeDIkCHAQSAQIABgUCUliwpAAKCRCiKuTrQynFRXZdD/9vb+690GSR t456C6wMLgBl+Ocv9XeaCTiJjLgAL2G6bRH2g2VcNHnU/VMTD2YLVu0eP7ubsirVrmR7nAgL sQ1mKKWvTI+p5aAvn4sL3x3P8vzmGoDAigZ458yGuVpVsBkSPjJBMAkMDfm9kdWxCanzuKXS b59lfTg4EtcHPDzoSgABntASgfioVxP2TVPfre282cibeYS+RDlaMTVH25yElrWDuF2U1CVW

\section*{Verifying Package Integrity Using MD5 Checksums or GnuPG}

SMWY9mskr1+XjPno02jz0+jhKB7jyMMfSmJqzgcBNgezFbzX2fPmNnMZzEucVFFHmIhNVmL2 rOwc/s1tSHerG5YIdL3HOJek5xJljzjzFfDrdjmMMl+n06n078oePoLNdglQQSqn0yW6gZv8 EIIQ/N1nSi/LEW60z8FFxzo08TqxMMX9QRLbVE6p+7C0nqolhZf6UEiDIIm+PihF1vPFSV54 +70oLObCshe2g4pbRGWPhIJ4X3ILBQwFMZbn+cIuY3h3B/UpbZE/YSDgRFu5TLtCfBE/lQKX 7QhJknJhQHJ+Dx+Y8h1Cx61Qr0KP5DmOkHYZfAQtdacgrqEr/qNen4QYRdKp0gTne8AV7svB 8eI/8PkzvUPaHrax0g6ZSbeWbvEw6czm0qUGJX7iMlJSauIJPrb0jvXT7qIsaqZRRiUSWXo+ m+jzK5qdeRhEIUmlJI/tU/RsGokCMwQQAQgAHRYhBEW+vuyVCr0Fzw71w1CgTQw7ZRfyBQJd hy3eAAoJEFCgTQw7ZRfyRf4P/3Igs5dYm0fhposI5iwBGtN5SsxYTZGte2cZ+dXVcnLwLIZc Ry1nDu/SFXPUS01QBj7/Bc2k18934+pUtte+B5KZI2s/28Gn98C2IjxxU+YZ1X1LbUkx0cPA jFWjUh/JSfu6Hif2J0NAG3meySnlmpxl6oZeTojeWo1t39PF4N/ay7S2TqIjGSBfxvD1peIU bnziKsyM5ULbkMdgHssQvyZvrVzQxacRzPK424jXtKR6B2oA0wqMcP4c69UmVKEKIzJNYrn4 Kjs+An8vZvJYAVbiWEyEseTTo3XJePdBNs1xxK2vWLA5PeLkE8bmzHr8iQ3hA@NaY7jSJp3e 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

\section*{Verifying Package Integrity Using MD5 Checksums or GnuPG}

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

\section*{Installation Layouts}

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@qY27pTb2lExYjsRFN4Cb 13NfodAbMTOxcAWZ7jAPCxAPlHUG++mHMrhQXEToZnBFE4nbnC7vOBNgWdjUgXcpkUCkop4b 17BFpR+k8ZtYLSS8p2LLz4uAeCcSm2/msJxT7rC/FvoH8428oHincqs2ICo9z0/Ud4Hmm000 +SsZdVKIIjinGyOVWb400zkAlnnhEZ3o6hAHcREIsBgPwEYVTj/9ZdC0A044Nj9cU7awaqgt rnwwfr/o4V2gl8bLSkltZU27/29Heu0eFGjlFe0YrDd/aRNsxbyb2028H4sG1CVZmC5uK1iQ BDiSyA7Q0bbdofCWoQzm5twlpKWnY80e0ub9XP5p/sVfck4FceWFHwv+/PC9RzSl331Q6vM2 wIkCIgQTAQIADAUCQp8KHAWDBQWacAAKCRDYwgoJWiRXzyE+D/9uc7z6fIsalf0YoLN60ajA bQbI/uRKBFugyZ5RoaItusn9Z2rAtn61WrFhu4uCSJtFN1ny2RERg40f56pTghKrD+YEt+Nz e6+FKQ5AbGIdFsR/2bUk+ZZRSt83e14Lcb6ii/fJfzkoIox9ltkifQxqY7Tvk4noKu4oLSc8 01Wsfc/y0B9sYUUCmUfcnq58DEmGie9ovUslmyt5NPnveXxp5UeaRc5Rqt9tK2B4A+7/cqEN rdZJbAMSunt2+2fkYiRunAFPKPBdJBsY1sxeL/A9aKe0viKEXQdAWqdNZKNCi8rd/o0P99/9 1MbFudAbX6nL2DSb10G2Z7NWEqgIAzjmpwYYPCKeVz5Q8R+if9/fe5+STY/550aI33fJ2H3v $+U 435 \mathrm{VjYqbrerWe36xJItcJeqUzW71fQtXi1CTEl3w2ch7VF5oj/QyjabLnAlHgSlkSi6p7B}$ y5C2MnbCH1CfPnIinPhFoRcRGPjJe9nFwGs+QblvS/Chzc2WX3s/2SWm4gEUKRX4zsAJ5ocy fa/vkxCkSxK/erWlCPf/J1T70+i5waXDN/E3enSet/WL7h94pQKpjz80dGL4JSBHuAVGA+a+ dknqnPF0KMKLhjrgV+L7084FhbmAP7PXm3xmiMPriXf+el5fZZequQoIagf8rdRHHhRJxQgI 0HNknkaOqs8dtrkCDQQ+PqMdEAgA7+GJfxbMdY4wslPnjH9rF4N2qfWsEN/lxaZoJYc3a6M0 2WCnH16ahT2/tBK2w1QI4YFteR47gCvtgb601JHff0o2HfLmRDRiRjd1DTCHqeyX7CHhcghj /dNRlW2Z015QFEcmV9U0Vhp3aFfWC4Ujfs3LU+hkAWzE7zaD5cH9J7yv/6xuZVw411x0h4Uq sTcWMu0iM1BzELqX1DY7LwoPEb/09Rkbf4fmLe11EzIaCa4PqARXQZc4dhSinMt6K3X4BrRs KTfozBu74F47D8Ilbf5vSYHbuE5p/1oIDznkg/p8kW+3FxuWrycciqFTcNz215yyX39LXFnl LzKUb/F5GwADBQf+Lwqqa8CGrRfsOAJxim63CHfty5mUc5rUSnTslGYEIOCR1BeQauyPZbPD sDD9MZ1ZaSafanFvwFG6Llx9xkU7tzq+vKLoWkm4u5xf3vn55VjnSd1aQ9eQnUcXiL4cnBGo TbOWI39EcyzgslzBdC++MPjcQTcA7p6JUVsP6oAB3FQWg54tuUo0Ec8bsM8b3Ev42LmuQT5N dKHGwHsXTPtl0klk4bQk40ajHsiy1BMahpT27jWjJlMiJc+IWJ0mghkKHt926s/ymfdf5Hkd Q1cyvsz5tryVI3Fx78XeSYfQvuuwqp2H139pXGEkg0n6KdUOetdZWhe70YGNPw1yjWJT1IhM BBgRAgAMBQI+PqMdBQkJZgGAAAoJEIxxjTtQcuH17p4An3r1QpVC9yhnW2cSAjq+kr72GX0e AJ4295kl6NxYEuFApmr1+0uUq/SlsYhMBBgRAgAMBQJHrJT8BQkNMFjfAAoJEIxxjTtQcuH1 pc4An0I965H3JY2GTrizp+dCezxbhexaAJ48FhocFYvfhZtgeUWb6aPvgQZHT4hUBBgRAgAM BQI+PqMdBQkJZgGAABIJEIxxjTtQcuH1B2VHUEcAAQHungCfevVClUL3KGdbZxICOr6SvvYZ fR4Anjb3mSXo3FgS4UCmavX7S5Sr9KWxiFQEGBECAAwFAk53Pe0FCRP7AbgAEgdlR1BHAAEB CRCMcY07UHLh9RSbAJsFivb5sESf8vYE5yfD1n9AVa6FEwCgpWAIWb19p1DcB+L5RCUBw6mG uck=
=yia9
-----END PGP PUBLIC KEY BLOCK-----

\subsection*{2.1.5 Installation Layouts}

The installation layout differs for different installation types (for example, native packages, binary tarballs, and source tarballs), which can lead to confusion when managing different systems or using different installation sources. The individual layouts are given in the corresponding installation type or platform chapter, as described following. Note that the layout of installations from vendors other than Oracle may differ from these layouts.
- MySQL Installation Layout on Microsoft Windows
- Section 2.8.3, "MySQL Layout for Source Installation"
- Table 2.3, "MySQL Installation Layout for Generic Unix/Linux Binary Package"
- Table 2.13, "MySQL Installation Layout for Linux RPM Packages from the MySQL Developer Zone"
- Table 2.8, "MySQL Installation Layout on macOS"

\subsection*{2.1.6 Compiler-Specific Build Characteristics}

In some cases, the compiler used to build MySQL affects the features available for use. The notes in this section apply for binary distributions provided by Oracle Corporation or that you compile yourself from source.
icc (Intel C++ Compiler) Builds
A server built with icc has these characteristics:
- SSL support is not included.

\subsection*{2.2 Installing MySQL on Unix/Linux Using Generic Binaries}

Oracle provides a set of binary distributions of MySQL. These include generic binary distributions in the form of compressed tar files (files with a .tar.xz extension) for a number of platforms, and binaries in platform-specific package formats for selected platforms.

This section covers the installation of MySQL from a compressed tar file binary distribution on Unix/Linux platforms. For Linux-generic binary distribution installation instructions with a focus on MySQL security features, refer to the Secure Deployment Guide. For other platform-specific binary package formats, see the other platform-specific sections in this manual. For example, for Windows distributions, see Section 2.3, "Installing MySQL on Microsoft Windows". See Section 2.1.3, "How to Get MySQL" on how to obtain MySQL in different distribution formats.

MySQL compressed tar file binary distributions have names of the form mysql-VERSION-OS.tar.xz, where VERSION is a number (for example, 8.4.9), and OS indicates the type of operating system for which the distribution is intended (for example, pc-linux-i686 or winx64).

There is also a "minimal install" version of the MySQL compressed tar file for the Linux generic binary distribution, which has a name of the form mysql-VERSION-OS-GLIBCVER-ARCHminimal.tar.xz. The minimal install distribution excludes debug binaries and is stripped of debug symbols, making it significantly smaller than the regular binary distribution. If you choose to install the minimal install distribution, remember to adjust for the difference in file name format in the instructions that follow.

\section*{Warnings}
- If you have previously installed MySQL using your operating system native package management system, such as Yum or APT, you may experience problems installing using a native binary. Make sure your previous MySQL
installation has been removed entirely (using your package management system), and that any additional files, such as old versions of your data files, have also been removed. You should also check for configuration files such as /etc/my.cnf or the /etc/mysql directory and delete them.

For information about replacing third-party packages with official MySQL packages, see Replacing a Native Third-Party Distribution of MySQL or Replacing a Native Distribution of MySQL Using the MySQL APT Repository.
- MySQL has a dependency on the libaio library. Data directory initialization and subsequent server startup steps fail if this library is not installed locally. If necessary, install it using the appropriate package manager. For example, on Yum-based systems:
```
$> yum search libaio # search for info
$> yum install libaio # install library
```


Or, on APT-based systems:
```
$> apt-cache search libaio # search for info
$> apt-get install libaio1 # install library
```

- Oracle Linux 8 and 9 / Red Hat 8 and 9 (EL8 and EL9): These platforms by default do not install the file /lib64/libtinfo.so.5, which is required by the MySQL client bin/mysql for packages mysql-VERSION-el7-x86_64.tar.gz and mysql-VERSION-linux-glibc2.12x86_64.tar.xz. To work around this issue, install the ncurses-compatlibs package:
```
$> yum install ncurses-compat-libs
```

- If no RPM or . deb file specific to your distribution is provided by Oracle (or by your Linux vendor), you can try the generic binaries. In some cases, due to library incompatibilities or other issues, these may not work with your Linux installation. In such cases, you can try to compile and install MySQL from source. See Section 2.8, "Installing MySQL from Source", for more information and instructions.

To install a compressed tar file binary distribution, unpack it at the installation location you choose (typically /usr/local/mysql). This creates the directories shown in the following table.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.3 MySQL Installation Layout for Generic Unix/Linux Binary Package}
\begin{tabular}{|l|l|}
\hline Directory & Contents of Directory \\
\hline bin & mysqld server, client and utility programs \\
\hline docs & MySQL manual in Info format \\
\hline man & Unix manual pages \\
\hline include & Include (header) files \\
\hline lib & Libraries \\
\hline share & Error messages, dictionary, and SQL for database installation \\
\hline support-files & Miscellaneous support files \\
\hline
\end{tabular}
\end{table}

Debug versions of the mysqld binary are available as mysqld-debug. To compile your own debug version of MySQL from a source distribution, use the appropriate configuration options to enable debugging support. See Section 2.8, "Installing MySQL from Source".

To install and use a MySQL binary distribution, the command sequence looks like this:
```
$> groupadd mysql
$> useradd -r -g mysql -s /bin/false mysql
$> cd /usr/local
$> tar xvf /path/to/mysql-VERSION-OS.tar.xz
$> ln -s full-path-to-mysql-VERSION-OS mysql
$> cd mysql
$> mkdir mysql-files
$> chown mysql:mysql mysql-files
$> chmod 750 mysql-files
$> bin/mysqld --initialize --user=mysql
$> bin/mysqld_safe --user=mysql &
# Next command is optional
$> cp support-files/mysql.server /etc/init.d/mysql.server
```


Note
This procedure assumes that you have root (administrator) access to your system. Alternatively, you can prefix each command using the sudo (Linux) or pfexec (Solaris) command.

The mysql-files directory provides a convenient location to use as the value for the secure_file_priv system variable, which limits import and export operations to a specific directory. See Section 7.1.8, "Server System Variables".

A more detailed version of the preceding description for installing a binary distribution follows.

\section*{Create a mysql User and Group}

If your system does not already have a user and group to use for running mysqld, you may need to create them. The following commands add the mysql group and the mysql user. You might want to call the user and group something else instead of mysql. If so, substitute the appropriate name in the following instructions. The syntax for useradd and groupadd may differ slightly on different versions of Unix/Linux, or they may have different names such as adduser and addgroup.
```
$> groupadd mysql
$> useradd -r -g mysql -s /bin/false mysql
```


\section*{Note}

Because the user is required only for ownership purposes, not login purposes, the useradd command uses the $-r$ and $-s$ /bin/false options to create a user that does not have login permissions to your server host. Omit these options if your useradd does not support them.

\section*{Obtain and Unpack the Distribution}

Pick the directory under which you want to unpack the distribution and change location into it. The example here unpacks the distribution under /usr/local. The instructions, therefore, assume that you have permission to create files and directories in /usr/local. If that directory is protected, you must perform the installation as root.
```
$> cd /usr/local
```


Obtain a distribution file using the instructions in Section 2.1.3, "How to Get MySQL". For a given release, binary distributions for all platforms are built from the same MySQL source distribution.

Unpack the distribution, which creates the installation directory. tar can uncompress and unpack the distribution if it has $z$ option support:
```
$> tar xvf /path/to/mysql-VERSION-OS.tar.xz
```


The tar command creates a directory named mysql-VERSION-OS.

To install MySQL from a compressed tar file binary distribution, your system must have GNU XZ Utils to uncompress the distribution and a reasonable tar to unpack it.

GNU tar is known to work. The standard tar provided with some operating systems is not able to unpack the long file names in the MySQL distribution. You should download and install GNU tar, or if available, use a preinstalled version of GNU tar. Usually this is available as gnutar, gtar, or as tar within a GNU or Free Software directory, such as /usr/sfw/bin or /usr/local/bin. GNU tar is available from http://www.gnu.org/software/tar/.

If your tar does not support the $x z$ format then use the $x z$ command to unpack the distribution and tar to unpack it. Replace the preceding tar command with the following alternative command to uncompress and extract the distribution:
```
$> xz -dc /path/to/mysql-VERSION-OS.tar.xz | tar x
```


Next, create a symbolic link to the installation directory created by tar:
```
$> ln -s full-path-to-mysql-VERSION-OS mysql
```


The $\ln$ command makes a symbolic link to the installation directory. This enables you to refer more easily to it as /usr/local/mysql. To avoid having to type the path name of client programs always when you are working with MySQL, you can add the /usr/local/mysql/bin directory to your PATH variable:
```
$> export PATH=$PATH:/usr/local/mysql/bin
```


\section*{Perform Postinstallation Setup}

The remainder of the installation process involves setting distribution ownership and access permissions, initializing the data directory, starting the MySQL server, and setting up the configuration file. For instructions, see Section 2.9, "Postinstallation Setup and Testing".

\subsection*{2.3 Installing MySQL on Microsoft Windows}

MySQL is available for Microsoft Windows 64-bit operating systems only. For supported Windows platform information, see https://www.mysql.com/support/supportedplatforms/database.html.

There are different methods to install MySQL on Microsoft Windows: the MSI, the standard binary distribution (packaged as a compressed file) containing all of the necessary files that you unpack, and source files to compile MySQL yourself. For related information, see Section 2.3.1, "Choosing an Installation Package".

\section*{Note}

MySQL 8.4 Server requires the Microsoft Visual C++ 2019 Redistributable Package to run on Windows platforms. Users should make sure the package has been installed on the system before installing the server. The package is available at the Microsoft Download Center. Additionally, MySQL debug binaries require Visual Studio 2019.

\section*{Recommended MSI Installation Method}

The simplest and recommended method is to download the MSI and let it install MySQL Server, and then use the MySQL Configurator it installs to configure MySQL:
1. Download the MSI from https://dev.mysql.com/downloads/ and execute it. This installs the MySQL server, an associated MySQL Configurator application, and it adds related MySQL items to the Microsoft Windows Start menu under the MySQL group.
2. Upon completion, the installation wizard prompts to execute MySQL Configurator. Execute it now (recommended) or later, or instead choose to manually configure MySQL.

\section*{Note}

The MySQL server won't start until it's configured; it's recommended to execute the bundled MySQL Configurator immediately after the MSI.

MySQL is now installed. If you used MySQL Configurator to configure MySQL as a Windows service, then Windows automatically starts the MySQL server every time you restart the system. Also, the MSI installs the MySQL Configurator application on the local host, which you can use later to reconfigure MySQL server. It and other MySQL start up menu items were added by the MSI.

\section*{MySQL Installation Layout on Microsoft Windows}

For MySQL 8.4 on Windows, the default installation directory is C : \Program Files\MySQL\MySQL Server 8.4 for installations using the MSI, although the MSI Custom setup type allows using a different location. If you use the ZIP archive method to install MySQL, install it there are elsewhere, such as C: \mysql. Regardless, the layout of the subdirectories remains the same.

All of the files are located within this parent directory using the structure shown in the following table.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.4 Default MySQL Installation Layout for Microsoft Windows}
\begin{tabular}{|l|l|l|}
\hline Directory & Contents of Directory & Notes \\
\hline bin & mysqld server, client, and utility programs & \\
\hline \%PROGRAMDATA\%\MySQL \MySQL Server 8.4\} & Log files, databases & The Windows system variable \%PROGRAMDATA\% defaults to C: \ProgramData. \\
\hline docs & Release documentation & With the MSI, use the Custom type to include this optional component. \\
\hline include & Include (header) files & \\
\hline lib & Libraries & \\
\hline share & Miscellaneous support files, including error messages, character set files, sample configuration files, SQL for database installation & \\
\hline
\end{tabular}
\end{table}

\section*{Silent Installation Methods}

Use the standard msiexec options for a silent installation. This example includes /i for a normal installation, / qn to not show a GUI and to avoid user interaction, and /lv to write verbose installation output to a new log file target. Execute the installation as Administrator from the command-line, for example:
```
$> msiexec /i "C:\mysql\mysql-8.4.9-winx64.msi" /qn /lv "C:\mysql\install.log"
```


The MSI also supports INSTALLDIR to optionally override the default installation directory path to a non-default location. The following example installs MySQL to C : \mysql\ instead of C : \Program Files\MySQL\MySQL Server 8.4\:
```
$> msiexec /i "C:\mysql\mysql-8.4-winx64.msi" /qn /lv "C:\mysql\install.log" INSTALLDIR="C:\mysql"
```


\section*{Additional Installation Information}

By default, MySQL Configurator sets up the MySQL server as a Windows service. By using a service, you can monitor and control the operation of the server through the standard Windows service
management tools. For related information about manually setting up the Windows service, see Section 2.3.3.8, "Starting MySQL as a Windows Service".

To accommodate the RESTART statement, the MySQL server forks when run as a service or standalone, to enable a monitor process to supervise the server process. In this case, there are two mysqld processes. If RESTART capability is not required, the server can be started with the - - nomonitor option. See Section 15.7.8.8, "RESTART Statement".

Generally, you should install MySQL on Windows using an account that has administrator rights. Otherwise, you may encounter problems with certain operations such as editing the PATH environment variable or accessing the Service Control Manager. When installed, MySQL does not need to be executed using a user with Administrator privileges.

For a list of limitations on the use of MySQL on the Windows platform, see Section 2.3.6, "Windows Platform Restrictions".

In addition to the MySQL Server package, you may need or want additional components to use MySQL with your application or development environment. These include, but are not limited to:
- To connect to the MySQL server using ODBC, you must have a Connector/ODBC driver. For more information, including installation and configuration instructions, see MySQL Connector/ODBC Developer Guide.
- To use MySQL server with .NET applications, you must have the Connector/NET driver. For more information, including installation and configuration instructions, see MySQL Connector/NET Developer Guide.

MySQL distributions for Windows can be downloaded from https://dev.mysql.com/downloads/. See Section 2.1.3, "How to Get MySQL".

MySQL for Windows is available in several distribution formats, detailed here. Generally speaking, you should use the MSI to install MySQL server and MySQL Configurator to configure it. The MSI is simpler to use than the compressed file, and you need no additional tools to get MySQL up and running. MySQL Configurator automatically configures MySQL Server, creates an options file, starts the server, enables you to create default user accounts, and more. For more information on choosing a package, see Section 2.3.1, "Choosing an Installation Package".

\section*{MySQL on Windows Considerations}

\section*{- Large Table Support}

If you need tables with a size larger than 4 GB , install MySQL on an NTFS or newer file system. Do not forget to use MAX_ROWS and AVG_ROW_LENGTH when you create tables. See Section 15.1.20, "CREATE TABLE Statement".

\section*{- MySQL and Virus Checking Software}

Virus-scanning software such as Norton/Symantec Anti-Virus on directories containing MySQL data and temporary tables can cause issues, both in terms of the performance of MySQL and the virusscanning software misidentifying the contents of the files as containing spam. This is due to the fingerprinting mechanism used by the virus-scanning software, and the way in which MySQL rapidly updates different files, which may be identified as a potential security risk.

After installing MySQL Server, it is recommended that you disable virus scanning on the main directory (datadir) used to store your MySQL table data. There is usually a system built into the virus-scanning software to enable specific directories to be ignored.

In addition, by default, MySQL creates temporary files in the standard Windows temporary directory. To prevent the temporary files also being scanned, configure a separate temporary directory for MySQL temporary files and add this directory to the virus scanning exclusion list. To do this, add
a configuration option for the tmpdir parameter to your my. ini configuration file. For more information, see Section 2.3.3.2, "Creating an Option File".

\subsection*{2.3.1 Choosing an Installation Package}

For MySQL 8.4, there are multiple installation package formats to choose from when installing MySQL on Windows. The package formats described in this section are:
- MySQL Installation MSI
- MySQL noinstall ZIP Archives
- MySQL Docker Images

\section*{MySQL Installation MSI}

This package has a file name similar to mysql-community-8.4.9.msi or mysql-commercial-8.4.9.msi, and installs MySQL server along with MySQL Configurator. The MSI includes a MySQL Configurator application that is recommended for most users to set up, configure, and reconfigure the MySQL server.

The MSI and MySQL Configurator operate on all MySQL supported versions of Windows (see https:// www.mysql.com/support/supportedplatforms/database.html). For instructions on how to configure MySQL using MySQL Configurator, see Section 2.3.2, "Configuration: Using MySQL Configurator".

\section*{MySQL noinstall ZIP Archives}

These packages contain the files found in the complete MySQL Server installation package, with the exception of the GUI. This format does not include an automated installer, but does include MySQL Configurator to configure the MySQL server.

The noinstall ZIP archives are split into two separate compressed files. The main package is named mysql-VERSION-winx64.zip. This contains the components needed to use MySQL on your system. The optional MySQL test suite, MySQL benchmark suite, and debugging binaries/information components (including PDB files) are in a separate compressed file named mysql-VERSION-winx64-debug-test.zip.

Program Database (PDB) files (with file name extension pdb) provide information for debugging your MySQL installation in the event of a problem. These files are included in ZIP Archive distributions (but not MSI distributions) of MySQL.

To install MySQL by extracting the Zip archive rather than use the MSI, consider the following:
1. If you are upgrading from a previous version please refer to Section 3.11, "Upgrading MySQL on Windows", before beginning the upgrade process.
2. Make sure that you are logged in as a user with administrator privileges.
3. Choose an installation location. Traditionally, the MySQL server is installed in C: \mysql. If you do not install MySQL at C: \mysql, you must specify the path to the install directory during startup or in an option file. See Section 2.3.3.2, "Creating an Option File".

\section*{Note}

The MSI installs MySQL under C : \Program Files\MySQL\MySQL Server 8.4\.
4. Extract the install archive to the chosen installation location using your preferred file-compression tool. Some tools may extract the archive to a folder within your chosen installation location. If this occurs, you can move the contents of the subfolder into the chosen installation location.
5. Configure the MySQL server using either MySQL Configurator (recommended) or Section 2.3.3, "Configuration: Manually".

\section*{MySQL Docker Images}

For information on using the MySQL Docker images provided by Oracle on Windows platform, see Section 2.5.6.3, "Deploying MySQL on Windows and Other Non-Linux Platforms with Docker".

\section*{Warning}

The MySQL Docker images provided by Oracle are built specifically for Linux platforms. Other platforms are not supported, and users running the MySQL Docker images from Oracle on them are doing so at their own risk.

\subsection*{2.3.2 Configuration: Using MySQL Configurator}

MySQL Configurator is a standalone application designed to ease the complexity of configuring a MySQL server to run MySQL on Microsoft Windows. It is bundled with the MySQL server, in both the MSI and standalone Zip archive.

\section*{Methods to Start MySQL Configurator}

MySQL Configurator can both configure and reconfigure MySQL server; and the methods to start MySQL Configurator are:
- The MySQL server MSI prompts to execute MySQL Configurator immediately after it installs the MySQL server.
- From the Start Menu: the MSI creates a MySQL Configurator start menu item.
- From the command line: the mysql-configurator .exe executable is located in the same directory as mysqld. exe and other MySQL binaries installed with the MySQL server.

Typically this location is in C: \Program Files\MySQL\MySQL Server X.Y\bin if installed via the MSI, or a custom directory for the Zip archive.

\subsection*{2.3.2.1 MySQL Server Configuration with MySQL Configurator}

MySQL Configurator performs the initial configuration, a reconfiguration, and also functions as part of the uninstallation process.

\section*{Note}

Full permissions are granted to the user executing MySQL Configurator to all generated files, such as my.ini. This does not apply to files and directories for specific products, such as the MySQL server data directory in \%ProgramData\% that is owned by SYSTEM.

MySQL Configurator performs the configuration of the MySQL server. For example:
- It creates the configuration file (my.ini) that is used to configure the MySQL server. The values written to this file are influenced by choices you make during the installation process. Some definitions are host dependent.
- By default, a Windows service for the MySQL server is added.
- Provides default installation and data paths for MySQL server.
- It can optionally create MySQL server user accounts with configurable permissions based on general roles, such as DB Administrator, DB Designer, and Backup Admin.
- Checking Show Advanced Options enables additional Logging Options to be set. This includes defining custom file paths for the error log, general log, slow query log (including the configuration of seconds it requires to execute a query), and the binary log.

The sections that follow describe the server configuration options that apply to MySQL server on Windows. The server version you installed will determine which steps and options you can configure. Configuring MySQL server may include some or all of the steps.

\section*{MySQL Server Installations}

MySQL Configurator adds an upgrade option if it finds an existing MySQL Server installation is discovered. It offers two options:
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0113.jpg?height=120&width=99&top_left_y=605&top_left_x=370)

Note
This upgrade functionality was added in MySQL 8.3.0.
- In-Place Upgrade of an Existing MySQL Server Installation
- Add a Separate MySQL Server Installation

\section*{In-Place Upgrade of an Existing MySQL Server Installation}

This replaces the existing MySQL server installation as part of the upgrade process which may also upgrade the data schema. Upon success, the existing MySQL server installation is removed from the system.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0113.jpg?height=108&width=99&top_left_y=1174&top_left_x=370)

Note
The existing MySQL server instance must be running for the in-place upgrade option to function.

While MySQL Configurator may attempt (and succeed) to perform an in-place upgrade for other scenarios, the following table lists the scenarios officially supported by the configurator:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.5 Supported Upgrade Paths}
\begin{tabular}{|l|l|}
\hline A supported upgrade scenario & Description \\
\hline 8.0.35+ to 8.1 & From 8.0.35 or higher to the first MySQL 8 Innovation release. \\
\hline 8.0.35+ to 8.4 & From 8.0.35 or higher to the MySQL next LTS release. \\
\hline 8.X to 8.Y where $\mathrm{Y}=\mathrm{X}+1$ & From an Innovation release to the next consecutive Innovation release. \\
\hline 8.3 to 8.4 & From the last MySQL 8 Innovation release to the next MySQL 8 LTS release. \\
\hline 8.4. X to 8.4.Y where Y > X & From within the same LTS release. \\
\hline 8.4.X to 9.0.0 & From an LTS release to the first consecutive Innovation release. \\
\hline 8.4 to 9.7 & From an LTS release to the next consecutive LTS release. \\
\hline
\end{tabular}
\end{table}

This dialogue prompts for the protocol (default: TCP/IP), port (default: 3306), and root password for the existing installation. Execute connect and then review and confirm the MySQL instance's information (such as version, paths, and configuration file) before proceeding with the upgrade.

This upgrade may replace the file paths. For example, "MySQL Server 8.2\Data\" changes to "MySQL Server 8.3\Data\" when upgrading 8.2 to 8.3.

This upgrade functionality also provides these additional options: "Backup Data" allows running mysqldump before performing the upgrade, and "Server File Permissions" to optionally customize file permissions.

\section*{Add a Separate MySQL Server Installation}

Configure a standard side-by-side installation with the new MySQL server installation. This means having multiple MySQL server installations installed and running on the system.

\section*{Type and Networking}
- Server Configuration Type

Choose the MySQL server configuration type that describes your setup. This setting defines the amount of system resources (memory) to assign to your MySQL server instance.
- Development: A computer that hosts many other applications, and typically this is your personal workstation. This setting configures MySQL to use the least amount of memory.
- Server: Several other applications are expected to run on this computer, such as a web server. The Server setting configures MySQL to use a medium amount of memory.
- Dedicated: A computer that is dedicated to running the MySQL server. Because no other major applications run on this server, this setting configures MySQL to use the majority of available memory.
- Manual: Prevents MySQL Configurator from attempting to optimize the server installation, and instead, sets the default values to the server variables included in the my.ini configuration file. With the Manual type selected, MySQL Configurator uses the default value of 16 M for the tmp_table_size variable assignment.
- Connectivity

Connectivity options control how the connection to MySQL is made. Options include:
- TCP/IP: This option is selected by default. You may disable TCP/IP Networking to permit local host connections only. With the TCP/IP connection option selected, you can modify the following items:
- Port for classic MySQL protocol connections. The default value is 3306 .
- X Protocol Port defaults to 33060
- Open Windows Firewall port for network access, which is selected by default for TCP/IP connections.

If a port number is in use already, you will see the error icon $\left(\frac{\Delta}{\Delta}\right)$ next to the default value and Next is disabled until you provide a new port number.
- Named Pipe: Enable and define the pipe name, similar to setting the named_pipe system variable. The default name is MySQL.

When you select Named Pipe connectivity, and then proceed to the next step, you are prompted to set the level of access control granted to client software on named-pipe connections. Some clients require only minimum access control for communication, while other clients require full access to the named pipe.

You can set the level of access control based on the Windows user (or users) running the client as follows:
- Minimum access to all users (RECOMMENDED). This level is enabled by default because it is the most secure.
- Full access to members of a local group. If the minimum-access option is too restrictive for the client software, use this option to reduce the number of users who have full access on
the named pipe. The group must be established on Windows before you can select it from the list. Membership in this group should be limited and managed. Windows requires a newly added member to first log out and then log in again to join a local group.
- Full access to all users (NOT RECOMMENDED). This option is less secure and should be set only when other safeguards are implemented.
- Shared Memory: Enable and define the memory name, similar to setting the shared_memory system variable. The default name is MySQL.
- Advanced Configuration

Check Show Advanced and Logging Options to set custom logging and advanced options in later steps. The Logging Options step enables you to define custom file paths for the error log, general log, slow query log (including the configuration of seconds it requires to execute a query), and the binary log. The Advanced Options step enables you to set the unique server ID required when binary logging is enabled in a replication topology.
- MySQL Enterprise Firewall (Enterprise Edition only)

The Enable MySQL Enterprise Firewall check box is deselected by default. Select this option to enable a security list that offers protection against certain types of attacks. Additional post-installation configuration is required (see Section 8.4.7, "MySQL Enterprise Firewall").

\section*{Accounts and Roles}
- Root Account Password

Assigning a root password is required and you will be asked for it when reconfiguring with MySQL Configurator in the future. Password strength is evaluated when you repeat the password in the box provided. For descriptive information regarding password requirements or status, move your mouse pointer over the information icon ( $\stackrel{\Delta}{\Delta}$ ) when it appears.
- MySQL User Accounts (Optional)

Click Add User or Edit User to create or modify MySQL user accounts with predefined roles. Next, enter the required account credentials:
- User Name: MySQL user names can be up to 32 characters long.
- Host: Select localhost for local connections only or <All Hosts (\%)> when remote connections to the server are required.
- Role: Each predefined role, such as DB Admin, is configured with its own set of privileges. For example, the DB Admin role has more privileges than the DB Designer role. The Role dropdown list contains a description of each role.
- Password: Password strength assessment is performed while you type the password. Passwords must be confirmed. MySQL permits a blank or empty password (considered to be insecure).

MySQL Configurator Commercial Release Only: MySQL Enterprise Edition for Windows, a commercial product, also supports an authentication method that performs external authentication on Windows. Accounts authenticated by the Windows operating system can access the MySQL server without providing an additional password.

To create a new MySQL account that uses Windows authentication, enter the user name and then select a value for Host and Role. Click Windows authentication to enable the authentication_windows plugin. In the Windows Security Tokens area, enter a token for each Windows user (or group) who can authenticate with the MySQL user name. MySQL accounts can include security tokens for both local Windows users and Windows users that belong to a domain.

Multiple security tokens are separated by the semicolon character (;) and use the following format for local and domain accounts:
- Local account

Enter the simple Windows user name as the security token for each local user or group; for example, finley;jeffrey;admin.
- Domain account

Use standard Windows syntax (domain\domainuser) or MySQL syntax (domain\} \domainuser) to enter Windows domain users and groups.

For domain accounts, you may need to use the credentials of an administrator within the domain if the account running MySQL Configurator lacks the permissions to query the Active Directory. If this is the case, select Validate Active Directory users with to activate the domain administrator credentials.

Windows authentication permits you to test all of the security tokens each time you add or modify a token. Click Test Security Tokens to validate (or revalidate) each token. Invalid tokens generate a descriptive error message along with a red X icon and red token text. When all tokens resolve as valid (green text without an X icon), you can click OK to save the changes.

\section*{Windows Service}

On the Windows platform, MySQL server can run as a named service managed by the operating system and be configured to start up automatically when Windows starts. Alternatively, you can configure MySQL server to run as an executable program that requires manual configuration.
- Configure MySQL server as a Windows service (Selected by default.)

When the default configuration option is selected, you can also select the following:
- Windows Service Name

Defaults to MySQLXY where XY is 81 for MySQL 8.1.
- Start the MySQL Server at System Startup

When selected (default), the service startup type is set to Automatic; otherwise, the startup type is set to Manual.
- Run Windows Service as

When Standard System Account is selected (default), the service logs on as Network Service.
The Custom User option must have privileges to log on to Microsoft Windows as a service. The Next button will be disabled until this user is configured with the required privileges.

A custom user account is configured in Windows by searching for "local security policy" in the Start menu. In the Local Security Policy window, select Local Policies, User Rights Assignment, and then Log On As A Service to open the property dialog. Click Add User or Group to add the custom user and then click OK in each dialog to save the changes.

\section*{Server File Permissions}

Optionally, permissions set on the folders and files located at C: \ProgramData\MySQL\MySQL Server $X, Y \backslash$ Data can be managed during the server configuration operation. You have the following options:
- MySQL Configurator can configure the folders and files with full control granted exclusively to the user running the Windows service, if applicable, and to the Administrators group.

All other groups and users are denied access. This is the default option.
- Have MySQL Configurator use a configuration option similar to the one just described, but also have MySQL Configurator show which users could have full control.

You are then able to decide if a group or user should be given full control. If not, you can move the qualified members from this list to a second list that restricts all access.
- Have MySQL Configurator skip making file-permission changes during the configuration operation.

If you select this option, you are responsible for securing the Data folder and its related files manually after the server configuration finishes.

\section*{Logging Options}

This step is available if the Show Advanced Configuration check box was selected during the Type and Networking step. To enable this step now, click Back to return to the Type and Networking step and select the check box.

Advanced configuration options are related to the following MySQL log files:
- Error Log
- General Log
- Slow Query Log
- Binary Log

\section*{Advanced Options}

This step is available if the Show Advanced Configuration check box was selected during the Type and Networking step. To enable this step now, click Back to return to the Type and Networking step and select the check box.

The advanced-configuration options include:
- Server ID

Set the unique identifier used in a replication topology. If binary logging is enabled, you must specify a server ID. The default ID value depends on the server version. For more information, see the description of the server_id system variable.
- Table Names Case

These options only apply to the initial configuration of the MySQL server.
- Lower Case

Sets the lower_case_table_names option value to 1 (default), in which table names are stored in lowercase on disk and comparisons are not case-sensitive.
- Preserve Given Case

Sets the lower_case_table_names option value to 2 , in which table names are stored as given but compared in lowercase.

\section*{Sample Databases}

Optionally install sample databases that include test data to help develop applications with MySQL. The options include the sakila and world databases.

\section*{Apply Configuration}

All configuration settings are applied to the MySQL server when you click Execute. Use the Configuration Steps tab to follow the progress of each action; the icon for each toggles from white to green (with a check mark) on success. Otherwise, the process stops and displays an error message if an individual action times out. Click the Log tab to view the log.

\subsection*{2.3.2.2 MySQL Configurator CLI}

MySQL Configurator supports GUI (default) and CLI (by passing in --console) modes using the mysql_configurator.exe executable.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0118.jpg?height=136&width=108&top_left_y=744&top_left_x=301)

Note
MySQL Configurator CLI functionality was added in MySQL Configurator 9.2.0.

Executing MySQL Configurator requires a Windows user with administrative privileges, as otherwise the system prompts for the credentials.

\section*{CLI Syntax}

The general syntax is:
mysql_configurator.exe --console [--help] | [--action=action_name | -a=action_name] | ...]

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.6 Syntax}
\begin{tabular}{|l|l|l|l|l|}
\hline Option name & Shortcut & Supported values & Usage example & Description \\
\hline console & c & N/A & --console & Activates the CLI in MySQL Configurator, otherwise the GUI is launched. \\
\hline action & a & configure, reconfigure, remove, or upgrade & --action=configure & Runs MySQL Configurator CLI in new configuration, reconfiguration, removal or upgrade mode. \\
\hline help & h & N/A & --help & Displays general help or help for the corresponding action. If no - action element is provided, the general help section is displayed. \\
\hline action option and value & N/A & See section "Configure/ Reconfigure/ Remove/Upgrade options" for supported values and details & --datadir="C: \MySQL...", -port=3306 & Defines the various configuration options available for each CLI action (configuration, reconfiguration, removal or upgrade) \\
\hline
\end{tabular}
\end{table}

\section*{Available Actions}

Each action (configure, reconfigure, remove, and upgrade) have a specific set of options that define the elements to configure when performing the operation. The syntax is action_option=action_value with a full list of action options below:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.7 Action Options}
\begin{tabular}{|l|l|l|l|l|l|l|l|l|}
\hline Action option & Shortcut & Aliases & Type & Values & Default value & Action & Condition & Description \\
\hline datadir & d & datadir, datadirectory & Path & N/A & \begin{tabular}{l}
"C: \ProgramDatato \\
configure ata MySQL MySQL Server x.x" where x. x corresponds to the corresponding server major and minor version.
\end{tabular} & & N/A & The path to the MySQL server data directory. This option sets the datadir system variable. \\
\hline configtype & N/A & \multicolumn{2}{|l|}{configuratiolist type} & Developer, Server, Dedicated, Manual & developme & atonfigure, reconfigure & N/A & Optimizes system resources depending on the intended use of the server instance. \\
\hline enable-tcp-ip & N/A & N/A & bool & true, false & true & configure, reconfigure & N/A & Indicates whether the server permits connections over TCP/ IP. \\
\hline port & P & N/A & number & N/A & 3306 & configure, reconfigure & enable-tcpid=true & The port number to use when listening for TCP/IP connections. \\
\hline mysqlxport & X & x-port, xport & number & N/A & 3306 & configure, reconfigure & enable-tcpip=true & The network port on which X Plugin listens for TCP/IP connections. This is the \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|l|l|l|}
\hline Action option & Shortcut & Aliases & Type & Values & Default value & Action & Condition & Description \\
\hline & & & & & & & & X Plugin equivalent of port. \\
\hline open_win & findevall & open-windowsfirewall, openfirewall & bool & true, false & true & & configure, enable-reconfiguretcpip=true & Creates Windows Firewall rules for TCP/IP connections for both the port and mysqlxport options. \\
\hline enable-namedpipes & N/A & namedpipes & bool & true, false & false & configure, N/A reconfigure & & Indicates whether the server permits connections over a named pipe. \\
\hline socket & N/A & pipename, named-pipename, namedpipe, pipename & string & N/A & MYSQL & & configure, enablereconfigure namedpipes=true & Specifies the pipe name to use when listening for local connections that use a named pipe. The default value is MySQL, and it is not casesensitive. \\
\hline named-pipe-full-accessgroup & N/A & full-accessgroup & string & "", everyone, valid Windows local group name & "' (empty string) & & configure, enable-reconfigurenamedpipes=true & Sets the name of a Windows local group whose members are granted sufficient access by the MySQL server to use \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|l|l|}
\hline Action option & Shortcut & Aliases & Type & Values & Default value & Action & Condition & Description \\
\hline & & & & & & & & namedpipe clients. The default value is an empty string, which means that no Windows users are granted full access to the named pipe. \\
\hline sharedmemory & N/A & enable-sharedmemory & bool & true, false & false & configure, reconfigure & N/A & Whether the server permits sharedmemory connections. \\
\hline shared-memory-basename & N/A & shared-memoryname, shared-memname & string & N/A & MYSQL & configure, reconfigure & sharedmemory=tr & Name of the sharedmemory connection used to communicate with the server. \\
\hline password & p & pwd, rootpassword, passwd, rootpasswd & string & N/A & N/A & configure, reconfigure & N/A & The password assigned to the root user during a configuration or reconfiguration. The password can't be changed during a reconfiguration, although it is required to validate a \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|l|l|}
\hline Action option & Shortcut & Aliases & Type & Values & Default value & Action & Condition & Description \\
\hline & & & & & & & & connection to the server. \\
\hline configure-as-service & N/A & as-windowsservice, as-winservice & bool & true, false & true & configure, N/A reconfigure & & Configures the MySQL server to run as a Windows service. By default the Windows service runs using the Standard System Account (Network Service). \\
\hline windows-servicename & N/A & servicename, win-servicename, servicename & string & N/A & "MySQLxx" where xx corresponds to the server major and minor version. & & configure, configure-reconfigureasservice=tru & The name given ±o the Windows service used to run MySQL Server. \\
\hline windows-service-auto-start & N/A & win-service-auto-start, service-auto-start, auto-start, autostart & bool & true, false & true & & configure, configure-reconfigureasservice=tru & If configured as a Windows Service, this value sets the service to start automatically at system startup. \\
\hline windows-serviceuser & N/A & win-serviceuser, serviceuser & string & N/A & NT AUTHORI & & configure, configureNeconfigure asservice=tru & The name of a @Vindows User Account used to run the Windows service. \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|l|l|}
\hline Action option & Shortcut & Aliases & Type & Values & Default value & Action & Condition & Description \\
\hline windows-servicepassword & N/A & win-servicepassword, win-servicepwd, servicepassword, servicepwd, sapass & string & N/A & "" (empty string) & configure, reconfigure & configure-asservice=tru & The password of the Windows User Account used to run the Windows Service. \\
\hline server-file-permissionsaccess & N/A & server-fileaccess & list & FullAccess Configure, Manual & fullaccess & configure, upgrade & N/A & Configures the user level access for the server files (data directory and any files inside that location). \\
\hline server-file-full-control-list & N/A & full-control-list & comma separated list & windows users/ groups & user running the windows service (if applicable) and Administrators group & configure, upgrade & server-filepermissionsseparated access=cortfigiufe & \\
\hline server-file-no-accesslist & N/A & no-accesslist & comma separated list & windows users/ groups & empty & configure, upgrade & server-filepermissionsseparated
access=corfigiafe & \\
\hline enable-error-log & N/A & enable-err-log & bool & true, false & true & configure, reconfigure & N/A & Enables the error log. The error log contains a record of mysqld startup and shutdown times. It also \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|l|l|}
\hline Action option & Shortcut & Aliases & Type & Values & Default value & Action & Condition & Description \\
\hline & & & & & & & & contains diagnostic messages such as errors, warnings, and notes that occur during server startup and shutdown; and while the server is running. \\
\hline log-error & N/A & errorlog, error-log-file, errorlogname & Path/File name & N/A & \{host_ nam & & çœrfigure, enablereconfigure errorlog=true & Defines the error log location. If a path is not provided, the location of the file is the data directory. \\
\hline slow-query-log & N/A & enable-slow-log & bool & true, false & false & configure, N/A reconfigure & & Whether the slow query log is enabled. \\
\hline slow-query-logfile & N/A & slow-log-file, slowlogname & File name & N/A & \{host_nam slow.log & & çenfigure, slow-reconfigurequerylog=true & The name of the slow query log file. \\
\hline generallog & N/A & enable-generallog, generallog & bool & true, false & false & configure, N/A reconfigure & & Whether the general query log is enabled. \\
\hline general-log-file & N/A & generallog & vaiheename & N/A & \{host_name & & çdonggure, generalreconfigurelog=true & The name of the general query log file. \\
\hline enable-log-bin & N/A & enable-binary-log & bool & true, false & true & configure, N/A reconfigure & & Enables binary logging. \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|l|l|}
\hline Action option & Shortcut & Aliases & Type & Values & Default value & Action & Condition & Description \\
\hline log-bin & N/A & binary-log & File name & N/A & \{host_nam bin & eçenfigure, reconfigure & enable-logbin=true & Specifies the base name to use for binary log files. With binary logging enabled, the server logs all statements that change data to the binary log, which is used for backup and replication. The binary log is a sequence of files with a base name and numeric extension. \\
\hline server-id & N/A & serverid & number & N/A & 1 & configure & N/A & For servers that are used in a replication topology, you must specify a unique server ID for each replication server in the range from 1 to 2^32-1. "Unique" means that each ID must be different from every \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|l|l|}
\hline Action option & Shortcut & Aliases & Type & Values & Default value & Action & Condition & Description \\
\hline & & & & & & & & other ID in use by any other source or replica servers in the replication topology. \\
\hline lower-case-tablenames & N/A & N/A & list & 0, 1, 2 & 1 & configure & N/A & If set to 0, table names are stored as specified and comparisons are casesensitive. If set to 1, table names are stored in lowercase on disk and comparisons are not casesensitive. If set to 2, table names are stored as given but compared in lowercase. This option also applies to database names and table aliases. \\
\hline install-sampledatabase & N/A & install-exampledatabase & list & All, Sakila, World, None & none & configure, N/A reconfigure & & Installs the specified sample databases. \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|l|l|}
\hline Action option & Shortcut & Aliases & Type & Values & Default value & Action & Condition & Description \\
\hline uninstall-sampledatabase & N/A & uninstall-exampledatabase & list & All, Sakila, World, None & none & configure, reconfigure & N/A & Uninstalls the specified sample databases. \\
\hline old-instanceprotocol & N/A & existing-instanceprotocol & list & Socket, Sockets, Tcp, Pipe, NamedPipe, SharedMemory, Memory & N/A & tcp-ip & upgrade & The connection protocol used by the server instance that is being upgraded. \\
\hline old-instanceport & N/A & existing-instanceport & number & N/A & 3306 & upgrade & N/A & The port number to use by the server instance that is being upgraded when listening for TCP/IP connections \\
\hline old-instance-pipename & N/A & existing-instance-pipename & string & N/A & MYSQL & upgrade & N/A & Specifies the pipe name to use by the server instance that is being upgraded when listening for local connections that use a named pipe. \\
\hline old-instance-memoryname & N/A & old-instance-shared-memoryname, existing-instance-memoryname, existing-instance- & string & N/A & MYSQL & upgrade & N/A & The name of the sharedmemory connection used by the server instance that is being upgraded \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|l|l|}
\hline Action option & Shortcut & Aliases & Type & Values & Default value & Action & Condition & Description \\
\hline & & shared-memoryname & & & & & & to communicate with the server. \\
\hline old-instancepassword & N/A & old-instancepwd, old-instance-rootpassword, existing-instancepassword, existing-instancepwd, existing-instancepwd & string & N/A & N/A & upgrade & N/A & The password of the root user used by the server instance that is being upgraded. \\
\hline backupdata & N/A & backup-datadirectory & bool & true, false & true & upgrade & N/A & Creates a backup of the databases to ensure data can be restored in case of any failure. \\
\hline keep-datadirectory & N/A & keep-data & bool & true, false & false & remove & N/A & Prevents the data directory from being deleted when other configurations are removed. \\
\hline defaults-extra-file & N/A & passwordfile, passfile, pwdfile & Path & N/A & N/A & \multicolumn{2}{|l|}{reconfigure,N/A upgrade} & The path and file name of the file containing the password entry that specifies the password of the root user. \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|l|l|}
\hline Action option & Shortcut & Aliases & Type & Values & Default value & Action & Condition & Description \\
\hline windows-service-account-passwordfile & N/A & windows-service-account-passwordfile, win-service-account-pass-file, service-account-pwdfile, win-service-account-pwd-file, service-account-passwordfile & Path & N/A & N/A & configure, reconfigure & N/A & The path and file name of the file containing the password entry that specifies the password of the Windows service account user associated with the Windows Service that runs the server. \\
\hline
\end{tabular}

\section*{MySQL User Management}

The configure and reconfigure actions allow you to create and edit MySQL users as per the --adduser option:
- --add-user='user_name':'password'|'file_path'|'windows_security_token':host:role:authentication

Only valid for the configure (not reconfigure) action.
The username, password, and token file path must be enclosed in single or double quotes. Escape single quotes, double quotes, and back slashes if present in the username or password.

Add user examples:
```
mysql_configurator.exe --console --action=configure --add-user='john':'mypass12%':%:"Db Admin":MYSQL
mysql_configurator.exe --console --action=configure --add-user='jenny':'jenny-T480\jenny':localhost:"Ad
```


\section*{General Examples}

A new configuration:
```
# Simple
mysql_configurator.exe --console --action=configure --password=test
# More complex
mysql_configurator.exe --console --action=configure --password=test --port=3320 --enable-pipe-names --p
# More complex, also with users
mysql_configurator.exe --console --action=configure --password=other123 --add-user='john':'pa$$':"Db Ad
```


A reconfiguration:
```
# Basic reconfiguration
mysql_configurator.exe --console --action=reconfigure --password=test --port=3310
```

```
# Complex reconfiguration
mysql_configurator.exe --console --action=reconfigure --password=test --enable-shared-memory=false
```


A removal:
```
mysql_configurator.exe --console --action=remove --keep-data-directory=true
```


An upgrade:
```
# Basic removal
mysql_configurator.exe --console --action=upgrade --old-instance-password=test
# Complex removal
mysql_configurator.exe --console --action=upgrade --old-instance-password=test --backup-data=false --server
```


\section*{Root Password Handling}

There are multiple ways to pass in the root user password, depending on the needs in terms of security and simplicity. The different methods, in order of precedence:
1. Pass passwords as command-line arguments:

Pass in the --password (for configuration and reconfiguration) or--old-instance-password (for upgrades) to the command line.
2. Set passwords in the my.ini MySQL configuration file:

Having the entry "password=\{password_here\}" directly in the my.ini defines the root user password.

Having the entry "password=\{password_here\}" in the extra configuration file (as per - -defaults -extra-file) can define the root user password.
3. Defining passwords using environment variables:

MYSQL_PWD: Similar to the MySQL client, the value defined in the MYSQL_PWD environment variable can define the root user password if no other method was used to define it. This variable applies to the configure, reconfigure, and upgrade actions.

WIN_SERVICE_ACCOUNT_PWD: This environment variable can set the password of the Windows service account user that is configured to run the MySQL Windows Service if the server has been configured to run as a service. This variable applies to the configure and reconfigure actions.

\subsection*{2.3.3 Configuration: Manually}

These instructions apply to those not using the MySQL Configurator application to configure and set up the MySQL server; or for manually making additional changes. Using MySQL Configurator is recommended.

\subsection*{2.3.3.1 Extracting the Install Archive}

To install MySQL manually, do the following:
1. If you are upgrading from a previous version then refer to Section 3.11, "Upgrading MySQL on Windows" before beginning the upgrade process.
2. Make sure that you are logged in as a user with administrator privileges.
3. Choose an installation location. Traditionally, the MySQL server is installed in C : \mysql. If you do not install MySQL at C: \mysql, you must specify the path to the install directory during startup or in an option file. See Section 2.3.3.2, "Creating an Option File".

\section*{Note}

The MSI installs MySQL under C : \Program Files\MySQL\MySQL Server 8.4.
4. Extract the install archive to the chosen installation location using your preferred file-compression tool. Some tools may extract the archive to a folder within your chosen installation location. If this occurs, you can move the contents of the subfolder into the chosen installation location.

\subsection*{2.3.3.2 Creating an Option File}

If you need to specify startup options when you run the server, you can indicate them on the command line or place them in an option file. For options that are used every time the server starts, you may find it most convenient to use an option file to specify your MySQL configuration. This is particularly true under the following circumstances:
- The installation or data directory locations are different from the default locations ( $\mathrm{C}: \backslash$ Program Files\MySQL\MySQL Server 8.4 and C:\Program Files\MySQL\MySQL Server 8.4\data).
- You need to tune the server settings, such as memory, cache, or InnoDB configuration information.

When the MySQL server starts on Windows, it looks for option files in several locations, such as the Windows directory, C: \\, and the MySQL installation directory (for the full list of locations, see Section 6.2.2.2, "Using Option Files"). The Windows directory typically is named something like C : \WINDOWS. You can determine its exact location from the value of the WINDIR environment variable using the following command:

C: \> echo \%WINDIR\%
MySQL looks for options in each location first in the my. ini file, and then in the my.cnf file. However, to avoid confusion, it is best if you use only one file. If your PC uses a boot loader where C : is not the boot drive, your only option is to use the my. ini file. Whichever option file you use, it must be a plain text file.

\section*{Note}

When using MySQL Configurator to configure MySQL Server, it creates the my.ini at the default location, and the user executing MySQL Configurator is granted full permissions to this new my. ini file.

In other words, be sure that the MySQL Server user has permission to read the my.ini file.

You can also make use of the example option files included with your MySQL distribution; see Section 7.1.2, "Server Configuration Defaults".

An option file can be created and modified with any text editor, such as Notepad. For example, if MySQL is installed in E: \mysqland the data directory is in E: \mydata\data, you can create an option file containing a [mysqld] section to specify values for the basedir and datadir options:
```
[mysqld]
# set basedir to your installation path
basedir=E:/mysql
# set datadir to the location of your data directory
datadir=E:/mydata/data
```


Microsoft Windows path names are specified in option files using (forward) slashes rather than backslashes. If you do use backslashes, double them:
```
[mysqld]
```

```
# set basedir to your installation path
basedir=E:\\mysql
# set datadir to the location of your data directory
datadir=E:\\mydata\\data
```


The rules for use of backslash in option file values are given in Section 6.2.2.2, "Using Option Files".
The ZIP archive does not include a data directory. To initialize a MySQL installation by creating the data directory and populating the tables in the mysql system database, initialize MySQL using either - initialize or --initialize-insecure. For additional information, see Section 2.9.1, "Initializing the Data Directory".

If you would like to use a data directory in a different location, you should copy the entire contents of the data directory to the new location. For example, if you want to use $\mathrm{E}: \backslash$ mydata as the data directory instead, you must do two things:
1. Move the entire data directory and all of its contents from the default location (for example C: \Program Files\MySQL\MySQL Server 8.4\data) to E: \mydata.
2. Use a--datadir option to specify the new data directory location each time you start the server.

\subsection*{2.3.3.3 Selecting a MySQL Server Type}

The following table shows the available servers for Windows in MySQL 8.4.

\begin{tabular}{|l|l|}
\hline Binary & Description \\
\hline mysqld & Optimized binary with named-pipe support \\
\hline mysqld - debug & \begin{tabular}{l} 
Like mysqld, but compiled with full debugging \\
and automatic memory allocation checking
\end{tabular} \\
\hline
\end{tabular}

Each of the servers in a distribution support the same set of storage engines. The SHOW ENGINES statement displays which engines a given server supports.

All Windows MySQL 8.4 servers have support for symbolic linking of database directories.
MySQL supports TCP/IP on all Windows platforms. MySQL servers on Windows also support named pipes, if you start the server with the named_pipe system variable enabled. It is necessary to enable this variable explicitly because some users have experienced problems with shutting down the MySQL server when named pipes were used. The default is to use TCP/IP regardless of platform because named pipes are slower than TCP/IP in many Windows configurations.

\subsection*{2.3.3.4 Initializing the Data Directory}

If you installed MySQL using the noinstall package, no data directory is included. To initialize the data directory, use the instructions at Section 2.9.1, "Initializing the Data Directory".

\subsection*{2.3.3.5 Starting the Server for the First Time}

This section gives a general overview of starting the MySQL server. The following sections provide more specific information for starting the MySQL server from the command line or as a Windows service.

The information here applies primarily if you installed MySQL using the noinstall version, or if you wish to configure and test MySQL manually rather than using MySQL Configurator.

The examples in these sections assume that MySQL is installed under the default location of C: \Program Files\MySQL\MySQL Server 8.4. Adjust the path names shown in the examples if you have MySQL installed in a different location.

Clients have two options. They can use TCP/IP, or they can use a named pipe if the server supports named-pipe connections.

MySQL for Windows also supports shared-memory connections if the server is started with the shared_memory system variable enabled. Clients can connect through shared memory by using the --protocol=MEMORY option.

For information about which server binary to run, see Section 2.3.3.3, "Selecting a MySQL Server Type".

Testing is best done from a command prompt in a console window (or "DOS window"). In this way you can have the server display status messages in the window where they are easy to see. If something is wrong with your configuration, these messages make it easier for you to identify and fix any problems.

\section*{Note}

The database must be initialized before MySQL can be started. For additional information about the initialization process, see Section 2.9.1, "Initializing the Data Directory".

To start the server, enter this command:
```
C:\> "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld" --console
```


You should see messages similar to those following as it starts (the path names and sizes may differ). The ready for connections messages indicate that the server is ready to service client connections.
```
[Server] C:\mysql\bin\mysqld.exe (mysqld 8.0.30) starting as process 21236
[InnoDB] InnoDB initialization has started.
[InnoDB] InnoDB initialization has ended.
[Server] CA certificate ca.pem is self signed.
[Server] Channel mysql_main configured to support TLS.
Encrypted connections are now supported for this channel.
[Server] X Plugin ready for connections. Bind-address: '::' port: 33060
[Server] C:\mysql\bin\mysqld.exe: ready for connections.
Version: '8.0.30' socket: '' port: 3306 MySQL Community Server - GPL.
```


You can now open a new console window in which to run client programs.
If you omit the --console option, the server writes diagnostic output to the error log in the data directory (C: \Program Files\MySQL\MySQL Server $8.4 \$ data by default). The error log is the file with the .err extension, and may be set using the --log-error option.

\section*{Note}

The initial root account in the MySQL grant tables has no password. After starting the server, you should set up a password for it using the instructions in Section 2.9.4, "Securing the Initial MySQL Account".

\subsection*{2.3.3.6 Starting MySQL from the Windows Command Line}

The MySQL server can be started manually from the command line. This can be done on any version of Windows.

To start the mysqld server from the command line, you should start a console window (or "DOS window") and enter this command:
```
C:\> "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld"
```


The path to mysqld may vary depending on the install location of MySQL on your system.
You can stop the MySQL server by executing this command:
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0134.jpg?height=154&width=268&top_left_y=319&top_left_x=306)

\section*{Note}

If the MySQL root user account has a password, you need to invoke mysqladmin with the -p option and supply the password when prompted.

This command invokes the MySQL administrative utility mysqladmin to connect to the server and tell it to shut down. The command connects as the MySQL root user, which is the default administrative account in the MySQL grant system.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0134.jpg?height=122&width=99&top_left_y=680&top_left_x=306)

\section*{Note}

Users in the MySQL grant system are wholly independent from any operating system users under Microsoft Windows.

If mysqld doesn't start, check the error log to see whether the server wrote any messages there to indicate the cause of the problem. By default, the error log is located in the C: \Program Files \MySQL\MySQL Server 8.4 \data directory. It is the file with a suffix of .err, or may be specified by passing in the --log-error option. Alternatively, you can try to start the server with the console option; in this case, the server may display some useful information on the screen to help solve the problem.

The last option is to start mysqld with the --standalone and --debug options. In this case, mysqld writes a log file C : \mysqld. trace that should contain the reason why mysqld doesn't start. See Section 7.9.4, "The DBUG Package".

Use mysqld --verbose --help to display all the options that mysqld supports.

\subsection*{2.3.3.7 Customizing the PATH for MySQL Tools}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0134.jpg?height=129&width=113&top_left_y=1482&top_left_x=301)

\section*{Warning}

You must exercise great care when editing your system PATH by hand; accidental deletion or modification of any portion of the existing PATH value can leave you with a malfunctioning or even unusable system.

To make it easier to invoke MySQL programs, you can add the path name of the MySQL bin directory to your Windows system PATH environment variable:
- On the Windows desktop, right-click the My Computer icon, and select Properties.
- Next select the Advanced tab from the System Properties menu that appears, and click the Environment Variables button.
- Under System Variables, select Path, and then click the Edit button. The Edit System Variable dialogue should appear.
- Place your cursor at the end of the text appearing in the space marked Variable Value. (Use the End key to ensure that your cursor is positioned at the very end of the text in this space.) Then enter the complete path name of your MySQL bin directory (for example, C: \Program Files\MySQL \MySQL Server 8.4\bin)
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0134.jpg?height=111&width=99&top_left_y=2368&top_left_x=342)

\section*{Note}

There must be a semicolon separating this path from any values present in this field.

Dismiss this dialogue, and each dialogue in turn, by clicking OK until all of the dialogues that were opened have been dismissed. The new PATH value should now be available to any new command shell you open, allowing you to invoke any MySQL executable program by typing its name at the

DOS prompt from any directory on the system, without having to supply the path. This includes the servers, the mysql client, and all MySQL command-line utilities such as mysqladmin and mysqldump.

You should not add the MySQL bin directory to your Windows PATH if you are running multiple MySQL servers on the same machine.

\subsection*{2.3.3.8 Starting MySQL as a Windows Service}

On Windows, the recommended way to run MySQL is to install it as a Windows service, so that MySQL starts and stops automatically when Windows starts and stops. A MySQL server installed as a service can also be controlled from the command line using NET commands, or with the graphical Services utility. Generally, to install MySQL as a Windows service you should be logged in using an account that has administrator rights.

The Services utility (the Windows Service Control Manager) can be found in the Windows Control Panel. To avoid conflicts, it is advisable to close the Services utility while performing server installation or removal operations from the command line.

\section*{Installing the service}

Before installing MySQL as a Windows service, you should first stop the current server if it is running by using the following command:
```
C:\> "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqladmin"
    -u root shutdown
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0135.jpg?height=172&width=263&top_left_y=1329&top_left_x=370)

This command invokes the MySQL administrative utility mysqladmin to connect to the server and tell it to shut down. The command connects as the MySQL root user, which is the default administrative account in the MySQL grant system.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0135.jpg?height=109&width=97&top_left_y=1708&top_left_x=370)

\section*{Note}

Users in the MySQL grant system are wholly independent from any operating system users under Windows.

Install the server as a service using this command:
```
C:\> "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld" --install
```


The service-installation command does not start the server. Instructions for that are given later in this section.

To make it easier to invoke MySQL programs, you can add the path name of the MySQL bin directory to your Windows system PATH environment variable:
- On the Windows desktop, right-click the My Computer icon, and select Properties.
- Next select the Advanced tab from the System Properties menu that appears, and click the Environment Variables button.
- Under System Variables, select Path, and then click the Edit button. The Edit System Variable dialogue should appear.
- Place your cursor at the end of the text appearing in the space marked Variable Value. (Use the End key to ensure that your cursor is positioned at the very end of the text in this space.) Then enter
the complete path name of your MySQL bin directory (for example, C : \Program Files\MySQL \MySQL Server 8.4\bin), and there should be a semicolon separating this path from any values present in this field. Dismiss this dialogue, and each dialogue in turn, by clicking OK until all of the dialogues that were opened have been dismissed. You should now be able to invoke any MySQL executable program by typing its name at the DOS prompt from any directory on the system, without having to supply the path. This includes the servers, the mysql client, and all MySQL command-line utilities such as mysqladmin and mysqldump.

You should not add the MySQL bin directory to your Windows PATH if you are running multiple MySQL servers on the same machine.

|

\section*{Warning}

You must exercise great care when editing your system PATH by hand; accidental deletion or modification of any portion of the existing PATH value can leave you with a malfunctioning or even unusable system.

The following additional arguments can be used when installing the service:
- You can specify a service name immediately following the --install option. The default service name is MySQL.
- If a service name is given, it can be followed by a single option. By convention, this should be --defaults-file=file_name to specify the name of an option file from which the server should read options when it starts.

The use of a single option other than --defaults-file is possible but discouraged. --defaults-file is more flexible because it enables you to specify multiple startup options for the server by placing them in the named option file.
- You can also specify a--local-service option following the service name. This causes the server to run using the LocalService Windows account that has limited system privileges. If both --defaults-file and --local-service are given following the service name, they can be in any order.

For a MySQL server that is installed as a Windows service, the following rules determine the service name and option files that the server uses:
- If the service-installation command specifies no service name or the default service name (MySQL) following the --install option, the server uses the service name of MySQL and reads options from the [mysqld] group in the standard option files.
- If the service-installation command specifies a service name other than MySQL following the - install option, the server uses that service name. It reads options from the [mysqld] group and the group that has the same name as the service in the standard option files. This enables you to use the [mysqld] group for options that should be used by all MySQL services, and an option group with the service name for use by the server installed with that service name.
- If the service-installation command specifies a --defaults-file option after the service name, the server reads options the same way as described in the previous item, except that it reads options only from the named file and ignores the standard option files.

As a more complex example, consider the following command:
```
C:\> "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld"
    --install MySQL --defaults-file=C:\my-opts.cnf
```


Here, the default service name (MySQL) is given after the --install option. If no--defaultsfile option had been given, this command would have the effect of causing the server to read the [mysqld] group from the standard option files. However, because the --defaults-file option is present, the server reads options from the [mysqld] option group, and only from the named file.

\section*{Note}

On Windows, if the server is started with the --defaults-file and - install options, --install must be first. Otherwise, mysqld.exe attempts to start the MySQL server.

You can also specify options as Start parameters in the Windows Services utility before you start the MySQL service.

Finally, before trying to start the MySQL service, make sure the user variables \%TEMP\% and \%TMP\% (and also \%TMPDIR\%, if it has ever been set) for the operating system user who is to run the service are pointing to a folder to which the user has write access. The default user for running the MySQL service is LocalSystem, and the default value for its \%TEMP\% and \%TMP\% is C : \Windows\Temp, a directory LocalSystem has write access to by default. However, if there are any changes to that default setup (for example, changes to the user who runs the service or to the mentioned user variables, or the tmpdir option has been used to put the temporary directory somewhere else), the MySQL service might fail to run because write access to the temporary directory has not been granted to the proper user.

\section*{Starting the service}

After a MySQL server instance has been installed as a service, Windows starts the service automatically whenever Windows starts. The service also can be started immediately from the Services utility, or by using an sc start mysqld_service_name or NET START mysqld_service_name command. SC and NET commands are not case-sensitive.

When run as a service, mysqld has no access to a console window, so no messages can be seen there. If mysqld does not start, check the error log to see whether the server wrote any messages there to indicate the cause of the problem. The error log is located in the MySQL data directory (for example, C: \Program Files\MySQL\MySQL Server 8.4 \data). It is the file with a suffix of .err.

When a MySQL server has been installed as a service, and the service is running, Windows stops the service automatically when Windows shuts down. The server also can be stopped manually using the Services utility, the sc stop mysqld_service_name command, the NET STOP mysqld_service_name command, or the mysqladmin shutdown command.

You also have the choice of installing the server as a manual service if you do not wish for the service to be started automatically during the boot process. To do this, use the --install-manual option rather than the --install option:
```
C:\> "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld" --install-manual
```


\section*{Removing the service}

To remove a server that is installed as a service, first stop it if it is running by executing SC STOP mysqld_service_name or NET STOP mysqld_service_name. Then use SC DELETE mysqld_service_name to remove it:

C: \> SC DELETE mysql
Alternatively, use the mysqld - - remove option to remove the service.
C:\> "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld" --remove
If mysqld is not running as a service, you can start it from the command line. For instructions, see Section 2.3.3.6, "Starting MySQL from the Windows Command Line".

If you encounter difficulties during installation, see Section 2.3.4, "Troubleshooting a Microsoft Windows MySQL Server Installation".

For more information about stopping or removing a Windows service, see Section 7.8.2.2, "Starting Multiple MySQL Instances as Windows Services".

\subsection*{2.3.3.9 Testing The MySQL Installation}

You can test whether the MySQL server is working by executing any of the following commands:
```
C:\> "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqlshow"
C:\> "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqlshow" -u root mysql
C:\> "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqladmin" version status proc
C:\> "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql" test
```


If mysqld is slow to respond to TCP/IP connections from client programs, there is probably a problem with your DNS. In this case, start mysqld with the skip_name_resolve system variable enabled and use only localhost and IP addresses in the Host column of the MySQL grant tables. (Be sure that an account exists that specifies an IP address or you may not be able to connect.)

You can force a MySQL client to use a named-pipe connection rather than TCP/IP by specifying the pipe or --protocol=PIPE option, or by specifying . (period) as the host name. Use the --socket option to specify the name of the pipe if you do not want to use the default pipe name.

If you have set a password for the root account, deleted the anonymous account, or created a new user account, then to connect to the MySQL server you must use the appropriate - u and - p options with the commands shown previously. See Section 6.2.4, "Connecting to the MySQL Server Using Command Options".

For more information about mysqlshow, see Section 6.5.6, "mysqlshow - Display Database, Table, and Column Information".

\subsection*{2.3.4 Troubleshooting a Microsoft Windows MySQL Server Installation}

When installing and running MySQL for the first time, you may encounter certain errors that prevent the MySQL server from starting. This section helps you diagnose and correct some of these errors.

Your first resource when troubleshooting server issues is the error log. The MySQL server uses the error log to record information relevant to the error that prevents the server from starting. The error log is located in the data directory specified in your my. ini file. The default data directory location is C: \Program Files\MySQL\MySQL Server 8.4\data, or C:\ProgramData\Mysqlon Windows 7 and Windows Server 2008. The C: \ProgramData directory is hidden by default. You need to change your folder options to see the directory and contents. For more information on the error log and understanding the content, see Section 7.4.2, "The Error Log".

For information regarding possible errors, also consult the console messages displayed when the MySQL service is starting. Use the SC START mysqld_service_name or NET START mysqld_service_name command from the command line after installing mysqld as a service to see any error messages regarding the starting of the MySQL server as a service. See Section 2.3.3.8, "Starting MySQL as a Windows Service".

The following examples show other common error messages you might encounter when installing MySQL and starting the server for the first time:
- If the MySQL server cannot find the mysql privileges database or other critical files, it displays these messages:
```
System error 1067 has occurred.
Fatal error: Can't open and lock privilege tables:
Table 'mysql.user' doesn't exist
```


These messages often occur when the MySQL base or data directories are installed in different locations than the default locations (C: \Program Files\MySQL\MySQL Server 8.4 and C: \Program Files\MySQL\MySQL Server 8.4\data, respectively).

This situation can occur when MySQL is upgraded and installed to a new location, but the configuration file is not updated to reflect the new location. In addition, old and new configuration files might conflict. Be sure to delete or rename any old configuration files when upgrading MySQL.

If you have installed MySQL to a directory other than C: \Program Files\MySQL\MySQL Server 8.4 , ensure that the MySQL server is aware of this through the use of a configuration (my.ini) file. Put the my.ini file in your Windows directory, typically C: \WINDOWS. To determine its exact location from the value of the WINDIR environment variable, issue the following command from the command prompt:
```
C:\> echo %WINDIR%
```


You can create or modify an option file with any text editor, such as Notepad. For example, if MySQL is installed in E: \mysqland and the data directory is D: \MySQLdata, you can create the option file and set up a [mysqld] section to specify values for the basedir and datadir options:
```
[mysqld]
# set basedir to your installation path
basedir=E:/mysql
# set datadir to the location of your data directory
datadir=D:/MySQLdata
```


Microsoft Windows path names are specified in option files using (forward) slashes rather than backslashes. If you do use backslashes, double them:
```
[mysqld]
# set basedir to your installation path
basedir=C:\\Program Files\\MySQL\\MySQL Server 8.4
# set datadir to the location of your data directory
datadir=D:\\MySQLdata
```


The rules for use of backslash in option file values are given in Section 6.2.2.2, "Using Option Files".
If you change the datadir value in your MySQL configuration file, you must move the contents of the existing MySQL data directory before restarting the MySQL server.

See Section 2.3.3.2, "Creating an Option File".
- If you reinstall or upgrade MySQL without first stopping and removing the existing MySQL service, and then configure MySQL using MySQL Configurator, you might see this error:

Error: Cannot create Windows service for MySql. Error: 0
This occurs when the Configuration Wizard tries to install the service and finds an existing service with the same name.

One solution to this problem is to choose a service name other than mysql when using the configuration wizard. This enables the new service to be installed correctly, but leaves the outdated service in place. Although this is harmless, it is best to remove old services that are no longer in use.

To permanently remove the old mysql service, execute the following command as a user with administrative privileges, on the command line:
```
C:\> SC DELETE mysql
[SC] DeleteService SUCCESS
```


If the SC utility is not available for your version of Windows, download the delsrv utility from http:// www.microsoft.com/windows2000/techinfo/reskit/tools/existing/delsrv-o.asp and use the delsrv mysql syntax.

\subsection*{2.3.5 Windows Postinstallation Procedures}

GUI tools exist that perform most of the tasks described in this section, including:
- MySQL Configurator: Used to configure the MySQL server.
- MySQL Workbench: Manages the MySQL server and edits SQL statements.

If necessary, initialize the data directory and create the MySQL grant tables. Windows installation operations performed by MySQL Configurator can initialize the data directory automatically. For installation from a ZIP Archive package, initialize the data directory as described at Section 2.9.1, "Initializing the Data Directory".

Regarding passwords, if you configured MySQL using the MySQL Configurator, you may have already assigned a password to the initial root account. (See Section 2.3.2, "Configuration: Using MySQL Configurator".) Otherwise, use the password-assignment procedure given in Section 2.9.4, "Securing the Initial MySQL Account".

Before assigning a password, you might want to try running some client programs to make sure that you can connect to the server and that it is operating properly. Make sure that the server is running (see Section 2.3.3.5, "Starting the Server for the First Time"). You can also set up a MySQL service that runs automatically when Windows starts (see Section 2.3.3.8, "Starting MySQL as a Windows Service").

These instructions assume that your current location is the MySQL installation directory and that it has a bin subdirectory containing the MySQL programs used here. If that is not true, adjust the command path names accordingly.

If you installed MySQL using the MSI, the default installation directory is C : \Program Files\MySQL \MySQL Server 8.4:

C:\> cd "C:\Program Files\MySQL\MySQL Server 8.4"
A common installation location for installation from a ZIP archive is $\mathrm{C}: \backslash$ mysql:
C: \> cd C:\mysql.

Alternatively, add the bin directory to your PATH environment variable setting. That enables your command interpreter to find MySQL programs properly, so that you can run a program by typing only its name, not its path name. See Section 2.3.3.7, "Customizing the PATH for MySQL Tools".

With the server running, issue the following commands to verify that you can retrieve information from the server. The output should be similar to that shown here.

Use mysqlshow to see what databases exist:
```
C:\> bin\mysqlshow
+---------------------+
| Databases |
+---------------------+
| information_schema
| mysql
| performance_schema
| sys |
+---------------------+
```


The list of installed databases may vary, but always includes at least mysql and information_schema.

The preceding command (and commands for other MySQL programs such as mysql) may not work if the correct MySQL account does not exist. For example, the program may fail with an error, or you may not be able to view all databases. If you configured MySQL using MySQL Configurator, the root user is created automatically with the password you supplied. In this case, you should use the -u root and - p options. (You must use those options if you have already secured the initial MySQL accounts.) With -p , the client program prompts for the root password. For example:
```
C:\> bin\mysqlshow -u root -p
Enter password: (enter root password here)
+----------------------+
| Databases |
+---------------------+
| information_schema |
| mysql
| performance_schema
| sys |
+---------------------+
```


If you specify a database name, mysqlshow displays a list of the tables within the database:
```
C:\> bin\mysqlshow mysql
Database: mysql
+-----------------------------+
| Tables |
+-----------------------------+
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
| user |
+-----------------------------+
```


Use the mysql program to select information from a table in the mysql database:
```
C:\> bin\mysql -e "SELECT User, Host, plugin FROM mysql.user" mysql
+------+------------+----------------------+
| User | Host | plugin |
+------+-----------+-----------------------+
| root | localhost | caching_sha2_password |
+------+------------+----------------------+
```


For more information about mysql and mysqlshow, see Section 6.5.1, "mysql - The MySQL Command-Line Client", and Section 6.5.6, "mysqlshow - Display Database, Table, and Column Information".

\subsection*{2.3.6 Windows Platform Restrictions}

The following restrictions apply to use of MySQL on the Windows platform:

\section*{－Process memory}

On Windows 32 －bit platforms，it is not possible by default to use more than 2 GB of RAM within a single process，including MySQL．This is because the physical address limit on Windows 32－bit is 4 GB and the default setting within Windows is to split the virtual address space between kernel $(2 \mathrm{~GB})$ and user／applications（ 2 GB ）．

Some versions of Windows have a boot time setting to enable larger applications by reducing the kernel application．Alternatively，to use more than 2 GB ，use a 64－bit version of Windows．

\section*{－File system aliases}

When using MyISAM tables，you cannot use aliases within Windows link to the data files on another volume and then link back to the main MySQL datadir location．

This facility is often used to move the data and index files to a RAID or other fast solution．

\section*{－Limited number of ports}

Windows systems have about 4，000 ports available for client connections，and after a connection on a port closes，it takes two to four minutes before the port can be reused．In situations where clients connect to and disconnect from the server at a high rate，it is possible for all available ports to be used up before closed ports become available again．If this happens，the MySQL server appears to be unresponsive even though it is running．Ports may be used by other applications running on the machine as well，in which case the number of ports available to MySQL is lower．

For more information about this problem，see https：／／support．microsoft．com／kb／196271．

\section*{－DATA DIRECTORY and INDEX DIRECTORY}

The DATA DIRECTORY clause of the CREATE TABLE statement is supported on Windows for InnoDB tables only，as described in Section 17．6．1．2，＂Creating Tables Externally＂．For MyISAM and other storage engines，the DATA DIRECTORY and INDEX DIRECTORY clauses for CREATE TABLE are ignored on Windows and any other platforms with a nonfunctional realpath（）call．

\section*{－DROP DATABASE}

You cannot drop a database that is in use by another session．

\section*{－Case－insensitive names}

File names are not case－sensitive on Windows，so MySQL database and table names are also not case－sensitive on Windows．The only restriction is that database and table names must be specified using the same case throughout a given statement．See Section 11．2．3，＂Identifier Case Sensitivity＂．

\section*{－Directory and file names}

On Windows，MySQL Server supports only directory and file names that are compatible with the current ANSI code pages．For example，the following Japanese directory name does not work in the Western locale（code page 1252）：
```
datadir="C:/私たちのプロジェクトのデータ"
```


The same limitation applies to directory and file names referred to in SQL statements，such as the data file path name in LOAD DATA．

\section*{－The \path name separator character}

Path name components in Windows are separated by the \character，which is also the escape character in MySQL．If you are using LOAD DATA or SELECT ．．．INTO OUTFILE，use Unix－style file names with／characters：
```
mysql> LOAD DATA INFILE 'C:/tmp/skr.txt' INTO TABLE skr;
```

```
mysql> SELECT * INTO OUTFILE 'C:/tmp/skr.txt' FROM skr;
```


Alternatively, you must double the \character:
```
mysql> LOAD DATA INFILE 'C:\\tmp\\skr.txt' INTO TABLE skr;
mysql> SELECT * INTO OUTFILE 'C:\\tmp\\skr.txt' FROM skr;
```


\section*{- Problems with pipes}

Pipes do not work reliably from the Windows command-line prompt. If the pipe includes the character $\wedge \mathrm{Z} /$ CHAR(24), Windows thinks that it has encountered end-of-file and aborts the program.

This is mainly a problem when you try to apply a binary log as follows:
```
C:\> mysqlbinlog binary_log_file | mysql --user=root
```


If you have a problem applying the log and suspect that it is because of a ^ Z / CHAR ( 24 ) character, you can use the following workaround:
```
C:\> mysqlbinlog binary_log_file --result-file=/tmp/bin.sql
C:\> mysql --user=root --execute "source /tmp/bin.sql"
```


The latter command also can be used to reliably read any SQL file that may contain binary data.

\subsection*{2.4 Installing MySQL on macOS}

For a list of macOS versions that the MySQL server supports, see https://www.mysql.com/support/ supportedplatforms/database.html.

MySQL for macOS is available in a number of different forms:
- Native Package Installer, which uses the native macOS installer (DMG) to walk you through the installation of MySQL. For more information, see Section 2.4.2, "Installing MySQL on macOS Using Native Packages". You can use the package installer with macOS. The user you use to perform the installation must have administrator privileges.
- Compressed TAR archive, which uses a file packaged using the Unix tar and gzip commands. To use this method, you need to open a Terminal window. You do not need administrator privileges using this method; you can install the MySQL server anywhere using this method. For more information on using this method, you can use the generic instructions for using a tarball, Section 2.2, "Installing MySQL on Unix/Linux Using Generic Binaries".

In addition to the core installation, the Package Installer also includes Section 2.4.3, "Installing and Using the MySQL Launch Daemon" and Section 2.4.4, "Installing and Using the MySQL Preference Pane" to simplify the management of your installation.

For additional information on using MySQL on macOS, see Section 2.4.1, "General Notes on Installing MySQL on macOS".

\subsection*{2.4.1 General Notes on Installing MySQL on macOS}

You should keep the following issues and notes in mind:
- Other MySQL installations: The installation procedure does not recognize MySQL installations by package managers such as Homebrew. The installation and upgrade process is for MySQL packages provided by us. If other installations are present, then consider stopping them before executing this installer to avoid port conflicts.

Homebrew: For example, if you installed MySQL Server using Homebrew to its default location then the MySQL installer installs to a different location and won't upgrade the version from Homebrew. In this scenario you would end up with multiple MySQL installations that, by default, attempt to use the
same ports. Stop the other MySQL Server instances before running this installer, such as executing brew services stop mysql to stop the Homebrew's MySQL service.
- Launchd: A launchd daemon is installed that alters MySQL configuration options. Consider editing it if needed, see the documentation below for additional information. Also, macOS 10.10 removed startup item support in favor of launchd daemons. The optional MySQL preference pane under macOS System Preferences uses the launchd daemon.
- Users: You may need (or want) to create a specific mysql user to own the MySQL directory and data. You can do this through the Directory Utility, and the mysql user should already exist. For use in single user mode, an entry for _mysql (note the underscore prefix) should already exist within the system /etc/passwd file.
- Data: Because the MySQL package installer installs the MySQL contents into a version and platform specific directory, you can use this to upgrade and migrate your database between versions. You need either to copy the data directory from the old version to the new version, or to specify an alternative datadir value to set location of the data directory. By default, the MySQL directories are installed under /usr/local/.
- Aliases: You might want to add aliases to your shell's resource file to make it easier to access commonly used programs such as mysql and mysqladmin from the command line. The syntax for bash is:
```
alias mysql=/usr/local/mysql/bin/mysql
alias mysqladmin=/usr/local/mysql/bin/mysqladmin
```


For tcsh, use:
```
alias mysql /usr/local/mysql/bin/mysql
alias mysqladmin /usr/local/mysql/bin/mysqladmin
```


Even better, add /usr/local/mysql/bin to your PATH environment variable. You can do this by modifying the appropriate startup file for your shell. For more information, see Section 6.2.1, "Invoking MySQL Programs".
- Removing: After you have copied over the MySQL database files from the previous installation and have successfully started the new server, you should consider removing the old installation files to save disk space. Additionally, you should also remove older versions of the Package Receipt directories located in /Library/Receipts/mysql-VERSION.pkg.

\subsection*{2.4.2 Installing MySQL on macOS Using Native Packages}

The package is located inside a disk image ( .dmg) file that you first need to mount by double-clicking its icon in the Finder. It should then mount the image and display its contents.

\section*{Note}

Before proceeding with the installation, be sure to stop all running MySQL server instances by using either the MySQL Manager Application (on macOS Server), the preference pane, or mysqladmin shutdown on the command line.

To install MySQL using the package installer:
1. Download the disk image (.dmg) file (the community version is available here) that contains the MySQL package installer. Double-click the file to mount the disk image and see its contents.

Double-click the MySQL installer package from the disk. It is named according to the version of MySQL you have downloaded. For example, for MySQL server 8.4.9 it might be named mysql-8.4.9-macos-10.13-x86_64.pkg.
2. The initial wizard introduction screen references the MySQL server version to install. Click Continue to begin the installation.

The MySQL community edition shows a copy of the relevant GNU General Public License. Click Continue and then Agree to continue.
3. From the Installation Type page you can either click Install to execute the installation wizard using all defaults, click Customize to alter which components to install (MySQL server, MySQL Test, Preference Pane, Launchd Support -- all but MySQL Test are enabled by default).

\begin{figure}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0145.jpg?height=175&width=1369&top_left_y=513&top_left_x=420}
\captionsetup{labelformat=empty}
\caption{Figure 2.5 MySQL Package Installer Wizard: Customize}
\end{figure}

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 2.5 MySQL Package Installer Wizard: Customize}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0145.jpg?height=869&width=1207&top_left_y=815&top_left_x=463}
\end{figure}
4. Click Install to install MySQL Server. The installation process ends here if upgrading a current MySQL Server installation, otherwise follow the wizard's additional configuration steps for your new MySQL Server installation.
5. After a successful new MySQL Server installation, complete the configuration by defining the root password and enabling (or disabling) the MySQL server at startup.
6. Define a password for the root user, and also toggle whether MySQL Server should start after the configuration step is complete.
7. Summary is the final step and references a successful and complete MySQL Server installation. Close the wizard.

MySQL server is now installed. If you chose to not start MySQL, then use either launchctl from the command line or start MySQL by clicking "Start" using the MySQL preference pane. For additional information, see Section 2.4.3, "Installing and Using the MySQL Launch Daemon", and Section 2.4.4, "Installing and Using the MySQL Preference Pane". Use the MySQL Preference Pane or launchd to configure MySQL to automatically start at bootup.

When installing using the package installer, the files are installed into a directory within /usr/ local matching the name of the installation version and platform. For example, the installer file
mysql-8.4.9-macos10.15-x86_64.dmg installs MySQL into /usr/local/mysql-8.4.9-macos10.15-x86_64/ with a symlink to /usr/local/mysql. The following table shows the layout of this MySQL installation directory.

\section*{Note}

The macOS installation process does not create nor install a sample my.cnf MySQL configuration file.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.8 MySQL Installation Layout on macOS}
\begin{tabular}{|l|l|}
\hline Directory & Contents of Directory \\
\hline bin & mysqld server, client and utility programs \\
\hline data & Log files, databases, where /usr/local/ mysql/data/mysqld.local.err is the default error log \\
\hline docs & Helper documents, like the Release Notes and build information \\
\hline include & Include (header) files \\
\hline lib & Libraries \\
\hline man & Unix manual pages \\
\hline mysql-test & MySQL test suite ('MySQL Test' is disabled by default during the installation process when using the installer package (DMG)) \\
\hline share & Miscellaneous support files, including error messages, dictionary.txt, and rewriter SQL \\
\hline support-files & Support scripts, such as mysqld_multi.server, mysql.server, and mysql-log-rotate. \\
\hline /tmp/mysql.sock & Location of the MySQL Unix socket \\
\hline
\end{tabular}
\end{table}

\subsection*{2.4.3 Installing and Using the MySQL Launch Daemon}
macOS uses launch daemons to automatically start, stop, and manage processes and applications such as MySQL.

By default, the installation package (DMG) on macOS installs a launchd file named /Library/ LaunchDaemons/com.oracle.oss.mysql.mysqld.plist that contains a plist definition similar to:
```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.c
<plist version="1.0">
<dict>
    <key>Label</key> <string>com.oracle.oss.mysql.mysqld</string>
    <key>ProcessType</key> <string>Interactive</string>
    <key>Disabled</key> <false/>
    <key>RunAtLoad</key> <true/>
    <key>KeepAlive</key> <true/>
    <key>SessionCreate</key> <true/>
    <key>LaunchOnlyOnce</key> <false/>
    <key>UserName</key> <string>_mysql</string>
    <key>GroupName</key> <string>_mysql</string>
    <key>ExitTimeOut</key> <integer>600</integer>
    <key>Program</key> <string>/usr/local/mysql/bin/mysqld</string>
    <key>ProgramArguments</key>
        <array>
```

```
            <string>/usr/local/mysql/bin/mysqld</string>
            <string>--user=_mysql</string>
            <string>--basedir=/usr/local/mysql</string>
            <string>--datadir=/usr/local/mysql/data</string>
            <string>--plugin-dir=/usr/local/mysql/lib/plugin</string>
            <string>--log-error=/usr/local/mysql/data/mysqld.local.err</string>
            <string>--pid-file=/usr/local/mysql/data/mysqld.local.pid</string>
            <string>--keyring-file-data=/usr/local/mysql/keyring/keyring</string>
            <string>--early-plugin-load=keyring_okv=keyring_okv.so</string>
        </array>
    <key>WorkingDirectory</key> <string>/usr/local/mysql</string>
</dict>
</plist>
```


\section*{Note}

Some users report that adding a plist DOCTYPE declaration causes the launchd operation to fail, despite it passing the lint check. We suspect it's a copy-n-paste error. The md5 checksum of a file containing the above snippet is d925f05f6d1b6ee5ce5451b596d6baed.

To enable the launchd service, you can either:
- Open macOS system preferences and select the MySQL preference panel, and then execute Start MySQL Server.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 2.6 MySQL Preference Pane: Location}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0147.jpg?height=1182&width=1315&top_left_y=1347&top_left_x=383}
\end{figure}

The Instances page includes an option to start or stop MySQL, and Initialize Database recreates the data/ directory. Uninstall uninstalls MySQL Server and optionally the MySQL preference panel and launchd information.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 2.7 MySQL Preference Pane: Instances}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0148.jpg?height=1114&width=1435&top_left_y=385&top_left_x=313}
\end{figure}
- Or, manually load the launchd file.
```
$> cd /Library/LaunchDaemons
$> sudo launchctl load -F com.oracle.oss.mysql.mysqld.plist
```

- To configure MySQL to automatically start at bootup, you can:
```
$> sudo launchctl load -w com.oracle.oss.mysql.mysqld.plist
```


Additional launchd related information:
- The plist entries override my.cnf entries, because they are passed in as command line arguments. For additional information about passing in program options, see Section 6.2.2, "Specifying Program Options".
- The ProgramArguments section defines the command line options that are passed into the program, which is the mysqld binary in this case.
- The default plist definition is written with less sophisticated use cases in mind. For more complicated setups, you may want to remove some of the arguments and instead rely on a MySQL configuration file, such as my.cnf.
- If you edit the plist file, then uncheck the installer option when reinstalling or upgrading MySQL. Otherwise, your edited plist file is overwritten, and all edits are lost.

Because the default plist definition defines several ProgramArguments, you might remove most of these arguments and instead rely upon your my. cnf MySQL configuration file to define them. For example:
```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1
<plist version="1.0">
<dict>
    <key>Label</key> <string>com.oracle.oss.mysql.mysqld</string>
    <key>ProcessType</key> <string>Interactive</string>
    <key>Disabled</key> <false/>
    <key>RunAtLoad</key> <true/>
    <key>KeepAlive</key> <true/>
    <key>SessionCreate</key> <true/>
    <key>LaunchOnlyOnce</key> <false/>
    <key>UserName</key> <string>_mysql</string>
    <key>GroupName</key> <string>_mysql</string>
    <key>ExitTimeOut</key> <integer>600</integer>
    <key>Program</key> <string>/usr/local/mysql/bin/mysqld</string>
    <key>ProgramArguments</key>
        <array>
            <string>/usr/local/mysql/bin/mysqld</string>
            <string>--user=_mysql</string>
            <string>--basedir=/usr/local/mysql</string>
            <string>--datadir=/usr/local/mysql/data</string>
            <string>--plugin-dir=/usr/local/mysql/lib/plugin</string>
            <string>--log-error=/usr/local/mysql/data/mysqld.local.err</string>
            <string>--pid-file=/usr/local/mysql/data/mysqld.local.pid</string>
            <string>--keyring-file-data=/usr/local/mysql/keyring/keyring</string>
            <string>--early-plugin-load=keyring_okv=keyring_okv.so</string>
        </array>
    <key>WorkingDirectory</key> <string>/usr/local/mysql</string>
</dict>
</plist>
```


In this case, the basedir, datadir, plugin_dir, log_error, pid_file, and - -early-pluginload options were removed from the default plist ProgramArguments definition, which you might have defined in my.cnf instead.

\subsection*{2.4.4 Installing and Using the MySQL Preference Pane}

The MySQL Installation Package includes a MySQL preference pane that enables you to start, stop, and control automated startup during boot of your MySQL installation.

This preference pane is installed by default, and is listed under your system's System Preferences window.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 2.8 MySQL Preference Pane: Location}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0150.jpg?height=1205&width=1347&top_left_y=319&top_left_x=285}
\end{figure}

The MySQL preference pane is installed with the same DMG file that installs MySQL Server. Typically it is installed with MySQL Server but it can be installed by itself too.

To install the MySQL preference pane:
1. Go through the process of installing the MySQL server, as described in the documentation at Section 2.4.2, "Installing MySQL on macOS Using Native Packages".
2. Click Customize at the Installation Type step. The "Preference Pane" option is listed there and enabled by default; make sure it is not deselected. The other options, such as MySQL Server, can be selected or deselected.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Figure 2.9 MySQL Package Installer Wizard: Customize}
\begin{tabular}{|l|l|l|}
\hline \multicolumn{3}{|l|}{◯ Install MySQL 8.1.0-community} \\
\hline \multicolumn{3}{|c|}{} \\
\hline & Package Name & Action \\
\hline - Introduction & □ MySQL Server & Install \\
\hline - License & □ & Skip \\
\hline \begin{tabular}{l}
\section*{- Installation} \\
- Configuration \\
- Summary
\end{tabular} & ✓ Launchd Support & Upgrade \\
\hline & Space Required: $\mathbf{8 1 8 . 7} \mathrm{MB}$ & Remaining: 383.08 GB \\
\hline ![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0151.jpg?height=236\&width=329\&top_left_y=989\&top_left_x=470) & □ & \\
\hline & \begin{tabular}{l}
□ \\
Standard Install
\end{tabular} & \begin{tabular}{l}
□ \\
Go Back
\end{tabular} \\
\hline
\end{tabular}
\end{table}
3. Complete the installation process.

\section*{Note}

The MySQL preference pane only starts and stops MySQL installation installed from the MySQL package installation that have been installed in the default location.

Once the MySQL preference pane has been installed, you can control your MySQL server instance using this preference pane.

The Instances page includes an option to start or stop MySQL, and Initialize Database recreates the data/ directory. Uninstall uninstalls MySQL Server and optionally the MySQL preference panel and launchd information.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 2.10 MySQL Preference Pane: Instances}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0152.jpg?height=1134&width=1351&top_left_y=392&top_left_x=392}
\end{figure}

The Configuration page shows MySQL Server options including the path to the MySQL configuration file.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 2.11 MySQL Preference Pane: Configuration}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0153.jpg?height=1141&width=1460&top_left_y=374&top_left_x=347}
\end{figure}

The MySQL Preference Pane shows the current status of the MySQL server, showing stopped (in red) if the server is not running and running (in green) if the server has already been started. The preference pane also shows the current setting for whether the MySQL server has been set to start automatically.

\subsection*{2.5 Installing MySQL on Linux}

Linux supports a number of different solutions for installing MySQL. We recommend that you use one of the distributions from Oracle, for which several methods for installation are available:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 2.9 Linux Installation Methods and Information}
\begin{tabular}{|l|l|l|}
\hline Type & Setup Method & Additional Information \\
\hline Apt & Enable the MySQL Apt repository & Documentation \\
\hline Yum & Enable the MySQL Yum repository & Documentation \\
\hline Zypper & Enable the MySQL SLES repository & Documentation \\
\hline RPM & Download a specific package & Documentation \\
\hline DEB & Download a specific package & Documentation \\
\hline Generic & Download a generic package & Documentation \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Type & Setup Method & Additional Information \\
\hline Source & Compile from source & Documentation \\
\hline Docker & Use the Oracle Container Registry. You can also use My Oracle Support for the MySQL Enterprise Edition. & Documentation \\
\hline Oracle Unbreakable Linux Network & Use ULN channels & Documentation \\
\hline
\end{tabular}

As an alternative, you can use the package manager on your system to automatically download and install MySQL with packages from the native software repositories of your Linux distribution. These native packages are often several versions behind the currently available release. You are also normally unable to install innovation releases, since these are not usually made available in the native repositories. For more information on using the native package installers, see Section 2.5.7, "Installing MySQL on Linux from the Native Software Repositories".

\section*{Note \\ For many Linux installations, you want to set up MySQL to be started automatically when your machine starts. Many of the native package installations perform this operation for you, but for source, binary and RPM solutions you may need to set this up separately. The required script, mysql.server, can be found in the support-files directory under the MySQL installation directory or in a MySQL source tree. You can install it as /etc/init.d/mysql for automatic MySQL startup and shutdown. See Section 6.3.3, "mysql.server - MySQL Server Startup Script".}

\subsection*{2.5.1 Installing MySQL on Linux Using the MySQL Yum Repository}

The MySQL Yum repository for Oracle Linux, Red Hat Enterprise Linux, CentOS, and Fedora provides RPM packages for installing the MySQL server, client, MySQL Workbench, MySQL Utilities, MySQL Router, MySQL Shell, Connector/ODBC, Connector/Python and so on (not all packages are available for all the distributions; see Installing Additional MySQL Products and Components with Yum for details).

\section*{Before You Start}

As a popular, open-source software, MySQL, in its original or re-packaged form, is widely installed on many systems from various sources, including different software download sites, software repositories, and so on. The following instructions assume that MySQL is not already installed on your system using a third-party-distributed RPM package; if that is not the case, follow the instructions given at Replacing a Native Third-Party Distribution of MySQL.

> Note
> Repository setup RPM file names begin with mysql84, which describes the MySQL series that is enabled by default for installation. In this case, the MySQL 8.4 LTS subrepository is enabled by default. It also contains other subrepository versions, such as MySQL 8.0 and the MySQL Innovation Series, which are disabled by default.

\section*{Steps for a Fresh Installation of MySQL}

Follow these steps to choose and install the latest MySQL products:

\section*{Adding the MySQL Yum Repository}

Add the MySQL Yum repository to your system's repository list. This is typically a one-time operation that is performed by installing the RPM provided by MySQL. Follow these steps:
a. Download it from the MySQL Yum Repository page (https://dev.mysql.com/downloads/repo/ yum/) in the MySQL Developer Zone.
b. Select and download the release package for your platform.
c. Install the downloaded release package. The package file format is:
```
mysql84-community-release-{platform}-{version-number}.noarch.rpm
```

- mysq184: Indicates the MySQL version that is enabled by default. In this case, MySQL 8.4 is enabled by default, and both MySQL 8.0 and the MySQL Innovation series are available but disabled by default.
- \{platform\}: The platform code, such as el7, el8, el9, fc41, or fc42. The 'el' represents Enterprise Linux, 'fc' for Fedora, and it ends with the platform's base version number.
- \{version-number\}: Version of the MySQL repository configuration RPM as they do receive occasional updates.

Install the RPM you downloaded for your system, for example:
```
$> sudo yum localinstall mysql84-community-release-{platform}-{version-number}.noarch.rpm
```


The installation command adds the MySQL Yum repository to your system's repository list and downloads the GnuPG key to check the integrity of the software packages. See Section 2.1.4.2, "Signature Checking Using GnuPG" for details on GnuPG key checking.

You can check that the MySQL Yum repository has been successfully added and enabled by the following command (for dnf-enabled systems, replace yum in the command with dnf):
```
$> yum repolist enabled | grep mysql.*-community
```


Example output:
```
mysql-8.4-lts-community MySQL 8.4 LTS Community Server
mysql-tools-8.4-lts-community MySQL Tools 8.4 LTS Community
```


This also demonstrates that the latest LTS MySQL version is enabled by default. Methods to choose a different release series, such as the innovation track (which today is 9.6 ) or a previous series (such as MySQL 8.0), are described below.

\section*{Note}

Once the MySQL Yum repository is enabled on your system, any systemwide update by the yum update command (or dnf upgrade for dnfenabled systems) upgrades MySQL packages on your system and replaces any native third-party packages, if Yum finds replacements for them in the MySQL Yum repository; see Section 3.8, "Upgrading MySQL with the MySQL Yum Repository", for a discussion on some possible effects of that on your system, see Upgrading the Shared Client Libraries.

\section*{Selecting a Release Series}

When using the MySQL Yum repository, the latest bugfix series (currently MySQL 8.4) is selected for installation by default. If this is what you want, you can skip to the next step, Installing MySQL.

Within the MySQL Yum repository, each MySQL Community Server release series is hosted in a different subrepository. The subrepository for the latest LTS series (currently MySQL 8.4) is enabled by default, and the subrepositories for all other series' (for example, MySQL 8.0 and the

MySQL Innovation series) are disabled by default. Use this command to see all available MySQLrelated subrepositories (for dnf-enabled systems, replace yum in the command with dnf):
```
$> yum repolist all | grep mysql
```


Example output:
```
mysql-connectors-community MySQL Connectors Community enabled
mysql-tools-8.4-lts-community MySQL Tools 8.4 LTS Community enabled
mysql-tools-community MySQL Tools Community disabled
mysql-tools-innovation-community MySQL Tools Innovation Commu disabled
mysql-innovation-community MySQL Innovation Release Com disabled
mysql-8.4-lts-community MySQL 8.4 Community LTS Server enabled
mysql-8.4-lts-community-debuginfo MySQL 8.4 Community LTS Server - disabled
mysql-8.4-lts-community-source MySQL 8.4 Community LTS Server - disabled
mysql80-community MySQL 8.0 Community Server - disabled
mysql80-community-debuginfo MySQL 8.0 Community Server - disabled
mysql80-community-source MySQL 8.0 Community Server - disabled
```


To install the latest release from a specific series other than the latest LTS series, disable the bug subrepository for the latest LTS series and enable the subrepository for the specific series before running the installation command. If your platform supports the yum-config-manager or dnf config-manager command, you can do that by issuing the following commands to disable the subrepository for the 8.4 series and enable the one for the 8.0 series:
```
$> sudo yum-config-manager --disable mysql-8.4-lts-community
$> sudo yum-config-manager --enable mysql80-community
```


For dnf-enabled platforms:
```
$> sudo dnf config-manager --disable mysql-8.4-lts-community
$> sudo dnf config-manager --enable mysql80-community
```


Instead of using the config-manager commands you can manually edit the /etc/yum.repos.d/ mysql-community. repo file by toggling the enabled option. For example, a typical default entry for EL8:
```
[mysql-8.4-lts-community]
name=MySQL 8.4 LTS Community Server
baseurl=http://repo.mysql.com/yum/mysql-8.4-community/el/8/$basearch/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-mysql-2025
```


Find the entry for the subrepository you want to configure and edit the enabled option. Specify enabled $=0$ to disable a subrepository or enabled $=1$ to enable a subrepository. For example, to install from the MySQL innovation track, make sure you have enabled=0 for the MySQL 8.4 subrepository entries and have enabled=1 for the innovation entries:
```
[mysql80-community]
name=MySQL 8.0 Community Server
baseurl=http://repo.mysql.com/yum/mysql-8.0-community/el/8/$basearch
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-mysql-2025
```


You should only enable subrepository for one release series at any time.
Verify that the correct subrepositories have been enabled and disabled by running the following command and checking its output (for dnf-enabled systems, replace yum in the command with dnf):
```
$> yum repolist enabled | grep mysql
```


\section*{Disabling the Default MySQL Module}
(EL8 systems only) EL8-based systems such as RHEL8 and Oracle Linux 8 include a MySQL module that is enabled by default. Unless this module is disabled, it masks packages provided by MySQL repositories. To disable the included module and make the MySQL repository packages visible, use the following command (for dnf-enabled systems, replace yum in the command with dnf):
```
$> sudo yum module disable mysql
```


\section*{Installing MySQL}

Install MySQL by the following command (for dnf-enabled systems, replace yum in the command with dnf):
```
$> sudo yum install mysql-community-server
```


This installs the package for MySQL server (mysql-community-server) and also packages for the components required to run the server, including packages for the client (mysql-communityclient), the common error messages and character sets for client and server (mysql-community-common), and the shared client libraries (mysql-community-libs).

\section*{Starting ${ }^{\mathbf{5}}$ he MySQL Server}

Start the MySQL server with the following command:
```
$> systemctl start mysqld
```


You can check the status of the MySQL server with the following command:
```
$> systemctl status mysqld
```


If the operating system is systemd enabled, standard systemctl (or alternatively, service with the arguments reversed) commands such as stop, start, status, and restart should be used to manage the MySQL server service. The mysqld service is enabled by default, and it starts at system reboot. See Section 2.5.9, "Managing MySQL Server with systemd" for additional information.

At the initial start up of the server, the following happens, given that the data directory of the server is empty:
- The server is initialized.
- SSL certificate and key files are generated in the data directory.
- validate_password is installed and enabled.
- A superuser account 'root'@'localhost is created. A password for the superuser is set and stored in the error log file. To reveal it, use the following command:
```
$> sudo grep 'temporary password' /var/log/mysqld.log
```


Change the root password as soon as possible by logging in with the generated, temporary password and set a custom password for the superuser account:
```
$> mysql -uroot -p
mysql> ALTER USER 'root'@'localhost' IDENTIFIED BY 'MyNewPass4!';
```


\section*{Note}
validate_password is installed by default. The default password policy implemented by validate_password requires that passwords contain at least one uppercase letter, one lowercase letter, one digit, and one special character, and that the total password length is at least 8 characters.

For more information on the postinstallation procedures, see Section 2.9, "Postinstallation Setup and Testing".

\section*{Note}

Compatibility Information for EL7-based platforms: The following RPM packages from the native software repositories of the platforms are incompatible with the package from the MySQL Yum repository that installs the MySQL server. Once you have installed MySQL using the MySQL Yum repository, you cannot install these packages (and vice versa).
- akonadi-mysql

\section*{Installing Additional MySQL Products and Components with Yum}

You can use Yum to install and manage individual components of MySQL. Some of these components are hosted in sub-repositories of the MySQL Yum repository: for example, the MySQL Connectors are to be found in the MySQL Connectors Community sub-repository, and the MySQL Workbench in MySQL Tools Community. You can use the following command to list the packages for all the MySQL components available for your platform from the MySQL Yum repository (for dnf-enabled systems, replace yum in the command with dnf):
```
$> sudo yum --disablerepo=\* --enablerepo='mysql*-community*' list available
```


Install any packages of your choice with the following command, replacing package-name with name of the package (for dnf-enabled systems, replace yum in the command with dnf):
```
$> sudo yum install package-name
```


For example, to install MySQL Workbench on Fedora:
```
$> sudo dnf install mysql-workbench-community
```


To install the shared client libraries (for dnf-enabled systems, replace yum in the command with dnf):
```
$> sudo yum install mysql-community-libs
```


\section*{Platform Specific Notes}

\section*{ARM Support}

ARM 64-bit (aarch64) is supported on Oracle Linux 7 and requires the Oracle Linux 7 Software Collections Repository (ol7_software_collections). For example, to install the server:
```
$> yum-config-manager --enable ol7_software_collections
$> yum install mysql-community-server
```


\section*{Updating MySQL with Yum}

Besides installation, you can also perform updates for MySQL products and components using the MySQL Yum repository. See Section 3.8, "Upgrading MySQL with the MySQL Yum Repository" for details.

\section*{Replacing a Native Third-Party Distribution of MySQL}

If you have installed a third-party distribution of MySQL from a native software repository (that is, a software repository provided by your own Linux distribution), follow these steps:

\section*{Backing Up Your Database}

To avoid loss of data, always back up your database before trying to replace your MySQL installation using the MySQL Yum repository. See Chapter 9, Backup and Recovery, on how to back up your database.

\section*{Adding the MySQL Yum Repository}

Add the MySQL Yum repository to your system's repository list by following the instructions given in Adding the MySQL Yum Repository.

\section*{Replacing the Native Third-Party Distribution by a Yum Update or a DNF Upgrade}

By design, the MySQL Yum repository replaces your native, third-party MySQL with the latest bugfix release from the MySQL Yum repository when you perform a yum update command (or dnf upgrade for dnf-enabled systems) on the system, or a yum update mysql-server (or dnf upgrade mysql-server for dnf-enabled systems).

After updating MySQL using the Yum repository, applications compiled with older versions of the shared client libraries should continue to work. However, if you want to recompile applications and dynamically link them with the updated libraries, see Upgrading the Shared Client Libraries, for some special considerations.

Note
For EL7-based platforms: See Compatibility Information for EL7-based platforms [128].

\subsection*{2.5.2 Installing MySQL on Linux Using the MySQL APT Repository}

This section provides guidance on installing MySQL using the MySQL APT repository.

\section*{Steps for a Fresh Installation of MySQL}

> Note
> The following instructions assume that no version of MySQL (whether distributed by Oracle or other parties) has already been installed on your system; if that is not the case, follow the instructions given in Replacing a Native Distribution of MySQL Using the MySQL APT Repository or Replacing a MySQL Server Installed by a Direct deb Package Download instead.

Adding the MySQL Apt Repository. First, add the MySQL APT repository to your system's software repository list. Follow these steps:
1. Go to the download page for the MySQL APT repository at https://dev.mysql.com/downloads/repo/ apt/.
2. Select and download the release package for your Linux distribution.

Although this is not required for each update, it does update MySQL repository information to include the current information, which includes adding a new LTS series.
3. Install the downloaded release package with the following command, replacing version-specific-package-name with the name of the downloaded package (preceded by its path, if you are not running the command inside the folder where the package is):
```
sudo dpkg -i /PATH/version-specific-package-name.deb
```


For example, for version $w . x . y-z$ of the package, the command is:
```
$> sudo dpkg -i mysql-apt-config_w.x.y-z_all.deb
```


Note that the same package works on all supported Debian and Ubuntu platforms.
4. During the installation of the package, you will be asked to choose the versions of the MySQL server and other components (for example, the MySQL Workbench) that you want to install. If
you are not sure which version to choose, do not change the default options selected for you. You can also choose none if you do not want a particular component to be installed. After making the choices for all components, choose Ok to finish the configuration and installation of the release package.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0160.jpg?height=126&width=100&top_left_y=443&top_left_x=360)

\section*{Note}

The innovation track, which begins with MySQL 8.1, includes "-innovation-" in the component name.

You can always change your choices for the versions later; see Selecting a Major Release Version for instructions.
5. Update package information from the MySQL APT repository with the following command (this step is mandatory):
```
$> sudo apt-get update
```


Instead of using the release package, you can also add and configure the MySQL APT repository manually; see Appendix A: Adding and Configuring the MySQL APT Repository Manually for details.

\section*{Note}

Once the MySQL APT repository is enabled on your system, you will no longer be able to install any MySQL packages from your platform's native software repositories until the MySQL APT repository is disabled.

\section*{Note}

Once the MySQL APT repository is enabled on your system, any systemwide upgrade by the apt-get upgrade command will automatically upgrade the MySQL packages on your system and also replace any native MySQL packages you installed from your Linux distribution's software repository, if APT finds replacements for them from within the MySQL APT repository.

\section*{Selecting a Major Release Version}

By default, all installations and upgrades for your MySQL server and the other required components come from the release series of the major version you have selected during the installation of the configuration package (see Adding the MySQL Apt Repository). However, you can switch to another supported major release series at any time by reconfiguring the configuration package you have installed. Use the following command:
\$> sudo dpkg-reconfigure mysql-apt-config
A dialogue box then asks you to choose the major release version you want. Make your selection and choose Ok. After returning to the command prompt, update package information from the MySQL APT repository with this command:
```
$> sudo apt-get update
```


The latest version in the selected series will then be installed when you use the apt-get install command next time.

You can use the same method to change the version for any other MySQL component you want to install with the MySQL APT repository.

\section*{Installing MySQL with APT}

Install MySQL by the following command:
```
$> sudo apt-get install mysql-server
```


This installs the package for the MySQL server, as well as the packages for the client and for the database common files.

During the installation, you are asked to supply a password for the root user for your MySQL installation.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0161.jpg?height=117&width=104&top_left_y=477&top_left_x=365)

\section*{Important}

Make sure you remember the root password you set. Users who want to set a password later can leave the password field blank in the dialogue box and just press Ok; in that case, root access to the server will be authenticated by Section 8.4.1.10, "Socket Peer-Credential Pluggable Authentication" for connections using a Unix socket file. You can set the root password later using the program mysql_secure_installation.

\section*{Starting and Stopping the MySQL Server}

The MySQL server is started automatically after installation. You can check the status of the MySQL server with the following command:
\$> systemctl status mysql
If the operating system is systemd enabled, standard systemctl (or alternatively, service with the arguments reversed) commands such as stop, start, status, and restart should be used to manage the MySQL server service. The mysql service is enabled by default, and it starts at system reboot. See Section 2.5.9, "Managing MySQL Server with systemd" for additional information.

\section*{Note}

A few third-party native repository packages that have dependencies on the native MySQL packages may not work with the MySQL APT repository packages and should not be used together with them; these include akonadi-backend-mysql, handlersocket-mysql-5.5, and zoneminder.

\section*{Installing Additional MySQL Products and Components with APT}

You can use APT to install individual components of MySQL from the MySQL APT repository. Assuming you already have the MySQL APT repository on your system's repository list (see Adding the MySQL Apt Repository for instructions), first, use the following command to get the latest package information from the MySQL APT repository:
```
$> sudo apt-get update
```


Install any packages of your choice with the following command, replacing package-name with name of the package to install:
```
$> sudo apt-get install package-name
```


For example, to install the MySQL Workbench:
\$> sudo apt-get install mysql-workbench-community
To install the shared client libraries:
\$> sudo apt-get install libmysqlclient21

\section*{Installing MySQL from Source with the MySQL APT Repository}

Note
This feature is only supported on 64-bit systems.

You can download the source code for MySQL and build it using the MySQL APT Repository:
1. Add the MySQL APT repository to your system's repository list and choose the major release series you want (see Adding the MySQL Apt Repository for instructions).
2. Update package information from the MySQL APT repository with the following command (this step is mandatory):
```
$> sudo apt-get update
```

3. Install packages that the build process depends on:
```
$> sudo apt-get build-dep mysql-server
```

4. Download the source code for the major components of MySQL and then build them (run this command in the folder in which you want the downloaded files and the builds to be located):
```
$> apt-get source -b mysql-server
```

deb packages for installing the various MySQL components are created.
5. Pick the deb packages for the MySQL components you need and install them with the command:
```
$> sudo dpkg -i package-name.deb
```


Notice that dependency relationships exist among the MySQL packages. For a basic installation of the MySQL server, install the database common files package, the client package, the client metapackage, the server package, and the server metapackage (in that order) with the following steps:
- Preconfigure the MySQL server package with the following command:
```
$> sudo dpkg-preconfigure mysql-community-server_version-and-platform-specific-part.deb
```


You will be asked to provide a password for the root user for your MySQL installation; see important information on root password given in Installing MySQL with APT above. You might also be asked other questions regarding the installation.
- Install the required packages with a single command:
```
$> sudo dpkg -i mysql-{common,community-client,client,community-server,server}_*.deb
```

- If you are being warned of unmet dependencies by dpkg, you can fix them using apt-get:
```
sudo apt-get -f install
```


Here are where the files are installed on the system:
- All configuration files (like my.cnf) are under /etc/mysql
- All binaries, libraries, headers, etc., are under /usr/bin and /usr/sbin
- The data directory is under /var/lib/mysql

See also information given in Starting and Stopping the MySQL Server.

\section*{Upgrading MySQL with the MySQL APT Repository}

\section*{Notes}
- Before performing any upgrade to MySQL, follow carefully the instructions in Chapter 3, Upgrading MySQL. Among other instructions discussed there, it is especially important to back up your database before the upgrade.
- The following instructions assume that MySQL has been installed on your system using the MySQL APT repository; if that is not the case, follow
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0163.jpg?height=44&width=1125&top_left_y=251&top_left_x=673&polygon=810,0,807,3,805,3,800,7,791,7,789,9,775,9,773,7,762,7,759,5,752,5,750,7,739,7,736,9,730,9,727,12,720,12,718,9,711,9,709,7,704,7,702,5,700,5,698,3,695,5,693,5,691,3,679,3,677,5,666,5,663,3,661,3,659,5,643,5,641,7,620,7,618,9,613,9,611,7,597,7,595,5,593,5,590,3,588,3,586,5,577,5,574,7,572,7,570,9,556,9,554,7,545,7,542,5,540,5,538,7,529,7,526,9,524,7,522,7,519,5,515,5,513,7,506,7,503,5,501,5,499,7,487,7,485,5,483,5,481,3,478,3,474,7,471,7,469,5,462,5,460,3,458,5,439,5,437,7,430,7,428,5,426,5,423,7,414,7,412,5,410,5,408,7,394,7,389,3,387,3,382,7,378,7,378,12,376,14,371,14,366,9,364,9,362,12,360,12,357,9,357,7,355,5,328,5,325,7,323,7,321,5,314,5,312,7,307,7,302,12,300,12,298,9,296,9,293,7,289,7,286,9,266,9,264,7,257,7,254,9,250,9,248,12,245,12,243,9,232,9,229,7,227,7,222,3,220,5,211,5,209,3,181,3,179,5,175,5,172,3,168,3,163,7,161,7,156,12,152,12,149,9,145,9,140,14,131,14,129,12,127,12,127,14,122,19,111,19,108,21,108,23,106,25,104,25,101,28,99,28,97,25,95,25,92,28,88,28,85,30,81,30,79,28,72,28,69,30,44,30,42,28,35,28,35,30,33,32,31,32,28,35,24,35,21,37,1,37,1,41,3,44,188,44,190,41,193,44,1118,44,1120,41,1123,41,1125,39,1125,37,1120,32,1120,0,1111,0,1102,9,1095,9,1093,7,1084,7,1081,9,1072,9,1070,7,1045,7,1043,9,1040,9,1038,12,1036,12,1033,14,1022,14,1017,19,1015,19,1013,16,1011,16,1008,14,992,14,990,12,983,12,981,14,972,14,969,12,967,12,965,14,958,14,956,12,953,12,951,9,924,9,919,5,917,5,915,7,912,7,906,14,899,14,896,12,890,19,880,9,876,9,874,7,867,7,864,9,858,9,855,12,851,12,848,9,848,7,846,5,835,5,832,3,812,3) the MySQL APT Repository or Replacing a MySQL Server Installed by a Direct deb Package Download instead. Also notice that you cannot use the MySQL APT repository to upgrade a distribution of MySQL that you have installed from a nonnative software repository (for example, from MariaDB or Percona).

Use the MySQL APT repository to perform an in-place upgrade for your MySQL installation (that is, replacing the old version and then running the new version using the old data files) by following these steps:
1. Make sure you already have the MySQL APT repository on your system's repository list (see Adding the MySQL Apt Repository for instructions).
2. Make sure you have the most up-to-date package information on the MySQL APT repository by running:
```
sudo apt-get update
```

3. Note that, by default, the MySQL APT repository will update MySQL to the release series you have selected when you were adding the MySQL APT repository to your system. If you want to upgrade to another release series, select it by following the steps given in Selecting a Major Release Version.

As a general rule, to upgrade from one release series to another, go to the next series rather than skipping a series. For example, if you are currently running MySQL 5.7 and wish to upgrade to a newer series, upgrade to MySQL 8.0 first before upgrading to 8.4.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0163.jpg?height=122&width=106&top_left_y=1361&top_left_x=420)

\section*{Important}

In-place downgrading of MySQL is not supported by the MySQL APT repository. Follow the instructions in Chapter 4, Downgrading MySQL.
4. Upgrade MySQL by the following command:
\$> sudo apt-get install mysql-server
The MySQL server, client, and the database common files are upgraded if newer versions are available. To upgrade any other MySQL package, use the same apt-get install command and supply the name for the package you want to upgrade:
\$> sudo apt-get install package-name
To see the names of the packages you have installed from the MySQL APT repository, use the following command:
\$> dpkg -l | grep mysql | grep ii

> Note
> If you perform a system-wide upgrade using apt-get upgrade, only the MySQL library and development packages are upgraded with newer versions (if available). To upgrade other components including the server, client, test suite, etc., use the apt-get install command.
5. The MySQL server always restarts after an update by APT.

\section*{Replacing a Native Distribution of MySQL Using the MySQL APT Repository}

Variants and forks of MySQL are distributed by different parties through their own software repositories or download sites. You can replace a native distribution of MySQL installed from your Linux platform's software repository with a distribution from the MySQL APT repository in a few steps.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0164.jpg?height=125&width=102&top_left_y=246&top_left_x=303)

\section*{Note}

The MySQL APT repository can only replace distributions of MySQL maintained and distributed by Debian or Ubuntu. It cannot replace any MySQL forks found either inside or outside of the distributions' native repositories. To replace such MySQL forks, you have to uninstall them first before you install MySQL using the MySQL APT repository. Follow the instructions for uninstallation from the forks' distributors and, before you proceed, make sure you back up your data and you know how to restore them to a new server.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0164.jpg?height=104&width=108&top_left_y=657&top_left_x=301)

\section*{Warning}

A few third-party native repository packages that have dependencies on the native MySQL packages may not work with the MySQL APT repository packages and should not be used together with them; these include akonadi-backend-mysql, handlersocket-mysql-5.5, and zoneminder.

\section*{Backing Up Your Database}

To avoid loss of data, always back up your database before trying to replace your MySQL installation using the MySQL APT repository. See Chapter 9, Backup and Recovery for instructions.

\section*{Adding the MySQL APT Repository and Selecting a Release Series}

Add the MySQL APT repository to your system's repository list and select the release series you want by following the instructions given in Adding the MySQL Apt Repository.

\section*{Replacing.the Native Distribution by an APT Update}

By design, the MySQL APT repository replaces your native distribution of MySQL when you perform upgrades on the MySQL packages. To perform the upgrades, follow the same instructions given in Step 4 in Upgrading MySQL with the MySQL APT Repository.

\section*{Warning}

Once the native distribution of MySQL has been replaced using the MySQL APT repository, purging the old MySQL packages from the native repository using the apt-get purge, apt-get remove --purge, or dpkg -P command might impact the newly installed MySQL server in various ways. Therefore, do not purge the old MySQL packages from the native repository packages.

\section*{Replacing a MySQL Server Installed by a Direct deb Package Download}
deb packages from MySQL for installing the MySQL server and its components can either be downloaded from the MySQL Developer Zone's MySQL Download page or from the MySQL APT repository. The deb packages from the two sources are different, and they install and configure MySQL in different ways.

If you have installed MySQL with the MySQL Developer Zone's deb packages and now want to replace the installation using the ones from the MySQL APT repository, follow these steps:
1. Back up your database. See Chapter 9, Backup and Recovery for instructions.
2. Follow the steps given previously for adding the MySQL APT repository.
3. Remove the old installation of MySQL by running:
```
$> sudo dpkg -P mysql
```

4. Install MySQL from the MySQL APT repository:
```
$> sudo apt-get install mysql-server
```

5. If needed, restore the data on the new MySQL installation. See Chapter 9, Backup and Recovery for instructions.

\section*{Removing MySQL with APT}

To uninstall the MySQL server and the related components that have been installed using the MySQL APT repository, first, remove the MySQL server using the following command:
```
$> sudo apt-get remove mysql-server
```


Then, remove any other software that was installed automatically with the MySQL server:
```
$> sudo apt-get autoremove
```


To uninstall other components, use the following command, replacing package - name with the name of the package of the component you want to remove:
```
$> sudo apt-get remove package-name
```


To see a list of packages you have installed from the MySQL APT repository, use the following command:
```
$> dpkg -l | grep mysql | grep ii
```


\section*{Special Notes on Upgrading the Shared Client Libraries}

You can install the shared client libraries from MySQL APT repository by the following command (see Installing Additional MySQL Products and Components with APT for more details):
\$> sudo apt-get install libmysqlclient21
If you already have the shared client libraries installed from you Linux platform's software repository, it can be updated by the MySQL APT repository with its own package by using the same command (see Replacing the Native Distribution by an APT Update for more details).

After updating MySQL using the APT repository, applications compiled with older versions of the shared client libraries should continue to work.

If you recompile applications and dynamically link them with the updated libraries: as typical with new versions of shared libraries, any applications compiled using the updated, newer shared libraries might require those updated libraries on systems where the applications are deployed. If those libraries are not in place, the applications requiring the shared libraries might fail. Therefore, it is recommended that the packages for the shared libraries from MySQL be deployed on those systems. You can do this by adding the MySQL APT repository to the systems (see Adding the MySQL Apt Repository) and installing the latest shared client libraries using the command given at the beginning of this section.

\section*{Installing MySQL NDB Cluster Using the APT Repository}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0165.jpg?height=109&width=86&top_left_y=2087&top_left_x=383)

\section*{Notes}
- The MySQL APT repository supports installation of MySQL NDB Cluster on Debian and Ubuntu systems. For methods to install NDB Cluster on other Debian-based systems, see Installing NDB Cluster Using .deb Files.
- If you already have the MySQL server or MySQL NDB Cluster installed on your system, make sure it is stopped and you have your data and configuration files backed up before proceeding.

\section*{Adding the MySQL APT Repository for MySQL NDB Cluster}

Follow the steps in Adding the MySQL Apt Repository to add the MySQL APT repository to your system's repository list. During the installation process of the configuration package, when you are asked which MySQL product you want to configure, choose "MySQL Server \& Cluster"; when asked
which version you wish to receive, choose "mysql-cluster-x.y." After returning to the command prompt, go to Step 2 below.

If you already have the configuration package installed on your system, make sure it is up-to-date by running the following command:
```
$> sudo apt-get install mysql-apt-config
```


Then, use the same method described in Selecting a Major Release Version to select MySQL NDB Cluster for installation. When you are asked which MySQL product you want to configure, choose "MySQL Server \& Cluster"; when asked which version you wish to receive, choose "mysql-cluster- $x . y$." After returning to the command prompt, update package information from the MySQL APT repository with this command:
```
$> sudo apt-get update
```


\section*{Installing2MySQL NDB Cluster}

For a minimal installation of MySQL NDB Cluster, follow these steps:
- Install the components for SQL nodes:
```
sudo apt-get install mysql-cluster-community-server
```


You will be asked to provide a password for the root user for your SQL node; see important information on the root password given in Installing MySQL with APT above. You might also be asked other questions regarding the installation.
- Install the executables for management nodes:
```
$> sudo apt-get install mysql-cluster-community-management-server
```

- Install the executables for data nodes:
```
$> sudo apt-get install mysql-cluster-community-data-node
```


\section*{Configuring and Starting MySQL NDB Cluster}

See Section 25.3.3, "Initial Configuration of NDB Cluster" on how to configure MySQL NDB Cluster and Section 25.3.4, "Initial Startup of NDB Cluster" on how to start it for the first time. When following those instructions, adjust them according to the following details regarding the SQL nodes of your NDB Cluster installation:
- All configuration files (like my.cnf) are under /etc/mysql
- All binaries, libraries, headers, etc., are under /usr/bin and /usr/sbin
- The data directory is /var/lib/mysql

\section*{Installing Additional MySQL NDB Cluster Products and Components}

You can use APT to install individual components and additional products of MySQL NDB Cluster from the MySQL APT repository. To do that, assuming you already have the MySQL APT repository on your system's repository list (see Adding the MySQL Apt Repository for MySQL NDB Cluster), follow the same steps given in Installing Additional MySQL Products and Components with APT.

\section*{Note}

Known issue: Currently, not all components required for running the MySQL NDB Cluster test suite are installed automatically when you install the test suite package (mysql-cluster-community-test). Install the following packages with apt-get install before you run the test suite:
```
- mysql-cluster-community-auto-installer
- mysql-cluster-community-management-server
- mysql-cluster-community-data-node
- mysql-cluster-community-memcached
- mysql-cluster-community-java
- ndbclient-dev
```


