var myObjects = [];

class LocalStorage {
    constructor() {}

    initStorage() {
        if (localStorage.getItem("geootzyv") === null ||
            JSON.parse(localStorage.getItem("geootzyv")).feeds.length === 0) {

            localStorage.setItem("geootzyv", JSON.stringify({
                count: 1,
                feeds: []
            }));

            let geoArray = [];
            myFeedbacks.forEach(feed => {
                feed.id = JSON.parse(localStorage.getItem("geootzyv")).count;
                geoArray.push(feed);
                localStorage.setItem("geootzyv", JSON.stringify({
                    count: JSON.parse(localStorage.getItem("geootzyv")).count + 1,
                    feeds: []
                }));
            });

            localStorage.setItem("geootzyv", JSON.stringify({
                count: JSON.parse(localStorage.getItem("geootzyv")).count,
                feeds: geoArray
            }));
        }
    }


    addFeedback(newFeedback) {
        let geoArray = JSON.parse(localStorage.getItem("geootzyv")).feeds;
        newFeedback.id = JSON.parse(localStorage.getItem("geootzyv")).count;
        geoArray.push(newFeedback);

        localStorage.setItem("geootzyv", JSON.stringify({
            count: JSON.parse(localStorage.getItem("geootzyv")).count + 1,
            feeds: geoArray
        }));
        //alert(localStorage.getItem("geootzyv"));
    }


    removeFeedback(id) {
        let geoArray = JSON.parse(localStorage.getItem("geootzyv")).feeds;
        geoArray.forEach((feed, i, arr) => {
            if (feed.id === id) {
                arr.splice(i, 1);
            }
        });

        localStorage.setItem("geootzyv", JSON.stringify({
            count: JSON.parse(localStorage.getItem("geootzyv")).count,
            feeds: geoArray
        }));
    }


    clearStorage() {
        localStorage.removeItem("geootzyv");
    }


    inArray() {
        let geoArray = JSON.parse(localStorage.getItem("geootzyv")).feeds;
        return geoArray;
    }
}

///
class YaMap {
    constructor(onClick, getContent, balloonBlank) {
        this.onClick = onClick;
        this.getContent = getContent;
        this.balloonBlank = balloonBlank;
        this.newCoords;

        this.localS = new LocalStorage();
    }

    async init() {
        await new Promise(resolve => ymaps.ready(resolve));
        this.initMap();
    }

    openBalloon(coords, content) {
        this.map.balloon.open(coords, content);
    }

    closeBalloon() {
        this.map.balloon.close();
    }

    createPlacemark(coords, id = JSON.parse(localStorage.getItem("geootzyv")).count - 1) {
        if (coords) this.newCoords = coords;

        let newMarker = new ymaps.Placemark(this.newCoords, {
            balloonContent: `${this.getContent(this.newCoords)}`
        }, {
            iconLayout: "default#image",
            iconImageHref: "./img/marker.png",
            iconImageSize: [64, 64],
            iconImageOffset: [-32, -64]
        });

        newMarker.GeoOtzyvID = id;
        myObjects.push(newMarker);
        this.map.geoObjects.add(newMarker);
        this.map.clusterer.add(myObjects);
    }

    deletePlacemark(placemark) {
        this.map.geoObjects.remove(placemark);
    }

    initMap() {
        this.map = new ymaps.Map("map", {
            center: [59.93916998692174, 30.309015096732622],
            zoom: 15
        });


        this.map.events.add("click", e => {
            if (this.map.balloon.isOpen()) {
                this.closeBalloon();

            } else {
                this.newCoords = e.get("coords");
                this.onClick(this.newCoords);
            }
        });

        this.map.clusterer = new ymaps.Clusterer({
            gridSize: 100,
            groupByCoordinates: false,
            clusterBalloonMaxHeight: 360,
            clusterIconColor: "#FF8663",
            clusterDisableClickZoom: true,
            clusterOpenBalloonOnClick: true,
            clusterBalloonContentLayout: ymaps.templateLayoutFactory.createClass(this.balloonBlank)
        });
        this.map.geoObjects.add(this.map.clusterer);
        this.map.clusterer.add(myObjects);

        this.map.geoObjects.events.add("click", e => {
            this.newCoords = e.get("target").geometry.getCoordinates();
            let newCluster = e.get("target").properties._data.geoObjects;
            if (this.map.balloon.isOpen()) this.closeBalloon();

            if (newCluster) {
                let coordsCluster = [];
                newCluster.forEach(mark =>
                    coordsCluster.push(mark.geometry.getCoordinates()));
                this.map.clusterer.options.set("clusterBalloonContentLayout",
                    ymaps.templateLayoutFactory.createClass(this.getContent(coordsCluster)))
            }
        });
    }
}

