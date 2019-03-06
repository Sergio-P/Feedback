create extension postgis;

create table if not exists users (
    id serial,
    username text not null,
    fullname text not null,
    pass text not null,
    mail text not null,
    sex char(1),
    primary key (id)
);

create table if not exists sessions (
    id  serial,
    name text not null,
    descr text,
    time timestamp with time zone,
    creator integer,
    code char(6),
    primary key (id),
    foreign key(creator) references users(id)
);

create table if not exists sesusers (
    sesid integer,
    uid integer,
    foreign key(sesid) references sessions(id),
    foreign key(uid) references users(id)
);

create table if not exists feeds (
    id serial,
    descr varchar(160) not null,
    time timestamp with time zone,
    author integer,
    geom geometry,
    parentfeed integer,
    sesid integer,
    extra text,
    primary key(id),
    foreign key(author) references users(id),
    foreign key(parentfeed) references feeds(id),
    foreign key(sesid) references sessions(id)
);

create table if not exists pictures (
    path text not null,
    fid integer,
    foreign key(fid) references feeds(id)
);

create table if not exists history (
    id serial,
    query text not null,
    uid integer,
    sesid integer,
    primary key(id),
    foreign key(uid) references users(id),
    foreign key(sesid) references sessions(id)
);

--- ID 3 reserved for Twitter Bot
insert into users(id,username,fullname,pass,mail)
select 3,'twitterbot','Twitter Bot','#bot#','bot@tw'
where not exists(
    select id from users where id = 3
);


create table if not exists chat (
    id serial,
    sesid integer not null,
    uid integer not null,
    content text,
    ctime timestamp with time zone,
    primary key(id),
    foreign key(sesid) references sessions(id),
    foreign key(uid) references users(id)
);


create table if not exists pass_reset(
    id serial,
    mail varchar(32) not null,
    token varchar(64) not null,
    ctime timestamp,
    primary key(id)
);