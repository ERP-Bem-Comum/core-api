\section*{Chapter 23 InnoDB Cluster}

This chapter introduces MySQL InnoDB Cluster, which combines MySQL technologies to enable you to deploy and administer a complete integrated high availability solution for MySQL. This content is a high-level overview of InnoDB Cluster, for full documentation, see MySQL InnoDB Cluster.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3847.jpg?height=125&width=111&top_left_y=520&top_left_x=360)

\section*{Important}

InnoDB Cluster does not provide support for MySQL NDB Cluster. For more information about MySQL NDB Cluster, see Chapter 25, MySQL NDB Cluster 8.4 and Section 25.2.6, "MySQL Server Using InnoDB Compared with NDB Cluster".

An InnoDB Cluster consists of at least three MySQL Server instances, and it provides high-availability and scaling features. InnoDB Cluster uses the following MySQL technologies:
- MySQL Shell, which is an advanced client and code editor for MySQL.
- MySQL Server, and Group Replication, which enables a set of MySQL instances to provide highavailability. InnoDB Cluster provides an alternative, easy to use programmatic way to work with Group Replication.
- MySQL Router, a lightweight middleware that provides transparent routing between your application and InnoDB Cluster.

The following diagram shows an overview of how these technologies work together:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 23.1 InnoDB Cluster overview}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3847.jpg?height=935&width=805&top_left_y=1446&top_left_x=349}
\end{figure}

Being built on MySQL Group Replication, provides features such as automatic membership management, fault tolerance, automatic failover, and so on. An InnoDB Cluster usually runs in a singleprimary mode, with one primary instance (read-write) and multiple secondary instances (read-only). Advanced users can also take advantage of a multi-primary mode, where all instances are primaries. You can even change the topology of the cluster while InnoDB Cluster is online, to ensure the highest possible availability.

You work with InnoDB Cluster using the AdminAPI, provided as part of MySQL Shell. AdminAPI is available in JavaScript and Python, and is well suited to scripting and automation of deployments of MySQL to achieve high-availability and scalability. By using MySQL Shell's AdminAPI, you can avoid the need to configure many instances manually. Instead, AdminAPI provides an effective modern interface to sets of MySQL instances and enables you to provision, administer, and monitor your deployment from one central tool.

To get started with InnoDB Cluster you need to download and install MySQL Shell. You need some hosts with MySQL Server instances installed, and you can also install MySQL Router.

InnoDB Cluster supports MySQL Clone, which enables you to provision instances simply. In the past, to provision a new instance before it joins a set of MySQL instances you would need to somehow manually transfer the transactions to the joining instance. This could involve making file copies, manually copying them, and so on. Using InnoDB Cluster, you can simply add an instance to the cluster and it is automatically provisioned.

Similarly, InnoDB Cluster is tightly integrated with MySQL Router, and you can use AdminAPI to work with them together. MySQL Router can automatically configure itself based on an InnoDB Cluster, in a process called bootstrapping, which removes the need for you to configure routing manually. MySQL Router then transparently connects client applications to the InnoDB Cluster, providing routing and load-balancing for client connections. This integration also enables you to administer some aspects of a MySQL Router bootstrapped against an InnoDB Cluster using AdminAPI. InnoDB Cluster status information includes details about MySQL Routers bootstrapped against the cluster. Operations enable you to create MySQL Router users at the cluster level, to work with the MySQL Routers bootstrapped against the cluster, and so on.

For more information on these technologies, see the user documentation linked in the descriptions. In addition to this user documentation, there is developer documentation for all AdminAPI methods in the MySQL Shell JavaScript API Reference or MySQL Shell Python API Reference, available from Connectors and APIs.

