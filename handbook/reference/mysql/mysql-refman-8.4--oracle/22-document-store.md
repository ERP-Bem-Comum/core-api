\section*{Chapter 22 Using MySQL as a Document Store}
Table of Contents
22.1 Interfaces to a MySQL Document Store ..... 3748
22.2 Document Store Concepts ..... 3748
22.3 JavaScript Quick-Start Guide: MySQL Shell for Document Store ..... 3749
22.3.1 MySQL Shell ..... 3750
22.3.2 Download and Import world_x Database ..... 3751
22.3.3 Documents and Collections ..... 3752
22.3.4 Relational Tables ..... 3762
22.3.5 Documents in Tables ..... 3768
22.4 Python Quick-Start Guide: MySQL Shell for Document Store ..... 3769
22.4.1 MySQL Shell ..... 3769
22.4.2 Download and Import world_x Database ..... 3771
22.4.3 Documents and Collections ..... 3771
22.4.4 Relational Tables ..... 3782
22.4.5 Documents in Tables ..... 3788
22.5 X Plugin ..... 3789
22.5.1 Checking X Plugin Installation ..... 3789
22.5.2 Disabling X Plugin ..... 3789
22.5.3 Using Encrypted Connections with X Plugin ..... 3789
22.5.4 Using X Plugin with the Caching SHA-2 Authentication Plugin ..... 3790
22.5.5 Connection Compression with X Plugin ..... 3791
22.5.6 X Plugin Options and Variables ..... 3794
22.5.7 Monitoring X Plugin ..... 3814
This chapter introduces an alternative way of working with MySQL as a document store, sometimes referred to as "using NoSQL". If your intention is to use MySQL in a traditional (SQL) way, this chapter is probably not relevant to you.
Traditionally, relational databases such as MySQL have usually required a schema to be defined before documents can be stored. The features described in this section enable you to use MySQL as a document store, which is a schema-less, and therefore schema-flexible, storage system for documents. For example, when you create documents describing products, you do not need to know and define all possible attributes of any products before storing and operating with the documents. This differs from working with a relational database and storing products in a table, when all columns of the table must be known and defined before adding any products to the database. The features described in this chapter enable you to choose how you configure MySQL, using only the document store model, or combining the flexibility of the document store model with the power of the relational model.
To use MySQL as a document store, you use the following server features:
- X Plugin enables MySQL Server to communicate with clients using X Protocol, which is a prerequisite for using MySQL as a document store. X Plugin is enabled by default in MySQL Server as of MySQL 8.4. For instructions to verify $X$ Plugin installation and to configure and monitor $X$ Plugin, see Section 22.5, "X Plugin".
- X Protocol supports both CRUD and SQL operations, authentication via SASL, allows streaming (pipelining) of commands and is extensible on the protocol and the message layer. Clients compatible with X Protocol include MySQL Shell and MySQL 8.4 Connectors.
- Clients that communicate with a MySQL Server using X Protocol can use X DevAPI to develop applications. X DevAPI offers a modern programming interface with a simple yet powerful design which provides support for established industry standard concepts. This chapter explains how to get started using either the JavaScript or Python implementation of X DevAPI in MySQL Shell as a client. See X DevAPI User Guide for in-depth tutorials on using X DevAPI.

\subsection*{22.1 Interfaces to a MySQL Document Store}

To work with MySQL as a document store, you use dedicated components and a choice of clients that support communicating with the MySQL server to develop document based applications.
- The following MySQL products support X Protocol and enable you to use X DevAPI in your chosen language to develop applications that communicate with a MySQL Server functioning as a document store:
- MySQL Shell (which provides implementations of X DevAPI in JavaScript and Python)
- Connector/C++
- Connector/J
- Connector/Node.js
- Connector/NET
- Connector/Python
- MySQL Shell is an interactive interface to MySQL supporting JavaScript, Python, or SQL modes. You can use MySQL Shell to prototype applications, execute queries and update data. Installing MySQL Shell has instructions to download and install MySQL Shell.
- The quick-start guides (tutorials) in this chapter help you to get started using MySQL Shell with MySQL as a document store.

The quick-start guide for JavaScript is here: Section 22.3, "JavaScript Quick-Start Guide: MySQL Shell for Document Store".

The quick-start guide for Python is here: Section 22.4, "Python Quick-Start Guide: MySQL Shell for Document Store".
- The MySQL Shell User Guide at MySQL Shell 8.4 provides detailed information about configuring and using MySQL Shell.

\subsection*{22.2 Document Store Concepts}

This section explains the concepts introduced as part of using MySQL as a document store.
- JSON Document
- Collection
- CRUD Operations

\section*{JSON Document}

A JSON document is a data structure composed of key-value pairs and is the fundamental structure for using MySQL as document store. For example, the world_x schema (installed later in this chapter) contains this document:
```
"GNP": 4834,
"_id": "00005de917d80000000000000023",
"Code": "BWA",
"Name": "Botswana",
"IndepYear": 1966,
"geography": {
    "Region": "Southern Africa",
    "Continent": "Africa",
```

```
        "SurfaceArea": 581730
    },
    "government": {
        "HeadOfState": "Festus G. Mogae",
        "GovernmentForm": "Republic"
    },
    "demographics": {
        "Population": 1622000,
        "LifeExpectancy": 39.29999923706055
    }
}
```


This document shows that the values of keys can be simple data types, such as integers or strings, but can also contain other documents, arrays, and lists of documents. For example, the geography key's value consists of multiple key-value pairs. A JSON document is represented internally using the MySQL binary JSON object, through the JSON MySQL datatype.

The most important differences between a document and the tables known from traditional relational databases are that the structure of a document does not have to be defined in advance, and a collection can contain multiple documents with different structures. Relational tables on the other hand require that their structure be defined, and all rows in the table must contain the same columns.

\section*{Collection}

A collection is a container that is used to store JSON documents in a MySQL database. Applications usually run operations against a collection of documents, for example to find a specific document.

\section*{CRUD Operations}

The four basic operations that can be issued against a collection are Create, Read, Update and Delete (CRUD). In terms of MySQL this means:
- Create a new document (insertion or addition)
- Read one or more documents (queries)
- Update one or more documents
- Delete one or more documents

\subsection*{22.3 JavaScript Quick-Start Guide: MySQL Shell for Document Store}

This quick-start guide provides instructions to begin prototyping document store applications interactively with MySQL Shell. The guide includes the following topics:
- Introduction to MySQL functionality, MySQL Shell, and the world_x example schema.
- Operations to manage collections and documents.
- Operations to manage relational tables.
- Operations that apply to documents within tables.

To follow this quick-start guide you need a MySQL server with X Plugin installed, the default in 8.4, and MySQL Shell to use as the client. MySQL Shell 8.4 provides more in-depth information about MySQL Shell. The Document Store is accessed using X DevAPI, and MySQL Shell provides this API in both JavaScript and Python.

\section*{Related Information}
- MySQL Shell 8.4 provides more in-depth information about MySQL Shell.
- See Installing MySQL Shell and Section 22.5, "X Plugin" for more information about the tools used in this quick-start guide.
- X DevAPI User Guide provides more examples of using X DevAPI to develop applications which use Document Store.
- A Python quick-start guide is also available.

\subsection*{22.3.1 MySQL Shell}

This quick-start guide assumes a certain level of familiarity with MySQL Shell. The following section is a high level overview, see the MySQL Shell documentation for more information. MySQL Shell is a unified scripting interface to MySQL Server. It supports scripting in JavaScript and Python. SQL is the default processing mode.

\section*{Start MySQL Shell}

After you have installed and started MySQL server, connect MySQL Shell to the server instance. You need to know the address of the MySQL server instance you plan to connect to. To be able to use the instance as a Document Store, the server instance must have X Plugin installed and you should connect to the server using X Protocol. For example to connect to the instance ds1.example.com on the default X Protocol port of 33060 use the network string user@ds1.example.com: 33060.

\section*{Tip}

If you connect to the instance using classic MySQL protocol, for example by using the default port of 3306 instead of the mysqlx_port, you cannot use the Document Store functionality shown in this tutorial. For example the db global object is not populated. To use the Document Store, always connect using X Protocol.

If MySQL Shell is not already running, open a terminal window and issue:
```
mysqlsh user@ds1.example.com:33060/world_x
```


Alternatively, if MySQL Shell is already running use the \connect command by issuing:
\connect user@ds1.example.com:33060/world_x
You need to specify the address of the MySQL server instance which you want to connect MySQL Shell to. For example in the previous example:
- user represents the user name of your MySQL account.
- ds1.example.com is the hostname of the server instance running MySQL. Replace this with the hostname of the MySQL server instance you are using as a Document Store.
- The default schema for this session is world_x. For instructions on setting up the world_x schema, see Section 22.3.2, "Download and Import world_x Database".

For more information, see Section 6.2.5, "Connecting to the Server Using URI-Like Strings or KeyValue Pairs".

Once MySQL Shell opens, the mysql-js> prompt indicates that the active language for this session is SQL.
```
MYSQL SQL>
```


MySQL Shell supports input-line editing as follows:
- left-arrow and right-arrow keys move horizontally within the current input line.
- up-arrow and down-arrow keys move up and down through the set of previously entered lines.
- Backspace deletes the character before the cursor and typing new characters enters them at the cursor position.
- Enter sends the current input line to the server.

\section*{Get Help for MySQL Shell}

Type mysqlsh - - help at the prompt of your command interpreter for a list of command-line options.
```
mysqlsh --help
```


Type \help at the MySQL Shell prompt for a list of available commands and their descriptions.
```
mysql-js> \help
```


Type \help followed by a command name for detailed help about an individual MySQL Shell command. For example, to view help on the \connect command, issue:
```
mysql-js> \help \connect
```


\section*{Quit MySQL Shell}

To quit MySQL Shell, issue the following command:
```
mysql-js> \quit
```


\section*{Related Information}
- See Interactive Code Execution for an explanation of how interactive code execution works in MySQL Shell.
- See Getting Started with MySQL Shell to learn about session and connection alternatives.

\subsection*{22.3.2 Download and Import world_x Database}

As part of this quick-start guide, an example schema is provided which is referred to as the world_x schema. Many of the examples demonstrate Document Store functionality using this schema. Start your MySQL server so that you can load the world_x schema, then follow these steps:
1. Download world_x-db.zip.
2. Extract the installation archive to a temporary location such as / tmp/. Unpacking the archive results in a single file named world_x.sql.
3. Import the world_x.sql file to your server. You can either:
- Start MySQL Shell in SQL mode and import the file by issuing:
```
mysqlsh -u root --sql --file /tmp/world_x-db/world_x.sql
Enter password: ****
```

- Set MySQL Shell to SQL mode while it is running and source the schema file by issuing:
```
\sql
Switching to SQL mode... Commands end with ;
\source /tmp/world_x-db/world_x.sql
```


Replace / tmp/ with the path to the world_x.sql file on your system. Enter your password if prompted. A non-root account can be used as long as the account has privileges to create new schemas.

\section*{The world_x Schema}

The world_x example schema contains the following JSON collection and relational tables:
- Collection
- countryinfo: Information about countries in the world.
- Tables
- country: Minimal information about countries of the world.
- city: Information about some of the cities in those countries.
- countrylanguage: Languages spoken in each country.

\section*{Related Information}
- MySQL Shell Sessions explains session types.

\subsection*{22.3.3 Documents and Collections}

When you are using MySQL as a Document Store, collections are containers within a schema that you can create, list, and drop. Collections contain JSON documents that you can add, find, update, and remove.

The examples in this section use the countryinfo collection in the world_x schema. For instructions on setting up the world_x schema, see Section 22.3.2, "Download and Import world_x Database".

\section*{Documents}

In MySQL, documents are represented as JSON objects. Internally, they are stored in an efficient binary format that enables fast lookups and updates.
- Simple document format for JavaScript:
```
{field1: "value", field2 : 10, "field 3": null}
```


An array of documents consists of a set of documents separated by commas and enclosed within [ and ] characters.
- Simple array of documents for JavaScript:
```
[{"Name": "Aruba", "Code:": "ABW"}, {"Name": "Angola", "Code:": "AGO"}]
```


MySQL supports the following JavaScript value types in JSON documents:
- numbers (integer and floating point)
- strings
- boolean (False and True)
- null
- arrays of more JSON values
- nested (or embedded) objects of more JSON values

\section*{Collections}

Collections are containers for documents that share a purpose and possibly share one or more indexes. Each collection has a unique name and exists within a single schema.

The term schema is equivalent to a database, which means a group of database objects as opposed to a relational schema, used to enforce structure and constraints over data. A schema does not enforce conformity on the documents in a collection.

In this quick-start guide:
- Basic objects include:

\begin{tabular}{|l|l|}
\hline Object form & Description \\
\hline db & db is a global variable assigned to the current active schema. When you want to run operations against the schema, for example to retrieve a collection, you use methods available for the db variable. \\
\hline db.getCollections() & db.getCollections() returns a list of collections in the schema. Use the list to get references to collection objects, iterate over them, and so on. \\
\hline
\end{tabular}
- Basic operations scoped by collections include:

\begin{tabular}{|l|l|}
\hline Operation form & Description \\
\hline db.name.add() & The add() method inserts one document or a list of documents into the named collection. \\
\hline db.name.find() & The find() method returns some or all documents in the named collection. \\
\hline db.name.modify() & The modify() method updates documents in the named collection. \\
\hline db.name.remove() & The remove() method deletes one document or a list of documents from the named collection. \\
\hline
\end{tabular}

\section*{Related Information}
- See Working with Collections for a general overview.
- CRUD EBNF Definitions provides a complete list of operations.

\subsection*{22.3.3.1 Create, List, and Drop Collections}

In MySQL Shell, you can create new collections, get a list of the existing collections in a schema, and remove an existing collection from a schema. Collection names are case-sensitive and each collection name must be unique.

\section*{Confirm the Schema}

To show the value that is assigned to the schema variable, issue:
```
mysql-js> db
```


If the schema value is not Schema:world_x, then set the db variable by issuing:
```
mysql-js> \use world_x
```


\section*{Create a Collection}

To create a new collection in an existing schema, use the db object's createCollection() method. The following example creates a collection called flags in the world_x schema.
```
mysql-js> db.createCollection("flags")
```


The method returns a collection object.
```
<Collection:flags>
```


\section*{List Collections}

To display all collections in the world_x schema, use the db object's getCollections() method. Collections returned by the server you are currently connected to appear between brackets.
```
mysql-js> db.getCollections()
[
    <Collection:countryinfo>,
    <Collection:flags>
]
```


\section*{Drop a Collection}

To drop an existing collection from a schema, use the db object's dropCollection() method. For example, to drop the flags collection from the current schema, issue:
```
mysql-js> db.dropCollection("flags")
```


The dropCollection( ) method is also used in MySQL Shell to drop a relational table from a schema.

\section*{Related Information}
- See Collection Objects for more examples.

\subsection*{22.3.3.2 Working with Collections}

To work with the collections in a schema, use the db global object to access the current schema. In this example we are using the world_x schema imported previously, and the countryinfo collection. Therefore, the format of the operations you issue is db.collection_name.operation, where collection_name is the name of the collection which the operation is executed against. In the following examples, the operations are executed against the countryinfo collection.

\section*{Add a Document}

Use the add ( ) method to insert one document or a list of documents into an existing collection. Insert the following document into the countryinfo collection. As this is multi-line content, press Enter twice to insert the document.
```
mysql-js> db.countryinfo.add(
    {
        GNP: .6,
        IndepYear: 1967,
        Name: "Sealand",
        Code: "SEA",
        demographics: {
            LifeExpectancy: 79,
            Population: 27
        },
        geography: {
            Continent: "Europe",
            Region: "British Islands",
            SurfaceArea: 193
        },
        government: {
            GovernmentForm: "Monarchy",
            HeadOfState: "Michael Bates"
        }
    }
)
```


The method returns the status of the operation. You can verify the operation by searching for the document. For example:
```
mysql-js> db.countryinfo.find("Name = 'Sealand'")
{
    "GNP": 0.6,
    "_id": "00005e2ff4af00000000000000f4",
    "Name": "Sealand",
    "Code:": "SEA",
    "IndepYear": 1967,
    "geography": {
        "Region": "British Islands",
        "Continent": "Europe",
        "SurfaceArea": 193
    },
    "government": {
        "HeadOfState": "Michael Bates",
        "GovernmentForm": "Monarchy"
    },
    "demographics": {
        "Population": 27,
        "LifeExpectancy": 79
    }
}
```


Note that in addition to the fields specified when the document was added, there is one more field, the _id. Each document requires an identifier field called _id. The value of the _id field must be unique among all documents in the same collection. Document IDs are generated by the server, not the client, so MySQL Shell does not automatically set an _id value. MySQL sets an _id value if the document does not contain the _id field. For more information, see Understanding Document IDs.

\section*{Related Information}
- See CollectionAddFunction for the full syntax definition.
- See Understanding Document IDs.

\subsection*{22.3.3.3 Find Documents}

You can use the find ( ) method to query for and return documents from a collection in a schema. MySQL Shell provides additional methods to use with the find ( ) method to filter and sort the returned documents.

MySQL provides the following operators to specify search conditions: OR(||), AND (\&\&), XOR, IS, NOT, BETWEEN, IN, LIKE, !=, <>, >, >=, <, <=, \&, |, <<, >>, +, -, *, /, ', and \%.

