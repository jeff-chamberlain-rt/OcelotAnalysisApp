	
var app = angular.module( 'OcelotAnalysisApp', [] );

app.controller( "OcelotAnalysisController1", function( $scope, $http ) {
	//Controller Variables
	//////////////////////
	var all_Data = [ ]; 	//all_Data Grabbed from .find({}) in mongo
	var trim_data = [ ];	//trimmed data for a particular version
	var game_data = [ ];	//data for a particular version, match, and round
	$scope.showMatchesAndRounds = false;	//only show matches and rounds after a version has been selected
	$scope.showPlayers = false;	//only show players after matches and rounds of a version have been selected
	$scope.showTravelData = false;	//only show player travel data after selecting players
	
	//On page load....
	//////////////////
	//Get data to use for the program then display choices of app versions to look at (in sorted order)
	$http.get( '/data' ).then( function( response ) {
		all_Data = response.data;
		console.log( response.data );
		vers = getVersions( response.data );
		console.log( vers );
		var versions = vers.sort( function ( a,b ) {
			//we sort by the string located after the 'd' charecter
			asubdex = a.indexOf( 'd' ) + 1;
			bsubdex = b.indexOf( 'd' ) + 1;
			return -a.substring( asubdex ).localeCompare( b.substring ( bsubdex ) );
		});
		$scope.vers = versions;
    });
	
	//Controler Functions
	/////////////////////
	//Prep the data to be trimmed for a specific version selected by user
	$scope.confirmVersion = function ( ) {
		if( $scope.selectedVer ){
			$scope.showMatchesAndRounds = !$scope.showMatchesAndRounds;
			trim_data = prep_data( all_Data, $scope.selectedVer );
			console.log( trim_data );
			$scope.rounds = get_distinct_rounds( trim_data );
			$scope.matches = get_distinct_matches( trim_data );
		}
	}
	
	//Continue trimming the data for a specific round and match.
	$scope.confirmRoundAndMatch = function( ){
		if( $scope.showTravelData ){
			$scope.showTravelData = !$scope.showTravelData;
		}	
		if( $scope.selectedRound && $scope.selectedMatch.m_Id ){
				$scope.showPlayers = !$scope.showPlayers;
				$scope.selectedAliens = [ ];
				$scope.selectedHumans = [ ];
				game_data = get_Rnd_Data( trim_data, $scope.selectedRound, $scope.selectedMatch.m_Id );
				var res = get_distinct_players( game_data );
				$scope.humans = res[ 0 ];
				$scope.aliens = res[ 1 ];
		}
	}
	
	//Select only certain players and look at their travel patterns
	$scope.getTravelData = function ( ) {
		if( ( $scope.selectedHumans || $scope.selectedAliens ) && $scope.selectedRound && $scope.selectedMatch.m_Id ) {
			$scope.showTravelData = !$scope.showTravelData;	
			//Special functions to be used for travel data
			//////////////////////////////////////////////	
			//draw the canvas 
			function make_Map ( ) {
				var canvas = document.getElementById( "mapCanvas" );
				var ctx = canvas.getContext( "2d" );
				var img = document.getElementById( "Crank" );
				ctx.drawImage( img,10,10 );
				ctx.save ( );
				return [ ctx, img ];
			}
			//draw the travel paths for an individual....
			function drawTravels( player_paths, ctx, img, count, player, team, death_secs ) {
				//Function variables
				////////////////////
				var skip=0; 
				var pathing = mapPoints( player_paths[0], img.width, img.height );
				var i;
				var death = false;
				var spawnSec = Time_In_Start;
				var evacSec = 1000;
				
				
				if(pathing === undefined || pathing.length == 0) {
					console.log( "player has no paths..." );
					return;
				}
				
				//choose color:
				if( team == "Human" ) {
					ctx.strokeStyle= colorwheel1[ count ];
					ctx.fillStyle= colorwheel1[ count ];
				}
				else {
					ctx.strokeStyle= colorwheel2[ count ];
					ctx.fillStyle= colorwheel2[ count ];
				}
				
				//plot spawn point
				var spwnPnt = mapPoints( player_paths[ 1 ], img.width, img.height )[ 0 ];
				if( spwnPnt != undefined && spwnPnt[ 1 ] != undefined){
					ctx.font = "50px Arial";
					ctx.fillText( "S", spwnPnt[ 1 ].x, spwnPnt[ 1 ].y );
					spawnSec = spwnPnt[0];
				}
				
				//plot evac and get time of evac 
				var evacPnt = mapPoints( player_paths[ 2 ], img.width, img.height )[ 0 ];
				if( evacPnt != undefined && evacPnt[ 1 ] != undefined){
					ctx.font = "50px Arial";
					ctx.fillText( "E", evacPnt[ 1 ].x, evacPnt[ 1 ].y );
					evacSec = evacPnt[0];
				}
				
				
				//Start and end realtive to the spawn and evac
				for ( i = 1; i < pathing.length; i++ ) {
					var t = pathing[ i-1 ][ 0 ];
					var p = pathing[ i ][ 1 ];
					var secs = pathing[ i ][ 0 ];
					
					
					if( pathing[ i - 1 ][ 0 ] < spawnSec ){
						continue;
					}
					if( secs > evacSec){
						break;
					}
					
					//if sprinting needs dashed if not start at default
					if( pathing[ i ][ 2 ] == "true" ) {
						//console.log("player sprinted:",t);
						ctx.setLineDash( [ 5, 3 ] );
					}
					else {
						ctx.setLineDash( [ ] );
					}
					
					//Start a new line between the previous point and the current point
					ctx.beginPath( );	
					ctx.moveTo( pathing[ i-1 ][ 1 ].x,pathing[ i-1 ][ 1 ].y );
					
					//plot every heartbeat with a small circle
					ctx.arc( p.x,p.y,2,0,2*Math.PI );
					ctx.fill( );
					
					//plot round seconds on every 3 heartbeat
					if( skip >= 3 ) {
						ctx.font = "15px Arial Black";
						msg = "" + secs;
						ctx.fillText( msg,p.x-7.5,p.y+7.5 );
						skip = 0;
					}
					else {
						skip += 1;
					}
					
					//if alien we do not want to connect points where the alien has died
					if( team == "Alien" ) {
						death_secs.forEach( function( ds ) {
							if( t - 3.5 <= ds && t+3.5 >= ds ) {
								console.log( "Player died on HB:",i );
								death = true;
							}
						});
						if( death ) {
							death = false;
							continue;
							
						}
					}

					//connect the line to the current point
					ctx.lineTo( p.x,p.y );
					ctx.stroke( );
					ctx.closePath( );	
				}
				ctx.restore( );
			}; 
			
			//Plot special points, defined by type (Grouped for future points)
			function plotSpecials( spec_list, ctx, img, type ) {
				if( type == "CMD" ) {
						spec_points = spec_list.map( a => [ "X", a.cmd_location, "X" ] );
				}
				spec_points = mapPoints( spec_points, img.width, img.height );
				ctx.font = "20px Impact";
				ctx.fillStyle = "#33cc33";
				count = 1;
				spec_points.forEach( function ( specs ) {
					if( type == "CMD" ) {
						p = specs[ 1 ];
						ctx.fillText( "CP" + count, p.x - 7.5, p.y + 7.5 );
						count += 1;
					}
				});
				ctx.restore( );
			}
			
			//plot where people have died
			function  plotDeath( death_list, ctx, img, count, team ) {
				death_points = mapPoints( death_list, img.width, img.height );
				death_secs = [ ];
				death_points.forEach( function ( death ) {
					dp = death[ 1 ];
					death_secs.push( death[ 0 ] );
					ctx.font = "60px Arial";
					if( team == "Human" ) {
						ctx.fillStyle = colorwheel1[ count ];
					}
					else {
						ctx.fillStyle = colorwheel2[ count ];
					}
					ctx.fillText( "X", dp.x, dp.y );
					
				});
				ctx.restore( );
				return death_secs; 
			};
			
			//Plot the key for what colors are for what color and when/if they died
			function plotKey( player,color, count, death_time, ctx, img ) {
				ctx.font = "15px Arial";
				ctx.fillStyle = color;
				msg = "" + player + " " + death_time; 
				ctx.fillText( msg, 10, 30 + count * 15 );
				ctx.restore( );
			}
			
			//main code for getTravelData( )
			////////////////////////////////
			//Draw the map and plot interesting points
			var drawer = make_Map( );
			var count = 0;
			
			//For each of the selected humans
			$scope.selectedHumans.forEach( function ( player ) {
				res = get_player_travel( game_data, player, "Human", $scope.selectedRound, $scope.selectedMatch.m_Id );
				player_paths = [ res[ 0 ], res[ 2 ], res[ 3 ] ];
				death_points = res[ 1 ];
				death_secs = plotDeath( death_points, drawer[ 0 ], drawer[ 1 ], count, "Human" );
				drawTravels( player_paths, drawer[ 0 ], drawer[ 1 ], count, player, "Human",  death_secs );
				plotKey( player,colorwheel1[ count ], count ,death_secs, drawer[ 0 ], drawer[ 1 ] );
				count = count + 1;
			});
			
			//For each of the selected aliens
			count = 0;
			$scope.selectedAliens.forEach( function ( player ) {
				res = get_player_travel( game_data, player, "Alien", $scope.selectedRound, $scope.selectedMatch.m_Id );
				player_paths = [ res[ 0 ], res[ 2 ] ]
				death_points = res[ 1 ];
				death_secs = plotDeath( death_points, drawer[ 0 ], drawer[ 1 ], count, "Alien" );
				drawTravels( player_paths, drawer[ 0 ], drawer[ 1 ], count, player, "Alien", death_secs );
				count = count + 1;
			});
			
			//plot command points and get cp data for summaries
			cmd_list = get_cmd_points( game_data );
			plotSpecials( cmd_list, drawer[ 0 ], drawer[ 1 ], "CMD" );
			if( cmd_list[ 0 ] != undefined ) {	
				$scope.cmd_Info = cmd_list;
			} 
			else {
				$scope.cmd_Info = [];
			}
			
			//Get round summaries
			//Defaults in case of read error			
			$scope.Rnd_length = "N/A";
			$scope.Winning_Team = "N/A";
			$scope.rnd_survivors = "N/A";
			$scope.Time_Expire = "N/A";
			$scope.Overtime = "N/A";
			$scope.Alien_Data = [ ];
			res = get_rnd_Sums( game_data );
			
			//End of Round Data
			if( res[ 0 ] != undefined ) {
				console.log(res[0]);
				$scope.Overtime = res[0].timer_expired;
				$scope.Time_Expire = res[0].timer_expired;
				$scope.Winning_Team = res[ 0 ].winning_team;
				$scope.rnd_survivors = res[ 0 ].surviving_humans;
				$scope.Rnd_length = res[ 0 ].round_seconds;
			}
			
			//Alien Death table
			if( res[ 1 ] != undefined ) {
				$scope.Tot_deaths = res[ 1 ].length;
				$scope.Alien_Data = res[ 1 ];
			}
			
			//Weapon Data table
			if( res[2] != undefined ) {
				$scope.Weapon_Data = res[ 2 ];
			}
		}
	}
	
	//refresh button, push after each view of the player map
	$scope.RefreshFunc = function( ) {
		$scope.confirmRoundAndMatch( );
		$scope.getTravelData( );
		$scope.selectedRound = undefined;
		$scope.selectedMatch = undefined;

	}
});



