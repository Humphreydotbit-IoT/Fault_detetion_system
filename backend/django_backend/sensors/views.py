# sensors/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from django.db import connection
from .models import SensorReading, EquipmentFault
from .serializers import SensorReadingSerializer, EquipmentFaultSerializer
from datetime import datetime, timedelta
import pytz
import json
from django.core.serializers.json import DjangoJSONEncoder
from .supabase_service import SupabaseService

class CustomJSONEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.astimezone(pytz.timezone('Asia/Bangkok')).isoformat()
        return super().default(obj)

class SensorReadingListView(APIView):
    def get(self, request):
        queryset = SensorReading.objects.all()
        floor = request.query_params.get('floor')
        room = request.query_params.get('room')
        sensor_type = request.query_params.get('sensor_type')
        start_time = request.query_params.get('start_time')
        end_time = request.query_params.get('end_time')
        limit = int(request.query_params.get('limit', 100))

        if floor:
            queryset = queryset.filter(floor=floor)
        if room:
            queryset = queryset.filter(room=room)
        if sensor_type:
            queryset = queryset.filter(sensor_type=sensor_type)
        if start_time:
            queryset = queryset.filter(time__gte=start_time)
        if end_time:
            queryset = queryset.filter(time__lte=end_time)

        queryset = queryset.order_by('-time')[:limit]
        serializer = SensorReadingSerializer(queryset, many=True)
        return Response(serializer.data)

# class RecentFaultsView(APIView):
#     def get(self, request):
#         faults = EquipmentFault.objects.filter(resolved=False).order_by('-time')[:10]
#         serializer = EquipmentFaultSerializer(faults, many=True)
#         return Response(serializer.data)

# class RecentFaultsView(APIView):
#     def get(self, request):
#         faults = EquipmentFault.objects.filter(resolved=False).order_by('-time')[:10]
        
#         # Sync these faults to Supabase to ensure frontend has latest data
#         supabase = SupabaseService()
#         for fault in faults:
#             supabase.sync_fault(fault)
            
#         serializer = EquipmentFaultSerializer(faults, many=True)
#         return Response(serializer.data)

class RecentFaultsView(APIView):
    def get(self, request):
        faults = EquipmentFault.objects.filter(resolved=False).order_by('-time')[:10]
        
        # Only sync if not explicitly disabled
        if request.query_params.get('skip_sync') != 'true':
            supabase = SupabaseService()
            for fault in faults:
                supabase.sync_fault(fault)
            
        serializer = EquipmentFaultSerializer(faults, many=True)
        return Response(serializer.data)

class FaultsByFloorView(APIView):
    def get(self, request, floor):
        faults = EquipmentFault.objects.filter(floor=floor, resolved=False).order_by('-time')[:10]
        serializer = EquipmentFaultSerializer(faults, many=True)
        return Response(serializer.data)

class RoomDropdownView(APIView):
    def get(self, request, floor):
        rooms = EquipmentFault.objects.filter(floor=floor).values('room').distinct().order_by('room')
        room_list = [r['room'] for r in rooms]
        if not room_list:  # Fallback
            room_list = [1, 2, 3, 4, 5]
        return Response({"rooms": room_list})

class LatestRoomFaultView(APIView):
    def get(self, request, floor, room):
        fault = EquipmentFault.objects.filter(floor=floor, room=room, resolved=False).order_by('-time').first()
        if fault:
            serializer = EquipmentFaultSerializer(fault)
            return Response(serializer.data)
        return Response({"message": "No unresolved faults found"}, status=404)

class FaultTrendsView(APIView):
    def get(self, request):
        range_param = request.query_params.get('range', '1h')
        now = datetime.now(pytz.timezone('Asia/Bangkok'))

        if range_param == '1h':
            bucket = '5 minutes'
            time_delta = '1 hour'
        elif range_param == '30m':
            bucket = '2 minutes'
            time_delta = '30 minutes'
        elif range_param == '1d':
            bucket = '1 hour'
            time_delta = '1 day'
        else:
            return Response({"error": "Invalid range. Use '1h', '30m', or '1d'"}, status=400)

        query = """
            SELECT time_bucket(%s, time) AS bucket,
                   COUNT(id) AS fault_count,
                   COUNT(id) FILTER (WHERE severity = %s) AS urgent_count,
                   COUNT(id) FILTER (WHERE severity = %s) AS warning_count
            FROM equipment_faults
            WHERE resolved = FALSE AND time >= NOW() - INTERVAL %s
            GROUP BY bucket
            ORDER BY bucket DESC
        """
        params = [bucket, 1, 2, time_delta]

        try:
            with connection.cursor() as cursor:
                cursor.execute(query, params)
                columns = [col[0] for col in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return Response(json.loads(json.dumps(results, cls=CustomJSONEncoder)))
        except Exception as e:
            return Response({"error": f"Query failed: {str(e)}"}, status=500)

class ResolveFaultView(APIView):
    def post(self, request, id):
        fault = get_object_or_404(EquipmentFault, id=id)
        fault.resolved = True
        fault.save()
        serializer = EquipmentFaultSerializer(fault)
        return Response({"status": "resolved", "fault": serializer.data})

class EquipmentFaultListView(APIView):
    def get(self, request):
        queryset = EquipmentFault.objects.all()
        floor = request.query_params.get('floor')
        room = request.query_params.get('room')
        device_type = request.query_params.get('device_type')
        start_time = request.query_params.get('start_time')
        end_time = request.query_params.get('end_time')
        resolved = request.query_params.get('resolved')
        limit = int(request.query_params.get('limit', 100))

        if floor:
            queryset = queryset.filter(floor=floor)
        if room:
            queryset = queryset.filter(room=room)
        if device_type:
            queryset = queryset.filter(device_type=device_type)
        if start_time:
            queryset = queryset.filter(time__gte=start_time)
        if end_time:
            queryset = queryset.filter(time__lte=end_time)
        if resolved is not None:
            queryset = queryset.filter(resolved=resolved.lower() == 'true')

        queryset = queryset.order_by('-time')[:limit]
        serializer = EquipmentFaultSerializer(queryset, many=True)
        return Response(serializer.data)