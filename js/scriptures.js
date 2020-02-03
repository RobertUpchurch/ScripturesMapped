/***********************************************
 * FILE:    scriptures.js
 * AUTHOR:  Robert C Upchurch
 * DATE:    Winter 2019
 * 
 * DESCRIPTION: Front End Javascript code for The Scriptures Mapped
 *          IS542, Winter 2019, BYU.
 ************************************************/

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

    //Private Methods
    ajax = function (url, successCallback, failureCallback) {
        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.onload = function() {
            if (this.status >= 200 && this.status < 400) {
                let data = JSON.parse(this.response);
                if (typeof successCallback === "function") {
                    successCallback(data)
                }
            } else {
                if (typeof failureCallback === "function") {
                    failureCallback(request)
                }
            }
        };
        request.onerror = failureCallback;
        request.send();
    }

    cacheBooks = function (callback) {
        volumes.forEach(volume => {
            let volumeBooks = [];
            let bookId = volume.minBookId;

            while (bookId <= volume.maxBookId) {
                volumeBooks.push(books[bookId])
                bookId += 1
            }

            volume.books = volumeBooks;
        });

        if (typeof callback === "function") {
            callback()
        }
    }

    init = function (callback) {
        let booksLoaded = false;
        let volumesLoaded = false;

        ajax("https://scriptures.byu.edu/mapscrip/model/books.php",
            data => {
                books = data
                booksLoaded = true

                if (volumesLoaded) {
                    cacheBooks(callback)
                }
            }
            );
        ajax("https://scriptures.byu.edu/mapscrip/model/volumes.php",
            data => {
                volumes = data
                volumesLoaded = true

                if (booksLoaded) {
                    cacheBooks(callback)
                }
            }
        );
    }

    //Public API


    return {
        init: init
    };
 }())