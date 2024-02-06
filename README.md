# Nginx demos showing off various proxy strategies

This repository sets up a basic Fastify Node app, and provides a set of nginx docker containers that proxy this Node application in order to demonstrate a variety of nginx features.

- [Reverse Proxy](#reverse-proxy-port-8080)
- [Static Serving](#static-serving-port-8081)
- [Full Cache](#full-cache-port-8082)
- [Error Handling](#error-handling-port-8083)
- [Nginx JS Module](#nginx-js-module-port-8084)
- [Nginx Split Clients Module](#nginx-split-clients-module-port-8085)
- [Nginx Cache On Error](#nginx-cache-on-error-port-8086)

### Initial Setup for all demos

1. You need to have Node (v12+) and Docker installed on your machine.
2. From the `app-server` folder, run `npm install` to download the Node app dependencies.

## Reverse Proxy (Port 8080)

In this configuration, nginx acts as a reverse proxy to a horizontally-scaled web application with 3 instances.

Start 3 copies of the node app by switching to the **app-server** folder and running `npm run start3`. This will run the app on ports:

- [http://localhost:3000](http://localhost:3000)
- [http://localhost:3001](http://localhost:3001)
- [http://localhost:3002](http://localhost:3002)

In a different terminal session, from the root of the project, run `docker-compose up` to bring up the containers.

To stop both apps, you can press CTRL-C in the appropriate terminal.

Visit [http://localhost:8080/](http://localhost:8080) to see the load-balanced application being proxied. You will notice the page title is **"Homepage 300x"** where the "x" is either 0, 1 or 2. Refresh the page a few times and you should see the number changing. This indicates which node application nginx is sending the request to each time you load the page.

Nginx is using a default configuration like this which weighs each server equally. This is called a **Round Robin** strategy:

```nginx
upstream nodeapp {
  server host.docker.internal:3000;
  server host.docker.internal:3001;
  server host.docker.internal:3002;
}
```

It is possible to add a `weight` propery to each server to bias the number of requests, which would look like this:

```nginx
upstream nodeapp {
  server host.docker.internal:3000 weight=5;
  server host.docker.internal:3001 weight=3;
  server host.docker.internal:3002;
}
```

This would send five times as many requests to the first server and three times as many requests to the second server as to the third one.

In addition to Round Robin, it is also possible to apply different specific strategies based on your use-case. The [nginx documentation](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/#choosing-a-load-balancing-method) covers these, but in summary they are:

2. **Least Connections**: Requests are sent to the server with the least active connections. Server weights still apply.

```nginx
upstream nodeapp {
  least_conn;
  server host.docker.internal:3000;
  server host.docker.internal:3001;
  server host.docker.internal:3002;
}
```

3. **IP Hash**: Requests are sent to a given server based on the client's IP address, so all traffic from a given IP will go to the same server (as long as the server is available).

```nginx
upstream nodeapp {
  ip_hash;
  server host.docker.internal:3000;
  server host.docker.internal:3001;
  server host.docker.internal:3002;
}
```

4. **Request Hash**: Requests are sent to a given server based on a hash constructed from the supplied variables.

```nginx
upstream nodeapp {
  hash $request_uri;
  server host.docker.internal:3000;
  server host.docker.internal:3001;
  server host.docker.internal:3002;
}
```

_Warning:_ The two Hash methods above may sound useful and simple but they have a lot of hidden complexities and are not recommended. If you are trying to implement [sticky sessions](https://dev.to/gkoniaris/why-you-should-never-use-sticky-sessions-2pkj) you are better off doing it on the application side with a shared session cache (using Redis for example) instead of relying on nginx to route users to the same server for an entire session.

5. **Random**: Requests are sent to a random server.

```nginx
upstream nodeapp {
  random;
  server host.docker.internal:3000;
  server host.docker.internal:3001;
  server host.docker.internal:3002;
}
```

There are many other directives you can specify in an upstream block to tailor the behaviour to your use-case, the full list is [here](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#upstream).

## Static Serving (Port 8081)

In this configuration, nginx acts as a reverse proxy to a dynamic web application but directly serves all the static files.

Start the node app by switching to the **app-server** folder and running `npm run start`. This will run the app on port [3000](http://localhost:3000).

In a different terminal session, from the root of the project, run `docker-compose up` to bring up the containers.

Visit [http://localhost:8081/](http://localhost:8081) to see the application being proxied with static asset serving.

To stop both apps, you can press CTRL-C in the appropriate terminal.

The benefit provided by static serving is to reduce the resource usage of your node application by allowing it to only serve dynamic requests, and to let nginx handle serving things like HTML, CSS, Javascript files and other static assets like images, documents, fonts, etc...

We set this up in nginx using this configuration:

```nginx
location /public {
  root /var/www/nginx/html;
}
```

#### Limitations

For this to work, nginx needs to have filesystem access to the static assets of your dynamic application. If both nginx and your app are running on the same server, this is straightforward. However, if your application is not running on the same server, you may need to mount the filesystem across the network, which is not always possible, or desirable.

In this demo we are mounting the static file path as a read-only volume into the nginx Docker container:

```
volumes:
  - ./app-server/public:/var/www/nginx/html/public:ro
```

To see this feature in action, visit the proxy URL at [http://localhost:8081/](http://localhost:8081) and check in your terminal sessions that are running Docker and your Node app. In your Docker window, you will see log lines for all the page assets, including the CSS, Javascript and images. In the Node window, you should only see 1 request for the `/` route, and it should not be sending any static files.

#### Direct responses

Another feature related to static serving that is implemented in this configuration is the ability to have nginx return content directly from the configuration.

In this first example we are configuring a location block to handle `/robots.txt` requests. We are returning a simple string as the content for the request, and there is no actual **robots.txt** file on the disk. We are also turning off the logging of these requests.

```nginx
location = /robots.txt {
  access_log off;
  return 200 "User-agent: *\r\nDisallow: *";
}
```

Another popular pattern is to use nginx to handle requests for a favicon. Many clients make these requests automatically, and this can add a lot of noise to your error logs if you don't have one. So we use a special nginx directive to return an empty image for these requests (and again we disable logging of these requests):

```nginx
location = /favicon.ico {
  access_log off;
  empty_gif;
}
```

In the final example, we create a very basic API-like response that returns a JSON block with the client's IP address and a timestamp. Something like this could be used for a simple health-check endpoint:

```nginx
location = /my-ip {
  add_header Content-Type application/json;
  return 200 "{ \"ip\": \"$remote_addr\", \"timestamp\": \"$time_local\" }\r\n";
}
```

## Full Cache (Port 8082)

In this configuration, nginx acts as a reverse proxy to a dynamic web application and caches the (almost) complete output of the app on a specified time interval.

Start the node app by switching to the **app-server** folder and running `npm run start`. This will run the app on port [3000](http://localhost:3000).

In a different terminal session, from the root of the project, run `docker-compose up` to bring up the containers.

Visit [http://localhost:8082/](http://localhost:8082) to see the application being proxied with full caching.

To stop both apps, you can press CTRL-C in the appropriate terminal.

To set up the full proxy cache, you must start by adding a cache directive to your main nginx configuration:

```nginx
proxy_cache_path /var/tmp/cache max_size=20m keys_zone=appcache:10m;
```

In the directive above, we are setting the path to the cache at `/var/tmp/cache` on the server that nginx is running on, _not_ the server being proxied. Unlike the static serving strategy in the previous demo, you can use nginx's caching strategy even when nginx and your app server are on different machines.

We then set the `max_size=20m` directive which tells nginx to use a maximum of 20 megabytes for caching. This directive is optional but it is a good practice to set anyways. You will need to adjust this value to your specific scenario but remember that this strategy will cache _all_ requests coming from th configured locations, including images, videos and other assets. This may or may not be what you want to do.

The next directive `keys_zone:appcache:10m` defines a named cache zone and its size. We will reference this name in our `server` block later.

Once we have this initial setup, we declare our caching parameters in our server block:

```nginx
proxy_cache appcache;
proxy_cache_methods GET;
proxy_cache_valid 200 1m;
proxy_cache_valid 404 10m;
```

We first reference our cache zone `appcache` that we defined earlier, and we declare which request methods we want to cahed (in this case we only cache GET calls). We then further declare that we only want to cache responses that have 200 or 404 status codes, and then for how long we want to cache them (1 minute and 10 minutes respectively).

This declares the overall caching strategy for all locations within this server block. However, we can adjust or override this behaviour on per-server block:

```nginx
location = /favicon.ico {
  access_log off;
  proxy_no_cache 1;
  empty_gif;
}

location /public {
  proxy_cache_valid 200 60m;
}
```

Using the `proxy_no_cache` directive we tell nginx not to cache the `/favicon.ico` location because we are generating that one ourselves and returning an empty GIF directly from nginx, and we are telling nginx to cache the `/public` path which serves all the static assets (JS, CSS, images) for 60 minutes at at time, since these assets are unlikely to change.

#### Further considerations

While this approach can have noticeable performance benefits for your application, you must consider the impact it can have on dynamic pages, particularly if you are doing per-user customization. Nginx caches globally _for all users_ and not per-user.

The [proxy_cache_key](http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_key) directive gives you more control over how nginx determines if a given request has been cached, and you can incorporate elements such as a user's cookie string into the key to do per-user caching (but then think about the size of your cache depending on how many users you have).

A more [extensive guide to caching](https://www.nginx.com/blog/nginx-caching-guide/) is also available on the nginx website, along with the [proxy module docs](http://nginx.org/en/docs/http/ngx_http_proxy_module.html) that cover all the possible options and settings for proxy caching.

## Error Handling (Port 8083)

In this configuration, we demonstrate two different approaches that nginx uses to handle errors coming from a proxied application.

Start the node app by switching to the **app-server** folder and running `npm run start`. This will run the app on port [3000](http://localhost:3000).

In a different terminal session, from the root of the project, run `docker-compose up` to bring up the containers.

Visit [http://localhost:8083/](http://localhost:8083) to see the application being proxied.

To stop both apps, you can press CTRL-C in the appropriate terminal.

## Nginx JS Module (Port 8084)

In this configuration, we demonstrate the nginx Javascript module that can be used to do more complex logic on your requests.

Start the node app by switching to the **app-server** folder and running `npm run start`. This will run the app on port [3000](http://localhost:3000).

In a different terminal session, from the root of the project, run `docker-compose up` to bring up the containers.

Visit [http://localhost:8084/](http://localhost:8084) to see the application homepage.

Visit [http://localhost:8084/uppercase](http://localhost:8084/uppercase) to see the application homepage after being run through an upper-case filter.

In this example we must replace the whole nginx configuration rather than just the default include, because we have to load the nginx module at the top of the file in the global scope:

```nginx
load_module /usr/lib/nginx/modules/ngx_http_js_module.so;
```

Then in our `http` scope we have to import our scripts file:

```nginx
js_import scripts/http.js;
```

And finally inside our `server` block, we have the following two location blocks:

```nginx
location / {
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Nginx-Proxy true;
  proxy_pass http://host.docker.internal:3000;
  proxy_set_header Host $http_host;
  proxy_cache_bypass $http_upgrade;
  proxy_redirect off;
}

location ~ /uppercase {
  js_content http.uppercase;
}
```

The first block is simply creating a proxy to our underlying node application. The second block creates a `/uppercase` location that will call our Javascript function that proxies the main location and returns a response that uppercases parts of the page in real-time.

Look at the `js-module/scripts/http.js` file to see the script that does the request manipulation. It's pretty basic but it demonstrates how you make a subrequest and manipulate it on the fly before returning it to the client.

To stop both apps, you can press CTRL-C in the appropriate terminal.

#### Further reading

Nginx Javascript is quite powerful but not a particularly popular feature, and so it can be hard to find out how to use it well due to the lack of examples available in the community.

The [official documentation](https://nginx.org/en/docs/njs/) provides a good introduction (the References and Examples section will be of most use).

Be sure to also review the [compatibility guide](http://nginx.org/en/docs/njs/compatibility.html) to understand the subset of Javascript that is available to you.

The [njs-examples](https://github.com/xeioex/njs-examples) Github repo has additional examples of NJS usage.

## Nginx Split Clients Module (Port 8085)

In this configuration, we demonstrate the nginx Split Clients module (with some help from the JS module) that can be used to do more complex logic on your requests.

Start the node app by switching to the **app-server** folder and running `npm run start3`. This will run 3 copies of the the Node app on ports 3000, 3001 and 3002 like our first demo.

In a different terminal session, from the root of the project, run `docker-compose up` to bring up the containers.

Visit [http://localhost:8085/](http://localhost:8085) to see the application homepage.

## Nginx Cache On Error (Port 8086)

Serve a cached version when the backend is down.

## Nginx with Lua (Port 8087)

Use LuaJIT as a scripting language to extend nginx.

**IMPORTANT:** This image is commented out of the `docker-compose.yml` file by default.

You have to build this image separately first.

```
$ cd lua
$ docker build --build-arg ENABLED_MODULES="ndk lua" -t nginx-lua .
```

This will build a local image based on `nginx:mainline-alpine` and add in the Lua module. After you have successfully built the image, you can un-comment the lines in `docker-compose.yml` to include this image.

### Why do we do this?

This might be my fault? For some reason doing an inline build with `docker-compose up` or `docker-compose build` fails because docker complains about needing BuildKit enabled (which should be enabled by default in Docker v23+). If anyone knows how to solve this, please open an issue!

The configuration ideally would build and save the image automatically:

```
  nginx_lua:
    container_name: nginx_lua
    ports:
      - "8087:8080"
    build:
      context: ./lua
      args:
        ENABLED_MODULES: ndk lua
    volumes:
      - ./lua/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./lua/scripts:/etc/nginx/scripts:ro
```

## Upstream Backup (Port 8088)

This configuration sets 2 servers in the `upstream{}` configuration, one on port 3000 and one on port 3001, but when you visit `http://localhost:8088` you will notice that you only hit the server on port 3000. Port 3001 will only be served if the port 3000 server is detected as being down.
