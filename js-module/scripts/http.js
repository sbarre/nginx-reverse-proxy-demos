function uppercase(req) {
  req
    .subrequest("/")
    .then((res) => {
      req.headersOut["Content-Type"] = "text/html";

      var body = res.responseBody;

      var tagsToUpperCase = ["title", "h1", "h3", "h4"];

      for (var i = 0; i < tagsToUpperCase.length; i++) {
        var tag = tagsToUpperCase[i];
        var r = new RegExp("<" + tag + ">(.+?)</" + tag + ">", "m");
        body = body.replace(r, (m, p) => `<${tag}>${p.toUpperCase()}</${tag}>`);
      }

      req.return(res.status, body);
    })
    .catch((e) => req.return(500, e));
}

export default { uppercase };