\section*{Find All Documents in a Collection}

To return all documents in a collection, use the find ( ) method without specifying search conditions. For example, the following operation returns all documents in the countryinfo collection.
```
mysql-js> db.countryinfo.find()
[
    {
        "GNP": 828,
        "Code:": "ABW",
        "Name": "Aruba",
        "IndepYear": null,
        "geography": {
            "Continent": "North America",
            "Region": "Caribbean",
            "SurfaceArea": 193
        },
        "government": {
            "GovernmentForm": "Nonmetropolitan Territory of The Netherlands",
            "HeadOfState": "Beatrix"
        }
        "demographics": {
            "LifeExpectancy": 78.4000015258789,
            "Population": 103000
        },
```

```
    }
]
240 documents in set (0.00 sec)
```


The method produces results that contain operational information in addition to all documents in the collection.

An empty set (no matching documents) returns the following information:
Empty set (0.00 sec)

\section*{Filter Searches}

You can include search conditions with the find ( ) method. The syntax for expressions that form a search condition is the same as that of traditional MySQL Chapter 14, Functions and Operators. You must enclose all expressions in quotes. For the sake of brevity, some of the examples do not display output.

A simple search condition could consist of the Name field and a value we know is in a document. The following example returns a single document:
```
mysql-js> db.countryinfo.find("Name = 'Australia'")
[
    {
        "GNP": 351182,
        "Code:": "AUS",
        "Name": "Australia",
        "IndepYear": 1901,
        "geography": {
            "Continent": "Oceania",
            "Region": "Australia and New Zealand",
            "SurfaceArea": 7741220
        },
        "government": {
            "GovernmentForm": "Constitutional Monarchy, Federation",
            "HeadOfState": "Elisabeth II"
        }
        "demographics": {
            "LifeExpectancy": 79.80000305175781,
            "Population": 18886000
        },
    }
]
```


The following example searches for all countries that have a GNP higher than \$500 billion. The countryinfo collection measures GNP in units of million.
```
mysql-js> db.countryinfo.find("GNP > 500000")
...[output removed]
10 documents in set (0.00 sec)
```


The Population field in the following query is embedded within the demographics object. To access the embedded field, use a period between demographics and Population to identify the relationship. Document and field names are case-sensitive.
```
mysql-js> db.countryinfo.find("GNP > 500000 and demographics.Population < 100000000")
...[output removed]
6 documents in set (0.00 sec)
```


Arithmetic operators in the following expression are used to query for countries with a GNP per capita higher than $\$ 30000$. Search conditions can include arithmetic operators and most MySQL functions.

\section*{Note}

Seven documents in the countryinfo collection have a population value of zero. Therefore warning messages appear at the end of the output.
```
mysql-js> db.countryinfo.find("GNP*1000000/demographics.Population > 30000")
...[output removed]
9 \text { documents in set, 7 warnings (0.00 sec)}
Warning (Code 1365): Division by 0
Warning (Code 1365): Division by 0
Warning (Code 1365): Division by 0
Warning (Code 1365): Division by 0
Warning (Code 1365): Division by 0
Warning (Code 1365): Division by 0
Warning (Code 1365): Division by 0
```


You can separate a value from the search condition by using the bind ( ) method. For example, instead of specifying a hard-coded country name as the condition, substitute a named placeholder consisting of a colon followed by a name that begins with a letter, such as country. Then use the bind(placeholder, value) method as follows:
```
mysql-js> db.countryinfo.find("Name = :country").bind("country", "Italy")
{
    "GNP": 1161755,
    "_id": "00005de917d8000000000000006a",
    "Code": "ITA",
    "Name": "Italy",
    "Airports": [],
    "IndepYear": 1861,
    "geography": {
        "Region": "Southern Europe",
        "Continent": "Europe",
        "SurfaceArea": 301316
    },
    "government": {
        "HeadOfState": "Carlo Azeglio Ciampi",
        "GovernmentForm": "Republic"
    },
    "demographics": {
        "Population": 57680000,
        "LifeExpectancy": 79
    }
}
1 document in set (0.01 sec)
```


\section*{Tip}

Within a program, binding enables you to specify placeholders in your expressions, which are filled in with values before execution and can benefit from automatic escaping, as appropriate.

Always use binding to sanitize input. Avoid introducing values in queries using string concatenation, which can produce invalid input and, in some cases, can cause security issues.

You can use placeholders and the bind ( ) method to create saved searches which you can then call with different values. For example to create a saved search for a country:
```
mysql-js> var myFind = db.countryinfo.find("Name = :country")
mysql-js> myFind.bind('country', 'France')
{
    "GNP": 1424285,
    "_id": "00005de917d80000000000000048",
    "Code": "FRA",
    "Name": "France",
    "IndepYear": 843,
    "geography": {
        "Region": "Western Europe",
        "Continent": "Europe",
        "SurfaceArea": 551500
    },
    "government": {
        "HeadOfState": "Jacques Chirac",
        "GovernmentForm": "Republic"
```

```
    },
    "demographics": {
        "Population": 59225700,
        "LifeExpectancy": 78.80000305175781
    }
}
1 document in set (0.0028 sec)
mysql-js> myFind.bind('country', 'Germany')
{
    "GNP": 2133367,
    "_id": "00005de917d80000000000000038",
    "Code": "DEU",
    "Name": "Germany",
    "IndepYear": 1955,
    "geography": {
        "Region": "Western Europe",
        "Continent": "Europe",
        "SurfaceArea": 357022
    },
    "government": {
        "HeadOfState": "Johannes Rau",
        "GovernmentForm": "Federal Republic"
    },
    "demographics": {
        "Population": 82164700,
        "LifeExpectancy": 77.4000015258789
    }
}
1 document in set (0.0026 sec)
```


\section*{Project Results}

You can return specific fields of a document, instead of returning all the fields. The following example returns the GNP and Name fields of all documents in the countryinfo collection matching the search conditions.

Use the fields() method to pass the list of fields to return.
```
mysql-js> db.countryinfo.find("GNP > 5000000").fields(["GNP", "Name"])
[
    {
        "GNP": 8510700,
        "Name": "United States"
    }
]
1 document in set (0.00 sec)
```


In addition, you can alter the returned documents-adding, renaming, nesting and even computing new field values-with an expression that describes the document to return. For example, alter the names of the fields with the following expression to return only two documents.
```
mysql-js> db.countryinfo.find().fields(
mysqlx.expr('{"Name": upper(Name), "GNPPerCapita": GNP*1000000/demographics.Population}')).limit(2)
{
    "Name": "ARUBA",
    "GNPPerCapita": 8038.834951456311
}
{
    "Name": "AFGHANISTAN",
    "GNPPerCapita": 263.0281690140845
}
```


\section*{Limit, Sort, and Skip Results}

You can apply the limit(), sort(), and skip() methods to manage the number and order of documents returned by the find () method.

To specify the number of documents included in a result set, append the limit ( ) method with a value to the find ( ) method. The following query returns the first five documents in the countryinfo collection.
```
mysql-js> db.countryinfo.find().limit(5)
... [output removed]
5 \text { documents in set (0.00 sec)}
```


To specify an order for the results, append the sort() method to the find() method. Pass to the sort ( ) method a list of one or more fields to sort by and, optionally, the descending (desc) or ascending (asc) attribute as appropriate. Ascending order is the default order type.

For example, the following query sorts all documents by the IndepYear field and then returns the first eight documents in descending order.
```
mysql-js> db.countryinfo.find().sort(["IndepYear desc"]).limit(8)
... [output removed]
8 \mp@code { d o c u m e n t s ~ i n ~ s e t ~ ( 0 . 0 0 ~ s e c ) }
```


By default, the limit ( ) method starts from the first document in the collection. You can use the skip( ) method to change the starting document. For example, to ignore the first document and return the next eight documents matching the condition, pass to the skip() method a value of 1.
```
mysql-js> db.countryinfo.find().sort(["IndepYear desc"]).limit(8).skip(1)
... [output removed]
8 \mp@code { d o c u m e n t s ~ i n ~ s e t ~ ( 0 . 0 0 ~ s e c ) }
```


\section*{Related Information}
- The MySQL Reference Manual provides detailed documentation on functions and operators.
- See CollectionFindFunction for the full syntax definition.

\subsection*{22.3.3.4 Modify Documents}

You can use the modify( ) method to update one or more documents in a collection. The X DevAPI provides additional methods for use with the modify ( ) method to:
- Set and unset fields within documents.
- Append, insert, and delete arrays.
- Bind, limit, and sort the documents to be modified.

\section*{Set and Unset Document Fields}

The modify() method works by filtering a collection to include only the documents to be modified and then applying the operations that you specify to those documents.

In the following example, the modify ( ) method uses the search condition to identify the document to change and then the set ( ) method replaces two values within the nested demographics object.
```
mysql-js> db.countryinfo.modify("Code = 'SEA'").set(
"demographics", {"LifeExpectancy": 78, "Population": 28})
```


After you modify a document, use the find ( ) method to verify the change.
To remove content from a document, use the modify() and unset() methods. For example, the following query removes the GNP from a document that matches the search condition.
```
mysql-js> db.countryinfo.modify("Name = 'Sealand'").unset("GNP")
```


Use the find ( ) method to verify the change.
```
mysql-js> db.countryinfo.find("Name = 'Sealand'")
```

```
{ "_id": "00005e2ff4af00000000000000f4",
    "Name": "Sealand",
    "Code:": "SEA",
    "IndepYear": 1967,
    "geography": {
        "Region": "British Islands",
        "Continent": "Europe",
        "SurfaceArea": 193
    },
    "government": {
        "HeadOfState": "Michael Bates",
        "GovernmentForm": "Monarchy"
    },
    "demographics": {
        "Population": 27,
        "LifeExpectancy": 79
    }
}
```


\section*{Append, Insert, and Delete Arrays}

To append an element to an array field, or insert, or delete elements in an array, use the arrayAppend(), arrayInsert(), or arrayDelete() methods. The following examples modify the countryinfo collection to enable tracking of international airports.

The first example uses the modify() and set() methods to create a new Airports field in all documents.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3790.jpg?height=127&width=118&top_left_y=1283&top_left_x=296)

\section*{Caution}

Use care when you modify documents without specifying a search condition; doing so modifies all documents in the collection.
```
mysql-js> db.countryinfo.modify("true").set("Airports", [])
```


With the Airports field added, the next example uses the arrayAppend ( ) method to add a new airport to one of the documents. \$.Airports in the following example represents the Airports field of the current document.
```
mysql-js> db.countryinfo.modify("Name = 'France'").arrayAppend("$.Airports", "ORY")
```


Use find ( ) to see the change.
```
mysql-js> db.countryinfo.find("Name = 'France'")
{
    "GNP": 1424285,
    "_id": "00005de917d80000000000000048",
    "Code": "FRA",
    "Name": "France",
    "Airports": [
        "ORY"
    ],
    "IndepYear": 843,
    "geography": {
        "Region": "Western Europe",
        "Continent": "Europe",
        "SurfaceArea": 551500
    },
    "government": {
        "HeadOfState": "Jacques Chirac",
        "GovernmentForm": "Republic"
    },
    "demographics": {
        "Population": 59225700,
        "LifeExpectancy": 78.80000305175781
    }
}
```


To insert an element at a different position in the array, use the arrayInsert ( ) method to specify which index to insert in the path expression. In this case, the index is 0 , or the first element in the array.
```
mysql-js> db.countryinfo.modify("Name = 'France'").arrayInsert("$.Airports[0]", "CDG")
```


To delete an element from the array, you must pass to the arrayDelete() method the index of the element to be deleted.
```
mysql-js> db.countryinfo.modify("Name = 'France'").arrayDelete("$.Airports[1]")
```


\section*{Related Information}
- The MySQL Reference Manual provides instructions to help you search for and modify JSON values.
- See CollectionModifyFunction for the full syntax definition.

\subsection*{22.3.3.5 Remove Documents}

You can use the remove ( ) method to delete some or all documents from a collection in a schema. The X DevAPI provides additional methods for use with the remove() method to filter and sort the documents to be removed.

\section*{Remove Documents Using Conditions}

The following example passes a search condition to the remove ( ) method. All documents matching the condition are removed from the countryinfo collection. In this example, one document matches the condition.
```
mysql-js> db.countryinfo.remove("Code = 'SEA'")
```


\section*{Remove the First Document}

To remove the first document in the countryinfo collection, use the limit () method with a value of 1.
```
mysql-js> db.countryinfo.remove("true").limit(1)
```


\section*{Remove the Last Document in an Order}

The following example removes the last document in the countryinfo collection by country name.
```
mysql-js> db.countryinfo.remove("true").sort(["Name desc"]).limit(1)
```


\section*{Remove All Documents in a Collection}

You can remove all documents in a collection. To do so, use the remove ("true") method without specifying a search condition.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3791.jpg?height=103&width=104&top_left_y=2129&top_left_x=365)

\section*{Caution}

Use care when you remove documents without specifying a search condition. This action deletes all documents from the collection.

Alternatively, use the db.drop_collection ('countryinfo') operation to delete the countryinfo collection.

\section*{Related Information}
- See CollectionRemoveFunction for the full syntax definition.
- See Section 22.3.2, "Download and Import world_x Database" for instructions to recreate the world_x schema.

\subsection*{22.3.3.6 Create and Drop Indexes}

Indexes are used to find documents with specific field values quickly. Without an index, MySQL must begin with the first document and then read through the entire collection to find the relevant fields. The larger the collection, the more this costs. If a collection is large and queries on a specific field are common, then consider creating an index on a specific field inside a document.

For example, the following query performs better with an index on the Population field:
```
mysql-js> db.countryinfo.find("demographics.Population < 100")
...[output removed]
8 \mp@code { d o c u m e n t s ~ i n ~ s e t ~ ( 0 . 0 0 ~ s e c ) }
```


The createIndex() method creates an index that you can define with a JSON document that specifies which fields to use. This section is a high level overview of indexing. For more information see Indexing Collections.

\section*{Add a Nonunique Index}

To create a nonunique index, pass an index name and the index information to the createIndex() method. Duplicate index names are prohibited.

The following example specifies an index named popul, defined against the Population field from the demographics object, indexed as an Integer numeric value. The final parameter indicates whether the field should require the NOT NULL constraint. If the value is false, the field can contain NULL values. The index information is a JSON document with details of one or more fields to include in the index. Each field definition must include the full document path to the field, and specify the type of the field.
```
mysql-js> db.countryinfo.createIndex("popul", {fields:
[{field: '$.demographics.Population', type: 'INTEGER'}]})
```


Here, the index is created using an integer numeric value. Further options are available, including options for use with GeoJSON data. You can also specify the type of index, which has been omitted here because the default type "index" is appropriate.

\section*{Add a Unique Index}

To create a unique index, pass an index name, the index definition, and the index type "unique" to the createIndex() method. This example shows a unique index created on the country name ("Name"), which is another common field in the countryinfo collection to index. In the index field description, "TEXT(40)" represents the number of characters to index, and "required": True specifies that the field is required to exist in the document.
```
mysql-js> db.countryinfo.createIndex("name",
{"fields": [{"field": "$.Name", "type": "TEXT(40)", "required": true}], "unique": true})
```


\section*{Drop an Index}

To drop an index, pass the name of the index to drop to the dropIndex() method. For example, you can drop the "popul" index as follows:
mysql-js> db.countryinfo.dropIndex("popul")

\section*{Related Information}
- See Indexing Collections for more information.
- See Defining an Index for more information on the JSON document that defines an index.
- See Collection Index Management Functions for the full syntax definition.

\subsection*{22.3.4 Relational Tables}

You can also use X DevAPI to work with relational tables. In MySQL, each relational table is associated with a particular storage engine. The examples in this section use InnoDB tables in the world_x schema.

\section*{Confirm the Schema}

To show the schema that is assigned to the db global variable, issue db.
```
mysql-js> db
<Schema:world_x>
```


If the returned value is not Schema:world_x, set the db variable as follows:
```
mysql-js> \use world_x
Schema ˋworld_xˋ accessible through db.
```


\section*{Show All Tables}

To display all relational tables in the world_x schema, use the getTables() method on the db object.
```
mysql-js> db.getTables()
{
    "city": <Table:city>,
    "country": <Table:country>,
    "countrylanguage": <Table:countrylanguage>
}
```


\section*{Basic Table Operations}

Basic operations scoped by tables include:

\begin{tabular}{|l|l|}
\hline Operation form & Description \\
\hline db.name.insert() & The insert() method inserts one or more records into the named table. \\
\hline db.name.select() & The select() method returns some or all records in the named table. \\
\hline db.name.update() & The update() method updates records in the named table. \\
\hline db.name.delete() & The delete() method deletes one or more records from the named table. \\
\hline
\end{tabular}

\section*{Related Information}
- See Working with Relational Tables for more information.
- CRUD EBNF Definitions provides a complete list of operations.
- See Section 22.3.2, "Download and Import world_x Database" for instructions on setting up the world_x schema sample.

\subsection*{22.3.4.1 Insert Records into Tables}

You can use the insert () method with the values() method to insert records into an existing relational table. The insert ( ) method accepts individual columns or all columns in the table. Use one or more values() methods to specify the values to be inserted.

\section*{Insert a Complete Record}

