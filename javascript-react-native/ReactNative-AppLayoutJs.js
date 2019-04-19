import React, { Component } from 'react'
import {
    AsyncStorage,
    Dimensions,
    NavigatorIOS,
    View,
    Text,
    Platform,
    ToolbarAndroid, StyleSheet
} from 'react-native'

import {
    StackNavigator,
} from 'react-navigation'

import Login from './views/auth/Login'
import Menu from './views/scaffold/Menu'
import ListPets from './views/pets/ListPets'
import ShowPet from './views/pets/ShowPet'
import SideMenu from 'react-native-side-menu'
import StartWalk from './views/activities/walk/StartWalk'

const { width, height } = Dimensions.get("window")

const styles = StyleSheet.create({
    toolbar: {
        height: 60,
        backgroundColor: '#7B287D',
    },
})

export default class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            userIsLoggedIn: false,
            isLoading: true,
            isOpen: false
        }

        let rm = this

        AsyncStorage.getItem('pawtrackersUser')
            .then((val) => {
                this.setState({userIsLoggedIn: val ? val : false});
        })

        this.setUserState = this.setUserState.bind(this)
        this.onActionSelected = this.onActionSelected.bind(this)

    }

    onItemSelected(e) {
        if(e == 'Logout') {
           this.setState({
               userIsLoggedIn: false,
               isLoading: false,
               isOpen: false
           })
        }
    }

    openMenu() {
        if(this.state.isOpen) {
            this.setState({
                isOpen: false
            })
        } else {
            this.setState({
                isOpen: true
            })
        }
    }

    setUserState(val) {
        this.setState({
            userIsLoggedIn: val
        })
    }

    navigationPush(component) {
        //this.navigator.push(component)
    }

    onActionSelected() {
        this.setState({
            isOpen: true
        })
    }

    render() {
        const menu = <Menu onItemSelected={this.onItemSelected.bind(this)} />
        return (
            !this.state.userIsLoggedIn ?
            <Login setUserState={this.setUserState}/> :
                <SideMenu
                    menu={menu}
                    isOpen={this.state.isOpen}
                    autoClosing={true}
                    disableGestures={false}
                    menuPosition="right"
                    edgeHitWidth= {width * 0.4}
                    toleranceX={100}
                    toleranceY={60}
                    bounceBackOnOverdraw={false}
                >
                        <NavigatorIOS
                            barTintColor="#7B287D"
                            titleTextColor="#fff"
                            tintColor="#fff"
                            style={{ flex:1 }}
                            initialRoute={{
                                leftButtonIcon: {height: 32, width: 32, source :require('./assets/images/light/32/navicon.png')},
                                onLeftButtonPress: this.openMenu.bind(this),
                                title: 'My Pets',
                                component: ListPets,
                                passProps:{
                                        navigationPush: this.navigationPush.bind(this),
                                        openMenu: this.openMenu.bind(this),
                                        user: this.state.userIsLoggedIn,
                                        setUserState: this.setUserState.bind(this)}}}
                        >
                        <View />
                        </NavigatorIOS>
                </SideMenu>
            );
    }
}