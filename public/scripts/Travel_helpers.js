//Constants
///////////
const Time_In_Start = 20;

const filterFields = [
"event_type",
"location_x",
"location_y",
"location_z",
"round_seconds",
"app_version",
"round_number",
"player_number",
"player_team"
];

//Not permentant
const colorwheel1 = ['#009999','#33ccff','#0000ff','#ff6600','#ff99ff','#cc00cc'];

//Not permentant
const colorwheel2 = ['#ff9900','#ff3300','#cc0000','#ffcc66','#ff0066','#cc3300'];
	
const worldCenterX = -225.0,
	worldCenterY = -2150.0,
	worldSizeX = 24625.0,
	worldSizeY = 26055.0;

//Protypes
/////////
function Point( x, y, z ) {
	this.x = x;
	this.y = y;
	this.z = z;
}

function Match_Info( Id, m_date ) {
	this.m_Id = Id;
	this.m_date = m_date;
}	
 
function Alien_Death( time, player, a_type ) {
		this.secs = time;
		this.player = player;
		this.a_type = a_type;

}

function Cmd_pnt( loc, act_time, cap_time ) {
	this.cmd_location = loc;
	this.activation = act_time;
	this.capture = cap_time;
}

function Weapon_Info( name, avg_dam, tot_dam, records ) {
	this.weapon_name = name;
	this.average_damage = avg_dam;
	this.total_damage = tot_dam;
	this.num_records = records;
}

//Frequent Functions
////////////////////
//To be used in the next function
function getAllIndexes( arr, val ) {
    var indexes = [ ], i;
    for( i = 0; i < arr.length; i++ ) {
        if ( arr[i] === val )
            indexes.push( i );
	}
    return indexes;
};

//This will be similar to mongos find
function data_Find( data, search_arg ) {
	var all_data = data;
	var data_var = search_arg[ 0 ];
	var compare_to = search_arg[ 1 ];

	// here we will filter by each possible field based on which data var we get
	//we will only include things we will often search by...
	switch ( data_var ) {
		case 'app_version': var temp = all_data.map( a=>a.app_version ); break;
		case 'event_type': var temp = all_data.map( a=>a.event_type ); break;	
		case 'player_team': var temp = all_data.map( a=>a.player_team ); break;	
		case 'player_name': var temp = all_data.map( a=>a.player_name ); break;
		case 'match_id': var temp = all_data.map( a=>a.match_id ); break;		
		case 'round_id': var temp = all_data.map( a=>a.round_id ); break;	
		default: console.log( "Error, What are you searching for?" );
	}
	if( temp === undefined ) {
		return [ ];
	}
	trim_ndxs = getAllIndexes( temp, compare_to );
	var found_data = trim_ndxs.map( i => all_data[ i ] );
	return found_data;
}

//This will be similar to get distinct
function data_Distinct( data, search_arg ) {
	var all_data = data;
	var data_var = search_arg;
	
	function onlyUnique( value, index, self ) {
		if( typeof value != 'String' || !value.includes( 'UNINITIALIZED' ) ) {
			return self.indexOf( value ) === index;
		}
	}
	switch ( data_var ) {
		case 'app_version': var temp = all_data.map( a => a.app_version ); break;	
		case 'player_name': var temp = all_data.map( a => a.player_name ); break;	
		case 'match_id': var temp = all_data.map( a => a.match_id ); break;	
		case 'round_id': var temp = all_data.map( a => a.round_id ); break;
		case 'round_number': var temp = all_data.map( a => a.round_number ); break;
		default: console.log( "Error, What are you searching for?" );
	}
	if( temp === undefined ) {
		return [ ];
	}
	
	return temp.filter( onlyUnique );;
}