To insert a complete record, pass to the insert ( ) method all columns in the table. Then pass to the values() method one value for each column in the table. For example, to add a new record to the city table in the world_x schema, insert the following record and press Enter twice.
```
mysql-js> db.city.insert("ID", "Name", "CountryCode", "District", "Info").values(
None, "Olympia", "USA", "Washington", '{"Population": 5000}')
```


The city table has five columns: ID, Name, CountryCode, District, and Info. Each value must match the data type of the column it represents.

\section*{Insert a Partial Record}

The following example inserts values into the ID, Name, and CountryCode columns of the city table.
```
mysql-js> db.city.insert("ID", "Name", "CountryCode").values(
None, "Little Falls", "USA").values(None, "Happy Valley", "USA")
```


When you specify columns using the insert ( ) method, the number of values must match the number of columns. In the previous example, you must supply three values to match the three columns specified.

\section*{Related Information}
- See TableInsertFunction for the full syntax definition.

\subsection*{22.3.4.2 Select Tables}

You can use the select ( ) method to query for and return records from a table in a database. The X DevAPI provides additional methods to use with the select ( ) method to filter and sort the returned records.

MySQL provides the following operators to specify search conditions: OR (||), AND (\&\&), XOR, IS, NOT, BETWEEN, IN, LIKE, !=, <>, >, >=, <, <=, \&, |, <<, >>, +, -, *, /, ', and \%.

\section*{Select All Records}

To issue a query that returns all records from an existing table, use the select ( ) method without specifying search conditions. The following example selects all records from the city table in the world_x database.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3794.jpg?height=126&width=99&top_left_y=1649&top_left_x=306)

\section*{Note}

Limit the use of the empty select ( ) method to interactive statements. Always use explicit column-name selections in your application code.
```
mysql-js> db.city.select()
+------+-------------+-------------+-----------+--------------------------
| ID | Name | CountryCode | District | Info |
+-------+-------------+--------------+-------------+-------------------------
| 2 | Qandahar | AFG | Qandahar |{"Population": 237500}
| 3 | Herat | AFG | Herat |{"Population": 186800}
... ... ... ...
| 4079 | Rafah | PSE | Rafah |{"Population": 92020} |
+------+-------- ----+-------------+------------+--------------------------
4082 rows in set (0.01 sec)
```


An empty set (no matching records) returns the following information:
```
Empty set (0.00 sec)
```


\section*{Filter Searches}

To issue a query that returns a set of table columns, use the select () method and specify the columns to return between square brackets. This query returns the Name and CountryCode columns from the city table.
```
mysql-js> db.city.select(["Name", "CountryCode"])
```

```
+--------------------+--------------+
+--------------------+-------------+
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3795.jpg?height=72&width=426&top_left_y=347&top_left_x=351)
```
| Herat | AFG
| Mazar-e-Sharif | AFG
| Amsterdam | NLD |
... ...
| Rafah | PSE
| Olympia | USA
| Little Falls | USA
| Happy Valley | USA
+--------------------+-------------+
4082 rows in set (0.00 sec)
```


To issue a query that returns rows matching specific search conditions, use the where() method to include those conditions. For example, the following example returns the names and country codes of the cities that start with the letter Z .
```
mysql-js> db.city.select(["Name", "CountryCode"]).where("Name like 'Z%'")
+--------------------+-------------+
| Name | CountryCode |
+--------------------+-------------+
| Zaanstad | NLD
| Zoetermeer | NLD
| Zwolle | NLD
| Zenica | BIH
| Zagazig | EGY
| Zaragoza | ESP
| Zamboanga | PHL
| Zahedan | IRN
| Zanjan | IRN
| Zabol | IRN
| Zama | JPN
| Zhezqazghan | KAZ
| Zhengzhou | CHN
... ...
| Zeleznogorsk | RUS |
+--------------------+-------------+
 rows in set (0.00 sec)
```


You can separate a value from the search condition by using the bind ( ) method. For example, instead of using "Name = 'Z\%' " as the condition, substitute a named placeholder consisting of a colon followed by a name that begins with a letter, such as name. Then include the placeholder and value in the bind() method as follows:
```
mysql-js> db.city.select(["Name", "CountryCode"]).
    where("Name like :name").bind("name", "Z%")
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3795.jpg?height=122&width=94&top_left_y=1987&top_left_x=370)

\section*{Tip}

Within a program, binding enables you to specify placeholders in your expressions, which are filled in with values before execution and can benefit from automatic escaping, as appropriate.

Always use binding to sanitize input. Avoid introducing values in queries using string concatenation, which can produce invalid input and, in some cases, can cause security issues.

\section*{Project Results}

To issue a query using the AND operator, add the operator between search conditions in the where() method.
```
mysql-js> db.city.select(["Name", "CountryCode"]).where(
"Name like 'Z%' and CountryCode = 'CHN'")
+-----------------+-------------+
```

```
| Name | CountryCode |
\begin{array} { | l | l | } { \text { \| Zhengzhou =HN \|} } & { \text { CHN } } \end{array}
| Zhangjiakou | CHN |
Z) Zhuzhou CHN
| Zigong CHN
| Zaozhuang | CHN |
... ...
| Zhangjiagang | CHN |
+------------------+-------
```


To specify multiple conditional operators, you can enclose the search conditions in parenthesis to change the operator precedence. The following example demonstrates the placement of AND and OR operators.
```
mysql-js> db.city.select(["Name", "CountryCode"]).
where("Name like 'Z%' and (CountryCode = 'CHN' or CountryCode = 'RUS')")
+--------------------+-------------+
| Name | CountryCode |
+--------------------+-------------+
| Zhengzhou | CHN |
| Zibo | CHN
| Zhangjiakou | CHN
| Zhuzhou | CHN |
... ...
| Zeleznogorsk | RUS |
+--------------------+-------------+
29 rows in set (0.01 sec)
```


\section*{Limit, Order, and Offset Results}

You can apply the limit(), orderBy(), and offSet() methods to manage the number and order of records returned by the select() method.

To specify the number of records included in a result set, append the limit () method with a value to the select ( ) method. For example, the following query returns the first five records in the country table.
```
mysql-js> db.country.select(["Code", "Name"]).limit(5)
+------+--------------+
| Code | Name |
+------+--------------+
| ABW | Aruba |
| AFG | Afghanistan
| AGO | Angola
| AIA | Anguilla
| ALB | Albania |
+------+-------------+
rows in set (0.00 sec)
```


To specify an order for the results, append the orderBy() method to the select() method. Pass to the orderBy( ) method a list of one or more columns to sort by and, optionally, the descending (desc) or ascending (asc) attribute as appropriate. Ascending order is the default order type.

For example, the following query sorts all records by the Name column and then returns the first three records in descending order .
```
mysql-js> db.country.select(["Code", "Name"]).orderBy(["Name desc"]).limit(3)
+------+-------------+
| Code | Name |
+------+-------------+
| ZWE | Zimbabwe
| ZMB | Zambia
| YUG | Yugoslavia |
+------+-------------+
3 rows in set (0.00 sec)
```


By default, the limit ( ) method starts from the first record in the table. You can use the offset ( ) method to change the starting record. For example, to ignore the first record and return the next three records matching the condition, pass to the offset() method a value of 1.
```
mysql-js> db.country.select(["Code", "Name"]).orderBy(["Name desc"]).limit(3).offset(1)
+------+-------------+
| Code | Name |
+------+-------------+
| ZMB | Zambia |
| YUG | Yugoslavia |
| YEM | Yemen |
+------+-------------+
3 rows in set (0.00 sec)
```


\section*{Related Information}
- The MySQL Reference Manual provides detailed documentation on functions and operators.
- See TableSelectFunction for the full syntax definition.

\subsection*{22.3.4.3 Update Tables}

You can use the update() method to modify one or more records in a table. The update() method works by filtering a query to include only the records to be updated and then applying the operations you specify to those records.

To replace a city name in the city table, pass to the set ( ) method the new city name. Then, pass to the where() method the city name to locate and replace. The following example replaces the city Peking with Beijing.
```
mysql-js> db.city.update().set("Name", "Beijing").where("Name = 'Peking'")
```


Use the select ( ) method to verify the change.
```
mysql-js> db.city.select(["ID", "Name", "CountryCode", "District", "Info"]).where("Name = 'Beijing'")
+-------+------------+-------------+----------+------------------------------
| ID | Name | CountryCode | District | Info |
+-------+------------+-------------+----------+-----------------------------
| 1891 | Beijing | CHN | Peking | {"Population": 7472000} |
+-------+------------+--------------+----------+-----------------------------
1 row in set (0.00 sec)
```


\section*{Related Information}
- See TableUpdateFunction for the full syntax definition.

\subsection*{22.3.4.4 Delete Tables}

You can use the delete( ) method to remove some or all records from a table in a database. The X DevAPI provides additional methods to use with the delete() method to filter and order the records to be deleted.

\section*{Delete Records Using Conditions}

The following example passes search conditions to the delete() method. All records matching the condition are deleted from the city table. In this example, one record matches the condition.
```
mysql-js> db.city.delete().where("Name = 'Olympia'")
```


\section*{Delete the First Record}

To delete the first record in the city table, use the limit ( ) method with a value of 1.
```
mysql-js> db.city.delete().limit(1)
```


\section*{Delete All Records in a Table}

You can delete all records in a table. To do so, use the delete() method without specifying a search condition.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3798.jpg?height=122&width=108&top_left_y=443&top_left_x=301)

\section*{Caution}

Use care when you delete records without specifying a search condition; doing so deletes all records from the table.

\section*{Drop a Table}

The dropCollection( ) method is also used in MySQL Shell to drop a relational table from a database. For example, to drop the citytest table from the world_x database, issue:
```
mysql-js> session.dropCollection("world_x", "citytest")
```


\section*{Related Information}
- See TableDeleteFunction for the full syntax definition.
- See Section 22.3.2, "Download and Import world_x Database" for instructions to recreate the world_x database.

\subsection*{22.3.5 Documents in Tables}

In MySQL, a table may contain traditional relational data, JSON values, or both. You can combine traditional data with JSON documents by storing the documents in columns having a native JSON data type.

Examples in this section use the city table in the world_x schema.

\section*{city Table Description}

The city table has five columns (or fields).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3798.jpg?height=313&width=1605&top_left_y=1663&top_left_x=285)

\section*{Insert a Record}

To insert a document into the column of a table, pass to the values() method a well-formed JSON document in the correct order. In the following example, a document is passed as the final value to be inserted into the Info column.
```
mysql-js> db.city.insert().values(
None, "San Francisco", "USA", "California", '{"Population":830000}')
```


\section*{Select a Record}

You can issue a query with a search condition that evaluates document values in the expression.
```
mysql-js> db.city.select(["ID", "Name", "CountryCode", "District", "Info"]).where(
"CountryCode = :country and Info->'$.Population' > 1000000").bind(
'country', 'USA')
+-------+-----------------+--------------+----------------+-----------------------------
| ID | Name | CountryCode | District | Info |
```

```
+------+-----------------+-------------+-----------------+--------------------------
| 3794 | Los Angeles | USA | California | {"Population": 3694820}
| 3795 | Chicago | USA | Illinois | {"Population": 2896016}
| 3796 | Houston | USA | Texas | {"Population": 1953631}
| 3797 | Philadelphia | USA | Pennsylvania | {"Population": 1517550}
| 3798 | Phoenix | USA | Arizona | {"Population": 1321045}
| 3799 | San Diego | USA | California | {"Population": 1223400}
| 3800 | Dallas | USA | Texas | {"Population": 1188580}
| 3801 | San Antonio | USA | Texas | {"Population": 1144646}
+-------+-----------------+-------------+----------------+-----------------------------
9 \text { rows in set (0.01 sec)}
```


\section*{Related Information}
- See Working with Relational Tables and Documents for more information.
- See Section 13.5, "The JSON Data Type" for a detailed description of the data type.

\subsection*{22.4 Python Quick-Start Guide: MySQL Shell for Document Store}

This quick-start guide provides instructions to begin prototyping document store applications interactively with MySQL Shell. The guide includes the following topics:
- Introduction to MySQL functionality, MySQL Shell, and the world_x example schema.
- Operations to manage collections and documents.
- Operations to manage relational tables.
- Operations that apply to documents within tables.

To follow this quick-start guide you need a MySQL server with X Plugin installed, the default in 8.4, and MySQL Shell to use as the client. MySQL Shell includes X DevAPI, implemented in both JavaScript and Python, which enables you to connect to the MySQL server instance using X Protocol and use the server as a Document Store.

\section*{Related Information}
- MySQL Shell 8.4 provides more in-depth information about MySQL Shell.
- See Installing MySQL Shell and Section 22.5, "X Plugin" for more information about the tools used in this quick-start guide.
- See Supported Languages for more information about the languages MySQL Shell supports.
- X DevAPI User Guide provides more examples of using X DevAPI to develop applications which use MySQL as a Document Store.
- A JavaScript quick-start guide is also available.

\subsection*{22.4.1 MySQL Shell}

This quick-start guide assumes a certain level of familiarity with MySQL Shell. The following section is a high level overview, see the MySQL Shell documentation for more information. MySQL Shell is a unified scripting interface to MySQL Server. It supports scripting in JavaScript and Python. JavaScript is the default processing mode.

\section*{Start MySQL Shell}

After you have installed and started MySQL server, connect MySQL Shell to the server instance. You need to know the address of the MySQL server instance you plan to connect to. To be able to use the instance as a Document Store, the server instance must have X Plugin installed and you should
connect to the server using X Protocol. For example to connect to the instance ds1.example.com on the default X Protocol port of 33060 use the network string user@ds1.example.com:33060.

> Tip
> If you connect to the instance using classic MySQL protocol, for example by using the default port of 3306 instead of the mysqlx_port, you cannot use the Document Store functionality shown in this tutorial. For example the db global object is not populated. To use the Document Store, always connect using X Protocol.

If MySQL Shell is not already running, open a terminal window and issue:
```
mysqlsh user@ds1.example.com:33060/world_x
```


Alternatively, if MySQL Shell is already running use the \connect command by issuing:
```
\connect user@ds1.example.com:33060/world_x
```


You need to specify the address of the MySQL server instance which you want to connect MySQL Shell to. For example in the previous example:
- user represents the user name of your MySQL account.
- ds1.example.com is the hostname of the server instance running MySQL. Replace this with the hostname of the MySQL server instance you are using as a Document Store.
- The default schema for this session is world_x. For instructions on setting up the world_x schema, see Section 22.4.2, "Download and Import world_x Database".

For more information, see Section 6.2.5, "Connecting to the Server Using URI-Like Strings or KeyValue Pairs".

Once MySQL Shell opens, the mysql-js> prompt indicates that the active language for this session is JavaScript. To switch MySQL Shell to Python mode, use the \py command.
```
mysql-js> \py
Switching to Python mode...
mysql-py>
```


MySQL Shell supports input-line editing as follows:
- left-arrow and right-arrow keys move horizontally within the current input line.
- up-arrow and down-arrow keys move up and down through the set of previously entered lines.
- Backspace deletes the character before the cursor and typing new characters enters them at the cursor position.
- Enter sends the current input line to the server.

\section*{Get Help for MySQL Shell}

Type mysqlsh --help at the prompt of your command interpreter for a list of command-line options.
```
mysqlsh --help
```


Type \help at the MySQL Shell prompt for a list of available commands and their descriptions.
```
mysql-py> \help
```


Type \help followed by a command name for detailed help about an individual MySQL Shell command. For example, to view help on the \connect command, issue:
```
mysql-py> \help \connect
```


\section*{Quit MySQL Shell}

To quit MySQL Shell, issue the following command:
```
mysql-py> \quit
```


\section*{Related Information}
- See Interactive Code Execution for an explanation of how interactive code execution works in MySQL Shell.
- See Getting Started with MySQL Shell to learn about session and connection alternatives.

\subsection*{22.4.2 Download and Import world_x Database}

As part of this quick-start guide, an example schema is provided which is referred to as the world_x schema. Many of the examples demonstrate Document Store functionality using this schema. Start your MySQL server so that you can load the world_x schema, then follow these steps:
1. Download world_x-db.zip.
2. Extract the installation archive to a temporary location such as / tmp/. Unpacking the archive results in a single file named world_x.sql.
3. Import the world_x.sql file to your server. You can either:
- Start MySQL Shell in SQL mode and import the file by issuing:
```
mysqlsh -u root --sql --file /tmp/world_x-db/world_x.sql
Enter password: ****
```

- Set MySQL Shell to SQL mode while it is running and source the schema file by issuing:
```
\sql
Switching to SQL mode... Commands end with ;
\source /tmp/world_x-db/world_x.sql
```


Replace / tmp/ with the path to the world_x.sql file on your system. Enter your password if prompted. A non-root account can be used as long as the account has privileges to create new schemas.

\section*{The world_x Schema}

The world_x example schema contains the following JSON collection and relational tables:
- Collection
- countryinfo: Information about countries in the world.
- Tables
- country: Minimal information about countries of the world.
- city: Information about some of the cities in those countries.
- countrylanguage: Languages spoken in each country.

\section*{Related Information}
- MySQL Shell Sessions explains session types.

\subsection*{22.4.3 Documents and Collections}

When you are using MySQL as a Document Store, collections are containers within a schema that you can create, list, and drop. Collections contain JSON documents that you can add, find, update, and remove.

