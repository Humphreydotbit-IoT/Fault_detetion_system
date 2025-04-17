from django.urls import path
from sensors.views import (
    SensorReadingListView,
    RecentFaultsView,
    FaultsByFloorView,
    RoomDropdownView,
    LatestRoomFaultView,
    FaultTrendsView,
    ResolveFaultView,
    EquipmentFaultListView,
)

urlpatterns = [
    path('api/sensor-readings/', SensorReadingListView.as_view(), name='sensor-readings'),
    path('api/faults/recent/', RecentFaultsView.as_view(), name='recent-faults'),
    path('api/faults/floor/<int:floor>/', FaultsByFloorView.as_view(), name='faults-by-floor'),
    path('api/rooms/floor/<int:floor>/', RoomDropdownView.as_view(), name='room-dropdown'),
    path('api/faults/floor/<int:floor>/room/<int:room>/latest/', LatestRoomFaultView.as_view(), name='latest-room-fault'),
    path('api/faults/trends/', FaultTrendsView.as_view(), name='fault-trends'),
    path('api/faults/resolve/<int:id>/', ResolveFaultView.as_view(), name='resolve-fault'),
    path('api/faults/', EquipmentFaultListView.as_view(), name='equipment-faults'),
]