//Will get a list of the [round seconds, point location, Special Info]
function getPoints( data, special ) {
	var all_data = data;
	returnedPoints = [ ];
	cnt = 1;
	all_data.forEach( function( evnt ) {
		var onMapPoint = new Point( evnt.location_x, evnt.location_y, evnt.location_z );
		//certain point lists expect additional info
		switch ( special ) {
			case 'TRAVEL': returnedPoints.push( [ evnt.round_seconds, onMapPoint, evnt.is_sprinting ] ); break;
			case 'DEATH': returnedPoints.push( [ evnt.round_seconds, onMapPoint, evnt.player_name ] ); break;
			case 'CMD': returnedPoints.push( [ evnt.round_seconds, onMapPoint, cnt ] ); cnt += 1; break;
			default: returnedPoints.push( [ evnt.round_seconds, onMapPoint, evnt.event_type ] );
		}
	});
	if( special == 'CMD' ) {
		return returnedPoints;
	}
	return returnedPoints.sort( function( a , b ){ return a[ 0 ]-b[ 0 ] } );
}

//Functions for travel.js
/////////////////////////
function getVersions( data ) {
	return data_Distinct( data,'app_version' );
}

function prep_data( data, version ) {	
	return data_Find( data, [ 'app_version', version ] );
}

function get_distinct_matches( data ) {
	//trim data for only match_begin events:
	trim_data = data_Find( data, [ 'event_type','match_begin' ] );
	
	
	matches = trim_data.map( a => a.match_id );
	match_timestamps = trim_data.map( a => [ a.match_id, a.event_timestamp ] );
	
	returnedMatches = [ ]
	match_timestamps.forEach( function( matchTimestamp ) {
		matchDate = new Date( matchTimestamp[ 1 ]*1000 );
		var match = new Match_Info( matchTimestamp[ 0 ], matchDate );
		returnedMatches.push( match );
	});

	return returnedMatches;
}

function get_distinct_rounds( data ) {
	unsorted_rnds = data_Distinct( data, 'round_number' );
	return unsorted_rnds.sort( function( a, b ){ return a - b } );
}

function get_Rnd_Data( data, rnd, match) {
	//trim data for only that match:
	trim_data = data_Find( data, [ 'match_id' ,match ] );
	
	//Find round ID of that round
	for ( let evnt of trim_data ) {
		if ( evnt.event_type == "round_begin" ) {
			if( evnt.round_number == rnd ) {
				rnd_id = evnt.round_id;
				break;
			}
		}
	}
	if( rnd_id === undefined ) {
		console.log( "Error, roundID not found for that match" );
		return [ ];
	}
	trim_data = data_Find( trim_data, [ 'round_id', rnd_id ] );
	return trim_data;
}

function get_distinct_players( data ) {
	humans = data_Find( data, [ 'player_team' ,'Human' ] );
	aliens = data_Find( data, [ 'player_team', 'Alien' ] );
	human_players = data_Distinct( humans, 'player_name' );
	alien_players = data_Distinct( aliens, 'player_name' );
	return [ human_players, alien_players ];
}
function get_player_travel( data, name, team, rnd, match ) {
	//trim data for only that player:
	trim_data = data_Find( data, [ 'player_name', name] );
	
	if( team == "Human" ) {
		//find only events when player is human
		trim_data = data_Find( trim_data,[ 'player_team', 'Human' ] );
	}
	else {
		//find only events when player is alien
		trim_data = data_Find( trim_data,[ 'player_team', 'Alien' ] );		
	}
	
	//get locations of deaths
	death_data = data_Find( trim_data, [ 'event_type', 'player_death' ] );
	var death_points = getPoints( death_data, 'DEATH' );
	
	//trim data for only heartbeat events:
	HB_data = data_Find( trim_data, [ 'event_type', 'player_heartbeat' ] );
	var travel_points = getPoints( HB_data, 'TRAVEL' );
	
return [ travel_points, death_points ];

}
function get_cmd_points( data ) {
	//trim data for only cmd point spawns:
	trim_data = data_Find( data, [ 'event_type', 'control_point_spawned' ] );
	var cmd_points_all = getPoints( trim_data, 'CMD' );	
	
	//trim data for only cmd point captures
	trim_data = data_Find( data, [ 'event_type', 'control_point_captured' ] );
	var cmd_points_cap = getPoints( trim_data, 'CMD' );
	
	//trim data for only cmd point activation
	trim_data = data_Find( data, [ 'event_type', 'control_point_activated' ] );
	var cmd_points_act = getPoints( trim_data, 'CMD' );

	//Build cmd point objects for ploting and summary
	cmd_points = [ ];
	cmd_points_all.forEach( function( a ) {
		p1 = a[ 1 ];
		act = "N/A";
		cap = "N/A";
		cmd_points_cap.forEach( function( b ) {
			p2 = b[ 1 ];
			if( p1.x == p2.x && p1.y == p2.y ) {
				cap = b[ 0 ];
			}
		});
		cmd_points_act.forEach( function( c ) {
			p3 = c[ 1 ];
			if( p1.x == p3.x && p1.y == p3.y ) {
				act = c[ 0 ];
			}
		});
		cmd_points.push( new Cmd_pnt( p1, act, cap ) );
	});
	return cmd_points;
}