The examples in this section use the countryinfo collection in the world_x schema. For instructions on setting up the world_x schema, see Section 22.4.2, "Download and Import world_x Database".

\section*{Documents}

In MySQL, documents are represented as JSON objects. Internally, they are stored in an efficient binary format that enables fast lookups and updates.
- Simple document format for Python:
```
{"field1": "value", "field2" : 10, "field 3": null}
```


An array of documents consists of a set of documents separated by commas and enclosed within [ and ] characters.
- Simple array of documents for Python:
```
[{"Name": "Aruba", "Code:": "ABW"}, {"Name": "Angola", "Code:": "AGO"}]
```


MySQL supports the following Python value types in JSON documents:
- numbers (integer and floating point)
- strings
- boolean (False and True)
- None
- arrays of more JSON values
- nested (or embedded) objects of more JSON values

\section*{Collections}

Collections are containers for documents that share a purpose and possibly share one or more indexes. Each collection has a unique name and exists within a single schema.

The term schema is equivalent to a database, which means a group of database objects as opposed to a relational schema, used to enforce structure and constraints over data. A schema does not enforce conformity on the documents in a collection.

In this quick-start guide:
- Basic objects include:

\begin{tabular}{|l|l|}
\hline Object form & Description \\
\hline db & db is a global variable assigned to the current active schema. When you want to run operations against the schema, for example to retrieve a collection, you use methods available for the db variable. \\
\hline db.get_collections() & db.get_collections() returns a list of collections in the schema. Use the list to get references to collection objects, iterate over them, and so on. \\
\hline
\end{tabular}
- Basic operations scoped by collections include:

\begin{tabular}{|l|l|}
\hline Operation form & Description \\
\hline db.name.add() & The add() method inserts one document or a list of documents into the named collection. \\
\hline db.name.find() & The find() method returns some or all documents in the named collection. \\
\hline db.name.modify() & The modify() method updates documents in the named collection. \\
\hline db.name.remove() & The remove() method deletes one document or a list of documents from the named collection. \\
\hline
\end{tabular}

\section*{Related Information}
- See Working with Collections for a general overview.
- CRUD EBNF Definitions provides a complete list of operations.

\subsection*{22.4.3.1 Create, List, and Drop Collections}

In MySQL Shell, you can create new collections, get a list of the existing collections in a schema, and remove an existing collection from a schema. Collection names are case-sensitive and each collection name must be unique.

\section*{Confirm the Schema}

To show the value that is assigned to the schema variable, issue:
```
mysql-py> db
```


If the schema value is not Schema:world_x, then set the db variable by issuing:
```
mysql-py> \use world_x
```


\section*{Create a Collection}

To create a new collection in an existing schema, use the db object's createCollection() method. The following example creates a collection called flags in the world_x schema.
```
mysql-py> db.create_collection("flags")
```


The method returns a collection object.
```
<Collection:flags>
```


\section*{List Collections}

To display all collections in the world_x schema, use the db object's get_collections() method. Collections returned by the server you are currently connected to appear between brackets.
```
mysql-py> db.get_collections()
[
    <Collection:countryinfo>,
    <Collection:flags>
]
```


\section*{Drop a Collection}

To drop an existing collection from a schema, use the db object's drop_collection( ) method. For example, to drop the flags collection from the current schema, issue:
mysql-py> db.drop_collection("flags")
The drop_collection() method is also used in MySQL Shell to drop a relational table from a schema.

\section*{Related Information}
- See Collection Objects for more examples.

\subsection*{22.4.3.2 Working with Collections}

To work with the collections in a schema, use the db global object to access the current schema. In this example we are using the world_x schema imported previously, and the countryinfo collection. Therefore, the format of the operations you issue is db.collection_name.operation, where collection_name is the name of the collection which the operation is executed against. In the following examples, the operations are executed against the countryinfo collection.

\section*{Add a Document}

Use the add ( ) method to insert one document or a list of documents into an existing collection. Insert the following document into the countryinfo collection. As this is multi-line content, press Enter twice to insert the document.
```
mysql-py> db.countryinfo.add(
    {
        "GNP": .6,
        "IndepYear": 1967,
        "Name": "Sealand",
        "Code:": "SEA",
        "demographics": {
            "LifeExpectancy": 79,
            "Population": 27
        },
        "geography": {
            "Continent": "Europe",
            "Region": "British Islands",
            "SurfaceArea": 193
        },
        "government": {
            "GovernmentForm": "Monarchy",
            "HeadOfState": "Michael Bates"
        }
    }
)
```


The method returns the status of the operation. You can verify the operation by searching for the document. For example:
```
mysql-py> db.countryinfo.find("Name = 'Sealand'")
{
    "GNP": 0.6,
    "_id": "00005e2ff4af00000000000000f4",
    "Name": "Sealand",
    "Code:": "SEA",
    "IndepYear": 1967,
    "geography": {
        "Region": "British Islands",
        "Continent": "Europe",
        "SurfaceArea": 193
    },
    "government": {
        "HeadOfState": "Michael Bates",
        "GovernmentForm": "Monarchy"
    },
    "demographics": {
        "Population": 27,
        "LifeExpectancy": 79
```

```
    }
}
```


Note that in addition to the fields specified when the document was added, there is one more field, the _id. Each document requires an identifier field called _id. The value of the _id field must be unique among all documents in the same collection. Document IDs are generated by the server, not the client, so MySQL Shell does not automatically set an _id value. MySQL sets an _id value if the document does not contain the _id field. For more information, see Understanding Document IDs.

\section*{Related Information}
- See CollectionAddFunction for the full syntax definition.
- See Understanding Document IDs.

\subsection*{22.4.3.3 Find Documents}

You can use the find ( ) method to query for and return documents from a collection in a schema. MySQL Shell provides additional methods to use with the find ( ) method to filter and sort the returned documents.

MySQL provides the following operators to specify search conditions: OR (||), AND (\&\&), XOR, IS, NOT, BETWEEN, IN, LIKE, !=, <>, >, >=, <, <=, \&, |, <<, >>, +, -, *, /, <, and \%.

\section*{Find All Documents in a Collection}

To return all documents in a collection, use the find ( ) method without specifying search conditions. For example, the following operation returns all documents in the countryinfo collection.
```
mysql-py> db.countryinfo.find()
[
    {
        "GNP": 828,
        "Code:": "ABW",
        "Name": "Aruba",
        "IndepYear": null,
        "geography": {
            "Continent": "North America",
            "Region": "Caribbean",
            "SurfaceArea": 193
        },
        "government": {
            "GovernmentForm": "Nonmetropolitan Territory of The Netherlands",
            "HeadOfState": "Beatrix"
        }
        "demographics": {
            "LifeExpectancy": 78.4000015258789,
            "Population": 103000
        },
        ...
    }
    ]
240 documents in set (0.00 sec)
```


The method produces results that contain operational information in addition to all documents in the collection.

An empty set (no matching documents) returns the following information:
Empty set (0.00 sec)

\section*{Filter Searches}

You can include search conditions with the find ( ) method. The syntax for expressions that form a search condition is the same as that of traditional MySQL Chapter 14, Functions and Operators. You
must enclose all expressions in quotes. For the sake of brevity, some of the examples do not display output.

A simple search condition could consist of the Name field and a value we know is in a document. The following example returns a single document:
```
mysql-py> db.countryinfo.find("Name = 'Australia'")
[
    {
        "GNP": 351182,
        "Code:": "AUS",
        "Name": "Australia",
        "IndepYear": 1901,
        "geography": {
            "Continent": "Oceania",
            "Region": "Australia and New Zealand",
            "SurfaceArea": 7741220
        },
        "government": {
            "GovernmentForm": "Constitutional Monarchy, Federation",
            "HeadOfState": "Elisabeth II"
        }
        "demographics": {
            "LifeExpectancy": 79.80000305175781,
            "Population": 18886000
        },
    }
]
```


The following example searches for all countries that have a GNP higher than \$500 billion. The countryinfo collection measures GNP in units of million.
```
mysql-py> db.countryinfo.find("GNP > 500000")
...[output removed]
10 documents in set (0.00 sec)
```


The Population field in the following query is embedded within the demographics object. To access the embedded field, use a period between demographics and Population to identify the relationship. Document and field names are case-sensitive.
```
mysql-py> db.countryinfo.find("GNP > 500000 and demographics.Population < 100000000")
...[output removed]
6 \text { documents in set (0.00 sec)}
```


Arithmetic operators in the following expression are used to query for countries with a GNP per capita higher than $\$ 30000$. Search conditions can include arithmetic operators and most MySQL functions.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3806.jpg?height=124&width=99&top_left_y=1928&top_left_x=306)

Note
Seven documents in the countryinfo collection have a population value of zero. Therefore warning messages appear at the end of the output.
```
mysql-py> db.countryinfo.find("GNP*1000000/demographics.Population > 30000")
...[output removed]
9 \text { documents in set, 7 warnings (0.00 sec)}
Warning (Code 1365): Division by 0
Warning (Code 1365): Division by 0
Warning (Code 1365): Division by 0
Warning (Code 1365): Division by 0
Warning (Code 1365): Division by 0
Warning (Code 1365): Division by 0
Warning (Code 1365): Division by 0
```


You can separate a value from the search condition by using the bind ( ) method. For example, instead of specifying a hard-coded country name as the condition, substitute a named placeholder consisting of a colon followed by a name that begins with a letter, such as country. Then use the bind(placeholder, value) method as follows:
```
mysql-py> db.countryinfo.find("Name = :country").bind("country", "Italy")
{
    "GNP": 1161755,
    "_id": "00005de917d8000000000000006a",
    "Code": "ITA",
    "Name": "Italy",
    "Airports": [],
    "IndepYear": 1861,
    "geography": {
        "Region": "Southern Europe",
        "Continent": "Europe",
        "SurfaceArea": 301316
    },
    "government": {
        "HeadOfState": "Carlo Azeglio Ciampi",
        "GovernmentForm": "Republic"
    },
    "demographics": {
        "Population": 57680000,
        "LifeExpectancy": 79
    }
}
1 document in set (0.01 sec)
```


\section*{Tip}

Within a program, binding enables you to specify placeholders in your expressions, which are filled in with values before execution and can benefit from automatic escaping, as appropriate.

Always use binding to sanitize input. Avoid introducing values in queries using string concatenation, which can produce invalid input and, in some cases, can cause security issues.

You can use placeholders and the bind ( ) method to create saved searches which you can then call with different values. For example to create a saved search for a country:
```
mysql-py> myFind = db.countryinfo.find("Name = :country")
mysql-py> myFind.bind('country', 'France')
{
    "GNP": 1424285,
    "_id": "00005de917d80000000000000048",
    "Code": "FRA",
    "Name": "France",
    "IndepYear": 843,
    "geography": {
        "Region": "Western Europe",
        "Continent": "Europe",
        "SurfaceArea": 551500
    },
    "government": {
        "HeadOfState": "Jacques Chirac",
        "GovernmentForm": "Republic"
    },
    "demographics": {
        "Population": 59225700,
        "LifeExpectancy": 78.80000305175781
    }
}
1 document in set (0.0028 sec)
mysql-py> myFind.bind('country', 'Germany')
{
    "GNP": 2133367,
    "_id": "00005de917d80000000000000038",
    "Code": "DEU",
    "Name": "Germany",
    "IndepYear": 1955,
    "geography": {
        "Region": "Western Europe",
```

```
        "Continent": "Europe",
        "SurfaceArea": 357022
    },
    "government": {
        "HeadOfState": "Johannes Rau",
        "GovernmentForm": "Federal Republic"
    },
    "demographics": {
        "Population": 82164700,
        "LifeExpectancy": 77.4000015258789
    }
}
1 document in set (0.0026 sec)
```


\section*{Project Results}

You can return specific fields of a document, instead of returning all the fields. The following example returns the GNP and Name fields of all documents in the countryinfo collection matching the search conditions.

Use the fields() method to pass the list of fields to return.
```
mysql-py> db.countryinfo.find("GNP > 5000000").fields(["GNP", "Name"])
[
    {
        "GNP": 8510700,
        "Name": "United States"
    }
]
1 document in set (0.00 sec)
```


In addition, you can alter the returned documents-adding, renaming, nesting and even computing new field values-with an expression that describes the document to return. For example, alter the names of the fields with the following expression to return only two documents.
```
mysql-py> db.countryinfo.find().fields(
mysqlx.expr('{"Name": upper(Name), "GNPPerCapita": GNP*1000000/demographics.Population}')).limit(2)
{
    "Name": "ARUBA",
    "GNPPerCapita": 8038.834951456311
}
{
    "Name": "AFGHANISTAN",
    "GNPPerCapita": 263.0281690140845
}
```


\section*{Limit, Sort, and Skip Results}

You can apply the limit(), sort(), and skip() methods to manage the number and order of documents returned by the find() method.

To specify the number of documents included in a result set, append the limit ( ) method with a value to the find ( ) method. The following query returns the first five documents in the countryinfo collection.
```
mysql-py> db.countryinfo.find().limit(5)
... [output removed]
5 \text { documents in set (0.00 sec)}
```


To specify an order for the results, append the sort() method to the find() method. Pass to the sort ( ) method a list of one or more fields to sort by and, optionally, the descending (desc) or ascending (asc) attribute as appropriate. Ascending order is the default order type.

For example, the following query sorts all documents by the IndepYear field and then returns the first eight documents in descending order.
```
mysql-py> db.countryinfo.find().sort(["IndepYear desc"]).limit(8)
... [output removed]
8 \mp@code { d o c u m e n t s ~ i n ~ s e t ~ ( 0 . 0 0 ~ s e c ) }
```


By default, the limit ( ) method starts from the first document in the collection. You can use the skip( ) method to change the starting document. For example, to ignore the first document and return the next eight documents matching the condition, pass to the skip() method a value of 1.
```
mysql-py> db.countryinfo.find().sort(["IndepYear desc"]).limit(8).skip(1)
... [output removed]
8 \mp@code { d o c u m e n t s ~ i n ~ s e t ~ ( 0 . 0 0 ~ s e c ) }
```


\section*{Related Information}
- The MySQL Reference Manual provides detailed documentation on functions and operators.
- See CollectionFindFunction for the full syntax definition.

\subsection*{22.4.3.4 Modify Documents}

You can use the modify( ) method to update one or more documents in a collection. The X DevAPI provides additional methods for use with the modify ( ) method to:
- Set and unset fields within documents.
- Append, insert, and delete arrays.
- Bind, limit, and sort the documents to be modified.

\section*{Set and Unset Document Fields}

The modify() method works by filtering a collection to include only the documents to be modified and then applying the operations that you specify to those documents.

In the following example, the modify ( ) method uses the search condition to identify the document to change and then the set () method replaces two values within the nested demographics object.
```
mysql-py> db.countryinfo.modify("Code = 'SEA'").set(
"demographics", {"LifeExpectancy": 78, "Population": 28})
```


After you modify a document, use the find ( ) method to verify the change.
To remove content from a document, use the modify() and unset ( ) methods. For example, the following query removes the GNP from a document that matches the search condition.
```
mysql-py> db.countryinfo.modify("Name = 'Sealand'").unset("GNP")
```


Use the find ( ) method to verify the change.
```
mysql-py> db.countryinfo.find("Name = 'Sealand'")
{
    "_id": "00005e2ff4af00000000000000f4",
    "Name": "Sealand",
    "Code:": "SEA",
    "IndepYear": 1967,
    "geography": {
        "Region": "British Islands",
        "Continent": "Europe",
        "SurfaceArea": 193
    },
    "government": {
        "HeadOfState": "Michael Bates",
        "GovernmentForm": "Monarchy"
    },
    "demographics": {
        "Population": 27,
```

```
        "LifeExpectancy": 79
    }
}
```


\section*{Append, Insert, and Delete Arrays}

To append an element to an array field, or insert, or delete elements in an array, use the array_append(), array_insert(), or array_delete() methods. The following examples modify the countryinfo collection to enable tracking of international airports.

The first example uses the modify() and set() methods to create a new Airports field in all documents.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3810.jpg?height=113&width=104&top_left_y=756&top_left_x=301)

\section*{Caution}

Use care when you modify documents without specifying a search condition; doing so modifies all documents in the collection.
mysql-py> db.countryinfo.modify("true").set("Airports", [])
With the Airports field added, the next example uses the array_append ( ) method to add a new airport to one of the documents. \$.Airports in the following example represents the Airports field of the current document.
```
mysql-py> db.countryinfo.modify("Name = 'France'").array_append("$.Airports", "ORY")
```


Use find() to see the change.
```
mysql-py> db.countryinfo.find("Name = 'France'")
{
    "GNP": 1424285,
    "_id": "00005de917d80000000000000048",
    "Code": "FRA",
    "Name": "France",
    "Airports": [
        "ORY"
    ],
    "IndepYear": 843,
    "geography": {
        "Region": "Western Europe",
        "Continent": "Europe",
        "SurfaceArea": 551500
    },
    "government": {
        "HeadOfState": "Jacques Chirac",
        "GovernmentForm": "Republic"
    },
    "demographics": {
        "Population": 59225700,
        "LifeExpectancy": 78.80000305175781
    }
}
```


