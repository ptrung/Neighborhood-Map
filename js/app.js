// Global Variables
var map;

function AppViewModel() {
    var self = this;
    this.maxImages = 10;
    this.defaultWikiQuery = 'Salzburg';
    this.wikiHTML = '';
    
    this.markers = [];
    
    this.searchOption = ko.observable("");
    this.currentImageList = ko.observableArray([{imgSrc: "#", sourceUrl: "", imgAlt: "Sry. Couldn't find photos!"}]);
    this.currentImageId = ko.observable(0);
    
    this.wikiInfo = ko.observable("<b>Wikipedia is loading ...</b>");
    
    this.currentImage = ko.computed(function() {
        return this.currentImageList()[this.currentImageId()];
    }, this);

    this.showInfoWindow = function(marker, info) {
        var anchorLink = '';
        
        if ($(window).width() < 992)
            anchorLink = '<a class="infoLink" href="#gallery">Show images</a><a class="infoLink" href="#wiki">Show informations</a>';
        
        if (info.marker != marker) {
            info.setContent('');
            info.marker = marker;
            
            this.htmlContent = '<div><b>' + marker.title +
                '</b><br>' + anchorLink  + '</div>';
                
            info.setContent(this.htmlContent);
            info.open(map, marker);

            info.addListener('closeclick', function() {
                info.marker = null;
                self.deselectMarker();
            });
        }
    };
    
    this.getFlickrPic = function(marker) {
        var flickrText = self.getFlickrText(marker);
        var flickrSearchUrl = "https://api.flickr.com/services/rest/" +
            "?method=flickr.photos.search&api_key=0e0a96906cb397a23b8b5b4b4f2d889c" + 
            "&text=" + flickrText + 
            "&per_page=" + self.maxImages + "&privacy_filter=1&format=json&nojsoncallback=1";
        $.getJSON(flickrSearchUrl, function(data) {
            if (data.stat === 'ok') {
                var imageUrl, sourceUrl;
                data.photos.photo.forEach(function(photo) {
                    imageUrl = "https://farm" + photo.farm + ".staticflickr.com/" + photo.server 
                        + "/" + photo.id + "_" + photo.secret +"_z.jpg";
                    sourceUrl = "https://www.flickr.com/photos/" + photo.owner + "/" + photo.id;
                    
                    self.currentImageList.push({imgSrc: imageUrl, sourceUrl: sourceUrl, imgAlt: ""});
                });
            } else {
                self.currentImageList.push({imgSrc: "#", sourceUrl: "", imgAlt: "Sry. Couldn't find photos!"});
            }
        }).fail(function() {
            self.currentImageList.push({imgSrc: "#", sourceUrl: "", imgAlt: "Sry. Couldn't find photos!"});
        });
    }
    
    this.getFlickrText = function(marker) {
        var location = locations.find(o => (o.lat === marker.lat && o.lng === marker.lng));
        return location.flickr; 
    }
    
    this.getWikiText = function(query) {
        var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + query + '&format=json&callback=wikiCallback';
        var wikiRequestTimeout = setTimeout(function(){
            self.wikiInfo("Failed to get wikipedia resources");
        }, 8000);

        $.ajax({
            url: wikiUrl,
            dataType: "jsonp",
            jsonp: "callback",
            success: function( response ) {
                if(query.localeCompare(self.defaultWikiQuery) != 0)
                     wikiHTML = '';

                if (response[1].length === 0 && query != self.defaultWikiQuery) {
                    wikiHTML = "<p>Sry, couldn't find informations about <b>" + query + "</b> on wikipedia</p>";
                    self.getWikiText(self.defaultWikiQuery);
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
    
    this.showInformation = function() {
        if ($(window).width() >= 992)
            $("#map").css("width", "calc(100vw - 300px)");
            
        $(".information").css("display", "block");
    };
    
    this.hideInformation = function() {
        $("#map").css("width", "100vw");
        $(".information").css("display", "none");
    };

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
    
    this.deselectMarker = function() {
        self.hideInformation();
    };
    
    this.setBounds = function (visibleLocations) {
        var bounds = new google.maps.LatLngBounds();
        
        for(var i = 0; i < visibleLocations.length; i++) {
            bounds.extend(visibleLocations[i].position);
        }
        map.fitBounds(bounds);
    };

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
    
    this.prevImage = function() {
        if (self.currentImageId() > 0)
            self.currentImageId(self.currentImageId() - 1);
        else
            self.currentImageId(self.currentImageList().length - 1);
    };

    this.nextImage = function() {
        if (self.currentImageId() < (self.currentImageList().length - 1))
            self.currentImageId(self.currentImageId() + 1);
        else
            self.currentImageId(0);
    };
}

googleError = function googleError() {
    alert('Sorry. Something went wrong with Google Maps. Please refresh the page and try again.');
};

function runApp() {
    ko.applyBindings(new AppViewModel());
}