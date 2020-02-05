/***********************************************
 * FILE:    scriptures.js
 * AUTHOR:  Robert C Upchurch
 * DATE:    Winter 2019
 *
 * DESCRIPTION: Front End Javascript code for The Scriptures Mapped
 *          IS542, Winter 2019, BYU.
 ************************************************/
/*jslint
    browser: true
    long: true
*/
/*global console, XMLHttpRequest, map, google */
/*property
    Animation, DROP, Marker, animation, books, classKey, clearTimeout, content,
    exec, forEach, fullName, getAttribute, getElementById, google, gridName,
    hash, hrefString, id, init, innerHTML, lat, length, lng, log, map, maps,
    maxBookId, minBookId, numChapters, onHashChanged, onerror, onload, open,
    parse, position, push, querySelectorAll, response, send, setMap, setTimeout,
    slice, split, status, title, tocName
*/


const Scriptures = (function () {
    "use strict";

    //Constants
    const BOTTOM_PADDING = "<br /><br />";
    const CLASS_BOOKS = "books";
    const CLASS_BUTTON = "btn";
    const CLASS_CHAPTER = "chapter";
    const CLASS_VOLUME = "volume";
    const DIV_SCRIPTURES_NAVIGATOR = "scriptnav";
    const DIV_SCRIPTURES = "scriptures";
    const INDEX_FLAG = 11;
    const INDEX_LATITUDE = 3;
    const INDEX_LONGITUDE = 4;
    const INDEX_PLACENAME = 2;
    const LAT_LON_PARSER = /\((.*),'(.*)',(.*),(.*),(.*),(.*),(.*),(.*),(.*),(.*),'(.*)'\)/;
    const MAX_RETRY_DELAY = 5000;
    const REQUEST_GET = "GET";
    const REQUEST_STATUS_OK = 200;
    const REQUEST_STATUS_ERROR = 400;
    const TAG_VOLUME_HEADER = "h5";
    const URL_BOOKS = "https://scriptures.byu.edu/mapscrip/model/books.php";
    const URL_SCRIPTURES = "https://scriptures.byu.edu/mapscrip/mapgetscrip.php";
    const URL_VOLUMES = "https://scriptures.byu.edu/mapscrip/model/volumes.php";

    //Private Variables
    let books;
    let gmMarkers = [];
    let retryDelay = 500;
    let volumes;

    //Private Method Declarations
    let addMarker;
    let ajax;
    let addNavigation;
    let bookChapterValid;
    let booksGrid;
    let booksGridContent;
    let cacheBooks;
    let chaptersGrid;
    let chaptersGridContent;
    let clearMarkers;
    let encodedScripturesUrlParamaters;
    let getScripturesCallback;
    let getScripturesFailure;
    let htmlAnchor;
    let htmlDiv;
    let htmlElement;
    let htmlLink;
    let init;
    let navigateBook;
    let navigateChapter;
    let navigateHome;
    let nextChapter;
    let onHashChanged;
    let previousChapter;
    let setupMarkers;
    let showLocation;
    let titleForBookChapter;
    let volumesGridContent;
    let zoomToMarkers;

    //Private Methods
    addMarker = function (placename, latitude, longitude) {

        let marker = new google.maps.Marker({
            position: {lat: Number(latitude), lng: Number(longitude)},
            title: placename,
            label: placename,
            map,
            animation: google.maps.Animation.DROP
        });

        gmMarkers.push(marker);
    };

    addNavigation = function (bookId, chapter) {
        let navigation = document.getElementsByClassName("navheading")[0].innerHTML;
        let nextLink = nextChapter(bookId, chapter);
        let prevLink = previousChapter(bookId, chapter);

        if (prevLink !== undefined) {
            navigation = htmlLink({
                classKey: `left`,
                id: chapter,
                hrefString: `#0:${prevLink[0]}:${prevLink[1]}`,
                content: `<`
            }) + navigation
        }

        if (nextLink !== undefined) {
            navigation += htmlLink({
                classKey: `right`,
                id: chapter,
                hrefString: `#0:${nextLink[0]}:${nextLink[1]}`,
                content: `>`
            });
        }

        document.getElementsByClassName("navheading")[0].innerHTML = navigation;
    }

    ajax = function (url, successCallback, failureCallback, skipJsonParse) {
        let request = new XMLHttpRequest();
        request.open(REQUEST_GET, url, true);
        request.onload = function () {
            if (request.status >= REQUEST_STATUS_OK && request.status < REQUEST_STATUS_ERROR) {
                let data = (
                    skipJsonParse
                    ? request.response
                    : JSON.parse(request.response)
                );
                if (typeof successCallback === "function") {
                    successCallback(data);
                }
            } else {
                if (typeof failureCallback === "function") {
                    failureCallback(request);
                }
            }
        };
        request.onerror = failureCallback;
        request.send();
    };

    bookChapterValid = function (bookId, chapter) {
        let book = books[bookId];
        if (book === undefined || chapter < 0 || chapter > book.numChapters) {
            return false;
        }

        if (chapter === 0 && book.numChapters > 0) {
            return false;
        }

        return true;
    };

    booksGrid = function (volume) {
        return htmlDiv({
            classKey: CLASS_BOOKS,
            content: booksGridContent(volume)
        });
    };

    booksGridContent = function (volume) {
        let gridContent = "";

        volume.books.forEach(function (book) {
            gridContent += htmlLink({
                classKey: CLASS_BUTTON,
                id: book.id,
                hrefString: `#${volume.id}:${book.id}`,
                content: book.gridName
            });
        });

        return gridContent;
    };

    cacheBooks = function (callback) {
        volumes.forEach(function (volume) {
            let volumeBooks = [];
            let bookId = volume.minBookId;

            while (bookId <= volume.maxBookId) {
                volumeBooks.push(books[bookId]);
                bookId += 1;
            }

            volume.books = volumeBooks;
        });

        if (typeof callback === "function") {
            callback();
        }
    };

    chaptersGrid = function (book) {
        return htmlDiv({
            classKey: CLASS_VOLUME,
            content: htmlElement(TAG_VOLUME_HEADER, book.fullName)
        }) + htmlDiv({
            classKey: CLASS_BOOKS,
            content: chaptersGridContent(book)
        });
    };

    chaptersGridContent = function (book) {
        let gridContent = "";
        let chapter = 1;

        while (chapter <= book.numChapters) {
            gridContent += htmlLink({
                classKey: `${CLASS_BUTTON} ${CLASS_CHAPTER}`,
                id: chapter,
                hrefString: `#0:${book.id}:${chapter}`,
                content: chapter
            });

            chapter += 1;
        }

        return gridContent;
    };

    clearMarkers = function () {
        gmMarkers.forEach(function (marker) {
            marker.setMap(null);
        });

        gmMarkers = [];
    };

    encodedScripturesUrlParamaters = function (bookId, chapter, verses, isJst) {
        if (bookId !== undefined && chapter !== undefined) {
            let options = "";

            if (verses !== undefined) {
                options += verses;
            }

            if (isJst !== undefined) {
                options += "&jst=JST";
            }

            return `${URL_SCRIPTURES}?book=${bookId}&chap=${chapter}&verses=${options}`;
        }
    };

    getScripturesCallback = function (chapterHtml) {
        document.getElementById(DIV_SCRIPTURES).innerHTML = chapterHtml;
        let ids = location.hash.slice(1).split(":");
        addNavigation(Number(ids[1]), Number(ids[2]));
        setupMarkers();
    };

    getScripturesFailure = function () {
        console.log("Unable to retrieve chapter content from server.");
    };

    htmlAnchor = function (volume) {
        return `<a name="v${volume.id}" />`;
    };

    htmlDiv = function (parameters) {
        let classString = "";
        let contentString = "";
        let idString = "";

        if (parameters.classKey !== undefined) {
            classString = ` class="${parameters.classKey}"`;
        }

        if (parameters.content !== undefined) {
            contentString = parameters.content;
        }

        if (parameters.id !== undefined) {
            idString = ` id="${parameters.id}"`;
        }

        return `<div${idString}${classString}>${contentString}</div>`;
    };

    htmlElement = function (tagname, content) {
        return `<${tagname}>${content}</${tagname}>`;
    };

    htmlLink = function (parameters) {
        let classString = "";
        let contentString = "";
        let hrefString = "";
        let idString = "";

        if (parameters.classKey !== undefined) {
            classString = ` class="${parameters.classKey}"`;
        }

        if (parameters.content !== undefined) {
            contentString = parameters.content;
        }

        if (parameters.hrefString !== undefined) {
            hrefString = ` href="${parameters.hrefString}"`;
        }

        if (parameters.id !== undefined) {
            idString = ` id="${parameters.id}"`;
        }

        return `<a${idString}${classString}${hrefString}>${contentString}</a>`;
    };

    init = function (callback) {
        let booksLoaded = false;
        let volumesLoaded = false;

        ajax(URL_BOOKS, function (data) {
            books = data;
            booksLoaded = true;

            if (volumesLoaded) {
                cacheBooks(callback);
            }
        });

        ajax(URL_VOLUMES, function (data) {
            volumes = data;
            volumesLoaded = true;

            if (booksLoaded) {
                cacheBooks(callback);
            }
        });
    };

    navigateBook = function (bookId) {
        let book = books[bookId];

        if (book.numChapters <= 1) {
            navigateChapter(book.id, book.numChapters);
        } else {
            document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
                id: DIV_SCRIPTURES_NAVIGATOR,
                content: chaptersGrid(book)
            });
        }
    };

    navigateChapter = function (bookId, chapter) {
        ajax(encodedScripturesUrlParamaters(bookId, chapter), getScripturesCallback, getScripturesFailure, true);
    };

    navigateHome = function (volumeId) {
        document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
            id: DIV_SCRIPTURES_NAVIGATOR,
            content: volumesGridContent(volumeId)
        });
    };

    nextChapter = function (bookId, chapter) {
        let book = books[bookId];

        if (book !== undefined) {
            if (chapter < book.numChapters) {
                return [
                    bookId,
                    chapter + 1,
                    titleForBookChapter(book, chapter + 1)
                ];
            }

            let nextBook = books[bookId + 1];
            if (nextBook !== undefined) {
                let nextChapterValue = 1;

                if (nextBook.numChapters <= 0) {
                    nextChapterValue = 0;
                }

                return [
                    nextBook.id,
                    nextChapterValue,
                    titleForBookChapter(nextBook, nextChapterValue)
                ];
            }
        }
    };

    onHashChanged = function () {
        let ids = [];

        if (location.hash !== "" && location.hash.length > 1) {
            ids = location.hash.slice(1).split(":");
        }

        if (ids.length <= 0) {
            navigateHome();
        } else if (ids.length === 1) {
            let volumeId = Number(ids[0]);

            if (volumeId < volumes[0].id || volumeId > volumes.slice(-1).id) {
                navigateHome();
            } else {
                navigateHome(volumeId);
            }
        } else if (ids.length >= 2) {
            let bookId = Number(ids[1]);
            if (books[bookId] === undefined) {
                navigateHome();
            } else {
                if (ids.length === 2) {
                    navigateBook(bookId);
                } else {
                    let chapter = Number(ids[2]);

                    if (bookChapterValid(bookId, chapter)) {
                        navigateChapter(bookId, chapter);
                    } else {
                        navigateHome();
                    }
                }
            }
        }
    };

    previousChapter = function (bookId, chapter) {
        let book = books[bookId];

        if (book !== undefined) {
            if (chapter > 1) {
                return [
                    bookId,
                    chapter - 1,
                    titleForBookChapter(book, chapter - 1)
                ];
            }

            let prevBook = books[bookId - 1];
            if (prevBook !== undefined) {
                let prevChapterValue = prevBook.numChapters;

                if (prevBook.numChapters <= 0) {
                    prevChapterValue = 0;
                }

                return [
                    prevBook.id,
                    prevChapterValue,
                    titleForBookChapter(prevBook, prevChapterValue)
                ];
            }
        }
    };

    setupMarkers = function () {
        if (window.google === undefined) {
            let retryId = window.setTimeout(setupMarkers, retryDelay);

            retryDelay += retryDelay;

            if (retryDelay > MAX_RETRY_DELAY) {
                window.clearTimeout(retryId);
            }

            return;
        }

        if (gmMarkers.length > 0) {
            clearMarkers();
        }

        document.querySelectorAll("a[onclick^=\"showLocation(\"]").forEach(function (element) {
            let matches = LAT_LON_PARSER.exec(element.getAttribute("onclick"));
            if (matches) {
                let placename = matches[INDEX_PLACENAME];
                let latitude = matches[INDEX_LATITUDE];
                let longitude = matches[INDEX_LONGITUDE];
                let flag = matches[INDEX_FLAG];

                if (flag !== "") {
                    placename += ` ${flag}`;
                }

                addMarker(placename, latitude, longitude);
            }
        });

        zoomToMarkers();
    };

    showLocation = function (geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading) {
        console.log(geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading)
        map.setZoom((viewAltitude / 500));
        map.setCenter({lat: Number(latitude), lng: Number(longitude)});
    }

    titleForBookChapter = function (book, chapter) {
        if (book !== undefined) {
            if (chapter > 0) {
                return `${book.tocName} ${chapter}`;
            }

            return book.tocName;
        }
    };

    volumesGridContent = function (volumeId) {
        let gridContent = "";

        volumes.forEach(function (volume) {
            if (volumeId === undefined || volumeId === volume.id) {
                gridContent += htmlDiv({
                    classKey: CLASS_VOLUME,
                    content: htmlAnchor(volume) + htmlElement(TAG_VOLUME_HEADER, volume.fullName)
                });

                gridContent += booksGrid(volume);
            }
        });

        return gridContent + BOTTOM_PADDING;
    };

    zoomToMarkers = function () {
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0; i < gmMarkers.length; i++) {
            bounds.extend(gmMarkers[i].getPosition());
        }
        map.fitBounds(bounds);
    };

    //Public API
    return {
        init,
        onHashChanged,
        showLocation
    };
}());