var myObjects = [];

class LocalStorage {
    constructor() {}

    addFeedback(newFeedback) {
        localStorage.setItem(`geootzyv${localStorage.length + 1}`, `${JSON.stringify(newFeedback)}`);
    }

    clearStorage() {
        localStorage.clear();
    }

    inArray() {
        let reviews = [];
        for (let i = 1; i <= localStorage.length; i++) {
            let obj = JSON.parse(localStorage.getItem(`geootzyv${i}`));
            reviews.push(obj);
        }
        return reviews;
    }
}

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

    createPlacemark(coords) {
        if (coords) this.newCoords = coords;

        let newMarker = new ymaps.Placemark(this.newCoords, {
            balloonContent: `${this.getContent(this.newCoords)}`
        }, {
            iconLayout: "default#image",
            iconImageHref: "./img/marker.png",
            iconImageSize: [64, 64],
            iconImageOffset: [-32, -64]
        });

        myObjects.push(newMarker);
        this.map.geoObjects.add(newMarker);
        this.map.clusterer.add(myObjects);
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

            } else {
                // this.onClick(this.newCoords);
            }
        });
    }
}

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
        this.localS.inArray().forEach(obj =>
            this.myMap.createPlacemark(obj.place)
        );

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
                id: localStorage.length + 1,
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
            let id;

            for (let key in obj) {
                if (key === "id") id = obj['id'];

                if (key === "place" &&
                    (JSON.stringify(obj[key]) === JSON.stringify(coords) ||
                        JSON.stringify(coords).includes(JSON.stringify(obj[key])))) {

                    let review =
                        '<li class="rev" ' + 'id=' + `${id}` + '>' +
                        '<span class="name">' + obj.name + '</span>' +
                        '<span class="title">' + obj.title + '</span>' +
                        '<span class="data">' + obj.data + '</span>' +
                        '<p class="feed" title="Удалить">' + obj.feed + '</p>' +
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
            this.myMap.createPlacemark();

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