To insert an element at a different position in the array, use the array_insert ( ) method to specify which index to insert in the path expression. In this case, the index is 0 , or the first element in the array.
mysql-py> db.countryinfo.modify("Name = 'France'").array_insert("\$.Airports[0]", "CDG")
To delete an element from the array, you must pass to the array_delete( ) method the index of the element to be deleted.
```
mysql-py> db.countryinfo.modify("Name = 'France'").array_delete("$.Airports[1]")
```


\section*{Related Information}
- The MySQL Reference Manual provides instructions to help you search for and modify JSON values.
- See CollectionModifyFunction for the full syntax definition.

\subsection*{22.4.3.5 Remove Documents}

You can use the remove ( ) method to delete some or all documents from a collection in a schema. The X DevAPI provides additional methods for use with the remove() method to filter and sort the documents to be removed.

\section*{Remove Documents Using Conditions}

The following example passes a search condition to the remove() method. All documents matching the condition are removed from the countryinfo collection. In this example, one document matches the condition.
```
mysql-py> db.countryinfo.remove("Code = 'SEA'")
```


\section*{Remove the First Document}

To remove the first document in the countryinfo collection, use the limit () method with a value of 1.
```
mysql-py> db.countryinfo.remove("true").limit(1)
```


\section*{Remove the Last Document in an Order}

The following example removes the last document in the countryinfo collection by country name.
```
mysql-py> db.countryinfo.remove("true").sort(["Name desc"]).limit(1)
```


\section*{Remove All Documents in a Collection}

You can remove all documents in a collection. To do so, use the remove ("true") method without specifying a search condition.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3811.jpg?height=113&width=104&top_left_y=1610&top_left_x=365)

\section*{Caution}

Use care when you remove documents without specifying a search condition. This action deletes all documents from the collection.

Alternatively, use the db.drop_collection ( 'countryinfo' ) operation to delete the countryinfo collection.

\section*{Related Information}
- See CollectionRemoveFunction for the full syntax definition.
- See Section 22.4.2, "Download and Import world_x Database" for instructions to recreate the world_x schema.

\subsection*{22.4.3.6 Create and Drop Indexes}

Indexes are used to find documents with specific field values quickly. Without an index, MySQL must begin with the first document and then read through the entire collection to find the relevant fields. The larger the collection, the more this costs. If a collection is large and queries on a specific field are common, then consider creating an index on a specific field inside a document.

For example, the following query performs better with an index on the Population field:
```
mysql-py> db.countryinfo.find("demographics.Population < 100")
...[output removed]
8 \mp@code { d o c u m e n t s ~ i n ~ s e t ~ ( 0 . 0 0 ~ s e c ) }
```


The create_index( ) method creates an index that you can define with a JSON document that specifies which fields to use. This section is a high level overview of indexing. For more information see Indexing Collections.

\section*{Add a Nonunique Index}

To create a nonunique index, pass an index name and the index information to the create_index() method. Duplicate index names are prohibited.

The following example specifies an index named popul, defined against the Population field from the demographics object, indexed as an Integer numeric value. The final parameter indicates whether the field should require the NOT NULL constraint. If the value is false, the field can contain NULL values. The index information is a JSON document with details of one or more fields to include in the index. Each field definition must include the full document path to the field, and specify the type of the field.
```
mysql-py> db.countryinfo.createIndex("popul", {fields:
[{field: '$.demographics.Population', type: 'INTEGER'}]})
```


Here, the index is created using an integer numeric value. Further options are available, including options for use with GeoJSON data. You can also specify the type of index, which has been omitted here because the default type "index" is appropriate.

\section*{Add a Unique Index}

To create a unique index, pass an index name, the index definition, and the index type "unique" to the create_index() method. This example shows a unique index created on the country name ("Name"), which is another common field in the countryinfo collection to index. In the index field description, "TEXT(40)" represents the number of characters to index, and "required": True specifies that the field is required to exist in the document.
```
mysql-py> db.countryinfo.create_index("name",
{"fields": [{"field": "$.Name", "type": "TEXT(40)", "required": True}], "unique": True})
```


\section*{Drop an Index}

To drop an index, pass the name of the index to drop to the drop_index( ) method. For example, you can drop the "popul" index as follows:
```
mysql-py> db.countryinfo.drop_index("popul")
```


\section*{Related Information}
- See Indexing Collections for more information.
- See Defining an Index for more information on the JSON document that defines an index.
- See Collection Index Management Functions for the full syntax definition.

\subsection*{22.4.4 Relational Tables}

You can also use X DevAPI to work with relational tables. In MySQL, each relational table is associated with a particular storage engine. The examples in this section use InnoDB tables in the world_x schema.

\section*{Confirm the Schema}

To show the schema that is assigned to the db global variable, issue db.
```
mysql-py> db
<Schema:world_x>
```


If the returned value is not Schema: world_ $x$, set the db variable as follows:
```
mysql-py> \use world_x
Schema ˋworld_xˋ accessible through db.
```


\section*{Show All Tables}

To display all relational tables in the world_x schema, use the get_tables() method on the db object.
```
mysql-py> db.get_tables()
[
    <Table:city>,
    <Table:country>,
    <Table:countrylanguage>
]
```


\section*{Basic Table Operations}

Basic operations scoped by tables include:

\begin{tabular}{|l|l|}
\hline Operation form & Description \\
\hline db.name.insert() & The insert() method inserts one or more records into the named table. \\
\hline db.name.select() & The select() method returns some or all records in the named table. \\
\hline db.name.update() & The update() method updates records in the named table. \\
\hline db.name.delete() & The delete() method deletes one or more records from the named table. \\
\hline
\end{tabular}

\section*{Related Information}
- See Working with Relational Tables for more information.
- CRUD EBNF Definitions provides a complete list of operations.
- See Section 22.4.2, "Download and Import world_x Database" for instructions on setting up the world_x schema sample.

\subsection*{22.4.4.1 Insert Records into Tables}

You can use the insert () method with the values() method to insert records into an existing relational table. The insert ( ) method accepts individual columns or all columns in the table. Use one or more values() methods to specify the values to be inserted.

\section*{Insert a Complete Record}

To insert a complete record, pass to the insert ( ) method all columns in the table. Then pass to the values ( ) method one value for each column. For example, to add a new record to the city table in the world_x database, insert the following record and press Enter twice.
```
mysql-py> db.city.insert("ID", "Name", "CountryCode", "District", "Info").values(
None, "Olympia", "USA", "Washington", '{"Population": 5000}')
```


The city table has five columns: ID, Name, CountryCode, District, and Info. Each value must match the data type of the column it represents.

\section*{Insert a Partial Record}

The following example inserts values into the ID, Name, and CountryCode columns of the city table.
```
mysql-py> db.city.insert("ID", "Name", "CountryCode").values(
```

```
None, "Little Falls", "USA").values(None, "Happy Valley", "USA")
```


When you specify columns using the insert ( ) method, the number of values must match the number of columns. In the previous example, you must supply three values to match the three columns specified.

\section*{Related Information}
- See TableInsertFunction for the full syntax definition.

\subsection*{22.4.4.2 Select Tables}

You can use the select ( ) method to query for and return records from a table in a database. The X DevAPI provides additional methods to use with the select () method to filter and sort the returned records.

MySQL provides the following operators to specify search conditions: OR (||), AND (\&\&), XOR, IS, NOT, BETWEEN, IN, LIKE, !=, <>, >, >=, <, <=, \&, |, <<, >>, +, -, *, /, ', and \%.

\section*{Select All Records}

To issue a query that returns all records from an existing table, use the select ( ) method without specifying search conditions. The following example selects all records from the city table in the world_x database.

\section*{Note}

Limit the use of the empty select ( ) method to interactive statements. Always use explicit column-name selections in your application code.
```
mysql-py> db.city.select()

\begin{tabular}{|l|l|l|l|l|}
\hline ID & Name & CountryCode & District & Info \\
\hline 1 & Kabul & AFG & Kabol & |\{"Population": 1780000\} \\
\hline 2 & Qandahar & AFG & Qandahar & |\{"Population": 237500\} \\
\hline 3 & Herat & AFG & Herat & |\{"Population": 186800\} \\
\hline 4079 & Rafah & PSE & Rafah & |\{"Population": 92020\} \\
\hline \multicolumn{5}{|c|}{4082 rows in set ( 0.01 sec )} \\
\hline
\end{tabular}
```


An empty set (no matching records) returns the following information:
```
Empty set (0.00 sec)
```


\section*{Filter Searches}

To issue a query that returns a set of table columns, use the select ( ) method and specify the columns to return between square brackets. This query returns the Name and CountryCode columns from the city table.
```
mysql-py> db.city.select(["Name", "CountryCode"])
+--------------------+-------------+
| Name | CountryCode |
+--------------------+-------------+

\begin{tabular}{|l|l|} 
Kabul & AFG \\
Qandahar & AFG \\
Herat & AFG \\
Mazar-e-Sharif & AFG \\
Amsterdam & NLD \\
W. & I \\
Rafah & PSE \\
Olympia & USA \\
Little Falls & USA
\end{tabular}
```

```
| Happy Valley | USA |
4082 rows in set (0.00 sec)
```


To issue a query that returns rows matching specific search conditions, use the where() method to include those conditions. For example, the following example returns the names and country codes of the cities that start with the letter Z .
```
mysql-py> db.city.select(["Name", "CountryCode"]).where("Name like 'Z%'")
+--------------------+-------------+
| Name | CountryCode |
+--------------------+-------------+
| Zaanstad | NLD
| Zoetermeer | NLD
| Zwolle | NLD
| Zenica | BIH
| Zagazig | EGY
| Zaragoza | ESP
| Zamboanga | PHL
| Zahedan | IRN
| Zanjan | IRN
| Zabol | IRN
| Zama | JPN
| Zhezqazghan | KAZ
| Zhengzhou | CHN
... ...
| Zeleznogorsk | RUS |
+--------------------+-------------+
rows in set (0.00 sec)
```


You can separate a value from the search condition by using the bind ( ) method. For example, instead of using "Name = 'Z\%' " as the condition, substitute a named placeholder consisting of a colon followed by a name that begins with a letter, such as name. Then include the placeholder and value in the bind() method as follows:
```
mysql-py> db.city.select(["Name", "CountryCode"]).where(
"Name like :name").bind("name", "Z%")
```


\section*{Tip}

Within a program, binding enables you to specify placeholders in your expressions, which are filled in with values before execution and can benefit from automatic escaping, as appropriate.

Always use binding to sanitize input. Avoid introducing values in queries using string concatenation, which can produce invalid input and, in some cases, can cause security issues.

\section*{Project Results}

To issue a query using the AND operator, add the operator between search conditions in the where() method.
```
mysql-py> db.city.select(["Name", "CountryCode"]).where(
"Name like 'Z%' and CountryCode = 'CHN'")
+-----------------+-------------+
| Name | CountryCode |
+-----------------+-------------+
| Zhengzhou | CHN |
| Zibo | CHN
| Zhangjiakou | CHN
| Zhuzhou | CHN
| Zhangjiang | CHN
| Zigong | CHN
| Zaozhuang | CHN
... ...
| Zhangjiagang | CHN |
+-----------------+-------------+
```

```
22 rows in set (0.01 sec)
```


To specify multiple conditional operators, you can enclose the search conditions in parenthesis to change the operator precedence. The following example demonstrates the placement of AND and OR operators.
```
mysql-py> db.city.select(["Name", "CountryCode"]).where(
"Name like 'Z%' and (CountryCode = 'CHN' or CountryCode = 'RUS')")
+--------------------+-------------+
| Name | CountryCode |
| Zhengzhou | CHN |
| Zibo | CHN
| Zhangjiakou | CHN
| Zhuzhou | CHN |
... ...
| Zeleznogorsk | RUS |
+--------------------+-------------+
29 rows in set (0.01 sec)
```


\section*{Limit, Order, and Offset Results}

You can apply the limit(), order_by(), and offset() methods to manage the number and order of records returned by the select() method.

To specify the number of records included in a result set, append the limit ( ) method with a value to the select ( ) method. For example, the following query returns the first five records in the country table.
```
mysql-py> db.country.select(["Code", "Name"]).limit(5)

\begin{tabular}{|l|l|}
\hline Code & Name \\
\hline ABW & Aruba \\
\hline AFG & Afghanistan \\
\hline AGO & Angola \\
\hline AIA & Anguilla \\
\hline ALB & Albania \\
\hline & \\
\hline \multicolumn{2}{|r|}{5 rows in set (0.00 sec)} \\
\hline
\end{tabular}
```


To specify an order for the results, append the order_by() method to the select() method. Pass to the order_by( ) method a list of one or more columns to sort by and, optionally, the descending (desc) or ascending (asc) attribute as appropriate. Ascending order is the default order type.

For example, the following query sorts all records by the Name column and then returns the first three records in descending order .
```
mysql-py> db.country.select(["Code", "Name"]).order_by(["Name desc"]).limit(3)
+------+-------------+
| Code | Name |
+------+------------+
| ZWE | Zimbabwe |
| ZMB | Zambia
| YUG | Yugoslavia |
+------+-------------+
3 rows in set (0.00 sec)
```


By default, the limit ( ) method starts from the first record in the table. You can use the offset ( ) method to change the starting record. For example, to ignore the first record and return the next three records matching the condition, pass to the offset() method a value of 1.
```
mysql-py> db.country.select(["Code", "Name"]).order_by(["Name desc"]).limit(3).offset(1)
+------+-------------+
| Code | Name |
+------+-------------+
| ZMB | Zambia |
```

```
| YEM | Yemen |
+------+-------------+
3 rows in set (0.00 sec)
```


\section*{Related Information}
- The MySQL Reference Manual provides detailed documentation on functions and operators.
- See TableSelectFunction for the full syntax definition.

\subsection*{22.4.4.3 Update Tables}

You can use the update() method to modify one or more records in a table. The update( ) method works by filtering a query to include only the records to be updated and then applying the operations you specify to those records.

To replace a city name in the city table, pass to the set ( ) method the new city name. Then, pass to the where() method the city name to locate and replace. The following example replaces the city Peking with Beijing.
```
mysql-py> db.city.update().set("Name", "Beijing").where("Name = 'Peking'")
```


Use the select ( ) method to verify the change.
```
mysql-py> db.city.select(["ID", "Name", "CountryCode", "District", "Info"]).where("Name = 'Beijing'")
+-------+------------+--------------+----------+-----------------------------
| ID | Name | CountryCode | District | Info |
+-------+------------+-------------+----------+-----------------------------
| 1891 | Beijing | CHN | Peking | {"Population": 7472000} |
+-------+------------+-------------+----------+------------------------------
1 row in set (0.00 sec)
```


\section*{Related Information}
- See TableUpdateFunction for the full syntax definition.

\subsection*{22.4.4.4 Delete Tables}

You can use the delete() method to remove some or all records from a table in a database. The X DevAPI provides additional methods to use with the delete() method to filter and order the records to be deleted.

\section*{Delete Records Using Conditions}

The example that follows passes search conditions to the delete() method. All records matching the condition are deleted from the city table. In this example, one record matches the condition.
```
mysql-py> db.city.delete().where("Name = 'Olympia'")
```


\section*{Delete the First Record}

To delete the first record in the city table, use the limit ( ) method with a value of 1.
```
mysql-py> db.city.delete().limit(1)
```


\section*{Delete All Records in a Table}

You can delete all records in a table. To do so, use the delete() method without specifying a search condition.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3817.jpg?height=99&width=109&top_left_y=2531&top_left_x=360)

\section*{Caution}

Use care when you delete records without specifying a search condition; doing so deletes all records from the table.

\section*{Drop a Table}

The drop_collection() method is also used in MySQL Shell to drop a relational table from a database. For example, to drop the citytest table from the world_x database, issue:
```
mysql-py> db.drop_collection("citytest")
```


\section*{Related Information}
- See TableDeleteFunction for the full syntax definition.
- See Section 22.4.2, "Download and Import world_x Database" for instructions to recreate the world_x database.

\subsection*{22.4.5 Documents in Tables}

In MySQL, a table may contain traditional relational data, JSON values, or both. You can combine traditional data with JSON documents by storing the documents in columns having a native JSON data type.

Examples in this section use the city table in the world_x schema.

\section*{city Table Description}

The city table has five columns (or fields).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3818.jpg?height=315&width=1605&top_left_y=1285&top_left_x=285)

\section*{Insert a Record}

To insert a document into the column of a table, pass to the values ( ) method a well-formed JSON document in the correct order. In the following example, a document is passed as the final value to be inserted into the Info column.
```
mysql-py> db.city.insert().values(
None, "San Francisco", "USA", "California", '{"Population":830000}')
```


\section*{Select a Record}

You can issue a query with a search condition that evaluates document values in the expression.
```
mysql-py> db.city.select(["ID", "Name", "CountryCode", "District", "Info"]).where(
"CountryCode = :country and Info->'$.Population' > 1000000").bind(
'country', 'USA')

\begin{tabular}{|l|l|l|l|l|}
\hline ID & Name & CountryCode & District & Info \\
\hline 3793 & New York & USA & New York & \{"Population": 8008278\} \\
\hline 3794 & Los Angeles & USA & California & \{"Population": 3694820\} \\
\hline 3795 & Chicago & USA & Illinois & \{"Population": 2896016\} \\
\hline 3796 & Houston & USA & Texas & \{"Population": 1953631\} \\
\hline 3797 & Philadelphia & USA & Pennsylvania & \{"Population": 1517550\} \\
\hline 3798 & Phoenix & USA & Arizona & \{"Population": 1321045\} \\
\hline 3799 & San Diego & USA & California & \{"Population": 1223400\} \\
\hline 3800 & Dallas & USA & Texas & \{"Population": 1188580\} \\
\hline 3801 & San Antonio & USA & Texas & \{"Population": 1144646\} \\
\hline
\end{tabular}
```

