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
/*global console, XMLHttpRequest */
/*property
    books, forEach, getElementById, hash, id, init, innerHTML, length, log,
    maxBookId, minBookId, onHashChanged, onerror, onload, open, parse, push,
    response, send, slice, split, status
*/


const Scriptures = (function () {
    "use strict";
    //Constants

    //Private Variables
    let books;
    let volumes;

    //Private Method Declarations
    let ajax;
    let cacheBooks;
    let init;
    let bookChapterValid;
    let onHashChanged;
    let navigateBook;
    let navigateHome;
    let navigateChapter;

    //Private Methods
    ajax = function (url, successCallback, failureCallback) {
        let request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.onload = function () {
            if (request.status >= 200 && request.status < 400) {
                let data = JSON.parse(request.response);
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
        let book = books[bookId]
        if (book === undefined || chapter < 0 || chapter > book.numChapters) {
            return false
        }

        if (chapter === 0 && book.numChapters > 0) {
            return false
        }

        return true
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

    init = function (callback) {
        let booksLoaded = false;
        let volumesLoaded = false;

        ajax("https://scriptures.byu.edu/mapscrip/model/books.php", function (data) {
            books = data;
            booksLoaded = true;

            if (volumesLoaded) {
                cacheBooks(callback);
            }
        });

        ajax("https://scriptures.byu.edu/mapscrip/model/volumes.php", function (data) {
            volumes = data;
            volumesLoaded = true;

            if (booksLoaded) {
                cacheBooks(callback);
            }
        });
    };

    navigateBook = function (bookId) {
        console.log(bookId);
    };

    navigateChapter = function (bookId, chapterId) {
        console.log(bookId, chapterId);
    };

    navigateHome = function (volumeId) {
        document.getElementById("scriptures").innerHTML =
        "<div>The Old Testament</div>" +
        "<div>The New Testament</div>" +
        "<div>The Book Of Mormon</div>" +
        "<div>The Doctrine & Covenants</div>" +
        "<div>The Pearl of Great Price</div>" + volumeId;
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
                        navigateChapter(bookId, chapter)
                    } else {
                        navigateHome()
                    }
                }
            }
        }
    };

    //Public API


    return {
        init,
        onHashChanged
    };
}());