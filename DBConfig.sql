create database feedback;
create extension postgis;

create table users (
    id  serial,
    username text not null,
    fullname text not null,
    pass text not null,
    mail text not null,
    sex varchar(1),
    primary key (id)
);

create table sessions (
    id  serial,
    name text not null,
    descr text,
    time timestamp with time zone,
    creator integer,
    code varchar(6),
    primary key (id),
    foreign key(creator) references users(id)
);

create table sesusers (
    sesid integer,
    uid integer,
    foreign key(sesid) references sessions(id),
    foreign key(uid) references users(id)
);

create table feeds (
    id serial,
    descr varchar(160) not null,
    time timestamp with time zone,
    author integer,
    geom geometry,
    parentfeed integer,
    sesid integer,
    primary key(id),
    foreign key(author) references users(id),
    foreign key(parentfeed) references feeds(id),
    foreign key(sesid) references sessions(id)
);

create table pictures (
    path text not null,
    fid integer,
    foreign key(fid) references feeds(id)
);

create table history (
    id serial,
    query text not null,
    uid integer,
    sesid integer,
    primary key(id),
    foreign key(uid) references users(id),
    foreign key(sesid) references sessions(id)
);