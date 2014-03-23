var app = angular.module('workTube', []);

app.run(function() {
  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
});

app.factory('tracks', function($http) {
  return {
    get: function(query, callback) {
      $http.jsonp('http://ws.audioscrobbler.com/2.0', {
        params: {
          api_key: '9adf24836356a8100453660ed5eae5b9',
          method: 'artist.getTopTracks',
          limit: '100',
          format: 'json',
          callback: 'JSON_CALLBACK',
          artist: query
        }
      }).success(function(data) {
        if (data.toptracks) {
          callback(data.toptracks.track);
        }
        return [];
      });
      return [];
    }
  };
});

app.service('youTube', function($window, $http){
  this.ready = false;
  this.player = null;
  this.play = function(track, callback) {
    var query = track.name + ' ' + track.artist.name;
    $http.jsonp('http://gdata.youtube.com/feeds/api/videos', {
      params : {
        q: query + ' -みた -コピ -カラオケ -ピアノ',
        'max-results' : 2,
        format : 5,
        alt : 'json-in-script',
        callback : 'JSON_CALLBACK'
      }
    }).success(function(data){
      if(data.feed.entry) {
        data.feed.entry.sort(function(a,b){
          return b['favoriteCount'] - a['favoriteCount'];
        });
        var permalink = data.feed.entry[0]['id']['$t'];
        var id = permalink.match(/^.+\/(.+?)$/)[1];
        if(this.ready) {
          this.player.clearVideo();
          this.player.loadVideoById(id);
        }else{
          this.player = new YT.Player('player', {
            height: '400',
            width: '600',
            videoId : id,
            playerVars: { 'autoplay': 1, 'rel': 0 },
            events : { 
              onStateChange : function (event){
                if(event.data == YT.PlayerState.ENDED ) {
                  callback();
                }
              }
            }
          });
        }
      }else{
        callback();
      }
      this.ready = true;
    }).error(function(error){
      callback();
    });
  };
});

app.service('playList', function() {
  this.list = [];
  this.index = 0;
  this.isReady = false;
  
  this.add = function(track) {
    this.list.push(track);
  };

  this.currentTrack = function() {
    if (!this.isReady) {
      return;
    }
    return this.list[this.index];
  };

  this.goNext = function(index) {
    if (index || (typeof index != 'undefined')) {
      this.index = index;
    } else if (!this.isReady) {
      this.index = 0;
    } else {
      this.index = (this.index + 1) % this.list.length;
    }

    this.isReady = true;
    return this.currentTrack();
  };

  this.clear = function() {
    this.list = [];
    this.isReady = false;
  };
});

app.controller('ctrl', function($scope, $location, tracks, youTube, playList) {
  $scope.isPlaying = false;

  $scope.play = function(index) {
    youTube.play(playList.goNext(index), $scope.play);
    var track = playList.currentTrack();
    if (track) {
      $scope.title = track.name + ' by ' + track.artist.name + ' - WorkTube';
      $scope.isPlaying = true;
    }
  };
  
  $scope.submit = function(isAutoPlay) {
    if (!$scope.artist) {
      return;
    }

    playList.clear();
    $location.search('q', $scope.artist);
    $scope.title = $scope.artist + ' - WorkTube';

    tracks.get($scope.artist, function(tracks) {
      angular.element('#playList').remove();
      angular.forEach(tracks, function(row, i) {
        playList.add(row);
      });
      $scope.tracks = tracks;
      if (isAutoPlay) {
        $scope.play();
      }
    });
  };
});
