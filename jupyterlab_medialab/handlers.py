from jupyter_server.utils import url_path_join

from .dataviz_handlers import *
from .scheduler_handlers import *


def setup_handlers(web_app):
    def _route_pattern(endpoint, route_url):
        base_url = web_app.settings["base_url"]
        return url_path_join(base_url, "jupyterlab-medialab", endpoint, route_url)

    host_pattern = ".*$"

    # DataViz handlers
    dataviz_handlers = [
        (_route_pattern("viz", "get_my_visualizations"), GetMyVisualizations),
        (_route_pattern("viz", "lock"), GenericAPI),
        (_route_pattern("viz", "unlock"), GenericAPI),
        (_route_pattern("viz", "restore"), GenericAPI),
        (_route_pattern("viz", "delete"), GenericAPI)
    ]

    # Scheduler handlers
    scheduer_handlers = [
        (_route_pattern("scheduler", "list"), AllJobs),
        (_route_pattern("scheduler", "add"), AddJob),
        (_route_pattern("scheduler", "delete"), DeleteJob),
        (_route_pattern("scheduler", "log"), ViewLog)
    ]

    # handlers = [(_route_pattern(api), DataVizAPIWrapper) for api in DataVizAPIWrapper.API_LIST]

    web_app.add_handlers(host_pattern, dataviz_handlers + scheduer_handlers)
