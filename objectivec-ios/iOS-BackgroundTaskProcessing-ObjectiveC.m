/**
 | BackgroundTask iOS, React Native Implementation
 |
 | @author Greg Gushard
 | @license GNU General Public License
 | @description PawTrackers, Native Geolocation
 |
 | This program is free software: you can redistribute it and/or modify
 | it under the terms of the GNU General Public License as published by
 | the Free Software Foundation, either version 3 of the License, or
 | (at your option) any later version.
 |
 | This program is distributed in the hope that it will be useful,
 | but WITHOUT ANY WARRANTY; without even the implied warranty of
 | MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 | GNU General Public License for more details.
 | You should have received a copy of the GNU General Public License
 | along with this program.  If not, see <http://www.gnu.org/licenses/>.
 **/

#import "RCTUtils.h"
#import "RCTBridgeModule.h"
#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>


@interface BackgroundTask : NSObject <RCTBridgeModule, CLLocationManagerDelegate>
  @property (strong, nonatomic) CLLocationManager *locationManager;
  @property (nonatomic, strong) CLLocation *currentLocation;
  @property (nonatomic, strong) NSMutableArray *locationArray;
  @property (nonatomic, strong) NSUserDefaults *userDefaults;
@end

@implementation BackgroundTask

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(beginBackgroundTask:(NSString *)currentAppState jsCallback:(RCTResponseSenderBlock)jsCallback)
{
  _locationArray = [[NSMutableArray alloc] init];
  if([currentAppState isEqualToString:@"background"]) {
    dispatch_async(dispatch_get_main_queue(), ^(void){
      _currentLocation = [[CLLocation alloc] init];
      _locationManager = [[CLLocationManager alloc] init];
      _locationManager.delegate = self;
      _locationManager.distanceFilter = 5;
      _locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation;
      _locationManager.activityType = CLActivityTypeAutomotiveNavigation;
      [_locationManager startUpdatingLocation];
    });
  }
}

RCT_EXPORT_METHOD(endBackgroundTask:(NSString *)currentAppState jsCallback:(RCTResponseSenderBlock)jsCallback)
{
  dispatch_async(dispatch_get_main_queue(), ^(void){
    [_locationManager stopUpdatingLocation];
    _locationManager = nil;
    NSLog(@"The content of arry is%@",_locationArray);
    jsCallback(@[[NSNull null], _locationArray]);
    [_locationArray removeAllObjects];
  });
}


-(void)locationManager:(CLLocationManager *)manager didUpdateToLocation:(CLLocation *)newLocation fromLocation:(CLLocation *)oldLocation{
  _currentLocation = newLocation;
  NSDictionary *position = @{ @"coordinates": @{ @"latitude": @(newLocation.coordinate.latitude), @"longitude": @(newLocation.coordinate.longitude) } };
  [_locationArray addObject:position];
}

- (void) discardLocationManager
{
  _locationManager.delegate = nil;
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error
{
  NSLog(@"%@ MANAGER", manager , error);
}


@end