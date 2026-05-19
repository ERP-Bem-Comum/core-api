\section*{Chapter 4 Downgrading MySQL}

\section*{Notes}
- Make sure you understand the MySQL release model for MySQL long-term support (LTS) and Innovation releases before proceeding with a downgrade.
- A replication topology is downgraded by following the rolling downgrade scheme described at Section 19.5.3, "Upgrading or Downgrading a Replication Topology", which uses one of the supported single-server methods for each individual server downgrade.
- Monthly Rapid Updates (MRUs) and hot fixes also count as releases in this documentation.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 4.1 Downgrade Paths for MySQL Server}
\begin{tabular}{|l|l|l|}
\hline Downgrade Path & Path Examples & Supported Do \\
\hline Within an LTS series & 8.4.y LTS to 8.4.x LTS & In-place, logica \\
\hline From an LTS or Bugfix series to the previous LTS or Bugfix series & 8.4.x LTS to 8.0.y & Logical dump a \\
\hline From an LTS or Bugfix series to an Innovation series after the previous LTS series & 8.4.x LTS to 8.3.0 Innovation & Logical dump a \\
\hline From within an Innovation series & 9.6 to 9.6 & Logical dump a \\
\hline
\end{tabular}
\end{table}

Downgrading to MySQL 5.7 or earlier is not supported.

