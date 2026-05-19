\section*{7．1．5 Server System Variable Reference}

The following table lists all system variables applicable within mysqld．
The table lists command－line options（Cmd－line），options valid in configuration files（Option file），server system variables（System Var），and status variables（Status var）in one unified list，with an indication of where each option or variable is valid．If a server option set on the command line or in an option file differs from the name of the corresponding system variable，the variable name is noted immediately below the corresponding option．The scope of the variable（Var Scope）is Global，Session，or both． Please see the corresponding item descriptions for details on setting and using the variables．Where appropriate，direct links to further information about the items are provided．

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 7．2 System Variable Summary}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Var Scope & Dynamic \\
\hline activate＿all＿role & Yer＿login & Yes & Yes & Global & Yes \\
\hline admin＿address & Yes & Yes & Yes & Global & No \\
\hline admin＿port & Yes & Yes & Yes & Global & No \\
\hline admin＿ssl＿ca & Yes & Yes & Yes & Global & Yes \\
\hline admin＿ssl＿capatt & Yes & Yes & Yes & Global & Yes \\
\hline admin＿ssl＿cert & Yes & Yes & Yes & Global & Yes \\
\hline admin＿ssl＿cipher & Yes & Yes & Yes & Global & Yes \\
\hline admin＿ssl＿crl & Yes & Yes & Yes & Global & Yes \\
\hline admin＿ssl＿crlpati & Yes & Yes & Yes & Global & Yes \\
\hline admin＿ssl＿key & Yes & Yes & Yes & Global & Yes \\
\hline admin＿tls＿cipher & Huites & Yes & Yes & Global & Yes \\
\hline admin＿tls＿versio & ryes & Yes & Yes & Global & Yes \\
\hline audit＿log＿buffer & Fies & Yes & Yes & Global & No \\
\hline audit＿log＿compr & resesion & Yes & Yes & Global & No \\
\hline audit＿log＿conne & cłies＿policy & Yes & Yes & Global & Yes \\
\hline audit＿log＿current & t＿session & & Yes & Both & No \\
\hline audit＿log＿databa & ayes & Yes & Yes & Global & No \\
\hline audit＿log＿disabl & eYes & Yes & Yes & Global & Yes \\
\hline audit＿log＿encryp & সি⿱⿴囗十介⿰⿱丶㇀⿱㇒丶寸犬 & Yes & Yes & Global & No \\
\hline audit＿log＿exclud & \＆esccounts & Yes & Yes & Global & Yes \\
\hline audit＿log＿file & Yes & Yes & Yes & Global & No \\
\hline audit＿log＿filter＿id & & & Yes & Both & No \\
\hline audit＿log＿flush & & & Yes & Global & Yes \\
\hline audit＿log＿flush＿ & Mesval＿seconds & & Yes & Global & No \\
\hline audit＿log＿format & Yes & Yes & Yes & Global & No \\
\hline audit＿log＿format & Yesix＿timestamp & Yes & Yes & Global & Yes \\
\hline audit＿log＿includ & eYescounts & Yes & Yes & Global & Yes \\
\hline audit＿log＿passw & dfes history＿keep & Ydrs & Yes & Global & Yes \\
\hline audit＿log＿policy & Yes & Yes & Yes & Global & No \\
\hline audit＿log＿prune & besonds & Yes & Yes & Global & Yes \\
\hline audit＿log＿read＿b & bMffer＿size & Yes & Yes & Both & Yes \\
\hline audit＿log＿rotate & øressize & Yes & Yes & Global & Yes \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Var Scope & Dynamic \\
\hline audit＿log＿statem & rets＿policy & Yes & Yes & Global & Yes \\
\hline audit＿log＿strategy & Yes & Yes & Yes & Global & No \\
\hline authentication＿ke & Yesros＿service＿ & Kestab & Yes & Global & No \\
\hline authentication＿k & eYesros＿service & præcipal & Yes & Global & Yes \\
\hline authentication＿ld & \＆（せssasl＿auth＿me & eYosd＿name & Yes & Global & Yes \\
\hline authentication＿Id & dr ®ssasl＿bind＿ba & scesdn & Yes & Global & Yes \\
\hline authentication＿Id & dassasl＿bind＿roo & OYes\＄n & Yes & Global & Yes \\
\hline authentication＿Id & dassasl＿bind＿roo & Yeswd & Yes & Global & Yes \\
\hline authentication＿ld & dressasl＿ca＿path & Yes & Yes & Global & Yes \\
\hline authentication＿lc & \＆®ssasl＿connect & Ytrseout & Yes & Global & Yes \\
\hline authentication＿Id & dr（rssasl＿group＿s & s\＆\＃ch＿attr & Yes & Global & Yes \\
\hline authentication＿Id & dr（rsasl＿group＿s & s\＆ash＿filter & Yes & Global & Yes \\
\hline authentication＿ld & dłessasl＿init＿pool & Yeise & Yes & Global & Yes \\
\hline authentication＿Id & dr（rssasl＿log＿stat & ULes & Yes & Global & Yes \\
\hline authentication＿ld & dr（rssasl＿max＿po & dłesize & Yes & Global & Yes \\
\hline authentication＿Id & daressasl＿referral & Yes & Yes & Global & Yes \\
\hline authentication＿ld & \＆ $\mathbf{a} \boldsymbol{\text { r}} \boldsymbol{\text { ssasl＿respons }}$ & \＆tsmeout & Yes & Global & Yes \\
\hline authentication＿ld & dressasl＿server＿h & hibes & Yes & Global & Yes \\
\hline authentication＿ld & dr（rssasl＿server＿p & pbets & Yes & Global & Yes \\
\hline authentication＿ld & dr（rssasl＿tls & Yes & Yes & Global & Yes \\
\hline authentication＿Id & \＆（せssasl＿user＿se & ałreb＿attr & Yes & Global & Yes \\
\hline authentication＿Id & dr（＿ssimple＿auth & Meshod＿name & Yes & Global & Yes \\
\hline authentication＿ld & \＆（rssimple＿bind & Daesse＿dn & Yes & Global & Yes \\
\hline authentication＿Id & dressimple＿bind & roes＿dn & Yes & Global & Yes \\
\hline authentication＿Id & dr（rssimple＿bind＿ & resp＿pwd & Yes & Global & Yes \\
\hline authentication＿ld & daressimple＿ca＿pa & aYRes & Yes & Global & Yes \\
\hline authentication＿Id & darssimple＿conne & erestimeout & Yes & Global & Yes \\
\hline authentication＿Id & dassimple＿group & Yosarch＿attr & Yes & Global & Yes \\
\hline authentication＿Id & \＆（1）ssimple＿group & Ysarch＿filter & Yes & Global & Yes \\
\hline authentication＿Id & \＆®ssimple＿init＿p & dodssize & Yes & Global & Yes \\
\hline authentication＿Id & dł（rssimple＿log＿st & styess & Yes & Global & Yes \\
\hline authentication＿Id & dassimple＿max & Pood size & Yes & Global & Yes \\
\hline authentication＿ld & dłrssimple＿referr & ales & Yes & Global & Yes \\
\hline authentication＿Id & dr（rssimple＿respo & Nos＿timeout & Yes & Global & Yes \\
\hline authentication＿ld & \＆（せssimple＿serve & Yesst & Yes & Global & Yes \\
\hline authentication＿ld & dasssimple＿serve & Yesrt & Yes & Global & Yes \\
\hline authentication＿Id & \＆畕ssimple＿tls & Yes & Yes & Global & Yes \\
\hline authentication＿Ida & das＿ssimple＿user＿ & \＆ch＿attr & Yes & Global & Yes \\
\hline authentication＿po & ories & Yes & Yes & Global & Yes \\
\hline authentication＿w & duthn＿rp＿id & Yes & Yes & Global & Yes \\
\hline authentication＿w & Médews＿log＿level & Yes & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Var Scope & Dynamic \\
\hline authentication＿w & imedews＿use＿prin & CHamel＿name & Yes & Global & No \\
\hline auto＿generate＿c & déces & Yes & Yes & Global & No \\
\hline auto＿increment & imesement & Yes & Yes & Both & Yes \\
\hline auto＿increment & dfeset & Yes & Yes & Both & Yes \\
\hline autocommit & Yes & Yes & Yes & Both & Yes \\
\hline automatic＿sp＿pri & iViesges & Yes & Yes & Global & Yes \\
\hline back＿log & Yes & Yes & Yes & Global & No \\
\hline basedir & Yes & Yes & Yes & Global & No \\
\hline big＿tables & Yes & Yes & Yes & Both & Yes \\
\hline bind＿address & Yes & Yes & Yes & Global & No \\
\hline binlog＿cache＿siz & とes & Yes & Yes & Global & Yes \\
\hline binlog＿checksum & Yes & Yes & Yes & Global & Yes \\
\hline binlog＿direct＿non & Yewsansactional＿4 & pestes & Yes & Both & Yes \\
\hline binlog＿encryption & nYes & Yes & Yes & Global & Yes \\
\hline binlog＿error＿actid & dfes & Yes & Yes & Global & Yes \\
\hline binlog＿expire＿log & gsesuto＿purge & Yes & Yes & Global & Yes \\
\hline binlog＿expire＿log & greseconds & Yes & Yes & Global & Yes \\
\hline binlog＿format & Yes & Yes & Yes & Both & Yes \\
\hline & binlog＿group＿conmest＿sync＿delay & Yes & Yes & Global & Yes \\
\hline binlog＿group＿cor & Mest＿sync＿no＿d & eYæs＿count & Yes & Global & Yes \\
\hline binlog＿gtid＿simp & éesecovery & Yes & Yes & Global & No \\
\hline binlog＿max＿flush & Yeqseue＿time & Yes & Yes & Global & Yes \\
\hline binlog＿order＿com & Treiss & Yes & Yes & Global & Yes \\
\hline binlog＿rotate＿end & dfestion＿master＿ & Afegs＿at＿startup & Yes & Global & No \\
\hline binlog＿row＿event & tresax＿size & Yes & Yes & Global & No \\
\hline binlog＿row＿image & \＆es & Yes & Yes & Both & Yes \\
\hline binlog＿row＿metad & \＆ & Yes & Yes & Global & Yes \\
\hline binlog＿row＿valueY & eyestions & Yes & Yes & Both & Yes \\
\hline binlog＿rows＿quer & NYesog＿events & Yes & Yes & Both & Yes \\
\hline binlog＿stmt＿cach & yésize & Yes & Yes & Global & Yes \\
\hline binlog＿transactio & Yesompression & Yes & Yes & Both & Yes \\
\hline binlog＿transactio & Yesompression & edes＿zstd & Yes & Both & Yes \\
\hline binlog＿transactio & Yesependency＿h & hisessy＿size & Yes & Global & Yes \\
\hline block＿encryption & Yresde & Yes & Yes & Both & Yes \\
\hline build＿id & & & Yes & Global & No \\
\hline bulk＿insert＿buffe & Yesżze & Yes & Yes & Both & Yes \\
\hline caching＿sha2＿p & alses／ord＿auto＿ge & Yesste＿rsa＿keys & Yes & Global & No \\
\hline caching＿sha2＿pa & alsess／ord＿digest＿v & duesds & Yes & Global & Yes \\
\hline caching＿sha2＿pa & alsess／ord＿private＿ & Adgs＿path & Yes & Global & No \\
\hline caching＿sha2＿pa & asess／ord＿public＿k & 它的ath & Yes & Global & No \\
\hline \multicolumn{2}{|l|}{character＿set＿client} & & Yes & Both & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline character_set_co & onnection & & Yes & Both & Yes \\
\hline character_set_da (note 1) & atabase & & Yes & Both & Yes \\
\hline character_set_fil & esestem & Yes & Yes & Both & Yes \\
\hline character_set_re & sults & & Yes & Both & Yes \\
\hline character_set_se & Mess & Yes & Yes & Both & Yes \\
\hline character_set_sy & stem & & Yes & Global & No \\
\hline character_sets_d & dlyes & Yes & Yes & Global & No \\
\hline check_proxy_use & eyces & Yes & Yes & Global & Yes \\
\hline clone_autotune_ & doencurrency & Yes & Yes & Global & Yes \\
\hline clone_block_ddl & Yes & Yes & Yes & Global & Yes \\
\hline clone_buffer_size & eYes & Yes & Yes & Global & Yes \\
\hline clone_ddl_timeo & MYes & Yes & Yes & Global & Yes \\
\hline clone_delay_after & Yelsta_drop & Yes & Yes & Global & Yes \\
\hline clone_donor_time & ecœs_after_netwo & Mésailure & Yes & Global & Yes \\
\hline clone_enable_co & mesession & Yes & Yes & Global & Yes \\
\hline clone_max_conq & UMesncy & Yes & Yes & Global & Yes \\
\hline clone_max_data & Yeasidwidth & Yes & Yes & Global & Yes \\
\hline clone_max_netwo & dres bandwidth & Yes & Yes & Global & Yes \\
\hline clone_ssl_ca & Yes & Yes & Yes & Global & Yes \\
\hline clone_ssl_cert & Yes & Yes & Yes & Global & Yes \\
\hline clone_ssl_key & Yes & Yes & Yes & Global & Yes \\
\hline clone_valid_don & Yelsst & Yes & Yes & Global & Yes \\
\hline collation_conned & tion & & Yes & Both & Yes \\
\hline collation_databa (note 1) & se & & Yes & Both & Yes \\
\hline collation_server & Yes & Yes & Yes & Both & Yes \\
\hline completion_type & Yes & Yes & Yes & Both & Yes \\
\hline component_mas & Kires. dictionaries & flessh_interval_se & cheas & Global & No \\
\hline component_mas & Kires. masking_dat & adrosse & Yes & Global & No \\
\hline component_sche & \& reler.enabled & Yes & Yes & Global & Yes \\
\hline concurrent_insertt & tYes & Yes & Yes & Global & Yes \\
\hline connect_timeout & Yes & Yes & Yes & Global & Yes \\
\hline connection_cont & あle\$ailed_connec & titerss_threshold & Yes & Global & Yes \\
\hline connection_cont & ølesnax_connecti & dresdelay & Yes & Global & Yes \\
\hline connection_cont & あlesnin_connectio & Yeslelay & Yes & Global & Yes \\
\hline connection_mem & '\&es_chunk_size & Yes & Yes & Both & Yes \\
\hline connection_mem & 'σ(2) limit & Yes & Yes & Both & Yes \\
\hline core_file & & & Yes & Global & No \\
\hline create_admin_lis & steesr_thread & Yes & Yes & Global & No \\
\hline cte_max_recursi & oreslepth & Yes & Yes & Both & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline datadir & Yes & Yes & Yes & Global & No \\
\hline debug & Yes & Yes & Yes & Both & Yes \\
\hline debug_sync & & & Yes & Session & Yes \\
\hline default_collation & for_utf8mb4 & & Yes & Both & Yes \\
\hline default_passwor & dYdifetime & Yes & Yes & Global & Yes \\
\hline default_storage_ & Afegine & Yes & Yes & Both & Yes \\
\hline default_table_en & creestion & Yes & Yes & Both & Yes \\
\hline default_tmp_stor & adges_engine & Yes & Yes & Both & Yes \\
\hline default_week_fo & Med & Yes & Yes & Both & Yes \\
\hline delay_key_write & Yes & Yes & Yes & Global & Yes \\
\hline delayed_insert_li & mes & Yes & Yes & Global & Yes \\
\hline delayed_insert_ti & imesut & Yes & Yes & Global & Yes \\
\hline delayed_queue_ & SYAES & Yes & Yes & Global & Yes \\
\hline disabled_storage & Yesgines & Yes & Yes & Global & No \\
\hline disconnect_on_e & \#med_password & Yes & Yes & Global & No \\
\hline div_precision_inc & Measent & Yes & Yes & Both & Yes \\
\hline dragnet.log_error & Y的lser_rules & Yes & Yes & Global & Yes \\
\hline end_markers_in & jsess & Yes & Yes & Both & Yes \\
\hline enforce_gtid_con & \$iesency & Yes & Yes & Global & Yes \\
\hline enterprise_encryp & pterso.maximum_r & \$áskey_size & Yes & Global & Yes \\
\hline enterprise_encryp & ptiest.rsa_suppor & Yesacy_padding & Yes & Global & Yes \\
\hline eq_range_index & Der_limit & Yes & Yes & Both & Yes \\
\hline error_count & & & Yes & Session & No \\
\hline event_scheduler & Yes & Yes & Yes & Global & Yes \\
\hline explain_format & Yes & Yes & Yes & Both & Yes \\
\hline explain_json_for & Yats version & Yes & Yes & Both & Yes \\
\hline explicit_defaults & Hoxstimestamp & Yes & Yes & Both & Yes \\
\hline external_user & & & Yes & Session & No \\
\hline flush & Yes & Yes & Yes & Global & Yes \\
\hline flush_time & Yes & Yes & Yes & Global & Yes \\
\hline foreign_key_chec & ks & & Yes & Both & Yes \\
\hline ft_boolean_synta & Xes & Yes & Yes & Global & Yes \\
\hline ft_max_word_len & Yes & Yes & Yes & Global & No \\
\hline ft_min_word_len & Yes & Yes & Yes & Global & No \\
\hline ft_query_expansi & \&ieslimit & Yes & Yes & Global & No \\
\hline ft_stopword_file & Yes & Yes & Yes & Global & No \\
\hline general_log & Yes & Yes & Yes & Global & Yes \\
\hline general_log_file & Yes & Yes & Yes & Global & Yes \\
\hline generated_rando & Mespassword_len & gttes & Yes & Both & Yes \\
\hline global_connectio & Yessemory_limit & Yes & Yes & Global & Yes \\
\hline global_connectio & Yesiemory_track & Yres & Yes & Both & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Var Scope & Dynamic \\
\hline group＿concat＿m & ałesen & Yes & Yes & Both & Yes \\
\hline group＿replication & Yedvertise＿recov & 戞笽 endpoints & Yes & Global & Yes \\
\hline group＿replication & Yel\＄ow＿local＿low & \＆es／ersion＿join & Yes & Global & Yes \\
\hline group＿replication & Yesto＿increment & Yiesrement & Yes & Global & Yes \\
\hline group＿replication & Yestorejoin＿tries & Yes & Yes & Global & Yes \\
\hline group＿replication & Yesotstrap＿group & pYes & Yes & Global & Yes \\
\hline group＿replication & Yelsne＿threshold & dYes & Yes & Global & Yes \\
\hline group＿replication & Yesmmunication & Yebug＿options & Yes & Global & Yes \\
\hline group＿replication & Yesmmunication & Yesx＿message＿ & słyes & Global & Yes \\
\hline group＿replication & ＿communication & stack & Yes & Global & Yes \\
\hline group＿replication & Yesmponents＿st & odpesimeout & Yes & Global & Yes \\
\hline group＿replication & Yesmpression＿th & hireeshold & Yes & Global & Yes \\
\hline group＿replication & Yesnsistency & Yes & Yes & Both & Yes \\
\hline group＿replication & Yesforce＿update & Yeserywhere＿ch & etes & Global & Yes \\
\hline group＿replication & Yesit＿state＿actio & Yes & Yes & Global & Yes \\
\hline group＿replication & Y\＆sw＿control＿app & plest＿threshold & Yes & Global & Yes \\
\hline group＿replication & Y\＆sw＿control＿cer & Mieisr＿threshold & Yes & Global & Yes \\
\hline group＿replication & Y\＆sw＿control＿hol & Mespercent & Yes & Global & Yes \\
\hline group＿replication & Y\＆sw＿control＿ma & akesquota & Yes & Global & Yes \\
\hline group＿replication & Y\＆sw＿control＿me & eryelser＿quota＿pe & deast & Global & Yes \\
\hline group＿replication & Y\＆sw＿control＿min & Yesquota & Yes & Global & Yes \\
\hline group＿replication & Y\＆sw＿control＿mi & Yesecovery＿quotał & aYes & Global & Yes \\
\hline group＿replication & Y\＆sw＿control＿mo & orles & Yes & Global & Yes \\
\hline group＿replication & Y\＆sw＿control＿pe & HYes & Yes & Global & Yes \\
\hline group＿replication & Y\＆sw＿control＿rel & \＆ase＿percent & Yes & Global & Yes \\
\hline group＿replication & Yesce＿members & Yes & Yes & Global & Yes \\
\hline group＿replication & Yegsoup＿name & Yes & Yes & Global & Yes \\
\hline group＿replication & Yegsoup＿seeds & Yes & Yes & Global & Yes \\
\hline group＿replication & Yegsd＿assignmen & Yes\＄ock＿size & Yes & Global & Yes \\
\hline group＿replication & Y甲s＿allowlist & Yes & Yes & Global & Yes \\
\hline group＿replication & Yecal＿address & Yes & Yes & Global & Yes \\
\hline group＿replication & Yerember＿expel & Yineout & Yes & Global & Yes \\
\hline group＿replication & Yerember＿weight & Yes & Yes & Global & Yes \\
\hline group＿replication & \multicolumn{2}{|l|}{Yeressage＿cacheYesże} & Yes & Global & Yes \\
\hline group＿replication & Yeaxos＿single＿le & lekels & Yes & Global & Yes \\
\hline group＿replication & Yesll＿spin＿loops & Yes & Yes & Global & Yes \\
\hline group＿replication & Yereemptive＿gar & Drase＿collection & Yes & Global & Yes \\
\hline group＿replication & Yeseemptive＿gar & ræme＿collection & róas＿threshold & Global & Yes \\
\hline group＿replication & Yescovery＿compr & neesion＿algorithn & wes & Global & Yes \\
\hline group＿replication & Yescovery＿get＿pu & DOPED & Yes & Global & Yes \\
\hline group＿replication & Yescovery＿public & Yesy＿path & Yes & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline group_replication & Yessovery_recon & Ness_interval & Yes & Global & Yes \\
\hline group_replication & Yescovery_retry & doasnt & Yes & Global & Yes \\
\hline group_replication & Yescovery_ssl_ca & aYes & Yes & Global & Yes \\
\hline group_replication & Yescovery_ssl_ca & apesh & Yes & Global & Yes \\
\hline group_replication & Yescovery_ssl_ce & eYtes & Yes & Global & Yes \\
\hline group_replication & Yescovery_ssl_c & M'G1 & Yes & Global & Yes \\
\hline group_replication & Yescovery_ssl_c & Yes & Yes & Global & Yes \\
\hline group_replication & Yescovery_ssl_c & Mpesh & Yes & Global & Yes \\
\hline group_replication & Yescovery_ssl_ke & eyes & Yes & Global & Yes \\
\hline group_replication & Yescovery_ssl_ve & eYies_server_cert & Yes & Global & Yes \\
\hline group_replication & Yescovery_tls_cip & pKessuites & Yes & Global & Yes \\
\hline group_replication & Yescovery_tls_ve & issessn & Yes & Global & Yes \\
\hline group_replication & Yescovery_use_\$ & \$\$les & Yes & Global & Yes \\
\hline group_replication & Yescovery_zstd & chespression_lev & eYes & Global & Yes \\
\hline group_replicationY & Yesisgle_primary & Mresde & Yes & Global & Yes \\
\hline group_replication & Yesl_mode & Yes & Yes & Global & Yes \\
\hline group_replication & Yestart_on_boot & Yes & Yes & Global & Yes \\
\hline group_replication & Yes_source & Yes & Yes & Global & Yes \\
\hline group_replication & Yeansaction_siz & Yernit & Yes & Global & Yes \\
\hline group_replication & Yesreachable_m & adesity_timeout & Yes & Global & Yes \\
\hline group_replication & Yesw_change_4 & uvies & Yes & Global & Yes \\
\hline gtid_executed & & & Yes & Global & No \\
\hline gtid_executed_c & oriepsression_perio & dres & Yes & Global & Yes \\
\hline gtid_mode & Yes & Yes & Yes & Global & Yes \\
\hline gtid_next & & & Yes & Session & Yes \\
\hline gtid_owned & & & Yes & Both & No \\
\hline gtid_purged & & & Yes & Global & Yes \\
\hline have_compress & & & Yes & Global & No \\
\hline have_dynamic_l & oading & & Yes & Global & No \\
\hline have_geometry & & & Yes & Global & No \\
\hline have_profiling & & & Yes & Global & No \\
\hline have_query_cache & & & Yes & Global & No \\
\hline have_rtree_keys & & & Yes & Global & No \\
\hline have_statement_t & timeout & & Yes & Global & No \\
\hline have_symlink & & & Yes & Global & No \\
\hline histogram_gener & ðtésn_max_mem & Sese & Yes & Both & Yes \\
\hline host_cache_size & Yes & Yes & Yes & Global & Yes \\
\hline hostname & & & Yes & Global & No \\
\hline identity & & & Yes & Session & Yes \\
\hline immediate_server_version & & & Yes & Session & Yes \\
\hline information_sche & Mes_stats_expiry & Yes & Yes & Both & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline init_connect & Yes & Yes & Yes & Global & Yes \\
\hline init_file & Yes & Yes & Yes & Global & No \\
\hline init_replica & Yes & Yes & Yes & Global & Yes \\
\hline init_slave & Yes & Yes & Yes & Global & Yes \\
\hline innodb_adaptive & Yleshing & Yes & Yes & Global & Yes \\
\hline innodb_adaptive & Yleshing_lwm & Yes & Yes & Global & Yes \\
\hline innodb_adaptive & Yessh_index & Yes & Yes & Global & Yes \\
\hline innodb_adaptive & Yesh_index_par & t\&es & Yes & Global & No \\
\hline innodb_adaptive & Yesx_sleep_dela & Yes & Yes & Global & Yes \\
\hline innodb_autoexter & ndęśncrement & Yes & Yes & Global & Yes \\
\hline innodb_autoinc_ & l'''ds_mode & Yes & Yes & Global & No \\
\hline innodb_backgrou & uresdrop_list_em & ptes & Yes & Global & Yes \\
\hline innodb_buffer_po & obeschunk_size & Yes & Yes & Global & No \\
\hline innodb_buffer_p & oresdebug & Yes & Yes & Global & No \\
\hline innodb_buffer_po & oresdump_at_shu & Mdesvn & Yes & Global & Yes \\
\hline innodb_buffer_po & oresdump_now & Yes & Yes & Global & Yes \\
\hline innodb_buffer_po & oresdump_pct & Yes & Yes & Global & Yes \\
\hline innodb_buffer_po & oresfilename & Yes & Yes & Global & Yes \\
\hline innodb_buffer_po & obesin_core_file & Yes & Yes & Global & Yes \\
\hline innodb_buffer_p & oresinstances & Yes & Yes & Global & No \\
\hline innodb_buffer_po & oresoad_abort & Yes & Yes & Global & Yes \\
\hline innodb_buffer_po & oresoad_at_start & uripes & Yes & Global & No \\
\hline innodb_buffer_po & oresoad_now & Yes & Yes & Global & Yes \\
\hline innodb_buffer_po & oressize & Yes & Yes & Global & Yes \\
\hline innodb_change_ & b) \&\&er_max_size & Yes & Yes & Global & Yes \\
\hline innodb_change_ & D)(psering & Yes & Yes & Global & Yes \\
\hline innodb_change_ & D) ffsering_debug & Yes & Yes & Global & Yes \\
\hline innodb_checkpo & Meslisabled & Yes & Yes & Global & Yes \\
\hline innodb_checksur & Yesigorithm & Yes & Yes & Global & Yes \\
\hline innodb_cmp_per & Yiesex_enabled & Yes & Yes & Global & Yes \\
\hline innodb_commit_ & cbesurrency & Yes & Yes & Global & Yes \\
\hline innodb_compress & SYekebug & Yes & Yes & Global & Yes \\
\hline innodb_compres & SYMS_failure_thres & Melst_pct & Yes & Global & Yes \\
\hline innodb_compress & sices_level & Yes & Yes & Global & Yes \\
\hline innodb_compres & sí@s_pad_pct_ma & aXes & Yes & Global & Yes \\
\hline innodb_concurrer & nags_tickets & Yes & Yes & Global & Yes \\
\hline innodb_data_file & Yeesh & Yes & Yes & Global & No \\
\hline innodb_data_ho & Meesdir & Yes & Yes & Global & No \\
\hline innodb_ddl_buffe & ressze & Yes & Yes & Session & Yes \\
\hline innodb_ddl_log_ & CYæsh_reset_debu & uges & Yes & Global & Yes \\
\hline innodb_ddl_threa & ades & Yes & Yes & Session & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline innodb_deadlock Yestect & & Yes & Yes & Global & Yes \\
\hline innodb_dedicatedYeserver & & Yes & Yes & Global & No \\
\hline innodb_default_rdwesformat & & Yes & Yes & Global & Yes \\
\hline innodb_directorie\$es & & Yes & Yes & Global & No \\
\hline innodb_disable_sbess file_cache & & Yes & Yes & Global & Yes \\
\hline innodb_doublewriYes & & Yes & Yes & Global & Yes \\
\hline innodb_doublewrYæsbatch_size & & Yes & Yes & Global & No \\
\hline innodb_doublewrYesdir & & Yes & Yes & Global & No \\
\hline innodb_doublewriYesfiles & & Yes & Yes & Global & No \\
\hline innodb_doublewrYespages & & Yes & Yes & Global & No \\
\hline innodb_extend_alresinitialize & & Yes & Yes & Global & Yes \\
\hline innodb_fast_shutc'ewn & & Yes & Yes & Global & Yes \\
\hline innodb_fil_make_Yesje_dirty_debu & & Mes & Yes & Global & Yes \\
\hline innodb_file_per_taleke & & Yes & Yes & Global & Yes \\
\hline innodb_fill_factorYes & & Yes & Yes & Global & Yes \\
\hline innodb_flush_log & Yats timeout & Yes & Yes & Global & Yes \\
\hline innodb_flush_log_ & Yæts_trx_commit & Yes & Yes & Global & Yes \\
\hline innodb_flush_mev & Thesl & Yes & Yes & Global & No \\
\hline innodb_flush_neig & gledsors & Yes & Yes & Global & Yes \\
\hline innodb_flush_syn & res & Yes & Yes & Global & Yes \\
\hline innodb_flushing_ & Ahes_loops & Yes & Yes & Global & Yes \\
\hline innodb_force_load & Wesorrupted & Yes & Yes & Global & No \\
\hline innodb_force_rec & creery & Yes & Yes & Global & No \\
\hline innodb_fsync_thr & \&alsold & Yes & Yes & Global & Yes \\
\hline innodb_ft_aux_tab & able & & Yes & Global & Yes \\
\hline innodb_ft_cache & Yese & Yes & Yes & Global & No \\
\hline innodb_ft_enableY & Yeig _print & Yes & Yes & Global & Yes \\
\hline innodb_ft_enable & Yespword & Yes & Yes & Both & Yes \\
\hline innodb_ft_max_td & tokest_size & Yes & Yes & Global & No \\
\hline innodb_ft_min_toM & Keis_size & Yes & Yes & Global & No \\
\hline innodb_ft_num_w & wœs_optimize & Yes & Yes & Global & Yes \\
\hline innodb_ft_result & \&ashe_limit & Yes & Yes & Global & Yes \\
\hline innodb_ft_server & Ystepword_table & Yes & Yes & Global & Yes \\
\hline innodb_ft_sort_plY & |Yekegree & Yes & Yes & Global & No \\
\hline innodb_ft_total_c & cyclse_size & Yes & Yes & Global & No \\
\hline innodb_ft_user_st & \$10¢sword_table & Yes & Yes & Both & Yes \\
\hline innodb_idle_flushY & $\underline{\underline{Y} \underline{\text { Yest }}}$ & Yes & Yes & Global & Yes \\
\hline innodb_io_capacì & ciłes & Yes & Yes & Global & Yes \\
\hline innodb_io_capacił & cikesmax & Yes & Yes & Global & Yes \\
\hline innodb_limit_optin & imessic_insert_deb & Mes & Yes & Global & Yes \\
\hline innodb_lock_wait & Yesteout & Yes & Yes & Both & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Var Scope & Dynamic \\
\hline innodb＿log＿buff & ressze & Yes & Yes & Global & Yes \\
\hline innodb＿log＿ched & Ansint＿fuzzy＿now & Wes & Yes & Global & Yes \\
\hline innodb＿log＿chec & Adsint＿now & Yes & Yes & Global & Yes \\
\hline innodb＿log＿ched & Asesms & Yes & Yes & Global & Yes \\
\hline innodb＿log＿comp & pressed＿pages & Yes & Yes & Global & Yes \\
\hline innodb＿log＿file＿ & SYZES & Yes & Yes & Global & No \\
\hline innodb＿log＿files & Yesgroup & Yes & Yes & Global & No \\
\hline innodb＿log＿group & p＿terome＿dir & Yes & Yes & Global & No \\
\hline innodb＿log＿spin & Yes＿abs＿lwm & Yes & Yes & Global & Yes \\
\hline innodb＿log＿spin & Yest＿pct＿hwm & Yes & Yes & Global & Yes \\
\hline innodb＿log＿wait & Yers flush＿spin＿h & WARS & Yes & Global & Yes \\
\hline innodb＿log＿write & Yælsead＿size & Yes & Yes & Global & Yes \\
\hline innodb＿log＿writev & Yelsreads & Yes & Yes & Global & Yes \\
\hline innodb＿Iru＿scan & Yespth & Yes & Yes & Global & Yes \\
\hline innodb＿max＿dirty & Yesiges＿pct & Yes & Yes & Global & Yes \\
\hline innodb＿max＿dirty & Y 巴⿴囗大列＿pct＿lwm & MYes & Yes & Global & Yes \\
\hline innodb＿max＿purg & gesag & Yes & Yes & Global & Yes \\
\hline innodb＿max＿purg & g＠esag＿delay & Yes & Yes & Global & Yes \\
\hline innodb＿max＿und & dresog＿size & Yes & Yes & Global & Yes \\
\hline innodb＿merge＿th & hYeshold＿set＿all & deesig & Yes & Global & Yes \\
\hline innodb＿monitor & dissble & Yes & Yes & Global & Yes \\
\hline innodb＿monitor＿ & etresble & Yes & Yes & Global & Yes \\
\hline innodb＿monitor & néest & Yes & Yes & Global & Yes \\
\hline innodb＿monitor & réest＿all & Yes & Yes & Global & Yes \\
\hline innodb＿numa＿int & tedeave & Yes & Yes & Global & No \\
\hline innodb＿old＿bloc & Krepct & Yes & Yes & Global & Yes \\
\hline innodb＿old＿bloc & Kesime & Yes & Yes & Global & Yes \\
\hline innodb＿online＿a & Iteeslog＿max＿size & eYes & Yes & Global & Yes \\
\hline innodb＿open＿file & \＆es & Yes & Yes & Global & Yes \\
\hline innodb＿optimize & Y（teldext＿only & Yes & Yes & Global & Yes \\
\hline innodb＿page＿cle & eyless & Yes & Yes & Global & No \\
\hline innodb＿page＿siz & yes & Yes & Yes & Global & No \\
\hline innodb＿parallel＿ & reas＿threads & Yes & Yes & Session & Yes \\
\hline innodb＿print＿all & desdlocks & Yes & Yes & Global & Yes \\
\hline innodb＿print＿ddl & Yess & Yes & Yes & Global & Yes \\
\hline innodb＿purge＿b & ałces＿size & Yes & Yes & Global & Yes \\
\hline innodb＿purge＿rs & \＆cestruncate＿freq & uœrscy & Yes & Global & Yes \\
\hline innodb＿purge＿th & néesls & Yes & Yes & Global & No \\
\hline innodb＿random & Néesl＿ahead & Yes & Yes & Global & Yes \\
\hline innodb＿read＿ahe & ekels threshold & Yes & Yes & Global & Yes \\
\hline innodb＿read＿io＿ & thresads & Yes & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline innodb_read_onl & yYes & Yes & Yes & Global & No \\
\hline innodb_redo_log & Yæshive_dirs & Yes & Yes & Global & Yes \\
\hline innodb_redo_log & Yespacity & Yes & Yes & Global & Yes \\
\hline innodb_redo_log & Yerscrypt & Yes & Yes & Global & Yes \\
\hline innodb_replicatior & Yeselay & Yes & Yes & Global & Yes \\
\hline innodb_rollback & drestimeout & Yes & Yes & Global & No \\
\hline innodb_rollback & \&egments & Yes & Yes & Global & Yes \\
\hline innodb_saved_p & alges_number_deb & Ưęs & Yes & Global & Yes \\
\hline innodb_segment & Yeserve_factor & Yes & Yes & Global & Yes \\
\hline innodb_sort_buff & Afesize & Yes & Yes & Global & No \\
\hline innodb_spin_wai & tYeslay & Yes & Yes & Global & Yes \\
\hline innodb_spin_wait & tYeause_multiplie & Yes & Yes & Global & Yes \\
\hline innodb_stats_aut & ૪ersecalc & Yes & Yes & Global & Yes \\
\hline innodb_stats_incl & Mes_delete_mar & Keeds & Yes & Global & Yes \\
\hline innodb_stats_met & Mess! & Yes & Yes & Global & Yes \\
\hline innodb_stats_on & Yestadata & Yes & Yes & Global & Yes \\
\hline innodb_stats_per & \$resent & Yes & Yes & Global & Yes \\
\hline innodb_stats_per & \%iesent_sample_ & páges & Yes & Global & Yes \\
\hline innodb_stats_trar & nsiesnt_sample_pa & abges & Yes & Global & Yes \\
\hline innodb_status_ou & Mrest & Yes & Yes & Global & Yes \\
\hline innodb_status_ou & Mr(est_locks & Yes & Yes & Global & Yes \\
\hline innodb_strict_mo & odres & Yes & Yes & Both & Yes \\
\hline innodb_sync_arra & ayessize & Yes & Yes & Global & No \\
\hline innodb_sync_deb & blies & Yes & Yes & Global & No \\
\hline innodb_sync_spir & Ydeops & Yes & Yes & Global & Yes \\
\hline innodb_table_locA & Ases & Yes & Yes & Both & Yes \\
\hline innodb_temp_dat & taesile_path & Yes & Yes & Global & No \\
\hline innodb_temp_tabl & b) & Yes & Yes & Global & No \\
\hline innodb_thread_cd & dfesirrency & Yes & Yes & Global & Yes \\
\hline innodb_thread_sl & leep_delay & Yes & Yes & Global & Yes \\
\hline innodb_tmpdir & Yes & Yes & Yes & Both & Yes \\
\hline innodb_trx_purge & eYeiew_update_0 & Mesdebug & Yes & Global & Yes \\
\hline innodb_trx_rseg & Meslots_debug & Yes & Yes & Global & Yes \\
\hline innodb_undo_dir & Etcesry & Yes & Yes & Global & No \\
\hline innodb_undo_log & Yescrypt & Yes & Yes & Global & Yes \\
\hline innodb_undo_log & Yerancate & Yes & Yes & Global & Yes \\
\hline innodb_undo_tabl & Mespaces & Yes & Yes & Global & Yes \\
\hline innodb_use_fdata & absesic & Yes & Yes & Global & Yes \\
\hline innodb_use_nativ & Néesio & Yes & Yes & Global & No \\
\hline innodb_validate & táesespace_path & sYes & Yes & Global & No \\
\hline innodb_version & & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline innodb_write_io & Mesads & Yes & Yes & Global & No \\
\hline insert_id & & & Yes & Session & Yes \\
\hline interactive_timeo & ortes & Yes & Yes & Both & Yes \\
\hline internal_tmp_mer & mestorage_engin & \&es & Yes & Both & Yes \\
\hline join_buffer_size & Yes & Yes & Yes & Both & Yes \\
\hline keep_files_on_cr & HATS & Yes & Yes & Both & Yes \\
\hline key_buffer_size & Yes & Yes & Yes & Global & Yes \\
\hline key_cache_age_ & thesshold & Yes & Yes & Global & Yes \\
\hline key_cache_block & Yeize & Yes & Yes & Global & Yes \\
\hline key_cache_divis & dreslimit & Yes & Yes & Global & Yes \\
\hline keyring_aws_cml & A) ès & Yes & Yes & Global & Yes \\
\hline keyring_aws_con & fœBe & Yes & Yes & Global & No \\
\hline keyring_aws_dat & adse & Yes & Yes & Global & No \\
\hline keyring_aws_regi & gires & Yes & Yes & Global & Yes \\
\hline keyring_hashico & tresuth_path & Yes & Yes & Global & Yes \\
\hline keyring_hashicor & resa_path & Yes & Yes & Global & Yes \\
\hline keyring_hashico & resaching & Yes & Yes & Global & Yes \\
\hline keyring_hashico & p_commit_auth & path & Yes & Global & No \\
\hline keyring_hashico & p_commit_ca_pat & th & Yes & Global & No \\
\hline keyring_hashico & p_commit_cachin & g & Yes & Global & No \\
\hline keyring_hashico & p_commit_role_id & & Yes & Global & No \\
\hline keyring_hashico & p_commit_server & _url & Yes & Global & No \\
\hline keyring_hashico & p_commit_store_ & path & Yes & Global & No \\
\hline keyring_hashicor & pessole_id & Yes & Yes & Global & Yes \\
\hline keyring_hashico & Yesecret_id & Yes & Yes & Global & Yes \\
\hline keyring_hashico & reserver_url & Yes & Yes & Global & Yes \\
\hline keyring_hashicor & restore_path & Yes & Yes & Global & Yes \\
\hline keyring_okv_cor & Yels & Yes & Yes & Global & Yes \\
\hline keyring_operatio & ons & & Yes & Global & Yes \\
\hline large_files_suppp & prt & & Yes & Global & No \\
\hline large_page_size & & & Yes & Global & No \\
\hline large_pages & Yes & Yes & Yes & Global & No \\
\hline last_insert_id & & & Yes & Session & Yes \\
\hline Ic_messages & Yes & Yes & Yes & Both & Yes \\
\hline Ic_messages_dir & Yes & Yes & Yes & Global & No \\
\hline Ic_time_names & Yes & Yes & Yes & Both & Yes \\
\hline license & & & Yes & Global & No \\
\hline local_infile & Yes & Yes & Yes & Global & Yes \\
\hline lock_order & Yes & Yes & Yes & Global & No \\
\hline lock_order_debug & g_deop & Yes & Yes & Global & No \\
\hline lock_order_debu & g_eraissing_arc & Yes & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline lock_order_debu & g_eraissing_key & Yes & Yes & Global & No \\
\hline lock_order_debu & g_ersissing_unloc & Yes & Yes & Global & No \\
\hline lock_order_depe & Notesncies & Yes & Yes & Global & No \\
\hline lock_order_extra & Ydespendencies & Yes & Yes & Global & No \\
\hline lock_order_outpu & Heebrectory & Yes & Yes & Global & No \\
\hline lock_order_print & Ves & Yes & Yes & Global & No \\
\hline lock_order_trace & Yesp & Yes & Yes & Global & No \\
\hline lock_order_trace & Yesssing_arc & Yes & Yes & Global & No \\
\hline lock_order_trace & Yresssing_key & Yes & Yes & Global & No \\
\hline lock_order_trace & Yesssing_unlock & Yes & Yes & Global & No \\
\hline lock_wait_timeou & Yes & Yes & Yes & Both & Yes \\
\hline locked_in_memory & & & Yes & Global & No \\
\hline log_bin & & & Yes & Global & No \\
\hline log_bin_basenam & ne & & Yes & Global & No \\
\hline log_bin_index & Yes & Yes & Yes & Global & No \\
\hline log_bin_trust_fun & とtisn_creators & Yes & Yes & Global & Yes \\
\hline log_error & Yes & Yes & Yes & Global & No \\
\hline log_error_service & Ses & Yes & Yes & Global & Yes \\
\hline log_error_suppre & \&rion_list & Yes & Yes & Global & Yes \\
\hline log_error_verbos & Mes & Yes & Yes & Global & Yes \\
\hline log_output & Yes & Yes & Yes & Global & Yes \\
\hline log_queries_not & Mrisig_indexes & Yes & Yes & Global & Yes \\
\hline log_raw & Yes & Yes & Yes & Global & Yes \\
\hline log_replica_upda & dess & Yes & Yes & Global & No \\
\hline log_slave_update & ebes & Yes & Yes & Global & No \\
\hline log_slow_admin & Stesements & Yes & Yes & Global & Yes \\
\hline log_slow_extra & Yes & Yes & Yes & Global & Yes \\
\hline log_slow_replica & Yestements & Yes & Yes & Global & Yes \\
\hline log_slow_slave_ & SYABIEMents & Yes & Yes & Global & Yes \\
\hline log_statements & Unesafe_for_binlog & Yes & Yes & Global & Yes \\
\hline log_throttle_quer & iessnot_using_in & dies & Yes & Global & Yes \\
\hline log_timestamps & Yes & Yes & Yes & Global & Yes \\
\hline long_query_time & Yes & Yes & Yes & Both & Yes \\
\hline low_priority_upda & Yess & Yes & Yes & Both & Yes \\
\hline lower_case_file_ & system & & Yes & Global & No \\
\hline lower_case_tableY & Yeames & Yes & Yes & Global & No \\
\hline mandatory_roles & Yes & Yes & Yes & Global & Yes \\
\hline master_verify_ch & \&cssum & Yes & Yes & Global & Yes \\
\hline max_allowed_pa & diles & Yes & Yes & Both & Yes \\
\hline max_binlog_cach & yésize & Yes & Yes & Global & Yes \\
\hline max_binlog_size & Yes & Yes & Yes & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline max_binlog_stm & Yesche_size & Yes & Yes & Global & Yes \\
\hline max_connect_er & roes & Yes & Yes & Global & Yes \\
\hline max_connection & sYes & Yes & Yes & Global & Yes \\
\hline max_delayed_thr & reas & Yes & Yes & Both & Yes \\
\hline max_digest_leng & thes & Yes & Yes & Global & No \\
\hline max_error_count & Yes & Yes & Yes & Both & Yes \\
\hline max_execution_ & tíkes & Yes & Yes & Both & Yes \\
\hline max_heap_table & Yeise & Yes & Yes & Both & Yes \\
\hline max_insert_delay & yed_threads & & Yes & Both & Yes \\
\hline max_join_size & Yes & Yes & Yes & Both & Yes \\
\hline max_length_for_ & skœt_data & Yes & Yes & Both & Yes \\
\hline max_points_in_g & \& (esbletry & Yes & Yes & Both & Yes \\
\hline max_prepared_s & struscount & Yes & Yes & Global & Yes \\
\hline max_relay_log_si & siłes & Yes & Yes & Global & Yes \\
\hline max_seeks_for_ & Kęs & Yes & Yes & Both & Yes \\
\hline max_sort_length & Yes & Yes & Yes & Both & Yes \\
\hline max_sp_recursio & Mesepth & Yes & Yes & Both & Yes \\
\hline max_user_conne & ettesns & Yes & Yes & Both & Yes \\
\hline max_write_lock & dGestt & Yes & Yes & Global & Yes \\
\hline mecab_rc_file & Yes & Yes & Yes & Global & No \\
\hline min_examined_r & oreslimit & Yes & Yes & Both & Yes \\
\hline myisam_data_po & Mir_size & Yes & Yes & Global & Yes \\
\hline myisam_max_sor & Wesile_size & Yes & Yes & Global & Yes \\
\hline myisam_mmap_ & SYRES & Yes & Yes & Global & No \\
\hline myisam_recover & Yopsions & Yes & Yes & Global & No \\
\hline myisam_sort_buf & ffeessize & Yes & Yes & Both & Yes \\
\hline myisam_stats_m & êtasd & Yes & Yes & Both & Yes \\
\hline myisam_use_mm & nács & Yes & Yes & Global & Yes \\
\hline mysql_firewall_da & ałabase & Yes & Yes & Global & No \\
\hline mysql_firewall_m & wes & Yes & Yes & Global & Yes \\
\hline mysql_firewall_re & eloced_interval_sechers & & Yes & Global & No \\
\hline mysql_firewall_tra & acces & Yes & Yes & Global & Yes \\
\hline mysql_native_pa & \$3980rd_proxy_u & usess & Yes & Global & Yes \\
\hline mysqlx_bind_add & dYess & Yes & Yes & Global & No \\
\hline mysqlx_compress & słes_algorithms & Yes & Yes & Global & Yes \\
\hline mysqlx_connect & Mereout & Yes & Yes & Global & Yes \\
\hline mysqlx_deflate_d & desult_compress & ireslevel & Yes & Global & Yes \\
\hline mysqlx_deflate_n & Yæs_client_compr & resion_level & Yes & Global & Yes \\
\hline mysqlx_documen & Yed_unique_pref & fiXes & Yes & Global & Yes \\
\hline mysqlx_enable_h & hees_notice & Yes & Yes & Global & Yes \\
\hline mysqlx_idle_work & Keæsthread_timeo & ovtes & Yes & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline mysqlx_interactiv & とesimeout & Yes & Yes & Global & Yes \\
\hline mysqlx_lz4_defa & UMescompression & Nesl & Yes & Global & Yes \\
\hline mysqlx_lz4_max & Yodisnt_compress & ireslevel & Yes & Global & Yes \\
\hline mysqlx_max_allo & Wesl_packet & Yes & Yes & Global & Yes \\
\hline mysqlx_max_con & héestions & Yes & Yes & Global & Yes \\
\hline mysqlx_min_wor & AÆsthreads & Yes & Yes & Global & Yes \\
\hline mysqlx_port & Yes & Yes & Yes & Global & No \\
\hline mysqlx_port_ope & Metsmeout & Yes & Yes & Global & No \\
\hline mysqlx_read_tim & \& ast & Yes & Yes & Session & Yes \\
\hline mysqlx_socket & Yes & Yes & Yes & Global & No \\
\hline mysqlx_ssl_ca & Yes & Yes & Yes & Global & No \\
\hline mysqlx_ssl_capa & thes & Yes & Yes & Global & No \\
\hline mysqlx_ssl_cert & Yes & Yes & Yes & Global & No \\
\hline mysqlx_ssl_ciphe & Yes & Yes & Yes & Global & No \\
\hline mysqlx_ssl_crl & Yes & Yes & Yes & Global & No \\
\hline mysqlx_ssl_crlpa & thes & Yes & Yes & Global & No \\
\hline mysqlx_ssl_key & Yes & Yes & Yes & Global & No \\
\hline mysqlx_wait_tim & ebę\$ & Yes & Yes & Session & Yes \\
\hline mysqlx_write_tim & west & Yes & Yes & Session & Yes \\
\hline mysqlx_zstd_def & Ades_compression & Yesiel & Yes & Global & Yes \\
\hline mysqlx_zstd_ma & X_e\$ient_compre\$ & すies_level & Yes & Global & Yes \\
\hline named_pipe & Yes & Yes & Yes & Global & No \\
\hline named_pipe_full & Yesess_group & Yes & Yes & Global & No \\
\hline ndb_allow_copyin & nogesalter_table & Yes & Yes & Both & Yes \\
\hline ndb_applier_allov & Neskip_epoch & Yes & Yes & Global & No \\
\hline ndb_autoincreme & hesprefetch_sz & Yes & Yes & Both & Yes \\
\hline ndb_batch_size & Yes & Yes & Yes & Both & Yes \\
\hline ndb_blob_read_ & baesh_bytes & Yes & Yes & Both & Yes \\
\hline ndb_blob_write_ & bresh_bytes & Yes & Yes & Both & Yes \\
\hline ndb_clear_apply & yestus & & Yes & Global & Yes \\
\hline ndb_cluster_conr & Mesion_pool & Yes & Yes & Global & No \\
\hline ndb_cluster_conr & Meesion_pool_nod & Miels & Yes & Global & No \\
\hline ndb_conflict_role & Yes & Yes & Yes & Global & Yes \\
\hline ndb_data_node & reeighbour & Yes & Yes & Global & Yes \\
\hline ndb_dbg_check & \$108res & Yes & Yes & Both & Yes \\
\hline ndb_default_colu & urnes format & Yes & Yes & Global & Yes \\
\hline ndb_default_colu & IMes format & Yes & Yes & Global & Yes \\
\hline ndb_deferred_co & Yetsaints & Yes & Yes & Both & Yes \\
\hline ndb_deferred_co & Yesaints & Yes & Yes & Both & Yes \\
\hline ndb_distribution & Yes & Yes & Yes & Global & Yes \\
\hline ndb_distribution & Yes & Yes & Yes & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline ndb_eventbuffer & Yes_percent & Yes & Yes & Global & Yes \\
\hline ndb_eventbuffer & Yox_alloc & Yes & Yes & Global & Yes \\
\hline ndb_extra_loggin & wes & Yes & Yes & Global & Yes \\
\hline ndb_force_send & Yes & Yes & Yes & Both & Yes \\
\hline ndb_fully_replica & téds & Yes & Yes & Both & Yes \\
\hline ndb_index_stat_ & enewle & Yes & Yes & Both & Yes \\
\hline ndb_index_stat_ & opeisn & Yes & Yes & Both & Yes \\
\hline ndb_join_pushdo & own & & Yes & Both & Yes \\
\hline ndb_log_apply_\$ & staess & Yes & Yes & Global & No \\
\hline ndb_log_apply_\$ & Statess & Yes & Yes & Global & No \\
\hline ndb_log_bin & Yes & & Yes & Both & No \\
\hline ndb_log_binlog_ & irresx & & Yes & Global & Yes \\
\hline ndb_log_cache_ & SYAes & Yes & Yes & Global & Yes \\
\hline ndb_log_empty_ & elpexths & Yes & Yes & Global & Yes \\
\hline ndb_log_empty_ & elpershs & Yes & Yes & Global & Yes \\
\hline ndb_log_empty_ & unperate & Yes & Yes & Global & Yes \\
\hline ndb_log_empty_ & Ulpebate & Yes & Yes & Global & Yes \\
\hline ndb_log_exclusiv & yereads & Yes & Yes & Both & Yes \\
\hline ndb_log_exclusiv & yerseads & Yes & Yes & Both & Yes \\
\hline ndb_log_fail_term & Mrieste & Yes & Yes & Global & No \\
\hline ndb_log_orig & Yes & Yes & Yes & Global & No \\
\hline ndb_log_orig & Yes & Yes & Yes & Global & No \\
\hline ndb_log_transact & thoes compression & Yes & Yes & Global & Yes \\
\hline ndb_log_transact & thoes_compression & Ylesel_zstd & Yes & Global & Yes \\
\hline ndb_log_transact & thœts dependency & Yes & Yes & Global & No \\
\hline ndb_log_transact & thoes id & Yes & Yes & Global & No \\
\hline ndb_log_transacti & tion_id & & Yes & Global & No \\
\hline ndb_log_update & aswrite & Yes & Yes & Global & Yes \\
\hline ndb_log_update & Irresimal & Yes & Yes & Global & Yes \\
\hline ndb_log_updated & dYebly & Yes & Yes & Global & Yes \\
\hline ndb_metadata_d & Weeesk & Yes & Yes & Global & Yes \\
\hline ndb_metadata_q & MXeesk_interval & Yes & Yes & Global & Yes \\
\hline ndb_metadata_sy & ync & & Yes & Global & Yes \\
\hline ndb_mgm_tls & Yes & Yes & & & No \\
\hline - Variable: yes & & & Yes & Global & No \\
\hline ndb_optimization & Yeslay & Yes & Yes & Global & Yes \\
\hline ndb_optimized_n & は\&s_selection & Yes & Yes & Global & Yes \\
\hline ndb_optimized_n & は\&s_selection & Yes & Yes & Global & No \\
\hline ndb_read_backup & płes & Yes & Yes & Global & Yes \\
\hline ndb_recv_thread & Yæstivation_thres & Noted & Yes & Global & Yes \\
\hline ndb_recv_thread & Yeqsu_mask & Yes & Yes & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline ndb_replica_batc & Mesize & Yes & Yes & Global & Yes \\
\hline ndb_replica_blob & Yesite_batch_by & \&es & Yes & Global & Yes \\
\hline Ndb_replica_max & _replicated_epo & ch & Yes & Global & No \\
\hline ndb_report_thres & Melsinlog_epoch & \$1ęs & Yes & Global & Yes \\
\hline ndb_report_thres & Melsinlog_mem_4 & u\&age & Yes & Global & Yes \\
\hline ndb_row_checks & um & & Yes & Both & Yes \\
\hline ndb_schema_dis & Yrock_wait_timep & pres & Yes & Global & Yes \\
\hline ndb_schema_dis & Yesneout & Yes & Yes & Global & No \\
\hline ndb_schema_dis & Yeisneout & Yes & Yes & Global & No \\
\hline ndb_schema_dist & Yespgrade_allow & ebles & Yes & Global & No \\
\hline Ndb_schema_pa & rticipant_count & & Yes & Global & No \\
\hline ndb_show_foreig & Melsey_mock_tab & Nées & Yes & Global & Yes \\
\hline ndb_slave_confli & dtesole & Yes & Yes & Global & Yes \\
\hline Ndb_system_nam & ne & & Yes & Global & No \\
\hline ndb_table_no_log & gging & & Yes & Session & Yes \\
\hline ndb_table_tempo & rary & & Yes & Session & Yes \\
\hline ndb_tls_search & pácks & Yes & & & No \\
\hline - Variable: yes & & & Yes & Global & No \\
\hline ndb_use_copying & _alter_table & & Yes & Both & No \\
\hline ndb_use_exact_ & count & & Yes & Both & Yes \\
\hline ndb_use_transac & tiress & Yes & Yes & Both & Yes \\
\hline ndb_version & & & Yes & Global & No \\
\hline ndb_version_stri & ing & & Yes & Global & No \\
\hline ndb_wait_conne & cYees & Yes & Yes & Global & No \\
\hline ndb_wait_setup & Yes & Yes & Yes & Global & No \\
\hline ndbinfo_database & & & Yes & Global & No \\
\hline ndbinfo_max_by & tes & & Yes & Both & Yes \\
\hline ndbinfo_max_ro & Noses & & Yes & Both & Yes \\
\hline ndbinfo_offline & & & Yes & Global & Yes \\
\hline ndbinfo_show_h & \% desn & & Yes & Both & Yes \\
\hline ndbinfo_table_pr & efix & & Yes & Global & No \\
\hline ndbinfo_version & & & Yes & Global & No \\
\hline net_buffer_lengt & hYes & Yes & Yes & Both & Yes \\
\hline net_read_timeou & tYes & Yes & Yes & Both & Yes \\
\hline net_retry_count & Yes & Yes & Yes & Both & Yes \\
\hline net_write_timeou & HYes & Yes & Yes & Both & Yes \\
\hline ngram_token_siz & Yes & Yes & Yes & Global & No \\
\hline offline_mode & Yes & Yes & Yes & Global & Yes \\
\hline old_alter_table & Yes & Yes & Yes & Both & Yes \\
\hline open_files_limit & Yes & Yes & Yes & Global & No \\
\hline optimizer_prune & Yeal & Yes & Yes & Both & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Var Scope & Dynamic \\
\hline optimizer＿search & Yespth & Yes & Yes & Both & Yes \\
\hline optimizer＿switch & Yes & Yes & Yes & Both & Yes \\
\hline optimizer＿trace & Yes & Yes & Yes & Both & Yes \\
\hline optimizer＿trace＿ & feasures & Yes & Yes & Both & Yes \\
\hline optimizer＿trace＿ & I＇veris & Yes & Yes & Both & Yes \\
\hline optimizer＿trace＿ & Mas＿mem＿size & Yes & Yes & Both & Yes \\
\hline optimizer＿trace＿ & Offect & Yes & Yes & Both & Yes \\
\hline original＿commit＿ & timestamp & & Yes & Session & Yes \\
\hline original＿server＿y & yersion & & Yes & Session & Yes \\
\hline parser＿max＿mer & Yesize & Yes & Yes & Both & Yes \\
\hline partial＿revokes & Yes & Yes & Yes & Global & Yes \\
\hline password＿histor & Yes & Yes & Yes & Global & Yes \\
\hline password＿requir & eyesırrent & Yes & Yes & Global & Yes \\
\hline password＿reuse & Yeerval & Yes & Yes & Global & Yes \\
\hline performance＿sch & чева & Yes & Yes & Global & No \\
\hline performance＿sch & ↓era＿accounts＿ & sizes & Yes & Global & No \\
\hline performance＿sch & \multicolumn{2}{|l|}{↔era＿digests＿size es} & Yes & Global & No \\
\hline performance＿sch & ↔ега＿error＿size & Yes & Yes & Global & No \\
\hline performance＿sch & やera＿events＿sta & gees＿history＿long & Yesse & Global & No \\
\hline performance＿sch & ↔esa＿events＿sta & gees＿history＿size & Yes & Global & No \\
\hline performance＿sch & ↓esa＿events＿sta & terænts＿history＿ & løreg＿size & Global & No \\
\hline performance＿sch & ↓esa＿events＿sta & terents＿history＿ & STES & Global & No \\
\hline performance＿sch & とesa＿events＿tran & hisestions＿history & Yersg＿size & Global & No \\
\hline performance＿sch & 党esa＿events＿tra & n＇Sestions＿history & Yęse & Global & No \\
\hline performance＿sch & とesa＿events＿wai & irsesbistory＿long＿ & słues & Global & No \\
\hline performance＿sch & とesa＿events＿wai & itsęsiistory＿size & Yes & Global & No \\
\hline performance＿sch & ↓esa＿hosts＿size & Yes & Yes & Global & No \\
\hline performance＿sch & とesa＿max＿cond & tosses & Yes & Global & No \\
\hline performance＿sch & ↓esa＿max＿cond & Yessances & Yes & Global & No \\
\hline performance＿sch & ↓esa＿max＿diges & Yestgth & Yes & Global & No \\
\hline performance＿sch & ↓esa＿max＿diges & tYesmple＿age & Yes & Global & Yes \\
\hline performance＿sch & wesa＿max＿file＿cl & clycsses & Yes & Global & No \\
\hline performance＿sch & wesa＿max＿file＿h & hałelses & Yes & Global & No \\
\hline performance＿sch & やesa＿max＿file＿in & instesices & Yes & Global & No \\
\hline performance＿sch & やera＿max＿index & YSeat & Yes & Global & No \\
\hline performance＿sch & ↓esa＿max＿mem & oYesclasses & Yes & Global & No \\
\hline performance＿sch & ஒesa＿max＿metac & dolocks & Yes & Global & No \\
\hline performance＿sch & ↓era＿max＿meter & Yelasses & Yes & Global & No \\
\hline performance＿sch & ↓esa＿max＿metric & Yebsses & Yes & Global & No \\
\hline performance＿sch & ↓esa＿max＿mutex & Yebsses & Yes & Global & No \\
\hline performance＿sch & とesa＿max＿mutex & Yesstances & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Var Scope & Dynamic \\
\hline performance＿sch & とera＿max＿prepa & Merbstatements & iMstances & Global & No \\
\hline performance＿sch & 苜esa＿max＿progr & arnesinstances & Yes & Global & No \\
\hline performance＿sch & ↔esa＿max＿rwloc & KYesasses & Yes & Global & No \\
\hline performance＿sch & ↓essa＿max＿rwloc & KY tosstances & Yes & Global & No \\
\hline performance＿sch & とesa＿max＿socke & tewasses & Yes & Global & No \\
\hline performance＿sch & とersa＿max＿socke & Veisstances & Yes & Global & No \\
\hline performance＿sch & ↔esa＿max＿sql＿te & Xesength & Yes & Global & No \\
\hline performance＿sch & やersa＿max＿stage & Yedasses & Yes & Global & No \\
\hline performance＿sch & ↔esa＿max＿state & Yest＿classes & Yes & Global & No \\
\hline performance＿sch & éesa＿max＿state & Yest＿stack & Yes & Global & No \\
\hline performance＿sch & wesa＿max＿table & Kesidles & Yes & Global & No \\
\hline performance＿sch & ↔esa＿max＿table & Yessances & Yes & Global & No \\
\hline performance＿sch & ↓era＿max＿table & Yoesk＿stat & Yes & Global & No \\
\hline performance＿sch & ↔esa＿max＿threa & dYe esasses & Yes & Global & No \\
\hline performance＿sch & ↔esa＿max＿threa & dY tosstances & Yes & Global & No \\
\hline performance＿sch & ↔ета＿session＿co & Mresct＿attrs＿size & Yes & Global & No \\
\hline performance＿sch & やersa＿setup＿acto & nsesize & Yes & Global & No \\
\hline performance＿sch & やera＿setup＿obje & dtessize & Yes & Global & No \\
\hline performance＿sch & ↔ета＿show＿proc & Asessist & Yes & Global & Yes \\
\hline performance＿sch & ↓ena＿users＿size & Yes & Yes & Global & No \\
\hline persist＿only＿adm & Yiresx509＿subject & Yes & Yes & Global & No \\
\hline persist＿sensitive & Yessiables＿in＿pla & Mexxt & Yes & Global & No \\
\hline persisted＿globals & sYesad & Yes & Yes & Global & No \\
\hline pid＿file & Yes & Yes & Yes & Global & No \\
\hline plugin＿dir & Yes & Yes & Yes & Global & No \\
\hline port & Yes & Yes & Yes & Global & No \\
\hline preload＿buffer＿s & Mes & Yes & Yes & Both & Yes \\
\hline print＿identified＿w & witbsas＿hex & Yes & Yes & Both & Yes \\
\hline profiling & & & Yes & Both & Yes \\
\hline profiling＿history＿ & す化 & Yes & Yes & Both & Yes \\
\hline protocol＿compres & Sketsn＿algorithms & Yes & Yes & Global & Yes \\
\hline protocol＿version & & & Yes & Global & No \\
\hline proxy＿user & & & Yes & Session & No \\
\hline pseudo＿replica＿ & mode & & Yes & Session & Yes \\
\hline pseudo＿slave＿m & mode & & Yes & Session & Yes \\
\hline pseudo＿thread＿id & id & & Yes & Session & Yes \\
\hline query＿alloc＿blocA & A＿essize & Yes & Yes & Both & Yes \\
\hline query＿prealloc＿si & sizes & Yes & Yes & Both & Yes \\
\hline rand＿seed1 & & & Yes & Session & Yes \\
\hline rand＿seed2 & & & Yes & Session & Yes \\
\hline range＿alloc＿bloc & Aesize & Yes & Yes & Both & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline range_optimizer & Ifrex_mem_size & Yes & Yes & Both & Yes \\
\hline rbr_exec_mode & & & Yes & Session & Yes \\
\hline read_buffer_size & Yes & Yes & Yes & Both & Yes \\
\hline read_only & Yes & Yes & Yes & Global & Yes \\
\hline read_rnd_buffer & \$ées & Yes & Yes & Both & Yes \\
\hline regexp_stack_lim & Mites & Yes & Yes & Global & Yes \\
\hline regexp_time_lim & iYes & Yes & Yes & Global & Yes \\
\hline relay_log & Yes & Yes & Yes & Global & No \\
\hline relay_log_basen & ame & & Yes & Global & No \\
\hline relay_log_index & Yes & Yes & Yes & Global & No \\
\hline relay_log_purge & Yes & Yes & Yes & Global & Yes \\
\hline relay_log_recove & Mes & Yes & Yes & Global & No \\
\hline relay_log_space & Yest & Yes & Yes & Global & No \\
\hline replica_allow_ba & telesig & Yes & Yes & Global & Yes \\
\hline replica_checkpoi & integroup & Yes & Yes & Global & Yes \\
\hline replica_checkpoi & inteperiod & Yes & Yes & Global & Yes \\
\hline replica_compres & słéds protocol & Yes & Yes & Global & Yes \\
\hline replica_exec_mo & dœs & Yes & Yes & Global & Yes \\
\hline replica_load_tmp & dries & Yes & Yes & Global & No \\
\hline replica_max_allo & Wes_packet & Yes & Yes & Global & Yes \\
\hline replica_net_time & piœs & Yes & Yes & Global & Yes \\
\hline replica_parallel_ & tymes & Yes & Yes & Global & Yes \\
\hline replica_parallel_ & Norkers & Yes & Yes & Global & Yes \\
\hline replica_pending & joes_size_max & Yes & Yes & Global & Yes \\
\hline replica_preserve & Yoesnmit_order & Yes & Yes & Global & Yes \\
\hline replica_skip_erro & orises & Yes & Yes & Global & No \\
\hline replica_sql_verify & Yelsecksum & Yes & Yes & Global & Yes \\
\hline replica_transactio & OYesetries & Yes & Yes & Global & Yes \\
\hline replica_type_cor & Yersions & Yes & Yes & Global & Yes \\
\hline replication_optim & iYesfor_static_pl & uøres_config & Yes & Global & Yes \\
\hline replication_send & eYesbserve_comn & nitesonly & Yes & Global & Yes \\
\hline report_host & Yes & Yes & Yes & Global & No \\
\hline report_password & Yes & Yes & Yes & Global & No \\
\hline report_port & Yes & Yes & Yes & Global & No \\
\hline report_user & Yes & Yes & Yes & Global & No \\
\hline require_row_form & nat & & Yes & Session & Yes \\
\hline require_secure_t & trácesport & Yes & Yes & Global & Yes \\
\hline restrict_fk_on_no & Mestandard_key & Yes & Yes & Both & Yes \\
\hline resultset_metada & ata & & Yes & Session & Yes \\
\hline rewriter_enabled & & & Yes & Global & Yes \\
\hline rewriter_enabled & for_threads_with & out_privilege_che & etcks & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline rewriter_verbose & & & Yes & Global & Yes \\
\hline rpl_read_size & Yes & Yes & Yes & Global & Yes \\
\hline rpl_semi_sync_m & Maeber_enabled & Yes & Yes & Global & Yes \\
\hline rpl_semi_sync_m & Meser_timeout & Yes & Yes & Global & Yes \\
\hline rpl_semi_sync_m & maeter_trace_leve & Yes & Yes & Global & Yes \\
\hline rpl_semi_sync_m & Maeber_wait_for_s & Aues_count & Yes & Global & Yes \\
\hline rpl_semi_sync_n & maeter_wait_no_s & Hes & Yes & Global & Yes \\
\hline rpl_semi_sync_m & maeber_wait_point & Yes & Yes & Global & Yes \\
\hline rpl_semi_sync_r & eycisa_enabled & Yes & Yes & Global & Yes \\
\hline rpl_semi_sync_r & eycisa_trace_leve & IYes & Yes & Global & Yes \\
\hline rpl_semi_sync_s & IM _enabled & Yes & Yes & Global & Yes \\
\hline rpl_semi_sync_s & IM _trace_level & Yes & Yes & Global & Yes \\
\hline rpl_semi_sync_s & dese_enabled & Yes & Yes & Global & Yes \\
\hline rpl_semi_sync_s & dorse_timeout & Yes & Yes & Global & Yes \\
\hline rpl_semi_sync_s & dXese_trace_leve & Yes & Yes & Global & Yes \\
\hline rpl_semi_sync_s & defese_wait_for_r & eycisa_count & Yes & Global & Yes \\
\hline rpl_semi_sync_s & derse_wait_no_re & exésa & Yes & Global & Yes \\
\hline rpl_semi_sync_s & derse_wait_point & Yes & Yes & Global & Yes \\
\hline rpl_stop_replica_ & Wresout & Yes & Yes & Global & Yes \\
\hline rpl_stop_slave_t & Mesut & Yes & Yes & Global & Yes \\
\hline schema_definitio & Yesache & Yes & Yes & Global & Yes \\
\hline secondary_engin & e_cost_threshold & & Yes & Session & Yes \\
\hline secure_file_priv & Yes & Yes & Yes & Global & No \\
\hline select_into_buffe & Yesze & Yes & Yes & Both & Yes \\
\hline select_into_disk & Wesc & Yes & Yes & Both & Yes \\
\hline select_into_disk & \$esc_delay & Yes & Yes & Both & Yes \\
\hline server_id & Yes & Yes & Yes & Global & Yes \\
\hline server_id_bits & Yes & Yes & Yes & Global & No \\
\hline server_uuid & & & Yes & Global & No \\
\hline session_track_g & ides & Yes & Yes & Both & Yes \\
\hline session_track_s & Mesna & Yes & Yes & Both & Yes \\
\hline session_track_st & ałeschange & Yes & Yes & Both & Yes \\
\hline session_track_sy & \$tesn_variables & Yes & Yes & Both & Yes \\
\hline session_track_tr & ałesaction_info & Yes & Yes & Both & Yes \\
\hline set_operations_b & bMffer_size & Yes & Yes & Both & Yes \\
\hline sha256_passwo & \&\&suto_generate & Yres_keys & Yes & Global & No \\
\hline sha256_passwo & \& Grivate_key_p & alles & Yes & Global & No \\
\hline sha256_passwo & d\&aroxy_users & Yes & Yes & Global & Yes \\
\hline sha256_passwo & \&\&sublic_key_pa & thes & Yes & Global & No \\
\hline shared_memory & Yes & Yes & Yes & Global & No \\
\hline shared_memory_ & Gese_name & Yes & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline show_create_tab & Méeskip_secondar & Yyeengine & Yes & Session & Yes \\
\hline show_create_tab & Késerbosity & Yes & Yes & Both & Yes \\
\hline show_gipk_in_cre & daes_table_and_ & iMesmation_sche & Yæs & Both & Yes \\
\hline skip_external_loc & CKies] & Yes & Yes & Global & No \\
\hline skip_name_resol & IXees & Yes & Yes & Global & No \\
\hline skip_networking & Yes & Yes & Yes & Global & No \\
\hline skip_replica_start & tYes & Yes & Yes & Global & No \\
\hline skip_show_datab & ひes & Yes & Yes & Global & No \\
\hline skip_slave_start & Yes & Yes & Yes & Global & No \\
\hline slave_allow_batc & Mies) & Yes & Yes & Global & Yes \\
\hline slave_checkpoint & Yegoup & Yes & Yes & Global & Yes \\
\hline slave_checkpoint & Yesiod & Yes & Yes & Global & Yes \\
\hline slave_compresse & edeprotocol & Yes & Yes & Global & Yes \\
\hline slave_exec_mode & yes & Yes & Yes & Global & Yes \\
\hline slave_load_tmpdì & İYes & Yes & Yes & Global & No \\
\hline slave_max_allow & \& spacket & Yes & Yes & Global & Yes \\
\hline slave_net_timeou & Mes & Yes & Yes & Global & Yes \\
\hline slave_parallel_typ & ples & Yes & Yes & Global & Yes \\
\hline slave_parallel_wo & dfkers & Yes & Yes & Global & Yes \\
\hline slave_pending_jo & obessize_max & Yes & Yes & Global & Yes \\
\hline slave_preserve_ & cbesmit_order & Yes & Yes & Global & Yes \\
\hline slave_skip_errors & sYes & Yes & Yes & Global & No \\
\hline slave_sql_verify & Mescksum & Yes & Yes & Global & Yes \\
\hline slave_transactio & Yestries & Yes & Yes & Global & Yes \\
\hline slave_type_conve & Afesions & Yes & Yes & Global & Yes \\
\hline slow_launch_time & eyes & Yes & Yes & Global & Yes \\
\hline slow_query_log & Yes & Yes & Yes & Global & Yes \\
\hline slow_query_log & fires & Yes & Yes & Global & Yes \\
\hline socket & Yes & Yes & Yes & Global & No \\
\hline sort_buffer_size & Yes & Yes & Yes & Both & Yes \\
\hline source_verify_ch & \&cessum & Yes & Yes & Global & Yes \\
\hline sql_auto_is_null & & & Yes & Both & Yes \\
\hline sql_big_selects & & & Yes & Both & Yes \\
\hline sql_buffer_result & & & Yes & Both & Yes \\
\hline sql_generate_iny & isese_primary_ke & eyes & Yes & Both & Yes \\
\hline sql_log_bin & & & Yes & Session & Yes \\
\hline sql_log_off & & & Yes & Both & Yes \\
\hline sql_mode & Yes & Yes & Yes & Both & Yes \\
\hline sql_notes & & & Yes & Both & Yes \\
\hline sql_quote_show & create & & Yes & Both & Yes \\
\hline sql_replica_skip & counter & & Yes & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline sql_require_prim & Afeskey & Yes & Yes & Both & Yes \\
\hline sql_safe_updates & & & Yes & Both & Yes \\
\hline sql_select_limit & & & Yes & Both & Yes \\
\hline sql_slave_skip_c & counter & & Yes & Global & Yes \\
\hline sql_warnings & & & Yes & Both & Yes \\
\hline ssl_ca & Yes & Yes & Yes & Global & Yes \\
\hline ssl_capath & Yes & Yes & Yes & Global & Yes \\
\hline ssl_cert & Yes & Yes & Yes & Global & Yes \\
\hline ssl_cipher & Yes & Yes & Yes & Global & Yes \\
\hline ssl_crl & Yes & Yes & Yes & Global & Yes \\
\hline ssl_crlpath & Yes & Yes & Yes & Global & Yes \\
\hline ssl_fips_mode & Yes & Yes & Yes & Global & No \\
\hline ssl_key & Yes & Yes & Yes & Global & Yes \\
\hline ssl_session_cac & iéesnode & Yes & Yes & Global & Yes \\
\hline ssl_session_cac & yéesimeout & Yes & Yes & Global & Yes \\
\hline statement_id & & & Yes & Session & No \\
\hline stored_program & \&ashe & Yes & Yes & Global & Yes \\
\hline stored_program & desinition_cache & Yes & Yes & Global & Yes \\
\hline super_read_only & Yes & Yes & Yes & Global & Yes \\
\hline sync_binlog & Yes & Yes & Yes & Global & Yes \\
\hline sync_master_inf & OYes & Yes & Yes & Global & Yes \\
\hline sync_relay_log & Yes & Yes & Yes & Global & Yes \\
\hline sync_relay_log_ & infes & Yes & Yes & Global & Yes \\
\hline sync_source_inf & oYes & Yes & Yes & Global & Yes \\
\hline syseventlog.facil & ityes & Yes & Yes & Global & Yes \\
\hline syseventlog.inclu & udespid & Yes & Yes & Global & Yes \\
\hline syseventlog.tag & Yes & Yes & Yes & Global & Yes \\
\hline system_time_zone & & & Yes & Global & No \\
\hline table_definition_ & ckebe & Yes & Yes & Global & Yes \\
\hline table_encryption & Yesisvilege_check & Yes & Yes & Global & Yes \\
\hline table_open_cach & yes & Yes & Yes & Global & Yes \\
\hline table_open_cach & \&èsistances & Yes & Yes & Global & No \\
\hline tablespace_defin & ǐǐes_cache & Yes & Yes & Global & Yes \\
\hline telemetry.metrics & _enabled & & Yes & Global & No \\
\hline telemetry.metric\$ & _reader_frequen & cy_1 & Yes & Global & No \\
\hline telemetry.metric\$ & _reader_frequen & cy_2 & Yes & Global & No \\
\hline telemetry.metric\$ & _reader_frequen & cy_3 & Yes & Global & No \\
\hline telemetry.otel_bs & p_max_export_ba & batch_size & Yes & Global & No \\
\hline telemetry.otel_b\$p & p_max_queue_si & ize & Yes & Global & No \\
\hline telemetry.otel_bsp & p_schedule_delay & & Yes & Global & No \\
\hline telemetry.otel_ex & xporter_otlp_metri & cs_certificates & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline \multicolumn{3}{|l|}{telemetry.otel_exporter_otlp_metrics_cipher} & Yes & Global & No \\
\hline & telemetry.otel_exporter_otlp_metric & ics_cipher_suite & Yes & Global & No \\
\hline & telemetry.otel_exporter_otlp_metric & ics_client_certific & ałess & Global & No \\
\hline & telemetry.otel_exporter_otlp_metric & ics_client_key & Yes & Global & No \\
\hline & telemetry.otel_exporter_otlp_metric & ics_compression & Yes & Global & No \\
\hline & telemetry.otel_exporter_otlp_metri & ics_endpoint & Yes & Global & No \\
\hline & telemetry.otel_exporter_otlp_metric & ics_headers & Yes & Global & No \\
\hline & telemetry.otel_exporter_otlp_metri & ics_max_tls & Yes & Global & No \\
\hline & telemetry.otel_exporter_otlp_metrics & ics_min_tls & Yes & Global & No \\
\hline & telemetry.otel_exporter_otlp_metri & ics_protocol & Yes & Global & No \\
\hline & telemetry.otel_exporter_otlp_metri & ics_timeout & Yes & Global & No \\
\hline & telemetry.otel_exporter_otlp_trace & s_certificates & Yes & Global & No \\
\hline & telemetry.otel_exporter_otlp_traces & s_cipher & Yes & Global & No \\
\hline telemetry.otel_exp & porter_otlp_traces & s_cipher_suite & Yes & Global & No \\
\hline telemetry.otel_exp & xporter_otlp_traces & s_client_certifica & Hes & Global & No \\
\hline telemetry.otel_exp & porter_otlp_traces & s_client_key & Yes & Global & No \\
\hline telemetry.otel_exp & porter_otlp_traces & s_compression & Yes & Global & No \\
\hline telemetry.otel_exp & porter_otlp_traces & s_endpoint & Yes & Global & No \\
\hline telemetry.otel_ex & porter_otlp_traces & s_headers & Yes & Global & No \\
\hline telemetry.otel_ex & porter_otlp_traces & s_max_tls & Yes & Global & No \\
\hline telemetry.otel_ex & porter_otlp_traces & s_min_tls & Yes & Global & No \\
\hline telemetry.otel_ex & porter_otlp_traces & s_protocol & Yes & Global & No \\
\hline telemetry.otel_ex & xporter_otlp_traces & s_timeout & Yes & Global & No \\
\hline telemetry.otel_log & _level & & Yes & Global & Yes \\
\hline telemetry.otel_res & source_attributes & & Yes & Global & No \\
\hline telemetry.query & text_enabled & & Yes & Global & Yes \\
\hline telemetry.trace_ & enabled & & Yes & Global & Yes \\
\hline temptable_max_ & Mesap & Yes & Yes & Global & Yes \\
\hline temptable_max_ & raes & Yes & Yes & Global & Yes \\
\hline temptable_use_n & Threap & Yes & Yes & Global & Yes \\
\hline terminology_use & yœsvious & Yes & Yes & Both & Yes \\
\hline thread_cache_si & złés & Yes & Yes & Global & Yes \\
\hline thread_handling & Yes & Yes & Yes & Global & No \\
\hline thread_pool_algo & presm & Yes & Yes & Global & No \\
\hline thread_pool_ded & irated_listeners & Yes & Yes & Global & No \\
\hline thread_pool_hig & Yesiority_connec & tixœs & Yes & Both & Yes \\
\hline thread_pool_long & g) 目是_trx_limit & Yes & Yes & Global & Yes \\
\hline thread_pool_max & xYestive_query_th & thresds & Yes & Global & Yes \\
\hline thread_pool_max & xyeransactions_lim & virtes & Yes & Global & Yes \\
\hline thread_pool_max & xYebused_thread & sYes & Yes & Global & Yes \\
\hline thread_pool_prio & Yeskup_timer & Yes & Yes & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline thread_pool_que & Nyesthreads_per_q & reasp & Yes & Global & Yes \\
\hline thread_pool_size & Yes & Yes & Yes & Global & No \\
\hline thread_pool_stal & Yessit & Yes & Yes & Global & Yes \\
\hline thread_pool_tran & \&rstion_delay & Yes & Yes & Global & Yes \\
\hline thread_stack & Yes & Yes & Yes & Global & No \\
\hline time_zone & & & Yes & Both & Yes \\
\hline timestamp & & & Yes & Session & Yes \\
\hline tls_certificates_e & Mésced_validation & & Yes & Global & No \\
\hline tls_ciphersuites & Yes & Yes & Yes & Global & Yes \\
\hline tls_version & Yes & Yes & Yes & Global & Yes \\
\hline tmp_table_size & Yes & Yes & Yes & Both & Yes \\
\hline tmpdir & Yes & Yes & Yes & Global & No \\
\hline transaction_alloc & Yock_size & Yes & Yes & Both & Yes \\
\hline transaction_allow & _batching & & Yes & Session & Yes \\
\hline transaction_isola & tines & Yes & Yes & Both & Yes \\
\hline transaction_prea & IMoes_size & Yes & Yes & Both & Yes \\
\hline transaction_read & Yorsy & Yes & Yes & Both & Yes \\
\hline unique_checks & & & Yes & Both & Yes \\
\hline updatable_views & Yueish_limit & Yes & Yes & Both & Yes \\
\hline use_secondary_ & engine & & Yes & Session & Yes \\
\hline validate_passwo & resheck_user_n & деее & Yes & Global & Yes \\
\hline validate_passwo & redictionary_file & Yes & Yes & Global & Yes \\
\hline validate_passwo & rebength & Yes & Yes & Global & Yes \\
\hline validate_passwo & Mesnixed_case_¢ & corest & Yes & Global & Yes \\
\hline validate_passwo & Mesumber_coun & Yes & Yes & Global & Yes \\
\hline validate_passwo & repolicy & Yes & Yes & Global & Yes \\
\hline validate_passwo & rdespecial_char & doessit & Yes & Global & Yes \\
\hline validate_passwo & reshanged_char & ałcess_percentag & eYes & Global & Yes \\
\hline validate_passwo & resteck_user_n & alrees & Yes & Global & Yes \\
\hline validate_passwo & redictionary_file & Yes & Yes & Global & Yes \\
\hline validate_passwo & rdesngth & Yes & Yes & Global & Yes \\
\hline validate_passwo & Mesixed_case_c & OYR\$ & Yes & Global & Yes \\
\hline validate_passwo & desumber_count & Yes & Yes & Global & Yes \\
\hline validate_passwo & reqsolicy & Yes & Yes & Global & Yes \\
\hline validate_passwo & respecial_char_d & corest & Yes & Global & Yes \\
\hline version & & & Yes & Global & No \\
\hline version_comment & & & Yes & Global & No \\
\hline version_compile & machine & & Yes & Global & No \\
\hline version_compile & os & & Yes & Global & No \\
\hline version_compile & zlib & & Yes & Global & No \\
\hline version_tokens_ & séesion & Yes & Yes & Both & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Var Scope & Dynamic \\
\hline version_tokens_ & słésion_number & Yes & Yes & Both & No \\
\hline wait_timeout & Yes & Yes & Yes & Both & Yes \\
\hline warning_count & & & Yes & Session & No \\
\hline windowing_use & Higls_precision & Yes & Yes & Both & Yes \\
\hline xa_detach_on_p & rとpare & Yes & Yes & Both & Yes \\
\hline
\end{tabular}

\section*{Notes:}
1. This option is dynamic, but should be set only by server. You should not set this variable manually.

\subsection*{7.1.6 Server Status Variable Reference}

The following table lists all status variables applicable within mysqld.
The table lists each variable's data type and scope. The last column indicates whether the scope for each variable is Global, Session, or both. Please see the corresponding item descriptions for details on setting and using the variables. Where appropriate, direct links to further information about the items are provided.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 7.3 Status Variable Summary}
\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Aborted_clients & Integer & Global \\
\hline Aborted_connects & Integer & Global \\
\hline Acl_cache_items_count & Integer & Global \\
\hline Audit_log_current_size & Integer & Global \\
\hline Audit_log_direct_writes & Integer & Global \\
\hline Audit_log_event_max_drop_size & Integer & Global \\
\hline Audit_log_events & Integer & Global \\
\hline Audit_log_events_filtered & Integer & Global \\
\hline Audit_log_events_lost & Integer & Global \\
\hline Audit_log_events_written & Integer & Global \\
\hline Audit_log_total_size & Integer & Global \\
\hline Audit_log_write_waits & Integer & Global \\
\hline Authentication_Idap_sasl_support & estrimœthods & Global \\
\hline Binlog_cache_disk_use & Integer & Global \\
\hline Binlog_cache_use & Integer & Global \\
\hline Binlog_stmt_cache_disk_use & Integer & Global \\
\hline Binlog_stmt_cache_use & Integer & Global \\
\hline Bytes_received & Integer & Both \\
\hline Bytes_sent & Integer & Both \\
\hline Caching_sha2_password_rsa_pu & Striikgy & Global \\
\hline Com_admin_commands & Integer & Both \\
\hline Com_alter_db & Integer & Both \\
\hline Com_alter_event & Integer & Both \\
\hline Com_alter_function & Integer & Both \\
\hline Com_alter_procedure & Integer & Both \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Com_alter_resource_group & Integer & Global \\
\hline Com_alter_server & Integer & Both \\
\hline Com_alter_table & Integer & Both \\
\hline Com_alter_tablespace & Integer & Both \\
\hline Com_alter_user & Integer & Both \\
\hline Com_alter_user_default_role & Integer & Global \\
\hline Com_analyze & Integer & Both \\
\hline Com_assign_to_keycache & Integer & Both \\
\hline Com_begin & Integer & Both \\
\hline Com_binlog & Integer & Both \\
\hline Com_call_procedure & Integer & Both \\
\hline Com_change_db & Integer & Both \\
\hline Com_change_repl_filter & Integer & Both \\
\hline Com_change_replication_source & Integer & Both \\
\hline Com_check & Integer & Both \\
\hline Com_checksum & Integer & Both \\
\hline Com_clone & Integer & Global \\
\hline Com_commit & Integer & Both \\
\hline Com_create_db & Integer & Both \\
\hline Com_create_event & Integer & Both \\
\hline Com_create_function & Integer & Both \\
\hline Com_create_index & Integer & Both \\
\hline Com_create_procedure & Integer & Both \\
\hline Com_create_resource_group & Integer & Global \\
\hline Com_create_role & Integer & Global \\
\hline Com_create_server & Integer & Both \\
\hline Com_create_table & Integer & Both \\
\hline Com_create_trigger & Integer & Both \\
\hline Com_create_udf & Integer & Both \\
\hline Com_create_user & Integer & Both \\
\hline Com_create_view & Integer & Both \\
\hline Com_dealloc_sql & Integer & Both \\
\hline Com_delete & Integer & Both \\
\hline Com_delete_multi & Integer & Both \\
\hline Com_do & Integer & Both \\
\hline Com_drop_db & Integer & Both \\
\hline Com_drop_event & Integer & Both \\
\hline Com_drop_function & Integer & Both \\
\hline Com_drop_index & Integer & Both \\
\hline Com_drop_procedure & Integer & Both \\
\hline Com_drop_resource_group & Integer & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Com_drop_role & Integer & Global \\
\hline Com_drop_server & Integer & Both \\
\hline Com_drop_table & Integer & Both \\
\hline Com_drop_trigger & Integer & Both \\
\hline Com_drop_user & Integer & Both \\
\hline Com_drop_view & Integer & Both \\
\hline Com_empty_query & Integer & Both \\
\hline Com_execute_sql & Integer & Both \\
\hline Com_explain_other & Integer & Both \\
\hline Com_flush & Integer & Both \\
\hline Com_get_diagnostics & Integer & Both \\
\hline Com_grant & Integer & Both \\
\hline Com_grant_roles & Integer & Global \\
\hline Com_group_replication_start & Integer & Global \\
\hline Com_group_replication_stop & Integer & Global \\
\hline Com_ha_close & Integer & Both \\
\hline Com_ha_open & Integer & Both \\
\hline Com_ha_read & Integer & Both \\
\hline Com_help & Integer & Both \\
\hline Com_insert & Integer & Both \\
\hline Com_insert_select & Integer & Both \\
\hline Com_install_component & Integer & Global \\
\hline Com_install_plugin & Integer & Both \\
\hline Com_kill & Integer & Both \\
\hline Com_load & Integer & Both \\
\hline Com_lock_tables & Integer & Both \\
\hline Com_optimize & Integer & Both \\
\hline Com_preload_keys & Integer & Both \\
\hline Com_prepare_sql & Integer & Both \\
\hline Com_purge & Integer & Both \\
\hline Com_purge_before_date & Integer & Both \\
\hline Com_release_savepoint & Integer & Both \\
\hline Com_rename_table & Integer & Both \\
\hline Com_rename_user & Integer & Both \\
\hline Com_repair & Integer & Both \\
\hline Com_replace & Integer & Both \\
\hline Com_replace_select & Integer & Both \\
\hline Com_replica_start & Integer & Both \\
\hline Com_replica_stop & Integer & Both \\
\hline Com_reset & Integer & Both \\
\hline Com_resignal & Integer & Both \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Com_restart & Integer & Both \\
\hline Com_revoke & Integer & Both \\
\hline Com_revoke_all & Integer & Both \\
\hline Com_revoke_roles & Integer & Global \\
\hline Com_rollback & Integer & Both \\
\hline Com_rollback_to_savepoint & Integer & Both \\
\hline Com_savepoint & Integer & Both \\
\hline Com_select & Integer & Both \\
\hline Com_set_option & Integer & Both \\
\hline Com_set_resource_group & Integer & Global \\
\hline Com_set_role & Integer & Global \\
\hline Com_show_authors & Integer & Both \\
\hline Com_show_binary_log_status & Integer & Both \\
\hline Com_show_binlog_events & Integer & Both \\
\hline Com_show_binlogs & Integer & Both \\
\hline Com_show_charsets & Integer & Both \\
\hline Com_show_collations & Integer & Both \\
\hline Com_show_contributors & Integer & Both \\
\hline Com_show_create_db & Integer & Both \\
\hline Com_show_create_event & Integer & Both \\
\hline Com_show_create_func & Integer & Both \\
\hline Com_show_create_proc & Integer & Both \\
\hline Com_show_create_table & Integer & Both \\
\hline Com_show_create_trigger & Integer & Both \\
\hline Com_show_create_user & Integer & Both \\
\hline Com_show_databases & Integer & Both \\
\hline Com_show_engine_logs & Integer & Both \\
\hline Com_show_engine_mutex & Integer & Both \\
\hline Com_show_engine_status & Integer & Both \\
\hline Com_show_errors & Integer & Both \\
\hline Com_show_events & Integer & Both \\
\hline Com_show_fields & Integer & Both \\
\hline Com_show_function_code & Integer & Both \\
\hline Com_show_function_status & Integer & Both \\
\hline Com_show_grants & Integer & Both \\
\hline Com_show_keys & Integer & Both \\
\hline Com_show_ndb_status & Integer & Both \\
\hline Com_show_open_tables & Integer & Both \\
\hline Com_show_plugins & Integer & Both \\
\hline Com_show_privileges & Integer & Both \\
\hline Com_show_procedure_code & Integer & Both \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Com_show_procedure_status & Integer & Both \\
\hline Com_show_processlist & Integer & Both \\
\hline Com_show_profile & Integer & Both \\
\hline Com_show_profiles & Integer & Both \\
\hline Com_show_relaylog_events & Integer & Both \\
\hline Com_show_replica_status & Integer & Both \\
\hline Com_show_replicas & Integer & Both \\
\hline Com_show_status & Integer & Both \\
\hline Com_show_storage_engines & Integer & Both \\
\hline Com_show_table_status & Integer & Both \\
\hline Com_show_tables & Integer & Both \\
\hline Com_show_triggers & Integer & Both \\
\hline Com_show_variables & Integer & Both \\
\hline Com_show_warnings & Integer & Both \\
\hline Com_shutdown & Integer & Both \\
\hline Com_signal & Integer & Both \\
\hline Com_stmt_close & Integer & Both \\
\hline Com_stmt_execute & Integer & Both \\
\hline Com_stmt_fetch & Integer & Both \\
\hline Com_stmt_prepare & Integer & Both \\
\hline Com_stmt_reprepare & Integer & Both \\
\hline Com_stmt_reset & Integer & Both \\
\hline Com_stmt_send_long_data & Integer & Both \\
\hline Com_truncate & Integer & Both \\
\hline Com_uninstall_component & Integer & Global \\
\hline Com_uninstall_plugin & Integer & Both \\
\hline Com_unlock_tables & Integer & Both \\
\hline Com_update & Integer & Both \\
\hline Com_update_multi & Integer & Both \\
\hline Com_xa_commit & Integer & Both \\
\hline Com_xa_end & Integer & Both \\
\hline Com_xa_prepare & Integer & Both \\
\hline Com_xa_recover & Integer & Both \\
\hline Com_xa_rollback & Integer & Both \\
\hline Com_xa_start & Integer & Both \\
\hline Compression & Integer & Session \\
\hline Compression_algorithm & String & Global \\
\hline Compression_level & Integer & Global \\
\hline Connection_control_delay_genera & tateger & Global \\
\hline Connection_errors_accept & Integer & Global \\
\hline Connection_errors_internal & Integer & Global \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Server Status Variable Reference}
\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Connection_errors_max_connecti & dnteger & Global \\
\hline Connection_errors_peer_address & Integer & Global \\
\hline Connection_errors_select & Integer & Global \\
\hline Connection_errors_tcpwrap & Integer & Global \\
\hline Connections & Integer & Global \\
\hline Created_tmp_disk_tables & Integer & Both \\
\hline Created_tmp_files & Integer & Global \\
\hline Created_tmp_tables & Integer & Both \\
\hline Current_tls_ca & File name & Global \\
\hline Current_tls_capath & Directory name & Global \\
\hline Current_tls_cert & File name & Global \\
\hline Current_tls_cipher & String & Global \\
\hline Current_tls_ciphersuites & String & Global \\
\hline Current_tls_crl & File name & Global \\
\hline Current_tls_crlpath & Directory name & Global \\
\hline Current_tls_key & File name & Global \\
\hline Current_tls_version & String & Global \\
\hline Delayed_errors & Integer & Global \\
\hline Delayed_insert_threads & Integer & Global \\
\hline Delayed_writes & Integer & Global \\
\hline Deprecated_use_i_s_processlist_ & doteger & Global \\
\hline Deprecated_use_i_s_processlist & lastegienestamp & Global \\
\hline dragnet.Status & String & Global \\
\hline Error_log_buffered_bytes & Integer & Global \\
\hline Error_log_buffered_events & Integer & Global \\
\hline Error_log_expired_events & Integer & Global \\
\hline Error_log_latest_write & Integer & Global \\
\hline Firewall_access_denied & Integer & Global \\
\hline Firewall_access_granted & Integer & Global \\
\hline Firewall_access_suspicious & Integer & Global \\
\hline Firewall_cached_entries & Integer & Global \\
\hline Flush_commands & Integer & Global \\
\hline Global_connection_memory & Integer & Global \\
\hline Gr_all_consensus_proposals_cou & mnteger & Both \\
\hline Gr_all_consensus_time_sum & Integer & Both \\
\hline Gr_certification_garbage_collecto & Integet & Both \\
\hline Gr_certification_garbage_collecto & Intergersum & Both \\
\hline Gr_consensus_bytes_received_su & umteger & Both \\
\hline Gr_consensus_bytes_sent_sum & Integer & Both \\
\hline Gr_control_messages_sent_bytes & Irstenger & Both \\
\hline Gr_control_messages_sent_count & Integer & Both \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Gr_control_messages_sent_round & Itnitægene_sum & Both \\
\hline Gr_data_messages_sent_bytes_s & sumteger & Both \\
\hline Gr_data_messages_sent_count & Integer & Both \\
\hline Gr_data_messages_sent_roundtri & pnttenger_sum & Both \\
\hline Gr_empty_consensus_proposals & doterigter & Both \\
\hline Gr_extended_consensus_count & Integer & Both \\
\hline Gr_flow_control_throttle_active_c & olunteger & Global \\
\hline Gr_flow_control_throttle_count & Integer & Global \\
\hline Gr_flow_control_throttle_last_thro & tDettetimestamp & Global \\
\hline Gr_flow_control_throttle_time_sum & Integer & Global \\
\hline Gr_last_consensus_end_timestam & Ipteger & Both \\
\hline Gr_total_messages_sent_count & Integer & Both \\
\hline Gr_transactions_consistency_after & Insgger_count & Both \\
\hline Gr_transactions_consistency_after & Insgger_time_sum & Both \\
\hline Gr_transactions_consistency_after & Intergenation_count & Both \\
\hline Gr_transactions_consistency_after & Intergeination_time_sum & Both \\
\hline Gr_transactions_consistency_befo & hetelgegin_count & Both \\
\hline Gr_transactions_consistency_befo & hetelogegin_time_sum & Both \\
\hline Handler_commit & Integer & Both \\
\hline Handler_delete & Integer & Both \\
\hline Handler_discover & Integer & Both \\
\hline Handler_external_lock & Integer & Both \\
\hline Handler_mrr_init & Integer & Both \\
\hline Handler_prepare & Integer & Both \\
\hline Handler_read_first & Integer & Both \\
\hline Handler_read_key & Integer & Both \\
\hline Handler_read_last & Integer & Both \\
\hline Handler_read_next & Integer & Both \\
\hline Handler_read_prev & Integer & Both \\
\hline Handler_read_rnd & Integer & Both \\
\hline Handler_read_rnd_next & Integer & Both \\
\hline Handler_rollback & Integer & Both \\
\hline Handler_savepoint & Integer & Both \\
\hline Handler_savepoint_rollback & Integer & Both \\
\hline Handler_update & Integer & Both \\
\hline Handler_write & Integer & Both \\
\hline Innodb_buffer_pool_bytes_data & Integer & Global \\
\hline Innodb_buffer_pool_bytes_dirty & Integer & Global \\
\hline Innodb_buffer_pool_dump_status & String & Global \\
\hline Innodb_buffer_pool_load_status & String & Global \\
\hline Innodb_buffer_pool_pages_data & Integer & Global \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Server Status Variable Reference}
\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Innodb_buffer_pool_pages_dirty & Integer & Global \\
\hline Innodb_buffer_pool_pages_flushe & dhteger & Global \\
\hline Innodb_buffer_pool_pages_free & Integer & Global \\
\hline Innodb_buffer_pool_pages_latche & dhteger & Global \\
\hline Innodb_buffer_pool_pages_misc & Integer & Global \\
\hline Innodb_buffer_pool_pages_total & Integer & Global \\
\hline Innodb_buffer_pool_read_ahead & Integer & Global \\
\hline Innodb_buffer_pool_read_ahead & \&ntegret & Global \\
\hline Innodb_buffer_pool_read_ahead & rimdieger & Global \\
\hline Innodb_buffer_pool_read_request & \$nteger & Global \\
\hline Innodb_buffer_pool_reads & Integer & Global \\
\hline Innodb_buffer_pool_resize_status & String & Global \\
\hline Innodb_buffer_pool_resize_status & Intedger & Global \\
\hline Innodb_buffer_pool_resize_status & Ipregress & Global \\
\hline Innodb_buffer_pool_wait_free & Integer & Global \\
\hline Innodb_buffer_pool_write_reques & snteger & Global \\
\hline Innodb_data_fsyncs & Integer & Global \\
\hline Innodb_data_pending_fsyncs & Integer & Global \\
\hline Innodb_data_pending_reads & Integer & Global \\
\hline Innodb_data_pending_writes & Integer & Global \\
\hline Innodb_data_read & Integer & Global \\
\hline Innodb_data_reads & Integer & Global \\
\hline Innodb_data_writes & Integer & Global \\
\hline Innodb_data_written & Integer & Global \\
\hline Innodb_dblwr_pages_written & Integer & Global \\
\hline Innodb_dblwr_writes & Integer & Global \\
\hline Innodb_have_atomic_builtins & Integer & Global \\
\hline Innodb_log_waits & Integer & Global \\
\hline Innodb_log_write_requests & Integer & Global \\
\hline Innodb_log_writes & Integer & Global \\
\hline Innodb_num_open_files & Integer & Global \\
\hline Innodb_os_log_fsyncs & Integer & Global \\
\hline Innodb_os_log_pending_fsyncs & Integer & Global \\
\hline Innodb_os_log_pending_writes & Integer & Global \\
\hline Innodb_os_log_written & Integer & Global \\
\hline Innodb_page_size & Integer & Global \\
\hline Innodb_pages_created & Integer & Global \\
\hline Innodb_pages_read & Integer & Global \\
\hline Innodb_pages_written & Integer & Global \\
\hline Innodb_redo_log_capacity_resize & dnteger & Global \\
\hline Innodb_redo_log_checkpoint_Isn & Integer & Global \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Innodb_redo_log_current_Isn & Integer & Global \\
\hline Innodb_redo_log_enabled & Boolean & Global \\
\hline Innodb_redo_log_flushed_to_disk & Ihteger & Global \\
\hline Innodb_redo_log_logical_size & Integer & Global \\
\hline Innodb_redo_log_physical_size & Boolean & Global \\
\hline Innodb_redo_log_read_only & Boolean & Global \\
\hline Innodb_redo_log_resize_status & String & Global \\
\hline Innodb_redo_log_uuid & Integer & Global \\
\hline Innodb_row_lock_current_waits & Integer & Global \\
\hline Innodb_row_lock_time & Integer & Global \\
\hline Innodb_row_lock_time_avg & Integer & Global \\
\hline Innodb_row_lock_time_max & Integer & Global \\
\hline Innodb_row_lock_waits & Integer & Global \\
\hline Innodb_rows_deleted & Integer & Global \\
\hline Innodb_rows_inserted & Integer & Global \\
\hline Innodb_rows_read & Integer & Global \\
\hline Innodb_rows_updated & Integer & Global \\
\hline Innodb_system_rows_deleted & Integer & Global \\
\hline Innodb_system_rows_inserted & Integer & Global \\
\hline Innodb_system_rows_read & Integer & Global \\
\hline Innodb_system_rows_updated & Integer & Global \\
\hline Innodb_truncated_status_writes & Integer & Global \\
\hline Innodb_undo_tablespaces_active & Integer & Global \\
\hline Innodb_undo_tablespaces_explici & Unteger & Global \\
\hline Innodb_undo_tablespaces_implic & Unteger & Global \\
\hline Innodb_undo_tablespaces_total & Integer & Global \\
\hline Key_blocks_not_flushed & Integer & Global \\
\hline Key_blocks_unused & Integer & Global \\
\hline Key_blocks_used & Integer & Global \\
\hline Key_read_requests & Integer & Global \\
\hline Key_reads & Integer & Global \\
\hline Key_write_requests & Integer & Global \\
\hline Key_writes & Integer & Global \\
\hline Last_query_cost & Numeric & Session \\
\hline Last_query_partial_plans & Integer & Session \\
\hline Locked_connects & Integer & Global \\
\hline Max_execution_time_exceeded & Integer & Both \\
\hline Max_execution_time_set & Integer & Both \\
\hline Max_execution_time_set_failed & Integer & Both \\
\hline Max_used_connections & Integer & Global \\
\hline Max_used_connections_time & Datetime & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline mecab_charset & String & Global \\
\hline Mysqlx_aborted_clients & Integer & Global \\
\hline Mysqlx_address & String & Global \\
\hline Mysqlx_bytes_received & Integer & Both \\
\hline Mysqlx_bytes_received_compres\$ & sedegayload & Both \\
\hline Mysqlx_bytes_received_uncompr & essegeframe & Both \\
\hline Mysqlx_bytes_sent & Integer & Both \\
\hline Mysqlx_bytes_sent_compressed & pratyeged & Both \\
\hline Mysqlx_bytes_sent_uncompresse & dntregure & Both \\
\hline Mysqlx_compression_algorithm & String & Session \\
\hline Mysqlx_compression_level & String & Session \\
\hline Mysqlx_connection_accept_errors & Integer & Both \\
\hline Mysqlx_connection_errors & Integer & Both \\
\hline Mysqlx_connections_accepted & Integer & Global \\
\hline Mysqlx_connections_closed & Integer & Global \\
\hline Mysqlx_connections_rejected & Integer & Global \\
\hline Mysqlx_crud_create_view & Integer & Both \\
\hline Mysqlx_crud_delete & Integer & Both \\
\hline Mysqlx_crud_drop_view & Integer & Both \\
\hline Mysqlx_crud_find & Integer & Both \\
\hline Mysqlx_crud_insert & Integer & Both \\
\hline Mysqlx_crud_modify_view & Integer & Both \\
\hline Mysqlx_crud_update & Integer & Both \\
\hline Mysqlx_cursor_close & Integer & Both \\
\hline Mysqlx_cursor_fetch & Integer & Both \\
\hline Mysqlx_cursor_open & Integer & Both \\
\hline Mysqlx_errors_sent & Integer & Both \\
\hline Mysqlx_errors_unknown_messag & Integer & Both \\
\hline Mysqlx_expect_close & Integer & Both \\
\hline Mysqlx_expect_open & Integer & Both \\
\hline Mysqlx_init_error & Integer & Both \\
\hline Mysqlx_messages_sent & Integer & Both \\
\hline Mysqlx_notice_global_sent & Integer & Both \\
\hline Mysqlx_notice_other_sent & Integer & Both \\
\hline Mysqlx_notice_warning_sent & Integer & Both \\
\hline Mysqlx_notified_by_group_replica & tinoteger & Both \\
\hline Mysqlx_port & String & Global \\
\hline Mysqlx_prep_deallocate & Integer & Both \\
\hline Mysqlx_prep_execute & Integer & Both \\
\hline Mysqlx_prep_prepare & Integer & Both \\
\hline Mysqlx_rows_sent & Integer & Both \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Mysqlx_sessions & Integer & Global \\
\hline Mysqlx_sessions_accepted & Integer & Global \\
\hline Mysqlx_sessions_closed & Integer & Global \\
\hline Mysqlx_sessions_fatal_error & Integer & Global \\
\hline Mysqlx_sessions_killed & Integer & Global \\
\hline Mysqlx_sessions_rejected & Integer & Global \\
\hline Mysqlx_socket & String & Global \\
\hline Mysqlx_ssl_accept_renegotiates & Integer & Global \\
\hline Mysqlx_ssl_accepts & Integer & Global \\
\hline Mysqlx_ssl_active & Integer & Both \\
\hline Mysqlx_ssl_cipher & Integer & Both \\
\hline Mysqlx_ssl_cipher_list & Integer & Both \\
\hline Mysqlx_ssl_ctx_verify_depth & Integer & Both \\
\hline Mysqlx_ssl_ctx_verify_mode & Integer & Both \\
\hline Mysqlx_ssl_finished_accepts & Integer & Global \\
\hline Mysqlx_ssl_server_not_after & Integer & Global \\
\hline Mysqlx_ssl_server_not_before & Integer & Global \\
\hline Mysqlx_ssl_verify_depth & Integer & Global \\
\hline Mysqlx_ssl_verify_mode & Integer & Global \\
\hline Mysqlx_ssl_version & Integer & Both \\
\hline Mysqlx_stmt_create_collection & Integer & Both \\
\hline Mysqlx_stmt_create_collection_in & deteger & Both \\
\hline Mysqlx_stmt_disable_notices & Integer & Both \\
\hline Mysqlx_stmt_drop_collection & Integer & Both \\
\hline Mysqlx_stmt_drop_collection_inde & Integer & Both \\
\hline Mysqlx_stmt_enable_notices & Integer & Both \\
\hline Mysqlx_stmt_ensure_collection & String & Both \\
\hline Mysqlx_stmt_execute_mysqlx & Integer & Both \\
\hline Mysqlx_stmt_execute_sql & Integer & Both \\
\hline Mysqlx_stmt_execute_xplugin & Integer & Both \\
\hline Mysqlx_stmt_get_collection_optior & lateger & Both \\
\hline Mysqlx_stmt_kill_client & Integer & Both \\
\hline Mysqlx_stmt_list_clients & Integer & Both \\
\hline Mysqlx_stmt_list_notices & Integer & Both \\
\hline Mysqlx_stmt_list_objects & Integer & Both \\
\hline Mysqlx_stmt_modify_collection_op & dinoeger & Both \\
\hline Mysqlx_stmt_ping & Integer & Both \\
\hline Mysqlx_worker_threads & Integer & Global \\
\hline Mysqlx_worker_threads_active & Integer & Global \\
\hline Ndb_api_adaptive_send_deferred & Integetr & Global \\
\hline Ndb_api_adaptive_send_deferred & Intogetr_replica & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Ndb_api_adaptive_send_deferred & Integet_session & Global \\
\hline Ndb_api_adaptive_send_deferred & Integetr_slave & Global \\
\hline Ndb_api_adaptive_send_forced_ & duteger & Global \\
\hline Ndb_api_adaptive_send_forced_ & dutegæeplica & Global \\
\hline Ndb_api_adaptive_send_forced_ & qutegeression & Global \\
\hline Ndb_api_adaptive_send_forced_c & dutegerlave & Global \\
\hline Ndb_api_adaptive_send_unforced & Indeget & Global \\
\hline Ndb_api_adaptive_send_unforced & Indeget_replica & Global \\
\hline Ndb_api_adaptive_send_unforced & Integet_session & Global \\
\hline Ndb_api_adaptive_send_unforced & Indeget_slave & Global \\
\hline Ndb_api_bytes_received_count & Integer & Global \\
\hline Ndb_api_bytes_received_count_r & dplieger & Global \\
\hline Ndb_api_bytes_received_count_s & estegier & Session \\
\hline Ndb_api_bytes_received_count_s & lanteger & Global \\
\hline Ndb_api_bytes_sent_count & Integer & Global \\
\hline Ndb_api_bytes_sent_count_replic & dnteger & Global \\
\hline Ndb_api_bytes_sent_count_sessid & dnteger & Session \\
\hline Ndb_api_bytes_sent_count_slave & Integer & Global \\
\hline Ndb_api_event_bytes_count & Integer & Global \\
\hline Ndb_api_event_bytes_count_inje¢ & toteger & Global \\
\hline Ndb_api_event_data_count & Integer & Global \\
\hline Ndb_api_event_data_count_inject & dnteger & Global \\
\hline Ndb_api_event_nondata_count & Integer & Global \\
\hline Ndb_api_event_nondata_count_in & jeoegier & Global \\
\hline Ndb_api_pk_op_count & Integer & Global \\
\hline Ndb_api_pk_op_count_replica & Integer & Global \\
\hline Ndb_api_pk_op_count_session & Integer & Session \\
\hline Ndb_api_pk_op_count_slave & Integer & Global \\
\hline Ndb_api_pruned_scan_count & Integer & Global \\
\hline Ndb_api_pruned_scan_count_rep & llaæger & Global \\
\hline Ndb_api_pruned_scan_count_ses & smoeger & Session \\
\hline Ndb_api_pruned_scan_count_sla & Mteger & Global \\
\hline Ndb_api_range_scan_count & Integer & Global \\
\hline Ndb_api_range_scan_count_replid & dateger & Global \\
\hline Ndb_api_range_scan_count_sess & ilonteger & Session \\
\hline Ndb_api_range_scan_count_slave & Integer & Global \\
\hline Ndb_api_read_row_count & Integer & Global \\
\hline Ndb_api_read_row_count_replica & Integer & Global \\
\hline Ndb_api_read_row_count_sessio & Integer & Session \\
\hline Ndb_api_read_row_count_slave & Integer & Global \\
\hline Ndb_api_scan_batch_count & Integer & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline \multicolumn{2}{|l|}{Ndb_api_scan_batch_count_replickateger} & Global \\
\hline Ndb_api_scan_batch_count_sessi & ibnteger & Session \\
\hline Ndb_api_scan_batch_count_slave & Integer & Global \\
\hline Ndb_api_table_scan_count & Integer & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_table_scan_count_replicanteger} & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_table_scan_count_sessidnteger} & Session \\
\hline Ndb_api_table_scan_count_slave & Integer & Global \\
\hline Ndb_api_trans_abort_count & Integer & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_trans_abort_count_replicanteger} & Global \\
\hline Ndb_api_trans_abort_count_sessi & idmteger & Session \\
\hline Ndb_api_trans_abort_count_slave & Integer & Global \\
\hline Ndb_api_trans_close_count & Integer & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_trans_close_count_replickateger} & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_trans_close_count_sessibnteger} & Session \\
\hline \multicolumn{2}{|l|}{Ndb_api_trans_close_count_slavelnteger} & Global \\
\hline Ndb_api_trans_commit_count & Integer & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_trans_commit_count_replinæger} & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_trans_commit_count_seslsitoger} & Session \\
\hline Ndb_api_trans_commit_count_sla & Neteger & Global \\
\hline Ndb_api_trans_local_read_row_cd & dutteger & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_trans_local_read_row_cdutegreplica} & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_trans_local_read_row_cdutegession} & Session \\
\hline \multicolumn{2}{|l|}{Ndb_api_trans_local_read_row_cdutegslave} & Global \\
\hline Ndb_api_trans_start_count & Integer & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_trans_start_count_replicanteger} & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_trans_start_count_sessidmteger} & Session \\
\hline Ndb_api_trans_start_count_slave & Integer & Global \\
\hline Ndb_api_uk_op_count & Integer & Global \\
\hline Ndb_api_uk_op_count_replica & Integer & Global \\
\hline Ndb_api_uk_op_count_session & Integer & Session \\
\hline Ndb_api_uk_op_count_slave & Integer & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_wait_exec_complete_counteger} & Global \\
\hline Ndb_api_wait_exec_complete_cou & Untegeplica & Global \\
\hline Ndb_api_wait_exec_complete_co & Untegession & Session \\
\hline Ndb_api_wait_exec_complete_cou & Unteglerve & Global \\
\hline Ndb_api_wait_meta_request_cour & Integer & Global \\
\hline Ndb_api_wait_meta_request_cour & Integeica & Global \\
\hline & Integesion & Session \\
\hline Ndb_api_wait_meta_request_cour & Intelgee & Global \\
\hline Ndb_api_wait_nanos_count & Integer & Global \\
\hline \multicolumn{2}{|l|}{Ndb_api_wait_nanos_count_replicanteger} & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Ndb_api_wait_nanos_count_sess & unteger & Session \\
\hline Ndb_api_wait_nanos_count_slave & Integer & Global \\
\hline Ndb_api_wait_scan_result_count & Integer & Global \\
\hline Ndb_api_wait_scan_result_count & hetelger & Global \\
\hline Ndb_api_wait_scan_result_count & Btesjien & Session \\
\hline Ndb_api_wait_scan_result_count & Biæger & Global \\
\hline Ndb_cluster_node_id & Integer & Global \\
\hline Ndb_config_from_host & Integer & Both \\
\hline Ndb_config_from_port & Integer & Both \\
\hline Ndb_config_generation & Integer & Global \\
\hline Ndb_conflict_fn_epoch & Integer & Global \\
\hline Ndb_conflict_fn_epoch_trans & Integer & Global \\
\hline Ndb_conflict_fn_epoch2 & Integer & Global \\
\hline Ndb_conflict_fn_epoch2_trans & Integer & Global \\
\hline Ndb_conflict_fn_max & Integer & Global \\
\hline Ndb_conflict_fn_max_del_win & Integer & Global \\
\hline Ndb_conflict_fn_max_del_win_ins & Integer & Global \\
\hline Ndb_conflict_fn_max_ins & Integer & Global \\
\hline Ndb_conflict_fn_old & Integer & Global \\
\hline Ndb_conflict_last_conflict_epoch & Integer & Global \\
\hline Ndb_conflict_last_stable_epoch & Integer & Global \\
\hline Ndb_conflict_reflected_op_discard & Ilnteget & Global \\
\hline Ndb_conflict_reflected_op_prepar & Antegent & Global \\
\hline Ndb_conflict_refresh_op_count & Integer & Global \\
\hline Ndb_conflict_trans_conflict_comm & integent & Global \\
\hline Ndb_conflict_trans_detect_iter_co & untteger & Global \\
\hline Ndb_conflict_trans_reject_count & Integer & Global \\
\hline Ndb_conflict_trans_row_conflict_q & duteger & Global \\
\hline Ndb_conflict_trans_row_reject_co & uinteger & Global \\
\hline Ndb_epoch_delete_delete_count & Integer & Global \\
\hline Ndb_execute_count & Integer & Global \\
\hline Ndb_fetch_table_stats & Integer & Global \\
\hline Ndb_last_commit_epoch_server & Integer & Global \\
\hline Ndb_last_commit_epoch_session & Integer & Session \\
\hline Ndb_metadata_detected_count & Integer & Global \\
\hline Ndb_metadata_excluded_count & Integer & Global \\
\hline Ndb_metadata_synced_count & Integer & Global \\
\hline Ndb_cluster_node_id & Integer & Global \\
\hline Ndb_number_of_data_nodes & Integer & Global \\
\hline Ndb_pruned_scan_count & Integer & Global \\
\hline Ndb_pushed_queries_defined & Integer & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Ndb_pushed_queries_dropped & Integer & Global \\
\hline Ndb_pushed_queries_executed & Integer & Global \\
\hline Ndb_pushed_reads & Integer & Global \\
\hline Ndb_scan_count & Integer & Global \\
\hline Ndb_slave_max_replicated_epoch & Integer & Global \\
\hline Ndb_trans_hint_count_session & Integer & Both \\
\hline Not_flushed_delayed_rows & Integer & Global \\
\hline Ongoing_anonymous_gtid_violati & hontegersaction_count & Global \\
\hline Ongoing_anonymous_transaction & Intæger & Global \\
\hline Ongoing_automatic_gtid_violating & Integraction_count & Global \\
\hline Open_files & Integer & Global \\
\hline Open_streams & Integer & Global \\
\hline Open_table_definitions & Integer & Global \\
\hline Open_tables & Integer & Both \\
\hline Opened_files & Integer & Global \\
\hline Opened_table_definitions & Integer & Both \\
\hline Opened_tables & Integer & Both \\
\hline Performance_schema_accounts_ & disteger & Global \\
\hline Performance_schema_cond_class & serebest & Global \\
\hline Performance_schema_cond_insta & antegelost & Global \\
\hline Performance_schema_digest_lost & Integer & Global \\
\hline Performance_schema_file_classes & Sntegter & Global \\
\hline Performance_schema_file_handle & intleger & Global \\
\hline Performance_schema_file_instanc & casebrest & Global \\
\hline Performance_schema_hosts_lost & Integer & Global \\
\hline Performance_schema_index_stat & loteger & Global \\
\hline Performance_schema_locker_lost & Integer & Global \\
\hline Performance_schema_memory_c & lastegerlost & Global \\
\hline Performance_schema_metadata_ & Ibtteglerst & Global \\
\hline Performance_schema_meter_lost & Integer & Global \\
\hline Performance_schema_metric_lost & Integer & Global \\
\hline \multicolumn{2}{|l|}{Performance_schema_mutex_classmeggerst} & Global \\
\hline Performance_schema_mutex_inst & untegerlost & Global \\
\hline \multicolumn{2}{|l|}{Performance_schema_nested_statetegat_lost} & Global \\
\hline Performance_schema_prepared_ & shattegreents_lost & Global \\
\hline Performance_schema_program_lo & dstteger & Global \\
\hline \multicolumn{2}{|l|}{Performance_schema_rwlock_clasdsgest} & Global \\
\hline \multicolumn{2}{|l|}{Performance_schema_rwlock_instanteger_lost} & Global \\
\hline \multicolumn{2}{|c|}{Performance_schema_session_comnegerattrs_longest_seen} & Global \\
\hline \multicolumn{2}{|l|}{Performance_schema_session_colmnegerattrs_lost} & Global \\
\hline \multicolumn{2}{|l|}{Performance_schema_socket_cla\$Bergegenst} & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Performance_schema_socket_ins & thaneger lost & Global \\
\hline Performance_schema_stage_clas & \$retegest & Global \\
\hline Performance_schema_statement & mfœses_lost & Global \\
\hline Performance_schema_table_handl & dleredgest & Global \\
\hline Performance_schema_table_insta & hoteg. & Global \\
\hline Performance_schema_table_lock & Istetgerst & Global \\
\hline Performance_schema_thread_clas & Sategetost & Global \\
\hline Performance_schema_thread_inst & tanteger lost & Global \\
\hline Performance_schema_users_lost & Integer & Global \\
\hline Prepared_stmt_count & Integer & Global \\
\hline Queries & Integer & Both \\
\hline Questions & Integer & Both \\
\hline Replica_open_temp_tables & Integer & Global \\
\hline Resource_group_supported & Boolean & Global \\
\hline Rewriter_number_loaded_rules & Integer & Global \\
\hline Rewriter_number_reloads & Integer & Global \\
\hline Rewriter_number_rewritten_queri & esteger & Global \\
\hline Rewriter_reload_error & Boolean & Global \\
\hline Rpl_semi_sync_master_clients & Integer & Global \\
\hline Rpl_semi_sync_master_net_avg & Mrategtime & Global \\
\hline Rpl_semi_sync_master_net_wait & tinteger & Global \\
\hline Rpl_semi_sync_master_net_waits & Integer & Global \\
\hline Rpl_semi_sync_master_no_times & Integer & Global \\
\hline Rpl_semi_sync_master_no_tx & Integer & Global \\
\hline Rpl_semi_sync_master_status & Boolean & Global \\
\hline Rpl_semi_sync_master_timefunc & fatteges & Global \\
\hline Rpl_semi_sync_master_tx_avg_w & drittenjere & Global \\
\hline Rpl_semi_sync_master_tx_wait_t & inneeger & Global \\
\hline Rpl_semi_sync_master_tx_waits & Integer & Global \\
\hline Rpl_semi_sync_master_wait_pos & Ihæredyenaverse & Global \\
\hline Rpl_semi_sync_master_wait_ses & sinteger & Global \\
\hline Rpl_semi_sync_master_yes_tx & Integer & Global \\
\hline Rpl_semi_sync_replica_status & Boolean & Global \\
\hline Rpl_semi_sync_slave_status & Boolean & Global \\
\hline Rpl_semi_sync_source_clients & Integer & Global \\
\hline Rpl_semi_sync_source_net_avg & Mratiegtime & Global \\
\hline Rpl_semi_sync_source_net_wait & tinteger & Global \\
\hline Rpl_semi_sync_source_net_waits & Integer & Global \\
\hline Rpl_semi_sync_source_no_times & Integer & Global \\
\hline Rpl_semi_sync_source_no_tx & Integer & Global \\
\hline Rpl_semi_sync_source_status & Boolean & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Rpl_semi_sync_source_timefunc_ & fatleges & Global \\
\hline Rpl_semi_sync_source_tx_avg_w & & Global \\
\hline \multicolumn{2}{|l|}{Rpl_semi_sync_source_tx_wait_tinm eger} & Global \\
\hline Rpl_semi_sync_source_tx_waits & Integer & Global \\
\hline Rpl_semi_sync_source_wait_pos & llonergenaverse & Global \\
\hline \multicolumn{2}{|l|}{Rpl_semi_sync_source_wait_sessloteger} & Global \\
\hline Rpl_semi_sync_source_yes_tx & Integer & Global \\
\hline Rsa_public_key & String & Global \\
\hline Secondary_engine_execution_cou & umtteger & Both \\
\hline Select_full_join & Integer & Both \\
\hline Select_full_range_join & Integer & Both \\
\hline Select_range & Integer & Both \\
\hline Select_range_check & Integer & Both \\
\hline Select_scan & Integer & Both \\
\hline Slave_open_temp_tables & Integer & Global \\
\hline Slave_rows_last_search_algorithn & Stunisregd & Global \\
\hline Slow_launch_threads & Integer & Both \\
\hline Slow_queries & Integer & Both \\
\hline Sort_merge_passes & Integer & Both \\
\hline Sort_range & Integer & Both \\
\hline Sort_rows & Integer & Both \\
\hline Sort_scan & Integer & Both \\
\hline Ssl_accept_renegotiates & Integer & Global \\
\hline Ssl_accepts & Integer & Global \\
\hline Ssl_callback_cache_hits & Integer & Global \\
\hline Ssl_cipher & String & Both \\
\hline Ssl_cipher_list & String & Both \\
\hline Ssl_client_connects & Integer & Global \\
\hline Ssl_connect_renegotiates & Integer & Global \\
\hline Ssl_ctx_verify_depth & Integer & Global \\
\hline Ssl_ctx_verify_mode & Integer & Global \\
\hline Ssl_default_timeout & Integer & Both \\
\hline Ssl_finished_accepts & Integer & Global \\
\hline Ssl_finished_connects & Integer & Global \\
\hline Ssl_server_not_after & Integer & Both \\
\hline Ssl_server_not_before & Integer & Both \\
\hline Ssl_session_cache_hits & Integer & Global \\
\hline Ssl_session_cache_misses & Integer & Global \\
\hline Ssl_session_cache_mode & String & Global \\
\hline Ssl_session_cache_overflows & Integer & Global \\
\hline Ssl_session_cache_size & Integer & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Variable Name & Variable Type & Variable Scope \\
\hline Ssl_session_cache_timeout & Integer & Global \\
\hline Ssl_session_cache_timeouts & Integer & Global \\
\hline Ssl_sessions_reused & Integer & Session \\
\hline Ssl_used_session_cache_entries & Integer & Global \\
\hline Ssl_verify_depth & Integer & Both \\
\hline Ssl_verify_mode & Integer & Both \\
\hline Ssl_version & String & Both \\
\hline Table_locks_immediate & Integer & Global \\
\hline Table_locks_waited & Integer & Global \\
\hline Table_open_cache_hits & Integer & Both \\
\hline Table_open_cache_misses & Integer & Both \\
\hline Table_open_cache_overflows & Integer & Both \\
\hline Tc_log_max_pages_used & Integer & Global \\
\hline Tc_log_page_size & Integer & Global \\
\hline Tc_log_page_waits & Integer & Global \\
\hline Telemetry_metrics_supported & Boolean & Global \\
\hline Telemetry_traces_supported & Boolean & Global \\
\hline telemetry.live_sessions & Integer & Global \\
\hline Threads_cached & Integer & Global \\
\hline Threads_connected & Integer & Global \\
\hline Threads_created & Integer & Global \\
\hline Threads_running & Integer & Global \\
\hline TIs_library_version & String & Global \\
\hline TIs_sni_server_name & String & Session \\
\hline Uptime & Integer & Global \\
\hline Uptime_since_flush_status & Integer & Global \\
\hline validate_password_dictionary_file & Doretipaesed & Global \\
\hline validate_password_dictionary_file & Intergest_count & Global \\
\hline validate_password.dictionary_file_ & Datepinesed & Global \\
\hline validate_password.dictionary_file & unoegercount & Global \\
\hline
\end{tabular}

\subsection*{7.1.7 Server Command Options}

When you start the mysqld server, you can specify program options using any of the methods described in Section 6.2.2, "Specifying Program Options". The most common methods are to provide options in an option file or on the command line. However, in most cases it is desirable to make sure that the server uses the same options each time it runs. The best way to ensure this is to list them in an option file. See Section 6.2.2.2, "Using Option Files". That section also describes option file format and syntax.
mysqld reads options from the [mysqld] and [server] groups. mysqld_safe reads options from the [mysqld], [server], [mysqld_safe], and [safe_mysqld] groups. mysql. server reads options from the [mysqld] and [mysql.server] groups.
mysqld accepts many command options. For a brief summary, execute this command:
```
mysqld --help
```


To see the full list, use this command:
```
mysqld --verbose --help
```


Some of the items in the list are actually system variables that can be set at server startup. These can be displayed at runtime using the SHOW VARIABLES statement. Some items displayed by the preceding mysqld command do not appear in SHOW VARIABLES output; this is because they are options only and not system variables.

The following list shows some of the most common server options. Additional options are described in other sections:
- Options that affect security: See Section 8.1.4, "Security-Related mysqld Options and Variables".
- SSL-related options: See Command Options for Encrypted Connections.
- Binary log control options: See Section 7.4.4, "The Binary Log".
- Replication-related options: See Section 19.1.6, "Replication and Binary Logging Options and Variables".
- Options for loading plugins such as pluggable storage engines: See Section 7.6.1, "Installing and Uninstalling Plugins".
- Options specific to particular storage engines: See Section 17.14, "InnoDB Startup Options and System Variables" and Section 18.2.1, "MyISAM Startup Options".

Some options control the size of buffers or caches. For a given buffer, the server might need to allocate internal data structures. These structures typically are allocated from the total memory allocated to the buffer, and the amount of space required might be platform dependent. This means that when you assign a value to an option that controls a buffer size, the amount of space actually available might differ from the value assigned. In some cases, the amount might be less than the value assigned. It is also possible that the server adjusts a value upward. For example, if you assign a value of 0 to an option for which the minimal value is 1024 , the server sets the value to 1024.

Values for buffer sizes, lengths, and stack sizes are given in bytes unless otherwise specified.
Some options take file name values. Unless otherwise specified, the default file location is the data directory if the value is a relative path name. To specify the location explicitly, use an absolute path name. Suppose that the data directory is /var/mysql/data. If a file-valued option is given as a relative path name, it is located under /var/mysql/data. If the value is an absolute path name, its location is as given by the path name.

You can also set the values of server system variables at server startup by using variable names as options. To assign a value to a server system variable, use an option of the form --var_name=value. For example, --sort_buffer_size=384M sets the sort_buffer_size variable to a value of 384 MB .

When you assign a value to a variable, MySQL might automatically correct the value to stay within a given range, or adjust the value to the closest permissible value if only certain values are permitted.

To restrict the maximum value to which a system variable can be set at runtime with the SET statement, specify this maximum by using an option of the form --maximum-var_name=value at server startup.

You can change the values of most system variables at runtime with the SET statement. See Section 15.7.6.1, "SET Syntax for Variable Assignment".

Section 7.1.8, "Server System Variables", provides a full description for all variables, and additional information for setting them at server startup and runtime. For information on changing system variables, see Section 7.1.1, "Configuring the Server".
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display a short help message and exit. Use both the --verbose and --help options to see the full message.
- --allow-suspicious-udfs

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- allow-suspicious-udfs $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This option controls whether loadable functions that have only an $x x x$ symbol for the main function can be loaded. By default, the option is off and only loadable functions that have at least one auxiliary symbol can be loaded; this prevents attempts at loading functions from shared object files other than those containing legitimate functions. See Loadable Function Security Precautions.
- --ansi

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ansi \\
\hline
\end{tabular}

Use standard (ANSI) SQL syntax instead of MySQL syntax. For more precise control over the server SQL mode, use the --sql-mode option instead. See Section 1.7, "MySQL Standards Compliance", and Section 7.1.11, "Server SQL Modes".
- --basedir=dir_name, -b dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --basedir=dir_name \\
\hline System Variable & basedir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & parent of mysqld installation directory \\
\hline
\end{tabular}

The path to the MySQL installation directory. This option sets the basedir system variable.
The server executable determines its own full path name at startup and uses the parent of the directory in which it is located as the default basedir value. This in turn enables the server to use that basedir when searching for server-related information such as the share directory containing error messages.
- --check-table-functions=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --check-table-functions=value \\
\hline Type & Enumeration \\
\hline Default Value & ABORT \\
\hline Valid Values & WARN \\
\hline & ABORT \\
\hline
\end{tabular}

When performing an upgade of the server, we scan the data dictionary for functions used in table constraints and other expressions, including DEFAULT expressions, partitioning expressions, and
virtual columns. It is possible that a change in the behavior of the function causes it to raise an error in the new version of the server, where no such error occurred before in which case the table cannot be opened. This option provides a choice in how to handle such problems, according to which of the two values shown here is used:
- WARN: Log a warning for each table that cannot be opened.
- ABORT: Also logs a warning; in addition, the upgrade is stopped. This is the default. For a sufficiently high value of --log-error-verbosity, it also logs a note with a streamlined table definition listing only those expressions that potentially contain SQL functions.

The default behaviour is to abort the upgrade, so that the user can fix the issue using the older version of the server, before upgrading to the newer one. Use WARN to continue the upgrade in interactive mode while reporting any issues.

The --check-table-functions option was introduced in MySQL 8.4.5.
- --chroot=dir_name, -r dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -chroot=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

Put the mysqld server in a closed environment during startup by using the chroot ( ) system call. This is a recommended security measure. Use of this option somewhat limits LOAD DATA and SELECT ... INTO OUTFILE.
- --console

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -console \\
\hline Platform Specific & Windows \\
\hline
\end{tabular}
(Windows only.) Cause the default error log destination to be the console. This affects log sinks that base their own output destination on the default destination. See Section 7.4.2, "The Error Log". mysqld does not close the console window if this option is used.
--console takes precedence over--log-error if both are given.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

When this option is used, write a core file if mysqld dies; no arguments are needed (or accepted). The name and location of the core file is system dependent. On Linux, a core file named core.pid is written to the current working directory of the process, which for mysqld is the data directory. pid represents the process ID of the server process. On macOS, a core file named core.pid is written to the /cores directory. On Solaris, use the coreadm command to specify where to write the core file and how to name it.

For some systems, to get a core file you must also specify the --core-file-size option to mysqld_safe. See Section 6.3.2, "mysqld_safe - MySQL Server Startup Script". On some systems, such as Solaris, you do not get a core file if you are also using the --user option. There might be additional restrictions or limitations. For example, it might be necessary to execute ulimit -c unlimited before starting the server. Consult your system documentation.

The innodb_buffer_pool_in_core_file variable can be used to reduce the size of core files on operating systems that support it. For more information, see Section 17.8.3.7, "Excluding or Including Buffer Pool Pages from Core Files".
- --daemonize, -D

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - daemonize $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This option causes the server to run as a traditional, forking daemon, permitting it to work with operating systems that use systemd for process control. For more information, see Section 2.5.9, "Managing MySQL Server with systemd".
--daemonize is mutually exclusive with --initialize and --initialize-insecure.
If the server is started using the --daemonize option and is not connected to a tty device, a default error logging option of--log-error="" is used in the absence of an explicit logging option, to direct error output to the default log file.
-D is a synonym for --daemonize.
- --datadir=dir_name, -h dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --datadir=dir_name \\
\hline System Variable & datadir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline
\end{tabular}

The path to the MySQL server data directory. This option sets the datadir system variable. See the description of that variable.
- --debug[=debug_options], -\# [debug_options]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --debug[=debug_options] \\
\hline System Variable & debug \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value (Unix) & d:t:i:o,/tmp/mysqld.trace \\
\hline Default Value (Windows) & d:t:i:0, \mysqld.trace \\
\hline
\end{tabular}

If MySQL is configured with the - DWITH_DEBUG=1 CMake option, you can use this option to get a trace file of what mysqld is doing. A typical debug_options string is d:t:o,file_name. The default is d:t:i:o,/tmp/mysqld.trace on Unix and d:t:i:0, \mysqld.trace on Windows.

Using - DWITH_DEBUG=1 to configure MySQL with debugging support enables you to use the debug="d, parser_debug" option when you start the server. This causes the Bison parser that is used to process SQL statements to dump a parser trace to the server's standard error output. Typically, this output is written to the error log.

This option may be given multiple times. Values that begin with + or - are added to or subtracted from the previous value. For example, --debug=T --debug=+P sets the value to $\mathrm{P}: \mathrm{T}$.
- --debug-sync-timeout[=N]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug-sync-timeout [=\#] \\
\hline Type & Integer \\
\hline
\end{tabular}

Controls whether the Debug Sync facility for testing and debugging is enabled. Use of Debug Sync requires that MySQL be configured with the -DWITH_DEBUG=ON CMake option (see Section 2.8.7, "MySQL Source-Configuration Options"); otherwise, this option is not available. The option value is a timeout in seconds. The default value is 0 , which disables Debug Sync. To enable it, specify a value greater than 0 ; this value also becomes the default timeout for individual synchronization points. If the option is given without a value, the timeout is set to 300 seconds.

For a description of the Debug Sync facility and how to use synchronization points, see MySQL Internals: Test Synchronization.
- --default-time-zone=timezone

\begin{tabular}{|l|l|}
\hline Command-Line Format & --default-time-zone=name \\
\hline Type & String \\
\hline
\end{tabular}

Set the default server time zone. This option sets the global time_zone system variable. If this option is not given, the default time zone is the same as the system time zone (given by the value of the system_time_zone system variable.

The system_time_zone variable differs from time_zone. Although they might have the same value, the latter variable is used to initialize the time zone for each client that connects. See Section 7.1.15, "MySQL Server Time Zone Support".
- --defaults-extra-file=file_name

Read this option file after the global option file but (on Unix) before the user option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory. This must be the first option on the command line if it is used.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-file=file_name

Read only the given option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

Exception: Even with --defaults-file, mysqld reads mysqld-auto.cnf.

\section*{Note}

This must be the first option on the command line if it is used, except that if the server is started with the --defaults-file and --install (or -install-manual) options, --install (or --install-manual) must be first.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-group-suffix=str

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, mysqld normally reads the [mysqld] group. If this option is given as --defaults-group-suffix=_other, mysqld also reads the [mysqld_other] group.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --early-plugin-load=plugin_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --early-plugin-load=plugin_list \\
\hline Type & String \\
\hline Default Value & empty string \\
\hline
\end{tabular}

This option tells the server which plugins to load before loading mandatory built-in plugins and before storage engine initialization. Early loading is supported only for plugins compiled with PLUGIN_OPT_ALLOW_EARLY. If multiple - -early-plugin-load options are given, only the last one applies.

The option value is a semicolon-separated list of plugin_library and name=plugin_library values. Each plugin_library is the name of a library file that contains plugin code, and each name is the name of a plugin to load. If a plugin library is named without any preceding plugin name, the server loads all plugins in the library. With a preceding plugin name, the server loads only the named plugin from the library. The server looks for plugin library files in the directory named by the plugin_dir system variable.

For example, if plugins named myplug1 and myplug2 are contained in the plugin library files myplug1.so and myplug2.so, use this option to perform an early plugin load:
mysqld --early-plugin-load="myplug1=myplug1.so;myplug2=myplug2.so"

Quotes surround the argument value because otherwise some command interpreters interpret semicolon (;) as a special character. (For example, Unix shells treat it as a command terminator.)

Each named plugin is loaded early for a single invocation of mysqld only. After a restart, the plugin is not loaded early unless--early-plugin-load is used again.

If the server is started using --initialize or --initialize-insecure, plugins specified by --early-plugin-load are not loaded.

If the server is run with - - help, plugins specified by --early-plugin-load are loaded but not initialized. This behavior ensures that plugin options are displayed in the help message.

InnoDB tablespace encryption relies on the MySQL Keyring for encryption key management, and the keyring plugin to be used must be loaded prior to storage engine initialization to facilitate InnoDB recovery for encrypted tables. For example, administrators who want the keyring_okv plugin loaded at startup should use --early-plugin-load with the appropriate option value (such as keyring_okv.so on Unix and Unix-like systems or keyring_okv.dll on Windows).

For information about InnoDB tablespace encryption, see Section 17.13, "InnoDB Data-at-Rest Encryption". For general information about plugin loading, see Section 7.6.1, "Installing and Uninstalling Plugins".

\section*{Note}

For MySQL Keyring, this option is used only when the keystore is managed with a keyring plugin. If keystore management uses a keyring component rather than a plugin, specify component loading using a manifest file; see Section 8.4.4.2, "Keyring Component Installation".
- --exit-info[=flags],-T [flags]

\begin{tabular}{|l|l|} 
Type & Integer \\
\hline
\end{tabular}

This is a bitmask of different flags that you can use for debugging the mysqld server. Do not use this option unless you know exactly what it does!
- --external-locking

\begin{tabular}{|l|l|}
\hline Command-Line Format & --external-locking[=\{OFF|ON\}] \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enable external locking (system locking), which is disabled by default. If you use this option on a system on which lockd does not fully work (such as Linux), it is easy for mysqld to deadlock.

To disable external locking explicitly, use --skip-external-locking.
External locking affects only MyISAM table access. For more information, including conditions under which it can and cannot be used, see Section 10.11.5, "External Locking".
- --flush

\begin{tabular}{|l|l|}
\hline Command-Line Format & --flush[=\{OFF|ON\}] \\
\hline System Variable & flush \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Flush (synchronize) all changes to disk after each SQL statement. Normally, MySQL does a write of all changes to disk only after each SQL statement and lets the operating system handle the synchronizing to disk. See Section B.3.3.3, "What to Do If MySQL Keeps Crashing".

\section*{Note}

If --flush is specified, the value of flush_time does not matter and changes to flush_time have no effect on flush behavior.
- --gdb

\begin{tabular}{|l|l|}
\hline Command-Line Format & $--\mathrm{gdb}[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Install an interrupt handler for SIGINT (needed to stop mysqld with $\wedge \mathrm{C}$ to set breakpoints) and disable stack tracing and core file handling. See Section 7.9.1.4, "Debugging mysqld under gdb".

On Windows, this option also suppresses the forking that is used to implement the RESTART statement: Forking enables one process to act as a monitor to the other, which acts as the server. However, forking makes determining the server process to attach to for debugging more difficult, so starting the server with --gdb suppresses forking. For a server started with this option, RESTART simply exits and does not restart.

In non-debug settings, --no-monitor may be used to suppress forking the monitor process.
- --initialize, -I

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- initialize $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This option is used to initialize a MySQL installation by creating the data directory and populating the tables in the mysql system schema. For more information, see Section 2.9.1, "Initializing the Data Directory".

This option limits the effects of, or is not compatible with, a number of other startup options for the MySQL server. Some of the most common issues of this sort are noted here:
- We strongly recommend, when initializing the data directory with --initialize, that you specify no additional options other than --datadir, other options used for setting directory locations such as -- basedir, and possibly --user, if required. Options for the running MySQL server can be specified when starting it once initialization has been completed and mysqld has shut down. This also applies when using --initialize-insecure instead of --initialize.
- When the server is started with --initialize, some functionality is unavailable that limits the statements permitted in any file named by the init_file system variable. For more information, see the description of that variable. In addition, the disabled_storage_engines system variable has no effect.
- The --ndbcluster option is ignored when used together with --initialize.
- --initialize is mutually exclusive with --bootstrap and --daemonize.

The items in the preceding list also apply when initializing the server using the --initializeinsecure option.
- --initialize-insecure

\begin{tabular}{|l|l|}
\hline Command-Line Format & --initialize-insecure[=\{OFF|ON\}] \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This option is used to initialize a MySQL installation by creating the data directory and populating the tables in the mysql system schema. This option implies --initialize, and the same restrictions and limitations apply; for more information, see the description of that option, and Section 2.9.1, "Initializing the Data Directory".

\section*{Warning}

This option creates a MySQL root user with an empty password, which is insecure. For this reason, do not use it in production without setting this password manually. See Post-Initialization root Password Assignment, for information about how to do this.
- --innodb-xxx

Set an option for the InnoDB storage engine. The InnoDB options are listed in Section 17.14, "InnoDB Startup Options and System Variables".
- --install [service_name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --install [service_name] \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Platform Specific & Windows \\
\hline
\end{tabular}
(Windows only) Install the server as a Windows service that starts automatically during Windows startup. The default service name is MySQL if no service_name value is given. For more information, see Section 2.3.3.8, "Starting MySQL as a Windows Service".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0737.jpg?height=177&width=264&top_left_y=511&top_left_x=404)

Note
If the server is started with the --defaults-file and --install options, --install must be first.
- --install-manual [service_name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --install-manual [service_name] \\
\hline Platform Specific & Windows \\
\hline
\end{tabular}
(Windows only) Install the server as a Windows service that must be started manually. It does not start automatically during Windows startup. The default service name is MySQL if no service_name value is given. For more information, see Section 2.3.3.8, "Starting MySQL as a Windows Service".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0737.jpg?height=113&width=97&top_left_y=1155&top_left_x=404)

Note

If the server is started with the --defaults-file and --install-manual options, --install-manual must be first.
- --large-pages

\begin{tabular}{|l|l|}
\hline Command-Line Format & --large-pages[=\{OFF|ON\}] \\
\hline System Variable & large_pages \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Platform Specific & Linux \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Some hardware/operating system architectures support memory pages greater than the default (usually 4 KB ). The actual implementation of this support depends on the underlying hardware and operating system. Applications that perform a lot of memory accesses may obtain performance improvements by using large pages due to reduced Translation Lookaside Buffer (TLB) misses.

MySQL supports the Linux implementation of large page support (which is called HugeTLB in Linux). See Section 10.12.3.3, "Enabling Large Page Support". For Solaris support of large pages, see the description of the --super-large-pages option.
--large-pages is disabled by default.
- --lc-messages=locale_name

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --lc-messages=name & \\
\hline System Variable & lc_messages & \\
\hline Scope & Global, Session & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & 707 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline Default Value & en_US \\
\hline
\end{tabular}

The locale to use for error messages. The default is en_US. The server converts the argument to a language name and combines it with the value of --lc-messages-dir to produce the location for the error message file. See Section 12.12, "Setting the Error Message Language".
- --lc-messages-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lc-messages-dir=dir_name \\
\hline System Variable & lc_messages_dir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory where error messages are located. The server uses the value together with the value of --lc-messages to produce the location for the error message file. See Section 12.12, "Setting the Error Message Language".
- --local-service

\begin{tabular}{|l|l|}
\hline Command-Line Format & --local-service \\
\hline
\end{tabular}
(Windows only) A --local-service option following the service name causes the server to run using the LocalService Windows account that has limited system privileges. If both --defaults-file and--local-service are given following the service name, they can be in any order. See Section 2.3.3.8, "Starting MySQL as a Windows Service".
- --log-error[=file_name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-error[=file_name] \\
\hline System Variable & log_error \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

Set the default error log destination to the named file. This affects log sinks that base their own output destination on the default destination. See Section 7.4.2, "The Error Log".

If the option names no file, the default error log destination on Unix and Unix-like systems is a file named host_name. err in the data directory. The default destination on Windows is the same, unless the --pid-file option is specified. In that case, the file name is the PID file base name with a suffix of .err in the data directory.

If the option names a file, the default destination is that file (with an . err suffix added if the name has no suffix), located under the data directory unless an absolute path name is given to specify a different location.

If error log output cannot be redirected to the error log file, an error occurs and startup fails.
On Windows, --console takes precedence over--log-error if both are given. In this case, the default error log destination is the console rather than a file.
- --log-isam[=file_name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-isam[=file_name] \\
\hline Type & File name \\
\hline
\end{tabular}

Log all MyISAM changes to this file (used only when debugging MyISAM).
- --log-raw

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-raw[=\{OFF|ON\}] \\
\hline System Variable & log_raw \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Passwords in certain statements written to the general query log, slow query log, and binary log are rewritten by the server not to occur literally in plain text. Password rewriting can be suppressed for the general query log by starting the server with the --log-raw option. This option may be useful for diagnostic purposes, to see the exact text of statements as received by the server, but for security reasons is not recommended for production use.

If a query rewrite plugin is installed, the --log-raw option affects statement logging as follows:
- Without - - log-raw, the server logs the statement returned by the query rewrite plugin. This may differ from the statement as received.
- With - - log-raw, the server logs the original statement as received.

For more information, see Section 8.1.2.3, "Passwords and Logging".
- --log-short-format

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- log-short-format $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Log less information to the slow query log, if it has been activated.
- --log-tc=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- log- tc=file_name \\
\hline Type & File name \\
\hline Default Value & tc. log \\
\hline
\end{tabular}

The name of the memory-mapped transaction coordinator log file (for XA transactions that affect multiple storage engines when the binary log is disabled). The default name is tc.log. The file is created under the data directory if not given as a full path name. This option is unused.
- --log-tc-size=size

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - log - tc - size=\# \\
\hline Type & Integer \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & 6 * page size \\
\hline Minimum Value & 6 * page size \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline
\end{tabular}

The size in bytes of the memory-mapped transaction coordinator log. The default and minimum values are 6 times the page size, and the value must be a multiple of the page size.
- --memlock

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- memlock $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Lock the mysqld process in memory. This option might help if you have a problem where the operating system is causing mysqld to swap to disk.
--memlock works on systems that support the mlockall() system call; this includes Solaris, most Linux distributions that use a 2.4 or higher kernel, and perhaps other Unix systems. On Linux systems, you can tell whether or not mlockall() (and thus this option) is supported by checking to see whether or not it is defined in the system mman . $h$ file, like this:
\$> grep mlockall /usr/include/sys/mman.h
If mlockall() is supported, you should see in the output of the previous command something like the following:
extern int mlockall (int __flags) __THROW;

\section*{Important}

Use of this option may require you to run the server as root, which, for reasons of security, is normally not a good idea. See Section 8.1.5, "How to Run MySQL as a Normal User".

On Linux and perhaps other systems, you can avoid the need to run the server as root by changing the limits. conf file. See the notes regarding the memlock limit in Section 10.12.3.3, "Enabling Large Page Support".

You must not use this option on a system that does not support the mlockall() system call; if you do so, mysqld is very likely to exit as soon as you try to start it.
- --myisam-block-size=N

\begin{tabular}{|l|l|}
\hline Command-Line Format & --myisam-block-size=\# \\
\hline Type & Integer \\
\hline Default Value & 1024 \\
\hline Minimum Value & 1024 \\
\hline Maximum Value & 16384 \\
\hline
\end{tabular}

The block size to be used for MyISAM index pages.
- --mysql-native-password

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- mysql-native-password=\{OFF|ON\} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Deprecated & Yes \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enable the mysql_native_password authentication plugin, which is disabled by default in MySQL 8.4.

For more information, see Section 8.4.1.1, "Native Pluggable Authentication".
- --no-defaults

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read. This must be the first option on the command line if it is used.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-monitor

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- no-monitor $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Platform Specific & Windows \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}
(Windows only). This option suppresses the forking that is used to implement the RESTART statement: Forking enables one process to act as a monitor to the other, which acts as the server. For a server started with this option, RESTART simply exits and does not restart.
- --performance-schema-xxx

Configure a Performance Schema option. For details, see Section 29.14, "Performance Schema Command Options".
- --plugin-load=plugin_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- plugin-load=plugin_list \\
\hline Type & String \\
\hline
\end{tabular}

This option tells the server to load the named plugins at startup. If multiple--plugin-load options are given, only the last one applies. Additional plugins to load may be specified using --plugin-load-add options.

The option value is a semicolon-separated list of plugin_library and name=plugin_library values. Each plugin_library is the name of a library file that contains plugin code, and each name is the name of a plugin to load. If a plugin library is named without any preceding plugin name, the server loads all plugins in the library. With a preceding plugin name, the server loads only the
named plugin from the library. The server looks for plugin library files in the directory named by the plugin_dir system variable.

For example, if plugins named myplug1 and myplug2 are contained in the plugin library files myplug1.so and myplug2. so, use this option to perform an early plugin load:
mysqld --plugin-load="myplug1=myplug1.so;myplug2=myplug2.so"
Quotes surround the argument value because otherwise some command interpreters interpret semicolon (;) as a special character. (For example, Unix shells treat it as a command terminator.)

Each named plugin is loaded for a single invocation of mysqld only. After a restart, the plugin is not loaded unless --plugin-load is used again. This is in contrast to INSTALL PLUGIN, which adds an entry to the mysql.plugins table to cause the plugin to be loaded for every normal server startup.

During the normal startup sequence, the server determines which plugins to load by reading the mysql.plugins system table. If the server is started with the --skip-grant-tables option, plugins registered in the mysql.plugins table are not loaded and are unavailable. --pluginload enables plugins to be loaded even when --skip-grant-tables is given. --plugin-load also enables plugins to be loaded at startup that cannot be loaded at runtime.

This option does not set a corresponding system variable. The output of SHOW PLUGINS provides information about loaded plugins. More detailed information can be found in the Information Schema PLUGINS table. See Section 7.6.2, "Obtaining Server Plugin Information".

For additional information about plugin loading, see Section 7.6.1, "Installing and Uninstalling Plugins".
- --plugin-load-add=plugin_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --plugin-load-add=plugin_list \\
\hline Type & String \\
\hline
\end{tabular}

This option complements the --plugin-load option. --plugin-load-add adds a plugin or plugins to the set of plugins to be loaded at startup. The argument format is the same as for - -
plugin-load. --plugin-load-add can be used to avoid specifying a large set of plugins as a single long unwieldy --plugin-load argument.
--plugin-load-add can be given in the absence of --plugin-load, but any instance of -plugin-load-add that appears before--plugin-load has no effect because--plugin-load resets the set of plugins to load. In other words, these options:
--plugin-load=x --plugin-load-add=y
are equivalent to this option:
--plugin-load="x;y"
But these options:
--plugin-load-add=y --plugin-load=x
are equivalent to this option:
--plugin-load=x
This option does not set a corresponding system variable. The output of SHOW PLUGINS provides information about loaded plugins. More detailed information can be found in the Information Schema PLUGINS table. See Section 7.6.2, "Obtaining Server Plugin Information".

For additional information about plugin loading, see Section 7.6.1, "Installing and Uninstalling Plugins".
- --plugin-XXX

Specifies an option that pertains to a server plugin. For example, many storage engines can be built as plugins, and for such engines, options for them can be specified with a --plugin prefix. Thus, the--innodb-file-per-table option for InnoDB can be specified as --plugin-innodb-file-per-table.

For boolean options that can be enabled or disabled, the --skip prefix and other alternative formats are supported as well (see Section 6.2.2.4, "Program Option Modifiers"). For example, - - skip-plugin-innodb-file-per-table disables innodb-file-per-table.

The rationale for the --plugin prefix is that it enables plugin options to be specified unambiguously if there is a name conflict with a built-in server option. For example, were a plugin writer to name a plugin "sql" and implement a "mode" option, the option name might be --sql-mode, which would conflict with the built-in option of the same name. In such cases, references to the conflicting name are resolved in favor of the built-in option. To avoid the ambiguity, users can specify the plugin option as --plugin-sql-mode. Use of the --plugin prefix for plugin options is recommended to avoid any question of ambiguity.
- --port=port_num, -P port_num

\begin{tabular}{|l|l|}
\hline Command-Line Format & --port=port_num \\
\hline System Variable & port \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 3306 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 65535 \\
\hline
\end{tabular}

The port number to use when listening for TCP/IP connections. On Unix and Unix-like systems, the port number must be 1024 or higher unless the server is started by the root operating system user. Setting this option to 0 causes the default value to be used.
- --port-open-timeout=num

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - port - open - timeout $=\#$ \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline
\end{tabular}

On some systems, when the server is stopped, the TCP/IP port might not become available immediately. If the server is restarted quickly afterward, its attempt to reopen the port can fail. This option indicates how many seconds the server should wait for the TCP/IP port to become free if it cannot be opened. The default is not to wait.
- --print-defaults

Print the program name and all options that it gets from option files. Password values are masked. This must be the first option on the command line if it is used, except that it may be used immediately after --defaults-file or --defaults-extra-file.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --remove [service_name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- remove [service_name] \\
\hline Platform Specific & Windows \\
\hline
\end{tabular}
(Windows only) Remove a MySQL Windows service. The default service name is MySQL if no service_name value is given. For more information, see Section 2.3.3.8, "Starting MySQL as a Windows Service".
- --safe-user-create

\begin{tabular}{|l|l|}
\hline Command-Line Format & --safe-user-create[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

If this option is enabled, a user cannot create new MySQL users by using the GRANT statement unless the user has the INSERT privilege for the mysql. user system table or any column in the table. If you want a user to have the ability to create new users that have those privileges that the user has the right to grant, you should grant the user the following privilege:

GRANT INSERT(user) ON mysql.user TO 'user_name'@'host_name';
This ensures that the user cannot change any privilege columns directly, but has to use the GRANT statement to give privileges to other users.
- --skip-grant-tables

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-grant-tables[=\{OFF|ON\}] \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This option affects the server startup sequence:
- --skip-grant-tables causes the server not to read the grant tables in the mysql system schema, and thus to start without using the privilege system at all. This gives anyone with access to the server unrestricted access to all databases.

Because starting the server with--skip-grant-tables disables authentication checks, the server also disables remote connections in that case by enabling skip_networking.

To cause a server started with --skip-grant-tables to load the grant tables at runtime, perform a privilege-flushing operation, which can be done in these ways:
- Issue a MySQL FLUSH PRIVILEGES statement after connecting to the server.
- Execute a mysqladmin flush-privileges or mysqladmin reload command from the command line.

Privilege flushing might also occur implicitly as a result of other actions performed after startup, thus causing the server to start using the grant tables. For example, the server flushes the privileges if it performs an upgrade during the startup sequence.
- --skip-grant-tables disables failed-login tracking and temporary account locking because those capabilities depend on the grant tables. See Section 8.2.15, "Password Management".
- --skip-grant-tables causes the server not to load certain other objects registered in the data dictionary or the mysql system schema:
- Scheduled events installed using CREATE EVENT and registered in the events data dictionary table.
- Plugins installed using INSTALL PLUGIN and registered in the mysql.plugin system table.

To cause plugins to be loaded even when using --skip-grant-tables, use the --pluginload or--plugin-load-add option.
- Loadable functions installed using CREATE FUNCTION and registered in the mysql.func system table.
--skip-grant-tables does not suppress loading during startup of components.
- --skip-grant-tables causes the disabled_storage_engines system variable to have no effect.
- --skip-new

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - skip-new \\
\hline Deprecated & Yes \\
\hline
\end{tabular}

This option disables (what used to be considered) new, possibly unsafe behaviors. It results in these settings: delay_key_write=0FF, concurrent_insert=NEVER, automatic_sp_privileges=0FF. It also causes OPTIMIZE TABLE to be mapped to ALTER TABLE for storage engines for which OPTIMIZE TABLE is not supported.

This option is deprecated, and subject to removal in a future release.
- --skip-show-database

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -skip-show-database \\
\hline System Variable & skip_show_database \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This option sets the skip_show_database system variable that controls who is permitted to use the SHOW DATABASES statement. See Section 7.1.8, "Server System Variables".
- --skip-stack-trace

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-stack-trace \\
\hline
\end{tabular}

Do not write stack traces. This option is useful when you are running mysqld under a debugger. On some systems, you also must use this option to get a core file. See Section 7.9, "Debugging MySQL".
- --slow-start-timeout=timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slow-start-timeout=\# \\
\hline Type & Integer \\
\hline Default Value & 15000 \\
\hline
\end{tabular}

This option controls the Windows service control manager's service start timeout. The value is the maximum number of milliseconds that the service control manager waits before trying to kill the windows service during startup. The default value is 15000 ( 15 seconds). If the MySQL service takes too long to start, you may need to increase this value. A value of 0 means there is no timeout.
- --socket=path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --socket=\{file_name|pipe_name\} \\
\hline System Variable & socket \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value (Windows) & MySQL \\
\hline Default Value (Other) & /tmp/mysql.sock \\
\hline
\end{tabular}

On Unix, this option specifies the Unix socket file to use when listening for local connections. The default value is / tmp/mysql. sock. If this option is given, the server creates the file in the data directory unless an absolute path name is given to specify a different directory. On Windows, the option specifies the pipe name to use when listening for local connections that use a named pipe. The default value is MySQL (not case-sensitive).
- --sql-mode=value[,value[,value...]]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sql-mode=name \\
\hline System Variable & sql_mode \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Type & Set \\
\hline Default Value & \begin{tabular}{l}
ONLY_FULL_GROUP_BY \\
STRICT_TRANS_TABLES \\
NO_ZERO_IN_DATE NO_ZERO_DATE \\
ERROR_FOR_DIVISION_BY_ZERO \\
NO_ENGINE_SUBSTITUTION
\end{tabular} \\
\hline Valid Values & \begin{tabular}{l}
ALLOW_INVALID_DATES \\
ANSI_QUOTES \\
ERROR_FOR_DIVISION_BY_ZERO \\
HIGH_NOT_PRECEDENCE \\
IGNORE_SPACE \\
NO_AUTO_VALUE_ON_ZERO \\
NO_BACKSLASH_ESCAPES \\
NO_DIR_IN_CREATE \\
NO_ENGINE_SUBSTITUTION \\
NO_UNSIGNED_SUBTRACTION \\
NO_ZERO_DATE \\
NO_ZERO_IN_DATE \\
ONLY_FULL_GROUP_BY \\
PAD_CHAR_TO_FULL_LENGTH \\
PIPES_AS_CONCAT \\
REAL_AS_FLOAT \\
STRICT_ALL_TABLES \\
STRICT_TRANS_TABLES \\
TIME_TRUNCATE_FRACTIONAL
\end{tabular} \\
\hline
\end{tabular}

Set the SQL mode. See Section 7.1.11, "Server SQL Modes".

\section*{Note}

MySQL installation programs may configure the SQL mode during the installation process.

If the SQL mode differs from the default or from what you expect, check for a setting in an option file that the server reads at startup.
- --standalone

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - standalone \\
\hline Platform Specific & Windows \\
\hline
\end{tabular}

Available on Windows only; instructs the MySQL server not to run as a service.
- --super-large-pages

\begin{tabular}{|l|l|}
\hline Command-Line Format & --super-large-pages $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Platform Specific & Solaris \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Standard use of large pages in MySQL attempts to use the largest size supported, up to 4 MB . Under Solaris, a "super large pages" feature enables uses of pages up to 256 MB . This feature is available for recent SPARC platforms. It can be enabled or disabled by using the --super-large-pages or --skip-super-large-pages option.
- --symbolic-links, --skip-symbolic-links

\begin{tabular}{|l|l|}
\hline Command-Line Format & --symbolic-links $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Deprecated & Yes \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enable or disable symbolic link support. On Unix, enabling symbolic links means that you can link a MyISAM index file or data file to another directory with the INDEX DIRECTORY or DATA DIRECTORY option of the CREATE TABLE statement. If you delete or rename the table, the files that its symbolic links point to also are deleted or renamed. See Section 10.12.2.2, "Using Symbolic Links for MyISAM Tables on Unix".

\section*{Note}

Symbolic link support, along with the --symbolic-links option that controls it, is deprecated; you should expect it to be removed in a future version of MySQL. In addition, the option is disabled by default. The related have_symlink system variable also is deprecated; expect it to be removed in a future version of MySQL.

This option has no meaning on Windows.
- --sysdate-is-now

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sysdate-is-now $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

SYSDATE( ) by default returns the time at which it executes, not the time at which the statement in which it occurs begins executing. This differs from the behavior of NOW ( ). This option causes SYSDATE( ) to be a synonym for NOW ( ). For information about the implications for binary logging and replication, see the description for SYSDATE( ) in Section 14.7, "Date and Time Functions" and for SET TIMESTAMP in Section 7.1.8, "Server System Variables".
- --tc-heuristic-recover=\{COMMIT|ROLLBACK\}

\begin{tabular}{|l|l|l|}
\hline & Command-Line Format & --tc-heuristic-recover=name \\
\hline & Type & Enumeration \\
\hline & Default Value & OFF \\
\hline 718 & Valid Values & \begin{tabular}{l}
OFF \\
COMMIT
\end{tabular} \\
\hline
\end{tabular}

The decision to use in a manual heuristic recovery.
If a --tc-heuristic-recover option is specified, the server exits regardless of whether manual heuristic recovery is successful.

On systems with more than one storage engine capable of two-phase commit, the ROLLBACK option is not safe and causes recovery to halt with the following error:
```
[ERROR] --tc-heuristic-recover rollback
strategy is not safe on systems with more than one 2-phase-commit-capable
storage engine. Aborting crash recovery.
```

- --transaction-isolation=level

\begin{tabular}{|l|l|}
\hline Command-Line Format & --transaction-isolation=name \\
\hline System Variable & transaction_isolation \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & REPEATABLE-READ \\
\hline Valid Values & \begin{tabular}{l}
READ - UNCOMMITTED \\
READ - COMMITTED \\
REPEATABLE-READ \\
SERIALIZABLE
\end{tabular} \\
\hline
\end{tabular}

Sets the default transaction isolation level. The level value can be READ-UNCOMMITTED, READCOMMITTED, REPEATABLE-READ, or SERIALIZABLE. See Section 15.3.7, "SET TRANSACTION Statement".

The default transaction isolation level can also be set at runtime using the SET TRANSACTION statement or by setting the transaction_isolation system variable.
- --transaction-read-only

\begin{tabular}{|l|l|}
\hline Command-Line Format & --transaction-read-only[=\{OFF|ON\}] \\
\hline System Variable & transaction_read_only \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Sets the default transaction access mode. By default, read-only mode is disabled, so the mode is read/write.

To set the default transaction access mode at runtime, use the SET TRANSACTION statement or set the transaction_read_only system variable. See Section 15.3.7, "SET TRANSACTION Statement".
- --tmpdir=dir_name, -t dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tmpdir=dir_name \\
\hline System Variable & tmpdir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline
\end{tabular}

The path of the directory to use for creating temporary files. It might be useful if your default / tmp directory resides on a partition that is too small to hold temporary tables. This option accepts several paths that are used in round-robin fashion. Paths should be separated by colon characters (:) on Unix and semicolon characters (;) on Windows.
- - tmpdir can be a non-permanent location, such as a directory on a memory-based file system or a directory that is cleared when the server host restarts. If the MySQL server is acting as a replica, and you are using a non-permanent location for--tmpdir, consider setting a different temporary directory for the replica using the replica_load_tmpdir system variable. For a replica, the temporary files used to replicate LOAD DATA statements are stored in this directory, so with a permanent location they can survive machine restarts, although replication can now continue after a restart if the temporary files have been removed.

For more information about the storage location of temporary files, see Section B.3.3.5, "Where MySQL Stores Temporary Files".
- --upgrade=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - upgrade=value \\
\hline Type & Enumeration \\
\hline Default Value & AUTO \\
\hline Valid Values & \begin{tabular}{l}
AUTO \\
NONE \\
MINIMAL
\end{tabular} \\
\hline
\end{tabular}
\begin{tabular}{|l|l|l|}
\hline & FORCE
\end{tabular}
This option controls whether and how the server performs an automatic upgrade at startup. Automatic upgrade involves two steps:
- Step 1: Data dictionary upgrade.

This step upgrades:
- The data dictionary tables in the mysql schema. If the actual data dictionary version is lower than the current expected version, the server upgrades the data dictionary. If it cannot, or is prevented from doing so, the server cannot run.
- The Performance Schema and INFORMATION_SCHEMA.
- Step 2: Server upgrade.

This step comprises all other upgrade tasks. If the existing installation data has a lower MySQL version than the server expects, it must be upgraded:
- The system tables in the mysql schema (the remaining non-data dictionary tables).
- The sys schema.
- User schemas.

For details about upgrade steps 1 and 2, see Section 3.4, "What the MySQL Upgrade Process Upgrades".

These--upgrade option values are permitted:
- AUTO

The server performs an automatic upgrade of anything it finds to be out of date (steps 1 and 2). This is the default action if - - upgrade is not specified explicitly.
- NONE

The server performs no automatic upgrade steps during the startup process (skips steps 1 and 2). Because this option value prevents a data dictionary upgrade, the server exits with an error if the data dictionary is found to be out of date:
[ERROR] [MY-013381] [Server] Server shutting down because upgrade is required, yet prohibited by the command line option '--upgrade=NONE'. [ERROR] [MY-010334] [Server] Failed to initialize DD Storage Engine [ERROR] [MY-010020] [Server] Data Dictionary initialization failed.
- MINIMAL

The server upgrades the data dictionary, the Performance Schema, and the INFORMATION_SCHEMA, if necessary (step 1). Note that following an upgrade with this option, Group Replication cannot be started, because system tables on which the replication internals depend are not updated, and reduced functionality might also be apparent in other areas.
- FORCE

The server upgrades the data dictionary, the Performance Schema, and the INFORMATION_SCHEMA, if necessary (step 1). In addition, the server forces an upgrade of
everything else (step 2). Expect server startup to take longer with this option because the server checks all objects in all schemas.

FORCE is useful to force step 2 actions to be performed if the server thinks they are not necessary. For example, you may believe that a system table is missing or has become damaged and want to force a repair.

The following table summarizes the actions taken by the server for each option value.

\begin{tabular}{|l|l|l|}
\hline Option Value & Server Performs Step 1? & Server Performs Step 2? \\
\hline AUTO & If necessary & If necessary \\
\hline NONE & No & No \\
\hline MINIMAL & If necessary & No \\
\hline FORCE & If necessary & Yes \\
\hline
\end{tabular}
- --user=\{user_name|user_id\}, -u \{user_name|user_id\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - user=name \\
\hline Type & String \\
\hline
\end{tabular}

Run the mysqld server as the user having the name user_name or the numeric user ID user_id. ("User" in this context refers to a system login account, not a MySQL user listed in the grant tables.)

This option is mandatory when starting mysqld as root. The server changes its user ID during its startup sequence, causing it to run as that particular user rather than as root. See Section 8.1.1, "Security Guidelines".

To avoid a possible security hole where a user adds a --user=root option to a my .cnf file (thus causing the server to run as root), mysqld uses only the first --user option specified and produces a warning if there are multiple--user options. Options in /etc/my.cnf and \$MYSQL_HOME/my.cnf are processed before command-line options, so it is recommended that you put a --user option in /etc/my.cnf and specify a value other than root. The option in /etc/ my.cnf is found before any other--user options, which ensures that the server runs as a user other than root, and that a warning results if any other --user option is found.
- --validate-config

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- validate-config $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Validate the server startup configuration. If no errors are found, the server terminates with an exit code of 0 . If an error is found, the server displays a diagnostic message and terminates with an exit code of 1 . Warning and information messages may also be displayed, depending on the log_error_verbosity value, but do not produce immediate validation termination or an exit code of 1. For more information, see Section 7.1.3, "Server Configuration Validation".
- --validate-user-plugins[=\{OFF|ON\}]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --validate-user-plugins [=\{OFF|ON\}] \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & ON \\
\hline
\end{tabular}

If this option is enabled (the default), the server checks each user account and produces a warning if conditions are found that would make the account unusable:
- The account requires an authentication plugin that is not loaded.
- The account requires the sha256_password (deprecated) or caching_sha2_password authentication plugin but the server was started with neither SSL nor RSA enabled as required by the plugin.

Enabling--validate-user-plugins slows down server initialization and FLUSH PRIVILEGES. If you do not require the additional checking, you can disable this option at startup to avoid the performance decrement.
- --verbose, -v

Use this option with the --help option for detailed help.
- --version, -V

Display version information and exit.

\subsection*{7.1.8 Server System Variables}

The MySQL server maintains many system variables that affect its operation. Most system variables can be set at server startup using options on the command line or in an option file. Most of them can be changed dynamically at runtime using the SET statement, which enables you to modify operation of the server without having to stop and restart it. Some variables are read-only, and their values are determined by the system environment, by how MySQL is installed on the system, or possibly by the options used to compile MySQL. Most system variables have a default value, but there are exceptions, including read-only variables. You can also use system variable values in expressions.

Setting a global system variable runtime value normally requires the SYSTEM_VARIABLES_ADMIN privilege (or the deprecated SUPER privilege). Setting a session system runtime variable value normally requires no special privileges and can be done by any user, although there are exceptions. For more information, see Section 7.1.9.1, "System Variable Privileges"

There are several ways to see the names and values of system variables:
- To see the values that a server uses based on its compiled-in defaults and any option files that it reads, use this command:
```
mysqld --verbose --help
```

- To see the values that a server uses based only on its compiled-in defaults, ignoring the settings in any option files, use this command:
```
mysqld --no-defaults --verbose --help
```

- To see the current values used by a running server, use the SHOW VARIABLES statement or the Performance Schema system variable tables. See Section 29.12.14, "Performance Schema System Variable Tables".

This section provides a description of each system variable. For a system variable summary table, see Section 7.1.5, "Server System Variable Reference". For more information about manipulation of system variables, see Section 7.1.9, "Using System Variables".

For additional system variable information, see these sections:
- Section 7.1.9, "Using System Variables", discusses the syntax for setting and displaying system variable values.
- Section 7.1.9.2, "Dynamic System Variables", lists the variables that can be set at runtime.
- Information on tuning system variables can be found in Section 7.1.1, "Configuring the Server".
- Section 17.14, "InnoDB Startup Options and System Variables", lists InnoDB system variables.
- NDB Cluster System Variables, lists system variables which are specific to NDB Cluster.
- For information on server system variables specific to replication, see Section 19.1.6, "Replication and Binary Logging Options and Variables".

\section*{Note}

Some of the following variable descriptions refer to "enabling" or "disabling" a variable. These variables can be enabled with the SET statement by setting them to ON or 1, or disabled by setting them to OFF or 0 . Boolean variables can be set at startup to the values ON, TRUE, OFF, and FALSE (not case-sensitive), as well as 1 and 0 . See Section 6.2.2.4, "Program Option Modifiers".

Some system variables control the size of buffers or caches. For a given buffer, the server might need to allocate internal data structures. These structures typically are allocated from the total memory allocated to the buffer, and the amount of space required might be platform dependent. This means that when you assign a value to a system variable that controls a buffer size, the amount of space actually available might differ from the value assigned. In some cases, the amount might be less than the value assigned. It is also possible that the server adjusts a value upward. For example, if you assign a value of 0 to a variable for which the minimal value is 1024 , the server sets the value to 1024.

Values for buffer sizes, lengths, and stack sizes are given in bytes unless otherwise specified.

\section*{Note}

Some system variable descriptions include a block size, in which case a value that is not an integer multiple of the stated block size is rounded down to the next lower multiple of the block size before being stored by the server, that is to FLOOR(value) * block_size.

Example: Suppose that the block size for a given variable is given as 4096, and you set the value of the variable to 100000 (we assume that the variable's maximum value is greater than this number). Since 100000 / 4096 = 24.4140625, the server automatically lowers the value to 98304 (24 * 4096) before storing it.

In some cases, the stated maximum for a variable is the maximum allowed by the MySQL parser, but is not an exact multiple of the block size. In such cases, the effective maximum is the next lower multiple of the block size.

Example: A system variable's maxmum value is shown as $4294967295\left(2^{32}-1\right)$, and its block size is 1024. 4294967295 / 1024 = 4194303.9990234375, so if you set this variable to its stated maximum, the value actually stored is 4194303 * $1024=4294966272$.

Some system variables take file name values. Unless otherwise specified, the default file location is the data directory if the value is a relative path name. To specify the location explicitly, use an absolute path name. Suppose that the data directory is /var/mysql/data. If a file-valued variable is given as a relative path name, it is located under /var/mysql/data. If the value is an absolute path name, its location is as given by the path name.
- activate_all_roles_on_login

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
-- activate-all-roles-on-login $[=\{$ OFF $\mid$ \\
ON $\}]$
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & activate_all_roles_on_login \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Whether to enable automatic activation of all granted roles when users log in to the server:
- If activate_all_roles_on_login is enabled, the server activates all roles granted to each account at login time. This takes precedence over default roles specified with SET DEFAULT ROLE.
- If activate_all_roles_on_login is disabled, the server activates the default roles specified with SET DEFAULT ROLE, if any, at login time.

Granted roles include those granted explicitly to the user and those named in the mandatory_roles system variable value.
activate_all_roles_on_login applies only at login time, and at the beginning of execution for stored programs and views that execute in definer context. To change the active roles within a session, use SET ROLE. To change the active roles for a stored program, the program body should execute SET ROLE.
- admin_address

\begin{tabular}{|l|l|}
\hline Command-Line Format & --admin-address=addr \\
\hline System Variable & admin_address \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The IP address on which to listen for TCP/IP connections on the administrative network interface (see Section 7.1.12.1, "Connection Interfaces"). There is no default admin_address value. If this variable is not specified at startup, the server maintains no administrative interface. The server also has a bind_address system variable for configuring regular (nonadministrative) client TCP/IP connections. See Section 7.1.12.1, "Connection Interfaces".

If admin_address is specified, its value must satisfy these requirements:
- The value must be a single IPv4 address, IPv6 address, or host name.
- The value cannot specify a wildcard address format (*, 0.0.0.0, or : :).
- The value may include a network namespace specifier.

An IP address can be specified as an IPv4 or IPv6 address. If the value is a host name, the server resolves the name to an IP address and binds to that address. If a host name resolves to multiple IP addresses, the server uses the first IPv4 address if there are any, or the first IPv6 address otherwise.

The server treats different types of addresses as follows:
- If the address is an IPv4-mapped address, the server accepts TCP/IP connections for that address, in either IPv4 or IPv6 format. For example, if the server is bound to:: $\mathrm{ffff}: 127.0 .0 .1$, clients can connect using--host=127.0.0.1 or --host=::ffff:127.0.0.1.
- If the address is a "regular" IPv4 or IPv6 address (such as 127.0.0.1 or : :1), the server accepts TCP/IP connections only for that IPv4 or IPv6 address.

These rules apply to specifying a network namespace for an address:
- A network namespace can be specified for an IP address or a host name.
- A network namespace cannot be specified for a wildcard IP address.
- For a given address, the network namespace is optional. If given, it must be specified as a /ns suffix immediately following the address.
- An address with no /ns suffix uses the host system global namespace. The global namespace is therefore the default.
- An address with a /ns suffix uses the namespace named ns.
- The host system must support network namespaces and each named namespace must previously have been set up. Naming a nonexistent namespace produces an error.

For additional information about network namespaces, see Section 7.1.14, "Network Namespace Support".

If binding to the address fails, the server produces an error and does not start.
The admin_address system variable is similar to the bind_address system variable that binds the server to an address for ordinary client connections, but with these differences:
- bind_address permits multiple addresses. admin_address permits a single address.
- bind_address permits wildcard addresses. admin_address does not.
- admin_port

\begin{tabular}{|l|l|}
\hline Command-Line Format & --admin-port=port_num \\
\hline System Variable & admin_port \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 33062 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}

The TCP/IP port number to use for connections on the administrative network interface (see Section 7.1.12.1, "Connection Interfaces"). Setting this variable to 0 causes the default value to be used.

Setting admin_port has no effect if admin_address is not specified because in that case the server maintains no administrative network interface.
- admin_ssl_ca

\begin{tabular}{|l|l|}
\hline Command-Line Format & --admin-ssl-ca=file_name \\
\hline System Variable & admin_ssl_ca \\
\hline Scope & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The admin_ssl_ca system variable is like ssl_ca, except that it applies to the administrative connection interface rather than the main connection interface. For information about configuring encryption support for the administrative interface, see Administrative Interface Support for Encrypted Connections.
- admin_ssl_capath

\begin{tabular}{|l|l|}
\hline Command-Line Format & --admin-ssl-capath=dir_name \\
\hline System Variable & admin_ssl_capath \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The admin_ssl_capath system variable is like ssl_capath, except that it applies to the administrative connection interface rather than the main connection interface. For information about configuring encryption support for the administrative interface, see Administrative Interface Support for Encrypted Connections.
- admin_ssl_cert

\begin{tabular}{|l|l|}
\hline Command-Line Format & --admin-ssl-cert=file_name \\
\hline System Variable & admin_ssl_cert \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The admin_ssl_cert system variable is like ssl_cert, except that it applies to the administrative connection interface rather than the main connection interface. For information about configuring encryption support for the administrative interface, see Administrative Interface Support for Encrypted Connections.
- admin_ssl_cipher

\begin{tabular}{|l|l|}
\hline Command-Line Format & --admin-ssl-cipher=name \\
\hline System Variable & admin_ssl_cipher \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & NULL
\end{tabular}

The admin_ssl_cipher system variable is like ssl_cipher, except that it applies to the administrative connection interface rather than the main connection interface. For information about configuring encryption support for the administrative interface, see Administrative Interface Support for Encrypted Connections.

The list specified by this variable may include any of the following values:
- ECDHE-ECDSA-AES128-GCM-SHA256
- ECDHE-ECDSA-AES256-GCM-SHA384
- ECDHE-RSA-AES128-GCM-SHA256
- ECDHE-RSA-AES256-GCM-SHA384
- ECDHE-ECDSA-CHACHA20-POLY1305
- ECDHE-RSA-CHACHA20-POLY1305
- ECDHE-ECDSA-AES256-CCM
- ECDHE-ECDSA-AES128-CCM
- DHE-RSA-AES128-GCM-SHA256
- DHE-RSA-AES256-GCM-SHA384
- DHE-RSA-AES256-CCM
- DHE-RSA-AES128-CCM
- DHE-RSA-CHACHA20-POLY1305

Trying to include any values in the cipher list that are not shown here when setting this variable raises an error (ER_BLOCKED_CIPHER).
- admin_ssl_crl

\begin{tabular}{|l|l|}
\hline Command-Line Format & --admin-ssl-crl=file_name \\
\hline System Variable & admin_ssl_crl \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The admin_ssl_crl system variable is like ssl_crl, except that it applies to the administrative connection interface rather than the main connection interface. For information about configuring encryption support for the administrative interface, see Administrative Interface Support for Encrypted Connections.
- admin_ssl_crlpath

\begin{tabular}{|l|l|}
\hline Command-Line Format & --admin-ssl-crlpath=dir_name \\
\hline System Variable & admin_ssl_crlpath \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The admin_ssl_crlpath system variable is like ssl_crlpath, except that it applies to the administrative connection interface rather than the main connection interface. For information about configuring encryption support for the administrative interface, see Administrative Interface Support for Encrypted Connections.
- admin_ssl_key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --admin-ssl-key=file_name \\
\hline System Variable & admin_ssl_key \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The admin_ssl_key system variable is like ssl_key, except that it applies to the administrative connection interface rather than the main connection interface. For information about configuring encryption support for the administrative interface, see Administrative Interface Support for Encrypted Connections.
- admin_tls_ciphersuites

\begin{tabular}{|l|l|}
\hline Command-Line Format & --admin-tlsciphersuites=ciphersuite_list \\
\hline System Variable & admin_tls_ciphersuites \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

The admin_tls_ciphersuites system variable is like tls_ciphersuites, except that it applies to the administrative connection interface rather than the main connection interface. For information about configuring encryption support for the administrative interface, see Administrative Interface Support for Encrypted Connections.

The value is a list of zero or more colon-separated ciphersuite names from among those listed here:
- TLS_AES_128_GCM_SHA256
- TLS_AES_256_GCM_SHA384
- TLS_CHACHA20_POLY1305_SHA256
- TLS_AES_128_CCM_SHA256

Trying to include any values in the cipher list that are not shown here when setting this variable raises an error (ER_BLOCKED_CIPHER).
- admin_tls_version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --admin-tls-version=protocol_list \\
\hline System Variable & admin_tls_version \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & TLSv1.2, TLSv1.3 \\
\hline
\end{tabular}

The admin_tls_version system variable is like tls_version, except that it applies to the administrative connection interface rather than the main connection interface. For information about configuring encryption support for the administrative interface, see Administrative Interface Support for Encrypted Connections.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0760.jpg?height=133&width=111&top_left_y=1208&top_left_x=335)

\section*{Important}
- MySQL 8.4 does not support the TLSv1 and TLSv1.1 connection protocols. See Removal of Support for the TLSv1 and TLSv1.1 Protocols for more information.
- MuySQL 8.4 supports the TLSv1.3 protocol, provided that the MySQL server was compiled using OpenSSL 1.1.1 or newer. The server checks the version of OpenSSL at startup, and if it is older than 1.1.1, TLSv1.3 is removed from the default value for the system variable. In that case, the default is TLSv1.2.
- authentication_policy

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-policy=value \\
\hline System Variable & authentication_policy \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & *,, \\
\hline
\end{tabular}

This variable is used to administer multifactor authentication (MFA) capabilities. For CREATE USER and ALTER USER statements used to manage MySQL account definitions, it determines what authentication factor or factors may be specified, where "factor" corresponds to an authentication method or plugin associated with an account. authentication_policy determines the following aspects of multifactor authentication:
- The number of authentication factors.
- The plugins (or methods) permitted for each factor.
- The default authentication plugin for authentication specifications that do not name a plugin explicitly.

Because authentication_policy applies only when accounts are created or altered, changes to its value have no effect on existing user accounts.

\section*{Note}

Although the authentication_policy system variable places certain constraints on the authentication-related clauses of CREATE USER and ALTER USER statements, a user who has the AUTHENTICATION_POLICY_ADMIN privilege is not subject to these constraints. (A warning does occur for statements that otherwise would not be permitted.)

The value of authentication_policy is a list of 1,2 , or 3 comma-separated elements, each corresponding to an authentication factor and each being of one of the forms listed here, with their meanings:
- empty

The authentication factor is optional; any authentication plugin may be used.
- *

The authentication factor is required; any authentication plugin may be used.
- plugin_name

The authentication factor is required; this factor must be plugin_name.
- *:plugin_name

The authentication factor is required; plugin_name is the default, but another authentication plugin may be used.

In each case, an element may be surrounded by whitespace characters. The entire list must be enclosed in single quotes.
authentication_policy must contain at least one nonempty factor, and any empty factors must come at the end of the list, following any nonempty factors. This means that ' , , ' is not permitted because this signifies that all factors are optional. Every account must have at least one authentication factor.

The default value of authentication_policy is ' *, , '. This means that factor 1 is required in account definitions and can use any authentication plugin (with caching_sha2_password being the default), and that factors 2 and 3 are optional and each can use any authentication plugin.

If authentication_policy does not specify a default plugin for the first factor, the default plugin for this factor is caching_sha2_password, although another plugin may be used.

The following table shows some possible values for authentication_policy and the policy that each establishes for creating or altering accounts.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 7.4 Example authentication_policy Values}
\begin{tabular}{|l|l|}
\hline authentication_policy & Policy \\
\hline$' * '$ & \begin{tabular}{l} 
One factor only, which uses \\
caching_sha2_password, although another \\
plugin may be used.
\end{tabular} \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline authentication_policy & Policy \\
\hline ' *, *' & Two factors only; the first factor uses caching_sha2_password by default, although another plugin may be used; the second may use any plugin. \\
\hline '*,*,*' & Three factors only, where the first factor uses caching_sha2_password by default, although another plugin may be used; the second and third factors may use any plugins. \\
\hline '*,' & One or two factors, where the first factor uses caching_sha2_password by default, although another plugin may be used; the second factor is optional and may use any plugin. \\
\hline ' *,, ' & One, two, or three factors, where the first factor uses caching_sha2_password by default, although another plugin may be used; the second factor and third factors are optional and may use any plugins. \\
\hline '*,*,' & Two or three factors, where the first factor uses caching_sha2_password by default, although another plugin may be used; the second factor is required and the third factor is optional; the second and third factors may use any plugins. \\
\hline '*,auth_plugin' & Two factors, where the first factor uses caching_sha2_password by default, although another plugin may be used; the second factor must be the named plugin. \\
\hline 'auth_plugin, *,' & Two or three factors, where the first factor must be the named plugin; the second factor is required but may use any plugin; the third factor is optional and may use any plugin. \\
\hline '*,*:auth_plugin' & Two factors, where the first factor uses caching_sha2_password by default, although another plugin may be used; the second factor is required and uses the named plugin, but another plugin may be used. \\
\hline 'auth_plugin,' & One or two factors, where the first factor must be the named plugin; the second factor is optional and may use any plugin. \\
\hline '*:auth_plugin,*,' & Two or three factors, where the first factor must be the named plugin; the second factor is required and may use any plugin, and the third factor is optional and may use any plugin. \\
\hline 'auth_plugin,auth_plugin,auth_plugin' & Three factors, where all three factors must use the named plugins. \\
\hline
\end{tabular}
- authentication_windows_log_level

\begin{tabular}{|l|l|}
\hline Command-Line Format & --authentication-windows-log-level=\# \\
\hline System Variable & authentication_windows_log_level \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4 \\
\hline
\end{tabular}

This variable is available only if the authentication_windows Windows authentication plugin is enabled and debugging code is enabled. See Section 8.4.1.6, "Windows Pluggable Authentication".

This variable sets the logging level for the Windows authentication plugin. The following table shows the permitted values.

\begin{tabular}{|l|l|}
\hline Value & Description \\
\hline 0 & No logging \\
\hline 1 & Log only error messages \\
\hline 2 & Log level 1 messages and warning messages \\
\hline 3 & Log level 2 messages and information notes \\
\hline 4 & Log level 3 messages and debug messages \\
\hline
\end{tabular}
- authentication_windows_use_principal_name

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --authentication-windows-use-principal-name[=\{OFF|ON\}] & \\
\hline System Variable & authentication_windows_use_principal_name & \\
\hline Scope & Global & \\
\hline Dynamic & No & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Boolean & \\
\hline Default Value & ON & \\
\hline
\end{tabular}

This variable is available only if the authentication_windows Windows authentication plugin is enabled. See Section 8.4.1.6, "Windows Pluggable Authentication".

A client that authenticates using the InitSecurityContext () function should provide a string identifying the service to which it connects (targetName). MySQL uses the principal name (UPN) of the account under which the server is running. The UPN has the form user_id@computer_name and need not be registered anywhere to be used. This UPN is sent by the server at the beginning of authentication handshake.

This variable controls whether the server sends the UPN in the initial challenge. By default, the variable is enabled. For security reasons, it can be disabled to avoid sending the server's account name to a client as cleartext. If the variable is disabled, the server always sends a $0 \times 00$ byte in the first challenge, the client does not specify targetName, and as a result, NTLM authentication is used.

If the server fails to obtain its UPN (which happens primarily in environments that do not support Kerberos authentication), the UPN is not sent by the server and NTLM authentication is used.
- autocommit

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Command-Line Format & - - autocommit $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline & System Variable & autocommit \\
\cline { 2 - 3 }
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

The autocommit mode. If set to 1 , all changes to a table take effect immediately. If set to 0 , you must use COMMIT to accept a transaction or ROLLBACK to cancel it. If autocommit is 0 and you change it to 1 , MySQL performs an automatic COMMIT of any open transaction. Another way to begin a transaction is to use a START TRANSACTION or BEGIN statement. See Section 15.3.1, "START TRANSACTION, COMMIT, and ROLLBACK Statements".

By default, client connections begin with autocommit set to 1 . To cause clients to begin with a default of 0 , set the global autocommit value by starting the server with the --autocommit=0 option. To set the variable using an option file, include these lines:
```
[mysqld]
autocommit=0
```

- automatic_sp_privileges

\begin{tabular}{|l|l|}
\hline Command-Line Format & --automatic-sp-privileges[=\{OFF|ON\}] \\
\hline System Variable & automatic_sp_privileges \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

When this variable has a value of 1 (the default), the server automatically grants the EXECUTE and ALTER ROUTINE privileges to the creator of a stored routine, if the user cannot already execute and alter or drop the routine. (The ALTER ROUTINE privilege is required to drop the routine.) The server also automatically drops those privileges from the creator when the routine is dropped. If automatic_sp_privileges is 0 , the server does not automatically add or drop these privileges.

The creator of a routine is the account used to execute the CREATE statement for it. This might not be the same as the account named as the DEFINER in the routine definition.

If you start mysqld with --skip-new, automatic_sp_privileges is set to OFF.
See also Section 27.2.2, "Stored Routines and MySQL Privileges".
- auto_generate_certs

\begin{tabular}{|l|l|}
\hline Command-Line Format & --auto-generate-certs[=\{OFF|ON\}] \\
\hline System Variable & auto_generate_certs \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Default Value & ON
\end{tabular}

This variable controls whether the server autogenerates SSL key and certificate files in the data directory, if they do not already exist.

At startup, the server automatically generates server-side and client-side SSL certificate and key files in the data directory if the auto_generate_certs system variable is enabled and the server-side SSL files are missing from the data directory. These certificates are always generated in such cases, regardless of the values of any other TLS options. The certificate and key files enable secure client connections using SSL; see Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".

For more information about SSL file autogeneration, including file names and characteristics, see Section 8.3.3.1, "Creating SSL and RSA Certificates and Keys using MySQL"

The sha256_password_auto_generate_rsa_keys and caching_sha2_password_auto_generate_rsa_keys system variables are related but control autogeneration of RSA key-pair files needed for secure password exchange using RSA over unencrypted connections.
- back_log

\begin{tabular}{|l|l|}
\hline Command-Line Format & --back-log=\# \\
\hline System Variable & back_log \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}

The number of outstanding connection requests MySQL can have. This comes into play when the main MySQL thread gets very many connection requests in a very short time. It then takes some time (although very little) for the main thread to check the connection and start a new thread. The back_log value indicates how many requests can be stacked during this short time before MySQL momentarily stops answering new requests. You need to increase this only if you expect a large number of connections in a short period of time.

In other words, this value is the size of the listen queue for incoming TCP/IP connections. Your operating system has its own limit on the size of this queue. The manual page for the Unix listen() system call should have more details. Check your OS documentation for the maximum value for this variable. back_log cannot be set higher than your operating system limit.

The default value is the value of max_connections, which enables the permitted backlog to adjust to the maximum permitted number of connections.
- basedir

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --basedir=dir_name & \\
\hline System Variable & basedir & \\
\hline Scope & Global & \\
\hline Dynamic & No & \\
\hline SET_VAR Hint Applies & No & 735 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Directory name \\
\hline Default Value & \begin{tabular}{l} 
parent of mysqld installation \\
directory
\end{tabular} \\
\hline
\end{tabular}

The path to the MySQL installation base directory.
- big_tables

\begin{tabular}{|l|l|}
\hline Command-Line Format & --big-tables[=\{OFF|ON\}] \\
\hline System Variable & big_tables \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

If enabled, the server stores all temporary tables on disk rather than in memory. This prevents most The table tbl_name is full errors for SELECT operations that require a large temporary table, but also slows down queries for which in-memory tables would suffice.

The default value for new connections is OFF (use in-memory temporary tables). Normally, it should never be necessary to enable this variable. When in-memory internal temporary tables are managed by the TempTable storage engine (the default), and the maximum amount of memory that can be occupied by the TempTable storage engine is exceeded, the TempTable storage engine starts storing data to temporary files on disk. When in-memory temporary tables are managed by the MEMORY storage engine, in-memory tables are automatically converted to disk-based tables as required. For more information, see Section 10.4.4, "Internal Temporary Table Use in MySQL".
- bind_address

\begin{tabular}{|l|l|}
\hline Command-Line Format & --bind-address=addr \\
\hline System Variable & bind_address \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & * \\
\hline
\end{tabular}

The MySQL server listens on one or more network sockets for TCP/IP connections. Each socket is bound to one address, but it is possible for an address to map onto multiple network interfaces. To specify how the server should listen for TCP/IP connections, set the bind_address system variable at server startup. The server also has an admin_address system variable that enables administrative connections on a dedicated interface. See Section 7.1.12.1, "Connection Interfaces".

If bind_address is specified, it accepts a list of one or more address values, each of which may specify a single non-wildcard IP address or host name. Each address may include a network namespace specifier. If only one address is specified, it may make use of one of the wildcard address formats that permit listening on multiple network interfaces (*, 0.0.0.0, or : :). Multiple addresses are separated by commas. When multiple values are listed, each value must specify a
single non-wildcard IP address (either IPv4 or IPv6) or a host name, and wildcard address formats (*, 0.0.0.0, or::) are not allowed.

IP addresses can be specified as IPv4 or IPv6 addresses. For any value that is a host name, the server resolves the name to an IP address and binds to that address. If a host name resolves to multiple IP addresses, the server uses the first IPv4 address if there are any, or the first IPv6 address otherwise.

The server treats different types of addresses as follows:
- If the address is *, the server accepts TCP/IP connections on all server host IPv4 interfaces, and, if the server host supports IPv6, on all IPv6 interfaces. Use this address to permit both IPv4 and IPv6 connections on all server interfaces. This value is the default. If the variable specifies a list of multiple values, this value is not permitted.
- If the address is 0.0 .0 .0 , the server accepts TCP/IP connections on all server host IPv4 interfaces. If the variable specifies a list of multiple values, this value is not permitted.
- If the address is : : , the server accepts TCP/IP connections on all server host IPv4 and IPv6 interfaces. If the variable specifies a list of multiple values, this value is not permitted.
- If the address is an IPv4-mapped address, the server accepts TCP/IP connections for that address, in either IPv4 or IPv6 format. For example, if the server is bound to:: $\mathrm{ffff}: 127.0 .0 .1$, clients can connect using--host=127.0.0.1 or --host=: :ffff:127.0.0.1.
- If the address is a "regular" IPv4 or IPv6 address (such as 127.0.0.1 or : :1), the server accepts TCP/IP connections only for that IPv4 or IPv6 address.

These rules apply to specifying a network namespace for an address:
- A network namespace can be specified for an IP address or a host name.
- A network namespace cannot be specified for a wildcard IP address.
- For a given address, the network namespace is optional. If given, it must be specified as a /ns suffix immediately following the address.
- An address with no /ns suffix uses the host system global namespace. The global namespace is therefore the default.
- An address with a /ns suffix uses the namespace named ns.
- The host system must support network namespaces and each named namespace must previously have been set up. Naming a nonexistent namespace produces an error.
- If the variable value specifies multiple addresses, it can include addresses in the global namespace, in named namespaces, or a mix.

For additional information about network namespaces, see Section 7.1.14, "Network Namespace Support".

If binding to any address fails, the server produces an error and does not start.
Examples:
- bind_address=*

The server listens on all IPv4 or IPv6 addresses, as specified by the * wildcard.
- bind_address=198.51.100.20

The server listens only on the 198.51.100.20 IPv4 address.
- bind_address=198.51.100.20,2001:db8:0:f101::1

The server listens on the 198.51.100.20 IPv4 address and the 2001: db8:0:f101::1 IPv6 address.
- bind_address=198.51.100.20, *

This produces an error because wildcard addresses are not permitted when bind_address names a list of multiple values.
- bind_address=198.51.100.20/red,2001:db8:0:f101::1/blue,192.0.2.50

The server listens on the 198.51.100.20 IPv4 address in the red namespace, the 2001: db8:0: f101::1 IPv6 address in the blue namespace, and the 192.0.2.50 IPv4 address in the global namespace.

When bind_address names a single value (wildcard or non-wildcard), the server listens on a single socket, which for a wildcard address may be bound to multiple network interfaces. When bind_address names a list of multiple values, the server listens on one socket per value, with each socket bound to a single network interface. The number of sockets is linear with the number of values specified. Depending on operating system connection-acceptance efficiency, long value lists might incur a performance penalty for accepting TCP/IP connections.

Because file descriptors are allocated for listening sockets and network namespace files, it may be necessary to increase the open_files_limit system variable.

If you intend to bind the server to a specific address, be sure that the mysql. user system table contains an account with administrative privileges that you can use to connect to that address. Otherwise, you cannot shut down the server. For example, if you bind the server to *, you can connect to it using all existing accounts. But if you bind the server to $:: 1$, it accepts connections only on that address. In that case, first make sure that the 'root '@'::1' account is present in the mysql. user table so you can still connect to the server to shut it down.
- block_encryption_mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --block-encryption-mode=\# \\
\hline System Variable & block_encryption_mode \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & aes-128-ecb
\end{tabular}

This variable controls the block encryption mode for block-based algorithms such as AES. It affects encryption for AES_ENCRYPT( ) and AES_DECRYPT ( ).
block_encryption_mode takes a value in aes-keylen-mode format, where keylen is the key length in bits and mode is the encryption mode. The value is not case-sensitive. Permitted keylen values are 128, 192, and 256. Permitted mode values are ECB, CBC, CFB1, CFB8, CFB128, and OFB.

For example, this statement causes the AES encryption functions to use a key length of 256 bits and the CBC mode:

SET block_encryption_mode = 'aes-256-cbc';
An error occurs for attempts to set block_encryption_mode to a value containing an unsupported key length or a mode that the SSL library does not support.
- build_id

\begin{tabular}{|l|l|}
\hline System Variable & build_id \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Platform Specific & Linux \\
\hline
\end{tabular}

This is a 160-bit SHA1 signature which is generated by the linker when compiling the server on Linux systems with - DWITH_BUILD_ID=ON (enabled by default), and converted to a hexadecimal string. This read-only value serves as a unique build ID, and is written into the server log at startup.
build_id is not supported on platforms other than Linux.
- bulk_insert_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --bulk-insert-buffer-size=\# \\
\hline System Variable & bulk_insert_buffer_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 8388608 \\
\hline Minimum Value & 0 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline Unit & bytes/thread \\
\hline
\end{tabular}

MyISAM uses a special tree-like cache to make bulk inserts faster for INSERT . . . SELECT, INSERT ... VALUES (...), (...), ..., and LOAD DATA when adding data to nonempty tables. This variable limits the size of the cache tree in bytes per thread. Setting it to 0 disables this optimization. The default value is 8 MB .

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- caching_sha2_password_digest_rounds

\begin{tabular}{|l|l|}
\hline Command-Line Format & --caching-sha2-password-digestrounds=\# \\
\hline System Variable & caching_sha2_password_digest_rounds \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 5000 \\
\hline Minimum Value & 5000 \\
\hline Maximum Value & 4095000 \\
\hline
\end{tabular}

The number of hash rounds used by the caching_sha2_password authentication plugin for password storage.

Increasing the number of hashing rounds above the default value incurs a performance penalty that correlates with the amount of increase:
- Creating an account that uses the caching_sha2_password plugin has no impact on the client session within which the account is created, but the server must perform the hashing rounds to complete the operation.
- For client connections that use the account, the server must perform the hashing rounds and save the result in the cache. The result is longer login time for the first client connection, but not for subsequent connections. This behavior occurs after each server restart.
- caching_sha2_password_auto_generate_rsa_keys

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - caching-sha2-password-auto-generate-rsa-keys[=\{OFF|ON\}] \\
\hline System Variable & caching_sha2_password_auto_generate_rsa_keys \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

The server uses this variable to determine whether to autogenerate RSA private/public key-pair files in the data directory if they do not already exist.

At startup, the server automatically generates RSA private/public key-pair files in the data directory if all of these conditions are true: The sha256_password_auto_generate_rsa_keys or caching_sha2_password_auto_generate_rsa_keys system variable is enabled; no RSA options are specified; the RSA files are missing from the data directory. These key-pair files enable secure password exchange using RSA over unencrypted connections for accounts authenticated by the sha256_password (deprecated) or caching_sha2_password plugin;
see Section 8.4.1.3, "SHA-256 Pluggable Authentication", and Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".

For more information about RSA file autogeneration, including file names and characteristics, see Section 8.3.3.1, "Creating SSL and RSA Certificates and Keys using MySQL"

The auto_generate_certs system variable is related but controls autogeneration of SSL certificate and key files needed for secure connections using SSL.
- caching_sha2_password_private_key_path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --caching-sha2-password-private-keypath=file_name \\
\hline System Variable & caching_sha2_password_private_key_path \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & private_key.pem \\
\hline
\end{tabular}

This variable specifies the path name of the RSA private key file for the caching_sha2_password authentication plugin. If the file is named as a relative path, it is interpreted relative to the server data directory. The file must be in PEM format.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0771.jpg?height=104&width=108&top_left_y=1393&top_left_x=397)

\section*{Important}

Because this file stores a private key, its access mode should be restricted so that only the MySQL server can read it.

For information about caching_sha2_password, see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- caching_sha2_password_public_key_path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --caching-sha2-password-public-keypath=file_name \\
\hline System Variable & caching_sha2_password_public_key_path \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & public_key.pem \\
\hline
\end{tabular}

This variable specifies the path name of the RSA public key file for the caching_sha2_password authentication plugin. If the file is named as a relative path, it is interpreted relative to the server data directory. The file must be in PEM format.

For information about caching_sha2_password, including information about how clients request the RSA public key, see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- character_set_client

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & System Variable & character_set_client \\
\hline & Scope & Global, Session \\
\cline { 2 - 3 } &
\end{tabular}

\begin{tabular}{|l|l|} 
Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & utf8mb4 \\
\hline
\end{tabular}

The character set for statements that arrive from the client. The session value of this variable is set using the character set requested by the client when the client connects to the server. (Many clients support a--default-character-set option to enable this character set to be specified explicitly. See also Section 12.4, "Connection Character Sets and Collations".) The global value of the variable is used to set the session value in cases when the client-requested value is unknown or not available, or the server is configured to ignore client requests. This can happen when the client requests a character set not known to the server, such as when a Japanese-enabled client requests sjis when connecting to a server not configured with sjis support.

Some character sets cannot be used as the client character set. Attempting to use them as the character_set_client value produces an error. See Impermissible Client Character Sets.
- character_set_connection

\begin{tabular}{|l|l|}
\hline System Variable & character_set_connection \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & utf8mb4 \\
\hline
\end{tabular}

The character set used for literals specified without a character set introducer and for number-tostring conversion. For information about introducers, see Section 12.3.8, "Character Set Introducers".
- character_set_database

\begin{tabular}{|l|l|}
\hline System Variable & character_set_database \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & utf8mb4 \\
\hline Footnote & This option is dynamic, but should be set only by server. You should not set this variable manually. \\
\hline
\end{tabular}

The character set used by the default database. The server sets this variable whenever the default database changes. If there is no default database, the variable has the same value as character_set_server.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".

The global character_set_database and collation_database system variables are deprecated; expect them to be removed in a future version of MySQL.

Assigning a value to the session character_set_database and collation_database system variables is deprecated and assignments produce a warning. Expect the session variables to
become read-only (and assignments to them to produce an error) in a future version of MySQL in which it remains possible to access the session variables to determine the database character set and collation for the default database.
- character_set_filesystem

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-set-filesystem=name \\
\hline System Variable & character_set_filesystem \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & binary \\
\hline
\end{tabular}

The file system character set. This variable is used to interpret string literals that refer to file names, such as in the LOAD DATA and SELECT ... INTO OUTFILE statements and the LOAD_FILE( ) function. Such file names are converted from character_set_client to character_set_filesystem before the file opening attempt occurs. The default value is binary, which means that no conversion occurs. For systems on which multibyte file names are permitted, a different value may be more appropriate. For example, if the system represents file names using UTF-8, set character_set_filesystem to 'utf8mb4'.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- character_set_results

\begin{tabular}{|l|l|}
\hline System Variable & character_set_results \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & utf8mb4 \\
\hline
\end{tabular}

The character set used for returning query results to the client. This includes result data such as column values, result metadata such as column names, and error messages.
- character_set_server

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-set-server=name \\
\hline System Variable & character_set_server \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & utf8mb4 \\
\hline
\end{tabular}

The servers default character set. See Section 12.15, "Character Set Configuration". If you set this variable, you should also set collation_server to specify the collation for the character set.
- character_set_system

\begin{tabular}{|l|l|}
\hline System Variable & character_set_system \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & utf8mb3 \\
\hline
\end{tabular}

The character set used by the server for storing identifiers. The value is always utf8mb3.
- character_sets_dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=dir_name \\
\hline System Variable & character_sets_dir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory where character sets are installed. See Section 12.15, "Character Set Configuration".
- check_proxy_users

\begin{tabular}{|l|l|}
\hline Command-Line Format & --check-proxy-users[=\{OFF|ON\}] \\
\hline System Variable & check_proxy_users \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Some authentication plugins implement proxy user mapping for themselves (for example, the PAM and Windows authentication plugins). Other authentication plugins do not support proxy users by default. Of these, some can request that the MySQL server itself map proxy users according to granted proxy privileges: mysql_native_password (deprecated), sha256_password (deprecated).

If the check_proxy_users system variable is enabled, the server performs proxy user mapping for any authentication plugins that make such a request. It may also be necessary to enable pluginspecific system variables to take advantage of server proxy user mapping support:
- For the deprecated mysql_native_password plugin (deprecated), enable mysql_native_password_proxy_users.
- For the sha256_password plugin (deprecated), enable sha256_password_proxy_users.

For information about user proxying, see Section 8.2.19, "Proxy Users".
- collation_connection

\begin{tabular}{|l|l|}
\hline System Variable & collation_connection \\
\hline Scope & Global, Session \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The collation of the connection character set. collation_connection is important for comparisons of literal strings. For comparisons of strings with column values, collation_connection does not matter because columns have their own collation, which has a higher collation precedence (see Section 12.8.4, "Collation Coercibility in Expressions").

Using the name of a user-defined collation for this variable raises a warning.
- collation_database

\begin{tabular}{|l|l|}
\hline System Variable & collation_database \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & utf8mb4_0900_ai_ci \\
\hline Footnote & This option is dynamic, but should be set only by server. You should not set this variable manually. \\
\hline
\end{tabular}

The collation used by the default database. The server sets this variable whenever the default database changes. If there is no default database, the variable has the same value as collation_server.

The global character_set_database and collation_database system variables are deprecated; expect them to be removed in a future version of MySQL.

Assigning a value to the session character_set_database and collation_database system variables is deprecated and assignments produce a warning. Expect the session variables to become read-only (and assignments to produce an error) in a future version of MySQL in which it remains possible to access the session variables to determine the database character set and collation for the default database.

Using the name of a user-defined collation for collation_database raises a warning.
- collation_server

\begin{tabular}{|l|l|}
\hline Command-Line Format & --collation-server=name \\
\hline System Variable & collation_server \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & utf8mb4_0900_ai_ci \\
\hline
\end{tabular}

The server's default collation. See Section 12.15, "Character Set Configuration".
Setting this to the name of a user-defined collation raises a warning.
- completion_type

\begin{tabular}{|l|l|}
\hline Command-Line Format & --completion- type=\# \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & completion_type \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & NO_CHAIN \\
\hline Valid Values & \begin{tabular}{l}
NO_CHAIN \\
CHAIN \\
RELEASE \\
0 \\
1 \\
2
\end{tabular} \\
\hline
\end{tabular}

The transaction completion type. This variable can take the values shown in the following table. The variable can be assigned using either the name values or corresponding integer values.

\begin{tabular}{|l|l|}
\hline Value & Description \\
\hline NO_CHAIN (or 0) & COMMIT and ROLLBACK are unaffected. This is the default value. \\
\hline CHAIN (or 1) & COMMIT and ROLLBACK are equivalent to COMMIT AND CHAIN and ROLLBACK AND CHAIN, respectively. (A new transaction starts immediately with the same isolation level as the just-terminated transaction.) \\
\hline RELEASE (or 2) & COMMIT and ROLLBACK are equivalent to COMMIT RELEASE and ROLLBACK RELEASE, respectively. (The server disconnects after terminating the transaction.) \\
\hline
\end{tabular}
completion_type affects transactions that begin with START TRANSACTION or BEGIN and end with COMMIT or ROLLBACK. It does not apply to implicit commits resulting from execution of the statements listed in Section 15.3.3, "Statements That Cause an Implicit Commit". It also does not apply for XA COMMIT, XA ROLLBACK, or when autocommit=1.
- component_scheduler.enabled

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - component scheduler.enabled[=value] \\
\hline System Variable & component_scheduler.enabled \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|} 
Default Value & ON
\end{tabular}

When set to OFF at startup, the background thread does not start. Tasks can still be scheduled, but they do not run until component_scheduler is enabled. When set to ON at startup, the component is fully operational.

It is also possible to set the value dynamically to get the following effects:
- ON starts the background thread that begins servicing the queue immediately.
- OFF signals a termination of the background thread, which waits for it to end. The background thread checks the termination flag before accessing the queue to check for tasks to execute.
- concurrent_insert

\begin{tabular}{|l|l|}
\hline Command-Line Format & --concurrent-insert[=value] \\
\hline System Variable & concurrent_insert \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & AUT0 \\
\hline Valid Values & \begin{tabular}{l}
NEVER \\
AUTO \\
ALWAYS \\
0 \\
1 \\
2
\end{tabular} \\
\hline
\end{tabular}

If AUTO (the default), MySQL permits INSERT and SELECT statements to run concurrently for MyISAM tables that have no free blocks in the middle of the data file.

This variable can take the values shown in the following table. The variable can be assigned using either the name values or corresponding integer values.

\begin{tabular}{|l|l|}
\hline Value & Description \\
\hline NEVER (or 0) & Disables concurrent inserts \\
\hline AUTO (or 1) & (Default) Enables concurrent insert for MyISAM tables that do not have holes \\
\hline ALWAYS (or 2) & Enables concurrent inserts for all MyISAM tables, even those that have holes. For a table with a hole, new rows are inserted at the end of the table if it is in use by another thread. Otherwise, MySQL acquires a normal write lock and inserts the row into the hole. \\
\hline
\end{tabular}

If you start mysqld with --skip-new, concurrent_insert is set to NEVER.
See also Section 10.11.3, "Concurrent Inserts".
- connect_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-timeout=\# \\
\hline System Variable & connect_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 2 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The number of seconds that the mysqld server waits for a connect packet before responding with Bad handshake. The default value is 10 seconds.

Increasing the connect_timeout value might help if clients frequently encounter errors of the form Lost connection to MySQL server at 'XXX', system error: errno.
- connection_memory_chunk_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connection-memory-chunk-size=\# \\
\hline System Variable & connection_memory_chunk_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8192 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 536870912 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Set the chunking size for updates to the global memory usage counter
Global_connection_memory. The status variable is updated only when total memory consumption by all user connections changes by more than this amount. Disable updates by setting connection_memory_chunk_size = 0.

The memory calculation is exclusive of any memory used by system users such as the MySQL root user. Memory used by the InnoDB buffer pool is also not included.

You must have the SYSTEM_VARIABLES_ADMIN or SUPER privilege to set this variable.
- connection_memory_limit

\begin{tabular}{|l|l|l|}
\hline \multirow{5}{*}{} & Command-Line Format & --connection-memory-limit=\# \\
\hline & System Variable & connection_memory_limit \\
\hline & Scope & Global, Session \\
\hline & Dynamic & Yes \\
\hline & SET_VAR Hint Applies & No \\
\hline 748 & Type & Integer \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & 18446744073709551615 \\
\hline Minimum Value & 2097152 \\
\hline Maximum Value & 18446744073709551615 \\
\hline Unit & bytes \\
\hline
\end{tabular}

Set the maximum amount of memory that can be used by a single user connection. If any user connection uses more than this amount, all queries from this connection are rejected with ER_CONN_LIMIT, including any queries currently running.

The limit set by this variable does not apply to system users, or to the MySQL root account. Memory used by the InnoDB buffer pool is also not included.

You must have the SYSTEM_VARIABLES_ADMIN or SUPER privilege to set this variable.
- core_file

\begin{tabular}{|l|l|}
\hline System Variable & core_file \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether to write a core file if the server unexpectedly exits. This variable is set by the-core-file option.
- create_admin_listener_thread

\begin{tabular}{|l|l|}
\hline Command-Line Format & --create-admin-listenerthread[=\{OFF|ON\}] \\
\hline System Variable & create_admin_listener_thread \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Whether to use a dedicated listening thread for client connections on the administrative network interface (see Section 7.1.12.1, "Connection Interfaces"). The default is OFF; that is, the manager thread for ordinary connections on the main interface also handles connections for the administrative interface.

Depending on factors such as platform type and workload, you may find one setting for this variable yields better performance than the other setting.

Setting create_admin_listener_thread has no effect if admin_address is not specified because in that case the server maintains no administrative network interface.
- cte_max_recursion_depth

\begin{tabular}{|l|l|}
\hline Command-Line Format & --cte-max-recursion-depth=\# \\
\hline System Variable & cte_max_recursion_depth \\
\hline Scope & Global, Session \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

The common table expression (CTE) maximum recursion depth. The server terminates execution of any CTE that recurses more levels than the value of this variable. For more information, see Limiting Common Table Expression Recursion.
- datadir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --datadir=dir_name \\
\hline System Variable & datadir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline
\end{tabular}

The path to the MySQL server data directory. Relative paths are resolved with respect to the current directory. If you expect the server to be started automatically (that is, in contexts for which you cannot know the current directory in advance), it is best to specify the datadir value as an absolute path.
- debug

\begin{tabular}{|l|l|}
\hline Command-Line Format & --debug[=debug_options] \\
\hline System Variable & debug \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value (Unix) & d:t:i:o,/tmp/mysqld.trace \\
\hline Default Value (Windows) & d:t:i:0, \mysqld.trace \\
\hline
\end{tabular}

This variable indicates the current debugging settings. It is available only for servers built with debugging support. The initial value comes from the value of instances of the --debug option given at server startup. The global and session values may be set at runtime.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".

Assigning a value that begins with + or - cause the value to added to or subtracted from the current value:
```
mysql> SET debug = 'T';
mysql> SELECT @@debug;
+----------+
| @@debug |
+----------+
| T |
+----------+
```

```
mysql> SET debug = '+P';
mysql> SELECT @@debug;
+----------+
| @@debug |
+----------+
| P:T |
+----------+
mysql> SET debug = '-P';
mysql> SELECT @@debug;
+----------+
| @@debug |
+---------+
| T |
+---------+
```


For more information, see Section 7.9.4, "The DBUG Package".
- debug_sync

\begin{tabular}{|l|l|}
\hline System Variable & debug_sync \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable is the user interface to the Debug Sync facility. Use of Debug Sync requires that MySQL be configured with the -DWITH_DEBUG=ON CMake option (see Section 2.8.7, "MySQL Source-Configuration Options"); otherwise, this system variable is not available.

The global variable value is read only and indicates whether the facility is enabled. By default, Debug Sync is disabled and the value of debug_sync is OFF. If the server is started with --debug-synctimeout $=N$, where $N$ is a timeout value greater than 0 , Debug Sync is enabled and the value of debug_sync is ON - current signal followed by the signal name. Also, $N$ becomes the default timeout for individual synchronization points.

The session value can be read by any user and has the same value as the global variable. The session value can be set to control synchronization points.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".

For a description of the Debug Sync facility and how to use synchronization points, see MySQL Internals: Test Synchronization.
- default_collation_for_utf8mb4

\begin{tabular}{|l|l|}
\hline System Variable & default_collation_for_utf8mb4 \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & utf8mb4_0900_ai_ci \\
\hline Valid Values & utf8mb4_0900_ai_ci \\
\hline
\end{tabular}

\section*{Important}

The default_collation_for_utf8mb4 system variable is for internal use by MySQL Replication only.

This variable is set by the server to the default collation for the utf8mb4 character set. The value of the variable is replicated from a source to a replica so that the replica can correctly process data originating from a source with a different default collation for utf 8 mb 4 . This variable is primarily intended to support replication from a MySQL 5.7 or older replication source server to a later MySQL replica server, or group replication with a MySQL 5.7 primary node and one or more MySQL 8.0 or later secondaries. The default collation for utf8mb4 in MySQL 5.7 is utf8mb4_general_ci, but utf8mb4_0900_ai_ci in later release series. The variable is not present in releases earlier than MySQL 8.0, so if the replica does not receive a value for the variable, it assumes the source is from an earlier release and sets the value to the previous default collation utf8mb4_general_ci.

The default utf8mb4 collation is used in the following statements:
- SHOW COLLATION and SHOW CHARACTER SET.
- CREATE TABLE and ALTER TABLE having a CHARACTER SET utf8mb4 clause without a COLLATION clause, either for the table character set or for a column character set.
- CREATE DATABASE and ALTER DATABASE having a CHARACTER SET utf8mb4 clause without a COLLATION clause.
- Any statement containing a string literal of the form _utf8mb4'some text' without a COLLATE clause.

See also Section 12.9, "Unicode Support".
- default_password_lifetime

\begin{tabular}{|l|l|}
\hline Command-Line Format & --default-password-lifetime=\# \\
\hline System Variable & default_password_lifetime \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 65535 \\
\hline Unit & days \\
\hline
\end{tabular}

This variable defines the global automatic password expiration policy. The default default_password_lifetime value is 0 , which disables automatic password expiration. If the value of default_password_lifetime is a positive integer $N$, it indicates the permitted password lifetime; passwords must be changed every $N$ days.

The global password expiration policy can be overridden as desired for individual accounts using the password expiration option of the CREATE USER and ALTER USER statements. See Section 8.2.15, "Password Management".
- default_storage_engine

\begin{tabular}{|l|l|}
\hline Command-Line Format & --default-storage-engine=name \\
\hline System Variable & default_storage_engine \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & InnoDB \\
\hline
\end{tabular}

The default storage engine for tables. See Chapter 18, Alternative Storage Engines. This variable sets the storage engine for permanent tables only. To set the storage engine for TEMPORARY tables, set the default_tmp_storage_engine system variable.

To see which storage engines are available and enabled, use the SHOW ENGINES statement or query the INFORMATION_SCHEMA ENGINES table.

If you disable the default storage engine at server startup, you must set the default engine for both permanent and TEMPORARY tables to a different engine, or else the server does not start.
- default_table_encryption

\begin{tabular}{|l|l|}
\hline Command-Line Format & --default-table-encryption[=\{OFF| ON\} ] \\
\hline System Variable & default_table_encryption \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Defines the default encryption setting applied to schemas and general tablespaces when they are created without specifying an ENCRYPTION clause.

The default_table_encryption variable is only applicable to user-created schemas and general tablespaces. It does not govern encryption of the mysql system tablespace.

Setting the runtime value of default_table_encryption requires the SYSTEM_VARIABLES_ADMIN and TABLE_ENCRYPTION_ADMIN privileges, or the deprecated SUPER privilege.

The value of default_table_encryption cannot be changed while Group Replication is running.
default_table_encryption supports SET PERSIST and SET PERSIST_ONLY syntax. See Section 7.1.9.3, "Persisted System Variables".

For more information, see Defining an Encryption Default for Schemas and General Tablespaces.
- default_tmp_storage_engine

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - default - tmp - storage - engine=name \\
\hline System Variable & default_tmp_storage_engine \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
SET_VAR Hint Applies & Yes \\
\hline Type & Enumeration \\
\hline Default Value & InnoDB \\
\hline
\end{tabular}

The default storage engine for TEMPORARY tables (created with CREATE TEMPORARY TABLE). To set the storage engine for permanent tables, set the default_storage_engine system variable. Also see the discussion of that variable regarding possible values.

If you disable the default storage engine at server startup, you must set the default engine for both permanent and TEMPORARY tables to a different engine, or else the server does not start.
- default_week_format

\begin{tabular}{|l|l|}
\hline Command-Line Format & --default-week-format=\# \\
\hline System Variable & default_week_format \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 7 \\
\hline
\end{tabular}

The default mode value to use for the WEEK( ) function. See Section 14.7, "Date and Time Functions".
- delay_key_write

\begin{tabular}{|l|l|}
\hline Command-Line Format & --delay-key-write[=\{OFF|ON|ALL\}] \\
\hline System Variable & delay_key_write \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & ON \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
ON \\
ALL
\end{tabular} \\
\hline
\end{tabular}

This variable specifies how to use delayed key writes. It applies only to MyISAM tables. Delayed key writing causes key buffers not to be flushed between writes. See also Section 18.2.1, "MyISAM Startup Options".

This variable can have one of the following values to affect handling of the DELAY_KEY_WRITE table option that can be used in CREATE TABLE statements.

\begin{tabular}{|l|l|}
\hline Option & Description \\
\hline OFF & DELAY_KEY_WRITE is ignored. \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option & Description \\
\hline ON & MySQL honors any DELAY_KEY_WRITE option specified in CREATE TABLE statements. This is the default value. \\
\hline ALL & All new opened tables are treated as if they were created with the DELAY_KEY_WRITE option enabled. \\
\hline
\end{tabular}

\section*{Note}

If you set this variable to ALL, you should not use MyISAM tables from within another program (such as another MySQL server or myisamchk) when the tables are in use. Doing so leads to index corruption.

If DELAY_KEY_WRITE is enabled for a table, the key buffer is not flushed for the table on every index update, but only when the table is closed. This speeds up writes on keys a lot, but if you use this feature, you should add automatic checking of all MyISAM tables by starting the server with the myisam_recover_options system variable set (for example, myisam_recover_options='BACKUP, FORCE'). See Section 7.1.8, "Server System Variables", and Section 18.2.1, "MyISAM Startup Options".

If you start mysqld with --skip-new, delay_key_write is set to OFF.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0785.jpg?height=122&width=88&top_left_y=1256&top_left_x=420)

\section*{Warning}

If you enable external locking with --external-locking, there is no protection against index corruption for tables that use delayed key writes.
- delayed_insert_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --delayed-insert-limit=\# \\
\hline Deprecated & Yes \\
\hline System Variable & delayed_insert_limit \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 100 \\
\hline Minimum Value & 1 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline
\end{tabular}

This system variable is deprecated (because DELAYED inserts are not supported), and you should expect it to be removed in a future release.
- delayed_insert_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --delayed-insert-timeout=\# \\
\hline Deprecated & Yes \\
\hline System Variable & delayed_insert_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 300 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

This system variable is deprecated (because DELAYED inserts are not supported), and you should expect it to be removed in a future release.
- delayed_queue_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --delayed-queue-size=\# \\
\hline Deprecated & Yes \\
\hline System Variable & delayed_queue_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1000 \\
\hline Minimum Value & 1 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline
\end{tabular}

This system variable is deprecated (because DELAYED inserts are not supported), and you should expect it to be removed in a future release.
- disabled_storage_engines

\begin{tabular}{|l|l|}
\hline Command-Line Format & --disabled-storageengines=engine[,engine]... \\
\hline System Variable & disabled_storage_engines \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & empty string \\
\hline
\end{tabular}

This variable indicates which storage engines cannot be used to create tables or tablespaces. For example, to prevent new MyISAM or FEDERATED tables from being created, start the server with these lines in the server option file:
[mysqld]
disabled_storage_engines="MyISAM, FEDERATED"
By default, disabled_storage_engines is empty (no engines disabled), but it can be set to a comma-separated list of one or more engines (not case-sensitive). Any engine named in the value cannot be used to create tables or tablespaces with CREATE TABLE or CREATE TABLESPACE, and cannot be used with ALTER TABLE ... ENGINE or ALTER TABLESPACE ... ENGINE
to change the storage engine of existing tables or tablespaces. Attempts to do so result in an ER_DISABLED_STORAGE_ENGINE error.
disabled_storage_engines does not restrict other DDL statements for existing tables, such as CREATE INDEX, TRUNCATE TABLE, ANALYZE TABLE, DROP TABLE, or DROP TABLESPACE. This permits a smooth transition so that existing tables or tablespaces that use a disabled engine can be migrated to a permitted engine by means such as ALTER TABLE ... ENGINE permitted_engine.

It is permitted to set the default_storage_engine or default_tmp_storage_engine system variable to a storage engine that is disabled. This could cause applications to behave erratically or fail, although that might be a useful technique in a development environment for identifying applications that use disabled engines, so that they can be modified.
disabled_storage_engines is disabled and has no effect if the server is started with any of these options: --initialize, --initialize-insecure, --skip-grant-tables.
- disconnect_on_expired_password

\begin{tabular}{|l|l|}
\hline Command-Line Format & --disconnect-on-expiredpassword[=\{OFF|ON\}] \\
\hline System Variable & disconnect_on_expired_password \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

This variable controls how the server handles clients with expired passwords:
- If the client indicates that it can handle expired passwords, the value of disconnect_on_expired_password is irrelevant. The server permits the client to connect but puts it in sandbox mode.
- If the client does not indicate that it can handle expired passwords, the server handles the client according to the value of disconnect_on_expired_password:
- If disconnect_on_expired_password: is enabled, the server disconnects the client.
- If disconnect_on_expired_password: is disabled, the server permits the client to connect but puts it in sandbox mode.

For more information about the interaction of client and server settings relating to expired-password handling, see Section 8.2.16, "Server Handling of Expired Passwords".
- div_precision_increment

\begin{tabular}{|l|l|}
\hline Command-Line Format & --div-precision-increment=\# \\
\hline System Variable & div_precision_increment \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 4 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 30 \\
\hline
\end{tabular}

This variable indicates the number of digits by which to increase the scale of the result of division operations performed with the / operator. The default value is 4 . The minimum and maximum values are 0 and 30 , respectively. The following example illustrates the effect of increasing the default value.
```
mysql> SELECT 1/7;
+--------+
| 1/7 |
+--------+
| 0.1429 |
+--------+
mysql> SET div_precision_increment = 12;
mysql> SELECT 1/7;
+-----------------+
| 1/7 |
+-----------------+
| 0.142857142857 |
+-----------------+
```

- dragnet.log_error_filter_rules

\begin{tabular}{|l|l|}
\hline Command-Line Format & --dragnet.log-error-filterrules=value \\
\hline System Variable & dragnet.log_error_filter_rules \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & IF prio>=INFORMATION THEN drop. IF EXISTS source_line THEN unset source_line. \\
\hline
\end{tabular}

The filter rules that control operation of the log_filter_dragnet error log filter component. If log_filter_dragnet is not installed, dragnet.log_error_filter_rules is unavailable. If log_filter_dragnet is installed but not enabled, changes to dragnet.log_error_filter_rules have no effect.

The effect of the default value is similar to the filtering performed by the log_sink_internal filter with a setting of log_error_verbosity=2.
dragnet. Status status variable can be consulted to determine the result of the most recent assignment to dragnet.log_error_filter_rules.
- enterprise_encryption.maximum_rsa_key_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --enterprise-encryption.maximum-rsa-key-size=\# \\
\hline System Variable & enterprise_encryption.maximum_rsa_key_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 4096 \\
\hline Minimum Value & 2048 \\
\hline Maximum Value & 16384 \\
\hline
\end{tabular}

This variable limits the maximum size of RSA keys generated by MySQL Enterprise Encryption. The variable is available only if the MySQL Enterprise Encryption component component_enterprise_encryption is installed.

The lowest setting is 2048 bits, which is the minimum RSA key length that is acceptable by current best practice. The default setting is 4096 bits. The highest setting is 16384 bits. Generating longer keys can consume significant CPU resources, so you can use this setting to limit keys to a length that provides adequate security for your requirements while balancing this with resource usage. See Section 8.6.2, "Configuring MySQL Enterprise Encryption" for more information.
- enterprise_encryption.rsa_support_legacy_padding

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --enterpriseencryption.rsa_support_legacy_padding ON\}] & [=\{OFF \\
\hline System Variable & enterprise_encryption.rsa_support_legacy_pa & \\
\hline Scope & Global & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Boolean & \\
\hline Default Value & 0FF & \\
\hline
\end{tabular}

This variable controls whether encrypted data and signatures that MySQL Enterprise Encryption produced using the old openssl_udf shared library functions can be decrypted or verified by the MySQL Enterprise Encryption component (component_enterprise_encryption). The variable is available only if the MySQL Enterprise Encryption component is installed.

For the component functions to support decryption and verification for content produced by the old openssl_udf shared library functions, you must set the system variable padding to ON. When ON is set, if the component functions cannot decrypt or verify content when assuming it has the RSAESOAEP or RSASSA-PSS scheme (as used by the component), they make another attempt assuming it has the RSAES-PKCS1-v1_5 or RSASSA-PKCS1-v1_5 scheme (as used by the openssl_udf shared library functions). When OFF is set, if the component functions cannot decrypt or verify content using their normal schemes, they return null output. See Section 8.6.2, "Configuring MySQL Enterprise Encryption" for more information.
- end_markers_in_json

\begin{tabular}{|l|l|}
\hline Command-Line Format & --end-markers-in-json[=\{OFF|ON\}] \\
\hline System Variable & end_markers_in_json \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Whether optimizer JSON output should add end markers. See Section 10.15.9, "The end_markers_in_json System Variable".
- eq_range_index_dive_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --eq-range-index-dive-limit=\# \\
\hline System Variable & eq_range_index_dive_limit \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 200 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

This variable indicates the number of equality ranges in an equality comparison condition when the optimizer should switch from using index dives to index statistics in estimating the number of qualifying rows. It applies to evaluation of expressions that have either of these equivalent forms, where the optimizer uses a nonunique index to look up col_name values:
col_name IN(val1, ..., valN)
col_name = val1 OR ... OR col_name = valN
In both cases, the expression contains $N$ equality ranges. The optimizer can make row estimates using index dives or index statistics. If eq_range_index_dive_limit is greater than 0 , the optimizer uses existing index statistics instead of index dives if there are eq_range_index_dive_limit or more equality ranges. Thus, to permit use of index dives for up to $N$ equality ranges, set eq_range_index_dive_limit to $N+1$. To disable use of index statistics and always use index dives regardless of $N$, set eq_range_index_dive_limit to 0 .

For more information, see Equality Range Optimization of Many-Valued Comparisons.
To update table index statistics for best estimates, use ANALYZE TABLE.
- error_count

The number of errors that resulted from the last statement that generated messages. This variable is read only. See Section 15.7.7.18, "SHOW ERRORS Statement".
- event_scheduler

\begin{tabular}{|l|l|}
\hline Command-Line Format & --event-scheduler[=value] \\
\hline System Variable & event_scheduler \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & ON \\
\hline Valid Values & \begin{tabular}{l}
ON \\
OFF \\
DISABLED
\end{tabular} \\
\hline
\end{tabular}

This variable enables or disables, and starts or stops, the Event Scheduler. The possible status values are ON, OFF, and DISABLED. Turning the Event Scheduler OFF is not the same as disabling the Event Scheduler, which requires setting the status to DISABLED. This variable and its effects on the Event Scheduler's operation are discussed in greater detail in Section 27.4.2, "Event Scheduler Configuration"
- explain_format

\begin{tabular}{|l|l|}
\hline Command-Line Format & --explain-format=format \\
\hline System Variable & explain_format \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & TRADITIONAL \\
\hline Valid Values & \begin{tabular}{l}
TRADITIONAL \\
JSON \\
TREE
\end{tabular} \\
\hline
\end{tabular}

This variable determines the default output format used by EXPLAIN in the absence of a FORMAT option when displaying a query execution plan. Possible values and their effects are listed here:
- TRADITIONAL: Use MySQL's traditional table-based output, as if FORMAT=TRADITIONAL had been specified as part of the EXPLAIN statement. This is the variable's default value. DEFAULT is also supported as a synonym for TRADITIONAL, and has exactly the same effect.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0791.jpg?height=111&width=99&top_left_y=1308&top_left_x=438)

\section*{Note}

DEFAULT cannot be used as part of an EXPLAIN statement's FORMAT option.
- JSON: Use the JSON output format, as if FORMAT=JSON had been specified.
- TREE: Use the tree-based output format, as if FORMAT=TREE had been specified.

The setting for this variable also affects EXPLAIN ANALYZE. For this purpose, DEFAULT and TRADITIONAL are interpeted as TREE. If the value of explain_format is JSON and an EXPLAIN ANALYZE statement having no FORMAT option is issued, the statement raises an error (ER_NOT_SUPPORTED_YET).

Using a format specifier with EXPLAIN or EXPLAIN ANALYZE overrides any setting for explain_format.

The explain_format system variable has no effect on EXPLAIN output when this statement is used to display information about table columns.

Setting the session value of explain_format requires no special privileges; setting it on the global level requires SYSTEM_VARIABLES_ADMIN (or the deprecated SUPER privilege). See Section 7.1.9.1, "System Variable Privileges".

For more information and examples, see Obtaining Execution Plan Information.
- explain_json_format_version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --explain-json-format-version=\# \\
\hline System Variable & explain_json_format_version \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 2 \\
\hline
\end{tabular}

Determines the version of the JSON output format used by EXPLAIN FORMAT=JSON statements. Setting this variable to 1 causes the server to use Version 1, which is the linear format used for output from such statements in older versions of MySQL; this is the default in MySQL 8.4. Setting explain_json_format_version to 2 causes the Version 2 format to be used; this JSON output format is based on access paths, and is intended to provide better compatibility with future versions of the MySQL Optimizer.

For an example of use, see Obtaining Execution Plan Information.
- explicit_defaults_for_timestamp

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--explicit-defaults-for- \\
timestamp[=\{OFF|ON\}]
\end{tabular} \\
\hline Deprecated & Yes \\
\hline System Variable & explicit_defaults_for_timestamp \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

This system variable determines whether the server enables certain nonstandard behaviors for default values and NULL-value handling in TIMESTAMP columns. By default, explicit_defaults_for_timestamp is enabled, which disables the nonstandard behaviors. Disabling explicit_defaults_for_timestamp results in a warning.

If explicit_defaults_for_timestamp is disabled, the server enables the nonstandard behaviors and handles TIMESTAMP columns as follows:
- TIMESTAMP columns not explicitly declared with the NULL attribute are automatically declared with the NOT NULL attribute. Assigning such a column a value of NULL is permitted and sets the column to the current timestamp. Exception: Attempting to insert NULL into a generated column declared as TIMESTAMP NOT NULL is rejected with an error.
- The first TIMESTAMP column in a table, if not explicitly declared with the NULL attribute or an explicit DEFAULT or ON UPDATE attribute, is automatically declared with the DEFAULT CURRENT_TIMESTAMP and ON UPDATE CURRENT_TIMESTAMP attributes.
- TIMESTAMP columns following the first one, if not explicitly declared with the NULL attribute or an explicit DEFAULT attribute, are automatically declared as DEFAULT '0000-00-00 00:00:00'
(the "zero" timestamp). For inserted rows that specify no explicit value for such a column, the column is assigned '0000-00-00 00:00:00' and no warning occurs.

Depending on whether strict SQL mode or the NO_ZERO_DATE SQL mode is enabled, a default value of '0000-00-00 00:00:00' may be invalid. Be aware that the TRADITIONAL SQL mode includes strict mode and NO_ZERO_DATE. See Section 7.1.11, "Server SQL Modes".

The nonstandard behaviors just described are deprecated; expect them to be removed in a future MySQL release.

If explicit_defaults_for_timestamp is enabled, the server disables the nonstandard behaviors and handles TIMESTAMP columns as follows:
- It is not possible to assign a TIMESTAMP column a value of NULL to set it to the current timestamp. To assign the current timestamp, set the column to CURRENT_TIMESTAMP or a synonym such as NOW ().
- TIMESTAMP columns not explicitly declared with the NOT NULL attribute are automatically declared with the NULL attribute and permit NULL values. Assigning such a column a value of NULL sets it to NULL, not the current timestamp.
- TIMESTAMP columns declared with the NOT NULL attribute do not permit NULL values. For inserts that specify NULL for such a column, the result is either an error for a single-row insert if strict SQL mode is enabled, or '0000-00-00 00:00:00' is inserted for multiple-row inserts with strict SQL mode disabled. In no case does assigning the column a value of NULL set it to the current timestamp.
- TIMESTAMP columns explicitly declared with the NOT NULL attribute and without an explicit DEFAULT attribute are treated as having no default value. For inserted rows that specify no explicit value for such a column, the result depends on the SQL mode. If strict SQL mode is enabled, an error occurs. If strict SQL mode is not enabled, the column is declared with the implicit default of '0000-00-00 00:00:00' and a warning occurs. This is similar to how MySQL treats other temporal types such as DATETIME.
- No TIMESTAMP column is automatically declared with the DEFAULT CURRENT_TIMESTAMP or ON UPDATE CURRENT_TIMESTAMP attributes. Those attributes must be explicitly specified.
- The first TIMESTAMP column in a table is not handled differently from TIMESTAMP columns following the first one.

If explicit_defaults_for_timestamp is disabled at server startup, this warning appears in the error log:
[Warning] TIMESTAMP with implicit DEFAULT value is deprecated. Please use --explicit_defaults_for_timestamp server option (see documentation for more details).

As indicated by the warning, to disable the deprecated nonstandard behaviors, enable the explicit_defaults_for_timestamp system variable at server startup.

> Note
> explicit_defaults_for_timestamp is itself deprecated because its only purpose is to permit control over deprecated TIMESTAMP behaviors that are to be removed in a future MySQL release. When removal of those behaviors occurs, expect explicit_defaults_for_timestamp to be removed as well.

For additional information, see Section 13.2.5, "Automatic Initialization and Updating for TIMESTAMP and DATETIME".
- external_user

\begin{tabular}{|l|l|}
\hline System Variable & external_user \\
\hline Scope & Session \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The external user name used during the authentication process, as set by the plugin used to authenticate the client. With native (built-in) MySQL authentication, or if the plugin does not set the value, this variable is NULL. See Section 8.2.19, "Proxy Users".
- flush

\begin{tabular}{|l|l|}
\hline Command-Line Format & --flush[=\{OFF|ON\}] \\
\hline System Variable & flush \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Applies to MyISAM, only.
If ON, the server flushes (synchronizes) all changes to disk after each SQL statement. Normally, MySQL does a write of all changes to disk only after each SQL statement and lets the operating system handle the synchronizing to disk. See Section B.3.3.3, "What to Do If MySQL Keeps Crashing". This variable is set to ON if you start mysqld with the --flush option.

\section*{Note}

If flush is enabled, the value of flush_time does not matter and changes to flush_time have no effect on flush behavior.
- flush_time

\begin{tabular}{|l|l|}
\hline Command-Line Format & --flush-time=\# \\
\hline System Variable & flush_time \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31536000 \\
\hline
\end{tabular}

Unit

If this is set to a nonzero value, all tables are closed every flush_time seconds to free up resources and synchronize unflushed data to disk. This option is best used only on systems with minimal resources.

Note
If flush is enabled, the value of flush_time does not matter and changes to flush_time have no effect on flush behavior.
- foreign_key_checks

\begin{tabular}{|l|l|}
\hline System Variable & foreign_key_checks \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

If set to 1 (the default), foreign key constraints are checked. If set to 0 , foreign key constraints are ignored, with a couple of exceptions. When re-creating a table that was dropped, an error is returned if the table definition does not conform to the foreign key constraints referencing the table. Likewise, an ALTER TABLE operation returns an error if a foreign key definition is incorrectly formed. For more information, see Section 15.1.20.5, "FOREIGN KEY Constraints".

Setting this variable has the same effect on NDB tables as it does for InnoDB tables. Typically you leave this setting enabled during normal operation, to enforce referential integrity. Disabling foreign key checking can be useful for reloading InnoDB tables in an order different from that required by their parent/child relationships. See Section 15.1.20.5, "FOREIGN KEY Constraints".

Setting foreign_key_checks to 0 also affects data definition statements: DROP SCHEMA drops a schema even if it contains tables that have foreign keys that are referred to by tables outside the schema, and DROP TABLE drops tables that have foreign keys that are referred to by other tables.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0795.jpg?height=126&width=95&top_left_y=1832&top_left_x=406)

\section*{Note}

Setting foreign_key_checks to 1 does not trigger a scan of the existing table data. Therefore, rows added to the table while foreign_key_checks $=0$ are not verified for consistency.

Dropping an index required by a foreign key constraint is not permitted, even with foreign_key_checks=0. The foreign key constraint must be removed before dropping the index.
- ft_boolean_syntax

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ft-boolean-syntax=name \\
\hline System Variable & ft_boolean_syntax \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

Default Value |+ -><()~*:""\&|

The list of operators supported by boolean full-text searches performed using IN BOOLEAN MODE. See Section 14.9.2, "Boolean Full-Text Searches".

The default variable value is '+ -><( )~*:""\&|'. The rules for changing the value are as follows:
- Operator function is determined by position within the string.
- The replacement value must be 14 characters.
- Each character must be an ASCII nonalphanumeric character.
- Either the first or second character must be a space.
- No duplicates are permitted except the phrase quoting operators in positions 11 and 12. These two characters are not required to be the same, but they are the only two that may be.
- Positions 10,13 , and 14 (which by default are set to :, \&, and $\mid$ ) are reserved for future extensions.
- ft_max_word_len

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ft-max-word-len=\# \\
\hline System Variable & ft_max_word_len \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 84 \\
\hline Minimum Value & 10 \\
\hline Maximum Value & 84 \\
\hline
\end{tabular}

The maximum length of the word to be included in a MyISAM FULLTEXT index.

\section*{Note}

FULLTEXT indexes on MyISAM tables must be rebuilt after changing this variable. Use REPAIR TABLE tbl_name QUICK.
- ft_min_word_len

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ft-min-word-len=\# \\
\hline System Variable & ft_min_word_len \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 4 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 82 \\
\hline
\end{tabular}

The minimum length of the word to be included in a MyISAM FULLTEXT index.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0797.jpg?height=127&width=97&top_left_y=424&top_left_x=404)

\section*{Note}

FULLTEXT indexes on MyISAM tables must be rebuilt after changing this variable. Use REPAIR TABLE tbl_name QUICK.
- ft_query_expansion_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ft-query-expansion-limit=\# \\
\hline System Variable & ft_query_expansion_limit \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 20 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1000 \\
\hline
\end{tabular}

The number of top matches to use for full-text searches performed using WITH QUERY EXPANSION.
- ft_stopword_file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ft-stopword-file=file_name \\
\hline System Variable & ft_stopword_file \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

The file from which to read the list of stopwords for full-text searches on MyISAM tables. The server looks for the file in the data directory unless an absolute path name is given to specify a different directory. All the words from the file are used; comments are not honored. By default, a built-in list of stopwords is used (as defined in the storage/myisam/ft_static.c file). Setting this variable to the empty string ( ' ' ' ) disables stopword filtering. See also Section 14.9.4, "Full-Text Stopwords".

\section*{Note}

FULLTEXT indexes on MyISAM tables must be rebuilt after changing this variable or the contents of the stopword file. Use REPAIR TABLE tbl_name QUICK.
- general_log

\begin{tabular}{|l|l|}
\hline Command-Line Format & --general-log[=\{OFF|ON\}] \\
\hline System Variable & general_log \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & OFF
\end{tabular}

Whether the general query log is enabled. The value can be 0 (or OFF) to disable the log or 1 (or ON) to enable the log. The destination for log output is controlled by the log_output system variable; if that value is NONE, no log entries are written even if the log is enabled.
- general_log_file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --general-log-file=file_name \\
\hline System Variable & general_log_file \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & host_name.log \\
\hline
\end{tabular}

The name of the general query log file. The default value is host_name.log, but the initial value can be changed with the --general_log_file option.
- generated_random_password_length

\begin{tabular}{|l|l|}
\hline Command-Line Format & --generated-random-password-length=\# \\
\hline System Variable & generated_random_password_length \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 20 \\
\hline Minimum Value & 5 \\
\hline Maximum Value & 255 \\
\hline
\end{tabular}

The maximum number of characters permitted in random passwords generated for CREATE USER, ALTER USER, and SET PASSWORD statements. For more information, see Random Password Generation.
- global_connection_memory_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --global-connection-memory-limit=\# \\
\hline System Variable & global_connection_memory_limit \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 18446744073709551615 \\
\hline Minimum Value & 16777216 \\
\hline Maximum Value & 18446744073709551615 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Unit & bytes \\
\hline
\end{tabular}

Set the total amount of memory that can be used by all user connections; that is, Global_connection_memory should not exceed this amount. Any time that it does, all queries (including any currently running) from regular users are rejected with ER_GLOBAL_CONN_LIMIT.

Memory used by the system users such as the MySQL root user is included in this total, but is not counted towards the disconnection limit; such users are never disconnected due to memory usage.

Memory used by the InnoDB buffer pool is excluded from the total.
You must have the SYSTEM_VARIABLES_ADMIN or SUPER privilege to set this variable.
- global_connection_memory_tracking

\begin{tabular}{|l|l|}
\hline Command-Line Format & --global-connection-memorytracking=\{TRUE|FALSE\} \\
\hline System Variable & global_connection_memory_tracking \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Determines whether the server calculates Global_connection_memory. This variable must be enabled explicitly; otherwise, the memory calculation is not performed, and Global_connection_memory is not set.

You must have the SYSTEM_VARIABLES_ADMIN or SUPER privilege to set this variable.
- group_concat_max_len

\begin{tabular}{|l|l|}
\hline Command-Line Format & --group-concat-max-len=\# \\
\hline System Variable & group_concat_max_len \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 1024 \\
\hline Minimum Value & 4 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline
\end{tabular}

The maximum permitted result length in bytes for the GROUP_CONCAT( ) function. The default is 1024.

\section*{Important}

When setting the value for group_concat_max_len, consider the following:
- Estimate the maximum length required for GROUP_CONCAT( ) output and set the value accordingly.
- Setting the value excessively high can negatively affect performance and lead to out-of-memory (OOM) errors.
- In MySQL HeatWave, the maximum column length is 4 MB , so setting a value higher than this causes the output to be truncated. To avoid this, set a value under 4 MB .
- have_compress

YES if the zlib compression library is available to the server, NO if not. If not, the COMPRESS( ) and UNCOMPRESS() functions cannot be used.
- have_dynamic_loading

YES if mysqld supports dynamic loading of plugins, NO if not. If the value is NO, you cannot use options such as --plugin-load to load plugins at server startup, or the INSTALL PLUGIN statement to load plugins at runtime.
- have_geometry

YES if the server supports spatial data types, NO if not.
- have_profiling

YES if statement profiling capability is present, NO if not. If present, the profiling system variable controls whether this capability is enabled or disabled. See Section 15.7.7.33, "SHOW PROFILES Statement".

This variable is deprecated; you should expect it to be removed in a future MySQL release.
- have_query_cache
have_query_cache is deprecated, always has a value of NO, and you should expect it to be removed in a future MySQL release.
- have_rtree_keys

YES if RTREE indexes are available, NO if not. (These are used for spatial indexes in MyISAM tables.)
- have_statement_timeout

\begin{tabular}{|l|l|}
\hline System Variable & have_statement_timeout \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Boolean \\
\hline
\end{tabular}

Whether the statement execution timeout feature is available (see Statement Execution Time Optimizer Hints). The value can be NO if the background thread used by this feature could not be initialized.
- have_symlink

YES if symbolic link support is enabled, NO if not. This is required on Unix for support of the DATA DIRECTORY and INDEX DIRECTORY table options. If the server is started with the --skip-symbolic-links option, the value is DISABLED.

This variable has no meaning on Windows.

\section*{Note}

Symbolic link support, along with the --symbolic-links option that controls it, is deprecated; expect these to be removed in a future version of MySQL. In addition, the option is disabled by default. The related have_symlink system variable also is deprecated and you should expect it to be removed in a future version of MySQL.
- histogram_generation_max_mem_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --histogram-generation-max-memsize=\# \\
\hline System Variable & histogram_generation_max_mem_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 20000000 \\
\hline Minimum Value & 1000000 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The maximum amount of memory available for generating histogram statistics. See Section 10.9.6, "Optimizer Statistics", and Section 15.7.3.1, "ANALYZE TABLE Statement".

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- host_cache_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --host-cache-size=\# \\
\hline System Variable & host_cache_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & \begin{tabular}{l}
-1 (signifies autosizing; do not assign this literal \\
value)
\end{tabular} \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 65536 \\
\hline
\end{tabular}

The MySQL server maintains an in-memory host cache that contains client host name and IP address information and is used to avoid Domain Name System (DNS) lookups; see Section 7.1.12.3, "DNS Lookups and the Host Cache".

The host_cache_size variable controls the size of the host cache, as well as the size of the Performance Schema host_cache table that exposes the cache contents. Setting host_cache_size has these effects:
- Setting the size to 0 disables the host cache. With the cache disabled, the server performs a DNS lookup every time a client connects.
- Changing the size at runtime causes an implicit host cache flushing operation that clears the host cache, truncates the host_cache table, and unblocks any blocked hosts.

The default value is autosized to 128 , plus 1 for a value of max_connections up to 500 , plus 1 for every increment of 20 over 500 in the max_connections value, capped to a limit of 2000.
- hostname

\begin{tabular}{|l|l|}
\hline System Variable & hostname \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The server sets this variable to the server host name at startup. The maximum length is 255 characters.
- identity

This variable is a synonym for the last_insert_id variable. It exists for compatibility with other database systems. You can read its value with SELECT @@identity, and set it using SET identity.
- init_connect

\begin{tabular}{|l|l|}
\hline Command-Line Format & --init-connect=name \\
\hline System Variable & init_connect \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

A string to be executed by the server for each client that connects. The string consists of one or more SQL statements, separated by semicolon characters.

For users that have the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege), the content of init_connect is not executed. This is done so that an erroneous value for init_connect does not prevent all clients from connecting. For example, the value might contain a statement that has a syntax error, thus causing client connections to fail. Not executing
init_connect for users that have the CONNECTION_ADMIN or SUPER privilege enables them to open a connection and fix the init_connect value.
init_connect execution is skipped for any client user with an expired password. This is done because such a user cannot execute arbitrary statements, and thus init_connect execution fails, leaving the client unable to connect. Skipping init_connect execution enables the user to connect and change password.

The server discards any result sets produced by statements in the value of init_connect.
- information_schema_stats_expiry

\begin{tabular}{|l|l|}
\hline Command-Line Format & --information-schema-stats-expiry=\# \\
\hline System Variable & information_schema_stats_expiry \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 86400 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

Some INFORMATION_SCHEMA tables contain columns that provide table statistics:
```
STATISTICS.CARDINALITY
TABLES.AUTO_INCREMENT
TABLES.AVG_ROW_LENGTH
TABLES.CHECKSUM
TABLES.CHECK_TIME
TABLES.CREATE_TIME
TABLES.DATA_FREE
TABLES.DATA_LENGTH
TABLES.INDEX_LENGTH
TABLES.MAX_DATA_LENGTH
TABLES.TABLE_ROWS
TABLES.UPDATE_TIME
```


Those columns represent dynamic table metadata; that is, information that changes as table contents change.

By default, MySQL retrieves cached values for those columns from the mysql.index_stats and mysql.table_stats dictionary tables when the columns are queried, which is more efficient than retrieving statistics directly from the storage engine. If cached statistics are not available or have expired, MySQL retrieves the latest statistics from the storage engine and caches them in the mysql.index_stats and mysql.table_stats dictionary tables. Subsequent queries retrieve the cached statistics until the cached statistics expire. A server restart or the first opening
of the mysql.index_stats and mysql.table_stats tables do not update cached statistics automatically.

The information_schema_stats_expiry session variable defines the period of time before cached statistics expire. The default is 86400 seconds ( 24 hours), but the time period can be extended to as much as one year.

To update cached values at any time for a given table, use ANALYZE TABLE.
To always retrieve the latest statistics directly from the storage engine and bypass cached values, set information_schema_stats_expiry to 0 .

Querying statistics columns does not store or update statistics in the mysql.index_stats and mysql.table_stats dictionary tables under these circumstances:
- When cached statistics have not expired.
- When information_schema_stats_expiry is set to 0 .
- When the server is in read_only, super_read_only, transaction_read_only, or innodb_read_only mode.
- When the query also fetches Performance Schema data.

The statistics cache may be updated during a multiple-statement transaction before it is known whether the transaction commits. As a result, the cache may contain information that does not correspond to a known committed state. This can occur with autocommit=0 or after START TRANSACTION.
information_schema_stats_expiry is a session variable, and each client session can define its own expiration value. Statistics that are retrieved from the storage engine and cached by one session are available to other sessions.

For related information, see Section 10.2.3, "Optimizing INFORMATION_SCHEMA Queries".
- init_file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --init-file=file_name \\
\hline System Variable & init_file \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

If specified, this variable names a file containing SQL statements to be read and executed during the startup process. The acceptable format for statements in this file support the following constructs:
- delimiter ;, to set the statement delimiter to the ; character.
- delimiter $\$ \$$, to set the statement delimiter to the $\$ \$$ character sequence.
- Multiple statements on the same line, delimited by the current delimiter.
- Multiple-line statements.
- Comments from a \# character to the end of the line.
- Comments from a -- sequence to the end of the line.
- C-style comments from a /* sequence to the following */ sequence, including over multiple lines.
- Multiple-line string literals enclosed within either single quote ( ' ) or double quote (") characters.

If the server is started with the --initialize or --initialize-insecure option, it operates in bootstrap mode and some functionality is unavailable that limits the statements permitted in the file. These include statements that relate to account management (such as CREATE USER or GRANT), replication, and global transaction identifiers. See Section 19.1.3, "Replication with Global Transaction Identifiers".

Threads created during server startup are used for tasks such as creating the data dictionary, running upgrade procedures, and creating system tables. To ensure a stable and predictable environment, these threads are executed with the server built-in defaults for some system variables, such as sql_mode, character_set_server, collation_server, completion_type, explicit_defaults_for_timestamp, and default_table_encryption.

These threads are also used to execute the statements in any file specified with init_file when starting the server, so such statements execute with the server's built-in default values for those system variables.
- innodb_xxx

InnoDB system variables are listed in Section 17.14, "InnoDB Startup Options and System Variables". These variables control many aspects of storage, memory use, and I/O patterns for InnoDB tables, and are especially important now that InnoDB is the default storage engine.
- insert_id

The value to be used by the following INSERT or ALTER TABLE statement when inserting an AUTO_INCREMENT value. This is mainly used with the binary log.
- interactive_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --interactive-timeout=\# \\
\hline System Variable & interactive_timeout \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 28800 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

The number of seconds the server waits for activity on an interactive connection before closing it. An interactive client is defined as a client that uses the CLIENT_INTERACTIVE option to mysql_real_connect(). See also wait_timeout.
- internal_tmp_mem_storage_engine

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - internal - tmp - mem - storage - engine=\# \\
\hline System Variable & internal_tmp_mem_storage_engine \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Enumeration \\
\hline Default Value & TempTable \\
\hline Valid Values & \begin{tabular}{l}
MEMORY \\
TempTable
\end{tabular} \\
\hline
\end{tabular}

The storage engine for in-memory internal temporary tables (see Section 10.4.4, "Internal Temporary Table Use in MySQL"). Permitted values are TempTable (the default) and MEMORY.

The optimizer uses the storage engine defined by internal_tmp_mem_storage_engine for inmemory internal temporary tables.

Configuring a session setting for internal_tmp_mem_storage_engine requires the SESSION_VARIABLES_ADMIN or SYSTEM_VARIABLES_ADMIN privilege.
- join_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --join-buffer-size=\# \\
\hline System Variable & join_buffer_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 262144 \\
\hline Minimum Value & 128 \\
\hline Maximum Value (Windows) & 4294967168 \\
\hline Maximum Value (Other, 64-bit platforms) & 18446744073709551488 \\
\hline Maximum Value (Other, 32-bit platforms) & 4294967168 \\
\hline Unit & bytes \\
\hline Block Size & 128 \\
\hline
\end{tabular}

The minimum size of the buffer that is used for plain index scans, range index scans, and joins that do not use indexes and thus perform full table scans. This variable also controls the amount of memory used for hash joins. Normally, the best way to get fast joins is to add indexes. Increase the value of join_buffer_size to get a faster full join when adding indexes is not possible. One join buffer is allocated for each full join between two tables. For a complex join between several tables for which indexes are not used, multiple join buffers might be necessary.

The default is 256 KB . The maximum permissible setting for join_buffer_size is $4 \mathrm{~GB}-1$. Larger values are permitted for 64-bit platforms (except 64-bit Windows, for which large values are truncated to $4 \mathrm{~GB}-1$ with a warning). The block size is 128 , and a value that is not an exact multiple of the block size is rounded down to the next lower multiple of the block size by MySQL Server before storing the value for the system variable. The parser allows values up to the maximum unsigned integer value for the platform ( 4294967295 or $2^{32}-1$ for a 32 -bit system, 18446744073709551615 or $2^{64}-1$ for a 64 -bit system) but the actual maximum is a block size lower.

Unless a Block Nested-Loop or Batched Key Access algorithm is used, there is no gain from setting the buffer larger than required to hold each matching row, and all joins allocate at least the minimum size, so use caution in setting this variable to a large value globally. It is better to keep the global setting small and change the session setting to a larger value only in sessions that are doing large joins, or change the setting on a per-query basis by using a SET_VAR optimizer hint (see

Section 10.9.3, "Optimizer Hints"). Memory allocation time can cause substantial performance drops if the global size is larger than needed by most queries that use it.

When Block Nested-Loop is used, a larger join buffer can be beneficial up to the point where all required columns from all rows in the first table are stored in the join buffer. This depends on the query; the optimal size may be smaller than holding all rows from the first tables.

When Batched Key Access is used, the value of join_buffer_size defines how large the batch of keys is in each request to the storage engine. The larger the buffer, the more sequential access is made to the right hand table of a join operation, which can significantly improve performance.

For additional information about join buffering, see Section 10.2.1.7, "Nested-Loop Join Algorithms". For information about Batched Key Access, see Section 10.2.1.12, "Block Nested-Loop and Batched Key Access Joins". For information about hash joins, see Section 10.2.1.4, "Hash Join Optimization".
- keep_files_on_create

\begin{tabular}{|l|l|}
\hline Command-Line Format & --keep-files-on-create[=\{OFF | ON\}] \\
\hline System Variable & keep_files_on_create \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

If a MyISAM table is created with no DATA DIRECTORY option, the . MYD file is created in the database directory. By default, if MyISAM finds an existing . MYD file in this case, it overwrites it. The same applies to . MYI files for tables created with no INDEX DIRECTORY option. To suppress this behavior, set the keep_files_on_create variable to ON (1), in which case MyISAM does not overwrite existing files and returns an error instead. The default value is OFF (0).

If a MyISAM table is created with a DATA DIRECTORY or INDEX DIRECTORY option and an existing .MYD or .MYI file is found, MyISAM always returns an error. It does not overwrite a file in the specified directory.
- key_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --key-buffer-size=\# \\
\hline System Variable & key_buffer_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8388608 \\
\hline Minimum Value & 0 \\
\hline Maximum Value (64-bit platforms) & OS_PER_PROCESS_LIMIT \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Unit & bytes \\
\hline
\end{tabular}

Index blocks for MyISAM tables are buffered and are shared by all threads. key_buffer_size is the size of the buffer used for index blocks. The key buffer is also known as the key cache.

The minimum permissible setting is 0 , but you cannot set key_buffer_size to 0 dynamically. A setting of 0 drops the key cache, which is not permitted at runtime. Setting key_buffer_size to 0 is permitted only at startup, in which case the key cache is not initialized. Changing the key_buffer_size setting at runtime from a value of 0 to a permitted non-zero value initializes the key cache.
key_buffer_size can be increased or decreased only in increments or multiples of 4096 bytes. Increasing or decreasing the setting by a nonconforming value produces a warning and truncates the setting to a conforming value.

The maximum permissible setting for key_buffer_size is $4 \mathrm{~GB}-1$ on 32-bit platforms. Larger values are permitted for 64-bit platforms. The effective maximum size might be less, depending on your available physical RAM and per-process RAM limits imposed by your operating system or hardware platform. The value of this variable indicates the amount of memory requested. Internally, the server allocates as much memory as possible up to this amount, but the actual allocation might be less.

You can increase the value to get better index handling for all reads and multiple writes; on a system whose primary function is to run MySQL using the MyISAM storage engine, $25 \%$ of the machine's total memory is an acceptable value for this variable. However, you should be aware that, if you make the value too large (for example, more than 50\% of the machine's total memory), your system might start to page and become extremely slow. This is because MySQL relies on the operating system to perform file system caching for data reads, so you must leave some room for the file system cache. You should also consider the memory requirements of any other storage engines that you may be using in addition to MyISAM.

For even more speed when writing many rows at the same time, use LOCK TABLES. See Section 10.2.5.1, "Optimizing INSERT Statements".

You can check the performance of the key buffer by issuing a SHOW STATUS statement and examining the Key_read_requests, Key_reads, Key_write_requests, and Key_writes status variables. (See Section 15.7.7, "SHOW Statements".) The Key_reads/ Key_read_requests ratio should normally be less than 0.01. The Key_writes/ Key_write_requests ratio is usually near 1 if you are using mostly updates and deletes, but might be much smaller if you tend to do updates that affect many rows at the same time or if you are using the DELAY_KEY_WRITE table option.

The fraction of the key buffer in use can be determined using key_buffer_size in conjunction with the Key_blocks_unused status variable and the buffer block size, which is available from the key_cache_block_size system variable:

1 - ((Key_blocks_unused * key_cache_block_size) / key_buffer_size)
This value is an approximation because some space in the key buffer is allocated internally for administrative structures. Factors that influence the amount of overhead for these structures include block size and pointer size. As block size increases, the percentage of the key buffer lost to overhead tends to decrease. Larger blocks results in a smaller number of read operations (because more keys are obtained per read), but conversely an increase in reads of keys that are not examined (if not all keys in a block are relevant to a query).

It is possible to create multiple MyISAM key caches. The size limit of 4 GB applies to each cache individually, not as a group. See Section 10.10.2, "The MyISAM Key Cache".
- key_cache_age_threshold

\begin{tabular}{|l|l|}
\hline Command-Line Format & --key-cache-age-threshold=\# \\
\hline System Variable & key_cache_age_threshold \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 300 \\
\hline Minimum Value & 100 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551516 \\
\hline Maximum Value (32-bit platforms) & 4294967196 \\
\hline Block Size & 100 \\
\hline
\end{tabular}

This value controls the demotion of buffers from the hot sublist of a key cache to the warm sublist. Lower values cause demotion to happen more quickly. The minimum value is 100 . The default value is 300 . See Section 10.10.2, "The MyISAM Key Cache".
- key_cache_block_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --key-cache-block-size=\# \\
\hline System Variable & key_cache_block_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1024 \\
\hline Minimum Value & 512 \\
\hline Maximum Value & 16384 \\
\hline Unit & bytes \\
\hline Block Size & 512 \\
\hline
\end{tabular}

The size in bytes of blocks in the key cache. The default value is 1024. See Section 10.10.2, "The MyISAM Key Cache".
- key_cache_division_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --key-cache-division-limit=\# \\
\hline System Variable & key_cache_division_limit \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 100 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 100 \\
\hline
\end{tabular}

The division point between the hot and warm sublists of the key cache buffer list. The value is the percentage of the buffer list to use for the warm sublist. Permissible values range from 1 to 100 . The default value is 100 . See Section 10.10.2, "The MyISAM Key Cache".
- large_files_support

\begin{tabular}{|l|l|}
\hline System Variable & large_files_support \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

Whether mysqld was compiled with options for large file support.
- large_pages

\begin{tabular}{|l|l|}
\hline Command-Line Format & --large-pages[=\{OFF|ON\}] \\
\hline System Variable & large_pages \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Platform Specific & Linux \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether large page support is enabled (via the --large-pages option). See Section 10.12.3.3, "Enabling Large Page Support".
- large_page_size

\begin{tabular}{|l|l|}
\hline System Variable & large_page_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 65535 \\
\hline Unit & bytes \\
\hline
\end{tabular}

If large page support is enabled, this shows the size of memory pages. Large memory pages are supported only on Linux; on other platforms, the value of this variable is always 0 . See Section 10.12.3.3, "Enabling Large Page Support".
- last_insert_id

The value to be returned from LAST_INSERT_ID( ). This is stored in the binary log when you use LAST_INSERT_ID( ) in a statement that updates a table. Setting this variable does not update the
- lc_messages

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lc-messages=name \\
\hline System Variable & lc_messages \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & en_US \\
\hline
\end{tabular}

The locale to use for error messages. The default is en_US. The server converts the argument to a language name and combines it with the value of lc_messages_dir to produce the location for the error message file. See Section 12.12, "Setting the Error Message Language".
- lc_messages_dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lc-messages-dir=dir_name \\
\hline System Variable & lc_messages_dir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory where error messages are located. The server uses the value together with the value of lc_messages to produce the location for the error message file. See Section 12.12, "Setting the Error Message Language".
- lc_time_names

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lc-time-names=value \\
\hline System Variable & lc_time_names \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

This variable specifies the locale that controls the language used to display day and month names and abbreviations. This variable affects the output from the DATE_FORMAT( ), DAYNAME( ) and MONTHNAME() functions. Locale names are POSIX-style values such as 'ja_JP' or 'pt_BR'. The default value is 'en_US ' regardless of your system's locale setting. For further information, see Section 12.16, "MySQL Server Locale Support".
- license

\begin{tabular}{|l|l|}
\hline System Variable & license \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & GPL \\
\hline
\end{tabular}

The type of license the server has.
- local_infile

\begin{tabular}{|l|l|}
\hline Command-Line Format & --local-infile[=\{OFF|ON\}] \\
\hline System Variable & local_infile \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This variable controls server-side LOCAL capability for LOAD DATA statements. Depending on the local_infile setting, the server refuses or permits local data loading by clients that have LOCAL enabled on the client side.

To explicitly cause the server to refuse or permit LOAD DATA LOCAL statements (regardless of how client programs and libraries are configured at build time or runtime), start mysqld with local_infile disabled or enabled, respectively. local_infile can also be set at runtime. For more information, see Section 8.1.6, "Security Considerations for LOAD DATA LOCAL".
- lock_wait_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-wait-timeout=\# \\
\hline System Variable & lock_wait_timeout \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 31536000 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

This variable specifies the timeout in seconds for attempts to acquire metadata locks. The permissible values range from 1 to 31536000 ( 1 year). The default is 31536000.

This timeout applies to all statements that use metadata locks. These include DML and DDL operations on tables, views, stored procedures, and stored functions, as well as LOCK TABLES, FLUSH TABLES WITH READ LOCK, and HANDLER statements.

This timeout does not apply to implicit accesses to system tables in the mysql database, such as grant tables modified by GRANT or REVOKE statements or table logging statements. The timeout does apply to system tables accessed directly, such as with SELECT or UPDATE.

The timeout value applies separately for each metadata lock attempt. A given statement can require more than one lock, so it is possible for the statement to block for longer than the
lock_wait_timeout value before reporting a timeout error. When lock timeout occurs, ER_LOCK_WAIT_TIMEOUT is reported.
lock_wait_timeout also defines the amount of time that a LOCK INSTANCE FOR BACKUP statement waits for a lock before giving up.
- locked_in_memory

\begin{tabular}{|l|l|}
\hline System Variable & locked_in_memory \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Whether mysqld was locked in memory with --memlock.
- log_error

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-error[=file_name] \\
\hline System Variable & log_error \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

The default error log destination. If the destination is the console, the value is stderr. Otherwise, the destination is a file and the log_error value is the file name. See Section 7.4.2, "The Error Log".
- log_error_services

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-error-services=value \\
\hline System Variable & log_error_services \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & \begin{tabular}{l}
log_filter_internal; \\
log_sink_internal
\end{tabular} \\
\hline
\end{tabular}

The components to enable for error logging. The variable may contain a list with 0,1 , or many elements. In the latter case, elements may be delimited by semicolons or commas, optionally followed by space. A given setting cannot use both semicolon and comma separators. Component order is significant because the server executes components in the order listed.

Any loadable (not built in) component named in log_error_services is implicitly loaded if it is not already loaded. For more information, see Section 7.4.2.1, "Error Log Configuration".
- log_error_suppression_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-error-suppression-list=value \\
\hline System Variable & log_error_suppression_list \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & empty string \\
\hline
\end{tabular}

The log_error_suppression_list system variable applies to events intended for the error log and specifies which events to suppress when they occur with a priority of WARNING or INFORMATION. For example, if a particular type of warning is considered undesirable "noise" in the error log because it occurs frequently but is not of interest, it can be suppressed. This variable affects filtering performed by the log_filter_internal error log filter component, which is enabled by default (see Section 7.5.3, "Error Log Components"). If log_filter_internal is disabled, log_error_suppression_list has no effect.

The log_error_suppression_list value may be the empty string for no suppression, or a list of one or more comma-separated values indicating the error codes to suppress. Error codes may be specified in symbolic or numeric form. A numeric code may be specified with or without the MYprefix. Leading zeros in the numeric part are not significant. Examples of permitted code formats:

ER_SERVER_SHUTDOWN_COMPLETE
MY-000031
000031
MY-31
31
Symbolic values are preferable to numeric values for readability and portability. For information about the permitted error symbols and numbers, see MySQL 8.4 Error Message Reference.

The effect of log_error_suppression_list combines with that of log_error_verbosity. For additional information, see Section 7.4.2.5, "Priority-Based Error Log Filtering (log_filter_internal)".
- log_error_verbosity

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-error-verbosity=\# \\
\hline System Variable & log_error_verbosity \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 3 \\
\hline
\end{tabular}

The log_error_verbosity system variable specifies the verbosity for handling events intended for the error log. This variable affects filtering performed by the log_filter_internal error
log filter component, which is enabled by default (see Section 7.5.3, "Error Log Components"). If log_filter_internal is disabled, log_error_verbosity has no effect.

Events intended for the error log have a priority of ERROR, WARNING, or INFORMATION. log_error_verbosity controls verbosity based on which priorities to permit for messages written to the log, as shown in the following table.

\begin{tabular}{|l|l|}
\hline log_error_verbosity Value & Permitted Message Priorities \\
\hline $\mathbf{1}$ & ERROR \\
\hline $\mathbf{2}$ & ERROR, WARNING \\
\hline $\mathbf{3}$ & ERROR, WARNING, INFORMATION \\
\hline
\end{tabular}

There is also a priority of SYSTEM. System messages about non-error situations are printed to the error log regardless of the log_error_verbosity value. These messages include startup and shutdown messages, and some significant changes to settings.

The effect of log_error_verbosity combines with that of log_error_suppression_list. For additional information, see Section 7.4.2.5, "Priority-Based Error Log Filtering (log_filter_internal)".
- log_output

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-output=name \\
\hline System Variable & log_output \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Set \\
\hline Default Value & FILE \\
\hline Valid Values & \begin{tabular}{l}
TABLE \\
FILE \\
NONE
\end{tabular} \\
\hline
\end{tabular}

The destination or destinations for general query log and slow query log output. The value is a list one or more comma-separated words chosen from TABLE, FILE, and NONE. TABLE selects logging to the general_log and slow_log tables in the mysql system schema. FILE selects logging to log files. NONE disables logging. If NONE is present in the value, it takes precedence over any other words that are present. TABLE and FILE can both be given to select both log output destinations.

This variable selects log output destinations, but does not enable log output. To do that, enable the general_log and slow_query_log system variables. For FILE logging, the general_log_file and slow_query_log_file system variables determine the log file locations. For more information, see Section 7.4.1, "Selecting General Query Log and Slow Query Log Output Destinations".
- log_queries_not_using_indexes

\begin{tabular}{|l|l|l|l|}
\hline & Command-Line Format & --log-queries-not-usingindexes[=\{OFF|ON\}] & \\
\hline & System Variable & log_queries_not_using_indexes & \\
\hline & Scope & Global & \\
\hline & Dynamic & Yes & 785 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

If you enable this variable with the slow query log enabled, queries that are expected to retrieve all rows are logged. See Section 7.4.5, "The Slow Query Log". This option does not necessarily mean that no index is used. For example, a query that uses a full index scan uses an index but would be logged because the index would not limit the number of rows.
- log_raw

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-raw[=\{OFF|ON\}] \\
\hline System Variable & log_raw \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

The log_raw system variable is initially set to the value of the - - log - raw option. See the description of that option for more information. The system variable may also be set at runtime to change password masking behavior.
- log_slow_admin_statements

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-slow-admin-statements[=\{OFF| ON\}] \\
\hline System Variable & log_slow_admin_statements \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Include slow administrative statements in the statements written to the slow query log. Administrative statements include ALTER TABLE, ANALYZE TABLE, CHECK TABLE, CREATE INDEX, DROP INDEX, OPTIMIZE TABLE, and REPAIR TABLE.
- log_slow_extra

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-slow-extra[=\{OFF|ON\}] \\
\hline System Variable & log_slow_extra \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

If the slow query log is enabled and the output destination includes FILE, the server writes additional fields to log file lines that provide information about slow statements. See Section 7.4.5, "The Slow Query Log". TABLE output is unaffected.
- log_timestamps

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-timestamps=\# \\
\hline System Variable & log_timestamps \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & UTC \\
\hline Valid Values & \begin{tabular}{l}
UTC \\
SYSTEM
\end{tabular} \\
\hline
\end{tabular}

This variable controls the time zone of timestamps in messages written to the error log, and in general query log and slow query log messages written to files. It does not affect the time zone of general query log and slow query log messages written to tables (mysql.general_log, mysql.slow_log). Rows retrieved from those tables can be converted from the local system time zone to any desired time zone with CONVERT_TZ( ) or by setting the session time_zone system variable.

Permitted log_timestamps values are UTC (the default) and SYSTEM (the local system time zone).
Timestamps are written using ISO 8601 / RFC 3339 format: YYYY-MM-DDThh : mm : ss . uuuuuu plus a tail value of Z signifying Zulu time (UTC) or $\pm \mathrm{hh}: \mathrm{mm}$ (an offset from UTC).
- log_throttle_queries_not_using_indexes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-throttle-queries-not-usingindexes=\# \\
\hline System Variable & log_throttle_queries_not_using_indexes \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

If log_queries_not_using_indexes is enabled, the log_throttle_queries_not_using_indexes variable limits the number of such queries per minute that can be written to the slow query log. A value of 0 (the default) means "no limit". For more information, see Section 7.4.5, "The Slow Query Log".
- long_query_time

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --long-query-time=\# & \\
\hline System Variable & long_query_time & \\
\hline Scope & Global, Session & \\
\hline Dynamic & Yes & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Numeric & 787 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

If a query takes longer than this many seconds, the server increments the Slow_queries status variable. If the slow query log is enabled, the query is logged to the slow query log file. This value is measured in real time, not CPU time, so a query that is under the threshold on a lightly loaded system might be above the threshold on a heavily loaded one. The minimum and default values of long_query_time are 0 and 10 , respectively. The maximum is 31536000 , which is 365 days in seconds. The value can be specified to a resolution of microseconds. See Section 7.4.5, "The Slow Query Log".

Smaller values of this variable result in more statements being considered long-running, with the result that more space is required for the slow query log. For very small values (less than one second), the log may grow quite large in a small time. Increasing the number of statements considered long-running may also result in false positives for the "excessive Number of Long Running Processes" alert in MySQL Enterprise Monitor, especially if Group Replication is enabled. For these reasons, very small values should be used in test environments only, or, in production environments, only for a short period.
mysqldump performs a full table scan, which means its queries can often exceed a long_query_time setting that is useful for regular queries. If you want to exclude most or all of the queries generated by mysqldump from the slow query log, you can use--mysqld-long-querytime to change the session value of the system variable to a higher value.
- low_priority_updates

\begin{tabular}{|l|l|}
\hline Command-Line Format & --low-priority-updates[=\{OFF|ON\}] \\
\hline System Variable & low_priority_updates \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

If set to 1 , all INSERT, UPDATE, DELETE, and LOCK TABLE WRITE statements wait until there is no pending SELECT or LOCK TABLE READ on the affected table. The same effect can be obtained using \{INSERT | REPLACE | DELETE | UPDATE\} LOW_PRIORITY . . . to lower the priority of only one query. This variable affects only storage engines that use only table-level locking (such as MyISAM, MEMORY, and MERGE). See Section 10.11.2, "Table Locking Issues".

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- lower_case_file_system

\begin{tabular}{|l|l|}
\hline System Variable & lower_case_file_system \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Boolean \\
\hline
\end{tabular}

This variable describes the case sensitivity of file names on the file system where the data directory is located. OFF means file names are case-sensitive, ON means they are not case-sensitive. This variable is read only because it reflects a file system attribute and setting it would have no effect on the file system.
- lower_case_table_names

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lower-case-table-names[=\#] \\
\hline System Variable & lower_case_table_names \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value (macOS) & 2 \\
\hline Default Value (Unix) & 0 \\
\hline Default Value (Windows) & 1 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2 \\
\hline
\end{tabular}

If set to 0 , table names are stored as specified and comparisons are case-sensitive. If set to 1 , table names are stored in lowercase on disk and comparisons are not case-sensitive. If set to 2 , table names are stored as given but compared in lowercase. This option also applies to database names and table aliases. For additional details, see Section 11.2.3, "Identifier Case Sensitivity".

The default value of this variable is platform-dependent (see lower_case_file_system). On Linux and other Unix-like systems, the default is 0 . On Windows the default value is 1 . On macOS, the default value is 2 . On Linux (and other Unix-like systems), setting the value to 2 is not supported; the server forces the value to 0 instead.

You should not set lower_case_table_names to 0 if you are running MySQL on a system where the data directory resides on a case-insensitive file system (such as on Windows or macOS). It is an unsupported combination that could result in a hang condition when running an INSERT INTO ... SELECT ... FROM tbl_name operation with the wrong tbl_name lettercase. With MyISAM, accessing table names using different lettercases could cause index corruption.

An error message is printed and the server exits if you attempt to start the server with -lower_case_table_names=0 on a case-insensitive file system.

The setting of this variable affects the behavior of replication filtering options with regard to case sensitivity. For more information, see Section 19.2.5, "How Servers Evaluate Replication Filtering Rules".

It is prohibited to start the server with a lower_case_table_names setting that is different from the setting used when the server was initialized. The restriction is necessary because collations used by various data dictionary table fields are determined by the setting defined when the server is initialized, and restarting the server with a different setting would introduce inconsistencies with respect to how identifiers are ordered and compared.

It is therefore necessary to configure lower_case_table_names to the desired setting before initializing the server. In most cases, this requires configuring lower_case_table_names in a MySQL option file before starting the MySQL server for the first time. For APT installations on Debian and Ubuntu, however, the server is initialized for you, and there is no opportunity to configure the setting in an option file beforehand. You must therefore use the debconf-set-selection utility
prior to installing MySQL using APT to enable lower_case_table_names. To do so, run this command before installing MySQL using APT:
\$> sudo debconf-set-selections <<< "mysql-server mysql-server/lowercase-table-names select Enabled"
- mandatory_roles

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mandatory-roles=value \\
\hline System Variable & mandatory_roles \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & empty string \\
\hline
\end{tabular}

Roles the server should treat as mandatory. In effect, these roles are automatically granted to every user, although setting mandatory_roles does not actually change any user accounts, and the granted roles are not visible in the mysql.role_edges system table.

The variable value is a comma-separated list of role names. Example:
SET PERSIST mandatory_roles = '‘role1‘@ˋ\%ˋ,‘role2ˋ,role3,role4@localhost';
Setting the runtime value of mandatory_roles requires the ROLE_ADMIN privilege, in addition to the SYSTEM_VARIABLES_ADMIN privilege (or the deprecated SUPER privilege) normally required to set a global system variable runtime value.

Role names consist of a user part and host part in user_name@host_name format. The host part, if omitted, defaults to \%. For additional information, see Section 8.2.5, "Specifying Role Names".

The mandatory_roles value is a string, so user names and host names, if quoted, must be written in a fashion permitted for quoting within quoted strings.

Roles named in the value of mandatory_roles cannot be revoked with REVOKE or dropped with DROP ROLE or DROP USER.

To prevent sessions from being made system sessions by default, a role that has the SYSTEM_USER privilege cannot be listed in the value of the mandatory_roles system variable:
- If mandatory_roles is assigned a role at startup that has the SYSTEM_USER privilege, the server writes a message to the error log and exits.
- If mandatory_roles is assigned a role at runtime that has the SYSTEM_USER privilege, an error occurs and the mandatory_roles value remains unchanged.

Mandatory roles, like explicitly granted roles, do not take effect until activated (see Activating Roles). At login time, role activation occurs for all granted roles if the activate_all_roles_on_login system variable is enabled; otherwise, or for roles that are set as default roles otherwise. At runtime, SET ROLE activates roles.

Roles that do not exist when assigned to mandatory_roles but are created later may require special treatment to be considered mandatory. For details, see Defining Mandatory Roles.

SHOW GRANTS displays mandatory roles according to the rules described in Section 15.7.7.22, "SHOW GRANTS Statement".
- max_allowed_packet

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-allowed-packet=\# \\
\hline System Variable & max_allowed_packet \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 67108864 \\
\hline Minimum Value & 1024 \\
\hline Maximum Value & 1073741824 \\
\hline Unit & bytes \\
\hline Block Size & 1024 \\
\hline
\end{tabular}

The maximum size of one packet or any generated/intermediate string, or any parameter sent by the mysql_stmt_send_long_data( ) C API function. The default is 64 MB .

The packet message buffer is initialized to net_buffer_length bytes, but can grow up to max_allowed_packet bytes when needed. This value by default is small, to catch large (possibly incorrect) packets.

You must increase this value if you are using large BLOB columns or long strings. It should be as big as the largest BLOB you want to use. The protocol limit for max_allowed_packet is 1 GB . The value should be a multiple of 1024; nonmultiples are rounded down to the nearest multiple.

When you change the message buffer size by changing the value of the max_allowed_packet variable, you should also change the buffer size on the client side if your client program permits it. The default max_allowed_packet value built in to the client library is 1 GB , but individual client programs might override this. For example, mysql and mysqldump have defaults of 16 MB and 24 MB , respectively. They also enable you to change the client-side value by setting max_allowed_packet on the command line or in an option file.

The session value of this variable is read only. The client can receive up to as many bytes as the session value. However, the server does not send to the client more bytes than the current global max_allowed_packet value. (The global value could be less than the session value if the global value is changed after the client connects.)
- max_connect_errors

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-connect-errors=\# \\
\hline System Variable & max_connect_errors \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 100 \\
\hline Minimum Value & 1 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|} 
Maximum Value (32-bit platforms) & 4294967295
\end{tabular}

After max_connect_errors successive connection requests from a host are interrupted without a successful connection, the server blocks that host from further connections. If a connection from a host is established successfully within fewer than max_connect_errors attempts after a previous connection was interrupted, the error count for the host is cleared to zero. To unblock blocked hosts, flush the host cache; see Flushing the Host Cache.
- max_connections

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-connections=\# \\
\hline System Variable & max_connections \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 151 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 100000 \\
\hline
\end{tabular}

The maximum permitted number of simultaneous client connections. The maximum effective value is the lesser of the effective value of open_files_limit - 810, and the value actually set for max_connections.

For more information, see Section 7.1.12.1, "Connection Interfaces".
- max_delayed_threads

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-delayed-threads=\# \\
\hline Deprecated & Yes \\
\hline System Variable & max_delayed_threads \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 20 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 16384 \\
\hline
\end{tabular}

This system variable is deprecated (because DELAYED inserts are not supported) and subject to removal in a future MySQL release.

Setting the session value of this system variable is a restricted operation. The session user must have privileges sufficient to set restricted session variables. See Section 7.1.9.1, "System Variable Privileges".
- max_digest_length

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Command-Line Format & --max-digest-length=\# \\
\cline { 2 - 3 } & System Variable & max_digest_length \\
\hline 792 & Scope & Global \\
\cline { 2 - 3 } &
\end{tabular}

\begin{tabular}{|l|l|}
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1024 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1048576 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The maximum number of bytes of memory reserved per session for computation of normalized statement digests. Once that amount of space is used during digest computation, truncation occurs: no further tokens from a parsed statement are collected or figure into its digest value. Statements that differ only after that many bytes of parsed tokens produce the same normalized statement digest and are considered identical if compared or if aggregated for digest statistics.

The length used for calculating a normalized statement digest is the sum of the length of the normalized statement digest and the length of the statement digest. Since the length of the statement digest is always 64, this is equivalent to LENGTH (STATEMENT_DIGEST_TEXT(statement) ) + 64. This means that, when the value of max_digest_length is 1024 (the default), the maximum length for a normalized SQL statement before truncation occurs is in effect 960 bytes.

