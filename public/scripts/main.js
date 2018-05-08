const filterIgnoreFields = [
"_id",
"location_x",
"location_y",
"location_z",
"round_seconds",
"event_id",
"event_timestamp"
];

var app = angular.module( 'OcelotAnalysisApp', [ 'ngMaterial', 'ngMessages', 'colorpicker.module' ] )
.config(function($mdThemingProvider){
  $mdThemingProvider.theme('default')
  .primaryPalette('blue')
  .accentPalette('orange')
  .warnPalette('red')
  .backgroundPalette('grey', {
    'default': '800'
  });
  $mdThemingProvider.enableBrowserColor({
        theme: 'default', // Default is 'default'
        palette: 'background', // Default is 'primary', any basic material palette and extended palettes are available
        hue: '800' // Default is '800'
      });
})
.factory('analysisData', function () {
  var data = [];
  var filters = {};
  var appliedFilters = {};

  function setData(_data) {
    data = _data;

    if ( !data || data.length === 0)
    {
      console.error ('ERROR SETTING ANALYSIS DATA');
      return;
    }

    var fields = Object.keys(data[0]);
    fields.forEach(function(key) {
      // expicitly ignore fields we don't want to filter by (there's probably a better way to do this)
      if ( !filterIgnoreFields.includes(key) )
      {
        filters[key] = [];
      }
    });

    // create object listing all possible filters
    filters = data.reduce(function(accFilters, item) {
      var keys = Object.keys(item);

      keys = keys.filter(function(key) {
        return !filterIgnoreFields.includes(key);
      });

      keys.forEach(function(key) {
        if ( accFilters[key] && item[key] && !accFilters[key].includes(item[key]))
        {
          accFilters[key].push(item[key]);
        }
      });

      return accFilters;
    }, filters);

    //finally, sort all the filters
    for ( var key in filters )
    {
      // custom sort function since default number sorting is stupid
      filters[key] = filters[key].sort(function(a,b) {
        if ( typeof (a) === "string")
        {
          return a.localeCompare(b);
        }
        else
        {
          return a - b;
        }
      });
    }

    console.log('DATA', data);
    console.log('FILTERS', filters);
  }

  function getData () {
    return data;
  }

  function getFilters () {
    return filters;
  }

  function getAppliedFilters () {
    return appliedFilters;
  }

  function switchFilter (key, value) {
    if ( appliedFilters[key] ) {
      var index = appliedFilters[key].indexOf(value);
      if (index === -1) {
        appliedFilters[key].push(value);
      }
      else {
        if ( appliedFilters[key].length > 1 )
        {
          appliedFilters[key].splice(index, 1);
        }
        else
        {
          delete appliedFilters[key];
        }
      }
    }
    else {
      appliedFilters[key] = [ value ];
    }
  }

  function isValueFiltered (key, value) {
    if ( !appliedFilters[key] )
    {
      return false;
    }

    return appliedFilters[key].includes(value);
  }

  function getFilteredData () {
    var filterKeys = Object.keys(appliedFilters);
    if ( filterKeys.length === 0)
    {
      return data;
    }

    return data.filter( function(item) {
      return filterKeys.every(function(filterKey) {
        if (!item[filterKey]) {
          return false;
        }
        return appliedFilters[filterKey].includes(item[filterKey]);
      });
    });
  }

  function clearFilters () {
    // for some reason this updates the scope, while simply setting the variable doesn't
    for ( var key in appliedFilters )
    {
      console.log ('applied', key);
      delete appliedFilters[key];
    }
  }

  function hasFiltersApplied () {
    return Object.keys(appliedFilters).length > 0;
  }

  return {
    'setData': setData,
    'getData': getData,
    'getFilters': getFilters,
    'getAppliedFilters': getAppliedFilters,
    'switchFilter': switchFilter,
    'isValueFiltered': isValueFiltered,
    'getFilteredData': getFilteredData,
    'clearFilters': clearFilters,
    'hasFiltersApplied': hasFiltersApplied
  }
})
.controller ("OcelotAnalysisController", function ($scope, $http, analysisData) {
  function initData() {
    $http.get('/data').then(function(response) {
      console.log('DATA RECEIVED');
      analysisData.setData ( response.data );
    });
  }

  initData ();
})
.directive ("filterSelect", function( analysisData ) {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'filter-template.html',
    link: function ( scope ) {
      scope.switchFilter = analysisData.switchFilter;
      scope.filters = analysisData.getFilters ();
      scope.appliedFilters = analysisData.getAppliedFilters ();
      scope.filtersInclude = analysisData.isValueFiltered;
      scope.hasFiltersApplied = analysisData.hasFiltersApplied;
      scope.clearFilters = analysisData.clearFilters;
    }
  }
});