```
9 \text { rows in set (0.01 sec)}
```


\section*{Related Information}
- See Working with Relational Tables and Documents for more information.
- See Section 13.5, "The JSON Data Type" for a detailed description of the data type.

\subsection*{22.5 X Plugin}

This section explains how to use, configure and monitor X Plugin.

\subsection*{22.5.1 Checking X Plugin Installation}

X Plugin is enabled by default in MySQL 8, therefore installing or upgrading to MySQL 8 makes the plugin available. You can verify X Plugin is installed on an instance of MySQL server by using the SHOW plugins statement to view the plugins list.

To use MySQL Shell to verify $X$ Plugin is installed, issue:
```
$> mysqlsh -u user --sqlc -P 3306 -e "SHOW plugins"
```


To use MySQL Client to verify X Plugin is installed, issue:
```
$> mysql -u user -p -e "SHOW plugins"
```


An example result if $X$ Plugin is installed is highlighted here:
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3819.jpg?height=415&width=1602&top_left_y=1354&top_left_x=347)

\subsection*{22.5.2 Disabling X Plugin}

The X Plugin can be disabled at startup by either setting mysqlx=0 in your MySQL configuration file, or by passing in either --mysqlx=0 or --skip-mysqlx when starting the MySQL server.

Alternatively, use the - DWITH_MYSQLX=OFF CMake option to compile MySQL Server without X Plugin.

\subsection*{22.5.3 Using Encrypted Connections with X Plugin}

This section explains how to configure X Plugin to use encrypted connections. For more background information, see Section 8.3, "Using Encrypted Connections".

To enable configuring support for encrypted connections, X Plugin has mysqlx_ssl_ $x x x$ system variables, which can have different values from the ssl_ $x x x$ system variables used with MySQL Server. For example, X Plugin can have SSL key, certificate, and certificate authority files that differ from those used for MySQL Server. These variables are described at Section 22.5.6.2, "X Plugin Options and System Variables". Similarly, X Plugin has its own Mysqlx_ssl_xxx status variables that correspond to the MySQL Server encrypted-connection Ssl_xxx status variables. See Section 22.5.6.3, "X Plugin Status Variables".

At initialization, X Plugin determines its TLS context for encrypted connections as follows:
- If all mysqlx_ssl_xxx system variables have their default values, X Plugin uses the same TLS context as the MySQL Server main connection interface, which is determined by the values of the ssl_xxx system variables.
- If any mysqlx_ssl_ $x x x$ variable has a nondefault value, X Plugin uses the TLS context defined by the values of its own system variables. (This is the case if any mysqlx_ssl_ $x x x$ system variable is set to a value different from its default.)

This means that, on a server with X Plugin enabled, you can choose to have MySQL Protocol and X Protocol connections share the same encryption configuration by setting only the ssl_ $x x x$ variables, or have separate encryption configurations for MySQL Protocol and X Protocol connections by configuring the ssl_ $x x x$ and mysqlx_ssl_ $x x x$ variables separately.

To have MySQL Protocol and X Protocol connections use the same encryption configuration, set only the ssl_xxx system variables in my.cnf:
```
[mysqld]
ssl_ca=ca.pem
ssl_cert=server-cert.pem
ssl_key=server-key.pem
```


To configure encryption separately for MySQL Protocol and X Protocol connections, set both the ssl_xxx and mysqlx_ssl_xxx system variables in my.cnf:
```
[mysqld]
ssl_ca=ca1.pem
ssl_cert=server-cert1.pem
ssl_key=server-key1.pem
mysqlx_ssl_ca=ca2.pem
mysqlx_ssl_cert=server-cert2.pem
mysqlx_ssl_key=server-key2.pem
```


For general information about configuring connection-encryption support, see Section 8.3.1, "Configuring MySQL to Use Encrypted Connections". That discussion is written for MySQL Server, but the parameter names are similar for X Plugin. (The X Plugin mysqlx_ssl_xxx system variable names correspond to the MySQL Server ssl_xxx system variable names.)

The tls_version system variable that determines the permitted TLS versions for MySQL Protocol connections also applies to X Protocol connections. The permitted TLS versions for both types of connections are therefore the same.

Encryption per connection is optional, but a specific user can be required to use encryption for X Protocol and MySQL Protocol connections by including an appropriate REQUIRE clause in the CREATE USER statement that creates the user. For details, see Section 15.7.1.3, "CREATE USER Statement". Alternatively, to require all users to use encryption for X Protocol and MySQL Protocol connections, enable the require_secure_transport system variable. For additional information, see Configuring Encrypted Connections as Mandatory.

\subsection*{22.5.4 Using X Plugin with the Caching SHA-2 Authentication Plugin}

X Plugin supports MySQL user accounts created with the caching_sha2_password authentication plugin. For more information on this plugin, see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication". You can use X Plugin to authenticate against such accounts using non-SSL connections with SHA256_MEMORY authentication and SSL connections with PLAIN authentication.

Although the caching_sha2_password authentication plugin holds an authentication cache, this cache is not shared with X Plugin, so X Plugin uses its own authentication cache for SHA256_MEMORY authentication. The X Plugin authentication cache stores hashes of user account passwords, and cannot be accessed using SQL. If a user account is modified or removed, the relevant entries are removed from the cache. The X Plugin authentication cache is maintained by the mysqlx_cache_cleaner plugin, which is enabled by default, and has no related system variables or status variables.

Before you can use non-SSL X Protocol connections to authenticate an account that uses the caching_sha2_password authentication plugin, the account must have authenticated at least once over an X Protocol connection with SSL, to supply the password to the X Plugin authentication cache. Once this initial authentication over SSL has succeeded, non-SSL X Protocol connections can be used.

It is possible to disable the mysqlx_cache_cleaner plugin by starting the MySQL server with the option --mysqlx_cache_cleaner=0. If you do this, the X Plugin authentication cache is disabled, and therefore SSL must always be used for X Protocol connections when authenticating with SHA256_MEMORY authentication.

\subsection*{22.5.5 Connection Compression with X Plugin}

X Plugin supports compression of messages sent over X Protocol connections. Connections can be compressed if the server and the client agree on a mutually supported compression algorithm. Enabling compression reduces the number of bytes sent over the network, but adds to the server and client an additional CPU cost for compression and decompression operations. The benefits of compression therefore occur primarily when there is low network bandwidth, network transfer time dominates the cost of compression and decompression operations, and result sets are large.

\section*{Note}

Different MySQL clients implement support for connection compression differently; consult your client documentation for details. For example, for classic MySQL protocol connections, see Section 6.2.8, "Connection Compression Control".
- Configuring Connection Compression for X Plugin
- Compressed Connection Characteristics for X Plugin
- Monitoring Connection Compression for X Plugin

\section*{Configuring Connection Compression for X Plugin}

By default, X Plugin supports the zstd, LZ4, and Deflate compression algorithms. Compression with the Deflate algorithm is carried out using the zlib software library, so the deflate_stream compression algorithm setting for X Protocol connections is equivalent to the zlib setting for classic MySQL protocol connections.

On the server side, you can disallow any of the compression algorithms by setting the mysqlx_compression_algorithms system variable to include only those permitted. The algorithm names zstd_stream, lz4_message, and deflate_stream can be specified in any combination, and the order and lettercase are not important. If the system variable value is the empty string, no compression algorithms are permitted and connections are uncompressed.

The following table compares the characteristics of the different compression algorithms and shows their assigned priorities. By default, the server chooses the highest-priority algorithm permitted in common by the server and the client; clients may change the priorities as described later. The short form alias for the algorithms can be used by clients when specifying them.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 22.1 X Protocol Compression Algorithm Characteristics}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Algorithm & Alias & Compression Ratio & Throughput & CPU Cost & Default Priority \\
\hline zsth_stream & zstd & High & High & Medium & First \\
\hline lz4_message & lz4 & Low & High & Lowest & Second \\
\hline \multicolumn{2}{|c|}{deflate_stręameflate} & High & Low & Highest & Third \\
\hline
\end{tabular}
\end{table}

The X Protocol set of permitted compression algorithms (whether user-specified or default) is independent of the set of compression algorithms permitted by MySQL Server for classic MySQL
protocol connections, which is specified by the protocol_compression_algorithms server system variable. If you do not specify the mysqlx_compression_algorithms system variable, X Plugin does not fall back to using compression settings for classic MySQL protocol connections. Instead, its default is to permit all algorithms shown in Table 22.1, "X Protocol Compression Algorithm Characteristics". This is unlike the situation for the TLS context, where MySQL Server settings are used if the X Plugin system variables are not set, as described in Section 22.5.3, "Using Encrypted Connections with X Plugin". For information about compression for classic MySQL protocol connections, see Section 6.2.8, "Connection Compression Control".

On the client side, an X Protocol connection request can specify several parameters for compression control:
- The compression mode.
- The compression level.
- The list of permitted compression algorithms in priority order.

\section*{Note}

Some clients or Connectors might not support a given compression-control feature. For example, specifying compression level for X Protocol connections is supported only by MySQL Shell, not by other MySQL clients or Connectors. See the documentation for specific products for details about supported features and how to use them.

The connection mode has these permitted values:
- disabled: The connection is uncompressed.
- preferred: The server and client negotiate to find a compression algorithm they both permit. If no common algorithm is available, the connection is uncompressed. This is the default mode if not specified explicitly.
- required: Compression algorithm negotiation occurs as for preferred mode, but if no common algorithm is available, the connection request terminates with an error.

In addition to agreeing on a compression algorithm for each connection, the server and client can agree on a compression level from the numeric range that applies to the agreed algorithm. As the compression level for an algorithm increases, the data compression ratio increases, which reduces the network bandwidth and transfer time needed to send the message to the client. However, the effort required for data compression also increases, taking up time and CPU and memory resources on the server. Increases in the compression effort do not have a linear relationship to increases in the compression ratio.

The client can request a specific compression level during capability negotiations with the server for an X Protocol connection.

The default compression levels used by X Plugin in MySQL 8.4 have been selected through performance testing as being a good trade-off between compression time and network transit time. These defaults are not necessarily the same as the library default for each algorithm. They apply if the client does not request a compression level for the algorithm. The default compression levels are initially set to 3 for zstd, 2 for LZ4, and 3 for Deflate. You can adjust these settings using the mysqlx_zstd_default_compression_level, mysqlx_lz4_default_compression_level, and mysqlx_deflate_default_compression_level system variables.

To prevent excessive resource consumption on the server, X Plugin sets a maximum compression level that the server permits for each algorithm. If a client requests a compression level that exceeds this setting, the server uses its maximum permitted compression level (compression level requests by a client are supported only by MySQL Shell). The maximum compression levels are initially set to 11 for zstd, 8 for LZ4, and 5 for Deflate. You can
adjust these settings using the mysqlx_zstd_max_client_compression_level, mysqlx_lz4_max_client_compression_level, and mysqlx_deflate_max_client_compression_level system variables.

If the server and client permit more than one algorithm in common, the default priority order for choosing an algorithm during negotiation is shown in Table 22.1, "X Protocol Compression Algorithm Characteristics". For clients that support specifying compression algorithms, the connection request can include a list of algorithms permitted by the client, specified using the algorithm name or its alias. The order of these algorithms in the list is taken as a priority order by the server. The algorithm used in this case is the first of those in the client list that is also permitted on the server side. However, the option for compression algorithms is subject to the compression mode:
- If the compression mode is disabled, the compression algorithms option is ignored.
- If the compression mode is preferred but no algorithm permitted on the client side is permitted on the server side, the connection is uncompressed.
- If the compression mode is required but no algorithm permitted on the client side is permitted on the server side, an error occurs.

To monitor the effects of message compression, use the X Plugin status variables described in Monitoring Connection Compression for X Plugin. You can use these status variables to calculate the benefit of message compression with your current settings, and use that information to tune your settings.

\section*{Compressed Connection Characteristics for X Plugin}

X Protocol connection compression operates with the following behaviors and boundaries:
- The _stream and _message suffixes in algorithm names refer to two different operational modes: In stream mode, all X Protocol messages in a single connection are compressed into a continuous stream and must be decompressed in the same manner-following the order they were compressed and without skipping any messages. In message mode, each message is compressed individually and independently, and need not be decompressed in the order in which they were compressed. Also, message mode does not require all compressed messages to be decompressed.
- Compression is not applied to any messages that are sent before authentication succeeds.
- Compression is not applied to control flow messages such as Mysqlx. Ok, Mysqlx.Error, and Mysqlx.Sql.StmtExecuteOk messages.
- All other X Protocol messages can be compressed if the server and client agree on a mutually permitted compression algorithm during capability negotiation. If the client does not request compression at that stage, neither the client nor the server applies compression to messages.
- When messages sent over X Protocol connections are compressed, the limit specified by the mysqlx_max_allowed_packet system variable still applies. The network packet must be smaller than this limit after the message payload has been decompressed. If the limit is exceeded, X Plugin returns a decompression error and closes the connection.
- The following points pertain to compression level requests by clients, which is supported only by MySQL Shell:
- Compression levels must be specified by the client as an integer. If any other type of value is supplied, the connection closes with an error.
- If a client specifies an algorithm but not a compression level, the server uses its default compression level for the algorithm.
- If a client requests an algorithm compression level that exceeds the server maximum permitted level, the server uses the maximum permitted level.
- If a client requests an algorithm compression level that is less than the server minimum permitted level, the server uses the minimum permitted level.

\section*{Monitoring Connection Compression for X Plugin}

You can monitor the effects of message compression using the X Plugin status variables. When message compression is in use, the session Mysqlx_compression_algorithm status variable shows which compression algorithm is in use for the current X Protocol connection, and Mysqlx_compression_level shows the compression level that was selected.

X Plugin status variables can be used to calculate the efficiency of the compression algorithms that are selected (the data compression ratio), and the overall effect of using message compression. Use the session value of the status variables in the following calculations to see what the benefit of message compression was for a specific session with a known compression algorithm. Or use the global value of the status variables to check the overall benefit of message compression for your server across all sessions using X Protocol connections, including all the compression algorithms that have been used for those sessions, and all sessions that did not use message compression. You can then tune message compression by adjusting the permitted compression algorithms, maximum compression level, and default compression level, as described in Configuring Connection Compression for X Plugin.

When message compression is in use, the Mysqlx_bytes_sent status variable shows the total number of bytes sent out from the server, including compressed message payloads measured after compression, any items in compressed messages that were not compressed such as X Protocol headers, and any uncompressed messages. The Mysqlx_bytes_sent_compressed_payload status variable shows the total number of bytes sent as compressed message payloads, measured after compression, and the Mysqlx_bytes_sent_uncompressed_frame status variable shows the total number of bytes for those same message payloads but measured before compression. The compression ratio, which shows the efficiency of the compression algorithm, can therefore be calculated using the following expression:
mysqlx_bytes_sent_uncompressed_frame / mysqlx_bytes_sent_compressed_payload
The effectiveness of compression for X Protocol messages sent by the server can be calculated using the following expression:
(mysqlx_bytes_sent - mysqlx_bytes_sent_compressed_payload + mysqlx_bytes_sent_uncompressed_frame) / mysqlx_
For messages received by the server from clients, the Mysqlx_bytes_received_compressed_payload status variable shows the total number of bytes received as compressed message payloads, measured before decompression, and the Mysqlx_bytes_received_uncompressed_frame status variable shows the total number of bytes for those same message payloads but measured after decompression. The Mysqlx_bytes_received status variable includes compressed message payloads measured before decompression, any uncompressed items in compressed messages, and any uncompressed messages.

\subsection*{22.5.6 X Plugin Options and Variables}

This section describes the command options and system variables that configure X Plugin, as well as the status variables available for monitoring purposes. If configuration values specified at startup time are incorrect, X Plugin could fail to initialize properly and the server does not load it. In this case, the server could also produce error messages for other X Plugin settings because it cannot recognize them.

\subsection*{22.5.6.1 X Plugin Option and Variable Reference}