///
class GeoOtzyv {
    constructor() {
        this.balloonBlank = document.querySelector("#balloon--blank").innerHTML;

        this.myMap = new YaMap(
            this.onClick.bind(this),
            this.getContent.bind(this),
            this.balloonBlank);

        this.myMap.init().then(this.onInit.bind(this));

        this.localS = new LocalStorage();
        this.localS.initStorage();
    }

    onInit() {
        this.localS.inArray().forEach(obj => {
            this.myMap.createPlacemark(obj.place, obj.id)
        });

        document.body.addEventListener('click', this.onDocumentClick.bind(this));
    }

    getDate() {
        let date = new Date();

        function dateValid(num) {
            return (num < 10) ? `0${num}` : `${num}`
        }

        let now = `${dateValid(date.getDate())}.${dateValid(date.getMonth() + 1)}.${date.getFullYear()}`;
        return now;
    }

    formValidate(form) {
        let name = form.querySelector(".balloon__name").value;
        let title = form.querySelector(".balloon__place").value;
        let data = this.getDate();
        let feed = form.querySelector(".balloon__otzyv").value;

        if (name && title && data && feed) {
            let newFeedback = {
                place: this.myMap.newCoords,
                name: name,
                title: title,
                data: data,
                feed: feed
            }
            this.localS.addFeedback(newFeedback);

            return true;

        } else {
            return false;
        }
    }

    getContent(coords) {
        let list = '';

        this.localS.inArray().forEach(obj => {
            for (let key in obj) {
                if (key === "place" &&
                    (JSON.stringify(obj[key]) === JSON.stringify(coords) ||
                        JSON.stringify(coords).includes(JSON.stringify(obj[key])))) {

                    let review =
                        '<li class="rev" ' + 'id=' + `${obj.id}` + '>' +
                        '<span class="name">' + obj.name + '</span>' +
                        '<span class="title">' + obj.title + '</span>' +
                        '<span class="data">' + obj.data + '</span>' +
                        '<p class="feed">' + obj.feed +
                        '</li>';

                    if (Array.isArray(Array.isArray(coords))) {
                        coords.forEach(coordsCluster =>
                            list += review);
                    } else {
                        list += review;
                    }
                }
            }
        });

        let balloonFilled =
            '<div class="balloon">' +
            '<ul class="reviews">' + list + '</ul>' +
            '<hr>' +
            '<h1>Отзыв:</h1>' +
            '<input class="balloon__name" type="text" placeholder="Укажите ваше имя">' +
            '<input class="balloon__place" type="text" placeholder="Укажите место">' +
            '<textarea class="balloon__otzyv" placeholder="Оставьте отзыв"></textarea>' +
            '<button class="balloon__add">Добавить</button>' +
            '</div>';

        return (list !== '') ? balloonFilled : this.balloonBlank;
    }

    onClick(coords, coordsCluster) {
        let content;

        if (coordsCluster) {
            content = this.getContent(coordsCluster);

        } else {
            content = this.getContent(coords);
        }

        this.myMap.openBalloon(coords, content);
    }

    onDocumentClick(e) {
        e.preventDefault();

        if (e.target.tagName === "BUTTON" && e.target.classList.contains("balloon__add") &&
            this.formValidate(e.target.closest(".balloon"))) {
            this.myMap.closeBalloon();
            this.myMap.createPlacemark(undefined, undefined);

        } else if (e.target.tagName === "BUTTON" && e.target.classList.contains("balloon__add")) {
            let inputs = e.target.closest(".balloon").querySelectorAll('input, textarea');

            for (let el of inputs) {
                if (!el.value) {
                    el.style.borderColor = "#FF8663";

                } else {
                    el.style.borderColor = "#CFCFCF";
                };
            }

        } 

    }

}


new GeoOtzyv();