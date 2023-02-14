function renderCurrentView() {
  const FRAMES_PER_SECOND = 30;
  const currentHash = location.hash || "#0";
  const currentFrameNum = parseInt(
    currentHash.slice(1) // strip off the #
  );

  const currentTime = currentFrameNum / FRAMES_PER_SECOND;

  // get the bookmarks that have passed and show them
  const bookmarksToShow = bookmarks.filter(
    (bookmark) => bookmark.startTime <= currentTime
  );

  console.log({ bookmarksToShow });

  bookmarksToShow.forEach((bookmark) => {
    const elem = document.querySelector(`[data-bookmark-id="${bookmark.id}"]`);
    if (elem) {
      elem.setAttribute("data-visible", "true");
    }
  });

  // get the current bookmark and highlight it
  const bookmarkToHighlight = bookmarks.findLast(
    (bookmark) => bookmark.startTime <= currentTime
  );

  console.log({ bookmarkToHighlight });

  if (bookmarkToHighlight) {
    const elem = document.querySelector(
      `[data-bookmark-id="${bookmarkToHighlight.id}"]`
    );
    if (elem) {
      elem.setAttribute("data-highlight", "true");
    }
  }
}

function resetView() {
  // get visible elements and hide them
  const visibleElements = document.querySelectorAll('[data-visible="true"]');
  visibleElements.forEach((element) => {
    element.removeAttribute("data-visible");
  });

  // get highlighted elements and un-highlight them
  const highlightedElements = document.querySelectorAll(
    '[data-highlight="true"]'
  );
  visibleElements.forEach((element) => {
    element.removeAttribute("data-highlight");
  });
}

window.addEventListener("load", function () {
  resetView();
  renderCurrentView();

  window.addEventListener("hashchange", function () {
    resetView();
    renderCurrentView();
  });
});