This table provides an overview of the command options, system variables, and status variables provided by X Plugin.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 22．2 X Plugin Option and Variable Reference}
\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline mysqlx & Yes & Yes & & & & \\
\hline Mysqlx＿aborte & d＿clients & & & Yes & Global & No \\
\hline Mysqlx＿addres & ss & & & Yes & Global & No \\
\hline mysqlx＿bind＿ & adesess & Yes & Yes & & Global & No \\
\hline Mysqlx＿bytes & received & & & Yes & Both & No \\
\hline Mysqlx＿bytes & \multicolumn{3}{|l|}{received＿compressed＿payload} & Yes & Both & No \\
\hline Mysqlx＿bytes & \multicolumn{2}{|c|}{received＿uncompressed＿fram} & me & Yes & Both & No \\
\hline Mysqlx＿bytes & sent & & & Yes & Both & No \\
\hline Mysqlx＿bytes & \multicolumn{2}{|c|}{sent＿compressed＿payload} & & Yes & Both & No \\
\hline Mysqlx＿bytes & sent＿uncompr & essed＿frame & & Yes & Both & No \\
\hline Mysqlx＿compr & \multicolumn{2}{|l|}{ession＿algorithm} & & Yes & Session & No \\
\hline mysqlx＿compt & \multicolumn{2}{|l|}{\＆esion＿algorithyress} & Yes & & Global & Yes \\
\hline Mysqlx＿compt & ession＿level & & & Yes & Session & No \\
\hline mysqlx＿conne & dtesimeout & Yes & Yes & & Global & Yes \\
\hline Mysqlx＿conne & \multicolumn{2}{|l|}{ction＿accept＿errors} & & Yes & Both & No \\
\hline Mysqlx＿conne & ction＿errors & & & Yes & Both & No \\
\hline Mysqlx＿conne & \multicolumn{2}{|l|}{ctions＿accepted} & & Yes & Global & No \\
\hline Mysqlx＿conne & ctions＿closed & & & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Mysqlx＿connections＿rejected} & & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Mysqlx＿crud＿create＿view} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx＿crud＿delete} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx＿crud＿drop＿view} & & Yes & Both & No \\
\hline Mysqlx＿crud＿ & find & & & Yes & Both & No \\
\hline Mysqlx＿crud＿ & nsert & & & Yes & Both & No \\
\hline Mysqlx＿crud＿ & modify＿view & & & Yes & Both & No \\
\hline Mysqlx＿crud＿ & update & & & Yes & Both & No \\
\hline mysqlx＿deflate & \multicolumn{2}{|c|}{eYdsfault＿compYession＿level} & Yes & & Global & Yes \\
\hline mysqlx＿deflate & Yesax＿client＿c & 楒pression＿le & Yeds & & Global & Yes \\
\hline mysqlx＿docum & vés＿id＿unique & Yesfix & Yes & & Global & Yes \\
\hline mysqlx＿enable & Yesllo＿notice & Yes & Yes & & Global & Yes \\
\hline Mysqlx＿errors & sent & & & Yes & Both & No \\
\hline Mysqlx＿errors & \multicolumn{2}{|l|}{unknown＿message＿type} & & Yes & Both & No \\
\hline Mysqlx＿expect & close & & & Yes & Both & No \\
\hline Mysqlx＿expect & ＿open & & & Yes & Both & No \\
\hline mysqlx＿idle＿w & \multicolumn{2}{|l|}{罗伸官＿thread＿tirresout} & Yes & & Global & Yes \\
\hline Mysqlx＿init＿e & ror & & & Yes & Both & No \\
\hline mysqlx＿intera & Kles＿timeout & Yes & Yes & & Global & Yes \\
\hline mysqlx＿lz4＿de & fœast＿compres & Siews＿level & Yes & & Global & Yes \\
\hline mysqlx＿lz4＿m & ałeselient＿comp & Yession＿level & Yes & & Global & Yes \\
\hline mysqlx＿max＿ & alyessed＿packet & Yes & Yes & & Global & Yes \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline mysqlx_max_cyesections & Yes & Yes & & Global & Yes \\
\hline Mysqlx_messages_sent & & & Yes & Both & No \\
\hline mysqlx_min_worder_threads & Yes & Yes & & Global & Yes \\
\hline Mysqlx_notice_global_sent & & & Yes & Both & No \\
\hline Mysqlx_notice_other_sent & & & Yes & Both & No \\
\hline Mysqlx_notice_warning_sent & & & Yes & Both & No \\
\hline Mysqlx_notified_by_group_re & eplication & & Yes & Both & No \\
\hline Mysqlx_port & & & Yes & Global & No \\
\hline mysqlx_port Yes & Yes & Yes & & Global & No \\
\hline mysqlx_port_opers_timeout & Yes & Yes & & Global & No \\
\hline mysqlx_read_tiyrous & Yes & Yes & & Session & Yes \\
\hline Mysqlx_rows_sent & & & Yes & Both & No \\
\hline Mysqlx_sessions & & & Yes & Global & No \\
\hline Mysqlx_sessions_accepted & & & Yes & Global & No \\
\hline Mysqlx_sessions_closed & & & Yes & Global & No \\
\hline Mysqlx_sessions_fatal_error & & & Yes & Global & No \\
\hline Mysqlx_sessions_killed & & & Yes & Global & No \\
\hline Mysqlx_sessions_rejected & & & Yes & Global & No \\
\hline Mysqlx_socket & & & Yes & Global & No \\
\hline mysqlx_socketYes & Yes & Yes & & Global & No \\
\hline Mysqlx_ssl_accept_renegotia & tes & & Yes & Global & No \\
\hline Mysqlx_ssl_accepts & & & Yes & Global & No \\
\hline Mysqlx_ssl_active & & & Yes & Both & No \\
\hline mysqlx_ssl_caYes & Yes & Yes & & Global & No \\
\hline mysqlx_ssl_cape's & Yes & Yes & & Global & No \\
\hline mysqlx_ssl_centes & Yes & Yes & & Global & No \\
\hline Mysqlx_ssl_cipher & & & Yes & Both & No \\
\hline mysqlx_ssl_cipKes & Yes & Yes & & Global & No \\
\hline Mysqlx_ssl_cipher_list & & & Yes & Both & No \\
\hline mysqlx_ssl_crlYes & Yes & Yes & & Global & No \\
\hline mysq|x_ssl_cr|や』tw & Yes & Yes & & Global & No \\
\hline Mysq|x_ssl_ctx_verify_depth & & & Yes & Both & No \\
\hline Mysqlx_ssl_ctx_verify_mode & & & Yes & Both & No \\
\hline Mysqlx_ssl_finished_accepts & & & Yes & Global & No \\
\hline mysqlx_ssl_keyYes & Yes & Yes & & Global & No \\
\hline Mysqlx_ssl_server_not_after & & & Yes & Global & No \\
\hline Mysqlx_ssl_server_not_before & & & Yes & Global & No \\
\hline Mysqlx_ssl_verify_depth & & & Yes & Global & No \\
\hline Mysqlx_ssl_verify_mode & & & Yes & Global & No \\
\hline Mysqlx_ssl_version & & & Yes & Both & No \\
\hline \multicolumn{2}{|l|}{Mysqlx_stmt_create_collection} & & Yes & Both & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_create_collection_index} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_disable_notices} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_drop_collection} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_drop_collection_index} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_enable_notices} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_ensure_collection} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_execute_mysqlx} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_execute_sql} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_execute_xplugin} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_get_collection_options} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_kill_client} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_list_clients} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_list_notices} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_list_objects} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_modify_collection_options} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_stmt_ping} & & Yes & Both & No \\
\hline \multicolumn{3}{|l|}{\begin{tabular}{l}
mysqlx_wait_timesut \\
Yes
\end{tabular}} & Yes & & Session & Yes \\
\hline \multicolumn{3}{|l|}{Mysqlx_worker_threads} & & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Mysqlx_worker_threads_active} & & Yes & Global & No \\
\hline \multicolumn{2}{|l|}{mysqlx_write_timesout} & Yes & Yes & & Session & Yes \\
\hline \multicolumn{2}{|c|}{mysqlx_zstd_q defsult_compre} & \$kesn_level & Yes & & Global & Yes \\
\hline \multicolumn{2}{|c|}{mysqlx_zstd_mÆes_client_comp} & & IYes & & Global & Yes \\
\hline
\end{tabular}

\subsection*{22.5.6.2 X Plugin Options and System Variables}

To control activation of X Plugin, use this option:
- --mysqlx[=value]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx[=value] \\
\hline Type & Enumeration \\
\hline Default Value & ON \\
\hline Valid Values & \begin{tabular}{l}
ON \\
OFF \\
FORCE \\
FORCE_PLUS_PERMANENT
\end{tabular} \\
\hline
\end{tabular}

This option controls how the server loads X Plugin at startup. In MySQL 8.4, X Plugin is enabled by default, but this option may be used to control its activation state.

The option value should be one of those available for plugin-loading options, as described in Section 7.6.1, "Installing and Uninstalling Plugins".

If X Plugin is enabled, it exposes several system variables that permit control over its operation:
- mysqlx_bind_address

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-bind-address=addr \\
\hline System Variable & mysqlx_bind_address \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & * \\
\hline
\end{tabular}

The network address on which X Plugin listens for TCP/IP connections. This variable is not dynamic and can be configured only at startup. This is the X Plugin equivalent of the bind_address system variable; see that variable description for more information.

By default, X Plugin accepts TCP/IP connections on all server host IPv4 interfaces, and, if the server host supports IPv6, on all IPv6 interfaces. If mysqlx_bind_address is specified, its value must satisfy these requirements:
- A single address value, which may specify a single non-wildcard IP address (either IPv4 or IPv6), or a host name, or one of the wildcard address formats that permit listening on multiple network interfaces (*, 0.0.0.0, or : :).
- A list of comma-separated values. When the variable names a list of multiple values, each value must specify a single non-wildcard IP address (either IPv4 or IPv6) or a host name. Wildcard address formats (*, 0.0.0.0, or::) are not allowed in a list of values.
- The value may also include a network namespace specifier.

IP addresses can be specified as IPv4 or IPv6 addresses. For any value that is a host name, X Plugin resolves the name to an IP address and binds to that address. If a host name resolves to multiple IP addresses, X Plugin uses the first IPv4 address if there are any, or the first IPv6 address otherwise.

X Plugin treats different types of addresses as follows:
- If the address is *, X Plugin accepts TCP/IP connections on all server host IPv4 interfaces, and, if the server host supports IPv6, on all IPv6 interfaces. Use this address to permit both IPv4 and IPv6 connections for X Plugin. This value is the default. If the variable specifies a list of multiple values, this value is not permitted.
- If the address is 0.0 .0 .0 , X Plugin accepts TCP/IP connections on all server host IPv4 interfaces. If the variable specifies a list of multiple values, this value is not permitted.
- If the address is : :, X Plugin accepts TCP/IP connections on all server host IPv4 and IPv6 interfaces. If the variable specifies a list of multiple values, this value is not permitted.
- If the address is an IPv4-mapped address, X Plugin accepts TCP/IP connections for that address, in either IPv4 or IPv6 format. For example, if X Plugin is bound to : : ffff: 127.0 .0 .1 , a client such as MySQL Shell can connect using --host=127.0.0.1 or --host=: : ffff:127.0.0.1.
- If the address is a "regular" IPv4 or IPv6 address (such as 127.0.0.1 or : :1), X Plugin accepts TCP/IP connections only for that IPv4 or IPv6 address.

These rules apply to specifying a network namespace for an address:
- A network namespace can be specified for an IP address or a host name.
- A network namespace cannot be specified for a wildcard IP address.
- For a given address, the network namespace is optional. If given, it must be specified as a /ns suffix immediately following the address.
- An address with no /ns suffix uses the host system global namespace. The global namespace is therefore the default.
- An address with a /ns suffix uses the namespace named ns.
- The host system must support network namespaces and each named namespace must previously have been set up. Naming a nonexistent namespace produces an error.
- If the variable value specifies multiple addresses, it can include addresses in the global namespace, in named namespaces, or a mix.

For additional information about network namespaces, see Section 7.1.14, "Network Namespace Support".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3829.jpg?height=124&width=111&top_left_y=925&top_left_x=397)

\section*{Important}

Because X Plugin is not a mandatory plugin, it does not prevent server startup if there is an error in the specified address or list of addresses (as MySQL Server does for bind_address errors). With X Plugin, if one of the listed addresses cannot be parsed or if X Plugin cannot bind to it, the address is skipped, an error message is logged, and X Plugin attempts to bind to each of the remaining addresses. X Plugin's Mysqlx_address status variable displays only those addresses from the list for which the bind succeeded. If none of the listed addresses results in a successful bind, or if a single specified address fails, X Plugin logs the error message ER_XPLUGIN_FAILED_TO_PREPARE_IO_INTERFACES stating that X Protocol cannot be used. mysqlx_bind_address is not dynamic, so to fix any issues you must stop the server, correct the system variable value, and restart the server.
- mysqlx_compression_algorithms

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-compressionalgorithms=value \\
\hline System Variable & mysqlx_compression_algorithms \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Set \\
\hline Default Value & deflate_stream,lz4_message,zstd_stream \\
\hline Valid Values & \begin{tabular}{l}
deflate_stream \\
lz4_message \\
zstd_stream
\end{tabular} \\
\hline
\end{tabular}

The compression algorithms that are permitted for use on X Protocol connections. By default, the Deflate, LZ4, and zstd algorithms are all permitted. To disallow any of the algorithms, set mysqlx_compression_algorithms to include only the ones you permit. The algorithm names deflate_stream, lz4_message, and zstd_stream can be specified in any combination, and the order and case are not important. If you set the system variable to the empty string, no compression algorithms are permitted and only uncompressed connections are used. Use the algorithm-specific system variables to adjust the default and maximum compression level for each permitted algorithm.

For more details, and information on how connection compression for X Protocol relates to the equivalent settings for MySQL Server, see Section 22.5.5, "Connection Compression with X Plugin".
- mysqlx_connect_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-connect-timeout=\# \\
\hline System Variable & mysqlx_connect_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 30 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 1000000000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The number of seconds X Plugin waits for the first packet to be received from newly connected clients. This is the X Plugin equivalent of connect_timeout; see that variable description for more information.
- mysqlx_deflate_default_compression_level

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- - \\
mysqlx_deflate_default_compression_level=\#
\end{tabular} \\
\hline System Variable & mysqlx_deflate_default_compression_level \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 3 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 9 \\
\hline
\end{tabular}

The default compression level that the server uses for the Deflate algorithm on X Protocol connections. Specify the level as an integer from 1 (the lowest compression effort) to 9 (the highest effort). This level is used if the client does not request a compression level during capability negotiation. If you do not specify this system variable, the server uses level 3 as the default. For more information, see Section 22.5.5, "Connection Compression with X Plugin".
- mysqlx_deflate_max_client_compression_level

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & -mysqlx_deflate_max_client_compression & level=\# \\
\hline System Variable & mysqlx_deflate_max_client_compression & level \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Integer & \\
\hline Default Value & 5 & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Minimum Value & 1 \\
\hline Maximum Value & 9 \\
\hline
\end{tabular}

The maximum compression level that the server permits for the Deflate algorithm on X Protocol connections. The range is the same as for the default compression level for this algorithm. If the client requests a higher compression level than this, the server uses the level you set here. If you do not specify this system variable, the server sets a maximum compression level of 5 .
- mysqlx_document_id_unique_prefix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-document-id-unique-prefix=\# \\
\hline System Variable & mysqlx_document_id_unique_prefix \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}

Sets the first 4 bytes of document IDs generated by the server when documents are added to a collection. By setting this variable to a unique value per instance, you can ensure document IDs are unique across instances. See Understanding Document IDs.
- mysqlx_enable_hello_notice

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-enable-hello-notice[=\{OFF| ON\}] \\
\hline System Variable & mysqlx_enable_hello_notice \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Controls messages sent to classic MySQL protocol clients that try to connect over X Protocol. When enabled, clients which do not support X Protocol that attempt to connect to the server X Protocol port receive an error explaining they are using the wrong protocol.
- mysqlx_idle_worker_thread_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-idle-worker-threadtimeout=\# \\
\hline System Variable & mysqlx_idle_worker_thread_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 60 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 3600 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The number of seconds after which idle worker threads are terminated.
- mysqlx_interactive_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-interactive-timeout=\# \\
\hline System Variable & mysqlx_interactive_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 28800 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 2147483 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The default value of the mysqlx_wait_timeout session variable for interactive clients. (The number of seconds to wait for interactive clients to timeout.)
- mysqlx_lz4_default_compression_level

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
-- \\
mysqlx_lz4_default_compression_level=\#
\end{tabular} \\
\hline System Variable & mysqlx_lz4_default_compression_level \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 16 \\
\hline
\end{tabular}

The default compression level that the server uses for the LZ4 algorithm on X Protocol connections. Specify the level as an integer from 0 (the lowest compression effort) to 16 (the highest effort). This level is used if the client does not request a compression level during capability negotiation. If you do not specify this system variable, the server uses level 2 as the default. For more information, see Section 22.5.5, "Connection Compression with X Plugin".
- mysqlx_lz4_max_client_compression_level

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- - \\
mysqlx_lz4_max_client_compression_level=\#
\end{tabular} \\
\hline System Variable & mysqlx_lz4_max_client_compression_level \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & 8 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 16 \\
\hline
\end{tabular}

The maximum compression level that the server permits for the LZ4 algorithm on X Protocol connections. The range is the same as for the default compression level for this algorithm. If the client requests a higher compression level than this, the server uses the level you set here. If you do not specify this system variable, the server sets a maximum compression level of 8 .
- mysqlx_max_allowed_packet

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-max-allowed-packet=\# \\
\hline System Variable & mysqlx_max_allowed_packet \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 67108864 \\
\hline Minimum Value & 512 \\
\hline Maximum Value & 1073741824 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The maximum size of network packets that can be received by $X$ Plugin. This limit also applies when compression is used for the connection, so the network packet must be smaller than this size after the message has been decompressed. This is the X Plugin equivalent of max_allowed_packet; see that variable description for more information.
- mysqlx_max_connections

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-max-connections=\# \\
\hline System Variable & mysqlx_max_connections \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 100 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}

The maximum number of concurrent client connections X Plugin can accept. This is the X Plugin equivalent of max_connections; see that variable description for more information.

