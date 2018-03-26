/* Global variables */
var map;
const MAX_IMAGES = 10;
const DEFAULT_WIKI_QUERY = 'Salzburg';
const MOBILE_VIEW_SIZE = 992;

function AppViewModel() {
    var self = this;
    
    this.wikiHTML = '';
    
    this.markers = [];
    
    this.searchOption = ko.observable('');
    this.currentImageList = ko.observableArray([{imgSrc: "#", sourceUrl: "", imgAlt: "Sry. Couldn't find photos!"}]);
    this.currentImageId = ko.observable(0);
    
    this.wikiInfo = ko.observable('<b>Wikipedia is loading ...</b>');
    
    /**
    * @description  KO Computed for the current image which 
    *               depends on the currentImageList and the currentImageId
    */
    this.currentImage = ko.computed(function() {
        return this.currentImageList()[this.currentImageId()];
    }, this);

    /**
    * @description  Shows the info window about a selected marker
    * @param {google.maps.Marker} marker
    * @param {google.maps.InfoWindow} info
    */
    this.showInfoWindow = function(marker, info) {
        var anchorLink = '';
        
        // add links in case of mobile view
        if ($(window).width() < MOBILE_VIEW_SIZE) {
             anchorLink = '<a class="anchor-link" href="#gallery">Show images</a><a class="anchor-link" href="#wiki">Show informations</a>';
             console.log($(window).width() +"-"+ MOBILE_VIEW_SIZE);
        }
           
        
        if (info.marker != marker) {
            info.setContent('');
            info.marker = marker;
            
            this.htmlContent = '<div class="info-window"><h3>' + marker.title + '</h3>' + anchorLink + '</div>';
                
            info.setContent(this.htmlContent);
            info.open(map, marker);

            info.addListener('closeclick', function() {
                info.marker = null;
                self.hideInformation();
            });
        }
    };
    
    /**
    * @description  Searches for Flickr images for the provided marker
    * @param {google.maps.Marker} marker
    */
    this.getFlickrPic = function(marker) {
        var flickrText = self.getFlickrText(marker);
        var flickrSearchUrl = 'https://api.flickr.com/services/rest/' +
            '?method=flickr.photos.search&api_key=0e0a96906cb397a23b8b5b4b4f2d889c' + 
            '&text=' + flickrText + 
            '&per_page=' + MAX_IMAGES + '&privacy_filter=1&format=json&nojsoncallback=1';
        $.getJSON(flickrSearchUrl, function(data) {
            if (data.stat === 'ok') {
                var imageUrl, sourceUrl;
                data.photos.photo.forEach(function(photo) {
                    imageUrl = 'https://farm' + photo.farm + '.staticflickr.com/' + photo.server 
                        + '/' + photo.id + '_' + photo.secret + '_z.jpg';
                    sourceUrl = 'https://www.flickr.com/photos/' + photo.owner + '/' + photo.id;
                    
                    self.currentImageList.push({imgSrc: imageUrl, sourceUrl: sourceUrl, imgAlt: ""});
                });
            } else {
                self.currentImageList.push({imgSrc: "#", sourceUrl: "", imgAlt: "Sry. Couldn't find photos!"});
            }
        }).fail(function() {
            self.currentImageList.push({imgSrc: "#", sourceUrl: "", imgAlt: "Sry. Couldn't find photos!"});
        });
    }
    
    /**
    * @description  Looks for the Flickr query provided in the locations list
    * @param {google.maps.Marker} marker
    */
    this.getFlickrText = function(marker) {
        var location = locations.find(o => (o.lat === marker.lat && o.lng === marker.lng));
        return location.flickr; 
    }
    
    /**
    * @description  Searches for a wikipedia article 
    *               if it doesn't find one, it represents the result of the DEFAULT_WIKI_QUERY
    * @param {text} query
    */
    this.getWikiText = function(query) {
        self.wikiInfo('<b>Wikipedia is loading ...</b>');
        var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + query + '&format=json&callback=wikiCallback';
        var wikiRequestTimeout = setTimeout(function(){
            self.wikiInfo('Failed to get wikipedia resources');
        }, 8000);

        $.ajax({
            url: wikiUrl,
            dataType: "jsonp",
            jsonp: "callback",
            success: function( response ) {
                // Only reset the wikiHTML in case, it's not the DEFAULT_WIKI_QUERY 
                // in case of the DEFAULT_WIKI_QUERY, we would lose the information of the previous search 
                if(query.localeCompare(DEFAULT_WIKI_QUERY) != 0)
                     wikiHTML = '';

                // If no result could be found, search for the result of the DEFAULT_WIKI_QUERY
                // and provide information about the current search
                // query != DEFAULT_WIKI_QUERY should prevent a endless loop
                if (response[1].length === 0 && query != DEFAULT_WIKI_QUERY) {
                    wikiHTML = '<p>Sry, could not find informations about <b>' + query + '</b> on wikipedia</p>';
                    self.getWikiText(DEFAULT_WIKI_QUERY);
                    
                // If there is a result, print it
                } else if (response[1].length > 0){
                    var title = response[1][0];
                    var info = response[2][0];
                    var url = response[3][0];
                    
                    wikiHTML += '<h3>'+title+'</h3><p class="justify">'+info+'</p><p><a class="wikiUrl" href="'+url+
                        '">Link to full Wikipedia article</a></p>';
                    
                    self.wikiInfo(wikiHTML);
                }
                clearTimeout(wikiRequestTimeout);
            }
        });
    }
    
    /**
    * @description  Shows the informations
    */
    this.showInformation = function() {
        if ($(window).width() >= MOBILE_VIEW_SIZE)
            $('#map').css('width', 'calc(100vw - 300px)');
            
        $('.information').css('display', 'block');
    };
    
    /**
    * @description  Hides the informations
    */
    this.hideInformation = function() {
        $('#map').css('width', '100vw');
        $('.information').css('display', 'none');
    };

    /**
    * @description  Will be called if a marker is selected
    *               Runs several methods to display informations
    */
    this.selectMarker = function() {
        self.showInformation();
        self.currentImageList.removeAll();
        self.getFlickrPic(this);
        self.getWikiText(this.title);
        self.showInfoWindow(this, self.infoWindow);
        this.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout((function() {
            this.setAnimation(null);
        }).bind(this), 1400);
    };
    
    /**
    * @description Sets the bounds of the map in dependent of a list of markers
    */
    this.setBounds = function (visibleLocations) {
        var bounds = new google.maps.LatLngBounds();
        
        for(var i = 0; i < visibleLocations.length; i++)
            bounds.extend(visibleLocations[i].position);

        map.fitBounds(bounds);
    };

    /**
    * @description  Initialization of Google Maps
    */
    this.initMap = function() {
        map = new google.maps.Map(document.getElementById('map'), {
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                position: google.maps.ControlPosition.BOTTOM_CENTER
            },
            styles: styles
        });

        this.infoWindow = new google.maps.InfoWindow();
        
        for (var i = 0; i < locations.length; i++) {
            this.marker = new google.maps.Marker({
                map: map,
                position: {
                    lat: locations[i].lat,
                    lng: locations[i].lng
                },
                title: locations[i].title,
                lat: locations[i].lat,
                lng: locations[i].lng,
                id: i,
                animation: google.maps.Animation.DROP
            });
            this.marker.setMap(map);
            this.markers.push(this.marker);
            this.marker.addListener('click', self.selectMarker);
        }
        this.setBounds(this.markers);
    };

    this.initMap();
    
    /**
    * @description  KO Computed which filters the list of locations
    * @return {list of google.maps.Marker} List of marker which fit the current filter
    */
    this.filteredLocations = ko.computed(function() {
        var visibleLocations = [];
        
        for (var i = 0; i < this.markers.length; i++) {
            if (this.markers[i].title.toLowerCase().includes(this.searchOption()
                    .toLowerCase())) {
                visibleLocations.push(this.markers[i]);
                this.markers[i].setVisible(true);
            } else {
                this.markers[i].setVisible(false);
            }
        }
        this.setBounds(visibleLocations);
        
        return visibleLocations;
    }, this);
    
    /**
    * @description  decrements the currentImageId to get the previous image
    *               if it is 0, it will be set to the max value
    */
    this.prevImage = function() {
        if (self.currentImageId() > 0)
            self.currentImageId(self.currentImageId() - 1);
        else
            self.currentImageId(self.currentImageList().length - 1);
    };

    /**
    * @description  increments the currentImageId to get the next image
    *               if it reached the max value, it will be set to 0
    */
    this.nextImage = function() {
        if (self.currentImageId() < (self.currentImageList().length - 1))
            self.currentImageId(self.currentImageId() + 1);
        else
            self.currentImageId(0);
    };
}

/**
* @description  pops up an alert in case of a Google Maps error
*/
googleError = function googleError() {
    alert('Sorry. There was a problem with Google Maps. Please refresh the page and try again.');
};

function runApp() {
    ko.applyBindings(new AppViewModel());
}