import json

from jupyter_server.base.handlers import APIHandler
from jupyterhub.utils import isoformat
import tornado

from dataviz.dataviz import DataViz, DataVizException
from pymongo.errors import PyMongoError


class DataVizAPI(APIHandler):
    def _call_api(self, api, *args, **kwargs):
        user = DataVizAPI._parse_user(self.current_user)

        try:
            dz = DataViz(user=user)
            res = getattr(dz, api)(*args, **kwargs) 

        # FIXME: improve dataviz exceptions
        except DataVizException:
            self.finish(json.dumps({
                "success": False,
                "message": "Visualization is locked"
            }))

        # FIXME: add DataVizException on dataviz package to handle this
        except PyMongoError as err:
            self.log.warning(f"DataViz database error: {err}")
            raise tornado.web.HTTPError(500, f"An internal error occured: {err}")
        
        except TypeError as err:
            self.log.warning(f"TypeError when calling '{api}': {err}")
            raise tornado.web.HTTPError(400)

        return res
      
    @staticmethod
    def _parse_user(current_user):
        # if isinstance(current_user, dict):
        #     user = current_user['name']
        # else:
        #     user = current_user
        
        # print('DataVizAPI._parse_user ', user)
        
        # return user

        user = 'test'
        return user


class GetMyVisualizations(DataVizAPI):
    @tornado.web.authenticated
    def get(self):
        # FIXME: to change to get_my_visualizations
        res = self._call_api('get_my_visualisations')

        for record in res:
            # Remove dash app object from results
            record.pop('dashapp', None)

            # converts datetime objects
            record['createdAt'] = isoformat(record['createdAt'])
            record['updatedAt'] = isoformat(record['updatedAt'])
                
        self.finish(json.dumps({
            "success": True,
            "data": res
        }))
        

class GenericAPI(DataVizAPI):
    @tornado.web.authenticated
    def post(self):
        api_name = GenericAPI._get_api_name(self.request.path)

        input_data = self.get_json_body()
        viz_uid = input_data["uid"]

        print('GenericAPI.post ', api_name, viz_uid)
        
        if api_name == "delete":
            res = self._call_api("delete", uid=viz_uid, ask_confirm=False)
        else:
            res = self._call_api(api_name, uid=viz_uid)

        # these APIs return only True/False
        self.finish(json.dumps({"success": res}))
    
    @staticmethod
    def _get_api_name(path):
        return path.rsplit("/")[-1]


# class DataVizAPIWrapper(APIHandler):
#     API_LIST_GET = ['get_my_visualisations']
#     API_LIST_POST = ['lock', 'restore', 'delete']
#     API_LIST = API_LIST_GET + API_LIST_POST

#     @tornado.web.authenticated
#     def get(self):
#         api_name = DataVizAPIWrapper._get_api_name(self.request.path)

#         print('DataVizAPIWrapper.GET ', api_name)

#         # check if is the right HTTP method
#         if not api_name:
#             raise tornado.web.HTTPError(404)
#         elif api_name not in DataVizAPIWrapper.API_LIST_GET:
#             raise tornado.web.HTTPError(405)
        
#         self._call_api(api_name)

#     @tornado.web.authenticated
#     def post(self):
#         api_name = DataVizAPIWrapper._get_api_name(self.request.path)

#         print('DataVizAPIWrapper.POST ', api_name)

#         # check if is the right HTTP method
#         if not api_name:
#             raise tornado.web.HTTPError(404)
#         elif api_name not in DataVizAPIWrapper.API_LIST_POST:
#             raise tornado.web.HTTPError(405)
        
#         input_data = self.get_json_body()
#         self._call_api(api_name, **input_data)

#     def _call_api(self, api, *args, **kwargs):
#         print('DataVizAPIWrapper._call_api ', args, kwargs)

#         user = DataVizAPIWrapper._parse_user(self.current_user)

#         try:
#             dz = DataViz(user=user)
#             res = getattr(dz, api)(*args, **kwargs) 

#             print('DataVizAPIWrapper._call_api ', res)
        
#         except TypeError as err:
#             print('DataVizAPIWrapper._call_api exception ', err)
#             raise tornado.web.HTTPError(400)

#         # Returned when the viz is locked
#         except DataVizException:
#             self.finish(json.dumps({
#                 "data": False
#             }))

#         # FIXME: add DataVizException on dataviz package to handle this
#         except PyMongoError as err:
#             raise tornado.web.HTTPError(500, 'An internal error occured: %s' % err)

#         self.finish(json.dumps({
#             "data": res
#         }))

#     @staticmethod
#     def _get_api_name(path):
#         return path.rsplit("/")[-1]
 
#     @staticmethod
#     def _parse_user(current_user):
#         if isinstance(current_user, dict):
#             user = current_user['name']
#         else:
#             user = current_user
        
#         print('DataVizAPIWrapper._parse_user ', user)

#         return user