For modifications to this variable, if the new value is smaller than the current number of connections, the new limit is taken into account only for new connections.
- mysqlx_min_worker_threads

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -mysqlx-min-worker-threads=\# \\
\hline System Variable & mysqlx_min_worker_threads \\
\hline Scope & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 100 \\
\hline
\end{tabular}

The minimum number of worker threads used by X Plugin for handling client requests.
- mysqlx_port

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-port=port_num \\
\hline System Variable & mysqlx_port \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 33060 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}

The network port on which X Plugin listens for TCP/IP connections. This is the X Plugin equivalent of port; see that variable description for more information.
- mysqlx_port_open_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-port-open-timeout=\# \\
\hline System Variable & mysqlx_port_open_timeout \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 120 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The number of seconds X Plugin waits for a TCP/IP port to become free.
- mysqlx_read_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-read-timeout=\# \\
\hline System Variable & mysqlx_read_timeout \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 30 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Minimum Value & 1 \\
\hline Maximum Value & 2147483 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The number of seconds that X Plugin waits for blocking read operations to complete. After this time, if the read operation is not successful, $X$ Plugin closes the connection and returns a warning notice with the error code ER_IO_READ_ERROR to the client application.
- mysqlx_socket

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-socket=file_name \\
\hline System Variable & mysqlx_socket \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & /tmp/mysqlx.sock \\
\hline
\end{tabular}

The path to a Unix socket file which X Plugin uses for connections. This setting is only used by MySQL Server when running on Unix operating systems. Clients can use this socket to connect to MySQL Server using X Plugin.

The default mysqlx_socket path and file name is based on the default path and file name for the main socket file for MySQL Server, with the addition of an x appended to the file name. The default path and file name for the main socket file is /tmp/mysql.sock, therefore the default path and file name for the X Plugin socket file is / tmp/mysqlx. sock.

If you specify an alternative path and file name for the main socket file at server startup using the socket system variable, this does not affect the default for the X Plugin socket file. In this situation, if you want to store both sockets at a single path, you must set the mysqlx_socket system variable as well. For example in a configuration file:
socket=/home/sockets/mysqld/mysql.sock
mysqlx_socket=/home/sockets/xplugin/xplugin.sock
If you change the default path and file name for the main socket file at compile time using the MYSQL_UNIX_ADDR compile option, this does affect the default for the X Plugin socket file, which is formed by appending an x to the MYSQL_UNIX_ADDR file name. If you want to set a different default for the X Plugin socket file at compile time, use the MYSQLX_UNIX_ADDR compile option.

The MYSQLX_UNIX_PORT environment variable can also be used to set a default for the X Plugin socket file at server startup (see Section 6.9, "Environment Variables"). If you set this environment variable, it overrides the compiled MYSQLX_UNIX_ADDR value, but is overridden by the mysqlx_socket value.
- mysqlx_ssl_ca

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-ssl-ca=file_name \\
\hline System Variable & mysqlx_ssl_ca \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & NULL \\
\hline
\end{tabular}

The mysqlx_ssl_ca system variable is like ssl_ca, except that it applies to X Plugin rather than the MySQL Server main connection interface. For information about configuring encryption support for X Plugin, see Section 22.5.3, "Using Encrypted Connections with X Plugin".
- mysqlx_ssl_capath

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-ssl-capath=dir_name \\
\hline System Variable & mysqlx_ssl_capath \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The mysqlx_ssl_capath system variable is like ssl_capath, except that it applies to X Plugin rather than the MySQL Server main connection interface. For information about configuring encryption support for X Plugin, see Section 22.5.3, "Using Encrypted Connections with X Plugin".
- mysqlx_ssl_cert

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-ssl-cert=file_name \\
\hline System Variable & mysqlx_ssl_cert \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The mysqlx_ssl_cert system variable is like ssl_cert, except that it applies to X Plugin rather than the MySQL Server main connection interface. For information about configuring encryption support for X Plugin, see Section 22.5.3, "Using Encrypted Connections with X Plugin".
- mysqlx_ssl_cipher

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-ssl-cipher=name \\
\hline System Variable & mysqlx_ssl_cipher \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The mysqlx_ssl_cipher system variable is like ssl_cipher, except that it applies to X Plugin rather than the MySQL Server main connection interface. For information about configuring encryption support for X Plugin, see Section 22.5.3, "Using Encrypted Connections with X Plugin".
- mysqlx_ssl_crl

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-ssl-crl=file_name \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & mysqlx_ssl_crl \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The mysqlx_ssl_crl system variable is like ssl_crl, except that it applies to X Plugin rather than the MySQL Server main connection interface. For information about configuring encryption support for X Plugin, see Section 22.5.3, "Using Encrypted Connections with X Plugin".
- mysqlx_ssl_crlpath

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-ssl-crlpath=dir_name \\
\hline System Variable & mysqlx_ssl_crlpath \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The mysqlx_ssl_crlpath system variable is like ssl_crlpath, except that it applies to X Plugin rather than the MySQL Server main connection interface. For information about configuring encryption support for X Plugin, see Section 22.5.3, "Using Encrypted Connections with X Plugin".
- mysqlx_ssl_key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-ssl-key=file_name \\
\hline System Variable & mysqlx_ssl_key \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The mysqlx_ssl_key system variable is like ssl_key, except that it applies to X Plugin rather than the MySQL Server main connection interface. For information about configuring encryption support for X Plugin, see Section 22.5.3, "Using Encrypted Connections with X Plugin".
- mysqlx_wait_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-wait-timeout=\# \\
\hline System Variable & mysqlx_wait_timeout \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 28800 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 2147483 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The number of seconds that $X$ Plugin waits for activity on a connection. After this time, if the read operation is not successful, $X$ Plugin closes the connection. If the client is noninteractive, the initial value of the session variable is copied from the global mysqlx_wait_timeout variable. For interactive clients, the initial value is copied from the session mysqlx_interactive_timeout.
- mysqlx_write_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqlx-write-timeout=\# \\
\hline System Variable & mysqlx_write_timeout \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 60 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 2147483 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The number of seconds that X Plugin waits for blocking write operations to complete. After this time, if the write operation is not successful, $X$ Plugin closes the connection.
- mysqlx_zstd_default_compression_level

\begin{tabular}{|l|l|}
\hline Command-Line Format & - mysqlx_zstd_default_compression_level=\# \\
\hline System Variable & mysqlx_zstd_default_compression_level \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 3 \\
\hline Minimum Value & -131072 \\
\hline Maximum Value & 22 \\
\hline
\end{tabular}

The default compression level that the server uses for the zstd algorithm on X Protocol connections. For versions of the zstd library from 1.4.0, you can set positive values from 1 to 22 (the highest compression effort), or negative values which represent progressively lower effort. A value of 0 is converted to a value of 1 . For earlier versions of the zstd library, you can only specify the value 3. This level is used if the client does not request a compression level during capability negotiation. If you do not specify this system variable, the server uses level 3 as the default. For more information, see Section 22.5.5, "Connection Compression with X Plugin".
- mysqlx_zstd_max_client_compression_level

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
-- \\
mysqlx_zstd_max_client_compression_level $=\#$
\end{tabular} \\
\hline System Variable & mysqlx_zstd_max_client_compression_level \\
\hline Scope & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 11 \\
\hline Minimum Value & -131072 \\
\hline Maximum Value & 22 \\
\hline
\end{tabular}

The maximum compression level that the server permits for the zstd algorithm on X Protocol connections. The range is the same as for the default compression level for this algorithm. If the client requests a higher compression level than this, the server uses the level you set here. If you do not specify this system variable, the server sets a maximum compression level of 11 .

\subsection*{22.5.6.3 X Plugin Status Variables}

The X Plugin status variables have the following meanings.
- Mysqlx_aborted_clients

The number of clients that were disconnected because of an input or output error.
- Mysqlx_address

The network address or addresses for which X Plugin accepts TCP/IP connections. If multiple addresses were specified using the mysqlx_bind_address system variable, Mysqlx_address displays only those addresses for which the bind succeeded. If the bind has failed for every network address specified by mysqlx_bind_address, or if the skip_networking option has been used, the value of Mysqlx_address is UNDEFINED. If X Plugin startup is not yet complete, the value of Mysqlx_address is empty.
- Mysqlx_bytes_received

The total number of bytes received through the network. If compression is used for the connection, this figure comprises compressed message payloads measured before decompression (Mysqlx_bytes_received_compressed_payload), any items in compressed messages that were not compressed such as X Protocol headers, and any uncompressed messages.
- Mysqlx_bytes_received_compressed_payload

The number of bytes received as compressed message payloads, measured before decompression.
- Mysqlx_bytes_received_uncompressed_frame

The number of bytes received as compressed message payloads, measured after decompression.
- Mysqlx_bytes_sent

The total number of bytes sent through the network. If compression is used for the connection, this figure comprises compressed message payloads measured after compression (Mysqlx_bytes_sent_compressed_payload), any items in compressed messages that were not compressed such as X Protocol headers, and any uncompressed messages.
- Mysqlx_bytes_sent_compressed_payload

The number of bytes sent as compressed message payloads, measured after compression.
- Mysqlx_bytes_sent_uncompressed_frame

The number of bytes sent as compressed message payloads, measured before compression.
- Mysqlx_compression_algorithm
(Session scope) The compression algorithm in use for the X Protocol connection for this session. The permitted compression algorithms are listed by the mysqlx_compression_algorithms system variable.
- Mysqlx_compression_level
(Session scope) The compression level in use for the X Protocol connection for this session.
- Mysqlx_connection_accept_errors

The number of connections which have caused accept errors.
- Mysqlx_connection_errors

The number of connections which have caused errors.
- Mysqlx_connections_accepted

The number of connections which have been accepted.
- Mysqlx_connections_closed

The number of connections which have been closed.
- Mysqlx_connections_rejected

The number of connections which have been rejected.
- Mysqlx_crud_create_view

The number of create view requests received.
- Mysqlx_crud_delete

The number of delete requests received.
- Mysqlx_crud_drop_view

The number of drop view requests received.
- Mysqlx_crud_find

The number of find requests received.
- Mysqlx_crud_insert

The number of insert requests received.
- Mysqlx_crud_modify_view

The number of modify view requests received.
- Mysqlx_crud_update

The number of update requests received.
- Mysqlx_cursor_close

The number of cursor-close messages received
- Mysqlx_cursor_fetch

The number of cursor-fetch messages received
- Mysqlx_cursor_open

The number of cursor-open messages received
- Mysqlx_errors_sent

The number of errors sent to clients.
- Mysqlx_errors_unknown_message_type

The number of unknown message types that have been received.
- Mysqlx_expect_close

The number of expectation blocks closed.
- Mysqlx_expect_open

The number of expectation blocks opened.
- Mysqlx_init_error

The number of errors during initialisation.
- Mysqlx_messages_sent

The total number of messages of all types sent to clients.
- Mysqlx_notice_global_sent

The number of global notifications sent to clients.
- Mysqlx_notice_other_sent

The number of other types of notices sent back to clients.
- Mysqlx_notice_warning_sent

The number of warning notices sent back to clients.
- Mysqlx_notified_by_group_replication

Number of Group Replication notifications sent to clients.
- Mysqlx_port

The TCP port which X Plugin is listening to. If a network bind has failed, or if the skip_networking system variable is enabled, the value shows UNDEFINED.
- Mysqlx_prep_deallocate

The number of prepared-statement-deallocate messages received
- Mysqlx_prep_execute

The number of prepared-statement-execute messages received
- Mysqlx_prep_prepare

The number of prepared-statement messages received
- Mysqlx_rows_sent

The number of rows sent back to clients.
- Mysqlx_sessions

The number of sessions that have been opened.
- Mysqlx_sessions_accepted

The number of session attempts which have been accepted.
- Mysqlx_sessions_closed

The number of sessions that have been closed.
- Mysqlx_sessions_fatal_error

The number of sessions that have closed with a fatal error.
- Mysqlx_sessions_killed

The number of sessions which have been killed.
- Mysqlx_sessions_rejected

The number of session attempts which have been rejected.
- Mysqlx_socket

The Unix socket which X Plugin is listening to.
- Mysqlx_ssl_accept_renegotiates

The number of negotiations needed to establish the connection.
- Mysqlx_ssl_accepts

The number of accepted SSL connections.
- Mysqlx_ssl_active

If $S S L$ is active.
- Mysqlx_ssl_cipher

The current SSL cipher (empty for non-SSL connections).
- Mysqlx_ssl_cipher_list

A list of possible SSL ciphers (empty for non-SSL connections).
- Mysqlx_ssl_ctx_verify_depth

The certificate verification depth limit currently set in ctx.
- Mysqlx_ssl_ctx_verify_mode

The certificate verification mode currently set in ctx.
- Mysqlx_ssl_finished_accepts

The number of successful SSL connections to the server.
- Mysqlx_ssl_server_not_after

The last date for which the SSL certificate is valid.
- Mysqlx_ssl_server_not_before

The first date for which the SSL certificate is valid.
- Mysqlx_ssl_verify_depth

The certificate verification depth for SSL connections.
- Mysqlx_ssl_verify_mode

The certificate verification mode for SSL connections.
- Mysqlx_ssl_version

The name of the protocol used for SSL connections.
- Mysqlx_stmt_create_collection

The number of create collection statements received.
- Mysqlx_stmt_create_collection_index

The number of create collection index statements received.
- Mysqlx_stmt_disable_notices

The number of disable notice statements received.
- Mysqlx_stmt_drop_collection

The number of drop collection statements received.
- Mysqlx_stmt_drop_collection_index

The number of drop collection index statements received.
- Mysqlx_stmt_enable_notices

The number of enable notice statements received.
- Mysqlx_stmt_ensure_collection

The number of ensure collection statements received.
- Mysqlx_stmt_execute_mysqlx

The number of StmtExecute messages received with namespace set to mysqlx.
- Mysqlx_stmt_execute_sql

The number of StmtExecute requests received for the SQL namespace.
- Mysqlx_stmt_execute_xplugin

This status variable is no longer used.
- Mysqlx_stmt_get_collection_options

The number of get collection object statements received.
- Mysqlx_stmt_kill_client

The number of kill client statements received.
- Mysqlx_stmt_list_clients

The number of list client statements received.
- Mysqlx_stmt_list_notices

The number of list notice statements received.
- Mysqlx_stmt_list_objects

The number of list object statements received.
- Mysqlx_stmt_modify_collection_options

The number of modify collection options statements received.
- Mysqlx_stmt_ping

The number of ping statements received.
- Mysqlx_worker_threads

The number of worker threads available.
- Mysqlx_worker_threads_active

The number of worker threads currently used.

\subsection*{22.5.7 Monitoring X Plugin}

For general X Plugin monitoring, use the status variables that it exposes. See Section 22.5.6.3, "X Plugin Status Variables". For information specifically about monitoring the effects of message compression, see Monitoring Connection Compression for X Plugin.

\section*{Monitoring SQL Generated by X Plugin}

This section describes how to monitor the SQL statements which X Plugin generates when you run X DevAPI operations. When you execute a CRUD statement, it is translated into SQL and executed against the server. To be able to monitor the generated SQL, the Performance Schema tables must be enabled. The SQL is registered under the performance_schema.events_statements_current, performance_schema.events_statements_history, and performance_schema.events_statements_history_long tables. The following example uses the world_x schema, imported as part of the quickstart tutorials in this section. We use MySQL Shell in Python mode, and the \sql command which enables you to issue SQL statements without changing to SQL mode. This is important, because if you instead try to switch to SQL mode, the procedure shows the result of this operation rather than the X DevAPI operation. The \sql command is used in the same way if you are using MySQL Shell in JavaScript mode.
1. Check if the events_statements_history consumer is enabled. Issue:
```
mysql-py> \sql SELECT enabled FROM performance_schema.setup_consumers WHERE NAME = 'events_statements_h.
+----------+
| enabled |
+---------+
| YES |
+---------+
```

2. Check if all instruments report data to the consumer. Issue:
mysql-py> \sql SELECT NAME, ENABLED, TIMED FROM performance_schema.setup_instruments WHERE NAME LIKE 's
If this statement reports at least one row, you need to enable the instruments. See Section 29.4, "Performance Schema Runtime Configuration".
3. Get the thread ID of the current connection. Issue:
mysql-py> \sql SELECT thread_id INTO @id FROM performance_schema.threads WHERE processlist_id=conne
4. Execute the X DevAPI CRUD operation for which you want to see the generated SQL. For example, issue:
```
mysql-py> db.CountryInfo.find("Name = :country").bind("country", "Italy")
```


You must not issue any further operations for the next step to show the correct result.
5. Show the last SQL query made by this thread ID. Issue:
```
mysql-py> \sql SELECT THREAD_ID, MYSQL_ERRNO,SQL_TEXT FROM performance_schema.events_statements_his
+------------+--------------+-------------------------------------------------------------------------
| THREAD_ID | MYSQL_ERRNO | SQL_TEXT
+------------+--------------+---------------------------------------------------------------------------
| 29 | 0 | SELECT doc FROM ˋworld_xˋ.ˋCountryInfoˋ WHERE (JSON_EXTRACT(doc,'$.Name
+------------+--------------+----------------------------------------------------------------------------
```


The result shows the SQL generated by $X$ Plugin based on the most recent statement, in this case the X DevAPI CRUD operation from the previous step.