function get_rnd_Sums( data ) {

	//get the round end event type for most of the summaries 
	//( [0] because we want only object of array of objects)	
	rnd_end_sums = data_Find( data, [ 'event_type', 'round_end' ] )[ 0 ];

	//Find all alien deaths 
	//filter only player deaths
	death_data = data_Find( data, [ 'event_type', 'player_death' ] );
		
	//filter only Alien deaths
	trim_data = data_Find( death_data, [ 'player_team', 'Alien' ] );
	
	a_data = death_data.map( a => [ a.round_seconds, a.player_name, a.actor_class ] );
	Alien_data = [ ];
	a_data.forEach( function( death ) {
		Alien_data.push( new Alien_Death( death[ 0 ], death[ 1 ], death[ 2 ] ) );
	});
	Alien_data = Alien_data.sort( function( a, b ){ return a.secs - b.secs } );

	//filter all weapon info
	//filter for Human data
	trim_data = data_Find( data, [ 'player_team', 'Human' ] );
	
	//filter for player_give_damage
	trim_data = data_Find( trim_data, [ 'event_type', 'player_give_damage' ] );
	
	//TODO: Solve this better
	//we only want data after starskeys (15 seconds in)
	new_Data = [ ];
	trim_data.forEach( function( r ) {
		if( r.round_seconds > Time_In_Start ) {
			new_Data.push( r );
		}
	});

	//we only really want what weapons they are using and the damage they dealt
	weapon_data = new_Data.map( a => [ a.damage_causer_class, a.damage_amount ] );
	
	//for the summary we want weapon_name,average damage dealt,total damage dealt, number of records
	//Weapon_Info(name, avg_dam, tot_dam, records)
	weapon_dic = { };
	weapon_data.forEach( function( w ) {
		//if weapon not in dictionary yet
		if ( !( w [ 0 ] in weapon_dic ) ) {
			weapon_dic[ w[ 0 ] ] = [ w[ 1 ], 1 ];
		}
		//weapon is in dictionary
		else {
			val = weapon_dic[ w[ 0 ] ][ 0 ];
			cnt = weapon_dic[ w[ 0 ] ][ 1 ];
			weapon_dic[ w[ 0 ] ] = [ val + w[ 1 ], cnt + 1 ];
		}
	});
	weapons=[];
	for ( var key in weapon_dic ) {
		recs = weapon_dic[ key ][ 1 ];
		total = weapon_dic[ key ][ 0 ];
		avg = total / recs;
		weapons.push( new Weapon_Info( key, avg, total, recs ) );
	}
	
	return [ rnd_end_sums, Alien_data, weapons ];
}

function mapPoints( travel_points, imgWidth, imgHeight ) {
	pathing = [ ];
	travel_points.forEach( function ( p ) {
			p[ 1 ].x = ( ( p[ 1 ].x - worldCenterX) / worldSizeX ) * imgWidth + ( imgWidth / 2 );
			p[ 1 ].y = ( ( p[ 1 ].y - worldCenterY) / worldSizeY ) * imgHeight + ( imgHeight / 2 );
			pathing.push( [ p[ 0 ],new Point( p[ 1 ].x, p[ 1 ].y, p[ 1 ].z ), p[ 2 ] ] );
	});
	return pathing;
}
